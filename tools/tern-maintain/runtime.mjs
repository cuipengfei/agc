// Tern maintenance runtime: status / start / browserCheck.
// Never reads credential *values*; token material is only ever passed as a
// file path to tern, or held in RAM inside browserCheck for one page load.
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import readline from 'node:readline';
import net from 'node:net';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

/** Scrub token query values (?token=, &token=, or a bare token=) from text. */
export function redact(text) {
  return String(text).replace(/token=[^&\s"']+/g, 'token=<REDACTED>');
}

async function loadPlaywright(playwrightModule) {
  if (typeof playwrightModule !== 'string') return playwrightModule;
  const mod = await import(pathToFileURL(path.resolve(playwrightModule)).href);
  return mod.default ?? mod;
}

/** Env for tern children: pin the daemon socket, scrub GUI/session variables. */
function ternEnv(socket) {
  const env = { ...process.env };
  if (socket) env.TERN_DAEMON_SOCKET = socket;
  else delete env.TERN_DAEMON_SOCKET;
  for (const key of ['DISPLAY', 'WAYLAND_DISPLAY', 'WAYLAND_SOCKET', 'DBUS_SESSION_BUS_ADDRESS', 'BROWSER']) {
    delete env[key]; // background children must not open GUI or the user session bus
  }
  return env;
}

/**
 * Run `tern ls --json`. Returns {state:'ok'|'no_daemon'|'bad_shape', json?, error?}.
 * 'bad_shape' means a daemon answered but the JSON did not match the documented
 * sessions/tabs/blocks structure; it is reported, never silently swallowed.
 */
function runTernLs(binary, socket, timeoutMs) {
  const run = spawnSync(binary, ['ls', '--json'], {
    env: ternEnv(socket),
    encoding: 'utf8',
    timeout: timeoutMs,
  });
  if (run.error) return { state: 'no_daemon', error: redact(run.error.message) };
  if (run.status !== 0) return { state: 'no_daemon', error: redact((run.stderr || run.stdout || `exit ${run.status}`).trim()) };
  let json;
  try {
    json = JSON.parse(run.stdout);
  } catch (error) {
    return { state: 'bad_shape', error: redact(`tern ls returned non-JSON: ${error.message}`) };
  }
  try {
    validateLs(json);
    return { state: 'ok', json };
  } catch (error) {
    return { state: 'bad_shape', error: redact(error.message) };
  }
}

/** Throw unless json matches the documented sessions/tabs/blocks shape. */
function validateLs(json) {
  if (!json || typeof json !== 'object' || Array.isArray(json)) throw new Error('tern ls JSON is not an object');
  if (!Array.isArray(json.sessions)) throw new Error('tern ls JSON has no sessions array');
  json.sessions.forEach((session, i) => {
    if (!session || typeof session !== 'object' || !Number.isInteger(session.id) || !Array.isArray(session.tabs)) {
      throw new Error(`tern ls JSON: sessions[${i}] is missing integer id or tabs array`);
    }
    session.tabs.forEach((tab, j) => {
      if (!tab || typeof tab !== 'object' || !Array.isArray(tab.blocks)) {
        throw new Error(`tern ls JSON: sessions[${i}].tabs[${j}] is missing blocks array`);
      }
      tab.blocks.forEach((block, k) => {
        if (!block || typeof block !== 'object' || !Number.isInteger(block.id)) {
          throw new Error(`tern ls JSON: sessions[${i}].tabs[${j}].blocks[${k}] is missing integer id`);
        }
      });
    });
  });
}

/** Flatten a validated `tern ls --json` into pane identifiers only. Deliberately
 * excludes title/cwd/command/args: status reports must not relay user content
 * or shell arguments that may carry credentials. */
function panesFromLs(json) {
  const panes = [];
  for (const session of json.sessions) {
    for (const tab of session.tabs) {
      for (const block of tab.blocks) {
        const pane = { id: block.id, sessionId: session.id, tabId: tab.id, program: block.program ?? null };
        if (typeof block.file === 'string') pane.file = block.file;
        if (typeof block.notesPath === 'string') pane.notesPath = block.notesPath;
        panes.push(pane);
      }
    }
  }
  return panes;
}

async function httpStatus(port, timeoutMs = 5000) {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/`, {signal: AbortSignal.timeout(timeoutMs)});
    return response.status;
  } catch {
    return null;
  }
}

/** True when a TCP connection to host:port succeeds. */
function portOpen(host, port, timeoutMs = 1_000) {
  return new Promise(resolve => {
    const socket = net.connect({ host, port, timeout: timeoutMs });
    socket.once('connect', () => { socket.destroy(); resolve(true); });
    socket.once('timeout', () => { socket.destroy(); resolve(false); });
    socket.once('error', () => resolve(false));
  });
}

async function waitFor(fn, timeoutMs, intervalMs = 250) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      if (await fn()) return;
    } catch (error) {
      lastError = error;
    }
    await sleep(intervalMs);
  }
  throw lastError instanceof Error ? lastError : new Error('timed out waiting for condition');
}

function tail(file, bytes = 2_000) {
  try {
    const text = fs.readFileSync(file, 'utf8');
    return redact(text.slice(-bytes));
  } catch {
    return '';
  }
}

function readPid(pidPath) {
  try {
    const pid = Number(fs.readFileSync(pidPath, 'utf8').trim());
    return Number.isInteger(pid) && pid > 0 ? pid : null;
  } catch {
    return null;
  }
}

function assertExecutable(binary) {
  const resolved = binary.includes('/') ? path.resolve(binary) : Bun.which(binary);
  if (!resolved) throw new Error(`start: binary '${binary}' is not executable`);
  try { fs.accessSync(resolved, fs.constants.X_OK); }
  catch (cause) { throw new Error(`start: binary '${binary}' is not executable`, {cause}); }
  if (!fs.statSync(resolved).isFile()) throw new Error(`start: binary '${binary}' is not a file`);
  return resolved;
}

function assertDirectory(dir) {
  let stat;
  try {
    stat = fs.statSync(dir);
  } catch {
    throw new Error(`start: assets directory '${dir}' does not exist`);
  }
  if (!stat.isDirectory()) throw new Error(`start: assets '${dir}' is not a directory`);
}

/**
 * The daemon socket must live in a private directory. Never chmod a directory
 * we did not create: verify an existing parent, else create only our own.
 */
function prepareSocketDir(socket) {
  if (!socket) return;
  const dir = path.dirname(socket);
  if (fs.existsSync(dir)) {
    const mode = fs.statSync(dir).mode & 0o777;
    if (mode & 0o077) {
      throw new Error(`start: socket directory ${dir} is group/world accessible (mode ${mode.toString(8)}); refusing to modify it — pick a socket under a private directory`);
    }
  } else {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    fs.chmodSync(dir, 0o700);
  }
}

function pickTokenFile(stateDir) {
  const created = path.join(stateDir, 'web-token');
  fs.writeFileSync(created, crypto.randomBytes(32).toString('hex') + '\n', {mode: 0o600, flag: 'wx'});
  return created;
}

// --- detached redacted launcher -------------------------------------------------
// `node|bun runtime.mjs __redact <logPath> <pidPath> -- <cmd...>` runs cmd with its
// stdout/stderr redacted line-by-line into logPath (mode 600) and writes the
// *cmd's* pid to pidPath. The wrapper is spawned detached with stdio ignored and
// no GUI/session env, so the child survives agent exit without touching the desktop.
if (process.argv[2] === '__redact') {
  const [, , , logPath, pidPath, , ...cmd] = process.argv;
  const out = fs.createWriteStream(logPath, { flags: 'a', mode: 0o600 });
  const kid = spawn(cmd[0], cmd.slice(1), { stdio: ['ignore', 'pipe', 'pipe'] });
  fs.writeFileSync(pidPath, String(kid.pid), { mode: 0o600 });
  // Line-buffered redaction: a token split across stream chunks would survive
  // per-chunk scrubbing, so redact whole lines only.
  const pump = stream => {
    const lines = readline.createInterface({ input: stream });
    lines.on('line', line => out.write(redact(line) + '\n'));
  };
  pump(kid.stdout);
  pump(kid.stderr);
  kid.on('exit', code => {
    out.end();
    process.exit(code ?? 1);
  });
}

function spawnRedacted(binary, args, logPath, pidPath, socket) {
  const child = spawn(
    process.execPath,
    [fileURLToPath(import.meta.url), '__redact', logPath, pidPath, '--', binary, ...args],
    { detached: true, stdio: 'ignore', env: ternEnv(socket) },
  );
  child.unref();
  return child.pid; // wrapper pid; the real service pid lands in pidPath
}

function daemonAlive(binary, socket) {
  const result = runTernLs(binary, socket, 5000);
  if (result.state === 'bad_shape') throw new Error(result.error);
  return result.state === 'ok';
}

// --- public API -----------------------------------------------------------------

/**
 * Query the Tern daemon (`tern ls --json`) and the web HTTP endpoint.
 * Returns { daemon: {running, socket, error?}, httpStatus: number|null, panes: [...] }.
 * A daemon that answers with an unexpected JSON shape reports running: true with
 * an error note and an empty pane list, rather than swallowing the change.
 */
export async function status({ binary = 'tern', socket, port, timeoutMs = 15_000 } = {}) {
  const ls = runTernLs(binary, socket, timeoutMs);
  const http = port ? await httpStatus(port, Math.min(timeoutMs, 5_000)) : null;
  if (ls.state === 'ok') {
    return { daemon: { running: true, socket: socket ?? null }, httpStatus: http, panes: panesFromLs(ls.json) };
  }
  return {
    daemon: { running: ls.state === 'bad_shape', socket: socket ?? null, error: ls.error },
    httpStatus: http,
    panes: [],
  };
}

/**
 * Start (or reuse) the Tern daemon and the web server, detached and surviving
 * agent exit. Refuses when the port is taken, the binary is not executable,
 * assets is not a directory, or an existing socket directory is not private.
 * Logs (line-redacted, mode 600) and PID files land in stateDir (mode 700).
 * Verifies CLI+HTTP afterwards and reports the pane diff; never closes panes.
 * On web failure only the just-created web process is killed; the daemon is
 * left untouched either way.
 */
export async function start({ binary = 'tern', assets, socket, port, stateDir, timeoutMs = 20_000 } = {}) {
  if (!assets) throw new Error('start: assets is required');
  if (!port) throw new Error('start: port is required');
  if (!stateDir) throw new Error('start: stateDir is required');
  binary = assertExecutable(binary);
  assertDirectory(assets);
  if (fs.existsSync(stateDir)) {
    const stat = fs.lstatSync(stateDir);
    if (!stat.isDirectory() || stat.isSymbolicLink() || (stat.mode & 0o077)) throw new Error('start: state directory must be a private directory');
  } else fs.mkdirSync(stateDir, {recursive: true, mode: 0o700});
  if (['tern-web.pid','tern-daemon.pid'].some(name => fs.existsSync(path.join(stateDir,name)))) throw new Error('start: state directory already contains process records; use a new directory');

  if (await portOpen('127.0.0.1', port)) {
    throw new Error(`start: port ${port} is already in use; refusing to start`);
  }

  // Daemon: reuse a live one, else background-start it.
  let daemonReused = false;
  let daemonPidPath = null;
  let daemonPid = null;
  if (!daemonAlive(binary, socket)) {
    prepareSocketDir(socket);
    daemonPidPath = path.join(stateDir, 'tern-daemon.pid');
    spawnRedacted(binary, ['daemon', ...(socket ? ['--socket', socket] : [])], path.join(stateDir, 'tern-daemon.log'), daemonPidPath, socket);
    try {
      await waitFor(() => daemonAlive(binary, socket), timeoutMs);
    } catch (error) {
      throw new Error(`start: daemon did not become ready: ${error.message}\n${tail(path.join(stateDir, 'tern-daemon.log'))}`);
    }
    daemonPid = readPid(daemonPidPath);
  } else {
    daemonReused = true;
  }

  const before = await status({ binary, socket, port });

  const tokenFile = pickTokenFile(stateDir);
  const webLog = path.join(stateDir, 'tern-web.log');
  const webPidPath = path.join(stateDir, 'tern-web.pid');
  spawnRedacted(
    binary,
    ['web', 'serve', '--listen', `127.0.0.1:${port}`, '--token', tokenFile, '--assets', assets],
    webLog,
    webPidPath,
    socket,
  );
  try {
    await waitFor(async () => (await httpStatus(port, 1_000)) === 200, timeoutMs);
  } catch (error) {
    // Kill only the web process created in this run; leave the daemon alone.
    const failedWebPid = readPid(webPidPath);
    if (failedWebPid) {
      try {
        process.kill(failedWebPid, 'SIGTERM');
      } catch {}
    }
    throw new Error(`start: web server did not answer HTTP 200 on ${port}: ${error.message}\n${tail(webLog)}`);
  }
  const webPid = readPid(webPidPath);

  const after = await status({ binary, socket, port });
  if (!after.daemon.running) throw new Error(`start: daemon check failed after web start: ${after.daemon.error}`);

  const beforeIds = new Set(before.panes.map(p => p.id));
  const afterIds = new Set(after.panes.map(p => p.id));
  const paneDiff = {
    before: before.panes.length,
    after: after.panes.length,
    added: after.panes.filter(p => !beforeIds.has(p.id)).map(p => p.id),
    removed: before.panes.filter(p => !afterIds.has(p.id)).map(p => p.id),
  };
  // Panes are compared but never closed.

  return {
    daemon: { reused: daemonReused, socket: socket ?? null, pidFile: daemonPidPath, pid: daemonPid },
    web: { port, log: webLog, pidFile: webPidPath, pid: webPid },
    tokenFile,
    httpStatus: after.httpStatus,
    panesBefore: before.panes,
    panesAfter: after.panes,
    paneDiff,
  };
}

/**
 * Headless offline acceptance against a running tern web server: forces
 * headless:true, serves a blank root document so the shipped app never runs,
 * then really initialises pkg/client.js and maple.js (loadClient/injectMaple).
 * No mount, no WebSocket — no pane is connected or touched. tokenFile is
 * optional (offline font acceptance needs no auth); when given, the token
 * lives in RAM only and never appears in returned details.
 * Returns { schemaVersion: 1, checks: [{name, status: passed|failed|not_run, details}] }.
 */
export async function browserCheck({ url, playwrightModule, chromiumExecutable, tokenFile, timeoutMs = 60_000 } = {}) {
  const order = ['headless_forced', 'page_served', 'webgpu_available', 'client_init', 'wire_mount', 'token_redaction', 'gpu_interaction_full'];
  const checks = new Map(order.map(name => [name, { name, status: 'not_run', details: '' }]));
  const add = (name, status, details = '') => {
    const check = checks.get(name);
    check.status = status;
    check.details = redact(details).slice(0, 500);
  };

  let token = null;
  let candidateSha256 = null;
  try {
    if (!url) throw new Error('browserCheck: url is required');
    if (!playwrightModule) throw new Error('browserCheck: playwrightModule is required');

    if (tokenFile) {
      // Token lives in RAM only from here on; it is never logged or returned.
      token = fs.readFileSync(tokenFile, 'utf8').trim();
      if (!/^[A-Za-z0-9_-]+$/.test(token)) throw new Error('browserCheck: token file has an unexpected format');
    }

    const pw = await loadPlaywright(playwrightModule);
    const clean = url.replace(/([?&])token=[^&]+&?/g, '$1').replace(/[?&]$/, '');
    const origin = new URL(clean).origin;
    const target = token ? `${clean}${clean.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}` : clean;

    const browser = await pw.chromium.launch({
      executablePath: chromiumExecutable || undefined,
      headless: true, // forced: never honour a headed request
      args: ['--no-sandbox'],
    });
    try {
      const page = await browser.newPage();

      // Blank root document: the shipped index.html (mount + WebSocket) must not
      // execute — this check connects to no pane. Static assets still reach the
      // real server because only navigation requests are intercepted.
      await page.route('**/*', route => {
        const request = route.request();
        if (request.isNavigationRequest() && new URL(request.url()).origin === origin) return route.fulfill({contentType:'text/html',body:'<!doctype html><title>Tern headless verification</title>'});
        return route.continue();
      });

      // Genuine HTTP probe of the server (API requests bypass route interception).
      let probe = null;
      try {
        probe = await page.request.get(`${origin}/maple.js`, { timeout: 10_000 });
      } catch {}
      add('page_served', probe && probe.ok() ? 'passed' : 'failed', `GET /maple.js -> ${probe ? probe.status() : 'no response'}`);

      await page.goto(target, { timeout: timeoutMs, waitUntil: 'domcontentloaded' });

      const userAgent = await page.evaluate(() => navigator.userAgent);
      add('headless_forced', /headless/i.test(userAgent) ? 'passed' : 'failed', userAgent);

      // Informational only: module init and font injection do not require GPU.
      const gpu = await page.evaluate(() => !!navigator.gpu);
      add('webgpu_available', gpu ? 'passed' : 'not_run', gpu ? 'navigator.gpu present' : 'navigator.gpu absent; GPU behavior is not checked');

      const init = await page.evaluate(async () => {
        try {
          const client = await import(new URL('/pkg/client.js', location.href).href);
          const maple = await import(new URL('/maple.js', location.href).href);
          const bytes = await maple.loadClient();
          // The shipped client exposes init as the DEFAULT export
          // (`import init, { mount } from './pkg/client.js'`).
          const init = client.default;
          if (typeof init !== 'function') throw new Error('pkg/client.js has no default init export');
          const wasm = await init({ module_or_path: bytes });
          const injected = await maple.injectMaple(wasm);
          if (!Array.isArray(injected.fonts) || injected.fonts.length !== 2) throw new Error('Expected two injected fonts');
          const view = new DataView(wasm.memory.buffer);
          for (const font of injected.fonts) {
            if (view.getUint32(font.slot,true) !== font.pointer || view.getUint32(font.slot+4,true) !== font.bytes) throw new Error('Font descriptor does not contain injected allocation');
          }
          return {
            ok: true,
            candidateSha256: Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), value => value.toString(16).padStart(2, '0')).join(''),
            family: injected.family ?? null,
            version: injected.version ?? null,
            fonts: Array.isArray(injected.fonts) ? injected.fonts.length : null,
          };
        } catch (error) {
          return { ok: false, reason: String((error && error.message) || error) };
        }
      });
      if (init.ok) {
        candidateSha256 = init.candidateSha256;
        const version = init.version ? `, maple ${init.version}` : '';
        add('client_init', 'passed', `pkg/client.js init + loadClient + injectMaple OK (${init.family}${version}, ${init.fonts} fonts)`);
      } else {
        add('client_init', 'failed', init.reason);
      }

      // Deliberately out of scope this round: no mount, no WebSocket, no pane.
      add('wire_mount', 'not_run', '本轮仅模块 init 与完整 Maple 注入，不执行 mount/WebSocket，避免连接或操作任何 pane');

      const haystack = JSON.stringify([...checks.values()]);
      add('token_redaction', token ? (haystack.includes(token) ? 'failed' : 'passed') : 'passed', token ? 'token value absent from check details' : 'no token provided; nothing to redact');
    } finally {
      await browser.close().catch(() => {});
    }
  } catch (error) {
    add('headless_forced', 'failed', (error && error.message) || String(error));
  } finally {
    add('gpu_interaction_full', 'not_run', '本轮仅验证模块初始化与字体注入，未执行完整 GPU 交互');
  }

  const result = order.map(name => checks.get(name));
  // Final defensive scrub: the token value must never leave this function.
  const finalChecks = token ? JSON.parse(JSON.stringify(result).split(token).join('<REDACTED>')) : result;
  return { schemaVersion: 1, candidateSha256, checks: finalChecks };
}
