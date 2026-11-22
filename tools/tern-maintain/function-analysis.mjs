import binaryen from 'binaryen';
import {spawn,execFileSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {createInterface} from 'node:readline';
import {sha256,walk} from './analyze.mjs';

function signature(info){
  return {params:binaryen.expandType(info.params),results:binaryen.expandType(info.results)};
}

function inventory(module){
  const functions=[],byName=new Map(),callers=new Map();
  for(let index=0;index<module.getNumFunctions();index++){
    const info=binaryen.getFunctionInfo(module.getFunctionByIndex(index));
    const item={index,info,signature:signature(info),shape:[],constantRefs:[],callSequence:[]};
    functions.push(item);
    const named=byName.get(info.name)??[];named.push(item);byName.set(info.name,named);
    if(!info.body)continue;
    walk(info.body,(node,ref)=>{
      item.shape.push(node.id);
      if(node.id===binaryen.ConstId)item.constantRefs.push(ref);
      if(node.id!==binaryen.CallId)return;
      item.callSequence.push(node.target);
      const list=callers.get(node.target)??[];list.push(index);callers.set(node.target,list);
    });
  }
  return {module,functions,byName,callers};
}

function summary(item){
  return {name:item.info.name,index:item.index,signature:item.signature};
}

const normalizeCallNames=body=>body.replace(/(\(call\s+)\$[^\s)]+/g,'$1$<normalized>');

// All walk calls for a module finish in inventory before this function emits any text.
function describe(snapshot,item){
  const body=item.info.body?binaryen.emitText(item.info.body):null;
  const normalizedBody=body===null?null:normalizeCallNames(body);
  return {
    name:item.info.name,
    index:item.index,
    signature:item.signature,
    vars:item.info.vars,
    module:item.info.module??null,
    import:item.info.base??null,
    body,
    bodySha256:body===null?null:sha256(body),
    normalizedBody,
    normalizedBodySha256:normalizedBody===null?null:sha256(normalizedBody),
    constants:item.constantRefs.map(ref=>binaryen.emitText(ref)),
    callSequence:item.callSequence,
    callers:(snapshot.callers.get(item.info.name)??[]).map(index=>summary(snapshot.functions[index])),
    callTargets:item.callSequence.map(name=>({name,targets:(snapshot.byName.get(name)??[]).map(summary)})),
    shapeNodeCount:item.shape.length,
    shapeSha256:sha256(item.shape.join(',')),
  };
}

function exactOne(snapshot,name,label){
  const matches=snapshot.byName.get(name)??[];
  if(matches.length===0)throw Error(`Function not found in ${label}: ${name}`);
  if(matches.length!==1)throw Error(`Ambiguous exact function name in ${label}: ${name} (${matches.length} matches)`);
  return matches[0];
}

const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

// Multiset Dice similarity ranks candidates only; it is not an equivalence check.
function shapeSimilarity(a,b){
  if(a.length===0&&b.length===0)return 1;
  const counts=new Map();
  for(const id of a)counts.set(id,(counts.get(id)??0)+1);
  let shared=0;
  for(const id of b){
    const count=counts.get(id)??0;
    if(count>0){shared++;counts.set(id,count-1);}
  }
  return 2*shared/(a.length+b.length);
}

function compare(original,current){
  return {
    nameEqual:original.name===current.name,
    indexEqual:original.index===current.index,
    signatureEqual:same(original.signature,current.signature),
    constantsEqual:same(original.constants,current.constants),
    callsEqual:same(original.callSequence,current.callSequence),
    bodyEqual:original.body===current.body,
    callNameNormalizedBodyEqual:original.normalizedBody===current.normalizedBody,
  };
}

async function objdump(path,wabtDir,indices){
  const executable=join(wabtDir,'wasm-objdump');
  const version=execFileSync(executable,['--version'],{encoding:'utf8'}).trim();
  if(version!=='1.0.42')throw Error(`wasm-objdump must be WABT 1.0.42; received ${version}`);
  const child=spawn(executable,['-d',path],{stdio:['ignore','pipe','pipe']});
  let stderr='',complete=false;
  child.stderr.setEncoding('utf8');child.stderr.on('data',chunk=>stderr+=chunk);
  const closed=new Promise((resolve,reject)=>{
    child.once('error',reject);
    child.once('close',(code,signal)=>resolve({code,signal}));
  });
  const lines=createInterface({input:child.stdout,crlfDelay:Infinity});
  try{
    const parsed=parseProbes(lines,indices).then(result=>{
      complete=result.complete;
      if(complete&&child.exitCode===null)child.kill('SIGTERM');
      return result.probes;
    });
    const [probes,outcome]=await Promise.all([parsed,closed]);
    if(outcome.code!==0&&!(complete&&outcome.signal==='SIGTERM'))throw Error(`wasm-objdump failed for ${path}: ${stderr.trim()||`exit ${outcome.code}`}`);
    return probes;
  }finally{
    lines.close();
    if(child.exitCode===null&&child.signalCode===null)child.kill('SIGTERM');
  }
}

async function parseProbes(lines,indices){
  const wanted=new Set(indices),probes=new Map();
  let current=null,located=0;
  for await(const line of lines){
    const header=/^([0-9a-fA-F]+) func\[(\d+)\](?:\s+<.*>)?:\s*$/.exec(line);
    if(header){
      const index=Number(header[2]);
      current=wanted.has(index)?index:null;
      if(current!==null)probes.set(current,{codeStart:parseInt(header[1],16),codeStartHex:`0x${header[1]}`,firstInstructionOffset:null});
      continue;
    }
    if(current===null||probes.get(current).firstInstructionOffset!==null)continue;
    const instruction=/^\s*([0-9a-fA-F]+):(?:\s+[0-9a-fA-F]{2})+\s+\|\s*(.*?)\s*$/.exec(line);
    if(!instruction)continue;
    const assembly=instruction[2];
    if(/^\d+ locals?$/.test(assembly)||/\blocal(?:\[\d+(?:\.\.\d+)?\])?\s+type=/.test(assembly))continue;
    Object.assign(probes.get(current),{
      firstInstructionOffset:parseInt(instruction[1],16),
      firstInstructionOffsetHex:`0x${instruction[1]}`,
      firstInstruction:assembly,
    });
    if(++located===wanted.size)break;
  }
  return {probes,complete:located===wanted.size};
}

async function addProbes(records,path,wabtDir){
  const defined=records.filter(record=>record.body!==null);
  if(defined.length===0)return;
  const probes=await objdump(path,wabtDir,defined.map(record=>record.index));
  for(const record of defined){
    const probe=probes.get(record.index);
    if(!probe||probe.firstInstructionOffset===null)throw Error(`wasm-objdump has no probe location for function index ${record.index} in ${path}`);
    record.probe={...probe,status:'candidate_probe_location',source:'wasm-objdump -d',note:'Candidate probe position after local declarations; review before use.'};
  }
  for(const record of records)if(record.body===null)record.probe=null;
}

export async function functionAnalysis({wasm,original,names,wabtDir}){
  const requestedNames=names.map(name=>name.trim());
  if(requestedNames.length===0||requestedNames.some(name=>!name))throw Error('Function names must be non-empty');
  const currentBytes=await readFile(wasm);
  const originalBytes=original?await readFile(original):null;
  const currentModule=binaryen.readBinary(currentBytes);
  let originalModule=null;
  try{
    if(originalBytes)originalModule=binaryen.readBinary(originalBytes);
    const current=inventory(currentModule),previous=originalModule?inventory(originalModule):null;
    const results=[],originalRecords=[],currentRecords=[];
    for(const name of requestedNames){
      if(!previous){
        const item=exactOne(current,name,'current'),record=describe(current,item);
        currentRecords.push(record);results.push({requestedName:name,current:record});
        continue;
      }
      const sourceItem=exactOne(previous,name,'original'),source=describe(previous,sourceItem);
      originalRecords.push(source);
      const candidates=current.functions
        .filter(item=>same(item.signature,sourceItem.signature))
        .map(item=>({item,similarity:shapeSimilarity(sourceItem.shape,item.shape)}))
        .sort((a,b)=>b.similarity-a.similarity||a.item.index-b.item.index)
        .slice(0,3)
        .map(({item,similarity})=>{
          const record=describe(current,item),candidate={...record,comparison:{shapeSimilarity:similarity,...compare(source,record)}};
          currentRecords.push(candidate);
          return candidate;
        });
      results.push({requestedName:name,original:source,candidates});
    }
    if(wabtDir){
      await addProbes(originalRecords,original,wabtDir);
      await addProbes(currentRecords,wasm,wabtDir);
    }
    return {
      schemaVersion:1,
      kind:'function-analysis',
      mode:previous?'compare':'exact',
      original:originalBytes?{sha256:sha256(originalBytes)}:null,
      current:{sha256:sha256(currentBytes)},
      results,
      decision:'manual_review_required',
      note:'Shape similarity only ranks candidates. Equal shapes or normalized text do not establish semantic equivalence.',
    };
  }finally{
    if(originalModule)originalModule.dispose();
    currentModule.dispose();
  }
}
