"""File comparison, UTF-8 reads, atomic writes, and target resolution."""

from __future__ import annotations

import os
import shutil
import tempfile
from pathlib import Path


def read_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except UnicodeDecodeError as exc:
        raise RuntimeError(f"非 UTF-8 文件，拒绝自动处理：{path} ({exc})") from exc
    except FileNotFoundError as exc:
        raise RuntimeError(f"文件不存在：{path}") from exc


def same_bytes(path: Path, content: bytes) -> bool:
    try:
        return path.read_bytes() == content
    except FileNotFoundError:
        return False


def write_atomic(path: Path, content: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temporary = tempfile.mkstemp(prefix=f".{path.name}.agc-", dir=path.parent)
    try:
        with os.fdopen(fd, "wb") as handle:
            handle.write(content)
            handle.flush()
            os.fsync(handle.fileno())
        if path.exists():
            shutil.copymode(path, temporary)
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)
