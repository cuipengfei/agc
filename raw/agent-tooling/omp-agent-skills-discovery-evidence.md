# OMP 发现共享 skill 目录的资料与本机会话观察

> Source: [OMP skills documentation](https://github.com/can1357/oh-my-pi/blob/7c49c11aa5bb/docs/skills.md); [OMP agents discovery](https://github.com/can1357/oh-my-pi/blob/7c49c11aa5bb/packages/coding-agent/src/discovery/agents.ts); [skills CLI agent definitions](https://github.com/vercel-labs/skills/blob/b716f9dc2ba3/src/agents.ts); 本机会话的 CLI 输出与技能清单
> Collected: 2026-11-15
> Published: Unknown

## OMP 文档摘录

> The `agents` provider (`.agent[s]/skills`) has its own `enableAgentsUser`/`enableAgentsProject` toggles — disabling Claude/Codex/Pi does **not** turn it off. Foreign user-level providers are opt-in through `enabledProviders`; their project roots still load by default.

OMP discovery 源码对该 provider 的描述：

> Load skills from .agent/skills and .agents/skills (project walk-up + user home)

文档列出用户目录 `~/.agents/skills`；已有 graphify 集成记录也记载 OMP 可扫描 `~/.pi/agent/skills/`。是否实际发现技能取决于 provider 与相关开关。

## skills CLI 的 Pi 条目摘录

`vercel-labs/skills/src/agents.ts` 中 `pi` 条目的注释与字段：

```typescript
// See https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/skills.md
skillsDir: '.agents/skills',
globalSkillsDir: join(home, '.agents/skills'),
```

这里的条目引用 pi-mono 文档。CLI 定义的安装目标与 OMP 可扫描的目录应分别判断。

## 本机会话观察（2026-11-15）

本机 `~/.omp/agent/config.yml` 中 `skills.enabled: true`。本会话的可用技能清单包含 pstack、mattpocock 与 ub-mode 的部分 skill。没有逐项核实同名技能最终由哪个 provider 提供，也没有逐项调用执行。

`omp skill search <query> --json` 对 `pstack`、`mattpocock`、`ub-mode`、`poteto` 各自返回 `total: 0`、`hits: []`。这是当次四次关键词查询结果。
