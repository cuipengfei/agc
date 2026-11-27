import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";

const TARGET_PROVIDER = "c8787-chat";

export default function c8787CacheWarming(pi: ExtensionAPI) {
	pi.on("cache_warming_decision", (event, ctx) => {
		if (ctx.model?.provider !== TARGET_PROVIDER) return;
		if (!event.method) return;
		if (event.missCost <= event.warmCost) return;
		if (event.spentCost + event.warmCost > event.missCost) return;
		return { action: "warm" };
	});
}
