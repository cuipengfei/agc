import { createRequire } from "node:module";
import { homedir } from "node:os";
import * as path from "node:path";
import type { Context, Model, Tool } from "@oh-my-pi/pi-ai";
import { requireSupportedEffort } from "@oh-my-pi/pi-catalog/model-thinking";
import { streamAntigravityCli } from "@oh-my-pi/pi-ai/providers/antigravity-cli";
import { normalizeSchemaForMCP, toolWireSchema } from "@oh-my-pi/pi-ai/utils/schema";
import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";
import type schemaTraverse from "json-schema-traverse";
const hostRequire = createRequire(Bun.resolveSync("@oh-my-pi/pi-ai", path.resolve(process.env.BUN_INSTALL ?? path.join(homedir(), ".bun"), "install/global")));
const traverse: typeof schemaTraverse = hostRequire("json-schema-traverse");

const projectedSchemas = new WeakMap<object, Tool["parameters"]>();

// Antigravity 拒绝枚举中的 null；只修改模型声明，保留原工具的参数校验。
export function projectAntigravityTools(tools: Context["tools"]): Context["tools"] {
    if (!tools) return tools;
    let projected: Tool[] | undefined;
    for (let i = 0; i < tools.length; i++) {
        const tool = tools[i];
        let parameters = projectedSchemas.get(tool.parameters);
        if (!parameters) {
            const wire = normalizeSchemaForMCP(toolWireSchema(tool)) as Record<string, unknown>;
            let needsProjection = false;
            traverse(wire, { cb(schema) { needsProjection ||= Array.isArray(schema.enum) && schema.enum.includes(null); } });
            parameters = tool.parameters;
            if (needsProjection) {
                const copy = structuredClone(wire);
                traverse(copy, { cb(schema) {
                    if (!Array.isArray(schema.enum) || !schema.enum.includes(null)) return;
                    const values = schema.enum.filter(value => value !== null);
                    if (values.length === 0) throw new Error(`Antigravity cannot advertise null-only enum: ${tool.name}`);
                    schema.enum = values;
                } });
                parameters = copy as Tool["parameters"];
            }
            projectedSchemas.set(tool.parameters, parameters);
        }
        if (parameters === tool.parameters) continue;
        projected ??= tools.slice();
        projected[i] = { ...tool, parameters };
    }
    return projected ?? tools;
}

export default function antigravitySchemaAdapter(pi: ExtensionAPI) {
    const api = "antigravity-schema-compat";
    pi.registerProvider("antigravity-cli", {
        api,
        streamSimple(model, context, options = {}) {
            const target = model.provider === "antigravity-cli";
            const reasoning = options.reasoning && model.reasoning && !options.disableReasoning && !options.forceReasoningOff
                ? requireSupportedEffort(model, options.reasoning)
                : undefined;
            return streamAntigravityCli(
                { ...model, api: "antigravity-acp" } as Model<"antigravity-acp">,
                target ? { ...context, tools: projectAntigravityTools(context.tools) } : context,
                { ...options, reasoning },
            );
        },
    });
    pi.on("before_agent_start", async (_event, ctx) => {
        if (ctx.model?.provider !== "antigravity-cli" || ctx.model.api === api) return;
        if (!await pi.setModel({ ...ctx.model, api })) throw new Error("Antigravity credentials are unavailable");
    });
}
