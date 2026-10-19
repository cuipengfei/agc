# 直连 Copilot 真实后端复现 Gemini 3.8 Flash 缓存归零后恢复

- **Hypothesis**：绕过 OMP、Headroom 与本机 copilot-api 后，直连 Copilot 真实后端仍会出现 Gemini 3.8 Flash 缓存读取量归零后恢复；若不复现，则本地链路嫌疑回升。
- **Baseline**：4139 `/api/history`（源码 `DEFAULT_HISTORY_LIMIT = 200`，窗口 11:44:09–12:01:32 UTC）显示：本会话 Gemini 3.8 Flash 主对话 39 次请求出现 3 次缓存读取量下降（69,684→42,668→77,665；93,901→0→94,022；101,937→98,098→105,976 tokens）；同会话 GPT 6.1 Sol 排除首次请求后 57 次无下降，加权缓存读取比例 98.65%。`composer-prediction` 辅助请求（78,252 tokens 缓存、81.44%）已剔除，不计入主对话。
- **Change**：按 `copilot-backend-tester` skill，直连 `https://api.business.githubcopilot.com/chat/completions`，固定 session、system instructions 与工具定义；每轮请求前断言既有 messages 序列逐条不变，仅追加真实 assistant 回复、工具结果或继续指令；第 4 轮前等待 290 秒。
- **Context**：4142 业务席位凭据经 tester skill 的认证模块获取，凭据仅在内存处理；运行时段 2026-10-19；请求预算最多 12 次，任何错误立即停止；流式输出、`include_usage: true`；模型经实时 `/models` 目录确认，响应回报 `gemini-3.8-flash`。
- **Steps**：本地自检（语料 74,000 tokens、fixtures 唯一性）→ 前置 2 次请求（第 1 次运行，模型以 `stop` 结束回复，探针按断言停止，未伪造续轮）→ 第 2 次运行以新 session 重新开始，主实验 5 轮 → 取得“下降 + 恢复”证据后提前停止。
- **Observations**：两次运行的请求全部 HTTP 200。前置运行（第 1 次运行，独立 session，2 次）：93,015 / 0 与 95,767 / 90,029，合计 input 188,782、cached 90,029。主实验运行（第 2 次运行，5 轮，input / cached）：r1 93,015 / 0；r2 95,767 / 90,029（94.01%）；r3 95,892 / 90,023（93.88%）；等待 290 秒后 r4 98,675 / 0；r5 98,819 / 94,088（95.21%）；合计 input 482,168、cached 274,140。两次运行合计输入 670,950 tokens，报告的缓存读取 364,169 tokens。
- **Evidence**：`artifact://44`（探针运行输出）；`/tmp/agc-gemini-cache-results.jsonl`（原始逐轮记录）；`/tmp/agc-gemini-cache-probe.mjs`（探针脚本）。数值摘录同步存入 `raw/prompt-caching/2026-10-19-copilot-gemini-direct-backend-probe.md`。
- **Verdict**：现象在 Copilot 服务路径上可独立复现，OMP、Headroom、本机 copilot-api 非必要条件；具体责任层（Google 缓存保留/淘汰策略 vs Copilot 接入路径的路由或配置）未定。一次复现只证明该路径能够产生此现象，不构成故障判定。
- **Follow-up**：固定整个请求 body 重复发送（不追加任何历史）以区分“缓存保留/淘汰”与“历史追加导致前缀变化”；对原会话 11:44:46 的短间隔（约 18 秒）下降单独取证，本次未复现该形态；如获 GCP 凭据，再做 Google 原生入口同节奏对照。
