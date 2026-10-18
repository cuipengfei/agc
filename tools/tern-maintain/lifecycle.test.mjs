import { test, expect, beforeAll, afterAll } from 'bun:test';
import { spawn, spawnSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspectRuntime, verifyService, upgrade, prepare } from './lifecycle.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixtureSource = path.join(here, 'fixtures', 'tern-lifecycle.c');
const managerFixture = path.join(here, 'fixtures', 'tern-manager.py');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tern-lifecycle-tests-'));
const build = path.join(root, 'build');
const installed = path.join(root, 'installed'); // 'tern' binary being "installed"
const candidateDir = path.join(root, 'candidate');
const assets = path.join(root, 'assets');
const tokenFile = path.join(root, 'web-token');
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const TOKEN = randomBytes(16).toString('hex');

let tern = null; // compiled fixture binary path (…/build/tern)
let installedTern = path.join(installed, 'tern');
let candidateTern = path.join(candidateDir, 'tern2');
const tracked = []; // pids to terminate in afterAll

function track(pid) { if (Number.isInteger(pid) && pid > 1) tracked.push(pid); return pid; }
function killPid(pid, signal = 'SIGTERM') { try { process.kill(pid, signal); } catch {} }
function pidAlive(pid) { try { process.kill(pid, 0); return true; } catch { return false; } }
async function freePort() {
  const server = net.createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const value = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return value;
}
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function waitFor(fn, timeoutMs, intervalMs = 100) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try { if (await fn()) return; } catch (error) { lastError = error; }
    await sleep(intervalMs);
  }
  throw lastError instanceof Error ? lastError : new Error('timed out waiting for condition');
}
async function httpStatus(port) {
  try { return (await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(1000) })).status; }
  catch { return null; }
}
function daemonAnswered(socket) {
  const run = spawnSync(installedTern, ['ls', '--json'], { env: { ...process.env, TERN_DAEMON_SOCKET: socket }, encoding: 'utf8', timeout: 2000 });
  return run.status === 0;
}
async function waitDaemon(socket, timeoutMs = 8000) {
  await waitFor(() => daemonAnswered(socket), timeoutMs);
}
function startManager(args) {
  const child = spawn('python3', [managerFixture, '--', tern, ...args], { stdio: 'ignore', env: { ...process.env } });
  track(child.pid);
  return child;
}
function startService({ socket, port }) {
  fs.mkdirSync(path.dirname(socket), { recursive: true, mode: 0o700 });
  const daemonManager = startManager(['daemon', '--socket', socket]);
  const webManager = startManager(['web', 'serve', '--listen', `127.0.0.1:${port}`, '--token', tokenFile, '--assets', assets]);
  return [daemonManager.pid, webManager.pid];
}
async function waitService(socket, port, timeoutMs = 8000) {
  await waitDaemon(socket, timeoutMs);
  await waitFor(async () => (await httpStatus(port)) === 200, timeoutMs);
}
function cleanupStateDir(stateDir) {
  for (const name of ['tern-web.pid', 'tern-daemon.pid']) {
    try {
      const pid = Number(fs.readFileSync(path.join(stateDir, name), 'utf8').trim());
      if (Number.isInteger(pid) && pid > 1) killPid(pid);
    } catch {}
  }
}

// Fake /proc tree: entries { pid, ppid, exe (symlink target), argv }.
function fakeProc(entries) {
  const dir = fs.mkdtempSync(path.join(root, 'proc-'));
  for (const entry of entries) {
    const proc = path.join(dir, String(entry.pid));
    fs.mkdirSync(proc);
    fs.writeFileSync(path.join(proc, 'cmdline'), Buffer.concat(entry.argv.map(arg => Buffer.from(arg + '\0'))));
    fs.symlinkSync(entry.exe, path.join(proc, 'exe'));
    fs.writeFileSync(
      path.join(proc, 'stat'),
      `${entry.pid} (${path.basename(entry.argv[0])}) S ${entry.ppid} ` + '0 '.repeat(50).trim() + '\n',
    );
  }
  return dir;
}

beforeAll(() => {
  fs.mkdirSync(build, { recursive: true });
  const compile = spawnSync('cc', ['-O2', `-DFIXTURE_JS=${JSON.stringify(path.join(here, 'fixtures', 'tern-lifecycle.mjs'))}`, '-o', path.join(build, 'tern'), fixtureSource], { encoding: 'utf8' });
  if (compile.error || compile.status !== 0) throw new Error(`fixture build failed: ${compile.stderr || compile.error}`);
  tern = path.join(build, 'tern');
  fs.mkdirSync(path.join(installed), { recursive: true });
  fs.copyFileSync(tern, installedTern);
  fs.mkdirSync(candidateDir, { recursive: true });
  fs.copyFileSync(tern, candidateTern); // same content, different inode
  fs.mkdirSync(path.join(assets, 'pkg'), { recursive: true });
  fs.writeFileSync(path.join(assets, 'pkg', 'client.wasm'), Buffer.from('lifecycle-wasm-bytes'));
  fs.writeFileSync(path.join(assets, 'pkg', 'client.js'), Buffer.from('lifecycle-glue-js'));
  fs.writeFileSync(tokenFile, TOKEN + '\n', { mode: 0o600 });
});

afterAll(async () => {
  for (const pid of tracked) killPid(pid);
  await sleep(200);
  for (const pid of tracked) killPid(pid, 'SIGKILL');
  // Detached services spawned by upgrade are not in `tracked`; sweep pid files under root.
  for (const pid of pidFiles(root).filter(pid => pid !== process.pid)) killPid(pid, 'SIGKILL');
  fs.rmSync(root, { recursive: true, force: true });
});

function pidFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(item => {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) return pidFiles(full);
    if (item.name.endsWith('.pid')) {
      const pid = Number(fs.readFileSync(full, 'utf8').trim());
      return Number.isInteger(pid) && pid > 1 ? [pid] : [];
    }
    return [];
  });
}

test('inspectRuntime attributes daemon/web to their managers (python or Bun __redact) and never to the manager process', async () => {
  const port = await freePort();
  const socket = path.join(root, 'fake-proc', 'daemon.sock');
  const runtimeModule = fileURLToPath(new URL('./runtime.mjs', import.meta.url));
  const procRoot = fakeProc([
    { pid: 10, ppid: 1, exe: '/usr/bin/python3', argv: ['python3', '/home/u/.local/share/tern-web-0.9.4/daemon.py'] },
    { pid: 11, ppid: 10, exe: installedTern, argv: ['/home/u/.local/bin/tern', 'daemon', '--socket', socket] },
    { pid: 16, ppid: 1, exe: process.execPath, argv: [process.execPath, runtimeModule, '__redact', '/tmp/w.log', '/tmp/w.pid', '--', '/home/u/.local/bin/tern', 'web', 'serve', '--listen', `127.0.0.1:${port}`, '--token', '/home/u/.config/tern/web-token', '--assets', '/home/u/.local/share/tern-web-0.9.4'] },
    { pid: 13, ppid: 16, exe: installedTern, argv: ['/home/u/.local/bin/tern', 'web', 'serve', '--listen', `127.0.0.1:${port}`, '--token', '/home/u/.config/tern/web-token', '--assets', '/home/u/.local/share/tern-web-0.9.4'] },
    { pid: 14, ppid: 1, exe: installedTern, argv: ['/home/u/.local/bin/tern', 'daemon', '--socket', '/other/daemon.sock'] },
    { pid: 15, ppid: 1, exe: '/usr/bin/python3', argv: ['python3', 'tern', 'daemon', '--socket', socket] },
  ]);
  const report = await inspectRuntime({ binary: installedTern, socket, port, procRoot });
  expect(report.schemaVersion).toBe(1);
  expect(report.kind).toBe('runtime');
  expect(report.version).toBe('0.9.4');
  expect(report.installed.path).toBe(installedTern);
  expect(report.installed.sha256).toBe(sha256(fs.readFileSync(installedTern)));
  expect(report.processes.map(p => p.pid)).toEqual([11, 13]);
  expect(report.processes.map(p => p.role)).toEqual(['daemon', 'web']);
  expect(report.processes.map(p => p.managerPid)).toEqual([10, 16]);
  for (const process of report.processes) {
    expect(process.version).toBe('0.9.4');
    expect(process.matchesInstalled).toBe(true);
    expect(process.device).toBe(report.installed.device);
    expect(process.inode).toBe(report.installed.inode);
    expect(process.sha256).toBe(report.installed.sha256);
  }
  expect(report.paneIds).toEqual([]);
  expect(report.httpStatus).toBeNull();
  expect(JSON.stringify(report)).not.toContain('web-token');
});

test('inspectRuntime reports matchesInstalled false when the running exe is a different inode', async () => {
  const port = await freePort();
  const otherDir = path.join(root, 'other-installed');
  fs.mkdirSync(otherDir, { recursive: true });
  const otherTern = path.join(otherDir, 'tern'); // same name, different inode than installedTern
  fs.copyFileSync(tern, otherTern);
  const socket = path.join(root, 'solo', 'daemon.sock');
  const procRoot = fakeProc([
    { pid: 21, ppid: 1, exe: otherTern, argv: [installedTern, 'daemon', '--socket', socket] },
  ]);
  const report = await inspectRuntime({ binary: installedTern, socket, port, procRoot });
  expect(report.processes).toHaveLength(1);
  expect(report.processes[0].matchesInstalled).toBe(false);
  expect(report.processes[0].sha256).toBe(sha256(fs.readFileSync(otherTern)));
  expect(report.processes[0].inode).not.toBe(report.installed.inode);
});

test('inspectRuntime fails clearly when nothing owns the socket/port', async () => {
  const port = await freePort();
  const socket = path.join(root, 'none', 'daemon.sock');
  const procRoot = fakeProc([
    { pid: 31, ppid: 1, exe: installedTern, argv: ['/x/tern', 'daemon', '--socket', '/foreign.sock'] },
    { pid: 32, ppid: 1, exe: '/usr/bin/python3', argv: ['python3', 'serve.py'] },
  ]);
  await expect(inspectRuntime({ binary: installedTern, socket, port, procRoot })).rejects.toThrow('no tern daemon/web process owns');
});

let service = null; // { port, pid } fixture web for verifyService tests
beforeAll(async () => {
  const port = await freePort();
  const child = spawn(tern, ['web', 'serve', '--listen', `127.0.0.1:${port}`, '--token', tokenFile, '--assets', assets], { stdio: 'ignore' });
  track(child.pid);
  await waitFor(async () => (await httpStatus(port)) === 200, 8000);
  service = { port, pid: child.pid };
});
afterAll(() => { if (service) killPid(service.pid, 'SIGKILL'); });

test('verifyService passes all six checks and never leaks the token', async () => {
  const report = await verifyService({ url: `http://127.0.0.1:${service.port}`, assets, tokenFile, version: '0.9.4' });
  expect(report.schemaVersion).toBe(1);
  expect(report.kind).toBe('service');
  expect(report.version).toBe('0.9.4');
  expect(report.candidateSha256).toBe(sha256(Buffer.from('lifecycle-wasm-bytes')));
  expect(report.glueSha256).toBe(sha256(Buffer.from('lifecycle-glue-js')));
  expect(report.checks.map(c => c.name)).toEqual(['served_wasm', 'served_glue', 'versioned_page', 'missing_token_rejected', 'invalid_token_rejected', 'existing_token_accepted']);
  expect(report.checks.every(c => c.status === 'passed')).toBe(true);
  expect(JSON.stringify(report)).not.toContain(TOKEN);
});

test('verifyService fails served_wasm when the served bytes differ from assets', async () => {
  const tampered = path.join(root, 'tampered-assets');
  fs.mkdirSync(path.join(tampered, 'pkg'), { recursive: true });
  fs.writeFileSync(path.join(tampered, 'pkg', 'client.wasm'), Buffer.from('tampered-wasm'));
  fs.writeFileSync(path.join(tampered, 'pkg', 'client.js'), Buffer.from('lifecycle-glue-js'));
  const error = await verifyService({ url: `http://127.0.0.1:${service.port}`, assets: tampered, tokenFile, version: '0.9.4' }).catch(e => e);
  expect(error.message).toContain('served_wasm');
  const failed = error.report.checks.filter(c => c.status === 'failed').map(c => c.name);
  expect(failed).toEqual(['served_wasm']);
});

test('verifyService fails versioned_page and existing_token_accepted on wrong version/token', async () => {
  const wrongVersion = await verifyService({ url: `http://127.0.0.1:${service.port}`, assets, tokenFile, version: '9.9.9' }).catch(e => e);
  expect(wrongVersion.report.checks.find(c => c.name === 'versioned_page').status).toBe('failed');
  const wrongToken = path.join(root, 'wrong-token');
  fs.writeFileSync(wrongToken, 'not-the-service-token\n', { mode: 0o600 });
  const badToken = await verifyService({ url: `http://127.0.0.1:${service.port}`, assets, tokenFile: wrongToken, version: '0.9.4' }).catch(e => e);
  expect(badToken.report.checks.find(c => c.name === 'existing_token_accepted').status).toBe('failed');
  expect(badToken.report.checks.filter(c => c.status === 'failed').map(c => c.name)).toEqual(['existing_token_accepted']);
});

test('upgrade replaces the binary, stops managers, keeps socket/port/token/panes', async () => {
  const socket = path.join(root, 'upgrade-private', 'daemon.sock');
  const port = await freePort();
  const stateDir = path.join(root, 'upgrade-state');
  const managers = startService({ socket, port });
  await waitService(socket, port);
  const report = await upgrade({ binary: installedTern, candidateBinary: candidateTern, assets, socket, port, stateDir, tokenFile, version: '0.9.4', timeoutMs: 20000 });
  expect(report.schemaVersion).toBe(1);
  expect(report.kind).toBe('upgrade');
  expect(report.version).toBe('0.9.4');
  expect(report.beforePaneIds).toEqual([3]);
  expect(report.after.kind).toBe('runtime');
  expect(report.after.paneIds).toEqual([3]);
  expect(report.after.httpStatus).toBe(200);
  expect(report.after.processes.map(p => p.role)).toEqual(['daemon', 'web']);
  for (const process of report.after.processes) {
    expect(process.matchesInstalled).toBe(true);
    expect(process.version).toBe('0.9.4');
    expect(Number.isInteger(process.managerPid)).toBe(true);
  }
  expect(report.service.checks.every(c => c.status === 'passed')).toBe(true);
  expect(sha256(fs.readFileSync(installedTern))).toBe(sha256(fs.readFileSync(candidateTern)));
  for (const pid of managers) expect(pidAlive(pid)).toBe(false);
  for (const name of ['tern-daemon.pid', 'tern-web.pid', 'tern-daemon.log', 'tern-web.log']) {
    expect(fs.existsSync(path.join(stateDir, name))).toBe(true);
  }
  cleanupStateDir(stateDir);
});

test('upgrade fails loudly on a pane change and does not roll back the install', async () => {
  const socket = path.join(root, 'drift-private', 'daemon.sock');
  const port = await freePort();
  const stateDir = path.join(root, 'drift-state');
  process.env.TERN_LIFECYCLE_PANE_STATE = path.join(root, 'drift-counter');
  try {
    startService({ socket, port });
    await waitService(socket, port);
    await expect(
      upgrade({ binary: installedTern, candidateBinary: candidateTern, assets, socket, port, stateDir, tokenFile, version: '0.9.4', timeoutMs: 20000 }),
    ).rejects.toThrow('pane IDs changed');
    // Not rolled back: the candidate remains installed even though panes drifted.
    expect(sha256(fs.readFileSync(installedTern))).toBe(sha256(fs.readFileSync(candidateTern)));
  } finally {
    delete process.env.TERN_LIFECYCLE_PANE_STATE;
    cleanupStateDir(stateDir);
  }
});

test('upgrade refuses to act when prechecks fail', async () => {
  const socket = path.join(root, 'precheck', 'daemon.sock');
  const port = await freePort();
  const stateDir = path.join(root, 'precheck-state');
  await expect(
    upgrade({ binary: installedTern, candidateBinary: candidateTern, assets, socket, port, stateDir, tokenFile, version: '0.9.3', timeoutMs: 5000 }),
  ).rejects.toThrow('candidate version is 0.9.4');
  await expect(
    upgrade({ binary: installedTern, candidateBinary: candidateTern, assets, socket, port, stateDir, tokenFile, version: '0.9.4', timeoutMs: 5000 }),
  ).rejects.toThrow('no tern daemon/web process owns');
});

test('prepare acquires only through its own isolated web service and terminates it on failure', async () => {
  const webServers = () => {
    const out = [];
    for (const name of fs.readdirSync('/proc')) {
      if (!/^\d+$/.test(name)) continue;
      try {
        const argv = fs.readFileSync(path.join('/proc', name, 'cmdline')).toString('utf8').split('\0').filter(Boolean);
        if (argv[1] === 'web' && argv[2] === 'serve' && !argv.includes('--assets')) out.push(Number(name));
      } catch {}
    }
    return out;
  };
  const before = webServers();
  const leftOverDirs = fs.readdirSync(os.tmpdir()).filter(name => name.startsWith('tern-lifecycle-prepare-'));
  // The fixture serves no official <link id="wasm">, so acquire must fail…
  await expect(prepare({ binary: tern, out: path.join(root, 'prepare-out'), timeoutMs: 8000 })).rejects.toThrow('official WASM link');
  // …while finally still tears down its own service and temp directory.
  expect(webServers()).toEqual(before);
  const afterDirs = fs.readdirSync(os.tmpdir()).filter(name => name.startsWith('tern-lifecycle-prepare-'));
  expect(afterDirs).toEqual(leftOverDirs);
});

test('upgrade leaves services and installed binary untouched when a manager is unverified', async () => {
  const socket = path.join(root, 'unsafe-manager', 'daemon.sock');
  const port = await freePort();
  fs.mkdirSync(path.dirname(socket), {recursive:true, mode:0o700});
  const daemonManager = startManager(['daemon', '--socket', socket]);
  const web = spawn(tern, ['web', 'serve', '--listen', `127.0.0.1:${port}`, '--token', tokenFile, '--assets', assets], {stdio:'ignore'});
  track(web.pid);
  await waitService(socket, port);
  const inode = fs.statSync(installedTern).ino;
  await expect(upgrade({binary:installedTern, candidateBinary:candidateTern, assets, socket, port, stateDir:path.join(root, 'unsafe-state'), tokenFile, version:'0.9.4'})).rejects.toThrow(/manager/);
  expect(pidAlive(daemonManager.pid)).toBe(true);
  expect(pidAlive(web.pid)).toBe(true);
  expect(fs.statSync(installedTern).ino).toBe(inode);
  expect(await httpStatus(port)).toBe(200);
});

test('verifyService refuses to send credentials outside loopback', async () => {
  await expect(verifyService({url:'https://example.com/', assets, tokenFile, version:'0.9.4'})).rejects.toThrow(/loopback/);
});
