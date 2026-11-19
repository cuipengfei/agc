import { homedir } from "node:os";
import { join } from "node:path";

export const bunInstall = process.env.BUN_INSTALL ?? join(homedir(), ".bun");
const globalDir = join(bunInstall, "install/global");
// 路径由用户安装的 OMP 版本决定，必须在运行时解析。
export const acp = await import(Bun.resolveSync("@oh-my-pi/pi-utils/acp", globalDir));
export const { McpBridge } = await import(Bun.resolveSync("@oh-my-pi/pi-ai/providers/antigravity-cli/mcp-bridge", globalDir));
