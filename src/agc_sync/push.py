"""Push repository configuration to source locations."""

from __future__ import annotations

from collections import Counter
from pathlib import Path

from .backup import backup_target, new_run_root
from .manifest import Entry, iter_push_files, load_entries
from .sync_plan import prepare_push
from .transfer import resolved_target, same_bytes, write_atomic


def run(entries: list[Entry] | None = None, dry_run: bool = False) -> int:
    entries = load_entries() if entries is None else entries
    run_root = new_run_root()
    counters: Counter[str] = Counter()
    protected = 0

    for entry in entries:
        for pair in iter_push_files(entry):
            status, count = _process_file(
                entry, pair.source, resolved_target(pair.destination), dry_run, run_root
            )
            counters[status] += 1
            protected += count
            if status in {"updated", "would-update"}:
                print(f"push: {status}: {entry.name}: {pair.source}")
            elif status == "missing":
                print(f"push: missing: {entry.name}: {pair.source}")

    if not dry_run and counters["updated"]:
        print(f"push backup: {run_root}")
    print(
        f"push: updated={counters['updated']} "
        f"would_update={counters['would-update']} "
        f"unchanged={counters['unchanged']} missing={counters['missing']} "
        f"protected_slots={protected}"
    )
    return 0


def _process_file(
    entry: Entry,
    repository: Path,
    destination: Path,
    dry_run: bool,
    run_root: Path,
) -> tuple[str, int]:
    if not repository.exists():
        return "missing", 0
    output_bytes, protected_count = prepare_push(entry, repository, destination)

    if same_bytes(destination, output_bytes):
        return "unchanged", protected_count
    if dry_run:
        return "would-update", protected_count
    backup_target(destination, run_root)
    write_atomic(destination, output_bytes)
    return "updated", protected_count
