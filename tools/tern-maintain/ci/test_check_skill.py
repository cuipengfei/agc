import importlib.util
import tempfile
import unittest
from pathlib import Path


CHECKER = Path(__file__).with_name("check-skill.py")
SPEC = importlib.util.spec_from_file_location("check_skill", CHECKER)
assert SPEC is not None and SPEC.loader is not None
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)

FEATURE = """# Official inputs

## Sub-features

- Check inputs.

## How to get to it (user POV)

Return to [SKILL.md](../SKILL.md).

## Driving it with release scripts

Run the helper.

## Gotchas

- Stop on unknown inputs.
"""


def make_skill(root):
    (root / "features").mkdir(parents=True)
    (root / "scripts").mkdir()
    (root / "SKILL.md").write_text(
        """---
name: skill
description: Exercise the deterministic skill checks.
---
# Fixture

See the [feature map](features/README.md).

## Helpers

- `scripts/verify-release.sh`
- `scripts/run-experiment.mjs`
""",
        encoding="utf-8",
    )
    (root / "features/README.md").write_text(
        "# Features\n\n[Official inputs](official-inputs.md)\n", encoding="utf-8"
    )
    (root / "features/official-inputs.md").write_text(FEATURE, encoding="utf-8")
    shell = root / "scripts/verify-release.sh"
    shell.write_text("#!/usr/bin/env bash\nset -euo pipefail\n", encoding="utf-8")
    shell.chmod(0o755)
    (root / "scripts/run-experiment.mjs").write_text("console.log('fixture');\n", encoding="utf-8")


class SkillCheckerTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name) / "skill"
        make_skill(self.root)

    def tearDown(self):
        self.temporary.cleanup()

    def errors(self):
        return MODULE.check_skill(self.root)

    def test_valid_skill(self):
        self.assertEqual(self.errors(), [])

    def test_invalid_yaml_frontmatter(self):
        path = self.root / "SKILL.md"
        path.write_text(path.read_text(encoding="utf-8").replace("description: Exercise", "description: ["), encoding="utf-8")
        self.assertTrue(any("invalid YAML frontmatter" in error for error in self.errors()))

    def test_empty_frontmatter_is_rejected(self):
        (self.root / "SKILL.md").write_text("---\n---\n# Empty metadata\n", encoding="utf-8")
        self.assertTrue(any("frontmatter must be a YAML mapping" in error for error in self.errors()))

    def test_feature_index_must_match_siblings(self):
        (self.root / "features/extra.md").write_text(FEATURE, encoding="utf-8")
        self.assertTrue(any("unindexed feature files: extra.md" in error for error in self.errors()))

    def test_feature_requires_four_exact_h2_sections(self):
        path = self.root / "features/official-inputs.md"
        path.write_text(path.read_text(encoding="utf-8").replace("## Gotchas", "## Notes"), encoding="utf-8")
        self.assertTrue(any("H2 headings must be exactly" in error for error in self.errors()))

    def test_internal_link_target_must_exist(self):
        path = self.root / "features/official-inputs.md"
        path.write_text(path.read_text(encoding="utf-8").replace("../SKILL.md", "../missing.md"), encoding="utf-8")
        self.assertTrue(any("broken internal link: ../missing.md" in error for error in self.errors()))

    def test_bash_helper_must_be_executable(self):
        (self.root / "scripts/verify-release.sh").chmod(0o644)
        self.assertTrue(any("Bash helper must be executable" in error for error in self.errors()))

    def test_javascript_helper_must_be_documented(self):
        path = self.root / "SKILL.md"
        path.write_text(path.read_text(encoding="utf-8").replace("- `scripts/run-experiment.mjs`\n", ""), encoding="utf-8")
        self.assertTrue(any("helper has no call or pointer" in error for error in self.errors()))


if __name__ == "__main__":
    unittest.main()
