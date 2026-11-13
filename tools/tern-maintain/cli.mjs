import { parseArgs } from 'node:util';
import { readFile, writeFile, lstat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { acquire, verifyCandidate } from './resources.mjs';
import { analyze, initialMemory, sha256 } from './analyze.mjs';
import { validateReport } from './report.mjs';
import { inspectFunction } from './function.mjs';

const usage=`Tern maintenance (no GUI)
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
  bun cli.mjs verify-mounted --url URL --playwright-module FILE --chromium-executable FILE --token-file FILE --out REPORT
  bun cli.mjs rebuild --bundle DIR --wabt-dir DIR --out NEW_DIR
  bun cli.mjs check-build --bundle DIR
  bun cli.mjs assets (--bundle DIR | --official DIR) --fonts DIR --out NEW_DIR
  bun cli.mjs verify-page --url URL --playwright-module FILE --chromium-executable FILE [--out REPORT]
  bun cli.mjs markdown-windows --binary FILE --assets DIR --out REPORT [--node FILE] [--playwright-module DIR] [--chromium-executable FILE] [--socket-dir DIR]

Font inventory: uv run --with-requirements requirements.txt python fonts.py MEMORY_FILE
Reports never authorize deployment by themselves. Unknown versions stop for review.
`;

const OPTION_NAMES=['url','out','wasm','fonts','original','candidate','glue','binary','socket','port','assets','state-dir','playwright-module','chromium-executable','index','candidate-binary','token-file','version','profile','structure-report','time-report','font-report','headless-report','runtime-report','service-report','skipped','recipe','wabt-dir','bundle','official','node','socket-dir'];
const REPORT_COMMANDS=new Set(['analyze','verify']);
const WRITTEN_COMMANDS=new Set(['analyze','verify','browser','function','inspect-runtime','verify-service','upgrade','verify-page']);

function required(values,...keys){for(const key of keys)if(!values[key])throw Error(`Missing --${key}`);}
function portValue(values){
  if(!/^\d+$/.test(values.port)||Number(values.port)<1024||Number(values.port)>65535)throw Error('Port must be 1024..65535');
  return Number(values.port);
}
// 运行时与生命周期命令共享同一组 --binary/--socket/--port。
function endpoint(values){required(values,'binary','socket','port');return {binary:resolve(values.binary),socket:resolve(values.socket),port:portValue(values)};}
function readBytes(path){return readFile(path).then(bytes=>new Uint8Array(bytes));}

async function browser(values,mount){
  required(values,'url','playwright-module','chromium-executable');
  if(mount)required(values,'token-file');
  required(values,'out');
  const {browserCheck}=await import('./runtime.mjs');
  const options={url:values.url,playwrightModule:resolve(values['playwright-module']),chromiumExecutable:resolve(values['chromium-executable'])};
  return mount?browserCheck({...options,tokenFile:resolve(values['token-file']),mount:true}):browserCheck(options);
}

// 每个命令只负责参数校验、选项转换与执行；报告校验、写文件、打印与退出码统一由 emitReport 处理。
const COMMANDS={
  fetch:async v=>{required(v,'url','out');return acquire({url:v.url,out:v.out});},
  prepare:async v=>{
    required(v,'binary','out');
    const {prepare}=await import('./lifecycle.mjs');
    return prepare({binary:resolve(v.binary),out:resolve(v.out)});
  },
  memory:async v=>{
    required(v,'wasm','out');
    const bytes=await readBytes(v.wasm);
    await writeFile(v.out,initialMemory(bytes),{flag:'wx'});
    return {schemaVersion:1,inputSha256:sha256(bytes)};
  },
  analyze:async v=>{
    required(v,'wasm','out');
    const fonts=v.fonts?JSON.parse(await readFile(v.fonts,'utf8')):[];
    return analyze(await readBytes(v.wasm),fonts);
  },
  function:async v=>{
    required(v,'wasm','index','out');
    return inspectFunction(await readBytes(v.wasm),Number(v.index));
  },
  verify:async v=>{
    required(v,'original','candidate','out');
    return verifyCandidate({original:v.original,candidate:v.candidate});
  },
  status:async v=>{
    const options=endpoint(v);
    const {status}=await import('./runtime.mjs');
    return status(options);
  },
  start:async v=>{
    const options=endpoint(v);
    required(v,'assets','state-dir');
    const {start}=await import('./runtime.mjs');
    return start({...options,assets:resolve(v.assets),stateDir:resolve(v['state-dir'])});
  },
  'inspect-runtime':async v=>{
    const options=endpoint(v);
    const {inspectRuntime}=await import('./lifecycle.mjs');
    return inspectRuntime(options);
  },
  'verify-service':async v=>{
    required(v,'url','assets','token-file','version');
    const {verifyService}=await import('./lifecycle.mjs');
    return verifyService({url:v.url,assets:resolve(v.assets),tokenFile:resolve(v['token-file']),version:v.version});
  },
  upgrade:async v=>{
    const options=endpoint(v);
    required(v,'candidate-binary','assets','state-dir','token-file','version');
    const {upgrade}=await import('./lifecycle.mjs');
    return upgrade({...options,candidateBinary:resolve(v['candidate-binary']),assets:resolve(v.assets),stateDir:resolve(v['state-dir']),tokenFile:resolve(v['token-file']),version:v.version});
  },
  evidence:async v=>{
    required(v,'version','original','candidate','glue','profile','structure-report','time-report','font-report','headless-report','runtime-report','service-report','skipped','out');
    const skipped=JSON.parse(await readFile(v.skipped,'utf8'));
    const {collectEvidence}=await import('./evidence.mjs');
    return collectEvidence({version:v.version,original:v.original,candidate:v.candidate,glue:v.glue,profile:v.profile,structureReport:v['structure-report'],timeReport:v['time-report'],fontReport:v['font-report'],headlessReport:v['headless-report'],runtimeReport:v['runtime-report'],serviceReport:v['service-report'],skipped,out:v.out});
  },
  browser:async v=>browser(v,false),
  'verify-mounted':async v=>browser(v,true),
  build:async v=>{
    required(v,'original','glue','profile','recipe','wabt-dir','out');
    const {buildPatch}=await import('./build.mjs');
    return buildPatch({original:resolve(v.original),glue:resolve(v.glue),profile:resolve(v.profile),recipe:resolve(v.recipe),wabtDir:resolve(v['wabt-dir']),out:resolve(v.out)});
  },
  rebuild:async v=>{
    required(v,'bundle','wabt-dir','out');
    const {rebuildPatch}=await import('./build.mjs');
    return rebuildPatch({bundle:resolve(v.bundle),wabtDir:resolve(v['wabt-dir']),out:resolve(v.out)});
  },
  'check-build':async v=>{
    required(v,'bundle');
    const {checkBundle}=await import('./build.mjs');
    return checkBundle({bundle:resolve(v.bundle)});
  },
  assets:async v=>{
    required(v,'fonts','out');
    const {assembleAssets}=await import('./assets.mjs');
    return assembleAssets({bundle:v.bundle&&resolve(v.bundle),official:v.official&&resolve(v.official),fonts:resolve(v.fonts),out:resolve(v.out)});
  },
  'verify-page':async v=>{
    required(v,'url','playwright-module','chromium-executable');
    const {checkPage}=await import('./page-check.mjs');
    return checkPage({url:v.url,playwrightModule:resolve(v['playwright-module']),chromiumExecutable:resolve(v['chromium-executable'])});
  },
  'markdown-windows':async v=>{
    required(v,'binary','assets','out');
    const {checkMarkdownWindows}=await import('./windows-browser.mjs');
    return checkMarkdownWindows({binary:resolve(v.binary),assets:resolve(v.assets),out:resolve(v.out),node:v.node&&resolve(v.node),playwrightModule:v['playwright-module']&&resolve(v['playwright-module']),chromium:v['chromium-executable']&&resolve(v['chromium-executable']),socketDir:v['socket-dir']&&resolve(v['socket-dir'])});
  },
};

function parseCommand(argv){
  const {positionals,values}=parseArgs({args:argv,allowPositionals:true,options:Object.fromEntries(OPTION_NAMES.map(key=>[key,{type:'string'}]))});
  const [command,...extra]=positionals;
  return {command,extra,values};
}

async function rejectExistingUpgradeReport(out){
  const exists=await lstat(out).then(()=>true,error=>{if(error.code==='ENOENT')return false;throw error;});
  if(exists)throw Error('Upgrade report already exists');
}

function printResult(command,result){
  if(command==='analyze')console.log(JSON.stringify({schemaVersion:1,inputSha256:result.inputSha256,fonts:result.fonts.length,panics:result.panicFunctions.length,decision:result.decision}));
  else console.log(JSON.stringify(result));
}

function applyExitCode(result){
  if(result.checks?.some(check=>check.status==='failed'))process.exitCode=1;
  if(result?.conclusion==='not_run')process.exitCode=2;
}

async function emitReport(command,values,result){
  if(REPORT_COMMANDS.has(command))validateReport(result);
  if(result?.kind==='markdown-reproduction'){const {validateMarkdownReproduction}=await import('./check-types.mjs');validateMarkdownReproduction(result);}
  if(values.out&&WRITTEN_COMMANDS.has(command))await writeFile(values.out,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
  printResult(command,result);
  applyExitCode(result);
}

export async function main(argv=process.argv.slice(2)){
  const {command,extra,values}=parseCommand(argv);
  if(!command||command==='help'){console.log(usage);return;}
  if(extra.length)throw Error('Unexpected positional arguments');
  if(!Object.hasOwn(COMMANDS,command))throw Error(`Unknown command: ${command}`);
  const handler=COMMANDS[command];
  if(command==='upgrade'&&values.out)await rejectExistingUpgradeReport(values.out);
  await emitReport(command,values,await handler(values));
}

// Bun 提供 import.meta.main；Node 下回退到 argv[1] 比较，导入模块时不执行，独立运行时进入口。
const entryPoint=import.meta.main??(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url));
if(entryPoint)await main().catch(error=>{console.error(String(error.message).replace(/([?&]token=)[^\s&"']+/g,'$1<REDACTED>'));process.exitCode=1;});
