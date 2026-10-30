import binaryen from 'binaryen';
import { createHash } from 'node:crypto';

export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const childFields = new Map(Object.entries({
  Nop:[],Block:['children'],If:['condition','ifTrue','ifFalse'],Loop:['body'],Break:['condition','value'],Switch:['condition','value'],
  Call:['operands'],CallIndirect:['target','operands'],LocalGet:[],LocalSet:['value'],GlobalGet:[],GlobalSet:['value'],
  Load:['ptr'],Store:['ptr','value'],Const:[],Unary:['value'],Binary:['left','right'],Select:['condition','ifTrue','ifFalse'],Drop:['value'],Return:['value'],
  MemorySize:[],MemoryGrow:['delta'],MemoryInit:['dest','offset','size'],MemoryCopy:['dest','source','size'],MemoryFill:['dest','value','size'],DataDrop:[],
  Unreachable:[],Pop:[],RefNull:[],RefIsNull:['value'],RefFunc:[],RefEq:['left','right'],RefAs:['value'],RefI31:['value'],I31Get:['i31'],
  TableGet:['index'],TableSet:['index','value'],TableSize:[],TableGrow:['value','delta'],Try:['body','catchBodies'],Throw:['operands'],Rethrow:[],TupleMake:['operands'],TupleExtract:['tuple'],
  AtomicRMW:['ptr','value'],AtomicCmpxchg:['ptr','expected','replacement'],AtomicWait:['ptr','expected','timeout'],AtomicNotify:['ptr','notifyCount'],AtomicFence:[],
  SIMDExtract:['vec'],SIMDReplace:['vec','value'],SIMDShuffle:['left','right'],SIMDTernary:['a','b','c'],SIMDShift:['vec','shift'],SIMDLoad:['ptr'],SIMDLoadStoreLane:['ptr','vec']
}).map(([name,fields])=>[binaryen[name+'Id'],fields]));
export function walk(root, visit) {
  const pending = [root];
  while (pending.length) {
    const ref = pending.pop();
    if (!ref) continue;
    const info = binaryen.getExpressionInfo(ref), fields=childFields.get(info.id);
    if(!fields)throw Error(`Unsupported IR node ${info.id}; reference inventory stopped`);
    visit(info, ref);
    for (const key of fields) {
      const value=info[key];
      if(Array.isArray(value))pending.push(...value);
      else if(value)pending.push(value);
    }
  }
}

export function initialMemory(bytes) {
  const module = new WebAssembly.Module(bytes), imports = Object.create(null);
  for (const item of WebAssembly.Module.imports(module)) {
    if (item.kind !== 'function') throw Error(`Unsupported initialization import: ${item.kind}`);
    (imports[item.module] ??= Object.create(null))[item.name] = () => { throw Error(`Unexpected initialization call: ${item.name}`); };
  }
  const exports = new WebAssembly.Instance(module, imports).exports;
  if (!(exports.memory instanceof WebAssembly.Memory)) throw Error('Missing exported memory');
  return new Uint8Array(exports.memory.buffer).slice();
}

export function analyze(bytes, fonts = []) {
  const memory = initialMemory(bytes), view = new DataView(memory.buffer);
  const module = binaryen.readBinary(bytes);
  const functions = [], calls = new Map(), constants = new Map(), functionReferences=new Map();
  try {
    for (let i=0;i<module.getNumFunctions();i++) {
      const f = binaryen.getFunctionInfo(module.getFunctionByIndex(i));
      const item={...f,index:i,nodes:0,unreachable:false,values:[]};
      functions.push(item);
      if (!f.body) continue;
      walk(f.body, (node, ref) => {
        item.nodes++;
        if(node.id===binaryen.UnreachableId)item.unreachable=true;
        if(node.id===binaryen.ConstId&&typeof node.value==='number')item.values.push(node.value);
        if(node.id===binaryen.RefFuncId){const refs=functionReferences.get(node.func)??[];refs.push({caller:f.name});functionReferences.set(node.func,refs);}
        if (node.id === binaryen.CallId) {
          const target=/** @type {binaryen.ExpressionInfo & {target:string}} */(node).target;
          const list=calls.get(target)??[];list.push({caller:f.name,ref});calls.set(target,list);
        }
        if (node.id === binaryen.ConstId && node.type === binaryen.i32 && typeof node.value === 'number') {
          const list=constants.get(node.value)??[];list.push({caller:f.name,expression:`i32.const ${node.value}`});constants.set(node.value,list);
        }
      });
    }
    const callers=name=>(calls.get(name)??[]).map(({caller,ref})=>({caller,expression:binaryen.emitText(ref)}));
    const tableReferences=new Map();
    for(let i=0;i<module.getNumElementSegments();i++){
      const segment=binaryen.getElementSegmentInfo(module.getElementSegmentByIndex(i));
      for(const [slot,target] of segment.data.entries()){
        const refs=tableReferences.get(target)??[];refs.push({segment:segment.name,table:segment.table,elementIndex:slot});tableReferences.set(target,refs);
      }
    }
    for(let i=0;i<module.getNumGlobals();i++){
      const global=binaryen.getGlobalInfo(module.getGlobalByIndex(i));
      if(global.init)walk(global.init,node=>{if(node.id===binaryen.RefFuncId){const refs=functionReferences.get(node.func)??[];refs.push({global:global.name});functionReferences.set(node.func,refs);}});
    }
    const panicFunctions=[];
    for(const f of functions) {
      if(!f.body||f.nodes>150||!f.unreachable)continue;
      const messages=[];
      for(const value of f.values){
        if(!Number.isInteger(value)||value<0||value>=memory.length)continue;
        const text=new TextDecoder().decode(memory.subarray(value,value+200));
        const message=text.split('\0')[0];
        if(/not implemented|no filesystem|no pids|poisoned|thread ID|can.t sleep|not supported/.test(message))messages.push(message);
      }
      const body=messages.length?binaryen.emitText(f.body):'';
      if(messages.length)panicFunctions.push({name:f.name,index:f.index,params:f.params,results:f.results,messages:[...new Set(messages)],callers:callers(f.name),tableReferences:tableReferences.get(f.name)??[],functionReferences:functionReferences.get(f.name)??[],body});
    }
    const fontPlans=fonts.filter(f=>f.family?.startsWith('BerkeleyMono')||f.family?.startsWith('Ioskeley Mono Term')).map(font=>{
      const slots=[];
      for(let p=0;p<=memory.length-8;p++)if(view.getUint32(p,true)===font.pointer&&view.getUint32(p+4,true)===font.length)slots.push(p);
      if(slots.length===0)throw Error(`No font descriptor found: ${font.family}`);
      return {...font,slot:slots.length===1?slots[0]:slots,pointerReferences:constants.get(font.pointer)??[],lengthReferences:constants.get(font.length)??[]};
    });
    const slotOwners=new Map();
    for(const font of fontPlans){const slots=Array.isArray(font.slot)?font.slot:[font.slot];for(const s of slots){if(slotOwners.has(s))throw Error(`Ambiguous font descriptor alias: slot ${s} claimed by ${slotOwners.get(s)} and ${font.family}`);slotOwners.set(s,font.family);}}
    const clocks=functions.filter(f=>f.base?.startsWith('__wbg_now')).map(f=>({name:f.name,index:f.index,import:f.base,callers:callers(f.name)}));
    const timeTargets=new Set(panicFunctions.filter(f=>f.messages.some(m=>m.includes('time not implemented'))).map(f=>f.name));
    const manualEdits=[];
    const timeCallers=new Set([...timeTargets].flatMap(target=>(calls.get(target)??[]).map(c=>c.caller)));
    for(const f of functions){
      if(!f.body)continue;
      if(!timeCallers.has(f.name))continue;
      walk(f.body,node=>{
        if(node.id!==binaryen.BlockId)return;
        for(const [index,ref] of node.children.entries()){
          const call=binaryen.getExpressionInfo(ref);
          const target=/** @type {binaryen.ExpressionInfo & {target:string}} */(call).target;
          if(call.id!==binaryen.CallId||!timeTargets.has(target))continue;
          const following=node.children.slice(index+1,index+5);
          const loads=[];
          for(const expression of following)walk(expression,load=>{if(load.id===binaryen.LoadId)loads.push({bytes:load.bytes,offset:load.offset,ptr:binaryen.emitText(load.ptr)});});
          const bases=[...new Set(loads.filter(a=>a.bytes===8&&loads.some(b=>b.bytes===4&&b.offset===a.offset+8&&b.ptr===a.ptr)).map(a=>JSON.stringify({ptr:a.ptr,offset:a.offset})))].map(text=>JSON.parse(text));
          manualEdits.push({caller:f.name,callerIndex:f.index,target,original:binaryen.emitText(ref),following:following.map(expression=>binaryen.emitText(expression)),timestampBufferCandidates:bases,decision:'manual_review_required'});
        }
      });
    }
    return {schemaVersion:1,inputSha256:sha256(bytes),memorySha256:sha256(memory),memoryBytes:memory.length,fonts:fontPlans,clocks,panicFunctions,manualEdits,decision:'manual_review_required',instructions:'Review typed buffer candidates and adjacent instructions using the file editor; compile with WABT. Unknown output addresses must stop deployment.'};
  } finally {module.dispose();}
}
