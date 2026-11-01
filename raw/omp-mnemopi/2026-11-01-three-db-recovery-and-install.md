# OMP 三库恢复与安装：history、agc、default

> Source: 本会话恢复与安装实录；留档目录 `~/.omp/mem-ledger/recovery-20261101-j0hocaaa` 内的 `installation-manifest.json`、`installation-rlo6kt4b/installation-status.json`、`installation-rlo6kt4b/post-install-checks.json`、各库 `report.json`、`consumer-smoke-result.json`、`installer-check-result.json`
> Collected: 2026-11-02
> Published: 2026-11-01

## 恢复对象与候选

| 库 | 候选路径 | 候选 SHA-256 | 恢复脚本 |
|---|---|---|---|
| history | `history-recovered/candidate.db` | `56f950e6cc7386b9cb7bcadd6114eaa0dc36f71dc2e7188bc138d12402ad8b3a` | `recover-history.py` |
| agc | `agc-recovered/candidate.db` | `9177544f9dc9d598175ec24a9a41ebf5cd54a44445ba0fbee0ad4d70e33ebdb7` | `recover-agc.py` |
| default | `default-recovered/candidate.db` | `00a105b8d05d323b011b5cca00b67f4536a69ff719a535905cd3a168a09f5fca` | `recover-default.py` |

`installation-manifest.json` 另记录持有者检查脚本的 SHA-256 `7c9c1ce92c0ca9696d6c40af8b71092656f7eb0cea89d9db4b6c48c2b0cf4bb9`，以及三个恢复脚本各自的 SHA-256。

## 安装结果

`installation-status.json`：

- `state: installed`
- `at: 2026-11-01T10:18:10.512751+00:00`
- 装前备份目录：`installation-rlo6kt4b/pre-install-backup`

| 库 | 线上路径 | 装后 SHA-256 | 原始文件 SHA-256 |
|---|---|---|---|
| history | `/home/cpf/.omp/agent/history.db` | `5a2c6b27aad3001844cde0ff44ff600928bf644c8d0d069463f99d8237a89067` | `024aeb6bd6383ce16e425093fa611a3ef0a25c275342b037f99214c0095113fe` |
| agc | `/home/cpf/.omp/agent/memories/mnemopi/banks/agc-djmfd5jv3zsd/mnemopi.db` | `863105dc0530963052e72a3b1abfa1c18275784d32cde5933904f43320d1efd7` | `4470a3e5126753ef81a700c86fed3a6eb3fb7caf19bf78ddd54d9bce7f710cd2` |
| default | `/home/cpf/.omp/agent/memories/mnemopi/mnemopi.db` | `1f276ceced83f72af4da38a6e13a28bbcc56856bad0343fbbd2ad5507945c94a` | `e746195c7c41fdf823849019800bbc297aa14b3e1e09e46f4579c12e9a647e3a` |

## 装后检查

`post-install-checks.json`：

- `checked_at: 2026-11-01T10:21:38.043500+00:00`
- `snapshot_root: /tmp/omp-db-evidence-20261101-pbkb9ucj`
- history、agc、default 三项结果均为 `integrity/FK/FTS ok`

## 消费者冒烟

`consumer-smoke-result.json` 的 `reports`：

| 库 | 结果 |
|---|---|
| history | `addedAndSearchable: true`、`repeatedPromptDeduplicated: true`、`useCount: 2` |
| agc | `diagnosticsFailed: 0`、`integrity: "ok"`、`workingWriteAndRecall: true`、`episodicConsolidationAndRecall: true` |
| default | `diagnosticsFailed: 0`、`integrity: "ok"`、`workingWriteAndRecall: true`、`episodicConsolidationAndRecall: true` |

冒烟在隔离目录 `consumer-smoke-92d148c9-4e0f-4c0e-a133-bd31f12bc030` 内运行，`exit: 0`。

## 安装闸

`installer-check-result.json` 记录一次中止：`exit: 1`，脚本 `install-recovery.py` 在 `require_quiet` 抛出 `RuntimeError: 仍有 OMP 进程或数据库持有者，请退出后从普通 shell 运行。`，消息中列出的持有者是 `pid 451347`、`name: omp`，持有 `/home/cpf/.omp/agent/history.db`。安装只在无持有者时执行。

## 数据边界：default

`default-recovered/report.json` 的 `quarantine`：

- `removed_row_count: 12`
- `removed_by_table`：`episodic_memory: 1`、`gists: 1`、`graph_edges: 9`、`memory_embeddings: 1`
- 被移除的 episodic 行 `pk: 10`、`id: f034cd8ef7bbc60d`，原因 `empty_content:fts_docsize_witness_1159`
- `field_count: 3`，涉及 `content`（`content_destroyed: true`）、`metadata_json`（`invalid_json:object_or_null`）、`temporal_tags`（`invalid_json:array`）
- 保留规则原文：`隔离无法恢复的记忆及其 gist、embedding 和失去端点的 graph_edges；独立可查询的 facts 与 memoria_facts 保留原值及历史来源`

`evidence_boundary.proves` 包含：候选 `integrity_check=ok`，三组 FTS 的 `fts5 integrity-check(rank=1)` 全部通过；损坏副本上直接 `count(*)` 的结果与 `.recover` 行数在每张可读表上一致；重建前后比对 `fts_*_docsize` 可定位内容已从磁盘消失的行。

`evidence_boundary.does_not_prove` 包含：采集前已从 bank 删除的行无法恢复（没有 WAL 或更早快照）；被隔离记忆行的原文不会用 fts5 词项反推重建。

## 数据边界：agc

`agc-recovered/report.json` 的 `quarantine.rows` 共 4 行：

- `memoria_facts` 三行，`pk` 分别为 `983`、`8311`、`8312`，问题均为 `message_idx`、`numeric_column_holds_str`、`kind: storage_class`
- `memory_embeddings` 一行，问题为 `memory_id`（`required_blank`）、`embedding_json`（`json:JSONDecodeError`、`vector_invalid`）、`model`（`detail: 0`、`vector_model`）

## 数据边界：history

`history-recovered/report.json`：

- `loss.quarantined_rows_total: 0`、`loss.quarantined_fields_total: 0`
- `merge.history.merged_prompts: 7851`、`overlapping_snapshot_prompts: 840`、`ids_reassigned: 0`、`max_id: 17549`
- `merge.session_titles.merged: 204`
- `merge.session_recaps.merged: 444`、`duplicate_tuples_collapsed: 102`、`ids_reassigned: 3`、`max_id: 444`
- `unchanged_source_rows_present_in_candidate`：`source: 840`、`baseline[0]: 7851`
- `unknown_rows` 原文：`rows that exist only on unreadable pages cannot be counted; each source's integrity_check output is recorded in inputs[].probe`

`evidence_boundary`：`originals_opened_by_sqlite: false`、`originals_hashed_only: true`、`originals_unchanged_after_run: true`、`work_copies_only: true`。

## 本文件不覆盖的内容

- 未逐页复现历史事件的页面指纹，也未给每次损坏做归因。
- 安装后的数据库状态在本轮没有重新检查；上文检查结果的时间与来源如上。
