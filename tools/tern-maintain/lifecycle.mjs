// Tern lifecycle: prepare / inspectRuntime / verifyService / upgrade.
// inspectRuntime and verifyService are read-only. upgrade is the only mutating
// entrypoint: every precondition is checked before anything is stopped, and a
// failure is reported loudly — never silently rolled back.
// Reports never contain cmdline text or token values.
import { spawn, spawnSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { acquire } from './resources.mjs';
import { redact } from './runtime.mjs';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const sha256Hex = bytes => createHash('sha256').update(bytes).digest('hex');
async function sha256File(file) {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    fs.createReadStream(file).on('data', d => hash.update(d)).on('end', () => resolve(hash.digest('hex'))).on('error', reject);
  });
}

/** Env for tern children: pin the daemon socket, scrub GUI/session variables. */
function ternEnv(socket) {
  const env = { ...process.env };
  if (socket) env.TERN_DAEMON_SOCKET = socket;
  else delete env.TERN_DAEMON_SOCKET;
  for (const key of ['DISPLAY', 'WAYLAND_DISPLAY', 'WAYLAND_SOCKET', 'DBUS_SESSION_BUS_ADDRESS', 'BROWSER']) delete env[key];
  return env;
}

function assertExecutable(binary) {
  const resolved = binary.includes('/') ? path.resolve(binary) : Bun.which(binary);
  if (!resolved) throw new Error(`'${binary}' is not executable`);
  try { fs.accessSync(resolved, fs.constants.X_OK); }
  catch (cause) { throw new Error(`'${binary}' is not executable`, { cause }); }
  if (!fs.statSync(resolved).isFile()) throw new Error(`'${binary}' is not a file`);
  return resolved;
}
function assertDirectory(dir, who) {
  let stat;
  try { stat = fs.statSync(dir); }
  catch { throw new Error(`${who}: '${dir}' does not exist`); }
  if (!stat.isDirectory()) throw new Error(`${who}: '${dir}' is not a directory`);
}

async function httpStatus(port, timeoutMs = 5_000) {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(timeoutMs) });
    return response.status;
  } catch {
    return null;
  }
}
function portOpen(host, port, timeoutMs = 1_000) {
  return new Promise(resolve => {
    const socket = net.connect({ host, port, timeout: timeoutMs });
    socket.once('connect', () => { socket.destroy(); resolve(true); });
    socket.once('timeout', () => { socket.destroy(); resolve(false); });
    socket.once('error', () => resolve(false));
  });
}
async function waitFor(fn, timeoutMs, intervalMs = 100) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try { if (await fn()) return; }
    catch (error) { lastError = error; }
    await sleep(intervalMs);
  }
  throw lastError instanceof Error ? lastError : new Error('timed out waiting for condition');
}
function tail(file, bytes = 2_000) {
  try { return redact(fs.readFileSync(file, 'utf8').slice(-bytes)); }
  catch { return ''; }
}

/** `tern --version` → '0.9.4', or null when it cannot be determined. */
function probeVersion(executable) {
  const run = spawnSync(executable, ['--version'], { encoding: 'utf8', timeout: 5_000 });
  if (run.error || run.status !== 0) return null;
  const match = /\b(\d+\.\d+\.\d+)\b/.exec(run.stdout || '');
  return match ? match[1] : null;
}

// --- daemon pane queries -------------------------------------------------------
/** Returns { ok, json? }: ok=false means no daemon answered; throws on bad shape. */
function lsQuery(binary, socket, timeoutMs) {
  const run = spawnSync(binary, ['ls', '--json'], { env: ternEnv(socket), encoding: 'utf8', timeout: timeoutMs });
  if (run.error || run.status !== 0) return { ok: false };
  let json;
  try { json = JSON.parse(run.stdout); }
  catch (error) { throw new Error(`tern ls returned non-JSON: ${error.message}`); }
  return { ok: true, json };
}
function daemonAnswered(binary, socket, timeoutMs) {
  try { return lsQuery(binary, socket, timeoutMs).ok; }
  catch { return false; }
}
/** Flatten a validated `tern ls --json` into pane ids only (never titles/cwd/args). */
function paneIdsFromLs(json) {
  if (!json || typeof json !== 'object' || Array.isArray(json) || !Array.isArray(json.sessions)) {
    throw new Error('tern ls JSON has no sessions array');
  }
  const ids = [];
  json.sessions.forEach((session, i) => {
    if (!session || typeof session !== 'object' || !Array.isArray(session.tabs)) {
      throw new Error(`tern ls JSON: sessions[${i}] has no tabs array`);
    }
    for (const tab of session.tabs) {
      if (!tab || typeof tab !== 'object' || !Array.isArray(tab.blocks)) throw new Error('tern ls JSON: tab has no blocks array');
      for (const block of tab.blocks) {
        if (!block || typeof block !== 'object' || !Number.isInteger(block.id)) throw new Error('tern ls JSON: block has no integer id');
        ids.push(block.id);
      }
    }
  });
  return ids;
}
/** Pane ids via the daemon socket; [] when no daemon answers; throws on bad shape. */
function paneIdsOrEmpty(binary, socket, timeoutMs) {
  const result = lsQuery(binary, socket, timeoutMs);
  return result.ok ? paneIdsFromLs(result.json) : [];
}

// --- /proc scan ----------------------------------------------------------------
function procExe(procRoot, pid) {
  try { return fs.readlinkSync(path.join(procRoot, String(pid), 'exe')); }
  catch { return null; }
}
function procArgv(procRoot, pid) {
  try { return fs.readFileSync(path.join(procRoot, String(pid), 'cmdline')).toString('utf8').split('\0').filter(Boolean); }
  catch { return null; }
}
function procPpid(procRoot, pid) {
  try {
    const stat = fs.readFileSync(path.join(procRoot, String(pid), 'stat'), 'utf8');
    return Number(stat.slice(stat.lastIndexOf(')') + 1).trim().split(/\s+/)[1]);
  } catch { return null; }
}
function optionValue(argv, name) {
  const i = argv.indexOf(name);
  return i >= 0 && i + 1 < argv.length ? argv[i + 1] : null;
}
/**
 * Find the real Linux tern daemon/web processes that OWN this socket/port.
 * A process qualifies only when its exe is named `tern` and its cmdline pins
 * the exact --socket / --listen values — so a Python manager (daemon.py /
 * serve.py) or an unrelated tern service is never misattributed. The manager
 * is recorded only as managerPid, never as a daemon/web process.
 */
function scanTernProcesses({ socket, port, procRoot }) {
  let entries;
  try { entries = fs.readdirSync(procRoot, { withFileTypes: true }); }
  catch (error) { throw new Error(`inspect: cannot read ${procRoot}: ${error.message}`); }
  const found = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || !/^\d+$/.test(entry.name)) continue;
    const pid = Number(entry.name);
    if (pid <= 1 || pid === process.pid) continue;
    const exe = procExe(procRoot, pid);
    if (!exe || path.basename(exe).replace(/ \(deleted\)$/, '') !== 'tern') continue;
    const argv = procArgv(procRoot, pid);
    if (!argv || argv.length < 2) continue;
    let role = null;
    if (argv[1] === 'daemon') {
      if (optionValue(argv, '--socket') === socket) role = 'daemon';
    } else if (argv[1] === 'web' && argv[2] === 'serve') {
      const listen = optionValue(argv, '--listen');
      if (listen && Number(listen.split(':').pop()) === Number(port)) role = 'web';
    }
    if (!role) continue;
    const ppid = procPpid(procRoot, pid);
    let managerPid = null;
    if (ppid && ppid > 1) {
      const parentExe = procExe(procRoot, ppid);
      if (parentExe && path.basename(parentExe) !== 'tern') managerPid = ppid;
    }
    found.push({ role, pid, managerPid });
  }
  found.sort((a, b) => (a.role === b.role ? a.pid - b.pid : a.role === 'daemon' ? -1 : 1));
  return found;
}
function pidAlive(procRoot, pid) {
  try {
    const stat = fs.readFileSync(path.join(procRoot, String(pid), 'stat'), 'utf8');
    if (stat.slice(stat.lastIndexOf(')') + 1).trim().split(/\s+/)[0] === 'Z') return false;
  } catch { return false; }
  try { process.kill(pid, 0); return true; }
  catch { return false; }
}

// --- detached redacted launcher (reuses runtime.mjs __redact entry) -------------
const runtimeEntry = fileURLToPath(new URL('./runtime.mjs', import.meta.url));
function spawnRedacted(binary, args, logPath, pidPath, socket) {
  const child = spawn(
    process.execPath,
    [runtimeEntry, '__redact', logPath, pidPath, '--', binary, ...args],
    { detached: true, stdio: 'ignore', env: ternEnv(socket) },
  );
  child.unref();
  return child.pid;
}
function readPid(pidPath) {
  try {
    const pid = Number(fs.readFileSync(pidPath, 'utf8').trim());
    return Number.isInteger(pid) && pid > 0 ? pid : null;
  } catch { return null; }
}

// --- public API -----------------------------------------------------------------

/**
 * Spin up an isolated credential-free loopback tern web service with a private
 * temporary token, acquire() the SRI-verified official resources through it,
 * and in finally terminate ONLY that service and remove the temp directory.
 */
export async function prepare({ binary = 'tern', out, timeoutMs = 60_000 } = {}) {
  if (!out) throw new Error('prepare: out is required');
  const resolved = assertExecutable(binary);
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'tern-lifecycle-prepare-'));
  const listener = net.createServer();
  await new Promise(resolve => listener.listen(0, '127.0.0.1', resolve));
  const port = listener.address().port;
  await new Promise(resolve => listener.close(resolve));
  const tokenFile = path.join(dir, 'web-token');
  await fsp.writeFile(tokenFile, randomBytes(32).toString('hex') + '\n', { mode: 0o600, flag: 'wx' });
  const child = spawn(resolved, ['web', 'serve', '--listen', `127.0.0.1:${port}`, '--token', tokenFile], {
    stdio: 'ignore',
    env: {...ternEnv(path.join(dir, 'daemon.sock')), TERN_CONFIG_DIR:dir},
  });
  try {
    await waitFor(async () => {
      if (child.exitCode !== null) throw new Error(`prepare: web server exited (code ${child.exitCode})`);
      return (await httpStatus(port, 1_000)) === 200;
    }, timeoutMs);
    return await acquire({ url: `http://127.0.0.1:${port}/`, out });
  } finally {
    child.kill('SIGTERM');
    await Promise.race([new Promise(resolve => child.once('exit', resolve)), sleep(3_000).then(() => { try { child.kill('SIGKILL'); } catch {} })]);
    await fsp.rm(dir, { recursive: true, force: true });
  }
}

/**
 * Read-only runtime inspection. Identifies the tern daemon/web that own the
 * given socket/port, their managers, and compares each running exe (version,
 * SHA-256, device, inode) against the installed binary. Fails clearly when no
 * owning process is found.
 */
export async function inspectRuntime({ binary = 'tern', socket, port, timeoutMs = 15_000, procRoot = '/proc' } = {}) {
  if (!socket) throw new Error('inspect: socket is required');
  if (!port) throw new Error('inspect: port is required');
  const resolved = assertExecutable(binary);
  const installedStat = fs.statSync(resolved);
  const installed = {
    path: resolved,
    sha256: await sha256File(resolved),
    device: installedStat.dev,
    inode: installedStat.ino,
  };
  const version = probeVersion(resolved);
  if (!version) throw new Error(`inspect: cannot determine version of ${resolved}`);
  const found = scanTernProcesses({ socket, port, procRoot });
  if (!found.length) {
    throw new Error(`inspect: no tern daemon/web process owns socket ${socket} and port ${port}`);
  }
  const processes = [];
  for (const item of found) {
    const exePath = path.join(procRoot, String(item.pid), 'exe');
    const stat = fs.statSync(exePath); // follows the symlink, even for deleted targets
    const matchesInstalled = stat.dev === installed.device && stat.ino === installed.inode;
    processes.push({
      role: item.role,
      pid: item.pid,
      managerPid: item.managerPid,
      version: probeVersion(exePath),
      device: stat.dev,
      inode: stat.ino,
      sha256: matchesInstalled ? installed.sha256 : await sha256File(exePath),
      matchesInstalled,
    });
  }
  const paneIds = paneIdsOrEmpty(resolved, socket, timeoutMs);
  const status = await httpStatus(port, Math.min(timeoutMs, 5_000));
  return { schemaVersion: 1, kind: 'runtime', version, installed, processes, paneIds, httpStatus: status };
}

const SERVICE_CHECKS = ['served_wasm', 'served_glue', 'versioned_page', 'missing_token_rejected', 'invalid_token_rejected', 'existing_token_accepted'];

/**
 * Read-only acceptance against a running tern web service. Compares the served
 * WASM/glue against the local assets directory, checks the page carries the
 * expected version, and checks /wire auth: missing and invalid tokens are
 * rejected, the existing token (read into RAM only) is accepted.
 * Throws with the report on error.report when any check fails.
 */
export async function verifyService({ url, assets, tokenFile, version, timeoutMs = 15_000 } = {}) {
  for (const key of ['url', 'assets', 'tokenFile', 'version']) {
    if (!arguments[0]?.[key]) throw new Error(`verifyService: ${key} is required`);
  }
  const base = new URL(url);
  if (base.protocol !== 'http:' && base.protocol !== 'https:') throw new Error('verifyService: url must be http(s)');
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname) || base.username || base.password || base.search || base.hash) throw new Error('verifyService: a credential-free loopback URL is required');
  const check = (name, pass) => ({ name, status: pass ? 'passed' : 'failed' });
  const checks = [];
  const fetchBytes = async target => {
    const response = await fetch(new URL(target, base), { signal: AbortSignal.timeout(timeoutMs) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return new Uint8Array(await response.arrayBuffer());
  };
  const local = async name => {
    try { return new Uint8Array(await fsp.readFile(path.join(assets, 'pkg', name))); }
    catch { return null; }
  };
  let servedWasm = null, servedGlue = null, page = '';
  try { servedWasm = await fetchBytes('pkg/client.wasm'); } catch {}
  try { servedGlue = await fetchBytes('pkg/client.js'); } catch {}
  try { page = new TextDecoder().decode(await fetchBytes('')); } catch {}
  const localWasm = await local('client.wasm');
  const localGlue = await local('client.js');
  const candidateSha256 = servedWasm ? sha256Hex(servedWasm) : null;
  const glueSha256 = servedGlue ? sha256Hex(servedGlue) : null;
  checks.push(check('served_wasm', !!servedWasm && !!localWasm && candidateSha256 === sha256Hex(localWasm)));
  checks.push(check('served_glue', !!servedGlue && !!localGlue && glueSha256 === sha256Hex(localGlue)));
  checks.push(check('versioned_page', page.includes(`Tern ${version}`)));
  const token = (await fsp.readFile(tokenFile, 'utf8')).trim(); // RAM only, never reported
  const wsAccepted = query => new Promise(resolve => {
    let settled = false;
    const done = value => { if (!settled) { settled = true; resolve(value); } };
    let ws;
    try {
      const target = new URL('/wire', base);
      target.protocol = target.protocol === 'https:' ? 'wss:' : 'ws:';
      if (query) target.search = query;
      ws = new WebSocket(target.href);
    } catch { return done(false); }
    const timer = setTimeout(() => { try { ws.close(); } catch {} done(false); }, Math.min(timeoutMs, 8_000));
    ws.addEventListener('open', () => { clearTimeout(timer); try { ws.close(); } catch {} done(true); });
    ws.addEventListener('error', () => { clearTimeout(timer); done(false); });
    ws.addEventListener('close', () => { clearTimeout(timer); done(false); });
  });
  checks.push(check('missing_token_rejected', !(await wsAccepted(null))));
  checks.push(check('invalid_token_rejected', !(await wsAccepted('token=invalid-token-value'))));
  checks.push(check('existing_token_accepted', await wsAccepted(`token=${encodeURIComponent(token)}`)));
  const report = { schemaVersion: 1, kind: 'service', version, candidateSha256, glueSha256, checks };
  const failed = checks.filter(item => item.status !== 'passed').map(item => item.name);
  if (failed.length) {
    const error = new Error(`verifyService failed: ${failed.join(', ')}`);
    error.report = report;
    throw error;
  }
  return report;
}

/**
 * The only mutating entrypoint. Order of operations:
 *   1. prechecks (executables, candidate version, assets, stateDir, socket dir,
 *      token file, an owning daemon/web must exist, panes snapshot);
 *   2. stop the identified managers and tern children, wait for parent+child
 *      exit, wait for the port and socket to be released;
 *   3. atomic install of the candidate binary;
 *   4. detached background start of the new daemon/web on the SAME socket/port
 *      with the SAME token file;
 *   5. real inspectRuntime + verifyService + pane comparison. Any failure is
 *      thrown with details — never silently rolled back.
 */
export async function upgrade({ binary, candidateBinary, assets, socket, port, stateDir, tokenFile, version, timeoutMs = 60_000, procRoot = '/proc' } = {}) {
  for (const key of ['binary', 'candidateBinary', 'assets', 'socket', 'port', 'stateDir', 'tokenFile', 'version']) {
    if (!arguments[0]?.[key]) throw new Error(`upgrade: ${key} is required`);
  }
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error(`upgrade: version must look like 0.9.4, got '${version}'`);

  // --- prechecks: nothing is mutated before this point ---
  binary = assertExecutable(binary);
  candidateBinary = assertExecutable(candidateBinary);
  const candidateVersion = probeVersion(candidateBinary);
  if (candidateVersion !== version) {
    throw new Error(`upgrade: candidate version is ${candidateVersion ?? 'unknown'}, expected ${version}`);
  }
  assertDirectory(assets, 'upgrade');
  try { fs.accessSync(tokenFile, fs.constants.R_OK); }
  catch { throw new Error(`upgrade: token file ${tokenFile} is not readable`); }
  if (fs.existsSync(stateDir)) {
    const stat = fs.lstatSync(stateDir);
    if (!stat.isDirectory() || stat.isSymbolicLink() || (stat.mode & 0o077)) throw new Error('upgrade: state directory must be a private directory');
  } else fs.mkdirSync(stateDir, { recursive: true, mode: 0o700 });
  if (['tern-web.pid', 'tern-daemon.pid'].some(name => fs.existsSync(path.join(stateDir, name)))) {
    throw new Error('upgrade: state directory already contains process records; use a new directory');
  }
  const socketDir = path.dirname(socket);
  if (fs.existsSync(socketDir)) {
    if (fs.statSync(socketDir).mode & 0o077) throw new Error(`upgrade: socket directory ${socketDir} is group/world accessible`);
  } else fs.mkdirSync(socketDir, { recursive: true, mode: 0o700 });
  try { fs.accessSync(path.dirname(binary), fs.constants.W_OK); }
  catch { throw new Error(`upgrade: directory of ${binary} is not writable`); }
  const targets = scanTernProcesses({ socket, port, procRoot });
  if (!targets.length) throw new Error(`upgrade: no tern daemon/web process owns socket ${socket} and port ${port}`);
  if (!(await portOpen('127.0.0.1', port))) throw new Error(`upgrade: nothing is listening on port ${port}`);
  const beforeQuery = lsQuery(binary, socket, Math.min(timeoutMs, 15_000));
  if (!beforeQuery.ok) throw new Error('upgrade: cannot query existing panes');
  const beforePaneIds = paneIdsFromLs(beforeQuery.json);
  for (const role of ['daemon', 'web']) {
    if (targets.filter(target => target.role === role).length !== 1) throw new Error(`upgrade: ambiguous ${role} ownership`);
  }
  for (const target of targets) {
    if (!target.managerPid || target.managerPid === process.pid) throw new Error(`upgrade: cannot safely stop ${target.role} manager`);
    const parent = procArgv(procRoot, target.managerPid);
    const child = procArgv(procRoot, target.pid);
    const separator = parent?.indexOf('--') ?? -1;
    if (separator < 0 || JSON.stringify(parent.slice(separator + 1)) !== JSON.stringify(child)) throw new Error(`upgrade: unverified ${target.role} manager`);
    const children = fs.readFileSync(path.join(procRoot, String(target.managerPid), 'task', String(target.managerPid), 'children'), 'utf8').trim().split(/\s+/).filter(Boolean);
    if (children.length !== 1 || Number(children[0]) !== target.pid) throw new Error(`upgrade: ${target.role} manager owns unrelated children`);
  }

  // --- stop managers and tern children, wait for parent+child exit ---
  const victims = new Map();
  for (const target of targets) {
    victims.set(target.pid, `tern ${target.role}`);
    if (target.managerPid) victims.set(target.managerPid, 'manager');
  }
  for (const pid of victims.keys()) {
    if (pid > 1 && pid !== process.pid) { try { process.kill(pid, 'SIGTERM'); } catch {} }
  }
  const alive = () => [...victims.keys()].filter(pid => pidAlive(procRoot, pid));
  try { await waitFor(() => alive().length === 0, Math.min(8_000, timeoutMs)); }
  catch {
    for (const pid of alive()) { try { process.kill(pid, 'SIGKILL'); } catch {} }
    try { await waitFor(() => alive().length === 0, 4_000); }
    catch { throw new Error(`upgrade: processes did not exit: ${alive().join(', ')}`); }
  }
  try { await waitFor(async () => !(await portOpen('127.0.0.1', port)), 5_000); }
  catch { throw new Error(`upgrade: port ${port} is still occupied after stopping the target service`); }
  try { await waitFor(() => !fs.existsSync(socket), 5_000); }
  catch {
    // The owning process is gone; remove only the socket path we manage.
    fs.rmSync(socket, { force: true });
  }

  // --- atomic install: temp file in the same directory, then rename ---
  const candidateBytes = await fsp.readFile(candidateBinary);
  const temp = path.join(path.dirname(binary), `.tern-lifecycle-${process.pid}-${Date.now()}.tmp`);
  await fsp.writeFile(temp, candidateBytes, { mode: 0o755 });
  try { fs.renameSync(temp, binary); }
  catch (error) {
    fs.rmSync(temp, { force: true });
    throw new Error(`upgrade: atomic install failed: ${error.message}`);
  }

  // --- background start on the same socket/port/token ---
  const daemonLog = path.join(stateDir, 'tern-daemon.log');
  const daemonPidPath = path.join(stateDir, 'tern-daemon.pid');
  spawnRedacted(binary, ['daemon', '--socket', socket], daemonLog, daemonPidPath, socket);
  try { await waitFor(() => daemonAnswered(binary, socket, 2_000), timeoutMs); }
  catch (error) { throw new Error(`upgrade: new daemon did not answer on ${socket}: ${error.message}\n${tail(daemonLog)}`); }
  const webLog = path.join(stateDir, 'tern-web.log');
  const webPidPath = path.join(stateDir, 'tern-web.pid');
  spawnRedacted(binary, ['web', 'serve', '--listen', `127.0.0.1:${port}`, '--token', tokenFile, '--assets', assets], webLog, webPidPath, socket);
  try { await waitFor(async () => (await httpStatus(port, 1_000)) === 200, timeoutMs); }
  catch (error) {
    const failedWebPid = readPid(webPidPath);
    if (failedWebPid) { try { process.kill(failedWebPid, 'SIGTERM'); } catch {} }
    throw new Error(`upgrade: new web server did not answer HTTP 200 on ${port}: ${error.message}\n${tail(webLog)}`);
  }

  // --- real verification: no silent rollback on failure ---
  const after = await inspectRuntime({ binary, socket, port, timeoutMs, procRoot });
  const beforeSet = new Set(beforePaneIds);
  const afterSet = new Set(after.paneIds);
  const missing = beforePaneIds.filter(id => !afterSet.has(id));
  const added = after.paneIds.filter(id => !beforeSet.has(id));
  if (missing.length || added.length) {
    throw new Error(
      `upgrade: pane IDs changed across restart (missing: ${missing.join(',') || 'none'}; added: ${added.join(',') || 'none'}); state left as-is`,
    );
  }
  const service = await verifyService({ url: `http://127.0.0.1:${port}`, assets, tokenFile, version, timeoutMs });
  return { schemaVersion: 1, kind: 'upgrade', version, beforePaneIds, after, service };
}
