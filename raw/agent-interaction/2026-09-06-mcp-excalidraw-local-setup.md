# yctimlin/mcp_excalidraw 本地设置与使用补充（2026-09-06）

> Source: 本地安装与实测, 2026-09-06
> Collected: 2026-09-06
> Published: Unknown
> Type: excerpt

## 安装（Bun 全局）

- `bun add -g mcp-excalidraw-server` 安装 v2.0.0
- 可执行文件：`mcp-excalidraw-server`（主 CLI）+ `excalidraw-canvas`（canvas server）
- 内置 Excalidraw Canvas 服务器，端口默认 3000

## OMP MCP 配置

`~/.omp/agent/mcp.json` 添加：

```json
"excalidraw": {
  "type": "stdio",
  "command": "/home/cpf/.bun/bin/mcp-excalidraw-server",
  "args": []
}
```

重启后显示 `excalidraw ● connected [stdio]`。

## 26 个 MCP 工具（8 类）

| 分类 | 数量 | 工具 |
|---|---:|---|
| 创建 | 3 | create_element, batch_create_elements, create_from_mermaid |
| 编辑 | 6 | update_element, delete_element, group_elements, ungroup_elements, lock_elements, unlock_elements |
| 布局 | 3 | align_elements, distribute_elements, duplicate_elements |
| 查询 | 3 | describe_scene, query_elements, get_element |
| 导出 | 4 | export_scene, export_to_image, export_to_excalidraw_url, get_canvas_screenshot |
| 快照 | 2 | snapshot_scene, restore_snapshot |
| 视口 | 1 | set_viewport |
| 状态管理 | 1 | clear_canvas |
| 其他 | 3 | import_scene, read_diagram_guide, get_resource |

注：状态管理仅 `clear_canvas`；`snapshot_scene`/`restore_snapshot` 属快照类；视口仅 `set_viewport`。

## 浏览器依赖（4 个）

`create_from_mermaid`, `export_to_image`, `get_canvas_screenshot`, `set_viewport`

其余 22 个自动 spawn canvas server，无需浏览器标签。

## 字体枚举与默认设置

硬编码枚举：`1=Virgil`, `2=Helvetica`, `3=Cascadia`, `5=Excalifont`, `6=Nunito`, `7=Lilita One`, `8=Comic Shanns`

- Maple 不在列表中
- 未知字体 fallback 到 `1` (Virgil)
- Skill 层默认设置：`~/.agents/skills/excalidraw-skill/SKILL.md` 添加 `fontFamily: 3` (Cascadia) 规则

## Sync 机制

- `POST /api/elements/sync` 覆盖写入 server 内存 Map
- auto-sync timer 存在，刷新不丢失
- server 重启后内存清空
- 非持久化，仅多客户端实时共享

## 遥测审计（代码级）

范围：`dist/` 目录全部 JS 文件

- `share-url.js:62` — `fetch('https://json.excalidraw.com/api/v2/post/')` 唯一确认的外部上传
- 其余网络请求均指向 `EXPRESS_SERVER_URL`（默认 `http://127.0.0.1:3000`）
- 未发现 telemetry/analytics/track/metric/sentry/segment/mixpanel/amplitude 等关键词

## 单 canvas 限制与变通

- 单 `elements` Map，无多 board
- 持久化仅 `export --out file.excalidraw`
- 多板变通：多端口实例（`PORT=3001`）+ 独立 MCP 入口配 `EXPRESS_SERVER_URL`

## CLI 使用示例

```bash
# 启动 canvas server（可选，CLI 命令会自动 spawn）
mcp-excalidraw-server start

# 画图（自动 spawn）
echo '[{"id":"a","type":"rectangle","x":100,"y":100,"width":160,"height":80,"text":"API"}]' | mcp-excalidraw-server add

# 导出
mcp-excalidraw-server export --out diagram.excalidraw

# 截图（需浏览器打开 127.0.0.1:3000）
mcp-excalidraw-server screenshot --out diagram.png
```
