#!/usr/bin/env python3
"""单向同步 Agent 配置：把来源配置 pull 进仓库，凭据不入库。"""

from __future__ import annotations

import argparse
import sys
from difflib import unified_diff
from pathlib import Path

from .manifest import Entry, iter_pull_files, load_entries
from .sync_plan import prepare_pull
from .pull import run as run_pull
from .transfer import read_text, same_bytes


def _status_line(entry: Entry, source: Path, repo: Path) -> str:
    if not source.exists():
        return f"pull: missing: {entry.name}: {source}"
    expected, _ = prepare_pull(entry, source)
    if same_bytes(repo, expected):
        return f"pull: unchanged: {entry.name}: {repo}"
    return f"pull: would-update: {entry.name}: {repo}"


def status(entries: list[Entry] | None = None) -> int:
    """Report what pull would change without writing either side."""
    entries = load_entries() if entries is None else entries
    for entry in entries:
        for pair in iter_pull_files(entry):
            print(_status_line(entry, pair.source, pair.destination))
    return 0


def _diff_text(entry: Entry, source: Path, repo: Path) -> tuple[str, str]:
    source_text = (
        prepare_pull(entry, source)[0].decode("utf-8") if source.is_file() else ""
    )
    repo_text = read_text(repo) if repo.is_file() else ""
    return repo_text, source_text


def diff(entries: list[Entry] | None = None) -> int:
    """Show credential-safe diffs without writing either side."""
    entries = load_entries() if entries is None else entries
    for entry in entries:
        for pair in iter_pull_files(entry):
            if entry.directory and not pair.source.exists():
                print(f"pull: missing: {entry.name}: {pair.source}")
                continue
            repo_text, source_text = _diff_text(entry, pair.source, pair.destination)
            if repo_text == source_text:
                continue
            from_name = str(pair.destination)
            to_name = str(pair.source)
            print(f"--- {from_name} (pull)")
            print(f"+++ {to_name} (pull)")
            print(
                "".join(
                    unified_diff(
                        repo_text.splitlines(keepends=True),
                        source_text.splitlines(keepends=True),
                        fromfile=from_name,
                        tofile=to_name,
                    )
                ),
                end="",
            )
    return 0


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "command",
        choices=("pull", "status", "diff"),
        help="同步或只读检查命令",
    )
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args(argv)

    if args.command == "pull":
        return run_pull(dry_run=args.dry_run)
    if args.dry_run:
        parser.error("--dry-run 只适用于 pull")
    if args.command == "status":
        return status()
    return diff()


if __name__ == "__main__":
    try:
        raise SystemExit(main(sys.argv[1:]))
    except (OSError, UnicodeError, ValueError, RuntimeError) as exc:
        print(str(exc), file=sys.stderr)
        raise SystemExit(2)
