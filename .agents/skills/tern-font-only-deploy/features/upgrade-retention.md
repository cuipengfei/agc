# 升级与保留

## Sub-features

- 默认对正式 systemd 服务执行只读预检。
- 经明确授权后原子安装候选 binary，热切换 daemon，并只重启 Web 服务。
- 核对升级后的版本、运行身份、窗格、程序、原 token 和服务认证。

## How to get to it (user POV)

先完成发布验证并保留持久站点，再按 [systemd 升级参考](../references/systemd-upgrade.md) 运行 `scripts/systemd-upgrade.sh`。预检通过后，只有用户明确授权正式升级才追加 `--apply`。

## Driving it with release scripts

升级脚本保存升级前后的运行报告、排序后的窗格 ID 和程序 PID，并比较 token 文件内容。应用变更后检查六项服务认证。证据使用 `before-*`、`after-*`、`unit-exec.txt`、`formal-service.json`、`summary.json` 和 `cleanup.txt`。

## Gotchas

- 此入口只接受 managerPid 为 `null` 的本机 systemd 服务；其他 manager 使用维护工具支持的升级路径。
- 不停止 daemon 的 systemd 单元，因为该操作会结束其管理的程序。
- 预检通过不代表升级已执行；迁移验收只运行预检，不修改正式服务。
- 升级失败时保留证据并报告实际状态，不自动恢复或隐藏部分完成的变化。
