import copy
import io
import importlib
import json
import sys
import tempfile
import unittest
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest import mock


SCRIPTS_DIR = Path(__file__).resolve().parent.parent / ".agents" / "skills" / "info-tracker" / "scripts"
sys.path.insert(0, str(SCRIPTS_DIR))
changelog = importlib.import_module("github_copilot_changelog")

API_URL = "https://github.blog/wp-json/wp/v2/changelogs"
CONFIG = {
    "url": "https://github.blog/changelog/?label=copilot&opened-months=11",
    "api_url": API_URL,
    "label": "copilot",
    "backfill_days": 28,
}
CUTOFF = "2026-10-14T12:00:00Z"


def post(identifier, published, content="body", title="Copilot update", modified=None):
    return {
        "id": identifier,
        "date_gmt": published,
        "modified_gmt": modified or published,
        "link": f"https://github.blog/changelog/example-{identifier}",
        "title": {"rendered": title},
        "content": {"rendered": content},
    }


class FakeResponse:
    def __init__(self, body, pages=1):
        self.body = body
        self.headers = {"X-WP-TotalPages": str(pages)}

    def read(self):
        return self.body

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False


class CopilotChangelogTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.state_dir = Path(self.temporary.name)
        self.total_pages = None
        self.pages = {}
        self.expected_cutoff = CUTOFF
        self.requests = []
        patcher = mock.patch.object(urllib.request, "urlopen", side_effect=self.fetch)
        patcher.start()
        self.addCleanup(patcher.stop)

    def fetch(self, request, timeout):
        self.assertEqual(timeout, 30)
        url = request.full_url
        self.requests.append(url)
        parsed = urllib.parse.urlsplit(url)
        query = urllib.parse.parse_qs(parsed.query)
        if parsed.path.endswith("/label"):
            self.assertEqual(query["slug"], ["copilot"])
            return FakeResponse(json.dumps([{"id": 2765, "slug": "copilot"}]).encode())
        self.assertEqual(url.split("?")[0], API_URL)
        self.assertEqual(query["label"], ["2765"])
        self.assertEqual(query["per_page"], ["100"])
        if self.expected_cutoff is not None:
            self.assertEqual(query["after"], [CUTOFF.replace("Z", "+00:00")])
            self.assertEqual(query["modified_after"], [CUTOFF.replace("Z", "+00:00")])
        page = int(query["page"][0])
        if page not in self.pages:
            raise urllib.error.URLError("page failed")
        total_pages = self.total_pages or len(self.pages)
        return FakeResponse(json.dumps(self.pages[page]).encode(), total_pages)

    def seed(self, articles):
        (self.state_dir / "state.json").write_text(
            json.dumps({"cutoff": CUTOFF, "articles": articles}), encoding="utf-8"
        )

    def test_first_run_backfills_28_days_and_saves_cutoff(self):
        self.expected_cutoff = None
        now = datetime.now(timezone.utc)
        self.pages[1] = [
            post(2, (now - timedelta(days=1)).isoformat(), title="New &amp; improved"),
            post(1, (now - timedelta(days=28)).isoformat()),
            post(3, (now - timedelta(days=28, seconds=1)).isoformat()),
        ]

        with mock.patch.object(changelog, "datetime", wraps=datetime) as clock:
            clock.now.return_value = now
            result = changelog.collect(self.state_dir, CONFIG)

        self.assertEqual(result["status"], "ok")
        self.assertEqual([item["id"] for item in result["changes"]], [1, 2])
        self.assertEqual([item["change_type"] for item in result["changes"]], ["added", "added"])
        self.assertEqual(result["changes"][1]["title"], "New & improved")
        state = json.loads((self.state_dir / "state.json").read_text(encoding="utf-8"))
        self.assertEqual(set(state["articles"]), {"1", "2"})
        query = urllib.parse.parse_qs(urllib.parse.urlsplit(self.requests[1]).query)
        self.assertEqual(state["cutoff"], query["after"][0].replace("+00:00", "Z"))
        self.assertEqual(changelog._timestamp(state["cutoff"]), now - timedelta(days=28))

    def test_pagination_and_duplicate_entries_produce_one_change_per_article(self):
        self.seed({})
        self.pages = {
            1: [post(2, "2026-11-02T00:00:00"), post(1, "2026-11-01T00:00:00")],
            2: [post(1, "2026-11-01T00:00:00"), post(3, "2026-11-03T00:00:00")],
        }

        result = changelog.collect(self.state_dir, CONFIG)

        self.assertEqual(result["status"], "ok")
        self.assertEqual([item["id"] for item in result["changes"]], [1, 2, 3])
        self.assertEqual(changelog.collect(self.state_dir, CONFIG)["changes"], [])

    def test_modified_content_is_reported_then_becomes_baseline(self):
        original = changelog._article(post(1, "2026-11-01T00:00:00"))
        self.seed({"1": original})
        self.pages[1] = [
            post(1, "2026-11-01T00:00:00", content="new body", modified="2026-11-10T00:00:00")
        ]

        result = changelog.collect(self.state_dir, CONFIG)

        self.assertEqual(len(result["changes"]), 1)
        self.assertEqual(result["changes"][0]["change_type"], "modified")
        self.assertEqual(result["changes"][0]["content"], "new body")
        self.assertEqual(changelog.collect(self.state_dir, CONFIG)["changes"], [])

    def test_fetch_and_response_errors_preserve_complete_state(self):
        original = changelog._article(post(1, "2026-11-01T00:00:00"))
        self.seed({"1": original})
        original_bytes = (self.state_dir / "state.json").read_bytes()
        for case in ("network", "malformed"):
            with self.subTest(case=case):
                if case == "network":
                    self.pages = {1: [post(2, "2026-11-02T00:00:00")]}
                    self.total_pages = 2
                else:
                    malformed = post(2, "2026-11-02T00:00:00")
                    del malformed["content"]
                    self.pages = {1: [malformed]}

                result = changelog.collect(self.state_dir, CONFIG)

                self.assertEqual(result["status"], "error")
                self.assertEqual(result["changes"], [])
                self.assertIn("GitHub Copilot changelog", result["errors"][0])
                self.assertEqual((self.state_dir / "state.json").read_bytes(), original_bytes)

    def test_runner_includes_configured_changelog(self):
        import run

        self.expected_cutoff = None
        self.pages[1] = [post(1, "2026-11-01T00:00:00")]
        (self.state_dir / "sources.json").write_text(json.dumps({
            "releases": [],
            "github_copilot_pricing": [],
            "opencode_go_pricing": {},
            "github_copilot_changelog": CONFIG,
        }), encoding="utf-8")
        unchanged = {"status": "ok", "changes": [], "errors": []}
        with (
            mock.patch.object(run.release, "collect", return_value=copy.deepcopy(unchanged)),
            mock.patch.object(run.copilot_pricing, "collect", return_value=copy.deepcopy(unchanged)),
            mock.patch.object(run.opencode_pricing, "collect", return_value=copy.deepcopy(unchanged)),
        ):
            with mock.patch("sys.stdout", new_callable=io.StringIO) as output:
                code = run.main(self.state_dir)

        payload = json.loads(output.getvalue())
        self.assertEqual(code, 0)
        self.assertEqual(set(payload["sources"]), {
            "releases", "github_copilot_pricing", "opencode_go_pricing", "github_copilot_changelog"
        })
        self.assertEqual(payload["sources"]["github_copilot_changelog"]["changes"][0]["id"], 1)
        self.assertEqual(json.loads(Path(payload["result_path"]).read_text(encoding="utf-8")), payload)


if __name__ == "__main__":
    unittest.main()
