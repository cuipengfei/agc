# omp-kit-companion 插件安装、筛选与规则验证

> Source: JYeswak/omp-kit-companion 公开 package.json、规则与扩展源码；OMP 官方插件与规则文档；本会话 `omp plugin install`、`omp plugin list`、`omp ttsr list`、`omp ttsr test` 命令输出
> Collected: 2026-11-22
> Published: Unknown

## 上游内容

仓库：https://github.com/JYeswak/omp-kit-companion

`package.json` 的 `name` 为 `omp-kit-companion`，`version` 为 `0.2.145`。`omp.extensions` 数组明确列出 15 个入口：

`kit-seat-identity`、`kit-guard-optin`、`kit-save-guard`、`fleet-guard`、`kit-callback`、`kit-flywheel-guard`、`kit-loop-guard`、`kit-upgrade-notice`、`kit-goal-keepalive`、`kit-agent-mail-guard`、`secret-output-guard`、`kit-composer-state`、`kit-inbox-wake`、`kit-goal-state`、`kit-model-activity`。

其余扩展文件在 `notLoadedExtensions` 中说明为库模块、profile-installed 或测试专用文件，不通过该插件 manifest 加载。

`fleet-guard.ts` 源码注释声明其 `/tmp` 写入检查无需集群开关即可生效。`kit-model-activity.ts` 记录活动到作者自定义的本地状态目录。`kit-loop-guard.ts` 针对连续相同工具错误；`secret-output-guard.ts` 在工具输出中脱敏。

`rules/` 中筛选时保留通用命令、完成声明、测试纪律、Beads 关闭证据等规则。`kit-jsonl-aggregate` 只纠正 `.beads/issues.jsonl?q=group_by` 的用法，保留。

作者私有工具链规则被禁用：`kit-solo-review-not-review`、`kit-structure-not-truth`、`kit-commit-preflight`、`kit-frontend-foundations`、`kit-no-gh-poll`、`kit-test-source-runtime`、`kit-rea-heavy-summary`、`kit-rea-runtime-shipped`。

作者私有技能被忽略：`fleet-restart`、`fleet-round`、`frontend-foundations`、`jeff-planning-enhanced`、`omp-kit-native`、`omp-native`。

## 本机安装与配置

执行：

```text
omp plugin install github:JYeswak/omp-kit-companion
Installed 1 plugin(s): omp-kit-companion@0.2.145
```

`omp plugin list` 返回：`omp-kit-companion@0.2.145`；GitHub API 返回该仓库 `stargazers_count: 1`、`pushed_at: 2026-11-21T14:40:21Z`。

`~/.omp/plugins/package.json` 的 dependencies 含：

```json
"omp-kit-companion": "github:JYeswak/omp-kit-companion"
```

`~/.omp/agent/config.yml` 的三个既有键改为有内容的数组：

- `disabledExtensions` 加入上述 15 个 `extension-module:<name>`；
- `ttsr.disabledRules` 加入上述 8 个项目专用规则；
- `skills.ignoredSkills` 加入上述 6 个技能。

同文件原有 `skills.enabled: true`、`skills.enableSkillCommands: true`、`ttsr.enabled: true`、`ttsr.judge: "on"` 等设置保留。

## 验证输出

`omp ttsr list` 首行：`TTSR rules (50)`。

其中 19 条来源标记为 `[omp-plugins]`，其余包括本地 `[native]` 与 `[builtin-defaults]`。

`omp ttsr test --source text "All tests pass now." --json` 输出包含：

```json
{"source":"text","snippetPreview":"All tests pass now.","snippetBytes":19,"evaluated":50,"triggered":[{"name":"kit-unverified-done","path":"/home/cpf/.omp/plugins/node_modules/omp-kit-companion/rules/kit-unverified-done.md","sourceProvider":"omp-plugins"}]}

```

这验证了规则被 CLI 发现并匹配给定文本；它没有模拟新会话中的实际中断效果，也没有测试其余规则。

早前 canary 实测记录的另一份时间戳为 `2026-09-19T15:27:24.852Z`，供既有扩展自动加载文章引用。

`./pull.sh` 将插件清单、锁文件与配置同步回 agc；`./sync.py status` 全部 91 个条目 unchanged，`git diff --check` 无输出。

来源官方规则文档：https://github.com/can1357/oh-my-pi/blob/e1a9f4b41d24fe223bb71e864bef552f0fae6948/docs/rulebook-matching-pipeline.md