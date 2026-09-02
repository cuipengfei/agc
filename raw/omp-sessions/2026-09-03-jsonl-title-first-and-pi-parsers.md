# OMP session JSONL 的 title 首行与第三方 pi 解析器兼容性

> Source: 本机 `~/.omp/agent/sessions/-code-inside-agc/*.jsonl` 直读；
>         Better Harness `scripts/session-analysis/platforms/pi.mjs` v0.6.6 直读
> Collected: 2026-09-03

## OMP session JSONL 首两行结构

取一个典型文件（`2026-08-20T14-03-01-591Z_019f8e64-1234-7000-0000-000000000000.jsonl`）：

```
[0] type=title     keys=type,v,title,source,updatedAt,pad
[1] type=session   keys=type,version,id,timestamp,cwd,title
```

首行是 `{"type":"title", ...}`，第二行才是 `{"type":"session", ...}`。6 个 session 文件全部如此（首行 type 取值仅 title）。

## BH pi parser 的读取逻辑

`scripts/session-analysis/platforms/pi.mjs:323-336`：

```
323: // Pi treats --session-dir, PI_CODING_AGENT_SESSION_DIR, and the settings
324: // `sessionDir` key as the exact directory that contains session JSONL files.
325: // Only the built-in default is a cwd-keyed tree of --<cwd-slug>-- children
326: // under <agent-dir>/sessions. Resolution order matches Pi: CLI option, then
327: // environment, then project settings over global settings, then the default.
328: async function resolveSessionDirContract(options, home, workspace) {
329:   const cliDir = options.sessionsDir ?? options["sessions-dir"] ?? options["session-dir"] ?? options.sessionDir;
330:   if (cliDir) {
331:     return { mode: "custom", dir: resolvePiSessionDir(cliDir, workspace) };
332:   }
333:   if (process.env.PI_CODING_AGENT_SESSION_DIR) {
334:     return { mode: "custom", dir: resolvePiSessionDir(process.env.PI_CODING_AGENT_SESSION_DIR, workspace) };
335:   }
336:   const settingsDir = (await readSettingsSessionDir(path.join(workspace, ".pi", "settings.json")))
```

pi 解析器把 `--session-dir` / `PI_CODING_AGENT_SESSION_DIR` / settings `sessionDir` 都当作「直接存放 JSONL 的扁平目录」处理，只有内置默认才走 `cwd-keyed tree`。

读取时，pi 解析器只看每份 JSONL 的第一行来判断是否为有效 session：

```
// 从 pi.mjs 的 session 读取逻辑推导（通过 evidence-bundle facts 输出的 scope 反推）
// 当第一行 type 为 "title" 而非 "session" 时，文件被判定为无效，整份跳过。
```

## A/B 实测：剥掉 title 首行的影响

两组镜像，同一来源，唯一变量是首行：

| 镜像 | 首行 | eligibleSessions | selectedSessions | taskEpisodes | distinctRequests | candidates | withChanges | flags |
|---|---|---|---|---|---|---|---|---|
| 原样（含 title） | `{"type":"title"}` | 0 | 0 | 0 | 0 | 0 | 0 | `no-change-evidence`, `no-reviewed-relevant-check-evidence`, `no-result-evidence` |
| 剥掉 title | `{"type":"session"}` | 5 | 5 | 24 | 19 | 5 | 0 | `portfolio-truncated`, `population-portfolio-divergence`, `no-change-evidence`, `no-reviewed-relevant-check-evidence` |

**结论：title 首行导致 BH 把整个 session 文件判定为无效，eligibleSessions=0。**

## 正确做法（已验证）

源目录只读，镜像到临时目录，剥掉首行 title：

```bash
mkdir -p /tmp/bh-mirror
for f in ~/.omp/agent/sessions/-code-inside-agc/*.jsonl; do
  # 源只读，绝不原地修改
  sed '1{/^\s*{"type":"title"/d}' "$f" > /tmp/bh-mirror/$(basename "$f")
done
# 然后 --session-dir /tmp/bh-mirror
```

跑完后 `rm -rf /tmp/bh-mirror`。

**禁止**：原地修改 `~/.omp/agent/sessions/*.jsonl`（当前会话文件正在被 OMP 写入，原地改会破坏会话标题并可能写坏正在追加的文件）。

## 工具名大小写不是唯一障碍

`scripts/session-analysis/episode-contract.mjs:14-21`：

```
14: const EDIT_TOOL_NAMES = new Set([
15: 	"Write",
16: 	"Edit",
17: 	"MultiEdit",
18: 	"StrReplace",
19: 	"ApplyPatch",
20: 	"CreateFile",
21: ]);
```

实测 `isEditEvent`：

| 输入名 | filePath | 结果 |
|---|---|---|
| `write` (小写) | `wiki/index.md` | false |
| `Write` (大写) | `wiki/index.md` | true |
| `edit` (小写) | — | false |
| `apply_patch` | — | true |
| `Edit` (大写) | `a.ts` | true |

OMP 实际发出的 toolCall 名称（取自 session JSONL）：`read:66`, `todo:64`, `bash:37`, `edit:24`, `hub:20`, `write:5`……全小写。

**第二个障碍未定位**：即使把 `write` 重命名为 `Write`、`edit` 重命名为 `apply_patch`，`withChanges` 仍为 0。`populationCoverage.withChanges` 在 stripped 镜像下也是 0，与 plain 镜像一致。说明大小写不匹配是真问题，但不是唯一问题；第二个障碍未隔离。

## 已观测但未验证的边界

- auto-compact 之前的内容能否被覆盖：JSONL 里有 `previousSessionFiles` 字段指向前序 session 文件，但未检查 compaction 标记在 JSONL 中的具体形态，也未验证 BH 折叠 episode 时如何处理跨文件链。
- 未确认 `isEditEvent` 第二个障碍的根因（改大小写后 `withChanges` 仍为 0）。

## 关联历史

本仓库此前已因同一根因被 tokscale 影响（tokscale 的 pi parser 也读不到 OMP session 的改动证据）。该事件已有独立 skill 记录。
