const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');
const { performance } = require('node:perf_hooks');
const { createConnector } = require('../connector');

// Uses only a disposable local corpus; no VS Code session, credentials or artificial delay.
const hash = value => `rp_${Buffer.from(value).toString('base64url')}`;
const initialPath = '/work/project/small';
const childPaths = ['empty', 'nested', 'note.txt', 'directory-link'].map(name => `${initialPath}/${name}`);
const resource = path => ({ path, scheme: 'file', authority: '', with: change => resource(change.path) });
const cases = [
  ['open-small', connector => connector.request({ cmd: 'open', target: hash(initialPath) })],
  ['open-with-hints', async (connector, legacy) => {
    const result = await connector.request({ cmd: 'open', target: hash(initialPath) });
    if (!legacy) {
      const targets = result.files.filter(file => file.path !== initialPath && file.mime === 'directory').map(file => file.hash);
      const hints = await connector.request({ cmd: 'subdirs', targets });
      const changed = new Map(hints.changed.map(file => [file.hash, file]));
      result.files = result.files.map(file => changed.get(file.hash) || file);
    }
    return result;
  }],
  ['initial-deep', connector => connector.request({ cmd: 'open', init: 1, tree: 1 })],
  ['navigate-small', connector => connector.navigate(initialPath)],
  ['tree-small', connector => connector.request({ cmd: 'tree', target: hash(initialPath) })],
  ['parents-deep', connector => connector.request({ cmd: 'parents', target: hash(initialPath) })],
];

function check(name, result) {
  if (name === 'navigate-small') {
    assert.deepEqual(result, { target: hash(initialPath), path: initialPath });
    return 1;
  }
  const files = result.files || result.tree;
  const actual = files.map(file => file.path);
  assert.equal(new Set(actual).size, actual.length);
  if (name === 'open-small' || name === 'open-with-hints' || name === 'initial-deep') {
    assert.equal(result.cwd.path, initialPath);
    assert.deepEqual(actual.filter(value => childPaths.includes(value)).sort(), [...childPaths].sort());
    assert.equal(files.find(file => file.path === `${initialPath}/note.txt`).size, 7);
    assert.equal(files.find(file => file.path === `${initialPath}/directory-link`).mime, 'directory');
  }
  if (name === 'open-with-hints') {
    for (const [name, dirs] of [['empty', 0], ['nested', 1], ['directory-link', 0]]) {
      const file = files.find(file => file.path === `${initialPath}/${name}`);
      assert.equal(file.dirs, dirs);
      assert.equal(file.read, 1);
    }
  }
  if (name === 'tree-small') {
    assert.deepEqual(actual.sort(), [initialPath, `${initialPath}/empty`, `${initialPath}/nested`, `${initialPath}/directory-link`].sort());
  }
  if (name === 'initial-deep' || name === 'parents-deep') {
    for (const value of ['/', '/work', '/work/project', initialPath]) assert.ok(actual.includes(value));
    const byHash = new Map(files.map(file => [file.hash, file]));
    for (const file of files) if (file.phash) assert.ok(byHash.has(file.phash));
  }
  for (const file of files) {
    assert.equal(file.write, 0);
    assert.equal(file.locked, 1);
  }
  return files.length;
}

async function main() {
  const root = await fs.mkdtemp(join(tmpdir(), 'picker-listing-benchmark-'));
  const local = value => join(root, value.slice(1));
  let errors = 0;
  try {
    await fs.mkdir(local(`${initialPath}/empty`), { recursive: true });
    await fs.mkdir(local(`${initialPath}/nested/deep`), { recursive: true });
    await fs.writeFile(local(`${initialPath}/note.txt`), 'content');
    await fs.symlink(local(`${initialPath}/empty`), local(`${initialPath}/directory-link`));
    for (const ancestor of ['/', '/work', '/work/project']) {
      for (let index = 0; index < 24; index++) {
        const directory = `${ancestor === '/' ? '' : ancestor}/unrelated-${index}`;
        await fs.mkdir(local(directory));
        await fs.symlink(local(`${initialPath}/empty`), local(`${directory}/00-link`));
        for (let file = 0; file < 10; file++) await fs.writeFile(local(`${directory}/file-${file}`), 'unrelated');
      }
    }
    const adapter = {
      async stat(uri) {
        const stat = await fs.stat(local(uri.path));
        return { type: stat.isDirectory() ? 2 : stat.isFile() ? 1 : 0, mtime: stat.mtimeMs, size: stat.size };
      },
      async readDirectory(uri) {
        return (await fs.readdir(local(uri.path), { withFileTypes: true })).map(entry => [
          entry.name, entry.isSymbolicLink() ? 64 : entry.isDirectory() ? 2 : entry.isFile() ? 1 : 0,
        ]);
      },
    };
    const sides = process.argv[2]
      ? [['baseline', require(resolve(process.argv[2])).createConnector], ['current', createConnector]]
      : [['current', createConnector]];
    console.log(JSON.stringify({ node: process.version, corpus: { directChildren: 4, depth: 3, unrelatedDirectories: 72, unrelatedFiles: 720, symlinks: 73 }, trials: 5, timing: 'full connector call + consumed output; warm local fs, one caller; not serve-web end-to-end' }));
    for (const [name, run] of cases) {
      for (const [side, create] of sides) {
        let active = 0;
        let peak = 0;
        const operations = [];
        const traced = Object.fromEntries(Object.entries(adapter).map(([method, execute]) => [method, async uri => {
          const start = performance.now();
          active++;
          peak = Math.max(peak, active);
          let code;
          try { return await execute(uri); }
          catch (error) { code = error.code; throw error; }
          finally { active--; operations.push({ method, path: uri.path, ms: performance.now() - start, ...(code ? { error: code } : {}) }); }
        }]));
        const cpuStart = process.cpuUsage();
        const start = performance.now();
        const result = await run(create({ fs: traced, baseUri: resource('/work'), initialPath }), side === 'baseline');
        const wallMs = performance.now() - start;
        const cpu = process.cpuUsage(cpuStart);
        const outputs = check(name, result);
        const counts = Object.fromEntries(['stat', 'readDirectory'].map(method => [method, operations.filter(op => op.method === method).length]));
        console.log(JSON.stringify({ side, name, profile: { counts, peak, outputs, errors: operations.filter(op => op.error).length, wallMs, cpuMs: (cpu.user + cpu.system) / 1000, summedFsMs: operations.reduce((sum, op) => sum + op.ms, 0), operations } }));
      }
      const samples = new Map(sides.map(([side]) => [side, []]));
      for (let trial = 0; trial < 5; trial++) {
        for (const [side, create] of sides) {
          const connector = create({ fs: adapter, baseUri: resource('/work'), initialPath });
          const start = performance.now();
          const result = await run(connector, side === 'baseline');
          const ms = performance.now() - start;
          check(name, result);
          samples.get(side).push(ms);
        }
      }
      for (const [side, values] of samples) {
        const sorted = [...values].sort((a, b) => a - b);
        console.log(JSON.stringify({ side, name, timing: { medianMs: sorted[2], minMs: sorted[0], maxMs: sorted[4], samplesMs: values }, errors: 0 }));
      }
    }
  } catch (error) {
    errors++;
    console.error(JSON.stringify({ errors, code: error.code, message: error.message }));
    process.exitCode = 1;
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}

main();
