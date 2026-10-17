import { parseHTML } from 'linkedom';
import { createHash } from 'node:crypto';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { initialMemory, sha256 } from './analyze.mjs';
import { interfaceInfo } from './interface.mjs';

export function releaseLink(html, base) {
  const {document}=parseHTML(html), link=document.querySelector('link#wasm');
  if(!link)throw Error('Missing official WASM link');
  const url=new URL(link.getAttribute('href'),base);
  if(url.protocol!=='https:'||url.hostname!=='build.stencil.so')throw Error('Unexpected official WASM origin');
  const match=/^\/web\/tern\/([0-9]+\.[0-9]+\.[0-9]+)\/stencil_tern_web_bg\.wasm$/.exec(url.pathname);
  const integrity=link.getAttribute('integrity');
  if(!match||!/^sha384-[A-Za-z0-9+/]{64}$/.test(integrity??''))throw Error('Unsupported release URL or SRI');
  return {version:match[1],url:url.href,integrity};
}
export function verifySRI(bytes,integrity){
  const actual='sha384-'+createHash('sha384').update(bytes).digest('base64');
  if(actual!==integrity)throw Error('Official WASM integrity mismatch');
}
async function download(url){const r=await fetch(url,{signal:AbortSignal.timeout(120000)});if(!r.ok)throw Error(`Resource request failed (${r.status})`);return new Uint8Array(await r.arrayBuffer());}
export async function acquire({url,out}){
  const base=new URL(url);if(!['127.0.0.1','localhost','[::1]'].includes(base.hostname))throw Error('Release HTML must come from a local Tern service');
  if(base.search||base.username||base.password)throw Error('Use a credential-free base URL');
  const html=new TextDecoder().decode(await download(base));const link=releaseLink(html,base);
  const wasm=await download(link.url);verifySRI(wasm,link.integrity);
  const glue=await download(new URL('/pkg/stencil_tern_web.js',base));
  const dir=resolve(out);await mkdir(dir,{recursive:false});await mkdir(join(dir,'pkg'));
  await writeFile(join(dir,'pkg/original.wasm'),wasm);await writeFile(join(dir,'pkg/client.js'),glue);await writeFile(join(dir,'official.html'),html);
  await writeFile(join(dir,'initial.bin'),initialMemory(wasm));
  const input={schemaVersion:1,...link,wasmSha256:sha256(wasm),glueSha256:sha256(glue)};
  await writeFile(join(dir,'inputs.json'),JSON.stringify(input,null,2)+'\n');return input;
}
export async function verifyCandidate({original,candidate}){
 const a=new Uint8Array(await readFile(original)),b=new Uint8Array(await readFile(candidate));
 const am=new WebAssembly.Module(a),bm=new WebAssembly.Module(b);
 const same=(x,y)=>JSON.stringify(x)===JSON.stringify(y);
 const ai=interfaceInfo(a),bi=interfaceInfo(b);
 const check=(name,pass)=>({name,status:pass?'passed':'failed'});
 const checks=[
   check('imports',same(WebAssembly.Module.imports(am),WebAssembly.Module.imports(bm))),
   check('exports',same(WebAssembly.Module.exports(am),WebAssembly.Module.exports(bm))),
   check('function_signatures',same(ai.imports,bi.imports)&&same(ai.functions,bi.functions)),
   check('memory_limits',same(ai.memory,bi.memory)),
   check('initial_memory',Buffer.from(initialMemory(a)).equals(Buffer.from(initialMemory(b)))),
   {name:'time_behavior',status:'not_run',details:'Run version-specific behavior tests; structural equality does not prove time semantics.'},
   {name:'full_ui',status:'not_run',details:'No desktop window is launched.'}
 ];
 return {schemaVersion:1,originalSha256:sha256(a),candidateSha256:sha256(b),checks,deployable:false};
}
