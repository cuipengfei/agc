import { createHash } from 'node:crypto';
import fs from 'node:fs';
import readline from 'node:readline';
import { chromium } from 'playwright';
let browser = null;
/** @type {import('playwright').Page} */
let page = null;
const write = value => process.stdout.write(JSON.stringify(value) + '\n');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const clean = value => String(value).replace(/token=[^&\s"']+/g, 'token=<REDACTED>').slice(0, 400);

const messages = [];
const errors = [];

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
