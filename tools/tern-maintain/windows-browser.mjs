// 在 WSL 宿主上用真实 Windows Chrome 复现“网页 Markdown 含中文后失去响应”：
// 只从调用方给定的 binary/assets 启动完全隔离的 daemon + web（随机端口、私有 socket、
// 仅本次运行使用的 token），浏览器驱动由临时 worker 经 Windows Node 执行，报告不带 token。
// 报告记录 mounted/responsive、同一路径 ASCII/CJK 画面、中文首帧后的延迟画面和鼠标输入。
// 前置失败或驱动超时为 not_run；画面变化包含光标等因素，结果不用于判定时间补丁必要性。
// cleanup 错误单独记录，绝不覆盖主结论。
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';
import { createRequire } from 'node:module';
import { redact } from './runtime.mjs';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
function withTimeout(promise, ms, label) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(label)), ms);
    promise.then(
      value => { clearTimeout(timer); resolve(value); },
      error => { clearTimeout(timer); reject(error); },
    );
  });
}

const SEQUENCE = [
  'windows_host',
  'windows_node',
  'windows_playwright',
  'windows_chrome',
  'isolated_daemon',
  'isolated_web',
  'driver_started',
  'page_loaded',
  'webgpu_adapter',
  'page_mounted',
  'ascii_markdown_pane',
  'ascii_responsive',
  'pane_closed',
  'cjk_appended',
  'cjk_markdown_pane',
  'cjk_responsive',
  'cjk_progress',
];

// 驱动源码只在此处以字符串生成后写入临时目录；不经过 shell。
const DRIVER_SOURCE = String.raw`import { createHash } from 'node:crypto';
import fs from 'node:fs';
import readline from 'node:readline';
import { chromium } from 'playwright';

const write = value => process.stdout.write(JSON.stringify(value) + '\n');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const clean = value => String(value).replace(/token=[^&\s"']+/g, 'token=<REDACTED>').slice(0, 400);

const messages = [];
const errors = [];
let browser = null;
let page = null;

function evaluate(fn, ms, arg) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('page evaluate timed out')), ms);
    page.evaluate(fn, arg).then(
      value => { clearTimeout(timer); resolve(value); },
      error => { clearTimeout(timer); reject(error); },
    );
  });
}

const READ_STATE = marker => {
  const verification = window.__ternVerification;
  let state;
  if (verification) {
    state = {
      structured: true,
      ready: verification.ready === true,
      mounted: verification.mounted === true,
      failed: verification.failed === true,
      error: verification.error || null,
      tokenPrompt: verification.tokenPrompt === true,
    };
  } else {
    const status = document.getElementById('status');
    const failed = !!(status && status.classList && status.classList.contains('error'));
    state = {
      structured: false,
      ready: !!window.tern || failed,
      mounted: !!window.tern,
      failed,
      error: failed ? String(status.textContent || '') : null,
      tokenPrompt: false,
    };
  }
  return marker ? { marker, state } : state;
};

const READ_INTERACTION = marker => {
  const state = (() => {
    const verification = window.__ternVerification;
    if (verification) return { structured: true, ready: verification.ready === true, mounted: verification.mounted === true, failed: verification.failed === true, error: verification.error || null, tokenPrompt: verification.tokenPrompt === true };
    const status = document.getElementById('status');
    const failed = !!(status && status.classList && status.classList.contains('error'));
    return { structured: false, ready: !!window.tern || failed, mounted: !!window.tern, failed, error: failed ? String(status.textContent || '') : null, tokenPrompt: false };
  })();
  const canvas = document.getElementById('tern');
  if (!(canvas instanceof HTMLCanvasElement)) return { state, accepted: false, reason: 'canvas missing' };
  canvas.focus();
  return { state, accepted: true, canvas: { width: canvas.width, height: canvas.height }, viewport: { width: innerWidth, height: innerHeight, scale: devicePixelRatio }, submissions: window.__ternRenderProbe?.submissions ?? null };
};

async function waitForMount(ms) {
  const end = Date.now() + ms;
  let state = null;
  while (Date.now() < end) {
    try {
      state = await evaluate(READ_STATE, 5000);
    } catch (error) {
      return { responsive: false, mounted: false, error: clean(error && error.message || error) };
    }
    if (state && state.failed === true) return { responsive: true, mounted: false, failed: true, error: clean(state.error || '') };
    if (state && state.mounted === true) return { responsive: true, mounted: true, structured: state.structured === true };
    await sleep(200);
  }
  return { responsive: true, mounted: false, timedOut: true };
}

async function start(msg) {
  browser = await chromium.launch({
    executablePath: msg.executablePath,
    headless: false,
    args: ['--no-sandbox', '--enable-unsafe-webgpu', '--ignore-gpu-blocklist'],
  });
  page = await browser.newPage();
  await page.addInitScript(() => {
    if (typeof GPUQueue === 'undefined') return;
    const probe = window.__ternRenderProbe = { submissions: 0 };
    const submit = GPUQueue.prototype.submit;
    GPUQueue.prototype.submit = function (...args) {
      const result = Reflect.apply(submit, this, args);
      probe.submissions++;
      return result;
    };
  });
  page.on('console', message => { if (messages.length < 100) messages.push({ type: message.type(), text: clean(message.text()) }); });
  page.on('pageerror', error => { if (errors.length < 20) errors.push(clean(error && error.message || error)); });
  if (msg.wasmPath) {
    const wasmBytes = fs.readFileSync(msg.wasmPath);
    await page.route(url => url.href.includes('build.stencil.so') && /\.wasm($|[?#])/.test(url.href), route => route.fulfill({
      status: 200,
      headers: { 'content-type': 'application/wasm', 'access-control-allow-origin': '*' },
      body: wasmBytes,
    }));
  }
  let status = 0;
  try {
    const response = await page.goto(msg.url, { timeout: msg.gotoTimeoutMs, waitUntil: 'domcontentloaded' });
    status = response ? response.status() : 0;
  } catch (error) {
    return { ok: false, stage: 'goto', status, error: clean(error && error.message || error) };
  }

  let gpu;
  try {
    gpu = await evaluate(async () => {
      if (!navigator.gpu) return { available: false, reason: 'navigator.gpu absent' };
      const adapter = await navigator.gpu.requestAdapter();
      return adapter ? { available: true } : { available: false, reason: 'requestAdapter returned null' };
    }, 20000);
  } catch (error) {
    gpu = { available: false, reason: clean(error && error.message || error) };
  }
  const mount = gpu.available ? await waitForMount(msg.mountTimeoutMs) : { responsive: true, mounted: false, skipped: true };
  const userAgent = await evaluate(() => navigator.userAgent, 5000).catch(() => null);
  return { ok: true, status, gpu, mount, userAgent };
}

async function evaluateState(ms) {
  try {
    const result = await evaluate(READ_STATE, ms, 'tern-markdown-probe');
    const state = result && result.state;
    return { responsive: true, mounted: !!(state && state.mounted === true), failed: !!(state && state.failed === true), error: clean(state && state.error || '') };
  } catch (error) {
    return { responsive: false, error: clean(error && error.message || error) };
  }
}

async function captureFrame(ms) {
  try {
    const buffer = await Promise.race([
      page.screenshot({ timeout: ms }),
      sleep(ms).then(() => { throw new Error('screenshot timed out'); }),
    ]);
    return { sha256: createHash('sha256').update(buffer).digest('hex') };
  } catch (error) {
    return { error: clean(error && error.message || error) };
  }
}

async function probe(ms) {
  const [state, frame] = await Promise.all([evaluateState(ms), captureFrame(Math.max(1000, Math.min(5000, ms)))]);
  const result = { ...state, frameSha256: frame.sha256 || null };
  if (frame.error) result.frameError = frame.error;
  return result;
}

async function visibleInteraction(ms) {
  const before = await evaluate(READ_INTERACTION, ms, 'tern-visible-interaction');
  if (!before.accepted || before.submissions === null) return { accepted: false, reason: 'canvas or GPU submission observation unavailable' };
  const target = { width: before.viewport.width + 80, height: before.viewport.height + 40 };
  await page.setViewportSize(target);
  const end = Date.now() + ms;
  let after;
  while (Date.now() < end) {
    after = await evaluate(READ_INTERACTION, Math.min(2000, ms), 'tern-visible-interaction-after');
    const resized = after.canvas.width === Math.round(target.width * after.viewport.scale) && after.canvas.height === Math.round(target.height * after.viewport.scale);
    if (resized && after.submissions > before.submissions) return { accepted: true, changed: true, state: after.state, before, after, reason: 'application resized its canvas and submitted GPU commands after viewport input' };
    await sleep(100);
  }
  return { accepted: true, changed: false, state: after?.state, before, after, reason: 'viewport input produced no observed application redraw' };
}

async function screenshot(file, ms) {
  try {
    await Promise.race([
      page.screenshot({ path: file, timeout: ms }),
      sleep(ms).then(() => { throw new Error('screenshot timed out'); }),
    ]);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: clean(error && error.message || error) };
  }
}

async function handle(msg) {
  if (msg.cmd === 'start') return start(msg);
  if (msg.cmd === 'probe') return probe(msg.timeoutMs);
  if (msg.cmd === 'screenshot') return screenshot(msg.path, msg.timeoutMs);
  if (msg.cmd === 'visible-interaction') return visibleInteraction(msg.timeoutMs);
  if (msg.cmd === 'collect') return { messages, errors };
  if (msg.cmd === 'stop') {
    if (browser) await browser.close().catch(() => {});
    return { stopped: true };
  }
  throw new Error('unknown command');
}

const rl = readline.createInterface({ input: process.stdin });
write({ event: 'ready', pid: process.pid });
rl.on('line', line => {
  let msg;
  try { msg = JSON.parse(line); } catch { return; }
  Promise.resolve().then(() => handle(msg)).then(
    result => {
      write({ id: msg.id, ok: true, result });
      if (msg.cmd === 'stop') { rl.close(); setTimeout(() => process.exit(0), 50); }
    },
    error => write({ id: msg.id, ok: false, error: clean(error && error.message || error) }),
  );
});
`;

class PrereqError extends Error {}

function message(error) {
  return redact(String((error && error.message) || error)).slice(0, 500);
}

function isWslHost() {
  if (process.platform !== 'linux') return false;
  try {
    return /microsoft/i.test(fs.readFileSync('/proc/sys/kernel/osrelease', 'utf8'));
  } catch {
    return false;
  }
}

function resolveExecutable(value) {
  if (!value) return null;
  const candidate = value.includes('/') ? path.resolve(value) : (process.env.PATH || '').split(path.delimiter)
    .map(directory => path.join(directory, value))
    .find(file => fs.existsSync(file));
  if (!candidate) return null;
  try {
    fs.accessSync(candidate, fs.constants.X_OK);
    return fs.statSync(candidate).isFile() ? candidate : null;
  } catch {
    return null;
  }
}

function existingFile(value) {
  try {
    return fs.statSync(value).isFile();
  } catch {
    return false;
  }
}

function wslToWindows(file) {
  const result = spawnSync('wslpath', ['-w', file], { encoding: 'utf8', timeout: 5000 });
  const converted = (result.stdout || '').split(/\r?\n/).map(line => line.trim()).find(Boolean);
  if (result.status !== 0 || !converted) throw new Error(`wslpath could not convert ${file}`);
  return converted;
}

function wslToUnix(file) {
  const result = spawnSync('wslpath', ['-u', file], { encoding: 'utf8', timeout: 5000 });
  const converted = (result.stdout || '').split(/\r?\n/).map(line => line.trim()).find(Boolean);
  return result.status === 0 && converted ? converted : null;
}

function windowsDrives() {
  return ['c', 'd', 'e', 'f'].filter(drive => fs.existsSync(`/mnt/${drive}`));
}

function discoverWindowsNode() {
  for (const drive of windowsDrives()) {
    const file = `/mnt/${drive}/Program Files/nodejs/node.exe`;
    if (existingFile(file)) return file;
  }
  const cmd = '/mnt/c/Windows/System32/cmd.exe';
  if (!fs.existsSync(cmd)) return null;
  const result = spawnSync(cmd, ['/c', 'where', 'node.exe'], { cwd: '/mnt/c/Windows', encoding: 'utf8', timeout: 5000 });
  const line = (result.stdout || '').split(/\r?\n/).map(value => value.trim()).find(Boolean);
  if (!line) return null;
  const unix = wslToUnix(line);
  return unix && existingFile(unix) ? unix : null;
}

function discoverChrome() {
  for (const drive of windowsDrives()) {
    for (const prefix of ['Program Files', 'Program Files (x86)']) {
      const file = `/mnt/${drive}/${prefix}/Google/Chrome/Application/chrome.exe`;
      if (existingFile(file)) return file;
    }
    const users = `/mnt/${drive}/Users`;
    if (!fs.existsSync(users)) continue;
    for (const user of fs.readdirSync(users)) {
      const file = `${users}/${user}/AppData/Local/Google/Chrome/Application/chrome.exe`;
      if (existingFile(file)) return file;
    }
  }
  return null;
}

function discoverPlaywright() {
  const candidates = [
    path.join(os.homedir(), '.bun/install/global/node_modules/playwright'),
    '/usr/local/lib/node_modules/playwright',
    '/usr/lib/node_modules/playwright',
  ];
  for (const candidate of candidates) {
    if (existingFile(path.join(candidate, 'package.json'))) return candidate;
  }
  try {
    return path.dirname(createRequire(import.meta.url).resolve('playwright/package.json'));
  } catch {
    return null;
  }
}

/** 隔离子进程的环境：固定本次 socket，去掉桌面/会话变量。 */
/** @param {string | undefined} socket @param {string} stateDir */
function ternEnv(socket, stateDir) {
  /** @type {NodeJS.ProcessEnv} */
  const env = { ...process.env, TERN_CONFIG_DIR: stateDir };
  if (socket) env.TERN_DAEMON_SOCKET = socket;
  else delete env.TERN_DAEMON_SOCKET;
  for (const key of ['DISPLAY', 'WAYLAND_DISPLAY', 'WAYLAND_SOCKET', 'DBUS_SESSION_BUS_ADDRESS', 'BROWSER']) delete env[key];
  return env;
}

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = /** @type {import('node:net').AddressInfo} */(server.address());
      const port = address.port;
      server.close(() => resolve(port));
    });
  });
}

function httpStatus(port, timeoutMs) {
  return new Promise(resolve => {
    const request = http.get({ host: '127.0.0.1', port, path: '/', timeout: timeoutMs }, response => {
      response.resume();
      resolve(response.statusCode);
    });
    request.on('error', () => resolve(null));
    request.on('timeout', () => { request.destroy(); resolve(null); });
  });
}

async function waitFor(fn, timeoutMs, intervalMs = 100) {
  const deadline = Date.now() + timeoutMs;
  let last = null;
  while (Date.now() < deadline) {
    last = await fn();
    if (last) return last;
    await sleep(Math.min(intervalMs, Math.max(0, deadline - Date.now())));
  }
  return last;
}

function lsSnapshot(binary, env, timeoutMs = 3000) {
  let output;
  try {
    output = execFileSync(binary, ['ls', '--json'], { encoding: 'utf8', timeout: timeoutMs, env, maxBuffer: 10 * 1024 * 1024 });
  } catch (error) {
    return { status: 'no_daemon', panes: null, error: message(error) };
  }
  let json;
  try {
    json = JSON.parse(output);
  } catch {
    return { status: 'bad_shape', panes: null };
  }
  if (!json || !Array.isArray(json.sessions)) return { status: 'bad_shape', panes: null };
  let panes = 0;
  for (const session of json.sessions) {
    for (const tab of Array.isArray(session.tabs) ? session.tabs : []) {
      panes += Array.isArray(tab.blocks) ? tab.blocks.length : 0;
    }
  }
  return { status: 'ok', panes, json };
}

function blocksOf(json) {
  const blocks = [];
  for (const session of json.sessions) {
    for (const tab of Array.isArray(session.tabs) ? session.tabs : []) {
      for (const block of Array.isArray(tab.blocks) ? tab.blocks : []) blocks.push(block);
    }
  }
  return blocks;
}

async function openMarkdown(binary, env, file, timeoutMs) {
  const output = execFileSync(binary, ['open', '--split', 'right', '--json', file], { encoding: 'utf8', timeout: timeoutMs, env, maxBuffer: 10 * 1024 * 1024 });
  const json = JSON.parse(output);
  const id = Array.isArray(json.blocks) ? json.blocks[0] : undefined;
  if (!Number.isInteger(id)) throw new Error('tern open did not report a block id');
  const present = await waitFor(() => {
    const snapshot = lsSnapshot(binary, env, 2000);
    return snapshot.status === 'ok' && blocksOf(snapshot.json).some(block => block?.id === id && block.file === file);
  }, timeoutMs, 150);
  if (!present) throw new Error(`tern open id ${id} is not a current pane for ${file}`);
  return id;
}

function closeBlock(binary, env, id, file, timeoutMs) {
  const snapshot = lsSnapshot(binary, env, 2000);
  if (snapshot.status !== 'ok') throw new Error(`close could not read daemon state: ${snapshot.status}`);
  const matches = blocksOf(snapshot.json).filter(block => block?.file === file);
  if (matches.length !== 1) throw new Error(`close expected one pane for ${file}; found ${matches.length}; previous open id=${id}; current ids=${matches.map(block => block.id).join(',')}`);
  const currentId = matches[0].id;
  execFileSync(binary, ['close', String(currentId), '--json'], { encoding: 'utf8', timeout: timeoutMs, env, maxBuffer: 10 * 1024 * 1024 });
  return currentId;
}

function waitExit(child, timeoutMs) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return Promise.resolve(true);
  return new Promise(resolve => {
    const timer = setTimeout(() => { child.off('exit', onExit); resolve(false); }, timeoutMs);
    const onExit = () => { clearTimeout(timer); resolve(true); };
    child.once('exit', onExit);
  });
}

async function stopChild(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  try {
    child.kill('SIGTERM');
  } catch (error) {
    if (error && error.code === 'ESRCH') return;
    throw error;
  }
  if (await waitExit(child, 3000)) return;
  try { child.kill('SIGKILL'); } catch {}
  if (!(await waitExit(child, 2000))) throw new Error(`process ${child.pid} did not exit`);
}

function killWindowsTree(pid) {
  if (!pid) return;
  const taskkill = ['/mnt/c/Windows/System32/taskkill.exe', 'taskkill.exe'].find(file => file === 'taskkill.exe' || fs.existsSync(file));
  if (!taskkill) return;
  try {
    execFileSync(taskkill, ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore', timeout: 5000, cwd: '/mnt/c/Windows' });
  } catch {}
}

/** 经临时 worker 驱动 Windows Node：一行一个 JSON 命令/回复。 */
function startDriver({ nodePath, scriptArg, cwd, env }) {
  const child = spawn(nodePath, [scriptArg], { cwd, stdio: ['pipe', 'pipe', 'pipe'], env });
  const pending = new Map();
  let counter = 0;
  let stderr = '';
  let exited = false;
  let pid = null;
  let readyResolve;
  let readyReject;
  const ready = new Promise((resolve, reject) => { readyResolve = resolve; readyReject = reject; });

  readline.createInterface({ input: child.stdout }).on('line', line => {
    let reply;
    try { reply = JSON.parse(line); } catch { return; }
    if (reply.event === 'ready') { pid = reply.pid; readyResolve(); return; }
    const waiter = pending.get(reply.id);
    if (!waiter) return;
    pending.delete(reply.id);
    clearTimeout(waiter.timer);
    if (reply.ok) waiter.resolve(reply.result);
    else waiter.reject(new Error(reply.error || 'driver command failed'));
  });
  child.stderr.on('data', chunk => { stderr = (stderr + chunk).slice(-2000); });
  child.on('error', error => {
    exited = true;
    const failure = new Error(`driver failed to start: ${redact(String((error && error.message) || error))}`);
    readyReject(failure);
    for (const [id, waiter] of pending) {
      clearTimeout(waiter.timer);
      pending.delete(id);
      waiter.reject(failure);
    }
  });
  child.on('exit', () => {
    exited = true;
    for (const [id, waiter] of pending) {
      clearTimeout(waiter.timer);
      pending.delete(id);
      waiter.reject(new Error('driver exited'));
    }
    readyReject(new Error(`driver exited before ready: ${redact(stderr)}`));
  });

  const driver = {
    child,
    get pid() { return pid; },
    get stderrTail() { return redact(stderr).slice(-500); },
    ready,
    rpc(command, timeoutMs) {
      if (exited) return Promise.reject(new Error('driver is not running'));
      const id = ++counter;
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => { pending.delete(id); reject(new Error(`driver command timed out: ${command.cmd}`)); }, timeoutMs);
        pending.set(id, { resolve, reject, timer });
        try {
          child.stdin.write(JSON.stringify({ id, ...command }) + '\n');
        } catch (error) {
          clearTimeout(timer);
          pending.delete(id);
          reject(error);
        }
      });
    },
    async stop() {
      try { await driver.rpc({ cmd: 'stop' }, 3000); } catch {}
      if (await waitExit(child, 3000)) return;
      killWindowsTree(pid);
      try { child.kill('SIGTERM'); } catch {}
      if (await waitExit(child, 2000)) return;
      try { child.kill('SIGKILL'); } catch {}
      if (!(await waitExit(child, 2000))) throw new Error('driver process did not exit');
    },
  };
  return driver;
}

function copyDirectory(source, destination) {
  fs.cpSync(source, destination, { recursive: true, dereference: true, errorOnExist: true });
}

function playwrightCore(playwrightDir) {
  const candidates = [
    path.join(path.dirname(playwrightDir), 'playwright-core'),
    path.join(playwrightDir, 'node_modules', 'playwright-core'),
  ];
  return candidates.find(candidate => existingFile(path.join(candidate, 'package.json'))) || null;
}
function readTail(file, bytes = 1500) {
  try {
    const stat = fs.statSync(file);
    const start = Math.max(0, stat.size - bytes);
    const buffer = Buffer.alloc(stat.size - start);
    const fd = fs.openSync(file, 'r');
    try { fs.readSync(fd, buffer, 0, buffer.length, start); } finally { fs.closeSync(fd); }
    return redact(buffer.toString('utf8'));
  } catch {
    return '';
  }
}

/** 子进程 stdout+stderr 追加到私有 0600 日志，失败时读脱敏尾部。 */
function spawnWithLog(binary, args, env, logPath) {
  const fd = fs.openSync(logPath, 'a', 0o600);
  try {
    return spawn(binary, args, { stdio: ['ignore', fd, fd], env });
  } finally {
    fs.closeSync(fd);
  }
}

function windowsTempCandidates() {
  const candidates = [];
  const users = '/mnt/c/Users';
  if (fs.existsSync(users)) {
    for (const user of fs.readdirSync(users)) {
      const directory = `${users}/${user}/AppData/Local/Temp`;
      if (fs.existsSync(directory)) candidates.push(directory);
    }
  }
  return candidates;
}

/**
 * prepare 的原始 assets 只有 official.html + pkg/client.js + pkg/original.wasm。
 * 在自己的私有目录生成 web 可服务的布局，绝不修改调用方目录。
 */
function serviceAssets(assetsDir, root) {
  if (existingFile(path.join(assetsDir, 'index.html'))) return { dir: assetsDir, original: false, wasm: null };
  const official = path.join(assetsDir, 'official.html');
  const client = path.join(assetsDir, 'pkg', 'client.js');
  const wasm = path.join(assetsDir, 'pkg', 'original.wasm');
  if (!existingFile(official) || !existingFile(client) || !existingFile(wasm)) {
    throw new PrereqError(`checkMarkdownWindows: assets '${assetsDir}' has neither index.html nor official.html + pkg/client.js + pkg/original.wasm`);
  }
  const dir = path.join(root, 'service-assets');
  fs.mkdirSync(dir, { mode: 0o700 });
  fs.mkdirSync(path.join(dir, 'pkg'), { mode: 0o700 });
  fs.copyFileSync(official, path.join(dir, 'index.html'));
  fs.copyFileSync(client, path.join(dir, 'pkg', 'stencil_tern_web.js'));
  fs.copyFileSync(wasm, path.join(dir, 'pkg', 'stencil_tern_web_bg.wasm'));
  return { dir, original: true, wasm };
}

const ASCII_MARKDOWN = [
  '# English Markdown Test',
  '',
  'Hello from Tern.',
  '',
  '## Simple List',
  '',
  '- First item',
  '- Second item',
  '',
  'This is **bold text** and this is `inline code`.',
  '',
].join('\n');

/**
 * 在 Windows Chrome 里复现 Markdown 中文冻结。返回 schemaVersion 1 报告：
 * { kind:'markdown-reproduction', conclusion: not_run|reproduced|not_reproduced, ... }。
 * 前置条件失败一律 not_run；ASCII 成功且 CJK 页面无响应才是 reproduced。
 * @param {{ binary?: string, assets?: string, socketDir?: string, node?: string, playwrightModule?: string, chromium?: string, out?: string, timeoutMs?: number }} [options]
 */
export async function checkMarkdownWindows({
  binary,
  assets,
  socketDir,
  node,
  playwrightModule,
  chromium,
  out,
  timeoutMs = 60_000,
} = {}) {
  const report = {
    schemaVersion: 1,
    kind: 'markdown-reproduction',
    conclusion: 'not_run',
    reason: '',
    fixturePath: null,
    sequence: [],
    mounted: { ascii: null, cjk: null },
    frames: { ascii: null, cjk: null },
    cjkProgress: { delayedFrame: null, visibleInteraction: null },
    daemon: { status: 'not_run', panes: null },
    console: [],
    wasmErrors: [],
    screenshot: null,
    cleanup: { ok: true, errors: [] },
  };
  const entries = new Map(SEQUENCE.map(name => [name, { name, status: 'not_run', details: '' }]));
  const add = (name, status, details = '') => {
    const entry = entries.get(name);
    entry.status = status;
    entry.details = redact(details).slice(0, 500);
  };
  const cleanupErrors = [];
  const children = [];
  const tempDirs = [];
  let token = null;
  let driver = null;
  const deadline = Date.now() + timeoutMs;
  const remaining = () => deadline - Date.now();

  function budget(label, cap) {
    const left = remaining();
    if (left <= 0) throw new Error(`checkMarkdownWindows: timed out before ${label}`);
    return Math.max(1, Math.min(cap, left));
  }

  let daemonProbe = null;
  try {
    // --- prerequisites -------------------------------------------------------
    if (!isWslHost()) {
      add('windows_host', 'failed', 'not a Linux WSL host');
      throw new PrereqError('checkMarkdownWindows: only runs on Linux under WSL');
    }
    add('windows_host', 'passed', 'Linux WSL host detected');

    const binaryPath = resolveExecutable(binary);
    if (!binaryPath) {
      add('isolated_daemon', 'failed', `binary '${binary}' is not executable`);
      throw new PrereqError(`checkMarkdownWindows: binary '${binary}' is not executable`);
    }
    if (!assets || !fs.existsSync(assets) || !fs.statSync(assets).isDirectory()) {
      add('isolated_daemon', 'failed', `assets '${assets}' is not a directory`);
      throw new PrereqError(`checkMarkdownWindows: assets '${assets}' is not a directory`);
    }

    const nodePath = node ? (existingFile(node) ? node : null) : discoverWindowsNode();
    if (!nodePath) {
      add('windows_node', 'failed', node ? node : 'Windows Node was not found');
      throw new PrereqError('checkMarkdownWindows: Windows Node was not found');
    }
    const windowsNode = /^\/mnt\/[a-z]\//i.test(nodePath) || /\.exe$/i.test(nodePath);
    add('windows_node', 'passed', nodePath);

    const playwrightPath = playwrightModule || discoverPlaywright();
    if (!playwrightPath || !fs.existsSync(path.join(playwrightPath, 'package.json'))) {
      add('windows_playwright', 'failed', playwrightModule || 'playwright module was not found');
      throw new PrereqError(`checkMarkdownWindows: playwright module '${playwrightModule || '(not found)'}' is not installed`);
    }
    add('windows_playwright', 'passed', playwrightPath);

    const chromePath = chromium || discoverChrome();
    if (!chromePath || !existingFile(chromePath)) {
      add('windows_chrome', 'failed', chromium || 'Windows Chrome was not found');
      throw new PrereqError('checkMarkdownWindows: Windows Chrome was not found');
    }
    add('windows_chrome', 'passed', chromePath);

    if (windowsNode && !fs.existsSync('/mnt/c/Windows')) throw new PrereqError('checkMarkdownWindows: cannot convert paths without /mnt/c/Windows');

    // --- isolated daemon + web ----------------------------------------------
    const root = await fsp.mkdtemp(path.join(os.tmpdir(), 'tern-win-browser-'));
    tempDirs.push(root);
    await fsp.chmod(root, 0o700);
    const stateDir = path.join(root, 'state');
    const fixtureDir = path.join(root, 'fixture');
    await fsp.mkdir(stateDir, { mode: 0o700 });
    await fsp.mkdir(fixtureDir, { mode: 0o700 });

    let socketBase = root;
    if (socketDir) {
      const stat = fs.lstatSync(socketDir);
      if (!stat.isDirectory() || stat.isSymbolicLink() || (stat.mode & 0o077)) {
        throw new PrereqError(`checkMarkdownWindows: socketDir '${socketDir}' must be a private directory`);
      }
      socketBase = socketDir;
    }
    const socketRoot = await fsp.mkdtemp(path.join(socketBase, 'tern-win-sock-'));
    tempDirs.push(socketRoot);
    await fsp.chmod(socketRoot, 0o700);
    const socket = path.join(socketRoot, 'daemon.sock');
    const env = ternEnv(socket, stateDir);

    const tokenFile = path.join(root, 'web-token');
    token = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(tokenFile, token + '\n', { mode: 0o600, flag: 'wx' });

    const fixture = path.join(fixtureDir, 'fixture.md');
    fs.writeFileSync(fixture, ASCII_MARKDOWN, { mode: 0o600 });
    report.fixturePath = fixture;
    let service;
    try {
      service = serviceAssets(assets, root);
    } catch (error) {
      add('isolated_web', 'failed', message(error));
      throw error;
    }

    const daemonLog = path.join(root, 'daemon.log');
    const daemon = spawnWithLog(binaryPath, ['daemon', ...(socket ? ['--socket', socket] : [])], env, daemonLog);
    children.push(daemon);
    daemonProbe = () => lsSnapshot(binaryPath, env, 1500);
    let readiness = null;
    try {
      readiness = await waitFor(() => {
        if (daemon.exitCode !== null || daemon.signalCode !== null) throw new Error(`daemon exited (code ${daemon.exitCode ?? daemon.signalCode}): ${readTail(daemonLog)}`);
        const snapshot = lsSnapshot(binaryPath, env, 2000);
        return snapshot.status === 'ok' ? snapshot : null;
      }, budget('isolated_daemon', Math.max(1000, timeoutMs - 5000)), 150);
    } catch (error) {
      add('isolated_daemon', 'failed', message(error));
      throw error;
    }
    if (!readiness) {
      add('isolated_daemon', 'failed', `daemon did not become ready: ${readTail(daemonLog)}`);
      throw new Error('checkMarkdownWindows: isolated daemon did not become ready');
    }
    add('isolated_daemon', 'passed', `panes=${readiness.panes}`);

    const port = await freePort();
    const webLog = path.join(root, 'web.log');
    const web = spawnWithLog(binaryPath, ['web', 'serve', '--listen', `127.0.0.1:${port}`, '--token', tokenFile, '--assets', service.dir], env, webLog);
    children.push(web);
    let served = null;
    try {
      served = await waitFor(async () => {
        if (web.exitCode !== null || web.signalCode !== null) throw new Error(`web server exited (code ${web.exitCode ?? web.signalCode}): ${readTail(webLog)}`);
        const status = await httpStatus(port, 1000);
        if (status === null) return false;
        if (status === 200) return true;
        throw new Error(`web server answered HTTP ${status}: ${readTail(webLog)}`);
      }, budget('isolated_web', Math.max(1000, timeoutMs - 5000)), 150);
    } catch (error) {
      add('isolated_web', 'failed', message(error));
      throw error;
    }
    if (!served) {
      add('isolated_web', 'failed', `no HTTP 200 on 127.0.0.1:${port}: ${readTail(webLog)}`);
      throw new Error(`checkMarkdownWindows: isolated web server did not answer on 127.0.0.1:${port}`);
    }
    add('isolated_web', 'passed', `127.0.0.1:${port}${service.original ? ' (original layout prepared)' : ''}`);

    // --- temporary browser driver -------------------------------------------
    let driverDir = null;
    if (windowsNode) {
      for (const candidate of windowsTempCandidates()) {
        try { driverDir = await fsp.mkdtemp(path.join(candidate, 'tern-win-driver-')); break; } catch {}
      }
    }
    if (!driverDir) driverDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'tern-win-driver-'));
    tempDirs.push(driverDir);
    try { await fsp.chmod(driverDir, 0o700); } catch {}
    const modules = path.join(driverDir, 'node_modules');
    await fsp.mkdir(modules, { mode: 0o700 });
    copyDirectory(playwrightPath, path.join(modules, 'playwright'));
    const core = playwrightCore(playwrightPath);
    if (core) copyDirectory(core, path.join(modules, 'playwright-core'));
    const driverFile = path.join(driverDir, 'driver.mjs');
    fs.writeFileSync(driverFile, DRIVER_SOURCE, { mode: 0o600 });
    let wasmArg = null;
    if (service.original) {
      const localWasm = path.join(driverDir, 'stencil_tern_web_bg.wasm');
      fs.copyFileSync(service.wasm, localWasm);
      try { fs.chmodSync(localWasm, 0o600); } catch {}
      wasmArg = windowsNode ? wslToWindows(localWasm) : localWasm;
    }

    driver = startDriver({
      nodePath,
      scriptArg: windowsNode ? wslToWindows(driverFile) : driverFile,
      cwd: windowsNode ? '/mnt/c/Windows' : driverDir,
      env: process.env,
    });
    try {
      await withTimeout(driver.ready, budget('driver_started', 30_000), 'driver did not report ready');
    } catch (error) {
      add('driver_started', 'failed', message(error));
      throw error;
    }
    add('driver_started', 'passed', `pid ${driver.pid}`);

    const screenshotTarget = out
      ? `${out.replace(/\.json$/i, '')}.png`
      : path.join(driverDir, 'screenshot.png');
    const screenshotArg = windowsNode ? wslToWindows(screenshotTarget) : screenshotTarget;
    const chromeArg = windowsNode ? wslToWindows(chromePath) : chromePath;
    const url = `http://127.0.0.1:${port}/?token=${encodeURIComponent(token)}`;

    // --- real page load, WebGPU adapter, structured mount -------------------
    const gotoTimeoutMs = budget('page_loaded', 30_000);
    const mountTimeoutMs = budget('page_mounted', 20_000);
    const start = await driver.rpc({
      cmd: 'start',
      url,
      executablePath: chromeArg,
      gotoTimeoutMs,
      mountTimeoutMs,
      wasmPath: wasmArg,
    }, gotoTimeoutMs + mountTimeoutMs + 3000);
    if (!start.ok) {
      add('page_loaded', 'failed', `${start.stage} failed (status ${start.status}): ${start.error}`);
      throw new PrereqError(`checkMarkdownWindows: page navigation failed: ${start.error}`);
    }
    add('page_loaded', start.status === 200 ? 'passed' : 'failed', `GET / -> ${start.status}`);
    if (start.status !== 200) throw new PrereqError(`checkMarkdownWindows: page returned HTTP ${start.status}`);

    if (!start.gpu || start.gpu.available !== true) {
      const reason = (start.gpu && start.gpu.reason) || 'no WebGPU adapter';
      add('webgpu_adapter', 'failed', reason);
      throw new PrereqError(`checkMarkdownWindows: Windows Chrome has no WebGPU adapter: ${reason}`);
    }
    add('webgpu_adapter', 'passed', 'navigator.gpu.requestAdapter() returned an adapter');

    if (!start.mount || start.mount.mounted !== true) {
      const mount = start.mount || {};
      add('page_mounted', 'failed', mount.error || (mount.failed ? 'page reported failed' : mount.timedOut ? 'timed out' : 'mounted!==true'));
      throw new PrereqError(`checkMarkdownWindows: page did not reach mounted===true: ${mount.error || 'no structured mounted state'}`);
    }
    add('page_mounted', 'passed', start.mount.structured === true ? 'window.__ternVerification.mounted===true' : 'window.tern mounted without #status.error');

    const probeStage = async label => {
      const probeMs = budget(label, 15_000);
      try {
        return await driver.rpc({ cmd: 'probe', timeoutMs: probeMs }, probeMs + 2000);
      } catch (error) {
        return { rpcError: message(error) };
      }
    };

    // --- baseline frame before any pane opens --------------------------------
    const baseline = await probeStage('baseline_frame');
    if (baseline.rpcError || baseline.responsive !== true || baseline.mounted !== true || !baseline.frameSha256) {
      const why = baseline.rpcError || baseline.frameError || baseline.error
        || (baseline.responsive !== true ? 'page did not respond' : baseline.mounted !== true ? 'mounted!==true' : 'screenshot failed');
      add('ascii_responsive', 'failed', `baseline frame unavailable: ${why}`);
      throw new PrereqError('checkMarkdownWindows: could not capture the mounted baseline frame');
    }

    // --- ASCII markdown pane -------------------------------------------------
    let asciiId;
    try {
      asciiId = await openMarkdown(binaryPath, env, fixture, budget('ascii_markdown_pane', 10_000));
      add('ascii_markdown_pane', 'passed', `block ${asciiId}`);
    } catch (error) {
      add('ascii_markdown_pane', 'failed', message(error));
      throw error;
    }
    await sleep(Math.max(0, Math.min(1000, remaining() - 10_000)));
    const ascii = await probeStage('ascii_probe');
    report.mounted.ascii = ascii.responsive === true && ascii.mounted === true;
    report.frames.ascii = ascii.frameSha256 ? ascii.frameSha256 !== baseline.frameSha256 : null;
    if (!report.mounted.ascii || report.frames.ascii !== true) {
      const why = ascii.rpcError
        ? `probe failed: ${ascii.rpcError}`
        : !report.mounted.ascii
          ? (ascii.responsive === true ? 'mounted!==true' : ascii.error || 'page did not respond')
          : ascii.frameError ? `screenshot failed: ${ascii.frameError}` : 'frame unchanged from baseline';
      add('ascii_responsive', 'failed', why);
      throw new PrereqError('checkMarkdownWindows: ASCII markdown baseline failed');
    }
    add('ascii_responsive', 'passed', `mounted===true; frame ${ascii.frameSha256.slice(0, 12)} != baseline ${baseline.frameSha256.slice(0, 12)}`);

    // --- close pane, same path gets U+4E2D, reopen ---------------------------
    let closedFrame = null;
    try {
      const closedId = closeBlock(binaryPath, env, asciiId, fixture, budget('pane_closed', 10_000));
      const gone = await waitFor(() => {
        const snapshot = lsSnapshot(binaryPath, env, 2000);
        return snapshot.status === 'ok' && !blocksOf(snapshot.json).some(block => block && block.file === fixture);
      }, budget('pane_closed', 5000), 150);
      if (!gone) throw new Error('checkMarkdownWindows: markdown pane is still listed after close');
      const closed = await probeStage('closed_frame');
      if (closed.rpcError || closed.responsive !== true) {
        const why = closed.rpcError || closed.error || 'page did not respond';
        add('pane_closed', 'failed', `block removed but page stopped responding: ${why}`);
        throw new Error(`checkMarkdownWindows: page stopped responding after closing the ASCII pane: ${why}`);
      }
      closedFrame = closed.frameSha256 || null;
      add('pane_closed', 'passed', `block ${closedId} removed from daemon state; closed frame ${closedFrame ? closedFrame.slice(0, 12) : 'unavailable'}`);
    } catch (error) {
      if (entries.get('pane_closed').status !== 'failed') add('pane_closed', 'failed', message(error));
      throw error;
    }

    fs.appendFileSync(fixture, '\n中\n');
    add('cjk_appended', 'passed', 'appended U+4E2D to the same markdown path');

    let cjkId;
    try {
      cjkId = await openMarkdown(binaryPath, env, fixture, budget('cjk_markdown_pane', 10_000));
      add('cjk_markdown_pane', 'passed', `block ${cjkId}`);
    } catch (error) {
      add('cjk_markdown_pane', 'failed', message(error));
      throw error;
    }
    await sleep(Math.max(0, Math.min(1000, remaining() - 5000)));

    const cjk = await probeStage('cjk_probe');
    report.mounted.cjk = cjk.responsive === true && cjk.mounted === true;
    report.frames.cjk = cjk.frameSha256 && closedFrame ? cjk.frameSha256 !== closedFrame : null;
    const cjkFrame = cjk.frameSha256 ? cjk.frameSha256.slice(0, 12) : (cjk.frameError ? `unavailable (${cjk.frameError})` : 'unavailable');
    const closedLabel = closedFrame ? closedFrame.slice(0, 12) : 'unavailable';
    if (cjk.rpcError) {
      add('cjk_responsive', 'failed', `probe failed: ${cjk.rpcError}`);
      throw new Error(`checkMarkdownWindows: no CJK probe result: ${cjk.rpcError}`);
    }
    if (cjk.responsive !== true) {
      add('cjk_responsive', 'failed', `evaluate did not respond within probe window; frame ${cjkFrame}`);
    } else if (report.mounted.cjk === true && report.frames.cjk === true) {
      add('cjk_responsive', 'passed', `mounted===true; frame ${cjkFrame} != closed ${closedLabel}`);
    } else if (report.frames.cjk === false) {
      add('cjk_responsive', 'failed', `responsive but frame unchanged from closed ${closedLabel}`);
    } else {
      add('cjk_responsive', 'failed', `inconclusive: mounted=${report.mounted.cjk}, frameChanged=${report.frames.cjk}, frame=${cjkFrame}`);
    }
    await sleep(Math.min(3000, budget('cjk_delay', 3000)));
    const delayed = await probeStage('cjk_delayed_probe');
    const delayedFrame = delayed.frameSha256 && cjk.frameSha256 ? delayed.frameSha256 !== cjk.frameSha256 : null;
    let interaction;
    const interactionMs = budget('cjk_interaction', 15000);
    try { interaction = await driver.rpc({ cmd: 'visible-interaction', timeoutMs: interactionMs - 1000 }, interactionMs); }
    catch (error) { interaction = { accepted: false, reason: message(error) }; }
    const visibleInteraction = interaction.accepted === true ? interaction.changed === true : null;
    report.cjkProgress = { delayedFrame, visibleInteraction, redraw: interaction.before && interaction.after ? { before: { canvas: interaction.before.canvas, submissions: interaction.before.submissions }, after: { canvas: interaction.after.canvas, submissions: interaction.after.submissions } } : null, interactionError: interaction.changed === true ? null : interaction.reason || null };
    if (visibleInteraction === true) {
      add('cjk_progress', 'passed', interaction.reason);
    } else {
      add('cjk_progress', 'not_run', interaction.reason || 'application redraw observation unavailable');
    }
    // --- evidence ------------------------------------------------------------
    try {
      const collected = await driver.rpc({ cmd: 'collect' }, budget('collect', 5000));
      report.console = Array.isArray(collected.messages) ? collected.messages : [];
      report.wasmErrors = Array.isArray(collected.errors) ? collected.errors : [];
    } catch (error) {
      const entry = entries.get('cjk_responsive');
      entry.details = redact(`${entry.details}; collect failed: ${message(error)}`).slice(0, 500);
    }

    try {
      const shot = await driver.rpc({ cmd: 'screenshot', path: screenshotArg, timeoutMs: Math.max(1000, Math.min(8000, remaining() - 5000)) }, budget('screenshot', 10_000));
      if (shot.ok) report.screenshot = out ? screenshotTarget : null;
    } catch (error) {
      const entry = entries.get('cjk_responsive');
      entry.details = redact(`${entry.details}; final screenshot failed: ${message(error)}`).slice(0, 500);
    }

    try {
      const finalDaemon = lsSnapshot(binaryPath, env, budget('daemon_state', 3000));
      report.daemon = { status: finalDaemon.status, panes: finalDaemon.panes };
    } catch {
      report.daemon = { status: 'not_run', panes: null };
    }

    const asciiValid = report.mounted.ascii === true && report.frames.ascii === true;
    if (asciiValid && cjk.responsive === false) {
      report.conclusion = 'reproduced';
      report.reason = 'CJK page state evaluation stopped responding after the successful ASCII baseline';
    } else if (asciiValid && report.mounted.cjk === true && report.frames.cjk === true && report.cjkProgress.visibleInteraction === true) {
      report.conclusion = 'not_reproduced';
      report.reason = 'CJK page remained responsive and processed viewport input with resized canvas and new GPU submissions';
    } else {
      report.conclusion = 'not_run';
      report.reason = 'inconclusive: no confirmed application redraw after CJK viewport input';
    }
  } catch (error) {
    report.conclusion = 'not_run';
    report.reason = message(error);
    if (driver) {
      try {
        const collected = await withTimeout(driver.rpc({ cmd: 'collect' }, 1000), 1500, 'collect timed out');
        report.console = Array.isArray(collected.messages) ? collected.messages : [];
        report.wasmErrors = Array.isArray(collected.errors) ? collected.errors : [];
      } catch {}
    }
    if (daemonProbe && report.daemon.status === 'not_run') {
      try {
        const snapshot = daemonProbe();
        report.daemon = { status: snapshot.status, panes: snapshot.panes };
      } catch {}
    }
  } finally {
    if (driver) {
      try { await driver.stop(); } catch (error) { cleanupErrors.push(`driver: ${message(error)}`); }
    }
    for (const child of children.slice().reverse()) {
      try { await stopChild(child); } catch (error) { cleanupErrors.push(`process: ${message(error)}`); }
    }
    for (const dir of tempDirs.slice().reverse()) {
      try { await fsp.rm(dir, { recursive: true, force: true }); } catch (error) { cleanupErrors.push(`remove ${dir}: ${message(error)}`); }
    }
    report.cleanup = { ok: cleanupErrors.length === 0, errors: cleanupErrors };
    report.sequence = SEQUENCE.map(name => entries.get(name));
    if (!report.reason) report.reason = 'prerequisite failed';
  }

  // 最后一道防线：任何字段都不带 token。
  const finalReport = JSON.parse(redact(JSON.stringify(report)).split(token || '\u0000').join('<REDACTED>'));
  if (out) fs.writeFileSync(out, JSON.stringify(finalReport, null, 2) + '\n', { flag: 'wx' });
  return finalReport;
}
