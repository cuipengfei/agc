# T3 Code — 内置 drivers、Pi 与 ACP 源码摘录

> Source: https://github.com/pingdotgg/t3code/tree/9c161462c94f7d9d6d9169da5c841457cbadf213 (official source)
> Collected: 2026-10-18
> Published: 2026-10-18 (source commit date not separately verified)

## apps/server/src/provider/builtInDrivers.ts

```ts
export const BUILT_IN_DRIVERS: ReadonlyArray<AnyProviderDriver<BuiltInDriversEnv>> = [
  CodexDriver,
  ClaudeDriver,
  CursorDriver,
  GrokDriver,
  OpenCodeDriver,
  AntigravityDriver,
  PiDriver,
  MuseDriver,
  AcpRegistryDriver,
];

export type BuiltInUsageReadersEnv =
  | ProviderUsageReaderEnv<typeof ClaudeDriver>
  | ProviderUsageReaderEnv<typeof CodexDriver>
  | ProviderUsageReaderEnv<typeof GrokDriver>
  | ProviderUsageReaderEnv<typeof OpenCodeDriver>
  | ProviderUsageReaderEnv<typeof AntigravityDriver>
  | ProviderUsageReaderEnv<typeof CursorDriver>
  | ProviderUsageReaderEnv<typeof PiDriver>;
```

## packages/provider-pi/src/server/driver.ts

```ts
const UPDATE = makePackageManagedProviderMaintenanceResolver({
  provider: DRIVER_KIND,
  npmPackageName: "@earendil-works/pi-coding-agent",
  nativeUpdate: { args: ["update", "--self"] },
});

export const PiDriver: ProviderDriver<PiSettings, PiDriverEnv, Path.Path> = {
  driverKind: DRIVER_KIND,
  metadata: {
    displayName: "Pi",
```

## packages/provider-pi/src/server/adapter.test.ts

```ts
const connection = yield* makePiRpcConnection({
  command: "pi",
  args: ["--mode", "rpc"],
  cwd: undefined,
  env: {},
})
```

## packages/provider-acp-registry/src/settings.ts

```ts
source: Schema.Literals(["registry", "local"]).pipe(
  Schema.withDecodingDefault(Effect.succeed("registry")),
  Schema.annotateKey({
    title: "ACP source",
    providerSettingsForm: {
      control: "select",
      options: [
        { value: "registry", label: "ACP Registry" },
        { value: "local", label: "Local command" },
      ],
    },
  }),
),

commandPath: TrimmedString.pipe(
  Schema.withDecodingDefault(Effect.succeed("")),
  Schema.annotateKey({
    title: "Executable override",
    description:
      "Executable on this environment. For registry agents, this overrides the distribution executable while keeping its arguments and environment.",
```
