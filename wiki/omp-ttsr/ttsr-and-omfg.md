# OMP TTSR 与 /omfg：流式行为护栏

> Sources: oh-my-pi 源码与官方文档，2026-08-24；本会话 OMP 活体演示，2026-08-24
> Raw: [机制调研](../../raw/omp-ttsr/2026-08-24-omp-ttsr-omfg-mechanism.md); [活体演示](../../raw/omp-ttsr/2026-08-24-omp-ttsr-live-demo.md); [重复 XML 注入实验](../../raw/omp-ttsr/2026-08-25-ttsr-repeated-injection-session-test.md)
> Updated: 2026-08-27

## 速查

- **TTSR**：流式行为护栏——模型输出流到一半命中规则的 regex/AST 条件时，中止生成、注入规则、从断点重试
- **/omfg**：规则生成入口——`/omfg <你的抱怨>` → 生成规则 → 用会话历史验证 → 确认保存 → 即刻生效
- **触发前提**：规则启用 + 命中 + scope/globs 匹配 + 未被重复抑制 + `interruptMode` 允许中断（以上为中途掐断前提；命中≠中断——`interruptMode: never` 下规则仍命中，只是不掐断、改为事后提醒）
- **关键配置**：`ttsr.interruptMode: always`（掐断）+ `contextMode: discard`（抹掉出轨消息）
- **不要用**：需要语义理解的判断（它只有 regex/AST，没有 LLM 分类器）；指望它阻止已流出的 token（中止的是"继续生成"，已流出的收不回）

## 机制

### TTSR

模型输出流到达 OMP 后，对每个增量做确定性匹配。命中时按 `interruptMode` 分流：允许中断 → abort + 注入规则 + 从断点重试；不允许 → 事后注入提醒。规则命中前已流出的片段可能已经显示、已消耗生成资源（计费取决于 provider，未核验）。

监控范围：`text_delta`/`thinking_delta`/`toolcall_delta` 三种流都进入管线，但**默认 scope 只覆盖正文 + 工具参数，不含 thinking**——需规则显式声明 scope 才监控 thinking（docs/ttsr-injection-lifecycle.md:54,258）。

匹配只有两种：regex（`condition`）和 ast-grep 结构模式（`astCondition`）。零 LLM、零语义理解——这是刻意的成本取舍（上游 #8192 提议加 tiny model 分类器，未实现）。

### /omfg

用**调用时会话的当前生效模型**（无独立 role），读取**当前可用上下文**（compaction/reset 后的历史不在其中；进行中消息只补 thinking+text，不含 tool-call blocks）。生成候选后用 assistant 历史做本地 regex 校验，面板确认后写入项目级 `.omp/rules/` 或全局 `~/.omp/agent/rules/`，保存即 live 生效。

## 配置

| 键 | 合法值 | 含义 |
|---|---|---|
| `ttsr.enabled` | `true`/`false` | 总开关。默认 `true` |
| `ttsr.contextMode` | `discard`/`keep` | discard = 整条删除被中断的 assistant 消息（含命中前正文）再重试；keep = 保留续写。默认 `discard` |
| `ttsr.interruptMode` | `always`/`prose-only`/`tool-only`/`never` | 哪类流允许中途掐断；never = 事后提醒。默认 `always` |
| `ttsr.repeatMode` | `once`/`after-gap` | once = **每条规则**在该会话最多注入一次（注入记录跨 compaction/resume 存活）；after-gap = 间隔后可再触发。默认 `once` |
| `ttsr.repeatGap` | 普通 `number`（非 enum；schema 未声明范围约束，未核验解析层边界） | after-gap 的间隔，单位是**已完成 turn**（turn_end 才加一）。UI 快捷档 5/10/15/20/30，默认 10 |
| `ttsr.builtinRules` | `true`/`false` | 是否加载内置规则包。默认 `true` |
| `ttsr.disabledRules` | string[] | 按名屏蔽，内置与自定义均生效。默认 `[]` |

**当前配置**：`discard` + `always` + `after-gap` + `repeatGap: 5`——每 5 个 turn 允许同一规则再次触发（实验性偏严格的选择，非官方推荐值）。

## keep vs discard

| | discard | keep |
|---|---|---|
| 上下文洁净度 | ✅ 违规消息整条消失，后续模型看不到 | ❌ 违规内容留在上下文 |
| token 成本 | ❌ 命中前部分作废重写 | ✅ 已生成的保留 |
| 输出连贯性 | ❌ 重写从零开始 | ✅ 续写保脉络 |
| 适用 | 方向性错误 | 局部瑕疵 |

**立场**：discard 是对的默认——TTSR 的核心价值就是"错话不进上下文"。keep 只在长输出尾部局部瑕疵时占优。per-rule contextMode 是 open issue [#7182](https://github.com/can1357/oh-my-pi/issues/7182)，目前只有全局开关。

## 与 Skills 的边界

- **Skills**：模型主动发现、自觉采纳的做事方法——skill 里的禁令靠模型自觉遵守
- **TTSR**：harness 侧监测、满足条件即介入的行为护栏——模型无发起权与否决权；但"强制"有边界：已流出片段收不回，`never`/禁用/抑制/未命中时退化为事后提醒或不在场

真正的分界线是**执行保证强度**，不是"该做/不该做"——两边都可以写禁令，约束力不同。

## 活体演示（2026-08-24，本会话）

`/omfg` 锻造规则 → 保存到 `.omp/rules/verify-before-mechanism-claims.md`（Registered live）→ 下一条回复被 `system-interrupt reason="rule_violation"` 中途掐断 → 默认 `once` 下重复措辞未二次触发。证明了本会话内一次完整生命周期；不证明所有规则/provider/模式行为一致。

## 重复注入实验

在 `repeatMode: after-gap`、`repeatGap: 5` 的配置下，本会话继续进行无害对话后，两条自定义规则都再次触发：`no-git-commit-without-explicit-request` 和 `verify-before-mechanism-claims` 各自至少出现两次 `<system-interrupt ...>` occurrence。再次触发产生新的注入 occurrence，不是刷新旧条目。

这里的证据范围是**当前会话可见上下文**；它不等同于 transcript 精确总数，也不声称这些正文在后续 compaction 后仍全部保留。完整 occurrence 前后片段与观察边界见 [重复 XML 注入实验记录](../../raw/omp-ttsr/2026-08-25-ttsr-repeated-injection-session-test.md)。

## 已知问题与社区反响

官方主推卖点（README poster + 视频）；独立用户实测口碑证据**空白**（未发现可核验的 HN/Reddit/X 实测评价——非负面，是无数据）。

已修：#1767（开关不生效）、#2783（兄弟调用波及）、#3646（hashline 路径作用域）、#5489（静默不注册）。仍 open：#7960（iTerm2 EOF 误退出）、#8192（语义分类器）、#8583（手动编辑草稿）、#7158/#7182（per-rule repeat/context）。状态以各 issue 页面为准（2026-08-24 快照）。

## 适用判断

**适合**：确定性的重复行为约束——格式、禁语、项目红线。出轨偶发时比 always-apply 规则省 context。

**不适合**：语义判断（它不懂意图）；出轨高频的规则（abort+重试成本可能反超常驻提示）；指望它防住已流出的输出。

## 未决问题

- 误命中/频繁触发对交付质量与总成本的影响无 benchmark
- 命中前已流出片段的各 provider 计费行为未核验
- `/omfg` 候选规则的长期误报率与维护成本无独立统计
- after-gap 在恢复会话中的体验未专门实验

## See Also

- [OMP 工作模式与 Magic Keywords](../omp-modes/modes-and-magic-keywords.md) — TTSR 与 magic keywords 等触发机制的定位及组合边界。
