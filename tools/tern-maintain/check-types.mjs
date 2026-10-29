#!/usr/bin/env bun
// Static gate for CI: every maintainer module must parse and resolve its
// runtime imports through Bun's in-memory build (no write, no execution), and
// deployment records must satisfy the evidence schema. The optional
// verification.markdownReproduction extension is validated here, not by the
// evidence collector, so the Windows worker report cannot weaken evidence.
import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';
const execFile = promisify(execFileCallback);
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import evidenceSchema from './evidence.schema.json' with { type: 'json' };

const here = dirname(fileURLToPath(import.meta.url));
const ajv = new Ajv({ allErrors: true, strict: false });
const validateEvidence = ajv.compile(evidenceSchema);

const boolOrNull = { type: ['boolean', 'null'] };
const markdownSchema = {
  type: 'object',
  required: ['schemaVersion', 'kind', 'conclusion', 'fixturePath'],
  properties: {
    schemaVersion: { const: 1 },
    kind: { const: 'markdown-reproduction' },
    conclusion: { enum: ['not_run', 'reproduced', 'not_reproduced'] },
    reason: { type: 'string' },
    fixturePath: { type: ['string', 'null'] },
    // Same-path steps (ASCII open, close, append U+4E2D, reopen) plus the
    // measured mount state; both are required for a reproduced verdict.
    sequence: {
      type: 'array',
      items: {
        type: 'object',
        required: ['name', 'status', 'details'],
        properties: { name: { type: 'string', minLength: 1 }, status: { enum: ['passed', 'failed', 'not_run'] }, details: { type: 'string' } },
      },
    },
    mounted: {
      type: 'object',
      required: ['ascii', 'cjk'],
      properties: { ascii: boolOrNull, cjk: boolOrNull },
    },
    frames: {
      type: 'object',
      required: ['ascii', 'cjk'],
      properties: { ascii: boolOrNull, cjk: boolOrNull },
    },
    daemon: { type: 'object', required: ['status', 'panes'], properties: { status: { type: 'string' }, panes: { type: ['integer', 'null'] } } },
    console: { type: 'array', items: { type: 'object', required: ['type', 'text'], properties: { type: { type: 'string' }, text: { type: 'string' } } } },
    wasmErrors: { type: 'array', items: { type: 'string' } },
    screenshot: { type: ['string', 'null'] },
    // Cleanup is recorded independently and never rewrites the conclusion.
    cleanup: { type: 'object', required: ['ok', 'errors'], properties: { ok: { type: 'boolean' }, errors: { type: 'array', items: { type: 'string' } } } },
  },
  additionalProperties: false,
};
const validateMarkdown = ajv.compile(markdownSchema);

/**
 * Validate a markdown-reproduction worker report. not_run needs a non-empty
 * reason; reproduced/not_reproduced need the same-path sequence and a measured
 * (non-null) mount state. A failed cleanup is not a validation error.
 */
export function validateMarkdownReproduction(report, label = 'markdownReproduction') {
  if (!validateMarkdown(report)) throw new Error(`Invalid ${label}: ${ajv.errorsText(validateMarkdown.errors)}`);
  if (report.conclusion === 'not_run' && !(report.reason ?? '').trim()) throw new Error(`Invalid ${label}: not_run requires a reason`);
  if (report.conclusion !== 'not_run') {
    if (!report.sequence?.length) throw new Error(`Invalid ${label}: ${report.conclusion} requires the same-path sequence`);
    if (typeof report.fixturePath !== 'string' || !report.fixturePath) throw new Error(`Invalid ${label}: missing fixturePath`);
    const stages = ['ascii_markdown_pane', 'pane_closed', 'cjk_appended', 'cjk_markdown_pane'];
    if (stages.some(name => !report.sequence?.some(step => step?.name === name && step?.status === 'passed')))
      throw new Error(`Invalid ${label}: ${report.conclusion} requires successful same-path stages: ${stages.join(', ')}`);
    if (typeof report.mounted?.ascii !== 'boolean' || typeof report.mounted?.cjk !== 'boolean')
      throw new Error(`Invalid ${label}: ${report.conclusion} requires measured mounted.ascii and mounted.cjk`);
    if (report.frames?.ascii !== true || typeof report.frames?.cjk !== 'boolean')
      throw new Error(`Invalid ${label}: ${report.conclusion} requires measured frame evidence`);
    if (report.conclusion === 'not_reproduced' && report.frames.cjk !== true)
      throw new Error(`Invalid ${label}: not_reproduced requires changed CJK frame evidence`);
  }
  return report;
}

/** Validate one deployment record; its markdown extension is gated separately. */
export function validateDeploymentReport(report) {
  if (!validateEvidence(report)) throw new Error(`Invalid deployment report: ${ajv.errorsText(validateEvidence.errors)}`);
  const markdown = report.verification?.markdownReproduction;
  if (markdown !== undefined) validateMarkdownReproduction(markdown, 'markdownReproduction');
  return report;
}

/** Parse-check every maintainer module under root (and fixtures/*.mjs) in memory. */
export async function checkSources(root = here) {
  const names = (await readdir(root)).filter(name => name.endsWith('.mjs'));
  const fixtures = (await readdir(join(root, 'fixtures')).catch(() => [])).filter(name => name.endsWith('.mjs'));
  const files = [...names, ...fixtures.map(name => join('fixtures', name))];
  const failures = [];
  for (const file of files) {
    try {
      await Bun.build({ entrypoints: [join(root, file)], write: false, target: 'node' });
    } catch (error) {
      failures.push(`${file}: ${String(error?.message ?? error).split('\n')[0]}`);
    }
  }
  if (failures.length) throw new Error(`Module check failed:\n${failures.join('\n')}`);
  return files.length;
}

/** Check JavaScript API members using the isolated, pinned development tool. */
export async function checkJavaScriptTypes({ config = join(here, 'typecheck/tsconfig.json') } = {}) {
  const tsc = join(here, 'typecheck/node_modules/typescript/bin/tsc');
  try {
    await execFile(tsc, ['--project', config, '--pretty', 'false'], { cwd: here, timeout: 120_000, maxBuffer: 4 * 1024 * 1024 });
  } catch (error) {
    throw new Error(`TypeScript check failed:\n${error.stdout ?? ''}${error.stderr ?? ''}${error.stdout || error.stderr ? '' : error.message}`);
  }
}

/** Validate in-repo deployment records; legacy schemaVersion 1 records are skipped. */
export async function checkDeploymentReports(root = here) {
  const dir = join(root, 'evidence');
  const names = (await readdir(dir).catch(() => [])).filter(name => name.endsWith('.json')).sort();
  for (const name of names) {
    const report = JSON.parse(await readFile(join(dir, name), 'utf8'));
    if (report.schemaVersion === 2) validateDeploymentReport(report);
  }
  return names.length;
}

if (import.meta.main) {
  const [modules, reports] = await Promise.all([checkSources(), checkDeploymentReports(), checkJavaScriptTypes().then(() => 'passed')]);
  console.log(`check: ${modules} modules parsed, ${reports} deployment records scanned, TypeScript passed`);
}
