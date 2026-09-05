# OMP 压缩期与分支 extension 事件面

> Source: 已安装包 `@oh-my-pi/pi-coding-agent` 的 `dist/types/extensibility/extensions/types.d.ts` 直读
> Collected: 2026-09-04
> Published: Unknown

验证级别：`[TYPES]` = 读已安装包 `.d.ts` 类型声明；`[UNVERIFIED]` = 未测运行时行为。

本文件补齐两处 wiki 断言的一手依据：OMP 是否有压缩前注入点、是否有会话分支能力。两者用于判定 DeepCode 的 PreCompact hook 与 claurst 的 `/fork` 是否构成独有。

安装路径：`/home/cpf/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent/dist/types/extensibility/extensions/types.d.ts`。版本以同日 `omp --version` 输出为准。

---

## A. 压缩相关事件

`[TYPES]` 该文件的 `on(event, handler)` 重载中，压缩相关条目：

```
832:    on(event: "session_before_compact", handler: ExtensionHandler<SessionBeforeCompactEvent, SessionBeforeCompactResult>): void;
833:    on(event: "session.compacting", handler: ExtensionHandler<SessionCompactingEvent, SessionCompactingResult>): void;
834:    on(event: "session_compact", handler: ExtensionHandler<SessionCompactEvent>): void;
```

`[TYPES]` 同文件对 `session_before_compact` 的 `customInstructions` 字段有如下注释（第 254-259 行）：

```
    /**
     * Internal summarizer guidance — piped only to native summarization, never
     * exposed as `customInstructions` on the `session_before_compact` extension
     * hook. Used by plan-mode "Approve and compact context" so extensions that
     * treat `customInstructions` as user focus don't mistake plan-mode
     * boilerplate for the operator's intent (issue #4359).
     */
```

要点：`session_before_compact` 是可返回结果的 hook（`SessionBeforeCompactResult`），且其 `customInstructions` 语义被定义为「operator 的关注点」，说明该事件是压缩前的可干预注入点，而非只读通知。

对应结论：压缩前注入在 OMP 已存在。DeepCode 的 PreCompact hook 不构成相对 OMP 的独有能力。

## B. 分支相关事件与 API

`[TYPES]` 分支相关的 `on(event, ...)` 条目：

```
830:    on(event: "session_before_branch", handler: ExtensionHandler<SessionBeforeBranchEvent, SessionBeforeBranchResult>): void;
831:    on(event: "session_branch", handler: ExtensionHandler<SessionBranchEvent>): void;
837:    on(event: "session_tree", handler: ExtensionHandler<SessionTreeEvent>): void;
```

`[TYPES]` 分支 API（第 399-401 行）：

```
    /** Branch from a specific entry, creating a new session file. */
    branch(entryId: string): Promise<{ cancelled: boolean; }>;
```

要点：`branch(entryId)` 从指定条目分叉并创建新 session 文件，语义与「在某个消息点分叉会话」一致。

对应结论：会话分叉在 OMP 已存在。claurst 的 `/fork` 不构成相对 OMP 的独有能力。

## C. 证据边界

- 全部来自已安装包的类型声明，非实现源码，未做行为实测 `[UNVERIFIED]`
- 行号锚定本机该版本的 `.d.ts` 文件；不同版本行号可能变化
- 未验证 `session.compacting` 与 `session_before_compact` 的触发时序差异
- 未验证 `branch()` 的实际分叉保真度
