import {test,expect} from 'bun:test';
import binaryen from 'binaryen';
import {analyze,initialMemory,walk} from './analyze.mjs';
import {releaseLink,verifySRI,verifyCandidate} from './resources.mjs';
import {createHash} from 'node:crypto';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
function compile(text){const m=binaryen.parseText(text);try{return m.emitBinary();}finally{m.dispose();}}

test('nested LocalSet preserves panic-call and font-pointer references',()=>{
 const m=binaryen.parseText('(module (func $panic (result i32) (i32.const 42)) (func $consumer (local i32) (local.set 0 (i32.add (call $panic) (i32.const 9028220)))))');
 try{const info=binaryen.getFunctionInfo(m.getFunction('consumer'));const calls=[],values=[];walk(info.body,n=>{if(n.id===binaryen.CallId)calls.push(n.target);if(n.id===binaryen.ConstId)values.push(n.value);});expect(calls).toEqual(['panic']);expect(values).toContain(9028220);}finally{m.dispose();}
});
test('descriptor location is computed from memory; same-font duplicates allowed, cross-font aliases rejected',()=>{
 const bytes=compile('(module (memory (export "memory") 1) (data (i32.const 100) "\\c8\\00\\00\\00\\20\\00\\00\\00"))');
 const result=analyze(bytes,[{family:'BerkeleyMono-Regular',pointer:200,length:32}]);expect(result.fonts[0].slot).toBe(100);
 const duplicate=compile('(module (memory (export "memory") 1) (data (i32.const 100) "\\c8\\00\\00\\00\\20\\00\\00\\00") (data (i32.const 120) "\\c8\\00\\00\\00\\20\\00\\00\\00"))');
 const multi=analyze(duplicate,[{family:'BerkeleyMono-Regular',pointer:200,length:32}]);expect(multi.fonts[0].slot).toEqual([100,120]);
 expect(()=>analyze(duplicate,[{family:'BerkeleyMono-Regular',pointer:200,length:32},{family:'BerkeleyMono-Bold',pointer:200,length:32}])).toThrow('Ambiguous');
});
test('initialization does not fake an imported function succeeding',()=>{
 const bytes=compile('(module (import "env" "start" (func $start)) (memory (export "memory") 1) (start $start))');expect(()=>initialMemory(bytes)).toThrow('Unexpected initialization call');
});
test('official SRI is required and tampered resources are rejected',()=>{
 const bytes=new Uint8Array([1,2,3]),sri='sha384-'+createHash('sha384').update(bytes).digest('base64');
 expect(releaseLink(`<link id="wasm" href="https://build.stencil.so/web/tern/0.9.2/stencil_tern_web_bg.wasm" integrity="${sri}">`,'http://localhost:1234').version).toBe('0.9.2');verifySRI(bytes,sri);
 expect(()=>verifySRI(new Uint8Array([1,2,4]),sri)).toThrow('integrity');
 expect(()=>releaseLink(`<link id="wasm" href="https://example.com/evil.wasm" integrity="${sri}">`,'http://localhost:1234')).toThrow('origin');
});
test('validation reports modified initial data and never treats a structural pass as deployable',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'tern-check-'));try{
 const a=compile('(module (memory (export "memory") 1) (data (i32.const 0) "a"))'),b=compile('(module (memory (export "memory") 1) (data (i32.const 0) "b"))');
 const original=join(dir,'original.wasm'),candidate=join(dir,'candidate.wasm');await writeFile(original,a);await writeFile(candidate,b);
 const result=await verifyCandidate({original,candidate});expect(result.checks.find(c=>c.name==='initial_memory').status).toBe('failed');expect(result.deployable).toBe(false);
 }finally{await rm(dir,{recursive:true});}
});

test('time plan includes table references and typed return-buffer context',()=>{
 const bytes=compile('(module (memory (export "memory") 1) (data (i32.const 100) "time not implemented on this platform\\00") (table 1 funcref) (elem (i32.const 0) $panic) (func $panic (drop (i32.const 100)) (unreachable)) (func $consumer (param $out i32) (local $seconds i64) (local $nanos i32) (call $panic) (local.set $seconds (i64.load (local.get $out))) (local.set $nanos (i32.load offset=8 (local.get $out)))))');
 const result=analyze(bytes);
 expect(result.panicFunctions[0].callers).toHaveLength(1);
 expect(result.panicFunctions[0].tableReferences).toHaveLength(1);
 expect(result.manualEdits[0].timestampBufferCandidates).toHaveLength(1);
 const base=result.manualEdits[0].timestampBufferCandidates[0];
 const address=compile(`(module (func (export "address") (param $0 i32) (result i32) (i32.add ${base.ptr} (i32.const ${base.offset}))))`);
 expect(new WebAssembly.Instance(new WebAssembly.Module(address)).exports.address(2048)).toBe(2048);
});

test('interface signatures ignore private helpers but detect exported type changes',async()=>{
 const {interfaceInfo}=await import('./interface.mjs');
 const original=compile('(module (memory (export "memory") 1) (func (export "clock") (result i32) (i32.const 1)))');
 const helper=compile('(module (memory (export "memory") 1) (func (export "clock") (result i32) (i32.const 1)) (func $helper (result i64) (i64.const 2)))');
 const changed=compile('(module (memory (export "memory") 1) (func (export "clock") (result i64) (i64.const 1)))');
 expect(interfaceInfo(helper)).toEqual(interfaceInfo(original));
 expect(interfaceInfo(changed).functions).not.toEqual(interfaceInfo(original).functions);
});

test('analysis schema rejects a nonnumeric descriptor before downstream use',async()=>{
 const {validateReport}=await import('./report.mjs');
 const plan={schemaVersion:1,inputSha256:'a'.repeat(64),memorySha256:'b'.repeat(64),decision:'manual_review_required',fonts:[{family:'BerkeleyMono Nerd Font',pointer:200,length:32,slot:'100'}],clocks:[],panicFunctions:[],manualEdits:[]};
 expect(()=>validateReport(plan)).toThrow('Invalid analysis');
});
