---
Sources: OMP 源码 /home/cpf/code-inside/oh-my-pi, branch main, commit d49918fab2
Collected: 2026-09-21
Published: Unknown
---

# Mnemopi 数据模型与 Recall/Reflect 源码摘录

## `packages/mnemopi/src/core/beam/schema.ts`

### working_memory（schema.ts:26-54）

```sql
CREATE TABLE IF NOT EXISTS working_memory (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  embed_text TEXT DEFAULT NULL,
  source TEXT,
  timestamp TEXT,
  session_id TEXT DEFAULT 'default',
  importance REAL DEFAULT 0.5,
  metadata_json TEXT,
  veracity TEXT DEFAULT 'unknown',
  memory_type TEXT DEFAULT 'unknown',
  consolidated_at TEXT,
  recall_count INTEGER DEFAULT 0,
  last_recalled TIMESTAMP DEFAULT NULL,
  valid_until TIMESTAMP DEFAULT NULL,
  superseded_by TEXT DEFAULT NULL,
  scope TEXT DEFAULT 'global',
  author_id TEXT DEFAULT NULL,
  author_type TEXT DEFAULT NULL,
  channel_id TEXT DEFAULT NULL,
  trust_tier TEXT DEFAULT 'STATED',
  validator TEXT DEFAULT NULL,
  validated_at TIMESTAMP DEFAULT NULL,
  validation_count INTEGER DEFAULT 0,
  event_date TEXT DEFAULT NULL,
  event_date_precision TEXT DEFAULT 'unknown',
  temporal_tags TEXT DEFAULT '[]',
  corrected_by INTEGER DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

### episodic_memory（schema.ts:59-91）

```sql
CREATE TABLE IF NOT EXISTS episodic_memory (
  rowid INTEGER PRIMARY KEY AUTOINCREMENT,
  id TEXT UNIQUE NOT NULL,
  content TEXT NOT NULL,
  source TEXT,
  timestamp TEXT,
  session_id TEXT DEFAULT 'default',
  importance REAL DEFAULT 0.5,
  metadata_json TEXT,
  summary_of TEXT DEFAULT '',
  veracity TEXT DEFAULT 'unknown',
  tier INTEGER DEFAULT 1,
  degraded_at TEXT,
  memory_type TEXT DEFAULT 'unknown',
  binary_vector BLOB,
  recall_count INTEGER DEFAULT 0,
  last_recalled TIMESTAMP DEFAULT NULL,
  valid_until TIMESTAMP DEFAULT NULL,
  superseded_by TEXT DEFAULT NULL,
  scope TEXT DEFAULT 'global',
  author_id TEXT DEFAULT NULL,
  author_type TEXT DEFAULT NULL,
  channel_id TEXT DEFAULT NULL,
  trust_tier TEXT DEFAULT 'STATED',
  validator TEXT DEFAULT NULL,
  validated_at TIMESTAMP DEFAULT NULL,
  validation_count INTEGER DEFAULT 0,
  event_date TEXT DEFAULT NULL,
  event_date_precision TEXT DEFAULT 'unknown',
  temporal_tags TEXT DEFAULT '[]',
  corrected_by INTEGER DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

### facts（schema.ts:345-356）

```sql
CREATE TABLE IF NOT EXISTS facts (
  fact_id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  subject TEXT NOT NULL,
  predicate TEXT NOT NULL,
  object TEXT NOT NULL,
  timestamp TEXT,
  source_msg_id TEXT,
  confidence REAL DEFAULT 1.0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

### memoria_facts（schema.ts:169-186 + 193-198 addColumnIfMissing）

```sql
CREATE TABLE IF NOT EXISTS memoria_facts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT DEFAULT 'default',
  message_idx INTEGER,
  fact_type TEXT,
  key TEXT,
  value TEXT,
  context_snippet TEXT,
  importance REAL DEFAULT 0.5,
  timestamp TEXT,
  version_id INTEGER DEFAULT 0,
  previous_value TEXT,
  updated_msg_idx INTEGER,
  valid_from_msg_idx INTEGER,
  valid_to_msg_idx INTEGER,
  source_memory_id TEXT
)
```

### triples

```sql
CREATE TABLE IF NOT EXISTS triples (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subject TEXT NOT NULL,
  predicate TEXT NOT NULL,
  object TEXT NOT NULL,
  valid_from TIMESTAMP,
  valid_until TIMESTAMP,
  source TEXT,
  confidence REAL DEFAULT 1.0
)
```

### gists

```sql
CREATE TABLE IF NOT EXISTS gists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  memory_id TEXT NOT NULL,
  gist TEXT NOT NULL,
  participants TEXT,
  location TEXT,
  emotion TEXT,
  time_range TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

### graph_edges

```sql
CREATE TABLE IF NOT EXISTS graph_edges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,
  target TEXT NOT NULL,
  edge_type TEXT NOT NULL,
  weight REAL DEFAULT 1.0,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

### FTS 虚拟表与触发器（schema.ts:131-150, 363-377）

```sql
CREATE VIRTUAL TABLE IF NOT EXISTS fts_episodes USING fts5(
  content,
  content='episodic_memory',
  content_rowid='rowid'
)

CREATE VIRTUAL TABLE IF NOT EXISTS fts_working USING fts5(
  id UNINDEXED,
  content
)

CREATE VIRTUAL TABLE IF NOT EXISTS fts_facts USING fts5(
  subject, predicate, object, content='facts'
)
```

插入触发器：`em_ai` 在 `episodic_memory` 插入后写入 `fts_episodes`；`facts_ai` 在 `facts` 插入后写入 `fts_facts`。删除触发器对称。

## `packages/mnemopi/src/core/beam/consolidate.ts`

### fact 提取写入两张表

```text
store.insertFact(...)
memoriaFactId = await memoriaFacts.append(...)
```

事实提取会同时写入 `facts` 和 `memoria_facts`。`memoria_facts` 保存 `fact_type`、`key`、`value`、`context_snippet`、`message_idx`、`version_id`、`previous_value` 等提取和版本信息。

### episodic 摘要写入

consolidation 对 eligible working memories 生成摘要，写入 `episodic_memory`，并在 `summary_of` 字段记录它涵盖的 working memory IDs。

## `packages/mnemopi/src/core/beam/recall.ts`

### 基础候选

`recallEnhanced()` 会：

- 全文检索 `fts_working` 和 `fts_episodes`
- 对 `working_memory` 和 `episodic_memory` 生成候选
- 如果启用 embedding，直接读取 `memory_embeddings` 的 `memory_id` 和 `embedding_json`
- 使用 `includeFacts: true` 时，查询 `facts` / `fts_facts`
- 合并、去重、评分、MMR 重排
- 返回 `recallLimit` 条结果

### facts 检索

事实候选来自 `facts` 表及 `fts_facts` 全文索引。当前 facts 检索路径没有使用 `memory_embeddings`。

## `packages/coding-agent/src/mnemopi/backend.ts`（启动期 promotion，:94-96）

```text
// Promote age-eligible working memory to episodic before the session's
// first write can TTL-trim unconsolidated retain/learn rows (#10770).
state.promoteEligibleWorkingMemory();
```

## `packages/coding-agent/src/mnemopi/state.ts`（promoteEligibleWorkingMemory，:644-672）

```text
/**
 * Promote age-eligible working-memory rows to episodic once at session start,
 * before any write can trigger the working-memory TTL trim.
 *
 * `remember` runs `trimWorkingMemory` on every write, which deletes
 * unconsolidated rows older than `workingMemoryTtlHours` (24h). Consolidation
 * (`sleep`) is age-gated to rows >= 12h old, but otherwise only ran via the
 * explicit `/memory enqueue` path (`dispose` passes `sleep:false`, #4843), so
 * `retain`/`learn`/transcript rows that were never manually enqueued were
 * silently deleted after a >24h session gap (#10770). Running the age-gated
 * sleep here stamps `consolidated_at` on those rows before the session's first
 * write, so the `consolidated_at IS NULL` trim filter no longer removes them.
 *
 * Bank-global because each bank opens with `sessionId = <bank>`, so a single
 * session-scoped `sleep` covers rows written by every prior session. Cheap
 * when nothing is old enough — `sleep` short-circuits to a no-op with no
 * eligible rows — and failures are logged, never thrown, so a consolidation
 * error cannot make the backend inert.
 */
promoteEligibleWorkingMemory(): void {
  if (this.aliasOf) return;
  for (const memory of this.scoped.owned) {
    try {
      memory.sleep(false);
    } catch (error) {
      this.#logLifecycleFailure("startup consolidation", [this.scoped.retain.bank], error);
    }
  }
}
```

## `packages/coding-agent/src/mnemopi/state.ts`（recall 封装，:392-438）

OMP 的 recall 封装调用：

```text
recallEnhanced(..., { includeFacts: true })
```

因此 OMP 的普通 recall 默认同时返回：

- working memories
- episodic memories
- facts

## `packages/coding-agent/src/tools/memory-reflect.ts`（reflect 路径，:35-63）

reflect 的实现路径：

```text
state.recallResultsScoped(query)
→ recallEnhanced(includeFacts: true)
→ formatContextScoped()
```

`context` 会追加为查询文本的 `Additional context:` 部分。当前实现没有额外的 LLM 综合步骤。
