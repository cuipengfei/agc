import binaryen from 'binaryen';
import { readFile, writeFile, mkdir, lstat } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { sha256, walk } from './analyze.mjs';

const ORIGINAL_SHA256 = '36abf20e257cbb0e356e2ee0b539d2a1186c6be346bbba35e4ac4bf786a9614d';
const GLUE_SHA256 = 'a520492de67d649f6ccfeeac494e3f0a7831ef5b328595d6edfe78ab1f1eac43';
const HELPER = 'tern_register_downloaded_font_name';
const APPEND = 'tern_append_named_downloaded_font';

function findOne(root, predicate, label) {
  const found = [];
  walk(root, (node, ref) => { if (predicate(node)) found.push({ node, ref }); });
  if (found.length !== 1) throw Error(`${label}: expected one AST match, received ${found.length}`);
  return found[0];
}

function directCall(ref, target) {
  const node = binaryen.getExpressionInfo(ref);
  return node.id === binaryen.CallId && node.target === target;
}

export async function buildRegistrationPatch({ original, glue, out }) {
  if (!original || !glue || !out) throw Error('original, glue and out are required');
  const input = await readFile(original), glueBytes = await readFile(glue);
  if (sha256(input) !== ORIGINAL_SHA256) throw Error('Unknown official WASM: investigate this version before applying the registration patch');
  if (sha256(glueBytes) !== GLUE_SHA256) throw Error('Official JavaScript glue does not match the reviewed release');
  if (await lstat(out).then(() => true, error => { if (error.code === 'ENOENT') return false; throw error; })) throw Error('Output directory already exists');
  const module = binaryen.readBinary(input);
  try {
    const builtin = binaryen.getFunctionInfo(module.getFunction('7979'));
    const selector = binaryen.getFunctionInfo(module.getFunction('14268'));
    const downloaded = binaryen.getFunctionInfo(module.getFunction('5024'));
    const copy = ref => module.copyExpression(ref);
    const local = index => module.local.get(index, binaryen.i32);
    const constant = value => module.i32.const(value);
    const add = (value, offset) => module.i32.add(value, constant(offset));
    const frame = offset => add(local(2), offset);
    const load = offset => module.i32.load(offset, 4, local(2));
    const set = (index, value) => module.local.set(index, value);
    const restore = () => module.global.set('global$0', add(local(2), 208));

    const registration = findOne(builtin.body, node => node.id === binaryen.BlockId && node.children.some(ref => directCall(ref, '18164')), 'Builtin name registration');
    const registrationIndex = registration.node.children.findIndex(ref => directCall(ref, '18164'));
    const nativeRegistration = registration.node.children.slice(registrationIndex, registrationIndex + 4);
    if (nativeRegistration.length !== 4 || binaryen.getExpressionInfo(nativeRegistration[1]).id !== binaryen.BlockId || binaryen.getExpressionInfo(nativeRegistration[3]).id !== binaryen.BlockId) throw Error('Builtin name registration layout changed');
    const entry = binaryen.getExpressionInfo(nativeRegistration[0]);
    const mapArgument = binaryen.getExpressionInfo(entry.operands[1]);
    if (mapArgument.id !== binaryen.BinaryId || binaryen.getExpressionInfo(mapArgument.right).value !== 288) throw Error('Name registration map is not FontSystem+288');

    const parser = findOne(selector.body, node => node.id === binaryen.BlockId && node.children.some(ref => directCall(ref, '15878')) && node.children.some(ref => directCall(ref, '22165')), 'Font family metadata parser');
    const parseIndex = parser.node.children.findIndex(ref => directCall(ref, '15878'));
    const nameIndex = parser.node.children.findIndex(ref => directCall(ref, '22165'));
    const rawBytes = parser.node.children[parseIndex - 1];
    if (binaryen.getExpressionInfo(rawBytes).id !== binaryen.CallIndirectId || nameIndex <= parseIndex + 2) throw Error('Font metadata extraction layout changed');
    const familyName = binaryen.getExpressionInfo(parser.node.children[nameIndex]);
    if (binaryen.getExpressionInfo(familyName.operands[2]).value !== 65552) throw Error('Expected typographic/fallback family name IDs');
    const fontReferenceAndName = parser.node.children.slice(parseIndex + 2, nameIndex + 1);
    const prologue = binaryen.getExpressionInfo(builtin.body).children[0];
    if (binaryen.getExpressionInfo(prologue).id !== binaryen.GlobalSetId) throw Error('Builtin stack frame prologue changed');

    // Reuse the program's parser, owning String entry and SmallVec insertion unchanged.
    const body = module.block(null, [
      set(10, local(0)), set(18, local(1)), copy(prologue),
      module.block('registration_done', [
        set(1, local(10)), set(3, local(18)), copy(rawBytes), copy(parser.node.children[parseIndex]),
        set(1, module.i32.load8_u(69, 1, local(2))),
        module.if(module.i32.eq(local(1), constant(2)), module.br('registration_done')),
        ...fontReferenceAndName.map(copy),
        module.if(module.i32.eq(load(48), constant(-1)), module.br('registration_done')),
        module.call('1303', [frame(160), load(52), load(56)], binaryen.none),
        module.if(load(48), module.call('29798', [load(52), load(48)], binaryen.none)),
        set(0, frame(160)),
        ...nativeRegistration.map(copy),
      ], binaryen.none),
      restore(),
    ], binaryen.none);
    module.addFunction(HELPER, builtin.params, binaryen.none, builtin.vars, body);
    module.addFunction(APPEND, binaryen.createType([binaryen.i32, binaryen.i32]), binaryen.i32, [binaryen.i32], module.block(null, [
      set(2, module.call('31952', [local(0), local(1)], binaryen.i32)),
      module.call(HELPER, [local(0), local(2)], binaryen.none),
      local(2),
    ], binaryen.i32));
    const append = findOne(downloaded.body, node => node.id === binaryen.CallId && node.target === '31952', 'Downloaded font append');
    binaryen.Call.setTarget(append.ref, APPEND);
    if (!module.validate()) throw Error('Patched module validation failed');
    const candidate = module.emitBinary();
    const manifest = { schemaVersion: 1, kind: 'font-registration', version: '0.9.28', originalSha256: ORIGINAL_SHA256, candidateSha256: sha256(candidate), glueSha256: sha256(glueBytes), patch: { caller: 5024, originalAppend: 31952, entry: 18164, statusFunctionIndex: 14775 } };
    await mkdir(out, { recursive: false });
    await writeFile(join(out, 'candidate.wasm'), candidate, { flag: 'wx' });
    await writeFile(join(out, 'glue.js'), glueBytes, { flag: 'wx' });
    await writeFile(join(out, 'registration.json'), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
    return manifest;
  } finally { module.dispose(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const { values } = parseArgs({ options: Object.fromEntries(['original', 'glue', 'out'].map(name => [name, { type: 'string' }])) });
  console.log(JSON.stringify(await buildRegistrationPatch(values)));
}
