# Orca Linux 发行物、serve 与 Web 客户端核实（2026-11-28）

> Source: Orca 官方文档 `install.mdx`、`remote-servers.mdx`、`cli/overview.mdx`、`settings.mdx`（https://github.com/stablyai/orca/blob/main/docs/site/content/docs/）；`src/cli/specs/serve.ts`；GitHub Releases API `v1.4.281`；`releases/expanded_assets/v1.4.281`；deb control（HTTP Range）；Orca main 分支源码；本机 WSL 检查
> Collected: 2026-11-28
> Published: Unknown

## 官方 install.mdx：Linux 包

> Each published release ships three Linux packages — an **AppImage**, a **`.deb`**, and an **`.rpm`** — for both x64 and arm64. They contain the same app. What differs is how updates reach you, so pick on that.

> The AppImage has a stable download link per architecture — [`orca-linux.AppImage`](https://github.com/stablyai/orca/releases/latest/download/orca-linux.AppImage) for x64 and [`orca-linux-arm64.AppImage`](https://github.com/stablyai/orca/releases/latest/download/orca-linux-arm64.AppImage) for arm64 — and needs `chmod +x` before its first run, because GitHub release assets carry no permission bits.

> The `.deb` and `.rpm` filenames carry the version and architecture, and the two formats spell architecture differently (`orca-ide_<version>_amd64.deb` or `_arm64.deb`; `orca-ide-<version>.x86_64.rpm` or `.aarch64.rpm`), so take those from the [Releases page](https://github.com/stablyai/orca/releases) rather than a fixed URL.

> **The AppImage self-updates.** Choose it if you want automatic updates. Orca checks for a new release, you click **Update**, and it replaces the AppImage in place — the same flow as macOS and Windows.

> **The `.deb` and `.rpm` do not self-update.** Orca still notices the new version and downloads the package, then gives you a **Copy Install Command** button.

> On Linux the [Orca CLI](/docs/cli/reference) installs as **`orca-ide`**, not `orca`.

> The `.deb` and `.rpm` put `orca-ide` on your `PATH` at install time, as `/usr/bin/orca-ide`.

> With the AppImage, register the CLI from [Settings → General → Orca CLI](/docs/settings). That installs `~/.local/bin/orca-ide`.

> On a headless host, a packaged `orca serve` writes a bare `orca` into `~/.local/bin` as it starts, unless a file it does not own already holds that name.

## 官方 install.mdx：server-only 包

> Each release also publishes the server alone for Linux x64 and arm64: orcad, the Node runtime it runs on, and the `orca-ide` CLI. It needs no desktop packages (GTK, X11, Xvfb), so it suits your own headless Linux servers, VMs and containers. It is about 60 MB to download, against 190 MB for the `.deb`.

> A server-only install has no browser panes, dictation or paired web client, because those come with the desktop app.

> To update, stop the server, replace `/opt/orca-server` with a newer release, and start it again; paired clients cannot update it for you.

> The server needs glibc 2.28 or newer (Ubuntu 20.04, Debian 10, RHEL 8 and later).

## 官方 remote-servers.mdx

> Use `orca serve` when the host should run without the desktop window—for example, a headless Linux server or a service-managed VM.

> starts the Orca runtime without opening the desktop window;

> prints the bound endpoint and a runtime pairing URL;

> Use `--bind <literal-ip>` to choose the interface that accepts runtime connections.

> Use only one host mode at a time. If the Orca desktop app is already sharing that computer, do not start a second `orca serve` process for the same setup.

> `orca serve` runs on Orca's own Node server (orcad) by default. If orcad can't serve on this computer, it uses the desktop app's server instead and prints one line saying why.

## CLI spec（src/cli/specs/serve.ts）

> With --port, serve exits with an error when that port is already in use. Without it, serve uses 6768 and moves to another port when 6768 is taken.

> The service never prints a pairing link to its log. Pair clients with `orca pair` while it runs, or from the desktop app.

> On Linux the service stops at logout unless lingering is on (`loginctl enable-linger`); install reports it.

> When the web client bundle is available, the server also prints a browser URL with the pairing data embedded.

> Exits with code 3, without starting anything, when another Orca already serves this profile or cannot be shown to have stopped.

`serve service install` 生成的 Linux unit 默认名为 `orca-serve.service`（有后缀时 `orca-serve-<suffix>.service`），启动参数为 `serve --supervise --no-pairing`。

## 源码事实

- `resolveOrcadBindHost`：未传 `--bind` 时返回 `ORCAD_LOOPBACK_BIND_HOST = '127.0.0.1'`；`--bind` 只接受字面 IP。
- `findBundledWebClientRoot(appPath)` 依次检查 `join(appPath, 'out', 'web')` 与 `join(appPath, '..', 'web')` 下的 `web-index.html`。
- `static-web-client-handler.ts`：允许的路径为 `/web-index.html`，允许的前缀为 `/assets/`；内容类型包含 `text/css`、`text/html`、`text/javascript`。
- `runtime-rpc-pairing.ts`：`webClientUrl: this.webClientRoot && scope === 'runtime' ? createWebClientUrl(endpoint, pairingUrl) : null`。
- `serve-readiness.ts`：人类可读输出包含 `Web client URL: ${readiness.pairing.webClientUrl}`。
- `web-runtime-environment.ts`：`const ENVIRONMENT_STORAGE_KEY = 'orca.web.runtimeEnvironment.v1'`；读取和写入都走 `window.localStorage`；无法持久化的配对只保存在内存。
- `web-preferences-store.ts`：使用 `SETTINGS_STORAGE_KEY` 与 `UI_STORAGE_KEY`；`settings.get` 通过 `callRuntimeResult` 向 runtime 取设置。
- `ensure-virtual-display.ts`：无 `DISPLAY` 时启动 `Xvfb :99`；虚拟显示号 `VIRTUAL_DISPLAY_NUMBER = 99`；安装提示为 `Install \`xvfb\` on Debian/Ubuntu or \`xorg-x11-server-Xvfb\` on RPM-based systems.`
- `serve-appimage-update.ts`：注释 `AppImage swaps leave running copies stale; re-exec at the same PID to preserve service tracking.`；监视 AppImage 文件的 mtime，替换后重启。
- `config/docker/headless-serve-shutdown/run-signal-case.sh` 在 AppImage 的 serve 启动后检查 `$HOME/.local/bin/orca-ide`，其目标为 `$XDG_CACHE_HOME/orca/appimage/launcher/orca-ide`。
- `config/docker/headless-serve-shutdown/Dockerfile` 安装 `fuse`；`run-appimage-case.sh` 对 `.AppImage` 使用 `--appimage-extract-and-run`。AppImage 类型 2 依赖 libfuse2，缺失时用 extract-and-run 绕过挂载。

## GitHub Releases v1.4.281

`releases/tags/v1.4.281`：`draft=false`、`prerelease=false`、`assets=24`。

相关资产（名称、字节数、直链）：

| 资产 | 字节数 | 直链 |
|---|---|---|
| orca-ide_1.4.281_amd64.deb | 225,495,568 | https://github.com/stablyai/orca/releases/download/v1.4.281/orca-ide_1.4.281_amd64.deb |
| orca-ide_1.4.281_arm64.deb | 216,410,288 | https://github.com/stablyai/orca/releases/download/v1.4.281/orca-ide_1.4.281_arm64.deb |
| orca-ide-1.4.281.x86_64.rpm | 191,074,489 | https://github.com/stablyai/orca/releases/download/v1.4.281/orca-ide-1.4.281.x86_64.rpm |
| orca-ide-1.4.281.aarch64.rpm | 184,212,405 | https://github.com/stablyai/orca/releases/download/v1.4.281/orca-ide-1.4.281.aarch64.rpm |
| orca-linux.AppImage | 287,697,368 | https://github.com/stablyai/orca/releases/download/v1.4.281/orca-linux.AppImage |
| orca-linux-arm64.AppImage | 282,579,733 | https://github.com/stablyai/orca/releases/download/v1.4.281/orca-linux-arm64.AppImage |
| orca-server-linux-x64.tar.gz | 71,915,437 | https://github.com/stablyai/orca/releases/download/v1.4.281/orca-server-linux-x64.tar.gz |
| orca-server-linux-arm64.tar.gz | 71,585,198 | https://github.com/stablyai/orca/releases/download/v1.4.281/orca-server-linux-arm64.tar.gz |

标签页 HTML 中的资产区为懒加载：

```html
<include-fragment loading="lazy" src="https://github.com/stablyai/orca/releases/expanded_assets/v1.4.281" ...>
```

`expanded_assets/v1.4.281` 页面包含 `orca-ide_1.4.281_amd64.deb`、`orca-ide_1.4.281_arm64.deb`、`orca-ide-1.4.281.x86_64.rpm`、`orca-linux.AppImage`、`orca-server-linux-x64.tar.gz` 等文件名。

deb 直链 HEAD 返回 200，`content-length: 225495568`。

## deb control

用 HTTP Range 读取前 1,048,576 bytes，解析 `control.tar.xz` 得到的字段：

- Package: orca-ide
- Version: 1.4.281
- Architecture: amd64
- Installed-Size: 686496
原 control 字段为单行，以下按逗号拆分。

- Depends:
  - libgtk-3-0
  - libnotify4
  - dbus-bin | dbus
  - libglib2.0-bin
  - libnss3
  - libxss1
  - libxtst6
  - xdg-utils
  - libatspi2.0-0
  - libuuid1
  - libsecret-1-0
  - libasound2t64 | libasound2
  - libgbm1
  - python3
  - python3-gi
  - gir1.2-atspi-2.0
  - at-spi2-core
  - xdotool
  - xclip
  - xvfb
- Recommends: libappindicator3-1

`control.tar.xz` 成员大小 `342,164` bytes；`data.tar.xz` 成员大小 `225,153,212` bytes。

本机 Ubuntu 26.04 上：`libgtk-3-0t64` 的 `Provides` 含 `libgtk-3-0 (= 3.24.52-0ubuntu1)`；`libatspi2.0-0t64` 的 `Provides` 含 `libatspi2.0-0 (= 2.60.4-0ubuntu0.1)`；`xvfb` 候选版本 `2:21.1.22-1ubuntu1.3`。

## 本机环境检查（2026-11-28）

- `PRETTY_NAME="Ubuntu 26.04.1 LTS"`。
- 内核 `6.18.58.1-microsoft-standard-WSL2`。
- `.wslconfig` 的 `[wsl2]` 段含 `networkingMode = mirrored`。
- `DISPLAY` 未设置；`WAYLAND_DISPLAY=wayland-0`。
- `xvfb` 已安装；`libfuse2t64` 未安装，候选版本 `2.9.9-9build1`。
- `/dev/fuse` 存在；glibc `2.43`。
- systemd user `Linger=yes`；`~/.local/bin` 在 `PATH` 中。

## 证据边界

- 未安装、未运行 Orca；上述行为来自官方文档与 main 分支源码。
- 官方文档的 60 MB / 190 MB 是近似值；v1.4.281 资产按字节记录。
- GitHub 标签页的资产区当前为懒加载；页面结构以后可能变化，固定 tag 的直链有效。
