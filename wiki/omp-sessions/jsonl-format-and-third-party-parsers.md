# OMP session JSONL 格式与第三方 pi 解析器兼容性

> Sources: 本机 OMP session JSONL 直读; Better Harness v0.6.6 `scripts/session-analysis/platforms/pi.mjs` 直读
> Raw: [JSONL title 首行与 pi 解析器](../../raw/omp-sessions/2026-09-03-jsonl-title-first-and-pi-parsers.md)
> Updated: 2026-09-03

## 一句话

OMP 的 session JSONL 首行是 `{"type":"title"}`，第三方 pi 格式消费者如果只看第一行找 `type:"session"`，会整份文件跳过。

## 首两行结构

典型文件（6 个 session 文件全部一致）：

```
[0] {"type":"title", "v":1, "title":"...", "source":"...", ...}
[1] {"type":"session", "version":3, "id":"...", "timestamp":"...", "cwd":"...", ...}
```

首行 `type=title`，第二行才是 `type=session`。

## 影响面

这个根因已经**跨工具复发**两次：

- **Better Harness**：原样读取 → `eligibleSessions=0`；剥掉首行 → `eligibleSessions=5`、`taskEpisodes=24`
- **tokscale**：此前已因同一根因读不到 OMP session 的改动证据（已有独立 skill 记录）

## 正确做法

源目录只读，镜像到临时目录，剥掉首行：

```bash
mkdir -p /tmp/bh-mirror
for f in ~/.omp/agent/sessions/-code-inside-agc/*.jsonl; do
  # 源只读，绝不原地修改
  sed '1{/^\s*{"type":"title"/d}' "$f" > /tmp/bh-mirror/$(basename "$f")
done
# 然后 --session-dir /tmp/bh-mirror
```

**禁止**：原地修改 `~/.omp/agent/sessions/*.jsonl`。当前会话文件正在被 OMP 写入，原地改会破坏会话标题并可能写坏正在追加的文件。

## 额外障碍：工具名大小写

BH 的 `episode-contract.mjs:14-21` 只认大写开头的工具名（`Write`、`Edit`、`MultiEdit`……），OMP 实际发出的是小写（`write:5`, `edit:24`……）。即使把工具名重映射成大写，`withChanges` 仍为 0——**大小写不是唯一障碍，第二个未定位**。

## 未验证

- auto-compact 之前的内容能否被覆盖（JSONL 有 `previousSessionFiles` 字段，但未检查 compaction 标记）
- `isEditEvent` 第二个障碍的根因
