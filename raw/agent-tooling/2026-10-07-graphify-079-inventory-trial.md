# graphify 0.9.79 全命令清单试用记录（agc 仓库 + /tmp 沙箱）

> Source: 本会话实测（CLI 直跑 + MCP 工具），agc 仓库与 /tmp/graphify-sandbox
> Collected: 2026-10-07
> Published: Unknown

## 环境与前置事实

- 刷新提示显示：用户级 skill 副本为 0.9.69，包版本 0.9.79（`refreshed skill ... (0.9.69 -> 0.9.79)`）。CLI 自身版本号未单独确认，以下以包版本 0.9.79 为准。
- 实测 `graphify --version`、`graphify --help` 两条命令触发了用户级 skill 目录自动刷新（~/.claude/skills/graphify、~/.config/opencode/skills/graphify、~/.agents/skills/graphify 三处，各留 SKILL.md.bak）。`graphify detect .` 只输出版本不一致警告（"skill ... is from graphify 0.9.69, package is 0.9.79. Run 'graphify install --platform agents' to update"），无刷新输出。是否所有命令都触发刷新未验证。环境变量 `GRAPHIFY_NO_AUTO_REFRESH=1` 可禁用（帮助文本注明）。

```
Re-extracting code files in . (no LLM needed)...
  AST extraction: 456/456 uncached files (100%) [20 workers]
  warning: 11 code file(s) yielded no symbols ...
  community set changed since labeling (289 saved labels, 397 communities now; renamed 80 community(ies) by their hub). Run `graphify label` to refresh names with the LLM.
[graphify] backed up curated graph (4 files) -> 2026-10-07/
[graphify watch] Rebuilt: 4620 nodes, 5079 edges, 397 communities
Code graph updated. For doc/paper/image changes run /graphify --update in your AI assistant.
Tip: set GEMINI_API_KEY or GOOGLE_API_KEY to use Gemini for semantic extraction.
```

- 对比 2026-09-26 记录：3309 nodes / 3644 edges / 289 communities → 4620 / 5079 / 397。

## 完整命令清单（`graphify --help`，0.9.79）

```
install [--platform P]  uninstall  path "A" "B"  explain "X"  diagnose multigraph
clone <github-url>  merge-driver <base> <current> <other>  merge-graphs <g1> <g2> [--out] [--previous]
add <url> [--author] [--contributor] [--dir]  watch <path>  update <path> [--force]
affected "X"  benchmark [graph.json]  check-update <path>  cluster-only <path>
export callflow-html|falkordb|graphml|html|neo4j|obsidian|svg|wiki
extract <path>  label <path>  god-nodes list  query "<question>"  tree emit
global add|list|path|remove  provider [list|show|add|remove]  prs PR  reflect [--graph ...]
save-result --question ... --answer ... --outcome {useful,dead_end,corrected} [--memory-dir]
hook install|status|uninstall  kilo/aider/copilot/vscode/claw/droid/trae/trae-cn/antigravity/hermes/kiro/pi/devin install|uninstall
```

## 逐项实测结果

**成功（agc 仓库或沙箱，输出摘要）**

- `path "src_agc_sync_manifest_filepair" "src_agc_sync_policy_slot"`：报 `No directed path found`；加 `--undirected` 得 4 跳：`FilePair <--contains-- manifest.py --imports_from--> dataclasses <--imports_from-- policy.py --contains--> Slot`。
- `explain "src_agc_sync_policy_slot"`：给出 Node/ID/Source(src/agc_sync/policy.py L62)/Community(policy.py)/Degree(3) 与 3 条连接（contains/calls/references，均 EXTRACTED 带行号）。
- `affected "src_agc_sync_policy_slot"`：列 calls/indirect_call/references/imports 等关系类型下深度 2 的邻居，含 `_slots_for_line()`、`_all_slots()`、`_replace_slots()`、AGENTS.md「代码约定与常见模式」、redact()。
- `query "redaction"`（agc 大图）：`Graph: graphify-out/graph.json (4620 nodes) | Traversal: BFS depth=2 | Start: ['Credential detection, redaction, and credential-preserving overlays.'] | 12 nodes found`，结果含 redact()、policy.py、test_sync.py、sync_plan.py 等，各带来源与社区。
- `diagnose multigraph`：`nodes: 4620, raw_edges: 5079, exact_duplicate_edges: 0, dangling_endpoint_edges: 0, self_loop_edges: 3, producer_suppression_sites: 12`。
- `god-nodes list`：Wiki Log 174 edges 居首，Knowledge Base Index 40，Entry 27，OMP 内置 Lifecycle Slash 命令 26，等。
- `tree emit`：写出 graphify-out/GRAPH_TREE.html（451.2 KB）。
- `benchmark graphify-out/graph.json`（3 节点沙箱图）：`Corpus: 150 words → ~200 tokens (naive); Avg query cost: ~38 tokens; Reduction: 5.3x fewer tokens per query` —— 仅沙箱小图单次测量，不代表真实仓库比例。
- `merge-graphs sandbox.json agc.json --out merged-graph.json`：`Merged 2 graphs -> 4623 nodes, 5082 edges`，输出 5.5M，秒级。
- `merge-driver base.json cur.json oth.json`（三份相同图谱）：退出码 0，无输出。不同分支合并行为未验证。
- `clone https://github.com/octocat/Hello-World`：克隆到 ~/.graphify/repos/octocat/Hello-World 并打印路径，成功。
- `cluster-only .`（沙箱）：只重聚类，备份 curated graph 到 2026-10-07/，秒级。
- `check-update .`：刚重建完，无输出（无变化）。
- `export svg`：`graph.svg written`；`export obsidian`：写 graphify-out/obsidian/graph.canvas；`export callflow-html`：写 graphify-out/<name>-callflow.html；`export wiki`：`Wiki: 3 articles written to graphify-out/wiki/`；`export graphml`：`graph.graphml written - open in Gephi, yEd`；`export neo4j` 与 `export falkordb`：均写 graphify-out/cypher.txt（离线生成脚本，无需真实连接）。
- `save-result --question ... --answer ... --outcome useful --memory-dir <dir>`：写 query_20261007_...md 到指定目录。注意正确形式是 `graphify save-result ...`（不带 save 子命令；`save` 会报 unrecognized arguments）。
- `reflect --graph ...`：无记忆时如实写 `Reflected 0 memories (0 useful, 0 dead ends, 0 corrected) -> graphify-out/reflections/LESSONS.md`。
- `global add <graph.json路径>` / `global list` / `global remove <仓库名>`：按图文件加入、按仓库名移除；试用后已复原为空。`global add` 收目录会报 `Is a directory`。
- `global path`：`/home/cpf/.graphify/global-graph.json`。`provider list`：`No custom providers registered.`
- 平台安装：`aider install` 在沙箱 cwd 写 AGENTS.md（1.1K，内含 graphify 使用段与"无 PreToolUse hook 等价物"说明）；`aider uninstall` 删净。`pi install`、`copilot install` 在假 HOME 下静默无操作、无任何目录变化（成功路径未验证）。`hook status` 在非 git 目录报 `Not in a git repository`。
- `update --force` 流程：删除沙箱唯一代码文件后普通 `update` 即重建空图（0 nodes），未触发少节点防护；随后 `update --force` 报 `No code-graph topology changes detected; outputs left untouched`。防护触发条件本次未验证。

**受阻（环境边界，报错原文）**

- `add https://example.com/`：`error: ingest: Blocked private/internal IP 198.18.1.31 (resolved from 'example.com')`；换 raw.githubusercontent.com 同样被拦（198.18.0.109）。本机 Clash TUN 伪 IP 环境下全域名失效。
- `watch .`：`error: watchdog not installed. Run: pip install watchdog`
- `extract .`（沙箱含 AGENTS.md 文档语料）：`the 'openai' package is required for this backend but is not installed. Install it with: uv tool install "graphifyy[openai]" --force, or pip install openai`。semantic chunk 全部失败。
- `label .`：同样缺 openai 包，社区命名退回 "Community N" 占位符。
- `prs`：`Error: gh CLI not found or not authenticated. Run: gh auth login`
- `reflect aggregate`：`unrecognized arguments: aggregate`（reflect 直接接选项，无子命令）。

**未试（原因）**

- `uninstall`（通用）、`hook install/uninstall`、claude/codex/opencode/cursor/vscode 等十余个平台的 install/uninstall：写入或删除真实用户级配置目录，超出本次授权。
- `install --platform` 成功路径：同上，仅 aider 在沙箱验证。
- `add https://example.com/`：`error: ingest: Blocked private/internal IP 198.18.1.31 (resolved from 'example.com')`；换 raw.githubusercontent.com 同样被拦（198.18.0.109）。两个域名均解析到 198.18.x 伪 IP（本机 Clash TUN 环境），是否所有域名均失效未验证。

- 沙箱：/tmp/graphify-sandbox（含 calc.py 测试文件，已删除；图谱、导出、merged-graph.json 仍在）。
- agc graphify-out/ 重建后备份：graphify-out/2026-10-07/。
