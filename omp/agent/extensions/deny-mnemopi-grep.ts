// 新启动的 OMP 自动加载此扩展；在 grep 执行前检查范围，不读取或修改数据库内容。
// 正常搜索可指定安全目录、文本 glob，或排除 Mnemopi 目录与 history.db 文件系列。
import { existsSync } from "node:fs";
import { realpath, stat } from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import type { ExtensionAPI, ExtensionContext, ToolCallEvent, ToolCallEventResult } from "@oh-my-pi/pi-coding-agent";
import { InternalUrlRouter } from "@oh-my-pi/pi-coding-agent/internal-urls/router";
import {
    expandDelimitedPathEntries,
    normalizePathLikeInput,
    parseSearchPath,
    parseSearchPathPreferringLiteral,
    resolveReadPath,
    resolveToCwd,
    splitPathAndSelPreferringLiteral,
} from "@oh-my-pi/pi-coding-agent/tools/path-utils";
import { FileType, glob } from "@oh-my-pi/pi-natives";
import { getHistoryDbPath, getMemoriesDir } from "@oh-my-pi/pi-utils";

export interface ProtectedLocation {
    path: string;
    kind: "directory" | "sqlite-family";
}

const SAFE_ALTERNATIVES = [
    "安全替代操作：",
    "1. 只列目录或文件名：使用 read 的目录模式、glob，或 bash 中的 ls/stat；不要用 read/find 扫描数据库内容。",
    "2. 搜索配置、日志或源码：明确指定 extensions、rules、logs 或源码目录；也可以限定安全文本 glob，或明确排除受保护目录及 history.db 系列文件。",
    "3. 查询记忆：使用 recall 等记忆工具。检查 SQLite：由普通 shell 的独立进程使用 SQLite backup API 制作副本，再查询副本；源库已损坏时保留原始 main/WAL/SHM 做副本恢复。",
    "不要用 read 读取原始数据库、WAL、SHM，也不要删除这些文件。",
].join("\n");

function blocked(reason: string): ToolCallEventResult {
    return { block: true, reason: `${reason}\n${SAFE_ALTERNATIVES}` };
}

function inside(parent: string, candidate: string): boolean {
    const relative = path.relative(parent, candidate);
    return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

function protectedFile(candidate: string, locations: readonly ProtectedLocation[]): boolean {
    return locations.some(location => {
        if (location.kind === "directory") return inside(location.path, candidate);
        return candidate === location.path ||
            ["-wal", "-shm", "-journal"].some(suffix => candidate === location.path + suffix) ||
            candidate.startsWith(location.path + ".corrupt-");
    });
}

function overlaps(root: string, locations: readonly ProtectedLocation[]): boolean {
    return locations.some(location => inside(root, location.path) ||
        (location.kind === "directory" && inside(location.path, root)) ||
        (location.kind === "sqlite-family" && protectedFile(root, [location])));
}

async function canonical(candidate: string): Promise<string> {
    const missing: string[] = [];
    let existing = path.resolve(candidate);
    while (true) {
        try {
            return path.join(await realpath(existing), ...missing);
        } catch (error) {
            const code = (error as NodeJS.ErrnoException).code;
            if (code !== "ENOENT" && code !== "ENOTDIR") throw error;
            const parent = path.dirname(existing);
            if (parent === existing) return path.resolve(candidate);
            missing.unshift(path.basename(existing));
            existing = parent;
        }
    }
}

function exclusionsForRoot(entries: readonly string[], root: string, cwd: string): string[] {
    return entries.flatMap(entry => {
        const parsed = parseSearchPath(entry);
        if (!parsed?.glob) {
            if (/^(\.|~|\/|[A-Za-z]:[\\/])/.test(entry)) {
                const relative = path.relative(root, resolveToCwd(parsed?.basePath ?? entry, cwd)).replace(/\\/g, "/");
                return relative.startsWith("..") ? [] : [`/${relative || "**/*"}`];
            }
            return [entry];
        }
        if (!/^(\.|~|\/|[A-Za-z]:[\\/])/.test(entry)) return [parsed.glob];
        const relative = path.relative(root, resolveToCwd(parsed.basePath, cwd)).replace(/\\/g, "/");
        if (relative.startsWith("..")) return [];
        return [`/${relative ? `${relative}/${parsed.glob}` : parsed.glob}`];
    });
}

async function excludedPaths(patterns: readonly string[], root: string, gitignore: boolean): Promise<{ files: Set<string>; directories: string[] }> {
    const files = new Set<string>();
    const directories: string[] = [];
    for (const raw of patterns) {
        const pattern = raw.trim().replace(/\\/g, "/").replace(/\/+$/, "");
        if (!pattern) continue;
        const selected = pattern.startsWith("/") ? pattern.slice(1) :
            (!pattern.includes("/") && !pattern.startsWith("**") ? `**/${pattern}` : pattern);
        const matches = await glob({ path: root, pattern: selected, recursive: !pattern.startsWith("/"), hidden: true, gitignore, followLinks: false });
        if (matches.limitReached) throw new Error("排除范围枚举未完成");
        for (const match of matches.matches) {
            const absolute = path.resolve(root, match.path);
            if (match.fileType === FileType.Dir) directories.push(absolute);
            else if (match.fileType === FileType.File) files.add(absolute);
        }
    }
    return { files, directories };
}

// 使用与 Grep 相同的路径解析和原生 glob Selector；枚举只读取目录元数据及忽略规则文本。
export function createGrepGuard(locations: readonly ProtectedLocation[]) {
    return async (event: ToolCallEvent, ctx: ExtensionContext): Promise<ToolCallEventResult | void> => {
        if (event.toolName !== "grep") return;
        try {
            const input = event.input as { path?: string; gitignore?: boolean };
            const entries = await expandDelimitedPathEntries(input.path ? [input.path] : [], ctx.cwd, { exclusionParts: true });
            const excluded = entries.filter(entry => entry.startsWith("!") && !existsSync(resolveToCwd(entry, ctx.cwd))).map(entry => entry.slice(1));
            const selected = entries.filter(entry => !(entry.startsWith("!") && !existsSync(resolveToCwd(entry, ctx.cwd))));
            if (selected.length === 0) selected.push(ctx.cwd);
            const roots: ProtectedLocation[] = [];
            for (const location of locations) {
                roots.push({ ...location, path: path.resolve(location.path) });
                const resolved = await canonical(location.path);
                if (resolved !== path.resolve(location.path)) roots.push({ ...location, path: resolved });
            }
            for (let entry of selected) {
                entry = normalizePathLikeInput(entry);
                if (/^https?:\/\//i.test(entry)) continue;
                if (entry.startsWith("file://")) entry = fileURLToPath(entry);
                const router = InternalUrlRouter.instance();
                entry = router.normalize(entry);
                const target = await router.target(entry, {
                    cwd: ctx.cwd,
                    localProtocolOptions: ctx.localProtocolOptions,
                    sessionFile: ctx.sessionManager?.getSessionFile(),
                    sessionId: ctx.sessionManager?.getSessionId(),
                });
                if (target && !router.canHandle(entry)) throw new Error("URI 协议未注册，无法确认本地目标");
                if (target?.kind === "resource") {
                    if (target.spec.backing === "file") throw new Error("文件协议无法定位本地目标");
                    continue;
                }
                if (target?.kind === "file") entry = target.path;
                else if (/^[a-z][a-z0-9+.-]*:\/\//i.test(entry)) throw new Error("无法定位 URI 搜索范围");
                const clean = (await splitPathAndSelPreferringLiteral(entry, ctx.cwd)).path;
                const parsed = await parseSearchPathPreferringLiteral(clean, ctx.cwd);
                const root = resolveReadPath(parsed.basePath, ctx.cwd);
                const realRoot = await canonical(root);
                if (protectedFile(realRoot, roots)) return blocked("已拒绝本次 grep：目标位于 Mnemopi 数据目录或提示历史 SQLite 文件系列，普通文件读取可能使 OMP 持有的 SQLite 锁失效。");
                if (!overlaps(realRoot, roots)) continue;
                if (!(await stat(root)).isDirectory()) continue;
                const included = await glob({ path: root, pattern: parsed.glob ?? "**/*", recursive: false, hidden: true, gitignore: input.gitignore ?? true, followLinks: false });
                if (included.limitReached) throw new Error("搜索范围枚举未完成");
                const dangerous = included.matches.filter(match => match.fileType === FileType.File && protectedFile(path.resolve(realRoot, match.path), roots));
                if (dangerous.length === 0) continue;
                const omit = await excludedPaths(exclusionsForRoot(excluded, root, ctx.cwd), root, input.gitignore ?? true);
                if (dangerous.some(match => {
                    const absolute = path.resolve(root, match.path);
                    return !omit.files.has(absolute) && !omit.directories.some(directory => inside(directory, absolute));
                })) return blocked("已拒绝本次 grep：父目录搜索的实际候选包含 Mnemopi 数据或 history.db 系列文件；关闭忽略规则也不会绕过防护。");
            }
        } catch {
            return blocked("无法安全确认本次 grep 的搜索范围，已拒绝执行。请改为明确的安全文本路径或目录。");
        }
    };
}

export default function denyMnemopiGrep(pi: ExtensionAPI) {
    pi.on("tool_call", createGrepGuard([
        { path: path.join(getMemoriesDir(), "mnemopi"), kind: "directory" },
        { path: getHistoryDbPath(), kind: "sqlite-family" },
    ]));
}
