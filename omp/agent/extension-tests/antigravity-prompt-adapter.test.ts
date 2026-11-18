import { describe, expect, mock, test } from "bun:test";
import { homedir } from "node:os";
import * as path from "node:path";
import type {
    BeforeAgentStartEvent,
    BeforeAgentStartResult,
    ExtensionAPI,
    ExtensionContext,
    ExtensionRuntime,
} from "@oh-my-pi/pi-coding-agent";
import type antigravityPromptAdapter from "../extensions/antigravity-prompt-adapter.ts";

const EXTENSION_PATH = path.resolve(import.meta.dir, "../extensions/antigravity-prompt-adapter.ts");
const LOADER_PATH = Bun.resolveSync(
    "@oh-my-pi/pi-coding-agent/extensibility/plugins/legacy-pi-compat",
    path.resolve(process.env.BUN_INSTALL ?? path.join(homedir(), ".bun"), "install/global"),
);
// 使用运行时解析的 OMP 插件加载器，验证真实扩展加载边界。
const { loadLegacyPiModule } = await import(LOADER_PATH);
const { default: register } = await loadLegacyPiModule(EXTENSION_PATH) as { default: typeof antigravityPromptAdapter };
const RUNNER_PATH = Bun.resolveSync(
    "@oh-my-pi/pi-coding-agent/extensibility/extensions/runner",
    path.resolve(process.env.BUN_INSTALL ?? path.join(homedir(), ".bun"), "install/global"),
);
const SESSION_PATH = Bun.resolveSync(
    "@oh-my-pi/pi-coding-agent/session/session-manager",
    path.resolve(process.env.BUN_INSTALL ?? path.join(homedir(), ".bun"), "install/global"),
);
// 从当前安装版本载入真实上下文构造器，避免自行定义事件上下文接口。
const { ExtensionRunner } = await import(RUNNER_PATH);
const { SessionManager } = await import(SESSION_PATH);

const ORIGINAL = "You are omp's trusted coding assistant.";
const REPLACEMENT = "You are a helpful coding assistant.";
type Handler = (
    event: BeforeAgentStartEvent,
    ctx: ExtensionContext,
) => BeforeAgentStartResult | undefined;

function fixture() {
    let handler: Handler | undefined;
    const warn = mock(() => {});
    const runner = new ExtensionRunner(
        [],
        {} as ExtensionRuntime,
        "/tmp",
        SessionManager.inMemory("/tmp"),
        {} as ExtensionContext["modelRegistry"],
    );
    register({
        logger: { warn },
        on(event: string, callback: Handler) {
            if (event === "before_agent_start") handler = callback;
        },
    } as unknown as ExtensionAPI);
    if (!handler) throw new Error("Prompt handler was not registered");
    const run = handler;
    return {
        warn,
        apply(systemPrompt: string[], provider?: string) {
            const model = provider === undefined
                ? undefined
                : { provider } as NonNullable<ExtensionContext["model"]>;
            const ctx = runner.createContext(model);
            return run({ type: "before_agent_start", prompt: "hello", systemPrompt }, ctx);
        },
    };
}

describe("antigravity-prompt-adapter", () => {
    test("其他 provider 和未选模型的提示保持原样且不记录警告", () => {
        const f = fixture();
        const parts = [ORIGINAL, "Keep tools and context unchanged."];
        const snapshot = [...parts];
        for (const provider of [undefined, "openai", "anthropic", "google-antigravity", "antigravity-cli-extra"]) {
            expect(f.apply(parts, provider)).toBeUndefined();
            expect(parts).toEqual(snapshot);
        }
        expect(f.warn).not.toHaveBeenCalled();
    });

    test("替换任意位置的全部匹配并保留其余渲染结果", () => {
        const f = fixture();
        const parts = [
            "Context before the identity.",
            `Header\n${ORIGINAL}\nTool descriptions remain here.\n${ORIGINAL}`,
            "Skills and project rules remain here.",
            ORIGINAL,
        ];
        const snapshot = [...parts];
        Object.freeze(parts);
        const result = f.apply(parts, "antigravity-cli");
        expect(result?.systemPrompt).toEqual([
            parts[0],
            `Header\n${REPLACEMENT}\nTool descriptions remain here.\n${REPLACEMENT}`,
            parts[2],
            REPLACEMENT,
        ]);
        expect(parts).toEqual(snapshot);
        expect(result?.systemPrompt).not.toBe(parts);
        expect(f.warn).not.toHaveBeenCalled();
    });

    test("上游措辞变化时保留提示且只警告一次", () => {
        const f = fixture();
        const parts = ["New upstream identity.", "Current tools and skills."];
        expect(f.apply(parts, "openai")).toBeUndefined();
        expect(f.warn).not.toHaveBeenCalled();
        expect(f.apply(parts, "antigravity-cli")).toBeUndefined();
        expect(f.apply(parts, "antigravity-cli")).toBeUndefined();
        expect(f.warn).toHaveBeenCalledTimes(1);
        expect(parts).toEqual(["New upstream identity.", "Current tools and skills."]);
    });

    test("保留提交助手语义并改写已确认触发行", () => {
        const f = fixture();
        const commit = 'To commit your changes, use the eval `commit` namespace (`d = await commit.draft()`, then `await d.commit("subject", ["- body"])`), not `git add`/`git commit`: it selects only the lines you and your subagents wrote and never touches other agents\' staged or unstaged work.';
        const input = [`Before\n${commit}\nAfter`];
        expect(f.apply(input, "openai")).toBeUndefined();
        const result = f.apply(input, "antigravity-cli");
        expect(result?.systemPrompt).toEqual(['Before\nCreate commits with the eval commit helper: d = await commit.draft(); await d.commit("subject", ["- body"]). The helper selects changes authored by this session and preserves other pending work.\nAfter']);
        expect(input).toEqual([`Before\n${commit}\nAfter`]);
    });

    test("切换 provider 后重新按当前模型判断", () => {
        const f = fixture();
        const parts = [ORIGINAL];
        expect(f.apply(parts, "antigravity-cli")?.systemPrompt).toEqual([REPLACEMENT]);
        expect(f.apply(parts, "openai")).toBeUndefined();
        expect(parts).toEqual([ORIGINAL]);
        expect(f.apply(parts, "antigravity-cli")?.systemPrompt).toEqual([REPLACEMENT]);
    });
});
