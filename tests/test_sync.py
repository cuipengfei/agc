import io
import tempfile
import unittest
from contextlib import redirect_stdout
from pathlib import Path

from src.agc_sync import cli, pull
from src.agc_sync.manifest import Entry
from src.agc_sync.policy import redact
from src.agc_sync.transfer import write_atomic


class SyncTests(unittest.TestCase):
    def test_pull_redacts_credentials_but_keeps_env_names(self):
        source = (
            'url = "https://mcp.example.test/mcp?apiKey=ctx7sk-real-secret"\n'
            'env_key = "OPENAI_API_KEY"\n'
            'Authorization = "Bearer real-secret"\n'
        )
        output, count = redact(source)
        self.assertEqual(count, 2)
        self.assertIn("apiKey=<REDACTED>", output)
        self.assertIn('env_key = "OPENAI_API_KEY"', output)
        self.assertIn('Authorization = "Bearer <REDACTED>"', output)
        self.assertNotIn("real-secret", output)

    def test_pull_redacts_excluded_umans_extension_path(self):
        source = "  - /home/tester/.omp/agent/extensions/umans-status.ts\n"

        output, count = redact(source)

        self.assertEqual(count, 1)
        self.assertEqual(output, "  - <REDACTED>\n")

    def test_pull_does_not_preserve_existing_repo_secret(self):
        source = 'apiKey = "source-secret"\n'
        output, count = redact(source)
        self.assertEqual(count, 1)
        self.assertIn('<REDACTED>', output)
        self.assertNotIn('source-secret', output)

    def test_pull_redacts_standalone_token_literal(self):
        source = '"--api-key",\n"ctx7sk-real-secret-value"\n'
        output, count = redact(source)
        self.assertEqual(count, 1)
        self.assertIn('"--api-key"', output)
        self.assertIn('"<REDACTED>"', output)
        self.assertNotIn("real-secret", output)

    def test_pull_keeps_json_object_value_under_sensitive_key(self):
        source = (
            '"env": {\n'
            '  "CONTEXT7_API_KEY": {\n'
            '    "env": "CONTEXT7_API_KEY"\n'
            '  }\n'
            '}\n'
        )
        output, count = redact(source)
        self.assertEqual(count, 0)
        self.assertEqual(output, source)

    def test_pull_redacts_firecrawl_path_token(self):
        source = '"url": "https://mcp.firecrawl.dev/fc-0123456789abcdef0123456789abcdef/v2/mcp"\n'
        output, count = redact(source)
        self.assertEqual(count, 1)
        self.assertEqual(
            output,
            '"url": "https://mcp.firecrawl.dev/<REDACTED>/v2/mcp"\n',
        )
        self.assertNotIn("0123456789abcdef0123456789abcdef", output)

    def test_atomic_write_updates_file(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "config.txt"
            write_atomic(path, b"new")
            self.assertEqual(path.read_bytes(), b"new")

    def test_pull_run_updates_repository_from_entry(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / "source.txt"
            repository = root / "repo.txt"
            source.write_text("value = 1\n", encoding="utf-8")
            entry = Entry("test", source, repository, False, False, frozenset())

            self.assertEqual(pull.run([entry]), 0)
            self.assertEqual(repository.read_text(encoding="utf-8"), "value = 1\n")

    def test_status_reports_pull_direction(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / "source.txt"
            repository = root / "repo.txt"
            source.write_text("source\n", encoding="utf-8")
            entry = Entry("test", source, repository, False, False, frozenset())
            output = io.StringIO()

            with redirect_stdout(output):
                self.assertEqual(cli.status([entry]), 0)

            self.assertIn("pull: would-update", output.getvalue())
            self.assertNotIn("push", output.getvalue())

    def test_diff_reports_repository_and_source_difference(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / "source.txt"
            repository = root / "repo.txt"
            source.write_text("source\n", encoding="utf-8")
            repository.write_text("repo\n", encoding="utf-8")
            entry = Entry("test", source, repository, False, False, frozenset())
            output = io.StringIO()

            with redirect_stdout(output):
                self.assertEqual(cli.diff([entry]), 0)

            self.assertIn("---", output.getvalue())
            self.assertIn("+++", output.getvalue())
            self.assertIn("source", output.getvalue())
            self.assertIn("repo", output.getvalue())

    def test_sync_plan_prepares_pull_bytes(self):
        from src.agc_sync.sync_plan import prepare_pull

        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / "source.txt"
            repository = root / "repo.txt"
            source.write_text("value = 1\n", encoding="utf-8")
            repository.write_text("value = 2\n", encoding="utf-8")
            entry = Entry("test", source, repository, False, False, frozenset())

            self.assertEqual(prepare_pull(entry, source), (b"value = 1\n", 0))

    def test_manifest_pull_helper_returns_named_file_pair(self):
        from src.agc_sync.manifest import iter_pull_files

        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / "source.txt"
            repository = root / "repo.txt"
            source.write_text("source\n", encoding="utf-8")
            repository.write_text("repo\n", encoding="utf-8")
            entry = Entry("test", source, repository, False, False, frozenset())

            pull_pair = next(iter(iter_pull_files(entry)))
            self.assertEqual((pull_pair.source, pull_pair.destination), (source, repository))

    def test_directory_entry_reports_missing_when_source_absent(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            entry = Entry(
                "dir-entry", root / "absent", root / "repo", False, True, frozenset()
            )
            output = io.StringIO()

            with redirect_stdout(output):
                self.assertEqual(pull.run([entry]), 0)

            self.assertIn("missing=1", output.getvalue())

    def test_directory_entry_reports_no_missing_when_source_empty(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / "present"
            source.mkdir()
            entry = Entry(
                "dir-entry", source, root / "repo", False, True, frozenset()
            )
            output = io.StringIO()

            with redirect_stdout(output):
                self.assertEqual(pull.run([entry]), 0)

            self.assertIn("missing=0", output.getvalue())

    def test_diff_reports_missing_directory_instead_of_reading_it(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            repository = root / "repo"
            repository.mkdir()
            (repository / "a.json").write_text("{}", encoding="utf-8")
            entry = Entry(
                "dir-entry", root / "absent", repository, False, True, frozenset()
            )
            output = io.StringIO()

            with redirect_stdout(output):
                self.assertEqual(cli.diff([entry]), 0)

            self.assertIn("missing", output.getvalue())


if __name__ == "__main__":
    unittest.main()
