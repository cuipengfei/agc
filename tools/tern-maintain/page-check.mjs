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

const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function loadPlaywright(playwrightModule) {
  if (typeof playwrightModule !== 'string') return playwrightModule;
  const mod = await import(pathToFileURL(path.resolve(playwrightModule)).href);
  return mod.default ?? mod;
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

/**
 * 在强制无头的真实浏览器里验收真实生成的 index。
 * 返回 { schemaVersion: 1, candidateSha256, checks: [{name, status, details}] }。
 * status 取值 passed|failed|not_run；退出码由调用方按 failed 映射。
 */
export async function checkPage({ url, playwrightModule, chromiumExecutable, out, timeoutMs = 60_000 } = {}) {
  const checks = new Map(ORDER.map(name => [name, { name, status: 'not_run', details: '' }]));
  const add = (name, status, details = '') => {
    const check = checks.get(name);
    check.status = status;
    check.details = redact(details).slice(0, 500);
  };
  let candidateSha256 = null;

  try {
    if (!url) throw new Error('checkPage: url is required');
    if (!playwrightModule) throw new Error('checkPage: playwrightModule is required');
    const { origin, href } = cleanUrl(url);

    const pw = await loadPlaywright(playwrightModule);
    const browser = await pw.chromium.launch({
      executablePath: chromiumExecutable || undefined,
      headless: true, // 强制无头：绝不接受有头请求
      args: ['--no-sandbox'],
    });
    try {
      const page = await browser.newPage();

      // 页面内硬阻断 WebSocket：构造即计数并抛错，验收 URL 不可能连接 daemon。
      // 不替换任何 HTML 或模块，真实页面行为不受影响。
      await page.addInitScript(() => {
        window.__ternWsCount = 0;
        window.WebSocket = class WebSocket {
          constructor() {
            window.__ternWsCount++;
            throw new Error('WebSocket blocked during page verification');
          }
        };
      });

      const pageErrors = [];
      page.on('pageerror', error => pageErrors.push(String((error && error.message) || error)));

      // 真实导航，绝不替换导航文档；HTTP 结论只来自本次导航响应。
      const response = await page.goto(href, { timeout: timeoutMs, waitUntil: 'domcontentloaded' });
      const status = response ? response.status() : 0;
      add('page_served', status === 200 ? 'passed' : 'failed', `GET ${href} -> ${status || 'no response'}`);

      const userAgent = await page.evaluate(() => navigator.userAgent);
      add('headless_forced', /headless/i.test(userAgent) ? 'passed' : 'failed', userAgent);

      // 等待页面自己写出的结构化状态。
      const deadline = Date.now() + timeoutMs;
      let state = null;
      while (Date.now() < deadline) {
        state = await page.evaluate(() => window.__ternVerification ?? null).catch(() => null);
        if (state && (state.ready || state.failed)) break;
        await sleep(250);
      }

      // 就绪后再给 late pageerror 一个收敛窗口，然后重新读取最新状态做严格判定。
      if (state && state.ready && !state.failed) await sleep(500);
      const fresh = await page.evaluate(() => window.__ternVerification ?? null).catch(() => null);
      if (fresh) state = fresh;

      const readyOk = !!state && state.ready === true && state.failed !== true
        && state.tokenPrompt === true && state.mounted === false
        && pageErrors.length === 0;
      if (readyOk) {
        add('page_ready', 'passed', 'ready===true, failed!==true, tokenPrompt===true, mounted===false, pageerror=0');
      } else {
        const parts = [
          state ? `ready=${state.ready}` : 'state missing',
          state ? `failed=${state.failed}` : '',
          state ? `tokenPrompt=${state.tokenPrompt}` : '',
          state ? `mounted=${state.mounted}` : '',
          `pageerrors=${pageErrors.length}`,
        ].filter(Boolean);
        const reason = pageErrors.length ? pageErrors.join(' | ') : (state && state.error) || 'timed out waiting for __ternVerification';
        add('page_ready', 'failed', `${parts.join(', ')}; ${reason}`);
      }

      if (readyOk) {
        const fonts = await page.evaluate(() => ({ family: window.ternMaple?.family ?? null, fonts: window.__ternVerification.fonts ?? null }));
        const entries = Array.isArray(fonts.fonts) ? fonts.fonts : [];
        const styles = entries.map(font => font && font.style).sort().join(',');
        const ok = fonts.family === 'Maple Mono NF CN' && entries.length === 2 && styles === 'Bold,Regular';
        add('fonts_injected', ok ? 'passed' : 'failed', ok
          ? `${fonts.family}: ${entries.map(font => `${font.style}=${font.bytes}B`).join(', ')}`
          : `family=${fonts.family}, styles=${styles || 'none'}`);
      } else {
        add('fonts_injected', 'failed', state && state.error ? `init failed: ${state.error}` : 'page never became ready');
      }

      if (readyOk && /^[a-f0-9]{64}$/.test(state.candidateSha ?? '')) {
        const served = sha256(await (await page.request.get(`${origin}/pkg/client.wasm`, { timeout: 10_000 })).body());
        candidateSha256 = state.candidateSha;
        add('candidate_hash', served === state.candidateSha ? 'passed' : 'failed',
          served === state.candidateSha
            ? `served /pkg/client.wasm SHA-256 ${served} matches page-reported candidate`
            : `served ${served} != page-reported ${state.candidateSha}`);
      } else {
        add('candidate_hash', 'failed', readyOk ? 'page reported no candidate SHA-256' : 'page never became ready');
      }

      const wsConstructed = await page.evaluate(() => window.__ternWsCount ?? 0).catch(() => 0);
      add('websocket_absent', wsConstructed === 0 ? 'passed' : 'failed', wsConstructed === 0 ? 'zero WebSocket constructions (constructor throws)' : `${wsConstructed} WebSocket constructions`);

      // 设计上无 token URL 不 mount；mounted===false 已在 page_ready 中实测。
      add('wire_mount', 'not_run', '无 token 的验收 URL 按设计不执行 mount/WebSocket；mounted===false 已实测，不连接或操作任何 pane');
      add('gpu_interaction_full', 'not_run', '本轮仅验证真实页面初始化与字体注入，未执行完整 GPU 交互');
    } finally {
      await browser.close().catch(() => {});
    }
  } catch (error) {
    const gate = ['page_served', 'headless_forced', 'page_ready'].find(name => checks.get(name).status === 'not_run') ?? 'page_ready';
    add(gate, 'failed', (error && error.message) || String(error));
  }

  const report = { schemaVersion: 1, candidateSha256, checks: ORDER.map(name => checks.get(name)) };
  if (out) fs.writeFileSync(out, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  return report;
}
