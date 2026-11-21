const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { createRequire } = require('node:module');
const { runInNewContext } = require('node:vm');

const root = join(__dirname, '..');
const localRequire = createRequire(join(root, 'extension.js'));
function uri(path, scheme = 'vscode-remote', authority = 'server') {
  return { path, scheme, authority, with: change => uri(change.path, scheme, authority), toString: () => `${scheme}://${authority}${path}` };
}
async function app(overrides = {}) {
  const panels = [], opened = [], errors = [], configs = [];
  const saved = new Map();
  let command;
  const connector = {
    startHash: 'rp_L3Byb2plY3Q',
    request: async () => ({ cwd: { name: 'project' }, files: [] }),
    navigate: async path => ({ target: 'hash', path }),
    select: async () => uri('/project/中文 file.txt'),
    ...overrides.connector,
  };
  const vscode = {
    Uri: { file: path => uri(path, 'file', ''), joinPath: (value, path) => value.with({ path: `${value.path}/${path}` }) },
    workspace: { workspaceFolders: [{ uri: uri('/project') }], fs: {} },
    window: {
      activeTextEditor: { document: { uri: uri('/project/source/index.js') }, viewColumn: 2 },
      tabGroups: { activeTabGroup: { viewColumn: 2 } },
      async showErrorMessage(error) { errors.push(error); },
      createWebviewPanel() {
        let receive, disposed;
        const panel = {
          closed: false, reveals: 0, messages: [],
          reveal() { this.reveals++; },
          dispose() { this.closed = true; disposed(); },
          onDidDispose(callback) { disposed = callback; },
          webview: {
            onDidReceiveMessage(callback) { receive = callback; return { dispose() {} }; },
            async postMessage(message) { panel.messages.push(message); return true; },
          },
          send: message => receive(message),
        };
        panels.push(panel);
        return panel;
      },
    },
    commands: {
      registerCommand(id, handler) { command = handler; return { dispose() {} }; },
      async executeCommand(id, ...args) {
        if (id === 'vscode.open') {
          if (overrides.failOpen?.()) throw new Error('file cannot be read');
          opened.push(args);
        }
      },
    },
  };
  const context = {
    subscriptions: [], extensionUri: uri('/extension', 'file', ''), globalStorageUri: uri('/storage', 'file', ''),
    globalState: {
      get(key, fallback) { return saved.get(key) || fallback; },
      async update(key, value) { saved.set(key, JSON.parse(JSON.stringify(value))); },
    },
  };
  const module = { exports: {} };
  runInNewContext(readFileSync(join(root, 'extension.js'), 'utf8'), {
    module,
    require(name) {
      if (name === 'vscode') return vscode;
      if (name === './connector') return { createConnector: () => connector };
      if (name === './webview') return { renderPicker: ({ config }) => { configs.push(JSON.parse(JSON.stringify(config))); return '<html></html>'; } };
      return localRequire(name);
    },
    console: { info() {} },
  }, { filename: join(root, 'extension.js') });
  await module.exports.activate(context);
  return { run: command, panels, opened, errors, configs, saved, extension: module.exports };
}

test('Ctrl+O repeats reveal the existing file chooser instead of creating another', async () => {
  const application = await app();
  application.run(); application.run();
  assert.equal(application.panels.length, 1);
  assert.equal(application.panels[0].reveals, 1);
  application.panels[0].dispose();
  application.run();
  assert.equal(application.panels.length, 2);
});

test('selected file opens in the original remote editor group and closes chooser', async () => {
  const application = await app(); application.run();
  await application.panels[0].send({ id: 1, type: 'select', hash: 'file-hash' });
  const [[selected, options]] = application.opened;
  assert.equal(selected.path, '/project/中文 file.txt');
  assert.equal(selected.scheme, 'vscode-remote');
  assert.equal(selected.authority, 'server');
  assert.equal(options.viewColumn, 2);
  assert.equal(options.preview, false);
  assert.equal(application.panels[0].closed, true);
});

test('failed file opening reports an error and allows another selection', async () => {
  let failed = false;
  const application = await app({ failOpen: () => { if (!failed) { failed = true; return true; } return false; } });
  application.run(); const panel = application.panels[0];
  await panel.send({ id: 1, type: 'select', hash: 'file-hash' });
  assert.match(panel.messages[0].error, /cannot be read/);
  assert.equal(panel.closed, false);
  await panel.send({ id: 2, type: 'select', hash: 'file-hash' });
  assert.equal(panel.closed, true);
  assert.equal(application.opened.length, 1);
});

test('cancel prevents an outstanding selection from opening a file', async () => {
  const selection = Promise.withResolvers();
  const application = await app({ connector: { select: () => selection.promise } });
  application.run(); const panel = application.panels[0];
  const opening = panel.send({ id: 1, type: 'select', hash: 'file-hash' });
  await panel.send({ type: 'cancel' });
  selection.resolve(uri('/project/file.txt'));
  await opening;
  assert.equal(panel.closed, true);
  assert.equal(application.opened.length, 0);
});

test('native Places state persists when reopening the chooser', async () => {
  const application = await app(); application.run();
  await application.panels[0].send({ id: 1, type: 'storage', key: 'file:///storage:places', value: '["folder-hash"]' });
  application.panels[0].dispose(); application.run();
  assert.equal(application.configs[1].storage['file:///storage:places'], '["folder-hash"]');
  assert.equal(application.saved.get('remoteFilePicker.storage')['file:///storage:places'], '["folder-hash"]');
});

test('directory errors are sent back to the chooser without closing it', async () => {
  const application = await app({ connector: { request: async () => { throw new Error('permission denied'); } } });
  application.run();
  await application.panels[0].send({ id: 1, type: 'request', data: { cmd: 'open', target: 'directory-hash' } });
  assert.match(application.panels[0].messages[0].error, /permission denied/);
  assert.equal(application.panels[0].closed, false);
});

