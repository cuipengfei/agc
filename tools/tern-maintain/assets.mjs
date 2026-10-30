// 从已验证的确定性构建 bundle 与真实 maple 字体目录装配可部署的 Tern 网页资源目录。
// 每个字节都被 hash 绑定：fonts.json 的 WASM 身份必须等于已验证 bundle 的 candidate
// （绝不接受 test 模块）；每个字体 SHA-256 在写入前都会对照磁盘文件重算；
// 字体叶文件与父目录不得经 symlink 越界，保证 portable 包不携带外部依赖。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sha256 } from './analyze.mjs';
import { checkBundle } from './build.mjs';

const HEX64 = /^[a-f0-9]{64}$/;

/** 解析 rootDir 内的相对路径；叶文件或父目录经 symlink 越界即拒绝。 */
function resolveInside(rootDir, relative) {
  const rootReal = fs.realpathSync(rootDir);
  const targetReal = fs.realpathSync(path.join(rootReal, relative));
  if (targetReal !== rootReal && !targetReal.startsWith(rootReal + path.sep)) throw new Error(`assembleAssets: path escapes its directory: ${relative}`);
  return targetReal;
}

/** 相对 URL 必须留在资源目录内部。 */
function assertSafeRelative(url) {
  if (typeof url !== 'string' || !url.startsWith('./')) throw new Error(`Unsafe resource path: ${url}`);
  const segments = url.slice(2).split('/');
  if (segments.some(segment => segment === '' || segment === '..' || segment.includes('\\'))) throw new Error(`Unsafe resource path: ${url}`);
}

/** maple.mjs config() 校验的 Node 侧镜像，外加 candidate 绑定。 */
function validateFontsManifest(manifest, verified) {
  if (manifest.schemaVersion !== 1) throw new Error('fonts.json: unsupported schemaVersion');
  if (!HEX64.test(manifest.wasmSha256 ?? '')) throw new Error('fonts.json: invalid wasmSha256');
  if (manifest.wasmUrl !== './pkg/client.wasm') throw new Error('fonts.json: unexpected wasmUrl');
  if (manifest.wasmSha256 !== verified.candidateSha256) throw new Error('fonts.json WASM identity does not match the verified bundle candidate');
  if (!Array.isArray(manifest.fonts) || manifest.fonts.length < 2) throw new Error('fonts.json: at least two font descriptors are required');
  const slots = [];
  for (const font of manifest.fonts) {
    const style = font.style;
    if (style !== 'Regular' && style !== 'Bold') throw new Error(`fonts.json: unexpected style ${style}`);
    if (!font.url.startsWith('./pkg/MapleMono-NF-CN-')) throw new Error(`fonts.json: unexpected ${style} url ${font.url}`);
    assertSafeRelative(font.url);
    if (!HEX64.test(font.sha256 ?? '')) throw new Error(`fonts.json: invalid ${style} sha256`);
    for (const key of ['slot', 'expectedPointer', 'expectedLength', 'bytes']) {
      if (!Number.isSafeInteger(font[key]) || font[key] <= 0 || font[key] > 0xffffffff) throw new Error(`fonts.json: invalid ${style} ${key}`);
    }
    if (slots.some(slot => Math.abs(slot - font.slot) < 8)) throw new Error('fonts.json: overlapping font descriptors');
    slots.push(font.slot);
  }
  return manifest.fonts;
}

/**
 * 构建全新的资源目录 out（必须尚不存在），二选一：
 * - official：prepare 产物（pkg/original.wasm、pkg/client.js、inputs.json），原版
 *   字节原样上线、只换字体（mode: font-only）；
 * - bundle：经 checkBundle 验证的确定性构建（mode: patched）。
 * 返回 deploy manifest 内容；同一文档写入 out/deploy-manifest.json，记录每个输出
 * 文件的实际 SHA-256 供复验。
 * @param {{ bundle?: string, official?: string, fonts?: string, out?: string }} [options]
 */
export async function assembleAssets({ bundle, official, fonts, out } = {}) {
  if (!fonts) throw new Error('assembleAssets: fonts is required');
  if (!out) throw new Error('assembleAssets: out is required');
  if (!bundle === !official) throw new Error('assembleAssets: exactly one of bundle or official is required');
  const fontsDir = path.resolve(fonts);
  const outDir = path.resolve(out);
  if (fs.existsSync(outDir)) throw new Error(`assembleAssets: out directory already exists: ${outDir}`);
  if (!fs.statSync(fontsDir).isDirectory()) throw new Error(`assembleAssets: fonts is not a directory: ${fontsDir}`);

  let mode, version, wasm, glue, wasmSha256, glueSha256;
  if (official) {
    const officialDir = path.resolve(official);
    if (!fs.statSync(officialDir).isDirectory()) throw new Error(`assembleAssets: official is not a directory: ${officialDir}`);
    const input = JSON.parse(fs.readFileSync(resolveInside(officialDir, 'inputs.json'), 'utf8'));
    if (input.schemaVersion !== 1) throw new Error('official inputs.json: unsupported schemaVersion');
    if (!HEX64.test(input.wasmSha256 ?? '')) throw new Error('official inputs.json: invalid wasmSha256');
    if (!HEX64.test(input.glueSha256 ?? '')) throw new Error('official inputs.json: invalid glueSha256');
    mode = 'font-only';
    version = input.version;
    // 源字节原样复制，但必须与 prepare 声明的身份逐字节一致。
    wasm = fs.readFileSync(resolveInside(officialDir, 'pkg/original.wasm'));
    glue = fs.readFileSync(resolveInside(officialDir, 'pkg/client.js'));
    if (sha256(wasm) !== input.wasmSha256) throw new Error('assembleAssets: official original.wasm differs from inputs.json wasmSha256');
    if (sha256(glue) !== input.glueSha256) throw new Error('assembleAssets: official client.js differs from inputs.json glueSha256');
    wasmSha256 = input.wasmSha256;
    glueSha256 = input.glueSha256;
  } else {
    const bundleDir = path.resolve(bundle);
    if (!fs.statSync(bundleDir).isDirectory()) throw new Error(`assembleAssets: bundle is not a directory: ${bundleDir}`);
    const verified = await checkBundle({ bundle: bundleDir });
    if (!verified.ok || !HEX64.test(verified.candidateSha256 ?? '')) throw new Error('assembleAssets: bundle verification did not return a candidate');
    mode = 'patched';
    version = verified.version;
    wasmSha256 = verified.candidateSha256;
    glueSha256 = verified.glueSha256;
    // 源字节在写入前逐一核对 hash；越界的 symlink 已在 resolveInside 拒绝。
    wasm = fs.readFileSync(resolveInside(bundleDir, 'candidate.wasm'));
    if (sha256(wasm) !== wasmSha256) throw new Error('assembleAssets: candidate.wasm differs from the verified bundle output');
    glue = fs.readFileSync(resolveInside(bundleDir, 'glue.js'));
    if (sha256(glue) !== glueSha256) throw new Error('assembleAssets: glue.js differs from the verified bundle output');
  }

  // glue API 兼容性：mount 第二个参数类型由 JSDoc @param 声明，0.9.7 为 string，0.9.8+ 为 string[]。
  const glueSrc = glue.toString();
  const mountMatch = glueSrc.match(/export\s+(?:async\s+)?function\s+mount\s*\(\s*canvas\s*,\s*(\w+)\s*\)/);
  if (mountMatch) {
    const paramName = mountMatch[1];
    const jsdocPattern = new RegExp(`@param\\s*\\{([^}]+)\\}\\s*${paramName}`);
    const jsdocMatch = glueSrc.match(jsdocPattern);
    if (jsdocMatch) {
      const declaredType = jsdocMatch[1].trim();
      const passFn = glueSrc.match(new RegExp(`passArrayJsValueToWasm0\\(\\s*${paramName}`)) ? 'array' : 'string';
      if (declaredType === 'string[]' && passFn !== 'array') {
        throw new Error('assembleAssets: glue mount() declares string[] but does not use passArrayJsValueToWasm0; inconsistent glue');
      }
      if (declaredType === 'string' && passFn !== 'string') {
        throw new Error('assembleAssets: glue mount() declares string but does not use passStringToWasm0; inconsistent glue');
      }
    }
  } else {
    throw new Error('assembleAssets: could not identify mount() export in glue; unrecognized glue format');
  }

  // 模板与 glue 参数类型对照：模板必须按 glue 声明传递 string 或 string[]。
  const templatePath = fileURLToPath(new URL('./index.template.html', import.meta.url));
  let template = fs.readFileSync(templatePath, 'utf8');
  const templateMountMatch = template.match(/mount\s*\(\s*canvas\s*,\s*(\[?)\s*wire\.href\s*(\]?)\s*\)/);
  if (!templateMountMatch) throw new Error('assembleAssets: index template mount(canvas, ...) call not found');
  const templateIsArray = templateMountMatch[1] === '[' && templateMountMatch[2] === ']';
  const glueParamName = mountMatch[1];
  const glueJsdoc = glueSrc.match(new RegExp(`@param\\s*\\{([^}]+)\\}\\s*${glueParamName}`));
  const glueIsArray = glueJsdoc && glueJsdoc[1].trim() === 'string[]';
  if (templateIsArray !== glueIsArray) {
    // 模板与 glue 不匹配：按 glue 类型修正模板。
    const corrected = glueIsArray
      ? template.replace(/mount\s*\(\s*canvas\s*,\s*\[?\s*wire\.href\s*\]?\s*\)/, 'mount(canvas, [wire.href])')
      : template.replace(/mount\s*\(\s*canvas\s*,\s*\[?\s*wire\.href\s*\]?\s*\)/, 'mount(canvas, wire.href)');
    template = corrected;
  }
  // 版本号会被拼进手工编辑的模板，必须是纯文本安全字符。
  if (!/^[\w][\w.-]*$/.test(version)) throw new Error(`assembleAssets: unusable bundle version: ${version}`);

  const manifestPath = resolveInside(fontsDir, 'fonts.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const fontsValidated = validateFontsManifest(manifest, { candidateSha256: wasmSha256 });

  const marker = '<!--TERN:VERSION-->';
  if (!template.includes(marker)) throw new Error('assembleAssets: index template is missing the version marker');
  const html = template.split(marker).join(version);

  const maple = fs.readFileSync(fileURLToPath(new URL('./maple.mjs', import.meta.url)));
  const fontSources = fontsValidated.map(font => {
    const bytes = fs.readFileSync(resolveInside(fontsDir, font.url.replace('./', '')));
    if (sha256(bytes) !== font.sha256) throw new Error(`assembleAssets: ${font.style} font SHA-256 does not match fonts.json`);
    if (bytes.length !== font.bytes) throw new Error(`assembleAssets: ${font.style} font length does not match fonts.json`);
    return { font, bytes };
  });

  fs.mkdirSync(outDir, { recursive: false });
  fs.mkdirSync(path.join(outDir, 'pkg'));
  const files = {};
  const put = (relative, bytes) => {
    fs.writeFileSync(path.join(outDir, relative), bytes);
    files[relative] = sha256(bytes);
  };
  put('index.html', Buffer.from(html, 'utf8'));
  put('maple.js', maple);
  put('fonts.json', fs.readFileSync(manifestPath));
  put('pkg/client.wasm', wasm);
  put('pkg/client.js', glue);
  for (const { font, bytes } of fontSources) put(font.url.replace('./', ''), bytes);

  const deployManifest = mode === 'font-only'
    ? { schemaVersion: 1, mode, version, originalSha256: wasmSha256, glueSha256, wasmUnmodified: true, files }
    : { schemaVersion: 1, mode, version, candidateSha256: wasmSha256, files };
  fs.writeFileSync(path.join(outDir, 'deploy-manifest.json'), JSON.stringify(deployManifest, null, 2) + '\n');
  return deployManifest;
}
