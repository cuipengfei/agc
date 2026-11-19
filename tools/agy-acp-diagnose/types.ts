export interface ToolDeclaration {
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
}

export interface CapturedRequest {
    system: string;
    tools: ToolDeclaration[];
    model: string;
    thinking: string;
    geminiDir: string;
    cwd: string;
}

export type ProbeStatus = "ok" | "429" | "400" | "503" | "network" | "timeout" | "protocol_error" | "unexpected_tool_call" | "interrupted";
export interface ProbeResult {
    label: string;
    status: ProbeStatus;
    tools: number;
    milliseconds: number;
}
