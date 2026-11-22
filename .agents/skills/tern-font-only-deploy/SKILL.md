---
name: tern-font-only-deploy
description: Use when upgrading Tern, deploying Maple Chinese fonts, or verifying font registration, Web service authentication, and existing pane retention.
---

# Tern 仅字体部署

## 目标

使用仓库中的维护工具完成 Tern 的 Maple 中文字体部署与验证。脚本负责版本、身份、分类、构建、装配、认证、清理和证据；agent 负责获取新版本、审核未知结构、取得授权和报告结果。

中文与图标显示由用户目视确认。只有用户明确要求 Tern 视觉测试时，才运行浏览器、截图或 OCR。正式服务升级和远程资源下载分别需要用户明确授权。

## Launch

从 AGC 仓库根目录运行发布验证：

```bash
TERN_ORIGINAL="$HOME/.local/share/tern-maintain/0.9.29-YKaUMw39/official" \
  .agents/skills/tern-font-only-deploy/scripts/verify-release.sh
```

脚本创建独立工作目录、服务配置、socket、随机端口、临时 token 和证据目录。当前安装包、已安装 binary 与目标字体使用脚本中的本机默认值；处理其他版本或文件时设置：

| 环境变量 | 输入 |
|---|---|
| `TERN_VERIFY_BINARY` | 待验证的官方 binary |
| `TERN_ARCHIVE` | 与 binary 对应的官方安装包 |
| `TERN_ORIGINAL` | 已核对的原版资源目录；联网获取时也可指定新的持久输出目录 |
| `TERN_PREPARE=1` | 已授权联网时获取原版资源；默认保存在版本化目录，供后续字体检查和重新验证使用 |
| `TERN_FONT_REPORT` | 与当前输入匹配的字体检测报告；默认读取原版资源旁的检测报告 |
| `TERN_FONT_PROFILE` | 对应的原始字体 profile；默认读取原版资源旁或维护工具中的 profile |
| `TERN_TARGET_FONT` / `TERN_TARGET_BOLD` | 目标 Maple Regular/Bold 文件 |
| `TERN_SITE_OUT` | 需要保留用于部署时，指定一个尚不存在的持久站点目录 |

缺少匹配的检测报告或 profile 时停止。需要补做检测时，先取得视觉测试授权，再按 [按需字体检查](references/font-check.md) 执行。新版本的原版 WASM、glue 或字体结构未通过审核时停止，由维护工具的新版本支持工作处理；不得复用旧版本地址或 profile。

字体登记行为检查使用统一启动器：

```bash
TERN_PLAYWRIGHT_MODULE='/path/to/Windows/playwright/index.mjs' \
  .agents/skills/tern-font-only-deploy/scripts/check-fonts.sh \
  --site /path/to/candidate-site \
  --profile tools/tern-maintain/profiles/font-registration-0.9.29-patched.json --smoke
```

`--smoke` 检查目标字体名称、内置字体和不存在字体；省略该参数执行冷暖两次的完整检查。启动器自动准备独立服务、随机端口、临时认证、中文窗格和证据目录。详细输入与判定见 [字体检查](references/font-check.md)。

## Doctor

发布验证自动检查依赖、binary 版本、安装包成员、binary 与安装包一致性、原版资源版本及 WASM/glue hash、检测报告与当前输入身份。任一检查失败即停止，证据记录具体步骤。

字体分类由脚本判定：

- `working`：执行原版资源和目标字体的兼容装配。
- `registration_missing`：构建名称登记补丁并装配候选站点。
- 其他结果：停止部署。

新版本分析按 [新版分析顺序](references/new-version-analysis.md) 核对名称查询、名称登记与表达式行为，再审核候选修改。快速检查通过后，候选站点须以实际服务字节完成完整检查：模块身份一致，冷暖两次均匹配目标字体，内置字体匹配成功，不存在字体返回空值，隔离进程清理完成。

正式 systemd 服务使用只读预检：

```bash
TERN_CANDIDATE_BINARY="$HOME/.local/bin/tern" \
TERN_PERSISTENT_SITE="$HOME/.local/share/tern-maintain/0.9.29-YKaUMw39/site" \
TERN_ARCHIVE="/mnt/c/Users/39764/Downloads/Tern-0.9.29-linux-x86_64.tar.gz" \
  .agents/skills/tern-font-only-deploy/scripts/systemd-upgrade.sh
```

预检核对候选 binary、安装包、站点清单、正式进程、manager 类型、unit 参数、窗格和程序；不会修改服务或配置。

## Drive

按 [功能地图](features/README.md) 理解五项用户功能。`verify-release.sh` 一次运行覆盖官方资源、字体判定、所选装配分支、隔离服务和认证；`systemd-upgrade.sh` 覆盖正式升级与状态保留。脚本负责所有确定性断言，agent 不在会话中临时重写这些检查。

维护工具的实现、命令参考和测试继续以 `tools/tern-maintain/README.md` 为准。版本历史、原始证据与旧方案继续留在 Wiki。

## Evidence

发布验证在 `$HOME/.local/share/tern-maintain/verification-evidence/` 下创建独立目录，记录每项命令、stdout、stderr、退出码、输入与产物 hash、分类、服务报告和清理结果。正式升级每次也在该位置创建独立目录。

字体检查与探索实验在 `$HOME/.local/share/tern-maintain/experiments/` 下保存 `experiment.json`、输入快照及 SHA-256、脱敏 stdout/stderr、字体报告、Settings 截图、进程身份和清理结果。`font-registration-smoke-check` 用于快速检查；发布输入需要 `font-registration-check`。中文、图标、字形与宽度由用户目视确认。

## Cleanup

脚本自动结束自己启动的进程，删除临时工作目录并保留证据。成功结果见 `summary.json` 和 `cleanup.txt`。失败运行同样清理临时状态并保留失败证据；进程未退出时保留其服务目录，按记录的 PID 调查。

设置 `TERN_SITE_OUT` 后，生成的持久站点属于部署产物，不随临时工作目录删除。

## Helpers

- `scripts/verify-release.sh`：发布验证与站点构建入口。
- `scripts/verify-site.sh`：由发布验证和正式升级共用的站点资源完整性检查。
- `scripts/verify-service.sh`：由发布验证调用的隔离服务与认证检查。
- `scripts/systemd-upgrade.sh`：默认只读预检；用户明确授权正式升级后，以相同环境变量追加 `--apply`。详见 [systemd 升级参考](references/systemd-upgrade.md)。
- `scripts/check-fonts.sh`：隔离服务和真实字体检查入口；支持原版资源与候选站点。
- `scripts/run-experiment.mjs`：通过 `bun` 运行探索命令，保留输入与失败证据；用法见 [新版分析顺序](references/new-version-analysis.md)。

正式切换后由用户检查中文和图标；需要刷新页面时使用 Ctrl+Shift+R。
