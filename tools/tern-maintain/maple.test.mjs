import {test,expect} from 'bun:test';
import binaryen from 'binaryen';
import {sha256} from './analyze.mjs';
let serial=0;
function fixture(){
 const m=binaryen.parseText('(module (memory (export "memory") 1) (global $heap (mut i32) (i32.const 32768)) (func (export "__wbindgen_malloc") (param $size i32) (param i32) (result i32) (local $old i32) (local.set $old (global.get $heap)) (global.set $heap (i32.add (global.get $heap) (local.get $size))) (local.get $old)))');
 try{const instance=new WebAssembly.Instance(new WebAssembly.Module(m.emitBinary())).exports;const v=new DataView(instance.memory.buffer);v.setUint32(100,200,true);v.setUint32(104,20,true);v.setUint32(120,300,true);v.setUint32(124,20,true);return instance;}finally{m.dispose();}
}
async function run(tamper){
 const wasm=fixture(),fonts=[new Uint8Array([1,2,3]),new Uint8Array([4,5,6])];
 const manifest={schemaVersion:1,wasmSha256:'a'.repeat(64),wasmUrl:'./pkg/client.wasm',fonts:['Regular','Bold'].map((style,i)=>({style,slot:100+i*20,expectedPointer:200+i*100,expectedLength:20,url:`./pkg/MapleMono-NF-CN-${style}.ttf`,bytes:3,sha256:sha256(fonts[i])}))};
 const saved=globalThis.fetch;
 globalThis.fetch=async path=>path==='./fonts.json'?Response.json(manifest):new Response(path.includes('Regular')?fonts[0]:tamper?new Uint8Array([9,9,9]):fonts[1]);
 try{
 const {injectMaple}=await import(`./maple.mjs?test=${serial++}`);
 if(tamper){await expect(injectMaple(wasm)).rejects.toThrow('SHA-256');const v=new DataView(wasm.memory.buffer);expect(v.getUint32(100,true)).toBe(200);expect(v.getUint32(120,true)).toBe(300);}
 else{const result=await injectMaple(wasm);for(const [i,font] of result.fonts.entries()){expect(Array.from(new Uint8Array(wasm.memory.buffer,font.pointer,3))).toEqual(Array.from(fonts[i]));const v=new DataView(wasm.memory.buffer);expect(v.getUint32(100+i*20,true)).toBe(font.pointer);expect(v.getUint32(104+i*20,true)).toBe(3);}}
 }finally{globalThis.fetch=saved;}
}
test('complete font bytes reach both actual WASM descriptors',()=>run(false));
test('second font integrity failure leaves both descriptors unchanged',()=>run(true));
