# Coding Agent 候选发现方法

> Sources: 本会话 wide-narrow-deep 流程 + 用户标注裁定
> Raw: [候选发现全流程](../../raw/ai-coding-agents/2026-09-04-candidate-discovery-wide-narrow-deep.md)
> Updated: 2026-09-04

## 一句话

找候选和排候选是两件事。找的时候不看星数,漏了才是问题;排的时候才用证据。

## 发现(召回,不打分)

五路并行,成本从高到低:

| 路 | 成本 | 精度 | 备注 |
|---|---|---|---|
| GitHub topic + 描述搜索 | 高 | 低 | 22 轮查询 736 个命中,大多是 skills/awesome-list/MCP server/框架 |
| 厂商官方 CLI 点名 | 低 | 高 | Anthropic/OpenAI/Google/Qwen/Kimi/xAI/DeepSeek/GitHub 各出一个,最好找 |
| awesome-list 提取 | 低 | 中 | 5 份 README 提 ~380 个 slug,滞后但召回高 |
| benchmark 榜单 | 中 | 高 | SWE-bench 参赛者名单;tbench.ai 是 JS 渲染,API 拿不到 |
| fork 网络 | 中 | 高 | 未测,但 fork 的存在理由通常就是一个差异点 |

## 过滤(门,二值)

1. 去重:剔除已有对比对象
2. 存活:非 archived、非 fork、近期有 push;**README 说停更的排除,API 字段会骗人**(continue 的活例:API 报 `archived=false`、今天有 push,README 写 `read-only, no longer actively maintained`)
3. 相关:描述/topics 命中 coding/agent/terminal/CLI,排除 awesome-list、skill、plugin、MCP server、framework、orchestration

## 深挖(证据,排序)

README 机制词扫描是便宜的先行代理,能筛出机制密度高的候选。但它是**负证据**——没扫到不等于没有,不能当排除依据。

真正决定「值得看」的是机制词命中后的**语义密度**:DeepCode 四条全对上已有轴(session/compaction/hook/并行冲突),claurst 三条(plugin/forking/子 agent),hermes-agent 两条(interrupt/子 agent)——但用户一眼判它不是 coding agent。

## 流行度的真实用途

star 和下载量只决定先看谁,不决定谁进池子。claw-code 195k star 但 fork/star 比 0.55、issue 仅 41,刷量特征明显——star 数在这恰好证明了它不能当信号。

## 本次产出

8 个值得看 + 1 个低优先 + 16 个已移除,详见 raw。

最高优先级三个:**pi-mono**(OMP 上游,校准已有结论)、**DeepCode**(机制密度最高)、**claurst**(小但机制面宽)。

## 方法学教训

1. topic + star 搜索精度差,厂商点名 + awesome-list 才是有效召回
2. README 机制词扫描便宜但只是负证据
3. 用户标注比自动过滤准
4. star 数会骗人,fork/star 比和 issue 数是更好的信号

## 未覆盖

crates.io、Homebrew/AUR、fork 网络、Product Hunt/Show HN。
