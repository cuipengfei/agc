import { expect, test } from "bun:test";
import { homedir } from "node:os";
import * as path from "node:path";
const globalDir = path.resolve(process.env.BUN_INSTALL ?? path.join(homedir(), ".bun"), "install/global");
// 使用宿主当前安装路径与真实插件加载器，验证用户扩展的模块加载边界。
const { loadLegacyPiModule } = await import(Bun.resolveSync("@oh-my-pi/pi-coding-agent/extensibility/plugins/legacy-pi-compat", globalDir));
const { projectAntigravityTools } = await loadLegacyPiModule(path.resolve(import.meta.dir, "../extensions/antigravity-schema-adapter.ts"));
const { toolWireSchema } = await import(Bun.resolveSync("@oh-my-pi/pi-ai/utils/schema", globalDir));

test("可空枚举只改变模型声明，保留原始参数与其他工具", () => {
    const source = { type: "object", properties: {
        topic: { default: null, anyOf: [{ type: "string", enum: ["general", "news"] }, { type: "null" }] },
    }, required: [] };
    const target = { name: "search", description: "Search", parameters: source };
    const other = { name: "read", description: "Read", parameters: { type: "object", properties: { path: { type: "string" } } } };
    const input = [target, other];
    const output = projectAntigravityTools(input);
    expect(output).not.toBe(input);
    expect(output[0]).not.toBe(target);
    expect(output[1]).toBe(other);
    expect(toolWireSchema(output[0]).properties.topic.enum).toEqual(["general", "news"]);
    expect(source.properties.topic.anyOf[1]).toEqual({ type: "null" });
    expect(projectAntigravityTools(input)[0].parameters).toBe(output[0].parameters);
});

test("遍历联合分支且不修改default和enum中的业务对象", () => {
    const parameters = { type: "object", properties: {
        nested: { anyOf: [{ type: "object", properties: { mode: { type: ["string", "null"], enum: ["a", null] } } }, { type: "null" }] },
        data: { type: "object", default: { enum: [null] } },
    } };
    const [output] = projectAntigravityTools([{ name: "nested", description: "", parameters }]);
    expect(output.parameters.properties.nested.anyOf[0].properties.mode.enum).toEqual(["a"]);
    expect(output.parameters.properties.data.default).toEqual({ enum: [null] });
    expect(parameters.properties.nested.anyOf[0].properties.mode.enum).toEqual(["a", null]);
});

test("无可空枚举时保持原引用，null-only声明明确失败", () => {
    const tools = [{ name: "read", description: "", parameters: { type: "object", properties: {} } }];
    expect(projectAntigravityTools(tools)).toBe(tools);
    expect(projectAntigravityTools(undefined)).toBeUndefined();
    expect(() => projectAntigravityTools([{ name: "bad", description: "", parameters: { enum: [null] } }])).toThrow("null-only enum");
});
