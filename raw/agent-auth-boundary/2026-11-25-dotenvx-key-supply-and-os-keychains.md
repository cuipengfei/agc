# dotenvx 密钥供给与系统钥匙串的隔离边界

> Source: dotenvx 仓库 README；dotenvx 官方文档（.env.keys、run -fk）；ArchWiki GNOME/Keyring；Microsoft Learn CryptProtectData；本机 omp/agent/extensions/agy-sensitive-guard.ts
> Collected: 2026-11-25
> Published: 各节标注

## dotenvx README（dotenvx/dotenvx，2026-11-25 读取）

URL: https://github.com/dotenvx/dotenvx

> or install globally - *unlocks dotenv for any language, framework, or platform!*

```
$ dotenvx encrypt
◈ encrypted .env (039 BCA) via .env.keys ⛉
```

> *Commit* your encrypted `.env` files with your code. It's safe. Now you can securely share secrets through git.

```
$ dotenvx run -- node index.js
⟐ injected env (2) from .env (039 BCA) via .env.keys ⛉
```

输出脱敏示例：

```
$ echo 'redacted true' > Dotenvxfile

$ dotenvx run -- claude -p 'Run `dotenvx get HELLO` and echo back just Hello VALUE' --dangerously-skip-permissions
Hello [REDACTED]
```

> When you initialize encryption, a DOTENV_PUBLIC_KEY (encryption key) and DOTENV_PRIVATE_KEY (decryption key) are generated. The DOTENV_PUBLIC_KEY is used to encrypt secrets, and the DOTENV_PRIVATE_KEY is securely stored in your cloud secrets manager or .env.keys file.

> Your encrypted .env file is then safely committed to code. Even if the file is exposed, secrets remain protected since decryption requires the separate DOTENV_PRIVATE_KEY, which is never stored alongside it.

## dotenvx 文档：.env.keys

URL: https://dotenvx.com/docs/env-keys-file/

> .env.keys holds your private decryption keys

```
#/------------------!DOTENV_PRIVATE_KEYS!-------------------/
#/ private decryption keys. DO NOT commit to source control /
#/     [how it works](https://dotenvx.com/encryption)       /
#/----------------------------------------------------------/

# .env
DOTENV_PRIVATE_KEY="DOTENV-PRIVATE-KEY-3-SECP256K1-<REDACTED-DOC-EXAMPLE>"
```

> - `DOTENV_PRIVATE_KEY` contains the decryption key for `.env`

> Do not commit `.env.keys` to source code. Keep them somewhere safe like 1Password or Armor ⛨.

## dotenvx 文档：run -fk

URL: https://dotenvx.com/docs/cli/run-fk/

> Specify a .env.keys file or a directory containing one. This is useful with monorepos

```
$ cd apps/web

$ dotenvx run -f . -fk ../.. -- node index.js
```

> Here the workspace uses its own `.env`, while `-fk ../..` loads the shared root `.env.keys`.

## ArchWiki — GNOME/Keyring（2026-11-25 读取）

URL: https://wiki.archlinux.org/title/GNOME/Keyring

> GNOME Keyring is "a collection of components in GNOME that store secrets, passwords, keys, certificates and make them available to applications."

> It provides org.freedesktop.secrets, an API that allows client applications to store secrets securely using a service running in the user's login session.

> Any application can easily read any secret if the keyring is unlocked. And, if a user is logged in, then the login/default collection is unlocked.

> When the session is locked, the keyring is not automatically locked.

> The PAM module pam_gnome_keyring.so initialises GNOME Keyring partially, unlocking the *login* keyring in the process.

（同节记录 CVE-2018-19358 的争议：GNOME 项目认为不受信任的应用本不应被允许访问 secret service。）

## Microsoft Learn — CryptProtectData（DPAPI）

URL: https://learn.microsoft.com/en-us/windows/win32/api/dpapi/nf-dpapi-cryptprotectdata

> Typically, only a user with logon credentials that match those of the user who encrypted the data can decrypt the data.

## 本机 omp/agent/extensions/agy-sensitive-guard.ts（2026-11-25 读取）

关键片段：

```ts
const protectedPaths = [
    ".omp/agent/mcp.json",
    ".omp/agent/.env",
    ".omp/agent/auth.json",
    ".omp/agent/models.yml",
    ".codex/auth.json",
    ".prime/agent/auth.json",
    ".local/share/opencode/auth.json",
].map(item => path.join(homedir(), item));
const agyMcpCommand = /(?:^|[;&|])\s*(?:env\s+(?:[A-Za-z_][A-Za-z0-9_]*=\S+\s+)*)?(?:[^\s;&|]*\/)?agy\s+mcp\s+(?:list|add)(?=$|[\s;&|])/;
```

```ts
async function guard(event: ToolCallEvent, ctx: ExtensionContext): Promise<ToolCallEventResult | void> {
    if (event.toolName === "bash") return guardCommand(event.input);
    if (event.toolName !== "read" && event.toolName !== "grep") return;
    const input = readInputPath(event.input);
    if (!input) return;
    try {
        if (await protectedInput(input, ctx.cwd)) return { block: true, reason };
    } catch {
        return { block: true, reason: "无法安全确认读取目标，已阻断该操作。" };
    }
}
```

```ts
function guardCommand(input: unknown): ToolCallEventResult | void {
    if (input && typeof input === "object" && "command" in input && typeof input.command === "string" && agyMcpCommand.test(input.command)) return { block: true, reason };
}
```

读取事实：`read` 与 `grep` 的入参路径与七个硬编码路径比对；`bash` 只匹配 `agy mcp list|add` 一条正则，其余命令不经过路径检查。
