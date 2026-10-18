import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {parseArgs} from 'node:util';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import binaryen from 'binaryen';
import Ajv from 'ajv';
import {initialMemory,sha256} from './analyze.mjs';

const {values:v}=parseArgs({args:process.argv.slice(2),options:Object.fromEntries(['candidate','test-module','glue','profile','out'].map(k=>[k,{type:'string'}]))});
for(const key of ['candidate','test-module','glue','profile','out'])if(!v[key])throw Error(`Missing --${key}`);
const profileBytes=await readFile(v.profile),glueBytes=await readFile(v.glue);
const profile=JSON.parse(profileBytes.toString('utf8'));
const validate=new Ajv().compile({type:'object',required:['schemaVersion','candidateSha256','exports','consumerFlags'],properties:{schemaVersion:{const:1},candidateSha256:{type:'string',pattern:'^[a-f0-9]{64}$'},exports:{type:'object',required:['test_calendar','test_epoch','test_instant','test_elapsed','test_consumer'],additionalProperties:{type:'integer',minimum:0}},consumerFlags:{type:'array',items:{type:'object',required:['address','value'],properties:{address:{type:'integer',minimum:0,maximum:4294967295},value:{type:'integer',minimum:0,maximum:255}}}}}});
if(!validate(profile))throw Error(`Invalid time profile: ${JSON.stringify(validate.errors)}`);
const candidate=new Uint8Array(await readFile(v.candidate)),instrumented=new Uint8Array(await readFile(v['test-module']));
assert.equal(sha256(candidate),profile.candidateSha256,'Candidate does not match the reviewed profile');
const checks=[];
async function check(name,fn){try{await fn();checks.push({name,status:'passed'});}catch(error){checks.push({name,status:'failed',details:error.message});throw error;}}
function selectedBodies(bytes){
 const module=binaryen.readBinary(bytes);
 try{
  return Object.fromEntries(Object.entries(profile.exports).map(([name,index])=>{
   const f=binaryen.getFunctionInfo(module.getFunctionByIndex(index));
   return [name,{params:binaryen.expandType(f.params),results:binaryen.expandType(f.results),vars:f.vars,body:binaryen.emitText(f.body)}];
  }));
 }finally{module.dispose();}
}
let failure;
try{
 await check('instrumented_module_provenance',()=>{
  assert.deepEqual(selectedBodies(instrumented),selectedBodies(candidate),'Tested function bodies differ from the candidate');
  const a=new WebAssembly.Module(candidate),b=new WebAssembly.Module(instrumented);
  assert.deepEqual(WebAssembly.Module.imports(a),WebAssembly.Module.imports(b));
  const expected=[...WebAssembly.Module.exports(a),...Object.keys(profile.exports).map(name=>({name,kind:'function'}))].sort((x,y)=>x.name.localeCompare(y.name));
  assert.deepEqual(WebAssembly.Module.exports(b).sort((x,y)=>x.name.localeCompare(y.name)),expected);
  assert.deepEqual(initialMemory(candidate),initialMemory(instrumented));
 });
 const descriptor=Object.getOwnPropertyDescriptor(globalThis,'performance'),originalNow=Date.now;
 let mono=0,wall=0;
 Object.defineProperty(globalThis,'performance',{configurable:true,value:{now:()=>mono}});
 Date.now=()=>wall;
 try{
  const {default:init}=await import(pathToFileURL(resolve(v.glue)).href);
  const e=await init({module_or_path:instrumented});
  for(const name of Object.keys(profile.exports))assert.equal(typeof e[name],'function',`Missing ${name}`);
  const p=e.__wbindgen_malloc(160,8),view=()=>new DataView(e.memory.buffer);
  const fill=()=>new Uint8Array(e.memory.buffer,p,160).fill(0xa5);
  const canaries=()=>{assert.equal(view().getBigUint64(p,true),0xa5a5a5a5a5a5a5a5n);assert.equal(view().getBigUint64(p+24,true),0xa5a5a5a5a5a5a5a5n);};
  await check('calendar_epoch_and_output_bounds',()=>{
   for(const ms of [0,1,999,1000,1001,1234567,1792200000123]){
    wall=ms;fill();e.test_calendar(p+8);
    assert.equal(view().getBigUint64(p+8,true),BigInt(Math.floor(ms/1000)));assert.equal(view().getUint32(p+16,true),(ms%1000)*1000000);canaries();
    e.test_epoch(p+40,p+8);assert.equal(view().getBigUint64(p+40,true),0n);
    assert.equal(view().getBigUint64(p+48,true)*1000n+BigInt(view().getUint32(p+56,true)/1000000),BigInt(ms));
   }
  });
  await check('instant_fractional_seconds_and_bounds',()=>{
   for(const ms of [0,0.125,999.5,1000,1000.125,1234567.75]){
    mono=ms;fill();e.test_instant(p+8);
    assert.equal(view().getBigUint64(p+8,true),BigInt(Math.floor(ms/1000)));assert.equal(view().getUint32(p+16,true),Math.trunc((ms%1000)*1000000));canaries();
   }
  });
  await check('elapsed_borrow_and_saturation',()=>{
   mono=2000.25;e.test_elapsed(p,1n,999750000);assert.equal(view().getBigUint64(p,true),0n);assert.equal(view().getUint32(p+8,true),500000);
   mono=1000;e.test_elapsed(p,2n,0);assert.equal(view().getBigUint64(p,true),0n);assert.equal(view().getUint32(p+8,true),0);
  });
  await check('actual_consumer',()=>{
   for(const flag of profile.consumerFlags)view().setUint8(flag.address,flag.value);
   mono=12345.5;e.test_consumer(p,7);assert.equal(view().getBigUint64(p+8,true),12n);assert.equal(view().getUint32(p+16,true),345500000);
  });
  await check('externref_reuse_10000_calls',()=>{
   const table=e.__wbindgen_externrefs;assert.ok(table instanceof WebAssembly.Table,'Missing real externref table');
   e.test_instant(p+80);const warmed=table.length;
   for(let i=0;i<10000;i++)e.test_instant(p+80);
   assert.equal(table.length,warmed);
  });
 }finally{
  Date.now=originalNow;
  if(descriptor)Object.defineProperty(globalThis,'performance',descriptor);else delete globalThis.performance;
 }
}catch(error){failure=error;}
const report={schemaVersion:1,candidateSha256:sha256(candidate),testModuleSha256:sha256(instrumented),profileSha256:sha256(profileBytes),glueSha256:sha256(glueBytes),checks};
await writeFile(v.out,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(report));
if(failure){console.error(failure.message);process.exitCode=1;}
