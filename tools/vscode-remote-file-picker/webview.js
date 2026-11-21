const { Uri } = require('vscode');

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
}

function renderPicker({ webview, extensionUri, config, nonce }) {
  if (typeof nonce !== 'string' || !/^[A-Za-z0-9+/_=-]+$/.test(nonce)) {
    throw new Error('A valid script nonce is required.');
  }
  if (!config || typeof config.startHash !== 'string' || !config.startHash ||
      typeof config.initialPath !== 'string' || !config.initialPath.startsWith('/') ||
      typeof config.storageKey !== 'string' || !config.storageKey) {
    throw new Error('Invalid remote file picker configuration.');
  }
  const resource = path => escapeHtml(webview.asWebviewUri(Uri.joinPath(extensionUri, ...path.split('/'))));
  const json = JSON.stringify(config).replace(/[<>&\u2028\u2029]/g,
    char => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`);
  const csp = escapeHtml([
    "default-src 'none'",
    `script-src ${webview.cspSource} 'nonce-${nonce}'`,
    `style-src ${webview.cspSource} 'unsafe-inline'`,
    `img-src ${webview.cspSource} data:`,
    `font-src ${webview.cspSource}`,
    "connect-src 'none'",
    "worker-src 'none'",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'"
  ].join('; '));
  const styles = [
    'media/vendor/jquery-ui/jquery-ui.min.css',
    'media/vendor/elfinder/css/elfinder.min.css',
    'media/vendor/elfinder/css/theme.css',
    'media/picker.css'
  ];
  const scripts = [
    'media/vendor/jquery/jquery.min.js',
    'media/vendor/jquery-ui/jquery-ui.min.js',
    'media/vendor/elfinder/js/elfinder.min.js',
    'media/picker.js'
  ];
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="${csp}">
  <title>Open a remote file</title>
  ${styles.map(path => `<link rel="stylesheet" href="${resource(path)}">`).join('\n  ')}
</head>
<body>
  <main class="picker-shell" aria-label="Open a remote file">
    <form id="picker-address-form" class="picker-address-bar">
      <label for="picker-address">Folder</label>
      <input id="picker-address" class="picker-input" type="text" value="${escapeHtml(config.initialPath)}"
        required autocomplete="off" spellcheck="false" aria-describedby="picker-error picker-help">
      <button id="picker-go" class="picker-button" type="submit">Go</button>
    </form>
    <p id="picker-error" class="picker-error" role="alert" hidden></p>
    <section id="picker-content" class="picker-content" aria-label="Remote files">
      <div id="remote-file-picker" aria-label="Files and folders" tabindex="0"></div>
    </section>
    <footer class="picker-footer">
      <p id="picker-help" class="picker-help">Read-only picker. Enter opens a file. Alt+L edits the folder. Esc cancels.</p>
      <button id="picker-cancel" class="picker-button picker-button-secondary" type="button">Cancel</button>
    </footer>
  </main>
  <script nonce="${nonce}">window.remoteFilePickerConfig = ${json};</script>
  ${scripts.map(path => `<script nonce="${nonce}" src="${resource(path)}"></script>`).join('\n  ')}
</body>
</html>`;
}

module.exports = { renderPicker };
