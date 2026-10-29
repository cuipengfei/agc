import { expect, test } from 'bun:test';
import { mkdtemp, mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkDeploymentReports, checkSources, checkJavaScriptTypes, validateDeploymentReport, validateMarkdownReproduction } from './check-types.mjs';
const HERE = new URL('.', import.meta.url).pathname;
const samePathStages = () => ['ascii_markdown_pane', 'pane_closed', 'cjk_appended', 'cjk_markdown_pane'].map(name => ({ name, status: 'passed', details: 'observed' }));

const markdown = overrides => ({
  schemaVersion: 1,
  kind: 'markdown-reproduction',
  conclusion: 'reproduced',
  reason: '',
  sequence: samePathStages(),
  fixturePath: '/tmp/fixture.md',
  mounted: { ascii: true, cjk: false },
  frames: { ascii: true, cjk: false },
  cjkProgress: { delayedFrame: false, visibleInteraction: false },
  cleanup: { ok: true, errors: [] },
  ...overrides,
});

test('source check rejects a real file with invalid syntax', async () => {
  const root = await mkdtemp(join(tmpdir(), 'tern-check-bad-syntax-'));
  try {
    await writeFile(join(root, 'bad.mjs'), 'const broken = ;\n');
    await expect(checkSources(root)).rejects.toThrow(/bad\.mjs/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('source check rejects an unresolvable runtime import', async () => {
  const root = await mkdtemp(join(tmpdir(), 'tern-check-bad-import-'));
  try {
    await mkdir(join(root, 'fixtures'));
    await writeFile(join(root, 'fixtures', 'bad.mjs'), "import x from 'not-installed-package-xyz';\nexport default x;\n");
    await expect(checkSources(root)).rejects.toThrow(/fixtures[/\\]bad\.mjs/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('markdown report gates each conclusion and ignores cleanup failure', () => {
  expect(validateMarkdownReproduction(markdown()).conclusion).toBe('reproduced');
  const cleanupFailed = markdown({ cleanup: { ok: false, errors: ['profile removal failed'] } });
  expect(validateMarkdownReproduction(cleanupFailed).conclusion).toBe('reproduced');
  expect(validateMarkdownReproduction(markdown({ conclusion: 'not_run', reason: 'Windows Chrome missing', sequence: [], mounted: { ascii: null, cjk: null } })).conclusion).toBe('not_run');
  expect(() => validateMarkdownReproduction(markdown({ conclusion: 'not_run', reason: ' ' }))).toThrow(/requires a reason/);
  expect(() => validateMarkdownReproduction(markdown({ sequence: [] }))).toThrow(/requires the same-path sequence/);
  expect(() => validateMarkdownReproduction(markdown({ mounted: { ascii: null, cjk: true } }))).toThrow(/measured mounted/);
  expect(() => validateMarkdownReproduction(markdown({ kind: 'other' }))).toThrow(/kind/);
});

test('responsive CJK requires an observed frame change before reporting no freeze', () => {
  const report = markdown({ conclusion: 'not_reproduced', mounted: { ascii: true, cjk: true }, frames: { ascii: true, cjk: false } });
  expect(() => validateMarkdownReproduction(report)).toThrow(/frame evidence/);
});

test('a single changed CJK frame is insufficient without post-open progress', () => {
  const report = markdown({ conclusion: 'not_reproduced', mounted: { ascii: true, cjk: true }, frames: { ascii: true, cjk: true } });
  expect(() => validateMarkdownReproduction(report)).toThrow(/post-open progress/);
});

test('reproduction requires every successful stage using the recorded fixture path', () => {
  const incomplete = markdown({ sequence: samePathStages().filter(step => step.name !== 'cjk_appended') });
  expect(() => validateMarkdownReproduction(incomplete)).toThrow(/same-path stages/);
});

test('a static CJK frame does not establish a freeze', () => {
  expect(() => validateMarkdownReproduction(markdown({ mounted: { ascii: true, cjk: true }, frames: { ascii: true, cjk: true } }))).toThrow(/observed CJK/);
  const healthy = markdown({ conclusion: 'not_reproduced', mounted: { ascii: true, cjk: true }, frames: { ascii: true, cjk: true }, cjkProgress: { delayedFrame: false, visibleInteraction: true } });
  expect(validateMarkdownReproduction(healthy).conclusion).toBe('not_reproduced');
});

test('checkJs rejects a missing Binaryen API member', async () => {
  const config = JSON.parse(await readFile(new URL('./typecheck/tsconfig.json', import.meta.url), 'utf8'));
  config.compilerOptions.typeRoots = [join(HERE, 'typecheck/node_modules/@types')];
  config.files = ['missing-member.mjs', join(HERE, 'typecheck/node_modules/@webgpu/types/dist/index.d.ts')];
  const root = await mkdtemp(join(tmpdir(), 'tern-check-missing-api-'));
  try {
    await writeFile(join(root, 'tsconfig.json'), JSON.stringify(config));
    const binaryen = new URL('./node_modules/binaryen/index.js', import.meta.url).pathname;
    await writeFile(join(root, 'missing-member.mjs'), `import binaryen from ${JSON.stringify(binaryen)};\nconst module = binaryen.readBinary(new Uint8Array());\nmodule.writeBinary();\n`);
    await expect(checkJavaScriptTypes({ config: join(root, 'tsconfig.json') })).rejects.toThrow(/writeBinary/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('deployment check rejects a real report file with missing fields', async () => {
  const root = await mkdtemp(join(tmpdir(), 'tern-check-bad-report-'));
  try {
    await mkdir(join(root, 'evidence'));
    await writeFile(join(root, 'evidence', '0.9.6.json'), JSON.stringify({ schemaVersion: 2, version: '0.9.6' }));
    await expect(checkDeploymentReports(root)).rejects.toThrow(/Invalid deployment report/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('deployment report requires the evidence fields and rejects a bad markdown extension', async () => {
  const report = JSON.parse(await readFile(new URL('./evidence/0.9.5.json', import.meta.url), 'utf8'));
  expect(validateDeploymentReport(report)).toBe(report);
  report.verification.markdownReproduction = markdown();
  expect(validateDeploymentReport(report).verification.markdownReproduction.conclusion).toBe('reproduced');
  report.verification.markdownReproduction = markdown({ conclusion: 'not_run' });
  expect(() => validateDeploymentReport(report)).toThrow(/requires a reason/);
  expect(() => validateDeploymentReport({ schemaVersion: 2, version: '0.9.6' })).toThrow(/Invalid deployment report/);
});
