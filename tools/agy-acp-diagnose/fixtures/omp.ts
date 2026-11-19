#!/usr/bin/env bun
import { stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

const globalDir = join(process.env.BUN_INSTALL ?? join(homedir(), ".bun"), "install/global");
// OMP 安装路径由 BUN_INSTALL 决定，使用当前版本的真实 Host。
const { AgyHost } = await import(Bun.resolveSync("@oh-my-pi/pi-ai/providers/antigravity-cli/host", globalDir));
const { getLogsDir } = await import(Bun.resolveSync("@oh-my-pi/pi-utils/dirs", globalDir));
if (!getLogsDir().startsWith(join(process.env.XDG_STATE_HOME!, "omp"))) throw new Error("OMP logs are not isolated");
await stat(join(process.env.XDG_STATE_HOME!, "omp"));
const host = new AgyHost(process.env.FAKE_GEMINI_DIR!);
const writer = { done: false, output: { content: [] }, usage() {}, finish() {} };
try {
    await host.step({ id: "fixture-model" }, {
        systemPrompt: ["SENSITIVE_SYSTEM_SENTINEL\nSAFE_LINE"],
        tools: [{ name: "search", description: "SENSITIVE_TOOL_SENTINEL", parameters: { type: "object", properties: {} } }],
        messages: [{ role: "user", content: [{ type: "text", text: "Say OK only." }], timestamp: Date.now() }],
    }, { reasoning: "medium" }, writer);
} catch {
    // 捕获端释放后，空响应会使 Host 终止；测试只观察实际请求边界。
} finally {
    await host.dispose();
}
