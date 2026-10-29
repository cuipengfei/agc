// checkMarkdownWindows 的确定性验收：真实临时进程（fake tern + 临时 worker）覆盖
// 前置失败=not_run、cleanup 失败不覆盖结论、整体超时仍清理自己启动的进程。
// 真实 Windows Chrome 复现由主代理在 WSL 主机上另行执行；这里不连接正式服务。
import { afterAll, expect, test } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { checkMarkdownWindows } from './windows-browser.mjs';

const isWsl = process.platform === 'linux' && (() => {
  try {
    return /microsoft/i.test(fs.readFileSync('/proc/sys/kernel/osrelease', 'utf8'));
  } catch {
    return false;
  }
})();

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tern-win-browser-tests-'));
const fakeTern = path.join(root, 'fake-tern.mjs');
const fakePlaywright = path.join(root, 'playwright');
const assets = path.join(root, 'assets');

const FAKE_TERN = `#!/usr/bin/env node
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';

const [command, ...args] = process.argv.slice(2);
const socket = process.env.TERN_DAEMON_SOCKET;
const config = process.env.TERN_CONFIG_DIR;
const stateFile = path.join(config, 'fake-state.json');
const readState = () => { try { return JSON.parse(fs.readFileSync(stateFile, 'utf8')); } catch { return { sessions: [], detached: [] }; } };
const writeState = state => fs.writeFileSync(stateFile, JSON.stringify(state));
if (process.env.FAKE_PIDS_FILE) fs.appendFileSync(process.env.FAKE_PIDS_FILE, JSON.stringify({ pid: process.pid, role: command, config: config }) + '\\n');

function onTerminate(close, block) {
  process.on('SIGTERM', () => {
    if (block && process.env.FAKE_BLOCK_CLEANUP === '1') {
      const blocked = path.join(config, 'blocked');
      fs.mkdirSync(blocked);
      fs.writeFileSync(path.join(blocked, 'keep'), 'x');
      fs.chmodSync(blocked, 0o500);
    }
    close();
    setTimeout(() => process.exit(0), 100);
  });
}

if (command === 'daemon') {
  const server = net.createServer(connection => connection.end());
  server.listen(socket);
  onTerminate(() => server.close(), true);
} else if (command === 'ls') {
  if (process.env.FAKE_DEAD_DAEMON === '1') process.exit(2);
  process.stdout.write(JSON.stringify(readState()));
} else if (command === 'open') {
  const file = args[args.length - 1];
  const state = readState();
  if (!state.sessions.length) state.sessions.push({ id: 1, tabs: [{ id: 2, blocks: [] }] });
  const blocks = state.sessions[0].tabs[0].blocks;
  const id = blocks.reduce((max, block) => Math.max(max, block.id), 0) + 1;
  blocks.push({ id: id, file: file });
  writeState(state);
  const reportedId = process.env.FAKE_WRONG_OPEN_ID === '1' ? id + 1 : id;
  process.stdout.write(JSON.stringify({ blocks: [reportedId], discarded: false }));
} else if (command === 'close') {
  const id = Number(args[0]);
  const state = readState();
  for (const session of state.sessions) for (const tab of session.tabs) tab.blocks = tab.blocks.filter(block => block.id !== id);
  writeState(state);
  process.stdout.write(JSON.stringify({ closed: id }));
} else if (command === 'web') {
  const index = args.indexOf('--listen');
  const port = Number(args[index + 1].split(':').pop());
  const assetsDir = args[args.indexOf('--assets') + 1];
  if (process.env.FAKE_LAYOUT_FILE) {
    fs.writeFileSync(process.env.FAKE_LAYOUT_FILE, JSON.stringify({
      assets: assetsDir,
      index: fs.existsSync(path.join(assetsDir, 'index.html')),
      client: fs.existsSync(path.join(assetsDir, 'pkg', 'stencil_tern_web.js')),
      wasm: fs.existsSync(path.join(assetsDir, 'pkg', 'stencil_tern_web_bg.wasm')),
    }));
  }
  const server = http.createServer((request, response) => {
    if (process.env.FAKE_WEB_STATUS) {
      response.writeHead(Number(process.env.FAKE_WEB_STATUS), { 'content-type': 'text/plain' });
      response.end('fixture status');
      return;
    }
    let body;
    try { body = fs.readFileSync(path.join(assetsDir, 'index.html')); } catch { response.writeHead(404); response.end(); return; }
    response.writeHead(200, { 'content-type': 'text/html' });
    response.end(body);
  });
  server.listen(port, '127.0.0.1');
  onTerminate(() => server.close(), false);
} else {
  process.exit(1);
}
`;

const FAKE_PLAYWRIGHT = `
class FakePage {
  constructor() { this.probes = 0; this.shots = 0; this.routes = []; }
  async addInitScript() {}
  async setViewportSize(size) {
    if (process.env.FAKE_INPUT_ERROR === '1') throw new Error('viewport driver failed');
    this.viewport = size;
    this.interacted = process.env.FAKE_IGNORE_CJK_INTERACTION !== '1' && process.env.FAKE_STALE_CJK !== '1';
  }
  on() {}
  async route(predicate, handler) { this.routes.push({ predicate, handler }); }
  async goto(url) {
    const response = await fetch(url);
    if (process.env.FAKE_OFFICIAL === '1' && this.routes.length === 0) return { status: () => 0 };
    return { status: () => response.status };
  }
  async evaluate(fn, arg) {
    const source = String(fn);
    if (source.includes('navigator.gpu')) return { available: process.env.FAKE_NO_WEBGPU !== '1', reason: 'fixture' };
    if (source.includes('navigator.userAgent')) return 'FakeChrome/1.0';
    if (source.includes('__ternVerification')) {
      const official = process.env.FAKE_OFFICIAL === '1';
      const state = official
        ? { structured: false, ready: true, mounted: true, failed: false, error: null, tokenPrompt: false }
        : { structured: true, ready: true, mounted: process.env.FAKE_MOUNT !== '0', failed: false, error: null, tokenPrompt: false };
      if (arg === 'tern-visible-interaction') {
        return { marker: arg, state, accepted: true, canvas: { width: 1280, height: 720 }, viewport: { width: 1280, height: 720, scale: 1 }, submissions: 1 };
      }
      if (arg === 'tern-visible-interaction-after') {
        return { marker: arg, state, accepted: true, canvas: this.interacted ? this.viewport : { width: 1280, height: 720 }, viewport: { ...this.viewport, scale: 1 }, submissions: this.interacted ? 2 : 1 };
      }
      if (arg === 'tern-markdown-probe') {
        this.probes += 1;
        if (process.env.FAKE_FREEZE_CJK === '1' && this.probes >= 4) return new Promise(() => {});
        return { marker: arg, state };
      }
      return state;
    }
    return null;
  }
  async screenshot(options = {}) {
    this.shots += 1;
    if (process.env.FAKE_FREEZE_CJK === '1' && this.shots >= 4) return new Promise(() => {});
    let label = 'frame-' + this.shots;
    if (process.env.FAKE_STALE_AFTER_CJK === '1' && this.shots >= 5) label = 'frame-4';
    if (process.env.FAKE_IGNORE_CJK_INTERACTION === '1' && this.shots >= 6) label = 'frame-5';
    if (process.env.FAKE_STALE_CJK === '1' && this.shots >= 4) label = 'frame-3';
    const bytes = Buffer.from(label);
    if (options.path) { const fs = await import('node:fs'); fs.writeFileSync(options.path, bytes); }
    return bytes;
  }
}
export const chromium = { launch: async () => ({ newPage: async () => new FakePage(), close: async () => {} }) };
`;

fs.mkdirSync(assets, { mode: 0o700 });
fs.writeFileSync(path.join(assets, 'index.html'), '<!doctype html><title>fixture</title>');
fs.writeFileSync(fakeTern, FAKE_TERN, { mode: 0o755 });
fs.mkdirSync(fakePlaywright, { mode: 0o700 });
fs.writeFileSync(path.join(fakePlaywright, 'package.json'), JSON.stringify({ name: 'playwright', version: '0.0.0', type: 'module', exports: './index.js' }));
fs.writeFileSync(path.join(fakePlaywright, 'index.js'), FAKE_PLAYWRIGHT);

function forceRemove(directory) {
  if (!fs.existsSync(directory)) return;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      try { fs.chmodSync(file, 0o700); } catch {}
      forceRemove(file);
    }
  }
  try { fs.rmSync(directory, { recursive: true, force: true }); } catch {}
}

afterAll(() => {
  forceRemove(root);
});

function readRecords(pids) {
  if (!fs.existsSync(pids)) return [];
  return fs.readFileSync(pids, 'utf8').trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
}

async function run({ env = {}, timeoutMs = 45_000, assetsDir = assets } = {}) {
  const directory = fs.mkdtempSync(path.join(root, 'case-'));
  const pids = path.join(directory, 'pids.log');
  const out = path.join(directory, 'report.json');
  const saved = {};
  for (const [key, value] of Object.entries({ ...env, FAKE_PIDS_FILE: pids })) {
    saved[key] = process.env[key];
    process.env[key] = value;
  }
  try {
    const report = await checkMarkdownWindows({
      binary: fakeTern,
      assets: assetsDir,
      node: process.execPath,
      playwrightModule: fakePlaywright,
      chromium: process.execPath,
      out,
      timeoutMs,
    });
    return { report, out, pids, directory };
  } finally {
    for (const key of Object.keys(saved)) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  }
}

function expectSpawnedProcessesGone(records) {
  for (const record of records.filter(value => value.role === 'daemon' || value.role === 'web')) {
    expect(() => process.kill(record.pid, 0)).toThrow();
  }
}

test('missing Windows Node fails as not_run before starting anything', async () => {
  const report = await checkMarkdownWindows({
    binary: fakeTern,
    assets,
    node: path.join(root, 'missing-node.exe'),
    playwrightModule: fakePlaywright,
    chromium: process.execPath,
    timeoutMs: 5000,
  });
  expect(report.conclusion).toBe('not_run');
  expect(report.reason.length).toBeGreaterThan(0);
  expect(report.mounted).toEqual({ ascii: null, cjk: null });
  expect(report.frames).toEqual({ ascii: null, cjk: null });
  expect(report.cleanup.ok).toBe(true);
  if (isWsl) expect(report.sequence.find(entry => entry.name === 'windows_node').status).toBe('failed');
}, 20_000);

const adapterTest = isWsl ? test : test.skip;

adapterTest('ASCII succeeds, CJK page stops responding -> reproduced', async () => {
  const { report, out, pids } = await run({ env: { FAKE_FREEZE_CJK: '1' } });
  expect(report.conclusion).toBe('reproduced');
  expect(report.mounted).toEqual({ ascii: true, cjk: false });
  expect(report.frames).toEqual({ ascii: true, cjk: null });
  expect(report.reason.length).toBeGreaterThan(0);
  expect(report.sequence.find(entry => entry.name === 'ascii_responsive').status).toBe('passed');
  expect(report.sequence.find(entry => entry.name === 'cjk_responsive').status).toBe('failed');
  expect(report.sequence.find(entry => entry.name === 'cjk_responsive').details).toContain('did not respond');
  expect(report.cleanup.ok).toBe(true);
  expect(fs.existsSync(out)).toBe(true);
  expect(report.screenshot).toBe(null);
  const records = readRecords(pids);
  expectSpawnedProcessesGone(records);
  expect(records.every(record => !fs.existsSync(record.config))).toBe(true);
}, 90_000);

adapterTest('ASCII and CJK pages both respond -> not_reproduced', async () => {
  const { report, pids } = await run();
  expect(report.conclusion).toBe('not_reproduced');
  expect(report.mounted).toEqual({ ascii: true, cjk: true });
  expect(report.frames).toEqual({ ascii: true, cjk: true });
  expect(report.cleanup.ok).toBe(true);
  const records = readRecords(pids);
  expectSpawnedProcessesGone(records);
  expect(records.every(record => !fs.existsSync(record.config))).toBe(true);
}, 60_000);

adapterTest('cleanup failure is recorded without changing the conclusion', async () => {
  const { report, pids } = await run({ env: { FAKE_FREEZE_CJK: '1', FAKE_BLOCK_CLEANUP: '1' } });
  expect(report.conclusion).toBe('reproduced');
  expect(report.frames).toEqual({ ascii: true, cjk: null });
  expect(report.cleanup.ok).toBe(false);
  expect(report.cleanup.errors.length).toBeGreaterThan(0);
  const records = readRecords(pids);
  expectSpawnedProcessesGone(records);
  const config = records[0].config;
  expect(fs.existsSync(config)).toBe(true);
  forceRemove(path.dirname(config));
}, 90_000);

adapterTest('overall timeout still stops spawned daemon and removes its temporary directories', async () => {
  const { report, pids } = await run({ env: { FAKE_DEAD_DAEMON: '1' }, timeoutMs: 2500 });
  expect(report.conclusion).toBe('not_run');
  expect(report.frames).toEqual({ ascii: null, cjk: null });
  expect(report.reason.length).toBeGreaterThan(0);
  expect(report.cleanup.ok).toBe(true);
  const records = readRecords(pids);
  expect(records.length).toBeGreaterThan(0);
  expectSpawnedProcessesGone(records);
  expect(records.every(record => !fs.existsSync(record.config))).toBe(true);
}, 30_000);

adapterTest('responsive CJK with no observed application redraw is inconclusive', async () => {
  const { report, pids } = await run({ env: { FAKE_STALE_CJK: '1' } });
  expect(report.conclusion).toBe('not_run');
  expect(report.mounted).toEqual({ ascii: true, cjk: true });
  expect(report.frames).toEqual({ ascii: true, cjk: false });
  const cjk = report.sequence.find(entry => entry.name === 'cjk_responsive');
  expect(cjk.status).toBe('failed');
  expect(cjk.details).toContain('unchanged');
  expect(report.cleanup.ok).toBe(true);
  const records = readRecords(pids);
  expectSpawnedProcessesGone(records);
  expect(records.every(record => !fs.existsSync(record.config))).toBe(true);
}, 60_000);

adapterTest('static CJK frame with responsive resize remains healthy', async () => {
  const { report, pids } = await run({ env: { FAKE_STALE_AFTER_CJK: '1' } });
  expect(report.conclusion).toBe('not_reproduced');
  expect(report.frames).toEqual({ ascii: true, cjk: true });
  expect(report.cjkProgress.delayedFrame).toBe(false);
  expect(report.cjkProgress.visibleInteraction).toBe(true);
  expect(report.sequence.find(entry => entry.name === 'cjk_progress').status).toBe('passed');
  expectSpawnedProcessesGone(readRecords(pids));
}, 60_000);

adapterTest('unobserved CJK resize is inconclusive, not a freeze', async () => {
  const { report, pids } = await run({ env: { FAKE_IGNORE_CJK_INTERACTION: '1' } });
  expect(report.conclusion).toBe('not_run');
  expect(report.cjkProgress.delayedFrame).toBe(true);
  expect(report.cjkProgress.visibleInteraction).toBe(false);
  expect(report.sequence.find(entry => entry.name === 'cjk_progress').status).toBe('not_run');
  expectSpawnedProcessesGone(readRecords(pids));
}, 60_000);

adapterTest('driver input failure is inconclusive, not a freeze', async () => {
  const { report, pids } = await run({ env: { FAKE_INPUT_ERROR: '1' } });
  expect(report.conclusion).toBe('not_run');
  expect(report.cjkProgress.visibleInteraction).toBe(null);
  expect(report.cleanup.ok).toBe(true);
  expectSpawnedProcessesGone(readRecords(pids));
}, 60_000);

adapterTest('open id must currently identify the requested fixture path', async () => {
  const { report, pids } = await run({ env: { FAKE_WRONG_OPEN_ID: '1' }, timeoutMs: 2500 });
  expect(report.conclusion).toBe('not_run');
  expect(report.sequence.find(entry => entry.name === 'ascii_markdown_pane').status).toBe('failed');
  expect(report.frames).toEqual({ ascii: null, cjk: null });
  expect(report.cleanup.ok).toBe(true);
  expectSpawnedProcessesGone(readRecords(pids));
}, 20_000);

adapterTest('prepare original layout is assembled privately and fetched over real HTTP', async () => {
  const layoutDir = fs.mkdtempSync(path.join(root, 'original-'));
  fs.mkdirSync(path.join(layoutDir, 'pkg'));
  fs.writeFileSync(path.join(layoutDir, 'official.html'), '<!doctype html><title>official</title>');
  fs.writeFileSync(path.join(layoutDir, 'pkg', 'client.js'), 'export default {};');
  fs.writeFileSync(path.join(layoutDir, 'pkg', 'original.wasm'), Buffer.from([0, 97, 115, 109]));
  const layoutFile = path.join(layoutDir, 'layout.json');
  const { report, pids } = await run({ env: { FAKE_OFFICIAL: '1', FAKE_LAYOUT_FILE: layoutFile }, assetsDir: layoutDir });
  expect(report.conclusion).toBe('not_reproduced');
  expect(report.sequence.find(entry => entry.name === 'page_loaded').status).toBe('passed');
  expect(fs.existsSync(path.join(layoutDir, 'index.html'))).toBe(false);
  const layout = JSON.parse(fs.readFileSync(layoutFile, 'utf8'));
  expect(layout.assets).not.toBe(layoutDir);
  expect(layout).toMatchObject({ index: true, client: true, wasm: true });
  expect(fs.existsSync(layout.assets)).toBe(false);
  const records = readRecords(pids);
  expectSpawnedProcessesGone(records);
}, 60_000);

adapterTest('non-200 web page fails fast as not_run', async () => {
  const { report } = await run({ env: { FAKE_WEB_STATUS: '500' }, timeoutMs: 8000 });
  expect(report.conclusion).toBe('not_run');
  expect(report.sequence.find(entry => entry.name === 'isolated_web').status).toBe('failed');
  expect(report.reason).toContain('HTTP 500');
  expect(report.cleanup.ok).toBe(true);
}, 20_000);
