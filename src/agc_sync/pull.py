"""Pull source configuration into the repository."""

from __future__ import annotations

from collections import Counter
from pathlib import Path

from .manifest import Entry, iter_pull_files, load_entries
from .sync_plan import prepare_pull
from .transfer import same_bytes, write_atomic


def run(entries: list[Entry] | None = None, dry_run: bool = False) -> int:
    entries = load_entries() if entries is None else entries
    counters: Counter[str] = Counter()
    protected = 0

    for entry in entries:
        for pair in iter_pull_files(entry):
            status, count = _process_file(entry, pair.source, pair.destination, dry_run)
            counters[status] += 1
            protected += count
            if status in {"updated", "would-update"}:
                print(f"pull: {status}: {entry.name}: {pair.destination}")
            elif status == "missing":
                print(f"pull: missing: {entry.name}: {pair.source}")

    print(
        f"pull: updated={counters['updated']} "
        f"would_update={counters['would-update']} "
        f"unchanged={counters['unchanged']} missing={counters['missing']} "
        f"protected_slots={protected}"
    )
    return 0


def _process_file(
    entry: Entry, source: Path, destination: Path, dry_run: bool
) -> tuple[str, int]:
    if not source.exists():
        return "missing", 0
    output_bytes, protected_count = prepare_pull(entry, source)

    if same_bytes(destination, output_bytes):
        return "unchanged", protected_count
    if dry_run:
        return "would-update", protected_count
    write_atomic(destination, output_bytes)
    return "updated", protected_count
