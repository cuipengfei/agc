# OMP 压缩模型解析：无全局开关，仅 per-model（源码摘录）

- Source: 本机 @oh-my-pi/pi-coding-agent v18.1.10 随包源码
- Collected: 2026-09-06
- Published: Unknown

## 1. 唯一解析入口只读当前模型的 compactionModel

`src/session/role-models.ts:61-64`（resolveCompactionConfiguredTarget 主体）：

```ts
const configuredCompactionTarget = parseModelTargetString(currentModel.compactionModel);
```

函数不读取任何 settings 级全局字段；参数只有 currentModel 与 availableModels。

## 2. settings schema 的 compaction 段无 model 字段

对 `src/config/settings-schema.ts` 全量 grep `compaction`，出现的字段仅：enabled、midTurnEnabled、thresholdPercent（default 85）、thresholdTokens（default -1，UI 描述 "overrides percentage if set"，-1 即退回 percentage）、methodOrder、remoteEndpoint、handoffSaveToDisk 等；无 compaction.model 之类的全局模型字段。

## 3. modelOverrides 仅精确 id 匹配

`src/config/custom-models.ts:217`：

```ts
const direct = overrides.get(model.id);
```

（resolveModelOverrideWithAliases 内；另处理 :variant 别名，无通配符。）

schema 侧：`ModelOverrideSchema` 含 `compactionModel`（models-config-schema-bundle.ts:249），provider 级挂载点为 `modelOverrides` map（:309），注释（:82-83）说明 provider 级 override 可针对 bundled 模型。

## 4. 候选链顺序

`src/session/session-maintenance.ts:2240-2256`（#getCompactionModelCandidates）：

1. resolveCompactionConfiguredTarget(preferredModel)（即当前模型的 compactionModel）
2. preferredModel 自身
3. 各 model role 的模型
4. registry 中窗口最大的模型兜底

## 5. 本次配置动作（2026-09-06）

- `~/.omp/agent/models.yml`：29 个模型配上 `compactionModel: c8787/gpt-5.6-luna`（19 个静态定义直写 + kimi-code 7 / deepseek 3 走 modelOverrides）；umans / opencode-zen / opencode-go 的 142 个模型按用户要求不配置。
- luna 条目对齐网关目录：contextWindow 1050000、maxTokens 128000（本仓库 models.yml 此前旧值为 272000 / 16000）。
- `~/.omp/agent/config.yml:282-284`：compaction.methodOrder 改为 [shake, soft]（原 shake/remote/soft）。
