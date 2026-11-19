import { test, expect } from 'bun:test';
import { mkdtemp, writeFile, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildRegistrationPatch } from './font-registration.mjs';

test('an unreviewed module is rejected before creating deployable output', async () => {
  const root = await mkdtemp(join(tmpdir(), 'tern-registration-guard-'));
  try {
    const original = join(root, 'unknown.wasm'), glue = join(root, 'glue.js'), out = join(root, 'candidate');
    await writeFile(original, 'unreviewed module');
    await writeFile(glue, 'unreviewed glue');
    await expect(buildRegistrationPatch({ original, glue, out })).rejects.toThrow('Unknown official WASM');
    expect(await access(out).then(() => true, () => false)).toBe(false);
  } finally { await rm(root, { recursive: true, force: true }); }
});
