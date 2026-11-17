import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";

// 修改当前渲染结果，保留上游模板更新以及其他 provider 的提示。
const TARGET_PROVIDER = "antigravity-cli";
const ORIGINAL = "You are omp's trusted coding assistant.";
const REPLACEMENT = "You are a helpful coding assistant.";

export default function antigravityPromptAdapter(pi: ExtensionAPI) {
    let warnedMissingText = false;

    pi.on("before_agent_start", (event, ctx) => {
        if (ctx.model?.provider !== TARGET_PROVIDER) return;

        let systemPrompt: string[] | undefined;

        for (let i = 0; i < event.systemPrompt.length; i++) {
            const original = event.systemPrompt[i];
            const updated = original.replaceAll(ORIGINAL, REPLACEMENT);
            if (updated === original) continue;

            systemPrompt ??= event.systemPrompt.slice();
            systemPrompt[i] = updated;
        }

        if (!systemPrompt) {
            if (!warnedMissingText) {
                pi.logger.warn(
                    "antigravity-prompt-adapter: target text absent; prompt unchanged",
                );
                warnedMissingText = true;
            }
            return;
        }

        return { systemPrompt };
    });
}
