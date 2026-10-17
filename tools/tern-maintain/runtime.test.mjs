import {test,expect,afterAll} from 'bun:test';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {status,start,redact} from './runtime.mjs';

const binary=fileURLToPath(new URL('./fixtures/tern',import.meta.url));
const root=fs.mkdtempSync(path.join(os.tmpdir(),'tern-runtime-tests-'));
const socket=path.join(root,'private','daemon.sock');
async function port(){const server=net.createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const value=server.address().port;await new Promise(r=>server.close(r));return value;}
function records(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(item=>item.isDirectory()?records(path.join(dir,item.name)):item.name.endsWith('.pid')?[Number(fs.readFileSync(path.join(dir,item.name),'utf8'))]:[]);}
afterAll(async()=>{
 for(const pid of records(root).filter(p=>Number.isInteger(p)&&p>1)){
  try{process.kill(pid,'SIGTERM');}catch(error){if(error.code!=='ESRCH')throw error;}
 }
 await new Promise(r=>setTimeout(r,150));
 fs.rmSync(root,{recursive:true});
});

test('logs remove complete tokens independent of URL query position',()=>{
 expect(redact('token=first-value &token=second-value&ok=1')).toBe('token=<REDACTED> &token=<REDACTED>&ok=1');
 expect(redact('http://localhost/?token=third-value')).not.toContain('third-value');
});
test('unavailable daemon and HTTP port are reported without invented panes',async()=>{
 const result=await status({binary,socket:path.join(root,'never-exists.sock'),port:await port()});
 expect(result.daemon.running).toBe(false);expect(result.httpStatus).toBeNull();expect(result.panes).toEqual([]);
});
test('occupied port refuses startup and preserves the existing listener',async()=>{
 const listener=net.createServer();await new Promise(r=>listener.listen(0,'127.0.0.1',r));
 try{await expect(start({binary,assets:root,socket,port:listener.address().port,stateDir:path.join(root,'occupied')})).rejects.toThrow('already in use');expect(listener.listening).toBe(true);}
 finally{await new Promise(r=>listener.close(r));}
});
test('daemon reuse preserves panes, previous web service, and private state',async()=>{
 const first=await start({binary,assets:root,socket,port:await port(),stateDir:path.join(root,'first')});
 expect(first.daemon.reused).toBe(false);expect(first.httpStatus).toBe(200);
 expect(first.panesAfter).toEqual([{id:3,sessionId:1,tabId:2,program:'shell'}]);expect(first.paneDiff.added).toEqual([]);expect(first.paneDiff.removed).toEqual([]);
 const log=fs.readFileSync(first.web.log,'utf8');expect(log).toContain('token=<REDACTED>');expect(log).not.toContain('fixture-private');
 expect(fs.statSync(first.web.log).mode&0o077).toBe(0);expect(fs.statSync(first.tokenFile).mode&0o077).toBe(0);
 const second=await start({binary,assets:root,socket,port:await port(),stateDir:path.join(root,'second')});
 expect(second.daemon.reused).toBe(true);expect(second.httpStatus).toBe(200);
 expect((await status({binary,socket,port:first.web.port})).httpStatus).toBe(200);
 await expect(start({binary,assets:root,socket,port:await port(),stateDir:path.join(root,'first')})).rejects.toThrow('already contains process records');
 expect((await status({binary,socket,port:first.web.port})).httpStatus).toBe(200);
});
test('web readiness failure terminates only the new web process',async()=>{
 const socket=path.join(root,'failure-private','daemon.sock');
 const stateDir=path.join(root,'failure');process.env.TERN_FIXTURE_HTTP_STATUS='503';
 try{await expect(start({binary,assets:root,socket,port:await port(),stateDir,timeoutMs:1200})).rejects.toThrow('HTTP 200');}
 finally{delete process.env.TERN_FIXTURE_HTTP_STATUS;}
 await new Promise(r=>setTimeout(r,100));
 const pid=Number(fs.readFileSync(path.join(stateDir,'tern-web.pid'),'utf8'));
 expect(()=>process.kill(pid,0)).toThrow();
 expect((await status({binary,socket})).daemon.running).toBe(true);
});
test('invalid executable and assets fail before service creation',async()=>{
 await expect(start({binary:path.join(root,'missing'),assets:root,port:await port(),stateDir:path.join(root,'bad-binary')})).rejects.toThrow('not executable');
 const file=path.join(root,'file');fs.writeFileSync(file,'data');
 await expect(start({binary,assets:file,port:await port(),stateDir:path.join(root,'bad-assets')})).rejects.toThrow('not a directory');
});
test('public socket directory permissions remain unchanged on rejection',async()=>{
 const directory=path.join(root,'public');fs.mkdirSync(directory,{mode:0o755});fs.chmodSync(directory,0o755);
 await expect(start({binary,assets:root,socket:path.join(directory,'socket'),port:await port(),stateDir:path.join(root,'bad-socket')})).rejects.toThrow('group/world accessible');
 expect(fs.statSync(directory).mode&0o777).toBe(0o755);
});
test('public state directory permissions remain unchanged on rejection',async()=>{
 const stateDir=path.join(root,'public-state');fs.mkdirSync(stateDir,{mode:0o755});fs.chmodSync(stateDir,0o755);
 await expect(start({binary,assets:root,socket,port:await port(),stateDir})).rejects.toThrow('private directory');
 expect(fs.statSync(stateDir).mode&0o777).toBe(0o755);
});
