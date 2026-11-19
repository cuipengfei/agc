import { expect, test } from "bun:test";
import { parseTools } from "./validation";

test("工具声明保留协议字段并丢弃额外字段", () => {
    expect(parseTools([{ name: "search", description: "description", inputSchema: { type: "object" }, extra: "private" }])).toEqual([
        { name: "search", description: "description", inputSchema: { type: "object" } },
    ]);
});

test("工具列表或工具声明无效时拒绝处理", () => {
    for (const value of [null, {}, [null], [{ name: "search", description: "description", inputSchema: [] }], [{ name: "search", inputSchema: {} }], [{ name: 1, description: "description", inputSchema: {} }]]) {
        expect(() => parseTools(value)).toThrow();
    }
});
