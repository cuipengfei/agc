# OMP 配置键全量清单与凭据遮蔽边界（18.3.1）取证

> Source: 本会话 dump-settings 跑 `@oh-my-pi/pi-coding-agent` v18.3.1 生成的 cache/settings.json；直读源码 `/home/cpf/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent/src/config/{all-settings,registry,settings}.ts`
> Collected: 2026-09-26

## 枚举与判定 API

- `orderedSettings()` — `config/all-settings.ts` 导出，返回全部设置描述符（有序）。
- `Settings.loadReadOnly({ agentDir, cwd })` — `config/settings.ts`，只读加载本机配置，可对每个描述符取生效值。不解析环境变量覆盖，取到的是配置文件的值，非运行时最终值。
- `settingValuesEqual(a, b)` — `config/registry.ts`，判定生效值是否等于默认值。

## 键总量与文档覆盖

- `orderedSettings()` 枚举总数：512。
- `ui.label` 与 `ui.description` **两者皆空**的键：128。核对：只缺 label 不缺 desc 的 0 个，只缺 desc 不缺 label 的 0 个——要么两者都有，要么两者都无。
- 推论：靠 `ui.label`/`ui.description` 做「配置解释器」时，这 128 键无文字可用，必须读消费代码补说明。

### 128 个无 ui 文字键的 id 清单

```
auth.broker.url
auth.broker.token
auth.accountPolicies
enabledModels
enabledProviders
disabledProviders
modelRoles
modelTags
modelProviderOrder
cycleOrder
setupVersion
statusLine.leftSegments
statusLine.rightSegments
statusLine.segmentOptions
tui.maxInlineImageColumns
tui.maxInlineImageRows
tui.maxInlineImages
retry.enabled
retry.baseDelayMs
providers.anthropic.slowMode
thinkingBudgets.minimal
thinkingBudgets.low
thinkingBudgets.medium
thinkingBudgets.high
thinkingBudgets.xhigh
thinkingBudgets.max
compaction.reserveTokens
compaction.keepRecentTokens
compaction.autoContinue
compaction.remoteEndpoint
compaction.v2RetainedMessageBudget
branchSummary.reserveTokens
memories.enabled
memories.maxRolloutsPerStartup
memories.maxRolloutAgeDays
memories.minRolloutIdleHours
memories.threadScanLimit
memories.maxRawMemoriesForGlobal
memories.stage1Concurrency
memories.stage1LeaseSeconds
memories.stage1RetryDelaySeconds
memories.phase2LeaseSeconds
memories.phase2RetryDelaySeconds
memories.phase2HeartbeatSeconds
memories.rolloutPayloadPercent
memories.phase1InputTokenLimit
memories.fallbackTokenLimit
memories.summaryInjectionTokenLimit
sharpshooter.intervalMinutes
sharpshooter.injectionTokenLimit
autolearn.minToolCalls
mnemopi.retainEveryNTurns
mnemopi.recallLimit
mnemopi.recallContextTurns
mnemopi.recallMaxQueryChars
mnemopi.injectionTokenLimit
mnemopi.debug
hindsight.bankIdPrefix
hindsight.bankMission
hindsight.retainMission
hindsight.retainEveryNTurns
hindsight.retainOverlapTurns
hindsight.retainContext
hindsight.recallBudget
hindsight.recallMaxTokens
hindsight.recallContextTurns
hindsight.recallMaxQueryChars
hindsight.recallTypes
hindsight.debug
hindsight.requestTimeoutMs
hindsight.reflectTimeoutMs
hindsight.recallTimeoutMs
hindsight.retainTimeoutMs
hindsight.mentalModelMaxRenderChars
edit.modelVariants
async.maxJobs
dev.autoqaPush.token
dev.autoqaConsent
shellPath
bashInterceptor.patterns
shellMinimizer.settingsPath
shellMinimizer.only
shellMinimizer.except
shellMinimizer.maxCaptureBytes
shellMinimizer.legacyFilters
bash.autoBackground.thresholdMs
eval.autoBackground.thresholdMs
task.disabledAgents
task.agentModelOverrides
task.agentServiceTierOverrides
task.agentCompactionThresholdOverrides
task.agentPrewalk
task.agentAdvisor
extensions
disabledExtensions
skills.enabled
skills.enableCodexUser
skills.enableClaudeUser
skills.enableClaudeProject
skills.enablePiUser
skills.enablePiProject
skills.enableAgentsUser
skills.enableAgentsProject
skills.customDirectories
skills.ignoredSkills
skills.includeSkills
searxng.token
searxng.basicUsername
searxng.basicPassword
searxng.categories
searxng.engines
searxng.language
searxng.safesearch
images.urls.options
images.urls.credentials
stt.language
commit.mapReduceEnabled
commit.mapReduceThreshold
commit.mapBatchTokenBudget
commit.cacheEnabled
commit.cacheTtlDays
commit.changelogMaxDiffChars
gc.blobs
gc.archive
gc.wal
gc.coldArchiveAfterDays
gc.retainNewestGlobal
gc.retainNewestPerCwd
```

## 凭据遮蔽边界

`isCredential` 标记的键共 8 个：

```
auth.broker.token
mnemopi.embeddingApiKey
mnemopi.llmApiKey
hindsight.apiToken
dev.autoqaPush.token
searxng.token
searxng.basicPassword
images.urls.credentials
```

未被 `isCredential` 标记、却可能携带敏感信息的键：`auth.broker.url`（type string，远程 broker 地址）、`modelRoles`（type record）。只按 `isCredential` flag 遮蔽会把这两类值写进产物。

按值形态补的遮蔽规则：已配置（configured）的非本机 `http(s)` URL、非空 credential record 一律替换为 `<redacted>`。本机验证：`dev.autoqaPush.endpoint`、`share.serverUrl`、`images.urls.credentials` 的生效值被该规则挡下。默认值里的公网 URL（源码常量）保留。

## 指纹缓存法与盲区

每个键的指纹对整个描述符做 SHA-256，含 `validate`/`normalize` 函数的源码字符串——normalize 单独改动也会翻转指纹。盲区：活在消费代码里的行为变化不在描述符内，指纹看不到。故只有旧快照可比对时以指纹为准（精确）；只有解释索引时，小版本升级列出全部有解释的键供人工复查。

## 本机观测（非 OMP 通用事实）

2026-09-26 采集机上：effectiveDefault=419、customized=93、credentials=8（当前全部为空值）。这是该机器该时刻的配置状态，随用户编辑而变，不是关于 OMP 的事实。
