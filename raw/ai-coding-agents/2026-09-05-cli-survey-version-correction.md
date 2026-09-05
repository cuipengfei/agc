# CLI 调查版本号更正：opencode 为 1.18.29 而非 1.2.19

- Source: 本 repo 研究会话，版本复核
- Collected: 2026-09-05
- Published: Unknown
- 关系：本文更正 [四 Agent CLI 递归 --help 调查](2026-09-05-cli-help-recursive-survey.md) 第 7 行的版本记录。原记录按 `raw/` 不可变规则保持原样。

## 错误

原记录第 7 行写「opencode 1.2.19」。该数字是记录错误。

## 更正证据

1. 采集时段：最早 help 捕获文件 `/tmp/help/opencode/acp.txt` mtime 为 2026-09-05 17:55:41（+0800），最晚（顶层 `opencode.txt` 补捕）为 19:45:09。
2. 本机 `/home/cpf/.bun/install/global/node_modules/opencode-ai/package.json` 内容 `"version": "1.18.29"`，其 mtime 为 2026-09-05 10:59:01——先于全部采集。
3. 同目录二进制 `bin/opencode.exe` mtime 为 2026-09-05 10:59:44——同样先于全部采集。
4. 复核时刻 `opencode --version` 输出：`1.18.29`。

由 2、3 先于 1 可证：采集时安装的版本即为 1.18.29，不存在「采集时是 1.2.19、之后才变更」的可能。

## 同批复核的其余版本

- `codex --version` → `codex-cli 0.153.4`
- `omp --version` → `omp/18.1.10`
- `omo version` → `oh-my-openagent v4.19.4`

## 结论

四款 CLI 在采集时的版本：codex-cli 0.153.4、opencode 1.18.29、omo v4.19.4、omp 18.1.10。
