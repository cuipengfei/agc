# OMP cfg:// 配置解析本会话实测

> Source: 本会话对 `cfg://` 与 `cfg://mnemopi/scoping` 的实际读取（OMP 运行时，cwd /home/cpf/code-inside/agc）；系统提示的 Internal URLs 契约
> Collected: 2026-10-11
> Published: Unknown

## cfg:// 的 Internal URLs 契约

系统提示对 `cfg://` 的描述：omp 设置；仅当用户询问或要改时使用。`cfg://<ns>` 为命名空间；`cfg://<ns>/<key>` 给 value/type/default/source。写入设置为 session-only，`…/save` 持久化；写入需用户批准。会话内写入后应询问是否 save。

## 单键查询输出（cfg://mnemopi/scoping）

本会话读取 `cfg://mnemopi/scoping` 的完整输出：

```
mnemopi.scoping: "per-project-tagged"
type: enum
default: "per-project"
source: global config
values: [global, per-project, per-project-tagged]
description: global = one shared bank; per-project = isolated bank per cwd; per-project-tagged = project-local writes plus global recall visibility
```

要点：当前生效值 `per-project-tagged` 与内置默认 `per-project` 不同，`source` 标为 `global config`，说明该值来自用户/全局配置文件（`~/.omp/agent/config.yml`），不是内置默认。单键输出含六个字段：value、type、default、source、values（枚举可选值）、description。

## 裸地址 cfg:// 的输出形态

本会话读取裸 `cfg://` 返回整棵设置树，按命名空间分组，每个键带当前值与行内 `#` 注释（枚举可选值 · default 值 · 说明）。节选（凭据形态值已略去，原始输出中 `token`/`password`/`apiKey`/`credentials` 等槽位为 null 或已 `<redacted>`）：

```
memory:
  backend: "mnemopi"  # off|local|hindsight|mnemopi|sharpshooter · default "off" · ...
mnemopi:
  scoping: "per-project-tagged"  # global|per-project|per-project-tagged · default "per-project" · ...
dev:
  autoqa: true  # Automated tool issue reporting (xd://report_issue).
  autoqaConsent: "granted"  # unset|granted|denied · default "unset"
  autoqaPush:
    endpoint: "https://qa.omp.sh/v1/grievances"  # Full URL receiving Auto QA JSON reports ...
    token: null
task:
  maxRecursionDepth: 1  # default 2 · How many levels deep subagents can spawn their own subagents
  maxConcurrency: 4  # default 32 · Maximum number of subagents running concurrently
```

要点：

- 裸地址一次性列出全部命名空间与键，模型据此得知键路径、合法枚举值、默认值、是否被改过、键的用途——不需要预先记住键名。
- 行内注释里 `default X` 与当前值的差异直接显示该键有没有被覆盖。例如 `memory.backend` 当前 `mnemopi`、默认 `off`，说明被配置覆盖；`task.maxRecursionDepth` 当前 1、默认 2，本机配置下调了递归深度。

## 层次与 source 归属

`source` 字段把生效值归到某一层。本会话观察到的层（上压下）：

- 内置默认（编译进二进制）→ source: default
- 全局/用户配置 `~/.omp/agent/config.yml` → source: global config（实测 `mnemopi.scoping` 即此来源）
- 项目级配置（项目目录下的 `.omp` 配置，若有）→ 对应项目来源（本会话未实际触发，按配置发现惯例列出，未实测）
- 会话内临时写入（`write cfg://…` 不带 save）→ 会话来源（本会话未发生任何 cfg:// 写入，仅两次读取）

写入 `cfg://` 默认只改会话这一层且需批准，带 `…/save` 才落到 yaml 文件。因此查某键真正来源看 `source` 比直接翻 yaml 准确：yaml 没写的键仍有内置默认在生效。
