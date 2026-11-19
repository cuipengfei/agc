import { test, expect, afterAll } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { sha256 } from './analyze.mjs';
import { assembleAssets } from './assets.mjs';
import { buildTestBundle } from './fixtures/bundle-fixture.mjs';

// 真实最小 bundle：registration 目录复用其 candidate/glue 与 hash，形态与
// 字体名称登记补丁的构建目录一致（registration.json + candidate.wasm + glue.js）。
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tern-assets-registration-'));
afterAll(() => fs.rmSync(root, { recursive: true, force: true }));

const fixture = await buildTestBundle(path.join(root, 'fixture-bundle'));
const bundle = fixture.bundle;
const build = fixture.build;
const read = (dir, relative) => fs.readFileSync(path.join(dir, relative));

/** 补丁构建目录：registration.json + candidate.wasm + glue.js。 */
function makeRegistrationDir(name, modify = null) {
  const dir = path.join(root, name);
  fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(path.join(bundle, 'candidate.wasm'), path.join(dir, 'candidate.wasm'));
  fs.copyFileSync(path.join(bundle, 'glue.js'), path.join(dir, 'glue.js'));
  const declared = {
    schemaVersion: 1,
    kind: 'font-registration',
    version: build.version,
    originalSha256: build.inputs.originalSha256,
    candidateSha256: build.outputs.candidateSha256,
    glueSha256: build.inputs.glueSha256,
  };
  if (modify) modify(declared, dir);
  fs.writeFileSync(path.join(dir, 'registration.json'), JSON.stringify(declared, null, 2) + '\n');
  return dir;
}

test('registration assembly serves the verified candidate with no Maple artifacts', async () => {
  const registration = makeRegistrationDir('registration-ok');
  const out = path.join(root, 'out-ok');
  const manifest = await assembleAssets({ registration, out });

  expect(read(out, 'pkg/client.wasm').equals(read(bundle, 'candidate.wasm'))).toBe(true);
  expect(read(out, 'pkg/client.js').equals(read(bundle, 'glue.js'))).toBe(true);
  expect(manifest).toMatchObject({
    schemaVersion: 1,
    mode: 'font-registration',
    version: build.version,
    originalSha256: build.inputs.originalSha256,
    candidateSha256: build.outputs.candidateSha256,
    glueSha256: build.inputs.glueSha256,
  });
  expect(manifest.files['pkg/client.wasm']).toBe(build.outputs.candidateSha256);
  expect(manifest.files['pkg/client.js']).toBe(build.inputs.glueSha256);
  expect(Object.keys(manifest.files).sort()).toEqual(['index.html', 'pkg/client.js', 'pkg/client.wasm']);
  expect(JSON.parse(read(out, 'deploy-manifest.json'))).toEqual(manifest);
  // 旧字体清单与 maple.js 不是新模式的输入，也不得出现在产物里。
  expect(fs.existsSync(path.join(out, 'fonts.json'))).toBe(false);
  expect(fs.existsSync(path.join(out, 'maple.js'))).toBe(false);
  // 页面接线：入口模块与候选 WASM 路径必须指向产物内实际文件，且不再引用旧加载器。
  const html = read(out, 'index.html').toString('utf8');
  expect(html.includes("from './pkg/client.js'")).toBe(true);
  expect(html.includes("'./pkg/client.wasm'")).toBe(true);
  expect(html.includes('maple.js')).toBe(false);
  expect(html.includes('<!--TERN:')).toBe(false);
  expect(html.includes(build.version)).toBe(true);
});

test('registration assembly rejects a candidate WASM that does not match the declared identity', async () => {
  const registration = makeRegistrationDir('registration-wasm', (declared, dir) => {
    fs.copyFileSync(path.join(bundle, 'original.wasm'), path.join(dir, 'candidate.wasm'));
  });
  const out = path.join(root, 'out-wasm');
  await expect(assembleAssets({ registration, out })).rejects.toThrow(/candidate\.wasm differs from registration\.json candidateSha256/);
  expect(fs.existsSync(out)).toBe(false);
});

test('registration assembly rejects a glue that does not match the declared identity', async () => {
  const registration = makeRegistrationDir('registration-glue', (declared, dir) => {
    fs.writeFileSync(path.join(dir, 'glue.js'), Buffer.from(read(bundle, 'glue.js').toString('utf8') + '\n// replaced\n'));
  });
  const out = path.join(root, 'out-glue');
  await expect(assembleAssets({ registration, out })).rejects.toThrow(/glue\.js differs from registration\.json glueSha256/);
  expect(fs.existsSync(out)).toBe(false);
});

test('registration assembly rejects an unexpected registration kind', async () => {
  const registration = makeRegistrationDir('registration-kind', declared => { declared.kind = 'font-only'; });
  const out = path.join(root, 'out-kind');
  await expect(assembleAssets({ registration, out })).rejects.toThrow(/registration\.json: unexpected kind/);
  expect(fs.existsSync(out)).toBe(false);
});

test('registration assembly rejects an unsupported schemaVersion', async () => {
  const registration = makeRegistrationDir('registration-schema', declared => { declared.schemaVersion = 2; });
  const out = path.join(root, 'out-schema');
  await expect(assembleAssets({ registration, out })).rejects.toThrow(/registration\.json: unsupported schemaVersion/);
  expect(fs.existsSync(out)).toBe(false);
});

test('registration assembly rejects a non-hex identity hash', async () => {
  const registration = makeRegistrationDir('registration-hex', declared => { declared.candidateSha256 = 'z'.repeat(64); });
  const out = path.join(root, 'out-hex');
  await expect(assembleAssets({ registration, out })).rejects.toThrow(/registration\.json: invalid candidateSha256/);
  expect(fs.existsSync(out)).toBe(false);
});

test('registration assembly refuses to mix registration with legacy inputs', async () => {
  const registration = makeRegistrationDir('registration-mixed');
  await expect(assembleAssets({ registration, fonts: root, out: path.join(root, 'out-mixed-fonts') }))
    .rejects.toThrow(/registration must not be combined/);
  await expect(assembleAssets({ registration, bundle, out: path.join(root, 'out-mixed-bundle') }))
    .rejects.toThrow(/registration must not be combined/);
  expect(fs.existsSync(path.join(root, 'out-mixed-fonts'))).toBe(false);
  expect(fs.existsSync(path.join(root, 'out-mixed-bundle'))).toBe(false);
});
