# Magic Edit：主模型描述、辅助模型修改

> Sources: 本机 `@oh-my-pi/pi-coding-agent` 19.1.1 源码与工具提示词, 2026-11-23; 本机配置读取与临时文件实测, 2026-11-23; can1357/oh-my-pi Magic Edit 三次实现提交与 Can Bölük Hashline 博客, 2026-11-20 至 2026-11-23; 本机 model_usage 十二轮轨迹, 2026-11-23
> Raw: [Magic Edit 源码与本机运行取证](../../raw/omp-tools/2026-11-23-magic-edit-source-and-runtime.md); [Magic Edit 实现演进与真实十二轮轨迹](../../raw/omp-tools/2026-11-23-magic-edit-evolution-and-twelve-turn-trace.md); [Hashline 公开基准](../../raw/omp-tools/2026-11-23-harness-problem-hashline-public-evidence.md)
> Updated: 2026-11-23

## Overview

Magic Edit 让主模型用按文件分组的修改描述调用 `edit`，由 apply model 在内存草稿上执行 `read`、`search`、`replace`，通过检查后提交。它把行号、精确文本匹配和补丁生成从主模型交给辅助模型。默认 apply model 来自 `@smol`，也可用 `edit.magic.model` 指定其他模型或角色。

它是 `edit` 工具内部的辅助模型循环，不经过通用 `task` 子代理。把它称为「轻量子代理」可以帮助理解分工，但成本优势需要单独测量。

## 同一个修改，两种调用方式

假设文件包含：

```python
def greet(name: str) -> str:
    return f"Hello, {name}!"


def add(a: int, b: int) -> int:
    return a + b
```

目标是把问候语改为 `Hi`，并把 `add()` 改名为 `sum_two()`。

### hashline：主模型生成补丁

主模型先读取最新文件视图，取得行号和快照 tag，再提交精确替换。两种模式的 `edit` schema 都只有 `{ input: string }`：

```json
{
  "input": "[src/example.py#A1B2]\nPUT 2.=2:\n+    return f\"Hi, {name}!\"\nPUT 4.=4:\n+def sum_two(a: int, b: int) -> int:"
}
```

`#A1B2` 是这里的示例 tag。hashline 要求修改后重新读取，因为行号和 tag 会变化。

### magic：主模型描述意图

```json
{
  "input": "# src/example.py\n- `greet()` > change `\"Hello, {name}!\"` to `\"Hi, {name}!\"`.\n- rename `add()` to `sum_two()`."
}
```

主模型不提供快照 tag、替换行号或完整新代码。OMP 把文件视图和描述交给 apply model，由它在草稿中定位并修改。

## 后台循环做什么

apply model 收到一段很短的系统提示：完成这一文件的请求修改，全部完成后回复 `DONE`，无法完成则回复 `CANNOT: <reason>`。它只有三类内存文件操作：

- `read`：查看草稿的精确行；
- `search`：查找文字片段；
- `replace`：用唯一的 `old_string` 替换文本。

成功的替换会保留在草稿里。主模型最后收到写入后的 diff，或没有写入时的失败原因。

## 十二轮错误如何发生

`MAX_APPLY_TURNS = 12` 计的是 apply model 的回复次数。一次回复可以包含多个内部工具调用，这些调用在同一轮内顺序执行，所以十二轮不等于十二次工具调用。

以下情况会让 OMP 把反馈发给 apply model，继续消耗下一轮：

| 情况 | OMP 的处理 |
|---|---|
| 输出达到 token 上限 | 要求用更小的 `replace` 分段修改 |
| 工具调用格式无效 | 要求使用原生工具调用或规定的 JSON 代码块 |
| `replace` 找不到唯一匹配 | 要求检查草稿并修正失败替换 |
| 只读取或搜索，尚未修改 | 要求先应用请求的修改再回复 `DONE` |
| 回复 `DONE` 但草稿语法无效 | 返回语法错误，要求修复草稿 |
| 没有实际修改就回复 `DONE` | 拒绝完成并继续反馈 |

连续出现相同错误且中间没有成功替换时，`MAX_REPEATED_ERRORS = 2` 会提前终止。整个 apply 过程还有 120 秒时限。

十二轮耗尽时，实际错误文本有两种形式：

```text
The change to <path> did not finish; the file is unchanged. <最后一轮反馈>
```

```text
The change to <path> did not finish in 12 turns; the file is unchanged.
```

超时会返回：

```text
The edit timed out after 120s waiting on <model>; the file is unchanged.
```

### 一次真实十二轮轨迹

| 轮次 | reply 中的操作 |
|---|---|
| 1–2 | search/read 元数据 |
| 3–5 | 修改 Sources、Raw、Updated |
| 6–9 | 读取并修改工具表格、Outdated 块和关键边界 |
| 10–12 | 两次 read 后修改 See Also |

model_usage 保留了每轮 reply；第 12 轮仍为 `toolUse`，没有 `DONE`，文件因此未提交。完整 tool results 未保存，不能把每次 `replace` 都视为已观测成功。

### 第二次重试

第二次输入减少了 See Also 修改，并给出行号和完整四列表格，最终 reply 为 `DONE`。基于这两次输入，使用时可将长文件、多区域和复杂表格的修改拆分，并明确位置。

## 三次实现演进与 hashline 的边界

- 2026-11-20：[SEARCH/REPLACE 单轮实现](https://github.com/can1357/oh-my-pi/commit/009b48e82f00)。
- 2026-11-21：[行号 JSON 操作](https://github.com/can1357/oh-my-pi/commit/5ace9b70d29f)。
- 2026-11-23：[多轮内存草稿 replace 循环](https://github.com/can1357/oh-my-pi/commit/a479eee49a2d)。

第三版的作者公开基准中，DeepSeek V4.1 Flash、Inkling 2 Mini、Gemma 4 26B 均为 16/16，Mistral Nemo 12B 为 14/16，Gemma 3 12B 为 13/16，Llama 3.1 8B 为 2/16。这些是作者基准，不是本机模型对照。

Hashline 博客的 16 模型、180 tasks、3 runs，以及 Grok Code Fast 1 从 6.7% 到 68.3% 的结果，针对单模型直接编辑，不直接证明 Magic apply loop 的效果。作者没有公开声明 Magic 内部不用 hashline 的原因；认为多轮草稿操作可通过读取和修正逐步定位，因此不一定需要主模型提供 hashline，是架构推断，不是作者解释。

## 失败后主模型收到什么、做什么

单个文件只有在收到有效 `DONE`、没有失败替换且语法检查通过后才提交，因此十二轮失败时该文件保持原样。文件在编辑期间被其他程序修改，也会因快照不一致而拒绝提交。

多文件调用按 `# path` 独立处理。模型补全可以并行，实际写入串行；一个文件失败不会撤销其他文件的成功修改。只有全部文件都失败时，整个工具结果才标记为错误。

OMP 不会在十二轮循环外自动替主模型重试。主模型应检查返回的 diff 和失败原因，必要时重新读取目标文件，再对失败文件发送更精确的修改描述。

## 与通用 task 子代理的关系

相同点是主模型把一段工作交给另一个模型，由后者进行多轮工具操作后返回结果。

Magic Edit 的范围固定在单文件内存草稿，只有三种内部操作，没有通用 `task` 子代理的文件探索、bash 和独立会话结构。主模型也不需要为它编写完整子任务提示或管理工作区。

「减少主模型输出和中间上下文」可以由调用结构解释；「一定更便宜、一定更快」仍未经过本会话的对照测量。

## 本机实测

本机 `edit.mode` 与 `PI_EDIT_VARIANT` 均为 `magic`，`@smol` 当前值为 `c8787/gpt-6.1-terra:low`。此前的 `c8787/gpt-6-luna:high` 记录属于当时配置，未做 terra/luna 对照实验。重启后 `cfg://edit.mode` 显示 `magic`，来源为环境变量。

临时文件 `/tmp/magic-edit-test.py` 接受两条自然语言修改后，`greet()` 的问候语和 `add()` 的函数名都按请求改变。临时文件随后删除。这次实测只覆盖一个短文件的两项修改，没有测量长文件、多文件失败或十二轮耗尽的实际耗时。

## See Also

- [OMP 19.1.1–19.0.1 配置项增量](../omp-config/release-config-changes-19-1-1-to-19-0-1.md)
- [OMP 配置语义手册](../omp-config/config-semantics.md)
