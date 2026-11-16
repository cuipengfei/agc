import { register } from "./registry";
export { orderedSettings } from "./registry";

register({
	id: "app.title",
	type: "string",
	default: "Demo App",
	ui: {
		tab: "app",
		group: "general",
		label: "App Title",
		description: "Application window title",
	},
	validate: (raw) => {
		if (raw === "bad-title-v1") throw new Error("invalid title");
	},
});

register({
	id: "app.mode",
	type: "enum",
	default: "safe",
	values: ["safe", "fast"],
	ui: { tab: "app", group: "general", label: "Mode", description: "Operating mode" },
});

register({
	id: "app.fruits",
	type: "array",
	default: ["apple"],
	items: { values: ["apple", "pear"], label: "Fruit" },
	ui: { tab: "app", group: "general", label: "Fruits", description: "Allowed fruits" },
});

register({
	id: "app.endpoint",
	type: "string",
	default: "https://api.example.com",
	ui: { tab: "app", group: "network", label: "Endpoint", description: "Public API endpoint" },
});

register({
	id: "app.profile",
	type: "record",
	default: {},
	ui: { tab: "app", group: "network", label: "Profile", description: "Connection profile" },
});

register({
	id: "app.apiKey",
	type: "string",
	default: "",
	credential: true,
	ui: { tab: "app", group: "network", label: "API Key", description: "Service API key" },
});

register({
	id: "app.trim",
	type: "string",
	default: " padded ",
	normalize: (v) => String(v).trim(),
	ui: { tab: "app", group: "general", label: "Trimmed", description: "Value is trimmed" },
});
