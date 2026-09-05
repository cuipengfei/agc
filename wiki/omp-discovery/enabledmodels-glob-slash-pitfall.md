# OMP enabledModels glob 陷阱：带斜杠的 model id 需要双星

> Sources: 本机会话实测（Bun.Glob 实验 + dist cli.js 源码取证 + TUI 验证）；2026-09-05
> Raw: [enabledModels glob 与带斜杠 id 实测证据](../../raw/omp-discovery/2026-09-05-enabledmodels-glob-slash.md)
> Updated: 2026-09-05

## 一句话

`enabledModels` 里的 `provider/*` 用 `Bun.Glob` 匹配，单星 `*` 不跨 `/`；如果 model id 本身含斜杠（如 TokenRouter 的 `z-ai/glm-5.3-free`），必须写 `provider/**` 才能在 TUI 里出现——CLI 可见而 TUI 不可见时，先怀疑这条过滤链。

## 机制

OMP TUI 的模型可见性过滤链（dist 源码，omp v18.1.10）：

```text
vH() → getAvailable() → enabledModels 过滤
     → qIs()（pattern 含 * ? [ 时走 glob 分支）
     → EIs() → gAe()：new Bun.Glob(pattern).match("provider/id") 或 match(id)
```

`Bun.Glob` 遵循标准 glob 语义：`*` 匹配一段（不含 `/`），`**` 跨斜杠。当 model id 是 `z-ai/glm-5.3-free` 这种 vendor/model 两段命名时，完整匹配串 `tokenrouter/z-ai/glm-5.3-free` 有两层斜杠，`tokenrouter/*` 只能吃到第一层；裸 id 兜底（`z-ai/glm-5.3-free`）同样失败。

实测对照（bun 直接运行）：

```text
tokenrouter/*  vs tokenrouter/z-ai/glm-5.3-free → false
tokenrouter/** vs tokenrouter/z-ai/glm-5.3-free → true
opencode-go/*  vs opencode-go/glm-5.3          → true   （id 无斜杠，单星够用）
```

CLI `omp models` 不经过 enabledModels 过滤，所以始终可见——这个不对称是定位此问题的关键信号，而不是 auth 问题。

## 诊断决策树：自定义 provider 模型 TUI 不可见

1. **进程启动时间 vs 配置 mtime**：`ps -o lstart -p <pid>` 与 `stat <config>`——OMP 配置不热加载，进程早于修改则重启再看。
2. **CLI 是否可见**：`omp models <provider>`——CLI 可见 + TUI 不可见，说明配置加载与 auth 都正常，问题在 TUI 过滤层。
3. **Bun.Glob 单测 pattern**（一发定音）：`bun -e "console.log(new Bun.Glob('provider/*').match('provider/<id>'))"`——false 就把 `*` 改 `**`。
4. **auth 形式**：`!command` 形式的 apiKey 在 `hasConfiguredAuth()` 层面算已配置，但命令真正失败会导致请求不可用；硬编码字面值可移除这条不确定性。

本案例中步骤 1、2、4 都查过了，最后在第 3 步一发命中；前两个假设（旧进程缓存、TUI 环境 PATH 缺 node）均被实验证伪，记录见 raw。

## 修复

`~/.omp/agent/config.yml` 的 `enabledModels`：

```diff
- - tokenrouter/*
+ - tokenrouter/**
```

一行改动，YAML 复验通过，TUI 刷新后 provider 出现，真实 API 请求（`omp -p --model tokenrouter/z-ai/glm-5.3-free`）往返正常。

## 未验证边界

- Bun.Glob 对 `[` 字符类与 `?` 的具体跨斜杠行为未逐一实测（本案例只涉及 `*`/`**`）。
- marketplace/动态发现模型（models.db 路径）与自定义 provider（models.yml 路径）合并进 picker 的完整顺序未逐层取证。

> See Also: [OMP 能力 provider 隔离边界](omp-provider-isolation-boundaries.md)（disabledProviders 层次——另一条 TUI 可见性过滤链）
