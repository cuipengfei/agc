const assert = require('node:assert/strict');

async function verifyPresentation(frame) {
  const observed = await frame.evaluate(() => {
    const variables = getComputedStyle(document.body);
    const expected = document.createElement('span').style;
    expected.fontFamily = variables.getPropertyValue('--vscode-editor-font-family').trim();
    expected.fontSize = variables.getPropertyValue('--vscode-editor-font-size').trim();
    const selectors = {
      address: '#picker-address',
      confirm: '#picker-go',
      cancel: '#picker-cancel',
      filenames: '#remote-file-picker .elfinder-cwd-filename',
      tree: '#remote-file-picker .elfinder-navbar-dir',
      status: '#remote-file-picker .elfinder-statusbar',
    };
    const text = [];
    const missing = [];
    for (const [area, selector] of Object.entries(selectors)) {
      const nodes = Array.from(document.querySelectorAll(selector));
      if (!nodes.length) missing.push(area);
      for (const node of nodes) {
        const style = getComputedStyle(node);
        text.push({ area, family: style.fontFamily, size: style.fontSize });
      }
    }
    for (const node of document.querySelectorAll('#remote-file-picker thead td, #remote-file-picker .elfinder-contextmenu-item')) {
      const style = getComputedStyle(node);
      text.push({ area: 'header or menu', family: style.fontFamily, size: style.fontSize });
    }
    const locks = Array.from(document.querySelectorAll('#remote-file-picker .elfinder-lock'))
      .map(node => getComputedStyle(node).display);
    const readonly = Array.from(document.querySelectorAll('#remote-file-picker .elfinder-ro .elfinder-perms'))
      .filter(node => !node.closest('.elfinder-na')).map(node => getComputedStyle(node).display);
    const inaccessible = Array.from(document.querySelectorAll('#remote-file-picker .elfinder-na .elfinder-perms'))
      .map(node => getComputedStyle(node).display);
    return { family: expected.fontFamily, size: expected.fontSize, text, missing, locks, readonly, inaccessible };
  });
  assert.ok(observed.family && observed.size, 'the VS Code editor font variables are supplied');
  assert.deepEqual(observed.missing, [], 'the file picker text areas are present');
  for (const style of observed.text) {
    assert.equal(style.family, observed.family, `${style.area} uses editor.fontFamily`);
    assert.equal(style.size, observed.size, `${style.area} uses editor.fontSize`);
  }
  assert.ok(observed.locks.length && observed.readonly.length, 'policy markers exist in the real elFinder DOM');
  assert.ok(observed.locks.every(display => display === 'none'), 'policy lock decorations are hidden');
  assert.ok(observed.readonly.every(display => display === 'none'), 'policy read-only decorations are hidden');
  assert.ok(observed.inaccessible.every(display => display !== 'none'), 'actual access-denied markers remain visible');
  return observed;
}

module.exports = { verifyPresentation };
