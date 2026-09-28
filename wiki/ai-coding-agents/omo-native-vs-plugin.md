# OMO 5.0：独立版（omo-ai）与插件版（oh-my-openagent）

> Sources: oh-my-openagent v5.0.0 release notes（code-yeongyu，2026-09-26）; npm registry（oh-my-openagent、omo-ai）; 本机实测（omo-ai 5.0.0 / engine senpi 2026.9.26），2026-09-27
> Raw: [OMO 5.0 独立版与插件版区别](../../raw/oh-my-openagent-omo/2026-09-27-omo-5.0-native-vs-plugin.md); [omo 命令面与首启迁移观察](../../raw/oh-my-openagent-omo/2026-09-27-omo-cli-command-surface.md); [Kibitzer/Dream 机制与模型路由直读证据](../../raw/oh-my-openagent-omo/2026-09-27-kibitzer-dream-mechanisms.md); [OMO native 模型配置结构与 senpi adapter 集合](../../raw/oh-my-openagent-omo/2026-09-27-omo-native-model-config.md); [Codex 特性门与 Code Mode 直读](../../raw/ai-coding-agents/2026-09-05-codex-features-and-code-mode.md)
> Updated: 2026-09-27

术语：**插件版** = 装进宿主里跑的扩展；**独立版** = 自带引擎的独立命令行程序；**lane / category** = omo 按任务类型自动挑模型的通道；**bin** = npm 包声明的可执行命令名。

## 一句话

5.0.0 起 OMO 有两条并存产品线：装进宿主的插件版，和自带引擎的独立命令行程序。同一个 `omo` 命令的归属换了包，两者共用版本号但定位不对等。插件版仍可运行。

## 两个包，同版本号，不同东西

| | oh-my-openagent@5.0.0 | omo-ai@5.0.0 |
|---|---|---|
| 定位 | 插件版：装进 OpenCode（及 Codex 的 LazyCodex 支线）跑 | 独立版（OmO Native）：独立 CLI，就是 `omo` 命令 |
| 引擎 | 宿主的 | senpi（release notes 称为 Pi 的 fork），OMO 功能作为 extension 直接加载 |
| `omo` bin | 4.19.4 有，**5.0.0 删除** | `{"omo": "bin/omo.js"}` |
| 依赖 | 16 个 | 仅 senpi + @babel/parser；**不依赖 oh-my-openagent** |
| Node | — | 要求 >= 24.0.0 |

同为 5.0.0、npm `repository` 字段都指向 `code-yeongyu/oh-my-openagent`。据此推测两包出自同一代码库、同步发版——这是从 repository 字段一致得出的**推断**，未读构建/发布配置证实 monorepo 关系。

关键点：**版本号相同不代表两者对等或一样成熟。** 独立版是作者主推，插件版从这版起进入 degraded support——新功能先落 Native，部分功能因宿主承载不了永远不来。作者原话建议弃用插件版，但也说明插件版仍可运行。

## 独立版怎么工作、适合什么

默认形态是交互式编码助手：`omo [消息...]` 直接进 agent。子命令只管三件事——装扩展（`install`/`remove`/`list`/`config`）、认证（`auth print-api-key`/`print-bearer-token`/`check`）、守护进程（`app-server`、`host`）。

release notes 声明的独立版独有能力（插件版无）：

- **Kibitzer**：常驻的第二个 agent loop，碰到没判断过的记忆时自动唤醒提醒，只有 5 个只读工具，不能改记忆。
- **CodeMode**：一个步骤可以是一段能直接调用工具的可执行单元，把多次工具往返压成一次。release notes 自述为独立版独有；与 Codex 的 Code Mode 同轴，两边实现均未直读，机制等价性未验证，不据此判市场级独有。
- **git-markdown 长期记忆 + 后台反思**：记忆存成 git 仓库里的文件。
- **mass ulw**：任务拆成带依赖的图，节点按类型路由到不同模型并行跑。
- **内置浏览器（omowright）**、子会话共享一个后台 daemon（本机 `omo host` 命令的存在与此一致）。

适合：想要常驻记忆、并行委派、内置浏览器、更省资源的重度 agent 工作流。插件版仍可运行；Native 新功能优先，部分功能永远不会进入插件版。

### 比较范围说明

上文「独有能力」清单是 release notes 声明的**产品线比较**——独立版有、插件版没有。这与 [19 家名单的市场级比较](4-agent-comparison.md)是两个范围，不存在口径冲突。CodeMode 与 Codex Code Mode 的等价性、Kibitzer/Dream 相对别家的独有性，属市场级裁定，不据此文判定。

### Status: Disputed（自述性能，未独立验证）

release notes 给出冷启动 5.8s→850ms、每轮上下文约插件版 0.39x～0.69x、97.5% prompt cache 命中等数字。全部作者自述，本会话未独立测量，当广告看。

## native 模型配置（models.json）

独立版从 `~/.omo/agent/models.json` 读 provider（senpi dist 内 `ModelConfig.loadSync`）。senpi 是 Pi 的 fork，支持的 api 取值与 pi-ai 的 `BUILTIN_API_IDS` 一致（`openai-responses`、`openai-completions`、`anthropic-messages`、`openai-codex-responses` 等），`docs/models.md` 明列这几个为合法 api。

**按 API 协议分别配置 provider。** opencode 与 OMP 都把同一个 `localhost:8787` 网关按 API 协议分别配置：opencode 用 `4140`（Responses）+ `4140-chat`（chat completions）；OMP 用 `c8787`（openai-responses）+ `c8787-chat`（openai-completions）。本会话按 OMP 参照把 native models.json 重写为 5 provider：`c8787`（openai-responses，9 个 gpt 系）、`c8787-chat`（openai-completions，gemini/kimi 3 个）、`umans`、`justwoker`、`kimi-claw`（均 anthropic-messages）。分组与模型上限经真解析库交叉校验，与 OMP、opencode 源一致。

**baseUrl 必须带 `/v1`。** senpi 内置 OpenAI SDK 不自动补 `/v1`，追加 `/responses`、`/chat/completions` 前直接用 baseUrl，所以 openai 系 provider 的 baseUrl 写 `http://localhost:8787/v1`；anthropic-messages 的 baseUrl 去尾 `/v1`。这与 [pi-ai 不补 `/v1`](../model-gateway-mismatch/sdk-strictness-on-nonstandard-responses-frames.md) 是同一机制在 fork 上的实例。

**8787 == 4140。** opencode 名为 `4140` 的 provider 只是 provider 标识，其 baseURL 指向 `localhost:8787`。

### Status: Unverified（生效来源与连通）

models.json 是否为 native 唯一生效来源未定：senpi dist 另有代码级 `registerProvider`（extension/native provider），加载链未追完。native 实际吃 openai-responses/completions 打到 :8787 由源码支持，未发真请求实测。

## 升级后要注意的两处行为变化

**1. metis / momus 别名取消。** 以前 `metis`→`plan-consultant`、`momus`→`plan-reviewer`；5.0 起简称失效（别名窗口在 5.0.0-beta.51 后关闭），被当成两个没配好的普通 agent，静默生效不报错。tag 文档的删除声明针对统一 `omo.jsonc` 的 `agents.metis`。本机 `~/.omo/omo.jsonc` 的 `[opencode]` 块下有这两个 key，但该作用域是否同样适用别名取消未验证。

**2. deep-low 默认模型换成 gpt-5.6-sol-fast**（fallback gpt-5.6-sol）。只有 GPT-6 Sol 的账号会发现这条通道消失，需手动 pin `categories.deep-low.model`。

## ncu 升级不等于换到独立版

`ncu -g` 只把插件版从 4.19.4 升到 5.0.0，不会装独立版。升级后 `omo` 可能仍是旧安装留下的软链，指向插件版 CLI，打印裸版本号而非 `engine: senpi`。要用独立版得单独装 `omo-ai`。

### Status: Unverified（首启迁移的时序与因果）

装完独立版并运行后，`migrations-state.json` 记录 `migrateLegacySenpiDirs`、`migrateSessionsFromAgentRoot` 两项完成；现状是 `~/.pi/agent` 与仓库 `.pi` 为空、`.omo` 有内容。该文件无时间戳，迁移是否由本次首启触发、`.pi` 是本次被清空还是本就近空、是否可逆，均未验证。只有现状可见，因果与时序无证据。

## See Also

- [四 Agent CLI 能力面对比（codex / opencode / omo / omp）](cli-capability-surface.md)
- [omo native 合法 agent 名册与配置三层](omo-native-agent-roster.md)

## 证据边界

- 一手直读：registry bin/deps、本机版本/软链/omo.jsonc key/Node 版本、命令树去重、迁移状态文件与目录条目数。
- 文档声明（v5.0.0 tag，同一项目单源）：degraded support、独有功能、senpi 为 Pi fork、metis/momus 取消、deep-low 默认变更。
- 推断/未验证：monorepo 同步发版（据 repository 字段）；性能数字；senpi 相对上游 pi 的改动；首启迁移的时序、因果与可逆性。
