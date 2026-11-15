# Go 与 sip 安装升级

> Sources: Go 官方文档与本机实测，2026-11-15；Gaurav-Gosain/sip v0.10.0，2026-11-15
> Raw: [Go 1.27.4 升级与 sip 安装](../../raw/terminal-multiplexers/2026-11-15-go-1.27.4-upgrade-and-sip-install.md); [sip WSL systemd 自启与 uv-bun 集成](../../raw/terminal-multiplexers/2026-11-15-sip-wsl-systemd-autostart-and-uv-bun-update.md)
> Updated: 2026-11-15

## Overview

Go 在 WSL 里不归 `apt`/`dpkg` 管，官方推荐用 tarball 手动升级，后续用 `GOTOOLCHAIN` 环境变量保持更新。sip 通过 `go install` 安装到 `~/go/bin`，并已接入 `uv-bun` 的版本检查与自动升级。

## Go 升级路径

`dpkg -S /usr/local/go/bin/go` 确认 Go 不归 apt 管。升级步骤：

1. 从 `https://go.dev/dl/go1.27.4.linux-amd64.tar.gz` 下载官方 tarball
2. 用官方 `.sha256` 文件校验（`sha256sum -c` 通过）
3. `sudo rm -rf /usr/local/go` 删除旧版（不残留垃圾）
4. `sudo tar -C /usr/local -xzf go1.27.4.linux-amd64.tar.gz` 解压新版

`go version` 确认 `go1.27.4 linux/amd64`。

## GOTOOLCHAIN 后续更新

`go env -w GOTOOLCHAIN=go1.27.4+auto` 写入持久配置后，Go 在构建要求更高版本的项目时会自动下载并使用对应工具链。恢复由 `/usr/local/go` 决定默认版本用 `go env -u GOTOOLCHAIN`。

## sip 安装

```bash
go install github.com/Gaurav-Gosain/sip/cmd/sip@latest
```

安装到 `/home/cpf/go/bin/sip`。`go version -m` 确认 module 为 `github.com/Gaurav-Gosain/sip v0.10.0`，编译器为 `go1.27.4`。

## uv-bun 集成

`uv-bun --check` 读取 sip 的 Go 构建元数据（设 `GOTOOLCHAIN=local` 防止自动下载工具链），查询 Go 官方模块代理 `@latest`，输出本地版本与是否有更新。全程不运行 sip。

`uv-bun --up` 版本不同时执行 `go install github.com/Gaurav-Gosain/sip/cmd/sip@latest`，完成后核验 PATH 中实际 sip 版本是否与代理返回的最新版本一致；不一致时报 `FAILED sip active version check`。

找不到 sip 报 `sip: not found`，找不到 Go 报 `sip: Go not found`，安装失败报 `FAILED sip` 并附原因。隔离环境 9 项行为测试全部通过。

## See Also

- [sip v0.10.0 使用参考](sip-v0.10.0-usage-reference.md)
- [ttyd 与 sip 并存部署](ttyd-and-sip-side-by-side.md)
