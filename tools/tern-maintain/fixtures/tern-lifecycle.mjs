import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import net from 'node:net';
import {join} from 'node:path';
import {parseArgs} from 'node:util';

const {positionals, values} = parseArgs({args:process.argv.slice(2), allowPositionals:true, options:{socket:{type:'string'}, listen:{type:'string'}, token:{type:'string'}, assets:{type:'string'}, json:{type:'boolean'}}});
const [command, subcommand] = positionals;

function snapshot() {
  let id = 3;
  const counter = process.env.TERN_LIFECYCLE_PANE_STATE;
  if (counter) {
    const value = existsSync(counter) ? JSON.parse(readFileSync(counter, 'utf8')) + 1 : 1;
    writeFileSync(counter, JSON.stringify(value));
    if (value >= 3) id = 4;
  }
  return {sessions:[{id:1, tabs:[{id:2, blocks:[{id, program:'shell'}]}]}]};
}

if (command === 'daemon') {
  const server = net.createServer(client => client.end(JSON.stringify(snapshot())));
  server.listen(values.socket);
  process.on('SIGTERM', () => server.close(() => process.exit(0)));
} else if (command === 'ls') {
  const client = net.createConnection(process.env.TERN_DAEMON_SOCKET);
  const chunks = [];
  client.on('data', chunk => chunks.push(chunk));
  client.on('end', () => console.log(JSON.stringify(JSON.parse(Buffer.concat(chunks).toString('utf8')))));
  client.on('error', () => {process.exitCode = 2;});
} else if (command === 'web' && subcommand === 'serve') {
  const address = new URL(`http://${values.listen}`);
  const token = readFileSync(values.token, 'utf8').trim();
  const server = Bun.serve({
    hostname:address.hostname,
    port:Number(address.port),
    fetch(request, server) {
      const url = new URL(request.url);
      if (url.pathname === '/wire') {
        if (url.searchParams.get('token') !== token) return new Response(null, {status:403});
        if (server.upgrade(request)) return;
        return new Response(null, {status:400});
      }
      if (url.pathname === '/') return new Response('<!doctype html><title>Tern 0.9.4 · fixture</title>');
      if (values.assets && ['/pkg/client.wasm', '/pkg/client.js'].includes(url.pathname)) return new Response(Bun.file(join(values.assets, url.pathname)));
      return new Response(null, {status:404});
    },
    websocket:{message() {}},
  });
  process.on('SIGTERM', () => {server.stop(true); process.exit(0);});
} else {
  throw new Error('Unsupported lifecycle fixture command');
}
