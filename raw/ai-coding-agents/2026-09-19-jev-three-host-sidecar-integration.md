# Jev 作为 sidecar 决策能力：Codex / OpenCode / OMP 三宿主集成路径（v2 修正版）

> Source: 本会话只读调查 + 本机安装源码核验（未安装、未注册、未调用任何端点）
> Collected: 2026-09-19
> Published: Unknown

- 日期：2026-09-19。只读调查 + 本机安装源码核验；未安装、未注册、未调用任何端点。
- 定位：Jev（TypeSafe System One）作为**附加的快速决策/裁决 sidecar**，不替代各宿主的主模型。
- 相对 v1 的四处修正：① OMP 首选**原生** 18.2.4+ 内置 TypeSafe judgment provider（本机已装 18.2.5，源码核验），MCP 降级为自定义用途；② Codex 首选**已审计的第三方** `blakestone-x/jev-mcp` v0.2.1，不再先要求自写；③ OpenCode 核实结论：**jev-mcp 可直接复用**（宿主无关 stdio MCP），Jevbridge 不更直接；④ 自写共享 MCP 移到最后备选。

---

## 0. 先分清两个"现成"轴（本报告的核心分层）

| | **宿主侧现成机制**（host mechanism） | **Jev 侧现成组件**（Jev component） |
|---|---|---|
| 定义 | 宿主本来就有的接入点：OMP 的 judgment provider / eval `judge()`、Codex 的 `[mcp_servers]`、OpenCode 的 `mcp` map + 自定义 tool | 别人已写好的 Jev 对接件：OMP 内置 `TypeSafeJudge`、`blakestone-x/jev-mcp`、Jevbridge、官方 instruction skill |
| 验证方法 | 读宿主文档/源码 | 读组件源码 + registry 元数据 |
| 本项目判定 | 三宿主都有（见下） | **真正 ready-to-use 的只有 OMP 内置一项**；Codex/OpenCode 的第三方 MCP 属"可配置使用、成熟度低" |

v1 的 blocker 正是把这两条轴混在一起：把"宿主有 MCP 机制"当成了"Jev 有现成组件"。修正后按宿主给出最短可用路径。

---

## 1. OMP —— 首选原生（ready-to-use），MCP 仅自定义用途

### 判定
本机安装 `@oh-my-pi/pi-coding-agent` **18.2.5**（> 18.2.4），原生 TypeSafe judgment provider 已随 18.2.4（2026-09-17）发布，源码已在本地安装包内核实存在。这是三宿主中唯一**一方原生**的集成——零组件要写、零第三方依赖。

### A. 现成项 + 安装/配置
- 现成项 = 宿主机制 + Jev 组件**合二为一**（`TypeSafeJudge` 已内建）。
- 配置（三选一即可，按优先级）：
  1. `omp` 会话内 `/login typesafe`（走 auth registry，key 不落配置文件）；
  2. 环境变量 `TYPESAFE_API_KEY=ts_live_...`；
  3. config.yml：`providers.judgmentProvider: typesafe`（`auto`/`typesafe`/`llm`；`auto` 有 key 走 TypeSafe、无 key 回退 chat 链）。
- 可选调优：`TYPESAFE_DEFAULT_MODEL`（默认 `jev-latest`）、`TYPESAFE_BASE_URL`（默认 `https://api.typesafe.ai`）。

### B. sidecar 路径
原生 judgment 接口就是 sidecar：请求按 `POST /v1/systemone` 发，**带 429/529 retry-after 感知退避、401/403 key 轮换**（本地 `pi-ai/src/judgment/typesafe.ts` 核实），失败自动沿 `tiny → smol → default → 会话模型` 回退。主模型完全无感。

### C. 需要写的组件
**零。** 自定义用途（比如你在 eval cell 里想批量 A/B 自己的 state 分类）才用到 18.2.4 新增的 `judge(state, questions)` helper——也是现成的。只有要把 Jev 以 MCP tool 形式塞进 OMP 对话循环做自定义判定时，才走 §4 的 MCP 路径——那是"自定义需求"，不是最短路径。

### D. 凭据位置
auth registry（`pi-catalog` 的 `typesafe.kdl`），与 provider key 同 vault 管理；或环境变量。不落明文配置。

### E. 一个具体工作流
长会话中 OMP 的 Smart unexpected-stop 检测自动把"任务真的停了 vs 只是自然段落"分类（走 Jev），避免假恢复；git TUI AI staging 让 Jev 对 hunk 做 yes/no 快判；你在 cell 里 `judge(state, questions)` 对重构方案做多题打分——主模型只做需要推理的正文。

### 用例
thinking-level 难度分类、unexpected-stop 智能检测、git TUI AI staging、eval 内任意 typed decision。

**本机证据**：`node_modules/@oh-my-pi/pi-ai/src/judgment/typesafe.ts`、`pi-catalog/.../auth/typesafe.kdl`、`coding-agent/CHANGELOG.md [18.2.4]`、`docs/environment-variables.md` §TypeSafe judgments（upstream）。关键 limit：这是内部 judgment 后端，**不是把 Jev 暴露为 OMP 聊天主模型**。

---

## 2. Codex —— 首选已审计的 blakestone-x/jev-mcp v0.2.1

### 判定
Codex 无任何原生 TypeSafe 支持（upstream code search 仅 `typesafe_overrides` 同名噪声，已核实）。宿主侧现成机制 = `[mcp_servers.*]`；Jev 侧现成组件 = 社区 MCP server。**最短可用路径 = 配一段 config.toml，不是自写。**

### A. 现成项 + 安装/配置
`~/.codex/config.toml`：

```toml
[mcp_servers.jev]
command = "uvx"
args = ["--from", "git+https://github.com/blakestone-x/jev-mcp.git@v0.2.1", "jev-mcp"]
env = { TYPESAFE_API_KEY = "ts_live_..." }   # 或从 shell 环境继承，避免落盘
# 可选：startup_timeout_sec / tool_timeout_sec / enabled_tools = ["classify","score","check","match","screen"]
```

依赖：`uv`（`uvx` 拉起远程包）。仓库自带 `scripts/register.sh` 辅助注册。

### B. sidecar 路径
stdio MCP server → Codex 启动时拉起 → 工具（classify/score/check/match/screen）直接出现在 agent 工具面。LLM 主模型编排，Jev 只做单题 typed 决策，一次调用一次回答。

### C. 需要写的组件
**零**（首选路径下）。自写仅当审计不通过时，见 §4。

### D. 凭据位置
`TYPESAFE_API_KEY` 经 MCP `env` 传给 server 进程；建议 shell 环境注入而非写进 config.toml 明文。

### E. 一个具体工作流
review 循环：主模型产出 findings → 批量 `screen`/`check` 让 Jev 做初筛（是真问题/误报/已修复）→ 主模型只对幸存者做终审与改写。一次审查 Jev 承担 O(n) 快判，主模型承担 O( survivors ) 深推理。

### 第三方成熟度（必须注明）
- `blakestone-x/jev-mcp`：**7★、3 commits、单人、无 CI、无测试目录（所查范围）**，SECURITY.md 存在；我对 `src/` 核心 5 文件（server/orchestrator/judge/tools/config）+ `uv.lock` 做过代码抽查，与 README 声称一致、未见 key 外传——但**抽查 ≠ 背书**，且 `uvx --from git+...` 每次冷启动执行远端代码，生产应 pin tag + 复核或 vendor。
- 备选：`jkudish/jev-mcp`（TS，69★，自述 PoC）、`itsmostafa/typesafe-mcp`（Go，62★）等，均未逐一审计。
- 结论：**"可配置使用、成熟度低"，是现成选项中最短路径，但不是无风险选项。**

---

## 3. OpenCode —— 复用 jev-mcp（核实结论：能复用，Jevbridge 不更直接）

### 判定
OpenCode 无原生 TypeSafe 支持（upstream code search 命中均为 i18n/测试噪声，已核实）；且 TypeSafe API 不兼容 OpenAI/Anthropic 协议，**不能靠填 baseURL 直连**。宿主侧现成机制 = `opencode.json` 的 `mcp` map（+ 自定义 tool 目录）。jev-mcp 是**宿主无关的 stdio MCP server**，OpenCode local MCP 就是跑 command——**同一份 jev-mcp，Codex/OpenCode 通用**。

**jev-mcp vs Jevbridge 核实对比**：
| | blakestone-x/jev-mcp v0.2.1 | gamesonrblx/Jevbridge |
|---|---|---|
| 接入 OpenCode | `mcp` map 一段 config，零代码 | 同样走 MCP，但需 clone+build（TS 源码，无发布包证据） |
| 体量 | 单一职责：typed decisions（5 工具） | ACP + computer use 超集（5 commits、13★），scope 超出 sidecar 决策 |
| 成熟度 | 低（见 §2） | 更低（Jev 发布 1 天内新建，5 commits） |

结论：**最短路径 = 与 Codex 完全同一份 jev-mcp**；Jevbridge 仅当你还要 ACP/computer-use 时才算"更直接"。

### A. 现成项 + 安装/配置
`~/.config/opencode/opencode.json`（或项目级 `opencode.json`）：

```json
{
  "mcp": {
    "jev": {
      "type": "local",
      "command": ["uvx", "--from", "git+https://github.com/blakestone-x/jev-mcp.git@v0.2.1", "jev-mcp"],
      "environment": { "TYPESAFE_API_KEY": "ts_live_..." },
      "enabled": true
    }
  }
}
```

MCP tools 自动对 LLM 可见，无需额外注册。

### B/C/D/E
同 §2 的 B/C/D/E：stdio sidecar、零自写、env 传 key、workflows 相同（review 初筛 / 任务分诊 / 周期 classify 决定 escalate）。OpenCode 特有补充：长任务中周期 `classify` 决定是否需要升级主模型；subagent 分发前 `score` 难度定路由。

### 第三方成熟度
与 §2 相同 caveat，外加一层：上述两仓库均为 Jev 发布后数日内新建，**生态整体处于早期**；OpenCode 官方插件市场在所查范围未找到 TypeSafe 插件。

---

## 4. 自写共享 MCP —— 最后备选（不是首选）

仅当：jev-mcp 审计不过、或需要 OMP/Codex/OpenCode 三宿主共享一个统一 tool 面、或需要定制 state schema 时。路径：
1. phase-zero：先按 `omp-advisor-payload-phase-zero` 的方式抓一份匿名真实 state → 定 `JudgmentRequest` schema；
2. 实现：Python `mcp` SDK + `httpx`，对 `POST {base}/v1/systemone` 发 judgment，单 state 一次调用，expose classify/score/check 三工具即可（~150 行）；
3. 凭据走 env，不落盘；错误按 401/422/429/529 分档透传。

显式声明：**这是备选，不是任何宿主的最短路径。**

---

## 5. 凭据与访问流程（三宿主共用）
- key 获取：console.typesafe.ai 控制台（early access/waitlist 期；是否每申请必审批/即时自助 = **未验证**）。
- 统一环境变量名 `TYPESAFE_API_KEY`（OMP 原生、jev-mcp 均读它）。
- 用量边界：250k tok/s、1200 rpm（动态）；64k/请求（state + 最长 question 32k）；纯文本输入。错误码 401/422/429/529。

---

## 6. 最短可用路径汇总

| 宿主 | 最短路径 | 自写量 | 成熟度 |
|---|---|---|---|
| OMP 18.2.5 | `/login typesafe` 或 `TYPESAFE_API_KEY` → 原生 judgment 即用 | 0 | 一方原生，已发布 |
| Codex | config.toml 一段 → jev-mcp v0.2.1 | 0 | 第三方，低（已抽查） |
| OpenCode | opencode.json 一段 → 同一份 jev-mcp | 0 | 第三方，低（同上） |

自写共享 MCP 只在三者都不满足时出现。

## 7. 证据清单
- 本机安装源码（已读）：`~/.bun/install/global/node_modules/@oh-my-pi/` 下 `pi-ai/src/judgment/typesafe.ts`、`pi-catalog/src/compat/rules/auth/typesafe.kdl`、`coding-agent/src/judgment/`、`coding-agent/CHANGELOG.md [18.2.4] 2026-09-17`、`pi-ai/src/eval/judgment-bridge.ts`（`judge()` helper）。
- upstream：`github.com/can1357/oh-my-pi` `docs/environment-variables.md` §TypeSafe judgments、`docs/mcp-config.md`、`docs/extensions.md`。
- 第三方：`github.com/blakestone-x/jev-mcp`（v0.2.1 tag、README Codex/OpenCode/Cursor 配置、`uv.lock`）、`github.com/gamesonrblx/Jevbridge`（13★、5 commits、TS）、`github.com/jkudish/jev-mcp`（69★ PoC 自述）。
- TypeSafe：`docs.typesafe.ai/api.md`（`POST /v1/systemone`）、`llms.txt`（索引无 MCP 条目 → 无官方 MCP server）。
- 负证据：Codex `typesafe_overrides`=serde 噪声；OpenCode typesafe/jev 命中=i18n/测试噪声。

## 8. Karpathy 证据小结
1. **Think Before Coding**：先分清"宿主机制现成"与"Jev 组件现成"两条轴再下结论；对"已审计"限定为抽查范围（5 核心文件+lockfile），不夸大为全面审计。
2. **Read Before Writing**：OMP 结论基于本机 18.2.5 安装包内源码直读 + upstream changelog/env doc 双向核实，非仅凭线上文档。
3. **Surgical Changes**：报告按 blocker 逐条对应修正（§0 分层 + §1–4 结构），未引入新范围。
4. **Verify with Evidence**：所有配置片段来自已读 README/官方文档；所有"无原生支持"均给出 code search 噪声证据而非"没搜到"。
5. **declare done when**：每宿主的"最短可用路径 + 用例 + 成熟度"均已给出，无遗留占位断言；唯一未验证项（key 自助获取）已显式标注。
