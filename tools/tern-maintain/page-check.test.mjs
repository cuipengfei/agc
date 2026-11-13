import {test, expect} from 'bun:test';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {checkPage} from './page-check.mjs';

const PAGE_URL = 'http://127.0.0.1:4321/index.html';
const wasm = Buffer.from('tern page-check acceptance fixture bytes');
const wasmSha = crypto.createHash('sha256').update(wasm).digest('hex');
const declaredSha = 'a'.repeat(64);

const READY = {
  ready: true, failed: false, mounted: false, tokenPrompt: true,
  candidateSha: wasmSha,
  fonts: [{style: 'Regular', bytes: 11}, {style: 'Bold', bytes: 22}],
  error: null,
};

// 生产代码里的页面回调必须能被 Playwright 单独序列化；这里按源码在新作用域执行，
// 任何对模块作用域的引用都会立刻抛错。
function runInPage(fn, env) {
  return new Function('window', 'navigator', `return (${fn.toString()})();`)(env.window, {userAgent: env.userAgent});
}

/**
 * 模拟页面全局：__ternVerification 按 reads 顺序返回状态，最后一个状态会保持；
 * onRead 在每次读取后收到新的读取次数，用于在收敛窗口后注入变化。
 */
function pageEnv({states = [null], userAgent = 'HeadlessChrome/140.0', family = 'Maple Mono NF CN', onRead = null} = {}) {
  const window = {ternMaple: {family}};
  let reads = 0;
  Object.defineProperty(window, '__ternVerification', {
    get: () => {
      const state = states[Math.min(reads++, states.length - 1)];
      if (onRead) onRead(reads);
      return state;
    },
  });
  return {window, userAgent};
}

function fakePage(env, {response = {status: () => 200}, body = wasm, gotoError = null, duringGoto = null, requestError = null} = {}) {
  const page = {
    initScripts: [], listeners: [], evaluates: 0, requests: [],
    addInitScript(fn) { page.initScripts.push(fn); },
    on(event, handler) { page.listeners.push({event, handler}); },
    async goto(url, options) {
      page.navigated = {url, options};
      for (const fn of page.initScripts) runInPage(fn, env);
      if (duringGoto) duringGoto(page, env);
      if (gotoError) throw gotoError;
      return response;
    },
    async evaluate(fn) {
      page.evaluates++;
      return runInPage(fn, env);
    },
    request: {
      async get(url, options) {
        page.requests.push({url, options});
        if (requestError) throw requestError;
        return {body: async () => body};
      },
    },
  };
  return page;
}

function fakePlaywright(page) {
  const calls = {launches: [], newPages: 0, closes: 0};
  return {
    calls,
    module: {
      chromium: {
        async launch(options) {
          calls.launches.push(options);
          return {
            async newPage() { calls.newPages++; return page; },
            async close() { calls.closes++; },
          };
        },
      },
    },
  };
}

async function runCheck({url = PAGE_URL, env = pageEnv({states: [READY]}), timeoutMs = 60, out, ...pageOptions} = {}) {
  const page = fakePage(env, pageOptions);
  const {calls, module} = fakePlaywright(page);
  const report = await checkPage({url, playwrightModule: module, timeoutMs, out});
  return {report, page, calls};
}

function emitPageError(page, message) {
  for (const listener of page.listeners) if (listener.event === 'pageerror') listener.handler({message});
}

const byName = report => Object.fromEntries(report.checks.map(check => [check.name, check]));

test('ready page passes every measurable check in the original order', async () => {
  const {report, page, calls} = await runCheck();

  expect(report.schemaVersion).toBe(1);
  expect(report.candidateSha256).toBe(wasmSha);
  expect(report.checks.map(check => check.name)).toEqual([
    'page_served', 'headless_forced', 'page_ready', 'fonts_injected',
    'candidate_hash', 'websocket_absent', 'wire_mount', 'gpu_interaction_full',
  ]);

  const checks = byName(report);
  expect(checks.page_served).toEqual({name: 'page_served', status: 'passed', details: `GET ${PAGE_URL} -> 200`});
  expect(checks.headless_forced).toEqual({name: 'headless_forced', status: 'passed', details: 'HeadlessChrome/140.0'});
  expect(checks.page_ready.status).toBe('passed');
  expect(checks.fonts_injected).toEqual({name: 'fonts_injected', status: 'passed', details: 'Maple Mono NF CN: Regular=11B, Bold=22B'});
  expect(checks.candidate_hash.details).toBe(`served /pkg/client.wasm SHA-256 ${wasmSha} matches page-reported candidate`);
  expect(checks.websocket_absent.status).toBe('passed');
  expect(checks.wire_mount.status).toBe('not_run');
  expect(checks.gpu_interaction_full.status).toBe('not_run');

  // 强制无头启动、真实导航、真实字节请求，且浏览器一定被关闭。
  expect(calls.launches).toEqual([{executablePath: undefined, headless: true, args: ['--no-sandbox']}]);
  expect(page.navigated.url).toBe(PAGE_URL);
  expect(page.navigated.options.waitUntil).toBe('domcontentloaded');
  expect(page.requests).toEqual([{url: 'http://127.0.0.1:4321/pkg/client.wasm', options: {timeout: 10_000}}]);
  expect(calls.closes).toBe(1);
});

test('non-loopback URL fails the first gate before any browser starts', async () => {
  const page = fakePage(pageEnv());
  const {calls, module} = fakePlaywright(page);
  const report = await checkPage({url: 'http://example.com/', playwrightModule: module});

  const checks = byName(report);
  expect(checks.page_served.status).toBe('failed');
  expect(checks.page_served.details).toBe('checkPage: url must be a loopback URL');
  expect(checks.page_ready.status).toBe('not_run');
  expect(report.candidateSha256).toBeNull();
  expect(calls.launches).toHaveLength(0);
  expect(calls.closes).toBe(0);
});

test('credentials, query, fragment and non-http schemes are rejected', async () => {
  const cases = [
    ['http://user:pass@127.0.0.1:4321/', 'checkPage: url must not carry credentials'],
    ['http://127.0.0.1:4321/?token=abc', 'checkPage: url must not carry query or fragment'],
    ['http://127.0.0.1:4321/#frag', 'checkPage: url must not carry query or fragment'],
    ['ftp://127.0.0.1/', 'checkPage: url must be http or https'],
  ];
  for (const [url, message] of cases) {
    const {report, calls} = await runCheck({url});
    expect(byName(report).page_served.details).toBe(message);
    expect(calls.launches).toHaveLength(0);
  }
});

test('missing url or playwrightModule fails before launch', async () => {
  const missingUrl = await checkPage({});
  expect(byName(missingUrl).page_served.details).toBe('checkPage: url is required');

  const missingPlaywright = await checkPage({url: PAGE_URL});
  expect(byName(missingPlaywright).page_served.details).toBe('checkPage: playwrightModule is required');
});

test('a headed user agent fails headless_forced but page checks still run', async () => {
  const {report} = await runCheck({env: pageEnv({states: [READY], userAgent: 'Mozilla/5.0 Chrome/140.0'})});
  const checks = byName(report);
  expect(checks.headless_forced.status).toBe('failed');
  expect(checks.headless_forced.details).toBe('Mozilla/5.0 Chrome/140.0');
  expect(checks.page_ready.status).toBe('passed');
  expect(checks.candidate_hash.status).toBe('passed');
});

test('non-200 navigation fails page_served and the page never becomes ready', async () => {
  const {report} = await runCheck({env: pageEnv({states: [null]}), response: {status: () => 500}, timeoutMs: 5});
  const checks = byName(report);
  expect(checks.page_served).toEqual({name: 'page_served', status: 'failed', details: `GET ${PAGE_URL} -> 500`});
  expect(checks.page_ready.status).toBe('failed');
  expect(checks.page_ready.details).toBe('state missing, pageerrors=0; timed out waiting for __ternVerification');
  expect(checks.fonts_injected.details).toBe('page never became ready');
  expect(checks.candidate_hash.details).toBe('page never became ready');
  expect(checks.websocket_absent.status).toBe('passed');
  expect(report.candidateSha256).toBeNull();
});

test('navigation without a response object reports no response', async () => {
  const {report} = await runCheck({env: pageEnv({states: [null]}), response: null, timeoutMs: 5});
  expect(byName(report).page_served.details).toBe(`GET ${PAGE_URL} -> no response`);
});

test('a failed init state fails page_ready, fonts and hash', async () => {
  const failed = {ready: false, failed: true, mounted: false, tokenPrompt: false, candidateSha: null, fonts: null, error: 'mount exploded'};
  const {report} = await runCheck({env: pageEnv({states: [failed]})});
  const checks = byName(report);
  expect(checks.page_served.status).toBe('passed');
  expect(checks.page_ready.details).toBe('ready=false, failed=true, tokenPrompt=false, mounted=false, pageerrors=0; mount exploded');
  expect(checks.fonts_injected.details).toBe('init failed: mount exploded');
  expect(checks.candidate_hash.details).toBe('page never became ready');
});

test('a pageerror during loading fails page_ready even when state says ready', async () => {
  const {report} = await runCheck({duringGoto: page => emitPageError(page, 'late boom')});
  const checks = byName(report);
  expect(checks.page_ready.status).toBe('failed');
  expect(checks.page_ready.details).toBe('ready=true, failed=false, tokenPrompt=true, mounted=false, pageerrors=1; late boom');
  expect(checks.fonts_injected.details).toBe('page never became ready');
  expect(checks.candidate_hash.details).toBe('page never became ready');
});

// 第 1 次读取让等待提前返回 ready；第 2 次是固定收敛窗口之后的 fresh 读取。
// 窗口内到达的 pageerror 必须进入最终判定。
test('a pageerror inside the settle window fails page_ready after a ready read', async () => {
  let page = null;
  const env = pageEnv({
    states: [READY],
    onRead: reads => {
      if (reads === 2) emitPageError(page, 'settle-window boom');
    },
  });
  const {report} = await runCheck({env, duringGoto: p => { page = p; }});
  const checks = byName(report);
  expect(checks.page_ready.status).toBe('failed');
  expect(checks.page_ready.details).toContain('settle-window boom');
  expect(checks.fonts_injected.status).toBe('failed');
  expect(checks.candidate_hash.status).toBe('failed');
});

test('a fresh failed state after a ready read fails page_ready, fonts and hash', async () => {
  const lateFailure = {
    ready: true, failed: true, mounted: false, tokenPrompt: true,
    candidateSha: null, fonts: null, error: 'late init failure',
  };
  const {report} = await runCheck({env: pageEnv({states: [READY, lateFailure]})});
  const checks = byName(report);
  expect(checks.page_ready.status).toBe('failed');
  expect(checks.page_ready.details).toContain('late init failure');
  expect(checks.fonts_injected.status).toBe('failed');
  expect(checks.candidate_hash.status).toBe('failed');
  expect(report.candidateSha256).toBeNull();
});

test('font family and font count mismatches fail fonts_injected', async () => {
  const wrongFamily = await runCheck({env: pageEnv({states: [READY], family: 'Other Font'})});
  expect(byName(wrongFamily.report).fonts_injected.details).toBe('family=Other Font, styles=Bold,Regular');
  expect(byName(wrongFamily.report).candidate_hash.status).toBe('passed');

  const oneFont = await runCheck({env: pageEnv({states: [{...READY, fonts: [{style: 'Regular', bytes: 11}]}]})});
  expect(byName(oneFont.report).fonts_injected.details).toBe('family=Maple Mono NF CN, styles=Regular');
});

test('two fonts with the same style fail fonts_injected', async () => {
  const bothRegular = await runCheck({
    env: pageEnv({states: [{...READY, fonts: [{style: 'Regular', bytes: 11}, {style: 'Regular', bytes: 22}]}]}),
  });
  expect(byName(bothRegular.report).fonts_injected).toEqual({
    name: 'fonts_injected', status: 'failed', details: 'family=Maple Mono NF CN, styles=Regular,Regular',
  });
});

test('served bytes hash mismatch fails candidate_hash but keeps the reported SHA', async () => {
  const {report, page} = await runCheck({env: pageEnv({states: [{...READY, candidateSha: declaredSha}]})});
  expect(byName(report).candidate_hash.details).toBe(`served ${wasmSha} != page-reported ${declaredSha}`);
  expect(report.candidateSha256).toBe(declaredSha);
  expect(page.requests).toHaveLength(1);
});

test('missing or malformed candidate SHA fails candidate_hash without a value', async () => {
  const missing = await runCheck({env: pageEnv({states: [{...READY, candidateSha: null}]})});
  expect(byName(missing.report).candidate_hash.details).toBe('page reported no candidate SHA-256');
  expect(missing.report.candidateSha256).toBeNull();

  const malformed = await runCheck({env: pageEnv({states: [{...READY, candidateSha: 'not-a-hash'}]})});
  expect(byName(malformed.report).candidate_hash.details).toBe('page reported no candidate SHA-256');
  expect(malformed.report.candidateSha256).toBeNull();
});

test('WebSocket construction is counted and blocked by the init script', async () => {
  const {report} = await runCheck({
    duringGoto: (page, env) => {
      expect(() => new env.window.WebSocket()).toThrow('WebSocket blocked during page verification');
    },
  });
  expect(byName(report).websocket_absent).toEqual({name: 'websocket_absent', status: 'failed', details: '1 WebSocket constructions'});
});

test('navigation failure is redacted and the browser is still closed', async () => {
  const {report, calls} = await runCheck({gotoError: new Error('navigate failed token=secret-value')});
  const checks = byName(report);
  expect(checks.page_served.status).toBe('failed');
  expect(checks.page_served.details).toBe('navigate failed token=<REDACTED>');
  expect(JSON.stringify(report)).not.toContain('secret-value');
  expect(checks.page_ready.status).toBe('not_run');
  expect(calls.newPages).toBe(1);
  expect(calls.closes).toBe(1);
});

test('a late failure after the gates ran is attributed to page_ready and still closes the browser', async () => {
  const {report, calls} = await runCheck({requestError: new Error('service died')});
  const checks = byName(report);
  expect(checks.page_served.status).toBe('passed');
  expect(checks.page_ready).toEqual({name: 'page_ready', status: 'failed', details: 'service died'});
  expect(checks.candidate_hash.status).toBe('not_run');
  expect(calls.closes).toBe(1);
});

test('report file is created exclusively and matches the returned report', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tern-page-check-'));
  const out = path.join(dir, 'report.json');
  try {
    const first = await runCheck({out});
    expect(fs.readFileSync(out, 'utf8')).toBe(JSON.stringify(first.report, null, 2) + '\n');
    await expect(runCheck({out})).rejects.toThrow();
    expect(fs.readFileSync(out, 'utf8')).toBe(JSON.stringify(first.report, null, 2) + '\n');
  } finally {
    fs.rmSync(dir, {recursive: true, force: true});
  }
});

test('playwrightModule may be a module path', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tern-page-check-module-'));
  const file = path.join(dir, 'fake-playwright.mjs');
  fs.writeFileSync(file, `export default { chromium: { launch: async () => ({
    newPage: async () => ({
      addInitScript: async () => {}, on: () => {},
      goto: async () => ({ status: () => 200 }),
      evaluate: async () => null,
      request: { get: async () => ({ body: async () => new Uint8Array() }) },
    }),
    close: async () => {},
  }) } };\n`);
  try {
    const report = await checkPage({url: PAGE_URL, playwrightModule: file, timeoutMs: 5});
    const checks = byName(report);
    expect(checks.page_served.status).toBe('passed');
    expect(checks.page_ready.status).toBe('failed');
  } finally {
    fs.rmSync(dir, {recursive: true, force: true});
  }
});
