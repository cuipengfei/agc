# OMP 会话内导航：/branch 与 /tree

> Sources: `@oh-my-pi/pi-coding-agent` 18.16.0 随包文档 `omp://tree.md` 与 `dist/cli.js` 摘录, 2026-11-03
> Raw: [tree 命令参考](../../raw/omp-slash-commands/omp-tree-command-reference.md)
> Updated: 2026-11-03

## 共同的数据模型

两个命令都在当前会话文件内部移动 leaf，不生成新的会话文件。会话条目通过 `id` / `parentId` 组成一棵树；选中节点后由 `navigateTree` 切换 leaf，再按新的 leaf 路径重建可见对话。旧路径保留在树里，之后还能回去。

文件级操作的分工：

| 操作 | 作用范围 | 结果 |
| --- | --- | --- |
| `/tree` | 当前会话文件 | leaf 移到选定节点 |
| `/branch`（别名 `/rewind`） | 当前会话文件 | 打开 transcript rewind，原地移动 leaf，恢复用户请求草稿 |
| `/fork` | 整个当前会话 | 复制成新的持久化会话文件 |
| `/resume` | 会话列表 | 切换到另一个会话文件 |

程序接口 `AgentSession.branch()` 仍然创建独立的分支会话，与两个 slash 命令不同。

## /branch：回放 transcript 并回退

选择器取当前分支的消息（实现为 `getBranch()` 过滤消息条目）。打开时覆盖最新约 600 条条目，保留完整用户轮，可能超出这个数量；按 `a` 展开全部更早历史，不改变已选点与分支；按 `f` 过滤回放的 transcript（加载整个分支）。存在兄弟分支时，左右键导航兄弟分支条。

选中后调用 `navigateTree(..., { summarize: false })`，对任何目标都不摘要。选中用户请求时，草稿替换编辑器里已有的文本。

## /tree：整棵树选择器

`/tree` 读取 `getTree()` 与 `getLeafId()`，打开 `TreeSelectorComponent`。子节点按时间升序排列；包含活动 leaf 的分支排在选择器最前；活动路径用圆点标记；标签以 `[label]` 形式显示在节点文字前。缺失父节点、自父条目与显式 null 父节点会变成根，多个根共享一个虚拟分叉根。

### 过滤与搜索

初始档位来自 `treeFilterMode`（默认 `default`）。`Ctrl+O` 向前循环，`Shift+Ctrl+O` 向后循环，顺序为 `default` → `no-tools` → `user-only` → `labeled-only` → `all`；`Alt+D/T/U/L/A` 直达对应档位。

`default` 显示对话节点以及未被显式隐藏的条目，隐藏这些簿记类型：`label`、`custom`、`model_change`、`thinking_level_change`、`model_usage`、`service_tier_change`、`title_change`、`credential_pin`、`session_init`、`ttsr_injection`、`mode_change`、`reset_boundary`。`all` 把这些条目渲染成元数据行。`no-tools` 在 `default` 基础上再隐藏 `toolResult` 消息；`user-only` 只保留用户请求，包含普通用户消息与用户触发的 skill/协作自定义提示；`labeled-only` 只保留能解析到标签的条目。

仅含工具调用、没有正文的 assistant 消息在所有档位都隐藏，包括 `all`；错误或中止消息（`stopReason` 既不是 `stop` 也不是 `toolUse`）与当前 leaf 例外。

搜索按空格分词，使用不区分大小写的模糊（子序列）匹配，所有词元必须命中（AND）；可搜索文本包含标签、角色与类型相关内容；消息与自定义消息的搜索预览限制在 200 字符以内。

### 选择结果

`navigateTree` 按选中条目类型决定新的 leaf：

| 选中类型 | 新 leaf | 编辑器 |
| --- | --- | --- |
| 用户消息 | 该条目的 `parentId`；根用户消息重置到根 | 文本与图片附件重建为可编辑草稿，仅在编辑器为空时写入 |
| 普通 `custom_message` | 同用户消息的父节点规则 | 同用户消息 |
| 用户触发的 skill/协作自定义提示 | 恢复原始用户草稿与图片附件，父节点规则不变 | 同上 |
| agent/autoload 的 `skill-prompt` 注入 | 按非用户条目处理，直接定位到该节点 | 不回填 |
| 过去的 `ask` 工具结果 | 重开原问题界面；取消不改树；新回答作为兄弟工具结果追加，旧答案分支保留，随后从新答案继续 | — |
| 其他节点 | 选中节点自身 | 不回填 |
| 当前 leaf | 通常提示 `Already at this point`；`/tree` 把当前 leaf 的用户提示当作无操作，而 transcript rewind 与直接调用 `navigateTree()` 仍可越过它；当前 leaf 的 `ask` 结果仍可重答 | — |

### 摘要流程

摘要询问由 `branchSummary.enabled` 控制，默认 `false`。`Shift+Enter` 不论该设置如何都直接摘要并切换。需要一个可用模型；provider 凭据只在内置摘要器运行时检查。

开启询问后，普通 Enter 提供三个选项：`No summary`、`Summarize`、`Summarize with custom prompt`。摘要提示里按 Esc 返回树选择器；取消自定义提示词回到选择界面；摘要进行中 Esc 绑定 `abortBranchSummary()`，中止后选择器重开，移动不生效。

`navigateTree` 会先冲刷待处理的 bash 输出并校验目标，收集从旧 leaf 到共同祖先的被放弃条目，发出可取消的 `session_before_tree`；扩展可以提供摘要。按需运行默认摘要器，随后应用 `branchWithSummary`、`branch` 或 `resetLeaf`，重建模型上下文与相关状态，最后发出 `session_tree`。请求摘要但没有可摘要内容时，直接继续，不写摘要条目。

### 标签

树里的标签编辑调用 `appendLabelChange(targetId, label)`：非空标签设置或更新，空标签清除；标签存为追加式的 `label` 条目，界面显示解析后的标签状态。`Shift+L` 在搜索为空时编辑或清除标签，`Alt+L` 直达 `labeled-only`。

## 双击 Esc 触发哪一个

快捷键只在编辑器为空时生效，行为由 `doubleEscapeAction` 决定：

- `rewind`（默认）：打开 transcript rewind 选择器，即 `/branch`
- `tree`：打开 `/tree` 选择器
- `none`：关闭该快捷键

旧值 `branch` 在读取设置时迁移为 `rewind`。

## 常见混淆点

- `/branch` 的主列表来自当前分支；左右键只提供相邻兄弟分支条的快捷入口，文档只说明存在兄弟条时可用。
- `/tree` 的默认档位不显示 `model_change` 等簿记条目，切到 `all` 才看到完整内部时间线。
- 草稿写入条件不同：`/branch` 用用户请求草稿覆盖编辑器文本；`/tree` 只在编辑器为空时回填。
- 摘要条件不同：`/branch` 固定不摘要；`/tree` 受 `branchSummary.enabled` 控制，默认关闭。

## 证据边界

本文事实来自 18.16.0 随包文档 `omp://tree.md` 与同版本 `dist/cli.js` 的简短实现摘录，未在 TUI 中逐项实操。条目类型、快捷键与默认值随版本可能变化。

## See Also

- [OMP 内置 slash 命令全表（v18.1.10 快照 82 条；2026-10-10 当前 blob core registry 85 条）](builtin-slash-commands.md)
- [OMP 配置语义手册](../omp-config/config-semantics.md)
- [OMP session JSONL 格式与第三方 pi 解析器兼容性](../omp-sessions/jsonl-format-and-third-party-parsers.md)
