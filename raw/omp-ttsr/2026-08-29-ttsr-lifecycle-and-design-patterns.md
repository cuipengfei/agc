# OMP TTSR 生命周期与设计模式

> Source: https://omp.sh/docs/ttsr; https://github.com/feigo313/omp-zh-i18n/blob/master/docs/ttsr-injection-lifecycle.md; https://github.com/can1357/oh-my-pi/blob/main/packages/coding-agent/src/export/ttsr.ts; https://github.com/can1357/oh-my-pi/blob/main/packages/coding-agent/src/session/ttsr-coordinator.ts
> Collected: 2026-08-29
> Published: Unknown

## 证据等级

OMP 官方 TTSR 文档是公开产品行为的主要来源。中文 lifecycle 文档是补充说明，不等同于官方来源。源码和本次本地 live 验证用于确认当前 checkout/runtime 的实现细节；它们不自动证明所有未来版本行为。

## TTSR 做什么

TTSR（Token-Triggered System Reminders）按规则的 `condition` 匹配模型输出流，并在匹配时注入 reminder。规则可以限定 scope，包括 `text`、`thinking`、`tool`/`toolcall`、`tool:<name>` 和带 glob 的 `tool:<name>(<glob>)`。`tool:task` 因而可以观察 task 工具调用的参数文本。

TTSR 的输入是流式/序列化文本，不是已经解析好的任意 JSON object。它适合稳定的 lexical pattern、危险命令片段、格式错误的 API 形态和简单的 serialized payload guard；不适合用 regex 严格验证任意嵌套 JSON 的对象关系。

## 生命周期控制

当前 OMP TTSR 配置可控制：

- `interruptMode`：匹配后是否中断当前输出/执行路径。
- `contextMode`：匹配上下文采用 `keep` 还是 `discard`。
- `repeatMode`：同一规则后续是否允许再次触发。
- `repeatGap`：`after-gap` 模式下再次触发所需的 completed-turn 间隔。

本地源码确认，规则是否可触发的 `canTrigger` 判断先于 scope 和 condition regex。规则命中状态会写入 injected state；当前配置/生命周期资料表明这个状态可在 session 恢复，重启不等于清空它。

因此 live 验收如果先跑负向命中，再跑正向放行，正向可能只是被 repeat gate 跳过，不能证明 regex 没命中。应当正向先测负向后测，或使用两个全新 session。

## 规则身份

官方文档和本次实现核对确认：规则名来自规则文件名 stem。frontmatter 的 `name:` 不是可靠的规则身份覆盖。若旧规则已经产生 injected state，改文件名并用新 session 验证，比添加一个无效的 `name:` 字段可靠。

## TTSR 与结构化 hook 的边界

TTSR 适合在 schema 处理前尽力拦截简单的原始文本形态。regex 不能可靠地区分：

- `tasks[]` item 与其他对象的同名字段。
- 嵌套 object 内的 `agent`。
- task 字符串里的 `{}` 与真实 JSON delimiter。
- 任意字段顺序下的每一个 item。

结构化 `tool_call` extension 适合读取验证后的 `event.input`，逐项执行本地政策。但若 schema 已经补默认值，extension 看不到字段原先是否存在。

## 验收方法

隔离 `omp ttsr test` 只能证明给定文本和规则的 matching 结果；它不能证明 live session 的 injected state、默认值时序或 worker 是否实际启动。

Live 验收应分别记录：

1. 规则是否在新进程注册。
2. 正向调用是否执行，以及目标 agent/工具是否正确启动。
3. 负向调用是否出现 TTSR interrupt。
4. interrupt 后是否没有下游 worker launch。
5. `nextTurn` reminder 是否在下一自然 turn 真正进入 session/message JSONL。

## 设计结论

TTSR 是早期、文本级、尽力而为的护栏；结构化 extension 是执行前、参数级的本地政策层。二者可以组合，但必须明确各自的证据范围和失败模式。需要严格字段存在性时，应把约束放进 schema，或让 hook 暴露 raw pre-validation input。
