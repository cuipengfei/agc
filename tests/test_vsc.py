import importlib.util
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch


spec = importlib.util.spec_from_file_location(
    "vsc", Path(__file__).resolve().parents[1] / "agents" / "vsc.py"
)
vsc = importlib.util.module_from_spec(spec)
spec.loader.exec_module(vsc)


class VscTests(unittest.TestCase):
    def test_directory_url_keeps_slashes_readable(self):
        directory = Path(__file__).resolve().parents[1]
        with patch.object(sys, "argv", ["vsc", str(directory)]), patch.object(
            vsc.subprocess, "run"
        ) as run:
            run.return_value.returncode = 0
            self.assertEqual(vsc.main(), 0)

        run.assert_called_once_with(
            ["/usr/bin/wslview", "-s", f"http://localhost:6688/?folder={directory}"]
        )

    def test_directory_url_encodes_special_characters(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            directory = Path(temporary_directory) / "space #?&%+"
            directory.mkdir()
            with patch.object(sys, "argv", ["vsc", str(directory)]), patch.object(
                vsc.subprocess, "run"
            ) as run:
                run.return_value.returncode = 0
                self.assertEqual(vsc.main(), 0)

            run.assert_called_once_with(
                [
                    "/usr/bin/wslview",
                    "-s",
                    f"http://localhost:6688/?folder={temporary_directory}/space+%23%3F%26%25%2B",
                ]
            )
