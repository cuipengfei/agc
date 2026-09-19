# Jev / TypeSafe AI 现成集成调查报告（Codex / OpenCode / OMP）

> Source: 本会话只读调查（typesafe-ai 官方 org、GitHub code/issues/repos 搜索、npm/PyPI registry 元数据、社区仓库；未安装未注册未调用端点）
> Collected: 2026-09-19
> Published: Unknown

- 日期：2026-09-19。只读调查，未安装、未注册、未调用任何端点。
- 范围：官方 `typesafe-ai` GitHub org、GitHub code/issues/repos 搜索（anomalyco/opencode、can1357/oh-my-pi、openai/codex）、skills CLI 渠道、MCP registry 线索、npm/PyPI registry 元数据、社区仓库。
- 判定词汇表：**ready-to-use**（装/配即用）｜**仅 instruction skill**（只教 agent 怎么做）｜**通用 SDK**｜**System One adapter**（把 LLM 包装成 System One 形状）｜**demo**｜**需自行开发**｜**同名噪声**。
- 未命中处一律写"在所查范围未找到"，不作绝对断言。

---

## 1. 总结论（按宿主）

| 宿主 | 原生集成 | 现成第三方集成 | 判定 |
|---|---|---|---|
| **can1357/oh-my-pi (OMP)** | **有，且已随 18.2.4（2026-09-17）发布**：`judgment` 子系统内建 TypeSafe 后端 | 不需要 | **ready-to-use**（设置 `TYPESAFE_API_KEY` 或 `/login typesafe`） |
| **Codex (openai/codex)** | 无（仓库内 `typesafe_overrides` 是 Rust/serde 字段名，同名噪声） | 多个社区 MCP server，README 直接给出 `~/.codex/config.toml` 配置 | 走 MCP 为 ready-to-use；无官方/原生 |
| **anomalyco/opencode** | 无（仓库内 "typesafe"/"jev" 命中均为 i18n/测试噪声） | 社区 ACP/MCP 桥与插件（Jevbridge、jev-router 等），成熟度低 | 社区桥可用但未成熟；官方 opencode 渠道在所查范围未找到 |

---

## 2. OMP（can1357/oh-my-pi）—— 原生内置，ready-to-use

这是三个宿主中唯一有**一方原生支持**的。证据链：

1. **源码**：`packages/ai/src/judgment/typesafe.ts` 实现 `TypeSafeJudge`（implements `Judge`），把 `JudgmentRequest` 原样转发 `POST {base}/v1/systemone`，默认 `TYPESAFE_DEFAULT_BASE_URL = "https://api.typesafe.ai"`、默认模型 `jev-latest`；带 401/403 key 轮换、429/5xx 的 `retry-after` 感知退避（MAX_ATTEMPTS 3）。文件头注释明确：`TypeSafe System One client: the native Judge backend`。
   URL: https://github.com/can1357/oh-my-pi/blob/main/packages/ai/src/judgment/typesafe.ts
2. **auth 注册表**：`packages/catalog/src/compat/rules/auth/typesafe.kdl` 声明 `TYPESAFE_API_KEY` 解析（注释："TypeSafe (System One judgments) is not a chat-model provider"）。
   URL: https://github.com/can1357/oh-my-pi/blob/main/packages/catalog/src/compat/rules/auth/typesafe.kdl
3. **官方文档**：`docs/environment-variables.md` 的 `### TypeSafe judgments` 节：`TYPESAFE_API_KEY`（或 `/login typesafe`）、`TYPESAFE_BASE_URL`、`TYPESAFE_DEFAULT_MODEL`；`providers.judgmentProvider`（`auto`/`typesafe`/`llm`）选择 judgment 后端；无 TypeSafe 时回退 chat 链。用途：thinking-level 难度分类、Smart unexpected-stop 检测、git TUI AI staging。
   URL: https://github.com/can1357/oh-my-pi/blob/main/docs/environment-variables.md
4. **发布记录**：`packages/coding-agent/CHANGELOG.md` `[18.2.4] - 2026-09-17`："Added TypeSafe provider support through `/login typesafe` or `TYPESAFE_API_KEY`..."，且新增 `judge(state, questions)` 求值 helper（Python/JS cell 内可用）。即已进 release，非 main 分支未发布代码。
   URL: https://github.com/can1357/oh-my-pi/blob/main/packages/coding-agent/CHANGELOG.md
5. 消费方代码：`packages/coding-agent/src/judgment/index.ts`、`packages/coding-agent/src/session/unexpected-stop-classifier.ts`、`packages/coding-agent/test/auto-thinking-classifier.test.ts`。

**注意**：该集成把 Jev 用作内部 judgment 后端（给 OMP 自己的功能供电），不是把 Jev 暴露为 OMP 的聊天主模型。

## 3. Codex（openai/codex）—— 无原生；社区 MCP 可配即用

- **原生**：GitHub code search `typesafe repo:openai/codex` 仅 3 个命中，全部为 `typesafe_overrides`（Rust 结构体字段，serde 语境），**同名噪声**。在所查范围未找到 Codex 对 TypeSafe/Jev 的原生支持。
- **现成第三方（MCP）**，均走 Codex 的 `[mcp_servers.*]` 配置：
  - `blakestone-x/jev-mcp`（Python，7★）：README 直接给出 `~/.codex/config.toml` 片段（`uvx --from git+.../jev-mcp@v0.2.1 jev-mcp`），并附 Claude Code / Cursor 配置；含 `scripts/register.sh` 辅助注册。工具面：classify/score/check/match/screen。
    URL: https://github.com/blakestone-x/jev-mcp
  - `jkudish/jev-mcp`（TypeScript，69★）：自述 "Proof of concept MCP for Typesafe's new Jev AI model" → 成熟度标 PoC。
    URL: https://github.com/jkudish/jev-mcp
  - 另有 `itsmostafa/typesafe-mcp`（Go，62★）、`rashedInt32/jev-mcp`（TS，自称 ships as a Claude Code plugin）、`Brainwires/jevwire`、`arunav25/jev-mcp` 等，均未逐一审计代码，列为社区候选。
- **instruction skill 通道**：官方 `typesafe-ai/skills` 的安装说明含 `npx skills add typesafe-ai/skills --skill typesafe-ai`（"Choose your agent when prompted"，覆盖 Codex 等），但该 skill 本体是 instruction-only（见 §6）。

## 4. OpenCode（anomalyco/opencode）—— 无原生；社区桥接层早期

- **原生**：code search `typesafe repo:anomalyco/opencode` 命中 2 个测试文件（`new Headers()` / "base" 子串），`jev repo:anomalyco/opencode` 命中均为斯洛文尼亚语/克罗地亚语 i18n 的 "naslednje"/"implementiraj" 子串——**同名噪声**。在所查范围未找到官方 opencode 集成或 opencode 插件市场上的 TypeSafe 插件。
- **社区候选**（均为 Jev 发布后 1 天内的新仓库，成熟度低）：
  - `gamesonrblx/Jevbridge`（TS，13★）：自述 "ACP and MCP adapter that bridges TypeSafe Jev with any LLM — ... alongside Codex, Claude, Grok, and **OpenCode**"；有 `bin/`、`src/`、`examples/`、`skills/jevbridge/`。属于 MCP/ACP 桥（可配置使用），非 opencode 官方插件。
    URL: https://github.com/gamesonrblx/Jevbridge
  - `flaviusapop/jev-router`（JS，0★）："Routes each turn in Claude Code, Codex, Grok and **opencode** to the cheapest model..."——与 OpenCode 兼容的 turn-router。
    URL: https://github.com/flaviusapop/jev-router
  - X 帖线索（未核实 repo）：@thdxr 称其"为 opencode 做的 intent-aware permissions plugin 由 Jev 驱动"。[社区线索] https://x.com/thdxr
- opencode 支持自定义 provider（OpenAI-compatible/Anthropic-compatible），但 TypeSafe API 不兼容这两类协议（见前报告），所以"直接填 baseURL 用"不可行；需 MCP 桥或自研。

## 5. 包管理器与平台层

| 包 | 类型 | 证据 |
|---|---|---|
| `typesafe-sdk`（PyPI 0.7.0，MIT，owner: danielgafni/alliesafe） | 官方通用 Python SDK | https://pypi.org/project/typesafe-sdk/ |
| `@typesafe-ai/sdk`（npm） | 官方通用 JS SDK | https://github.com/typesafe-ai/typesafe-sdk-js |
| `@ai-sdk/typesafe-ai`（npm 3.0.3，Apache-2.0） | Vercel AI SDK 官方 provider（vercel/ai monorepo `packages/typesafe-ai`） | https://www.npmjs.com/package/@ai-sdk/typesafe-ai |
| `typesafe-ai/system-one-adapter-python`（PyPI `system-one-adapter`，MIT） | **System One adapter**（反向：用 OpenAI/Anthropic LLM 模拟 System One API） | https://github.com/typesafe-ai/system-one-adapter-python |
| Netlify AI Gateway 上架 Jev | 平台托管集成（非本三宿主） | https://www.netlify.com/changelog/typesafe-jev-ai-gateway/ |
| PyPI 上的 `typesafe-ai` 包 | **同名噪声**：社区注册的 anti-squat 占位 redirect shim，非官方包 | 社区 awesome 列表注明 https://github.com/AnotiaWang/awesome-jev |
| MCP registries | mcpmarket.com 列有 "Askjev"（Jev second-opinion MCP）等；**registry 页面可见，对应源码仓库在所查范围未核实** | https://mcpmarket.com/ |

## 6. 特别核实：typesafe-ai/skills 是"直接调用 Jev"还是"教 agent 写集成"？

**结论：纯 instruction skill——只教 agent 怎么设计与编写 TypeSafe 集成；不含任何 scripts/CLI/MCP/tool。**

文件证据：
- 目录 `skills/typesafe-ai/` 全文列表只有两个文件：`SKILL.md`、`LICENSE`（GitHub 目录页直读）。无 `scripts/`、无 `bin/`、无 `package.json`、无 MCP server 定义、无 tool schema。
  URL: https://github.com/typesafe-ai/skills/tree/main/skills/typesafe-ai
- SKILL.md 自述定位："**This skill gives direction; the docs carry current concepts...**"、"Write API code → [HTTP API/Python SDK/JS SDK]"——即安装后 agent 获得的是设计原则 + 指向官方 docs/SDK 的链接，真正调用 Jev 需要 agent 现场写代码（经 SDK 或 HTTP）。
  URL: https://github.com/typesafe-ai/skills/blob/main/skills/typesafe-ai/SKILL.md
- 对比：同为 `typesafe-ai` org 的 `system-one-adapter-python` 才是带可运行代码的包；官方文档页 `docs.typesafe.ai/agent-skill` 的安装命令（`claude plugin install typesafe@typesafe-ai` / `npx skills add ...`）装的也是这个 instruction skill。

## 7. 分类汇总表

| 候选 | 分类 |
|---|---|
| OMP 18.2.4+ 内建 TypeSafe judgment 后端 | **ready-to-use（原生）** |
| blakestone-x/jev-mcp（含 Codex/Claude Code/Cursor 配置） | **ready-to-use（社区 MCP）** |
| jkudish/jev-mcp、itsmostafa/typesafe-mcp、rashedInt32/jev-mcp 等 | 社区 MCP（部分自述 PoC，成熟度不一） |
| Jevbridge / jev-router（OpenCode 桥） | 社区桥接层（早期，需自评成熟度）→ 偏 ready-to-use 但非官方 |
| typesafe-sdk / @typesafe-ai/sdk / @ai-sdk/typesafe-ai | **通用 SDK**（需自行开发业务代码） |
| system-one-adapter-python | **System One adapter**（方向相反，非调 Jev） |
| typesafe-ai/skills | **仅 instruction skill** |
| typesafe-mario、SemIf、jev-review、foreman 等 | **demo / 应用示例**（非宿主集成） |
| sgoedecke/system-one | **demo / 同名近似**（非 Jev，LLM 模拟层） |
| openai/codex `typesafe_overrides`、opencode i18n 命中、PyPI `typesafe-ai` 占位包 | **同名噪声** |
| skills.sh 目录中的 typesafe 条目 | **在所查范围未找到**（skills 的分发走 GitHub + npx skills CLI，未见 skills.sh 收录页） |

## 8. Karpathy 证据小结

本轮为只读调研，无代码改动；`karpathy-guidelines` 适用条款的执行证据：

1. **Think Before Coding（声明假设、呈现多种解释）**：对"集成"一词在每个宿主下的含义做了显式分类（原生内置 / MCP 可配 / instruction skill / SDK / 桥接层），没有把一个 MCP 配置片段笼统说成"OpenCode 支持 Jev"；对 dax 的 X 帖这类无法核实 repo 的线索降级标注，对 skills.sh 未命中写"在所查范围未找到"而非"不存在"。
2. **Goal-Driven Execution（可验证成功标准）**：任务要求的每个调查渠道（官方 org、三个目标仓库的 code search、skills CLI、MCP registry、npm/PyPI）都有至少一次实际检索记录与命中/未命中结论；关键断言（OMP 原生、skills 仅 instruction、Codex/opencode 无原生）均落到具体文件 URL（typesafe.ts、SKILL.md 目录页、CHANGELOG 18.2.4、config.toml 片段），可对账。
3. **Surgical Changes / Simplicity**：未对任何仓库或本机配置做写操作；仅新建任务指定的单个报告文件；扩展执行准则（证据分级、URL 可点击、只读无副作用）全部保持。
