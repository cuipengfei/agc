const vscode = require('vscode');
const { dirname } = require('node:path').posix;
const { homedir } = require('node:os');
const { randomBytes } = require('node:crypto');
const { createConnector } = require('./connector');
const { renderPicker } = require('./webview');

let activePanel;

function activate(context) {
  const storage = Object.assign(Object.create(null), context.globalState.get('remoteFilePicker.storage', {}));

  context.subscriptions.push(vscode.commands.registerCommand('remoteFilePicker.open', () => {
    if (activePanel) {
      activePanel.reveal();
      return;
    }
    const previous = vscode.window.activeTextEditor;
    const workspace = vscode.workspace.workspaceFolders?.[0]?.uri;
    const baseUri = workspace || previous?.document.uri || vscode.Uri.file(homedir());
    const current = previous?.document.uri;
    const currentIsFile = current && current.scheme === baseUri.scheme && current.authority === baseUri.authority;
    const initialPath = currentIsFile ? dirname(current.path) : baseUri.path;
    const connector = createConnector({ fs: vscode.workspace.fs, baseUri, initialPath });
    const column = previous?.viewColumn || vscode.window.tabGroups.activeTabGroup.viewColumn;
    const panel = vscode.window.createWebviewPanel('remoteFilePicker', 'Open Remote File', column, {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media')],
    });
    activePanel = panel;
    let disposed = false;
    const listener = panel.webview.onDidReceiveMessage(async message => {
      if (disposed) return;
      if (message?.type === 'cancel') {
        panel.dispose();
        return;
      }
      const id = message?.id;
      if (!Number.isSafeInteger(id) || id <= 0) {
        await vscode.window.showErrorMessage('Remote File Picker received an invalid request identifier.');
        return;
      }
      try {
        let result;
        if (message.type === 'request' && message.data && !Array.isArray(message.data) && typeof message.data === 'object') {
          result = await connector.request(message.data);
        } else if (message.type === 'navigate' && typeof message.path === 'string') {
          result = await connector.navigate(message.path);
        } else if (message.type === 'storage' && typeof message.key === 'string' && message.key.length > 0 && (typeof message.value === 'string' || message.value === null)) {
          if (message.value === null) delete storage[message.key];
          else storage[message.key] = message.value;
          await context.globalState.update('remoteFilePicker.storage', storage);
          result = true;
        } else if (message.type === 'select' && typeof message.hash === 'string') {
          const uri = await connector.select(message.hash);
          if (disposed) return;
          await vscode.commands.executeCommand('vscode.open', uri, { viewColumn: column, preview: false });
          result = true;
        } else {
          throw new Error('Invalid Remote File Picker request.');
        }
        if (!disposed) await panel.webview.postMessage({ id, result });
        if (message.type === 'select' && !disposed) panel.dispose();
      } catch (error) {
        if (!disposed) await panel.webview.postMessage({ id, error: error.message });
      }
    });
    panel.onDidDispose(() => {
      disposed = true;
      listener.dispose();
      if (activePanel === panel) activePanel = undefined;
    });
    panel.webview.html = renderPicker({
      webview: panel.webview,
      extensionUri: context.extensionUri,
      nonce: randomBytes(18).toString('base64url'),
      config: { startHash: connector.startHash, initialPath, storageKey: context.globalStorageUri.toString(), storage },
    });
  }));
  console.info('[Remote File Picker] Ready. Command: remoteFilePicker.open');
}

function deactivate() {
  activePanel?.dispose();
}

module.exports = { activate, deactivate };
