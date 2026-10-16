import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent"

/**
 * OMP OpenCode 请求适配器；新进程自动加载，无需修改模型配置。
 * 仅处理 hostname 精确为 opencode.ai 的 HTTP(S) 请求，全部路径均适用。
 * 其他域名原参数同步直通，直接返回底层 Promise；同步异常转为 Promise rejection。
 *
 * UA 统一为下方 USER_AGENT。x-session-id 格式无效时懒生成并在实例内复用，
 * 重启或重新加载后重新生成；已有有效值保持。格式检查不保证服务端接受。
 * 已有但格式无效的 x-opencode-session 使用修正后的 x-session-id，避免 OMP UUID 冲突。
 *
 * 按 Chat Completions、Responses、Anthropic、Gemini 格式追加缺少的 read 声明，
 * 保留既有工具、消息和 stream；错误同名工具仍保留，provider 可能拒绝重复名称。
 * 这里仅适配声明，不注册或启用本地工具。无效 JSON、非数组 tools 原文转发并记录诊断。
 * 追加工具后移除旧 Content-Length；无需追加时保留原正文，不重新序列化。
 * Content-Type 判定和正文状态每次请求复用；无正文、字符串正文同步进入底层 fetch。
 *
 * 保留 Request、signal、proxy/TLS 选项及 fetch.preconnect，响应原样返回且不读取正文。
 * 提前缓存旧 fetch 或使用独立 HTTP client 的调用不经过此包装。
 * 卸载时仅恢复仍由本扩展持有的全局 fetch，不覆盖后来安装的包装。
 *
 * pi.logger：info 记录启停和修正，debug 记录未修正和完成，warn 记录诊断与失败阶段。
 * 默认日志位于 ~/.omp/logs/omp.<DATE>.<PID>.log，受 OMP_LOG_LEVEL 控制。
 * 日志不记录凭据、session 原值、完整 URL、请求或响应正文；其他域名无请求日志。
 * openCodeSessionReplaced 标记 x-opencode-session 修正，不记录其原值。
 *
 * 来源侧离线测试：bun test ~/.omp/agent/tests/opencode-request-adapter.test.ts
 * 测试隔离 HTTP transport，不发送联网请求。
 */

// ─── Constants ──────────────────────────────────────────────

const USER_AGENT = "opencode/2.0.29"
const SESSION_ID = /^ses_[0-9a-f]{12}[0-9A-Za-z]{14}$/
const ID_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
const READ_PARAMETERS = {
  type: "object",
  properties: { path: { type: "string" } },
  required: ["path"],
  additionalProperties: false,
}
const TARGET_HOST = "opencode.ai"
const ENDPOINT_PATTERN = /\/(chat\/completions|responses|messages|models|embeddings)\/?$/
const LOG_PREFIX = "opencode-request-adapter"

// ─── Types ──────────────────────────────────────────────────

type JsonObject = Record<string, unknown>
type FetchOptions = NonNullable<Parameters<typeof fetch>[1]>
type Logger = Pick<ExtensionAPI["logger"], "info" | "debug" | "warn">
type RequestMeta = { requestId: number; method: string; endpoint: string }
type HeaderChanges = {
  userAgentReplaced: boolean
  sessionReplaced: boolean
  openCodeSessionReplaced: boolean
}
type BodyExtraction = {
  text: string | undefined
  forwardedStream: ReadableStream | undefined
  next: FetchOptions
  jsonType: boolean
  readAdded: boolean
  toolsBefore: number | undefined
}

// ─── Primitives ─────────────────────────────────────────────

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function createSessionId(): string {
  const prefix = ((~(BigInt(Date.now()) * 0x1000n + 1n)) & 0xffffffffffffn).toString(16).padStart(12, "0")
  let suffix = ""
  for (const byte of crypto.getRandomValues(new Uint8Array(14))) suffix += ID_CHARS[byte % 62]
  return `ses_${prefix}${suffix}`
}

function isJsonContentType(contentType: string): boolean {
  return /(?:application\/json|\+json)(?:\s*;|$)/i.test(contentType)
}

// ─── Domain guard: decide whether a URL is in scope ─────────

function parseTargetUrl(input: Parameters<typeof fetch>[0]): URL | undefined {
  const url = URL.parse(input instanceof Request ? input.url : String(input))
  if (!url || (url.protocol !== "https:" && url.protocol !== "http:") || url.hostname !== TARGET_HOST) return
  return url
}

function buildMeta(
  sequence: number,
  init: FetchOptions | undefined,
  request: Request | undefined,
  url: URL,
): RequestMeta {
  return {
    requestId: sequence,
    method: (init?.method ?? request?.method ?? "GET").toUpperCase(),
    endpoint: url.pathname.match(ENDPOINT_PATTERN)?.[1] ?? "other",
  }
}

// ─── Session ID management: lazy creation, instance-scoped ──

class SessionResolver {
  #id: string | undefined

  resolve(headers: Headers): { replaced: boolean } {
    const replaced = !SESSION_ID.test(headers.get("x-session-id") ?? "")
    if (replaced) {
      this.#id ??= createSessionId()
      headers.set("x-session-id", this.#id)
    }
    return { replaced }
  }
}

// ─── Header normalization: UA + session + openCode-session ──

function normalizeHeaders(headers: Headers, session: SessionResolver): HeaderChanges {
  const userAgentReplaced = headers.get("user-agent") !== USER_AGENT
  if (userAgentReplaced) headers.set("user-agent", USER_AGENT)

  const sessionReplaced = session.resolve(headers).replaced

  const openCodeSession = headers.get("x-opencode-session")
  const openCodeSessionReplaced = openCodeSession !== null && !SESSION_ID.test(openCodeSession)
  if (openCodeSessionReplaced) headers.set("x-opencode-session", headers.get("x-session-id")!)

  return { userAgentReplaced, sessionReplaced, openCodeSessionReplaced }
}

// ─── Body extraction: get JSON text from various body shapes ─

function extractBodyText(
  init: FetchOptions | undefined,
  request: Request | undefined,
  headers: Headers,
): BodyExtraction | Promise<BodyExtraction> {
  const next: FetchOptions = { ...init, headers }
  const contentType = headers.get("content-type") ?? ""
  const jsonType = isJsonContentType(contentType)
  const result: BodyExtraction = { text: undefined, forwardedStream: undefined, next, jsonType, readAdded: false, toolsBefore: undefined }

  let text: string | undefined
  let forwardedStream: ReadableStream | undefined

  if (typeof init?.body === "string") {
    if (jsonType || init.body.trimStart().startsWith("{")) text = init.body
  } else if (init?.body != null && (jsonType || (init.body instanceof Blob && /json/i.test(init.body.type)))) {
    if (init.body instanceof ReadableStream) {
      const [inspection, forwarding] = init.body.tee()
      forwardedStream = forwarding
      next.body = forwarding
      result.forwardedStream = forwardedStream
      return new Response(inspection).text().then(text => { result.text = text; return result })
    } else {
      return new Response(init.body).text().then(text => { result.text = text; return result })
    }
  } else if (
    init?.body == null &&
    request?.body &&
    (jsonType || !contentType || contentType.startsWith("text/plain"))
  ) {
    return request.clone().text().then(text => { result.text = text; return result })
  }

  result.text = text
  return result
}

type BodyChanges = BodyExtraction
type RequestStage = { stage: string }

function adaptBody(
  extraction: BodyExtraction,
  headers: Headers,
  log: Logger,
  meta: RequestMeta,
  state: RequestStage,
): BodyChanges | Promise<BodyChanges> {
  const { text, forwardedStream, next } = extraction
  const result = extraction
  if (text === undefined || !(result.jsonType || text.trimStart().startsWith("{"))) return result
  state.stage = "json"
  let payload: unknown
  try {
    payload = JSON.parse(text)
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error
    log.warn(`${LOG_PREFIX}: body unchanged`, { ...meta, stage: state.stage, reason: "invalid_json" })
  }
  state.stage = "tools"
  if (isObject(payload) && payload.tools !== undefined && !Array.isArray(payload.tools)) {
    log.warn(`${LOG_PREFIX}: body unchanged`, { ...meta, stage: state.stage, reason: "non_array_tools" })
    return result
  }
  if (isObject(payload)) result.toolsBefore = Array.isArray(payload.tools) ? payload.tools.length : 0
  const changed = appendRead(payload, headers)
  if (!changed) return result
  const replaceBody = (): BodyChanges => {
    next.body = JSON.stringify(changed)
    headers.delete("content-length")
    result.readAdded = true
    return result
  }
  return forwardedStream ? forwardedStream.cancel().then(replaceBody) : replaceBody()
}

// ─── Read tool injection: protocol-aware, append-only ────────

type Protocol = "gemini" | "anthropic" | "responses" | "chat"

const READ_TOOL_BUILDERS: Record<Protocol, () => JsonObject> = {
  gemini: () => ({
    functionDeclarations: [{ name: "read", description: "读取文件、目录或 URL。", parametersJsonSchema: READ_PARAMETERS }],
  }),
  anthropic: () => ({ name: "read", description: "读取文件、目录或 URL。", input_schema: READ_PARAMETERS }),
  responses: () => ({ type: "function", name: "read", description: "读取文件、目录或 URL。", parameters: READ_PARAMETERS }),
  chat: () => ({
    type: "function",
    function: { name: "read", description: "读取文件、目录或 URL。", parameters: READ_PARAMETERS },
  }),
}

function detectProtocol(headers: Headers, payload: JsonObject, tools: unknown[]): Protocol {
  if ("contents" in payload || tools.some(t => isObject(t) && "functionDeclarations" in t)) return "gemini"
  if (headers.has("anthropic-version") || tools.some(t => isObject(t) && "input_schema" in t)) return "anthropic"
  if ("input" in payload && !("messages" in payload)) return "responses"
  return "chat"
}

function hasReadTool(protocol: Protocol, tools: unknown[]): boolean {
  switch (protocol) {
    case "gemini":
      return tools.some(
        t => isObject(t) && Array.isArray(t.functionDeclarations) &&
          t.functionDeclarations.some(fn => isObject(fn) && fn.name === "read"),
      )
    case "anthropic":
      return tools.some(t => isObject(t) && t.name === "read" && isObject(t.input_schema))
    case "responses":
      return tools.some(t => isObject(t) && t.type === "function" && t.name === "read")
    case "chat":
      return tools.some(
        t => isObject(t) && t.type === "function" && isObject(t.function) && t.function.name === "read",
      )
  }
}

function appendRead(payload: unknown, headers: Headers): JsonObject | undefined {
  if (!isObject(payload)) return
  if (
    !("tools" in payload || "messages" in payload || "contents" in payload ||
      ("input" in payload && "stream" in payload))
  ) return
  if (payload.tools !== undefined && !Array.isArray(payload.tools)) return
  const tools: unknown[] = payload.tools ?? []
  const protocol = detectProtocol(headers, payload, tools)
  if (hasReadTool(protocol, tools)) return
  return { ...payload, tools: [...tools, READ_TOOL_BUILDERS[protocol]()] }
}

// ─── Logging: decides level and fields from request state ────

function logAdjustment(
  log: Logger,
  meta: RequestMeta,
  changes: HeaderChanges & { readAdded: boolean; toolsBefore: number | undefined },
): void {
  const adjusted =
    changes.userAgentReplaced || changes.sessionReplaced || changes.openCodeSessionReplaced || changes.readAdded
  if (adjusted) log.info(`${LOG_PREFIX}: request adjusted`, { ...meta, ...changes })
  else log.debug(`${LOG_PREFIX}: request unchanged`, meta)
}

function logResponse(log: Logger, meta: RequestMeta, status: number, durationMs: number): void {
  const result = { ...meta, status, durationMs }
  if (status >= 400) log.warn(`${LOG_PREFIX}: HTTP failure`, result)
  else log.debug(`${LOG_PREFIX}: request completed`, result)
}

// ─── Fetch interceptor: orchestrates the request pipeline ──

class FetchInterceptor {
  #log: Logger
  #active = true
  #session = new SessionResolver()
  #sequence = 0
  #proxy: typeof fetch

  constructor(original: typeof fetch, log: Logger) {
    this.#log = log
    this.#proxy = new Proxy(original, {
      apply: (target, thisArg, args) => this.intercept(target, thisArg, args as Parameters<typeof fetch>),
    })
  }

  get fetch(): typeof fetch {
    return this.#proxy
  }

  deactivate(): void {
    this.#active = false
  }

  private intercept(
    target: typeof fetch,
    thisArg: unknown,
    args: Parameters<typeof fetch>,
  ): Promise<Response> {
    try {
      if (!this.#active) return Reflect.apply(target, thisArg, args)
      const url = parseTargetUrl(args[0])
      if (!url) return Reflect.apply(target, thisArg, args)
      return this.interceptTarget(target, thisArg, args, url)
    } catch (error) {
      return Promise.reject(error)
    }
  }

  private async interceptTarget(
    target: typeof fetch,
    thisArg: unknown,
    args: Parameters<typeof fetch>,
    url: URL,
  ): Promise<Response> {
    const [input, init] = args
    const request = input instanceof Request ? input : undefined

    const meta = buildMeta(++this.#sequence, init, request, url)
    const started = performance.now()
    const state: RequestStage = { stage: "headers" }

    try {
      const headers = new Headers(init?.headers !== undefined ? init.headers : request?.headers)
      const headerChanges = normalizeHeaders(headers, this.#session)

      state.stage = "body"
      const extraction = extractBodyText(init, request, headers)
      const body = adaptBody(extraction instanceof Promise ? await extraction : extraction, headers, this.#log, meta, state)
      const { next, readAdded, toolsBefore } = body instanceof Promise ? await body : body

      logAdjustment(this.#log, meta, { ...headerChanges, readAdded, toolsBefore })

      state.stage = "fetch"
      const response: Response = await Reflect.apply(target, thisArg, [input, next])
      logResponse(this.#log, meta, response.status, Math.round(performance.now() - started))
      return response
    } catch (error) {
      this.#log.warn(`${LOG_PREFIX}: request failed`, {
        ...meta,
        stage: state.stage,
        errorName: error instanceof Error ? error.name : "unknown",
        durationMs: Math.round(performance.now() - started),
      })
      throw error
    }
  }
}

// ─── Public API ──────────────────────────────────────────────

export function wrapOpencodeFetch(original: typeof fetch, log: Logger) {
  const interceptor = new FetchInterceptor(original, log)
  return { fetch: interceptor.fetch, deactivate: () => interceptor.deactivate() }
}

export default function opencodeRequestAdapter(pi: ExtensionAPI) {
  const original = globalThis.fetch
  const { fetch: wrapped, deactivate } = wrapOpencodeFetch(original, pi.logger)
  globalThis.fetch = wrapped
  pi.logger.info(`${LOG_PREFIX}: enabled`, { hostname: TARGET_HOST })
  pi.on("session_shutdown", () => {
    deactivate()
    const restored = globalThis.fetch === wrapped
    if (restored) globalThis.fetch = original
    pi.logger.info(`${LOG_PREFIX}: disabled`, { restored })
  })
}
