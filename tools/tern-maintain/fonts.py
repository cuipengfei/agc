import argparse
from io import BytesIO
import json
from pathlib import Path
from fontTools.ttLib import TTFont, TTLibError

parser = argparse.ArgumentParser()
parser.add_argument('memory', type=Path)
parser.add_argument('--out', type=Path)
args = parser.parse_args()
blob = args.memory.read_bytes()
fonts = []
for signature in (b'\x00\x01\x00\x00', b'OTTO'):
    position = 0
    while True:
        offset = blob.find(signature, position)
        if offset < 0:
            break
        position = offset + 4
        if not 1 <= int.from_bytes(blob[offset + 4:offset + 6], 'big') <= 64:
            continue
        if blob[offset + 12:offset + 16] not in (b'CFF ', b'GDEF', b'BASE', b'DSIG', b'FFTM', b'GPOS', b'GSUB', b'OS/2', b'cmap', b'head'):
            continue
        try:
            font = TTFont(BytesIO(blob[offset:]), lazy=True)
            family = font['name'].getDebugName(1)
            cmap = font.getBestCmap()
            length = max(entry.offset + entry.length for entry in font.reader.tables.values())
        except (TTLibError, KeyError, AssertionError, UnicodeDecodeError):
            continue
        fonts.append({'family': family, 'pointer': offset, 'length': length, 'characters': len(cmap), 'cjk': sum(0x4e00 <= code <= 0x9fff for code in cmap), 'samples': {char: ord(char) in cmap for char in '中文你好日本語'}})
        font.close()
result = json.dumps(fonts, ensure_ascii=False)
if args.out:
    with args.out.open('x', encoding='utf-8') as stream:
        stream.write(result + '\n')
print(result)
