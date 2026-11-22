# Tern 字体确定性检查与复盘

> Source: 当前 OMP 会话的 retro/reflect 结果、用户明确要求、已修改的技能与维护工具源码、实际测试输出
> Collected: 2026-11-22
> Published: Unknown

## 用户关切与行动顺序

用户先问当前运行版本；通过 `tern --version` 和进程参数核实 daemon、Web 都在使用 0.9.30，端口仍为 `8378`。随后询问为何升级耗时、技能改进是否足够。回答依据本次实施和复盘记录，未添加未验证的「前置检查」缺口。

用户随后授权完成 0.9.30 字体登记修复与正式升级，要求保留同端口和窗格。会话实施隔离字体检查、函数分析和实验保存工具，随后完成 0.9.30 候选及正式页面验证。

## 已有技能与本次改进

`.agents/skills/tern-font-only-deploy/` 是仓库内唯一版本，保留五项功能地图。已有规则要求按名称查询、名称登记、表达式行为、候选修改的顺序分析新版本，不能把函数形状相似等同于语义相同。

本次新增 `scripts/check-fonts.sh`：以 `--original DIR` 或 `--site DIR` 加 `--profile FILE` 为入口，`--smoke` 运行目标字体、内置字体和不存在字体三个阶段；完整模式运行冷加载、暖加载及两项对照。启动器准备隔离服务、认证、中文窗格、证据目录与清理过程。完整报告 kind 为 `font-registration-check`，快速报告为 `font-registration-smoke-check`；报告区分 `served` 与 `routed`。

`font-check.mjs` 的分类要求完整且唯一的阶段、模块身份一致、无阶段错误，以及内置字体和不存在字体对照正确。目标字体响应完成后立即检查名称返回值，不再为每个阶段固定等待十秒。

新增 `run-experiment.mjs`，为每个实验保存输入快照及 SHA-256、命令、开始和结束时间、退出码、信号、脱敏 stdout/stderr。输入准备失败、命令无法启动和子进程被信号终止均记为失败；POSIX 下终止本次创建的进程组。真实退出 7 的失败实验目录为 `~/.local/share/tern-maintain/experiments/run.uiiS5h`。

新增 `function-analysis` CLI：同一 Binaryen 实例分析完整函数内容，支持 `--wasm`、`--original`、`--names`、`--wabt-dir` 与 `--out`；固定 WABT 1.0.42，流式读取反汇编，跳过单个和范围的局部变量声明。0.9.29 真实模块 `14350` 对应 index `14857`，首指令偏移 `42366736`，与 profile 的 `statusOffset` 一致。

CI 将技能目录纳入触发范围；定向检查包含类型、CLI 测试、YAML frontmatter、功能地图、内部链接、helper 引用、Bash 语法与 ShellCheck。最终类型检查报告 `45 modules parsed, 4 deployment records scanned, TypeScript passed`。实际执行过 CLI 16 项、函数分析 8 项、实验运行器 6 项和地图检查器 8 项测试，均通过。

## 耗时复盘

本次延误的主要原因是执行者没有遵循技能已规定的分析顺序：先沿用旧版结构推断，把 0.9.30 的临时整数映射当成字体映射，再纠正方向。实现中还出现过把表达式信息对象当成表达式引用、栈帧大小和复制边界不符的问题。

确定性工具缩短了候选验证并保留了失败证据，但新版定位仍必须阅读实际函数行为。新增强制前置检查的效果尚未验证，不能把它写成本次延误原因。

## 验收边界

0.9.29 候选站点的快速检查位于 `experiments/run.WYWs1L`，完整检查位于 `run.UMYIG8`，均为 `served/working`；冷暖两次匹配 Maple，内置字体匹配成功，不存在字体返回空值，清理进程为零。0.9.30 官方原版检查位于 `run.p0JU1h`，为 `routed/registration_missing`，目标字体名称为空，内置与不存在字体对照正确。

发布地图验收 `verification-evidence/run.sWfvUj` 通过；只读升级预检 `upgrade.ZghBma` 通过。未提交 Git 或未执行的正式切换不计为完成。

## Git 操作边界

用户要求提交并推送默认分支。过程中曾误建专用分支并把原有 `caf642b` 留在备份分支，随后恢复本地 `master`。用户明确同意推送原有配置提交后，`master` 与 `origin/master` 合并并同步；合并提交为 `151b23c`。原有 `caf642b` 和本轮 Tern 提交 `b04c2b4` 均在远端。用户未提交的 VS Code 文件改动保留在工作区，没有纳入提交。这段记录属于本次操作复盘，不构成 Tern 字体技术结论。
