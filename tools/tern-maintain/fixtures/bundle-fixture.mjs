// 夹具的期望模块由独立 WAT 编译得到，不从待测构建器的错误消息推导身份。
import { mkdtemp, writeFile, readFile, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildPatch } from '../build.mjs';

export const MINIMAL_VERSION = '0.0.1';
export const GLUE_FIXTURE = fileURLToPath(new URL('./time-glue.js', import.meta.url));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const ORIGINAL_WAT = `(module
  (import "env" "js_now_ms" (func $js_now_ms (result f64)))
  (import "env" "js_perf_now_ms" (func $js_perf_now_ms (result f64)))
  (memory (export "memory") 1)
  (func $unsupported (result i64) unreachable)
  (func $now_unsupported (result i64)
    call $unsupported)
  (func $read_time (export "read_time") (result i64) call $now_unsupported)
  (func $calendar_impl (param $out i32) (local $ms f64)
    (local.set $ms (call $js_now_ms))
    (i64.store (local.get $out) (i64.trunc_f64_s (f64.div (local.get $ms) (f64.const 1000))))
    (i32.store offset=8 (local.get $out) (i32.trunc_f64_s (f64.mul (f64.sub (local.get $ms) (f64.mul (f64.floor (f64.div (local.get $ms) (f64.const 1000))) (f64.const 1000))) (f64.const 1000000)))))
  (func $epoch_impl (param $out i32) (param $in i32)
    (i64.store (local.get $out) (i64.const 0))
    (i64.store offset=8 (local.get $out) (i64.load (local.get $in)))
    (i32.store offset=16 (local.get $out) (i32.load offset=8 (local.get $in))))
  (func $saturating_helper (param $a i64) (param $b i64) (result i64)
    (if (result i64) (i64.lt_s (local.get $a) (local.get $b))
      (then (i64.const 0)) (else (i64.sub (local.get $a) (local.get $b)))))
  (func $consumer_impl (param $out i32) (param $flag i32) (local $ms f64)
    (if (i32.ne (i32.load8_u (i32.const 1024)) (i32.const 3)) (then unreachable))
    (local.set $ms (call $js_perf_now_ms))
    (i64.store offset=8 (local.get $out) (i64.trunc_f64_s (f64.div (local.get $ms) (f64.const 1000))))
    (i32.store offset=16 (local.get $out) (i32.trunc_f64_s (f64.mul (f64.sub (local.get $ms) (f64.mul (f64.floor (f64.div (local.get $ms) (f64.const 1000))) (f64.const 1000))) (f64.const 1000000)))))
  (func $init)
  (table 1 1 funcref)
  (table (export "__wbindgen_externrefs") 128 externref)
  (start $init)
)`;
const INSERTED_FUNCS_WAT = `(func $new_instant (param $out i32) (local $ms f64)
  (local.set $ms (call $js_perf_now_ms))
  (i64.store (local.get $out) (i64.trunc_f64_s (f64.div (local.get $ms) (f64.const 1000))))
  (i32.store offset=8 (local.get $out) (i32.trunc_f64_s (f64.mul (f64.sub (local.get $ms) (f64.mul (f64.floor (f64.div (local.get $ms) (f64.const 1000))) (f64.const 1000))) (f64.const 1000000)))))
(func $new_elapsed (param $out i32) (param $secs i64) (param $nanos i32) (local $d f64)
  (local.set $d (f64.sub (call $js_perf_now_ms) (f64.add (f64.mul (f64.convert_i64_s (local.get $secs)) (f64.const 1000)) (f64.div (f64.convert_i32_s (local.get $nanos)) (f64.const 1000000)))))
  (if (f64.lt (local.get $d) (f64.const 0)) (then (local.set $d (f64.const 0))))
  (i64.store (local.get $out) (i64.trunc_f64_s (f64.div (local.get $d) (f64.const 1000))))
  (i32.store offset=8 (local.get $out) (i32.trunc_f64_s (f64.mul (f64.sub (local.get $d) (f64.mul (f64.floor (f64.div (local.get $d) (f64.const 1000))) (f64.const 1000))) (f64.const 1000000)))))
`;
const EXPORTS_WAT = `(export "test_calendar" (func 5))
(export "test_epoch" (func 6))
(export "test_instant" (func 10))
(export "test_elapsed" (func 11))
(export "test_consumer" (func 8))
`;

export function findWabtDir() {
  if (process.env.WABT_DIR) return process.env.WABT_DIR;
  const result = spawnSync('bash', ['-lc', 'command -v wat2wasm'], { encoding: 'utf8' });
  if (result.status === 0 && result.stdout.trim()) return dirname(result.stdout.trim());
  throw new Error('WABT not found: set WABT_DIR to the directory containing wat2wasm');
}
function runTool(wabtDir, tool, args) {
  const result = spawnSync(join(wabtDir, tool), args, { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`${tool} failed: ${result.error?.message ?? result.stderr ?? result.stdout}`);
}
export async function writeRecipe(dir, recipe) {
  const bytes = Buffer.from(JSON.stringify(recipe, null, 2) + '\n');
  await writeFile(join(dir, 'recipe.json'), bytes);
  return bytes;
}

export async function materializeFixtureInputs({ testExportsAtEnd = false } = {}) {
  const wabtDir = findWabtDir();
  const dir = await mkdtemp(join(tmpdir(), 'tern-minimal-bundle-'));
  const compile = async (name, wat) => {
    await writeFile(join(dir, `${name}.wat`), wat);
    runTool(wabtDir, 'wat2wasm', [join(dir, `${name}.wat`), '-o', join(dir, `${name}.wasm`)]);
    return readFile(join(dir, `${name}.wasm`));
  };
  const originalBytes = await compile('original', ORIGINAL_WAT);
  // 独立预期使用具名函数，待测 recipe 使用 compiler 生成的数字索引。
  const candidateWat = ORIGINAL_WAT.replace('    call $unsupported)', '    i32.const 2048\n    call $new_instant\n    i32.const 2048\n    i64.load)').replace('  (table 1 1 funcref)', `${INSERTED_FUNCS_WAT}  (table 1 1 funcref)`);
  const candidateSha = sha(await compile('expected-candidate', candidateWat));
  const testWat = testExportsAtEnd
    ? candidateWat.replace('  (start $init)', `${EXPORTS_WAT}  (start $init)`)
    : candidateWat.replace('(module\n', `(module\n${EXPORTS_WAT}`);
  const testModuleSha = sha(await compile('expected-test', testWat));
  runTool(wabtDir, 'wasm2wat', [join(dir, 'original.wasm'), '-o', join(dir, 'original.dis.wat')]);
  const lines = (await readFile(join(dir, 'original.dis.wat'), 'utf8')).trimEnd().split('\n');
  const matchOne = (predicate, label) => {
    const indices = lines.flatMap((line, index) => predicate(line) ? [index] : []);
    if (indices.length !== 1) throw new Error(`expected one ${label}, found ${indices.length}`);
    return indices[0];
  };
  const replaceIdx = matchOne(line => line.trim() === 'call 2)', 'call 2');
  const tableIdx = matchOne(line => line.startsWith('  (table (;0;)'), 'first table');
  const exportIdx = testExportsAtEnd
    ? matchOne(line => line.startsWith('  (start '), 'start declaration')
    : lines.findIndex(line => line.startsWith('  (export '));
  if (exportIdx < 0) throw new Error('fixture has no exports');
  const replacePart = '    i32.const 2048\n    call 10\n    i32.const 2048\n    i64.load)\n';
  const parts = { 'parts/part-001': replacePart, 'parts/part-002': INSERTED_FUNCS_WAT.replaceAll('(call $js_perf_now_ms)', '(call 1)'), 'exports/test-exports.wat': EXPORTS_WAT };
  await mkdir(join(dir, 'parts'));
  await mkdir(join(dir, 'exports'));
  for (const [file, text] of Object.entries(parts)) await writeFile(join(dir, file), text);
  const profile = { schemaVersion: 1, version: MINIMAL_VERSION, candidateSha256: candidateSha, exports: { test_calendar: 5, test_epoch: 6, test_instant: 10, test_elapsed: 11, test_consumer: 8 }, consumerFlags: [{ address: 1024, value: 3 }, { address: 1025, value: 1 }] };
  const profileBytes = Buffer.from(JSON.stringify(profile, null, 2) + '\n');
  await writeFile(join(dir, 'profile.json'), profileBytes);
  const fx = { dir, candidateSha, testModuleSha, watLines: lines.length, paths: { original: join(dir, 'original.wasm'), glue: GLUE_FIXTURE, profile: join(dir, 'profile.json'), recipe: join(dir, 'recipe.json') } };
  const glueSha = sha(await readFile(GLUE_FIXTURE));
  fx.recipe = (expectedCandidate = candidateSha) => ({
    schemaVersion: 1, version: MINIMAL_VERSION, wabt: '1.0.42',
    original: { sha256: sha(originalBytes), watLines: lines.length },
    candidate: { sha256: expectedCandidate }, testModule: { sha256: testModuleSha },
    glue: { sha256: glueSha }, profile: { version: MINIMAL_VERSION, sha256: sha(profileBytes) },
    edits: [
      { type: 'replace', start: replaceIdx + 1, end: replaceIdx + 1, file: 'parts/part-001', originalSha256: sha(lines[replaceIdx]) },
      { type: 'insertBefore', line: tableIdx + 1, file: 'parts/part-002', anchorSha256: sha(lines[tableIdx]) },
    ],
    testExports: { file: 'exports/test-exports.wat', line: exportIdx + 1, anchorSha256: sha(lines[exportIdx]) },
    files: Object.fromEntries(Object.entries(parts).map(([file, text]) => [file, sha(text)])),
  });
  await writeRecipe(dir, fx.recipe());
  return fx;
}
export async function buildMinimalBundle(fx, wabtDir, out) {
  return buildPatch({ ...fx.paths, wabtDir, out });
}
export async function buildTestBundle(out) {
  const fx = await materializeFixtureInputs();
  try { return { bundle: out, build: await buildMinimalBundle(fx, findWabtDir(), out) }; }
  finally { await rm(fx.dir, { recursive: true, force: true }); }
}
