# OpenCode DCP 本地配置摘录

> 来源：`~/.config/opencode/dcp.jsonc`
> 采集日期：2026-09-11

## 已配置内容

```json
{
  "enabled": true,
  "turnProtection": {
    "enabled": true,
    "turns": 4,
    "protectUserMessages": true
  },
  "minContextLimit": "55%",
  "maxContextLimit": "65%"
}
```

`"minContextLimit": "55%"`、`"maxContextLimit": "65%"` 为 DCP 压缩/修剪阈值提示；本配置仅证明已写入，不证明运行时已加载该插件。
