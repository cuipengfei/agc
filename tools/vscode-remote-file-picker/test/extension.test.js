const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const fs = require('node:fs/promises');
const { join } = require('node:path');
const { createRequire } = require('node:module');
const { runInNewContext } = require('node:vm');

const root = process.cwd();
const localRequire = createRequire(join(root, 'extension.js'));
function uri(path, scheme = 'vscode-remote', authority = 'server') {
  return { path, scheme, authority, with: change => uri(change.path, scheme, authority) };
}

function app(t, overrides = {}) {
  const terminals = [], opened = [], errors = [];
  let command, close;
  const vscode = {
    Uri: { file: path => uri(path, 'file', '') },
    FileType: { File: 1, Directory: 2 },
    TerminalExitReason: { Process: 2, User: 3, Shutdown: 1 },
    workspace: {
      workspaceFolders: [{ uri: uri('/project') }],
      fs: { stat: overrides.stat || (async () => ({ type: 1 })) },
    },
    window: {
      activeTextEditor: { document: { uri: uri('/project/source/index.js') }, viewColumn: 2 },
      tabGroups: { activeTabGroup: { viewColumn: 3 } },
      showErrorMessage: async error => errors.push(error),
      onDidCloseTerminal(handler) { close = handler; return { dispose() {} }; },
      createTerminal(options) {
        if (overrides.createError) throw overrides.createError;
        const terminal = {
          options, reveals: 0,
          show(preserveFocus) { this.reveals++; this.focused = !preserveFocus; },
          dispose() { this.disposed = true; },
          async exit(...args) {
            const code = args.length ? args[0] : 0;
            const reason = args[1] ?? 2;
            this.exitStatus = { code, reason };
            await close(this);
          },
        };
        terminals.push(terminal);
        return terminal;
      },
    },
    commands: {
      registerCommand(id, handler) { command = handler; return { dispose() {} }; },
      async executeCommand(id, ...args) {
        if (id === 'vscode.open') {
          if (overrides.openError) throw overrides.openError;
          opened.push(args);
        }
      },
    },
  };
  const module = { exports: {} };
  runInNewContext(readFileSync(join(root, 'extension.js'), 'utf8'), {
    module,
    require(name) {
      if (name === 'vscode') return vscode;
      return localRequire(name);
    },
    console,
  }, { filename: join(root, 'extension.js') });
  module.exports.activate({ subscriptions: [] });
  t.after(() => module.exports.deactivate());
  return { run: () => command(), close: terminal => close(terminal), terminals, opened, errors, vscode, extension: module.exports };
}

test('Ctrl+O launches one Yazi editor terminal from the active file directory', async t => {
  const application = app(t);
  await Promise.all([application.run(), application.run()]);
  assert.equal(application.terminals.length, 1);
  assert.equal(application.errors.length, 0);
  const terminal = application.terminals[0];
  assert.equal(terminal.options.shellPath, 'yazi');
  assert.equal(terminal.options.cwd.path, '/project/source');
  assert.equal(terminal.options.location.viewColumn, 2);
  assert.equal(terminal.options.isTransient, true);
  await application.run();
  assert.ok(terminal.reveals >= 2);
  await terminal.exit();
});


test('selection opens Unicode paths in the original remote group and removes temporary data', async t => {
  const application = app(t);
  await application.run();
  const terminal = application.terminals[0];
  const result = terminal.options.shellArgs[1];
  await fs.writeFile(result, '/project/中文 文件 #1.txt\n');
  await terminal.exit();
  assert.equal(application.opened.length, 1);
  const [[selected, options]] = application.opened;
  assert.equal(selected.path, '/project/中文 文件 #1.txt');
  assert.equal(selected.scheme, 'vscode-remote');
  assert.equal(selected.authority, 'server');
  assert.equal(options.viewColumn, 2);
  assert.equal(options.preview, false);
  await assert.rejects(fs.access(result), { code: 'ENOENT' });
});

test('quitting without selection returns to the previous editor and can reopen', async t => {
  const application = app(t);
  await application.run();
  await application.terminals[0].exit();
  assert.equal(application.opened[0][0].path, '/project/source/index.js');
  await application.run();
  assert.equal(application.terminals.length, 2);
  await application.terminals[1].exit();
});

test('directories and malformed results are rejected before any selected file is opened', async t => {
  for (const value of ['/project/folder\n', 'relative.txt\n', '/project/file.txt\0\n']) {
    const application = app(t, { stat: async () => ({ type: 2 }) });
    await application.run();
    const terminal = application.terminals[0];
    await fs.writeFile(terminal.options.shellArgs[1], value);
    await terminal.exit();
    assert.equal(application.errors.length, 1);
    assert.equal(application.opened.length, 1);
    assert.equal(application.opened[0][0].path, '/project/source/index.js');
    await assert.rejects(fs.access(terminal.options.shellArgs[1]), { code: 'ENOENT' });
  }
});

test('closing the tab cancels even if a chooser result has been written', async t => {
  const application = app(t);
  await application.run();
  const terminal = application.terminals[0];
  await fs.writeFile(terminal.options.shellArgs[1], '/project/file.txt\n');
  await terminal.exit(undefined, 3);
  assert.equal(application.opened[0][0].path, '/project/source/index.js');
  assert.equal(application.opened.length, 1);
});

test('failed launch and nonzero process exit report actionable errors and release the chooser', async t => {
  const failed = app(t, { createError: new Error('missing executable') });
  await failed.run();
  assert.match(failed.errors[0], /missing executable/);
  const application = app(t);
  await application.run();
  await application.terminals[0].exit(127);
  assert.match(application.errors[0], /status 127/);
  await application.run();
  assert.equal(application.terminals.length, 2);
  await application.terminals[1].exit();
});

test('window shutdown prevents a pending file validation from opening the selection', async t => {
  const validation = Promise.withResolvers();
  const entered = Promise.withResolvers();
  const application = app(t, { stat: () => { entered.resolve(); return validation.promise; } });
  await application.run();
  const terminal = application.terminals[0];
  await fs.writeFile(terminal.options.shellArgs[1], '/project/file.txt\n');
  const closing = terminal.exit();
  await entered.promise;
  await application.extension.deactivate();
  validation.resolve({ type: 1 });
  await closing;
  assert.equal(application.opened.length, 0);
  assert.equal(application.errors.length, 0);
});

test('without an active editor the chooser starts from the workspace directory', async t => {
  const application = app(t);
  application.vscode.window.activeTextEditor = undefined;
  await application.run();
  const options = application.terminals[0].options;
  assert.equal(options.cwd.path, '/project');
  await application.terminals[0].exit();
});

test('an untitled editor without a workspace starts in the server home directory', async t => {
  const application = app(t);
  application.vscode.workspace.workspaceFolders = [];
  application.vscode.window.activeTextEditor.document.uri = uri('/Untitled-1', 'untitled', '');
  await application.run();
  const options = application.terminals[0].options;
  assert.equal(options.cwd.scheme, 'file');
  assert.equal(options.cwd.path, require('node:os').homedir());
  await application.terminals[0].exit();
});

test('VS Code automatic tab closure with User reason still opens a successful chooser result', async t => {
  const application = app(t);
  await application.run();
  const terminal = application.terminals[0];
  await fs.writeFile(terminal.options.shellArgs[1], '/project/selected.txt\n');
  await terminal.exit(0, 3);
  assert.equal(application.opened.length, 1);
  assert.equal(application.opened[0][0].path, '/project/selected.txt');
});

test('unrelated terminal events and startup cancellation never launch or open an extra chooser', async t => {
  const application = app(t);
  await application.close({ exitStatus: { code: 0, reason: 2 } });
  const starting = application.run();
  await application.extension.deactivate();
  await starting;
  assert.equal(application.terminals.length, 0);
  await application.run();
  const terminal = application.terminals[0];
  assert.equal(terminal.focused, true);
  await application.run();
  assert.equal(terminal.focused, true);
  await terminal.exit();
  assert.equal(application.errors.length, 0);
  assert.equal(application.opened[0][1].preserveFocus, false);
});

test('invalid paths are rejected even when the file provider would accept them', async t => {
  for (const value of ['relative.txt\n', '/project/file\0.txt\n']) {
    const application = app(t);
    await application.run();
    const terminal = application.terminals[0];
    await fs.writeFile(terminal.options.shellArgs[1], value);
    await terminal.exit();
    assert.equal(application.opened[0][0].path, '/project/source/index.js');
    assert.equal(application.errors.length, 1);
  }
});

test('special entries are rejected and multiple regular selections open in the original group', async t => {
  for (const type of [0, 3]) {
    const application = app(t, { stat: async () => ({ type }) });
    await application.run();
    const terminal = application.terminals[0];
    await fs.writeFile(terminal.options.shellArgs[1], '/project/special\n');
    await terminal.exit();
    assert.equal(application.errors.length, 1);
  }
  const application = app(t);
  await application.run();
  const terminal = application.terminals[0];
  await fs.writeFile(terminal.options.shellArgs[1], '/project/a.txt\n/project/b.txt\n');
  await terminal.exit();
  assert.deepEqual(application.opened.map(([file]) => file.path), ['/project/a.txt', '/project/b.txt']);
  assert.ok(application.opened.every(([, options]) => options.viewColumn === 2 && options.preserveFocus === false));
});

test('a failed result read is reported and no-result cancellation reports no error', async t => {
  const application = app(t);
  await application.run();
  await application.terminals[0].exit();
  assert.equal(application.errors.length, 0);
  await application.run();
  const terminal = application.terminals[1];
  await fs.mkdir(terminal.options.shellArgs[1]);
  await terminal.exit();
  assert.match(application.errors[0], /directory|EISDIR/i);
});

test('missing workspace metadata and missing exit status cancel without errors', async t => {
  const application = app(t);
  application.vscode.workspace.workspaceFolders = undefined;
  application.vscode.window.activeTextEditor = undefined;
  await application.run();
  const terminal = application.terminals[0];
  assert.equal(terminal.options.cwd.path, require('node:os').homedir());
  await application.close(terminal);
  assert.equal(application.errors.length, 0);
  assert.equal(application.opened.length, 0);
});
