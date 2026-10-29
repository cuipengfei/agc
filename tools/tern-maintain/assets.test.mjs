import { test, expect, afterAll } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { sha256 } from './analyze.mjs';
import { assembleAssets } from './assets.mjs';
import { buildTestBundle } from './fixtures/bundle-fixture.mjs';

// 真实最小 bundle：运行期由共享 helper 用真实微小 WAT + 静态 glue 经实际
// buildPatch 生成（与 CLI 测试同源，绝不 mock checkBundle）。
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tern-assets-tests-'));
afterAll(() => fs.rmSync(root, { recursive: true, force: true }));

const fixture = await buildTestBundle(path.join(root, 'fixture-bundle'));
const run = test;
const sha = value => sha256(value);
const fixtureBundle = fixture.bundle;
const build = fixture.build;
const fontBytes = { Regular: new Uint8Array([1, 2, 3]), Bold: new Uint8Array([4, 5, 6]) };

// 本组验证资源身份与路径边界；真实字体内容由 FontTools 和页面验收覆盖。
function makeFontsDir(name, modify = null) {
  const dir = path.join(root, name);
  fs.mkdirSync(path.join(dir, 'pkg'), { recursive: true });
  const manifest = {
    schemaVersion: 1,
    analysisSha256: sha(Buffer.from('analysis')),
    wasmSha256: build.outputs.candidateSha256,
    wasmUrl: './pkg/client.wasm',
    fonts: [
      { style: 'Regular', slot: 1000, expectedPointer: 2000, expectedLength: 20, url: './pkg/MapleMono-NF-CN-Regular.ttf', sha256: sha(fontBytes.Regular), sourceSha256: sha(fontBytes.Regular), bytes: fontBytes.Regular.length, characters: 3, cjk: 0 },
      { style: 'Bold', slot: 1040, expectedPointer: 3000, expectedLength: 20, url: './pkg/MapleMono-NF-CN-Bold.ttf', sha256: sha(fontBytes.Bold), sourceSha256: sha(fontBytes.Bold), bytes: fontBytes.Bold.length, characters: 3, cjk: 0 },
    ],
  };
  if (modify) modify(manifest);
  fs.writeFileSync(path.join(dir, 'fonts.json'), JSON.stringify(manifest, null, 2));
  fs.writeFileSync(path.join(dir, 'pkg', 'MapleMono-NF-CN-Regular.ttf'), fontBytes.Regular);
  fs.writeFileSync(path.join(dir, 'pkg', 'MapleMono-NF-CN-Bold.ttf'), fontBytes.Bold);
  return dir;
}

const read = (dir, relative) => fs.readFileSync(path.join(dir, relative));


run('rejects a font whose recorded SHA-256 does not match the file', async () => {
  const fonts = makeFontsDir('fonts-bad-hash', manifest => { manifest.fonts[1].sha256 = sha(Buffer.from('other')); });
  const out = path.join(root, 'out-bad-hash');
  await expect(assembleAssets({ bundle: fixtureBundle, fonts, out })).rejects.toThrow('Bold font SHA-256 does not match');
  expect(fs.existsSync(out)).toBe(false);
});

run('rejects out-of-tree resource paths in the fonts manifest', async () => {
  const fonts = makeFontsDir('fonts-traversal', manifest => { manifest.fonts[0].url = '../pkg/../evil.ttf'; });
  const out = path.join(root, 'out-traversal');
  await expect(assembleAssets({ bundle: fixtureBundle, fonts, out })).rejects.toThrow(/fonts\.json: unexpected Regular url/);
  expect(fs.existsSync(out)).toBe(false);
});

run('rejects a fonts manifest bound to the test module instead of the candidate', async () => {
  const fonts = makeFontsDir('fonts-test-module', manifest => { manifest.wasmSha256 = build.outputs.testModuleSha256; });
  const out = path.join(root, 'out-test-module');
  await expect(assembleAssets({ bundle: fixtureBundle, fonts, out })).rejects.toThrow('WASM identity does not match the verified bundle candidate');
  expect(fs.existsSync(out)).toBe(false);
});

run('rejects a font leaf symlink escaping the fonts directory', async () => {
  const fonts = makeFontsDir('fonts-symlink');
  const outside = path.join(root, 'outside.ttf');
  fs.writeFileSync(outside, fontBytes.Regular);
  fs.rmSync(path.join(fonts, 'pkg', 'MapleMono-NF-CN-Regular.ttf'));
  fs.symlinkSync(outside, path.join(fonts, 'pkg', 'MapleMono-NF-CN-Regular.ttf'));
  const out = path.join(root, 'out-symlink');
  await expect(assembleAssets({ bundle: fixtureBundle, fonts, out })).rejects.toThrow('path escapes its directory');
  expect(fs.existsSync(out)).toBe(false);
});

run('rejects a bundle whose candidate was tampered with after the build', async () => {
  const fonts = makeFontsDir('fonts-tamper');
  const bundle = path.join(root, 'bundle-tamper');
  fs.cpSync(fixtureBundle, bundle, { recursive: true });
  fs.writeFileSync(path.join(bundle, 'candidate.wasm'), read(fixtureBundle, 'test.wasm'));
  const out = path.join(root, 'out-tamper');
  await expect(assembleAssets({ bundle, fonts, out })).rejects.toThrow('Bundle check failed');
  expect(fs.existsSync(out)).toBe(false);
});

run('refuses to overwrite an existing output directory', async () => {
  const fonts = makeFontsDir('fonts-existing');
  const out = path.join(root, 'out-existing');
  fs.mkdirSync(out);
  await expect(assembleAssets({ bundle: fixtureBundle, fonts, out })).rejects.toThrow('already exists');
});

run('records the patched mode and candidate identity for a bundle assembly', async () => {
  const fonts = makeFontsDir('fonts-patched');
  const out = path.join(root, 'out-patched');
  const manifest = await assembleAssets({ bundle: fixtureBundle, fonts, out });
  expect(manifest).toMatchObject({ schemaVersion: 1, mode: 'patched', version: build.version });
  expect(manifest.candidateSha256).toBe(build.outputs.candidateSha256);
  expect(manifest.files['pkg/client.wasm']).toBe(build.outputs.candidateSha256);
  expect(manifest.files['pkg/client.js']).toBe(build.inputs.glueSha256);
  expect(read(out, 'pkg/client.wasm').equals(read(fixtureBundle, 'candidate.wasm'))).toBe(true);
  expect(read(out, 'pkg/client.js').equals(read(fixtureBundle, 'glue.js'))).toBe(true);
});
