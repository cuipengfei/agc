# Tern 仅字体部署技能迁入仓库与脚本化验证

> Source: 当前 OMP 会话中的用户要求、AGC 仓库技能文件、实际命令输出与本地验证证据
> Collected: 2026-11-21
> Published: Unknown

## 用户问题与要求

用户最初要求：`tern-font-only-deploy turn this skill into valid shape for it`。随后要求用引导阅读方式讲解 `create-verification-skill`、`maintain-verification-skill` 与 `tern-font-only-deploy`，重点谈行为和使用场景。

用户询问仓库中的 Tern 代码、脚本、文档和 Wiki 是否应迁入技能，并提出将技能从 OMP managed 目录迁入 AGC 仓库。讨论后的决定是：操作规则、功能地图和验证辅助脚本属于技能；维护工具实现、测试、版本配置、研究证据和历史记录继续留在原目录与 Wiki。

用户批准执行时说：`lets go, i expect next new version of tern can be done by this skill, much faster, much easier`，并询问确定性工作是否应由技能脚本承担。本次实现采用这个分工：脚本处理确定性检查和状态变更，agent 负责新版本审核、授权和报告。

## 技能归属与文档边界

技能唯一版本为 `.agents/skills/tern-font-only-deploy/`。原 `~/.omp/agent/managed-skills/tern-font-only-deploy/` 已删除；删除后读取 `skill://tern-font-only-deploy` 实际解析到 `/home/cpf/code-inside/agc/.agents/skills/tern-font-only-deploy/SKILL.md`。

技能包含五份功能地图：官方资源与字体判定、字体登记补丁、站点资源装配、服务与认证、升级与保留。按需参考覆盖字体检查和 systemd 升级。`tools/tern-maintain/README.md` 增加仓库技能入口，维护工具实现与测试仍在 `tools/tern-maintain/`，Wiki 继续保存版本历史与证据。

通用创建和维护技能的行为已记录在 `wiki/ai-coding-agents/pstack-skill-map-and-behaviors.md`，本次没有新增重复的通用技能文章。

## 四份技能脚本

- `scripts/verify-release.sh`：检查依赖、官方安装包与 binary、原版资源身份和字体检测报告；按分类构建并装配站点；调用站点与服务检查；保留证据并清理临时工作。
- `scripts/verify-site.sh`：要求清单包含 `index.html`、`pkg/client.wasm` 和 `pkg/client.js`，逐一核对清单全部文件的实际 SHA-256；`font-only` 另要求 `maple.js`、`fonts.json` 和字体清单声明的字体资源均在部署清单中。
- `scripts/verify-service.sh`：启动独立 daemon 和 Web 服务，核对运行身份、站点资源和 token 认证，结束自己启动的进程并删除临时凭据。
- `scripts/systemd-upgrade.sh`：默认只读预检；显式追加 `--apply` 才替换 binary、热切换 daemon、更新 Web unit 并重启 Web 服务。升级后检查版本、窗格、程序、token 文件和认证。

联网获取设置 `TERN_PREPARE=1`。原版资源默认保留在 `$HOME/.local/share/tern-maintain/<version>/official`，也可通过 `TERN_ORIGINAL` 指定新的持久输出目录。脚本在调用维护工具的 `prepare` 前创建父目录，不创建 `official` 本身，以保留工具拒绝已有输出目录的行为。缺少匹配的字体检测报告或 profile 时停止；浏览器检查需要用户明确授权。

正式 systemd 路径必须是绝对路径，且只包含 ASCII 字母、数字、`.`、`_`、`-` 和 `/`。包含空格、`$`、`%`、引号或反斜杠等字符的路径在预检阶段被拒绝，不在切换过程中临时生成可能改变参数含义的 unit 文本。

## 审查后修正

只读审查发现并完成以下修正：为新版本 `prepare` 创建父目录；核对 `font-only` 的全部字体相关资源；用 `ps -e` 加 `awk` 过滤 daemon 子程序，使空程序集合成为合法结果；在正式变更前拒绝无法安全写入现有 ExecStart 格式的路径；共享站点检查保留三个基础必需文件断言；升级失败时清理自己创建的 binary 与 unit 暂存文件。

空程序集合的检查使用不存在的父 PID `999999999` 实测，`ps -e -o ppid=,pid=,comm= | awk ... | sort` 退出码为 0 且输出为空。带空格站点路径的预检验证退出码为 1，并输出 `systemd paths must be absolute and contain only ASCII letters, digits, dot, underscore, hyphen and slash`。

## 实际验证结果

最终发布验证证据位于 `~/.local/share/tern-maintain/verification-evidence/run.hoQTLD/`。`summary.json` 记录 `result: passed`、`version: 0.9.29`、`classification: registration_missing`、`visual: not_run` 和 `formalUpgrade: not_run`。`cleanup.txt` 记录 `exit=0; temporary work directory removed; evidence retained`，`service-cleanup.txt` 确认私有 daemon 和 Web 进程退出、临时服务数据删除。

本轮六项服务检查全部通过：`served_wasm`、`served_glue`、`versioned_page`、`missing_token_rejected`、`invalid_token_rejected`、`existing_token_accepted`。错误 glue、未知原版 WASM 和互斥装配输入均按预期以退出码 1 被拒绝，未生成对应输出目录。

缺少检测报告的失败路径证据位于 `run.4qvr9k/`：脚本退出码为 1，明确提示需要匹配的报告和 profile，临时工作目录删除，证据保留。

共享站点脚本对 `$HOME/.local/share/tern-web-0.9.21` 的真实历史 `font-only` 站点验证通过，核对清单中的七个文件，并通过 `maple.js`、`fonts.json` 与声明字体资源检查。另用缺少基础文件的测试清单确认共享脚本会拒绝不完整站点。

最终 systemd 只读预检证据位于 `~/.local/share/tern-maintain/verification-evidence/run.dm0V7p/upgrade.GQhI9g/`。`summary.json` 记录 `result: preflight_passed`、`version: 0.9.29`、`mode: check` 和 `changed: false`。没有执行 `--apply`，正式 binary、unit、服务与 token 文件未由本轮升级脚本修改。

技能结构检查通过：五份功能文件、九份 Markdown 文件、四份可执行 Bash 脚本；所有 Bash 文件通过 `bash -n`，内部链接存在。未安装 shellcheck，因此未执行 shellcheck。

## 当前运行版本与提交

用户随后问：`ok? running latest? confirm?`。`inspect-runtime` 实测 daemon PID `462844` 和 Web PID `1551852` 均为版本 `0.9.29`，两者 `matchesInstalled: true`，Web `httpStatus: 200`。该结果确认当前运行的是本次部署版本，不代表对后续官方发布进行了联网查询。

用户最后授权 `commit push`。提交 `60ce2678a41492cce34b6dcd91b12662f5a7484e`，主题为 `Add scripted Tern font deployment skill`，包含技能十三个文件与维护工具 README 一个文件；推送至 `origin/master` 成功，推送前 hardcoded secrets 扫描通过。

## 证据边界

本轮没有执行联网获取、新版本未知结构审核、`working` 分支完整重建、正式 `--apply` 或浏览器视觉测试。文件 hash、站点装配和认证通过不证明中文、图标、字形或字符宽度的最终显示。一次脚本入口减少临时命令是设计上的流程改进，本轮没有进行新旧流程耗时对比。
