# Tern 网页 Maple 修改：完整源码与重建记录

> Source: 2026-10-13 会话中实际执行的命令、最终工作源码及用户验收；本轮只补全归档，不制作新补丁
> Collected: 2026-10-14
> Published: Unknown

以下代码保留会话中实际使用的版本、路径和标识符。它们是 Tern 0.8.3 / Maple 7.9 的完整实例；下一版本需要按文章的配置清单更新。没有把 WASM、字体二进制或内存快照放进仓库。

## 资源与目录

运行时目录为 `/home/cpf/.local/share/tern-web-maple/`，包含：

- `index.html`、`maple.js`、`fonts.json`、`prepare-fonts.py`、`serve.py`、`daemon.py`
- `pkg/stencil_tern_web.js`：原版 JavaScript glue
- `pkg/stencil_tern_web_bg.wasm`：保留的原版 WASM
- `pkg/stencil_tern_web_maple_bg.wasm`：修改版 WASM
- `fonts/MapleMono-NF-CN-Regular.ttf`、`fonts/MapleMono-NF-CN-Bold.ttf`：完整字形，lookup 名称与原版一致

输入字体目录为 `/home/cpf/.local/share/fonts/maple-win/`。临时工作目录为 `/tmp/tern-font-poc/`。临时文件消失后，重新从原版资源生成，不将路径存在作为前提。

原版公开资源：

```text
https://build.stencil.so/web/tern/0.8.3/stencil_tern_web_bg.wasm
```

JavaScript glue 可从匹配版本的原版 `tern web serve` 的 `/pkg/stencil_tern_web.js` 取得。

## 初始化内存的生成方法

会话中使用 Bun 的标准 WebAssembly API，实例化原版模块并读取导出的 `memory`。import stub 在被调用时立即抛出；这个步骤只用于还原初始数据，不证明客户端启动或渲染正常。

执行过的逻辑如下；输入、输出路径随工作目录调整：

```javascript
const module = new WebAssembly.Module(await Bun.file('/tmp/tern-font-poc/client.wasm').arrayBuffer());
const imports = {};
for (const item of WebAssembly.Module.imports(module)) {
  if (item.kind !== 'function') throw new Error(`Unexpected import kind: ${item.kind}`);
  (imports[item.module] ??= {})[item.name] = () => {
    throw new Error(`Unexpected imported call: ${item.name}`);
  };
}
const instance = new WebAssembly.Instance(module, imports);
await Bun.write('/tmp/tern-font-poc/before.bin', new Uint8Array(instance.exports.memory.buffer));
```

实际原版初始内存为 `19,333,120` bytes。之后真实 Chromium 的客户端 `init()` 也返回了相同大小的初始内存。FontTools 应解析内存中的字体字节，不能直接把整个 WASM 当字体文件解析。

## 原字体定位：实际使用的 FontTools 扫描逻辑

下面代码定位候选签名并交给 FontTools 解析字体。最终目标以字体 name table 确认，打印出的 offset 是内存地址。

```python
from io import BytesIO
from pathlib import Path
from fontTools.ttLib import TTFont, TTLibError

blob = Path('/tmp/tern-font-poc/before.bin').read_bytes()
found = 0
for signature in (b'\x00\x01\x00\x00', b'OTTO'):
    start = 0
    while True:
        offset = blob.find(signature, start)
        if offset < 0:
            break
        start = offset + 4
        if not 1 <= int.from_bytes(blob[offset + 4:offset + 6], 'big') <= 64:
            continue
        if blob[offset + 12:offset + 16] not in (b'CFF ', b'GDEF', b'BASE', b'DSIG', b'FFTM', b'GPOS', b'GSUB', b'OS/2', b'cmap', b'head'):
            continue
        try:
            font = TTFont(BytesIO(blob[offset:]), lazy=True)
            names = font['name'].names
            family = next(n.toUnicode() for n in names if n.nameID == 1)
            style = next(n.toUnicode() for n in names if n.nameID == 2)
            cmap = font.getBestCmap()
        except (TTLibError, KeyError, StopIteration, AssertionError, UnicodeDecodeError):
            continue
        found += 1
        print({'offset': offset, 'family': family, 'style': style, 'glyphs': len(cmap), '发生': {c: cmap.get(ord(c)) for c in '发生'}})
        font.close()
assert found > 0
print('embedded_faces:', found)
```

本次识别到八个字体；原 terminal 两个 face 均为 `11,217` 个字符映射。定位下个版本时，候选筛选或 family 改变会要求检查来源，不能在识别失败时使用旧地址。

## WAT 指令修改与编译

使用 WABT 1.0.42。Linux x64 发布资源及校验文件为：

```text
https://github.com/WebAssembly/wabt/releases/download/1.0.42/wabt-1.0.42-linux-x64.tar.gz
https://github.com/WebAssembly/wabt/releases/download/1.0.42/wabt-1.0.42-linux-x64.tar.gz.sha256
```

步骤：取得并校验工具包；用 `wasm2wat` 反汇编原版 WASM；搜索下列实际 code 指令的常量；只编辑已经确认的字体加载引用；编译为不同文件，保留原版。

本次反汇编源码中，两条加载路径分别位于：

| 原 WAT 行号 | 原常量 | 修改后的指令 |
|---|---:|---|
| 8241833 | 4299258 | `i32.const 8962760` + `i32.load` |
| 8241834 | 2288420 | `i32.const 8962764` + `i32.load` |
| 8241971 | 6587678 | `i32.const 8962784` + `i32.load` |
| 8241972 | 2313308 | `i32.const 8962788` + `i32.load` |
| 14017193 | 2288420 | `i32.const 8962764` + `i32.load` |
| 14017196 | 4299258 | `i32.const 8962760` + `i32.load` |
| 14017243 | 2313308 | `i32.const 8962788` + `i32.load` |
| 14017246 | 6587678 | `i32.const 8962784` + `i32.load` |

行号随版本与反汇编方式变化，只作 0.8.3 定位记录。实际指令上下文包含一条 font load 调用路径和一条将 pointer/length 写入临时结构的路径；后者也要修改。

源码很大，工具未提供编辑锚点时，本次用 `split -l 20000 -d -a 4` 分成未经修改的源码片段，再通过 Edit 修改命中的两份片段。编译时按文件名顺序把全部片段传入标准编译器，未手写 WASM 二进制解析器。

实际编译输入脚本如下：

```python
from pathlib import Path
import shutil
import subprocess

root = Path('/tmp/tern-font-poc')
process = subprocess.Popen([
    str(root / 'wabt-1.0.42/bin/wat2wasm'), '-',
    '-o', '/home/cpf/.local/share/tern-web-maple/pkg/stencil_tern_web_maple_bg.wasm',
], stdin=subprocess.PIPE)
for part in sorted((root / 'wat-parts').glob('part-*')):
    with part.open('rb') as source:
        shutil.copyfileobj(source, process.stdin)
process.stdin.close()
raise SystemExit(process.wait())
```

`wat2wasm` 使用默认浏览器兼容输出。随后通过 `wasm-validate` 和真实引擎解析，不仅以工具启用全部 proposal 后的验证结果作为验收。最终 hash 为 `dba5a764b1e225d451b6376757e247214ec1002f60d2ae26dfb75574cc2e2d9b`。

## 完整 `prepare-fonts.py`

```python
import hashlib
import json
import struct
from copy import deepcopy
from io import BytesIO
from pathlib import Path
from fontTools.ttLib import TTFont

root = Path(__file__).parent
memory = Path('/tmp/tern-font-poc/before.bin').read_bytes()
wasm = (root / 'pkg/stencil_tern_web_maple_bg.wasm').read_bytes()
fonts = []
for style, pointer in [('Regular', 4299258), ('Bold', 6587678)]:
    original = TTFont(BytesIO(memory[pointer:]))
    length = max(t.offset + t.length for t in original.reader.tables.values())
    descriptor = struct.pack('<II', pointer, length)
    slot = memory.find(descriptor)
    assert slot >= 0 and memory.find(descriptor, slot + 1) == -1
    source = Path('/home/cpf/.local/share/fonts/maple-win') / f'MapleMono-NF-CN-{style}.ttf'
    font = TTFont(source)
    version = font['name'].getDebugName(5)
    assert version == 'Version 7.900'
    assert font['name'].getDebugName(1) == 'Maple Mono NF CN'
    source_cmap = font.getBestCmap().copy()
    assert all(ord(c) in source_cmap for c in '发生中文测试你好')
    assert 0xe0b0 in source_cmap and 0xf015 in source_cmap
    original_names = deepcopy(original['name'].names)
    matching_ids = {1, 2, 4, 6, 16, 17}
    font['name'].names = [n for n in font['name'].names if n.nameID not in matching_ids]
    font['name'].names.extend(n for n in original_names if n.nameID in matching_ids)
    target = root / 'fonts' / f'MapleMono-NF-CN-{style}.ttf'
    font.save(target)
    saved = TTFont(target)
    assert saved.getBestCmap() == source_cmap
    assert saved.getGlyphOrder() == font.getGlyphOrder()
    data = target.read_bytes()
    fonts.append({'style': style, 'slot': slot, 'expectedPointer': pointer, 'expectedLength': length, 'url': f'./fonts/{target.name}', 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest(), 'sourceSha256': hashlib.sha256(source.read_bytes()).hexdigest(), 'sourceFamily': 'Maple Mono NF CN', 'sourceVersion': version, 'lookupFamily': saved['name'].getDebugName(1), 'glyphs': len(source_cmap), 'cjk': sum(0x4e00 <= c <= 0x9fff for c in source_cmap), 'nerdPua': sum(0xe000 <= c <= 0xf8ff or 0xf0000 <= c <= 0xffffd for c in source_cmap)})
manifest = {'ternVersion': '0.8.3', 'mapleVersion': '7.9', 'wasmSha256': hashlib.sha256(wasm).hexdigest(), 'fonts': fonts}
(root / 'fonts.json').write_text(json.dumps(manifest, indent=2) + '\n')
print(json.dumps(manifest, indent=2))
```

`fonts/` 应在执行前创建。字体输入、快照路径、版本断言和原字体 pointer 是版本迁移时明确更新的配置，不依赖保留着上次的 `/tmp` 文件。

## 完整 `maple.js`

```javascript
const WASM_SHA256 = 'dba5a764b1e225d451b6376757e247214ec1002f60d2ae26dfb75574cc2e2d9b';
const SLOTS = [
  {style: 'Regular', slot: 8962760, pointer: 4299258, length: 2288420},
  {style: 'Bold', slot: 8962784, pointer: 6587678, length: 2313308},
];

async function fetchBytes(url, expectedHash) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`资源加载失败：${url} (${response.status})`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  const hash = Array.from(digest, n => n.toString(16).padStart(2, '0')).join('');
  if (hash !== expectedHash) throw new Error(`资源校验失败：${url}`);
  return bytes;
}

export function loadClient() {
  return fetchBytes('./pkg/stencil_tern_web_maple_bg.wasm', WASM_SHA256);
}

export async function injectMaple(wasm) {
  const response = await fetch('./fonts.json');
  if (!response.ok) throw new Error(`字体清单加载失败：${response.status}`);
  const manifest = await response.json();
  if (manifest.ternVersion !== '0.8.3' || manifest.mapleVersion !== '7.9' || manifest.wasmSha256 !== WASM_SHA256 || !Array.isArray(manifest.fonts) || manifest.fonts.length !== SLOTS.length) {
    throw new Error('字体清单版本或结构不匹配');
  }
  if (!(wasm.memory instanceof WebAssembly.Memory) || typeof wasm.__wbindgen_malloc !== 'function') {
    throw new Error('WASM 缺少内存分配接口');
  }
  const loaded = [];
  for (let i = 0; i < SLOTS.length; i++) {
    const expected = SLOTS[i];
    const font = manifest.fonts[i];
    if (font.style !== expected.style || font.slot !== expected.slot || font.expectedPointer !== expected.pointer || font.expectedLength !== expected.length || font.url !== `./fonts/MapleMono-NF-CN-${expected.style}.ttf` || !Number.isSafeInteger(font.bytes) || font.bytes <= 0 || !/^[a-f0-9]{64}$/.test(font.sha256)) {
      throw new Error(`字体记录不匹配：${expected.style}`);
    }
    const view = new DataView(wasm.memory.buffer);
    if (view.getUint32(expected.slot, true) !== expected.pointer || view.getUint32(expected.slot + 4, true) !== expected.length) {
      throw new Error(`WASM 字体地址记录不匹配：${expected.style}`);
    }
    const bytes = await fetchBytes(font.url, font.sha256);
    if (bytes.length !== font.bytes) throw new Error(`字体长度不匹配：${expected.style}`);
    loaded.push({expected, bytes});
  }
  const patched = [];
  for (const {expected, bytes} of loaded) {
    const pointer = wasm.__wbindgen_malloc(bytes.length, 1) >>> 0;
    if (!pointer || pointer < expected.pointer + expected.length || pointer + bytes.length > wasm.memory.buffer.byteLength) {
      throw new Error(`字体内存分配失败：${expected.style}`);
    }
    new Uint8Array(wasm.memory.buffer, pointer, bytes.length).set(bytes);
    const view = new DataView(wasm.memory.buffer);
    view.setUint32(expected.slot, pointer, true);
    view.setUint32(expected.slot + 4, bytes.length, true);
    patched.push({style: expected.style, pointer, bytes: bytes.length, slot: expected.slot});
  }
  return {version: manifest.mapleVersion, family: 'Maple Mono NF CN', fonts: patched};
}
```

## 完整 `index.html`

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Tern · Maple Mono NF CN</title>
  <link rel="icon" href="data:,">
  <style>
    html, body { margin: 0; height: 100%; overflow: hidden; background: #1b1b1f; }
    canvas { display: block; width: 100vw; height: 100vh; outline: none; }
    #status { position: fixed; inset: 0; display: grid; place-items: center; font: 14px system-ui; color: #b4b4bc; white-space: pre-line; text-align: center; }
    #status.error { color: #ff7a85; }
  </style>
</head>
<body>
  <canvas id="tern" tabindex="0"></canvas>
  <div id="status" role="status">正在加载 Tern 和完整 Maple Mono NF CN 字体…</div>
  <script type="module">
    import init, { mount } from './pkg/stencil_tern_web.js';
    import { loadClient, injectMaple } from './maple.js?revision=2';
    const status = document.getElementById('status');
    try {
      if (!navigator.gpu) throw new Error('浏览器未提供 WebGPU，请使用支持 WebGPU 的浏览器并启用图形加速。');
      const wasm = await init({ module_or_path: await loadClient() });
      window.ternMaple = await injectMaple(wasm);
      status.textContent = '完整 Maple 字体已注入，正在连接 Tern 会话…';
      const token = new URLSearchParams(location.search).get('token');
      if (!token) throw new Error('请打开服务启动时打印的带 token 网址。');
      const wire = new URL(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/wire`);
      wire.searchParams.set('token', token);
      const canvas = document.getElementById('tern');
      window.tern = await mount(canvas, wire.href);
      status.remove();
      canvas.focus();
    } catch (error) {
      status.textContent = `Tern 启动失败：${error.message ?? error}`;
      status.className = 'error';
      console.error(error);
    }
  </script>
</body>
</html>
```

## 完整 `fonts.json`

```json
{
  "ternVersion": "0.8.3",
  "mapleVersion": "7.9",
  "wasmSha256": "dba5a764b1e225d451b6376757e247214ec1002f60d2ae26dfb75574cc2e2d9b",
  "fonts": [
    {
      "style": "Regular",
      "slot": 8962760,
      "expectedPointer": 4299258,
      "expectedLength": 2288420,
      "url": "./fonts/MapleMono-NF-CN-Regular.ttf",
      "bytes": 20564496,
      "sha256": "fe14b378a0a0c299c186bdac3370c0a66c358f44d27283fa8ee004c8ad90a900",
      "sourceSha256": "8b4f149beaead3eac78ffb84adf31513ebf06fe6dbc6e181ccd9debad3c70f1a",
      "sourceFamily": "Maple Mono NF CN",
      "sourceVersion": "Version 7.900",
      "lookupFamily": "BerkeleyMono Nerd Font",
      "glyphs": 33091,
      "cjk": 20976,
      "nerdPua": 10379
    },
    {
      "style": "Bold",
      "slot": 8962784,
      "expectedPointer": 6587678,
      "expectedLength": 2313308,
      "url": "./fonts/MapleMono-NF-CN-Bold.ttf",
      "bytes": 20517844,
      "sha256": "a399807f27b9af23fdb62f878e8cd7eee3c0bdb915d8b2f4395ef3633e89a418",
      "sourceSha256": "25a3c344f0d915e443bd09339ef512f9cade14c2200612a37e6b8e8261940152",
      "sourceFamily": "Maple Mono NF CN",
      "sourceVersion": "Version 7.900",
      "lookupFamily": "BerkeleyMono Nerd Font Medium",
      "glyphs": 33091,
      "cjk": 20976,
      "nerdPua": 10379
    }
  ]
}
```

## 完整 `serve.py`

```python
import json
import os
from pathlib import Path
import re
import signal
import subprocess

root = Path(__file__).parent
environment = dict(os.environ, TERN_DAEMON_SOCKET='/run/user/1000/tern/daemon.sock')
process = subprocess.Popen(
    [str(Path.home() / '.local/bin/tern'), 'web', 'serve', '--listen', '127.0.0.1:8378', '--assets', str(root)],
    env=environment,
    stdout=subprocess.PIPE,
    stderr=subprocess.STDOUT,
    text=True,
    bufsize=1,
)
signal.signal(signal.SIGTERM, lambda *_: process.terminate())
signal.signal(signal.SIGINT, lambda *_: process.terminate())
try:
    for line in process.stdout:
        if line.startswith('{'):
            record = json.loads(line)
            if 'listening' in record:
                print(f'Tern Maple listening on {record["listening"]}', flush=True)
                continue
        print(re.sub(r'token=[^\s"&]+', 'token=<REDACTED>', line), end='', flush=True)
    raise SystemExit(process.wait())
finally:
    if process.poll() is None:
        process.terminate()
        process.wait()
```

## 完整 `daemon.py`

```python
from pathlib import Path
import signal
import subprocess
import time

socket_path = Path('/run/user/1000/tern/daemon.sock')
process = subprocess.Popen([
    str(Path.home() / '.local/bin/tern'), 'daemon', '--socket', str(socket_path),
])
signal.signal(signal.SIGTERM, lambda *_: process.terminate())
signal.signal(signal.SIGINT, lambda *_: process.terminate())
try:
    deadline = time.monotonic() + 15
    while not socket_path.exists():
        if process.poll() is not None:
            raise RuntimeError(f'Tern daemon 已退出：{process.returncode}')
        if time.monotonic() >= deadline:
            raise TimeoutError('Tern daemon 未创建 socket')
        time.sleep(0.1)
    if process.poll() is not None:
        raise RuntimeError(f'Tern daemon 已退出：{process.returncode}')
    print('Tern session daemon ready', flush=True)
    raise SystemExit(process.wait())
finally:
    if process.poll() is None:
        process.terminate()
        process.wait()
```

启动顺序为 daemon、`tern ls --json` 验证连接、网页服务。目录 `/home/cpf/.config/tern/plugins` 缺失时，应在启动前创建。socket 文件存在与 supervisor 曾报告 ready，都不能代替当前 daemon 可连接的检查。

## 已执行的非视觉检查源码

以下是会话最后实际执行过的模块、内存、浏览器初始化和连接检查。它没有调用 `mount()` 或截图；浏览器渲染结果由用户单独确认。

```javascript
import assert from 'node:assert/strict';
import { chromium } from '/home/cpf/.bun/install/cache/playwright@1.64.0@@@1/index.mjs';
const directory='/home/cpf/.local/share/tern-web-maple/pkg/';
const original=new WebAssembly.Module(await Bun.file(directory+'stencil_tern_web_bg.wasm').arrayBuffer());
const patched=new WebAssembly.Module(await Bun.file(directory+'stencil_tern_web_maple_bg.wasm').arrayBuffer());
assert.deepEqual(WebAssembly.Module.imports(patched),WebAssembly.Module.imports(original));
assert.deepEqual(WebAssembly.Module.exports(patched),WebAssembly.Module.exports(original));
const imports={};for(const item of WebAssembly.Module.imports(original)){(imports[item.module]??={})[item.name]=()=>{throw Error('Unexpected initialization import')};}
const before=new Uint8Array(new WebAssembly.Instance(original,imports).exports.memory.buffer);
const after=new Uint8Array(new WebAssembly.Instance(patched,imports).exports.memory.buffer);
assert.deepEqual(after,before);
console.log('module_valid=true imports_exports_unchanged=true initial_memory_unchanged=true');
const browser=await chromium.launch({executablePath:'/home/cpf/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome',headless:true});
try {
 const page=await browser.newPage();
 await page.route('http://127.0.0.1:8378/',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><title>Nonvisual loader test</title>'}));
 await page.goto('http://127.0.0.1:8378/');
 const report=await page.evaluate(async()=>{
  const {default:init}=await import('/pkg/stencil_tern_web.js');
  const {loadClient,injectMaple}=await import('/maple.js?revision=2');
  const wasm=await init({module_or_path:await loadClient()});
  const result=await injectMaple(wasm);
  for(const font of result.fonts){
   const view=new DataView(wasm.memory.buffer);
   if(view.getUint32(font.slot,true)!==font.pointer||view.getUint32(font.slot+4,true)!==font.bytes)throw Error('Font binding mismatch');
   const bytes=new Uint8Array(wasm.memory.buffer,font.pointer,font.bytes);
   if(bytes[0]!==0||bytes[1]!==1||bytes[2]!==0||bytes[3]!==0)throw Error('Missing font header');
  }
  return {...result,actualBrowserInit:true,mountCalled:false};
 });
 console.log(JSON.stringify(report));
} finally {await browser.close();}
const response=await fetch('http://127.0.0.1:8378/?token='+process.env.TERN_PROBE_TOKEN);
assert.equal(response.status,200);
assert.match(await response.text(),/maple\.js\?revision=2/);
const socket=new WebSocket('ws://127.0.0.1:8378/wire?token='+process.env.TERN_PROBE_TOKEN);
await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('WebSocket timeout')),5000);socket.onopen=()=>{clearTimeout(timer);socket.close();resolve()};socket.onerror=()=>{clearTimeout(timer);reject(Error('Authentication failed'))};});
console.log('updated_page_http=200 user_token_websocket_authenticated=true');
```

环境中的 `TERN_PROBE_TOKEN` 仅在运行时提供，不写入源码、不打印。Playwright 模块与 Chromium 路径随实际安装更新。

## 完成条件与版本迁移输入

已有成功验收包括：默认编译输出能被实际引擎接受；原版与修改版 imports/exports 和初始内存相同；真实 browser `init()` 成功；字体引用指向新内存；HTTP 与 `/wire` 可用；用户确认中文和 Nerd Font 图标正常。

下一版本必须重新确认：原版字体 family、内存 pointer/length、描述符位置、实际 code 引用次数、目标 WASM hash、字体版本、安装路径、daemon socket 和可用端口。该资料提供方法与完整当前实例，不承诺新的未知客户端结构无需分析。
