import sys
from pathlib import Path
import tempfile
import unittest
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from font_manifest import prepare_font


def build_font(path, family, codepoints):
    builder = FontBuilder(1000, isTTF=True)
    order = ['.notdef'] + [f'g{index}' for index in range(len(codepoints))]
    builder.setupGlyphOrder(order)
    builder.setupCharacterMap(dict(zip(codepoints, order[1:])))
    pen = TTGlyphPen(None)
    pen.moveTo((100, 0))
    pen.lineTo((500, 0))
    pen.lineTo((500, 700))
    pen.closePath()
    glyph = pen.glyph()
    builder.setupGlyf({name: glyph for name in order})
    builder.setupHorizontalMetrics({name: (600, 100) for name in order})
    builder.setupHorizontalHeader(ascent=800, descent=-200)
    builder.setupNameTable({'familyName': family, 'styleName': 'Regular', 'uniqueFontIdentifier': family, 'fullName': family, 'psName': family.replace(' ', ''), 'version': 'Version 1.000'})
    builder.font['name'].setName('fixture licence', 0, 3, 1, 0x409)
    builder.setupOS2(sTypoAscender=800, usWinAscent=800, usWinDescent=200)
    builder.setupPost()
    builder.save(path)


class FontDataTests(unittest.TestCase):
    def test_embedded_lookup_names_preserve_source_cmap_and_outlines(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            points = [ord(char) for char in '中文你好日本語A'] + [0xe0b0, 0xf015]
            source, embedded_path, target = [root / name for name in ('source.ttf', 'embedded.ttf', 'output.ttf')]
            build_font(source, 'Maple Mono NF CN', points)
            build_font(embedded_path, 'BerkeleyMono Nerd Font', points[:1])
            with TTFont(embedded_path) as embedded:
                result = prepare_font(source, embedded, target)
            with TTFont(source) as original, TTFont(target) as rewritten:
                self.assertEqual(rewritten['name'].getDebugName(1), 'BerkeleyMono Nerd Font')
                self.assertEqual(rewritten['name'].getDebugName(0), original['name'].getDebugName(0))
                self.assertEqual(rewritten.getBestCmap(), original.getBestCmap())
                self.assertEqual(rewritten.getGlyphOrder(), original.getGlyphOrder())
                self.assertEqual(rewritten['glyf'].compile(rewritten), original['glyf'].compile(original))
                self.assertEqual(rewritten['hmtx'].metrics, original['hmtx'].metrics)
                self.assertEqual(result['characters'], len(points))

    def test_missing_cjk_character_is_rejected_before_writing_font(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source, embedded_path, target = [root / name for name in ('source.ttf', 'embedded.ttf', 'output.ttf')]
            points = [ord(char) for char in '文你好日本語'] + [0xe0b0, 0xf015]
            build_font(source, 'Maple Mono NF CN', points)
            build_font(embedded_path, 'BerkeleyMono Nerd Font', points[:1])
            with TTFont(embedded_path) as embedded:
                with self.assertRaises(ValueError):
                    prepare_font(source, embedded, target)
            self.assertFalse(target.exists())


if __name__ == '__main__':
    unittest.main()
