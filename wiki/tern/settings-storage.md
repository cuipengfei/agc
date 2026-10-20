# Tern 设置存储位置

> Sources: Tern 0.9.2 module strings and local CLI, 2026-10-17; Stencil official plugin SDK documentation, 2026-10-17
> Raw: [Web 设置存储实现](../../raw/tern/2026-10-17-web-settings-storage.md); [Packages and Manifests 官方摘录](../../raw/tern/2026-10-17-plugin-sdk-four-pages.md)
> Updated: 2026-10-20

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

## See Also
- [Tern 设置项全集](settings-schema.md)
- [Tern 插件架构与平台边界](plugin-architecture.md)
- [Tern 升级辅助工具与验收边界](maintenance-toolkit.md)
