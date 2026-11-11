# Copilot Fusion：effort 档位、按计划可用性与计费
> Sources: GitHub Docs《About GitHub Copilot Fusion》, 2026-11-10 抓取; GitHub Changelog《Route and orchestrate models with GitHub Copilot Fusion》, 2026-10-28; 本机 `/auto` 与 `/models` 实测, 2026-11-10; 本机网关扣费核验, 2026-11-11
> Raw: [copilot-fusion-ga-effort-levels](../../raw/ai-coding-agents/2026-10-28-copilot-fusion-ga-effort-levels.md); [auto-routing-response-probe](../../raw/ai-coding-agents/2026-11-10-auto-routing-response-probe.md); [copilot-fusion-discount-live-verification](../../raw/ai-coding-agents/2026-11-11-copilot-fusion-discount-live-verification.md)
> Updated: 2026-11-11

## Overview

Copilot Fusion 在 2026-10-28 转为正式可用。它把 Project HydraFusion 的多模型编排与 Auto 的模型选择合并成一个产品面：用户在模型选择器里选中 Fusion 与一个 effort 档位，具体用哪个模型、走哪种执行模式由服务端在请求时决定。Fusion 本身不单独收费，按被调用模型的标准价计费，付费计划在 2026-11-30 之前享受模型费用 30% 折扣。

## Fusion 在选择器里代表什么

选中 Fusion 时，被选中的是一套运行时路由与编排系统，模型由系统挑选。官方表述是 "You select Copilot Fusion in the model picker, but you aren't selecting a specific model."。

每个请求会独立决定执行模式、推理强度和参与模型，同一会话里的不同提问可以走不同模式。路由沿着缓存边界与对话复杂度发生大幅变化的位置进行，目的是避免为缓存付出额外费用却换不到质量提升。系统还会参考实时健康状况与可用性来挑选模型。

Fusion 没有自己的上下文窗口，每一步都在实际执行模型的上下文上限内运行；选择器里显示的 Fusion 上下文长度取其所用模型中最小的那个值，属保守值。

## 三种执行模式

| 模式 | 模型调用结构 | 代价 |
|---|---|---|
| Single | 一个模型直接完成任务 | 与单模型请求接近 |
| Cascade | 便宜模型起草，judge 检查草稿并决定接受或升级到更强模型 | 含评审调用，耗时更长 |
| Critique | 一个模型起草，多个模型并行独立评审，汇总反馈后由原模型修订 | 含多路评审调用，耗时更长 |

官方明确 Fusion 只在任务值得时增加模型调用，简单任务不会为一次不需要的评审等待或消耗 AI credits。中间草稿可能被修改或丢弃，最终只呈现结果。

## 四个 effort 档位

| 档位 | 优先目标 | 典型用途 |
|---|---|---|
| Fusion Standard | 在成本、质量、延迟之间平衡 | 日常工作；每个任务选一个模型 |
| Fusion High | 有节制的编排，节省部分 token | 范围明确的大任务，例如修复复杂缺陷或跨多个文件改动 |
| Fusion Max | 尽可能强的能力，同时考虑 token 效率 | 需要最深推理与最完整分析的任务 |
| Fusion Fast | 仅在需要快模型的场景使用 | 用户不可选，只在 VS Code inline chat 中可用 |

Fusion High 与 Fusion Max 可以在一个任务里使用不止一个模型，因此同一任务消耗的 AI credits 可能高于 Standard。

Response 生成后，把鼠标悬停在回复下方的档位名上，可以看到本次实际用到的模型列表。

## 按计划的可用性矩阵

| 档位 | Free | Student | Pro | Pro+ | Max | Business | Enterprise |
|---|---|---|---|---|---|---|---|
| Fusion Standard | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Fusion High | ✗ | ✗ | ✗ | ✓ | ✓ | ✓ | ✓ |
| Fusion Max | ✗ | ✗ | ✗ | ✓ | ✓ | ✓ | ✓ |
| Fusion Fast | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

Fusion Standard 在所有计划可用。Fusion High 与 Fusion Max 需要 Pro+、Max、Business 或 Enterprise，Free、Student、Pro 拿不到这两档。Fusion Fast 虽然全计划标记为可用，但用户无法主动选择，只在 VS Code inline chat 内部使用。

Fusion 已正式可用的客户端：Visual Studio Code、Copilot CLI、GitHub Copilot app、JetBrains IDEs。

## 在 VS Code 里的使用路径

1. 把客户端更新到包含 Fusion 的版本。
2. 打开 Copilot Chat。
3. 在输入框上方的模型选择器里选 **Copilot Fusion**。
4. 选择 effort 档位：Standard、High 或 Max。
5. 正常提问。回复生成后悬停档位名，可查看本次用到的模型。

折扣在服务端出账时生效，模型选择器与 GitHub 设置里都没有需要手动开启的开关，也没有兑换码。

## 计费与 30% 折扣

- 2026-11-30 之前，付费计划用户在使用 Fusion 时享受模型费用 30% 折扣。文档把这条写在内嵌 `<!-- expires 2026-11-30 -->` 注释里，说明是限时条款。
- 2026-11-11 本机实测折扣真实入账：经 copilot-api 网关附 Fusion session token 的请求，`gpt-6.1-sol` 与 `gpt-6-luna` 的 input、output、cache read、cache write 四分项单价均为目录价的 70%，`long_context` 档同折；分项之和与上游 `total_nano_aiu` 逐条一致。见下节。
- 对照链：`/auto` 响应的 `discounted_costs: {"gpt-6-luna": 0.1}` 与 Auto 10% 实际入账（目录价 90%）一致；Fusion 选择响应没有 `discounted_costs` 字段，30% 的证据链是官方条款加四分项 0.7 比例实测。
- Fusion High 与 Fusion Max 可能为一个任务调用多个模型，credits 消耗高于 Standard。
- Fusion 尽量让主对话停留在同一个模型上，以继续命中缓存；承担评审等辅助角色的模型只拿到它需要的那部分上下文。

## 本机网关的折扣实测（2026-11-11）

第三方网关 copilot-api 实现了 Fusion 30% → Auto 10% → 原价的降级链后，用实例 SQLite 用量库逐分项核验了真实扣费：

- 重启进新代码后的 13 分钟窗口内，`gpt-6.1-sol` 7 条、`gpt-6-luna` 6 条计费记录实际费用均为目录价 70%（如 Sol input 200→140、Luna input 10→7 AIU/百万 token），`gemini-4-argon` 10 条原价。
- 全天 938 条计费记录中：10% 与 30% 按时间单向演化、零交错——两模型的 10% 记录全部在 30% 记录之前，Fusion 缓存取得后无回退，新代码生效后 10% 记录为 0。
- 不在折扣链内的 `gemini-4-argon` 全天原价，说明折扣只作用于链内来源。

## 选择器里没有 Fusion 或没有 Fusion Max 的原因

Fusion 只从你的计划允许、且未被管理员策略排除的模型里挑选。被排除的情形有四类：计划里没有该模型、被管理员策略禁用、被数据驻留或 FedRAMP 合规策略限制、被评测模型策略限制。当 Fusion 需要的模型全部不可用时，Fusion 整个条目不出现；只有 Fusion Max 需要的模型中某一个被禁用时，表现是 Fusion Max 不可选。

企业管理员可以查看 Fusion 会从哪些模型里挑选，可以单独设置某个模型对 Fusion 的策略状态，也可以只对 Fusion 禁用某个模型而不影响其他人使用该模型。管理员还能把某个档位的 Fusion 设为默认模型。

## 本地模型的 Standard 档位限制

这是 public preview 功能，需要开启 experimental。Windows 上可在 Copilot CLI、Copilot app 或 VS Code 里安装 MAI Code 1.1 Flash；Copilot CLI 里装好的 Qwen3.8 Flash Next 被识别为 `qwen3.8-flash-next-local` 时也可参与，跨 Windows、macOS、Linux 支持。本地模型只在 Fusion Standard 档位可能被选中。

开启方式：Copilot app 在设置 Experimental 分区打开 **Local model auto routing**；Copilot CLI 用 `--experimental` 启动，或在交互会话里执行 `/experimental on`。

## 限制

- Fusion 与 subagent 分开工作，不会启动 subagent。
- 被丢弃的草稿已在工作区做过的修改（例如文件编辑）不会自动撤销，提交前需要自行检查。
- 执行模式与模型池会随时间变化。

## 证据边界

- 厂商自报指标：在 Artificial Analysis Coding Agent Index 中 Fusion Max 得 60，与 Claude Code with Opus 5.5 Max 相差两点以内，平均每任务 API 成本约为其一半，token 用量约为一半，耗时少约 40%。这些数字来自 GitHub changelog，未附逐任务明细。
- Fusion 折扣后扣费已经第三方网关实测入账（2026-11-11，含四分项与长上下文档）；VS Code 客户端内侧的实际计费仍未验证。
- Fusion 的 effort 档位与既有上游 `/auto` 的 tier 取值（efficiency、balance、intelligence、fast）是否同一套编码，官方未说明，未验证。
- Auto 是否仍与 Fusion 并列存在于模型选择器，未确认。

## See Also

- [Copilot 的决策路由端点与 Auto／HydraFusion 边界](copilot-decision-routing.md)
- [OpenAI Decisions API：GA 状态、请求格式与 GitHub Copilot 后端探测](openai-decisions-api.md)
- [本机 `/auto` 路由实测：响应字段与策略参数](../../raw/ai-coding-agents/2026-11-10-auto-routing-response-probe.md)
