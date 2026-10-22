# Kiro 接入 OMP 全程实录：ns-omp-provider-kiro 设置与验证

> Source: 本会话实测（OMP 18.12.5、ns-bridge 0.1.15、ns-omp-provider-kiro 0.5.3、bun 1.4.3、WSL2）
> Collected: 2026-10-22
> Published: 2026-10-22

## 事件时间线

1. `bun add -g @ngosangns/ns-bridge` 用户执行，装出 `ns-bridge` CLI。
2. `ns-bridge install omp` 预览显示它将执行 `omp plugin install ns-omp-provider ns-omp-provider-kiro`（设计上两包成对）。
3. 本轮执行 ·收获：`omp plugin install ns-omp-provider-kiro@0.5.3` 装单包；`ns-bridge providers status omp kiro` 确认开关 `omp kiro on`。
4. OMP 新进程 `omp models kiro --json` 列出 20 个初始 Kiro 模型条目（账号还没登录，目录只有初始骨架）。
5. `ns-bridge models refresh kiro --apply` 退出码 2（未认证），returncode 页面明确 `NODE_TLS_REJECT_UNAUTHORIZED=0` 警告。
6. 用户侧手动 `curl -fsSL https://cli.kiro.dev/install | bash` 装 `kiro-cli 2.33.0`；`kiro-cli doctor` 报未认证；`kiro-cli login` 选 Use with GitHub，document-flow 完成 `✓ Signed in with GitHub`。
7. OMP 会话 `/login kiro` 输出 `Successfully logged in to kiro / Credentials saved to /home/cpf/.omp/agent/agent.db`。登录优先复用 kiro-cli 会话；没有可用会话才要求输入 API Key。
8. `~/.omp/agent/config.yml` 的 `enabledModels` 手动加入 `  - kiro/*`；编辑前 `cp config.yml config.yml.before-kiro-20261022` 备份。
9. `ns-bridge models refresh kiro --apply`（NODE_TLS_REJECT_UNAUTHORIZED=1）成功返回 **5 个模型**：`deepseek-3-2`、`glm-5`、`minimax-m2-1`、`minimax-m2-5`、`qwen3-coder-next`。
10. SDK 层验证脚本（bun + OMP 内 `ModelRegistry`/`discoverAuthStorage`/`streamSimple`，显式注册 ns-omp-provider-kiro 扩展）：
    - 文本请求返回 `KIRO_OMP_OK`
    - 工具调用 `sum_integers` 正确收到 `{left: 19, right: 23}`；回传结果 `42` 后模型正确采纳
    - 流式 `text_delta` 与 toolCall 事件均到达 OMP 侧
11. CLI 层验证：`env NODE_TLS_REJECT_UNAUTHORIZED=1 omp -p --model kiro/minimax-m2-1 --no-tools --no-lsp --no-title --no-skills --no-rules --no-extensions -e ~/.omp/plugins/node_modules/ns-omp-provider-kiro/dist/index.js --system-prompt '...' '...'` 返回 `KIRO_CLI_OK`，exit 0，wall time **36.30 秒**。
12. 此 CLI 验证中出现 `Warning: MCP server "sofa" failed to connect: ECONNRESET`（上游偶发；不影响 Kiro 链路）。
13. 目录返回 **5 个模型**：`deepseek-3-2`、`glm-5`、`minimax-m2-1`、`minimax-m2-5`、`qwen3-coder-next`；**仅 `kiro/minimax-m2-1` 完成真实请求验证**，其余四个仅出现在目录中，未逐一实测。

## 关键结论

- 安装顺序：ns-bridge CLI 只是管理面；实际注册到 OMP 的是 `ns-omp-provider-kiro` 包，两个都要。
- 免费账号可用 —— 认证靠 GitHub/GitHub document-flow 社交登录即可；付费计划才有资格生成 `ksk_` API Key。
- API Key 入口：https://app.kiro.dev/settings/api-keys（免费账号在该页面看不到有效入口）。
- 验证分级：SDK 层（组件级）+ CLI `-p` 层（完整链路）都通过才能判断「走通」；只看模型列表会造成误判。
- TLS：全局 `NODE_TLS_REJECT_UNAUTHORIZED=0` 环境存在（来源不明），验证时必须显式置回 `=1`，不兜改全局。
