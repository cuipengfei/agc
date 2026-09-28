# OMP title-first jsonl 现状：tokscale 原生已可解析，mirror 已退役

- Source: 本地会话验证（omo native 会话 2026-09-27T07-33-33Z）
- Collected: 2026-09-27
- Published: 2026-09-27

## 验证记录

1. OMP 最新 session 文件（mtime 2026-09-24，glob `~/.omp/agent/sessions/**/*.jsonl` 共 957 个）首行仍是 title 记录：

```
{"type":"title","v":1,"title":"","updatedAt":"2026-09-24T15:07:47.068Z","pad":"...
```

2. 同一时期 `tokscale clients` 输出：

```
  Oh My Pi
  sessions: ~/.omp/agent/sessions ✓
  messages: 90.4K
```

即 tokscale 4.17.0 原生 Oh My Pi client 在 title-first 格式原样保留的情况下，仍能数出 90.4K messages——上游已处理 title 首行（剥除或跳过）。

3. mirror 退役三证：`~/.local/share/tokscale-omp-pi` 下 0 个 jsonl；`crontab -l` 为 `no crontab for cpf`；`~/.omp/agent/` 配置无任何 `submit-tokscale` 引用。脚本文件仍存在于 `~/.omp/scripts/`（submit-tokscale-omp.sh、tokscale_omp_to_pi_mirror.js、test_submit_tokscale_omp.sh）。

4. 用户 `tokscale submit --today` 输出里 omp client 数据正常出现（Clients: omp, opencode[, senpi]），数据来源即原生扫描。

## 结论

wiki/omp-sessions/jsonl-format-and-third-party-parsers.md 中"tokscale 此前已因同一根因读不到 OMP session"为历史状态：原生解析已修复，mirror workaround 已停用。title-first 格式本身未变，Better Harness 侧结论不受影响。
