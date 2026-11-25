# Copilot systemone 与 luna-decisions 的行为差异（微软端校验更严）

> Source: 2026-11-09 luna-decisions 接入会话实测（对 Copilot 上游与 Jev 端的对比探针），2026-11-26 整理入库
> Collected: 2026-11-09
> Published: Unknown

## 差异点（微软端 vs Jev 端）

```text
1. predicate 带 when_true / when_false → 微软端 400 unknown_parameter；Jev 接受该字段
2. choice 选项须为 {value, description} 对象，否则 400
3. 图片引用语法：微软要求 "image:" 前缀；Jev 接受裸 <uuid>
   typesafeWire 内部用裸 UUID，微软端把裸 UUID 包装成 <uuid> 再送上游
4. 微软端未列出 box 题型
```

## Azure Foundry 与 TypeSafe 认证差异

```text
Azure Foundry 路径: /providers/microsoft/v1/systemone
TypeSafe:           Bearer API key
Foundry:            支持 Entra bearer token 或 api-key 请求头
```
