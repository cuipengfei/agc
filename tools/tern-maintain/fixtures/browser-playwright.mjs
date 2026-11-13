// 浏览器边界替身：只替换真实 Chromium/Playwright，browserCheck 的检查顺序、
// 判定、脱敏与清理全部走生产代码。page.evaluate 按源码重新编译回调（mount 用
// new Function，init 用 vm 动态 import 钩子），因此回调若引用模块侧闭包会像真实
// 序列化一样在这里失败。
import { createInitModules, runPageCallback } from './browser-init-runner.mjs';

/**
 * @param {{userAgent?: string, gpu?: boolean, frames?: number, window?: object, init?: object,
 * probe?: object|null, probeError?: Error, navigation?: object, gotoError?: Error,
 * launchError?: Error, closeError?: Error}} [script]
 */
export function createPlaywright(script = {}) {
  const calls = { launches: [], routes: [], gotos: [], probes: [], closes: 0 };
  const settings = {
    userAgent: 'Mozilla/5.0 HeadlessChrome/120.0.0.0',
    gpu: false,
    frames: 0,
    window: {},
    href: 'http://127.0.0.1:4599/',
    init: {},
    probe: { ok: () => true, status: () => 200 },
    navigation: { status: () => 200 },
    ...script,
  };
  const init = createInitModules(settings.init);
  const page = {
    route: async (pattern, handler) => { calls.routes.push({ pattern, handler }); },
    request: {
      get: async (url, options) => {
        calls.probes.push({ url, options });
        if (settings.probeError) throw settings.probeError;
        return settings.probe;
      },
    },
    goto: async (url, options) => {
      calls.gotos.push({ url, options });
      if (settings.gotoError) throw settings.gotoError;
      return settings.navigation;
    },
    evaluate: async (fn, arg) => evaluate(fn, arg, settings, init),
  };
  const browser = {
    newPage: async () => page,
    close: async () => {
      calls.closes += 1;
      if (settings.closeError) throw settings.closeError;
    },
  };
  const module = {
    chromium: {
      launch: async options => {
        calls.launches.push(options);
        if (settings.launchError) throw settings.launchError;
        return browser;
      },
    },
  };
  return { module, calls, settings, init };
}

/** 按源码识别浏览器专用回调；纯函数回调会被真实执行以证明其可独立序列化。 */
function evaluate(fn, arg, settings, init) {
  const source = fn.toString();
  if (source.includes('/pkg/client.js')) return runPageCallback(fn, arg, { href: settings.href, modules: init.modules });
  const window = { __ternWsFramesReceived: settings.frames, ...settings.window };
  const standalone = new Function('window', 'navigator', `return (${source});`)(window, {
    userAgent: settings.userAgent,
    gpu: settings.gpu,
  });
  if (source.includes('navigator.userAgent')) return standalone();
  if (source.includes('navigator.gpu')) return standalone();
  if (source.includes('__ternWsFramesReceived')) return standalone();
  if (source.includes('__ternVerification')) return runMountCallback(standalone, arg);
  throw new Error(`browser-playwright: 未识别的页面回调 ${source.slice(0, 60)}`);
}

/** mount 回调会自行轮询；收集它创建的定时器，避免替身页面关闭后仍在跑。 */
async function runMountCallback(standalone, arg) {
  const timers = new Set();
  const realSetTimeout = globalThis.setTimeout;
  const realClearTimeout = globalThis.clearTimeout;
  globalThis.setTimeout = (callback, ms) => {
    const id = realSetTimeout(callback, ms);
    timers.add(id);
    return id;
  };
  globalThis.clearTimeout = id => {
    timers.delete(id);
    realClearTimeout(id);
  };
  try {
    return await standalone(arg);
  } finally {
    for (const id of timers) realClearTimeout(id);
    globalThis.setTimeout = realSetTimeout;
    globalThis.clearTimeout = realClearTimeout;
  }
}
