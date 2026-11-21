const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs/promises');
const { tmpdir } = require('node:os');
const { join, posix } = require('node:path');
const { createConnector } = require('../connector');

const specialName = '中文 name "quote"\nline #%.txt';
const hash = value => `rp_${Buffer.from(value, 'utf8').toString('base64url')}`;

function resource(path, scheme = 'vscode-remote', authority = 'wsl+test', query = 'old=query', fragment = 'old') {
  return {
    path, scheme, authority, query, fragment,
    with(change) {
      return resource(change.path, scheme, authority, change.query, change.fragment);
    },
  };
}

async function fixture(t, initialPath = '/work') {
  const root = await fs.mkdtemp(join(tmpdir(), 'remote-picker-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const local = value => join(root, value.slice(1));
  for (const directory of ['/work/empty', '/work/nested/deep', '/work/nested/sibling', '/other/资料']) {
    await fs.mkdir(local(directory), { recursive: true });
  }
  await fs.writeFile(local(`/work/${specialName}`), 'original content');
  await fs.writeFile(local('/work/nested/deep/note.txt'), 'deep content');
  await fs.writeFile(local('/other/资料/outside.txt'), 'outside content');
  const adaptError = error => {
    if (error.code === 'EACCES' || error.code === 'EPERM') error.code = 'NoPermissions';
    return error;
  };
  const adapter = {
    async stat(uri) {
      try {
        const stat = await fs.stat(local(uri.path));
        return { type: stat.isDirectory() ? 2 : stat.isFile() ? 1 : 0, mtime: stat.mtimeMs, size: stat.size };
      } catch (error) {
        throw adaptError(error);
      }
    },
    async readDirectory(uri) {
      try {
        return (await fs.readdir(local(uri.path), { withFileTypes: true })).map(entry => [
          entry.name, entry.isSymbolicLink() ? 64 : entry.isDirectory() ? 2 : entry.isFile() ? 1 : 0,
        ]);
      } catch (error) {
        throw adaptError(error);
      }
    },
  };
  const baseUri = resource('/work');
  const connector = createConnector({ fs: adapter, baseUri, initialPath });
  return { root, local, adapter, baseUri, connector };
}

function paths(files) {
  return files.map(file => file.path).sort();
}

test('initial open exposes real metadata, the volume root and a connected directory tree', async t => {
  const { connector, local } = await fixture(t);
  assert.equal(connector.startHash, hash('/work'));
  const response = await connector.request({ cmd: 'open', target: '', init: 1, tree: 1 });
  assert.equal(response.api, '2.1');
  assert.deepEqual(response.netDrivers, []);
  assert.equal(response.cwd.hash, hash('/work'));
  assert.equal(response.options.path, '/work');
  assert.equal(response.options.separator, '/');
  for (const command of ['upload', 'rm', 'rename', 'edit', 'download', 'quicklook', 'search',
    'help', 'info', 'preference', 'opennew', 'url', 'file', 'tmb', 'dim', 'size']) {
    assert.ok(response.options.disabled.includes(command));
  }
  const byHash = new Map(response.files.map(file => [file.hash, file]));
  assert.equal(byHash.size, response.files.length);
  const root = byHash.get(hash('/'));
  assert.equal(root.path, '/');
  assert.equal(root.name, '/');
  assert.equal(root.volumeid, 'rp_');
  assert.equal(Object.hasOwn(root, 'phash'), false);
  for (const file of response.files) {
    const stat = await fs.stat(local(file.path));
    assert.equal(file.ts, Math.floor(stat.mtimeMs / 1000));
    assert.equal(file.size, stat.size);
    assert.equal(file.mime, stat.isDirectory() ? 'directory' : 'application/octet-stream');
    assert.equal(file.read, 1);
    assert.equal(file.write, 0);
    assert.equal(file.locked, 1);
    if (file.phash) assert.equal(byHash.get(file.phash).path, posix.dirname(file.path));
  }
  assert.equal(byHash.get(hash('/work/empty')).dirs, -1);
  assert.equal(byHash.get(hash('/work/nested')).dirs, -1);
  const hints = await connector.request({ cmd: 'subdirs', targets: [hash('/work/empty'), hash('/work/nested')] });
  assert.deepEqual(hints.subdirs, { [hash('/work/empty')]: 0, [hash('/work/nested')]: 1 });
  assert.ok(byHash.has(hash(`/work/${specialName}`)));
});

test('a deep initial directory includes every parent and sibling needed to expand the tree', async t => {
  const { connector } = await fixture(t, '/work/nested/deep');
  const response = await connector.request({ cmd: 'open', init: 1, tree: 1 });
  assert.equal(connector.startHash, hash('/work/nested/deep'));
  assert.equal(response.cwd.path, '/work/nested/deep');
  assert.deepEqual(paths(response.files), [
    '/', '/other', '/work', '/work/empty', '/work/nested', '/work/nested/deep',
    '/work/nested/deep/note.txt', '/work/nested/sibling',
  ].sort());
  const next = await connector.request({ cmd: 'open', target: hash('/other/资料'), reload: 1 });
  assert.equal(next.cwd.path, '/other/资料');
  assert.equal(next.options.path, '/other/资料');
  assert.equal(Object.hasOwn(next, 'api'), false);
  assert.equal(Object.hasOwn(next, 'netDrivers'), false);
  assert.ok(next.files.some(file => file.hash === hash('/other/资料/outside.txt')));
});

test('absolute navigation opens directories outside the workspace and preserves remote URI identity', async t => {
  const { connector } = await fixture(t);
  const target = await connector.navigate('/other/资料');
  assert.deepEqual(target, { target: hash('/other/资料'), path: '/other/资料' });
  const response = await connector.request({ cmd: 'open', target: target.target });
  assert.equal(response.cwd.path, '/other/资料');
  const selection = await connector.select(hash('/other/资料/outside.txt'));
  assert.equal(selection.path, '/other/资料/outside.txt');
  assert.equal(selection.scheme, 'vscode-remote');
  assert.equal(selection.authority, 'wsl+test');
  assert.equal(selection.query, '');
  assert.equal(selection.fragment, '');
  assert.deepEqual(await connector.navigate('/'), { target: hash('/'), path: '/' });
});

test('tree returns the requested directory and only its direct subdirectories', async t => {
  const { connector } = await fixture(t);
  const response = await connector.request({ cmd: 'tree', target: hash('/work') });
  assert.deepEqual(paths(response.tree), ['/work', '/work/empty', '/work/nested']);
  assert.ok(response.tree.every(file => file.mime === 'directory'));
  assert.equal(response.tree.find(file => file.path === '/work/empty').dirs, -1);
  assert.equal(response.tree.find(file => file.path === '/work/nested').dirs, -1);
  const empty = await connector.request({ cmd: 'tree', target: hash('/work/empty') });
  assert.deepEqual(paths(empty.tree), ['/work/empty']);
});

test('parents returns connected ancestors and siblings, including deep targets and root', async t => {
  const { connector } = await fixture(t);
  const response = await connector.request({ cmd: 'parents', target: hash('/work/nested/deep') });
  assert.deepEqual(paths(response.tree), [
    '/', '/other', '/work', '/work/empty', '/work/nested', '/work/nested/deep', '/work/nested/sibling',
  ].sort());
  const byHash = new Map(response.tree.map(file => [file.hash, file]));
  for (const file of response.tree) {
    assert.equal(file.mime, 'directory');
    if (file.phash) assert.ok(byHash.has(file.phash));
  }
  assert.deepEqual(paths((await connector.request({ cmd: 'parents', target: hash('/') })).tree), ['/']);
  const limited = await connector.request({
    cmd: 'parents', target: hash('/work/nested/deep'), until: hash('/work/nested'),
  });
  assert.deepEqual(paths(limited.tree), ['/work/nested', '/work/nested/deep', '/work/nested/sibling']);
  await assert.rejects(connector.request({
    cmd: 'parents', target: hash('/work/nested/deep'), until: hash('/other'),
  }), TypeError);
});

test('info returns current filesystem metadata for files and directories', async t => {
  const { connector, local } = await fixture(t);
  const values = [`/work/${specialName}`, '/work/empty'];
  const response = await connector.request({ cmd: 'info', targets: values.map(hash) });
  assert.equal(response.files.length, 2);
  for (const [index, file] of response.files.entries()) {
    const stat = await fs.stat(local(values[index]));
    assert.equal(file.path, values[index]);
    assert.equal(file.name, posix.basename(values[index]));
    assert.equal(file.hash, hash(values[index]));
    assert.equal(file.phash, hash(posix.dirname(values[index])));
    assert.equal(file.size, stat.size);
    assert.equal(file.ts, Math.floor(stat.mtimeMs / 1000));
  }
  assert.equal(response.files[0].mime, 'application/octet-stream');
  assert.equal(Object.hasOwn(response.files[0], 'dirs'), false);
  assert.equal(response.files[1].mime, 'directory');
  assert.equal(response.files[1].dirs, 0);
  assert.deepEqual(await connector.request({ cmd: 'info', targets: [] }), { files: [] });
});

test('ls maps hashes to literal names and applies the protocol intersect filter', async t => {
  const { connector } = await fixture(t);
  const all = await connector.request({ cmd: 'ls', target: hash('/work') });
  assert.deepEqual(all.list, {
    [hash('/work/empty')]: 'empty',
    [hash('/work/nested')]: 'nested',
    [hash(`/work/${specialName}`)]: specialName,
  });
  const intersect = await connector.request({
    cmd: 'ls', target: hash('/work'), intersect: [specialName, 'missing'],
  });
  assert.deepEqual(intersect.list, { [hash(`/work/${specialName}`)]: specialName });
  assert.deepEqual(await connector.request({ cmd: 'ls', target: hash('/work'), intersect: [] }), all);
  assert.deepEqual(await connector.request({ cmd: 'ls', target: hash('/work/empty') }), { list: {} });
});

test('file selection preserves Unicode, punctuation, newlines and file URI schemes without reading content', async t => {
  const { adapter } = await fixture(t);
  const connector = createConnector({ fs: adapter, baseUri: resource('/work', 'file', ''), initialPath: '/work' });
  const selected = await connector.select(hash(`/work/${specialName}`));
  assert.equal(selected.path, `/work/${specialName}`);
  assert.equal(selected.scheme, 'file');
  assert.equal(selected.authority, '');
  assert.equal(selected.query, '');
  assert.equal(selected.fragment, '');
  assert.equal((await connector.request({ cmd: 'info', targets: [hash(selected.path)] })).files[0].read, 1);
  assert.equal((await connector.request({ cmd: 'open' })).cwd.path, '/work');
});

test('directories cannot be selected and files cannot be opened or navigated as directories', async t => {
  const { connector } = await fixture(t);
  for (const value of ['/', '/work', '/work/empty']) {
    await assert.rejects(connector.select(hash(value)), { code: 'FileIsADirectory' });
  }
  const value = `/work/${specialName}`;
  await assert.rejects(connector.navigate(value), { code: 'FileNotADirectory' });
  for (const cmd of ['open', 'tree', 'parents', 'ls']) {
    await assert.rejects(connector.request({ cmd, target: hash(value) }), { code: 'FileNotADirectory' });
  }
});

test('symlink files and directories keep their chosen path while using actual target metadata', async t => {
  const { connector, local } = await fixture(t);
  await fs.symlink(local('/other/资料'), local('/work/directory-link'));
  await fs.symlink(local(`/work/${specialName}`), local('/work/file-link'));
  const response = await connector.request({ cmd: 'open', target: hash('/work') });
  const fileLink = response.files.find(file => file.path === '/work/file-link');
  const directoryLink = response.files.find(file => file.path === '/work/directory-link');
  assert.equal(fileLink.mime, 'application/octet-stream');
  assert.equal(directoryLink.mime, 'directory');
  assert.equal(directoryLink.dirs, -1);
  const hints = await connector.request({ cmd: 'subdirs', targets: [directoryLink.hash] });
  assert.equal(hints.subdirs[directoryLink.hash], 0);
  assert.equal((await connector.select(fileLink.hash)).path, '/work/file-link');
  assert.equal((await connector.navigate('/work/directory-link')).path, '/work/directory-link');
  const opened = await connector.request({ cmd: 'open', target: directoryLink.hash });
  assert.ok(opened.files.some(file => file.path === '/work/directory-link/outside.txt'));
  const tree = await connector.request({ cmd: 'tree', target: hash('/work') });
  assert.ok(tree.tree.some(file => file.path === '/work/directory-link'));
  assert.ok(!tree.tree.some(file => file.path === '/work/file-link'));
});

test('directory addresses resolve normal filesystem syntax while malformed input is rejected', async t => {
  const { connector, adapter, baseUri } = await fixture(t);
  for (const value of ['', 'work', '/work\0hidden', '/work/\ud800', null, 42]) {
    await assert.rejects(connector.navigate(value), TypeError);
    assert.throws(() => createConnector({ fs: adapter, baseUri, initialPath: value }), TypeError);
  }
  for (const [address, expected] of [['/work/', '/work'], ['//work', '/work'],
    ['/work/./nested', '/work/nested'], ['/work/../other', '/other'], ['/..', '/']]) {
    assert.equal((await connector.navigate(address)).path, expected);
    const initial = createConnector({ fs: adapter, baseUri, initialPath: address });
    assert.equal((await initial.request({ cmd: 'open', init: 1 })).cwd.path, expected);
  }
});

test('invalid hashes never become filesystem paths for any command or selection', async t => {
  const { connector } = await fixture(t);
  const malformed = [
    '', '/work', 'other_L3dvcms', 'rp_', 'rp_*', 'rp_L3dvcms=', 'rp_L3dvcmt',
    hash('work'), hash('/work/../other'), hash('/work/'), hash('//work'), hash('/work\0hidden'),
    `rp_${Buffer.from([0x2f, 0xff]).toString('base64url')}`, null, 1,
  ];
  for (const value of malformed) {
    await assert.rejects(connector.select(value), TypeError);
    for (const cmd of ['open', 'tree', 'parents', 'ls']) {
      if (cmd === 'open' && value === '') continue;
      await assert.rejects(connector.request({ cmd, target: value }), TypeError);
    }
    await assert.rejects(connector.request({ cmd: 'info', targets: [value] }), TypeError);
    await assert.rejects(connector.request({ cmd: 'subdirs', targets: [value] }), TypeError);
  }
  await assert.rejects(connector.request({
    cmd: 'parents', target: hash('/work'), until: 'bad',
  }), TypeError);
});

test('only the explicit read-only command whitelist is accepted and files are not modified', async t => {
  const { connector, local } = await fixture(t);
  for (const cmd of ['upload', 'mkdir', 'mkfile', 'rename', 'rm', 'duplicate', 'paste', 'edit',
    'resize', 'chmod', 'archive', 'extract', 'netmount', 'netunmount', 'download', 'zipdl',
    'quicklook', 'file', 'get', 'put', 'tmb', 'url', 'dim', 'search', 'size',
    'exec', '__proto__', 'constructor', 'toString', '', undefined]) {
    await assert.rejects(connector.request({ cmd, target: hash(`/work/${specialName}`), content: 'overwrite' }));
  }
  assert.equal(await fs.readFile(local(`/work/${specialName}`), 'utf8'), 'original content');
  assert.equal((await connector.request({ cmd: 'open' })).cwd.path, '/work');
});

test('malformed request objects and target arrays are rejected at the public interface', async t => {
  const { connector } = await fixture(t);
  for (const value of [null, undefined, [], 'open', 1]) {
    await assert.rejects(connector.request(value), TypeError);
  }
  for (const targets of [undefined, 'hash', null, {}, [hash('/work'), 'invalid']]) {
    for (const cmd of ['info', 'subdirs']) await assert.rejects(connector.request({ cmd, targets }), TypeError);
  }
  for (const intersect of [null, 'name', {}, [1]]) {
    await assert.rejects(connector.request({ cmd: 'ls', target: hash('/work'), intersect }), TypeError);
  }
});

test('missing entities and dangling symlinks report actual errors instead of fake metadata or default folders', async t => {
  const { connector, local } = await fixture(t);
  await assert.rejects(connector.navigate('/missing'), { code: 'ENOENT' });
  await assert.rejects(connector.select(hash('/missing')), { code: 'ENOENT' });
  await assert.rejects(connector.request({ cmd: 'info', targets: [hash('/missing')] }), { code: 'ENOENT' });
  await assert.rejects(connector.request({ cmd: 'open', init: 1, target: hash('/missing') }), { code: 'ENOENT' });
  await fs.mkdir(local('/broken'));
  await fs.symlink(local('/missing'), local('/broken/dangling'));
  await assert.rejects(connector.request({ cmd: 'open', target: hash('/broken') }), { code: 'ENOENT' });
  assert.equal((await connector.request({ cmd: 'open', target: hash('/other/资料') })).cwd.path, '/other/资料');
});

test('deferred directory hints report actual permission failures without claiming an unreadable folder is empty', async t => {
  const { adapter, baseUri, local } = await fixture(t);
  const denied = Object.assign(new Error('provider denied listing'), { code: 'NoPermissions' });
  let deniedAccess = true;
  const boundary = {
    ...adapter,
    async readDirectory(uri) {
      if (deniedAccess && uri.path === '/work/empty') throw denied;
      return adapter.readDirectory(uri);
    },
  };
  const connector = createConnector({ fs: boundary, baseUri, initialPath: '/work' });
  const response = await connector.request({ cmd: 'open' });
  const file = response.files.find(file => file.path === '/work/empty');
  const stat = await fs.stat(local('/work/empty'));
  assert.equal(file.read, 1);
  assert.equal(file.dirs, -1);
  assert.equal(file.size, stat.size);
  assert.equal(file.ts, Math.floor(stat.mtimeMs / 1000));
  const hints = await connector.request({ cmd: 'subdirs', targets: [file.hash, hash('/work/nested')] });
  assert.equal(Object.hasOwn(hints.subdirs, file.hash), false);
  assert.equal(hints.subdirs[hash('/work/nested')], 1);
  const deniedFile = hints.changed.find(entry => entry.hash === file.hash);
  assert.equal(deniedFile.read, 0);
  assert.equal(deniedFile.size, stat.size);
  assert.equal(deniedFile.ts, Math.floor(stat.mtimeMs / 1000));
  assert.equal(Object.hasOwn(deniedFile, 'dirs'), false);
  for (const cmd of ['open', 'tree', 'ls']) {
    await assert.rejects(connector.request({ cmd, target: file.hash }), error => error === denied);
  }
  await assert.rejects(connector.navigate('/work/empty'), error => error === denied);
  const info = await connector.request({ cmd: 'info', targets: [file.hash] });
  assert.equal(info.files[0].read, 0);
  assert.equal((await connector.navigate('/other/资料')).path, '/other/资料');
  deniedAccess = false;
  const granted = await connector.request({ cmd: 'subdirs', targets: [file.hash] });
  assert.equal(granted.subdirs[file.hash], 0);
  assert.equal(granted.changed[0].read, 1);
});

test('a directly accessible deep directory remains usable when an ancestor cannot be listed', async t => {
  const { adapter, baseUri } = await fixture(t);
  const connector = createConnector({
    fs: {
      ...adapter,
      async readDirectory(uri) {
        if (uri.path === '/work') throw Object.assign(new Error('cannot enumerate ancestor'), { code: 'NoPermissions' });
        return adapter.readDirectory(uri);
      },
    },
    baseUri,
    initialPath: '/work/nested/deep',
  });
  const response = await connector.request({ cmd: 'open', init: 1, tree: 1 });
  assert.equal(response.cwd.path, '/work/nested/deep');
  assert.equal(response.files.find(file => file.path === '/work').read, 0);
  assert.ok(response.files.some(file => file.path === '/work/nested/deep/note.txt'));
  assert.ok(response.files.some(file => file.path === '/'));
});

test('unrelated readDirectory and stat failures propagate unchanged and a later request can recover', async t => {
  const { adapter, baseUri } = await fixture(t);
  const failure = Object.assign(new Error('provider disconnected'), { code: 'Unavailable' });
  let fail = true;
  const connector = createConnector({
    fs: {
      ...adapter,
      async readDirectory(uri) {
        if (fail && uri.path === '/work') throw failure;
        return adapter.readDirectory(uri);
      },
      async stat(uri) {
        if (fail && uri.path === '/other') throw failure;
        return adapter.stat(uri);
      },
    },
    baseUri,
    initialPath: '/work',
  });
  await assert.rejects(connector.request({ cmd: 'open', init: 1 }), error => error === failure);
  await assert.rejects(connector.request({ cmd: 'info', targets: [hash('/other')] }), error => error === failure);
  fail = false;
  assert.equal((await connector.request({ cmd: 'open' })).cwd.path, '/work');
  assert.equal((await connector.request({ cmd: 'info', targets: [hash('/other')] })).files[0].path, '/other');
});

test('stat permission failures cannot be replaced with fabricated entries', async t => {
  const { adapter, baseUri } = await fixture(t);
  const denied = Object.assign(new Error('cannot stat path'), { code: 'NoPermissions' });
  const connector = createConnector({
    fs: {
      ...adapter,
      async stat(uri) {
        if (uri.path === '/work/empty') throw denied;
        return adapter.stat(uri);
      },
    },
    baseUri,
    initialPath: '/work',
  });
  await assert.rejects(connector.request({ cmd: 'open' }), error => error === denied);
  await assert.rejects(connector.request({ cmd: 'info', targets: [hash('/work/empty')] }), error => error === denied);
});

test('actual filesystem directory permissions are reflected in visible read state', async t => {
  if (process.getuid?.() === 0) {
    t.skip('Root bypasses POSIX directory permissions.');
    return;
  }
  const { connector, local } = await fixture(t);
  await fs.chmod(local('/work/empty'), 0);
  try {
    const response = await connector.request({ cmd: 'open' });
    const candidate = response.files.find(file => file.path === '/work/empty');
    assert.equal(candidate.dirs, -1);
    const hints = await connector.request({ cmd: 'subdirs', targets: [candidate.hash] });
    assert.equal(hints.changed[0].read, 0);
    assert.equal(Object.hasOwn(hints.subdirs, candidate.hash), false);
    await assert.rejects(connector.navigate('/work/empty'), { code: 'NoPermissions' });
  } finally {
    await fs.chmod(local('/work/empty'), 0o700);
  }
});

test('reloads and subsequent metadata requests observe filesystem changes rather than stale cache', async t => {
  const { connector, local } = await fixture(t);
  const target = hash(`/work/${specialName}`);
  const first = await connector.request({ cmd: 'info', targets: [target] });
  await fs.writeFile(local(`/work/${specialName}`), 'a longer replacement content');
  await fs.mkdir(local('/work/empty/new-child'));
  const next = await connector.request({ cmd: 'info', targets: [target] });
  assert.notEqual(next.files[0].size, first.files[0].size);
  assert.equal(next.files[0].size, (await fs.stat(local(`/work/${specialName}`))).size);
  const response = await connector.request({ cmd: 'open', target: hash('/work'), reload: 1 });
  assert.equal(response.files.find(file => file.path === '/work/empty').dirs, -1);
  const hints = await connector.request({ cmd: 'subdirs', targets: [hash('/work/empty')] });
  assert.equal(hints.subdirs[hash('/work/empty')], 1);
  const tree = await connector.request({ cmd: 'tree', target: hash('/work/empty') });
  assert.deepEqual(paths(tree.tree), ['/work/empty', '/work/empty/new-child']);
});

test('abort acknowledges cancellation without preventing later navigation or selection', async t => {
  const { connector } = await fixture(t);
  assert.deepEqual(await connector.request({ cmd: 'abort', id: 'request-1' }), {});
  assert.equal((await connector.navigate('/other/资料')).path, '/other/资料');
  assert.equal((await connector.select(hash('/other/资料/outside.txt'))).path, '/other/资料/outside.txt');
  assert.deepEqual(await connector.request({ cmd: 'abort' }), {});
  assert.equal((await connector.request({ cmd: 'open' })).cwd.path, '/work');
});

test('providers reporting unknown entry types still produce truthful directory flags and trees', async t => {
  const { adapter, baseUri } = await fixture(t);
  const connector = createConnector({
    fs: {
      ...adapter,
      async readDirectory(uri) {
        return (await adapter.readDirectory(uri)).map(([name]) => [name, 0]);
      },
    },
    baseUri,
    initialPath: '/work',
  });
  const response = await connector.request({ cmd: 'open' });
  assert.equal(response.cwd.dirs, 1);
  assert.equal(response.files.find(file => file.path === '/work/empty').dirs, -1);
  assert.equal(response.files.find(file => file.path === '/work/nested').dirs, -1);
  const hints = await connector.request({ cmd: 'subdirs', targets: [hash('/work/empty'), hash('/work/nested')] });
  assert.deepEqual(hints.subdirs, { [hash('/work/empty')]: 0, [hash('/work/nested')]: 1 });
  const tree = await connector.request({ cmd: 'tree', target: hash('/work') });
  assert.deepEqual(paths(tree.tree), ['/work', '/work/empty', '/work/nested']);
});

test('existing socket entries remain visible but cannot be selected or block other directories', async t => {
  const { connector, local } = await fixture(t);
  const server = require('node:net').createServer();
  await new Promise(resolve => server.listen(local('/work/control.sock'), resolve));
  try {
    const response = await connector.request({ cmd: 'open', target: hash('/work') });
    const socket = response.files.find(file => file.path === '/work/control.sock');
    assert.equal(socket.read, 0);
    const actual = await fs.stat(local('/work/control.sock'));
    assert.equal(socket.size, actual.size);
    assert.equal(socket.ts, Math.floor(actual.mtimeMs / 1000));
    await assert.rejects(connector.select(socket.hash));
    assert.equal((await connector.request({ cmd: 'open', target: hash('/other/资料') })).cwd.path, '/other/资料');
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('normal open and reload list only the requested directory without probing ancestor siblings', async t => {
  const { adapter, baseUri } = await fixture(t);
  const reads = [];
  const failure = Object.assign(new Error('unrelated provider path unavailable'), { code: 'Unavailable' });
  const connector = createConnector({
    fs: {
      ...adapter,
      async readDirectory(uri) {
        reads.push(uri.path);
        if (uri.path === '/' || uri.path === '/work' || uri.path.startsWith('/other')) throw failure;
        return adapter.readDirectory(uri);
      },
    },
    baseUri,
    initialPath: '/work/nested/deep',
  });
  for (const reload of [undefined, 1]) {
    reads.length = 0;
    const response = await connector.request({ cmd: 'open', target: hash('/work/nested/deep'), reload });
    assert.deepEqual(paths(response.files), ['/work/nested/deep', '/work/nested/deep/note.txt']);
    assert.equal(response.cwd.path, '/work/nested/deep');
    assert.deepEqual(reads, ['/work/nested/deep']);
  }
});

test('listing overlaps independent child metadata requests instead of waiting for every entry in sequence', async t => {
  const { adapter, baseUri, local } = await fixture(t);
  for (let index = 0; index < 4; index++) await fs.writeFile(local(`/work/parallel-${index}`), 'data');
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  let started;
  const first = new Promise(resolve => { started = resolve; });
  const pending = new Set();
  const connector = createConnector({
    fs: {
      ...adapter,
      async stat(uri) {
        if (uri.path.startsWith('/work/parallel-')) {
          pending.add(uri.path);
          started();
          await gate;
        }
        return adapter.stat(uri);
      },
    },
    baseUri,
    initialPath: '/work',
  });
  const listing = connector.request({ cmd: 'open' });
  try {
    await first;
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(pending.size, 4);
  } finally {
    release();
    const response = await listing;
    assert.equal(response.files.filter(file => file.path.startsWith('/work/parallel-')).length, 4);
  }
});

test('unknown entries reuse stat probes within one listing but reload observes new file data', async t => {
  const { adapter, baseUri, local } = await fixture(t);
  await fs.symlink(local('/other/资料'), local('/work/directory-link'));
  const stats = new Map();
  const connector = createConnector({
    fs: {
      ...adapter,
      async stat(uri) {
        stats.set(uri.path, (stats.get(uri.path) || 0) + 1);
        return adapter.stat(uri);
      },
      async readDirectory(uri) {
        return (await adapter.readDirectory(uri)).map(([name]) => [name, 0]);
      },
    },
    baseUri,
    initialPath: '/work',
  });
  const first = await connector.request({ cmd: 'open' });
  assert.equal(first.cwd.dirs, 1);
  assert.equal(first.files.find(file => file.path === '/work/directory-link').mime, 'directory');
  assert.ok([...stats.values()].every(count => count === 1));
  stats.clear();
  await fs.writeFile(local(`/work/${specialName}`), 'updated file data');
  const next = await connector.request({ cmd: 'open', reload: 1 });
  assert.equal(next.files.find(file => file.path === `/work/${specialName}`).size, 17);
  assert.ok([...stats.values()].every(count => count === 1));
});

test('open and tree defer child contents while subdirs lists only the requested directories', async t => {
  const { adapter, baseUri } = await fixture(t);
  const reads = [];
  const connector = createConnector({
    fs: {
      ...adapter,
      async readDirectory(uri) {
        reads.push(uri.path);
        return adapter.readDirectory(uri);
      },
    },
    baseUri,
    initialPath: '/work',
  });
  const response = await connector.request({ cmd: 'open' });
  assert.deepEqual(reads, ['/work']);
  assert.deepEqual(paths(response.files), ['/work', '/work/empty', '/work/nested', `/work/${specialName}`].sort());
  assert.equal(response.cwd.dirs, 1);
  assert.equal(response.files.find(file => file.path === '/work/nested').dirs, -1);
  reads.length = 0;
  const hints = await connector.request({ cmd: 'subdirs', targets: [hash('/work/nested')] });
  assert.deepEqual(reads, ['/work/nested']);
  assert.deepEqual(hints.subdirs, { [hash('/work/nested')]: 1 });
  assert.equal(hints.changed[0].dirs, 1);
  assert.equal(hints.changed[0].read, 1);
  reads.length = 0;
  const tree = await connector.request({ cmd: 'tree', target: hash('/work') });
  assert.deepEqual(reads, ['/work']);
  assert.deepEqual(paths(tree.tree), ['/work', '/work/empty', '/work/nested']);
});

test('initial deep trees list the ancestor chain but not siblings contents, and later tree-open only adds the volume root', async t => {
  const { adapter, baseUri } = await fixture(t);
  const reads = [];
  const connector = createConnector({
    fs: {
      ...adapter,
      async readDirectory(uri) {
        reads.push(uri.path);
        return adapter.readDirectory(uri);
      },
    },
    baseUri,
    initialPath: '/work/nested/deep',
  });
  const initial = await connector.request({ cmd: 'open', init: 1, tree: 1 });
  assert.deepEqual(reads.sort(), ['/', '/work', '/work/nested', '/work/nested/deep']);
  assert.deepEqual(paths(initial.files), [
    '/', '/other', '/work', '/work/empty', '/work/nested', '/work/nested/deep',
    '/work/nested/deep/note.txt', '/work/nested/sibling',
  ].sort());
  reads.length = 0;
  const next = await connector.request({ cmd: 'open', target: hash('/other/资料'), tree: 1, reload: 1 });
  assert.deepEqual(reads, ['/other/资料']);
  assert.deepEqual(paths(next.files), ['/', '/other/资料', '/other/资料/outside.txt']);
  reads.length = 0;
  const parents = await connector.request({ cmd: 'parents', target: next.cwd.hash });
  assert.deepEqual(reads.sort(), ['/', '/other', '/other/资料']);
  assert.deepEqual(paths(parents.tree), ['/', '/other', '/other/资料', '/work']);
});

test('subdirs propagates missing paths, stat failures and listing failures unchanged and recovers on a new request', async t => {
  const { adapter, baseUri } = await fixture(t);
  const failure = Object.assign(new Error('provider disconnected'), { code: 'Unavailable' });
  const denied = Object.assign(new Error('cannot stat path'), { code: 'NoPermissions' });
  let fail = true;
  const connector = createConnector({
    fs: {
      ...adapter,
      async stat(uri) {
        if (fail && uri.path === '/work/empty') throw denied;
        return adapter.stat(uri);
      },
      async readDirectory(uri) {
        if (fail && uri.path === '/work/nested') throw failure;
        return adapter.readDirectory(uri);
      },
    },
    baseUri,
    initialPath: '/work',
  });
  await assert.rejects(connector.request({ cmd: 'subdirs', targets: [hash('/work/nested')] }), error => error === failure);
  await assert.rejects(connector.request({ cmd: 'subdirs', targets: [hash('/work/empty')] }), error => error === denied);
  await assert.rejects(connector.request({ cmd: 'subdirs', targets: [hash('/missing')] }), { code: 'ENOENT' });
  await assert.rejects(connector.request({ cmd: 'subdirs', targets: [hash(`/work/${specialName}`)] }), { code: 'FileNotADirectory' });
  fail = false;
  const recovered = await connector.request({ cmd: 'subdirs', targets: [hash('/work/empty'), hash('/work/nested')] });
  assert.deepEqual(recovered.subdirs, { [hash('/work/empty')]: 0, [hash('/work/nested')]: 1 });
  assert.ok(recovered.changed.every(file => file.read === 1));
});
