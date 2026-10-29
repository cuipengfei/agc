import { test, expect, afterAll } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { sha256 } from './analyze.mjs';
import { assembleAssets } from './assets.mjs';
import { materializeFixtureInputs, GLUE_FIXTURE, MINIMAL_VERSION } from './fixtures/bundle-fixture.mjs';

// 真实微小 WAT（prepare 产物的原版二进制同款）与静态 glue，外加 prepare 写出的
// inputs.json 形态；不 mock 任何 hash 校验。
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tern-assets-official-'));
const fx = await materializeFixtureInputs();
afterAll(async () => {
  await fs.promises.rm(fx.dir, { recursive: true, force: true });
  fs.rmSync(root, { recursive: true, force: true });
});

const officialWasm = fs.readFileSync(fx.paths.original);
const officialGlue = fs.readFileSync(GLUE_FIXTURE);
const officialWasmSha256 = sha256(officialWasm);
const officialGlueSha256 = sha256(officialGlue);
const fontBytes = { Regular: new Uint8Array([11, 12, 13]), Bold: new Uint8Array([14, 15, 16]) };
const read = (dir, relative) => fs.readFileSync(path.join(dir, relative));

/** prepare 产物目录：pkg/original.wasm + pkg/client.js + inputs.json。 */
function makeOfficialDir(name, mutate = null) {
  const dir = path.join(root, name);
  fs.mkdirSync(path.join(dir, 'pkg'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'pkg', 'original.wasm'), officialWasm);
  fs.writeFileSync(path.join(dir, 'pkg', 'client.js'), officialGlue);
  const declared = {
    schemaVersion: 1,
    version: MINIMAL_VERSION,
    url: `https://build.stencil.so/web/tern/${MINIMAL_VERSION}/stencil_tern_web_bg.wasm`,
    integrity: `sha384-${'A'.repeat(64)}`,
    wasmSha256: officialWasmSha256,
    glueSha256: officialGlueSha256,
  };
  if (mutate) mutate({ dir, declared });
  fs.writeFileSync(path.join(dir, 'inputs.json'), JSON.stringify(declared, null, 2) + '\n');
  return dir;
}

function makeFontsDir(name, wasmSha256, modify = null) {
  const dir = path.join(root, name);
  fs.mkdirSync(path.join(dir, 'pkg'), { recursive: true });
  const manifest = {
    schemaVersion: 1,
    analysisSha256: sha256(Buffer.from('analysis')),
    wasmSha256,
    wasmUrl: './pkg/client.wasm',
    fonts: [
      { style: 'Regular', slot: 1000, expectedPointer: 2000, expectedLength: 20, url: './pkg/MapleMono-NF-CN-Regular.ttf', sha256: sha256(fontBytes.Regular), sourceSha256: sha256(fontBytes.Regular), bytes: fontBytes.Regular.length, characters: 3, cjk: 0 },
      { style: 'Bold', slot: 1040, expectedPointer: 3000, expectedLength: 20, url: './pkg/MapleMono-NF-CN-Bold.ttf', sha256: sha256(fontBytes.Bold), sourceSha256: sha256(fontBytes.Bold), bytes: fontBytes.Bold.length, characters: 3, cjk: 0 },
    ],
  };
  if (modify) modify(manifest);
  fs.writeFileSync(path.join(dir, 'fonts.json'), JSON.stringify(manifest, null, 2));
  fs.writeFileSync(path.join(dir, 'pkg', 'MapleMono-NF-CN-Regular.ttf'), fontBytes.Regular);
  fs.writeFileSync(path.join(dir, 'pkg', 'MapleMono-NF-CN-Bold.ttf'), fontBytes.Bold);
  return dir;
}

test('font-only assembly copies the official WASM and glue byte for byte', async () => {
  const official = makeOfficialDir('official-ok');
  const fonts = makeFontsDir('fonts-ok', officialWasmSha256);
  const out = path.join(root, 'out-ok');
  const manifest = await assembleAssets({ official, fonts, out });

  expect(fs.readFileSync(path.join(out, 'pkg', 'client.wasm')).equals(read(official, 'pkg/original.wasm'))).toBe(true);
  expect(fs.readFileSync(path.join(out, 'pkg', 'client.js')).equals(read(official, 'pkg/client.js'))).toBe(true);
  expect(manifest).toMatchObject({
    schemaVersion: 1,
    mode: 'font-only',
    version: MINIMAL_VERSION,
    originalSha256: officialWasmSha256,
    glueSha256: officialGlueSha256,
    wasmUnmodified: true,
  });
  expect(manifest.files['pkg/client.wasm']).toBe(officialWasmSha256);
  expect(manifest.files['pkg/client.js']).toBe(officialGlueSha256);
  expect(Object.keys(manifest.files).sort()).toEqual([
    'fonts.json', 'index.html', 'maple.js',
    'pkg/MapleMono-NF-CN-Bold.ttf', 'pkg/MapleMono-NF-CN-Regular.ttf', 'pkg/client.js', 'pkg/client.wasm',
  ]);
  expect(JSON.parse(read(out, 'deploy-manifest.json'))).toEqual(manifest);
});

test('font-only assembly rejects a replaced official glue', async () => {
  const official = makeOfficialDir('official-glue', ({ dir }) => {
    fs.writeFileSync(path.join(dir, 'pkg', 'client.js'), Buffer.from(officialGlue.toString('utf8') + '\n// replaced\n'));
  });
  const fonts = makeFontsDir('fonts-glue', officialWasmSha256);
  const out = path.join(root, 'out-glue');
  await expect(assembleAssets({ official, fonts, out })).rejects.toThrow(/client\.js differs from inputs\.json glueSha256/);
  expect(fs.existsSync(out)).toBe(false);
});

test('font-only assembly rejects an official WASM that differs from its declared hash', async () => {
  const official = makeOfficialDir('official-wasm', ({ dir }) => {
    fs.writeFileSync(path.join(dir, 'pkg', 'original.wasm'), Buffer.concat([officialWasm, Buffer.from([0])]));
  });
  const fonts = makeFontsDir('fonts-wasm', officialWasmSha256);
  const out = path.join(root, 'out-wasm');
  await expect(assembleAssets({ official, fonts, out })).rejects.toThrow(/original\.wasm differs from inputs\.json wasmSha256/);
  expect(fs.existsSync(out)).toBe(false);
});

test('font-only assembly rejects a font whose recorded SHA-256 does not match', async () => {
  const official = makeOfficialDir('official-font-hash');
  const fonts = makeFontsDir('fonts-font-hash', officialWasmSha256, manifest => { manifest.fonts[0].sha256 = sha256(Buffer.from('other')); });
  const out = path.join(root, 'out-font-hash');
  await expect(assembleAssets({ official, fonts, out })).rejects.toThrow(/Regular font SHA-256 does not match/);
  expect(fs.existsSync(out)).toBe(false);
});

test('font-only assembly rejects a fonts manifest bound to another WASM', async () => {
  const official = makeOfficialDir('official-wasm-binding');
  const fonts = makeFontsDir('fonts-wasm-binding', sha256(Buffer.from('not the official wasm')));
  const out = path.join(root, 'out-wasm-binding');
  await expect(assembleAssets({ official, fonts, out })).rejects.toThrow(/WASM identity does not match/);
  expect(fs.existsSync(out)).toBe(false);
});

test('assembly requires exactly one of bundle or official', async () => {
  const fonts = makeFontsDir('fonts-mode', officialWasmSha256);
  await expect(assembleAssets({ fonts, out: path.join(root, 'out-none') })).rejects.toThrow(/exactly one of bundle or official/);
  await expect(assembleAssets({ bundle: root, official: root, fonts, out: path.join(root, 'out-both') })).rejects.toThrow(/exactly one of bundle or official/);
  expect(fs.existsSync(path.join(root, 'out-none'))).toBe(false);
  expect(fs.existsSync(path.join(root, 'out-both'))).toBe(false);
});
