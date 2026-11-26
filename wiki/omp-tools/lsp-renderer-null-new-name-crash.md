# OMP LSP 工具卡片的 null 参数崩溃与 `lsp.enabled` 规避边界

> Sources: 本机日志、打包文件偏移与随包源码取证，2026-11-27; `can1357/oh-my-pi#20663`、`#20664`, 2026-11-26
> Raw: [OMP LSP 工具卡片的 null 参数崩溃](../../raw/omp-tools/2026-11-27-omp-lsp-renderer-null-new-name-crash.md)
> Updated: 2026-11-27

## Overview

OMP `19.2.1` 在绘制 `lsp` 工具卡片时，参数里 `new_name` 为 `null` 就会抛 `TypeError: null is not an object (evaluating 'e.includes')`，未捕获异常直接结束进程，日志记为 `kind: fatal`。`lspSchema` 把 `new_name` 声明为可选字符串，模型对未使用的可选参数发 `null` 又是常态，两者之间只隔一层 `!== undefined` 判断，null 穿过去落到 `replaceTabs`。上游 `#20663` 记录了同一崩溃，修复 PR `#20664` 尚未合入；当前版本把 `lsp.enabled` 设为 `false` 可让 `lsp` 工具整体不注册。

## 崩溃链

四个环节，全部一手可查：

1. schema 允许缺省：`src/lsp/types.ts` 的 `new_name: "string?"`。
2. presenter 原样透传：`src/ui/tools/lsp.tsx` 的 `lspTerm` 返回 `newName: args?.new_name`，`callMeta` 也只判 `args.new_name !== undefined`。
3. 绘制层判空不足：`src/ui/styles/tools/lsp.ts` 第 72 行 `if (term.newName !== undefined)`，null 能通过。
4. 字符串方法收到 null：`pi-tui` 的 `replaceTabs` 直接 `text.includes("\t")`，抛出 TypeError。

打包后的对应位置是 `dist/cli.js` 的 `290:34096`（`replaceTabs`）与 `21924:818`（卡片 head 拼接处）。

崩溃会话里那次调用是 `references` 查询，`query`、`new_name`、`payload` 全为 `null`，`line` 为 `48`，`timeout` 为 `20`。

`!== undefined` 与 `!= null` 在 TypeScript 里不等价，可选参数的 schema 也不阻止 `null` 进来。

## 定位方法

本轮实际走的顺序，可以复用：

1. 读日志拿异常消息与完整 stack。
2. 用 stack 里的 `行:列` 取 `dist/cli.js` 附近字符片段，按片段认出压缩后的函数体（本例 `function Je(e){return e.includes("\t")?...}`）。
3. 到随包 `src/` 读同名函数，确认类型签名与判空写法。
4. 回到崩溃会话 JSONL 找那次工具调用的实际参数，确认 null 从哪来。

## 规避与生效范围

在 `~/.omp/agent/config.yml` 把 `lsp.enabled` 设为 `false`，用 `omp config get lsp.enabled` 回读得到 `false`。

关闭后的路径：`src/tools/index.ts` 第 811 行 `if (name === "lsp") return enableLsp && cfgLspEnabled.get(session.settings)` 让工具不进候选集，`LspTool.createIf` 在 `enableLsp === false` 时返回 `null`，`hasBuiltInTool("lsp")` 随之为 false。

推断：恢复历史会话时，同一张 `lsp` 卡片会落到通用 presenter，不再经过崩溃的绘制函数。依据是 `transcript.tsx` 的 `#presentCard` 在 `!builtIn && registered` 分支使用 `defaultPresenter`。本轮未实际 resume 复现。

代价是本次运行内没有 LSP 诊断、符号查询与跳转。

## 上游状态

`#20663` 于 `2026-11-26T14:21:32Z` 建立，标签含 `prio:p1`，状态 OPEN。`#20664` 于 `2026-11-26T14:28:06Z` 建立，把 `new_name` 与 `line` 放宽为可为 null 并在 presenter 归一化，在 `packages/coding-agent/test/ui/tools/lsp.test.ts` 加了「null 与省略绘制一致」的回归测试，正文写 `Fixes #20663`，当前 merge state 为 `DIRTY`。

本机已在该 issue 与 PR 各评论一条，附版本与崩溃栈归属。

## 证据边界

日志、打包片段、随包源码、会话记录、配置回读、上游文本均为一手直读。恢复会话不复发的结论来自源码推断，未做运行验证。`lsp.enabled: false` 的实际效果只验证到配置回读，没有在新进程里确认工具缺席。

## See Also

- [OMP 内建工具全集、会话暴露边界与内部地址空间](builtin-tools-and-internal-urls.md)
