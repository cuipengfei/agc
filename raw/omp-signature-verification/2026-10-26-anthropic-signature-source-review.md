# Anthropic thinking signature 解析函数源码核对

> Source: 本机 OMP 18.12.6 全局安装 `/home/cpf/.bun/install/global/node_modules/@oh-my-pi/pi-ai/src/providers/anthropic-signature.ts`
> Collected: 2026-10-26
> Published: Unknown

## 文件头注释（第 1-15 行）

```ts
/**
 * Reads the cleartext header Anthropic embeds in thinking-block signatures.
 *
 * A signature is a base64 protobuf: outer `{1: version, 2: envelope}`, envelope
 * `{1: header, 2..5: nonce/ciphertext/tag}`, header
 * `{1: schema, 5: hash, 6: model, 8: kind, 11: org uuid, 15: profile, 21: unix ts}`.
 * Field 6 names the model that actually produced the block — a concrete
 * snapshot (`claude-haiku-4-5-20251001`) or an internal codename
 * (`numbat-v6-…`) — which lets a caller notice a gateway serving something other
 * than the requested model. The v4 outer format (`CAQS…`) ships a header
 * without field 6; the decoder then yields nothing.
 * Field 8 names the block kind: `thinking` for reasoning, `narration` for the
 * user-facing prose the API converts into a thinking block when the model
 * writes it between tool calls (connector-text summarization).
 */
```

## 常量（第 17-23 行）

```ts
const OUTER_ENVELOPE_FIELD = 2;
const ENVELOPE_HEADER_FIELD = 1;
const HEADER_MODEL_FIELD = 6;
const HEADER_KIND_FIELD = 8;
const MAX_MODEL_ID_LENGTH = 128;
const MODEL_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/-]*$/;
const NARRATION_KIND = Buffer.from("narration");
```

## 字段遍历（第 26-76 行，`lengthDelimitedField`）

注释为 `Finds a length-delimited field, rejecting tags and lengths that exceed uint32.`

- 逐字节累积 tag 与 length 的 varint，`shift === 28 && byte > 0x0f` 时返回 `undefined`（超出 uint32）。
- `fieldNumber = tag >>> 3`，`wireType = tag & 7`。
- `wireType 2` 时读出 length，`length > message.length - offset` 返回 `undefined`；命中目标字段号时返回 `message.subarray(offset, offset + length)`。
- `wireType 0` 跳过 varint，`1` 跳 8 字节，`5` 跳 4 字节，其他返回 `undefined`。

## 取头（第 78-94 行，`anthropicSignatureHeader`）

注释为 `Cleartext header of an Anthropic thinking signature, or undefined when malformed or absent.` 以及 `No upper length bound: the signature grows with its block, and a long reply's narration signature runs past 13k characters.`

- `signature.length < 8` 返回 `undefined`。
- `Buffer.from(signature, "base64")` 解码，抛错返回 `undefined`。
- 取 outer 的 field 2 得 envelope，再取 envelope 的 field 1 得 header。

## 取模型 ID（第 96-108 行，`servedModelFromAnthropicSignature`）

注释为 `Model id embedded in an Anthropic thinking signature, or undefined when the signature is malformed, uses a format without a cleartext header, or names nothing resembling a model id.`

```ts
export function servedModelFromAnthropicSignature(signature: string): string | undefined {
	const header = anthropicSignatureHeader(signature);
	if (!header) return undefined;
	const modelBytes = lengthDelimitedField(header, HEADER_MODEL_FIELD);
	if (!modelBytes || modelBytes.length === 0 || modelBytes.length > MAX_MODEL_ID_LENGTH) return undefined;
	const model = Buffer.from(modelBytes).toString("utf8");
	return MODEL_ID_PATTERN.test(model) ? model : undefined;
}
```

## 判断 narration（第 110-121 行，`isAnthropicNarrationSignature`）

注释为 `Only an exact narration kind matches; any other or unreadable header stays reasoning.`

```ts
export function isAnthropicNarrationSignature(signature: string): boolean {
	const header = anthropicSignatureHeader(signature);
	if (!header) return false;
	const kind = lengthDelimitedField(header, HEADER_KIND_FIELD);
	return kind !== undefined && Buffer.from(kind).equals(NARRATION_KIND);
}
```

## OpenRouter reasoning 入口（第 123-133 行，`servedModelFromOpenRouterReasoning`）

要求 `format === "anthropic-claude-v1"` 且 `signature` 为字符串，再转调 `servedModelFromAnthropicSignature(item.signature)`。

## 调用点

`pi-ai/src/providers/anthropic.ts` 第 149 行同时 import 两个函数。第 2737-2742 行：

```ts
						// block; a gateway serving a different model than requested
						// cannot mint one that says otherwise.
						if (!output.upstreamModel) {
							output.upstreamModel = servedModelFromAnthropicSignature(block.thinkingSignature);
						}
						if (isAnthropicNarrationSignature(block.thinkingSignature)) block.narration = true;
```

类型声明位于 `pi-ai/dist/types/providers/anthropic-signature.d.ts` 第 21 行。

## 证据边界

以上全部为本机 18.12.6 源码直读。函数的运行时行为、不同网关输出的 signature 分布未在本文件记录。函数只读取明文头，不校验 signature 密文部分的密码学有效性。
