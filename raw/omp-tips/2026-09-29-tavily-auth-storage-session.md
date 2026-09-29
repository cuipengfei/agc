# OMP Tavily 凭据设置的会话摘录

> Source: 2026-09-29 本会话的本机配置存在性检查、OMP 登录输出和只读回读结果；仅摘录不含密钥的部分
> Collected: 2026-09-29
> Published: 2026-09-29

## 设置前

- `~/.omp/agent/mcp.json` 的 `search-tavily` URL 带有 `tavilyApiKey` 参数；检查过程中没有输出参数值。
- `~/.omp/agent/agent.db` 的 `auth_credentials` 表没有 `provider = 'tavily'` 记录。当前会话核查时，`TAVILY_API_KEY` 也未在已检查的 OMP 环境来源中找到。

## 登录与验证

- 执行的命令：`omp auth-broker login tavily`。首次预先写入标准输入的尝试收到 `Login cancelled: stdin closed`；随后等待 `Paste your Tavily API key:` 提示出现再输入，命令完成。首次取消的内部原因没有得到验证。
- 第二次命令的脱敏状态输出：

```text
login_exit 0 prompt_seen true saved_message true timed_out false error_category none
```

- 对 `auth_credentials` 执行只读回读，并在内存中与现有 MCP URL 中的 key 比较。输出只含记录数和布尔结果：

```text
exit 0 check record_count 1
api_key_type True active True same_key True fields ['key', 'source']
```

- 新进程通过 OMP `AuthStorage.create(...)` 重新载入凭据后，`keys.source("tavily") !== undefined` 的结果为 `true`。没有输出密钥值。
- 本会话未发送真实 Tavily 搜索请求；Tavily 服务端是否接受该 key、当前额度及运行中 OMP 会话是否自动刷新凭据，均未验证。
- 本次执行记录中没有修改前备份 `agent.db` 的动作。AGC 工作树在凭据设置后保持干净；`agent.db` 未列入 AGC 的 `manifest.json`，其目录遍历也排除 `.db` 文件。
