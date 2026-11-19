import type { ToolDeclaration } from "./types";

export function record(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid object");
    return value as Record<string, unknown>;
}

export function text(value: unknown): string {
    if (typeof value !== "string") throw new Error("invalid text");
    return value;
}

export function parseTools(value: unknown): ToolDeclaration[] {
    if (!Array.isArray(value)) throw new Error("invalid tools list");
    return value.map(entry => {
        const tool = record(entry);
        return { name: text(tool.name), description: text(tool.description), inputSchema: record(tool.inputSchema) };
    });
}
