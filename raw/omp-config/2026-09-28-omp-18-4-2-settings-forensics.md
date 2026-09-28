# OMP 18.4.2 设置键源码取证（8 键）与 18.4.1→18.4.2 键集合 diff

> Source: 本机 OMP 18.4.2 源码（`~/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent/src/`）、omp-configs skill dump 输出、OpenAI 官方定价页
> Collected: 2026-09-28
> Published: Unknown

## dump 统计（omp-configs skill，agentDir=/home/cpf/.omp/agent）

`dump-settings.mjs` 输出（cache/settings.json，gitignored）counts：

```json
{"total": 515, "effectiveDefault": 418, "customized": 97, "credentials": 8}
```

（18.4.1 时期快照为 512 键；18.4.2 dump 在 2026-09-28 生成，515 键，其中 customized 97 含当日用户改的 `display.collapseCompacted: false`、`compaction.idleTimeoutSeconds: 900`、`mnemopi.scoping: per-project-tagged` 三键。）

`report-gaps.mjs --old settings-prev.json settings.json`（18.4.1→18.4.2）输出：

```json
{"newVersion": "18.4.2", "previousVersion": "18.4.1", "versionBumped": true,
 "counts": {"freshKeys": 515, "baselineKeys": 515, "added": 0, "removed": 0,
            "fingerprintChanged": 0, "needsReviewOnVersionBump": 0}}
```

## 键取证（源码摘录）

### providers.cacheWarming（session/settings.ts:1120-1143；session/cache-warmer.ts:40-56）

枚举 `["off","streaming","idle"]`，默认 `idle`。描述："Re-send the last request with a one-token output budget shortly before its prompt-cache entry expires"。cache-warmer.ts 常量：

```ts
const MAX_WARMING_AGE_MS = 60 * 60_000;          // streaming 续期窗口 60 分钟
const MAX_IDLE_WARMING_AGE_MS = 30 * 60_000;     // idle 续期窗口 30 分钟
const CACHE_WARMING_MINIMUM_EXPECTED_SAVINGS = 0.05;  // 预期节省至少 $0.05 才发续期
const IDLE_CONTINUATION_PROBABILITY = 0.15;
// 注释：Chance that a real request arrives before the cache entry expires while the
// agent sits idle. Measured from upstream usage over 5-minute entries
```

判定式：`expectedSavings = 续用概率 × (缓存失效重付价 − 缓存命中价) − 续期成本 ≥ $0.05`。idle 档续用概率取 0.15；streaming 档在长工具执行期间按 1 计。

### display.collapseCompacted（session/session-context.ts:151-158）

`BuildSessionContextOptions` 注释原文："Build the display transcript instead of the LLM context. By default this preserves every path entry with compactions inline; set `collapseCompactedHistory` for the live TUI surface to render only the latest compacted tail." 即只影响 TUI 展示构建路径。

### checkpoint.enabled（tools/index.ts:772-776；tools/checkpoint.ts:57；prompts/tools/checkpoint.md）

tools/index.ts 按 `checkpoint.enabled` 门控 `checkpoint`/`rewind` 两个 agent 工具的注册；子代理默认禁用（需在 agent-definition `tools:` frontmatter 显式列出）。tools/checkpoint.ts:57 的自描述字符串写 "Create a git-based checkpoint to save and restore session state"，但 prompts/tools/checkpoint.md 的行为定义是 LLM 上下文管理：探索性工作前 `checkpoint(goal)`，结束后 `rewind(report)`，"After `rewind`: intermediate checkpoint messages removed from active context; replaced by report." 两者表述不一致；源码中未见 git 工作树操作。

双击 Escape 与会话树属 TUI 导航（modes/controllers/input-controller.ts:533-541：`showUserMessageSelector` / `showTreeSelector`），不经 checkpoint 工具。

### omitThinking vs hideThinkingBlock（session/settings.ts:234-245、210；input-controller.ts:2482-2492）

`omitThinking` 是请求级：让上游 provider 在响应中不返回思维摘要（支持时）。`hideThinkingBlock` 是本地显示开关：思维照常产生与返回，TUI 不渲染。

### showHardwareCursor（modes/settings.ts:652-661）

默认 true，描述 "Show terminal cursor for IME support"。旁证：stt/push-to-talk.ts:32-34 与 live-command-controller.ts:205-207 在语音输入与 live 命令模式临时关闭再恢复。

### python.interpreter（eval/settings.ts:104-110）

`type: "string", default: ""`。空串即默认形态，表示走自动 Python 运行时探测。

### 会话名称颜色（pi-tui/src/theme/session-color.ts:100-259）

`getSessionAccentHex`：会话名 hash 取色相弧位置；深色主题从全色相环取但排除 OKLCH gamut cusp 明度超过 DARK_MAX_LIGHTNESS 的色相（注释点名排除黄/黄绿芯 ≈94-138° 与过亮青峰 ≈158-200°），浅色主题固定 195-330° 冷色带；与主题主要颜色色相碰撞时由 findSafeHue 沿弧移开；明度彩度继承主题 accent，按 OKLCH cusp 归一化；深色钳制明度，浅色二分查找压到 WCAG AA 对比度。消费点：编辑器边框（interactive-mode.ts:3147）、状态栏会话段（segments.ts:43）。

## OpenAI 缓存价格（developers.openai.com pricing 与 prompt-caching 文档，2026-09-28 检索）

| 模型 | 输入 $/M | 缓存读 $/M | 缓存写 |
|---|---|---|---|
| GPT-5.6 Sol | 4.00 | 0.40 | 1.25× 输入 |
| GPT-6 Astra | 10.00 | 1.00 | 1.25× 输入 |

缓存写按 1.25× 输入价；GPT-5.6 默认 TTL 约 30 分钟。

按 OMP 判定式代入官方价（推断计算，非 OMP 实测）：idle 档触发所需前缀规模 GPT-5.6 Sol 约 172K tokens、GPT-6 Astra 约 69K tokens；streaming 档分别约 12K 与 5K。
