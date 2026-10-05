# claude-quince 是 Bedrock Opus 4.8 的内部代号

> Source: 本会话多源调研（2026-10-05）
> Collected: 2026-10-05
> Published: Unknown

## 出处

`claude-quince` 出现在 OMP 状态栏：`served claude-quince · requested claude-opus-4-8`。公开网络零命中（web 搜索只找到法国真人 Claude Quince 和水果）。

## 证据链

**来源一**：`MING-ZCH/open-thinking-replay`（GitHub，2026-08-10 创建，21 stars）的 reproduction-log.md 明写：Anthropic thinking 签名的 protobuf 头 field #6 在 Bedrock（aws_third）路由绑定内部代号 `anthropic.claude-opus-4-8 → claude-quince`、`opus-5 → claude-honey`；原生 Anthropic 路由绑定公开模型 id。

**来源二**：`ptr.pet/cliproxyapi` 的 `internal/signature/claude_validation.go` 把这套 schema 实现成生产签名校验器：顶层 protobuf → Field 2 容器 → Field 1 通道块 → Field 6 即 `model_text`（字节型，`claude-` 前缀）；同文件记录 `channel_id`、`infra`（区分 aws=1 / google=2）与 envelope 随模型代际变化的规律。

**反方查询**：grep.app 全库 `claude-quince` 只命中 open-thinking-replay 一个仓库，无其他绑定。

## 含义

`served claude-quince` 的意思是：请求实际打到了 Bedrock 路径上的 Opus 4.8，模型没被换成别的东西，只是网关报的是路由侧代号。模型自称 Claude/Anthropic、否认 Kimi 的身份探针结果与此一致。

## 附带发现

`claude-honey` 绑定 Opus 5（同一来源）。Notion 代理项目里的 `opal-quince-medium` 是 GPT 后端的别名，与本案无关。
