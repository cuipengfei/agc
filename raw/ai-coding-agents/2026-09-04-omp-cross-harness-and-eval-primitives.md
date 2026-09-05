# OMP 18.1.10：跨 harness 导入与 eval kernel 原语

> Source: 本机 `omp` CLI 实测（`omp --version`、`omp --help`）与本会话 eval 工具活体观察
> Collected: 2026-09-04
> Published: Unknown

验证级别：`[RUN]` = 本机执行命令并记录输出；`[OBS]` = 本会话运行中直接观察到的行为；`[UNVERIFIED]` = 已知存在但本次未测。

---

## A. 版本锚点

`[RUN]` `omp --version`：

```
omp/18.1.10
```

本文件所有观察均锚定该版本。未测其他版本；未查各能力自哪个版本引入。

---

## B. 跨 harness session 导入

`[RUN]` `omp --help 2>&1 | grep -i from` 的相关行：

```
      --from-claude                   Import a Claude Code session into OMP
      --from-codex                    Import a Codex session into OMP
```

`[RUN]` 同一 help 输出中属于自家 session 的开关，用于对照：

```
  -c, --continue                      Continue previous session
  -r, --resume=<value>                Resume a session (by ID prefix, path, or picker if omitted)
```

- 覆盖 2 家外部 harness：Claude Code、Codex。`[RUN]`
- help 文本用词是 `Import ... session`，不是 credential 或 settings 导入。`[RUN]`
- 在同一 help 输出中未发现 OpenCode、Gemini、Copilot 的 session 导入开关。`[RUN]`
- 未发现从其他 harness 导入本地凭据的开关。`auth-broker`（credential vault）与 `token` 子命令服务于 OMP 自身 provider 凭据，不是外部 harness 凭据导入。`[RUN]`
- 未测：导入后能否继续对话、导入保真度、该能力自哪个版本引入。`[UNVERIFIED]`

---

## C. eval kernel 原语

### kernel 跨 call 存活

`[OBS]` 同一会话内两次独立 eval 调用：

- cell A 写入 `globalThis.__probe = { at: 1788532891418, note: "set in cell A" }`
- cell B 读回同一对象，`at` 与 `note` 完全一致
- 同时，本会话更早一个 cell 里的 `meta` 变量仍然存活，`meta.full_name` 解析为 `chaitanyagiri/munder-difflin`

结论范围：**kernel 状态跨独立 eval 调用存活**，在同一会话内跨多个对话轮次存活。

### 工具面

- `[RUN]` `omp --help` 工具列表含 `python`（标注 `requires: omp setup python`）与 `notebook`（`Edit Jupyter notebooks`）。
- `[OBS]` 本会话 eval 工具自述 API 含 `agent()`、`workpool()`、`completion()`、`wait()`、`@tool`/`tool()`，以及 `output()`、`read()`、`display()`。

### 未测

- `agent()` 是否真能拉起递归子 agent。`[UNVERIFIED]`
- 程序化 context slicing 的实际行为。`[UNVERIFIED]`
- kernel 是否跨 `task` subagent 共享（工具自述称共享，未实测）。`[UNVERIFIED]`

---

## D. 证据边界

- OMP 侧全部来自本机 CLI 与运行中工具，非源码阅读。未读 OMP 源码确认任一机制实现。
- 本文件不建立与 Prime Agent RLM 的逐项对应关系。它只记录 OMP 侧存在哪些原语、哪些未测。
- 未安装或运行 jcode、Prime Agent、DSH、Grok Build 中任何一个作对照。
