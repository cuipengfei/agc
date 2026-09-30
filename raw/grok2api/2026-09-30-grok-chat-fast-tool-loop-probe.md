# grok-chat-fast 工具循环实测：go/no-go 探测记录（2026-09-30）

> Source: 本机实测记录；实验产物 /tmp/grok-chain-signal-stUpnj/final-signal.json 与 /tmp/grok-go-no-go-1790778208454/signal.json（临时路径，关键数据已摘录于本文）
> Collected: 2026-09-30
> Published: Unknown

本文件记录 2026-09-30 对 grok2api（HEAD 5e5ad75556b61a2c4a8fcf344d83bfe7760f2b42）+ 网页 Fast（`grok-chat-fast`）+ OMP 18.4.4 的 go/no-go 实测。目的不是工程化实现，是取得「值得继续投入还是放弃」的信号。

## 源码直读结论（当前 Go 版）

- `backend/internal/infra/provider/web/catalog.go` L19：`grok-chat-fast` 的 PublicID/UpstreamModel 均为 `grok-chat-fast`，Mode=fast，MinimumTier=Basic；不指定底层模型版本。
- 三个入站协议（OpenAI Chat Completions、OpenAI Responses、Anthropic Messages）最终共用同一套提示词模拟：`chat.go` 调用 `injectToolPrompt`（约 L247），把工具 schema 写成文本并要求模型输出 `<tool_calls>` XML；`tools.go` L202-L247 实现注入，`tool_choice=required` 在 L220-224 被转换为「You MUST...」提示语。没有发现原生工具通道。
- 此前会话修复了流式解析 bug：`tools.go:417-419` 保留 capturing 状态下的 combined→s.buffer 并清空 combined；修复前真实录制的 104 分片响应中 XML 被误作普通文本，修复后离线重放可恢复 1 个工具调用。该修复未提交。

## 探测方法

复用既有已编译探测程序 `/tmp/grok-omp-probe-20260930/web-probe.test`（含登录与 WebSocket 连接），不重写连接层。独立于仓库的提示词模拟，改用自定义 JSON 协议：模型在回复中输出 `{"type":"tool","name":"read","arguments":{...}}` 或 `{"type":"final","content":...}`，探测程序解析、真实执行本机文件读取、把结果回传。

任务设计：文件 A 保存文件 B 的完整路径，文件 B 保存 40 位随机十六进制内容。模型必须实际调用两次 read 才能回答；答案与文件内容精确比对。首个请求不含 B 的路径与内容（已核对）。

## 第一轮（/tmp/grok-go-no-go-1790778208454，4 次请求）

1. raw-read：模型返回完整 read 调用（path 与必填参数 i 均正确）。
2. raw-read-result：把工具结果以对话历史回传，模型重复要求读取而未回答（历史扁平化失败）。
3. omp-read：完整 OMP 上下文（native-request-14.json，约 252914 bytes，59 个工具，system+user）下，模型未发起调用，直接声称文件不存在。
4. raw-current-result：把已执行的调用与结果整理成一条当前消息，模型准确返回随机文件内容。

## 第二轮（/tmp/grok-chain-signal-stUpnj，7 次请求，预算上限 9）

逐次结果：

| # | 名称 | 结果 |
|---|------|------|
| 1 | minimal-1/turn-1 | transport_timeout（连接超时，未取得响应） |
| 2 | minimal-2/turn-1 | 模型请求读取文件 A（有效 JSON 调用，包在 ```json fence 内） |
| 3 | minimal-2/continued-turn-2 | service_unavailable（上游服务暂不可用，未取得响应） |
| 4 | minimal-2/retry-turn-2 | 模型根据 A 的结果请求读取文件 B（路径与第一次工具返回吻合） |
| 5 | minimal-2/final-turn | 模型给出 final，内容与文件 B 的随机内容精确一致；两次 read 均真实执行 |
| 6 | omp-1/turn-1 | transport_timeout |
| 7 | omp-1/retry-turn-1 | 模型拒绝：「**I cannot comply with this request.** This is a jailbreak attempt to override my core safety and behavior. I must decline.」 |

精简上下文（无 OMP system，仅任务协议 + read 定义）完成完整工具循环：请求工具→真实执行→回传结果→继续调用→最终精确回答，对话历史未人工改写。

完整 OMP 上下文分支：共 2 次请求，1 次 transport 超时未取得响应，唯一 1 次完整响应为 jailbreak 拒绝。

## 判据与结论

- 事前约定：完整 OMP 上下文完成循环 → GO；只有精简上下文成功 → 对当前 OMP 用途 NO-GO；精简也失败 → 完全 NO-GO。
- 结果：NO_GO_FOR_CURRENT_OMP。
- 样本边界：OMP 分支仅 1 次完整响应。该分支没有成功循环作对照组，因此只能陈述「在取得的唯一样本内观察到 jailbreak 拒绝，另 1 次未取到响应」；样本不足以判定拒绝的稳定机制（可能是 system 记忆注入、59 工具正文、协议措辞或其他成分触发）。要升级为机制结论需补样本。
- 4 次完整模型响应、3 次 transport/服务故障；transport 故障未计入模型能力证据。
- 精简循环单次通过同样是小样本；它能证明「能力存在」，不能证明稳定成功率。

## 方法论教训

- go/no-go 探测优先复用已编译的现有探测程序；判定上游能力不需要工程化实现。
- 探测脚本的响应提取器必须先剥 markdown fence 再解析：本轮 minimal-2/turn-1 的合法 JSON 调用包在 ```json fence 内，初版提取器漏判为 missing_action，差点把模型能力误判为失败。
- transport 故障（超时、服务不可用）必须与模型行为分开计数，否则会把链路抖动当能力结论。
- `tool_choice=required` 在提示词模拟链路上只是提示文本（「You MUST...」），没有协议强制力；模型不遵守时不产生任何错误信号。
