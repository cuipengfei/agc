# 服务与认证

## Sub-features

- 启动与正式环境隔离的 daemon 和 Web 服务。
- 检查进程身份、HTTP 状态、站点资源、版本页面和三种 token 认证结果。
- 结束时停止本次进程，删除临时凭据并保留证据。

## How to get to it (user POV)

发布脚本完成站点装配后，自动调用 `scripts/verify-service.sh`。无需手工选择端口、创建 token 或启动服务。

## Driving it with release scripts

隔离服务脚本完成六项检查：WASM、glue、版本页面、无 token、错误 token 和正确 token。证据为 `runtime.json`、`service.json`、对应断言和 `service-cleanup.txt`；发布脚本最后核对 `summary.json` 与 `cleanup.txt`。

## Gotchas

- 启动输出可能包含临时 token URL，因此只保存在临时目录并随清理删除。
- 隔离实例没有正式窗格，不能证明正式升级会保留现有程序。
- 服务认证通过不证明中文与图标显示；视觉检查由用户确认或经明确授权执行。
