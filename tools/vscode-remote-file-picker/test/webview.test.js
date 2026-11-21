const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

function renderer() {
  const resources = [];
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'webview.js'), 'utf8'), {
    module,
    require(name) {
      assert.equal(name, 'vscode');
      return { Uri: { joinPath(base, ...segments) {
        const resource = `${base}/${segments.join('/')}`;
        resources.push(resource);
        return resource;
      } } };
    }
  });
  return {
    resources,
    render(config = { startHash: 'rp_Lw', initialPath: '/', storageKey: 'server-key' }, nonce = 'safe-nonce') {
      return module.exports.renderPicker({
        webview: { cspSource: 'https://local.example', asWebviewUri: uri => `https://local.example/${uri}` },
        extensionUri: 'extension', config, nonce
      });
    }
  };
}


test('configuration preserves path and Places data without escaping the script or input', () => {
  const config = {
    startHash: 'rp_Lw', initialPath: '/a"<&\'\u2028\u2029</script><script>alert(1)</script>',
    storageKey: 'server-key', storage: { 'server-key:places': '{"rp_Lw":{"name":"<&"}}' }
  };
  const html = renderer().render(config);
  assert.doesNotMatch(html, /<script>alert\(1\)/);
  assert.ok(html.includes('value="/a&quot;&lt;&amp;&#39;'));
  const encoded = html.match(/window\.remoteFilePickerConfig = (.*);<\/script>/)[1];
  assert.doesNotMatch(encoded, /[<>&\u2028\u2029]/);
  assert.deepEqual(JSON.parse(encoded), config);
});

test('rejects a CSP-injecting nonce and invalid required configuration', () => {
  const { render } = renderer();
  assert.throws(() => render(undefined, "nonce'; connect-src *"), /nonce/);
  assert.throws(() => render({ startHash: 'rp_Lw', initialPath: 'relative', storageKey: 'server' }), /configuration/);
  assert.throws(() => render({ startHash: '', initialPath: '/', storageKey: 'server' }), /configuration/);
});
