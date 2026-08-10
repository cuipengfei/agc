#!/usr/bin/env python3
"""双向同步 Agent 配置；pull 不带回凭据，push 保留目标凭据。"""

from __future__ import annotations

import argparse
import sys
from difflib import unified_diff
from pathlib import Path

from .manifest import Entry, iter_pull_files, iter_push_files, load_entries
from .policy import redact
from .sync_plan import prepare_pull, prepare_push
from .pull import run as run_pull
from .push import run as run_push
from .transfer import read_text, same_bytes, resolved_target


def _status_line(mode: str, entry: Entry, left: Path, right: Path) -> str:
    if mode == "pull":
        source, repo = left, right
        if not source.exists():
            return f"{mode}: missing: {entry.name}: {source}"
        expected, _ = prepare_pull(entry, source)
        comparison = repo
    else:
        repo, source = left, resolved_target(right)
        if not repo.exists():
            return f"{mode}: missing: {entry.name}: {repo}"
        expected, _ = prepare_push(entry, repo, source)
        comparison = source
    if same_bytes(comparison, expected):
        return f"{mode}: unchanged: {entry.name}: {comparison}"
    return f"{mode}: would-update: {entry.name}: {comparison}"


def status(entries: list[Entry] | None = None) -> int:
    """Report both directions without writing either side."""
    entries = load_entries() if entries is None else entries
    for mode, iterator in (("pull", iter_pull_files), ("push", iter_push_files)):
        for entry in entries:
            for pair in iterator(entry):
                print(_status_line(mode, entry, pair.source, pair.destination))
    return 0


def _diff_text(entry: Entry, mode: str, left: Path, right: Path) -> tuple[str, str]:
    if mode == "pull":
        source, repo = left, right
        source_text = (
            prepare_pull(entry, source)[0].decode("utf-8") if source.exists() else ""
        )
        repo_text = read_text(repo) if repo.exists() else ""
        return repo_text, source_text

    repo, target = left, resolved_target(right)
    repo_text = read_text(repo) if repo.exists() else ""
    target_text = read_text(target) if target.exists() else ""
    if entry.protected:
        target_text, _ = redact(target_text)
    return target_text, repo_text


def diff(entries: list[Entry] | None = None) -> int:
    """Show credential-safe diffs without writing either side."""
    entries = load_entries() if entries is None else entries
    for mode, iterator in (("pull", iter_pull_files), ("push", iter_push_files)):
        for entry in entries:
            for pair in iterator(entry):
                source, target = _diff_text(entry, mode, pair.source, pair.destination)
                if source == target:
                    continue
                from_name = str(
                    pair.destination if mode == "pull" else resolved_target(pair.destination)
                )
                to_name = str(pair.source)
                print(f"--- {from_name} ({mode})")
                print(f"+++ {to_name} ({mode})")
                print(
                    "".join(
                        unified_diff(
                            source.splitlines(keepends=True),
                            target.splitlines(keepends=True),
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
        choices=("pull", "push", "status", "diff"),
        help="同步或只读检查命令",
    )
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args(argv)

    if args.command == "pull":
        return run_pull(dry_run=args.dry_run)
    if args.command == "push":
        return run_push(dry_run=args.dry_run)
    if args.dry_run:
        parser.error("--dry-run 只适用于 pull/push")
    if args.command == "status":
        return status()
    return diff()


if __name__ == "__main__":
    try:
        raise SystemExit(main(sys.argv[1:]))
    except (OSError, UnicodeError, ValueError, RuntimeError) as exc:
        print(str(exc), file=sys.stderr)
        raise SystemExit(2)
