# Node-API (N-API) and napi-rs — source excerpts

> Source: https://nodejs.org/api/n-api.html (read 2026-09-27); https://napi.rs/docs/introduction/getting-started (read 2026-09-27); https://napi.rs/docs/more/support-compatibility (read 2026-09-27); local pi-natives package files
> Collected: 2026-09-27
> Published: Unknown

## nodejs.org/api/n-api.html — Node-API definition (verbatim intro paragraph)

"Node-API (formerly N-API) is an API for building native Addons. It is independent from the underlying JavaScript runtime (for example, V8) and is maintained as part of Node.js itself. This API will be Application Binary Interface (ABI) stable across versions of Node.js. It is intended to insulate addons from changes in the underlying JavaScript engine and allow modules compiled for one major version to run on later major versions of Node.js without recompilation. The ABI Stability guide provides a more in-depth explanation."

"Addons are built/packaged with the same approach/tools outlined in the section titled C++ Addons. The only difference is the set of APIs that are used by the native code. Instead of using the V8 or Native Abstractions for Node.js APIs, the functions available in Node-API are used."

Stability marker on the page: "Stability: 2 - Stable". Page version: Node.js v26.10.0.

## napi.rs/docs/introduction/getting-started — napi-rs framework (verbatim)

Prerequisites section: "Rust 1.88 or newer, including Cargo. Installing Rust through rustup is recommended."

"Node-API makes a native binary ABI-compatible with later Node.js releases that provide the Node-API level it was compiled against. That is different from the Node versions and target triples exercised by napi-rs CI."

Build output: "It produces: `<binaryName>.<platform-arch-abi>.node`, the native addon. `index.js`, the generated loader. `index.d.ts`, the generated TypeScript declarations when type generation is enabled."

Source-file table row: "`src/lib.rs` | Rust functions, structs, and classes exported with `#[napi]`".

Distribution: "napi-rs normally publishes a small root package plus one optional package per platform." "The generated `index.js` first looks for a local addon produced during development. In an installed package, it loads the optional package matching the current operating system, CPU, and Linux libc."

## napi.rs/docs/more/support-compatibility — ABI scope and runtime status (verbatim)

"Node-API provides ABI stability across Node.js versions. A native binary built against Node-API level `N` can generally load on later Node.js releases that still provide level `N`, without rebuilding for every Node major."

"That guarantee does not cover: APIs introduced after the selected Node-API level. Operating-system, CPU, libc, C++ runtime, or minimum deployment-target compatibility. Bugs in an alternate runtime's Node-API implementation. Native libraries linked by your own dependencies."

JavaScript runtimes table, Bun row: "Best effort. The source repository runs a latest-Bun job, but the test step is `continue-on-error`, so Bun failures do not block napi-rs releases. Test your actual addon before claiming support."

JavaScript runtimes table, Node.js row: "Primary runtime. Release claims should still be limited to the Node versions and platforms your package tests."

"The current napi-rs v3 workspace declares Rust 1.88 as its minimum Rust version."

## OMP pi-natives usage evidence (local files)

pi-natives/package.json (v18.3.5), devDependencies:
```json
"@napi-rs/cli": "3.7.2"
```

pi-natives/package.json, napi config block:
```json
"napi": {
	"binaryName": "pi_natives",
	"triples": {}
}
```

pi-natives/package.json, description field:
"Native Rust bindings for PDF conversion, audio, WebRTC, grep, clipboard, image processing, syntax highlighting, PTY, and shell operations via N-API"

pi-natives/package.json, engines field: `"bun": ">=1.3.14"`

Binary symbol (strings extraction from pi_natives.linux-x64-modern.node):
napi_register_module_v1
