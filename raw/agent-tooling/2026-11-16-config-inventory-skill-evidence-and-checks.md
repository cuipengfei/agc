# 配置清单类 skill 的证据复用与确定性检查取证

> Source: 本仓库 `.agents/skills/{omp-configs,opencode-configs,herdr-configs,omo-configs,info-tracker,beads,wiki-session-extract}` 正文与脚本；`.github/workflows/{skills.yml,tern-maintain.yml}`；本机 `@oh-my-pi/pi-coding-agent` v18.20.3、`omo-ai` 5.1.72；提交 `799bc2b905` 的 Actions 运行记录
> Collected: 2026-11-16
> Published: Unknown

## A. 配置清单 skill 的证据分层

| 层 | 存放位置 | 内容 | 是否入库 |
|---|---|---|---|
| 运行时快照 | `cache/settings.json`、`cache/settings.html` | 当前键集合、默认值、合并后的配置值、三态、指纹 | 否，`cache/` 被忽略 |
| 消费方证据 | `<skill>/behavior-evidence.json`、OpenCode 的 `evidence.json`、OMO 的 `omo-evidence.mjs` | 已核对的源码位置与版本 | 是 |
| 翻译层 | `<skill>/translations.json` | 中文 label 与 desc | 是 |

`omp-configs/behavior-evidence.json`：22 个键，每键给出 `src/...` 路径与行号，顶部记录 OMP 版本 `18.20.3`；说明正文留在 `translations.json`，两处联合使用。

`herdr-configs/behavior-evidence.json`：3 个键（`ui.agent_panel_sort`、`ui.host_cursor`、`keys.command`），版本 `0.9.5`；条目指向仓库内 raw 摘录与上游源码。

`opencode-configs/scripts/review-evidence.mjs`：`review()` 输出 `affectedKeyMap`，逐键拆分 `changed`、`missing`、`unchanged` 三类来源；`unchanged` 直接复用既有取证。

`omo-configs/scripts/omo-evidence.mjs`：`EVIDENCE_VERSION = "5.0.1"`；`RE_VERIFIED_5_1_72` 含 `task.global_concurrency` 与 `task.residency_max_children`；`detectOmoAiVersion()` 依次读 `OMO_AI_DIR` 与 Senpi 安装目录相邻的 `omo-ai/package.json`；`evidenceWarning()` 在安装版本与证据版本不一致或无法检测时返回警告文本。

## B. 复用规则

写入四个配置类 skill 的流程段：

1. 先读现有快照的版本、目标键描述符与脱敏后的配置值。
2. 查消费方证据文件，取得已核对的版本与源码位置。
3. 把问题与已有字段、说明、证据逐项比较，只查询缺失或版本过期的部分。
4. 委派时附上已知版本、键名、当前结论、已有来源与具体缺口。
5. 报告默认值、可选值、配置文件值与运行时覆盖的区别；未取得的信息明确标注。

描述符指纹覆盖的是描述符字段；消费方代码变化不改变指纹，版本不同时按实际询问的消费方复查。

## C. 确定性检查

| skill | 命令 | 规模 |
|---|---|---:|
| `omp-configs` | `cd .agents/skills/omp-configs/tests && bun test ./omp-configs.test.ts` | 10 项 |
| `opencode-configs` | `cd .agents/skills/opencode-configs/scripts && bun test ./lib.test.mjs ./review-evidence.test.mjs ./upgrade.test.mjs` | 72 项 |
| `herdr-configs` | `bun .agents/skills/herdr-configs/tests/run.mjs` | 3 项 |
| `omo-configs` | `bun .agents/skills/omo-configs/scripts/tests/run-tests.mjs` | 20 项 |
| `info-tracker` | `python3 -m unittest discover -s tests -p 'test_info_tracker*.py' -v` | 23 项 |

隔离方式：

- `omp-configs`：`OMP_SRC` 指向 `tests/fixtures/mock-src`（7 个假设置，含 enum、items、credential、normalize、validate），`OMP_AGENT_DIR` 指向临时 `values.json`，`render-html --tr` 指向 fixture 翻译文件。
- `opencode-configs`：临时目录与本地 fixture 文件，`spawnSync` 跑真实 CLI。
- `herdr-configs`：`PATH` 注入 stub `herdr`，`--version` 与 `--default-config` 返回 fixture，参考 JSON 与 `config.toml` 也是 fixture。
- `omo-configs`：`SENPI_SRC` 指向假的 `SettingsManager` 与 `settings-manager.d.ts`，`OMO_HOME` 指向临时目录，同级 `omo-ai/package.json` 控制检测到的版本。

断言类型：只改 `validate` 时指纹翻转；`--old` 缺失时报错；无旧快照时 `versionComparison` 为 `unknown`；翻译缺项时非零退出且不写产物；HTML 内嵌 JSON 与输入快照一致；`</script>` 注入按文本显示；schema 不完整时 `schemaMissing` 非零。

## D. CI

新增 `.github/workflows/skills.yml`，触发路径为 `.agents/skills/**`、`tests/test_info_tracker*.py`、该 workflow 自身；一个 `behavior` job，五个 `run` 步骤对应上表。

既有 `.github/workflows/tern-maintain.yml` 的触发路径：

```text
tools/tern-maintain/**, tools/wiki-check/**, wiki/**, raw/**, .github/workflows/tern-maintain.yml
```

因此 `.agents/skills/**` 的提交不触发 Tern。

提交 `799bc2b905` 的两次运行：gitleaks 成功（run 43899303848），Skill behavior checks 成功（run 43899303857）。Tern 最近一次运行在提交 `27acc29` 上成功（run 43896264400）。

## E. Bun 测试发现规则

仓库根目录执行 `bun test .agents/skills/omp-configs/tests/` 时搜索 2571 个文件、收集 0 个测试文件，退出码 1；提示「Tests need ".test", "_test_", ".spec" or "_spec_" in the filename」。

进入测试目录后执行 `bun test ./omp-configs.test.ts` 正常。CI 与文档使用 `working-directory` 或 `cd` 进入目标目录。

## F. OMO 的版本与未核实标记

本机 `omo-ai` 安装版本 5.1.72，证据版本 5.0.1。

导出结果：总行 158，`schemaMissing=16`；`evidence.omoAiVersion` 为 5.1.72，`staleWarning` 非空。

HTML 检查（Chromium）：158 行；警告横幅可见；71 行标 `⚠ 未核实`，2 行标已核对；无页面异常。判定规则：行 `evidence` 与检测到的安装版本不同即视为未核实，默认值、生效值、状态分类一并提示可能不准确。

`schemaMissing` 的 16 个键：

```text
contextFiles, deviceId, enableSessionShare, engineTurns,
extensionEventHandlerTimeoutMs, extensionEventHandlerWarnMs, fallback,
fullscreenWheelScrollLines, handoffHint, jobWidgets, reducedMotion,
sessionShutdownQuitBudgetMs, threads, tools,
turn_inactivity_ms, turn_max_runtime_ms
```

## G. 其他仓库级 skill 的检查结论

| skill | 结论 |
|---|---|
| `info-tracker` | 已有确定性隔离测试（fake `urlopen`、fake `subprocess`，无网络），23 项通过；无委派流程 |
| `beads` | 纯 `bd` CLI 用法说明，无脚本行为可测 |
| `wiki-session-extract` | 纯流程 skill，无脚本；「批准前不写文件」由步骤与边界声明约束 |

## H. 本会话涉及的配置取值

八项显式配置：`composer.predictionAlternatives=false`、`prewalk.into="@task"`、`magicKeywords.enabled=true`、`magicKeywords.chillax=true`、`tui.motion="reduced"`、`extensionRenderers.assistantText=true`、`extensionRenderers.transcriptPresenters=true`、`gc.strip=true`。

五项核实值：`textVerbosity="medium"`、`task.autoParallel="suggest"`、`task.steps=true`、`task.perCallModel="on"`、`todo.midRunNudges="capped"`；`edit.mode` 为 `hashline`。`prewalk.into` 的角色 `@task` 解析到模型 `kimi-code/k3.1-pro:max`。

本地扩展与已启用插件中检索 `registerAssistantTextRenderer`、`registerTranscriptPresenter`，未发现调用点。
