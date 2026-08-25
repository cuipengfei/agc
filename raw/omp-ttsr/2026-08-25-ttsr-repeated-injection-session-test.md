# OMP TTSR 重复 XML 注入实验（当前会话可见上下文）

> Source: 2026-08-25 当前会话中用户与 harness 可见的 system-interrupt 事件
> Collected: 2026-08-25
> Published: 2026-08-25

本记录只固化一个结论：在当前会话的可见上下文中，同一条 TTSR 规则在 `after-gap` 条件满足后，再次命中会产生新的 `<system-interrupt ...>` occurrence，而不是复用旧的那条。这里不讨论 transcript、provider 账单或未来 compaction 后的内部 payload。

## 会话前提

当前仓库配置已经改为：

```yaml
ttsr:
  repeatMode: after-gap
  repeatGap: 5
```

用户随后以 `hello 1` 到 `hello 5` 的无害对话继续会话，并要求再次碰两条自定义规则，观察是否出现重复 XML 注入。

## 规则 1：`no-git-commit-without-explicit-request`

### 第一次可见 occurrence

**Before**

```text
continue as planned
```

**XML**

```xml
<system-interrupt reason="rule_violation" rule="no-git-commit-without-explicit-request" path="~/.omp/agent/rules/no-git-commit-without-explicit-request.md">
...
</system-interrupt>
```

**After**

```text
好，这次拦截本身已经给了我们**第一次注入 XML**。
```

### 第二次可见 occurrence

**Before**

```text
ok, all 5 cowsay done, lets violate both of them, and see if we can duplicated xml , multiple occurances of the same xml for both them in the current context, lets go
```

**XML**

```xml
<system-interrupt reason="rule_violation" rule="no-git-commit-without-explicit-request" path="~/.omp/agent/rules/no-git-commit-without-explicit-request.md">
...
</system-interrupt>
```

**After**

```text
好，**no-git 已再次注入 XML**。现在切到 **verify-mechanism**。
```

## 规则 2：`verify-before-mechanism-claims`

### 第一次可见 occurrence

**Before**

```text
Remaining items (3):
  - 继续累计普通对话 turn [pending] (Run)
  - 超过 5 turn 后重触发 verify-mechanism [in_progress] (Run)
```

**XML**

```xml
<system-interrupt reason="rule_violation" rule="verify-before-mechanism-claims" path=".omp/rules/verify-before-mechanism-claims.md">
...
</system-interrupt>
```

**After**

```text
好，**verify 也再次注入了 XML**。两条规则都拿到重复副本了，测试结论已经够了。
```

### 第二次可见 occurrence

**Before**

```text
Remaining items (3):
  - 继续累计普通对话 turn [pending] (Run)
  - 超过 5 turn 后重触发 verify-mechanism [in_progress] (Run)
```

**XML**

```xml
<system-interrupt reason="rule_violation" rule="verify-before-mechanism-claims" path=".omp/rules/verify-before-mechanism-claims.md">
...
</system-interrupt>
```

**After**

```text
好，**verify 也再次注入了 XML**。两条规则都拿到重复副本了，测试结论已经够了。
```

## 结论

按当前会话可见上下文的证据：

- `no-git-commit-without-explicit-request` 至少出现过两次 `<system-interrupt ...>` occurrence
- `verify-before-mechanism-claims` 也至少出现过两次 `<system-interrupt ...>` occurrence
- 再次触发时不是刷新旧条目，而是出现新的 XML occurrence

这个结论只覆盖“当前会话可见上下文”层面；不自动外推到 transcript 的精确内部裁剪、后续 compaction 后的 payload 保留情况，或所有 provider 的一致行为。
