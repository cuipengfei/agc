import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";

const TARGET_PROVIDER = "c8787-chat";

export default function c8787CacheWarming(pi: ExtensionAPI) {
	pi.on("cache_warming_decision", (event, ctx) => {
		const model = ctx.model;
		if (
			model?.provider !== TARGET_PROVIDER &&
			!(model?.provider === "c8787" && model.id.startsWith("gpt-") && model.api === "openai-responses")
		) return;
		if (!event.method) return { action: "stop" };
		if (event.missCost <= event.warmCost) return { action: "stop" };
		if (event.spentCost + event.warmCost > event.missCost) return { action: "stop" };
		return { action: "warm" };
	});
}
