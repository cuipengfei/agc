import {spawn} from 'node:child_process';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomBytes} from 'node:crypto';
import {createServer} from 'node:net';
import {acquire} from './resources.mjs';

const binary=process.argv[2];if(!binary)throw Error('Usage: bun smoke.mjs /path/to/tern');
const dir=await mkdtemp(join(tmpdir(),'tern-acquire-'));
const listener=createServer();await new Promise(r=>listener.listen(0,'127.0.0.1',r));const port=listener.address().port;await new Promise(r=>listener.close(r));
const tokenFile=join(dir,'access');await writeFile(tokenFile,randomBytes(32).toString('hex'),{mode:0o600});
const child=spawn(binary,['web','serve','--listen',`127.0.0.1:${port}`,'--token',tokenFile],{stdio:['ignore','ignore','ignore'],env:{...process.env,DISPLAY:'',WAYLAND_DISPLAY:'',DBUS_SESSION_BUS_ADDRESS:''}});
child.on('error',()=>{});
try{
 let ready=false;
 for(let i=0;i<100;i++){
  if(child.exitCode!==null)throw Error(`Native web server exited (${child.exitCode})`);
  try{const r=await fetch(`http://127.0.0.1:${port}/`,{signal:AbortSignal.timeout(500)});if(r.ok){const html=await r.text();await writeFile(join(dir,'official.html'),html);console.log(JSON.stringify({officialHTML:join(dir,'official.html')}));ready=true;break;}}catch{}
  await new Promise(r=>setTimeout(r,100));
 }
 if(!ready)throw Error('Native web server did not become ready');
 const result=await acquire({url:`http://127.0.0.1:${port}/`,out:join(dir,'candidate')});
 console.log(JSON.stringify({fetch:'passed',version:result.version,hash:result.wasmSha256}));
}finally{child.kill('SIGTERM');await new Promise(r=>child.once('exit',r));await rm(dir,{recursive:true});}
