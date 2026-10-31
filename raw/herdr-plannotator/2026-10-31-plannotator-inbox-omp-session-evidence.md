# 本机接通 Inbox 的实测记录（OMP）

> Source: 本机会话实测，2026-10-31；数据目录 `/home/cpf/.plannotator`，二进制 `/home/cpf/.local/bin/plannotator`，OMP 插件 `@plannotator/pi-extension` 0.28.42
> Collected: 2026-10-31
> Published: Unknown

## 起始状态

- `plannotator --version` → 0.28.42。
- `plannotator inbox status --json` → `state: never_started`、`running: false`，退出码 1；`~/.plannotator/inbox/` 不存在。
- `~/.plannotator/config.json` 6 个键：`diffOptions`、`reviewAnalysis`、`conventionalComments`、`favicon`、`theme`、`agentTool`；没有 `inboxTool`。
- `~/.omp/agent/.env` 有 `PLANNOTATOR_AGENT_TOOL`，没有 `PLANNOTATOR_INBOX_TOOL`；权限 600。
- OMP 插件包：`~/.omp/plugins/node_modules/@plannotator/pi-extension`，版本 0.28.42；`~/.pi/agent/npm/node_modules/@plannotator/pi-extension` 同为 0.28.42。
- 本会话开始时的 `plannotator` 工具只有 `annotate`、`review`、`last`、`list`、`close`，没有 `plannotator_inbox`。

## 两处开关的改动与验证

- `~/.plannotator/config.json` 新增 `"inboxTool": { "pi": true }`。
- `~/.omp/agent/.env` 追加 `PLANNOTATOR_INBOX_TOOL=1`，权限保持 600；用 `dotenv` 16.6.1 的 `parse` 复核，`PLANNOTATOR_INBOX_TOOL=1`，共解析出 9 个键。
- 用扩展自带的 `resolveInboxTool` 实测：env 分支 `true`，config 分支 `true`。
- 插件把 OMP 归入 `pi` 主机（`resolveInboxTool(config, env, "pi")`）。

## Inbox 首次启动

- `plannotator inbox --background` → 地址 `http://localhost:42583/`，pid 88355，版本 0.28.42。
- 启动后 `~/.plannotator/inbox/inbox.json` 存在；`plannotator inbox status --json` 显示运行中。

## stdio MCP 通道

- 命令：`/home/cpf/.local/bin/plannotator inbox mcp`，工作目录 `/home/cpf/code-inside/agc`。
- `initialize` 成功；`tools/list` 返回 8 个工具：`send_message`、`read_thread`、`search`、`resolve_message`、`wait_for_reply`、`get_guide_brief`、`submit_guide`、`card`。
- 第 1 次 `send_message`（带 `idempotency_key`、`agent_name`、`agent_host`）：返回线程 `msg_01M68ZCEVYAN63X8WXD7MTQZTY`，项目 `agc`，问题 `q-3e2e477c`；链接 `http://localhost:42583/#thread=msg_01M68ZCEVYAN63X8WXD7MTQZTY`。
- `wait_for_reply`（`thread_id` 为该线程，`timeout_seconds: 50`）首次返回 `status: waiting`、`cursor: 3`；带 cursor 循环等待后取得答复。
- 第 2 次发送（`thread` 命名 "Inbox 接通实测"）：问题线程 `msg_01M68ZKWZK8HY4XY9YJCB6RBS5`，问题 `q` 状态 `open`；附件线程 `msg_01M68ZKWZZAQFJNAWFAWZB02SA`，附件 `wiki/herdr-plannotator/plannotator-omp-plugin-mechanism.md`，kind `markdown`，8001 字节。
- `resolve_message` 归档第 1 个线程，返回 resolved。
- `read_thread` 复核：新线程 2 条消息、1 个开放问题、1 个 markdown 附件。
- 同一会话后段，`plannotator_inbox` 工具出现，`read_thread` 调用成功，读到人物对规则问题的答复「先不写」。

## Board（卡片）

- `card list --anyone --json` → `{ project: null, cards: [], total: 0 }`；文本输出：`No cards: the Inbox has never had a message from this folder's project.`，退出码 0。
- 二进制内 `runCardCall` 在项目缺失时对 `create`、`move`、`say`、`link`、`ship`、`drop` 统一抛错：`card_no_project: This folder's project has no Board yet: the Inbox has never had a message from it. Send one with send_message first, or pass the project_path of a project the Inbox knows.`
- 发出第一条消息后项目 `agc` 建立，`card create` 成功：`crd_01M69598X3N03BCJ5T8RM7Y1CF`，列 `your_look`，链接线程 `msg_01M68ZKWZK8HY4XY9YJCB6RBS5`，幂等键 `board-inbox-connect-v1`。
- `card list --anyone` 复核显示 1 张卡。
- 读到答复后 `card ship crd_01M69598X3N03BCJ5T8RM7Y1CF` 成功。
- `card list` 行里记录的 agent 身份显示为 `Pi`（OMP 继承 Pi 会话标识）。

## 仓库盘点（同一轮 Board 填充）

- 开放 PR：`cuipengfei/agc`，`is:pr is:open` 返回 0。
- 分支：`autoresearch/session-20261025`、`workspace-1`，相对 `master` 各领先 0 个提交。
- 工作区有未提交改动：`omp/agent/config.yml`、`tuios/config.toml`。
- 无 worktree（只有主工作区）。

## 未验证

- 浏览器界面未实际点击；通知、铃声、标注工具栏的行为来自源码与官方文档。
- 新会话中 `plannotator_inbox` 是否自动注册、回复是否自动投递到 OMP 会话，未验证。
