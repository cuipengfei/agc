# Managed Skills 创建门槛与 Auto-Learn 字符串出处取证

> Source: 本机 OMP bundle 探针（`/home/cpf/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent/dist/cli.js`，包版本 18.4.4，minified）
> Collected: 2026-09-30

探针方法：Node `fs.readFileSync` 读入 bundle，按特征字符串（`name="learn"`、`name="manage_skill"`、`class r9{`、`class i9{`、`Capture sparingly`、`taskDepth`、`managedSkills`）定位并截取上下文。minified 标识符与源码名的对应：`lT` = `cfgAutolearnEnabled`，`or` = `cfgMemoryBackend`，`zbe` = skill name 校验，`vne` = authored skill 存在检查，`Pvt` = 写入函数，`pvo` = 删除函数，`wne` = managed-skills 目录拼接。

## 1. 两个工具的 createIf 门槛

### ManageSkillTool（bundle 内 `class i9`，`name="manage_skill"`）

```js
static createIf(e){if(!lT.get(e.settings))return null;return new i9(e.refreshSkills)}
```

唯一门槛：`autolearn.enabled` 设置开启。

### LearnTool（bundle 内 `class r9`，`name="learn"`）

```js
static createIf(e){if(!lT.get(e.settings))return null;let t=or.get(e.settings);if(t!=="hindsight"&&t!=="mnemopi"&&t!=="local")return null;if(t==="hindsight"&&!$y(ah(e.settings)))return null;return new r9(e)}
```

门槛：`autolearn.enabled` 开启，且 `memory.backend` ∈ {hindsight, mnemopi, local}（`off` 与 `sharpshooter` 不可用）；backend 为 hindsight 时还需通过额外配置检查。

### 设置定义（bundle 内注册文本）

- `lT=se({id:"autolearn.enabled",type:"boolean",default:!1,ui:{tab:"memory",group:"Auto-Learn",label:"Auto-Learn (experimental)",description:"After the agent stops, nudge it to capture lessons to memory and create/enhance isolated managed skills"}})` —— 默认 `false`。
- `or=se({id:"memory.backend",...values:["off","local","hindsight","mnemopi","sharpshooter"],default:"off"...})`。

### 无 taskDepth 检查（纠正项）

在 bundle 全文检索 `taskDepth`，全部命中均与 learn/manage_skill 无关（settings 修改守卫、memory startup 跳过、hindsight 会话继承、spawn 深度限制）。两个工具的 `createIf` 均不含 taskDepth 条件；sub-agent 层能否调用这两个工具不由 createIf 限制。

## 2. create/update 的参数校验

### name 校验（bundle 内 `zbe`）

```js
function zbe(e){let t=e.trim().toLowerCase();if(!ivo.test(t))throw Error(`Invalid skill name "${e}". Use lowercase letters, digits, and hyphens (1-64 chars, starting with a letter or digit).`);return t}
```

### ManageSkillTool execute 分支

```js
if(t.action==="delete")return await pvo(t.name),...
if(!t.description||!t.body)throw Error(`"${t.action}" requires both "description" and "body".`);
if(t.action==="create"&&vne(zbe(t.name)))return{content:[{type:"text",text:`Cannot create managed skill "${t.name}": an authored skill of that name already exists, and managed skills cannot override authored ones. Choose a different name.`}],isError:!0,details:{action:"create",name:t.name,shadowed:!0}};
```

schema 层另有 `.narrow` 复核：delete 之外的 action 必须同时提供 description 与 body。

### LearnTool 的 skill 分支

- `scope==="global"` 仅 mnemopi 后端可用，否则 throw `Global memory scope is only available with the Mnemopi backend.`
- create 撞名 authored skill 时返回 isError 文本：`Did not create managed skill ... managed skills cannot override authored ones`（此时记忆本体已先存储，返回文本以 `Lesson stored` 开头）。
- LearnTool 的 approval 分级：`t.skill||t.scope==="global"||or.get(this.session.settings)==="local"?"write":"read"`。

## 3. Auto-Learn 相关字符串的三类出处

以下字符串均编译在 bundle（`dist/cli.js`）里。`dist/cli.js` 本身是磁盘文件，但属构建产物；这些说明文字**未见独立的可编辑规则/文档文件**承载（区别于 `~/.omp/agent/rules/*.md` 这类磁盘规则文件）。

### 3a. 系统提示注入段（变量 `vio`、`Aio`）

组装函数与调用点：

```js
function Pio(e){if(!e.manageSkill)return null;let t=[vio.trim()];if(e.learn)t.push(Aio.trim());return t.join(` `)}
// 调用点（systemPrompt 构建路径）：
np=ct?void 0:Pio({manageSkill:bt?Pe.hasBuiltInTool("manage_skill"):Dd.has("manage_skill"),learn:bt?Pe.hasBuiltInTool("learn"):Dd.has("learn")})
```

即：manage_skill 工具可用时把 `vio` 注入系统提示，learn 工具可用时追加 `Aio`。

`vio` 全文：

```
## Auto-Learn (experimental)

`manage_skill`: build reusable managed-skill library.
Managed skills: `SKILL.md` in isolated `~/.omp/agent/managed-skills`; surfaced in future sessions like other skills.

For repeatable procedures worth codifying—setup sequences, debugging recipes, project-specific workflows—use `manage_skill` to `create` | `update` | `delete`.
Isolation: managed skills ONLY writable skills. NEVER edit user-authored skills in `~/.omp/agent/skills` or `.omp/skills`.
Capture sparingly, specifically: skill requires reuse; prefer enhancing existing managed skill to creating near-duplicate.
```

### 3b. 工具 description（变量 `fdr`、`Tdr`）

learn 工具的 description 是 `fdr`（`class r9` 内 `get description(){return De(fdr,{globalScope:...})}`），末尾含 `Capture sparingly, specifically: one strong reusable lesson > several vague ones.`，并声明 `Managed skills: isolated ~/.omp/agent/managed-skills; surfaced as normal skills next session; NEVER touch user-authored skills.`

manage_skill 工具的 description 是 `Tdr`（`class i9` 内 `description=Tdr`），要点：`Managed skill: SKILL.md in isolated ~/.omp/agent/managed-skills; surfaced as a normal skill in future sessions.`、`action: "create" — fails if skill exists.`、`action: "update" — overwrites body; fails if skill absent.`、`action: "delete" — fails if skill absent.`、`name: kebab-case`、`No frontmatter in body; generated from name and description.`。`Tdr` 不含 Capture sparingly 字样。

### 3c. 自动捕获回合提示（变量 `Iio`）

`Automated capture turn — not a user reply; user has not responded to your previous turn...`，对应 `autolearn.autoContinue` 设置（`When on, auto-run one private capture turn at stop (uses extra tokens). When off, only standing auto-learn guidance remains.`）。
