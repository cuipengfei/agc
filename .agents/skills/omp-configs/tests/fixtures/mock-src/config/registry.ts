// Minimal stand-in for OMP's config/registry.ts: just enough Setting surface
// for dump-settings.mjs (id/type/default/definition/ui/enumValues/isCredential/get).
interface MockSettingDef {
	id: string;
	type: string;
	default: unknown;
	credential?: boolean;
	values?: readonly string[];
	[key: string]: unknown;
}

interface MockSetting {
	id: string;
	type: string;
	default: unknown;
	definition: MockSettingDef;
	ui: unknown;
	enumValues: readonly string[] | undefined;
	isCredential: boolean;
	get: (s: { values: Record<string, unknown> }) => unknown;
}

const ALL: MockSetting[] = [];

export function register(def: MockSettingDef): MockSetting {
	const setting: MockSetting = {
		id: def.id,
		type: def.type,
		default: def.default,
		definition: def,
		ui: def.ui,
		enumValues: def.type === "enum" ? def.values : undefined,
		isCredential: def.credential === true,
		get: (s) => (Object.hasOwn(s.values, def.id) ? s.values[def.id] : def.default),
	};
	ALL.push(setting);
	return setting;
}

export const orderedSettings = () => ALL;

export function settingValuesEqual(a: unknown, b: unknown) {
	return JSON.stringify(a) === JSON.stringify(b);
}
