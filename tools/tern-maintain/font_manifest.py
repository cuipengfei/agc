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
    if font['name'].getDebugName(1) not in ('Maple Mono NF CN', family):
        raise ValueError('Expected a full Maple Mono NF CN source font')
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
    if len(plan['fonts']) != 2:
        raise ValueError('An unambiguous two-font analysis is required')
    memory = args.memory.read_bytes()
    if hashlib.sha256(memory).hexdigest() != plan['memorySha256']:
        raise ValueError('Initial memory does not match the analyzed module')
    args.out.mkdir()
    (args.out / 'pkg').mkdir()
    records = []
    for style, source, expected_family in [('Regular', args.regular, 'BerkeleyMono Nerd Font'), ('Bold', args.bold, 'BerkeleyMono Nerd Font Medium')]:
        matches = [font for font in plan['fonts'] if font['family'] == expected_family]
        if len(matches) != 1:
            raise ValueError('Unknown embedded family structure; review is required')
        original = matches[0]
        pointer, length = original['pointer'], original['length']
        if pointer + length > len(memory):
            raise ValueError('Embedded font exceeds initial memory')
        embedded = TTFont(BytesIO(memory[pointer:pointer + length]))
        if embedded['name'].getDebugName(1) != expected_family:
            raise ValueError('Embedded font family differs from the analysis')
        record = prepare_font(source, embedded, args.out / 'pkg' / f'MapleMono-NF-CN-{style}.ttf')
        embedded.close()
        records.append({'style': style, 'slot': original['slot'], 'expectedPointer': pointer, 'expectedLength': length, 'url': f'./pkg/MapleMono-NF-CN-{style}.ttf', **record})
    manifest = {'schemaVersion': 1, 'analysisSha256': plan['inputSha256'], 'wasmSha256': hashlib.sha256(args.wasm.read_bytes()).hexdigest(), 'wasmUrl': './pkg/client.wasm', 'fonts': records}
    with (args.out / 'fonts.json').open('x') as output:
        json.dump(manifest, output, ensure_ascii=False, indent=2)
    print(json.dumps({'schemaVersion': 1, 'wasmSha256': manifest['wasmSha256'], 'fonts': len(records)}))


if __name__ == '__main__':
    main()
