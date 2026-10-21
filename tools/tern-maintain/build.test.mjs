import { test, expect, beforeAll, afterAll } from 'bun:test';
import { writeFile, readFile, rm, mkdir, cp, copyFile, symlink, lstat, mkdtemp } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import Ajv from 'ajv';
import { rebuildPatch, checkBundle, recipeSchema } from './build.mjs';
import { findWabtDir, materializeFixtureInputs, buildMinimalBundle, writeRecipe } from './fixtures/bundle-fixture.mjs';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const readJson = async path => JSON.parse(await readFile(path, 'utf8'));
const exists = path => lstat(path).then(() => true, () => false);
const validateRecipe = new Ajv({ allErrors: true }).compile(recipeSchema);

let wabtDir, fx;
beforeAll(async () => {
  wabtDir = findWabtDir();
  fx = await materializeFixtureInputs();
  if (!validateRecipe(await readJson(fx.paths.recipe))) throw new Error(`fixture recipe invalid: ${JSON.stringify(validateRecipe.errors)}`);
});

afterAll(async () => { if (fx) await rm(fx.dir, { recursive: true, force: true }); });

async function buildInto(name) {
  return buildMinimalBundle(fx, wabtDir, join(fx.dir, name));
}

test('a write error while awaiting input cancels the producer and preserves the original failure', async () => {
  const child = Bun.spawn([process.execPath, join(import.meta.dir, 'fixtures/write-error.mjs')], { stdout: 'pipe', stderr: 'pipe' });
  const [code, stdout, stderr] = await Promise.all([child.exited, new Response(child.stdout).text(), new Response(child.stderr).text()]);
  expect({ code, stderr }).toEqual({ code: 0, stderr: '' });
  const result = JSON.parse(stdout);
  expect(result.error).toMatch(/EISDIR/);
  expect(result.producerSignal).toBe('SIGKILL');
  expect(result.directoryPreserved).toBe(true);
});

test('checkBundle accepts a deterministic build with bound reports', async () => {
  const result = await buildInto('out-ok');
  expect(result.outputs.candidateSha256).toBe(fx.candidateSha);
  const bundle = join(fx.dir, 'out-ok');
  const checked = await checkBundle({ bundle });
  expect(checked.ok).toBe(true);
  const time = await readJson(join(bundle, 'time.json'));
  expect(time.checks.every(c => c.status === 'passed')).toBe(true);
  const candidateExports = WebAssembly.Module.exports(new WebAssembly.Module(await readFile(join(bundle, 'candidate.wasm')))).map(e => e.name);
  expect(candidateExports).not.toContain('test_instant');
  expect(candidateExports).not.toContain('test_calendar');
});

test('test instrumentation preserves archived export order inside a replaced range', async () => {
  const local = await materializeFixtureInputs();
  try {
    const recipe = local.recipe();
    const lines = (await readFile(join(local.dir, 'original.dis.wat'), 'utf8')).trimEnd().split('\n');
    const insertion = recipe.edits[1];
    const end = recipe.testExports.line;
    const original = lines.slice(insertion.line - 1, end).join('\n');
    const replacement = await readFile(join(local.dir, insertion.file), 'utf8') + original + '\n';
    await writeFile(join(local.dir, insertion.file), replacement);
    recipe.files[insertion.file] = sha(Buffer.from(replacement));
    recipe.edits[1] = { type: 'replace', start: insertion.line, end, file: insertion.file, originalSha256: sha(Buffer.from(original)) };
    await writeRecipe(local.dir, recipe);
    const out = join(local.dir, 'out');
    await buildMinimalBundle(local, findWabtDir(), out);
    const module = new WebAssembly.Module(await readFile(join(out, 'test.wasm')));
    expect(WebAssembly.Module.exports(module).slice(0, 5).map(item => item.name)).toEqual([
      'test_calendar', 'test_epoch', 'test_instant', 'test_elapsed', 'test_consumer',
    ]);
  } finally {
    await rm(local.dir, { recursive: true, force: true });
  }
});

test('test instrumentation also reproduces archives with verification exports after original exports', async () => {
  const local = await materializeFixtureInputs({ testExportsAtEnd: true });
  try {
    const out = join(local.dir, 'out');
    await buildMinimalBundle(local, findWabtDir(), out);
    const module = new WebAssembly.Module(await readFile(join(out, 'test.wasm')));
    expect(WebAssembly.Module.exports(module).slice(-5).map(item => item.name)).toEqual([
      'test_calendar', 'test_epoch', 'test_instant', 'test_elapsed', 'test_consumer',
    ]);
  } finally {
    await rm(local.dir, { recursive: true, force: true });
  }
});

test('rebuilding the same inputs is byte-for-byte deterministic', async () => {
  await buildInto('out-a');
  await buildInto('out-b');
  for (const file of ['candidate.wasm', 'test.wasm', 'build.json']) {
    const a = await readFile(join(fx.dir, 'out-a', file));
    const b = await readFile(join(fx.dir, 'out-b', file));
    expect(a.equals(b), file).toBe(true);
  }
});

test('rebuildPatch reproduces the bundle from a relocated copy without original paths', async () => {
  await buildInto('out-src');
  const relocated = join(fx.dir, 'relocated-bundle');
  await cp(join(fx.dir, 'out-src'), relocated, { recursive: true });
  const rebuilt = await rebuildPatch({ bundle: relocated, wabtDir, out: join(fx.dir, 'out-rebuilt') });
  expect(rebuilt.outputs.candidateSha256).toBe(fx.candidateSha);
  for (const file of ['candidate.wasm', 'test.wasm', 'build.json']) {
    const a = await readFile(join(fx.dir, 'out-src', file));
    const b = await readFile(join(fx.dir, 'out-rebuilt', file));
    expect(a.equals(b), file).toBe(true);
  }
});

test('a recipe bound to a different original hash is rejected', async () => {
  const local = await materializeFixtureInputs();
  try {
    const recipe = { ...local.recipe(), original: { sha256: '1'.repeat(64), watLines: local.watLines } };
    await writeRecipe(local.dir, recipe);
    await expect(buildMinimalBundle(local, findWabtDir(), join(local.dir, 'out'))).rejects.toThrow(/Original SHA-256 mismatch/);
  } finally {
    await rm(local.dir, { recursive: true, force: true });
  }
});

test('a replacement whose recorded original text does not match is rejected', async () => {
  const local = await materializeFixtureInputs();
  try {
    const recipe = local.recipe();
    recipe.edits[0].originalSha256 = sha(Buffer.from('call 3'));
    await writeRecipe(local.dir, recipe);
    await expect(buildMinimalBundle(local, findWabtDir(), join(local.dir, 'out'))).rejects.toThrow(/Edit assertion failed:/);
  } finally {
    await rm(local.dir, { recursive: true, force: true });
  }
});

test('an existing output directory is refused', async () => {
  await mkdir(join(fx.dir, 'out-exists'));
  await expect(buildInto('out-exists')).rejects.toThrow(/Output directory already exists/);
});

test('checkBundle rejects a bundle whose candidate was replaced by the test module', async () => {
  await buildInto('out-role-swap');
  const bundle = join(fx.dir, 'out-role-swap');
  await copyFile(join(bundle, 'test.wasm'), join(bundle, 'candidate.wasm'));
  await expect(checkBundle({ bundle })).rejects.toThrow(/Bundle check failed:/);
});

test('checkBundle rejects a bundle missing the test module', async () => {
  await buildInto('out-missing-test');
  const bundle = join(fx.dir, 'out-missing-test');
  await rm(join(bundle, 'test.wasm'));
  await expect(checkBundle({ bundle })).rejects.toThrow(/Bundle check failed:/);
});

test('checkBundle rejects reports re-bound to different inputs', async () => {
  await buildInto('out-tampered');
  const bundle = join(fx.dir, 'out-tampered');
  const build = await readJson(join(bundle, 'build.json'));
  build.outputs.candidateSha256 = '2'.repeat(64);
  await writeFile(join(bundle, 'build.json'), JSON.stringify(build));
  await expect(checkBundle({ bundle })).rejects.toThrow(/Bundle check failed:/);
  const structure = await readJson(join(bundle, 'structure.json'));
  structure.originalSha256 = '3'.repeat(64);
  await writeFile(join(bundle, 'structure.json'), JSON.stringify(structure));
  const restored = await readJson(join(bundle, 'build.json'));
  restored.outputs.candidateSha256 = fx.candidateSha;
  await writeFile(join(bundle, 'build.json'), JSON.stringify(restored));
  await expect(checkBundle({ bundle })).rejects.toThrow(/Bundle check failed:/);
});

test('a recipe source file symlinked outside the recipe directory is rejected before output is written', async () => {
  const local = await materializeFixtureInputs();
  const outside = await mkdtemp(join(tmpdir(), 'tern-recipe-escape-'));
  try {
    // 目标内容与原件逐字节相同：拒绝只因 realpath 越界，不因内容或 hash。
    const target = join(outside, 'part-001');
    await writeFile(target, await readFile(join(local.dir, 'parts', 'part-001')));
    await rm(join(local.dir, 'parts', 'part-001'));
    await symlink(target, join(local.dir, 'parts', 'part-001'));
    const out = join(local.dir, 'out');
    await expect(buildMinimalBundle(local, findWabtDir(), out)).rejects.toThrow(/path escapes base directory: parts\/part-001/);
    expect(await exists(out)).toBe(false);
  } finally {
    await rm(local.dir, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  }
});

test('checkBundle rejects a bundle file symlinked outside the bundle even when its bytes are identical', async () => {
  await buildInto('out-file-escape');
  const bundle = join(fx.dir, 'out-file-escape');
  const outside = join(fx.dir, 'outside-candidate.wasm');
  await writeFile(outside, await readFile(join(bundle, 'candidate.wasm')));
  await rm(join(bundle, 'candidate.wasm'));
  await symlink(outside, join(bundle, 'candidate.wasm'));
  await expect(checkBundle({ bundle })).rejects.toThrow(/path escapes bundle: candidate\.wasm/);
});

test('checkBundle rejects a time report with cleared checks even when its hash is re-bound in build.json', async () => {
  await buildInto('out-time-cleared');
  const bundle = join(fx.dir, 'out-time-cleared');
  const timePath = join(bundle, 'time.json');
  const time = await readJson(timePath);
  time.checks = [];
  const tampered = JSON.stringify(time, null, 2) + '\n';
  await writeFile(timePath, tampered);
  const build = await readJson(join(bundle, 'build.json'));
  build.outputs.timeSha256 = sha(Buffer.from(tampered));
  await writeFile(join(bundle, 'build.json'), JSON.stringify(build, null, 2) + '\n');
  await expect(checkBundle({ bundle })).rejects.toThrow(/time\.json has no checks/);
});
