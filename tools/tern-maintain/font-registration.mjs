import binaryen from 'binaryen';
import { readFile, writeFile, mkdir, lstat } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { sha256, walk } from './analyze.mjs';

const RELEASES = {
  '36abf20e257cbb0e356e2ee0b539d2a1186c6be346bbba35e4ac4bf786a9614d': {
    version: '0.9.28', glueSha256: 'a520492de67d649f6ccfeeac494e3f0a7831ef5b328595d6edfe78ab1f1eac43',
    builtin: '7979', selector: '14268', downloaded: '5024', entry: '18164',
    parse: '15878', family: '22165', string: '1303', free: '29798', append: '31952', statusFunctionIndex: 14775,
  },
  'fb165ec4aa5b23af48cb4d0b83e70e21ff3211a6bb62707daf37b278cc301085': {
    version: '0.9.29', glueSha256: '9f47fbf06321f2d55d69d5bf538037746f1d32d91d9fb5935220b5af4f2c4d93',
    builtin: '8042', selector: '14350', downloaded: '5084', entry: '18267',
    parse: '15976', family: '22304', string: '1316', free: '29948', append: '32105', statusFunctionIndex: 14857,
  },
  'b334979a593f909f39dc97a228fb4d724a5c947be2cf61b50a3c8688e9490620': {
    version: '0.9.30', glueSha256: 'db7be2a88456a84cb1c248e425730cee90f9499f452e3d508e321c1a336b1a60',
    builtin: '7844', selector: '14450', downloaded: '5056',
    parse: '16025', family: '22470', string: '1308', free: '30197', append: '32343', statusFunctionIndex: 14957,
    nativeMapOffset: 536, frameLocal: 2, frameSize: 3920, appendDonor: true,
  },
};
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
  return node.id === binaryen.CallId && (/** @type {binaryen.CallInfo} */ (node)).target === target;
}

export async function buildRegistrationPatch({ original, glue, out }) {
  if (!original || !glue || !out) throw Error('original, glue and out are required');
  const input = await readFile(original), glueBytes = await readFile(glue);
  const originalSha256 = sha256(input);
  const release = RELEASES[originalSha256];
  if (!release) throw Error('Unknown official WASM: investigate this version before applying the registration patch');
  if (sha256(glueBytes) !== release.glueSha256) throw Error('Official JavaScript glue does not match the reviewed release');
  if (await lstat(out).then(() => true, error => { if (error.code === 'ENOENT') return false; throw error; })) throw Error('Output directory already exists');
  const module = binaryen.readBinary(input);
  try {
    const builtin = binaryen.getFunctionInfo(module.getFunction(release.builtin));
    const selector = binaryen.getFunctionInfo(module.getFunction(release.selector));
    const downloaded = binaryen.getFunctionInfo(module.getFunction(release.downloaded));
    const copy = ref => module.copyExpression(ref);
    const local = index => module.local.get(index, binaryen.i32);
    const constant = value => module.i32.const(value);
    const add = (value, offset) => module.i32.add(value, constant(offset));
    const frame = offset => add(local(2), offset);
    const load = offset => module.i32.load(offset, 4, local(2));
    const set = (index, value) => module.local.set(index, value);
    const restore = () => module.global.set('global$0', add(local(release.frameLocal ?? 2), release.frameSize ?? 208));

    /** @type {binaryen.ExpressionRef[]} */ let nativeRegistration;
    if (release.appendDonor) {
      const registration = findOne(builtin.body, node => node.id === binaryen.BlockId && node.children.some(ref => {
        const set = /** @type {binaryen.LocalSetInfo} */ (binaryen.getExpressionInfo(ref));
        return set.id === binaryen.LocalSetId && directCall(set.value, release.append);
      }), 'Native downloaded-font registration');
      const appendIndex = registration.node.children.findIndex(ref => {
        const set = /** @type {binaryen.LocalSetInfo} */ (binaryen.getExpressionInfo(ref));
        return set.id === binaryen.LocalSetId && directCall(set.value, release.append);
      });
      if (!directCall(registration.node.children[appendIndex + 1], '30122')) throw Error('Native font-name normalization changed');
      nativeRegistration = registration.node.children.slice(appendIndex + 2, appendIndex + 18);
      findOne(registration.ref, node => {
        if (node.id !== binaryen.BinaryId) return false;
        const left = /** @type {binaryen.LocalGetInfo} */ (binaryen.getExpressionInfo(node.left)), right = /** @type {binaryen.ConstInfo} */ (binaryen.getExpressionInfo(node.right));
        return left.id === binaryen.LocalGetId && left.index === 11 && right.id === binaryen.ConstId && right.value === release.nativeMapOffset;
      }, 'Persistent font-name map');
    } else {
      const registration = findOne(builtin.body, node => node.id === binaryen.BlockId && node.children.some(ref => directCall(ref, release.entry)), 'Builtin name registration');
      const registrationIndex = registration.node.children.findIndex(ref => directCall(ref, release.entry));
      nativeRegistration = registration.node.children.slice(registrationIndex, registrationIndex + 4);
      if (nativeRegistration.length !== 4 || binaryen.getExpressionInfo(nativeRegistration[1]).id !== binaryen.BlockId || binaryen.getExpressionInfo(nativeRegistration[3]).id !== binaryen.BlockId) throw Error('Builtin name registration layout changed');
      const entry = /** @type {binaryen.CallInfo} */ (binaryen.getExpressionInfo(nativeRegistration[0]));
      const mapArgument = /** @type {binaryen.BinaryInfo} */ (binaryen.getExpressionInfo(entry.operands[1]));
      if (mapArgument.id !== binaryen.BinaryId || (/** @type {binaryen.ConstInfo} */ (binaryen.getExpressionInfo(mapArgument.right))).value !== 288) throw Error('Name registration map is not FontSystem+288');
    }

    const parser = findOne(selector.body, node => node.id === binaryen.BlockId && node.children.some(ref => directCall(ref, release.parse)) && node.children.some(ref => directCall(ref, release.family)), 'Font family metadata parser');
    const parseIndex = parser.node.children.findIndex(ref => directCall(ref, release.parse));
    const nameIndex = parser.node.children.findIndex(ref => directCall(ref, release.family));
    const rawBytes = parser.node.children[parseIndex - 1];
    if (binaryen.getExpressionInfo(rawBytes).id !== binaryen.CallIndirectId || nameIndex <= parseIndex + 2) throw Error('Font metadata extraction layout changed');
    const familyName = /** @type {binaryen.CallInfo} */ (binaryen.getExpressionInfo(parser.node.children[nameIndex]));
    if ((/** @type {binaryen.ConstInfo} */ (binaryen.getExpressionInfo(familyName.operands[2]))).value !== 65552) throw Error('Expected typographic/fallback family name IDs');
    const fontReferenceAndName = parser.node.children.slice(parseIndex + 2, nameIndex + 1);
    const prologue = release.frameLocal !== undefined ? findOne(builtin.body, node => {
      if (node.id !== binaryen.GlobalSetId) return false;
      const tee = /** @type {binaryen.LocalSetInfo} */ (binaryen.getExpressionInfo(node.value));
      if (tee.id !== binaryen.LocalSetId || !tee.isTee || tee.index !== release.frameLocal) return false;
      const subtraction = /** @type {binaryen.BinaryInfo} */ (binaryen.getExpressionInfo(tee.value));
      return subtraction.id === binaryen.BinaryId && (/** @type {binaryen.ConstInfo} */ (binaryen.getExpressionInfo(subtraction.right))).value === release.frameSize;
    }, 'Native registration stack frame').ref : (/** @type {binaryen.BlockInfo} */ (binaryen.getExpressionInfo(builtin.body))).children[0];

    // Reuse the program's parser, owning String entry and SmallVec insertion unchanged.
    const body = module.block(null, [
      set(release.appendDonor ? 11 : 10, local(0)), set(release.appendDonor ? 19 : 18, local(1)), copy(prologue),
      module.block('registration_done', [
        set(1, local(release.appendDonor ? 11 : 10)), set(3, local(release.appendDonor ? 19 : 18)), copy(rawBytes), copy(parser.node.children[parseIndex]),
        set(1, module.i32.load8_u(69, 1, local(2))),
        module.if(module.i32.eq(local(1), constant(2)), module.br('registration_done')),
        ...fontReferenceAndName.map(copy),
        module.if(module.i32.eq(load(48), constant(-1)), module.br('registration_done')),
        module.call(release.string, [frame(release.appendDonor ? 2012 : 160), load(52), load(56)], binaryen.none),
        module.if(load(48), module.call(release.free, [load(52), load(48)], binaryen.none)),
        release.appendDonor ? set(7, frame(2012)) : set(0, frame(160)),
        ...nativeRegistration.map(copy),
      ], binaryen.none),
      restore(),
    ], binaryen.none);
    module.addFunction(HELPER, builtin.params, binaryen.none, builtin.vars, body);
    module.addFunction(APPEND, binaryen.createType([binaryen.i32, binaryen.i32]), binaryen.i32, [binaryen.i32], module.block(null, [
      set(2, module.call(release.append, [local(0), local(1)], binaryen.i32)),
      module.call(HELPER, [local(0), local(2)], binaryen.none),
      local(2),
    ], binaryen.i32));
    const append = findOne(downloaded.body, node => node.id === binaryen.CallId && node.target === release.append, 'Downloaded font append');
    (/** @type {typeof binaryen & { Call: { setTarget(ref: binaryen.ExpressionRef, target: string): void } }} */ (binaryen)).Call.setTarget(append.ref, APPEND);
    if (!module.validate()) throw Error('Patched module validation failed');
    const candidate = module.emitBinary();
    const manifest = { schemaVersion: 1, kind: 'font-registration', version: release.version, originalSha256, candidateSha256: sha256(candidate), glueSha256: sha256(glueBytes), patch: { caller: Number(release.downloaded), originalAppend: Number(release.append), entry: release.entry ? Number(release.entry) : null, statusFunctionIndex: release.statusFunctionIndex } };
    await mkdir(out, { recursive: false });
    await writeFile(join(out, 'candidate.wasm'), candidate, { flag: 'wx' });
    await writeFile(join(out, 'glue.js'), glueBytes, { flag: 'wx' });
    await writeFile(join(out, 'registration.json'), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
    return manifest;
  } finally { module.dispose(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const { values } = parseArgs({ options: Object.fromEntries(['original', 'glue', 'out'].map(name => [name, { type: 'string' }])) });
  console.log(JSON.stringify(await buildRegistrationPatch({ original: values.original, glue: values.glue, out: values.out })));
}
