# 移除 GitHub 普通遥测的服务端状态拦截并验证被接受

- **Hypothesis**：运行中的 copilot-api 实例，其 GitHub 普通使用统计被服务端下发的遥测状态字段错误拦截；移除该判断后，普通统计能按本地开关与采样正常发出并被收集端接受。
- **Baseline**：五个实例（本地端口 4142–4146）内存中 GitHub 格式回执 `{"itemsReceived":…,"itemsAccepted":…,"appId":…,"errors":…}` 分别为：4142 零条、4143 一条（16 位字符串形式）、4144 零条、4145 零条、4146 零条。当时 `trackEvent()` 内含服务端状态判断，状态为关闭时直接返回。
- **Change**：删除 `trackEvent()` 中的服务端状态提前返回，仅保留本地 `getConfig().telemetry === true` 与每事件 `Math.random() <= 0.3` 采样；服务端状态继续写入 `auth.new_token` 的 `telemetryEnabled` 属性。同时把两条通道的系统与内核指纹字段删除、机器与设备标识改为应用目录内随机持久化、`apiType` 对齐官方字面量、成功事件的默认首包时间改为不超过总耗时、反馈事件改为共用同一次随机抽样。
- **Context**：本机五实例均为普通常驻方式启动，启动时刻晚于目标提交，共用同一配置文件且 `telemetry` 为真；上游为 GitHub Copilot 企业席位，服务端下发的增强遥测状态为关闭。观测手段为进程外只读：以管理员权限读取进程驻留内存页，按 UTF-8 与 UTF-16-LE 两种编码寻找 `"itemsReceived"` 起始的 JSON 对象，并校验其含 `itemsReceived`、`itemsAccepted`、`appId`、`errors` 四个键。未修改应用代码，未重启实例。
- **Steps**：①对每个实例先做基线全驻留扫描；②用 `max_tokens: 1` 的极小请求触发（每轮 6 个，聊天可用模型）；③每轮后等待 8 秒再扫；④出现 `itemsAccepted >= 1` 且 `errors` 为空即停止该实例；⑤对照实验只在干净实例上做，避免把其他流量写入的文本误当回执。
- **Observations**：4142 基线零条，一轮 6 个请求全 200，随后 1 条 `itemsReceived: 1, itemsAccepted: 1, errors` 0。4143 基线已有 1 条 16 位形式，一轮后出现 1 条 8 位形式，共两条记录。4144 基线零条，一轮后 1 条，`errors` 0。4145 基线零条，一轮后 1 条，`errors` 0。4146 基线零条，第一轮 6 个未命中，第二轮再 6 个后 1 条，`errors` 0。五实例全部取得 GitHub 格式接受回执。另在 4146 上取到 Microsoft 收集端响应头 `Server: Microsoft-HTTPAPI/2.0` 与响应体 `{"acc":1}`。
- **Evidence**：观测脚本与逐实例输出为一次性临时文件，实验结束后已删除；关键计数与判定条件记录在 `raw/copilot-gateway/2026-11-27-copilot-telemetry-two-channels.md`。上游实现依据为官方仓库 `microsoft/vscode` 的 `extensions/copilot`，旧独立仓库已声明归档。
- **Verdict**：GitHub 普通遥测恢复发送且被收集端接受；同一实例的 Microsoft 通道亦被接受。回执只含计数、不含事件名，因此无法判定被接受的是五个 GitHub 事件中的哪一个；回执与具体某次请求的对应关系按时间先后推断，非逐请求对齐。
- **Follow-up**：确认流式分支与 WebSocket 分支是否同样触发成功事件；确认被拒形态（`itemsAccepted: 0` 且 `errors` 非空）在当前版本是否仍会出现；若更换内核，需重新验证内存扫描方法。
