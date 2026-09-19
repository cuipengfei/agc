# OMP `providers.judgmentProvider` 合法值窄核验报告

> Source: 本会话取证（直读本机 @oh-my-pi/pi-coding-agent 18.2.5 安装包源码与 schema/CHANGELOG，只读）
> Collected: 2026-09-19
> Published: Unknown

- 日期：2026-09-19。直读本机安装 `@oh-my-pi/pi-coding-agent` **18.2.5** 的 schema / types / 源码 / CHANGELOG（`~/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent/`）。只读，未运行 OMP、未改任何配置。
- 一句话结论：**合法值恰好 3 个 —— `auto`（默认）、`typesafe`、`llm`。没有 `none`/`off`/`local`/`openai` 或任何其他值。** 非法值不报错、不告警，静默按 `auto` 同等逻辑处理（见 §5）。

---

## 1. 证据（一手，全部本地直读）

| 证据 | 位置 | 内容 |
|---|---|---|
| schema 定义 | `src/config/settings-schema.ts:5635-5658` | `type: "enum"`, `values: ["auto","typesafe","llm"] as const`, `default: "auto"`；UI 归属 tab=providers / group="Tiny Model"，三个选项各带官方描述 |
| types 声明 | `types/config/settings-schema.d.ts:6071-6074` | 同上（`readonly values: readonly ["auto","typesafe","llm"]`, `default: "auto"`） |
| 选择逻辑 | `src/judgment/index.ts:80-84`（`usesTypeSafeJudge`）、`:91-125`（`resolveJudge`） | 见 §3 |
| fallback 链 | `src/judgment/index.ts:175-249`（`OnlineChatJudge`）、`:127-135`（`resolveLlmJudge`） | 见 §4 |
| 发布记录 | `CHANGELOG.md:41`（[18.2.4]） | "configure `providers.judgmentProvider` as `auto`, `typesafe`, or `llm` to select the judgment backend" |
| 模块头注释 | `src/judgment/index.ts:1-15` | Backend precedence 三段式说明 |

## 2. 全部合法值与官方语义

| 值 | 是否默认 | 官方描述（schema UI 原文翻译） |
|---|---|---|
| `auto` | **是**（缺省即此值） | "TypeSafe when authenticated, else the LLM bridge (default)"——已认证 TypeSafe 走 TypeSafe，否则走 LLM 桥 |
| `typesafe` | 否 | "Prefer TypeSafe; fall back through the online model roles on failure"——优先 TypeSafe，失败沿 online 模型 role 链回退 |
| `llm` | 否 | "Never TypeSafe; keyword prompts to the tiny/smol or local model"——永不走 TypeSafe |

schema 级 description（settings-schema.ts:5643-5644）补一句："Auto uses TypeSafe when authenticated; failed TypeSafe requests fall back through tiny, smol, default, then the active session model."

**不存在**的值（逐一确认）：`none`、`off`、`local`、`openai`、`disabled`、`chat`、`session`。`values` 数组是 closed 的 3 元素 `as const`，types 声明同步；CHANGELOG 也只列三者。注意区分：OMP 其他设置里确实存在 `none`/`off` 类枚举（如 `features.unexpectedStopDetection: none|mechanical|smart`、`personality: ...|none`），但那是别的设置，不属于本键。

## 3. 选择逻辑（`usesTypeSafeJudge` + `resolveJudge`，源码直译）

```
mode = settings.get("providers.judgmentProvider")   # 未配置时 = "auto"
if mode == "llm" → 不走 TypeSafe，直接 resolveLlmJudge()
否则 → mode == "typesafe" 或 AuthStorage 存有 typesafe 凭据（/login typesafe 或 TYPESAFE_API_KEY）
       → 包一层 TypeSafeJudge 在前、OnlineChatJudge 在后的复合 judge
```

要点（resolveJudge, index.ts:91-125）：
- TypeSafe 调用失败（网络错误、重试后仍 5xx、key 被拒）→ **总是**回退到 online role 链，**绝不**回退到 feature 自己的 local-model override。
- 仅 caller abort 直接上抛，不吞。
- key 来自 `authStorage.resolver(TYPESAFE_PROVIDER)`，即 `/login typesafe` 与 `TYPESAFE_API_KEY` 两条路都汇入同一 resolver。

## 4. 行为矩阵：key 有/无 × 三值

| 配置值 | 有 TypeSafe 凭据 | 无 TypeSafe 凭据 |
|---|---|---|
| `auto`（默认） | TypeSafe 优先，失败回退 online 链 | 直接走 LLM 桥（local 或 online，见下） |
| `typesafe` | TypeSafe 优先，失败回退 online 链 | 仍先尝试 TypeSafe（无 key 首次调用即失败）→ 每次判定多一次失败开销 → 回退 online 链。**功能可用但浪费，不建议无 key 时写** |
| `llm` | 不走 TypeSafe（key 被无视） | 不走 TypeSafe |

**LLM 桥内部**（`resolveLlmJudge` + `OnlineChatJudge`）：
- feature 的 backend 指到本地 tiny-model key → `LocalJudge`（on-device tiny worker，keyword 提示词，`LOCAL_ANSWER_MAX_TOKENS=16`，reasoning 模型给 1024）。
- backend = online（`ONLINE_MEMORY_MODEL_KEY`）→ `OnlineChatJudge` 依次尝试：`tiny` → `smol` → `default`（`collectOnlineTinyCandidates(["tiny","smol","default"], {tryAllRoles: true})`，每个 role 自带自己的 retry-fallback candidates），**最后追加当前会话模型**（若不在候选中）。规则：
  - 某 candidate 无 API key → 记 lastError，跳过下一个；
  - 凭据/provider 失败 → 下一个；caller abort / TimeoutError → 直接抛；
  - 全部失败 → 抛 `judgment: every tiny/smol candidate failed: ...`；一个候选都没有 → 抛 `judgment: no tiny/smol/default model available`。

即完整 fallback chain：**TypeSafe（含 429/5xx retry-after 退避、401/403 key 轮换，pi-ai `judgment/typesafe.ts`）→ tiny → smol → default → 会话当前模型**。

## 5. 非法值实测行为（源码级，非猜测）

- `Settings.get`（settings.ts:699-709）**不做 enum 校验**：config.yml 里的值原样返回，仅在 `undefined` 时取 schema 默认 `"auto"`。
- 配置加载路径（settings.ts 全量 grep）**对 enum 值无校验、无告警**（仅 statusLine 段、project-shadow 等有专门告警，本键没有）。
- 因此写 `judgmentProvider: none`（或任何非 `llm`/`typesafe` 的字符串）→ `usesTypeSafeJudge` 两个特判都不中 → 落到 `mode == "typesafe" || hasAuth(...)` → **行为与 `auto` 完全一致**：有 key 走 TypeSafe，无 key 走 LLM 桥。不报错、不告警。
- `/settings` TUI 只渲染 schema 的三个 option（settings-ui.ts 走 `enumValues`），UI 渠道无法写入非法值；风险只在手改 YAML。

结论：**不要写 `none`/`off` 之类——它们不是合法值，只是碰巧静默等价 `auto`。** 想"关掉 TypeSafe"的正确写法是 `llm`。

## 6. 准确 YAML 示例（`~/.omp/agent/config.yml`）

```yaml
# 缺省行为：不写 providers.judgmentProvider 即等于 auto。
# 有 TYPESAFE_API_KEY（或 /login typesafe）→ TypeSafe；无 → LLM 桥。
providers:
  judgmentProvider: auto
```

```yaml
# 强制 TypeSafe 优先（需先 /login typesafe 或 export TYPESAFE_API_KEY）。
# 失败自动回退 tiny → smol → default → 会话模型。
providers:
  judgmentProvider: typesafe
```

```yaml
# 永不使用 TypeSafe，判定全走 tiny/smol/local 链（key 存在也被无视）。
# 适用于：不想为判定调用花 TypeSafe 配额，或 key 只有 chat 额度。
providers:
  judgmentProvider: llm
```

可选配套环境变量（`docs/environment-variables.md` §TypeSafe judgments，upstream 已核）：`TYPESAFE_API_KEY`、`TYPESAFE_BASE_URL`（默认 `https://api.typesafe.ai`）、`TYPESAFE_DEFAULT_MODEL`（默认 `jev-latest`）。

## 7. Karpathy 证据小结
1. **Think Before Coding**："还有哪些值"按 closed enum 处理并逐一列出排除项（none/off/local/openai），区分了其他设置里的同名枚举值，不凭前报告转述。
2. **Read Before Writing**：结论全部来自本机 18.2.5 安装包 schema 源码、`.d.ts`、判定实现与 CHANGELOG 直读；upstream 文档仅作旁证。
3. **Surgical Changes**：只核验本键，未扩展到无关设置；报告即交付物，未动任何安装文件。
4. **Verify with Evidence**：§5 的"无校验"断言覆盖 `Settings.get` 与加载路径两条代码路径的 grep 证据；`typesafe`-无-key 的开销行为标注为源码推断（resolveJudge 构造即失败→回退），未实测运行。
