# Magic Edit 源码与本机运行取证

> Source: 本机 `@oh-my-pi/pi-coding-agent` 19.1.1 的 `src/edit/`、`src/prompts/tools/magic-edit.md`；本机会话配置读取与临时文件实测
> Collected: 2026-11-23
> Published: 2026-11-23

## 两种 edit 模式的工具说明

### hashline

来源：`src/edit/hashline-compact.md`。

```text
Hashline patches. Use only lines visible in latest `read`/`search`; elisions are unseen.

*** Begin Patch
[PATH#TAG]
PUT 3.=3:
+replacement
*** End Patch
```

`TAG` 是 4 位十六进制快照；`PUT N.=M:` 替换包含两端行号的范围。规则原文要求：

> Re-read after each edit: tag/numbers change. Touch only changed lines; split nonadjacent changes. Additions use gaps. Ranges never start/end mid-expression/block.

### magic

来源：`src/prompts/tools/magic-edit.md`。

```text
Edit by description.
Per file: `# path`, then one `- ` bullet per change, multiple files batch.
- Bullet: site (line #, class/fn identifier nearby, short substr) + op (what to do?)
- Check the returned diffs; resend a failed file, more exact.
```

两种 schema 都只有 `input: string`，见 `src/edit/schemas.ts`：

```ts
export const hashlineEditParamsSchema = type({
    input: "string",
});

export const magicEditSchema = type({
    input: type("string").describe("One section per file: the file, then the changes to it in words."),
});
```

## apply model 的选择

来源：`src/edit/magic.ts` 与 `src/edit/settings.ts`。

`edit.magic.model` 可写模型或角色选择器。未设置时，`resolveApplyModel()` 使用：

```ts
const configured = cfgEditMagicModel(session.settings);
if (!configured || configured === "auto") {
    const resolved = await resolveRole("smol", session.settings);
    if (resolved) return resolved;
    throw new ToolError("edit.magic.model is not set and @smol is unavailable.");
}
```

本会话读取 `cfg://modelRoles/smol` 得到 `c8787/gpt-6-luna:high`。

`EditTool.#magic` 只在 `resolveEditMode(session) === "magic"` 时成立。`PI_EDIT_VARIANT` 是 `edit.mode` 的环境变量来源；运行中的旧进程若继承了 `PI_EDIT_VARIANT=hashline`，只改配置文件不会覆盖该进程的环境值。

## 小模型收到的系统提示

来源：`src/edit/magic-apply-system.md`。

```text
Apply every requested change to the draft of this one file. Reply exactly `DONE` when all changes have been applied.

- `replace`: copy a unique `old_string` from the current draft, including its whitespace but not the `N│` prefix. Set `new_string` to the replacement, or `""` to delete. Calls run in order.
- `search`: find a literal fragment. `read`: get exact numbered lines around a match or inspect an omitted section.
- When a replacement fails, inspect the draft and correct it. Earlier successful replacements are still in the draft.
- Write requested new code and leave unrelated code alone. If you cannot complete the change, reply `CANNOT: <reason>` to discard the draft.
```

## 回合、超时与提前终止

来源：`src/edit/magic.ts`。

```ts
const MAX_APPLY_TURNS = 12;
const APPLY_TIMEOUT_MS = 120_000;
const MAX_REPEATED_ERRORS = 2;
```

`MAX_APPLY_TURNS` 每轮对应一次 apply model 回复。`turns.map` 可以携带多个 `WrittenToolCall`，同一轮的多个内部调用按顺序执行后合成为一份工具结果，因此一次回复不等于一次工具调用。

未返回 `DONE` 时，OMP 根据最后一轮情况生成反馈。来源：`src/edit/magic-apply-feedback.md`。

```text
{{#if truncated}}
The last response hit the output limit. Use smaller `replace` calls, one section at a time.
{{else if syntax}}
The draft no longer parses. {{syntax}}
Use `read` and `replace` to repair the draft; successful edits are still in it.
{{else if callFormat}}
Use native tool calls, or write one JSON object per call in its own fenced block.
{{else if failed}}
At least one replacement failed. Correct the failed change in the draft before replying `DONE`.
{{else}}
Apply the requested changes with `replace` before replying `DONE`. Use `read` or `search` if needed.
{{/if}}
```

若连续出现相同错误且中间没有成功替换，`MAX_REPEATED_ERRORS = 2` 会提前结束，不必等满十二轮。等待模型或执行工具的总时限为 120 秒。

十二轮耗尽时的源码错误文本：

```ts
if (lastFeedback?.text) {
    throw new ToolError(`The change to ${path} did not finish; the file is unchanged. ${lastFeedback.text}`);
}
throw new ToolError(`The change to ${path} did not finish in ${MAX_APPLY_TURNS} turns; the file is unchanged.`);
```

超时与主动中止的源码错误文本：

```text
The edit timed out after 120s waiting on <model>; the file is unchanged.
The edit was aborted; the file is unchanged.
```

模型明确返回 `CANNOT: <reason>` 时丢弃草稿。模型不存在、没有凭据、provider 返回错误、文件不存在、文件包含 NUL、最终语法检查失败或磁盘快照发生变化，也会使该文件提交失败。

## 单文件与多文件提交语义

`applyDescribedChange()` 在内存 `draft` 上执行内部 `read`、`search`、`replace`。只有收到 `DONE` 且没有失败替换、没有重复错误、语法检查通过后，才调用 `apply(edits, rawSnapshot)`。

`runMagicEdit()` 对每个 `# path` 独立执行 `applySection()`。模型补全可以并行，实际写入通过 `writes` promise 串行。一个 section 失败不会撤销其他 section 的成功提交；只有全部 section 都失败时，工具结果才标记 `isError`。

源码注释原文：

> Resolves with the applied diffs and, for a failed section, why it was not applied; `isError` only when no section applied.

OMP 没有在十二轮循环外自动替主模型重试。主模型收到失败结果后，工具说明要求检查 diff，并对失败文件发送更精确的描述。

## 本机启用与真实调用

配置修改：

```text
~/.omp/agent/config.yml: edit.mode = magic
~/.omp/agent/.env: PI_EDIT_VARIANT=magic
```

重启后 `read cfg://edit.mode` 返回：

```text
edit.mode: "magic"
type: enum
default: "hashline"
source: environment variable
values: [apply_patch, hashline, patch, replace, sloppy, magic, none]
```

临时文件 `/tmp/magic-edit-test.py` 初始内容：

```python
def greet(name: str) -> str:
    return f"Hello, {name}!"


def add(a: int, b: int) -> int:
    return a + b
```

主模型发出的 `input`：

```markdown
# /tmp/magic-edit-test.py
- In `greet()`, change `"Hello, {name}!"` to `"Hi, {name}!"`.
- Rename `add()` to `sum_two()`.
```

工具返回的最终内容：

```python
def greet(name: str) -> str:
    return f"Hi, {name}!"


def sum_two(a: int, b: int) -> int:
    return a + b
```

临时文件随后删除。此次只证明该文件的两项修改成功，未测量 token 成本、时延或大规模语料成功率。

## 与通用 task 子代理的关系

可直接由源码支持的事实：Magic Edit 是 `edit` 工具内部的一次辅助模型请求循环，只有内存文件的 `read`、`search`、`replace` 工具，完成后把 diff 或错误返回主模型。

「轻量子代理」只是帮助理解的类比。它不是通过通用 `task` 工具创建的子代理。成本更低、主上下文更干净属于机制推断；本会话没有做 token 或延迟对照实验。
