// browserCheck 的公开入口验收：用 fixtures/browser-playwright.mjs 隔离浏览器/网络，
// 生产侧的检查顺序、mount 判定、token 脱敏与浏览器清理全部真实执行。
// 不依赖真实 Chromium、GPU 或 Windows。
import { test, expect, afterAll } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { browserCheck } from './runtime.mjs';
import { createPlaywright } from './fixtures/browser-playwright.mjs';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tern-browser-check-tests-'));
afterAll(() => fs.rmSync(root, { recursive: true, force: true }));

const ORDER = ['headless_forced', 'page_served', 'webgpu_available', 'client_init', 'wire_mount', 'token_redaction', 'gpu_interaction_full'];
const URL = 'http://127.0.0.1:4599/';
let tokenCounter = 0;

function writeToken(content) {
  const file = path.join(root, `token-${++tokenCounter}`);
  fs.writeFileSync(file, content);
  return file;
}

const statusOf = (result, name) => result.checks.find(check => check.name === name);

/** 记录 route 回调被如何处理的替身请求。 */
function routeRequest(url, navigation) {
  const seen = { fulfilled: null, continued: false };
  return {
    seen,
    request: () => ({ isNavigationRequest: () => navigation, url: () => url }),
    fulfill: options => { seen.fulfilled = options; },
    continue: () => { seen.continued = true; },
  };
}

test('离线模式按序返回检查，token 只进一次性 URL，同源导航被空白文档替换', async () => {
  const token = 'secret-token-value';
  const fake = createPlaywright();
  const result = await browserCheck({
    url: `${URL}?token=stale&keep=1`,
    playwrightModule: fake.module,
    chromiumExecutable: '/opt/chromium',
    tokenFile: writeToken(token),
  });

  expect(result.schemaVersion).toBe(1);
  expect(result.checks.map(check => check.name)).toEqual(ORDER);
  expect(result.candidateSha256).toBe(fake.init.sha256);
  expect(result.candidateSha256).toMatch(/^[0-9a-f]{64}$/);

  expect(fake.calls.launches).toHaveLength(1);
  expect(fake.calls.launches[0]).toMatchObject({ headless: true, executablePath: '/opt/chromium', args: ['--no-sandbox'] });
  expect(fake.calls.gotos[0].url).toBe(`${URL}?keep=1&token=${token}`);
  expect(fake.calls.gotos[0].url).not.toContain('stale');
  expect(fake.calls.routes).toHaveLength(1);
  expect(fake.calls.routes[0].pattern).toBe('**/*');
  expect(fake.calls.closes).toBe(1);

  expect(statusOf(result, 'headless_forced')).toMatchObject({ status: 'passed', details: fake.settings.userAgent });
  expect(statusOf(result, 'page_served')).toMatchObject({ status: 'passed', details: 'GET /maple.js -> 200' });
  expect(statusOf(result, 'webgpu_available')).toMatchObject({ status: 'not_run', details: 'navigator.gpu absent; GPU behavior is not checked' });
  expect(statusOf(result, 'client_init').status).toBe('passed');
  expect(statusOf(result, 'wire_mount').status).toBe('not_run');
  expect(statusOf(result, 'token_redaction')).toMatchObject({ status: 'passed', details: 'token value absent from check details' });
  expect(statusOf(result, 'gpu_interaction_full').status).toBe('not_run');
  expect(JSON.stringify(result)).not.toContain(token);

  const navigation = routeRequest(`${URL}anything`, true);
  await fake.calls.routes[0].handler(navigation);
  expect(navigation.seen.fulfilled.body).toContain('Tern headless verification');
  expect(navigation.seen.continued).toBe(false);

  const asset = routeRequest(`${URL}pkg/client.js`, false);
  await fake.calls.routes[0].handler(asset);
  expect(asset.seen.continued).toBe(true);
  expect(asset.seen.fulfilled).toBeNull();
});

test('mount 模式不拦截导航，结构化成功后按帧计数判定 GPU 交互', async () => {
  const fake = createPlaywright({ window: { __ternVerification: { mounted: true } }, frames: 3 });
  const result = await browserCheck({ url: URL, playwrightModule: fake.module, mount: true });

  expect(fake.calls.routes).toHaveLength(0);
  expect(fake.calls.gotos[0].url).toBe(URL);
  expect(fake.calls.closes).toBe(1);
  expect(statusOf(result, 'wire_mount')).toMatchObject({ status: 'passed' });
  expect(statusOf(result, 'wire_mount').details.length).toBeGreaterThan(0);
  expect(statusOf(result, 'gpu_interaction_full')).toMatchObject({ status: 'passed', details: 'WebSocket frames received: 3' });
  expect(statusOf(result, 'token_redaction')).toMatchObject({ status: 'passed', details: 'no token provided; nothing to redact' });
});

test('mount 模式回退到 window.tern 时仍算挂载成功，零帧只记 not_run', async () => {
  const fake = createPlaywright({ window: { tern: {} }, frames: 0 });
  const result = await browserCheck({ url: URL, playwrightModule: fake.module, mount: true });

  expect(statusOf(result, 'wire_mount')).toMatchObject({ status: 'passed' });
  expect(statusOf(result, 'wire_mount').details.length).toBeGreaterThan(0);
  expect(statusOf(result, 'gpu_interaction_full')).toMatchObject({ status: 'not_run', details: 'WebSocket frames received: 0' });
});

test('mount 结构化失败与超时都记 failed，且不伪造 GPU 结论', async () => {
  const failedPage = createPlaywright({ window: { __ternVerification: { failed: true, error: 'mount boom' } } });
  const failed = await browserCheck({ url: URL, playwrightModule: failedPage.module, mount: true });
  expect(statusOf(failed, 'wire_mount')).toMatchObject({ status: 'failed', details: 'mount boom' });
  expect(statusOf(failed, 'gpu_interaction_full')).toMatchObject({ status: 'not_run', details: '' });
  expect(failedPage.calls.closes).toBe(1);

  const timedOutPage = createPlaywright();
  const timedOut = await browserCheck({ url: URL, playwrightModule: timedOutPage.module, mount: true, timeoutMs: 40 });
  expect(statusOf(timedOut, 'wire_mount')).toMatchObject({ status: 'failed', details: 'mount timed out' });
  expect(statusOf(timedOut, 'gpu_interaction_full')).toMatchObject({ status: 'not_run', details: '' });
  expect(timedOutPage.calls.closes).toBe(1);
});

test('初始化判定由真实回调驱动，失败只影响 client_init，mount 仍继续判定', async () => {
  for (const [options, reason] of [
    [{ corrupt: true }, 'Font descriptor does not contain injected allocation'],
    [{ falsyFont: true }, 'Font descriptor does not contain injected allocation'],
    [{ fontCount: 1 }, 'Expected two injected fonts'],
    [{ defaultExport: false }, 'pkg/client.js has no default init export'],
  ]) {
    const fake = createPlaywright({ init: options, window: { __ternVerification: { mounted: true } }, frames: 1 });
    const result = await browserCheck({ url: URL, playwrightModule: fake.module, mount: true });

    expect(statusOf(result, 'client_init')).toMatchObject({ status: 'failed', details: reason });
    expect(result.candidateSha256).toBeNull();
    expect(statusOf(result, 'wire_mount')).toMatchObject({ status: 'passed' });
    expect(statusOf(result, 'gpu_interaction_full')).toMatchObject({ status: 'passed', details: 'WebSocket frames received: 1' });
  }
});

test('资源异常分别体现在对应检查上，清理仍执行', async () => {
  const probeFailure = createPlaywright({ probeError: new Error('connect ECONNREFUSED') });
  const probed = await browserCheck({ url: URL, playwrightModule: probeFailure.module });
  expect(statusOf(probed, 'page_served')).toMatchObject({ status: 'failed', details: 'GET /maple.js -> no response' });
  expect(probeFailure.calls.closes).toBe(1);

  const gotoFailure = createPlaywright({ gotoError: new Error('navigation blocked') });
  const navigated = await browserCheck({ url: URL, playwrightModule: gotoFailure.module });
  expect(statusOf(navigated, 'headless_forced')).toMatchObject({ status: 'failed', details: 'navigation blocked' });
  expect(statusOf(navigated, 'wire_mount').status).toBe('not_run');
  expect(gotoFailure.calls.closes).toBe(1);

  const launchFailure = createPlaywright({ launchError: new Error('browser launch failed') });
  const launched = await browserCheck({ url: URL, playwrightModule: launchFailure.module });
  expect(statusOf(launched, 'headless_forced')).toMatchObject({ status: 'failed', details: 'browser launch failed' });
  expect(launchFailure.calls.closes).toBe(0);
});

test('details 里泄漏 token 时标记失败并清空返回值中的 token 值', async () => {
  const token = 'leaky-token-123';
  const fake = createPlaywright({ userAgent: `HeadlessChrome ${token}` });
  const result = await browserCheck({ url: URL, playwrightModule: fake.module, tokenFile: writeToken(token) });

  const serialized = JSON.stringify(result);
  expect(serialized).not.toContain(token);
  expect(serialized).toContain('<REDACTED>');
  expect(statusOf(result, 'headless_forced').status).toBe('passed');
  expect(statusOf(result, 'token_redaction').status).toBe('failed');
  expect(fake.calls.closes).toBe(1);
});

test('token 格式异常与缺少参数都在启动浏览器前失败', async () => {
  const invalid = createPlaywright();
  const invalidResult = await browserCheck({ url: URL, playwrightModule: invalid.module, tokenFile: writeToken('bad token!') });
  expect(statusOf(invalidResult, 'headless_forced')).toMatchObject({ status: 'failed', details: 'browserCheck: token file has an unexpected format' });
  expect(invalid.calls.launches).toHaveLength(0);

  const missingUrl = await browserCheck({});
  expect(statusOf(missingUrl, 'headless_forced')).toMatchObject({ status: 'failed', details: 'browserCheck: url is required' });

  const missingPlaywright = await browserCheck({ url: URL });
  expect(statusOf(missingPlaywright, 'headless_forced')).toMatchObject({ status: 'failed', details: 'browserCheck: playwrightModule is required' });
});

test('非无头 UA 与 GPU 存在/缺失分别落入对应检查', async () => {
  const headed = createPlaywright({ userAgent: 'Mozilla/5.0 Chrome/120 Safari/537.36' });
  const headedResult = await browserCheck({ url: URL, playwrightModule: headed.module });
  expect(statusOf(headedResult, 'headless_forced')).toMatchObject({ status: 'failed', details: headed.settings.userAgent });
  expect(statusOf(headedResult, 'webgpu_available').status).toBe('not_run');

  const gpu = createPlaywright({ gpu: true });
  const gpuResult = await browserCheck({ url: URL, playwrightModule: gpu.module });
  expect(statusOf(gpuResult, 'webgpu_available')).toMatchObject({ status: 'passed', details: 'navigator.gpu present' });
  expect(statusOf(gpuResult, 'client_init')).toMatchObject({ status: 'passed', details: 'pkg/client.js init + loadClient + injectMaple OK (Maple Mono NF CN, 2 fonts)' });
  expect(gpuResult.candidateSha256).toBe(gpu.init.sha256);
});

test('探测返回非 200 时 page_served 记 failed 并带状态码', async () => {
  const fake = createPlaywright({ probe: { ok: () => false, status: () => 503 } });
  const result = await browserCheck({ url: URL, playwrightModule: fake.module });
  expect(statusOf(result, 'page_served')).toMatchObject({ status: 'failed', details: 'GET /maple.js -> 503' });
  expect(fake.calls.closes).toBe(1);
});

test('携带 synthetic token 时导航/初始化异常也不泄漏 token，异常报告与清理保留', async () => {
  const token = 'synthetic-token-x9';
  const tokenFile = writeToken(token);

  const gotoFailure = createPlaywright({ gotoError: new Error(`navigation blocked token=${token}`) });
  const navigated = await browserCheck({ url: URL, playwrightModule: gotoFailure.module, tokenFile });
  expect(JSON.stringify(navigated)).not.toContain(token);
  expect(statusOf(navigated, 'headless_forced')).toMatchObject({ status: 'failed' });
  expect(statusOf(navigated, 'headless_forced').details.length).toBeGreaterThan(0);
  expect(gotoFailure.calls.closes).toBe(1);

  const initFailure = createPlaywright({ init: { initError: new Error(`init failed token=${token}`) } });
  const inited = await browserCheck({ url: URL, playwrightModule: initFailure.module, tokenFile });
  expect(JSON.stringify(inited)).not.toContain(token);
  expect(statusOf(inited, 'client_init')).toMatchObject({ status: 'failed' });
  expect(statusOf(inited, 'client_init').details.length).toBeGreaterThan(0);
  expect(initFailure.calls.closes).toBe(1);
});
