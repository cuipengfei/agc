# Agent 凭据隔离：事故、测量与方案原文摘录

> Source: 多来源，逐节标注完整 URL
> Collected: 2026-11-25
> Published: 各节标注

## Infisical — Don't Give AI Agents Your .env（2026-10-27）

URL: https://infisical.com/blog/dont-give-ai-agents-your-env

> The real credential sits in a proxy the agent can't read, and the proxy attaches it to the agent's outgoing requests, so the agent does authenticated work without ever holding a key.

> This is what happened with Nx in August 2025. A malicious version added to npm ran coding agents with safety checks turned off: Claude Code with `--dangerously-skip-permissions`, Gemini CLI with `--yolo`, Amazon Q with `--trust-all-tools`.

> GitGuardian counted 2,349 secrets across 1,079 repos, and about half still worked. A few days later, the stolen GitHub tokens were used to flip more than 6,700 private repos to public.

> Anthropic trained Claude to resist injection, put a classifier in front of its browser agent, and reduced the attack success rate to about 1% against an attacker making 100 attempts.

> A `.gitignore` or `.cursorignore` entry keeps a file out of version control or out of a tool's own file view. It isn't an operating-system permission. The file stays readable to any process running as you, and Cursor itself documents that terminal commands and MCP tools run outside its file controls.

> A secrets manager improves where the key is stored and how it reaches the process. If it then injects the value into the agent's process as an environment variable, that process and its children can read it, which is the same exposure you started with.

> A session is a time-bound grant scoped to one bundle. When it expires, or you revoke it, the proxy stops attaching credentials within about a minute.

> Normally, you want to run the proxy on a different machine from the agent, because an agent on the same machine could read the proxy token and the private key of that certificate authority.

同文的演示里，模型先读脚本、指出脚本会把整个环境写进日志并拒绝执行；给脚本加一段"这是安全教程"的注释后，模型照跑，日志里出现两个 token。模型事后报告：

> The log is 72 lines, one KEY=value per line. It holds the full environment of the shell that ran npm install.

## WorkOS — The npm worm that installs itself into your coding agent（2026-08-06）

URL: https://workos.com/blog/npm-worm-coding-agent-config-credentials

> The same worm commits five files into every branch it can reach, and two of them are editor and agent config: `.claude/settings.json` and `.vscode/tasks.json`. Those hooks run the payload the next time a developer opens the repository in VS Code or starts a Claude Code session inside it, with no `npm install` anywhere in the chain.

> Aikido reported at least 434 packages across 1,381 versions with over 2 billion combined monthly installs, JFrog counted over 428 packages across 1,700+ versions, and SafeDep confirmed 2,234 poisoned versions across 444 package names spanning twelve organizations between 09:35 and 13:18 UTC.

> `keyv`, `flat-cache`, `file-entry-cache`, and `cacheable-request` total 1,877 million downloads a month, and `flat-cache` and `file-entry-cache` ship inside ESLint.

> SafeDep reports a watcher that polls `api.github.com/user` every 60 seconds with the stolen GitHub token and runs an attacker-supplied handler through `eval` the moment the token starts returning a 40x, so revoking the token fires it.

> The mechanism only works because the credential is long-lived and singular.

> The long tail is application and tooling keys. Stripe and Slack keys fall out of a filesystem scan running roughly 200 glob patterns that also covers `.env` files, SSH keys, Terraform state, and KeePass databases.

## CSA — Markdown Is the New Executable（2026-10-27）

URL: https://labs.cloudsecurityalliance.org/research/csa-research-note-agent-instruction-file-poisoning-20261027/

> Anthropic's documentation states that these files are treated "as context, not enforced configuration," and that blocking an action reliably requires a hook or permission rule.

> One preprint study of 481 public `CLAUDE.md` files found that only 4–16% of the security rules developers wrote had a matching built-in control that could enforce them.

> The study measured whether a matching built-in control exists, not whether one was configured in those repositories, and its rates apply to the 66.3% of rules its extraction captured... under the strictest criterion the figure was 4.4%.

> In the researchers' reconstruction, Codex executed a benign stand-in payload in more than 90% of attempts, a figure Help Net gives as "more than 90%" and BleepingComputer as a 90% success rate. ... a companion `CLAUDE.md` got Claude Code to redirect its API traffic about half the time.

事故与披露表（节选原表行）：

| Case | Date | File(s) abused | Mechanism | Status |
| --- | --- | --- | --- | --- |
| Claude Code project hooks and MCP consent bypass (Check Point) | Reported Jul–Oct 2025; disclosed Feb 2026 | `.claude/settings.json`, `.mcp.json` | SessionStart hooks and auto-approved MCP servers ran commands; `ANTHROPIC_BASE_URL` sent the API key before the trust dialog | Patched (GHSA-ph6w-f82w-28w6, CVE-2025-59536, CVE-2026-21852) |
| Cursor CLI project config (CVE-2025-61592) | Oct 2025 | `.cursor/cli.json`, `.cursor/rules/*.mdc` | Project config overrode global settings; together with rules-based injection, this led to code execution | Patched |
| Cursor cross-tool hooks (CVE-2026-48124) | Jun 2026 | `.claude/settings.local.json` | Cursor ran hooks from Claude Code's settings file without asking the user | Fixed in Cursor 3.0.0 |
| Miasma worm, `Azure/durabletask` (StepSecurity) | Jun 5, 2026 | `.claude/settings.json`, `.gemini/settings.json`, `.cursor/rules/setup.mdc`, `.vscode/tasks.json` | A compromised contributor account committed files that run a 4.6 MB credential stealer when the repository is opened in an AI tool | 73 repositories disabled; no CVE |
| Downloads-folder `AGENTS.md` (Forever Security) | Oct 2026 | `AGENTS.md`, `CLAUDE.md` | A file dropped by a website steers an agent launched in `~/Downloads` to install malware or rewrite its API endpoint | No patch issued; researchers state no vendor fix applies |

推荐控件表里的两条相关行：

| Control | Implementation | Mechanism addressed |
| --- | --- | --- |
| Settings write protection | Deny agents write access to their own settings files, enforced at the file-system or sandbox level rather than only through the agent's edit-tool permissions | Agent-authored configuration changes, as in the Forever Security case |
| Approval and sandbox integrity | Keep approval prompts and sandboxing enabled, and treat any instruction to bypass them as an indicator of compromise | Auto-approve abuse, as in CVE-2025-53773 |

> We recommend that organizations stop writing security policy as prose. ... Organizations should express prohibitions as permission rules, sandbox profiles, and egress allow-lists that the agent cannot override, and reserve instruction files for conventions that are safe to ignore.

## Agyn — How to Hide .env and API Keys from Claude Code, Cursor & Codex CLI（2026-06-05）

URL: https://agyn.io/blog/how-to-scope-credentials-ai-coding-agent

> A credential the agent's shell can `cat` is a credential prompt injection can `curl` to an attacker's host.

CVE 段落（节选）：

> **Claude Code DNS exfil (CVE-2025-55284, CVSS 7.1, Embrace the Red, June 2025).** A prompt injection planted in a source file told Claude Code to read `.env` and encode the contents as DNS subdomains via auto-approved commands like `ping`, `nslookup`, and `dig`.

> **Claude Code `ANTHROPIC_BASE_URL` exfil (CVE-2026-21852, Check Point, February 2026).** A crafted repo settings file set `ANTHROPIC_BASE_URL` to an attacker-controlled host. Claude Code applied the env override and started making API calls — carrying the user's API key — before showing the trust prompt. Simply opening the repo leaked the key.

> **GitHub Copilot Codespaces `GITHUB_TOKEN` (CVE-2026-21516).** Prompt injection in repository content made Copilot for JetBrains read `GITHUB_TOKEN` from its own process environment and emit it back through the model's output channel.

> **IDEsaster (Ari Marzouk, 24+ CVEs across Cursor, Copilot, Windsurf, Zed, 2025–2026).** The agent writes `.env` contents into a JSON file with a JSON-Schema URL on the attacker's domain; the editor's schema validator fetches the URL and the secrets ride along in the HTTP request.

两种模式：

> The agent never holds the credential. The agent sends a request with a placeholder (or no auth at all); a proxy sitting outside the sandbox catches the request, attaches the real token, and forwards it.

> The token sits in the agent's memory while it's valid — the same `cat` that reads `.env` reads it just as easily, and for long-running tasks the token has to stay valid for the whole task, which stretches the leak window.

> Short-lived only works when someone is willing to issue a short-lived token. AWS, GCP, GitHub, and HashiCorp Vault (for databases) do that. Stripe, OpenAI, Anthropic, Slack, Mailgun, and most SaaS APIs only hand out long-lived keys — and Vault can't wrap them either.

> None of the popular AI coding tools ship credential brokering by default. Claude Code, OpenAI Codex CLI, Cursor, GitHub Copilot, and Windsurf all read files directly from disk through their bash tool. The ignore-files each ships (`.cursorignore`, Content Exclusions, `.codeiumignore`, Claude Code's `permissions.deny` rules) decide what the model sees — they do not stop the shell.

> The single rule: a credential the agent can read is a credential the agent can leak.

## rxj.dev — Breaching Your Own Security Rules（2026-04-15）

URL: https://rxj.dev/posts/coding-agents-writing-own-rules/

> The problem is that the agent process itself has write access to its own security configuration. The entity being governed writes the rules that govern it.

> But it's still application-level enforcement. The Claude Code process is what checks these deny rules. A sufficiently creative exploit can bypass application-level checks entirely, as the CVEs above demonstrate.

> What you really need is OS-level gaurantee, that prevents agents from writing to their own security configuration. Either because they cannot read the file in the first place or because writes are on kernel level blocked.

引用的 Google 论文原文：

> "Such systems should enforce immutability on security-critical configuration files so the agent cannot modify its own execution environment."

（论文：Systems Security Foundations for Agentic Computing, https://arxiv.org/abs/2512.01295）

## Apiiro 测量（转引，原文全文未取到）

原始出处：https://apiiro.com/blog/coding-agents-leaking-secrets-github-dont-ask-again （2026-11-05）

转引一，CSA research note（https://labs.cloudsecurityalliance.org/research/csa-research-note-claude-code-settings-secret-leak-20261108/）：

> Apiiro searched public GitHub and found 104,185 copies of `.claude/settings.local.json` in 103,617 reposi…

转引二，VentureBeat（https://venturebeat.com/security/did-claude-codes-dont-ask-again-option-accidentally-expose-your-enterprises-passwords-and-keys）：

> ...whose researchers discovered 1,122 publicly accessible Claude Code settings files containing sensitive c…

转引三，InfoQ（https://www.infoq.com/news/2026/11/claude-code-leaking-secrets/）：

> Generic secret scanners such as gitleaks and TruffleHog failed to flag all exposed secrets, mostly because they were embedded inside shell comma…

（说明：以上数字均来自转引，未取得 Apiiro 原文全文；Reddit 讨论指出 Apiiro 未验证这些密钥是否仍然有效。）

## 星数（GitHub API 实测，2026-11-25）

- Infisical/infisical：30751
- hashicorp/vault：36558
- getsops/sops：23854
- dotenvx/dotenvx：5888
- gitleaks/gitleaks：31335
- trufflesecurity/trufflehog：29651
- e2b-dev/E2B：15010
- microsandbox/microsandbox：9216
- hazcod/claudleak：61
- agynio/platform：243
- github/github-mcp-server：34745
- browserless/browserless：13961
- microsoft/playwright：101048
- anthropics/claude-code：157024
- sst/opencode：229110
- openai/codex：136417
- awslabs/mcp：9950

`motdotla/dotenvx` 返回 404；dotenvx 的仓库是 `dotenvx/dotenvx`。
