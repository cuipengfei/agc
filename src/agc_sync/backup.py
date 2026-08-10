"""Backups for files overwritten by push."""

from __future__ import annotations

import shutil
from datetime import datetime
from pathlib import Path


BACKUP_ROOT = Path.home() / ".agc-backups"


def new_run_root() -> Path:
    return BACKUP_ROOT / "sync-runs" / datetime.now().strftime("%Y%m%d-%H%M%S")


def backup_target(path: Path, run_root: Path) -> None:
    if not path.exists():
        return
    try:
        relative = path.relative_to(Path.home())
    except ValueError:
        relative = Path("outside-home") / path.name
    destination = run_root / relative
    destination.parent.mkdir(parents=True, exist_ok=True)
    if path.is_file():
        shutil.copy2(path, destination)
