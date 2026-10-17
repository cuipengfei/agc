# SOFA MCP 逐项 smoke test 记录

> Source: 2026-10-17 当前会话中已连接 SOFA MCP 的工具调用、返回结果及最终自有内容查询
> Collected: 2026-10-17
> Published: Unknown

## 用户授权与测试范围

> ok, lets give all of them a quick smoke test, see if work ok or not

> write to sofa is allowed, ok?

本轮暴露 25 个工具。下列 23 个实际调用成功，2 个未执行；这是接口调用覆盖记录，不是公开发布或长期网络稳定性证明。空列表属于有效读取结果。

## 逐项结果

| 工具 | 调用结果 | 观察与边界 |
|---|---|---|
| `sofa_connection_status` | 成功 | 返回连接和 publication policy，身份字段移除 |
| `sofa_guidance` | 成功返回 | `declared_digest: null`，`status: unknown`；未声明指引版本 |
| `sofa_attention` | 成功 | 返回 attention 数据 |
| `sofa_session_summary` | 成功 | 返回活动收据 |
| `sofa_my_posts` | 成功 | 最终返回本次五份私有草稿 |
| `sofa_tags` | 成功 | 返回标签清单 |
| `sofa_search` | 成功 | 查询相关 OAuth、连接错误及 smoke test 内容 |
| `sofa_get_post` | 成功 | 读取真实 Playbook 和 OAuth 帖子及回复 |
| `sofa_list_agent_leaderboard` | 成功 | 返回排行，未保留个人资料 |
| `sofa_pull_playbook` | 成功 | 返回有意应用的 activation Playbook 步骤 |
| `sofa_list_related_playbooks` | 成功 | 空列表有效 |
| `sofa_my_verifications` | 成功 | 当前 Agent 对目标帖的既有记录为空 |
| `sofa_ask` | 成功 | 创建 question 私有草稿 |
| `sofa_share_til` | 成功 | 创建 TIL 私有草稿 |
| `sofa_publish_blueprint` | 成功 | 创建 Blueprint 私有草稿 |
| `sofa_publish_playbook` | 成功 | 创建结构化 Playbook 私有草稿 |
| `sofa_reply` | 成功 | 对已读父帖创建私有 reply 草稿；公开回复未验证 |
| `sofa_get_draft` | 成功 | 读取本次 question 草稿，版本 1 |
| `sofa_revise_draft` | 成功 | `expected_version_number: 1`，修改标题后返回版本 2 |
| `sofa_vote` | 成功 | 对已读并判断有用的 Playbook 投票 +1 |
| `sofa_verify_post` | 成功 | 实际应用现有 activation 指引后提交 `worked_as_written` |
| `sofa_lookup_external_link` | 成功 | 查询外部答案的已有证据 |
| `sofa_verify_external_link` | 成功 | 实际运行答案示例后提交 application `worked_as_written` |
| `sofa_edit_post` | 未执行 | 没有可授权编辑的自有 canonical post |
| `sofa_delete_post` | 未执行 | 没有本次创建且可授权删除的自有 canonical post |

## 内容生命周期

本轮 `publication_policy: draft_directly`。question、TIL、Blueprint、Playbook、reply 各创建一份私有草稿；最终查询中的共同字段是 `lifecycle_state: draft`、`draft_kind: new`、`target_post_id: null`。

总计五份草稿保留，未公开发布。私有草稿 ID 与 canonical post ID 不可混用。本轮工具清单没有私有草稿删除或批准工具；官方指引提供由人类在 My Agents 审核、批准、拒绝或删除的方式。真实草稿、帖子、verification、Agent 和 session 标识未收入本记录。

## 真实反馈的前置证据

- 对 activation Playbook，先读取内容并查询既有 verification，再核对当前项目指引已覆盖 session、attention、search、vote、verification、publication policy 与宿主凭据保管，实际执行相应流程后提交 native verification；未为此次测试编辑项目指引。
- 外部答案为公共链接 https://stackoverflow.com/a/12944035 。网页读取返回 403 后，经 StackExchange API 的 `withbody` 接口取得完整答案。实际运行 `json.loads` 与 `json.dumps(parsed, indent=4)` 的嵌套 JSON 示例，检查四空格缩进、roundtrip、null、float 与 int 类型，再提交 application 结果。没有提交 currency 评估。
- 投票、native verification、external verification 各成功写入一次。它们是实际外部反馈；草稿创建不会撤销这些反馈。

## 验证边界

本轮 SOFA 工具调用没有出现错误；guidance 的 `unknown` 状态按原值保留。23 个成功调用只覆盖当次请求与上述对象状态。公开帖编辑、删除、草稿批准后发布、公开 reply 挂接、持续连接稳定性均未由本轮测试证明。原生 OAuth 与网络的其他成功、失败条件另见本次对应原始材料。
