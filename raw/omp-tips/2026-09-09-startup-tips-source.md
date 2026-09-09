# OMP Startup Tips 源码取证

> Source: can1357/oh-my-pi upstream
> Collected: 2026-09-09
> Published: N/A

## 关键文件

### tips.txt

`packages/coding-agent/src/modes/components/tips.txt` — 27 条提示。

```
1:Tired of typing "keep going"? Just send a '.'
2:You can /btw to ask a side question
3:Use /tan to fork the current conversation into a background agent
4:Ctrl+D can be used to exit, but with your draft saved!
5:Find out which model you emotionally abuse the most with `omp stats`
6:Try task isolation to create CoW worktrees
7:Need a cheap nested model call? Use `completion(x...)`. Have a big batch of tasks? Ask clanker to use it!
8:Spaghetti code? Try complaining with /omfg
9:Did you know? Each kitty/tmux/cmux/zellij/wezterm split keeps its own session — `omp -c` resumes the right one
10:Drop the word `ultrathink` in your message for harder multi-step reasoning — watch it glow rainbow as you type
11:Say `orchestrate` in your message to drive a multi-phase task with parallel subagents — watch it glow as you type
12:Say `workflowz` in your message to drive the task with parallel subagents in eval — watch it glow as you type
13:Log in to several accounts of the same provider — `/login` again — and omp load-balances across them automatically
14:Run `omp auth-broker serve` once and every machine pulls live tokens over the wire — refresh keys never leave the host; `omp auth-gateway` fronts it as a drop-in proxy any OpenAI-compatible client can hit
15:Press alt+p (or /switch) to switch provider, and ctrl+p to cycle role models smol -> slow -> etc
16:Press ctrl+r to search your prompt history and reuse a past message
17:`/force read` pins the next turn to one specific tool when the model keeps reaching for the wrong one
18:`/copy code` grabs the last code block to your clipboard — `/copy cmd` grabs the last shell/python command
19:`/shake` rips heavy tool results out of context to reclaim tokens without a full /compact — `/shake images` drops just images
20:Pair up live: `/collab` shares your session through an end-to-end encrypted relay link — a teammate runs `/join <link>` to watch tool calls stream and prompt the agent from their own omp
21:Press ← ← to drill into a running or finished agent and inspect its tool calls and transcript
22:Hit a Codex rate limit? `/usage reset` spends a saved reset credit to immediately restore your quota
23:No native tool_calling? Inference provider botches parsing them? `PI_DIALECT=glm|kimi|anthropic…` rolls it locally for them!
24:Turn on `/advisor` to attach a second model that reviews every turn and quietly injects advice
25:Try starting your prompt with a ->, and writing a list (1. Do X, 2. Do Y)
26:Press shift+tab to cycle through reasoning effort levels
27:Lint/type errors piling up? `omp cleanse` (or /cleanse right here) hunts project diagnostics and fixes them with parallel subagents — esc cancels
```

### welcome.ts 条件提示

`packages/coding-agent/src/modes/components/welcome.ts:164-171` — 10% 概率的 nerdfont nag，`#nagRoll`/`#tipRoll` 用 `??=` 锁存：

```ts
get tip(): string | undefined {
  this.#nagRoll ??= Math.random();
  this.#tipRoll ??= Math.random();
  if (theme.getSymbolPreset() === "unicode" && this.#nagRoll < 0.1) {
    return "Please use nerdfont 😭.";
  }
  return pickWeightedTip(TIPS, this.#tipRoll) || undefined;
}
```

### input-controller.ts Agent Hub

`packages/coding-agent/src/modes/controllers/input-controller.ts:590-603` — 空编辑器双击左箭头打开 Agent Hub：

```ts
this.ctx.editor.onLeftAtStart = () => {
  if (this.ctx.focusedAgentId) {
    this.#handleFocusedLeftTap();
    return;
  }
  if (this.#detectLeftDoubleTap()) {
    this.ctx.showAgentHub({ requireContent: true, armCloseTap: true });
  }
};
```

`packages/coding-agent/src/modes/queue-input.ts:20-23`：`->` / `=>` 是 yield-queue shorthand。

```ts
export function parseQueueShorthand(text: string): string | undefined {
  const prefix = QUEUE_PREFIXES.find(candidate => text.startsWith(candidate));
  return prefix ? text.slice(prefix.length).trim() : undefined;
}
```

### main.ts

`packages/coding-agent/src/main.ts:1027-1029`：`omp -c` 调用 `SessionManager.continueRecent(cwd)`。

### 加权随机

`pickWeightedTip()`：普通 tip 权重 1，`[NEW]` 结尾权重 4。
