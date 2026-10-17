import binaryen from 'binaryen';
export function interfaceInfo(bytes) {
  const module=binaryen.readBinary(bytes);
  try {
    const signature=name=>{
      const f=binaryen.getFunctionInfo(module.getFunction(name));
      return {params:binaryen.expandType(f.params),results:binaryen.expandType(f.results)};
    };
    const imports=[];
    for(let i=0;i<module.getNumFunctions();i++){
      const f=binaryen.getFunctionInfo(module.getFunctionByIndex(i));
      if(!f.body)imports.push({module:f.module,name:f.base,...signature(f.name)});
    }
    const functions=[];
    for(let i=0;i<module.getNumExports();i++){
      const e=binaryen.getExportInfo(module.getExportByIndex(i));
      if(e.kind===binaryen.ExternalFunction)functions.push({name:e.name,...signature(e.value)});
    }
    return {imports,functions,memory:module.hasMemory()?module.getMemoryInfo():null};
  }finally{module.dispose();}
}
