// init 回调的独立执行器：按回调源码在全新 vm 上下文里重新编译（页面里没有模块闭包），
// 动态 import 由 importModuleDynamically 钩子提供命名空间；Bun 的这个钩子直接接受
// 命名空间对象。WASM 内存与字体描述符都是真实对象，失败靠真实描述符损坏驱动。
import vm from 'node:vm';
import crypto from 'node:crypto';

const sha256Hex = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

/**
 * 构造 /pkg/client.js 与 /maple.js 的替身：真实 WebAssembly.Memory 里写入
 * 有效或损坏的字体描述符，其余字段与生产 injectMaple 返回值一致。
 * @param {{fontCount?: number, corrupt?: boolean, falsyFont?: boolean, defaultExport?: boolean, initError?: Error, bytes?: Uint8Array}} [options]
 */
export function createInitModules({ fontCount = 2, corrupt = false, falsyFont = false, defaultExport = true, initError, bytes = new TextEncoder().encode('tern-init-bytes') } = {}) {
  const memory = new WebAssembly.Memory({ initial: 1 });
  const view = new DataView(memory.buffer);
  const fonts = [];
  for (let i = 0; i < fontCount; i += 1) {
    const slot = 16 + i * 8;
    const pointer = 0x1000 + i * 0x40;
    const length = 0x200;
    view.setUint32(slot, pointer, true);
    view.setUint32(slot + 4, corrupt && i === 0 ? length + 1 : length, true);
    fonts.push({ style: 'Regular', pointer, bytes: length, slot, slots: [slot] });
  }
  if (falsyFont) fonts[0] = 0; // 坏条目本身是假值：只有布尔判定才能拒绝它
  const client = defaultExport ? {
    default: async () => {
      if (initError) throw initError;
      return { memory };
    },
  } : {};
  const maple = {
    loadClient: async () => bytes,
    injectMaple: async () => ({ family: 'Maple Mono NF CN', fonts }),
  };
  return { sha256: sha256Hex(bytes), modules: new Map([['/pkg/client.js', client], ['/maple.js', maple]]) };
}

/**
 * 在独立上下文执行页面回调；modules 以 URL pathname 为键。
 * @param {Function} fn 浏览器页面回调（按源码执行，访问不到模块侧闭包）
 * @param {unknown} arg page.evaluate 的第二个参数
 * @param {{href: string, modules: Map<string, object>}} options
 */
export async function runPageCallback(fn, arg, { href, modules }) {
  const resolve = specifier => {
    const namespace = modules.get(new URL(specifier).pathname);
    if (!namespace) throw new Error(`browser-init-runner: unexpected import ${specifier}`);
    return namespace;
  };
  const context = vm.createContext({ location: { href }, URL, crypto: globalThis.crypto }, { importModuleDynamically: resolve });
  const script = new vm.Script(`(${fn.toString()})`, { importModuleDynamically: resolve });
  return script.runInContext(context)(arg);
}
