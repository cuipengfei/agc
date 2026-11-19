import { parseArgs } from "node:util";
import { mcpStatus } from "./status";
import { diagnose } from "./diagnose";
import { compareSchemas } from "./schema";
import { readServerTools } from "./schema-source";

const help = `Usage: bun tools/agy-acp-diagnose/cli.ts [mcp-status [--config FILE] | schema [--live --server NAME --config FILE] | diagnose --live --max-requests N --model PROVIDER/MODEL --thinking LEVEL [--bisect] | --help]\n`;

async function showStatus(args: string[]): Promise<void> {
    const { values } = parseArgs({ args, options: { config: { type: "string" } }, strict: true });
    console.log(JSON.stringify(await mcpStatus(values.config)));
}

async function showSchema(args: string[]): Promise<void> {
    const { values } = parseArgs({ args, options: { live: { type: "boolean" }, server: { type: "string" }, config: { type: "string" } }, strict: true });
    if (values.server) {
        if (!values.live || !values.config || !/^[A-Za-z0-9_./:@-]{1,128}$/.test(values.server)) throw new Error("invalid schema options");
        console.log(JSON.stringify(compareSchemas(await readServerTools(values.server, values.config))));
        return;
    }
    if (args.length) throw new Error("invalid schema options");
    const input = await Bun.stdin.text();
    if (input.length > 16 * 1024 * 1024) throw new Error("schema input too large");
    console.log(JSON.stringify(compareSchemas(JSON.parse(input))));
}

function diagnoseOptions(args: string[]) {
    const { values } = parseArgs({ args, options: {
        live: { type: "boolean" }, "max-requests": { type: "string" }, model: { type: "string" },
        thinking: { type: "string" }, bisect: { type: "boolean" },
    }, strict: true });
    const count = Number(values["max-requests"]);
    if (!values.live || !Number.isInteger(count) || count < 3 || count > 64) throw new Error("invalid request budget");
    if (!values.model || !/^antigravity-cli\/[A-Za-z0-9._-]+$/.test(values.model)) throw new Error("invalid model");
    if (!values.thinking || !["minimal", "low", "medium", "high", "xhigh", "max"].includes(values.thinking)) throw new Error("invalid thinking level");
    return { model: values.model, thinking: values.thinking, maxRequests: count, bisect: Boolean(values.bisect) };
}

async function runDiagnosis(args: string[]): Promise<void> {
    const options = diagnoseOptions(args);
    const controller = new AbortController();
    const interrupt = () => { process.exitCode = 130; controller.abort(); };
    const terminate = () => { process.exitCode = 143; controller.abort(); };
    process.once("SIGINT", interrupt);
    process.once("SIGTERM", terminate);
    const report = await diagnose(options, controller.signal)
        .finally(() => { process.off("SIGINT", interrupt); process.off("SIGTERM", terminate); });
    console.log(JSON.stringify(report));
    if (report.status !== "complete" && !controller.signal.aborted) process.exitCode = 1;
}

async function main(args: string[]): Promise<void> {
    if (args.length === 0) return showStatus([]);
    const options = args.slice(1);
    switch (args[0]) {
        case "mcp-status": return showStatus(options);
        case "schema": return showSchema(options);
        case "diagnose": return runDiagnosis(options);
        case "--help":
        case "-h":
            if (options.length === 0) { process.stdout.write(help); return; }
    }
    throw new Error("invalid command");
}

if (import.meta.main) {
    try {
        await main(process.argv.slice(2));
    } catch {
        console.error("诊断命令失败：请检查参数、配置与运行环境。使用 --help 查看用法。");
        if (process.exitCode !== 130 && process.exitCode !== 143) process.exitCode = 1;
    }
}
