let manifest;
const hash = bytes => crypto.subtle.digest('SHA-256', bytes).then(d => Array.from(new Uint8Array(d), b => b.toString(16).padStart(2, '0')).join(''));
function authorized(path) {
  const token = globalThis.location && new URLSearchParams(location.search).get('token');
  if (!token) return path;
  const url = new URL(path, location.href);
  if (url.origin !== location.origin) throw Error('Cross-origin resource refused');
  url.searchParams.set('token', token);
  return url;
}
async function config() {
  if (manifest) return manifest;
  const response = await fetch(authorized('./fonts.json'), {cache: 'no-store'});
  if (!response.ok) throw Error(`Font manifest HTTP ${response.status}`);
  const value = await response.json();
  if (value.schemaVersion !== 1 || !/^[a-f0-9]{64}$/.test(value.wasmSha256) || value.wasmUrl !== './pkg/client.wasm' || !Array.isArray(value.fonts) || value.fonts.length < 2) throw Error('Invalid font manifest');
  const slots = new Set();
  for (const [i, font] of value.fonts.entries()) {
    if (font.style !== 'Regular' && font.style !== 'Bold' || !font.url.startsWith('./pkg/MapleMono-NF-CN-') || !/^[a-f0-9]{64}$/.test(font.sha256)) throw Error('Invalid font identity');
    for (const key of ['slot','expectedPointer','expectedLength','bytes']) if (!Number.isSafeInteger(font[key]) || font[key] <= 0 || font[key] > 0xffffffff) throw Error(`Invalid font ${key}`);
    if ([...slots].some(slot => Math.abs(slot - font.slot) < 8)) throw Error('Overlapping font descriptors');
    slots.add(font.slot);
  }
  manifest = value;
  return value;
}
async function fetchBytes(path, expected) {
  const response = await fetch(authorized(path), {cache: 'no-store'});
  if (!response.ok) throw Error(`Resource HTTP ${response.status}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (await hash(bytes) !== expected) throw Error('Resource SHA-256 mismatch');
  return bytes;
}
export async function loadClient() {
  const value = await config();
  return fetchBytes(value.wasmUrl, value.wasmSha256);
}
export async function injectMaple(wasm) {
  const value = await config();
  if (!(wasm.memory instanceof WebAssembly.Memory) || typeof wasm.__wbindgen_malloc !== 'function') throw Error('Missing WASM memory or allocator');
  const loaded = [];
  for (const font of value.fonts) {
    const view = new DataView(wasm.memory.buffer);
    if (font.slot + 8 > view.byteLength || view.getUint32(font.slot, true) !== font.expectedPointer || view.getUint32(font.slot + 4, true) !== font.expectedLength) throw Error('Font descriptor differs from analyzed module');
    const bytes = await fetchBytes(font.url, font.sha256);
    if (bytes.length !== font.bytes) throw Error('Font length mismatch');
    loaded.push({font, bytes});
  }
  const byStyle = {};
  for (const {font, bytes} of loaded) {
    if (!byStyle[font.style]) byStyle[font.style] = {font, bytes, slots: []};
    byStyle[font.style].slots.push(font.slot);
  }
  const allocations = Object.values(byStyle).map(({font, bytes, slots}) => {
    const pointer = wasm.__wbindgen_malloc(bytes.length, 1) >>> 0;
    if (!pointer || pointer + bytes.length > wasm.memory.buffer.byteLength || pointer < font.expectedPointer + font.expectedLength) throw Error('Invalid font allocation');
    return {font, bytes, pointer, slots};
  });
  if (allocations[0].pointer < allocations[1].pointer + allocations[1].bytes.length && allocations[1].pointer < allocations[0].pointer + allocations[0].bytes.length) throw Error('Overlapping font allocations');
  for (const {pointer,bytes} of allocations) {
    if (value.fonts.some(font => pointer < font.slot + 8 && pointer + bytes.length > font.slot)) throw Error('Font allocation overlaps descriptor');
  }
  for (const {bytes,pointer} of allocations) new Uint8Array(wasm.memory.buffer,pointer,bytes.length).set(bytes);
  const view = new DataView(wasm.memory.buffer);
  for (const {bytes,pointer,slots} of allocations) {
    for (const slot of slots) { view.setUint32(slot,pointer,true); view.setUint32(slot+4,bytes.length,true); }
  }
  return {family:'Maple Mono NF CN',fonts:allocations.map(({font,bytes,pointer,slots})=>({style:font.style,pointer,bytes:bytes.length,slot:slots[0],slots}))};
}
