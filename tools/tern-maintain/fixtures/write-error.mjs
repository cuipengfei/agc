import { mock } from 'bun:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import cp from 'node:child_process';
import { lstat, rm } from 'node:fs/promises';
import { join } from 'node:path';

const realSpawn = cp.spawn;
const realStream = fs.createWriteStream;
let stalled = false, producerSignal = null, failureDirectory;
mock.module('node:child_process', () => ({ ...cp, default: cp, spawn(binary, args, options) {
  if (String(binary).endsWith('/wasm2wat') && args.length === 1 && args[0].endsWith('/original.wasm')) {
    stalled = true;
    const child = realSpawn(process.execPath, ['-e', 'setTimeout(() => process.exit(0), 3000)'], options);
    child.once('close', (_code, signal) => { producerSignal = signal; });
    return child;
  }
  return realSpawn(binary, args, options);
} }));
mock.module('node:fs', () => ({ ...fs, default: fs, createWriteStream(path, options) {
  return realStream(String(path).endsWith('/test.wat') ? failureDirectory : path, options);
} }));
const { materializeFixtureInputs, findWabtDir } = await import('./bundle-fixture.mjs');
const { buildPatch } = await import('../build.mjs');
const fixture = await materializeFixtureInputs();
failureDirectory = fixture.dir;
try {
  const out = join(fixture.dir, 'out');
  let failure;
  try {
    await buildPatch({ ...fixture.paths, wabtDir: findWabtDir(), out });
  } catch (error) {
    failure = error;
  }
  assert.equal(stalled, true, 'The real builder must enter the idle producer boundary');
  const directoryPreserved = await lstat(out).then(value => value.isDirectory(), () => false);
  console.log(JSON.stringify({ error: failure?.message, producerSignal, directoryPreserved }));
} finally {
  await rm(fixture.dir, { recursive: true, force: true });
}
