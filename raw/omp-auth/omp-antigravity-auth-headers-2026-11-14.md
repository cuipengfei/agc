# OMP Google Antigravity 认证规则、版本演变与请求头源码摘录

> Source: `@oh-my-pi/pi-catalog` 18.20.0 的 `src/compat/rules/auth/google-antigravity.kdl`、`src/wire/gemini-headers.ts`、`src/discovery/antigravity.ts` 与 `CHANGELOG.md`；`@oh-my-pi/pi-ai` 18.20.0 的 `src/registry/oauth/google-antigravity.ts` 与 `CHANGELOG.md`；仓库 `omp/agent/config.yml`
> Collected: 2026-11-14
> Published: Unknown

验证级别：`[CODE]` = 本机已安装 `@oh-my-pi/pi-coding-agent` / `pi-catalog` / `pi-ai` `18.20.0` 源码与 CHANGELOG 逐字摘录；`[CONFIG]` = 仓库 `omp/agent/config.yml` 配置摘录；`[UNVERIFIED]` = 未执行真实登录或 API 请求。

## 1. 本机版本与 `omp/agent/config.yml` 配置（`[CODE]` + `[CONFIG]`）

- 本机 `@oh-my-pi/pi-coding-agent`、`pi-catalog`、`pi-ai` 的 `package.json` 版本均为 `18.20.0`。
- `omp/agent/config.yml` 第 41-48 行：

```yaml
providers:
  maxInFlightRequests: {}
  anthropic:
    serverSideFallback: false
  ollama-cloud:
    maxConcurrency: 3
  antigravityEndpoint: auto
```

## 2. `pi-catalog/src/compat/rules/auth/google-antigravity.kdl`（`18.20.0`，`[CODE]`）

（注：OAuth `client-id` 与 `client-secret` 的值替换为 `<REDACTED>`；作者账号和 loopback IP 分别替换为 `<USER>` 与 `<LOOPBACK_IP>`。）

```kdl
auth "google-antigravity" {
	name "Google Antigravity (Gemini, Claude, GPT-OSS)"
	login-warning "Google's Antigravity terms do not allow signing in from third-party tools like omp, and Google has suspended accounts that did (see #18341). If you depend on this Google account, use GEMINI_API_KEY (AI Studio) or google-vertex instead."
	login "oauth-code" {
		// Antigravity uses different Google OAuth credentials for its additional models.
		client-id "<REDACTED>" encoding="base64"
		client-secret "<REDACTED>" encoding="base64"
		authorize-url "https://accounts.google.com/o/oauth2/v2/auth"
		scopes "https://www.googleapis.com/auth/cloud-platform" "https://www.googleapis.com/auth/userinfo.email" \
			"https://www.googleapis.com/auth/userinfo.profile" "https://www.googleapis.com/auth/cclog" \
			"https://www.googleapis.com/auth/experimentsandconfigs" "https://www.googleapis.com/auth/aicode"
		pkce #true
		authorize-params { access_type "offline"; prompt "consent" }
		instructions "Complete the sign-in in your browser."
		callback port=51121 path="/oauth-callback" hostname="<LOOPBACK_IP>"
		token url="https://oauth2.googleapis.com/token" body="form"
		credential {
			access "access_token"
			refresh "refresh_token"
			expires "seconds" path="expires_in" skew-ms=300000
		}
		userinfo url="https://www.googleapis.com/oauth2/v1/userinfo?alt=json" email="email"
		after-exchange hook="google-antigravity-project"
	}
	refresh {
		require "projectId"
		after-refresh hook="google-antigravity-project"
	}
	api-key-format "structured"
}
```

## 3. `pi-catalog/CHANGELOG.md` 与 `pi-ai/CHANGELOG.md` 版本演变摘录（`[CODE]`）

### 3.1 `18.13.0`（2026-10-26，`pi-catalog/CHANGELOG.md`）

```markdown
## [18.13.0] - 2026-10-26

### Changed
- Google Antigravity login now uses PKCE and requests the `aicode` scope like the official client; existing logins keep working, and the new scope applies at the next `/login` (#17012 by <USER>)
- Antigravity requests identify as client 2.26.0 when the release manifest is unreachable (previously 2.19.1), and model discovery sends the account's project like the official client (#17012 by <USER>)
- Antigravity's `User-Agent` now reports the native Antigravity build for the host OS (Linux `linux`/`amd64`, Windows `windows`/`amd64`) instead of always claiming macOS `darwin`/`arm64` (#17012 by <USER>)
- Antigravity model discovery now keeps each account's per-tier `model_enum`, output cap and thinking level or budget, and the bundled Antigravity models carry them for offline use; cached Antigravity model lists are refreshed once so they pick them up (#17012 by <USER>)
```

### 3.2 `18.18.4`（2026-11-09）与 `18.18.7`（2026-11-10）

`pi-catalog/CHANGELOG.md`：

```markdown
## [18.18.7] - 2026-11-10

### Added
- Added the `login-warning "<text>"` auth rule, which makes a new login accept the stated account risk first (#18499)

### Changed
- Resumed Google Antigravity behind a login warning instead of pausing it (#18499)

## [18.18.4] - 2026-11-09

### Added
- Added a `disabled "<reason>"` auth rule that pauses a provider: no login offers it and nothing calls it, while its code and users' stored logins stay in place (#18622 by <USER>)

### Changed
- Paused Google Antigravity, since Google may restrict accounts that use it outside its own apps (#18622 by <USER>)
```

`pi-ai/CHANGELOG.md`：

```markdown
## [18.18.7] - 2026-11-10

### Changed
- Providers with a `login-warning` auth rule show their account risk before a new login and start it only after the user answers `yes`; any other answer or a cancel stores nothing, and their login-list entry is marked "(at your own risk)" (#18499)

## [18.18.4] - 2026-11-09

### Changed
- Providers paused by a `disabled` auth rule (currently Google Antigravity) are left out of the built-in login list, refuse login, token refresh and usage probes, resolve no key from any source, and refuse requests and image generation with the pause reason; stored logins are kept and work again once the rule is removed, and an extension that registers its own login under the paused id takes it back (#18622 by <USER>)
```

### 3.3 `18.19.0`（2026-11-12）

`pi-catalog/CHANGELOG.md`：

```markdown
## [18.19.0] - 2026-11-12

### Fixed
- Fixed Google Antigravity Gemini 4 Argon models sharing the general Gemini quota scope instead of their dedicated weekly bucket (#16104).
```

`pi-ai/CHANGELOG.md`：

```markdown
## [18.19.0] - 2026-11-12

### Fixed
- Fixed Gemini CLI and Antigravity responses losing or misordering thought signatures and reply text, including responses that follow tool calls.
- Fixed Gemini CLI and Antigravity merging reply text around a thought signature, dropping signatures at the start of a reply or after a tool call, and placing a thought ahead of reply text that streamed before it (#18942 by <USER>)
- Fixed Google Antigravity judging Gemini models by quota buckets they do not consume: Gemini 3.x requests ignore the Gemini 4 Argon weekly bucket, and Argon requests ignore `gemini-weekly`, so an exhausted or low bucket no longer blocks, reserves, or caps an account for the other models (#16104).
```

## 4. `pi-catalog/src/wire/gemini-headers.ts` 摘录（`18.20.0`，`[CODE]`）

```typescript
/**
 * Format captured from the real 2.26.0 `antigravity/hub` client:
 * `antigravity/hub/2.26.0 (aidev_client; os_type=darwin; arch=arm64; cl=1005016104)`.
 * The backend gates newer models (e.g. gemini-3.7-flash) on the client version,
 * so the version tracks the latest Antigravity release via the update manifest
 * (see {@link ensureAntigravityVersion}) with `DEFAULT_ANTIGRAVITY_VERSION` as
 * the offline fallback. os_type/arch name the native build for the host OS:
 * each 2.26.0 installer ships one language-server build whose Go target is
 * stamped into the header (macOS darwin/arm64, Linux linux/amd64, Windows
 * windows/amd64; no other OS/arch builds exist); see
 * {@link getAntigravityPlatform}. The changelist is identical across those
 * builds. Overrides: PI_AI_ANTIGRAVITY_VERSION / _CL / _OS / _ARCH.
 */
export const DEFAULT_ANTIGRAVITY_VERSION = "2.26.0";

const ANTIGRAVITY_VERSION_MANIFEST_URL =
	"https://antigravity-hub-auto-updater-974169037036.us-central1.run.app/manifest/latest-arm64-mac.yml";
const ANTIGRAVITY_VERSION_FETCH_TIMEOUT_MS = 5_000;
const ANTIGRAVITY_VERSION_RETRY_MS = 10 * 60_000;

export function getAntigravityVersion(): string {
	return process.env.PI_AI_ANTIGRAVITY_VERSION || discoveredAntigravityVersion || DEFAULT_ANTIGRAVITY_VERSION;
}

const ANTIGRAVITY_BUILDS: Partial<Record<NodeJS.Platform, { os: string; arch: string }>> = {
	darwin: { os: "darwin", arch: "arm64" },
	linux: { os: "linux", arch: "amd64" },
	win32: { os: "windows", arch: "amd64" },
};

export function getAntigravityPlatform(platform: NodeJS.Platform = process.platform): { os: string; arch: string } {
	return ANTIGRAVITY_BUILDS[platform] ?? { os: "linux", arch: "amd64" };
}

export function getAntigravityUserAgent(): string {
	const version = getAntigravityVersion();
	const cl = process.env.PI_AI_ANTIGRAVITY_CL || "1005016104";
	const host = getAntigravityPlatform();
	const os = process.env.PI_AI_ANTIGRAVITY_OS || host.os;
	const arch = process.env.PI_AI_ANTIGRAVITY_ARCH || host.arch;
	return `antigravity/hub/${version} (aidev_client; os_type=${os}; arch=${arch}; cl=${cl})`;
}

export function getAntigravityHeaders(userAgent: string = getAntigravityUserAgent()): {
	"User-Agent": string;
	"Accept-Encoding": string;
} {
	return { "User-Agent": userAgent, "Accept-Encoding": "gzip" };
}
```

## 5. `pi-catalog/src/discovery/antigravity.ts` 与 `pi-ai/src/registry/oauth/google-antigravity.ts` 常量摘录（`[CODE]`）

```typescript
// pi-catalog/src/discovery/antigravity.ts
export const ANTIGRAVITY_PRIMARY_ENDPOINT = "https://daily-cloudcode-pa.googleapis.com";
export const ANTIGRAVITY_SANDBOX_ENDPOINT = "https://daily-cloudcode-pa.sandbox.googleapis.com";
const DEFAULT_ANTIGRAVITY_DISCOVERY_ENDPOINTS = [ANTIGRAVITY_PRIMARY_ENDPOINT, ANTIGRAVITY_SANDBOX_ENDPOINT] as const;
const FETCH_AVAILABLE_MODELS_PATH = "/v1internal:fetchAvailableModels";
const DEFAULT_CONTEXT_WINDOW = 200_000;
const DEFAULT_MAX_TOKENS = 64_000;
const ANTIGRAVITY_DISCOVERY_DENYLIST = new Set(["chat_20706", "chat_23310", "gemini-2.5-pro"]);
```

```typescript
// pi-ai/src/registry/oauth/google-antigravity.ts
const CLOUD_CODE_ASSIST_ENDPOINT = "https://daily-cloudcode-pa.googleapis.com";
const LOAD_CODE_ASSIST_URL = `${CLOUD_CODE_ASSIST_ENDPOINT}/v1internal:loadCodeAssist`;
const ONBOARD_USER_URL = `${CLOUD_CODE_ASSIST_ENDPOINT}/v1internal:onboardUser`;
const OPERATIONS_URL = `${CLOUD_CODE_ASSIST_ENDPOINT}/v1internal`;
const FREE_TIER_ID = "free-tier";
const ONBOARD_TIMEOUT_MS = 30_000;
const ONBOARD_POLL_INTERVAL_MS = 1_000;
const PROVIDER = "google-antigravity";

export const ANTIGRAVITY_LOAD_CODE_ASSIST_METADATA = Object.freeze({
	ideType: "ANTIGRAVITY",
});
```

## 6. 未测边界（`[UNVERIFIED]`）

- 本次会话未执行 `/login google-antigravity`，未向 `daily-cloudcode-pa.googleapis.com` 发起在线请求。
