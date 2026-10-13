# Tern 网页 Maple 字体修改证据

> Source: Tern 0.8.3 web 客户端检查、FontTools 检查、WABT 验证、浏览器初始化检查，以及本仓库对话中的用户确认
> Collected: 2026-10-14（用户试验来源 2026-10-13；本轮纠正数字经实际初始化内存快照核验）
> Published: Unknown

本 raw 文件记录 0.8.3 的确切证据。二进制字体、二进制 WASM 与 19,333,120 字节的初始内存快照均不存档。

## 字体诊断

原版 web 客户端内嵌八款字体。相关的终端字体面如下：

| 字体面 | 原版指针 | 原版长度 | 原版 name 表返回的族名 |
|---|---:|---:|---|
| Regular | 4299258 | 2288420 | BerkeleyMono Nerd Font |
| Bold | 6587678 | 2313308 | BerkeleyMono Nerd Font Medium |

原版 Regular 与 Bold 的字符映射经 FontTools `getBestCmap` 计数均为 11,217 个码位，两者都缺少 `发` 和 `生`。

被检查的模块有 615 个 JavaScript import。没有任何 import 名称匹配普通浏览器文本渲染所用的本地字体、文本绘制或文本测量 API。

## Maple 字体证据

源字体族为 `Maple Mono NF CN`，源版本字符串为 `Version 7.900`。

WSL 与 Windows 两处的副本 SHA-256 一致：

- Regular：`8b4f149beaead3eac78ffb84adf31513ebf06fe6dbc6e181ccd9debad3c70f1a`
- Bold：`25a3c344f0d915e443bd09339ef512f9cade14c2200612a37e6b8e8261940152`

保存的替换字体保留了完整字符映射：

- Regular：20,564,496 字节；SHA-256 `fe14b378a0a0c299c186bdac3370c0a66c358f44d27283fa8ee004c8ad90a900`
- Bold：20,517,844 字节；SHA-256 `a399807f27b9af23fdb62f878e8cd7eee3c0bdb915d8b2f4395ef3633e89a418`
- 每款保存字体的字符映射条目 33,091 个，其中 CJK 条目 20,976 个，私用区条目 10,379 个。

替换字体的 name ID 1、2、4、6、16、17 均从原版内嵌字体面复制。保存后的查询族名 Regular 仍为 `BerkeleyMono Nerd Font`、Bold 仍为 `BerkeleyMono Nerd Font Medium`。这是刻意的：渲染器仍按原版族名请求，而字节内容提供完整的 Maple 字形集。

## 运行时注入证据

初始化响应暴露了一个 `WebAssembly.Memory` 和一个导出的 `__wbindgen_malloc` 函数。

第一个小规模证明使用原地替换的子集，包含 ASCII 加 `发生`。该证明确立了 JavaScript 可以在 `mount()` 之前修改 WASM 内存，但不能证明渲染器会使用修改后的数据。

最终注入为每款完整 Maple 字体分配新的 WASM 内存，写入完整字体字节，并更新存储在原始绑定槽位中的描述符：

| 字体面 | 描述符槽位 | 长度槽位 |
|---|---:|---:|
| Regular | 8962760 | 8962764 |
| Bold | 8962784 | 8962788 |

分配器返回的地址是运行时值。冒烟检查中记录的用户可见注入结果为：

- Regular 指针 `19333128`，长度 20,564,496
- Bold 指针 `39897632`，长度 20,517,844

这些精确指针不得照搬到新的页面加载。

## 加载指令证据

仅修改浏览器侧描述符仍显示缺字方框。反汇编显示实际加载路径使用的是编译期固化的地址与长度常量：

```wat
i32.const 4299258
i32.const 2288420
```

以及：

```wat
i32.const 6587678
i32.const 2313308
```

最终修补的 WAT 将这两条加载路径改为从描述符记录读取：

```wat
i32.const 8962760
i32.load
i32.const 8962764
i32.load
```

以及：

```wat
i32.const 8962784
i32.load
i32.const 8962788
i32.load
```

最终模块用 `wat2wasm` 编译，未启用任何 proposal 标志；`wasm-validate` 接受了它。其 SHA-256 为：

```text
dba5a764b1e225d451b6376757e247214ec1002f60d2ae26dfb75574cc2e2d9b
```

最终模块在真实 Chromium 进程中完成初始化。非可视化检查核验了注入结果、WASM 内存中的完整字体字节、HTTP 200，以及既有 token 的 WebSocket 认证。该模块的 JavaScript import 与 export 和原版模块一致，初始内存也与原版模块一致。

用户在 Windows 浏览器中确认了中文字符与 Nerd Font 图标渲染成功。随后在未修改的官方客户端上观察到同样的中文 Markdown 冻结，因此该冻结是客户端预存问题，不是本次字体补丁的后果。
