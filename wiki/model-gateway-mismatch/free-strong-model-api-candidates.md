# 免费强模型 API 候选与尝试排序

> Sources: AIHubMix；速语 API；AnyRouter；Eachof；iFlow 社区；QuickRouter.AI；ChatAnywhere；FreeTokenRouter；Kilo Gateway；APIDock, 2026-09-02
> Raw: [免费强模型 API 候选公开资料摘录](../../raw/model-gateway-mismatch/2026-09-02-free-strong-model-api-candidates.md)
> Updated: 2026-09-02

## Overview

本页把公开资料中同时出现“免费注册或签到”和前沿模型名称的服务整理为尝试候选，并按证据完整度、免费规则清晰度和强模型匹配度从高到低排序。排名只表示优先尝试顺序，不表示服务稳定性、模型真实来源或数据安全已得到验证；本轮没有登录、创建 API key 或付费。

## 排名

### 1. AIHubMix：首选

- 页面声称无需信用卡、无试用到期，并提供 `gpt-5.5-free`、Gemini 3 等模型。
- `gpt-5.5-free` 页面明确写出每分钟 5 次、每天 500 次、每天 1 million tokens。
- 适合先验证 GPT-5.5 API 和 OpenAI-compatible 接口。
- **注意：Status: Disputed**。同一组页面一处称免费模型长期可用，另一处称新用户只赠送 10 次、充值后解锁更多额度。实际免费期限和额度应以登录后的控制台为准。

### 2. 速语 API：强模型覆盖好，额度待实测

- 页面声称 GitHub 登录即可获得免费 API key，无需付费。
- 明确列出 `gpt-5.5`、`claude-sonnet-4-6`、`gemini-3.5-flash` 等模型，并声称每天提供免费配额。
- 页面摘录显示 GPT 系列 50 次/天、Claude 系列 30 次/天、Gemini 系列 100 次/天。
- 未登录验证这些额度是否对所有账号、地区和模型实际生效。

### 3. AnyRouter：注册赠额明确，签到和模型状态不完整

- 官方文档声称注册即送 `$50`，无需信用卡、无需付费。
- 主要面向 Claude Code，并提供 API 令牌接入说明。
- 公开资料提到每日签到，但官方页面未充分确认当前签到金额、完整模型列表和持续可用性。

### 4. Eachof：有每日签到，具体额度未知

- 页面展示 GPT-5.5、Claude 4 和 Gemini。
- 页面声称每天签到可领取免费额度，并可能有模型限免和 Token 空投。
- 没有确认固定签到金额、模型配额或无需支付方式的完整规则。

### 5. QuickRouter.AI：可低成本试跑，但不是签到型

- 页面声称注册赠 `$0.2` 体验额度，并列出无需绑定信用卡。
- FAQ 举例使用 `claude-sonnet-4-6` 或 `gpt-5.4-mini` 进行测试。
- 这是一次性注册试用，不是每日免费额度；适合只做连通性验证。

### 6. ChatAnywhere：免费规则清楚，但免费 GPT-5 被官方降级评价

- README 声称免费版每天 `10000` 点额度，GPT-5 系列一天 5 次。
- 免费 key 限个人非商业用途、教育和非营利性科研工作。
- **不作为强模型首选**：README 明确警告免费 GPT-5 系列推理能力较弱，需要更强推理能力时购买付费 API。

### 7. HCNSEC 公益网关：签到线索明确，但只有社区证据

- 社区帖子声称提供免费 GPT、Claude、Gemini 接口、注册赠额度和每日签到。
- 帖子显示注册送 `29200` 额度。
- 当前证据来自 iFlow 社区帖子，不是服务方官方文档；不应把额度和稳定性当成已确认事实。

### 8. FreeTokenRouter：注册额度线索明确，模型映射不足

- 页面摘录声称注册立即获得 `1 million` 免费 Token，并称无需信用卡、无需付费。
- 本轮没有确认准确的强模型 ID、每日重置规则和服务稳定性。

### 9. Kilo Gateway：永久免费模式存在，但强模型不在免费层已确认

- 页面同时展示 Claude Opus 4.8、Claude Sonnet 4.6、GPT-5.5 和 Gemini 3 Pro。
- Free 模式写作 `$0/永久`，但具体说明只是访问默认免费模型。
- 未确认上述旗舰模型属于免费层，因此不满足“明确免费强模型”的硬条件。

### 10. APIDock：可尝试前沿模型，但只是注册试用

- 页面声称注册赠 `$1`，可以尝试 Claude、GPT 和 Gemini 最新模型。
- 按实际 Token 用量计费，没有发现每日签到或长期免费配额说明。
- 适合短暂测试，不适合当作长期免费入口。

## 建议尝试顺序

先试 AIHubMix，再试速语 API；如果二者实际额度或模型不可用，再试 AnyRouter 和 Eachof。QuickRouter.AI 适合只验证 API 连通性。ChatAnywhere、Kilo Gateway 和 APIDock 不应列入“免费强模型稳定方案”；HCNSEC 与 FreeTokenRouter 需要先补充官方证据。

## 证据边界

- “支持某模型”只表示公开页面列出该模型名，不等于已证明上游就是该模型。
- “无需信用卡”只按页面声明记录，未做注册流程验证。
- 未记录任何 API key、token、cookie、账号或支付信息。

## See Also

- [JustWoker `/v1/messages` 实测行为](justwoker-v1-messages-observed-behavior.md) — 兼容网关返回模型字段与 usage 的实际观测。
- [开源 Harness 与托管推理不是一回事](../ai-coding-agents/open-harness-vs-hosted-inference.md) — 区分客户端、托管推理和 provider 路由。
