import { test, expect } from 'bun:test';
import { mkdtemp, writeFile, readFile, rm, access, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { runExperiment } from '../../.agents/skills/tern-font-only-deploy/scripts/run-experiment.mjs';

test('failed commands retain exact inputs, output and exit status without secrets', async () => {
  const root = await mkdtemp(join(tmpdir(), 'tern-experiment-test.'));
  try {
    const input = join(root, 'module.wasm'), secretFile = join(root, 'private-value');
    const bytes = Buffer.from([0, 97, 115, 109, 1, 0, 0, 0]);
    await writeFile(input, bytes);
    await writeFile(secretFile, 'example-private-value\n');
    const script = "process.stdout.write('example-private-'); setTimeout(() => { process.stdout.write('value\\n'); process.stderr.write('hypothesis rejected\\n'); process.exit(7); }, 10)";
    const { directory, exitCode } = await runExperiment({ root, hypothesis: 'A real failing child retains evidence', inputs: [input], secretFiles: [secretFile], command: [process.execPath, '-e', script] });
    expect(exitCode).toBe(7);
    const report = JSON.parse(await readFile(join(directory, 'experiment.json'), 'utf8'));
    expect(report.status).toBe('failed');
    expect(report.exitCode).toBe(7);
    expect(await readFile(join(directory, report.inputs[0].snapshot))).toEqual(bytes);
    expect(report.inputs[0].sha256).toBe(createHash('sha256').update(bytes).digest('hex'));
    expect(await readFile(join(directory, 'stdout.log'), 'utf8')).toBe('<REDACTED>\n');
    expect(await readFile(join(directory, 'stderr.log'), 'utf8')).toContain('hypothesis rejected');
    expect(await readFile(secretFile, 'utf8')).toBe('example-private-value\n');
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('input preparation failures retain a report and do not execute the command', async () => {
  const root = await mkdtemp(join(tmpdir(), 'tern-experiment-test.'));
  try {
    const marker = join(root, 'command-ran');
    const result = await runExperiment({ root, hypothesis: 'Missing inputs stop execution', inputs: [join(root, 'missing.wasm')], command: ['touch', marker] });
    expect(result.exitCode).toBe(1);
    expect(JSON.parse(await readFile(join(result.directory, 'experiment.json'), 'utf8')).status).toBe('failed');
    expect(await readFile(join(result.directory, 'stderr.log'), 'utf8')).toContain('ENOENT');
    expect(await access(marker).then(() => true, () => false)).toBe(false);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('a process that cannot start still leaves diagnostic evidence', async () => {
  const root = await mkdtemp(join(tmpdir(), 'tern-experiment-test.'));
  try {
    const result = await runExperiment({ root, hypothesis: 'Unavailable commands fail explicitly', command: [join(root, 'missing-command')] });
    expect(result.exitCode).toBe(1);
    expect(JSON.parse(await readFile(join(result.directory, 'experiment.json'), 'utf8')).exitCode).toBe(1);
    expect(await readFile(join(result.directory, 'stderr.log'), 'utf8')).toContain('ENOENT');
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('private files cannot be copied into input snapshots', async () => {
  const root = await mkdtemp(join(tmpdir(), 'tern-experiment-test.'));
  try {
    const file = join(root, 'private-value');
    await writeFile(file, 'example-private-value');
    const result = await runExperiment({ root, hypothesis: 'Private files stay private', inputs: [file], secretFiles: [file], command: [process.execPath, '-e', 'process.exit(0)'] });
    expect(result.exitCode).toBe(1);
    expect(await readdir(join(result.directory, 'inputs'))).toEqual([]);
    expect(await readFile(join(result.directory, 'stderr.log'), 'utf8')).toContain('Secret files cannot be input snapshots');
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('termination retains failure evidence and ends the owned process group', async () => {
  const root = await mkdtemp(join(tmpdir(), 'tern-experiment-signal.'));
  let runner, descendant;
  try {
    const marker = join(root, 'ready.json');
    const script = "const fs=require('node:fs'),cp=require('node:child_process'); const child=cp.spawn('sleep',['60'],{stdio:'ignore'}); child.once('close',()=>process.exit(0)); process.on('SIGTERM',()=>{}); fs.writeFileSync(process.argv[1],JSON.stringify({pid:child.pid})); setInterval(()=>{},1000)";
    runner = Bun.spawn([process.execPath, join(import.meta.dir, '../../.agents/skills/tern-font-only-deploy/scripts/run-experiment.mjs'),
      '--root', root, '--hypothesis', 'Interrupted experiments stop their descendants', '--', process.execPath, '-e', script, marker], { stdout: 'pipe', stderr: 'pipe' });
    for (let attempt = 0; attempt < 100 && !(await Bun.file(marker).exists()); attempt++) await new Promise(resolve => setTimeout(resolve, 10));
    descendant = JSON.parse(await readFile(marker, 'utf8')).pid;
    runner.kill('SIGTERM');
    expect(await runner.exited).toBe(143);
    const directory = join(root, (await readdir(root)).find(name => name.startsWith('run.')));
    const report = JSON.parse(await readFile(join(directory, 'experiment.json'), 'utf8'));
    expect(report.status).toBe('failed');
    expect(report.signal).toBe('SIGTERM');
    expect(() => process.kill(descendant, 0)).toThrow();
  } finally {
    if (runner && runner.exitCode === null) { runner.kill('SIGKILL'); await runner.exited; }
    if (descendant) { try { process.kill(descendant, 'SIGKILL'); } catch (error) { if (error.code !== 'ESRCH') throw error; } }
    await rm(root, { recursive: true, force: true });
  }
});

test('a child terminated by a signal never reports a successful command', async () => {
  const root = await mkdtemp(join(tmpdir(), 'tern-experiment-child-signal.'));
  try {
    const result = await runExperiment({ root, hypothesis: 'A signalled child is a failed experiment', command: [process.execPath, '-e', "process.kill(process.pid, 'SIGTERM')"] });
    expect(result.exitCode).toBeGreaterThan(0);
    const report = JSON.parse(await readFile(join(result.directory, 'experiment.json'), 'utf8'));
    expect(report.status).toBe('failed');
    expect(report.signal).toBe('SIGTERM');
  } finally { await rm(root, { recursive: true, force: true }); }
});
