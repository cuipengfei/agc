# OMP Git 插件升级与本地筛选

> Sources: 本机 `uv-bun` 源码与命令输出，2026-11-22；JYeswak/omp-kit-companion manifest 与本机安装输出，2026-11-22
> Raw: [uv-bun OMP 插件升级路径](../../raw/agent-tooling/2026-11-22-uv-bun-omp-plugin-updates.md); [omp-kit-companion 安装与验证](../../raw/omp-extensibility/2026-11-22-omp-kit-companion-plugin-install.md)
> Updated: 2026-11-22

## Git 插件的更新入口

`uv-bun` 从 `~/.omp/plugins/package.json` 的 `dependencies` 读取以 `github:`、`https://`、`git+` 或 `git@` 开头的源。`--check` 打印这些源，不升级；`--up` 对 registry 包处理完毕后，对每个 Git 源执行 `omp plugin install <source> --force`，再更新 marketplace 插件。

本次 `--check` 已识别 `github:JYeswak/omp-kit-companion` 与 `github:dietrichgebert/ponytail`。本次没有重新执行 `--up`。

`uv-bun` 脚本本身不在 agc 的同步清单中；OMP 的插件清单、锁文件与本地配置可由 `./pull.sh` 同步。

## 只安装资源，禁用无关行为

`omp-kit-companion` 作为 Git 插件安装后，本机配置使用三个不同键筛选：

- `disabledExtensions`：按 `extension-module:<name>` 禁用 manifest 加载的扩展；
- `skills.ignoredSkills`：忽略作者私有技能；
- `ttsr.disabledRules`：按规则名屏蔽绑定作者工具链的规则。

这些键只追加目标项，不覆盖 `skills.enabled`、`skills.enableSkillCommands`、`ttsr.enabled`、`ttsr.judge` 等同层设置。

本机安装版本为 `0.2.145`，manifest 明确列出 15 个扩展入口；仓库内其他扩展文件不能按目录总数算作该插件自动加载项。禁用后 `omp ttsr list` 显示 50 条规则，其中 19 条来自插件。

## 验证边界

`omp ttsr test --source text "All tests pass now." --json` 命中 `kit-unverified-done`，说明该插件规则能被 CLI 发现并匹配文本。这没有验证新会话中断效果，也没有证明所有私有扩展都已在新会话中被跳过。

## See Also

- [OMP 扩展自动加载机制](omp-extension-auto-loading.md)
- [OMP 社区 TTSR 规则资源与筛选](../omp-ttsr/community-rule-packs-and-selection.md)