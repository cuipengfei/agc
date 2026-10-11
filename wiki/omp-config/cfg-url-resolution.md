# OMP cfg:// 配置解析：合并视图与 source 归属

> Sources: 本会话对 cfg:// 的实测, 2026-10-11; omp Internal URLs 契约, 2026-10-11
> Raw: [cfg:// 本会话实测](../../raw/omp-config/2026-10-11-cfg-url-resolution-session.md)
> Updated: 2026-10-11

## Overview

`cfg://` 不是本地 yaml 文件的直读，而是把多层配置合并后的实时解析视图，并对每个键标注生效值来自哪一层。模型不预先知道键名，靠逐层下钻读出来——裸地址列全树带行内说明，`<ns>` 列单组，`<ns>/<key>` 给单键的 value/type/default/source/values/description。查某键真正来源看 `source` 比翻 yaml 准确，因为 yaml 没写的键仍有内置默认在生效。

## 三层下钻与键发现

模型不靠记忆猜键名，靠读取发现：

- **`cfg://`（裸地址）**：返回整棵设置树，按命名空间分组，每个键带当前值与行内 `#` 注释（枚举可选值 · default 值 · 用途说明）。一次读出键路径、合法取值、默认值、是否被改过、键的用途。
- **`cfg://<ns>`**：只看一个命名空间的键。
- **`cfg://<ns>/<key>`**：单键详情，六个字段 value、type、default、source、values、description。

行内注释里 `default X` 与当前值的差异直接暴露该键有没有被覆盖。例如本会话实读 `memory.backend` 当前 `mnemopi`、默认 `off`；`task.maxRecursionDepth` 当前 1、默认 2。

## 合并视图 vs yaml 文件

`cfg://` 的值是多层叠加算出的最终结果，`source` 字段把生效值归到某一层。层序（上压下）：

| 层 | 来自 | source 标注 |
|---|---|---|
| 内置默认 | 编译进二进制 | default |
| 全局/用户配置 | `~/.omp/agent/config.yml` | global config |
| 项目级配置 | 项目目录下的 `.omp` 配置（若有） | 对应项目来源 |
| 会话内临时写入 | `write cfg://…`（未 save） | 会话来源 |

本会话实读 `cfg://mnemopi/scoping` 为证：

```
mnemopi.scoping: "per-project-tagged"
default: "per-project"
source: global config
```

当前值 `per-project-tagged` 与默认 `per-project` 不同、`source: global config`，说明该值来自用户/全局配置文件覆盖，不是内置默认。若某键没人改过，`source` 显示 default、值即内置默认。

> **Status: 项目级配置层未实测**
> 项目级配置层按配置发现惯例列出；本会话 cwd 下未触发该来源，未取得对应 source 标注的实读证据。

## 写入语义

写 `cfg://<ns>/<key>` 默认只改会话这一层、且需用户批准，退出即失效；带 `…/save` 才落到 yaml 文件。会话内写入后应询问是否 save。

本会话未发生任何 cfg:// 写入（仅两次读取：裸 `cfg://` 与 `cfg://mnemopi/scoping`），因此当前所有键的 `source` 只会是 default 或 global config，不存在"会话来源"那一层——该层是机制上的泛指，不是本会话实际产生的状态。

## See Also

- [OMP 配置键全量清单与凭据遮蔽边界](config-key-census.md)
- [OMP 配置语义手册](config-semantics.md)
- [OMP 内建工具全集、会话暴露边界与内部地址空间](../omp-tools/builtin-tools-and-internal-urls.md)
