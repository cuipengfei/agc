# backpass：把会话证据回灌到指令文件

> Sources: kunchenguid/backpass 0.1.36 源码与 README，2026-10-19; acpx 0.19.6; agc 仓库本机运行记录，2026-10-19
> Raw: [backpass 在 agc 仓库的 OMP 会话分析运行证据](../../raw/harness-engineering/2026-10-19-backpass-agc-run-evidence.md)
> Updated: 2026-10-19

## Overview

backpass 是一个本地命令行工具，把「指令文件维护」当成训练循环：`AGENTS.md` / `CLAUDE.md` 是权重，token 预算是模型规模，每次 agent 会话是前向传播，实际表现与预期的差距是损失，读会话、改文件是反向传播。它只维护项目级文件与项目 skills；用户级文件不在默认范围内。

它不做运行时控制，也不改 harness 行为。一次完整运行结束于一份带证据引用的修改提案，写入只发生在人工审核之后。

## 两个独立的选择

backpass 有两套互不相干的选择，混淆这两者会得出「为什么读我的 OMP 会话却让 Codex 分析」的疑问：

- **读谁的会话**：由 `--harness` 与 `discovery` 配置决定。它读取本机各 agent 存储里的历史会话，包括 OMP。
- **谁来分析**：由 acpx 另起一个 agent 进程完成。它不会复用你当前正在对话的这个会话，也读不到那段对话状态。

两条梯队各自独立选择：分析用中档模型，生成建议用高推理模型。默认梯队都是 `gpt-5.6-luna` / `gpt-5.6-sol`，候选 harness 依次为 pi、opencode、codex，然后是 claude 或 grok 的对应模型。这里的 pi 是 acpx 的上游 pi（经 pi-acp 启动 `pi --mode rpc`），不是 OMP。每个候选先做零 token 探测，第一个「已安装、已登录、且提供该模型」的 harness 上场；设置 `agent` 会固定该阶段并跳过整条梯队。

## 五段流程

1. **发现**：扫描本机各 harness 存储，按会话头的 `cwd` 判定哪些会话属于当前仓库。`--strict` 只保留确定性关联。
2. **蒸馏与抽样**：去掉工具输出等长正文，只留提问、回答与每次工具调用的单行形态；超过上限后抽一个可复现样本。
3. **逐会话计算损失**：每个新会话一次模型调用，判断现有指令哪些帮了忙、哪些被违反、哪些问题缺少指令，每条结论附原文引用。
4. **聚合**：把重复出现的问题折叠成跨会话证据；只在单个会话出现的问题不进入改动。
5. **合成与人工闸门**：高推理模型在暂存副本里改写文件，程序计算 diff，检查引用、跨会话证据与预算，然后等你逐条接受或拒绝。

## 证据门槛与确定性测量

- 新增、改写或删除指令通常需要 2 个不同会话的支持；删除还需要「有害」类证据。
- 引用必须与会话原文逐字对应。转述不算证据：本次运行有 9 条引用因此被丢弃。
- token 预算、会话计数、diff 位置由程序测量，不采信模型自报的数字。
- 合成阶段写的是仓库的暂存副本，直接写原文件会被拒绝。
- 阈值不满足时只返回一次重新提示；第二次仍失败则不写入。

## 抽样、缓存与成本

超过 `--max-transcripts` 后，抽样是**近期加权粘性抽样**，不是均匀随机：越新的会话权重越高，`sampleHalfLife` 控制权重减半的年龄；同时按交互式 / 非交互式分池，占比低于上限 20% 的一类会被抬到地板，避免纯后台记录把交互会话挤出样本。`--seed` 的语义是「换一批可复现的样本」，换种子不等于换随机分布。

`--since` 按文件修改时间过滤，不按会话文件名里的时间戳。

分析结果缓存的键是会话内容签名加记忆文件哈希，**不含模型与 harness**。因此换模型重跑时必须加 `--force`，否则会直接复用上一次模型产出的证据。

## 安装与首次运行

需要 Node >= 22.5，以及 acpx 在 PATH 中。backpass 自身没有 API key，所有模型调用都经 acpx 转给已登录的 harness。

另外，acpx 的 `pi` agent 要求 PATH 上有 `pi` 命令（`npx pi-acp` 会再启动它）；`omp` 不在 acpx 的任何内置 agent 里。

```sh
bun add -g backpass     # 或 npm install -g backpass
bun add -g acpx
```

`lavish-axi` 只服务默认的浏览器审核界面；用 `backpass apply --no-ui` 在终端审核时不需要安装它。

```sh
cd <repo>
backpass init                    # 生成 .backpassrc.json
backpass scan --harness pi --strict   # 只看发现结果，不调用模型
backpass --max-transcripts 15 --seed 1   # 完整运行，产出提案，不写文件
backpass apply --no-ui           # 逐条接受或拒绝
```

`acpx status` 只显示 ACP 会话状态，不能用来确认各 harness 的登录情况；登录与否在分析阶段由探测判定。

## OMP：会话来源，不是分析工人

OMP 会话收集默认关闭，需要在 `.backpassrc.json` 里打开：

```json
{ "discovery": { "includeOmp": true } }
```

`--harness pi` 表示 pi 这一来源，实际是三个存储的并集：`~/.pi/agent/sessions/`、`~/.bb/pi-bridge-sessions/`、以及开启后的 `~/.omp/agent/sessions/`。OMP 的 JSONL 首行是标题、第二行才是会话头，且支持一层嵌套的子 agent 记录；其他存储按一层读取。`--strict` 用会话头里的 `cwd` 做精确匹配，枚举阶段会读取其他项目会话的头部来判定归属，这些头部不进分析语料。

### acpx 的 pi 是上游 pi

acpx 的 agent 注册表把 `pi` 定义为 `npx pi-acp`，并要求 PATH 上有 `pi` 命令：

```js
pi: {
  name: "Pi",
  argv: ["npx", `pi-acp@${ACP_ADAPTER_PACKAGE_RANGES.pi}`],
  requiredCommands: ["pi"],
```

pi-acp 自身再启动 `pi --mode rpc --no-themes`。因此 `--analysis-agent pi` 启动的是 `~/.bun/bin/pi`，与 `~/.bun/bin/omp`（18.12.2）是两个二进制。`--harness pi` 与 `--analysis-agent pi` 都选中名为 pi 的来源，但后者执行的分析进程与 OMP 无关。

### 让 OMP 当工人：v0.1.36 没有可用路径

传输层可以先验证。acpx 支持自定义 agent，`~/.acpx/config.json` 加一条即可：

```json
{
  "agents": {
    "omp": { "argv": ["/home/cpf/.bun/bin/omp", "acp"] }
  }
}
```

之后 `acpx omp sessions new`、`acpx --format json omp status` 与 `acpx --model <id> omp exec` 都能正常启动 `omp acp`，会话公布 882 个模型。但 backpass 只对 `pi`、`grok`、`claude`、`codex`、`opencode` 实现调用级模型与 effort 覆盖，其余 agent 一律拒绝：

```
error omp has no proven invocation-scoped way to apply model=... and effort=... without writing persistent harness defaults
  pin pi, claude, codex, grok, or opencode, or omit the model and effort override
```

省略模型也绕不过去：`resolvedEffort` 对 `opencode` 以外的 agent 永远返回角色默认值（分析 `medium`、生成 `high`），覆盖请求仍然成立。

把内置的 `pi` 名字替换成 OMP 也走不通。项目级 `.acpxrc.json` 里写 `agents.pi.argv = ["omp","acp","--model","c8787/gpt-5.6-luna"]` 后，`acpx pi` 确实由 OMP 执行，但 backpass 在建立会话后拒绝继续：

```
error cannot safely apply model or effort overrides because acpx agents.pi replaces the proven built-in adapter
  remove the agents.pi replacement or omit the model and effort override
```

让 pi-acp 改启动 omp 同样不通，会话在建立阶段断开，报 `Cannot call write after a stream is destroyed`。三条路径都被同一处设计堵住：覆盖必须作用在 backpass 认可的内置适配器上，而 `omp` 不在名单里，角色 effort 默认值又必然触发覆盖。

### 模型 ID 以 OMP 公布列表为准

OMP 的 ACP 会话公布 882 个模型，`openai/gpt-5.6-luna` 与 `openai/gpt-5.6-sol` 不在其中（`omp models` 目录里有，ACP 不公布）。本机逐项实测：

| 模型 ID | 结果 |
|---|---|
| `c8787/gpt-5.6-luna` | 正常返回 |
| `c8787/gpt-5.6-sol` | 正常返回 |
| `opencode-zen/deepseek-v4.1-flash-free` | 正常返回 |
| `openai-codex/gpt-5.6-luna` | websocket 传输错误 |
| `opencode-go/gpt-5.6-luna` | 需要订阅 |
| `openrouter/openai/gpt-5.6-sol` | 地区不支持 |
| `opencode-zen/gpt-6-luna` | 地区不支持 |

provider 前缀取决于你实际登录的 provider，换机器要重新跑一遍 `acpx --format quiet --model <id> omp exec "Reply with the single word ok"` 确认。升级 backpass 后可以用同样方式判断 OMP 是否已进入覆盖允许清单。

## 本次实测校准

在 agc 仓库对 30 天窗口运行，语料全部来自 OMP：

| 项 | 数值 |
|---|---|
| OMP agc 会话体积 | 4.5G |
| 顶层主会话 / 30 天内（按 mtime） | 120 / 106 |
| 一层嵌套记录 | 495 |
| 扫描 / 匹配 | 502 / 364（tier1 精确匹配） |
| 匹配语料构成 | 交互式 106、非交互式 258 |
| 本次样本 | 15（交互式 4、非交互式 11） |
| 分析 token / 生成 token | 911,775 / 249,810 |
| 总耗时 | 487.82 秒 |
| 提案 | 4 条改写，预算 4,236 → 4,277 / 5,000 |

这组数字只说明一次 15 条样本运行的成本量级；语料越大，扫描与蒸馏越慢，但模型调用只随样本数增长。

## 与 Better Harness 的分工

两者都分析历史会话、给出配置层面的建议。Better Harness 产出五维健康报告与修复计划，不写入文件；backpass 直接生成可审核的指令改动，并在人工接受后写入。前者适合体检，后者适合把重复出现的问题真正修进规则。

## See Also

- [Better Harness](../better-harness/better-harness.md) — 同属会话分析工具，产出五维报告且不写入
- [OMP 上下文文件发现与优先级](../omp-context-files/context-file-discovery-and-priority.md) — 指令文件如何被加载、组合与 shadow
- [OMP 会话 JSONL 格式与第三方解析](../omp-sessions/jsonl-format-and-third-party-parsers.md) — 首行标题与嵌套记录的格式细节
