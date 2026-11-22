import {test,expect,afterAll} from 'bun:test';
import binaryen from 'binaryen';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {functionAnalysis} from './function-analysis.mjs';

const root=fs.mkdtempSync(path.join(os.tmpdir(),'tern-function-analysis-'));
afterAll(()=>fs.rmSync(root,{recursive:true,force:true}));
let sequence=0;
function moduleFile(wat){
  const module=binaryen.parseText(wat);
  let bytes;
  const debugInfo=binaryen.getDebugInfo();
  try{binaryen.setDebugInfo(true);bytes=module.emitBinary();}finally{binaryen.setDebugInfo(debugInfo);module.dispose();}
  const file=path.join(root,`module-${sequence++}.wasm`);
  fs.writeFileSync(file,bytes);
  return {file,sha256:createHash('sha256').update(bytes).digest('hex')};
}

test('exact names report real bodies, hashes, callers, targets, and signatures',async()=>{
  const wasm=moduleFile('(module (func $target (result i32) (i32.const 42)) (func $caller (result i32) (call $target)))');
  const report=await functionAnalysis({wasm:wasm.file,names:['target','caller']});
  expect(report.mode).toBe('exact');
  expect(report.original).toBeNull();
  expect(report.current.sha256).toBe(wasm.sha256);
  const target=report.results[0].current,caller=report.results[1].current;
  expect(target.index).toBe(0);
  expect(target.name).toBe('target');
  expect(target.signature).toEqual({params:[],results:[binaryen.i32]});
  expect(target.body).toContain('42');
  expect(target.bodySha256).toMatch(/^[a-f0-9]{64}$/);
  expect(target.normalizedBodySha256).toMatch(/^[a-f0-9]{64}$/);
  expect(target.callers).toEqual([{name:'caller',index:1,signature:caller.signature}]);
  expect(caller.callSequence).toEqual(['target']);
  expect(caller.callTargets[0].targets[0]).toEqual({name:'target',index:0,signature:target.signature});
});

test('comparison retains same-shape candidates when constants differ',async()=>{
  const original=moduleFile('(module (func $target (result i32) (i32.const 1)))');
  const current=moduleFile('(module (func $renamed (result i32) (i32.const 2)))');
  const report=await functionAnalysis({wasm:current.file,original:original.file,names:['target']});
  expect(report.original.sha256).toBe(original.sha256);
  expect(report.current.sha256).toBe(current.sha256);
  const source=report.results[0].original,candidate=report.results[0].candidates[0];
  expect(candidate.name).toBe('renamed');
  expect(candidate.comparison.shapeSimilarity).toBe(1);
  expect(candidate.comparison.constantsEqual).toBe(false);
  expect(candidate.comparison.bodyEqual).toBe(false);
  expect(candidate.comparison.callNameNormalizedBodyEqual).toBe(false);
  expect(candidate.bodySha256).not.toBe(source.bodySha256);
  expect(candidate.normalizedBodySha256).not.toBe(source.normalizedBodySha256);
  expect(source.body).toContain('1');
  expect(candidate.body).toContain('2');
  expect(report.decision).toBe('manual_review_required');
});

test('comparison uses signatures instead of trusting an unchanged name',async()=>{
  const original=moduleFile('(module (func $target (param i32) (result i32) (local.get 0)))');
  const current=moduleFile('(module (func $target (result i32) (i32.const 9)) (func $replacement (param i32) (result i32) (local.get 0)))');
  const report=await functionAnalysis({wasm:current.file,original:original.file,names:['target']});
  const candidates=report.results[0].candidates;
  expect(candidates).toHaveLength(1);
  expect(candidates[0].name).toBe('replacement');
  expect(candidates[0].comparison.signatureEqual).toBe(true);
  expect(candidates[0].comparison.nameEqual).toBe(false);
});

test('missing original and current exact functions fail explicitly',async()=>{
  const original=moduleFile('(module (func $present))');
  const current=moduleFile('(module (func $present))');
  await expect(functionAnalysis({wasm:current.file,names:['missing']})).rejects.toThrow('Function not found in current: missing');
  await expect(functionAnalysis({wasm:current.file,original:original.file,names:['missing']})).rejects.toThrow('Function not found in original: missing');
});

test('changed call targets remain candidates with raw and normalized evidence',async()=>{
  const original=moduleFile('(module (func $a (result i32) (i32.const 1)) (func $target (result i32) (call $a)))');
  const current=moduleFile('(module (func $a (result i32) (i32.const 1)) (func $b (result i32) (i32.const 2)) (func $renamed (result i32) (call $b)))');
  const report=await functionAnalysis({wasm:current.file,original:original.file,names:['target']});
  const candidate=report.results[0].candidates.find(item=>item.name==='renamed');
  expect(candidate).toBeDefined();
  expect(candidate.comparison.callsEqual).toBe(false);
  expect(candidate.comparison.bodyEqual).toBe(false);
  expect(candidate.comparison.callNameNormalizedBodyEqual).toBe(true);
  expect(candidate.callSequence).toEqual(['b']);
  expect(report.results[0].original.callSequence).toEqual(['a']);
  expect(candidate.normalizedBodySha256).toBe(report.results[0].original.normalizedBodySha256);
});

test('comparison keeps at most three same-signature candidates',async()=>{
  const original=moduleFile('(module (func $target (result i32) (i32.const 0)))');
  const current=moduleFile('(module (func $a (result i32) (i32.const 1)) (func $b (result i32) (i32.const 2)) (func $c (result i32) (i32.const 3)) (func $d (result i32) (i32.const 4)))');
  const report=await functionAnalysis({wasm:current.file,original:original.file,names:['target']});
  expect(report.results[0].candidates.map(candidate=>candidate.name)).toEqual(['a','b','c']);
});

test('WABT text supplies candidate probe offsets after local declarations',async()=>{
  const wasm=moduleFile('(module (func $target (result i32) (local i32) (i32.const 42)))');
  const wabtDir=path.join(root,'wabt-bin');fs.mkdirSync(wabtDir);
  fs.writeFileSync(path.join(wabtDir,'wasm-objdump'),`#!/bin/sh\nif [ "$1" = "--version" ]; then printf '%s\\n' 1.0.42; exit; fi\ncat <<'EOF'\n000010 func[0] <target>:\n 000011: 02 7f                      | local[0..1] type=i32\n 000013: 01 7e                      | local[2] type=i64\n 000015: 41 2a                      | i32.const 42\n 000017: 0b                         | end\nEOF\n`,{mode:0o755});
  const report=await functionAnalysis({wasm:wasm.file,original:wasm.file,names:['target'],wabtDir});
  expect(report.results[0].candidates[0].probe).toMatchObject({
    status:'candidate_probe_location',codeStart:0x10,firstInstructionOffset:0x15,firstInstruction:'i32.const 42',source:'wasm-objdump -d',
  });
});

test('the CLI writes a function-analysis report without overwriting it',async()=>{
  const wasm=moduleFile('(module (func $target (result i32) (i32.const 42)))');
  const out=path.join(root,'cli-report.json');
  const args=['function-analysis','--wasm',wasm.file,'--names','target','--out',out];
  const run=async()=>{
    const child=Bun.spawn([process.execPath,path.join(import.meta.dir,'cli.mjs'),...args],{cwd:import.meta.dir,stdout:'pipe',stderr:'pipe'});
    const [code,stdout,stderr]=await Promise.all([child.exited,new Response(child.stdout).text(),new Response(child.stderr).text()]);
    return {code,stdout,stderr};
  };
  const first=await run();
  expect(first.code).toBe(0);
  expect(first.stderr).toBe('');
  expect(JSON.parse(fs.readFileSync(out,'utf8')).results[0].current.name).toBe('target');
  const second=await run();
  expect(second.code).toBe(1);
  expect(second.stderr).toContain('EEXIST');
});
