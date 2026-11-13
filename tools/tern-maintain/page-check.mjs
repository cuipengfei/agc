// 对真实生成的 index 做无头验收（绝不使用探针页面）：只访问无凭据的 loopback
// 入口，页面内硬阻断 WebSocket，然后等待页面自己写出的
// window.__ternVerification 状态。模块 import 成功永远不代表 init 成功——
// 只有通过结构化页面状态与 pageerror 监听得到的结论才计入检查。
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { redact } from './runtime.mjs';

const ORDER = [
 'page_served',         // page.goto 真实导航响应 HTTP 200
 'headless_forced',     // user agent 证明强制无头启动
 'page_ready',          // ready===true && failed!==true && tokenPrompt===true && mounted===false 且无 pageerror
 'fonts_injected',      // 两个 Maple 字体真实注入 WASM 内存
 'candidate_hash',      // 页面报告的 candidate SHA-256 与服务字节一致
 'websocket_absent',    // 页面全程零 WebSocket 构造（构造即抛错，不可能连上）
 'wire_mount',          // 恒 not_run：无 token URL 必须不 mount；mounted===false 已被实测
 'gpu_interaction_full' // 恒 not_run：本轮不做完整 GPU 交互
];

// 浏览器未启动或中途失败时，按此顺序把失败记到第一个尚未执行的检查上。
const GATES = ['page_served', 'headless_forced', 'page_ready'];
const SHA256_HEX = /^[a-f0-9]{64}$/;
const MAPLE_FAMILY = 'Maple Mono NF CN';
const STATE_POLL_MS = 250;
const LATE_ERROR_MS = 500;

const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function loadPlaywright(playwrightModule) {
  if (typeof playwrightModule !== 'string') return playwrightModule;
  const mod = await import(pathToFileURL(path.resolve(playwrightModule)).href);
  return mod.default ?? mod;
}

function newChecks() {
  return new Map(ORDER.map(name => [name, { name, status: 'not_run', details: '' }]));
}

function setCheck(checks, name, status, details = '') {
  const check = checks.get(name);
  check.status = status;
  check.details = redact(details).slice(0, 500);
}

/**
 * 入口只接受无凭据、无 query、无 fragment 的 http/https loopback URL。
 * 返回的 href 仅由 origin+pathname 构成，报告 details 不可能携带敏感参数。
 */
function cleanUrl(url) {
  const parsed = new URL(url);
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error('checkPage: url must be http or https');
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(parsed.hostname)) throw new Error('checkPage: url must be a loopback URL');
  if (parsed.username || parsed.password) throw new Error('checkPage: url must not carry credentials');
  if (parsed.search || parsed.hash) throw new Error('checkPage: url must not carry query or fragment');
  return { origin: parsed.origin, href: `${parsed.origin}${parsed.pathname}` };
}

function resolveTarget({ url, playwrightModule }) {
  if (!url) throw new Error('checkPage: url is required');
  if (!playwrightModule) throw new Error('checkPage: playwrightModule is required');
  return cleanUrl(url);
}

/**
 * 页面内硬阻断 WebSocket：构造即计数并抛错，验收 URL 不可能连接 daemon。
 * 不替换任何 HTML 或模块，真实页面行为不受影响。此回调不引用模块作用域，
 * 必须能被 Playwright 单独序列化。
 */
function blockWebSocket() {
  window.__ternWsCount = 0;
  window.WebSocket = class WebSocket {
    constructor() {
      window.__ternWsCount++;
      throw new Error('WebSocket blocked during page verification');
    }
  };
}

const readState = page => page.evaluate(() => window.__ternVerification ?? null).catch(() => null);

async function waitForTerminalState(page, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let state = null;
  while (Date.now() < deadline) {
    state = await readState(page);
    if (state && (state.ready || state.failed)) return state;
    await sleep(STATE_POLL_MS);
  }
  return state;
}

/** 就绪后再给 late pageerror 一个固定收敛窗口，然后重新读取最新状态做严格判定。 */
async function settleLateErrors(page, state) {
  if (state && state.ready && !state.failed) await sleep(LATE_ERROR_MS);
  return (await readState(page)) ?? state;
}

const isReady = (state, pageErrors) => Boolean(
  state && state.ready === true && state.failed !== true
  && state.tokenPrompt === true && state.mounted === false
  && pageErrors.length === 0,
);

function readinessDetails(state, pageErrors) {
  const observed = [
    state ? `ready=${state.ready}` : 'state missing',
    state ? `failed=${state.failed}` : '',
    state ? `tokenPrompt=${state.tokenPrompt}` : '',
    state ? `mounted=${state.mounted}` : '',
    `pageerrors=${pageErrors.length}`,
  ].filter(Boolean);
  const reason = pageErrors.length ? pageErrors.join(' | ') : (state && state.error) || 'timed out waiting for __ternVerification';
  return `${observed.join(', ')}; ${reason}`;
}

function recordServed(checks, response, href) {
  const status = response ? response.status() : 0;
  setCheck(checks, 'page_served', status === 200 ? 'passed' : 'failed', `GET ${href} -> ${status || 'no response'}`);
}

function recordHeadless(checks, userAgent) {
  setCheck(checks, 'headless_forced', /headless/i.test(userAgent) ? 'passed' : 'failed', userAgent);
}

function recordPageReady(checks, state, pageErrors) {
  if (isReady(state, pageErrors)) {
    setCheck(checks, 'page_ready', 'passed', 'ready===true, failed!==true, tokenPrompt===true, mounted===false, pageerror=0');
    return;
  }
  setCheck(checks, 'page_ready', 'failed', readinessDetails(state, pageErrors));
}

const fontStyles = entries => entries.map(font => font && font.style).sort().join(',');
const fontSummary = (family, entries) => `${family}: ${entries.map(font => `${font.style}=${font.bytes}B`).join(', ')}`;

/**
 * 页面内读取字体全局的原始数据。不引用模块作用域，必须能被 Playwright 单独序列化。
 */
function readFontGlobals() {
  return { family: window.ternMaple?.family ?? null, fonts: window.__ternVerification.fonts ?? null };
}

/** 只负责取数：把页面原始 fonts 收敛成可判定的 family+entries。 */
async function readFonts(page) {
  const observed = await page.evaluate(readFontGlobals);
  return { family: observed.family, entries: Array.isArray(observed.fonts) ? observed.fonts : [] };
}

/** 注入成功的既有要求：Maple family、恰好两个字体、样式恰为 Bold+Regular。 */
function isFontSetInjected(family, entries) {
  return family === MAPLE_FAMILY && entries.length === 2 && fontStyles(entries) === 'Bold,Regular';
}

function fontsFailureDetails(family, entries) {
  const styles = fontStyles(entries);
  return `family=${family}, styles=${styles || 'none'}`;
}

function fontsNotReadyDetails(state) {
  return state && state.error ? `init failed: ${state.error}` : 'page never became ready';
}

async function recordFonts(checks, page, readyOk, state) {
  if (!readyOk) {
    setCheck(checks, 'fonts_injected', 'failed', fontsNotReadyDetails(state));
    return;
  }
  const { family, entries } = await readFonts(page);
  const injected = isFontSetInjected(family, entries);
  setCheck(checks, 'fonts_injected', injected ? 'passed' : 'failed',
    injected ? fontSummary(family, entries) : fontsFailureDetails(family, entries));
}

/** 服务端字节的 SHA-256：只通过本次页面的 HTTP 请求获取，不读磁盘。 */
async function servedHash(page, origin) {
  const response = await page.request.get(`${origin}/pkg/client.wasm`, { timeout: 10_000 });
  return sha256(await response.body());
}

async function recordCandidateHash(checks, page, { origin, readyOk, state }) {
  const declared = state && state.candidateSha;
  if (!readyOk || !SHA256_HEX.test(declared ?? '')) {
    setCheck(checks, 'candidate_hash', 'failed', readyOk ? 'page reported no candidate SHA-256' : 'page never became ready');
    return null;
  }
  const served = await servedHash(page, origin);
  const matches = served === declared;
  setCheck(checks, 'candidate_hash', matches ? 'passed' : 'failed',
    matches ? `served /pkg/client.wasm SHA-256 ${served} matches page-reported candidate` : `served ${served} != page-reported ${declared}`);
  return declared;
}

async function recordWebSocket(checks, page) {
  const constructed = await page.evaluate(() => window.__ternWsCount ?? 0).catch(() => 0);
  const absent = constructed === 0;
  setCheck(checks, 'websocket_absent', absent ? 'passed' : 'failed', absent ? 'zero WebSocket constructions (constructor throws)' : `${constructed} WebSocket constructions`);
}

function recordNotRun(checks) {
  // 设计上无 token URL 不 mount；mounted===false 已在 page_ready 中实测。
  setCheck(checks, 'wire_mount', 'not_run', '无 token 的验收 URL 按设计不执行 mount/WebSocket；mounted===false 已实测，不连接或操作任何 pane');
  setCheck(checks, 'gpu_interaction_full', 'not_run', '本轮仅验证真实页面初始化与字体注入，未执行完整 GPU 交互');
}

/** 在既有 page 上按固定顺序完成全部页面侧判定，返回页面报告的 candidate SHA-256。 */
async function inspectPage(browser, { origin, href, timeoutMs }, checks) {
  const page = await browser.newPage();
  await page.addInitScript(blockWebSocket);

  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(String((error && error.message) || error)));

  // 真实导航，绝不替换导航文档；HTTP 结论只来自本次导航响应。
  const response = await page.goto(href, { timeout: timeoutMs, waitUntil: 'domcontentloaded' });
  recordServed(checks, response, href);

  recordHeadless(checks, await page.evaluate(() => navigator.userAgent));

  // 等待页面自己写出的结构化状态。
  const state = await settleLateErrors(page, await waitForTerminalState(page, timeoutMs));
  const readyOk = isReady(state, pageErrors);
  recordPageReady(checks, state, pageErrors);
  await recordFonts(checks, page, readyOk, state);
  const candidateSha256 = await recordCandidateHash(checks, page, { origin, readyOk, state });
  await recordWebSocket(checks, page);
  recordNotRun(checks);
  return candidateSha256;
}

function recordGateFailure(checks, error) {
  const gate = GATES.find(name => checks.get(name).status === 'not_run') ?? 'page_ready';
  setCheck(checks, gate, 'failed', (error && error.message) || String(error));
}

/**
 * 在强制无头的真实浏览器里验收真实生成的 index。
 * 返回 { schemaVersion: 1, candidateSha256, checks: [{name, status, details}] }。
 * status 取值 passed|failed|not_run；退出码由调用方按 failed 映射。
 */
export async function checkPage({ url, playwrightModule, chromiumExecutable, out, timeoutMs = 60_000 } = {}) {
  const checks = newChecks();
  let candidateSha256 = null;

  try {
    const { origin, href } = resolveTarget({ url, playwrightModule });

    const pw = await loadPlaywright(playwrightModule);
    const browser = await pw.chromium.launch({
      executablePath: chromiumExecutable || undefined,
      headless: true, // 强制无头：绝不接受有头请求
      args: ['--no-sandbox'],
    });
    try {
      candidateSha256 = await inspectPage(browser, { origin, href, timeoutMs }, checks);
    } finally {
      await browser.close().catch(() => {});
    }
  } catch (error) {
    recordGateFailure(checks, error);
  }

  const report = { schemaVersion: 1, candidateSha256, checks: ORDER.map(name => checks.get(name)) };
  if (out) fs.writeFileSync(out, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  return report;
}
