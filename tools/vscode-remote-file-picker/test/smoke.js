const assert = require('node:assert/strict');
const { mkdtemp, mkdir, writeFile, readFile, rm } = require('node:fs/promises');
const { join, basename } = require('node:path');
const { parseArgs } = require('node:util');
const { setTimeout: delay } = require('node:timers/promises');

async function palette(page, command) {
  await page.click('aria/Application Menu[role="menuitem"]');
  const view = await page.waitForSelector('aria/View[role="menuitem"]');
  await view.focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Home');
  await page.keyboard.press('Enter');
  await page.waitForSelector('.quick-input-widget input', { visible: true });
  await page.keyboard.type(command);
  await page.waitForFunction(text => document.querySelector('.quick-input-list')?.innerText.includes(text), {}, command);
  await page.keyboard.press('Enter');
}

async function chooser(page) {
  await page.keyboard.down('Control');
  await page.keyboard.press('KeyO');
  await page.keyboard.up('Control');
  await page.waitForFunction(() => [...document.querySelectorAll('.tab')].some(node => node.textContent.includes('Yazi')) || document.querySelector('[role="dialog"]')?.textContent.includes('Trust Folder & Continue'));
  const trust = await page.evaluate(() => document.querySelector('[role="dialog"]')?.textContent.includes('Trust Folder & Continue'));
  if (trust) throw new Error('Workspace trust is required. Approve only the specific test directory in the isolated browser profile before running this smoke.');
  await page.waitForSelector('.terminal .xterm-helper-textarea', { visible: true });
  await page.focus('.terminal .xterm-helper-textarea');
  if (!(await page.$('.xterm-accessibility-tree'))) {
    await palette(page, 'Toggle Screen Reader Accessibility Mode');
  }
  await page.waitForFunction(() => document.querySelector('.xterm-accessibility-tree')?.textContent.includes('NOR'));
  await page.focus('.terminal .xterm-helper-textarea');
}

async function waitEditor(page, text) {
  await page.waitForFunction(value => [...document.querySelectorAll('.editor-instance .view-lines, .editor-instance textarea')].some(node => (node.value || node.textContent).includes(value)), {}, text);
  await page.waitForFunction(() => ![...document.querySelectorAll('.tab')].some(node => node.innerText.includes('Yazi')));
}

async function run(page, url, directory) {
  const target = new URL(url);
  assert.ok(['http:', 'https:'].includes(target.protocol) && !target.username && !target.password);
  await page.goto(target.href, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.monaco-workbench');
  const fixture = await page.waitForSelector(`.explorer-viewlet [aria-label="${basename(directory)}"]`);
  await fixture.click();
  await page.waitForSelector('.explorer-viewlet [aria-label="source.txt"]');
  await page.click('.explorer-viewlet [aria-label="source.txt"]', { count: 2 });
  await waitEditor(page, 'picker-original');
  await chooser(page);
  await page.keyboard.press('ArrowRight');
  await page.waitForFunction(() => document.querySelector('.xterm-accessibility-tree')?.textContent.includes('/子 目录'));
  await page.keyboard.press('Enter');
  await waitEditor(page, 'picker-selected');
  await chooser(page);
  await page.keyboard.type('q');
  await waitEditor(page, 'picker-selected');
  await page.focus('.editor-instance [role="textbox"][aria-label="中文 文件.txt"]');
  await page.keyboard.down('Control');
  await page.keyboard.press('KeyA');
  await page.keyboard.up('Control');
  await page.keyboard.type('picker-saved');
  await waitEditor(page, 'picker-saved');
  await page.keyboard.down('Control');
  await page.keyboard.press('KeyS');
  await page.keyboard.up('Control');
  const file = join(directory, '子 目录', '中文 文件.txt');
  const deadline = Date.now() + 10000;
  while (await readFile(file, 'utf8') !== 'picker-saved') {
    assert.ok(Date.now() < deadline, 'VS Code did not save the edited original file.');
    await delay(50);
  }
  console.log('PASS actual VS Code Web: Yazi launch, directory navigation, Unicode selection, cancellation, editor focus, save to original file.');
}

async function main() {
  const { values } = parseArgs({ options: { url: { type: 'string' }, profile: { type: 'string' }, executable: { type: 'string', default: '/usr/bin/chromium' } } });
  if (!values.url) throw new Error('Supply --url for the running VS Code Web server.');
  const folder = new URL(values.url).searchParams.get('folder');
  assert.ok(folder, 'Supply the dedicated remote test workspace in the --url folder parameter.');
  const parent = new URL(folder).pathname;
  const directory = await mkdtemp(join(parent, 'vscode-yazi-smoke-'));
  await mkdir(join(directory, '子 目录'));
  await writeFile(join(directory, 'source.txt'), 'picker-original');
  await writeFile(join(directory, '子 目录', '中文 文件.txt'), 'picker-selected');
  const { default: puppeteer } = await import('puppeteer-core');
  const browser = await puppeteer.launch({ executablePath: values.executable, userDataDir: values.profile, headless: true, defaultViewport: { width: 1365, height: 768 }, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const page = await browser.newPage();
  try {
    page.setDefaultTimeout(30000);
    await run(page, values.url, directory);
  } catch (error) {
    console.error('Smoke state:', await page.evaluate(() => ({
      tabs: [...document.querySelectorAll('.tab')].map(node => node.textContent),
      editors: [...document.querySelectorAll('.editor-instance')].map(node => node.textContent),
      inputs: [...document.querySelectorAll('.editor-instance textarea')].map(node => node.value),
      terminal: document.querySelector('.terminal')?.textContent,
      dialogs: [...document.querySelectorAll('[role="dialog"]')].map(node => node.textContent),
    })));
    throw error;
  } finally {
    await browser.close();
    await rm(directory, { recursive: true, force: true });
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
