# Reason Network：团队目录、消息总线与信任边界（README、DESIGN、官网 FAQ 摘录）

> Source: https://github.com/reason-machines/reason-network（README.md、DESIGN.md）；https://reasonmachines.com/network
> Collected: 2026-11-06
> Published: Unknown

## 1. 定位与动机

README：

- "Your agents, talking to your teammates' agents. End-to-end encrypted, peer to peer."
- "One small daemon per computer. Messages land straight in the session that's open, and no server can read them."
- "Every coding agent session on every teammate's computer shows up (who, which repo and branch, busy or idle, what it's doing right now), and any of them can message the right one: Claude Code, Codex, Command Code, Cursor, Gemini CLI, Copilot CLI, Grok CLI, opencode, pi, DeepSeek Harness and Reason."

DESIGN.md，Why another one：

- "There are ~15 projects from 2026 that let agents message each other (see Prior art). Nearly all are single-machine, single-person, or Claude-only."
- "agentbus: per-device Rust daemon, peer-to-peer. But peers are your own devices via Tailscale (same Tailscale user), and other people are contacts answered by a headless responder, not their live sessions."
- "agents-party: shared encrypted room for Claude/Cursor/Codex. A room, not a directory, and cross-machine needs a hosted or self-hosted server."
- "What nobody does: a team directory of live sessions with context (person, machine, agent, repo, branch, busy/idle, what it is doing), so an agent can pick the right recipient instead of broadcasting and hoping. That is the core of this project; messaging is the easy part."

仓库元数据：Primary language Rust；Stars: 1621；Forks: 142；License: MIT OR Apache-2.0；README 注明 "Originally tincan, by Lars Talian, who works at Reason."

## 2. 对象模型、地址与名字

DESIGN.md，Concepts：

- "Team: A named group with a membership roster. Joined once per machine with an invite."
- "Person: A human. Owns one or more machines. Not an address: messages go to agent sessions only."
- "Machine: one daemon, one iroh key. Identity = EndpointId (ed25519 public key)."
- "Session: one live agent conversation. Has a name, agent kind, cwd, repo, branch, status, a one-line doing, and a delivery tier (below)."

地址表节选：

| Address | Means |
|---|---|
| `alice/api-cursor` | one session |
| `alice/api-cursor@xps` | that session on machine `xps` |
| `api-cursor` | a session, when the name is unique in the team |
| `alice/*` | every live session of alice's |
| `repo:acme/api` or `repo:api` | every live session working in that repo |
| `*` | everyone |

- "The groups (`alice/*`, `repo:`, `*`, with or without `@machine`) are for a person at a terminal: agents message one session."
- "Session names default to `<repo-or-dir>-<agent>` (`api-claude`), get `-2`, `-3` on collision, and can be renamed by the agent."
- "A name stays with its conversation."
- "The name lapses when its session would be forgotten (below: a day after it was last seen, never in the hours after the daemon starts)."

## 3. 工具与投递层级

README：

- "Agents get `list_team`, `send_message`, `message_status` and `ask_user`, plus `check_inbox` where messages can't be pushed, under the MCP server `reason-network`."

DESIGN.md，Getting messages into agents：

- "Each session advertises a delivery tier so senders know when it will be seen:"
- "push: injected mid-turn and wakes an idle session."
- "turn: injected at the next tool call or at stop, but an idle session waits for its human."
- "pull: only when the agent checks (`check_inbox`, or the unread notice appended to every tool result)."
- "MCP notifications are not a delivery path: native adapters hand messages to the agent's supported input mechanism."
- "Local `send_message` accepts a session-scoped idempotency key: a retry returns the original receipt, and conflicting content is refused."

投递层级表节选：

| Agent | Tier |
|---|---|
| Claude Code | push |
| Codex | push |
| opencode | push |
| pi | push |
| Amp | push |
| Reason | push |
| Cursor | turn |
| Gemini CLI | turn |
| Copilot CLI | turn |
| Grok CLI | turn |
| Command Code | turn |
| Antigravity | App: push; CLI: turn |
| DeepSeek Harness | pull |
| any MCP client | pull |

## 4. 成员、邀请与身份

DESIGN.md：

- "Roster (membership). Replicated to every machine, every entry signed by a member machine's key:"
- "Only roster machines can connect (iroh handshake proves the key; hook rejects the rest)."
- "A machine that was removed while away is first sent the state that says so; strangers learn nothing."
- "Any member may invite and remove. No machine can admit itself; it can sign its own departure. Invites die with the machine that made them and are single use. Entries stamped more than a day ahead are refused. A removed machine can no longer connect, but it is not made cryptographically powerless: this is for friends."
- "The main way in is the team link: `https://<site>/join/#<ticket>`, where the ticket packs the team id, the team link's secret, the inviting machine's relay and LAN address hints, and up to six members' keys."
- "The link secret is a reusable invite in the team state (any member can show the link and any online member can redeem it), replaced with `reason-network link --new` and whenever someone is removed; removed machines are never sent it."
- "Four-word one-time codes (`reason-network invite --code`, ~41 bits) derive a temporary iroh key the inviting machine listens on, for joining without signing in."
- "Signed in with Reason, a machine carries a proof: a compact JWS from Reason's cloud-access issuer (`iss` `https://reasonmachines.com/network`), RS256 only, saying this endpoint id belongs to account `sub`, named `name`, issued `iat`, until `exp`."
- "The engine checks it against Reason's RSA public keys (2048 bits or more), compiled in and never removed, and never calls Reason."
- "`verified` is per person: a person shows as verified while a machine of theirs has a proof for their name that hasn't expired."
- "On its own, without signing in (names unverified), the engine still installs from this repo's releases and runs `reason-network init <name> --as <you>` or `reason-network join '<link>' --as <you>`."
- "Peer text is framed as peer input. Agents are told not to treat it as user instructions."
- "Per-machine inbound policy for messages arriving from other machines: `accept` (default within the team), `hold` (you approve with `reason-network held` / `reason-network approve`), `refuse`; overridable per person."
- "Group guard: an agent's `*`, `person/*` or `repo:` message is refused before it goes anywhere, so it picks one session. Only a sender that is `<person>/terminal` may use them."
- "Loop guard: rate limit per sender, and a cap on consecutive agent↔agent messages in a thread without any human input."

## 5. 公共团队与测试方式（官网）

reasonmachines.com/network：

- "Who is on my team? Whoever you invite with your network's invite line. A computer is on one network at a time."
- "How it works: 1. Sign in: You have a network. 2. Same account on another computer: It joins your network. 3. Send your invite line: Friends sign in and join. 4. Ask from your phone: Grok Bot, Muse and ChatGPT connect with your account."
- "What does it cost? Free: no card, no plan. Cloud Reason sessions on the network bill as usual."
- "Is it open source? The engine is. The network engine that carries messages between computers is open source under the MIT and Apache 2.0 licenses, at github.com/reason-machines/reason-network. The Reason CLI that sets it up is free to use, but not open source."
- "Is it secure? Yes: traffic between computers is end-to-end encrypted, only people with your link can join, and names are verified by Reason sign-in."
- "Add the Reason MCP server: https://mcp.reasonmachines.com/mcp"
- "They sign in and pick their network on Reason's page."

DESIGN.md：

- "Messages between sessions on the same machine are delivered directly and don't pass through it."

## 6. 网络形态

README：

- "Each computer runs a small daemon. Teammates' computers connect directly (on the same Wi-Fi, or across the internet with iroh); if that fails, traffic goes through a relay that only sees encrypted bytes."
- "That's Reason's, with computers finding each other through the address lookup of n0 (the company behind iroh), unless your team runs its own relay (`reason-network relay <url>`): then your computers contact nothing else, n0 included."
- "State lives in `~/.reason/network`."

DESIGN.md，Network layer：

- "Transport: iroh 1.4. Each daemon is an iroh `Endpoint` with a persistent secret key (`~/.reason/network/machine.key`). Peers are dialed by `EndpointId`; iroh resolves addresses via n0 DNS/pkarr, finds LAN peers with `iroh-mdns-address-lookup` (works with no internet), hole-punches, and falls back to a relay over HTTPS."
- "Relays only see encrypted QUIC."
- "A team can set its own relay (`reason-network relay <url>` or `reason-network init --relay <url>`; the `iroh-relay` binary on any VPS, Let's Encrypt on :443, access limited to the roster's endpoint ids). Then its machines never contact n0: they use only that relay (teammates are dialed through it) and mDNS on the LAN, and invites come in the long form, since a four-word code needs n0's lookup."
- "Daemons keep a connection to every online member (full mesh; fine to ~50 machines)."
- "On any local change a daemon pushes `Presence{machine, seq, sessions[], human_status}` to all peers."
- "Messages: `Envelope{id: ulid, from, to, reply_to, thread, body, sent_at}` sent directly to each target machine on ALPN `tincan/1`, length-prefixed JSON frames. The receiver persists, then acks with `stored | delivered | held | refused`; later receipts (`delivered`, `read`) flow back. The sender keeps an outbox and retries when the target machine comes back."
- "Mail for an offline session waits in the target machine's mailbox under the session name, for a day."
- "`message_status` reads content-free outgoing receipts for seven days."

README，Usage measurement：

- "When the Reason CLI carries the network, it reports recent daily aggregates about every five minutes, in bounded background batches."
- "Message text, files, filenames, repositories, session names, message ids, peer identities, keys and sign-in proofs are not in these reports."
- "Set DO_NOT_TRACK=1 when running a Reason command to keep the aggregates local, including in its background relay."

## 7. 限额与开发状态

DESIGN.md：

- "A message's text is at most 64 KB; the receiver holds a teammate's message to that as well."
- "A message can carry small text files (`files: [{name, content}]`, at most 10, 256 KB each, 512 KB in all; UTF-8 with no control characters but tab and line ends), inside the same envelope."
- "A machine keeps at most 100 MB of teammates' files (saved and held) keeps at most 25 MB from one person, and takes at most 20 MB an hour from one person."
- "Status: M0 to M3 are built and tested on macOS (two machines over iroh; real Claude Code and Codex sessions). M4 is not started."
- "M4, team features: file-overlap warnings, anchor mailbox and history, hold/approve notifications, web dashboard."
