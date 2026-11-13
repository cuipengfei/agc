# roboomp 自托管 GitHub 维护流程：源码和会话记录

> Source: 本机 `can1357/oh-my-pi` 源码快照 `6e374adc76`；[robomp README](https://github.com/can1357/oh-my-pi/blob/6e374adc76/python/robomp/README.md)；[Issue #19164](https://github.com/can1357/oh-my-pi/issues/19164)；本会话网络查询
> Collected: 2026-11-13
> Published: Unknown（源码和会话取证记录）

证据区分：源码摘录说明所读版本的设计和实现；GitHub 评论是机器人报告；网络查询是本会话当时的观察。

## README：入口、任务和服务

来源：`python/robomp/README.md`。

> Self-hosted GitHub triage bot. Drives `omp --mode rpc` as a subprocess against a per-issue git worktree, then writes back to GitHub through a sidecar that holds the PAT.
>
> On `issues.opened` in an allowlisted repo it classifies the issue, labels it, and branches:
> - `bug` / `documentation` → reproduce, fix on a fresh branch, open a PR whose body has `## Repro` / `## Cause` / `## Fix` / `## Verification` and `Fixes #N`.
> - `question` → one comment [...] A follow-up comment or external close cancels the schedule synchronously.
> - `enhancement` / `proposal` → one comment, no PR.
> - `invalid` / `duplicate` → one brief comment.
>
> Follow-up issue comments and PR review comments resume the same omp session (`--continue` against the persisted JSONL transcript). On orchestrator restart, in-flight events are re-queued and resume the same way.
>
> Completed `workflow_run` events can also drive the default-off release sentinel: it diagnoses failed release CI in a reusable `main` worktree, atomically pushes the repair commit and existing release tag, then resumes the same session on the next verdict until every run and the GitHub Release are green.

> **robomp** — FastAPI + sqlite event queue + `WorkerPool` running `omp` in per-issue worktrees under `/data/workspaces/`. Holds the HMAC key, never the PAT.
> **gh-proxy** — sibling on an `internal: true` network. Holds `GITHUB_TOKEN`, verifies HMAC-signed requests from robomp, executes REST + `git push`. Only egress to `api.github.com`.
>
> Flow: webhook → HMAC verify → `github_events.route` → sqlite `events` (dedup on `X-GitHub-Delivery`) → `WorkerPool` claims under `BEGIN IMMEDIATE` with an in-process `_inflight` set per `(owner, repo, n)` → `sandbox.ensure_workspace` produces a worktree on `farm/<8hex>/<slug>` → `worker.run_task` spawns `omp --mode rpc` with `cwd=worktree`, persistent `session_dir`, model randomly drawn from `ROBOMP_MODEL` (CSV).
>
> The agent uses omp's built-in tools (`read`/`edit`/`bash`/`lsp`, scoped to the worktree) plus the host tools in `src/host_tools.py` — the exclusive surface for GitHub writes. Every host-tool invocation is audited into the `tool_calls` table with credential-redacted args and results.

README `Operational notes`：

> **One PR per issue.** Follow-up events push amendments to the same `farm/<hex>/<slug>` branch.
> **No PR without a recorded repro.** Persona prompt requires `repro_record`; `mark_unable_to_reproduce` asks for missing details, marks the row `needs_info`, and resumes the same session on the next reply.

## 源码：检查与权限

来源：`python/robomp/src/host_tools.py:1240-1263,1285-1324,2206-2270`；`src/prompts/host_tools.toml:35-45`；`src/prompts/system_append.md:61-86`。

`gh_push_branch` 调用 `_run_pre_publish_bun_fix` 与 `_run_pre_publish_bun_check`，再调用 `_guarded_push_branch`；`gh_open_pr` 额外调用 `_run_pre_publish_bun_test`。`_has_bun_script` 检查项目是否定义相应 script；未定义时对应检查不运行。`gh_open_pr` 检查四个章节标题和当前 issue 的 `Fixes`、`Closes` 或 `Resolves` 引用。格式化产生的修改可以并入机器人自己的 HEAD commit。推送还检查工作区是否干净、分支和 commit author 是否符合规则。

`host_tools.py:1315-1320` 按顺序调用 `bun run fix`、`bun check` 和 `bun run test`；测试调用前的注释：

> Last and slowest: the suite runs against the tree that is actually published, after the formatter amend, so a red PR cannot be created.

工具参数文案：

> `skip_checks`: Bypass `bun run fix` + `bun check` + `bun run test`. Use ONLY after verifying the failure exists on `main` and is NOT caused by your diff. When set, document in `## Verification` [...] Dirty-tree gate still runs.

任务提示对判断条件更具体：

> `skip_checks=true` [...] ONLY verified pre-existing default-branch breakage—same command/paths on clean default checkout, identical failure. NEVER bypass diff-caused, transient, or unclear failure [...] PR `## Verification` MUST name the bypassed gate and reason.

实现读取 `skip = bool(args.get("skip_checks", False))`，并把它传给检查函数；被跳过的检查写入 `tool_calls` 审计。对基线同一失败的核验以及 PR 中原因的具体内容属于提示词要求，`_build_open_pr` 不执行干净基线对照或检查说明是否充分。

外部 PR 审查：`src/prompts/system_append_pr_review.md` 写明只读审查、先获取 diff 和分类、暂存逐行意见、以 `submit_pr_review(event="COMMENT")` 一次提交；`host_tools.py` 中该工具实际调用使用 `event="COMMENT"`，`review_mode` 下推送与创建 PR 的 host tool 会拒绝。文档 `docs/pr-review-handoff.md` 说明由维护者决定下一步。此处未观察维护者实际逐行审查过程。

`src/prompts/system_append_pr_review.md:3-6`：

> Read-only PR review: NEVER edit files, commit, push, open a PR, approve, request changes, merge, or close.
> Side effects ONLY: `classify_pr`; staged `pr_review_comment` calls; one `submit_pr_review(event="COMMENT")`; ≤1 `gh_post_comment`, only when maintainer context required.

## #19164 当时的公开记录

来源：[Issue #19164](https://github.com/can1357/oh-my-pi/issues/19164)，2026-11-13 本会话抓取快照显示 `open`、`bug`、`prio:p2`、`agent`、`prompting`、`triaged`。

机器人在 2026-11-13 13:09:06Z 评论：

> Reproduced: a user-attributed `skill-prompt` with a long skill body and `details.args = "Explain why the moon appears brighter tonight"` renders in the advisor transcript as `[skill-prompt] [IMPORTANT: User invoked …] Detailed skill inst…`; the request is absent (`bun -e` repro exits 1). `session-history-format.ts:460-462` applies the generic 120-character preview before the template's trailing `User:` text.

机器人在 2026-11-13 13:27:31Z 评论：

> The fix is committed and pushed at [`farm/1b176ffa/fix-advisor-skill-user-text`](https://github.com/can1357/oh-my-pi/tree/farm/1b176ffa/fix-advisor-skill-user-text). The exact reproduction now includes the full `User:` request; focused tests (25) and `bun check` pass. PR creation is blocked by the required full `bun run test` gate: after rebuilding the stale native addon, 12 unrelated test chunks still fail, including offline TLA+ grammar downloads (`test/tools/ast-edit.test.ts`), a browser test stub missing `frame.page().mainFrame()` (`test/tools/browser-run-output.test.ts`), and a usage reset expectation (`test/usage-cli.test.ts`). `ovnfs` is unavailable here (`command not found`), so I cannot verify identical failures on a clean `main` checkout to justify bypassing the gate. No PR was opened; please provide a working isolated-checkout tool or resolve the main-branch gate failures.

同一快照中 13:28:07Z 评论为 “Issue closed. If bug recurs, reopen; I'll re-triage from scratch.” 这条评论与抓取时 issue `open` 状态分别记录。GitHub compare 查询显示分支有一条机器人提交 [`82a48562`](https://github.com/can1357/oh-my-pi/commit/82a48562)，提交说明 `Fixes #19164`。评论中的测试结果由机器人报告；本会话未重跑其测试或复核此后的合并状态。

## 部署和网络查询

源码根目录 `package.json`：

```json
"robomp:install": "pip install -e sdk/python/omp-rpc -e 'python/robomp[dev]'",
"robomp:build": "bun run pi:image && docker compose --project-directory python/robomp build",
"robomp:up": "docker compose --project-directory python/robomp up -d"
```

README 要求机器人账号对 allowlist 仓库有 Write，使用具有 Contents、Issues、Pull requests 读写和 Metadata 读取权限的 fine-grained PAT；release sentinel 额外需要 Actions 读取。Compose 配置将 `ROBOMP_REPLAY_TOKEN` 默认为空；Web 界面显示只有设置该 token 才能启用手动 triage 和 retry。源码安装、镜像构建与运行是仓库提供的入口，本会话未实际部署该服务。

部署入口依据：README `Setup` 要求配置 GitHub 凭据并构建、启动 Compose；README `Public URL` 与 `GitHub webhook` 写明：

> roboomp does not ship a tunnel. Cloudflare, smee, ngrok are all fine. The recommended ingress rule restricts the public hostname to `/webhook/github` exactly.
> In _Settings → Webhooks_: payload URL `https://…/webhook/github`, content type `application/json`, secret = `GITHUB_WEBHOOK_SECRET`.

`.env.example:97-103` 写明 `ROBOMP_MODEL` 使用单个模型 ID 或逗号分隔的模型池，格式为 `<provider>/<model>`，与挂入容器的 `models.container.yml` 配置相匹配。

2026-11-13 读取 `https://pypi.org/pypi/robomp/json` 与 `https://pypi.org/pypi/omp-rpc/json` 均得到 HTTP `404`。公共镜像是否存在未核查。

本会话向 `https://robomp.omp.sh/webhook/github` 发送 JSON POST：未提供签名头得到 HTTP `422`；带伪造 `X-Hub-Signature-256`、`X-GitHub-Event` 和 `X-GitHub-Delivery` 得到 HTTP `401`。README 描述 bad signature 返回 `401`。本机 DNS 查询曾返回 `198.18.1.203`；查询还返回 `rosa.ns.cloudflare.com.` 与 `beau.ns.cloudflare.com.`。GitHub Webhook 的实际配置、域名回源方式、服务所在云厂商和物理位置均未查证。
