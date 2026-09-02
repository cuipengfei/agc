"""Prepare credential-safe bytes for pulling sources into the repository."""

from __future__ import annotations

from pathlib import Path

from .manifest import Entry
from .policy import redact


def prepare_pull(entry: Entry, source: Path) -> tuple[bytes, int]:
    content = source.read_bytes()
    if not entry.protected:
        return content, 0
    output, count = redact(content.decode("utf-8"))
    return output.encode("utf-8"), count
