const assert = require('node:assert/strict');
const { createServer } = require('node:http');
const { readFile, writeFile, mkdtemp, mkdir, rm, readdir, stat, chmod } = require('node:fs/promises');
const { join, resolve, sep } = require('node:path');
const { tmpdir } = require('node:os');
const { createRequire } = require('node:module');
const { runInNewContext } = require('node:vm');
const { parseArgs } = require('node:util');
const { setTimeout: delay } = require('node:timers/promises');
const { verifyPresentation } = require('./presentation');

const root = resolve(__dirname, '..');
function uri(path) {
  return { path, scheme: 'file', authority: '', with: change => uri(change.path), toString: () => `file://${path}` };
}
const fs = {
  async stat(resource) {
    try {
      const value = await stat(resource.path);
      return { type: value.isDirectory() ? 2 : value.isFile() ? 1 : 0, size: value.size, mtime: value.mtimeMs, ctime: value.ctimeMs };
    } catch (error) {
      if (error.code === 'EACCES' || error.code === 'EPERM') error.code = 'NoPermissions';
      throw error;
    }
  },
  async readDirectory(resource) {
    try {
      return (await readdir(resource.path, { withFileTypes: true })).map(entry => [entry.name, entry.isSymbolicLink() ? 64 : entry.isDirectory() ? 2 : entry.isFile() ? 1 : 0]);
    } catch (error) {
      if (error.code === 'EACCES' || error.code === 'EPERM') error.code = 'NoPermissions';
      throw error;
    }
  },
};

async function shortcut(keyboard, modifiers, key) {
  for (const modifier of modifiers) await keyboard.down(modifier);
  try { await keyboard.press(key); }
  finally {
    for (let index = modifiers.length - 1; index >= 0; index--) await keyboard.up(modifiers[index]);
  }
}

async function waitFinder(page) {
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    for (const frame of page.frames()) {
      try {
        await frame.waitForFunction(() => {
          const jquery = window.jQuery;
          return typeof jquery === 'function' && typeof jquery.fn?.elfinder === 'function' && Boolean(jquery('.elfinder').elfinder('instance')?.cwd()?.hash);
        }, { timeout: 1000 });
        return frame;
      } catch (error) {
        if (error.name !== 'TimeoutError' && !/detached|destroyed|Cannot find context/.test(error.message)) throw error;
      }
    }
    await delay(100);
  }
  throw new Error('elFinder did not become ready in the browser.');
}

async function navigate(frame, path) {
  const input = await frame.$('#picker-address');
  assert.ok(input, 'absolute path input is available');
  await input.click();
  await shortcut(frame.page().keyboard, ['Control'], 'KeyA');
  await input.type(path);
  await input.press('Enter');
  await frame.waitForFunction(expected => window.jQuery('.elfinder').elfinder('instance').cwd().hash === expected,
    { timeout: 20000 }, `rp_${Buffer.from(path).toString('base64url')}`);
}

async function select(frame, path) {
  const hash = `rp_${Buffer.from(path).toString('base64url')}`;
  await frame.waitForSelector(`[id$="${hash}"]`, { timeout: 20000 });
  await frame.click(`[id$="${hash}"]`, { count: 2 });
}

async function component(browser, directory, file) {
  const deniedDirectory = join(directory, 'unreadable');
  await mkdir(deniedDirectory, { mode: 0 });
  const { createConnector } = require('../connector');
  const connector = createConnector({ fs, baseUri: uri('/'), initialPath: directory });
  const storage = Object.create(null);
  const selected = [];
  let cancelled = false;
  let port;
  const module = { exports: {} };
  const localRequire = createRequire(join(root, 'webview.js'));
  runInNewContext(await readFile(join(root, 'webview.js'), 'utf8'), {
    module,
    require(name) {
      if (name === 'vscode') return { Uri: { joinPath: (base, ...parts) => uri(join(base.path, ...parts)) } };
      return localRequire(name);
    },
  }, { filename: join(root, 'webview.js') });
  const server = createServer(async (request, response) => {
    try {
      const path = new URL(request.url, `http://127.0.0.1:${port}`).pathname;
      if (path === '/') {
        response.setHeader('Content-Type', 'text/html; charset=utf-8');
        response.end(module.exports.renderPicker({
          extensionUri: uri(root), nonce: 'component-proof',
          webview: { cspSource: `http://127.0.0.1:${port}`, asWebviewUri: value => ({ toString: () => `http://127.0.0.1:${port}/assets/${value.path.slice(root.length + 1)}` }) },
          config: { startHash: connector.startHash, initialPath: directory, storageKey: 'component-proof', storage },
        }));
        return;
      }
      assert.ok(path.startsWith('/assets/'));
      const source = resolve(root, decodeURIComponent(path.slice('/assets/'.length)));
      assert.ok(source.startsWith(root + sep));
      const types = { '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.gif': 'image/gif', '.svg': 'image/svg+xml' };
      const extension = require('node:path').extname(source);
      response.setHeader('Content-Type', types[extension] || 'application/octet-stream');
      response.end(await readFile(source));
    } catch (error) {
      response.statusCode = 500; response.end(error.message);
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  port = server.address().port;
  const page = await browser.newPage();
  const failures = [];
  const trace = [];
  page.on('pageerror', error => failures.push(error.message));
  await page.exposeFunction('sendPickerMessage', async message => {
    if (message.type === 'cancel') { cancelled = true; return; }
    const reply = { id: message.id };
    try {
      if (message.type === 'request') reply.result = await connector.request(message.data);
      else if (message.type === 'navigate') reply.result = await connector.navigate(message.path);
      else if (message.type === 'select') { selected.push((await connector.select(message.hash)).path); reply.result = true; }
      else if (message.type === 'storage') {
        if (message.value === null) delete storage[message.key]; else storage[message.key] = message.value;
        reply.result = true;
      } else throw new Error('unexpected browser message');
    } catch (error) { reply.error = error.message; }
    if (message.type === 'request' || message.type === 'navigate') {
      trace.push({ type: message.type, command: message.data?.cmd, path: message.path, target: message.data?.target, error: reply.error });
      if (trace.length > 8) trace.shift();
    }
    await page.evaluate(value => window.dispatchEvent(new MessageEvent('message', { data: value })), reply);
  });
  await page.evaluateOnNewDocument(() => {
    window.acquireVsCodeApi = () => ({ postMessage: message => window.sendPickerMessage(message), getState: () => undefined, setState() {} });
  });
  try {
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'load' });
    let frame = await waitFinder(page);
    const deniedHash = `rp_${Buffer.from(deniedDirectory).toString('base64url')}`;
    await frame.waitForSelector(`#remote-file-picker [id$="${deniedHash}"].elfinder-na .elfinder-perms`, { timeout: 20000 });
    await frame.click('#remote-file-picker .elfinder-cwd', { button: 'right' });
    await frame.waitForSelector('#remote-file-picker .elfinder-contextmenu-item', { visible: true, timeout: 20000 });
    for (const [family, size] of [['monospace', '19px'], ['serif', '23px']]) {
      await frame.evaluate((family, size) => {
        const style = document.documentElement.style;
        style.setProperty('--vscode-font-family', 'sans-serif');
        style.setProperty('--vscode-font-size', '11px');
        style.setProperty('--vscode-editor-font-family', family);
        style.setProperty('--vscode-editor-font-size', size);
      }, family, size);
      const presentation = await verifyPresentation(frame);
      assert.ok(presentation.inaccessible.length, 'a real unreadable directory keeps its access-denied marker');
    }
    await frame.click('#picker-address');
    await navigate(frame, join(directory, '子 目录'));
    await navigate(frame, directory);
    await select(frame, file);
    await page.waitForFunction(() => window.jQuery('.elfinder').elfinder('instance').selected().length > 0);
    const deadline = Date.now() + 10000;
    while (!selected.length && Date.now() < deadline) await delay(50);
    assert.equal(selected[0], file);
    const folderHash = `rp_${Buffer.from(join(directory, '子 目录')).toString('base64url')}`;
    await frame.evaluate(async hash => { await window.jQuery('.elfinder').elfinder('instance').exec('places', [hash]); }, folderHash);
    await page.waitForFunction(() => JSON.stringify(window.jQuery('.elfinder').elfinder('instance').storage('places')).includes('rp_'));
    await page.reload({ waitUntil: 'load' });
    frame = await waitFinder(page);
    const persisted = await frame.evaluate(() => window.jQuery('.elfinder').elfinder('instance').storage('places'));
    assert.ok(JSON.stringify(persisted).includes(folderHash), 'native Places survives a new picker instance');
    await page.keyboard.press('Escape');
    const cancelDeadline = Date.now() + 10000;
    while (!cancelled && Date.now() < cancelDeadline) await delay(50);
    assert.equal(cancelled, true);
    assert.deepEqual(failures, []);
    console.log('PASS real elFinder: editor font family/size updates, policy badges hidden, access-denied markers visible, absolute-path navigation, file selection, Places persistence, Escape cancellation.');
  } catch (error) {
    console.error('Browser proof state:', JSON.stringify(await page.evaluate(() => ({
      path: document.getElementById('picker-address').value,
      error: document.getElementById('picker-error').textContent,
      cwd: window.jQuery('.elfinder').elfinder('instance')?.cwd(),
      selection: window.jQuery('.elfinder').elfinder('instance')?.selected(),
      getfileState: window.jQuery('.elfinder').elfinder('instance')?.getCommand('getfile')?.getstate(),
      callbackType: typeof window.jQuery('.elfinder').elfinder('instance')?.getCommand('getfile')?.callback,
      entries: Array.from(document.querySelectorAll('.elfinder-cwd-file')).map(node => ({ id: node.id, classes: node.className, text: node.textContent })),
      dialogs: Array.from(document.querySelectorAll('.elfinder-dialog')).map(node => node.textContent),
    }))));
    console.error('Browser request trace:', JSON.stringify(trace));
    console.error('Browser exceptions:', JSON.stringify(failures));
    throw error;
  } finally {
    await chmod(deniedDirectory, 0o700);
    await page.close();
    await new Promise(resolve => server.close(resolve));
  }
}

async function editor(browser, url, directory, file) {
  const page = await browser.newPage();
  page.on('requestfailed', request => {
    if (!/vscode-cdn|vscode-webview|remote-file-picker/.test(request.url())) return;
    const url = new URL(request.url());
    console.error('Webview resource failure:', JSON.stringify({ origin: url.origin, path: url.pathname, error: request.failure()?.errorText }));
  });
  const target = new URL(url);
  assert.ok(['http:', 'https:'].includes(target.protocol) && !target.username && !target.password);
  target.searchParams.delete('folder');
  try {
    await page.goto(target.href, { waitUntil: 'domcontentloaded', timeout: 60000 });
    const authority = await page.evaluate(() => {
      const settings = document.getElementById('vscode-workbench-web-configuration');
      return JSON.parse(settings.getAttribute('data-settings')).remoteAuthority;
    });
    assert.ok(typeof authority === 'string' && authority.length > 0, 'serve-web provides its remote authority');
    const workspace = new URL(`vscode-remote://${authority}`);
    workspace.pathname = directory;
    target.searchParams.set('folder', workspace.href);
    await page.goto(target.href, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('.monaco-workbench', { timeout: 30000 });
    await shortcut(page.keyboard, ['Control', 'Shift'], 'KeyE');
    await page.waitForSelector('.explorer-viewlet [aria-label="子 目录"]', { visible: true, timeout: 30000 });
    await page.click('.explorer-viewlet [aria-label="子 目录"]');
    await page.waitForSelector('.explorer-viewlet [aria-label="nested.txt"]', { visible: true, timeout: 30000 });
    await page.click('.explorer-viewlet [aria-label="nested.txt"]', { count: 2 });
    await page.waitForFunction(() => Array.from(document.querySelectorAll('.editor-instance .view-lines')).some(node => node.textContent.includes('nested')), { timeout: 30000 });
    console.log('Actual remote file is open in the editor.');
    await shortcut(page.keyboard, ['Control'], 'KeyO');
    const frame = await waitFinder(page);
    await verifyPresentation(frame);
    console.log('Ctrl+O opened the actual elFinder webview.');
    await navigate(frame, directory);
    const childHash = `rp_${Buffer.from(join(directory, '子 目录')).toString('base64url')}`;
    await frame.waitForSelector(`#remote-file-picker .elfinder-navbar-dir[id$="${childHash}"]`, { timeout: 20000 });
    await frame.click(`#remote-file-picker .elfinder-navbar-dir[id$="${childHash}"]`);
    await frame.waitForFunction(hash => window.jQuery('.elfinder').elfinder('instance').cwd().hash === hash, { timeout: 20000 }, childHash);
    await frame.waitForSelector(`[id$="rp_${Buffer.from(join(directory, '子 目录', 'nested.txt')).toString('base64url')}"]`, { timeout: 20000 });
    await verifyPresentation(frame);
    await navigate(frame, directory);
    await select(frame, file);
    await page.waitForFunction(() => Array.from(document.querySelectorAll('.view-lines')).some(node => node.textContent.includes('picker-original')), { timeout: 30000 });
    await page.click('.editor-instance .monaco-editor .view-lines');
    await shortcut(page.keyboard, ['Control'], 'KeyA');
    await page.keyboard.type('picker-saved');
    await shortcut(page.keyboard, ['Control'], 'KeyS');
    const deadline = Date.now() + 10000;
    while ((await readFile(file, 'utf8')) !== 'picker-saved' && Date.now() < deadline) await delay(100);
    assert.equal(await readFile(file, 'utf8'), 'picker-saved');
    await shortcut(page.keyboard, ['Control'], 'KeyO');
    const reopened = await waitFinder(page);
    await verifyPresentation(reopened);
    await reopened.click('#picker-cancel');
    await page.waitForFunction(() => Array.from(document.querySelectorAll('.tab.active')).some(node => node.textContent.includes('中文 文件.txt')), { timeout: 10000 });
    console.log('PASS actual serve-web: editor font settings, policy badges hidden, file opening, save to original file, Ctrl+O binding, cancellation returns to the file.');
  } catch (error) {
    console.error('Serve-web UI state:', JSON.stringify(await page.evaluate(() => ({
      title: document.title,
      focusedElement: document.activeElement?.className,
      paletteInput: document.querySelector('.quick-input-widget input')?.value,
      paletteText: document.querySelector('.quick-input-widget')?.innerText,
      paletteDisplay: document.querySelector('.quick-input-widget')?.style.display,
      explorer: document.querySelector('.explorer-viewlet')?.innerText,
      activeTabs: Array.from(document.querySelectorAll('.tab.active')).map(node => node.textContent),
      dialogs: Array.from(document.querySelectorAll('.monaco-dialog-box')).map(node => node.textContent),
    }))));
    console.error('Serve-web frame origins:', JSON.stringify(page.frames().map(frame => {
      const url = new URL(frame.url() || 'about:blank');
      return { protocol: url.protocol, origin: url.origin, path: ['http:', 'https:'].includes(url.protocol) ? url.pathname : undefined };
    })));
    throw error;
  } finally { await page.close(); }
}

async function main() {
  const { values } = parseArgs({ options: { url: { type: 'string' }, executable: { type: 'string', default: '/usr/bin/chromium' } } });
  const directory = await mkdtemp(join(tmpdir(), 'remote-picker-smoke-'));
  const file = join(directory, '中文 文件.txt');
  await mkdir(join(directory, '子 目录'));
  await writeFile(join(directory, '子 目录', 'nested.txt'), 'nested');
  await writeFile(file, 'picker-original');
  const { default: puppeteer } = await import('puppeteer-core');
  const env = { ...process.env };
  delete env.DISPLAY; delete env.WAYLAND_DISPLAY;
  const browser = await puppeteer.launch({ executablePath: values.executable, headless: true, env, protocolTimeout: 45000, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  try {
    if (values.url) await editor(browser, values.url, directory, file);
    else await component(browser, directory, file);
  } finally {
    await browser.close();
    await rm(directory, { recursive: true, force: true });
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
