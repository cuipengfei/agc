#!/usr/bin/python3

import argparse
import subprocess
from pathlib import Path
from urllib.parse import urlencode


def main() -> int:
    parser = argparse.ArgumentParser(
        prog="vsc",
        description="Open a WSL directory in VS Code Web.",
    )
    parser.add_argument("directory")
    args = parser.parse_args()

    try:
        directory = Path(args.directory).resolve(strict=True)
    except (OSError, RuntimeError) as error:
        parser.exit(1, f"vsc: {error}\n")

    if not directory.is_dir():
        parser.exit(1, f"vsc: not a directory: {args.directory}\n")

    url = "http://localhost:6688/?" + urlencode({"folder": str(directory)}, safe="/")

    try:
        return subprocess.run(["/usr/bin/wslview", "-s", url]).returncode
    except OSError as error:
        parser.exit(1, f"vsc: cannot start wslview: {error}\n")


if __name__ == "__main__":
    raise SystemExit(main())
