import binaryen from 'binaryen';
import {sha256} from './analyze.mjs';
export function inspectFunction(bytes, index) {
  const module=binaryen.readBinary(bytes);
  try {
    if(!Number.isSafeInteger(index)||index<0||index>=module.getNumFunctions())throw Error('Function index outside module');
    const info=binaryen.getFunctionInfo(module.getFunctionByIndex(index));
    return {schemaVersion:1,inputSha256:sha256(bytes),index,name:info.name,params:binaryen.expandType(info.params),results:binaryen.expandType(info.results),vars:info.vars,body:info.body?binaryen.emitText(info.body):null,module:info.module,import:info.base};
  }finally{module.dispose();}
}
