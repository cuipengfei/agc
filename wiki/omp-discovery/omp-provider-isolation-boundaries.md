# OMP 能力 provider 隔离边界

> Sources: OMP v18.1.3 源码直读, 2026-09-03
> Raw: [OMP provider 隔离边界](../../raw/omp-discovery/2026-09-03-omp-provider-isolation-boundaries.md)
> Updated: 2026-09-03

## 一句话

`disabledProviders` 不是总闸门。它只挡住 capability-provider 注册的 resources（skills、commands、agents、MCP、hooks、tools、extensions 等），LSP 配置和 plugin root 预加载完全不走这层。

## 哪里生效、哪里不生效

| 能力 | 是否被 `disabledProviders` 挡住 | 代码位置 |
|---|---|---|
| Skills / Slash Commands | 是 | `capability/index.ts:239` `filterProviders` |
| Agents (task 子代理) | 是 | `task/discovery.ts:109` 显式 `isProviderEnabled` |
| **LSP 配置** | **否** | `main.ts:763` 无条件 `preloadPluginRoots`；`lsp/config.ts:444` 直接消费 |
| Prompts | 部分（见下方缝隙） | `omp-plugins.ts:138` 加载，但 marketplace 安装被过滤 |

### 为什么 LSP 挡不住

`main.ts:762-764`：

```typescript
// Preload plugin roots so downstream discovery is synchronous.
await preloadPluginRoots(os.homedir(), cwd);
```

没有 provider 判断。之后 `lsp/config.ts:443-449` 直接读这些预加载的 roots，连 marketplace manifest 都一起读。

对照组：`task/discovery.ts:108-111` 同一文件内明确写了 `(respects disabledProviders)` 并调用 `isProviderEnabled("claude-plugins")`。说明这是**分层设计**不是疏漏——agents 路径主动检查，LSP 路径不检查。

### marketplace 安装掉在两个 provider 之间

`omp-extension-roots.ts:348-352, 379` 把 marketplace 安装从 `omp-plugins` 过滤掉，理由是交给 `claude-plugins` 管。但 `claude-plugins.ts:290-295` 只扫 `commands/` 和 `slash-commands/`，不扫 `prompts/`。

结果：Better Harness 有 `prompts/better-harness.md`，但没有 `commands/`。`omp-plugins` 不收它（被过滤），`claude-plugins` 也不收它（不认 `prompts/`）。裸名 `/better-harness` 拿不到。

## 审计清单

如果你关掉了一个 provider，按这个顺序确认隔离是否完整：

1. `omp config get disabledProviders` 列出已禁用项
2. 检查 skills 列表：`/skills` 或 omp skills 命令——被禁 provider 的 skill 不应出现
3. 检查 LSP 配置源：`lsp/config.ts:443-449` 的路径是否仍被读到（用 `listOmpExtensionRoots` + `listClaudePluginRoots` 输出交叉核对）
4. 检查 agent 列表：task 子代理的可用 agent 不应包含被禁 provider 的条目

## 未验证边界

- 以上只证明「配置读取路径可达」。实际是否启动了重复的 LSP 进程、同一文件是否收到两套 diagnostics，**未观测**。
- `readMarketplaceLspConfig` 的查找路径（`root/../../marketplace.json`）与真实位置（`~/.claude/plugins/marketplaces/`）不一致。本机 `pyright-lsp`/`typescript-lsp` 的声明在 marketplace manifest 里，不在插件根目录，因此**对 OMP 不可见**——但 `vscode-langservers`/`bash-language-server` 的根目录内有 `.lsp.json`，是真实可达的。
