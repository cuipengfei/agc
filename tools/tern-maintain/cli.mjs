import { parseArgs } from 'node:util';
import { readFile, writeFile, lstat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { acquire, verifyCandidate } from './resources.mjs';
import { analyze, initialMemory, sha256 } from './analyze.mjs';
import { validateReport } from './report.mjs';
import { inspectFunction } from './function.mjs';

const usage=`Tern maintenance (no GUI, no automatic instruction rewrite)
  bun cli.mjs fetch --url http://127.0.0.1:PORT --out NEW_DIRECTORY
  bun cli.mjs prepare --binary FILE --out NEW_DIRECTORY
  bun cli.mjs analyze --wasm FILE --out REPORT [--fonts FONT_REPORT]
  bun cli.mjs function --wasm FILE --index NUMBER --out REPORT
  bun cli.mjs memory --wasm FILE --out MEMORY_FILE
  bun cli.mjs verify --original FILE --candidate FILE --out REPORT
  bun cli.mjs status --binary FILE --socket FILE --port NUMBER
  bun cli.mjs start --binary FILE --socket FILE --port NUMBER --assets DIR --state-dir DIR
  bun cli.mjs inspect-runtime --binary FILE --socket FILE --port NUMBER [--out REPORT]
  bun cli.mjs verify-service --url http://127.0.0.1:PORT --assets DIR --token-file FILE --version VERSION [--out REPORT]
  bun cli.mjs upgrade --binary FILE --candidate-binary FILE --socket FILE --port NUMBER --assets DIR --state-dir DIR --token-file FILE --version VERSION [--out REPORT]
  bun cli.mjs evidence --version VERSION --original FILE --candidate FILE --glue FILE --profile FILE --structure-report FILE --time-report FILE --font-report FILE --headless-report FILE --runtime-report FILE --service-report FILE --skipped FILE --out REPORT
  bun cli.mjs browser --url http://127.0.0.1:PORT --playwright-module FILE --chromium-executable FILE --out REPORT

Font inventory: uv run --with-requirements requirements.txt python fonts.py MEMORY_FILE
Reports never authorize deployment by themselves. Edit function code with the file editor.
`;
const args=parseArgs({args:process.argv.slice(2),allowPositionals:true,options:Object.fromEntries(['url','out','wasm','fonts','original','candidate','glue','binary','socket','port','assets','state-dir','playwright-module','chromium-executable','index','candidate-binary','token-file','version','profile','structure-report','time-report','font-report','headless-report','runtime-report','service-report','skipped'].map(k=>[k,{type:'string'}]))});
const [command,...extra]=args.positionals,v=args.values;
const required=(...keys)=>{for(const key of keys)if(!v[key])throw Error(`Missing --${key}`);};
async function main(){
 if(!command||command==='help'){console.log(usage);return;}
 if(extra.length)throw Error('Unexpected positional arguments');
 if(command==='upgrade'&&v.out){
   const exists=await lstat(v.out).then(()=>true,error=>{if(error.code==='ENOENT')return false;throw error;});
   if(exists)throw Error('Upgrade report already exists');
 }
 let result;
 if(command==='fetch'){required('url','out');result=await acquire(v);}
 else if(command==='memory'){required('wasm','out');const bytes=new Uint8Array(await readFile(v.wasm));await writeFile(v.out,initialMemory(bytes),{flag:'wx'});result={schemaVersion:1,inputSha256:sha256(bytes)};}
 else if(command==='analyze'){required('wasm','out');result=analyze(new Uint8Array(await readFile(v.wasm)),v.fonts?JSON.parse(await readFile(v.fonts,'utf8')):[]);}
 else if(command==='function'){required('wasm','index','out');result=inspectFunction(new Uint8Array(await readFile(v.wasm)),Number(v.index));}
 else if(command==='verify'){required('original','candidate','out');result=await verifyCandidate(v);}
 else if(['prepare','inspect-runtime','verify-service','upgrade'].includes(command)){
   const lifecycle=await import('./lifecycle.mjs');
   if(command==='prepare'){required('binary','out');result=await lifecycle.prepare({binary:resolve(v.binary),out:resolve(v.out)});}
   else if(command==='verify-service'){required('url','assets','token-file','version');result=await lifecycle.verifyService({url:v.url,assets:resolve(v.assets),tokenFile:resolve(v['token-file']),version:v.version});}
   else {
     required('binary','socket','port');
     if(!/^\d+$/.test(v.port)||Number(v.port)<1024||Number(v.port)>65535)throw Error('Port must be 1024..65535');
     const options={binary:resolve(v.binary),socket:resolve(v.socket),port:Number(v.port)};
     if(command==='inspect-runtime')result=await lifecycle.inspectRuntime(options);
     else {
       required('candidate-binary','assets','state-dir','token-file','version');
       result=await lifecycle.upgrade({...options,candidateBinary:resolve(v['candidate-binary']),assets:resolve(v.assets),stateDir:resolve(v['state-dir']),tokenFile:resolve(v['token-file']),version:v.version});
     }
   }
 }
 else if(command==='evidence'){
   required('version','original','candidate','glue','profile','structure-report','time-report','font-report','headless-report','runtime-report','service-report','skipped','out');
   const {collectEvidence}=await import('./evidence.mjs');
   result=await collectEvidence({version:v.version,original:v.original,candidate:v.candidate,glue:v.glue,profile:v.profile,structureReport:v['structure-report'],timeReport:v['time-report'],fontReport:v['font-report'],headlessReport:v['headless-report'],runtimeReport:v['runtime-report'],serviceReport:v['service-report'],skipped:JSON.parse(await readFile(v.skipped,'utf8')),out:v.out});
 }
 else if(['status','start','browser'].includes(command)){
   const runtime=await import('./runtime.mjs');
   if(command==='browser'){required('url','playwright-module','chromium-executable','out');result=await runtime.browserCheck({url:v.url,playwrightModule:resolve(v['playwright-module']),chromiumExecutable:resolve(v['chromium-executable'])});}
   else {required('binary','socket','port');if(!/^\d+$/.test(v.port)||Number(v.port)<1024||Number(v.port)>65535)throw Error('Port must be 1024..65535');if(command==='start')required('assets','state-dir');result=await runtime[command]({binary:resolve(v.binary),socket:resolve(v.socket),port:Number(v.port),assets:v.assets&&resolve(v.assets),stateDir:v['state-dir']&&resolve(v['state-dir'])});}
 } else throw Error(`Unknown command: ${command}`);
 if(['analyze','verify'].includes(command))validateReport(result);
 if(v.out&&['analyze','verify','browser','function','inspect-runtime','verify-service','upgrade'].includes(command))await writeFile(v.out,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
 if(command==='analyze')console.log(JSON.stringify({schemaVersion:1,inputSha256:result.inputSha256,fonts:result.fonts.length,panics:result.panicFunctions.length,decision:result.decision}));
 else console.log(JSON.stringify(result));
 if(result.checks?.some(c=>c.status==='failed'))process.exitCode=1;
}
await main().catch(error=>{console.error(String(error.message).replace(/([?&]token=)[^\s&"']+/g,'$1<REDACTED>'));process.exitCode=1;});
