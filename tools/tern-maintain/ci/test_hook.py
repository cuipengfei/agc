import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
CONFIG = ROOT / ".pre-commit-config.yaml"
SCRIPT = ROOT / "tools/tern-maintain/ci/check.sh"


class PreCommitHookTests(unittest.TestCase):
    def test_partial_stage_blocks_commit_and_preserves_unstaged_content(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            precommit = [sys.executable, "-m", "pre_commit"]
            env = os.environ.copy()
            for name in ("GIT_DIR", "GIT_WORK_TREE", "GIT_INDEX_FILE", "GIT_COMMON_DIR"):
                env.pop(name, None)
            env["PATH"] = "/usr/bin:/bin"

            def git(*args, check=True):
                return subprocess.run(
                    ["git", *args], cwd=root, env=env, check=check,
                    capture_output=True, text=True,
                )

            def put(path, content):
                target = root / path
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_text(content, encoding="utf-8")
                return target

            git("init", "-q")
            git("config", "user.name", "Test")
            git("config", "user.email", "test@example.invalid")
            put(".pre-commit-config.yaml", CONFIG.read_text(encoding="utf-8"))
            put("tools/tern-maintain/ci/check.sh", SCRIPT.read_text(encoding="utf-8"))
            git("add", ".pre-commit-config.yaml", "tools/tern-maintain/ci/check.sh")
            git("commit", "-qm", "fixture")
            subprocess.run(
                [*precommit, "install"], cwd=root,
                env=env, check=True, capture_output=True, text=True,
            )
            env["SKIP"] = "gitleaks"
            staged = put("tools/tern-maintain/change.txt", "staged")
            git("add", "tools/tern-maintain/change.txt")
            staged.write_text("unstaged", encoding="utf-8")
            result = git("commit", "-m", "must fail", check=False)
            self.assertNotEqual(result.returncode, 0, result.stdout + result.stderr)
            self.assertIn("bun: command not found", result.stdout + result.stderr)
            self.assertEqual(staged.read_text(encoding="utf-8"), "unstaged")
            self.assertEqual(git("show", ":tools/tern-maintain/change.txt").stdout, "staged")


if __name__ == "__main__":
    unittest.main()
