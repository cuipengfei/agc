import argparse
from copy import deepcopy
import hashlib
from io import BytesIO
import json
from pathlib import Path
from fontTools.ttLib import TTFont
from jsonschema import validate


def prepare_font(source, embedded, target):
    source_bytes = source.read_bytes()
    font = TTFont(BytesIO(source_bytes), recalcTimestamp=False)
    family = embedded['name'].getDebugName(1)
    if font['name'].getDebugName(1) not in ('Maple Mono NF CN', family, 'BerkeleyMono Nerd Font', 'BerkeleyMono Nerd Font Medium'):
        raise ValueError('Source font must be a Maple Mono NF CN font or its renamed product')
    cmap = dict(font.getBestCmap())
    if not all(ord(char) in cmap for char in '中文你好日本語') or not all(code in cmap for code in (0xe0b0, 0xf015)):
        raise ValueError('Source font lacks required CJK or Nerd Font samples')
    matching_ids = {1, 2, 4, 6, 16, 17}
    font['name'].names = [name for name in font['name'].names if name.nameID not in matching_ids]
    font['name'].names.extend(deepcopy(name) for name in embedded['name'].names if name.nameID in matching_ids)
    output = BytesIO()
    font.save(output)
    font.close()
    data = output.getvalue()
    saved = TTFont(BytesIO(data))
    if saved.getBestCmap() != cmap or saved['name'].getDebugName(1) != family:
        raise ValueError('Font rewrite changed cmap or failed lookup-family preservation')
    saved.close()
    with target.open('xb') as stream:
        stream.write(data)
    return {'sha256': hashlib.sha256(data).hexdigest(), 'sourceSha256': hashlib.sha256(source_bytes).hexdigest(), 'bytes': len(data), 'characters': len(cmap), 'cjk': sum(0x4e00 <= code <= 0x9fff for code in cmap)}


def main():
    parser = argparse.ArgumentParser()
    for name in ('plan', 'memory', 'wasm', 'regular', 'bold', 'out'):
        parser.add_argument('--' + name, type=Path, required=True)
    args = parser.parse_args()
    plan = json.loads(args.plan.read_text())
    validate(plan, json.loads(Path(__file__).with_name('analysis.schema.json').read_text()))
    if len(plan['fonts']) == 0:
        raise ValueError('No monospace font descriptors found in analysis; review is required')
    memory = args.memory.read_bytes()
    if hashlib.sha256(memory).hexdigest() != plan['memorySha256']:
        raise ValueError('Initial memory does not match the analyzed module')
    args.out.mkdir()
    (args.out / 'pkg').mkdir()
    pairs = {}
    for font in plan['fonts']:
        fam = font['family']
        weight = 500 if 'Medium' in fam else 400
        pairs.setdefault(weight, []).append(font)
    if len(pairs.get(400, [])) == 0 or len(pairs.get(500, [])) == 0:
        raise ValueError('Analysis must include at least one Regular and one Medium monospace font')
    style_map = {400: ('Regular', args.regular, 'Ioskeley Mono Term', 'BerkeleyMono Nerd Font'),
                 500: ('Bold', args.bold, 'Ioskeley Mono Term Medium', 'BerkeleyMono Nerd Font Medium')}
    records = []
    for weight in sorted(pairs):
        style, source, ioskeley_fam, berkeley_fam = style_map[weight]
        for original in pairs[weight]:
            pointer, length = original['pointer'], original['length']
            if pointer + length > len(memory):
                raise ValueError('Embedded font exceeds initial memory')
            embedded = TTFont(BytesIO(memory[pointer:pointer + length]))
            embedded_family = embedded['name'].getDebugName(1)
            if embedded_family not in (ioskeley_fam, berkeley_fam):
                raise ValueError(f'Embedded font family {embedded_family} differs from expected {ioskeley_fam} or {berkeley_fam}')
            slot = original['slot']
            slots = slot if isinstance(slot, list) else [slot]
            for s in slots:
                record = prepare_font(source, embedded, args.out / 'pkg' / f'MapleMono-NF-CN-{style}.ttf' if len(pairs[weight]) == 1 else args.out / 'pkg' / f'MapleMono-NF-CN-{style}-{s}.ttf')
                records.append({'style': style, 'slot': s, 'expectedPointer': pointer, 'expectedLength': length, 'url': f'./pkg/MapleMono-NF-CN-{style}.ttf' if len(pairs[weight]) == 1 else f'./pkg/MapleMono-NF-CN-{style}-{s}.ttf', **record})
            embedded.close()
    manifest = {'schemaVersion': 1, 'analysisSha256': plan['inputSha256'], 'wasmSha256': hashlib.sha256(args.wasm.read_bytes()).hexdigest(), 'wasmUrl': './pkg/client.wasm', 'fonts': records}
    with (args.out / 'fonts.json').open('x') as output:
        json.dump(manifest, output, ensure_ascii=False, indent=2)
    print(json.dumps({'schemaVersion': 1, 'wasmSha256': manifest['wasmSha256'], 'fonts': len(records)}))


if __name__ == '__main__':
    main()
