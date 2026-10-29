// Tern WAT 修改的确定性构建与 bundle 校验工具。
// recipe 锁定 WABT 版本、原版/candidate/test/glue/profile 的 SHA-256 身份、
// 原版 WAT 行数，以及每处 edit 对原文片段的 hash 断言。buildPatch 以流式
// 补丁重放 edit（输入为 WABT wasm2wat 输出，不手写 WAT parser），用
// WABT wat2wasm 编译，运行真实 structure 与 time 报告，组装自包含 bundle，
// 仅在完整 bundle 校验成功后清理大型中间 WAT。预期 hash 绝不因失败而改写；
// 失败的构建保留目录供检查。
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { createWriteStream, readFileSync } from 'node:fs';
import { finished } from 'node:stream/promises';
import { once } from 'node:events';
import { mkdir, readFile, writeFile, lstat, rm, copyFile, realpath } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Ajv } from 'ajv/dist/ajv.js';
import { sha256 } from './analyze.mjs';
import { verifyCandidate } from './resources.mjs';

const HEX64 = '^[a-f0-9]{64}$';
const TOOL_DIR = dirname(fileURLToPath(import.meta.url));
const PRODUCER_FILES = { buildMjs: 'build.mjs', analyzeMjs: 'analyze.mjs', resourcesMjs: 'resources.mjs', interfaceMjs: 'interface.mjs', verifyTimeMjs: 'verify-time.mjs', packageJson: 'package.json', bunLock: 'bun.lock' };
const STRUCTURE_REQUIRED = ['imports', 'exports', 'function_signatures', 'memory_limits', 'initial_memory'];
const STRUCTURE_NOT_RUN = ['time_behavior', 'full_ui'];
const TIME_REQUIRED = ['instrumented_module_provenance', 'calendar_epoch_and_output_bounds', 'instant_fractional_seconds_and_bounds', 'elapsed_borrow_and_saturation', 'actual_consumer', 'externref_reuse_10000_calls'];
const decode = bytes => new TextDecoder().decode(bytes);
const fail = message => { throw new Error(message); };

export const recipeSchema = {
  type: 'object', additionalProperties: false,
  required: ['schemaVersion', 'version', 'wabt', 'original', 'candidate', 'testModule', 'glue', 'profile', 'edits', 'testExports', 'files'],
  properties: {
    schemaVersion: { const: 1 },
    version: { type: 'string', minLength: 1 },
    wabt: { type: 'string', pattern: '^\\d+\\.\\d+\\.\\d+$' },
    original: { type: 'object', additionalProperties: false, required: ['sha256', 'watLines'], properties: { sha256: { type: 'string', pattern: HEX64 }, watLines: { type: 'integer', minimum: 1 } } },
    candidate: { type: 'object', additionalProperties: false, required: ['sha256'], properties: { sha256: { type: 'string', pattern: HEX64 } } },
    testModule: { type: 'object', additionalProperties: false, required: ['sha256'], properties: { sha256: { type: 'string', pattern: HEX64 } } },
    glue: { type: 'object', additionalProperties: false, required: ['sha256'], properties: { sha256: { type: 'string', pattern: HEX64 } } },
    profile: { type: 'object', additionalProperties: false, required: ['version', 'sha256'], properties: { version: { type: 'string', minLength: 1 }, sha256: { type: 'string', pattern: HEX64 } } },
    edits: {
      type: 'array', minItems: 1,
      items: {
        type: 'object', required: ['type', 'file'],
        oneOf: [
          { type: 'object', additionalProperties: false, required: ['type', 'start', 'end', 'file', 'originalSha256'], properties: { type: { const: 'replace' }, start: { type: 'integer', minimum: 1 }, end: { type: 'integer', minimum: 1 }, file: { type: 'string', minLength: 1 }, originalSha256: { type: 'string', pattern: HEX64 } } },
          { type: 'object', additionalProperties: false, required: ['type', 'line', 'file', 'anchorSha256'], properties: { type: { const: 'insertBefore' }, line: { type: 'integer', minimum: 1 }, file: { type: 'string', minLength: 1 }, anchorSha256: { type: 'string', pattern: HEX64 } } }
        ]
      }
    },
    testExports: { type: 'object', additionalProperties: false, required: ['file', 'line', 'anchorSha256'], properties: { file: { type: 'string', minLength: 1 }, line: { type: 'integer', minimum: 1 }, anchorSha256: { type: 'string', pattern: HEX64 } } },
    files: { type: 'object', minProperties: 1, additionalProperties: { type: 'string', pattern: HEX64 } }
  }
};
const validateRecipe = new Ajv({ allErrors: true }).compile(recipeSchema);

// bundle 内源文件相对路径只允许位于 parts/ 或 exports/ 下，
// 且不得逃逸 recipe/bundle 目录（禁止绝对路径与 ".."）。
function safeRel(rel) {
  if (typeof rel !== 'string' || rel.startsWith('/') || rel.includes('\\')) fail(`Invalid recipe: unsafe relative path ${JSON.stringify(rel)}`);
  const segments = rel.split('/');
  if (segments.length < 2 || (segments[0] !== 'parts' && segments[0] !== 'exports')) fail(`Invalid recipe: source files must live under parts/ or exports/: ${rel}`);
  for (const segment of segments) if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(segment)) fail(`Invalid recipe: unsafe relative path ${rel}`);
  return segments.join('/');
}
async function containedPath(baseDir, rel) {
  // 对完整目标路径取 realpath：任何叶文件或父目录 symlink 都被解析，
  // 逃逸 realpath(base) 或非常规文件即拒绝。
  const base = await realpath(baseDir);
  let full;
  try { full = await realpath(resolve(base, rel)); } catch { fail(`Invalid recipe: source file missing: ${rel}`); }
  if (full !== base && !full.startsWith(base + sep)) fail(`Invalid recipe: path escapes base directory: ${rel}`);
  if (!(await lstat(full)).isFile()) fail(`Invalid recipe: not a regular file: ${rel}`);
  return full;
}
async function fileSha256(path) { return sha256(new Uint8Array(await readFile(path))); }
async function run(cmd, args) {
  return await new Promise((res, rej) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '', err = '';
    child.stdout.on('data', d => out += d);
    child.stderr.on('data', d => err += d);
    child.on('error', rej);
    child.on('close', code => res({ code, out, err }));
  });
}
async function toolVersion(bin) {
  const { code, out, err } = await run(bin, ['--version']);
  if (code !== 0) fail(`Cannot run ${bin}: ${err.trim()}`);
  const match = /(\d+\.\d+\.\d+)/.exec(out);
  if (!match) fail(`Cannot parse version of ${bin}: ${out.trim()}`);
  return match[1];
}
async function readRecipe(recipePath) {
  const recipe = JSON.parse(await readFile(recipePath, 'utf8'));
  if (!validateRecipe(recipe)) fail(`Invalid recipe: ${JSON.stringify(validateRecipe.errors)}`);
  for (let i = 1; i < recipe.edits.length; i++) {
    const prev = recipe.edits[i - 1], cur = recipe.edits[i];
    const prevEnd = prev.type === 'replace' ? prev.end : prev.line;
    const curStart = cur.type === 'replace' ? cur.start : cur.line;
    if (curStart <= prevEnd) fail(`Invalid recipe: edits must be sorted and non-overlapping (${cur.file} at ${curStart} after ${prev.file} ending ${prevEnd})`);
  }
  for (const edit of recipe.edits) if (!(safeRel(edit.file) in recipe.files)) fail(`Invalid recipe: ${edit.file} missing from files`);
  // files 集合必须恰好等于 edits 引用文件 ∪ {testExports.file}，杜绝未使用的额外文件。
  const expectedFiles = new Set(recipe.edits.map(e => e.file));
  expectedFiles.add(recipe.testExports.file);
  const actualFiles = Object.keys(recipe.files);
  if (actualFiles.length !== expectedFiles.size || actualFiles.some(rel => !expectedFiles.has(rel))) fail(`Invalid recipe: files must be exactly the edit and testExports files (extra or missing: ${actualFiles.filter(r => !expectedFiles.has(r)).concat([...expectedFiles].filter(r => !(r in recipe.files)))})`);
  return recipe;
}
const anchorHash = line => createHash('sha256').update(line, 'utf8').digest('hex');
function hashLines(lines) { return createHash('sha256').update(lines.join('\n'), 'utf8').digest('hex'); }

// 单次流式消费 WABT wasm2wat 输出，同时写出 reviewed candidate WAT 与
// test WAT 在 recipe 锁定的原版行之前插入验证导出，保留归档导出顺序。
// replace 区间只输出替换文本，绝不回写原始行。
async function applyRecipe({ wasm2wat, originalPath, recipe, replacements, exportsBytes, outWat, outTestWat }) {
  const edits = [...recipe.edits].sort((a, b) => (a.start ?? a.line) - (b.start ?? b.line));
  const byLine = new Map();
  for (const edit of edits) {
    const key = edit.type === 'replace' ? edit.start : edit.line;
    if (byLine.has(key)) fail(`Ambiguous edit: two edits target original line ${key}`);
    byLine.set(key, edit);
  }
  const expected = recipe.original.watLines;
  const child = spawn(wasm2wat, [originalPath], { stdio: ['ignore', 'pipe', 'pipe'] });
  let childErr = '', spawnFailed = false;
  child.stderr.on('data', d => childErr += d);
  child.on('error', error => { spawnFailed = true; childErr += String(error?.message ?? error); });
  const exit = new Promise(res => child.on('close', code => res(code)));
  const rl = createInterface({ input: child.stdout, terminal: false, crlfDelay: Infinity });
  const wat = createWriteStream(outWat), testWat = createWriteStream(outTestWat);
  const streamsFinished = Promise.allSettled([finished(wat), finished(testWat)]);
  // 任一写流出错时停止输入，并经 AbortController 中断另一写流的 drain 等待。
  // 已 errored/destroyed 的流在 write 前直接抛出错误，不等待已触发的事件。
  const streamAbort = new AbortController();
  let streamFailure = null;
  const onStreamError = error => {
    streamFailure ??= error;
    streamAbort.abort();
    rl.close();
    child.stdout.destroy();
    child.kill('SIGKILL');
  };
  wat.once('error', onStreamError);
  testWat.once('error', onStreamError);
  const streamDown = new Promise((_, reject) => streamAbort.signal.addEventListener('abort', () => reject(streamFailure), { once: true }));
  streamDown.catch(() => {});
  const writeOut = async (s, text) => {
    if (s.errored || s.destroyed) throw s.errored ?? streamFailure ?? new Error('WAT write stream closed before write');
    if (s.write(text)) return;
    const drained = once(s, 'drain');
    drained.catch(() => {});
    await Promise.race([drained, streamDown]);
  };
  const both = async text => { await writeOut(wat, text); await writeOut(testWat, text); };
  let shared = '';
  const flushShared = async () => {
    if (!shared) return;
    const text = shared;
    shared = '';
    await both(text);
  };
  let lineNo = 0, pending = null, exportsInserted = false, exportAnchor = null;
  const withTestExports = async bytes => {
    const text = decode(bytes), needle = exportAnchor + '\n';
    const offset = text.indexOf(needle);
    if (offset < 0 || (offset > 0 && text[offset - 1] !== '\n') || text.indexOf(needle, offset + needle.length) >= 0)
      fail(`Test exports anchor mismatch: replacement must contain exactly one anchor at original line ${recipe.testExports.line}`);
    await writeOut(wat, bytes);
    await writeOut(testWat, text.slice(0, offset) + decode(exportsBytes) + text.slice(offset));
    exportsInserted = true;
  };
  try {
    for await (const line of rl) {
      if (streamFailure) throw streamFailure;
      lineNo++;
      if (lineNo > expected) fail(`Original WAT line count mismatch: exceeded ${expected} lines`);
      if (lineNo === recipe.testExports.line) {
        if (anchorHash(line) !== recipe.testExports.anchorSha256)
          fail(`Test exports anchor mismatch: line ${lineNo}`);
        exportAnchor = line;
      }
      const edit = byLine.get(lineNo);
      if (edit?.type === 'insertBefore') {
        if (anchorHash(line) !== edit.anchorSha256) fail(`Insertion anchor mismatch: ${edit.file} before line ${lineNo}`);
        await flushShared();
        await both(replacements.get(edit.file));
        byLine.delete(lineNo);
      }
      if (!pending && edit?.type === 'replace') {
        await flushShared();
        pending = { edit, buf: [] };
        byLine.delete(lineNo);
      }
      if (pending) {
        pending.buf.push(line);
        if (lineNo !== pending.edit.end) continue;
        if (hashLines(pending.buf) !== pending.edit.originalSha256) fail(`Edit assertion failed: ${pending.edit.file} at original lines ${pending.edit.start}-${pending.edit.end}`);
        const bytes = replacements.get(pending.edit.file);
        if (recipe.testExports.line >= pending.edit.start && recipe.testExports.line <= pending.edit.end) await withTestExports(bytes);
        else await both(bytes);
        pending = null;
      } else if (lineNo === recipe.testExports.line) {
        await flushShared();
        await withTestExports(Buffer.from(line + '\n'));
      } else {
        shared += line + '\n';
        // 连续原文按 64 KiB 合并写入，避免对数千万行逐条提交两份磁盘写入。
        if (shared.length >= 64 * 1024) await flushShared();
      }
    }
    if (streamFailure) throw streamFailure;
    await flushShared();
    if (spawnFailed) fail(`wasm2wat failed: ${childErr.trim()}`);
    const code = await exit;
    if (code !== 0 || childErr.trim()) fail(`wasm2wat failed (exit ${code}): ${childErr.trim()}`);
    if (pending) fail(`Edit assertion failed: ${pending.edit.file} range ${pending.edit.start}-${pending.edit.end} unreached (EOF at line ${lineNo})`);
    if (byLine.size) fail(`Edit assertion failed: edits unreached at EOF: ${[...byLine.values()].map(e => e.file).join(', ')}`);
    if (lineNo !== expected) fail(`Original WAT line count mismatch: got ${lineNo}, expected ${expected}`);
    if (!exportsInserted) fail('Test exports anchor mismatch: anchor line never reached');
    wat.end(); testWat.end();
    const outcomes = await streamsFinished;
    for (const outcome of outcomes) if (outcome.status === 'rejected') throw outcome.reason;
  } catch (error) {
    const failure = streamFailure ?? error;
    child.kill('SIGKILL');
    child.stdout.destroy();
    wat.destroy();
    testWat.destroy();
    rl.close();
    await Promise.all([exit, streamsFinished]);
    throw failure;
  }
}

async function producerHashes() {
  const entries = await Promise.all(Object.entries(PRODUCER_FILES).map(async ([key, file]) => [key + 'Sha256', await fileSha256(join(TOOL_DIR, file))]));
  return Object.fromEntries(entries);
}
export async function buildPatch({ original, glue, profile, recipe, wabtDir, out }) {
  for (const [key, value] of Object.entries({ original, glue, profile, recipe, wabtDir, out }))
    if (typeof value !== 'string' || !value) fail(`Invalid argument: ${key} must be a non-empty string path`);
  const outDir = resolve(out);
  if (await lstat(outDir).then(() => true, () => false)) fail(`Output directory already exists: ${outDir}`);
  const recipePath = resolve(recipe);
  const recipeDir = dirname(recipePath);
  const recipeData = await readRecipe(recipePath);
  const profileBytes = await readFile(resolve(profile));
  const glueBytes = await readFile(resolve(glue));
  const profileJson = JSON.parse(decode(profileBytes));
  if (profileJson.candidateSha256 !== recipeData.candidate.sha256) fail('Profile SHA-256 mismatch: profile candidateSha256 does not match recipe');
  if (sha256(profileBytes) !== recipeData.profile.sha256) fail('Profile SHA-256 mismatch');
  if (sha256(glueBytes) !== recipeData.glue.sha256) fail('Glue SHA-256 mismatch');
  const originalBytes = await readFile(resolve(original));
  if (sha256(originalBytes) !== recipeData.original.sha256) fail(`Original SHA-256 mismatch: expected ${recipeData.original.sha256}, got ${sha256(originalBytes)}`);
  const bin = name => join(resolve(wabtDir), name);
  if (await toolVersion(bin('wasm2wat')) !== recipeData.wabt || await toolVersion(bin('wat2wasm')) !== recipeData.wabt)
    fail(`WABT version mismatch: recipe locks ${recipeData.wabt}`);
  // 复制或写入任何输出之前，先验证 recipe.files 全部路径（realpath 防 symlink
  // 越界、必须是常规文件）与 hash，并缓存规范化后的源路径。
  const sources = new Map();
  for (const [rel, hash] of Object.entries(recipeData.files)) {
    const full = await containedPath(recipeDir, rel);
    if (await fileSha256(full) !== hash) fail(`Invalid recipe: ${rel} hash does not match files entry`);
    sources.set(rel, full);
  }
  const replacementBytes = rel => {
    const bytes = readFileSync(sources.get(rel));
    if (bytes.length === 0 || bytes[bytes.length - 1] !== 0x0a) fail(`Replacement file must end with a newline: ${rel}`);
    return bytes;
  };
  const replacements = new Map();
  for (const edit of recipeData.edits) replacements.set(edit.file, replacementBytes(edit.file));
  const exportsBytes = replacementBytes(recipeData.testExports.file);

  await mkdir(outDir);
  try {
    const watPath = join(outDir, 'reviewed.wat'), testWatPath = join(outDir, 'test.wat');
    await applyRecipe({ wasm2wat: bin('wasm2wat'), originalPath: resolve(original), recipe: recipeData, replacements, exportsBytes, outWat: watPath, outTestWat: testWatPath });
    const compile = async (input, output, expected, label) => {
      const { code, err } = await run(bin('wat2wasm'), [input, '-o', output]);
      if (code !== 0) fail(`${label} compilation failed: ${err.trim()}`);
      const got = await fileSha256(output);
      if (got !== expected) fail(`${label} SHA-256 mismatch: expected ${expected}, got ${got}`);
      return got;
    };
    const candidateSha256 = await compile(watPath, join(outDir, 'candidate.wasm'), recipeData.candidate.sha256, 'Candidate');
    const testModuleSha256 = await compile(testWatPath, join(outDir, 'test.wasm'), recipeData.testModule.sha256, 'Test module');

    const structure = await verifyCandidate({ original: resolve(original), candidate: join(outDir, 'candidate.wasm') });
    await writeFile(join(outDir, 'structure.json'), JSON.stringify(structure, null, 2) + '\n', { flag: 'wx' });
    const failedStructure = structure.checks.filter(c => c.status === 'failed');
    if (failedStructure.length) fail(`Structure check failed: ${failedStructure.map(c => c.name).join(', ')}`);

    const timePath = join(outDir, 'time.json');
    const runResult = await run(process.execPath, [join(TOOL_DIR, 'verify-time.mjs'), '--candidate', join(outDir, 'candidate.wasm'), '--test-module', join(outDir, 'test.wasm'), '--glue', resolve(glue), '--profile', resolve(profile), '--out', timePath]);
    if (runResult.code !== 0 || !await lstat(timePath).then(() => true, () => false)) fail(`Time verification failed: ${(runResult.err || runResult.out).trim()}`);
    const time = JSON.parse(await readFile(timePath, 'utf8'));
    const failedTime = time.checks.filter(c => c.status === 'failed');
    if (failedTime.length) fail(`Time verification failed: ${failedTime.map(c => c.name).join(', ')}`);

    for (const rel of Object.keys(recipeData.files)) {
      const target = join(outDir, rel);
      await mkdir(dirname(target), { recursive: true });
      await copyFile(sources.get(rel), target);
    }
    await copyFile(resolve(original), join(outDir, 'original.wasm'));
    await copyFile(resolve(glue), join(outDir, 'glue.js'));
    await copyFile(resolve(profile), join(outDir, 'profile.json'));
    await copyFile(recipePath, join(outDir, 'recipe.json'));
    const inputs = {
      originalSha256: recipeData.original.sha256, glueSha256: recipeData.glue.sha256,
      profileSha256: recipeData.profile.sha256, recipeSha256: await fileSha256(recipePath),
      parts: {}, exports: {}
    };
    for (const [rel, hash] of Object.entries(recipeData.files)) (rel.startsWith('parts/') ? inputs.parts : inputs.exports)[rel] = hash;
    const build = {
      schemaVersion: 1, version: recipeData.version,
      producer: { ...await producerHashes(), recipeSha256: inputs.recipeSha256 },
      tools: { wabt: recipeData.wabt, runtime: process.versions.bun ?? process.version },
      inputs,
      outputs: {
        candidateSha256, testModuleSha256,
        structureSha256: await fileSha256(join(outDir, 'structure.json')),
        timeSha256: await fileSha256(timePath)
      }
    };
    await writeFile(join(outDir, 'build.json'), JSON.stringify(build, null, 2) + '\n', { flag: 'wx' });
    await checkBundle({ bundle: outDir });
    await rm(watPath); await rm(testWatPath);
    return build;
  } catch (error) {
    fail(`${error.message} (build directory preserved: ${outDir})`);
  }
}

async function bundleFile(bundle, rel) {
  // realpath 解析 bundle 内任意 symlink（叶文件或父目录），逃逸或非常规文件即拒绝。
  const base = await realpath(bundle);
  let full;
  try { full = await realpath(join(base, rel)); } catch { fail(`Bundle check failed: missing file ${rel}`); }
  if (full !== base && !full.startsWith(base + sep)) fail(`Bundle check failed: path escapes bundle: ${rel}`);
  if (!(await lstat(full)).isFile()) fail(`Bundle check failed: not a regular file: ${rel}`);
  return new Uint8Array(await readFile(full));
}
function requireChecks(report, required, allowedNotRun, label) {
  const checks = report?.checks;
  if (!Array.isArray(checks) || checks.length === 0) fail(`Bundle check failed: ${label} has no checks`);
  const byName = new Map(checks.map(c => [c.name, c.status]));
  for (const name of required) if (byName.get(name) !== 'passed') fail(`Bundle check failed: ${label} check ${name} is not passed`);
  for (const check of checks) {
    if (check.status === 'failed') fail(`Bundle check failed: ${label} check ${check.name} failed`);
    if (check.status === 'not_run' && !allowedNotRun.includes(check.name)) fail(`Bundle check failed: ${label} check ${check.name} not_run`);
    if (!['passed', 'not_run'].includes(check.status)) fail(`Bundle check failed: ${label} check ${check.name} unknown status ${check.status}`);
  }
  const known = new Set([...required, ...allowedNotRun]);
  for (const check of checks) if (!known.has(check.name)) fail(`Bundle check failed: ${label} has unexpected check ${check.name}`);
}
export async function checkBundle({ bundle }) {
  if (typeof bundle !== 'string' || !bundle) fail('Invalid argument: bundle must be a non-empty string path');
  const dir = resolve(bundle);
  const check = (cond, detail) => { if (!cond) fail(`Bundle check failed: ${detail}`); };
  const recipeBytes = await bundleFile(dir, 'recipe.json');
  const recipe = JSON.parse(decode(recipeBytes));
  check(validateRecipe(recipe), `recipe schema invalid: ${JSON.stringify(validateRecipe.errors)}`);
  for (const rel of Object.keys(recipe.files)) safeRel(rel);
  const build = JSON.parse(decode(await bundleFile(dir, 'build.json')));
  const hashOf = async rel => sha256(await bundleFile(dir, rel));
  check(build.schemaVersion === 1 && build.version === recipe.version, `build.json version ${build.version} != recipe version ${recipe.version}`);
  check(build.tools?.wabt === recipe.wabt, `build.json tools.wabt ${build.tools?.wabt} != recipe ${recipe.wabt}`);
  const expectedProducer = await producerHashes();
  for (const [key, hash] of Object.entries(expectedProducer)) check(build.producer?.[key] === hash, `build.json producer.${key} does not match ${key.replace(/Sha256$/, '.mjs')}`);
  const originalSha256 = await hashOf('original.wasm');
  const glueSha256 = await hashOf('glue.js');
  const profileSha256 = await hashOf('profile.json');
  const recipeSha256 = sha256(recipeBytes);
  const candidateSha256 = await hashOf('candidate.wasm');
  const testModuleSha256 = await hashOf('test.wasm');
  check(originalSha256 === recipe.original.sha256, 'original.wasm hash mismatch');
  check(glueSha256 === recipe.glue.sha256, 'glue.js hash mismatch');
  check(profileSha256 === recipe.profile.sha256, 'profile.json hash mismatch');
  check(recipeSha256 === build.inputs?.recipeSha256, 'recipe.json hash mismatch');
  check(candidateSha256 === recipe.candidate.sha256, 'candidate.wasm hash mismatch');
  check(testModuleSha256 === recipe.testModule.sha256, 'test.wasm hash mismatch');
  check(build.inputs?.originalSha256 === originalSha256 && build.inputs?.glueSha256 === glueSha256 &&
    build.inputs?.profileSha256 === profileSha256, 'build.json inputs do not match bundle files');
  check(build.outputs?.candidateSha256 === candidateSha256 && build.outputs?.testModuleSha256 === testModuleSha256, 'build.json outputs do not match bundle files');
  for (const [rel, hash] of Object.entries(recipe.files)) {
    check((await hashOf(rel)) === hash, `${rel} hash mismatch`);
    const bucket = rel.startsWith('parts/') ? build.inputs?.parts : build.inputs?.exports;
    check(bucket?.[rel] === hash, `build.json inputs missing ${rel}`);
  }
  const profile = JSON.parse(decode(await bundleFile(dir, 'profile.json')));
  check(profile.candidateSha256 === recipe.candidate.sha256, 'profile candidateSha256 mismatch');
  const structure = JSON.parse(decode(await bundleFile(dir, 'structure.json')));
  check(structure.originalSha256 === originalSha256 && structure.candidateSha256 === candidateSha256, 'structure.json input binding mismatch');
  requireChecks(structure, STRUCTURE_REQUIRED, STRUCTURE_NOT_RUN, 'structure.json');
  check(sha256(await bundleFile(dir, 'structure.json')) === build.outputs?.structureSha256, 'structure.json hash mismatch');
  const time = JSON.parse(decode(await bundleFile(dir, 'time.json')));
  check(time.candidateSha256 === candidateSha256 && time.testModuleSha256 === testModuleSha256 &&
    time.profileSha256 === profileSha256 && time.glueSha256 === glueSha256, 'time.json input binding mismatch');
  requireChecks(time, TIME_REQUIRED, [], 'time.json');
  check(sha256(await bundleFile(dir, 'time.json')) === build.outputs?.timeSha256, 'time.json hash mismatch');
  const candidateExports = WebAssembly.Module.exports(new WebAssembly.Module(await bundleFile(dir, 'candidate.wasm'))).map(e => e.name);
  const testExports = WebAssembly.Module.exports(new WebAssembly.Module(await bundleFile(dir, 'test.wasm'))).map(e => e.name);
  for (const name of Object.keys(profile.exports)) check(!candidateExports.includes(name), `candidate.wasm must not export test function ${name}`);
  for (const name of Object.keys(profile.exports)) check(testExports.includes(name), `test.wasm missing test export ${name}`);
  check(testExports.length === new Set([...candidateExports, ...Object.keys(profile.exports)]).size, 'test.wasm exports differ from candidate exports plus test exports');
  return {
    schemaVersion: 1, version: recipe.version,
    originalSha256, glueSha256, profileSha256, recipeSha256, candidateSha256, testModuleSha256,
    checks: [...structure.checks, ...time.checks].map(({ name, status }) => ({ name, status })),
    ok: true
  };
}

// 从已通过校验的 bundle 出发，仅凭 bundle 内固定相对路径输入与锁定的
// WABT 工具链，重建到新的输出目录。
export async function rebuildPatch({ bundle, wabtDir, out }) {
  for (const [key, value] of Object.entries({ bundle, wabtDir, out }))
    if (typeof value !== 'string' || !value) fail(`Invalid argument: ${key} must be a non-empty string path`);
  const dir = resolve(bundle);
  await checkBundle({ bundle: dir });
  return await buildPatch({
    original: join(dir, 'original.wasm'),
    glue: join(dir, 'glue.js'),
    profile: join(dir, 'profile.json'),
    recipe: join(dir, 'recipe.json'),
    wabtDir, out
  });
}
