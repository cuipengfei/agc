# OMP Managed Skills 生命周期源码取证

> Source: can1357/oh-my-pi upstream
> Collected: 2026-09-09

## 关键文件

### managed-skills.ts

`packages/coding-agent/src/autolearn/managed-skills.ts` — `writeManagedSkill` / `deleteManagedSkill` / `sanitizeSkillName`。

没有自动清理逻辑。没有按年龄、闲置时间或数量上限的清理门槛。

### learn.ts

`packages/coding-agent/src/tools/learn.ts:100-140` — `learn` 工具的 `skill` payload 调用 `writeManagedSkill()`：

```ts
if (params.skill) {
  const result = await writeManagedSkill(
    this.session.settings.getAgentDir(),
    params.skill,
  );
}
```

## 结论

- 路径：`~/.omp/agent/managed-skills`
- 写入：① `manage_skill` 工具 ② `learn(skill=...)`
- 删除：显式 `deleteManagedSkill()`
- 没有自动清理
