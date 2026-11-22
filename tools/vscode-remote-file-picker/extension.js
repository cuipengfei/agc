const vscode = require('vscode');
const { dirname, isAbsolute, join } = require('node:path');
const { homedir, tmpdir } = require('node:os');
const { mkdtemp, readFile, rm } = require('node:fs/promises');

let activeSession;

function activate(context) {
  context.subscriptions.push(
    vscode.commands.registerCommand('remoteFilePicker.open', () => openPicker().catch(reportError)),
    vscode.window.onDidCloseTerminal(terminal => {
      const session = activeSession;
      if (session?.terminal === terminal) return finishPicker(session, terminal.exitStatus).catch(reportError);
    }),
  );
}

function reportError(error) {
  return vscode.window.showErrorMessage(`Yazi file picker: ${error.message}`);
}

function createSession() {
  const previous = vscode.window.activeTextEditor;
  const workspace = vscode.workspace.workspaceFolders?.[0]?.uri;
  const { baseUri, initialPath } = initialDirectory(previous?.document.uri, workspace);
  const column = previous?.viewColumn || vscode.window.tabGroups.activeTabGroup.viewColumn;
  return { previous, baseUri, initialPath, column, cancelled: false };
}

function initialDirectory(current, workspace) {
  const usable = current && current.scheme !== 'untitled';
  const baseUri = workspace || (usable ? current : vscode.Uri.file(homedir()));
  const sameHost = usable && current.scheme === baseUri.scheme && current.authority === baseUri.authority;
  return { baseUri, initialPath: sameHost ? dirname(current.path) : baseUri.path };
}

async function openPicker() {
  if (activeSession) {
    activeSession.terminal?.show(false);
    return;
  }
  const session = createSession();
  activeSession = session;
  try {
    session.directory = await mkdtemp(join(tmpdir(), 'vscode-yazi-'));
    if (session.cancelled) return await cleanup(session);
    session.resultFile = join(session.directory, 'selection');
    session.terminal = vscode.window.createTerminal({
      name: 'Yazi — Open File',
      shellPath: 'yazi',
      shellArgs: ['--chooser-file', session.resultFile],
      cwd: session.baseUri.with({ path: session.initialPath, query: '', fragment: '' }),
      location: { viewColumn: session.column },
      isTransient: true,
    });
    session.terminal.show(false);
  } catch (error) {
    await cleanup(session);
    throw error;
  }
}

async function readSelection(session) {
  let text;
  try {
    text = await readFile(session.resultFile, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
  if (!text) return [];
  const paths = text.endsWith('\n') ? text.slice(0, -1).split('\n') : text.split('\n');
  return Promise.all(paths.map(value => selectedFile(session.baseUri, value)));
}

async function selectedFile(baseUri, value) {
  if (!isAbsolute(value) || value.includes('\0')) throw new Error('Yazi returned an invalid file path.');
  const uri = baseUri.with({ path: value, query: '', fragment: '' });
  const stat = await vscode.workspace.fs.stat(uri);
  if (!(stat.type & vscode.FileType.File) || (stat.type & vscode.FileType.Directory)) {
    throw new Error(`Select a file with Enter; enter directories with the right arrow: ${value}`);
  }
  return uri;
}

async function restoreEditor(session) {
  if (session.cancelled) return;
  if (session.previous) {
    await vscode.commands.executeCommand('vscode.open', session.previous.document.uri, { viewColumn: session.column, preserveFocus: false });
  } else {
    await vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
  }
}

async function finishPicker(session, status) {
  try {
    if (session.cancelled) return;
    if (status?.reason === vscode.TerminalExitReason.Shutdown) return;
    if (!status) return await restoreEditor(session);
    if (status.code === undefined) return await restoreEditor(session);
    await openSelection(session, status);
  } catch (error) {
    await restoreEditor(session);
    throw error;
  } finally {
    await cleanup(session);
  }
}

async function openSelection(session, status) {
  if (status.code !== 0) throw new Error(`Yazi exited with status ${status.code}. Check that yazi is available on the server PATH.`);
  const files = await readSelection(session);
  if (!files.length) return await restoreEditor(session);
  for (const file of files) {
    if (session.cancelled) return;
    await vscode.commands.executeCommand('vscode.open', file, { viewColumn: session.column, preview: false, preserveFocus: false });
  }
}

async function cleanup(session) {
  if (session.directory) await rm(session.directory, { recursive: true, force: true });
  if (activeSession === session) activeSession = undefined;
}

async function deactivate() {
  const session = activeSession;
  if (!session) return;
  session.cancelled = true;
  session.terminal?.dispose();
  await cleanup(session);
}

module.exports = { activate, deactivate };
