import {parseArgs} from 'node:util';
import {join,resolve} from 'node:path';
import {writeFile} from 'node:fs/promises';
import {browserCheck} from './runtime.mjs';
const {values:v}=parseArgs({args:process.argv.slice(2),options:Object.fromEntries(['fonts','wasm','glue','playwright-module','chromium-executable','out'].map(k=>[k,{type:'string'}]))});
for(const k of ['fonts','wasm','glue','playwright-module','chromium-executable','out'])if(!v[k])throw Error(`Missing --${k}`);
const files=new Map([
 ['/maple.js',new URL('./maple.mjs',import.meta.url).pathname],
 ['/fonts.json',join(resolve(v.fonts),'fonts.json')],
 ['/pkg/client.js',resolve(v.glue)],['/pkg/client.wasm',resolve(v.wasm)],
 ...['Regular','Bold'].map(s=>[`/pkg/MapleMono-NF-CN-${s}.ttf`,join(resolve(v.fonts),'pkg',`MapleMono-NF-CN-${s}.ttf`)]),
]);
const server=Bun.serve({hostname:'127.0.0.1',port:0,fetch(request){
 const path=new URL(request.url).pathname;
 if(path==='/')return new Response('<!doctype html><title>Tern headless resource verification</title>',{headers:{'Content-Type':'text/html'}});
 if(!files.has(path))return new Response('Not found',{status:404});
 return new Response(Bun.file(files.get(path)),{headers:{'Content-Type':path.endsWith('.js')?'text/javascript':path.endsWith('.wasm')?'application/wasm':path.endsWith('.json')?'application/json':'font/ttf'}});
}});
try{
 const result=await browserCheck({url:`http://127.0.0.1:${server.port}/`,playwrightModule:resolve(v['playwright-module']),chromiumExecutable:resolve(v['chromium-executable'])});
 await writeFile(v.out,JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(result));
 if(result.checks.some(c=>c.status==='failed'))process.exitCode=1;
}finally{server.stop(true);}
