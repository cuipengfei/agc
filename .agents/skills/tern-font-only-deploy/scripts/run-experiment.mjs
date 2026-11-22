import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, mkdtemp, realpath } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { homedir } from 'node:os';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';

export function redact(text, secrets = []) {
  for (const secret of secrets) if (secret) text = text.split(secret).join('<REDACTED>');
  return text.replace(/([?&]token=)[^\s&"']+/g, '$1<REDACTED>');
}

export async function runExperiment({ root, hypothesis, inputs = [], command, secretFiles = [] }) {
  if (!hypothesis?.trim() || !command?.length) throw Error('A hypothesis and command are required');
  root = resolve(root ?? join(homedir(), '.local/share/tern-maintain/experiments'));
  await mkdir(root, { recursive: true, mode: 0o700 });
  const directory = await mkdtemp(join(root, 'run.'));
  const evidence = join(directory, 'evidence');
  await mkdir(evidence, { mode: 0o700 });
  await mkdir(join(directory, 'inputs'), { mode: 0o700 });
  const report = { schemaVersion: 1, hypothesis, command: [], inputs: [], started: new Date().toISOString(), status: 'running', exitCode: 1, signal: null };
  const reportPath = join(directory, 'experiment.json');
  await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
  console.log(`Experiment: ${directory}`);
  const stdout = [], stderr = [];
  let secrets = [];
  try {
    const privatePaths = await Promise.all(secretFiles.map(file => realpath(file)));
    secrets = await Promise.all(privatePaths.map(async file => (await readFile(file, 'utf8')).trim()));
    report.command = command.map(value => redact(value, secrets));
    for (const [index, file] of inputs.entries()) {
      const source = await realpath(file);
      if (privatePaths.includes(source)) throw Error('Secret files cannot be input snapshots');
      const bytes = await readFile(source);
      const snapshot = join('inputs', `${index}-${basename(file)}`);
      await writeFile(join(directory, snapshot), bytes, { mode: 0o600 });
      report.inputs.push({ source, snapshot, sha256: createHash('sha256').update(bytes).digest('hex') });
    }
    await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
    const child = spawn(command[0], command.slice(1), {
      env: { ...process.env, TERN_EXPERIMENT_DIR: directory, TERN_EVIDENCE: evidence },
      stdio: ['ignore', 'pipe', 'pipe'], detached: process.platform !== 'win32',
    });
    child.stdout.on('data', data => stdout.push(data));
    child.stderr.on('data', data => stderr.push(data));
    let interrupted, forceStop, startError;
    const stop = signal => {
      if (!child.pid) return;
      if (process.platform === 'win32') child.kill(signal);
      else {
        try { process.kill(-child.pid, signal); }
        catch (error) { if (error.code !== 'ESRCH') throw error; }
      }
    };
    const terminate = signal => {
      interrupted = signal;
      stop('SIGTERM');
      clearTimeout(forceStop);
      forceStop = setTimeout(() => stop('SIGKILL'), 10000);
    };
    const onInterrupt = () => terminate('SIGINT');
    const onTerminate = () => terminate('SIGTERM');
    process.once('SIGINT', onInterrupt);
    process.once('SIGTERM', onTerminate);
    child.once('error', error => { startError = error; });
    try {
      const outcome = await new Promise(resolveOutcome => child.once('close', (code, signal) => resolveOutcome({ code, signal })));
      report.exitCode = interrupted === 'SIGINT' ? 130 : interrupted === 'SIGTERM' ? 143 : Number.isInteger(outcome.code) && outcome.code >= 0 ? outcome.code : 1;
      report.signal = interrupted ?? outcome.signal;
      if (startError) stderr.push(Buffer.from(startError.message));
    } finally {
      clearTimeout(forceStop);
      process.removeListener('SIGINT', onInterrupt);
      process.removeListener('SIGTERM', onTerminate);
    }
  } catch (error) {
    stderr.push(Buffer.from(error.message));
  }
  await writeFile(join(directory, 'stdout.log'), redact(Buffer.concat(stdout).toString(), secrets), { mode: 0o600 });
  await writeFile(join(directory, 'stderr.log'), redact(Buffer.concat(stderr).toString(), secrets), { mode: 0o600 });
  report.status = report.exitCode === 0 ? 'passed' : 'failed';
  report.finished = new Date().toISOString();
  await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
  console.log(`Experiment ${report.status}: exit=${report.exitCode}; evidence retained at ${directory}`);
  return { directory, exitCode: report.exitCode };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const separator = process.argv.indexOf('--');
  const argv = separator < 0 ? process.argv.slice(2) : process.argv.slice(2, separator);
  const { values } = parseArgs({ args: argv, options: {
    root: { type: 'string' }, hypothesis: { type: 'string' }, input: { type: 'string', multiple: true },
    'secret-file': { type: 'string', multiple: true }, 'redact-log': { type: 'string' },
  } });
  if (values['redact-log']) {
    const secrets = await Promise.all((values['secret-file'] ?? []).map(async file => (await readFile(file, 'utf8')).trim()));
    process.stdout.write(redact(await readFile(values['redact-log'], 'utf8'), secrets));
  } else {
    const result = await runExperiment({ root: values.root ?? process.env.TERN_EXPERIMENT_ROOT, hypothesis: values.hypothesis,
      inputs: values.input, secretFiles: values['secret-file'], command: separator < 0 ? [] : process.argv.slice(separator + 1) });
    process.exitCode = result.exitCode;
  }
}
