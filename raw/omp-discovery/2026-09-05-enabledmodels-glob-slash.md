# OMP enabledModels glob 与带斜杠 model id 的实测证据

- Source URL: 本机会话实测（dist 源码取证 + Bun.Glob 决定性实验 + 真实 API 往返）
- Collected: 2026-09-05
- Published: 2026-09-05（实验当日）

## 背景

OMP 自定义 provider `tokenrouter`，model id 为 `z-ai/glm-5.3-free`（TokenRouter 命名为 vendor/model 两段，id 自带斜杠）。
配置 `~/.omp/agent/config.yml` 的 `enabledModels` 写 `- tokenrouter/*` 时，TUI 模型选择器里看不到该模型；CLI `omp models tokenrouter` 一直可见。

## 证据 1：dist 源码——enabledModels 的 glob 匹配链

文件：`/home/cpf/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent/dist/cli.js`（omp v18.1.10）

TUI 侧调用链：`vH() → qIs() → EIs() → gAe()`。

`qIs` 对含 `*`/`?`/`[` 的 pattern 走 glob 分支（摘录）：

```js
for(let i of t){if(i.includes("*")||i.includes("?")||i.includes("[")){for(let l of EIs(i,e).models)r(l);continue}...}
```

`gAe` 是实际匹配器（摘录）：

```js
function gAe(e,t){let s=new Bun.Glob(e.toLowerCase());return t.filter((n)=>{let o=`${n.provider}/${n.id}`;return s.match(o.toLowerCase())||s.match(n.id.toLowerCase())})}
```

即：pattern 小写后构造 `Bun.Glob`，对每个模型先试 `provider/id` 整串匹配，再试裸 `id` 匹配。

`vH` 先取 `getAvailable()`，再按 `enabledModels` 过滤（摘录）：

```js
async function vH(e,t,s){let n=e.getAvailable(),o=t?.get("enabledModels");if(!o||o.length===0)return n;let r=await Ine(o,e,s,t);if(r.length===0)return[];return PIs(n,r.map((i)=>i.model))}
```

TUI 无可用模型时的报错文案（摘录，说明 enabledModels 是 TUI 可见性的过滤层）：

```text
No model available matching enabledModels (${Be.join(", ")}) with usable credentials. Configure auth for an allowed provider or adjust enabledModels.
```

## 证据 2：Bun.Glob 决定性实验（bun 直接运行，2026-09-05）

```text
tokenrouter/* vs tokenrouter/z-ai/glm-5.3-free : false
tokenrouter/* vs z-ai/glm-5.3-free (id fallback): false
tokenrouter/** vs tokenrouter/z-ai/glm-5.3-free: true
opencode-go/* vs opencode-go/glm-5.3          : true
```

实验代码：

```js
const p1 = new Bun.Glob('tokenrouter/*');
const p2 = new Bun.Glob('tokenrouter/**');
const p3 = new Bun.Glob('opencode-go/*');
p1.match('tokenrouter/z-ai/glm-5.3-free') // false
p1.match('z-ai/glm-5.3-free')             // false
p2.match('tokenrouter/z-ai/glm-5.3-free') // true
p3.match('opencode-go/glm-5.3')           // true
```

结论：`Bun.Glob` 的单星 `*` 不跨 `/`；双星 `**` 跨。裸 id 兜底（`z-ai/glm-5.3-free`）同样被 `tokenrouter/*` 拒绝。

## 证据 3：修复与验证

`~/.omp/agent/config.yml` 中一行改动：`- tokenrouter/*` → `- tokenrouter/**`。

YAML 复验（python3 + yaml.safe_load）：

```text
yaml-ok, enabledModels count: 17
tokenrouter entries: ['tokenrouter/**']
```

修复后 Bun.Glob 复测：

```text
new pattern tokenrouter/** matches: true
old pattern tokenrouter/* matches : false
```

用户在 buntoolbox repo 的 OMP TUI（herdr pane w7:p5，进程 12:23:30 启动，晚于配置修改）刷新模型选择器后确认 tokenrouter provider 出现（用户原话确认 "ok, that worked"）。

## 证据 4：CLI 与 TUI 行为差异（排除过程记录）

- `omp models tokenrouter`（CLI）在修复前即正常列出 `z-ai/glm-5.3-free`（context 1M / max-out 131K / thinking low,high,max）——CLI 列全量，不过 enabledModels 过滤。
- 一次性真实请求（修复前，key 为硬编码字面值时）：`omp -p --no-session --model tokenrouter/z-ai/glm-5.3-free "Reply with exactly: ok-tokenrouter-test"` 返回 `ok-tokenrouter-test`，exit 0——证明 auth 与请求链路通畅，不可见与 key 无关。
- 被证伪的假设（均有实验记录）：
  - "旧进程缓存"：buntoolbox TUI 进程 12:23:30 启动，晚于 models.yml（12:10:10）与 config.yml 修改；仍不可见。
  - "TUI 环境 PATH 缺 node（当时 key 为 !node 命令形式）"：从 `/proc/3098344/environ` 读旧 TUI 真实 PATH 模拟执行原 `!node` 命令，exit 0、输出 51 字符（key 长度），命令可跑通。
  - "`!node` 命令在请求时失败"：修复前 25 秒 `--model` 测试无输出，inconclusive，不能定罪。
