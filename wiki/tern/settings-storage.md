# Tern 设置存储位置

> Sources: Tern 0.9.2 module strings and local CLI, 2026-10-17; Stencil official plugin SDK documentation, 2026-10-17; Tern 0.9.23 web settings and Chrome Local Storage forensics, 2026-11-16; Tern 0.9.26 /fonts delivery confirmation, 2026-11-18
> Raw: [Web 设置存储实现](../../raw/tern/2026-10-17-web-settings-storage.md); [Packages and Manifests 官方摘录](../../raw/tern/2026-10-17-plugin-sdk-four-pages.md); [网页字体渲染与设置](../../raw/tern/2026-11-16-web-font-rendering-and-settings.md); [Chrome 本地设置恢复](../../raw/tern/2026-11-17-chrome-localstorage-recovery.md); [0.9.26 服务端字体投递](../../raw/tern/2026-11-18-tern-0.9.26-fonts-server-delivery.md)
> Updated: 2026-11-18

## 原生与 Web 使用不同存储

Tern 的原生实现把设置写入配置目录下的 `settings.json`。Linux 默认配置目录为 `~/.config/tern`；设置 `TERN_CONFIG_DIR` 后，配置目录和状态目录都使用该变量指定的位置。

Tern 0.9.2 的 Web 实现使用浏览器 `localStorage`，键名同样为 `settings.json`。它按浏览器配置文件和站点 origin 保存；更换协议、主机或端口会使用不同的 origin 存储空间。Windows 浏览器里的 Web 设置由该浏览器保存，不会出现在 WSL 的原生配置目录中。

Web 存储只写相对默认设置发生变化的值；全新的未修改设置序列化为 `{}`。读取损坏 JSON 时使用默认值并给出警告。

## 文件不存在时的判断

本机当时 `TERN_CONFIG_DIR` 未设置，`tern plugin dir` 返回 `/home/cpf/.config/tern/plugins`。配置目录里没有 `settings.json`，只有 `web-token` 和 `plugins/`。这只能说明原生设置文件当时未创建，不能说明 Web 设置未保存。

原生文件路径与 Web 浏览器存储需要分别检查。浏览器中可在开发者工具的 Local Storage 里按当前 Tern origin 查找 `settings.json`。

## 主机插件开关的范围

官方 Packages and Manifests 文档只明确两个主机插件设置：`plugins` 是总开关，`plugins_disabled` 是保持不加载的插件 id 列表。每台机器读取自己的设置，不在主机之间同步。手动修改后在下一次加载或重载时生效。

这两个键的证明范围是主机端插件加载，不能用来解释 Web 浏览器中的全部设置内容。

## Web 端键名、字体设置与覆盖风险

WASM 端读取设置时用 `local_storage().and_then(|storage| storage.get_item(FILE)...)`，其中 `const FILE: &str = "settings.json";`。浏览器里因此只有 `settings.json` 这一个键，`tern-settings` 不是有效键名。

`settings.json` 的 `font_family` 是终端 grid 的字体族，注释为「empty: the monospace face」。WASM 字符串字面量显示它会请求 `./fonts?chars=...&families=...` 与 `./fonts/<id>`，服务端接口行为已实测：未配置 `font_family` 时返回 Noto 字体（ID `b76b0433203017ca80401b2ee0dd6935`，`19484784` 字节），配置 `Maple Mono NF CN` 后返回 Maple 字体（ID `b3f8f26efab7c88f4f72cff0fe02a3c8`，`20561696` 字节），两个 ID 在 0.9.23 与 0.9.26 上一致。浏览器侧的实际请求未观测到：新建隔离 profile 中 Playwright `page.on('request')` 未捕获 `/fonts` 请求，`caches.keys()` 无 `tern-fonts`。因此「浏览器向服务端拉取字体并注册」是服务端接口与 WASM 字面量支持的推断，不是浏览器侧直接观测到的事实。实测写入 `font_family` 后同一区域截图由 25179 字节变为 27617 字节、像素差异 7045/180000（3.91%），canvas 字形确实改变，但具体渲染路径未确认。CSS 变量与 `!important` 不改变 canvas 内容。用户自有 profile 的 `settings.json` 在覆盖前已把 `font_family` 四项设为 `Maple Mono NF CN`。

`localStorage.setItem` 按整键替换。直接写入只含一个字段的对象会丢弃该键内其他全部设置，包括主题、光标、标签布局等。修改时先取出当前字符串、`JSON.parse`、合并字段，再整体写回。Chrome 把 Local Storage 存在 `Local Storage/leveldb`，用户键编码为 `_<origin><key>`；触发 LevelDB compaction 前，被覆盖的旧值仍可从 SSTable 读出。

## See Also
- [Tern 设置项全集](settings-schema.md)
- [Tern 插件架构与平台边界](plugin-architecture.md)
- [Tern 升级辅助工具与验收边界](maintenance-toolkit.md)
