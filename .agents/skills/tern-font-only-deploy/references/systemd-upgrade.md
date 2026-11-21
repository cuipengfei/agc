# Tern 的 systemd 服务升级

使用 `scripts/systemd-upgrade.sh` 检查或升级本机正式服务。脚本适用于 daemon 和 Web 均为 systemd 管理、运行报告的 managerPid 为 `null` 的实例。其他 manager 使用维护工具支持的升级路径。

## 输入

- `TERN_CANDIDATE_BINARY`：通过发布验证的官方候选 binary。
- `TERN_ARCHIVE`：与候选 binary 对应的官方安装包。
- `TERN_PERSISTENT_SITE`：发布验证生成并保留的站点目录。用于 systemd 时，绝对路径只能包含 ASCII 字母、数字、`.`、`_`、`-` 和 `/`；其他字符会在预检阶段被拒绝。
- 可选的本机覆盖项：安装路径、daemon socket、Web 端口和 token 文件位置。

## 只读预检

从 AGC 仓库根目录运行：

```bash
TERN_CANDIDATE_BINARY="$HOME/.local/bin/tern" \
TERN_PERSISTENT_SITE="$HOME/.local/share/tern-maintain/0.9.29-YKaUMw39/site" \
TERN_ARCHIVE="/mnt/c/Users/39764/Downloads/Tern-0.9.29-linux-x86_64.tar.gz" \
  .agents/skills/tern-font-only-deploy/scripts/systemd-upgrade.sh
```

脚本核对安装包与候选 binary、站点清单和实际文件、两个服务的活动状态、进程身份、manager 类型、Web unit 参数、窗格 ID、程序 PID 和 token 文件。预检不会修改 binary、unit 或服务。

## 正式升级

只有用户明确授权正式升级后，才用同一组环境变量追加 `--apply`：

```bash
TERN_CANDIDATE_BINARY="$HOME/.local/bin/tern" \
TERN_PERSISTENT_SITE="$HOME/.local/share/tern-maintain/0.9.29-YKaUMw39/site" \
TERN_ARCHIVE="/mnt/c/Users/39764/Downloads/Tern-0.9.29-linux-x86_64.tar.gz" \
  .agents/skills/tern-font-only-deploy/scripts/systemd-upgrade.sh --apply
```

脚本原子替换 binary，使用 Tern 热切换接续 daemon 管理的程序，更新 Web unit 的站点位置并只重启 Web 服务。随后核对版本、HTTP、进程身份、窗格 ID、程序 PID、token 文件和六项服务认证。

每次执行使用独立证据目录。失败时保留证据并报告实际状态；脚本不会自动恢复已经完成的步骤。最终中文和图标显示由用户检查。
