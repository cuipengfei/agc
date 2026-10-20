// 静态夹具 glue 实例化真实测试模块，提供时间验收使用的内存分配入口。
// externref table 由实际 WASM 导出。
export default async function init({ module_or_path }) {
  const state = { heap: 16 };
  const imports = {
    env: {
      js_now_ms: () => Date.now(),
      js_perf_now_ms: () => performance.now(),
    },
  };
  const { instance } = await WebAssembly.instantiate(module_or_path, imports);
  return {
    ...instance.exports,
    __wbindgen_malloc: size => {
      const offset = state.heap;
      state.heap += Math.ceil(size / 8) * 8;
      return offset;
    },
  };
}
