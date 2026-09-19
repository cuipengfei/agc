# OMP 18.2.5 `providers.judgmentProvider: llm` 自动判定调用链深挖

> Source: 本会话取证（直读本机 @oh-my-pi/pi-coding-agent 18.2.5 源码 + pi-tui git TUI 调用方，只读）
> Collected: 2026-09-19
> Published: Unknown

- 日期：2026-09-19。直读本机安装 `@oh-my-pi/pi-coding-agent` 18.2.5 源码（`~/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent/src/`）+ `pi-tui` 的 git TUI 调用方。只读，未运行。
- 前提（已在上一份窄核验中确认）：`llm` 模式下 `usesTypeSafeJudge` 返回 false（`judgment/index.ts:80-84`），`resolveJudge` 直接返回 `resolveLlmJudge(deps)`（`judgment/index.ts:91-93`），**没有任何 TypeSafe 尝试**。

---

## 0. 消费方全枚举（回答"还有哪些自动消费者"）

对 `resolveJudge` / judgment 模块导入方做全量 grep，**恰好 4 个调用点，3 个自动 + 1 个手动**：

| # | 消费方 | 类型 | 调用点 |
|---|---|---|---|
| 1 | auto-thinking 难度分类 | 自动 | `src/auto-thinking/classifier.ts:110` |
| 2 | smart unexpected-stop 检测 | 自动 | `src/session/unexpected-stop-classifier.ts:71` |
| 3 | git TUI AI staging | 自动（用户按 wand 触发，但判定本身全自动） | `src/cli/git-tui/ai-stage.ts:69` |
| 4 | eval cell `judge()` | **手动**（cell 代码显式调用） | `src/eval/judgment-bridge.ts:154` |

排除法证据：`from "../judgment"` 全仓仅上述 4 处（grep）；`JudgmentRequest` 类型除 `judgment/index.ts` 实现外仅这 4 处消费；`TextJudge`/`LocalJudge`/`OnlineChatJudge` 不对外导出。**18.2.5 中没有第四个自动消费者。**

## 1. llm 模式公共底座

`resolveLlmJudge`（`judgment/index.ts:127-135`）按 feature 的 `backend` 二分：

- backend = `ONLINE_MEMORY_MODEL_KEY`（字符串 `"online"`，`tiny/models.ts:99`）→ **`OnlineChatJudge`**（`judgment/index.ts:181-249`）：候选链 `tiny → smol → default`（`collectOnlineTinyCandidates(["tiny","smol","default"], {tryAllRoles: true})`，index.ts:195-200），若调用方传了 `sessionModel` 且不在候选中则**末尾追加会话当前模型**（index.ts:201-204）。规则：无 API key 的候选跳过（记 lastError）；凭据/provider 失败换下一个；caller abort/TimeoutError 直接抛；全灭抛 `judgment: every tiny/smol candidate failed`（index.ts:248）；一个候选都没有抛 `no tiny/smol/default model available`（index.ts:205）。
- backend = 本地 on-device key（`isTinyMemoryLocalModelKey`，如 `lfm2-1.2b`/`qwen3-1.7b` 等，`tiny/models.ts:162-169,200-202`）→ **`LocalJudge`**（`judgment/index.ts:137-144`）：keyword 提示词走共享 tiny-model worker，答案上限 16 token、reasoning 模型 1024（index.ts:67-70）。
- backend 其他值 → 抛 `judgment: unsupported local model`（index.ts:129-131）。**不可能**走到 TypeSafe 回退（那是 typesafe/auto 模式的分支，index.ts:94-96）。

两个 backend 选择设置的默认值都是 `"online"`（→ OnlineChatJudge）：
- `providers.autoThinkingModel`：默认 `ONLINE_AUTO_THINKING_MODEL_KEY`（= `"online"`），合法值 = online + 5 个本地 key（`settings-schema.ts:5714-5717`、`tiny/models.ts:162-169,244-245`）。
- `providers.unexpectedStopModel`：默认 `ONLINE_MEMORY_MODEL_KEY`，合法值同上（`settings-schema.ts:5770-5773`）。
- ai-stage 的 backend **硬编码** `"online"`（ai-stage.ts:72），用户不可配。

## 2. 功能一：auto thinking-level（每轮用户消息一次）

**触发条件**：`agent-session.ts:6904-6907` — 仅当 `isAutoThinking`（thinking level 配成 `auto`）且入站是用户轮（user 消息或用户触发的 skill prompt）。入口 `ModelControls.applyAutoThinkingLevel`（`model-controls.ts:598`）。前置过滤：模型无 reasoning 或无可控 effort 面（`getSupportedEfforts(model).length === 0`）直接 return（:600-604）。`ultrathink` 关键字命中时**绕过分类器**直接 Max（:607-611），不调 judge。

**输入**：state = `{ request: preprocessTinyMessage(promptText) }`（classifier.ts:119，预处理后的用户请求文本）。questions 按 judge kind 二选一：
- `OnlineChatJudge`（默认）：单题 `level`，`ChoiceQuestion`，criteria 为 low/medium/high/xhigh 四档 rubric；若 ceiling 是 Max 则用含 `max` 档的五档版本（LEVEL_QUESTION / LEVEL_QUESTION_WITH_MAX，classifier.ts:52-66）。
- `LocalJudge`：单题 `bucket`，3 桶 `trivial|moderate|hard`（BUCKET_QUESTION，classifier.ts:68-77——注释说明 sub-2B 模型上 3 分类比 4 档序数可靠）。

**输出与映射**：`answers.level.choice` → `LEVEL_EFFORT`（low→Low … max→Max，classifier.ts:27-33）；`answers.bucket.choice` → `BUCKET_EFFORT`（trivial→Low、moderate→High、hard→XHigh，:35-39）。然后 `clampAutoThinkingEffort(model, effort, ceiling)`（:138）：ceiling 默认 XHigh——仅当 `providers.autoThinkingMaxEffort: max` 且模型支持 Max 时才开放 Max（:95-98）；local judge 的 ceiling 恒为 XHigh（:121-129）。

**结果如何改变控制流**：`applyAutoThinkingLevel` 把 resolved effort 写入 `#thinkingLevel` / `#autoResolvedLevel`，调 `#applyThinkingLevelToAgent(effort)` 改变**本轮请求发给主模型的 thinking 参数**，并记录 `thinking_level_changed` 事件、持久化 thinking-level 变更（model-controls.ts:647-665）。若分类期间轮次被 abort/superseded，结果丢弃（:644-645）。

**失败 fallback（llm 链双层）**：
1. 链内：OnlineChatJudge 逐候选降级（tiny→smol→default→会话模型），见 §1。
2. 功能级：4 秒超时（`#AUTO_THINKING_TIMEOUT_MS = 4000`，model-controls.ts:590）；`classifyDifficulty` 抛错被 catch（:635-641），`resolved` 保持 undefined → 用 `#autoResolvedLevel ?? resolveProvisionalAutoLevel(model)` 兜底（:649）→ **维持上一轮（或临时的）具体 level 继续本轮，绝不中断轮次、不清除 auto 状态**（注释 :592-597）。

## 3. 功能二：smart unexpected-stop（每个候选 terminal turn 一次）

**触发条件**：turn-recovery 在 assistant turn 结束（stopReason === "stop"）后进入 `#handleUnexpectedAssistantStop`（`turn-recovery.ts:916`）。前置过滤（:917-946）：`features.unexpectedStopDetection` 必须是 `smart`（`none` 直接 false；有文本内容时 `mechanical` 也直接 false——mechanical 模式**不跑 judge**，只对无文本的 thinking-only turn 走重试）；`isUnexpectedStopCandidate` 排除 toolCall turn、空内容 turn（`unexpected-stop-classifier.ts:43-62`，thinking-only 需带签名才算候选）。

**输入**：state = `{ message: text }`——纯文本 turn 用全部 text content；thinking-only turn 用 thinking 内容拼成 text（turn-recovery.ts:926-943）。单题 `stopped`，`NoulQuestion`（是/否 + P(yes)），instructions/criteria 针对 1.2B 小模型调过措辞（`unexpected-stop-classifier.ts:20-30`）。

**输出**：`answers.stopped.noul >= 0.5` → true（:83，阈值 `UNEXPECTED_STOP_THRESHOLD`，keyword judge 只会给出 0/1，TypeSafe 才给中间概率——llm 模式下即 0/1）。

**结果如何改变控制流**：`true` → `#unexpectedStopRetryCount++`（上限 `UNEXPECTED_STOP_MAX_RETRIES = 3`，turn-recovery.ts:73,970-979）：未超帽则注入一条 developer reminder 消息并 `scheduleAgentContinue({source: "unexpected-stop-retry"})` 让 agent **自动继续该 turn**（:981-991）；超帽则 logger.warn 后放弃（视为正常结束）。`false` 或 `undefined` → 重置计数、不重试（:964-967）。

**失败 fallback（llm 链双层）**：
1. 链内同 §1。
2. 功能级：4 秒超时（`UNEXPECTED_STOP_TIMEOUT_MS = 4000`，turn-recovery.ts:74,949）；`classifyUnexpectedStop` 把**一切错误吞成 `undefined`**（classifier 内 try/catch，unexpected-stop-classifier.ts:84-90）→ 该 turn 按"非 unexpected stop"处理。**注意语义：llm 链全灭（如无 tiny/smol/default 候选）不会重试也不会告警，只是不重试该 turn。**

## 4. 功能三：git TUI AI staging（一次 wand 操作 = 1 file pass + N hunk pass）

**触发条件**：git TUI 用户在 unstaged 头部 wand pill 输入自然语言指令（`action.prompt`），派发 `stage-ai`（pi-tui `git-tui.ts:369-402` → host.aiStage）。**注意它自建 Settings/ModelRegistry 并 `loadCliExtensionProviders`**（ai-stage.ts:63-68）——用的是 git TUI 这一侧的注册表，不是会话的。

**backend 硬编码 `"online"`**（ai-stage.ts:72）→ llm 模式下恒为 `OnlineChatJudge`；且**未传 sessionModel** → 候选链只有 `tiny → smol → default`，会话模型不在兜底之列（对比 §2/§3 都传了）。

**输入与两趟判定**：
1. **File pass**（ai-stage.ts:90-114）：state = `{ instruction, files: [{path, change}] }`；每批 80 文件（`FILE_BATCH`，:27），批内每文件一道 `NoulQuestion`（`file{i}`，模板 `git-ai-stage-file.md`），`Promise.all` 并行多批。`noul >= 0.5`（`STAGE_THRESHOLD`，:31）选入。file pass **无逐条容错**：一批 judge 抛错 → 整个 `aiStage` 抛错。
2. **Hunk pass**（:122-154）：对选中文件的每个 hunk，state = `{ instruction, path, changed_lines }`（只取 +/− 行、截 2400 字符，:28,131-140），单题 `matches`（HUNK_QUESTION，:33-37）。经 `judgeAll` 扇出（:204-230）：**单个 hunk 判定失败只把该 hunk 当"不选"**，全部失败才把首个错误抛出。

**输出与控制流影响**：三档结果决定真正 `git apply --cached` 的范围（:156-190）：
- 有 file 选中 → 只有选中的文件进入 hunk 判定；hunk 选中按 `VcsHunkSelection{kind: "indices"}` 暂存（:179-184）。
- file pass **零选中** → 视为"指令是关于内容而非路径"，全部文件进入 hunk pass（`fileScopeAuthoritative = false`，:115-120）；此时即使 hunk 全灭也**不会**整文件暂存（非权威范围保护，:118,164）。
- file 范围权威且所有 hunk 全灭 → 解释为"指令不在文件内区分" → 选中文件整文件暂存（`wholeFileScope`，:157-174）；untracked/binary 仅在 file 范围权威时整文件暂存（:127-129,185-187）。结果以状态栏汇报（`stagedHunks/wholeFiles/matchedFiles`，git-tui.ts:383-397）。

**失败 fallback（llm 链双层）**：
1. 链内同 §1，但没有会话模型兜底，链尽头是 `default` role。
2. 功能级：抛错穿过 case 内的 try/finally（无 catch，git-tui.ts:373-400）到外层动作循环的 catch → `#setError` 错误条（git-tui.ts:443-444）。hunk 层单条失败降级为"不暂存该 hunk"，不报错。

## 5. 手动路径：eval cell `judge()`（区分自动/手动的边界）

- 入口：cell 代码 `judge(state, questions)` → prelude 经 `__judge__` bridge → `runEvalJudgment`（`judgment-bridge.ts:36,147-173`）。**它是唯一由用户代码显式发起的路径**，上面三个功能不经过它。
- backend 硬编码 `"online"`（:157），judge 构造用**会话的** settings/registry（:151-159）。
- questions 三种类型齐全：choice / bool（对 cell 暴露为 `{type:"bool", bool: P(yes)}`，内部名 noul）/ score（解析器 :77-133）。
- 返回 handle，`.wait()` 得到 `{id: Answer}` 结构化数据（:160-171）。
- 失败不静默：错误经 bridge 抛回 cell（无功能级吞错）。

## 6. 一句话对照表（llm 模式）

| 功能 | backend 设置 | judge kind | 题/类型 | 阈值 | 功能级失败语义 |
|---|---|---|---|---|---|
| auto thinking-level | `providers.autoThinkingModel`（默认 online） | online 或 local | 1×choice（4/5 档或 3 桶） | ceiling 默认 XHigh | 4s 超时/抛错→沿用上轮 level，轮次不中断 |
| smart unexpected-stop | `providers.unexpectedStopModel`（默认 online） | online 或 local | 1×noul | 0.5 | 错误→undefined→该 turn 不重试（静默） |
| git AI staging | 硬编码 online | 恒 online | file pass N×noul + hunk pass 1×noul/个 | 0.5 | file pass 批失败→整操作报错条；hunk 单败→不选该 hunk |
| eval `judge()` | 硬编码 online | 恒 online | 任意 choice/bool/score | 无 | 错误抛回 cell |

共同底线：llm 模式三层均**永不触碰 TypeSafe**；链内逐候选降级（无 key 跳过→失败换下一个→abort 即抛→全灭才抛）；唯一能把异常甩到用户面前的是 git TUI（错误条）与 eval cell（异常）；两个会话内功能（auto-thinking、unexpected-stop）都是吞错降级设计。

## 7. Karpathy 证据小结
1. **Think Before Coding**：先全量枚举消费方（grep 模块导入 + 类型引用双路）再下"仅 3 自动 + 1 手动"的结论；明确标注 git AI staging 是"用户触发、判定自动"的边界归类。
2. **Read Before Writing**：每个功能的触发/输入/输出/控制流/失败五要素均给到文件+行号，全部来自 18.2.5 安装包直读；`pi-tui` 侧调用方单独核实（不猜派发方行为）。
3. **Surgical Changes**：只读深挖，未扩展 OMP 其他子系统；报告外无代码改动。
4. **Verify with Evidence**：ai-stage 无 sessionModel 兜底、file pass 无逐条容错这两个反直觉点均以代码行佐证（ai-stage.ts:69-74 vs :109、judgeAll 仅用于 hunk pass）；未运行验证的行为（如 `#setError` 的 UI 呈现）未做超出代码的断言。
