# Headroom 0.39.1 read-protection 命令白名单与 OMP 守卫实测交集

> Source: 本机 headroom-ai 0.39.1 site-packages 源码直读（~/.local/share/uv/tools/headroom-ai/lib/python3.13/site-packages/headroom/transforms/content_router.py）+ OMP 会话内 8 命令逐个实测
> Collected: 2026-09-27
> Published: 2026-09-27

## 命令白名单

`content_router.py` `_READ_VERBS`：

```python
_READ_VERBS = ("cat", "head", "tail", "nl", "bat", "less", "more")
```

`sed` 不在 `_READ_VERBS` 中，单独判断：

```python
is_read = prog in _READ_VERBS or (
    prog == "sed" and bool(re.search(r"(^|\s)-n(\s|$)", c))
)
```

完整白名单是 7 个动词 + `sed -n`（必须带 `-n` 标志），共 8 种命令形式。

## 明确排除的命令

`_is_read_command` docstring 原话：

> Search/list/test output (grep/rg/ls/find/pytest) is derived and stays compressible.

排除机制：

- 任何位置出现 `>`、`>>`、`tee`、`<<` → 判定为写，返回 False
- 裸 `sed`（无 `-n`）→ 流编辑器，不命中读取保护
- `grep`、`rg`、`ls`、`find`、`pytest` → 派生输出，不在白名单

## 命令提取：五种 harness wire shape

`_tool_call_command_text` docstring：

> Anthropic ``input`` is a dict ({"command": "grep …"}); OpenAI ``arguments``
> is a JSON string; Codex's shell uses a ``command`` list.

实际代码处理三种 shape：

1. `raw` 是 str → 尝试 `json.loads`（OpenAI JSON string）
2. `raw` 是 dict → 取 `command` 或 `cmd` 字段（Anthropic）
3. `cmd` 是 list → `" ".join(str(c) for c in cmd)`（Codex shell）

Codex code-mode `exec_command` 是第四种 shape：input 是 JS 代码片段，不是 JSON。`_custom_tool_call_commands` 用 `_JS_CMD_PROPERTY_RE` 正则从对象字面量 `{cmd: "sed -n '1,80p' f.py"}` 抠 `cmd` 属性的字符串值；抠不出来（变量拼接、模板字符串、方法调用）或遇到不解的转义（`\x61`、`\u0061`、八进制）时返回 `None`。调用方（`openai.py`）对 `custom_tool_call` 类型把 `None` 替换成哨兵字符串 `"exec_command(<cmd not a string literal>)"`，作为 `next` 的默认值。该命令不会传入 `_is_read_command`，但 `item_type == "custom_tool_call"` 的条件会登记该 `call_id` 进入 `read_command_by_call_id`。随后 `2291-2295` 的内容闸门判定是否保护：只有 `_read_output_should_be_protected(...)` 为真时才加入 `read_protected_call_ids`。

纯文本 agent 是第五种 shape：没有 `tool_use`/`tool_calls` block，命令在 assistant 消息的 fenced code block 里。`_fenced_shell_command` 用正则 `` ```(?:[\w.-]+)?[ \t]*\n(.*?)``` `` 抠第一个 fenced block 的 body。

## wrapper 剥离

`_SHELL_WRAPPERS`：

```python
_SHELL_WRAPPERS = frozenset({
    "rtk", "sudo", "env", "time", "nice", "ionice",
    "nohup", "stdbuf", "command", "timeout", "xargs",
})
```

`_bash_program` 剥掉这些 wrapper 后取真实程序名。`sudo cat f`、`timeout 30 cat f`、`rtk cat f` 都判定为读。

`sh`/`bash`/`zsh`/`dash` 特殊处理：找 `-c`/`-lc`/`-lic`/`-ic` 参数，递归进 `-c` 参数再判。`bash -lc "cat f"` 也判定为读。

## lockfile 不保护

`_LOCKFILE_RE` 匹配 18 种 lockfile 文件名：

```
bun.lock, bun.lockb, package-lock.json, npm-shrinkwrap.json, yarn.lock,
pnpm-lock.yaml, uv.lock, poetry.lock, Pipfile.lock, requirements.txt.lock,
Cargo.lock, go.sum, Gemfile.lock, composer.lock, flake.lock, Package.resolved,
gradle.lockfile, packages.lock.json
```

命中 lockfile → `_is_read_command` 返回 False → 不保护。docstring 解释：lockfile 是工具再生成产物，不会被逐字节 patch，不需要保护。

## 内容类型闸门

`_read_output_should_be_protected` docstring：

> Protection exists so the agent keeps EXACT BYTES of code it will patch.
> Because the code detector recognizes only a handful of languages, we do NOT
> gate on "is this SOURCE_CODE" (that would leave Ruby/C/SQL/… code — seen as
> PLAIN_TEXT — unprotected and lossy-compressed). Instead we PROTECT unless
> the content is a confidently non-code data type.

放行压缩的类型（`_RELEASABLE_READ_TYPES`）：

- `ContentType.JSON_ARRAY`
- `ContentType.SEARCH_RESULTS`
- `ContentType.BUILD_OUTPUT`（compiler/test/lint logs）
- `ContentType.GIT_DIFF`
- `ContentType.HTML`
- `ContentType.TABULAR`（CSV/TSV, tables）

固定宽度列（`/etc/fstab`、C `#define` 块）也保护。检测异常时保护（fail-close）。

## OMP 会话实测（kimi-claw/k2d8-preview）

在 OMP 会话里逐个执行 8 个白名单命令，测试文件 `/tmp/read-test.txt`（8 行，94 字节）：

| 命令 | OMP 行为 | 输出到模型？ |
|------|---------|-------------|
| `cat /tmp/read-test.txt` | 放行 | 是 |
| `head -5 /tmp/read-test.txt` | 放行 | 是 |
| `tail -3 /tmp/read-test.txt` | 放行 | 是 |
| `nl /tmp/read-test.txt` | 放行 | 是 |
| `bat /tmp/read-test.txt` | 命令不存在（rc=127） | — |
| `less /tmp/read-test.txt` | 拦截："Blocked: Use the `read` tool instead of cat/head/tail" | 否 |
| `more /tmp/read-test.txt` | 拦截：同上 | 否 |
| `sed -n '2,4p' /tmp/read-test.txt` | 放行 | 是 |

拦截发生在 OMP bash 工具守卫层，早于 headroom。被拦的命令输出不存在，headroom 的保护名单里自然也不会有。

OMP 对复合命令也拦截：`printf … > file && cat file` 整条以 cat 名义被拒；`printf … > file && echo` 被以"用 write 工具"名义拒。OMP 的拦截看整条命令行的形状。

## 本会话路由确认

本会话模型是 `kimi-claw/k2d8-preview`。用户确认 kimi-claw 不经过 8787。本会话内 headroom 未处理任何流量，OMP 实测结果与 headroom 保护行为无关。

## 结论

OMP 放行 cat/head/tail/nl/sed -n，这五种命令也命中 headroom 的 `_READ_VERBS` + `sed -n` 规则。两层守卫作用在不同环节：OMP 在 tool 执行层拦 less/more，headroom 在 LLM 请求路径上做读取检测。若输出经过 8787 且 `HEADROOM_PROTECT_READS=1`，这些命令会进入 headroom 的读取检测；最终是否保护仍由内容闸门决定（JSON/CSV/日志/diff/HTML 放行压缩，其余保护）。本会话 kimi-claw 不经过 8787，headroom 未参与。
