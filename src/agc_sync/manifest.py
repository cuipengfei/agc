"""Manifest loading and source/repository path mapping."""

from __future__ import annotations

import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable


ROOT = Path(__file__).resolve().parents[2]
MANIFEST_PATH = ROOT / "manifest.json"

IGNORED_NAMES = {
    ".git",
    "__pycache__",
    "node_modules",
    "cache",
    "caches",
    "logs",
    "log",
    "run",
    "sessions",
    "terminal-sessions",
    "profiles",
    "puppeteer",
}
IGNORED_SUFFIXES = (".bak", ".backup", ".db", ".sqlite", ".db-shm", ".db-wal")


@dataclass(frozen=True)
class Entry:
    name: str
    source: Path
    repo: Path
    protected: bool
    directory: bool
    excluded: frozenset[str]


@dataclass(frozen=True)
class FilePair:
    source: Path
    destination: Path


def load_entries() -> list[Entry]:
    data = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    if data.get("version") != 1:
        raise RuntimeError("不支持的 manifest 版本")

    entries: list[Entry] = []
    for raw in data["entries"]:
        entries.append(
            Entry(
                name=raw["name"],
                source=Path(os.path.expanduser(raw["source"])),
                repo=ROOT / raw["repo"],
                protected=bool(raw.get("protected", False)),
                directory=bool(raw.get("directory", False)),
                excluded=frozenset(raw.get("exclude", [])),
            )
        )
    return entries


def is_ignored(path: Path) -> bool:
    return any(part in IGNORED_NAMES for part in path.parts) or path.name.endswith(
        IGNORED_SUFFIXES
    )


def _iter_files(entry: Entry, source: Path, destination: Path) -> Iterable[FilePair]:
    if not entry.directory:
        yield FilePair(source, destination)
        return
    if not source.exists():
        return
    for path in sorted(source.rglob("*")):
        relative = path.relative_to(source)
        if (
            not path.is_file()
            or path.is_symlink()
            or is_ignored(path)
            or relative.as_posix() in entry.excluded
        ):
            continue
        yield FilePair(path, destination / relative)


def iter_pull_files(entry: Entry) -> Iterable[FilePair]:
    yield from _iter_files(entry, entry.source, entry.repo)


def iter_push_files(entry: Entry) -> Iterable[FilePair]:
    yield from _iter_files(entry, entry.repo, entry.source)
