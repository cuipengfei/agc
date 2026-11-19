import { createRequire } from "node:module";
import { homedir } from "node:os";
import { join } from "node:path";

const globalDir = join(process.env.BUN_INSTALL ?? join(homedir(), ".bun"), "install/global");
const hostRequire = createRequire(Bun.resolveSync("@oh-my-pi/pi-ai", globalDir));
const traverse = hostRequire("json-schema-traverse");
// 使用当前安装的 OMP schema 转换，路径由运行时安装位置决定。
const { normalizeSchemaForMCP, toolWireSchema } = await import(Bun.resolveSync("@oh-my-pi/pi-ai/utils/schema", globalDir));
const types = ["null", "boolean", "object", "array", "number", "integer", "string"];
const sensitive = /secret|token|password|credential|authorization|api[-_]?key/i;

function shape(schema: Record<string, unknown>) {
    const result: Record<string, unknown> = {};
    if (typeof schema.type === "string" && types.includes(schema.type)) result.type = schema.type;
    if (Array.isArray(schema.type) && schema.type.every(value => typeof value === "string" && types.includes(value))) result.type = schema.type;
    if (Array.isArray(schema.enum)) {
        result.enumSize = schema.enum.length;
        result.enumIncludesNull = schema.enum.includes(null);
    }
    for (const key of ["anyOf", "oneOf", "allOf"]) {
        if (Array.isArray(schema[key])) result[key] = schema[key].length;
    }
    return result;
}

function shapes(schema: Record<string, unknown>) {
    const result = new Map<string, Record<string, unknown>>();
    traverse(schema, { cb(node: Record<string, unknown>, pointer: string) { result.set(pointer, shape(node)); } });
    return result;
}

function safePointer(pointer: string): string {
    return pointer.split("/").map(part => /^[A-Za-z0-9_~.-]{0,80}$/.test(part) && !sensitive.test(part) ? part : "<redacted>").join("/");
}

function sourceTool(value: unknown) {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid tool");
    const tool = value as Record<string, unknown>;
    if (typeof tool.name !== "string" || !/^[A-Za-z0-9_.-]{1,128}$/.test(tool.name)) throw new Error("invalid tool name");
    if (!tool.inputSchema || typeof tool.inputSchema !== "object" || Array.isArray(tool.inputSchema)) throw new Error("invalid tool schema");
    return { name: tool.name, inputSchema: tool.inputSchema as Record<string, unknown> };
}

function differences(source: Record<string, unknown>, wire: Record<string, unknown>) {
    const before = shapes(source);
    const after = shapes(wire);
    const paths = new Set([...before.keys(), ...after.keys()]);
    return [...paths].flatMap(pointer => {
        const sourceShape = before.get(pointer) ?? null;
        const wireShape = after.get(pointer) ?? null;
        return JSON.stringify(sourceShape) === JSON.stringify(wireShape) ? [] : [{ path: safePointer(pointer), source: sourceShape, wire: wireShape }];
    });
}

export function compareSchemas(value: unknown) {
    if (!value || typeof value !== "object" || !("tools" in value) || !Array.isArray(value.tools)) throw new Error("invalid tools list");
    const tools = value.tools.map((entry: unknown) => {
        const tool = sourceTool(entry);
        const parameters = normalizeSchemaForMCP(tool.inputSchema);
        const wire = normalizeSchemaForMCP(toolWireSchema({ name: tool.name, description: "", parameters }));
        return { name: sensitive.test(tool.name) ? "<redacted>" : tool.name, changes: differences(tool.inputSchema, wire) };
    });
    return { tools };
}
