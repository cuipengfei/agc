import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

/** @typedef {Window & { __ternFontWasmSha?: string, __ternVerification?: { candidateSha: string }, __ternFontWasm?: WebAssembly.Exports, tern?: { unmount?: () => void } }} ProbeWindow */

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const normalize = value => value?.trim().toLowerCase();
const clean = value => String(value).replace(/token=[^\s&"']+/g, 'token=<REDACTED>');

export function classifyFonts({ identityMatches, delivered, runs, family, builtin, mode = 'full' }) {
  const phases = mode === 'full' ? ['cold', 'warm', 'builtin', 'missing'] : ['target', 'builtin', 'missing'];
  if (!identityMatches || runs.length !== phases.length || phases.some(phase => runs.filter(run => run.phase === phase).length !== 1) || runs.some(run => run.error)) return 'needs_investigation';
  const find = name => runs.find(run => run.phase === name);
  if (normalize(find('builtin')?.matched) !== normalize(builtin) || find('missing')?.matched !== null) return 'needs_investigation';
  const targets = (mode === 'full' ? ['cold', 'warm'] : ['target']).map(find);
  if (targets.every(run => normalize(run?.matched) === normalize(family))) return 'working';
  if (delivered && targets.every(run => run?.matched === null)) return 'registration_missing';
  return 'needs_investigation';
}

async function selectedFont(page, cdp, scriptId, offset, family) {
  const { locations } = await cdp.send('Debugger.getPossibleBreakpoints', { start: { scriptId, lineNumber: 0, columnNumber: offset }, end: { scriptId, lineNumber: 0, columnNumber: offset + 64 } });
  if (!locations.length) throw Error('Font selector breakpoint is unavailable');
  const breakpoint = await cdp.send('Debugger.setBreakpoint', { location: locations[0] });
  return { result: new Promise((resolveResult, reject) => {
    let output, returning = false;
    const timer = setTimeout(() => finish(Error('Font selector was not reached')), 15000);
    function finish(error, result) {
      clearTimeout(timer);
      cdp.off('Debugger.paused', paused);
      cdp.send('Debugger.resume').catch(() => {});
      cdp.send('Debugger.removeBreakpoint', { breakpointId: breakpoint.breakpointId }).catch(() => {});
      error ? reject(error) : resolveResult(result);
    }
    async function paused(event) {
      try {
        if (returning) {
          const response = await cdp.send('Runtime.evaluate', { returnByValue: true, expression: `(()=>{const m=new Uint8Array(window.__ternFontWasm.memory.buffer),d=new DataView(m.buffer),o=${output};if(d.getInt32(o,true)===-1)return null;const p=d.getUint32(o+4,true),n=d.getUint32(o+8,true);if(n>256||p+n>m.length)throw Error('Invalid font selector result');return new TextDecoder().decode(m.subarray(p,p+n));})()` });
          if (response.exceptionDetails) throw Error('Font selector result could not be read');
          await cdp.send('Debugger.resume');
          finish(null, response.result.value);
          return;
        }
        const scope = event.callFrames[0].scopeChain.find(item => item.type === 'local');
        const properties = await cdp.send('Runtime.getProperties', { objectId: scope.object.objectId, ownProperties: true });
        const values = [];
        for (const property of properties.result.slice(0, 5)) {
          const inner = await cdp.send('Runtime.getProperties', { objectId: property.value.objectId, ownProperties: true });
          const value = inner.result.find(item => item.name === 'value')?.value?.value;
          if (typeof value !== 'number') throw Error('Font selector local layout changed');
          values.push(value >>> 0);
        }
        const response = await cdp.send('Runtime.evaluate', { returnByValue: true, expression: `new TextDecoder().decode(new Uint8Array(window.__ternFontWasm.memory.buffer,${values[2]},${values[3]}))` });
        if (normalize(response.result.value) !== normalize(family)) { await cdp.send('Debugger.resume'); return; }
        output = values[0];
        returning = true;
        await cdp.send('Debugger.removeBreakpoint', { breakpointId: breakpoint.breakpointId });
        await cdp.send('Debugger.stepOut');
      } catch (error) {
        await cdp.send('Debugger.resume').catch(() => {});
        finish(error);
      }
    }
    cdp.on('Debugger.paused', paused);
  }) };
}

export async function checkFonts({ url, tokenFile, playwrightModule, chromiumExecutable, profile, wasm, out, mode = 'full' }) {
  if (!['full', 'smoke'].includes(mode)) throw Error('Font check mode must be full or smoke');
  const base = new URL(url);
  if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password || base.search || base.hash) throw Error('A credential-free HTTP(S) URL is required');
  const known = JSON.parse(await readFile(profile, 'utf8'));
  if (known.schemaVersion !== 1 || !/^[a-f0-9]{64}$/.test(known.wasmSha256) || !/^[a-f0-9]{64}$/.test(known.fontSha256) || !Number.isSafeInteger(known.statusOffset) || known.statusOffset < 0 || !known.family || !known.builtin) throw Error('Invalid font probe profile');
  const moduleBytes = wasm ? await readFile(wasm) : null;
  if (moduleBytes && hash(moduleBytes) !== known.wasmSha256) throw Error('Routed WASM does not match probe profile');
  const token = (await readFile(tokenFile, 'utf8')).trim();
  if (!token) throw Error('Empty token file');
  const redact = value => clean(String(value).split(token).join('<REDACTED>'));
  const { chromium } = await import(pathToFileURL(resolve(playwrightModule)).href);
  const browser = await chromium.launch({ executablePath: chromiumExecutable, headless: false, args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist'] });
  const report = { schemaVersion: 1, kind: mode === 'full' ? 'font-registration-check' : 'font-registration-smoke-check', source: wasm ? 'routed' : 'served', url: base.href, expectedSha256: known.wasmSha256, wasmSha256: null, fontResponses: [], runs: [], classification: 'needs_investigation' };
  const pending = [];
  await mkdir(dirname(resolve(out)), { recursive: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
    if (moduleBytes) await context.route('https://build.stencil.so/**/*.wasm', route => route.fulfill({ contentType: 'application/wasm', body: moduleBytes, headers: { 'access-control-allow-origin': '*' } }));
    const phases = mode === 'full' ? [['cold', known.family], ['warm', known.family], ['builtin', known.builtin], ['missing', 'Tern Font Probe Missing Family 79d245af']] : [['target', known.family], ['builtin', known.builtin], ['missing', 'Tern Font Probe Missing Family 79d245af']];
    for (const [phase, family] of phases) {
      const page = await context.newPage();
      const run = { phase, requested: family, matched: null, error: null, wasmSha256: null, responses: [] };
      report.runs.push(run);
      const network = await context.newCDPSession(page), fontRequests = new Map();
      let fontReady;
      const delivery = new Promise(resolveDelivery => { fontReady = resolveDelivery; });
      await network.send('Network.enable', { maxResourceBufferSize: 32 * 1024 * 1024, maxTotalBufferSize: 128 * 1024 * 1024 });
      network.on('Network.responseReceived', ({ requestId, response }) => {
        if (/(?:^|\/)fonts\/[a-f0-9]+$/.test(new URL(response.url).pathname)) fontRequests.set(requestId, { phase, status: response.status });
      });
      network.on('Network.loadingFinished', ({ requestId }) => {
        const received = fontRequests.get(requestId);
        if (!received) return;
        pending.push(network.send('Network.getResponseBody', { requestId }).then(({ body, base64Encoded }) => {
          const bytes = Buffer.from(body, base64Encoded ? 'base64' : 'utf8');
          report.fontResponses.push({ ...received, sha256: hash(bytes), bytes: bytes.length });
          if (report.fontResponses.at(-1).sha256 === known.fontSha256) fontReady();
        }).catch(error => { run.error = redact(error.message); }));
      });
      page.on('response', response => {
        const path = new URL(response.url()).pathname;
        (run.responses ??= []).push({ path, status: response.status() });
      });
      try {
        await page.addInitScript(familyName => {
          const probeWindow = /** @type {ProbeWindow} */ (window);
          localStorage.setItem('settings.json', JSON.stringify(Object.fromEntries(['font_family', 'font_family_bold', 'font_family_italic', 'font_family_bold_italic'].map(key => [key, familyName]))));
          for (const key of ['instantiate', 'instantiateStreaming']) {
            const original = WebAssembly[key];
            WebAssembly[key] = async function (...args) {
              if (!probeWindow.__ternFontWasmSha) {
                const source = await args[0];
                const bytes = source instanceof Response ? await source.clone().arrayBuffer() : source;
                if (!(bytes instanceof WebAssembly.Module)) probeWindow.__ternFontWasmSha = probeWindow.__ternVerification?.candidateSha ?? Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), value => value.toString(16).padStart(2, '0')).join('');
              }
              const result = await Reflect.apply(original, this, args);
              probeWindow.__ternFontWasm = result.instance?.exports ?? result.exports;
              return result;
            };
          }
        }, family);
        const target = new URL(base); target.searchParams.set('token', token);
        await page.goto(target.href, { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => typeof (/** @type {ProbeWindow} */ (window)).tern?.unmount === 'function' || document.querySelector('#status.error'), null, { timeout: 60000 });
        const startupError = await page.locator('#status.error').textContent({ timeout: 50 }).catch(() => null);
        if (startupError) throw Error(startupError);
        if (phase === 'cold' || phase === 'target') {
          let timer;
          await Promise.race([delivery, new Promise(resolveTimeout => { timer = setTimeout(resolveTimeout, 10000); })]);
          clearTimeout(timer);
        }
        await Promise.all(pending);
        run.wasmSha256 = await page.evaluate(() => {
          const probeWindow = /** @type {ProbeWindow} */ (window);
          return probeWindow.__ternVerification?.candidateSha ?? probeWindow.__ternFontWasmSha ?? null;
        });
        report.wasmSha256 = run.wasmSha256;
        const identityMatches = report.wasmSha256 === known.wasmSha256;
        let cdp, result;
        if (identityMatches) {
          cdp = network;
          const scripts = [];
          cdp.on('Debugger.scriptParsed', script => { if (script.scriptLanguage === 'WebAssembly') scripts.push(script); });
          await cdp.send('Debugger.enable');
          if (scripts.length !== 1) throw Error('Expected one WebAssembly module');
          result = (await selectedFont(page, cdp, scripts[0].scriptId, known.statusOffset, family)).result;
          result.catch(() => {});
        }
        await page.keyboard.press('Control+,');
        await page.waitForTimeout(1000);
        await page.mouse.click(309, 345);
        if (result) run.matched = await result;
        else run.error = 'Unknown WASM identity; inspect the captured Settings image and establish a new probe profile';
        await page.screenshot({ path: `${out}.${phase}.png` });
        if (cdp) await cdp.detach();
      } catch (error) { run.error = redact(error.message); }
      finally { await page.close(); }
    }
    await Promise.all(pending);
    report.classification = classifyFonts({ identityMatches: report.runs.every(run => run.wasmSha256 === known.wasmSha256), delivered: report.fontResponses.some(item => item.status === 200 && item.sha256 === known.fontSha256), runs: report.runs, family: known.family, builtin: known.builtin, mode });
    await writeFile(out, JSON.stringify(report, null, 2) + '\n');
    return report;
  } finally { await browser.close(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const { values } = parseArgs({ options: Object.fromEntries(['url', 'token-file', 'playwright-module', 'chromium-executable', 'profile', 'wasm', 'out', 'mode'].map(name => [name, { type: 'string' }])) });
  const report = await checkFonts({ url: values.url, tokenFile: values['token-file'], playwrightModule: values['playwright-module'], chromiumExecutable: values['chromium-executable'], profile: values.profile, wasm: values.wasm, out: values.out, mode: values.mode });
  console.log(JSON.stringify(report));
  process.exitCode = report.classification === 'needs_investigation' ? 2 : 0;
}
