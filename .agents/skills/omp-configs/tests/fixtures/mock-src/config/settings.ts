// Minimal stand-in for OMP's config/settings.ts: configured values come from a
// values.json inside the agent dir, never from a real ~/.omp or the network.
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const Settings = {
	async loadReadOnly({ agentDir }: { agentDir: string; cwd: string }) {
		let values: Record<string, unknown> = {};
		try {
			values = JSON.parse(readFileSync(join(agentDir, "values.json"), "utf8"));
		} catch {}
		return {
			values,
			isConfigured: (s: { id: string }) => Object.hasOwn(values, s.id),
		};
	},
};
