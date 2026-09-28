import { existsSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { availableParallelism } from "node:os";

const HOME = process.env.HOME ?? "";
const OMO_HOME = process.env.OMO_HOME ?? join(HOME, ".omo");
const AGENT_DIR = process.env.OMO_AGENT_DIR ?? join(OMO_HOME, "agent");
const PROBE_CWD = process.env.OMO_PROBE_CWD ?? "/tmp";
// task concurrency resolves per available parallelism at runtime (v5.0.1
// resolveOmoTaskSettings uses availableParallelism, not cpus().length), so
// compute this machine's real effective values with the same primitive.
const PAR = availableParallelism();
const RESOLVED_GLOBAL_CONCURRENCY = Math.max(8, 2 * PAR);
const RESOLVED_RESIDENCY = Math.min(16, Math.max(8, 2 * PAR));

// Resolve the installed Senpi engine (holds core/settings-manager.js) by
// absolute path, mirroring omp-configs: agc has no node_modules linking the
// global install, so a bare specifier will not resolve. Override with SENPI_SRC.
function resolveSenpiSrc() {
  const candidates = [
    process.env.SENPI_SRC,
    "/home/cpf/.bun/install/global/node_modules/@code-yeongyu/senpi/dist",
  ].filter(Boolean);
  for (const c of candidates) {
    if (existsSync(join(c, "core/settings-manager.js"))) return c;
  }
  throw new Error(
    "Cannot locate Senpi source. Set SENPI_SRC to <global>/node_modules/@code-yeongyu/senpi/dist"
  );
}

const SRC = resolveSenpiSrc();
const { SettingsManager, parseSettingsJson } = await import(
  join(SRC, "core/settings-manager.js")
);

// current = scope-resolved effective values (global + project merge, defaults baked in).
// defaults = the engine's own defaults with no settings on disk.
const current = SettingsManager.create(PROBE_CWD, AGENT_DIR);
const defaults = SettingsManager.inMemory({});
const globalRaw = current.getGlobalSettings();
const projectRaw = current.getProjectSettings();

// Senpi Settings fields. `getter` names the SettingsManager method that returns
// the effective value; the same getter on `defaults` yields the shipped default.
// `raw` marks user-data maps/lists with no bulk getter — read straight from the
// merged raw settings, default is empty/undefined.
const SETTINGS_FIELDS = [
  { key: "defaultProvider", getter: "getDefaultProvider", label: "默认模型提供方", desc: "会话启动时按此 ID 选定模型提供方；设定后免去每次开会话手选提供方", whenUnset: "无预设，启动时需手动选择提供方" },
  { key: "defaultModel", getter: "getDefaultModel", label: "默认模型", desc: "会话启动时选定的默认模型 ID；设定后直接进入该模型，不用每次挑", whenUnset: "无预设，启动时需手动选择模型" },
  { key: "defaultThinkingLevel", getter: "getDefaultThinkingLevel", label: "默认思考级别", desc: "新会话的默认思考级别（off/minimal/low/medium/high/xhigh/max）；越高模型思考越久越贵。想默认省钱设 low，想默认深思设 high", whenUnset: "用模型自身默认思考级别" },
  { key: "transport", getter: "getTransport", label: "传输方式", desc: "与提供方通信的传输方式，默认 auto 自动选择；特定网络或代理下 sse/websocket 才通时显式指定（auto/sse/websocket）" },
  { key: "steeringMode", getter: "getSteeringMode", label: "引导模式", desc: "运行中你追加的引导消息如何投递，默认 all 一次性全给模型；one-at-a-time 逐条给，想让模型逐条消化时用（all/one-at-a-time）" },
  { key: "followUpMode", getter: "getFollowUpMode", label: "跟进模式", desc: "排队的跟进消息如何处理，默认 one-at-a-time 逐条；all 一次全给，想让模型合并看时用（all/one-at-a-time）" },
  { key: "theme", getter: "getTheme", label: "主题", desc: "TUI 配色主题名；含 `/` 的路径形主题走 themes 列表加载。想换配色时设主题名", whenUnset: "用内置默认主题" },
  { key: "hideThinkingBlock", getter: "getHideThinkingBlock", label: "隐藏思考块", desc: "默认 false 显示模型思考过程；设 true 后 TUI 不再展开思考块，想要更干净的输出时开", raw: false },
  { key: "showCacheMissNotices", getter: "getShowCacheMissNotices", label: "显示缓存未命中通知", desc: "默认 false；设 true 后 prompt cache 未命中即提示，排查缓存为何没省钱时开" },
  { key: "collapseChangelog", getter: "getCollapseChangelog", label: "折叠更新日志", desc: "默认 false 展开更新日志；设 true 后启动时默认折叠，不想每次看长变更时开" },
  { key: "enableSkillCommands", getter: "getEnableSkillCommands", label: "启用技能命令", desc: "默认 true 提供 /skill 命令；设 false 后 /skill 不可用，想精简命令面时关" },
  { key: "showHardwareCursor", getter: "getShowHardwareCursor", label: "显示硬件光标", desc: "默认取环境变量 HARDWARE_CURSOR==1；控制 TUI 是否用终端硬件光标，光标显示异常时切换" },
  { key: "doubleEscapeAction", getter: "getDoubleEscapeAction", label: "双击 Esc 动作", desc: "连按两次 Esc 触发的动作，默认 tree 打开会话树；fork 分叉会话、none 不动作（fork/tree/none）" },
  { key: "tuiMode", getter: "getTuiMode", label: "TUI 模式", desc: 'regular（默认）：对话像普通命令输出打印进终端、与 shell 历史一起滚动，退出后仍留在回滚缓冲。fullscreen（实验）：占用整屏备用缓冲，界面拆成固定底部输入区+上方独立滚动的对话区，另启用 fullscreenScrollbar/CopyOnSelect/ExitOutput 三项' },
  { key: "fullscreenExitOutput", getter: "getFullscreenExitOutput", label: "全屏退出输出", desc: "退出全屏时打印什么，默认 transcript 打印完整对话；resume-hint 只打印一行会话恢复提示（仅 fullscreen 生效）" },
  { key: "fullscreenScrollbar", getter: "getFullscreenScrollbar", label: "全屏滚动条", desc: "全屏对话区滚动条，默认 auto 按需显示；always 常显、hidden 隐藏（仅 fullscreen 生效）" },
  { key: "fullscreenCopyOnSelect", getter: "getFullscreenCopyOnSelect", label: "全屏选中复制", desc: "默认 true 选中文字即复制；设 false 后改用 Ctrl+X 复制选区（仅 fullscreen 生效）" },
  { key: "tips", getter: "getTipsEnabled", label: "提示", desc: "默认 true 显示功能提示；设 false 后不再弹提示，熟练后想清净时关" },
  { key: "quietStartup", getter: "getQuietStartup", label: "静默启动", desc: "默认 false；设 true 后启动跳过横幅与提示直接进会话，想要快启动时开" },
  { key: "sessionDir", getter: "getSessionDir", label: "会话目录", desc: "自定义会话记录存储目录（路径会规范化）；想把会话存到别处时设", whenUnset: "用引擎默认会话目录" },
  { key: "externalEditor", getter: "getExternalEditorCommand", label: "外部编辑器", desc: "编辑长输入调用的外部编辑器命令；未设时回退环境变量 VISUAL/EDITOR。想固定用某编辑器时设" },
  { key: "shellPath", getter: "getShellPath", label: "Shell 路径", desc: "run shell 工具用的 Shell 可执行文件路径（会规范化）；想指定非默认 shell 时设", whenUnset: "用系统默认 shell" },
  { key: "shellCommandPrefix", getter: "getShellCommandPrefix", label: "Shell 命令前缀", desc: "每条 shell 命令前自动加的前缀；想让命令都经某包装器（如进容器）时设", whenUnset: "不加前缀" },
  { key: "npmCommand", getter: "getNpmCommand", label: "npm 命令", desc: "安装包时用的自定义 npm 命令数组；想换成 pnpm/bun 或加参数时设", whenUnset: "用系统 npm 命令" },
  { key: "httpIdleTimeoutMs", getter: "getHttpIdleTimeoutMs", label: "HTTP 空闲超时", desc: "HTTP 连接空闲多久判超时（毫秒），未设走引擎内置 DEFAULT_HTTP_IDLE_TIMEOUT_MS；网络慢常断流时调大" },
  { key: "websocketConnectTimeoutMs", getter: "getWebSocketConnectTimeoutMs", label: "WebSocket 连接超时", desc: "WebSocket 建连超时（毫秒）；建连慢时调大", whenUnset: "用底层默认连接超时" },
  { key: "sessionShutdownHandlerWarnMs", getter: "getSessionShutdownHandlerWarnMs", label: "会话关闭处理器警告阈值", desc: "session_shutdown 处理器跑多久发警告（毫秒），未设走引擎默认；诊断关闭钩子慢时调" },
  { key: "sessionShutdownHandlerTimeoutMs", getter: "getSessionShutdownHandlerTimeoutMs", label: "会话关闭处理器超时", desc: "session_shutdown 处理器硬超时（毫秒），超时即终止，未设走引擎默认；关闭钩子卡死时调" },
  { key: "enableInstallTelemetry", getter: "getEnableInstallTelemetry", label: "安装遥测", desc: "默认 true 上报安装事件到 pi.dev；设 false 后不上报安装遥测。与使用分析 enableAnalytics 是两个独立开关" },
  { key: "enableAnalytics", getter: "getEnableAnalytics", label: "使用分析", desc: "匿名使用分析的 opt-in 开关（默认 false），置 true 才启用分析并配套 trackingId。与安装遥测 enableInstallTelemetry 是两个独立开关。已确认此开关本身用于 gate 分析；当前 dist 内未找到具体事件发送调用点，实际上报了哪些内容未证实" },
  { key: "trackingId", getter: "getTrackingId", label: "跟踪 ID", desc: "使用分析用的匿名跟踪标识符；enableAnalytics 开启时配套写入", whenUnset: "无跟踪 ID" },
  { key: "modelThinkingLevels", getter: "getAllModelThinkingLevels", label: "模型思考级别表", desc: "按模型 ID 记录的当前思考级别（模型→级别）；引擎在你切换某模型思考级别时自动维护，一般不用手改" },
  { key: "modelLastOnThinkingLevels", raw: true, label: "模型最后开启思考级别表", desc: "按模型记录的最后一个非 off 思考级别；从 off 再开时恢复到这个级别，引擎运行时自动维护", whenUnset: "无记录（引擎运行时自动维护）" },
  { key: "modelServiceTiers", raw: true, label: "模型服务级别表", desc: "按模型记录的服务级别（如 flex/priority）；引擎按此对模型请求选档，一般由界面写入", whenUnset: "不覆盖模型服务级别" },
  { key: "tipsHistory", getter: "getTipsHistory", label: "提示历史", desc: "功能提示的展示历史（tipId→最近展示时间戳）；引擎据此避免重复弹同一提示，自动维护" },
  { key: "changelogSeen", getter: "getChangelogSeen", label: "更新日志已看", desc: "按来源记录的已看更新日志版本；引擎据此只弹未看过的变更，自动维护", whenUnset: "无记录（引擎运行时自动维护）" },
  { key: "lastChangelogVersion", getter: "getLastChangelogVersion", label: "最后更新日志版本", desc: "最后查看的更新日志版本号；作为 engine 来源的已看基准，引擎自动维护", whenUnset: "无记录（引擎运行时自动维护）" },
  { key: "extensions", getter: "getExtensionPaths", label: "扩展", desc: "额外加载的扩展文件路径列表；想挂载自写扩展时把路径加进来" },
  { key: "skills", getter: "getSkillPaths", label: "技能", desc: "额外加载的技能目录列表；想让 agent 用某目录下的 skill 时加路径" },
  { key: "prompts", getter: "getPromptTemplatePaths", label: "提示模板", desc: "额外加载的提示模板路径列表；想复用自写 prompt 模板时加路径" },
  { key: "themes", getter: "getThemePaths", label: "主题列表", desc: "额外加载的主题文件路径列表；配合 theme 用路径形主题名时在此登记" },
  { key: "packages", getter: "getPackages", label: "包源", desc: "扩展/技能的 npm 或 git 包来源配置；想从包分发扩展时配" },
  { key: "enabledBuiltinExtensions", getter: "getEnabledBuiltinExtensions", label: "启用的内置扩展", desc: "显式启用的内置扩展 ID 列表；给出后只启用列内的内置扩展", whenUnset: "启用内置扩展默认集合" },
  { key: "disabledBuiltinExtensions", getter: "getDisabledBuiltinExtensions", label: "禁用的内置扩展", desc: "显式禁用的内置扩展 ID 列表；想关掉某个默认开的内置扩展时列进来" },
  { key: "recommendedModels", getter: "getRecommendedModels", label: "推荐模型", desc: "模型选择器里置顶推荐的模型列表；想自定义推荐位时设", whenUnset: "用引擎推荐列表" },
  { key: "favoriteModels", getter: "getFavoriteModels", label: "收藏模型", desc: "标记为收藏的模型列表，在选择器里单列；想快速切换常用模型时设", whenUnset: "无收藏模型" },
  { key: "enabledModels", getter: "getEnabledModels", label: "启用的模型", desc: "启用的模型模式列表（可含通配）；给出后只这些模型可选", whenUnset: "启用全部可用模型" },
  { key: "defaultTools", getter: "getDefaultTools", label: "默认工具", desc: "会话默认启用的工具列表；想裁剪或限定 agent 可用工具时设", whenUnset: "启用引擎默认工具集" },
  { key: "treeFilterMode", getter: "getTreeFilterMode", label: "树过滤模式", desc: "会话树默认过滤视图，默认 default；no-tools 隐藏工具调用、user-only 只看用户消息、labeled-only 只看打标、all 全显（default/no-tools/user-only/labeled-only/all）" },
  { key: "smoothStreaming", getter: "getSmoothStreaming", label: "平滑流式", desc: "默认 true 逐字平滑显示流式输出；设 false 后整块跳出。终端渲染慢时关可减负" },
  { key: "smoothStreamingFps", getter: "getSmoothStreamingFps", label: "平滑流式帧率", desc: "平滑流式目标帧率，默认 60，取值夹在 30–120；想更顺设高、想省 CPU 设低" },
  { key: "editorPaddingX", getter: "getEditorPaddingX", label: "编辑器水平边距", desc: "输入编辑器左右内边距（字符列），默认 0；想让输入区留白时调大" },
  { key: "outputPad", getter: "getOutputPad", label: "输出边距", desc: "输出区上下边距，默认 1；设 0 去掉输出块间空行、想更紧凑时用（0/1）" },
  { key: "autocompleteMaxVisible", getter: "getAutocompleteMaxVisible", label: "自动完成最大可见", desc: "自动完成菜单一次最多显示几项，默认 5；想一眼看更多候选时调大" },
  { key: "thinkingBudgets", getter: "getThinkingBudgets", label: "思考预算", desc: "按思考级别配置的 token 预算对象；想微调各级别思考 token 上限时设", whenUnset: "用引擎默认思考预算" },
  { key: "compaction", getter: "getCompactionSettings", label: "压缩设置", desc: "上下文压缩设置对象：控制压缩触发与摘要模型（compaction.model 是摘要模型，区别于会话模型）。想改压缩阈值或摘要模型时设" },
  { key: "branchSummary", getter: "getBranchSummarySettings", label: "分支摘要", desc: "分支摘要设置：reserveTokens 预留 token（默认 16384）、skipPrompt 是否跳过提示（默认 false）。想调分叉会话摘要预算时设" },
  { key: "retry", getter: "getRetrySettings", label: "重试设置", desc: "请求重试设置：enabled 开关、maxRetries 上限（默认取内置 SENPI_DEFAULT_RETRY_PROFILE）、baseDelayMs 退避基数。请求常失败想多重试时设" },
  { key: "askUser", getter: "getAskUserSettings", label: "询问用户", desc: "ask_user 工具设置：enabled 默认 true、timeoutMinutes 等待超时、bell 到点是否响铃。想让 agent 少问或调等待时长时设" },
  { key: "warnings", getter: "getWarnings", label: "警告设置", desc: "按类别开关各种运行警告的对象；想静音某类警告时把它设 false" },
  { key: "terminal", raw: true, label: "终端设置", desc: "终端能力覆盖与行为对象：鼠标模式、图片协议、真彩色、回滚行数、超时动作、监控注入限流等。想在终端能力探测不准时手动覆盖，或调终端会话上限时设", whenUnset: "用终端默认设置" },
  { key: "hooks", raw: true, label: "钩子", desc: "加载的 hook 文件路径列表；想在生命周期事件挂自写钩子时加路径", whenUnset: "不加载额外 hook" },
  { key: "lookAt", raw: true, label: "look-at 设置", desc: "look_at 视觉工具设置对象：enabled（默认 true）控制是否提供该工具——把本地图片/媒体或 base64 交给视觉模型按 goal 提取信息；models 指定看图用的视觉模型链，不设则用默认视觉模型。用途：主力编码模型不收图时由它转交视觉模型返回文字", whenUnset: "用 look-at 默认设置（enabled=true）" },
  { key: "httpProxy", raw: true, label: "HTTP 代理", desc: "出站 HTTP 请求走的代理地址；处于需代理才能访问模型端点的网络时设", whenUnset: "直连，不走代理" },
  { key: "defaultProjectTrust", getter: "getDefaultProjectTrust", label: "默认项目信任", desc: "打开新项目时的默认信任级别，默认 ask 每次问；always 直接信任、never 直接不信任（ask/always/never）" },
  { key: "openai", getter: "getOpenAIServiceTier", label: "OpenAI 服务级别", desc: "OpenAI 请求的 serviceTier 值；启用后由 service-tier 扩展的 addServiceTierToPayload 加到 OpenAI 请求 payload 的 service_tier 字段（源码 service-tier.js）。想对 OpenAI 模型选服务档时设，具体可选值取决于 OpenAI 账号", whenUnset: "不设置 OpenAI 服务级别" },
  { key: "experimental", getter: "getExperimentalSharedHost", label: "实验性 sharedHost", desc: "实验开关对象，getter 判定 experimental.sharedHost===true（默认 false）；控制是否启用 sharedHost 实验特性。实验性有风险，具体行为未在消费点逐一核实" },
  { key: "providers", getter: "getProviderSettings", label: "提供方配置", desc: "按提供方 ID 的运行配置（如并发限制）对象；想给某提供方限并发或调参时设" },
];
// Nested-object settings whose sub-fields get enumerated as their own report
// rows, each with a real engine default (same getter on the defaults manager).
// Getters below are the actual SettingsManager methods verified against the
// installed engine; lookAt/httpProxy have no sub-field getters, so they stay
// whole-value rows in the parent table.
const NESTED_SETTINGS_FIELDS = [
  { key: "markdown", group: "Markdown 渲染", subs: [
    { key: "codeBlockIndent", getter: "getCodeBlockIndent", label: "代码块缩进", note: "在渲染前给代码块内容加的缩进字符串" },
    { key: "mermaid", getter: "getMermaidRenderingMode", label: "Mermaid 渲染", note: 'agent 回复里的 mermaid 图怎么渲染：off 不渲染保留原文 | final 消息完成后渲染 | streaming 边生成边渲染。终端渲染卡顿时设 off 或 final' },
  ] },
  { key: "promptCache", group: "Prompt 缓存", subs: [
    { key: "goalBackstopMaxSeconds", getter: "getPromptCacheGoalBackstopMaxSeconds", label: "目标回退上限", note: "距目标最迟回退的秒数" },
    { key: "keepAlive.enabled", getter: "ka.enabled", label: "保活启用", note: "默认 false。开启后会话空闲期定期发 warm 请求刷新 Anthropic prompt 缓存、避免缓存到期后全价重建；用 Anthropic 模型且消息间常有停顿时开启更省更快，受下方次数/成本上限约束" },
    { key: "keepAlive.maxRequestsPerSession", getter: "ka.maxRequestsPerSession", label: "每会话最大请求数", note: "每会话保活请求数上限" },
    { key: "keepAlive.maxCostUsdPerSession", getter: "ka.maxCostUsdPerSession", label: "每会话最大成本", note: "每会话保活成本上限（美元）" },
    { key: "keepAlive.marginSeconds", getter: "ka.marginSeconds", label: "保活余量秒数", note: "保活提前量秒数" },
    { key: "cacheAwareTimeouts", schemaDefault: true, label: "缓存感知超时", note: "等待/超时是否避开 prompt cache 到期时刻，显式设 false 才禁用。无引擎 getter，此为 schema 声明默认（源码 prompt-cache-budget）" },
    { key: "safetyBufferSeconds", schemaDefault: 30, label: "安全缓冲秒数", note: "从模型 prompt-cache TTL 里减去的余量秒数，避免等待正好跨过缓存到期。无引擎 getter，此为 schema 声明默认 DEFAULT_PROMPT_CACHE_SAFETY_BUFFER_SECONDS=30" },
  ] },
  { key: "images", group: "图片显示", subs: [
    { key: "autoResize", getter: "getImageAutoResize", label: "自动缩放", note: "是否按终端宽度自动缩放图片" },
    { key: "blockImages", getter: "getBlockImages", label: "屏蔽图片", note: "是否屏蔽图片显示" },
    { key: "maxHistoricalImages", getter: "getMaxHistoricalImages", label: "历史图片上限", note: "会话中保留的历史图片数量上限", whenUnset: "用引擎默认上限" },
  ] },
  { key: "todo", group: "待办设置", subs: [
    { key: "firstTurnPlan", getter: "getTodoFirstTurnPlan", label: "首轮计划", note: 'force 首轮强制 agent 产出待办计划 | remind 提醒 | off 不管。想让 agent 更守计划设 force' },
    { key: "turnEndBackstop", getter: "getTodoTurnEndBackstop", label: "轮末兜底", note: "每轮结束是否强制做一次待办检查，避免 agent 漏掉没做完的项" },
  ] },
];

function eq(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function callGetter(manager, getter) {
  const fn = manager[getter];
  if (typeof fn !== "function") {
    throw new Error(`SettingsManager has no method ${getter}`);
  }
  return fn.call(manager);
}

// keepAlive sub-fields come from the whole `getPromptCacheKeepAliveSettings()`
// object; resolve `ka.<field>` against that object's members.
function resolveNested(manager, getter) {
  if (getter.startsWith("ka.")) {
    const whole = callGetter(manager, "getPromptCacheKeepAliveSettings");
    return whole[getter.slice(3)];
  }
  return callGetter(manager, getter);
}

function redact(key, value) {
  if (value === undefined || value === null) return value;
  const sensitive = /apiKey|api_key|secret|token|password|credential/i;
  if (sensitive.test(key)) return "<redacted>";
  if (
    typeof value === "string" &&
    /^https?:\/\//.test(value) &&
    !value.includes("localhost") &&
    !value.includes("127.0.0.1")
  ) {
    return "<redacted>";
  }
  return value;
}

const rows = SETTINGS_FIELDS.map((field) => {
  const rawPresent =
    Object.prototype.hasOwnProperty.call(globalRaw, field.key) ||
    Object.prototype.hasOwnProperty.call(projectRaw, field.key);

  let value;
  let defaultValue;
  if (field.raw) {
    value = projectRaw[field.key] ?? globalRaw[field.key];
    defaultValue = undefined;
  } else {
    value = callGetter(current, field.getter);
    defaultValue = callGetter(defaults, field.getter);
  }

  let state;
  if (!rawPresent) state = "unset";
  else if (eq(value, defaultValue)) state = "default-explicit";
  else state = "customized";

  return {
    key: field.key,
    label: field.label,
    desc: field.desc,
    getter: field.getter ?? null,
    value: redact(field.key, value),
    default: redact(field.key, defaultValue),
    state,
    whenUnset: field.whenUnset,
    source: field.raw ? "raw" : "getter",
  };
});
// Enumerate nested-object settings as their own rows, each with a real engine
// default (same getter on the defaults manager) and its own state. The parent's
// whole-value is only kept for the state of an explicitly-customized parent;
// each sub-field carries its own default and state so the report stays complete.
const nestedRows = [];
for (const nested of NESTED_SETTINGS_FIELDS) {
  for (const sub of nested.subs) {
    let value;
    let defaultValue;
    let state;
    if (sub.schemaDefault !== undefined) {
      // No engine getter for this sub-field; the effective value can't be read,
      // so report the schema-declared default and mark it schema-only.
      value = null;
      defaultValue = sub.schemaDefault;
      state = "schema-only";
    } else {
      value = redact(sub.key, resolveNested(current, sub.getter));
      defaultValue = redact(sub.key, resolveNested(defaults, sub.getter));
      // 检查原始合并配置中该嵌套键是否存在（与顶层字段对齐）；
      // getter 在键缺失时返回默认值，不检查原始键会把未配置项误标 default-explicit
      const rawNestedPresent =
        getPath(globalRaw[nested.key], sub.key) !== undefined ||
        getPath(projectRaw[nested.key], sub.key) !== undefined;
      if (!rawNestedPresent) state = "unset";
      else if (eq(value, defaultValue)) state = "default-explicit";
      else state = "customized";
    }
    nestedRows.push({
      key: `${nested.key}.${sub.key}`,
      label: sub.label,
      desc: `${nested.group} · ${sub.note}`,
      getter: sub.getter,
      value,
      default: defaultValue,
      state,
      whenUnset: sub.whenUnset,
      source: sub.schemaDefault !== undefined ? "schema" : "getter",
    });
  }
}

// omo.jsonc [native] block. Read via the engine's JSONC parser; no scalar
// defaults, so state is unset/customized only.
const NATIVE_FIELDS = [
  { key: "model_profile", label: "模型配置档", desc: "当前激活的模型配置档名称" },
  { key: "model_profiles", label: "模型配置档表", desc: "全部可用模型配置档定义" },
  { key: "categories", label: "分类", desc: "任务分类的模型 fallback 链配置" },
  { key: "agents", label: "代理", desc: "内置代理的模型配置" },
];

// [native] task/memory expanded into comparable sub-field rows. No engine getter
// exists, so defaults come from OMO's own zod schema, read directly from the
// version-matched public source at tag v5.0.1 (task.ts + memory.ts of
// code-yeongyu/oh-my-openagent), which matches the installed omo-ai 5.0.1 bundle.
// A row unconfigured in the user's [native] block runs at the schema default, so
// the effective value shows that default (state unset), mirroring Senpi getters.
// Fields optional with no schema default show — (absent at runtime); the dag block
// is optional as a whole, so its sub-fields show their fallback default as
// reference and — as effective (state 仅声明) until the block is configured.
const NATIVE_NESTED_SETTINGS_FIELDS = [
  { parent: "task", group: "任务", subs: [
    { key: "isolation.enabled", label: "隔离启用", schemaDefault: false, note: "任务写隔离总开关。开启后每个子任务在独立隔离工作区跑、完成再合并回主区，子任务互不污染彼此与主区；关闭则子任务直接写主工作区。想让并行子任务的文件改动互不干扰、或跑高风险改动时开" },
    { key: "isolation.backend", label: "隔离后端", schemaDefault: "auto", note: "隔离区用的写时复制文件系统后端（auto/apfs/btrfs/zfs/reflink/overlayfs/block-clone/rcopy）。auto 按平台固定候选顺序逐个探测、选第一个可用的（Linux：btrfs→zfs→reflink→overlayfs→rcopy，rcopy 为纯复制兜底）；显式值把该后端排到候选最前、其余仍按序兜底。想固定某种 CoW 或自动探测选错时设" },
    { key: "isolation.apply", label: "隔离应用改动", schemaDefault: true, note: "子任务结束后是否把隔离区改动合并回主工作区。true 合并、false 丢弃（只跑不留）。想让子任务只做实验、结果不落主区时设 false" },
    { key: "isolation.merge", label: "隔离合并方式", schemaDefault: "patch", note: "改动合并方式：patch 以补丁应用回主区 | branch 建独立分支保留。想把子任务成果留到单独分支评审时用 branch" },
    { key: "isolation.commits", label: "隔离提交信息", schemaDefault: "generic", note: "隔离合并的提交信息来源：generic 通用信息 | ai 由模型生成描述。想要有意义的提交说明时用 ai" },
    { key: "default_execution_mode", label: "默认执行模式", schemaDefault: "auto", note: "子任务跑在哪：auto 由 daemon 判定（能托管就 process、否则 in-process）| in-process 与父会话同进程 | process 独立进程。想强制进程隔离或强制同进程时显式设" },
    { key: "process_runner", label: "进程运行器", schemaDefault: "host", note: "process 子任务的运行器：host 复用机器级 daemon（省启动开销）| child-process 每个开独立 OS 进程（win32 恒为此）。daemon 有问题或想完全隔离进程时用 child-process" },
    { key: "host_engine_policy", label: "宿主引擎策略", schemaDefault: "upgrade", note: "运行中 daemon 引擎版本与本客户端不一致时：upgrade 把 daemon 升到新版 | fallback 不动 daemon、子任务各自独立进程跑。想避免自动升级共享 daemon 时用 fallback" },
    { key: "host_idle_exit_ms", label: "宿主空闲退出", schemaDefault: null, note: "本客户端启动的 daemon 空闲多久自动退出（毫秒）。设了则 daemon 闲置到点自杀省资源，未配置沿用启动规格。想让闲置 daemon 更快释放时设" },
    { key: "default_concurrency", label: "默认并发", schemaDefault: 5, note: "未给具体 category 限额时每类默认可并行的子任务数。调大同类任务更并行更快也更吃资源，调小更省。默认 5，按机器负载调" },
    { key: "global_concurrency", label: "全局并发", schemaDefault: RESOLVED_GLOBAL_CONCURRENCY, note: `跨所有分类同时并行的子任务总上限。调大整体更并行但更吃 CPU/内存，0 表示不限；未配置时按 max(8,2×并行度) 自适应（本机并行度 ${PAR}→${RESOLVED_GLOBAL_CONCURRENCY}）。资源紧张就显式调小` },
    { key: "provider_concurrency", label: "按提供方并发", schemaDefault: null, note: "按提供方 ID 单独限并发（provider→数字）。给某 provider 限流以避开其速率限制时设，未配置则不针对 provider 限" },
    { key: "model_concurrency", label: "按模型并发", schemaDefault: null, note: "按模型 ID 单独限并发（model→数字）。给贵/慢的模型限流时设，未配置则不针对模型限" },
    { key: "max_depth", label: "最大深度", schemaDefault: 1, note: "子任务再派生子任务的最大嵌套深度。默认 1（子任务不能再开子任务）；调大允许多层任务树但可能扩散失控。需要多层编排时才调大" },
    { key: "residency_max_children", label: "常驻子任务上限", schemaDefault: RESOLVED_RESIDENCY, note: `常驻代理最多同时留驻多少个完整子会话在内存。留驻多则复用快但吃内存，0 表示全放行；未配置时按 min(16,max(8,2×并行度)) 自适应（本机→${RESOLVED_RESIDENCY}）。内存紧张就调小` },
    { key: "resident_idle_timeout_ms", label: "常驻空闲超时", schemaDefault: 900000, note: "常驻代理空闲多久后被回收（毫秒），900000=15 分钟。调大代理留驻更久、复用更多但占内存久，调小更快释放。频繁复用同一代理时调大" },
    { key: "ttl_ms", label: "任务存活时长", schemaDefault: 86400000, note: "任务记录在存储里保留多久（毫秒），86400000=24 小时，到期清理。想留久便于回溯就调大，想省空间就调小" },
    { key: "state_dir", label: "状态目录", schemaDefault: null, note: "任务状态（run 记录等）的存储目录。想把状态放到指定位置（如快盘）时设，未配置用默认位置" },
    { key: "reattach_on_reconcile", label: "重连时重挂载", schemaDefault: null, note: "会话重连对账时是否重新挂载已存在的子任务。true 重挂、false 不挂，未配置用引擎默认。子任务重连行为异常时调" },
    { key: "resume_children", label: "恢复子任务", schemaDefault: true, note: "会话重连/reconcile 时是否恢复未完成子任务继续跑。true 续跑、false 丢弃未完成子任务。不想重连后自动续跑旧子任务时设 false" },
    { key: "warnings.unavailable_categories", label: "警告·不可用分类", schemaDefault: true, note: "请求的任务分类不可用时是否打印告警。true 告警提示、false 静默。嫌告警吵可设 false，但会丢失分类不可用的提示" },
    { key: "wait.min_ms", label: "等待最小值", schemaDefault: 5000, note: "task_wait 工具允许的最小等待时长（毫秒），地板值防止等待过短空转。想允许更短等待时调小" },
    { key: "wait.default_ms", label: "等待默认值", schemaDefault: 60000, note: "task_wait 未指定时长时的默认等待（毫秒）=60 秒。子任务通常跑更久就调大，让默认等待更贴合" },
    { key: "wait.max_ms", label: "等待最大值", schemaDefault: 600000, note: "task_wait 允许的最大等待（毫秒）=10 分钟，天花板防止无限等待。需要等更久的长任务时调大" },
    { key: "team.max_members", label: "团队最大成员", schemaDefault: 8, note: "一个 team 最多成员（子代理）数（1..8），上限控制单团队规模。想限制团队大小时调小" },
    { key: "team.max_parallel_members", label: "团队最大并行成员", schemaDefault: 4, note: "team 内同时并行运行的成员数（1..8）。调大团队更并行更快更吃资源。默认 4，按负载调" },
    { key: "team.max_wall_clock_minutes", label: "团队墙钟上限", schemaDefault: 120, note: "一个 team 运行的墙钟时间上限（分钟）=2 小时，超时终止防止无限跑。长任务团队才调大" },
    { key: "dag.max_nodes_per_run", label: "DAG·每次运行最大节点", schemaDefault: 64, blockOptional: true, note: "单次 DAG 编排运行的最大节点数，上限防止一次展开过大。跑大型 DAG 工作流时调大（需先配置 task.dag 块，否则此块不启用）" },
    { key: "dag.max_runs_per_session", label: "DAG·每会话最大运行", schemaDefault: 16, blockOptional: true, note: "每会话允许的最大 DAG 运行次数，上限。频繁跑 DAG 时调大（dag 块启用后生效）" },
    { key: "dag.subscriber_ring", label: "DAG·订阅环缓冲", schemaDefault: 1000, blockOptional: true, note: "DAG 事件订阅环形缓冲容量，满了丢旧事件。事件多、观察者消费慢时调大（dag 块启用后生效）" },
    { key: "dag.heartbeat_ms", label: "DAG·心跳间隔", schemaDefault: 15000, blockOptional: true, note: "DAG 节点心跳间隔（毫秒）=15 秒。调小更快察觉卡住节点但更吵、调大更省。诊断 DAG 卡顿时调小（dag 块启用后生效）" },
    { key: "dag.history_default_limit", label: "DAG·历史默认上限", schemaDefault: 256, blockOptional: true, note: "DAG 历史查询默认返回条数。想默认看更多历史时调大（dag 块启用后生效）" },
    { key: "dag.history_max_limit", label: "DAG·历史最大上限", schemaDefault: 1000, blockOptional: true, note: "DAG 历史查询可请求的最大条数，天花板。需要拉更多历史时调大（dag 块启用后生效）" },
    { key: "dag.retention_days", label: "DAG·保留天数", schemaDefault: 7, blockOptional: true, note: "DAG 运行记录保留天数，到期清理。想留久回溯就调大（dag 块启用后生效）" },
    { key: "dag.max_prompt_bytes", label: "DAG·最大提示字节", schemaDefault: 262144, blockOptional: true, note: "DAG 单节点提示最大字节数=256KB，超限拒绝防超大提示。节点提示很大时调大（dag 块启用后生效）" },
  ] },
  { parent: "memory", group: "记忆", subs: [
    { key: "enabled", label: "记忆总开关", schemaDefault: true, note: "记忆系统总开关。开启后 agent 跨会话沉淀与召回记忆（下列反思/事实/召回等子功能才生效）；关闭则完全不记不召回、每次从零开始。不想让历史记忆影响当前工作、或调试想要干净上下文时关" },
    { key: "agent", label: "记忆代理", schemaDefault: "auto", note: "记忆读写用哪个 agent 执行，auto 自动选合适的。想固定用某个 agent 处理记忆时设" },
    { key: "reflection.enabled", label: "反思启用", schemaDefault: true, note: "反思子功能开关。开启后 agent 会话中定期回顾对话、把要点沉淀进记忆；关闭则不主动反思。不想要自动沉淀、或嫌反思打断时关" },
    { key: "reflection.trigger.step_count", label: "反思步数触发", schemaDefault: 25, note: "累计多少步触发一次反思，默认 25，设 0 关闭步数触发。调小反思更频繁（记得更细但更耗）、调大更省。想让记忆更细就调小" },
    { key: "reflection.trigger.on_compaction", label: "压缩时反思", schemaDefault: true, note: "上下文压缩时是否顺带触发一次反思。true 在压缩点抢救要点进记忆、false 不触发。担心压缩丢信息就保持 true" },
    { key: "reflection.merge", label: "反思合并模式", schemaDefault: "auto", note: "反思产出如何并入已有记忆：auto 自动 | integration 深度整合。想要更彻底的记忆整合时用 integration" },
    { key: "reflection.sandbox", label: "反思沙箱", schemaDefault: "auto", note: "反思任务的沙箱运行策略，auto 自动。想强制反思在隔离环境跑时显式设" },
    { key: "reflection.timeout_minutes", label: "反思超时", schemaDefault: 15, note: "单次反思最长跑多少分钟，默认 15。反思复杂常超时就调大、想快速收敛就调小" },
    { key: "reflection.category", label: "反思模型分类", schemaDefault: "quick", note: "反思用哪类模型（quick 快 / deep 深）。想让反思用更强模型（更准更贵）时改 deep" },
    { key: "nudge.enabled", label: "提醒启用", schemaDefault: true, note: "提醒子功能开关。开启后每隔若干轮提示 agent 该写记忆；关闭则不提醒。嫌提醒吵就关" },
    { key: "nudge.every_user_turns", label: "提醒轮次间隔", schemaDefault: 10, note: "每多少个用户轮次提醒一次写记忆，默认 10。想更频繁被提醒就调小" },
    { key: "facts.enabled", label: "事实抽取启用", schemaDefault: true, note: "事实抽取子功能开关。开启后自动从对话抽取事实存档；关闭则不抽。不想自动抽事实时关" },
    { key: "facts.debounce_settles", label: "事实抽取防抖", schemaDefault: 4, note: "连续多少次稳定后才做一次事实抽取（防抖），默认 4。调大更少抽取更省、调小更及时。对话变化快想及时记就调小" },
    { key: "dream.enabled", label: "做梦启用", schemaDefault: true, note: "做梦子功能开关。开启后空闲时后台整合、归并零散记忆；关闭则不整合。不想要后台整合开销时关" },
    { key: "dream.idle_minutes", label: "做梦空闲触发", schemaDefault: 30, note: "空闲多少分钟后触发做梦，默认 30。想更快整合就调小、想少打扰就调大" },
    { key: "dream.min_hours_between", label: "做梦最小间隔", schemaDefault: 24, note: "两次做梦至少间隔多少小时，默认 24，防止频繁整合。想更频繁整合就调小" },
    { key: "dream.auto_select_max", label: "做梦自动选取上限", schemaDefault: 5, note: "做梦自动选取参与整合的记忆条数上限，默认 5。调大一次整合更多更耗。想更全面整合就调大" },
    { key: "dream.shutdown_launch", label: "关闭时做梦", schemaDefault: true, note: "会话关闭时是否补跑一次做梦整合。true 关闭前整合当次记忆、false 不跑。想确保关会话前记忆落定就保持 true" },
    { key: "dream.auto_select_max_chars", label: "做梦选取字符上限", schemaDefault: 150000, note: "做梦自动选取内容的总字符上限，默认 150000，天花板防止一次喂入过多。大记忆库想整合更多就调大" },
    { key: "people.enabled", label: "人物档案启用", schemaDefault: true, note: "人物档案子功能开关。开启后记录交互对象（人/agent）信息；关闭则不记。不需要人物记忆时关" },
    { key: "people.max_entries", label: "人物档案条数上限", schemaDefault: 40, note: "最多保留多少条人物档案，默认 40，到上限淘汰旧的。想记更多人就调大" },
    { key: "people.max_entry_chars", label: "人物档案单条上限", schemaDefault: 200, note: "单条人物档案最大字符数，默认 200。想给每人记更详细就调大" },
    { key: "soul.edit_notice", label: "灵魂编辑通知", schemaDefault: true, note: "灵魂档案（soul，长期人格/偏好）被编辑时是否通知你（此项无 enabled 开关）。true 提示 soul 变更、false 静默。想知道 soul 何时被改就保持 true" },
    { key: "write_notice.enabled", label: "写记忆提示", schemaDefault: true, note: "写记忆时是否在工具结果里给提示。true 让你看到「刚写了记忆」、false 静默写。想后台静默写就关" },
    { key: "sync.enabled", label: "记忆同步", schemaDefault: true, note: "记忆仓库的 git 同步开关。开启后记忆改动 git 同步（可跨机/备份）；关闭则只留本地。不想 git 同步记忆时关" },
    { key: "search.enabled", label: "记忆检索", schemaDefault: true, note: "记忆检索子功能开关。开启后 agent 能主动检索记忆库找相关条目；关闭则不检索。不想让检索影响当前会话、或想省检索开销时关" },
    { key: "recall.enabled", label: "召回启用", schemaDefault: true, note: "召回子功能开关。开启后按需把相关历史记忆自动注入当前上下文；关闭则不注入。不想让历史记忆进当前上下文时关" },
    { key: "recall.max_items", label: "召回条数上限", schemaDefault: 2, note: "单次召回最多注入几条记忆（取值 1..5），默认 2。调大注入更多历史（更全但更占上下文）。想让 agent 记得更多就调大" },
    { key: "recall.category", label: "召回模型分类", schemaDefault: "quick", note: "召回用哪类模型判定相关性，默认 quick。想更准的召回（更贵）就改 deep" },
    { key: "recall.sidecar_max_tokens", label: "召回旁路 token 上限", schemaDefault: 48000, note: "召回旁路上下文的 token 上限，默认 48000，天花板控制召回注入规模。想召回更多内容就调大" },
    { key: "recall.tool_budget", label: "召回工具预算", schemaDefault: 8, note: "单次召回可用的工具调用预算，默认 8。调大让召回能做更多检索动作、更耗。召回质量不够时调大" },
    { key: "recall.max_concurrent_wakes", label: "召回并发唤醒", schemaDefault: 2, note: "召回并发唤醒的记忆 worker 数，默认 2。调大召回更快更并行更吃资源。想加速召回就调大" },
    { key: "recall.event_caps.tool_args", label: "召回上限·工具参数", schemaDefault: 400, note: "召回注入时单条工具参数保留的字符上限，默认 400，超出截断以控注入体积。想保留更完整工具参数就调大" },
    { key: "recall.event_caps.result_head", label: "召回上限·结果头", schemaDefault: 600, note: "召回注入时工具结果头部保留的字符上限，默认 600。想保留更多结果内容就调大" },
    { key: "recall.event_caps.assistant", label: "召回上限·助手消息", schemaDefault: 1500, note: "召回注入时助手消息保留的字符上限，默认 1500。想保留更完整助手回复就调大" },
    { key: "recall.event_caps.prompt", label: "召回上限·提示", schemaDefault: 4000, note: "召回注入时用户提示保留的字符上限，默认 4000。想保留更完整用户提示就调大" },
    { key: "compile_warn_tokens", label: "记忆编译告警阈值", schemaDefault: 30000, note: "编译后记忆总量超过多少 token 就告警，默认 30000，提醒记忆膨胀。记忆库大想早点被提醒就调小" },
    { key: "agents", label: "按代理覆盖", schemaDefault: {}, note: "按 agent 名覆盖上述记忆设置（agent→部分设置），默认空 {}（无覆盖）。想让某个 agent 用不同记忆参数时在此配" },
  ] },
];

function getPath(obj, path) {
  return path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

function resolveOmoJsonc() {
  const jsonc = join(OMO_HOME, "omo.jsonc");
  if (existsSync(jsonc)) return jsonc;
  const json = join(OMO_HOME, "omo.json");
  if (existsSync(json)) return json;
  return undefined;
}

import { readFileSync } from "node:fs";
const omoJsoncPath = resolveOmoJsonc();
let nativeBlock = {};
if (omoJsoncPath) {
  const parsed = parseSettingsJson(readFileSync(omoJsoncPath, "utf8"));
  nativeBlock = parsed?.["[native]"] ?? parsed?.["[senpi]"] ?? {};
}

const nativeRows = NATIVE_FIELDS.map((field) => {
  const value = nativeBlock[field.key];
  return {
    key: field.key,
    label: field.label,
    desc: field.desc,
    value: value !== undefined ? value : null,
    default: null,
    state: value !== undefined ? "customized" : "unset",
    source: "omo.jsonc[native]",
  };
});

// Build the [native] sub-field rows. When the user hasn't set a key, the schema
// fills its default at parse time, so the effective value shows that default
// (state unset), mirroring Senpi getters. An explicit value equal to the default
// reads default-explicit, a different one customized. dag sub-fields are
// blockOptional: they only take schema defaults once the task.dag block exists;
// with the block absent the sub-field is inactive, so it shows — (state 仅声明).
const nativeNestedRows = [];
for (const grp of NATIVE_NESTED_SETTINGS_FIELDS) {
  const parentBlock = nativeBlock[grp.parent];
  for (const sub of grp.subs) {
    const raw = getPath(parentBlock, sub.key);
    const isSet = raw !== undefined;
    const containerPresent = sub.blockOptional ? parentBlock?.dag !== undefined : true;
    let value;
    let state;
    if (isSet) {
      value = raw;
      state = eq(raw, sub.schemaDefault) ? "default-explicit" : "customized";
    } else if (sub.blockOptional && !containerPresent) {
      value = null;
      state = "schema-only";
    } else {
      value = sub.schemaDefault;
      state = "unset";
    }
    nativeNestedRows.push({
      key: `${grp.parent}.${sub.key}`,
      label: sub.label,
      desc: `${grp.group} · ${sub.note}`,
      value: value ?? null,
      default: sub.schemaDefault,
      state,
      source: isSet ? "omo.jsonc[native]" : "omo-schema-default",
    });
  }
}

// Completeness check: diff SETTINGS_FIELDS against the authoritative top-level
// keys of the `Settings` interface in the installed engine. A Senpi upgrade that
// adds or renames a key surfaces here instead of silently dropping out of the
// report. This is schema-driven, not disk-driven: unset keys are still checked.
function schemaSettingsKeys(src) {
  const dts = readFileSync(join(src, "core/settings-manager.d.ts"), "utf8");
  const m = dts.match(/interface Settings\s*(extends [^{]+)?\{/);
  if (!m) throw new Error("Cannot locate `interface Settings` in settings-manager.d.ts");
  const start = dts.indexOf("{", m.index);
  let depth = 0;
  let end = start;
  for (let j = start; j < dts.length; j++) {
    if (dts[j] === "{") depth++;
    else if (dts[j] === "}") {
      depth--;
      if (depth === 0) {
        end = j;
        break;
      }
    }
  }
  // Strip nested braces/parens/brackets so only top-level members remain.
  let d = 0;
  let buf = "";
  for (const ch of dts.slice(start + 1, end)) {
    if (ch === "{" || ch === "(" || ch === "[") d++;
    else if (ch === "}" || ch === ")" || ch === "]") d--;
    else if (d === 0) buf += ch;
  }
  const keys = [];
  for (const line of buf.split(/\n|;/)) {
    const mm = line.match(/^\s*(?:readonly\s+)?["']?([a-zA-Z_][a-zA-Z0-9_]*)["']?\??\s*:/);
    if (mm) keys.push(mm[1]);
  }
  return keys;
}

// Nested-object settings are represented by their sub-field rows, not a parent
// row in SETTINGS_FIELDS, so count their top-level key as covered for parity.
const mapped = new Set([
  ...SETTINGS_FIELDS.map((f) => f.key),
  ...NESTED_SETTINGS_FIELDS.map((n) => n.key),
]);
const schemaKeys = schemaSettingsKeys(SRC);
const missingFromTable = schemaKeys.filter((k) => !mapped.has(k)).sort();
const extraInTable = [...mapped].filter((k) => !schemaKeys.includes(k)).sort();

const all = [...rows, ...nestedRows, ...nativeRows, ...nativeNestedRows];

// Structural completeness gate: every enumerated field carries a label and a
// non-empty desc. Format floor only — it cannot judge whether the desc's
// meaning/behavior/use-case is accurate; that stays a source-grounded authoring
// duty, verified per field against getter impl / consumption point / schema.
const descGaps = all.filter((r) => !r.label || !r.desc || String(r.desc).trim() === "");
const out = {
  generatedAt: new Date().toISOString(),
  senpiSrc: SRC,
  settingsSources: current.getSelectedSettingsSources?.() ?? [],
  omoJsoncSource: omoJsoncPath ?? null,
  senpi: { count: rows.length + nestedRows.length, fields: [...rows, ...nestedRows] },
  senpiNested: { count: nestedRows.length, fields: nestedRows },
  native: { count: nativeRows.length + nativeNestedRows.length, fields: [...nativeRows, ...nativeNestedRows] },
  nativeNested: { count: nativeNestedRows.length, fields: nativeNestedRows },
  schemaParity: {
    schemaKeyCount: schemaKeys.length,
    mappedKeyCount: mapped.size,
    missingFromTable,
    extraInTable,
  },
  counts: {
    total: all.length,
    unset: all.filter((r) => r.state === "unset").length,
    defaultExplicit: all.filter((r) => r.state === "default-explicit").length,
    customized: all.filter((r) => r.state === "customized").length,
    schemaMissing: missingFromTable.length,
    schemaExtra: extraInTable.length,
    descGaps: descGaps.length,
  },
};

// Fail-fast BEFORE writing so a missing explanation never leaves a stale snapshot.
if (descGaps.length) {
  console.error(
    `dump aborted: ${descGaps.length} field(s) missing label/desc — every enumerated setting must carry an explanation: ${descGaps.map((r) => r.key).join(", ")}`
  );
  process.exit(1);
}

const outPath = process.argv[2] ?? join(import.meta.dir, "../cache/settings.json");
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log(
  `wrote ${outPath}: total=${out.counts.total} unset=${out.counts.unset} defaultExplicit=${out.counts.defaultExplicit} customized=${out.counts.customized} schemaMissing=${out.counts.schemaMissing} schemaExtra=${out.counts.schemaExtra}`
);
if (missingFromTable.length) {
  console.warn(
    `WARNING: ${missingFromTable.length} Settings key(s) missing from SETTINGS_FIELDS — add them so they get explained: ${missingFromTable.join(", ")}`
  );
}
if (extraInTable.length) {
  console.warn(
    `WARNING: ${extraInTable.length} SETTINGS_FIELDS key(s) absent from the Settings interface — likely renamed/removed upstream: ${extraInTable.join(", ")}`
  );
}
