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
  if (!Array.isArray(manifest.fonts) || manifest.fonts.length !== 2) throw new Error('fonts.json: exactly two fonts are required');
  const slots = [];
  for (const [index, font] of manifest.fonts.entries()) {
    const style = ['Regular', 'Bold'][index];
    if (font.style !== style) throw new Error(`fonts.json: font ${index} must be ${style}`);
    if (font.url !== `./pkg/MapleMono-NF-CN-${style}.ttf`) throw new Error(`fonts.json: unexpected ${style} url`);
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
 * 从 bundle（经 checkBundle 验证）与 fonts（font_manifest.py 输出目录）构建全新的
 * 资源目录 out（必须尚不存在）。返回 deploy manifest 内容；同一文档写入
 * out/deploy-manifest.json，记录每个输出文件的实际 SHA-256 供复验。
 */
export async function assembleAssets({ bundle, fonts, out } = {}) {
  if (!bundle) throw new Error('assembleAssets: bundle is required');
  if (!fonts) throw new Error('assembleAssets: fonts is required');
  if (!out) throw new Error('assembleAssets: out is required');
  const bundleDir = path.resolve(bundle);
  const fontsDir = path.resolve(fonts);
  const outDir = path.resolve(out);
  if (fs.existsSync(outDir)) throw new Error(`assembleAssets: out directory already exists: ${outDir}`);
  if (!fs.statSync(bundleDir).isDirectory()) throw new Error(`assembleAssets: bundle is not a directory: ${bundleDir}`);
  if (!fs.statSync(fontsDir).isDirectory()) throw new Error(`assembleAssets: fonts is not a directory: ${fontsDir}`);

  const verified = await checkBundle({ bundle: bundleDir });
  if (!verified.ok || !HEX64.test(verified.candidateSha256 ?? '')) throw new Error('assembleAssets: bundle verification did not return a candidate');

  // 版本号会被拼进手工编辑的模板，必须是纯文本安全字符。
  if (!/^[\w][\w.-]*$/.test(verified.version)) throw new Error(`assembleAssets: unusable bundle version: ${verified.version}`);

  const manifestPath = resolveInside(fontsDir, 'fonts.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const fontsValidated = validateFontsManifest(manifest, verified);

  const templatePath = fileURLToPath(new URL('./index.template.html', import.meta.url));
  const template = fs.readFileSync(templatePath, 'utf8');
  const marker = '<!--TERN:VERSION-->';
  if (!template.includes(marker)) throw new Error('assembleAssets: index template is missing the version marker');
  const html = template.split(marker).join(verified.version);

  // 源字节在写入前逐一核对 hash；越界的 symlink 已在 resolveInside 拒绝。
  const candidatePath = resolveInside(bundleDir, 'candidate.wasm');
  const candidate = fs.readFileSync(candidatePath);
  if (sha256(candidate) !== verified.candidateSha256) throw new Error('assembleAssets: candidate.wasm differs from the verified bundle output');
  const gluePath = resolveInside(bundleDir, 'glue.js');
  const glue = fs.readFileSync(gluePath);
  if (sha256(glue) !== verified.glueSha256) throw new Error('assembleAssets: glue.js differs from the verified bundle output');
  const maple = fs.readFileSync(fileURLToPath(new URL('./maple.mjs', import.meta.url)));
  const fontSources = fontsValidated.map(font => {
    const bytes = fs.readFileSync(resolveInside(fontsDir, `pkg/MapleMono-NF-CN-${font.style}.ttf`));
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
  put('pkg/client.wasm', candidate);
  put('pkg/client.js', glue);
  for (const { font, bytes } of fontSources) put(`pkg/MapleMono-NF-CN-${font.style}.ttf`, bytes);

  const deployManifest = { schemaVersion: 1, version: verified.version, candidateSha256: verified.candidateSha256, files };
  fs.writeFileSync(path.join(outDir, 'deploy-manifest.json'), JSON.stringify(deployManifest, null, 2) + '\n');
  return deployManifest;
}
