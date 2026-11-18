# graphify 0.9.112 本机升级与 AGC 全量图谱刷新实测

> Source: 本会话本机命令输出与 graphify-out/ 实测产物
> Collected: 2026-11-18
> Published: Unknown

## 本机升级记录

本机 graphify 包与四份 skill 副本已升到 0.9.112。

执行过的升级命令：

```bash
uv tool install --upgrade 'graphifyy[svg,leiden,mcp,sql,postgres,chinese]'
graphify install --platform claude
graphify install --platform codex
graphify install --platform opencode
graphify install --platform agents
```

核验输出：

```text
graphify 0.9.112
~/.claude/skills/graphify          0.9.112
~/.config/opencode/skills/graphify 0.9.112
~/.codex/skills/graphify           0.9.112
~/.agents/skills/graphify          0.9.112
```

## AGC 语料与提取

本次 AGC 全量混合语料重提取：

```text
178 code files
979 Markdown docs
1157 files total
745422 words
```

`omp/agent/.env` 被识别为 sensitive 文件并跳过。

semantic extraction 分 43 chunks 首轮完成，另有 11 个短读文档进入 partial retry。

token 记账：

```text
first semantic pass:  39,561,854 input / 935,165 output
partial retry:           269,722 input /  25,034 output
total:                 39,831,576 input / 960,199 output
```

## 最终图谱统计

最终聚类后命名 1,347 个 labeled communities。

最终图谱：

```text
nodes:      16320
links:      21318
communities: 1347
```

最终产物大小：

```text
graphify-out/graph.json             17,035,058 bytes
graphify-out/GRAPH_REPORT.md           412,323 bytes
graphify-out/graph.html              1,078,005 bytes
graphify-out/GRAPH_TREE.html         1,413,430 bytes
graphify-out/agc-callflow.html         353,948 bytes
graphify-out/graph.svg              56,459,877 bytes
```

`graph.html` 因为节点数超过 5000，导出为 1,347 个社区聚合节点和 1,649 条跨社区边。

`agc-callflow.html`：18 sections、16 Mermaid diagrams、15 call tables。

`benchmark` 输出：

```text
Corpus: 745422 words → ~932706 tokens (naive)
Avg query cost: ~1626 tokens
Reduction: 669.1x fewer tokens per query
```

## 最终验证输出

`graphify diagnose multigraph --graph graphify-out/graph.json --max-examples 3`：

```text
missing endpoint edges: 0
dangling endpoint edges: 0
collapsed (directed) edges: 0
collapsed (undirected) edges: 0
self-loop edges: 20
```

`graphify check-update .`：退出码 0，无输出。

`graphify tree` 曾用绝对仓库根路径报错：`error: --root /home/cpf/code-inside/agc matched 0 of 1120 source files (source_file paths are stored repo-relative, e.g. '.agents/skills/beads/SKILL.md')`；改用 `--root .` 成功写出 `GRAPH_TREE.html`。

## SVG 导出边界

本轮 `graphify export svg` 成功生成 `graph.svg`，但仍伴随 CJK glyph warnings。绕过 mathtext 的方式仍是设置 `MATPLOTLIBRC` 指向包含 `text.parse_math: False` 的临时 matplotlibrc。

可核对时间证据：同轮轻量导出产物时间集中在 `2026-11-18 22:17:57` 到 `22:18:10`，`graph.svg` 的 mtime 是 `2026-11-18 22:27:46`；按这些产物 mtime 差值计算，SVG 导出比轻量导出晚约 9.6 分钟。这个差值包含后续命令间隔，不是精确耗时。

## 运行顺序教训

本轮实际走过的有效顺序是：

1. 先完成 partial semantic retry。
2. 再对合并后的 extraction 做最终聚类。
3. 最后只对最终 communities 命名并导出报告。

此前曾先命名旧聚类，再重试 partial semantic，导致旧 community IDs 被 partial merge 改掉，旧 labels 全部作废。最终做法是丢弃旧 labels，按新 community IDs 重新命名 1,347 个社区。