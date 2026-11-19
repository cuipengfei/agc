// 从已验证的补丁输入装配可部署的 Tern 网页资源目录，三选一：
// - registration：字体名称登记补丁的构建目录（registration.json +
//   candidate.wasm + glue.js），页面直接加载候选 WASM（mode: font-registration）；
// - bundle：经 checkBundle 验证的确定性构建（mode: patched）；
// - official：prepare 产物，只换字体（mode: font-only）。
// 后两种历史模式要求 fonts 目录，已 deprecated、仅作兼容保留，行为冻结。
// 每个字节都被 hash 绑定：声明的身份必须等于实际文件字节（绝不接受 test 模块）；
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

/** 按保留区域（fonts 或 register）处理 index 模板：另一区域整段移除，区域标记行
 * 本身也不进入产物；保留区域的内层行原样输出，旧模式产物因此与无标记模板逐字节一致。 */
function applyTemplateRegions(template, keep) {
  const kept = [];
  let region = null;
  for (const line of template.split('\n')) {
    const open = line.match(/^<!--TERN:(FONTS|REGISTER)-->$/);
    const close = line.match(/^<!--\/TERN:(FONTS|REGISTER)-->$/);
    if (open) { region = open[1]; continue; }
    if (close) { region = null; continue; }
    if (region === null || region === keep) kept.push(line);
  }
  return kept.join('\n');
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
 * 构建全新的资源目录 out（必须尚不存在），三选一：
 * - registration：字体名称登记补丁的构建目录（registration.json +
 *   candidate.wasm + glue.js，mode: font-registration）；页面直接加载候选
 *   WASM，不读取字体清单、不复制 Maple 替换字体、不携带 maple.js；
 * - bundle（deprecated）：经 checkBundle 验证的确定性构建（mode: patched）；
 * - official（deprecated）：prepare 产物，只换字体（mode: font-only）。
 * 后两种历史模式要求 fonts 目录，仅作兼容保留、行为不变，不得与 registration
 * 同时使用。返回 deploy manifest 内容；同一文档写入 out/deploy-manifest.json，
 * 记录每个输出文件的实际 SHA-256 供复验。
 * @param {{ registration?: string, bundle?: string, official?: string, fonts?: string, out?: string }} [options]
 */
export async function assembleAssets({ registration, bundle, official, fonts, out } = {}) {
  if (!out) throw new Error('assembleAssets: out is required');
  const outDir = path.resolve(out);
  if (fs.existsSync(outDir)) throw new Error(`assembleAssets: out directory already exists: ${outDir}`);
  let fontsDir;
  let mode, version, wasm, glue, wasmSha256, glueSha256, originalSha256 = null;
  if (registration) {
    if (bundle || official || fonts) throw new Error('assembleAssets: registration must not be combined with bundle, official or fonts');
    const registrationDir = path.resolve(registration);
    if (!fs.statSync(registrationDir).isDirectory()) throw new Error(`assembleAssets: registration is not a directory: ${registrationDir}`);
    const declared = JSON.parse(fs.readFileSync(resolveInside(registrationDir, 'registration.json'), 'utf8'));
    if (declared.schemaVersion !== 1) throw new Error('registration.json: unsupported schemaVersion');
    if (declared.kind !== 'font-registration') throw new Error(`registration.json: unexpected kind ${declared.kind}`);
    for (const key of ['originalSha256', 'candidateSha256', 'glueSha256']) {
      if (!HEX64.test(declared[key] ?? '')) throw new Error(`registration.json: invalid ${key}`);
    }
    mode = 'font-registration';
    version = declared.version;
    originalSha256 = declared.originalSha256;
    // 源字节在写入前逐一核对 hash；越界的 symlink 已在 resolveInside 拒绝。
    wasm = fs.readFileSync(resolveInside(registrationDir, 'candidate.wasm'));
    if (sha256(wasm) !== declared.candidateSha256) throw new Error('assembleAssets: candidate.wasm differs from registration.json candidateSha256');
    glue = fs.readFileSync(resolveInside(registrationDir, 'glue.js'));
    if (sha256(glue) !== declared.glueSha256) throw new Error('assembleAssets: glue.js differs from registration.json glueSha256');
    wasmSha256 = declared.candidateSha256;
    glueSha256 = declared.glueSha256;
  } else {
    if (!fonts) throw new Error('assembleAssets: fonts is required');
    if (!bundle === !official) throw new Error('assembleAssets: exactly one of bundle or official is required');
    fontsDir = path.resolve(fonts);
    if (!fs.statSync(fontsDir).isDirectory()) throw new Error(`assembleAssets: fonts is not a directory: ${fontsDir}`);
  }
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
  } else if (bundle) {
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
  }
  // 模板与 glue 参数类型对照：仅在 glue 声明了 mount() 导出时执行。
  // 测试 fixture glue 不实现 mount，按设计跳过对照检查。
  let template = applyTemplateRegions(
    fs.readFileSync(fileURLToPath(new URL('./index.template.html', import.meta.url)), 'utf8'),
    registration ? 'REGISTER' : 'FONTS');
  if (mountMatch) {
    const templateMountMatch = template.match(/mount\s*\(\s*canvas\s*,\s*(\[?)\s*wire\.href\s*(\]?)\s*\)/);
    if (!templateMountMatch) throw new Error('assembleAssets: index template mount(canvas, ...) call not found');
    const templateIsArray = templateMountMatch[1] === '[' && templateMountMatch[2] === ']';
    const glueParamName = mountMatch[1];
    const glueJsdoc = glueSrc.match(new RegExp(`@param\\s*\\{([^}]+)\\}\\s*${glueParamName}`));
    const glueIsArray = glueJsdoc && glueJsdoc[1].trim() === 'string[]';
    if (templateIsArray !== glueIsArray) {
      template = glueIsArray
        ? template.replace(/mount\s*\(\s*canvas\s*,\s*\[?\s*wire\.href\s*\]?\s*\)/, 'mount(canvas, [wire.href])')
        : template.replace(/mount\s*\(\s*canvas\s*,\s*\[?\s*wire\.href\s*\]?\s*\)/, 'mount(canvas, wire.href)');
    }
  }
  // 版本号会被拼进手工编辑的模板，必须是纯文本安全字符。
  if (!/^[\w][\w.-]*$/.test(version)) throw new Error(`assembleAssets: unusable bundle version: ${version}`);

  // 历史模式在写入前完成全部字体校验，任一 hash 不匹配都不落盘；registration 模式没有字体输入。
  let maple, manifestPath, fontSources = [];
  if (mode !== 'font-registration') {
    maple = fs.readFileSync(fileURLToPath(new URL('./maple.mjs', import.meta.url)));
    manifestPath = resolveInside(fontsDir, 'fonts.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const fontsValidated = validateFontsManifest(manifest, { candidateSha256: wasmSha256 });
    fontSources = fontsValidated.map(font => {
      const bytes = fs.readFileSync(resolveInside(fontsDir, font.url.replace('./', '')));
      if (sha256(bytes) !== font.sha256) throw new Error(`assembleAssets: ${font.style} font SHA-256 does not match fonts.json`);
      if (bytes.length !== font.bytes) throw new Error(`assembleAssets: ${font.style} font length does not match fonts.json`);
      return { font, bytes };
    });
  }

  const marker = '<!--TERN:VERSION-->';
  if (!template.includes(marker)) throw new Error('assembleAssets: index template is missing the version marker');
  const html = template.split(marker).join(version).split('<!--TERN:WASM_SHA256-->').join(wasmSha256);

  fs.mkdirSync(outDir, { recursive: false });
  fs.mkdirSync(path.join(outDir, 'pkg'));
  const files = {};
  const put = (relative, bytes) => {
    fs.writeFileSync(path.join(outDir, relative), bytes);
    files[relative] = sha256(bytes);
  };
  put('index.html', Buffer.from(html, 'utf8'));
  if (mode === 'font-registration') {
    put('pkg/client.wasm', wasm);
    put('pkg/client.js', glue);
  } else {
    put('maple.js', maple);
    put('fonts.json', fs.readFileSync(manifestPath));
    put('pkg/client.wasm', wasm);
    put('pkg/client.js', glue);
    for (const { font, bytes } of fontSources) put(font.url.replace('./', ''), bytes);
  }

  const deployManifest = mode === 'font-registration'
    ? { schemaVersion: 1, mode, version, originalSha256, candidateSha256: wasmSha256, glueSha256, files }
    : mode === 'font-only'
      ? { schemaVersion: 1, mode, version, originalSha256: wasmSha256, glueSha256, wasmUnmodified: true, files }
      : { schemaVersion: 1, mode, version, candidateSha256: wasmSha256, files };
  fs.writeFileSync(path.join(outDir, 'deploy-manifest.json'), JSON.stringify(deployManifest, null, 2) + '\n');
  return deployManifest;
}
