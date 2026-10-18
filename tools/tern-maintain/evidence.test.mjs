import { test, expect } from 'bun:test';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { collectEvidence, validateEvidence, TIME_CHECKS, STRUCTURE_CHECKS, SERVICE_CHECKS } from './evidence.mjs';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');

function fixture() {
  const original = new Uint8Array([1, 2, 3]), candidate = new Uint8Array([4, 5, 6]), glue = new Uint8Array([7, 8]);
  const binaryHash = 'e'.repeat(64);
  const font = style => ({ style, slot: 1, expectedPointer: 2, expectedLength: 3, url: `./pkg/MapleMono-NF-CN-${style}.ttf`, sha256: sha(new Uint8Array([style === 'Regular' ? 9 : 10])), sourceSha256: 'd'.repeat(64), bytes: 3, characters: 33091, cjk: 20976 });
  return {
    version: '0.9.4',
    files: { original, candidate, glue },
    profile: { schemaVersion: 1, version: '0.9.4', candidateSha256: sha(candidate), exports: { test_calendar: 1 }, consumerFlags: [] },
    structure: {
      schemaVersion: 1, originalSha256: sha(original), candidateSha256: sha(candidate), deployable: false,
      checks: [...STRUCTURE_CHECKS.map(name => ({ name, status: 'passed' })), { name: 'time_behavior', status: 'not_run' }, { name: 'full_ui', status: 'not_run' }],
    },
    time: { schemaVersion: 1, candidateSha256: sha(candidate), testModuleSha256: 'a'.repeat(64), checks: TIME_CHECKS.map(name => ({ name, status: 'passed' })) },
    fonts: { schemaVersion: 1, analysisSha256: sha(original), wasmSha256: sha(candidate), wasmUrl: './pkg/client.wasm', fonts: [font('Regular'), font('Bold')] },
    runtime: {
      schemaVersion: 1, kind: 'runtime', version: '0.9.4',
      installed: { path: '/usr/bin/tern', sha256: binaryHash, device: 2049, inode: 1110618 },
      processes: [
        { role: 'daemon', pid: 1180316, managerPid: 1180300, version: '0.9.4', device: 2049, inode: 1110618, sha256: binaryHash, matchesInstalled: true },
        { role: 'web', pid: 1180448, managerPid: 1180300, version: '0.9.4', device: 2049, inode: 1110618, sha256: binaryHash, matchesInstalled: true },
      ],
      paneIds: [326417514501], httpStatus: 200,
    },
    service: { schemaVersion: 1, kind: 'service', version: '0.9.4', candidateSha256: sha(candidate), glueSha256: sha(glue), checks: SERVICE_CHECKS.map(name => ({ name, status: 'passed' })) },
    headless: {
      schemaVersion: 1, candidateSha256: sha(candidate),
      checks: [
        { name: 'headless_forced', status: 'passed' }, { name: 'page_served', status: 'passed' },
        { name: 'webgpu_available', status: 'not_run', details: 'navigator.gpu absent; GPU behavior is not checked' },
        { name: 'client_init', status: 'passed' },
        { name: 'wire_mount', status: 'not_run', details: '仅模块 init 与字体注入，不执行 mount/WebSocket' },
        { name: 'token_redaction', status: 'passed' },
        { name: 'gpu_interaction_full', status: 'not_run', details: '未执行完整 GPU 交互' },
      ],
    },
    skipped: { visualTests: '用户禁止', fullGpuAndApplicationInteraction: '用户禁止', syncProjectTests: '无同步实现变化', sofa: '连接失败' },
  };
}

async function materialize(dir, fx) {
  const opts = { version: fx.version, out: join(dir, 'evidence.json'), skipped: fx.skipped };
  for (const key of ['original', 'candidate', 'glue']) {
    opts[key] = join(dir, `${key}.bin`);
    await writeFile(opts[key], fx.files[key]);
  }
  const time = {...fx.time, profileSha256: sha(Buffer.from(JSON.stringify(fx.profile))), glueSha256: sha(fx.files.glue)};
  const reports = { profile: fx.profile, structureReport: fx.structure, timeReport: time, fontReport: fx.fonts, runtimeReport: fx.runtime, serviceReport: fx.service, headlessReport: fx.headless };
  for (const [key, value] of Object.entries(reports)) {
    opts[key] = join(dir, `${key}.json`);
    await writeFile(opts[key], JSON.stringify(value));
  }
  return opts;
}

async function withFixture(run) {
  const dir = await mkdtemp(join(tmpdir(), 'tern-evidence-tests-'));
  try { await run(await materialize(dir, fixture()), dir); }
  finally { await rm(dir, { recursive: true, force: true }); }
}

test('file-backed reports aggregate into strict schemaVersion 2 evidence', async () => {
  await withFixture(async opts => {
    const report = await collectEvidence(opts);
    expect(report.schemaVersion).toBe(2);
    expect(report.version).toBe('0.9.4');
    expect(report.inputs.candidateSha256).toBe(sha(fixture().files.candidate));
    expect(report.verification.structure.passed).toEqual(STRUCTURE_CHECKS);
    expect(report.verification.time.passed).toEqual(TIME_CHECKS);
    expect(report.verification.service.passed).toEqual(SERVICE_CHECKS);
    expect(report.verification.headless.checks.filter(c => c.status === 'not_run').every(c => c.details)).toBe(true);
    expect(JSON.parse(await readFile(opts.out, 'utf8'))).toEqual(report);
    expect(() => validateEvidence(report)).not.toThrow();
  });
});
test('an older version mixed into any report is rejected', async () => {
  await withFixture(async (opts, dir) => {
    for (const key of ['profile', 'runtimeReport', 'serviceReport']) {
      const value = JSON.parse(await readFile(opts[key], 'utf8'));
      value.version = '0.9.3';
      if (value.processes) value.processes = value.processes.map(p => ({ ...p, version: '0.9.3' }));
      await writeFile(opts[key], JSON.stringify(value));
      await expect(collectEvidence(opts)).rejects.toThrow(/0\.9\.3/);
      await materialize(dir, fixture()).then(o => Object.assign(opts, o));
    }
  });
});

test('a process whose pid equals its managerPid is rejected', async () => {
  await withFixture(async (opts, dir) => {
    const runtime = JSON.parse(await readFile(opts.runtimeReport, 'utf8'));
    runtime.processes[1].pid = runtime.processes[1].managerPid;
    await writeFile(opts.runtimeReport, JSON.stringify(runtime));
    await expect(collectEvidence(opts)).rejects.toThrow(/managerPid/);
  });
});

test('a hash mismatch against the actual candidate is rejected everywhere', async () => {
  await withFixture(async (opts, dir) => {
    const foreign = '0'.repeat(64);
    for (const [key, mutate] of [
      ['structureReport', r => { r.candidateSha256 = foreign; }],
      ['timeReport', r => { r.candidateSha256 = foreign; }],
      ['fontReport', r => { r.wasmSha256 = foreign; }],
      ['serviceReport', r => { r.candidateSha256 = foreign; }],
      ['headlessReport', r => { r.candidateSha256 = foreign; }],
      ['serviceReport', r => { r.glueSha256 = foreign; }],
    ]) {
      const value = JSON.parse(await readFile(opts[key], 'utf8'));
      mutate(value);
      await writeFile(opts[key], JSON.stringify(value));
      await expect(collectEvidence(opts)).rejects.toThrow(/hash/);
      await materialize(dir, fixture()).then(o => Object.assign(opts, o));
    }
    const structure = JSON.parse(await readFile(opts.structureReport, 'utf8'));
    structure.originalSha256 = foreign;
    await writeFile(opts.structureReport, JSON.stringify(structure));
    await expect(collectEvidence(opts)).rejects.toThrow(/original hash/);
  });
});

test('any failed check rejects the evidence', async () => {
  await withFixture(async (opts, dir) => {
    for (const [key, name] of [['timeReport', TIME_CHECKS[0]], ['structureReport', STRUCTURE_CHECKS[0]], ['serviceReport', SERVICE_CHECKS[0]]]) {
      const value = JSON.parse(await readFile(opts[key], 'utf8'));
      value.checks.find(c => c.name === name).status = 'failed';
      await writeFile(opts[key], JSON.stringify(value));
      await expect(collectEvidence(opts)).rejects.toThrow(new RegExp(`${name} is failed`));
      await materialize(dir, fixture()).then(o => Object.assign(opts, o));
    }
    const headless = JSON.parse(await readFile(opts.headlessReport, 'utf8'));
    headless.checks[0].status = 'failed';
    await writeFile(opts.headlessReport, JSON.stringify(headless));
    await expect(collectEvidence(opts)).rejects.toThrow(/headless_forced.*failed/);
  });
});

test('a headless report without the bound candidateSha256 is rejected', async () => {
  await withFixture(async (opts, dir) => {
    const headless = JSON.parse(await readFile(opts.headlessReport, 'utf8'));
    delete headless.candidateSha256;
    await writeFile(opts.headlessReport, JSON.stringify(headless));
    await expect(collectEvidence(opts)).rejects.toThrow(/candidateSha256/);
  });
});

test('a skip without an explicit reason is rejected', async () => {
  await withFixture(async opts => {
    for (const key of ['visualTests', 'fullGpuAndApplicationInteraction', 'syncProjectTests', 'sofa']) {
      await expect(collectEvidence({ ...opts, skipped: { ...opts.skipped, [key]: '' } })).rejects.toThrow(new RegExp(key));
      await expect(collectEvidence({ ...opts, skipped: { ...opts.skipped, [key]: undefined } })).rejects.toThrow(new RegExp(key));
    }
    await expect(collectEvidence({ ...opts, skipped: {} })).rejects.toThrow(/visualTests/);
    await expect(collectEvidence({ ...opts, skipped: { ...opts.skipped, extraCheck: ' ' } })).rejects.toThrow(/extraCheck/);
  });
});

test('validateEvidence rejects tampered aggregates', async () => {
  await withFixture(async opts => {
    const report = await collectEvidence(opts);
    const tamper = mutate => { const copy = JSON.parse(JSON.stringify(report)); mutate(copy); return copy; };
    expect(() => validateEvidence(tamper(r => { r.runtime.processes[0].matchesInstalled = false; }))).toThrow(/Runtime daemon.*installed binary/);
    expect(() => validateEvidence(tamper(r => { r.runtime.httpStatus = 503; }))).toThrow(/httpStatus/);
    expect(() => validateEvidence(tamper(r => { r.verification.skipped.sofa = ''; }))).toThrow(/sofa/);
    expect(() => validateEvidence(tamper(r => { r.verification.headless.candidateSha256 = '1'.repeat(64); }))).toThrow(/[Hh]eadless candidate hash/);
    expect(() => validateEvidence(tamper(r => { r.runtime.version = '0.9.3'; }))).toThrow(/Runtime version/);
    expect(() => validateEvidence(tamper(r => { r.verification.headless.checks[2].details = ''; }))).toThrow(/webgpu_available.*not_run/);
    expect(() => validateEvidence(tamper(r => { r.verification.time.passed = r.verification.time.passed.filter(name => name !== 'elapsed_borrow_and_saturation'); }))).toThrow(/elapsed_borrow_and_saturation/);
    expect(() => validateEvidence(tamper(r => { r.schemaVersion = 1; }))).toThrow(/schemaVersion/);
  });
});

test('headless initialization must be present and passed', async () => {
  for (const status of ['missing', 'not_run']) {
    await withFixture(async opts => {
      const headless = JSON.parse(await readFile(opts.headlessReport, 'utf8'));
      if (status === 'missing') headless.checks = headless.checks.filter(check => check.name !== 'client_init');
      else Object.assign(headless.checks.find(check => check.name === 'client_init'), {status, details: '未执行初始化'});
      await writeFile(opts.headlessReport, JSON.stringify(headless));
      await expect(collectEvidence(opts)).rejects.toThrow(/client_init/);
    });
  }
});

test('time and font reports must belong to their actual source files', async () => {
  for (const [source, field] of [['timeReport', 'profileSha256'], ['timeReport', 'glueSha256'], ['fontReport', 'analysisSha256']]) {
    await withFixture(async opts => {
      const report = JSON.parse(await readFile(opts[source], 'utf8'));
      report[field] = '0'.repeat(64);
      await writeFile(opts[source], JSON.stringify(report));
      await expect(collectEvidence(opts)).rejects.toThrow(/hash/);
    });
  }
});

test('duplicate checks cannot conceal a failed result', async () => {
  await withFixture(async opts => {
    const report = JSON.parse(await readFile(opts.timeReport, 'utf8'));
    report.checks.unshift({...report.checks[0], status: 'failed'});
    await writeFile(opts.timeReport, JSON.stringify(report));
    await expect(collectEvidence(opts)).rejects.toThrow(/duplicate/);
  });
});
