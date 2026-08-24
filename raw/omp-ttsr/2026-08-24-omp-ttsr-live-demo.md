# OMP TTSR 与 /omfg 活体演示记录

> Source: 本会话的 OMP 运行事件与项目级规则 `.omp/rules/verify-before-mechanism-claims.md`
> Collected: 2026-08-24
> Published: 2026-08-24

## 观测到的过程

本会话通过 `/omfg` 生成并注册了项目级 TTSR 规则：

```text
/home/cpf/code-inside/agc/.omp/rules/verify-before-mechanism-claims.md
```

终端显示：`Registered live`。随后下一次回答被系统事件中断：

```text
system-interrupt reason="rule_violation" rule="verify-before-mechanism-claims" path=".omp/rules/verify-before-mechanism-claims.md"
Output interrupted: violated user-defined rule.
```

这是系统层活体观测：规则已注册、匹配后输出被中断。它证明本会话中的一次 TTSR 命中和中断，不证明所有规则、所有 provider 或所有 interruptMode 都有相同表现。

## 规则实际内容

规则要求：

1. 涉及源码、配置、机制行为的断言，先 grep/read 核验，并附文件:行号或 URL。
2. 无法核验的判断必须标注“推断/未实测”。
3. 不得把 OMX/Codex 等其他系统的规则或模型表当作 OMP 行为依据。
4. 没有证据就直说没有，不用确定语气包装猜测。

规则的条件被描述为：匹配“绝对化措辞 + 机制名词”的组合，而不是某个具体历史错句。该说明是规则作者对误报取舍的解释；本记录没有把它当作独立的运行时正则源码证据。

## repeatMode 配置实验

本会话早先使用：

```yaml
ttsr:
  enabled: true
  contextMode: discard
  interruptMode: always
```

此时未显式设置 `repeatMode`，因此按已读 schema 默认值为 `once`。第一次命中后重复使用相关措辞没有再次中断，符合 once 的抑制行为；这是一次观察，不是独立 benchmark。

之后配置被改为：

```yaml
ttsr:
  repeatMode: after-gap
  repeatGap: 5
```

并执行 pull，将同样的两行变更写入仓库副本 `omp/agent/config.yml`。`repeatGap` 是普通 number，不是 enum；5 是本次选择的值。其计数单位按文档是已完成 turn，不是 token 数。

## Skills 与 TTSR 的心智模型

可用但需精确化的简化说法：

- Skills 主要提供模型可以主动采用的做事方法和知识，触发/采用依赖模型识别和读取；skill 中也可以包含建议性禁令。
- TTSR 是 harness 侧监测的行为护栏；规则启用、命中、作用域匹配、未被重复抑制且 interruptMode 允许时，harness 会中止继续生成，并在 discard 下不把被中断的整条 assistant 消息保留到后续上下文。
- 命中前已经流出的片段可能短暂被看到；是否计费取决于 provider。never 模式不在中途中断，而是事后注入提醒；disabled、抑制或作用域不匹配时不触发。

## 证据边界

- `Registered live` 和 `system-interrupt` 是本会话运行时观测。
- 该事件没有提供可独立复核的完整 provider 账单、所有 token 片段或完整内部匹配 trace，因此不把它扩展成计费结论或普遍性能结论。
- 规则内容属于用户项目规则，不应把它当作 OMP 默认规则。
