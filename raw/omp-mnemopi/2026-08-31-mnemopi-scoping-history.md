# OMP Mnemopi Scoping 源码与历史调查

> Source: can1357/oh-my-pi 本地 Git 历史、当前源码、GitHub issue/PR/release
> Collected: 2026-08-31
> Published: 2026-05-30 through 2026-08-31

## 当前枚举与默认值

`packages/coding-agent/src/config/settings-schema.ts:3040-3065`：

```typescript
"mnemopi.scoping": {
  type: "enum",
  values: ["global", "per-project", "per-project-tagged"] as const,
  default: "per-project",
  // ...
}
```

Schema 描述：

- `global`: one shared bank
- `per-project`: isolated bank per cwd
- `per-project-tagged`: project-local writes plus global recall visibility

`packages/coding-agent/src/mnemopi/config.ts:10` 的类型同样只有这三个值。

## 当前写入与召回路由

`computeMnemopiBankScope()` 在当前 AGC cwd 的实际运行结果：

```text
global {"baseBank":"default","bank":"default","globalBank":"default","retainBank":"default","recallBanks":["default"]}
per-project {"baseBank":"default","bank":"agc-djmfd5jv3zsd","globalBank":"default","retainBank":"agc-djmfd5jv3zsd","recallBanks":["agc-djmfd5jv3zsd"]}
per-project-tagged {"baseBank":"default","bank":"agc-djmfd5jv3zsd","globalBank":"default","retainBank":"agc-djmfd5jv3zsd","recallBanks":["agc-djmfd5jv3zsd","default"]}
```

`packages/coding-agent/src/mnemopi/state.ts:450-453`：

```typescript
rememberInScope(memory, options) {
  return this.scoped.retain.memory.remember(memory, options);
}
```

因此 `per-project-tagged` 只写 project bank，不写 global bank；global 只作为 recall target。

`state.ts:385-431` 遍历 `this.scoped.recall`，合并、去重、排序并裁剪 project 与 global 的结果。

## `tagged` 名称与真实实现

`config.ts:123-125` 明确说明：

```text
Mnemopi has no tag-filtered recall
```

Mnemopi 的 `per-project-tagged` 不是 tag-filtered memory。它打开 project bank 和 shared bank，合并 recall；写入仍只去 project bank。

不要和 Hindsight 的同名模式混淆：Hindsight 会真正写入 `project:<cwd>` tag；Mnemopi 不会。

## 发布历史

### 初始 memory backend

Commit `3ecc48fdf67ba0762a6c9d45adb652f15fc1289a`：

```text
2026-05-30T08:07:03+02:00
feat(memory): added Mnemosyne local SQLite memory backend
```

当时没有 `scoping` 设置。未配置 `mnemosyne.bank` 时，bank 名来自当前 cwd；显式配置 bank 时使用该 bank。

### 三种 scoping 同时加入

Commit `9d29fc97167daba0eb7bab15be69af7b324a0e00`：

```text
2026-05-30T14:13:46+02:00
feat(mnemosyne): added configurable memory scoping with per-project-tagged mode
```

该提交同时加入 `global`、`per-project`、`per-project-tagged`，默认 `per-project`。不存在 global 先发布、另两个后来才发布的历史。

初始 backend commit 和 scoping commit 都是 `v15.6.0` 的祖先。Release：

- https://github.com/can1357/oh-my-pi/releases/tag/v15.6.0
- Published: `2026-05-30T17:16:54Z`

三种显式 scoping 选项因此首次一起公开发布。

2026-05-31 的 commit `68430dee5cce81b816f17ba62dc0d45d85d7c230` 将 Mnemosyne 改名为 Mnemopi，scoping 语义保留。

## 初始测试揭示的使用方式

Commit `9d29fc9` 添加的 `hindsight-tools.test.ts` 测试按以下顺序验证 `per-project-tagged`：

1. 用 `global` 模式写入 `the user likes concise CLI output`。
2. 用 `per-project-tagged` 向 project-alpha 写入 `project alpha uses pnpm workspaces`。
3. 向 project-beta 写入另一条项目记忆。
4. 从 project-alpha recall。
5. 断言能看到 global 用户偏好和 project-alpha 记忆，看不到 project-beta 记忆。

这证明原始测试预期 global bank 已被 `global` 模式预先填充，再由 `per-project-tagged` 合并读取。但 commit、文档和 issue 没有把该模式定义为“迁移功能”；迁移意图无法确认。

## Issue 与 PR 线索

### Issue #2321 / PR #2327

- Issue: https://github.com/can1357/oh-my-pi/issues/2321
- PR: https://github.com/can1357/oh-my-pi/pull/2327

Issue 最初认为 tagged 模式的 global bank 没有 flush/consolidate。PR #2327 后让 lifecycle 遍历所有已打开 bank，但它没有改变 retain 路由，也没有让 tagged 模式写 global。

### Issue #2436 的澄清

- https://github.com/can1357/oh-my-pi/issues/2436

关闭评论明确说明：

```text
In per-project-tagged scoping, the global bank is a read target only.
rememberInScope() writes to the project bank.
```

因此 global bank 若没有被 `global` 模式或外部 writer 预先填充，`per-project-tagged` 的额外 global recall 没有内容可返回，实际 recall 效果与 `per-project` 相同。

## retain 工具边界

当前会话 `retain` 工具 schema：

```typescript
type Args = {
  items: Array<{
    content: string;
    context?: string;
  }>;
};
```

没有 `bank`、`scope`、`global`、`project` 或 `tag` 参数。LLM 不能逐条选择写入目标；写入 bank 由会话当前 `mnemopi.scoping` 和 cwd 决定。

## 模式切换语义

从 `per-project` 切到 `global`：

- 旧 project bank 留在磁盘；不自动迁移、不删除。
- global 模式只 recall global bank，旧 project 内容暂时不可见。
- 新 retain 写入 global bank。
- 切回 `per-project` 后，旧 project 内容重新可见。
- 切到 `per-project-tagged` 后，可同时 recall project + global。

当前源码未实现自动 bank 合并或迁移。
