# Magic Edit 实现演进与真实十二轮轨迹

> Source: can1357/oh-my-pi commits 009b48e82f00、5ace9b70d29f、a479eee49a2d；本机 v19.1.1 源码；本机会话 model_usage JSONL
> Collected: 2026-11-23
> Published: 2026-11-20 至 2026-11-23

## 三次实现的 commit 证据

### 2026-11-20：SEARCH/REPLACE 单轮补丁

Commit: https://github.com/can1357/oh-my-pi/commit/009b48e82f00c4ea24780ecb087864a5987e05c9

标题：`feat(edit): added the magic_edit mode for edits described in words`

commit message 要点：

> Added `edit.mode: magic_edit`: the edit tool takes one section of described changes per file, and an auxiliary model writes each file's patch as SEARCH/REPLACE blocks.
> Applied each file's blocks as one atomic replace batch before the native engine, with rejected batches returned to the model for up to three completions.

当时的 `magic-apply-system.md` 要求模型只回复 `<<<<<<< SEARCH` / `=======` / `>>>>>>> REPLACE` 块；任一块未匹配会拒绝整批。

### 2026-11-21：行号 JSON 操作

Commit: https://github.com/can1357/oh-my-pi/commit/5ace9b70d29f09555c55bd5b8da8237feee46715

标题：`feat(edit): made magic edits apply line operations to numbered files`

commit message 要点：

> Replaced the apply model's SEARCH/REPLACE replies with JSON line operations (delete, replace, sub, insert, move, swap, indent, dedent) compiled into one exact replace edit, so existing text is never retyped.

当时的操作形式包括：

```text
["delete", first, last]
["replace", first, last, "text"]
["sub", line, "old", "new"]
["insert", "before", line, "text"]
["move", first, last, "before", line]
["swap", first, last, first2, last2]
["indent", first, last, 2]
["dedent", first, last, 2]
```

这版使用行号，不是 hashline 的 `[PATH#TAG]` + `PUT N.=M:` 语法。作者公开 commit 没有写明为何没有直接采用 hashline。

### 2026-11-23：多轮内存草稿 replace 循环

Commit: https://github.com/can1357/oh-my-pi/commit/a479eee49a2d3711d7d928fd798e0dd8440cb8b0

标题：`feat(edit): applied magic edits through a draft tool loop`

commit message 要点：

> Replaced the one-shot JSON line operations (magic-lines.ts) with a multi-turn loop: the apply model runs replace, read and search against an in-memory draft, replies DONE or CANNOT, and the draft is syntax-checked and written atomically; failed replacements keep earlier successful ones.

> Views and read results show an `N│text` gutter instead of a tab; a replace whose old_string only misses because it copied the gutter or drifted in whitespace gets an error showing the exact draft lines, and one whose new_string is already present says so. Nothing is applied on a guess.

该提交删除 `magic-lines.ts`，新增 `magic-tools.ts` 与 `magic-calls.ts`。commit message 报告的基准为：

> Benchmark, 8 tasks x 2 runs, Terra caller: DeepSeek V4.1 Flash, Inkling 2 Mini and Gemma 4 26B 16/16, Mistral Nemo 12B 14/16, Gemma 3 12B 13/16, Llama 3.1 8B 2/16.

这些是作者对 apply loop 的公开基准结果，不能直接换算成本机模型的成功率。

## 当前源码中的 apply 工具与错误反馈

`magic-tools.ts` 提供：

- `read({start_line, end_line})`
- `search({query})`
- `replace({old_string, new_string, replace_all?})`

`missingAnchor()` 区分三类可定位错误：

1. `old_string` 误抄行号前缀：`findGutterMatch()` 找出对应文本并提示去掉 `N│`。
2. 仅空白不同：`whitespaceLead()` 找到唯一匹配并展示原草稿行。
3. `new_string` 已存在：报告它已经位于哪一行，避免重复修改。

因此「多轮 replace 更适合此循环」属于基于源码与 commit 演进的架构推断；作者没有公开声明「Magic 不用 hashline 的原因」。

## 真实十二轮调用：config-semantics.md

来源会话文件：

`~/.omp/agent/sessions/-code-inside-agc/2026-11-23T11-52-28-673Z_01a20840-1b01-755d-bb95-fcb04cf80694.jsonl`

调用链从 `parentId=0cb31e8c` 开始，至 `55580e15` 结束。`purpose=magic-edit`、`model=gpt-6-luna`。下表的「成功」依据是下一条 `model_usage` 继续推进，以及源码中只有成功 replace 才保留草稿；所有轮次的 `stopReason` 均为 `toolUse`。

| 轮次 | completion.reply 摘要 | 修改对象 |
|---:|---|---|
| 1 | `search({"query":"2026-11-20\n"})` | 搜索 Sources 日期 |
| 2 | `read({"start_line":3,"end_line":6})` | 读取元数据 |
| 3 | `replace(...)` | Sources 追加新来源 |
| 4 | `replace(...)` | Raw 追加新链接 |
| 5 | `replace("> Updated: 2026-11-20", "> Updated: 2026-11-23")` | Updated |
| 6 | `read({"start_line":97,"end_line":108})` | 工具表格 |
| 7 | `replace(...)` | 两行 tools.xdev 改为四行 tools.command |
| 8 | `replace(...)` | 插入 Status: Outdated 块 |
| 9 | `replace(...)` | 关键边界中的 tools.xdevDocs 改名 |
| 10 | `read({"start_line":184,"end_line":194})` | 查找 See Also |
| 11 | `read({"start_line":190,"end_line":200})` | 继续读取文末 |
| 12 | `replace("## See Also\n\n", ...)` | 插入两个新链接 |

工具最终返回：

```text
The change to wiki/omp-config/config-semantics.md did not finish within 12 turns; the file is unchanged.
```

`model_usage` 条目保留了每轮的 prompt（适用时）和 reply；完整 `messages` 与 tool results 没有保存在这些条目中。日志没有单独的「replace 成功」结果字段，因此不能声称逐轮看到了工具返回值；可以确认的是没有回复 `DONE`，第 12 轮仍为 `toolUse`。

## 当前错误分支的准确含义

本机 v19.1.1 `src/edit/magic.ts`：

```ts
const correction = prompt.render(applyFeedbackPrompt, feedback).trim();
if (turn === MAX_TURNS || correction === lastFeedback) {
    throw new ToolError(`The change to ${path} did not finish; the file is unchanged. ${correction}`);
}
lastFeedback = correction;
messages.push({ role: "user", content: correction, timestamp: Date.now() });
// loop 后：
throw new ToolError(`The change to ${path} did not finish within ${MAX_TURNS} turns; the file is unchanged.`);
```

有工具调用的轮次在执行结果后 `continue`。因此，真实日志中的 `did not finish within 12 turns` 对应循环结束兜底，只确认第 12 轮仍走工具分支、未提交 `DONE`；不能由此还原完整工具结果。

## 文件规模更正

`config-semantics.md` 在后续完成所有级联更新后为 199 行。早期对话把它说成 146/150 行，是当时对已修改文件的目测，不能作为失败时文件长度的可靠证据。新证据不依赖省略视图触发与否来解释此次失败。

## 重试对比

第二次输入删除 See Also 修改、明确元数据行号并给出完整四列表格。其 `model_usage` 显示最后一条 `completion.reply` 为 `DONE`，工具返回 diff。

两次差异可作为使用建议：长文件、多区域、多表格修改应拆分或明确位置。第一次逐轮 replace 是否全部成功、具体卡在哪一处，需要完整 tool results 才能进一步确认。
