# OMP Tavily 原生搜索与本地登录源码摘录

> Source: 本机安装的 OMP `omp/18.4.3`：`@oh-my-pi/pi-coding-agent/src/web/search/providers/tavily.ts`、`@oh-my-pi/pi-coding-agent/src/cli/auth-broker-cli.ts`
> Collected: 2026-09-29
> Published: Unknown

## 原生 Tavily 搜索的凭据读取

`src/web/search/providers/tavily.ts:65-72`：

```ts
/** Find Tavily API key through AuthStorage's unified refresh pipeline. */
export async function findApiKey(
	authStorage: AuthStorage,
	sessionId: string | undefined,
	signal: AbortSignal | undefined,
): Promise<string | null> {
	return (await authStorage.keys.get("tavily", sessionId, { signal })) ?? null;
}
```

`src/web/search/providers/tavily.ts:207-209,212-216,238-240`：

```ts
const keyOrResolver: ApiKey = params.authStorage.keys.resolver("tavily", {
	sessionId: params.sessionId,
});
```

```ts
const authOptions = {
	signal: params.signal,
	missingKeyMessage:
		'Tavily credentials not found. Set TAVILY_API_KEY or configure an API key for provider "tavily".',
};
```

```ts
isAvailable(authStorage: AuthStorage): boolean {
	return authStorage.keys.source("tavily") !== undefined || !!getEnvApiKey("tavily");
}
```

## Auth Broker 的本地凭据写入

`src/cli/auth-broker-cli.ts:237-249`：

```ts
async function runLocalLogin(rl: readline.Interface, provider: string): Promise<void> {
	// Drive the per-provider OAuth dance in-process. Persists into the same
	// SQLite store the broker uses.
	const store = await SqliteAuthCredentialStore.open(getAgentDbPath());
	const storage = new AuthStorage(store);
	await storage.credentials.reload();
	try {
		await runTerminalOAuthLogin(rl, storage, provider);
		process.stdout.write(`\nCredentials saved to ${getAgentDbPath()}\n`);
	} finally {
		store.close();
	}
}
```
