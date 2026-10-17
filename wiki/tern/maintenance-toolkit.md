# Tern 升级辅助工具与验收边界

> Sources: agc Tern maintenance toolkit and local validation, 2026-10-17
> Raw: [工具说明与 0.9.2 验收记录](../../raw/tern/2026-10-17-maintenance-toolkit-and-validation.md)
> Updated: 2026-10-17

## 用途

`tools/tern-maintain` 用于升级 Tern Web 资源时重新取得官方模块、计算字体与时间相关位置、生成人工审核材料并执行分层验收。它不修改 manifest，不写来源配置，也不自动部署。工具已通过 commit `faae638` 纳入仓库。

## 工作流程

1. 从不带认证参数的本机原生 Web 服务取得官方 WASM URL 和 SHA-384 SRI；版本从 URL 计算，资源必须通过完整性校验。
2. 生成初始内存并用 FontTools 识别内嵌字体。分析器按实际 pointer/length 搜索唯一 descriptor，收集直接调用、函数表引用和局部指令上下文。未知 Binaryen IR 节点会使分析失败。
3. 报告给出 `decision: manual_review_required`。实际指令修改通过文件编辑工具完成，再由标准 WASM compiler 编译。工具不自动改写指令，不把旧版本地址表用于新版本。
4. 字体处理校验初始内存 SHA-256，复制原字体的 lookup name records，保留 Maple 的完整 cmap、glyphs 和其他表。两个字体都通过校验后才修改 descriptor。
5. 结构、时间、字体、浏览器和后台服务分别验收。结构报告的 `deployable` 始终为 `false`，不会成为自动部署批准。

内存初始化会执行可信官方模块的 start function；遇到初始化 import 调用或不支持的 import 类型会停止。该过程不是不可信 WASM 的隔离环境。

## 0.9.2 实际结果

官方资源获取与 SRI 通过。结构检查中的 imports、exports、函数签名、内存限制和初始内存均通过。

时间计划记录 26 个调用上下文，其中 15 个有唯一 buffer 候选，11 个需要人工审核。候选模块中原 panic 函数的直接调用、函数表引用和 `ref.func` 引用均为 0。

时间回归覆盖模块来源、日历与 epoch、输出边界、小数精度、跨秒 borrow、饱和时长、真实 consumer 和一万次 externref 复用，全部通过。

FontTools 数据测试确认 lookup 名称转换后完整 cmap 保留。每份字体有 33091 个字符映射，其中 20976 个属于记录的 CJK 范围。Headless Chromium 147 完成实际模块初始化与两份完整字体注入；没有执行 mount 或 WebSocket。

工具行为测试 18 项、字体数据测试 2 项、同步项目测试 19 项均通过。Node 与 Python 依赖审查当时未发现已知漏洞，FontTools 使用 4.60.2。

## 未完成与使用限制

完整 GPU、Markdown 和笔记交互未由本工具验收；GitHub 端 CI 未执行。真实 native 后台烟雾检查只覆盖隔离 daemon、HTTP 和 pane 集合不变，不影响原有服务。

新 Tern 版本必须重新生成分析并人工审核。旧版本的 profile 只用于固定 SHA 的行为回归，不用于推导新版本的地址或函数编号。

## See Also

- [Tern 网页字体修改与版本迁移](web-maple-font-rebuild.md)
- [Tern 设置存储位置](settings-storage.md)
