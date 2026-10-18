// Aggregate verification reports into strict deployment evidence (schemaVersion 2).
// Reads real reports only; every hash is recomputed from the actual files and
// cross-checked across reports. Any missing report, failure, or contradiction
// rejects the evidence. Never reads token values; never restarts services.
import Ajv from 'ajv';
import { readFile, writeFile } from 'node:fs/promises';
import evidenceSchema from './evidence.schema.json' with { type: 'json' };
import { sha256 } from './analyze.mjs';

const ajv = new Ajv({ allErrors: true, strict: false });
const validateOutput = ajv.compile(evidenceSchema);

const hash = { type: 'string', pattern: '^[a-f0-9]{64}$' };
const validateRuntimeInput = ajv.compile({
  type: 'object',
  required: ['schemaVersion', 'kind', 'version', 'installed', 'processes', 'paneIds', 'httpStatus'],
  properties: {
    schemaVersion: { const: 1 }, kind: { const: 'runtime' },
    version: { type: 'string', minLength: 1 },
    installed: { type: 'object', required: ['path', 'sha256', 'device', 'inode'], properties: { path: { type: 'string', minLength: 1 }, sha256: hash, device: { type: 'integer' }, inode: { type: 'integer' } } },
    processes: { type: 'array', items: { type: 'object', required: ['role', 'pid', 'managerPid', 'version', 'device', 'inode', 'sha256', 'matchesInstalled'], properties: { role: { enum: ['daemon', 'web'] }, pid: { type: 'integer' }, managerPid: { type: 'integer' }, version: { type: 'string', minLength: 1 }, device: { type: 'integer' }, inode: { type: 'integer' }, sha256: hash, matchesInstalled: { type: 'boolean' } } } },
    paneIds: { type: 'array', items: { type: 'integer' } },
    httpStatus: { type: ['integer', 'null'] },
  },
});
const validateServiceInput = ajv.compile({
  type: 'object',
  required: ['schemaVersion', 'kind', 'version', 'candidateSha256', 'glueSha256', 'checks'],
  properties: {
    schemaVersion: { const: 1 }, kind: { const: 'service' },
    version: { type: 'string', minLength: 1 },
    candidateSha256: hash, glueSha256: hash,
    checks: { type: 'array', items: { type: 'object', required: ['name', 'status'], properties: { name: { type: 'string', minLength: 1 }, status: { enum: ['passed', 'failed', 'not_run'] } } } },
  },
});

export const TIME_CHECKS = ['instrumented_module_provenance', 'calendar_epoch_and_output_bounds', 'instant_fractional_seconds_and_bounds', 'elapsed_borrow_and_saturation', 'actual_consumer', 'externref_reuse_10000_calls'];
export const STRUCTURE_CHECKS = ['imports', 'exports', 'function_signatures', 'memory_limits', 'initial_memory'];
export const SERVICE_CHECKS = ['served_wasm', 'served_glue', 'versioned_page', 'missing_token_rejected', 'invalid_token_rejected', 'existing_token_accepted'];
export const REQUIRED_SKIPPED = ['visualTests', 'fullGpuAndApplicationInteraction', 'syncProjectTests', 'sofa'];

const fail = message => { throw new Error(`Invalid evidence: ${message}`); };

function passedChecks(report, names, label) {
  if (!Array.isArray(report.checks)) fail(`${label} report has no checks`);
  const byName = new Map(report.checks.map(c => [c.name, c]));
  if (byName.size !== report.checks.length) fail(`${label} report contains duplicate checks`);
  for (const check of report.checks) if (check.status === 'failed') fail(`${label} check ${check.name} is failed`);
  for (const name of names) {
    const check = byName.get(name);
    if (!check) fail(`${label} report is missing check ${name}`);
    if (check.status !== 'passed') fail(`${label} check ${name} is ${check.status}`);
  }
  return byName;
}

function simpleReport(value, label, fields) {
  if (!value || value.schemaVersion !== 1) fail(`Invalid ${label} report`);
  for (const field of fields) if (typeof value[field] !== 'string') fail(`Invalid ${label} report: missing ${field}`);
  if (!Array.isArray(value.checks) && label === 'headless') fail('Invalid headless report: missing checks');
  return value;
}

export async function collectEvidence({ version, original, candidate, glue, profile, structureReport, timeReport, fontReport, runtimeReport, serviceReport, headlessReport, out, skipped = {} }) {
  if (!version) fail('version is required');
  const sources = { original, candidate, glue, profile, structureReport, timeReport, fontReport, runtimeReport, serviceReport, headlessReport };
  for (const [key, path] of Object.entries(sources)) if (!path) fail(`Missing ${key} path`);
  if (!out) fail('Missing out path');

  const [originalBytes, candidateBytes, glueBytes, profileBytes] = await Promise.all([readFile(original), readFile(candidate), readFile(glue), readFile(profile)]);
  const inputs = { originalSha256: sha256(originalBytes), candidateSha256: sha256(candidateBytes), glueSha256: sha256(glueBytes), profileSha256: sha256(profileBytes) };
  const readJson = async path => JSON.parse(await readFile(path, 'utf8'));
  const profileJson = JSON.parse(profileBytes.toString('utf8'));
  const [structure, time, fonts, runtime, service, headless] = await Promise.all(
    [structureReport, timeReport, fontReport, runtimeReport, serviceReport, headlessReport].map(readJson));

  simpleReport(profileJson, 'profile', ['candidateSha256']);
  if (profileJson.version !== version) fail(`Profile version ${profileJson.version} does not match target ${version}`);
  simpleReport(structure, 'structure', ['originalSha256', 'candidateSha256']);
  simpleReport(time, 'time', ['candidateSha256']);
  simpleReport(fonts, 'font', ['wasmSha256']);
  simpleReport(headless, 'headless', []);
  if (typeof headless.candidateSha256 !== 'string') fail('Headless report lacks candidateSha256; regenerate it with the current runtime');
  if (!validateRuntimeInput(runtime)) fail(`Invalid runtime report: ${ajv.errorsText(validateRuntimeInput.errors)}`);
  if (!validateServiceInput(service)) fail(`Invalid service report: ${ajv.errorsText(validateServiceInput.errors)}`);

  // Cross-report agreement on the target version and actual hashes.
  if (runtime.version !== version) fail(`Runtime report version ${runtime.version} does not match target ${version}`);
  if (service.version !== version) fail(`Service report version ${service.version} does not match target ${version}`);
  for (const [label, value] of [['profile', profileJson.candidateSha256], ['structure', structure.candidateSha256], ['time', time.candidateSha256], ['fonts', fonts.wasmSha256], ['service', service.candidateSha256], ['headless', headless.candidateSha256]])
    if (value !== inputs.candidateSha256) fail(`${label} candidate hash ${value} does not match actual ${inputs.candidateSha256}`);
  if (structure.originalSha256 !== inputs.originalSha256) fail(`Structure original hash ${structure.originalSha256} does not match actual ${inputs.originalSha256}`);
  if (service.glueSha256 !== inputs.glueSha256) fail(`Service glue hash ${service.glueSha256} does not match actual ${inputs.glueSha256}`);
  if (time.profileSha256 !== inputs.profileSha256) fail('Time profile hash does not match the actual profile');
  if (time.glueSha256 !== inputs.glueSha256) fail('Time glue hash does not match the actual glue');
  if (fonts.analysisSha256 !== inputs.originalSha256) fail('Font analysis hash does not match the actual original module');

  // Layered evidence: the five structural checks must pass; time_behavior and
  // full_ui stay not_run and are covered by the time report / explicit skips.
  const structureChecks = passedChecks(structure, STRUCTURE_CHECKS, 'structure');
  if (structureChecks.get('time_behavior')?.status !== 'not_run') fail('structure check time_behavior must be not_run');
  if (structureChecks.get('full_ui')?.status !== 'not_run') fail('structure check full_ui must be not_run');
  passedChecks(time, TIME_CHECKS, 'time');
  passedChecks(service, SERVICE_CHECKS, 'service');
  passedChecks(headless, ['headless_forced', 'page_served', 'client_init', 'token_redaction'], 'headless');
  for (const check of headless.checks) {
    if (check.status === 'failed') fail(`headless check ${check.name} failed`);
    if (check.status === 'not_run' && !(check.details ?? '').trim()) fail(`headless check ${check.name} is not_run without a reason`);
  }

  if (!skipped || typeof skipped !== 'object' || Array.isArray(skipped)) fail('Skipped reasons must be an object');
  for (const key of REQUIRED_SKIPPED) if (!Object.hasOwn(skipped, key)) fail(`Skipped reason for ${key} is required`);
  const skip = Object.fromEntries(Object.entries(skipped).map(([key, reason]) => {
    if (typeof reason !== 'string' || !reason.trim()) fail(`Skipped reason for ${key} is required`);
    return [key, reason];
  }));

  // Runtime: exactly one daemon and one web process, each identical to the
  // installed binary and distinct from its manager; the web endpoint answers.
  if (runtime.processes.length !== 2) fail(`Runtime report lists ${runtime.processes.length} processes, expected 2`);
  const byRole = new Map(runtime.processes.map(p => [p.role, p]));
  for (const role of ['daemon', 'web']) if (!byRole.has(role)) fail(`Runtime report lacks a ${role} process`);
  for (const process of runtime.processes) {
    if (process.pid === process.managerPid) fail(`Runtime ${process.role} pid equals managerPid`);
    if (!process.matchesInstalled) fail(`Runtime ${process.role} does not match the installed binary`);
    if (process.version !== runtime.version) fail(`Runtime ${process.role} version differs from target`);
    for (const field of ['device', 'inode', 'sha256'])
      if (process[field] !== runtime.installed[field]) fail(`Runtime ${process.role} ${field} differs from installed`);
  }
  if (runtime.httpStatus !== 200) fail(`Runtime httpStatus ${runtime.httpStatus} is not 200`);

  const report = {
    schemaVersion: 2,
    version,
    inputs,
    profile: { version: profileJson.version, candidateSha256: profileJson.candidateSha256, sha256: inputs.profileSha256 },
    runtime: { version: runtime.version, installed: runtime.installed, processes: runtime.processes, paneIds: runtime.paneIds, httpStatus: runtime.httpStatus },
    verification: {
      structure: { passed: STRUCTURE_CHECKS, notRun: { time_behavior: 'covered by the time behavior report', full_ui: skip.fullGpuAndApplicationInteraction } },
      time: { passed: TIME_CHECKS },
      fonts: { fonts: fonts.fonts.map(f => ({ style: f.style, characters: f.characters, cjk: f.cjk, sha256: f.sha256 })) },
      headless: { candidateSha256: headless.candidateSha256, checks: headless.checks },
      service: { passed: SERVICE_CHECKS },
      skipped: skip,
    },
    sources,
  };
  validateEvidence(report);
  await writeFile(out, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  return report;
}

export function validateEvidence(report) {
  if (!validateOutput(report)) fail(ajv.errorsText(validateOutput.errors));
  if (report.profile.version !== report.version) fail(`Profile version ${report.profile.version} does not match evidence version ${report.version}`);
  if (report.runtime.version !== report.version) fail('Runtime version does not match evidence version');
  if (report.profile.candidateSha256 !== report.inputs.candidateSha256) fail('Profile candidate hash does not match inputs');
  if (report.profile.sha256 !== report.inputs.profileSha256) fail('Profile source hash does not match inputs');
  if (report.verification.headless.candidateSha256 !== report.inputs.candidateSha256) fail('Headless candidate hash does not match inputs');
  for (const name of STRUCTURE_CHECKS) if (!report.verification.structure.passed.includes(name)) fail(`Structure check ${name} not recorded as passed`);
  for (const name of TIME_CHECKS) if (!report.verification.time.passed.includes(name)) fail(`Time check ${name} not recorded as passed`);
  for (const name of SERVICE_CHECKS) if (!report.verification.service.passed.includes(name)) fail(`Service check ${name} not recorded as passed`);
  for (const key of REQUIRED_SKIPPED) if (!report.verification.skipped[key]?.trim()) fail(`Skipped reason for ${key} is missing`);
  for (const [key, reason] of Object.entries(report.verification.skipped)) if (typeof reason !== 'string' || !reason.trim()) fail(`Skipped reason for ${key} is missing`);
  passedChecks(report.verification.headless, ['headless_forced', 'page_served', 'client_init', 'token_redaction'], 'headless');
  for (const check of report.verification.headless.checks) {
    if (check.status === 'failed') fail(`headless check ${check.name} failed`);
    if (check.status === 'not_run' && !(check.details ?? '').trim()) fail(`headless check ${check.name} not_run reason was not preserved`);
  }
  const { installed, processes } = report.runtime;
  if (processes.length !== 2) fail(`Runtime lists ${processes.length} processes, expected 2`);
  const roles = new Set(processes.map(p => p.role));
  for (const role of ['daemon', 'web']) if (!roles.has(role)) fail(`Runtime lacks a ${role} process`);
  for (const process of processes) {
    if (process.pid === process.managerPid) fail(`Runtime ${process.role} pid equals managerPid`);
    if (!process.matchesInstalled) fail(`Runtime ${process.role} does not match the installed binary`);
    if (process.version !== report.version) fail(`Runtime ${process.role} version does not match evidence version`);
    for (const field of ['device', 'inode', 'sha256'])
      if (process[field] !== installed[field]) fail(`Runtime ${process.role} ${field} differs from installed`);
  }
  if (report.runtime.httpStatus !== 200) fail(`Runtime httpStatus ${report.runtime.httpStatus} is not 200`);
  return report;
}
