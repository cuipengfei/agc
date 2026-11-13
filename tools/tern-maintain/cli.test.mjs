// 通过真实 bun 子进程驱动 CLI：只断言命令的公开结果（退出码、stdout/stderr、输出文件）。
import { test, expect, afterAll } from 'bun:test';
import binaryen from 'binaryen';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { main } from './cli.mjs';

const CLI = path.join(import.meta.dir, 'cli.mjs');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tern-cli-tests-'));
afterAll(() => fs.rmSync(root, { recursive: true, force: true }));

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
function moduleFile(name, wat) {
  const module = binaryen.parseText(wat);
  const bytes = module.emitBinary();
  module.dispose();
  const file = path.join(root, name);
  fs.writeFileSync(file, bytes);
  return { file, sha: sha256(bytes) };
}

const memoryModule = moduleFile('original.wasm', '(module (memory (export "memory") 1) (data (i32.const 0) "tern-cli-fixture"))');
const changedModule = moduleFile('candidate-changed.wasm', '(module (memory (export "memory") 1) (data (i32.const 0) "tern-cli-CHANGED"))');
const callable = moduleFile('callable.wasm', '(module (memory (export "memory") 1) (func (export "answer") (result i32) (i32.const 42)))');

async function cli(args, cwd = import.meta.dir) {
  const child = Bun.spawn([process.execPath, CLI, ...args], { cwd, stdout: 'pipe', stderr: 'pipe' });
  const [code, stdout, stderr] = await Promise.all([child.exited, new Response(child.stdout).text(), new Response(child.stderr).text()]);
  return { code, stdout, stderr };
}

// 进程内调用真实入口：临时接管 console 与 process.exitCode，结束后原样恢复。
async function runMain(args) {
  const log = console.log, error = console.error, previousCode = process.exitCode;
  const stdout = [], stderr = [];
  console.log = (...parts) => stdout.push(parts.join(' '));
  console.error = (...parts) => stderr.push(parts.join(' '));
  process.exitCode = 0;
  try {
    await main(args);
    return { code: process.exitCode, stdout: stdout.join('\n'), stderr: stderr.join('\n') };
  } finally {
    console.log = log;
    console.error = error;
    process.exitCode = previousCode;
  }
}

test('help prints the full command list and succeeds', async () => {
  for (const args of [[], ['help']]) {
    const result = await cli(args);
    expect(result.code).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('Tern maintenance (no GUI)');
    expect(result.stdout).toContain('bun cli.mjs markdown-windows --binary FILE');
    expect(result.stdout).toContain('Reports never authorize deployment by themselves.');
  }
});
test('unknown commands, unknown options, and extra positionals fail with exit 1', async () => {
  for (const name of ['no-such-command', 'toString']) {
    const unknown = await cli([name]);
    expect(unknown.code).toBe(1);
    expect(unknown.stderr).toContain(`Unknown command: ${name}`);
  }

  const option = await cli(['memory', '--bogus']);
  expect(option.code).toBe(1);
  expect(option.stderr).toContain("Unknown option '--bogus'");

  const stray = path.join(root, 'stray.bin');
  const extra = await cli(['memory', '--wasm', memoryModule.file, '--out', stray, 'positional']);
  expect(extra.code).toBe(1);
  expect(extra.stderr).toContain('Unexpected positional arguments');
  expect(fs.existsSync(stray)).toBe(false);
});

const MISSING = [
  [['fetch'], 'url'],
  [['prepare'], 'binary'],
  [['memory'], 'wasm'],
  [['analyze', '--wasm', memoryModule.file], 'out'],
  [['function', '--wasm', callable.file, '--out', path.join(root, 'function-missing.json')], 'index'],
  [['verify', '--original', memoryModule.file], 'candidate'],
  [['status'], 'binary'],
  [['start', '--binary', '/bin/true'], 'socket'],
  [['inspect-runtime', '--binary', '/bin/true', '--socket', path.join(root, 'missing.sock')], 'port'],
  [['verify-service'], 'url'],
  [['upgrade', '--binary', '/bin/true', '--socket', path.join(root, 'missing.sock'), '--port', '8080'], 'candidate-binary'],
  [['evidence'], 'version'],
  [['browser'], 'url'],
  [['verify-mounted', '--url', 'http://127.0.0.1:1', '--playwright-module', '/tmp/pw.mjs', '--chromium-executable', '/tmp/chrome'], 'token-file'],
  [['build'], 'original'],
  [['rebuild'], 'bundle'],
  [['check-build'], 'bundle'],
  [['assets'], 'fonts'],
  [['verify-page'], 'url'],
  [['markdown-windows'], 'binary'],
];

test('every command rejects its missing required option before doing work', async () => {
  for (const [args, key] of MISSING) {
    const result = await cli(args);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain(`Missing --${key}`);
  }
});

test('port bounds are enforced before assets or services are touched', async () => {
  const base = ['start', '--binary', '/bin/true', '--socket', path.join(root, 'missing.sock')];
  for (const port of ['1023', '65536', '80x', '1024.0']) {
    const result = await cli([...base, '--port', port]);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('Port must be 1024..65535');
  }
  for (const port of ['1024', '65535']) {
    const result = await cli([...base, '--port', port]);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('Missing --assets');
  }
});

test('memory writes initial memory once and never overwrites an existing file', async () => {
  const out = path.join(root, 'initial.bin');
  const first = await cli(['memory', '--wasm', memoryModule.file, '--out', out]);
  expect(first.code).toBe(0);
  expect(JSON.parse(first.stdout)).toEqual({ schemaVersion: 1, inputSha256: memoryModule.sha });
  const written = fs.readFileSync(out);
  expect(written.length).toBe(65536);
  expect(written.subarray(0, 'tern-cli-fixture'.length).toString()).toBe('tern-cli-fixture');

  const second = await cli(['memory', '--wasm', memoryModule.file, '--out', out]);
  expect(second.code).toBe(1);
  expect(second.stderr).toContain('EEXIST');
  expect(fs.readFileSync(out).equals(written)).toBe(true);
});

test('analyze prints the summary, writes a validated report, and refuses to overwrite it', async () => {
  const out = path.join(root, 'analysis.json');
  const first = await cli(['analyze', '--wasm', memoryModule.file, '--out', out]);
  expect(first.code).toBe(0);
  expect(JSON.parse(first.stdout)).toEqual({ schemaVersion: 1, inputSha256: memoryModule.sha, fonts: 0, panics: 0, decision: 'manual_review_required' });
  const report = JSON.parse(fs.readFileSync(out, 'utf8'));
  expect(report.inputSha256).toBe(memoryModule.sha);
  expect(report.decision).toBe('manual_review_required');

  const fonts = path.join(root, 'fonts.json');
  fs.writeFileSync(fonts, '[]\n');
  const withFonts = await cli(['analyze', '--wasm', memoryModule.file, '--fonts', fonts, '--out', path.join(root, 'analysis-fonts.json')]);
  expect(withFonts.code).toBe(0);
  expect(JSON.parse(withFonts.stdout).fonts).toBe(0);

  const before = fs.readFileSync(out);
  const second = await cli(['analyze', '--wasm', memoryModule.file, '--out', out]);
  expect(second.code).toBe(1);
  expect(second.stderr).toContain('EEXIST');
  expect(fs.readFileSync(out).equals(before)).toBe(true);
});

test('function reports the requested signature and rejects an index outside the module', async () => {
  const out = path.join(root, 'function.json');
  const result = await cli(['function', '--wasm', callable.file, '--index', '0', '--out', out]);
  expect(result.code).toBe(0);
  const report = JSON.parse(result.stdout);
  expect(report.schemaVersion).toBe(1);
  expect(report.inputSha256).toBe(callable.sha);
  expect(report.index).toBe(0);
  expect(report.params).toEqual([]);
  expect(report.results).toEqual([binaryen.i32]);
  expect(report.body).toContain('42');
  expect(JSON.parse(fs.readFileSync(out, 'utf8'))).toEqual(report);

  const outsideOut = path.join(root, 'function-outside.json');
  const outside = await cli(['function', '--wasm', callable.file, '--index', '99', '--out', outsideOut]);
  expect(outside.code).toBe(1);
  expect(outside.stderr).toContain('Function index outside module');
  expect(fs.existsSync(outsideOut)).toBe(false);
});

test('verify maps failed structural checks to exit 1 and keeps a matching pair at exit 0', async () => {
  const okOut = path.join(root, 'verify-ok.json');
  const same = await cli(['verify', '--original', memoryModule.file, '--candidate', memoryModule.file, '--out', okOut]);
  expect(same.code).toBe(0);
  const report = JSON.parse(fs.readFileSync(okOut, 'utf8'));
  expect(report.deployable).toBe(false);
  expect(report.checks.find(check => check.name === 'initial_memory').status).toBe('passed');

  const badOut = path.join(root, 'verify-changed.json');
  const changed = await cli(['verify', '--original', memoryModule.file, '--candidate', changedModule.file, '--out', badOut]);
  expect(changed.code).toBe(1);
  expect(JSON.parse(changed.stdout).checks.find(check => check.name === 'initial_memory').status).toBe('failed');
});

test('upgrade rejects an existing report before validating the rest of its options', async () => {
  const out = path.join(root, 'upgrade.json');
  fs.writeFileSync(out, '{}\n');
  const result = await cli(['upgrade', '--out', out]);
  expect(result.code).toBe(1);
  expect(result.stderr).toContain('Upgrade report already exists');
  expect(result.stderr).not.toContain('Missing --');
  expect(fs.readFileSync(out, 'utf8')).toBe('{}\n');
});

test('markdown-windows reports not_run and exits 2 when prerequisites fail', async () => {
  const assets = path.join(root, 'assets');
  fs.mkdirSync(assets);
  const out = path.join(root, 'windows.json');
  const args = ['markdown-windows', '--binary', path.join(root, 'missing-tern'), '--assets', assets, '--out', out];
  const result = await cli(args);
  expect(result.code).toBe(2);
  const report = JSON.parse(fs.readFileSync(out, 'utf8'));
  expect(report.kind).toBe('markdown-reproduction');
  expect(report.conclusion).toBe('not_run');
  expect(report.reason).not.toBe('');
  expect(JSON.parse(result.stdout).conclusion).toBe('not_run');

  const again = await cli(args);
  expect(again.code).toBe(1);
  expect(again.stderr).toContain('EEXIST');
});

test('a failed report write never echoes token-like path text', async () => {
  const target = path.join(root, 'report?token=secret-value');
  fs.mkdirSync(target);
  const result = await cli(['analyze', '--wasm', memoryModule.file, '--out', target]);
  expect(result.code).toBe(1);
  expect(result.stderr).not.toContain('secret-value');
  expect(result.stderr).toContain('token=<REDACTED>');
});

test('relative paths are resolved against the working directory', async () => {
  const cwd = path.join(root, 'cwd');
  fs.mkdirSync(cwd);
  fs.copyFileSync(callable.file, path.join(cwd, 'callable.wasm'));
  const memory = await cli(['memory', '--wasm', 'callable.wasm', '--out', 'initial.bin'], cwd);
  expect(memory.code).toBe(0);
  expect(fs.existsSync(path.join(cwd, 'initial.bin'))).toBe(true);

  const check = await cli(['check-build', '--bundle', 'missing-bundle'], cwd);
  expect(check.code).toBe(1);
  expect(check.stderr).toContain(path.join(cwd, 'missing-bundle'));
});

test('fetch rejects non-local and credentialed base URLs without reaching the network', async () => {
  const remote = await cli(['fetch', '--url', 'https://example.com/tern', '--out', path.join(root, 'remote')]);
  expect(remote.code).toBe(1);
  expect(remote.stderr).toContain('local Tern service');

  const credentialed = await cli(['fetch', '--url', 'http://user:pass@127.0.0.1:8080/', '--out', path.join(root, 'credentialed')]);
  expect(credentialed.code).toBe(1);
  expect(credentialed.stderr).toContain('credential-free');

  const query = await cli(['fetch', '--url', 'http://127.0.0.1:8080/?token=abc', '--out', path.join(root, 'query')]);
  expect(query.code).toBe(1);
  expect(query.stderr).toContain('credential-free');
  expect(fs.existsSync(path.join(root, 'query'))).toBe(false);
});

test('the exported main runs help and a real write in this process', async () => {
  for (const args of [[], ['help']]) {
    const result = await runMain(args);
    expect(result.code).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('Tern maintenance (no GUI)');
  }

  const out = path.join(root, 'in-process.bin');
  const memory = await runMain(['memory', '--wasm', memoryModule.file, '--out', out]);
  expect(memory.code).toBe(0);
  expect(JSON.parse(memory.stdout)).toEqual({ schemaVersion: 1, inputSha256: memoryModule.sha });
  expect(fs.readFileSync(out).length).toBe(65536);
});

test('the exported main rejects missing options, unknown commands, and overwrites in this process', async () => {
  const out = path.join(root, 'in-process-guard.bin');
  await runMain(['memory', '--wasm', memoryModule.file, '--out', out]);
  const written = fs.readFileSync(out);
  await expect(main(['memory', '--wasm', memoryModule.file, '--out', out])).rejects.toThrow('EEXIST');
  expect(fs.readFileSync(out).equals(written)).toBe(true);

  await expect(main(['memory'])).rejects.toThrow('Missing --wasm');
  await expect(main(['toString'])).rejects.toThrow('Unknown command: toString');
  await expect(main(['memory', '--wasm', memoryModule.file, '--out', path.join(root, 'in-process-extra.bin'), 'extra'])).rejects.toThrow('Unexpected positional arguments');
});

test('the exported main rejects an existing upgrade report before other options in this process', async () => {
  const out = path.join(root, 'in-process-upgrade.json');
  fs.writeFileSync(out, '{}\n');
  await expect(main(['upgrade', '--out', out])).rejects.toThrow('Upgrade report already exists');

  const args = ['upgrade', '--binary', '/bin/true', '--socket', path.join(root, 'missing.sock'), '--port', '8080'];
  await expect(main([...args, '--out', path.join(root, 'in-process-upgrade-fresh.json')])).rejects.toThrow('Missing --candidate-binary');
  await expect(main(['upgrade'])).rejects.toThrow('Missing --binary');
});
