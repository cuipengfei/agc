import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import net from 'node:net';
import {start,status} from './runtime.mjs';

const [binary,assets]=process.argv.slice(2);
if(!binary||!assets)throw Error('Usage: bun runtime-smoke.mjs /path/to/tern /path/to/assets');
const dir=await mkdtemp(join(tmpdir(),'tern-runtime-'));
const socket=join(dir,'daemon','daemon.sock'),stateDir=join(dir,'state');
const listener=net.createServer();await new Promise(r=>listener.listen(0,'127.0.0.1',r));const port=listener.address().port;await new Promise(r=>listener.close(r));
try{
 const result=await start({binary:resolve(binary),assets:resolve(assets),socket,port,stateDir});
 const check=await status({binary:resolve(binary),socket,port});
 if(!check.daemon.running||check.httpStatus!==200)throw Error('Isolated runtime did not become healthy');
 if(result.paneDiff.added.length||result.paneDiff.removed.length)throw Error('Runtime changed pane IDs');
 console.log(JSON.stringify({schemaVersion:1,daemon:'passed',http:'passed',panesUnchanged:true,detached:true}));
}finally{
 for(const name of ['tern-web.pid','tern-daemon.pid']){
  let pid;
  try{pid=Number(await readFile(join(stateDir,name),'utf8'));}catch(error){if(error.code==='ENOENT')continue;throw error;}
  if(!Number.isInteger(pid)||pid<=1)throw Error('Invalid isolated runtime PID');
  try{process.kill(pid,'SIGTERM');}catch(error){if(error.code!=='ESRCH')throw error;}
 }
 await rm(dir,{recursive:true});
}
