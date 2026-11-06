import importlib
import io
import json
import re
import subprocess
import sys
import tempfile
import unittest
import urllib.error
import urllib.request
from contextlib import redirect_stdout
from pathlib import Path
from unittest import mock

REPO_ROOT = Path(__file__).resolve().parent.parent
SCRIPTS_DIR = REPO_ROOT / ".agents" / "skills" / "info-tracker" / "scripts"
MODULE_NAMES = ("run", "release", "copilot_pricing", "opencode_pricing")

REPO = "octo/demo"
COPILOT_DOCS = [
    {"name": "billing", "url": "https://docs.example.test/copilot/billing"},
    {"name": "plans", "url": "https://docs.example.test/copilot/plans"},
    {"name": "requests", "url": "https://docs.example.test/copilot/requests"},
]
OPENCODE_URL = "https://opencode.example.test/pricing"

OPENCODE_V1 = (
    "<html><body>"
    "<table><tr><th>Model</th><th>Price</th></tr>"
    "<tr><td>kimi-k3</td><td>$1.00 / M tokens</td></tr></table>"
    "<table><tr><th>Region</th></tr><tr><td>us-east</td></tr></table>"
    "</body></html>"
)
OPENCODE_V2_REGION_ONLY = OPENCODE_V1.replace("us-east", "eu-west")
OPENCODE_V3_PRICE = OPENCODE_V1.replace("$1.00", "$2.00")


def gh_release(tag, published_at, prerelease=False, body=None):
    return {
        "tag_name": tag,
        "published_at": published_at,
        "html_url": f"https://github.com/{REPO}/releases/tag/{tag}",
        "prerelease": prerelease,
        "body": body if body is not None else f"notes for {tag}",
    }


class _FakeResponse:
    def __init__(self, body):
        self._body = body

    def read(self):
        return self._body

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


class InfoTrackerTests(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self._tmp.cleanup)
        self.root = Path(self._tmp.name)

        sys.path.insert(0, str(SCRIPTS_DIR))
        self.addCleanup(self._unload_modules)

        self.gh_releases = {}
        self.gh_fail = set()
        self.http_pages = {}
        self.http_fail = set()
        self.http_type_errors = set()

        gh_patcher = mock.patch("subprocess.run", side_effect=self._fake_subprocess_run)
        gh_patcher.start()
        self.addCleanup(gh_patcher.stop)
        http_patcher = mock.patch("urllib.request.urlopen", side_effect=self._fake_urlopen)
        http_patcher.start()
        self.addCleanup(http_patcher.stop)

    def _unload_modules(self):
        if str(SCRIPTS_DIR) in sys.path:
            sys.path.remove(str(SCRIPTS_DIR))
        for name in MODULE_NAMES:
            sys.modules.pop(name, None)

    def _fake_subprocess_run(self, args, **kwargs):
        joined = " ".join(str(a) for a in args)
        match = re.search(r"repos/([^/]+)/([^/]+)/releases", joined)
        repo = f"{match.group(1)}/{match.group(2)}" if match else None
        if repo is None or repo in self.gh_fail:
            if kwargs.get("check"):
                raise subprocess.CalledProcessError(1, args, stderr="gh failed")
            return subprocess.CompletedProcess(args, 1, "", "gh failed")
        per_page = re.search(r"[?&]per_page=(\d+)", joined)
        limit = int(per_page.group(1)) if per_page else 30
        releases = self.gh_releases.get(repo, [])
        pages = [releases[index:index + limit] for index in range(0, len(releases), limit)]
        pages = pages or [[]]
        if "--paginate" in args:
            if "--slurp" in args:
                payload = json.dumps(pages)
            else:
                payload = "\n".join(json.dumps(page) for page in pages)
        else:
            payload = json.dumps(pages[0])
        return subprocess.CompletedProcess(args, 0, payload, "")

    def _fake_urlopen(self, url, **kwargs):
        target = url.full_url if hasattr(url, "full_url") else str(url)
        if target in self.http_type_errors:
            raise TypeError(f"unexpected fetch error for {target}")
        if target in self.http_fail or target not in self.http_pages:
            raise urllib.error.URLError(f"fetch failed for {target}")
        return _FakeResponse(self.http_pages[target].encode("utf-8"))

    def _write_sources(self):
        config = {
            "releases": [{"owner": "octo", "repo": "demo"}],
            "github_copilot_pricing": COPILOT_DOCS,
            "opencode_go_pricing": {"url": OPENCODE_URL},
        }
        (self.root / "sources.json").write_text(json.dumps(config), encoding="utf-8")

    def _seed_data(self):
        self.gh_releases[REPO] = [gh_release("v1.0.0", "2026-10-01T00:00:00Z")]
        for doc in COPILOT_DOCS:
            self.http_pages[doc["url"]] = f"# {doc['name']}\nprice: $10 per month\n"
        self.http_pages[OPENCODE_URL] = OPENCODE_V1

    def _invoke(self):
        run_module = importlib.import_module("run")
        out = io.StringIO()
        with redirect_stdout(out):
            code = run_module.main(root=self.root)
        return code, json.loads(out.getvalue())

    def test_run_covers_all_three_sources(self):
        self._write_sources()
        self._seed_data()

        code, payload = self._invoke()

        self.assertEqual(code, 0)
        self.assertEqual(set(payload), {"run_at", "result_path", "sources"})
        self.assertEqual(
            set(payload["sources"]),
            {"releases", "github_copilot_pricing", "opencode_go_pricing"},
        )
        for source in payload["sources"].values():
            self.assertEqual(set(source), {"status", "changes", "errors"})
            self.assertEqual(source["status"], "ok")
            self.assertEqual(source["errors"], [])
        result_path = Path(payload["result_path"])
        self.assertTrue(result_path.is_file())
        self.assertEqual(result_path.parent, self.root / "state" / "runs")

    def test_saved_run_json_matches_stdout(self):
        self._write_sources()
        self._seed_data()

        code, payload = self._invoke()

        self.assertEqual(code, 0)
        saved = json.loads(Path(payload["result_path"]).read_text(encoding="utf-8"))
        self.assertEqual(saved, payload)

    def test_run_write_failure_leaves_complete_json_on_stdout(self):
        self._write_sources()
        self._seed_data()
        self.assertEqual(self._invoke()[0], 0)
        self.gh_releases[REPO].insert(
            0, gh_release("v1.1.0", "2026-11-01T00:00:00Z")
        )
        runs_dir = self.root / "state" / "runs"
        write_text = Path.write_text

        def fail_run_write(path, data, *args, **kwargs):
            if path.parent == runs_dir:
                raise OSError("run write failed")
            return write_text(path, data, *args, **kwargs)

        run_module = importlib.import_module("run")
        out = io.StringIO()
        with mock.patch.object(Path, "write_text", new=fail_run_write):
            with redirect_stdout(out):
                with self.assertRaisesRegex(OSError, "run write failed"):
                    run_module.main(root=self.root)

        payload = json.loads(out.getvalue())
        self.assertEqual(set(payload), {"run_at", "result_path", "sources"})
        self.assertEqual(
            set(payload["sources"]),
            {"releases", "github_copilot_pricing", "opencode_go_pricing"},
        )
        for source in payload["sources"].values():
            self.assertEqual(set(source), {"status", "changes", "errors"})
            self.assertEqual(source["status"], "ok")
            self.assertEqual(source["errors"], [])
        self.assertEqual(
            [change["tag"] for change in payload["sources"]["releases"]["changes"]],
            ["v1.1.0"],
        )
        result_path = Path(payload["result_path"])
        self.assertEqual(result_path.parent, runs_dir)
        self.assertFalse(result_path.exists())

    def test_reports_every_new_release_not_just_latest(self):
        self._write_sources()
        self._seed_data()
        self.assertEqual(self._invoke()[0], 0)

        self.gh_releases[REPO] = [
            gh_release("v1.3.0", "2026-11-05T00:00:00Z", body="third"),
            gh_release("v1.2.0", "2026-11-01T00:00:00Z", prerelease=True, body="second"),
            gh_release("v1.0.0", "2026-10-01T00:00:00Z"),
        ]
        code, payload = self._invoke()

        self.assertEqual(code, 0)
        changes = payload["sources"]["releases"]["changes"]
        self.assertEqual({change["tag"] for change in changes}, {"v1.3.0", "v1.2.0"})
        for change in changes:
            self.assertEqual(
                set(change),
                {"repository", "tag", "published_at", "url", "prerelease", "notes"},
            )
            self.assertEqual(change["repository"], REPO)
        by_tag = {change["tag"]: change for change in changes}
        self.assertEqual(by_tag["v1.3.0"]["notes"], "third")
        self.assertEqual(by_tag["v1.2.0"]["notes"], "second")
        self.assertTrue(by_tag["v1.2.0"]["prerelease"])
        self.assertFalse(by_tag["v1.3.0"]["prerelease"])

    def test_reports_new_releases_across_all_pages(self):
        self._write_sources()
        self._seed_data()
        self.assertEqual(self._invoke()[0], 0)

        new_releases = [
            gh_release(
                f"v1.{index}.0",
                f"2026-11-01T00:{index // 60:02d}:{index % 60:02d}Z",
            )
            for index in range(101, 0, -1)
        ]
        self.gh_releases[REPO] = new_releases + self.gh_releases[REPO]
        code, payload = self._invoke()

        self.assertEqual(code, 0)
        releases = payload["sources"]["releases"]
        self.assertEqual(releases["status"], "ok")
        self.assertEqual(releases["errors"], [])
        self.assertEqual(len(releases["changes"]), 101)
        self.assertEqual(
            {change["tag"] for change in releases["changes"]},
            {item["tag_name"] for item in new_releases},
        )

    def test_six_releases_with_same_timestamp_are_not_reported_twice(self):
        self._write_sources()
        self._seed_data()
        self.assertEqual(self._invoke()[0], 0)

        tags = {f"v1.{index}.0" for index in range(1, 7)}
        self.gh_releases[REPO] = [
            gh_release(f"v1.{index}.0", "2026-11-01T00:00:00Z")
            for index in range(1, 7)
        ] + self.gh_releases[REPO]
        code, payload = self._invoke()

        self.assertEqual(code, 0)
        changes = payload["sources"]["releases"]["changes"]
        self.assertEqual(len(changes), 6)
        self.assertEqual({change["tag"] for change in changes}, tags)

        code, payload = self._invoke()

        self.assertEqual(code, 0)
        releases = payload["sources"]["releases"]
        self.assertEqual(releases["status"], "ok")
        self.assertEqual(releases["errors"], [])
        self.assertEqual(releases["changes"], [])

    def test_state_replace_failure_does_not_hide_new_release_on_retry(self):
        self._write_sources()
        self._seed_data()
        self.assertEqual(self._invoke()[0], 0)
        self.gh_releases[REPO].insert(
            0, gh_release("v1.1.0", "2026-11-01T00:00:00Z")
        )
        state_path = self.root / "state" / "release-tracker" / "state.json"
        replace = Path.replace

        def fail_state_replace(path, target):
            if Path(target) == state_path:
                raise OSError("state replacement failed")
            return replace(path, target)

        with mock.patch.object(Path, "replace", new=fail_state_replace):
            code, payload = self._invoke()

        self.assertEqual(code, 1)
        failed = payload["sources"]["releases"]
        self.assertEqual(failed["status"], "error")
        self.assertTrue(any(REPO in error for error in failed["errors"]))

        code, payload = self._invoke()

        self.assertEqual(code, 0)
        recovered = payload["sources"]["releases"]
        self.assertEqual(recovered["status"], "ok")
        self.assertEqual(recovered["errors"], [])
        self.assertEqual([change["tag"] for change in recovered["changes"]], ["v1.1.0"])

    def test_null_repository_state_preserves_earlier_repository_changes(self):
        self._write_sources()
        self._seed_data()
        self.assertEqual(self._invoke()[0], 0)
        config_path = self.root / "sources.json"
        config = json.loads(config_path.read_text(encoding="utf-8"))
        config["releases"].append({"owner": "other", "repo": "broken"})
        config_path.write_text(json.dumps(config), encoding="utf-8")
        state_path = self.root / "state" / "release-tracker" / "state.json"
        state = json.loads(state_path.read_text(encoding="utf-8"))
        state["repos"]["broken"] = None
        state_path.write_text(json.dumps(state), encoding="utf-8")
        self.gh_releases["other/broken"] = [
            gh_release("v1.0.0", "2026-10-01T00:00:00Z")
        ]
        self.gh_releases[REPO].insert(
            0, gh_release("v1.1.0", "2026-11-01T00:00:00Z")
        )

        code, payload = self._invoke()

        self.assertEqual(code, 1)
        releases = payload["sources"]["releases"]
        self.assertEqual(releases["status"], "error")
        self.assertEqual(len(releases["errors"]), 1)
        self.assertIn("other/broken", releases["errors"][0])
        self.assertEqual(len(releases["changes"]), 1)
        self.assertEqual(releases["changes"][0]["repository"], REPO)
        self.assertEqual(releases["changes"][0]["tag"], "v1.1.0")

    def test_successful_changes_become_next_baseline_for_all_sources(self):
        self._write_sources()
        self._seed_data()
        self.assertEqual(self._invoke()[0], 0)

        self.gh_releases[REPO].insert(
            0, gh_release("v1.1.0", "2026-11-01T00:00:00Z")
        )
        plans = COPILOT_DOCS[1]
        self.http_pages[plans["url"]] = "# plans\nprice: $12 per month\n"
        self.http_pages[OPENCODE_URL] = OPENCODE_V3_PRICE
        code, payload = self._invoke()

        self.assertEqual(code, 0)
        for source in payload["sources"].values():
            self.assertEqual(source["status"], "ok")
            self.assertEqual(source["errors"], [])
            self.assertEqual(len(source["changes"]), 1)

        code, payload = self._invoke()

        self.assertEqual(code, 0)
        for source in payload["sources"].values():
            self.assertEqual(source["status"], "ok")
            self.assertEqual(source["errors"], [])
            self.assertEqual(source["changes"], [])

    def test_copilot_documents_compared_independently_with_full_diff(self):
        self._write_sources()
        self._seed_data()
        plans = COPILOT_DOCS[1]
        original = "# plans\n" + "".join(
            f"tier {index:03d}: $10 per month\n" for index in range(100)
        ) + "old tail\n"
        self.assertGreater(len(original), 2000)
        self.http_pages[plans["url"]] = original
        self.assertEqual(self._invoke()[0], 0)

        self.http_pages[plans["url"]] = original.replace("$10", "$12").replace(
            "old tail", "new tail"
        )
        code, payload = self._invoke()

        self.assertEqual(code, 0)
        changes = payload["sources"]["github_copilot_pricing"]["changes"]
        self.assertEqual(len(changes), 1)
        change = changes[0]
        self.assertEqual(set(change), {"document", "url", "diff"})
        self.assertEqual(change["document"], "plans")
        self.assertEqual(change["url"], plans["url"])
        self.assertIn("$10", change["diff"])
        self.assertIn("$12", change["diff"])
        self.assertGreater(len(change["diff"]), 2000)
        self.assertIn("-old tail", change["diff"])
        self.assertIn("+new tail", change["diff"])

    def test_opencode_compares_only_pricing_table_with_dollar(self):
        self._write_sources()
        self._seed_data()
        self.assertEqual(self._invoke()[0], 0)

        self.http_pages[OPENCODE_URL] = OPENCODE_V2_REGION_ONLY
        code, payload = self._invoke()
        self.assertEqual(code, 0)
        self.assertEqual(payload["sources"]["opencode_go_pricing"]["changes"], [])

        self.http_pages[OPENCODE_URL] = OPENCODE_V3_PRICE
        code, payload = self._invoke()
        self.assertEqual(code, 0)
        changes = payload["sources"]["opencode_go_pricing"]["changes"]
        self.assertEqual(len(changes), 1)
        change = changes[0]
        self.assertEqual(change["document"], "opencode-go")
        self.assertEqual(change["url"], OPENCODE_URL)
        self.assertIn("$2.00", change["diff"])
        self.assertIn("$1.00", change["diff"])

    def test_opencode_dollar_only_in_filtered_row_preserves_baseline(self):
        self._write_sources()
        self._seed_data()
        self.assertEqual(self._invoke()[0], 0)
        baseline_path = (
            self.root / "state" / "opencode-go-pricing-monitor" / "pricing.baseline"
        )
        previous = baseline_path.read_bytes()
        self.http_pages[OPENCODE_URL] = (
            "<html><body><table><tr><th>Model</th><th>Price</th></tr>"
            "<tr><td> </td><td>$99.00 / M tokens</td></tr>"
            "<tr><td>kimi-k3</td><td>unavailable</td></tr>"
            "</table></body></html>"
        )

        code, payload = self._invoke()

        self.assertEqual(code, 1)
        failed = payload["sources"]["opencode_go_pricing"]
        self.assertEqual(failed["status"], "error")
        self.assertNotEqual(failed["errors"], [])
        self.assertEqual(failed["changes"], [])
        self.assertEqual(baseline_path.read_bytes(), previous)

    def test_unexpected_fetch_type_error_propagates_from_main(self):
        self._write_sources()
        self._seed_data()
        run_module = importlib.import_module("run")

        for url in (COPILOT_DOCS[0]["url"], OPENCODE_URL):
            with self.subTest(url=url):
                self.http_type_errors = {url}
                out = io.StringIO()
                with redirect_stdout(out):
                    with self.assertRaisesRegex(TypeError, "unexpected fetch error"):
                        run_module.main(root=self.root)
                self.assertEqual(out.getvalue(), "")

    def test_fetch_failure_reports_error_and_preserves_baseline(self):
        self._write_sources()
        self._seed_data()
        self.assertEqual(self._invoke()[0], 0)

        plans = COPILOT_DOCS[1]
        self.http_fail.add(plans["url"])
        code, payload = self._invoke()

        self.assertEqual(code, 1)
        failed = payload["sources"]["github_copilot_pricing"]
        self.assertEqual(failed["status"], "error")
        self.assertNotEqual(failed["errors"], [])
        self.assertEqual(payload["sources"]["releases"]["status"], "ok")
        self.assertEqual(payload["sources"]["opencode_go_pricing"]["status"], "ok")

        self.http_fail.discard(plans["url"])
        self.http_pages[plans["url"]] = "# plans\nprice: $12 per month\n"
        code, payload = self._invoke()

        self.assertEqual(code, 0)
        recovered = payload["sources"]["github_copilot_pricing"]
        self.assertEqual(recovered["status"], "ok")
        self.assertEqual(len(recovered["changes"]), 1)
        diff = recovered["changes"][0]["diff"]
        self.assertIn("$10", diff)
        self.assertIn("$12", diff)

    def test_gh_failure_reports_error_and_preserves_release_baseline(self):
        self._write_sources()
        self._seed_data()
        self.assertEqual(self._invoke()[0], 0)

        self.gh_releases[REPO].insert(
            0, gh_release("v1.1.0", "2026-11-01T00:00:00Z")
        )
        self.gh_fail.add(REPO)
        code, payload = self._invoke()

        self.assertEqual(code, 1)
        failed = payload["sources"]["releases"]
        self.assertEqual(failed["status"], "error")
        self.assertNotEqual(failed["errors"], [])
        self.assertEqual(failed["changes"], [])
        for name in ("github_copilot_pricing", "opencode_go_pricing"):
            self.assertEqual(payload["sources"][name]["status"], "ok")
            self.assertEqual(payload["sources"][name]["errors"], [])

        self.gh_fail.remove(REPO)
        code, payload = self._invoke()

        self.assertEqual(code, 0)
        recovered = payload["sources"]["releases"]
        self.assertEqual(recovered["status"], "ok")
        self.assertEqual(recovered["errors"], [])
        self.assertEqual([change["tag"] for change in recovered["changes"]], ["v1.1.0"])

    def test_opencode_failure_reports_error_and_preserves_pricing_baseline(self):
        self._write_sources()
        self._seed_data()
        self.assertEqual(self._invoke()[0], 0)

        self.http_pages[OPENCODE_URL] = OPENCODE_V3_PRICE
        self.http_fail.add(OPENCODE_URL)
        code, payload = self._invoke()

        self.assertEqual(code, 1)
        failed = payload["sources"]["opencode_go_pricing"]
        self.assertEqual(failed["status"], "error")
        self.assertNotEqual(failed["errors"], [])
        self.assertEqual(failed["changes"], [])
        for name in ("releases", "github_copilot_pricing"):
            self.assertEqual(payload["sources"][name]["status"], "ok")
            self.assertEqual(payload["sources"][name]["errors"], [])

        self.http_fail.remove(OPENCODE_URL)
        code, payload = self._invoke()

        self.assertEqual(code, 0)
        recovered = payload["sources"]["opencode_go_pricing"]
        self.assertEqual(recovered["status"], "ok")
        self.assertEqual(recovered["errors"], [])
        self.assertEqual(len(recovered["changes"]), 1)
        change = recovered["changes"][0]
        self.assertEqual(change["document"], "opencode-go")
        self.assertEqual(change["url"], OPENCODE_URL)
        self.assertIn("$1.00", change["diff"])
        self.assertIn("$2.00", change["diff"])

    def test_existing_hermes_state_and_pricing_baselines_are_reused(self):
        self._write_sources()
        self._seed_data()
        release_dir = self.root / "state" / "release-tracker"
        release_dir.mkdir(parents=True)
        legacy_state = {
            "pairs": [],
            "repos": {
                "demo": {
                    "owner": "octo",
                    "repo": "demo",
                    "latest_tag": "v1.0.0",
                    "latest_published": "2026-10-01T00:00:00Z",
                    "version_history": [],
                    "history": [],
                }
            },
            "solo": [],
        }
        (release_dir / "state.json").write_text(json.dumps(legacy_state), encoding="utf-8")
        copilot_dir = self.root / "state" / "github-copilot-pricing-monitor"
        copilot_dir.mkdir(parents=True)
        for doc in COPILOT_DOCS:
            (copilot_dir / f"{doc['name']}.baseline").write_text(
                self.http_pages[doc["url"]], encoding="utf-8"
            )
        opencode_dir = self.root / "state" / "opencode-go-pricing-monitor"
        opencode_dir.mkdir(parents=True)
        (opencode_dir / "pricing.baseline").write_text(
            "Model | Price\nkimi-k3 | $1.00 / M tokens\n\n", encoding="utf-8"
        )

        code, payload = self._invoke()

        self.assertEqual(code, 0)
        for source in payload["sources"].values():
            self.assertEqual(source["status"], "ok")
            self.assertEqual(source["errors"], [])
            self.assertEqual(source["changes"], [])

        self.gh_releases[REPO].insert(
            0, gh_release("v1.1.0", "2026-11-01T00:00:00Z")
        )
        plans = COPILOT_DOCS[1]
        self.http_pages[plans["url"]] += "new plan: $20 per month\n"
        self.http_pages[OPENCODE_URL] = OPENCODE_V1.replace(
            "</td></tr></table>",
            "</td></tr><tr><td>new-model</td><td>$3.00 / M tokens</td></tr></table>",
            1,
        )
        code, payload = self._invoke()

        self.assertEqual(code, 0)
        for source in payload["sources"].values():
            self.assertEqual(source["status"], "ok")
            self.assertEqual(source["errors"], [])
            self.assertEqual(len(source["changes"]), 1)
        release_changes = payload["sources"]["releases"]["changes"]
        self.assertEqual([change["tag"] for change in release_changes], ["v1.1.0"])
        copilot_change = payload["sources"]["github_copilot_pricing"]["changes"][0]
        self.assertEqual(copilot_change["document"], "plans")
        self.assertEqual(copilot_change["url"], plans["url"])
        self.assertIn("+new plan: $20 per month", copilot_change["diff"])
        self.assertEqual(
            [line for line in copilot_change["diff"].splitlines()
             if line.startswith("-") and not line.startswith("---")],
            [],
        )
        opencode_change = payload["sources"]["opencode_go_pricing"]["changes"][0]
        self.assertEqual(opencode_change["document"], "opencode-go")
        self.assertEqual(opencode_change["url"], OPENCODE_URL)
        self.assertIn("+new-model | $3.00 / M tokens", opencode_change["diff"])
        self.assertEqual(
            [line for line in opencode_change["diff"].splitlines()
             if line.startswith("-") and not line.startswith("---")],
            [],
        )


if __name__ == "__main__":
    unittest.main()
