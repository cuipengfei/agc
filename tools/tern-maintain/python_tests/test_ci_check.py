import os
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path


SCRIPT = Path(__file__).resolve().parents[1] / "ci/check.sh"


class StagedCheckTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.env = os.environ.copy()
        self.env.pop("GIT_DIR", None)
        self.env.pop("GIT_WORK_TREE", None)
        self.env.pop("GIT_INDEX_FILE", None)
        self.env.pop("GIT_COMMON_DIR", None)
        self.env["HOME"] = str(self.root)
        self.env["PATH"] = "/usr/bin:/bin"
        self.git("init", "-q")
        self.git("config", "user.name", "Test")
        self.git("config", "user.email", "test@example.invalid")

    def git(self, *args):
        return subprocess.run(
            ["git", *args], cwd=self.root, env=self.env, check=True, capture_output=True, text=True
        )

    def put(self, path, content):
        target = self.root / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content, encoding="utf-8")

    def run_check(self):
        return subprocess.run(
            ["bash", str(SCRIPT), "--staged"], cwd=self.root, env=self.env,
            capture_output=True, text=True,
        )

    def test_irrelevant_change_skips_without_dependencies(self):
        self.put("other.txt", "change")
        self.git("add", "other.txt")
        result = self.run_check()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("no relevant staged changes", result.stdout)

    def test_check_runs_staged_snapshot_without_untracked_files(self):
        self.put("tools/tern-maintain/ci/check.sh", SCRIPT.read_text(encoding="utf-8"))
        self.put("tools/tern-maintain/ci/staged-fixture", "staged")
        self.put("wiki/staged.md", "staged")
        shutil.copytree(
            SCRIPT.parents[3] / ".agents/skills/tern-font-only-deploy",
            self.root / ".agents/skills/tern-font-only-deploy",
        )
        self.git("add", "tools/tern-maintain/ci", "wiki/staged.md", ".agents/skills/tern-font-only-deploy")
        self.put("tools/tern-maintain/ci/staged-fixture", "unstaged")
        self.put("tools/tern-maintain/ci/untracked-fixture", "untracked")
        envbin = self.root / "envbin"
        envbin.mkdir()
        snapshot_guard = (
            "#!/bin/bash\n"
            "[[ -z ${GIT_INDEX_FILE:-} && -z ${GIT_DIR:-} && -z ${GIT_WORK_TREE:-} ]] || exit 10\n"
            "root=${PWD%/tools/tern-maintain}\n"
            "[[ $(cat \"$root/tools/tern-maintain/ci/staged-fixture\") == staged ]] || exit 11\n"
            "[[ ! -e \"$root/tools/tern-maintain/ci/untracked-fixture\" ]] || exit 12\n"
        )
        self.put("envbin/bun", snapshot_guard)
        self.put("envbin/uv", snapshot_guard)
        self.put(
            "envbin/python3",
            "#!/bin/bash\n"
            "if [[ $1 == tools/wiki-check/check_evidence.py ]]; then\n"
            "  [[ $(cat tools/tern-maintain/ci/staged-fixture) == staged ]] || exit 11\n"
            "  [[ ! -e tools/tern-maintain/ci/untracked-fixture ]] || exit 12\n"
            "  printf '## Evidence errors\\n(none)\\n## Unreferenced raw files\\n(none)\\n## Summary\\n'\n"
            "fi\n",
        )
        for path in envbin.iterdir():
            path.chmod(0o755)
        self.env["PATH"] = f"{envbin}:/usr/bin:/bin"
        self.env["GIT_INDEX_FILE"] = str(self.root / ".git/index")
        result = self.run_check()
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("Wiki evidence check passed", result.stdout)

    def test_wiki_only_does_not_require_bun(self):
        self.put("tools/tern-maintain/ci/check.sh", SCRIPT.read_text(encoding="utf-8"))
        self.put(
            "tools/wiki-check/check_evidence.py",
            "print('## Evidence errors\\n(none)\\n## Unreferenced raw files\\n(none)\\n## Summary')\n",
        )
        self.put("wiki/article.md", "staged")
        self.git("add", "tools/tern-maintain/ci/check.sh", "tools/wiki-check/check_evidence.py")
        self.git("commit", "-qm", "fixture")
        self.git("add", "wiki/article.md")
        result = self.run_check()
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("Wiki evidence check passed", result.stdout)

    def test_tern_only_checks_skill_without_wiki_or_wabt(self):
        self.put("tools/tern-maintain/ci/check.sh", SCRIPT.read_text(encoding="utf-8"))
        self.put("tools/tern-maintain/change.txt", "staged")
        shutil.copytree(
            SCRIPT.parents[3] / ".agents/skills/tern-font-only-deploy",
            self.root / ".agents/skills/tern-font-only-deploy",
        )
        self.git("add", "tools/tern-maintain", ".agents/skills/tern-font-only-deploy")
        for command in ("bun", "uv"):
            self.put(f"envbin/{command}", "#!/bin/bash\nexit 0\n")
            (self.root / f"envbin/{command}").chmod(0o755)
        self.env["PATH"] = f"{self.root / 'envbin'}:/usr/bin:/bin"
        self.env["WABT_DIR"] = "/missing"
        result = self.run_check()
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertNotIn("Wiki evidence check passed", result.stdout)

    def test_skill_check_failure_blocks_staged_checks(self):
        self.put("tools/tern-maintain/ci/check.sh", SCRIPT.read_text(encoding="utf-8"))
        self.put("tools/tern-maintain/change.txt", "staged")
        self.git("add", "tools/tern-maintain")
        self.put("envbin/bun", "#!/bin/bash\nexit 0\n")
        self.put("envbin/uv", "#!/bin/bash\nexit 23\n")
        for command in ("bun", "uv"):
            (self.root / f"envbin/{command}").chmod(0o755)
        self.env["PATH"] = f"{self.root / 'envbin'}:/usr/bin:/bin"
        result = self.run_check()
        self.assertEqual(result.returncode, 23, result.stdout + result.stderr)


    def test_deleted_relevant_path_still_runs_check(self):
        self.put("tools/tern-maintain/ci/check.sh", SCRIPT.read_text(encoding="utf-8"))
        self.put("wiki/deleted.md", "old")
        self.git("add", "wiki/deleted.md", "tools/tern-maintain/ci/check.sh")
        self.git("commit", "-qm", "fixture")
        self.git("rm", "-q", "wiki/deleted.md")
        result = self.run_check()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("check_evidence.py", result.stderr)


if __name__ == "__main__":
    unittest.main()
