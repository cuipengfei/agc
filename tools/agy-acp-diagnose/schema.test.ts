import { expect, test } from "bun:test";
import { join } from "node:path";
import { compareSchemas } from "./schema";

const cli = join(import.meta.dir, "cli.ts");

async function run(input: string) {
    const child = Bun.spawn([process.execPath, cli, "schema"], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
    child.stdin.write(input);
    await child.stdin.end();
    const [stdout, stderr, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
    return { stdout, stderr, code };
}

test("比较源 MCP 声明和 OMP wire 结构而不输出字段值", async () => {
    const input = JSON.stringify({ tools: [{ name: "search", description: "SENSITIVE_DESCRIPTION_SENTINEL", inputSchema: {
        type: "object", properties: { topic: { anyOf: [{ type: "string", enum: ["general", "SENSITIVE_ENUM_SENTINEL"] }, { type: "null" }] } },
    } }] });
    const result = await run(input);
    expect(result.code).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).not.toContain("SENSITIVE_DESCRIPTION_SENTINEL");
    expect(result.stdout).not.toContain("SENSITIVE_ENUM_SENTINEL");
    const report = JSON.parse(result.stdout);
    expect(report.tools[0].name).toBe("search");
    const topic = report.tools[0].changes.find((change: { path: string }) => change.path === "/properties/topic");
    expect(topic.source.anyOf).toBe(2);
    expect(topic.wire.enumIncludesNull).toBe(true);
    expect(topic.wire.enumSize).toBe(3);
    expect(topic.wire.type).toEqual(["string", "null"]);
    const branch = report.tools[0].changes.find((change: { path: string }) => change.path === "/properties/topic/anyOf/0");
    expect(branch.source.type).toBe("string");
});

test("无效输入只输出通用错误", async () => {
    const result = await run("{ SENSITIVE_INPUT_SENTINEL");
    expect(result.code).not.toBe(0);

    expect(result.stderr).not.toContain("SENSITIVE_INPUT_SENTINEL");
});
test("脱敏工具名和参数名后仍比较有效的源声明", () => {
    const report = compareSchemas({ tools: [{ name: "get_api_key", inputSchema: {
        type: "object", properties: { api_key: { anyOf: [{ type: "string", enum: ["PRIVATE_ENUM"] }, { type: "null" }] } },
    } }] });
    expect(report.tools[0].name).toBe("<redacted>");
    const change = report.tools[0].changes.find((entry: { path: string }) => entry.path === "/properties/<redacted>");
    expect(change?.wire?.enumIncludesNull).toBe(true);
    expect(JSON.stringify(report)).not.toContain("PRIVATE_ENUM");
});

test("schema 比较拒绝格式无效的工具声明", () => {
    for (const value of [null, "invalid", [], {}, { tools: [null] }, { tools: [{ name: "", inputSchema: {} }] }, { tools: [{ name: "search", inputSchema: [] }] }, { tools: [{ name: "search", inputSchema: "invalid" }] }, { tools: [{ name: "search", inputSchema: 42 }] }, { tools: [{ name: "search", inputSchema: true }] }, { tools: [{ name: "search" }] }]) {
        expect(() => compareSchemas(value)).toThrow();
    }
});

test("不输出 schema 中不受支持的类型值", () => {
    for (const type of ["PRIVATE_TYPE", ["string", "PRIVATE_TYPE"]]) {
        const report = compareSchemas({ tools: [{ name: "search", inputSchema: { type: "object", properties: {
            topic: { type, anyOf: [{ type: "string", enum: ["general"] }, { type: "null" }] },
        } } }] });
        expect(JSON.stringify(report)).not.toContain("PRIVATE_TYPE");
    }
});
