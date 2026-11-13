# roboomp：自托管 GitHub 维护流程

> Sources: can1357/oh-my-pi 源码快照 `6e374adc76`，2026-11-13；can1357/oh-my-pi Issue #19164，2026-11-13；本会话网络查询，2026-11-13
> Raw: [roboomp 源码与会话证据](../../raw/software-factory/2026-11-13-roboomp-self-hosted-factory.md)
> Updated: 2026-11-14

## 定位与运行过程

`roboomp` 是仓库内的自托管 GitHub 维护服务，使用 OMP 执行 Issue 分拣和修复，也审查外部 PR。按照[软件工厂判据](ai-software-factory-landscape.md)，它提供事件输入、固定处理流程和发布检查，可以归为软件工厂的一个实例；这是根据所读工作流作出的归类。

GitHub Webhook 将事件发送给服务，服务验证签名并按照事件类型路由，SQLite 队列按 delivery ID 去重。Worker 按仓库和 Issue 或 PR 的条目编号串行处理任务，准备独立 Git worktree，在其中启动 `omp --mode rpc`；后续 Issue 评论或 PR Review 评论可以恢复已有 OMP 会话。服务重启时，进行中的事件会重新进入队列并恢复会话。

推荐的 Compose 架构包括两个容器：`robomp` 负责事件、队列和 OMP 子进程；`gh-proxy` 保存 GitHub PAT，验证来自 `robomp` 的 HMAC 请求并执行 GitHub API 操作与 `git push`。Host tool 的调用参数和结果经凭据遮蔽后写入 `tool_calls` 审计表。此处描述的是仓库提供的部署设计。

## Issue 工作流

机器人先搜索已有问题并分类：

- `bug` 与 `documentation`：报告调查、记录复现、定位原因、修改并验证，提交分支后创建 PR。复现失败时请求补充信息。
- `question`：回复问题；按配置等待一段时间后可以自动关闭，后续评论会取消关闭计划。
- `enhancement` 与 `proposal`：讨论建议；维护者尚未授权实现时不创建 PR。
- `invalid` 与 `duplicate`：简短解释分类结果。

工作区使用 `farm/<8hex>/<slug>` 分支。PR 正文要求 `Repro`、`Cause`、`Fix`、`Verification` 四个章节，以及关联当前 Issue 的关闭关键词。后续意见可以恢复会话，并更新同一分支。可选的 release sentinel 默认关闭；启用后可以处理 GitHub Actions 的 `workflow_run` 结果并修复发版失败。

## 分支与 PR 检查

| 入口 | 项目定义对应 Bun script 时执行 | 其他检查 |
|---|---|---|
| `gh_push_branch` | `bun run fix`、`bun check` | 工作区干净、工作分支和 commit author 符合要求 |
| `gh_open_pr` | 上述检查，加上完整 `bun run test` | PR 正文包含四个章节与关联 Issue 的关键词；执行相同的推送检查 |

格式化产生的修改可以并入机器人自己的 HEAD commit；完整测试在格式化后执行。项目没有定义相应 script 时，对应 Bun 检查不运行，所以将服务用于其他仓库时需要核对项目的实际检查入口。

`skip_checks=true` 会跳过上述 Bun 检查，工作区干净等推送检查仍会执行，跳过操作写入审计。提示词要求机器人在干净的默认分支上运行相同命令并确认相同失败，确定故障早已存在且与自己的修改无关后，才能使用该参数，并在 PR 的 `Verification` 中说明。**这是提示词规则**：`gh_open_pr` 的实现接受该参数并执行跳过，没有自行完成基线对照或判断说明内容是否充分。

## 外部 PR 与人工决策

外部 PR 审查任务获取 diff、分类并暂存逐行意见，然后提交一次 `COMMENT` 类型 Review。审查任务的 host tool 拒绝推送和创建 PR；审查提示要求 agent 保持只读，禁止批准、合并或关闭。维护者决定下一步。本次调查没有观察维护者实际逐行审查的过程。

## Issue #19164 的历史处理记录

2026-11-13 抓取的 [Issue #19164](https://github.com/can1357/oh-my-pi/issues/19164) 中，机器人报告已经复现 advisor 丢失技能调用附带文本，并推送修复分支，其提交为 [`82a48562`](https://github.com/can1357/oh-my-pi/commit/82a48562)。机器人报告 25 项定向测试与 `bun check` 通过；完整 `bun run test` 有 12 个失败的测试块。由于环境缺少 `ovnfs`，机器人报告无法在干净 `main` 上确认相同失败，因而当时没有豁免检查，也没有创建 PR。

机器人随后评论 “Issue closed”，同一次抓取的 Issue 状态显示 `open`。两项分别是评论内容和 GitHub 状态。本会话没有重跑机器人报告的测试，也未核查该修复此后的合并状态。问题根因见 [Advisor 上下文标记](../omp-config/advisor-context-markers.md)。

## 自行部署与公开入口

仓库提供从源码安装 `robomp` 与 `omp-rpc` 的 `bun run robomp:install`，以及本地构建镜像和启动 Compose 的命令。部署者需要准备服务器、模型访问、GitHub 账号权限和 Webhook 入口。机器人账号需要目标仓库的 Write 权限；PAT 需要对应仓库内容、Issue 和 PR 的读写权限。手动 triage 和 retry 还需要设置 `ROBOMP_REPLAY_TOKEN`。

2026-11-13 查询 PyPI 的 `robomp` 和 `omp-rpc` JSON 接口均返回 `404`；公共镜像是否存在未核查。本会话没有自行部署服务。

当日对 `https://robomp.omp.sh/webhook/github` 的无签名 POST 收到 `422`，带伪造签名头的 POST 收到 `401`，后者与 README 描述的验签失败响应一致。GitHub 实际 Webhook 配置、域名回源方式和服务所在机器位置尚未查证。本机 DNS 曾返回 `198.18.1.203`，该结果不用于判断源站地址。

## See Also

- [AI Software Factory 概念与真工厂短名单](ai-software-factory-landscape.md)
- [Factory Gate 参照标准](factory-gate-reference.md)
- [Advisor 上下文标记](../omp-config/advisor-context-markers.md)
