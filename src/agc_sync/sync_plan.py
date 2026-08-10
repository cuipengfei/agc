"""Prepare credential-safe bytes for synchronization."""

from __future__ import annotations

from pathlib import Path

from .manifest import Entry
from .policy import overlay_target_credentials, redact, scan_repo_secrets
from .transfer import read_text


def prepare_pull(entry: Entry, source: Path) -> tuple[bytes, int]:
    content = source.read_bytes()
    if not entry.protected:
        return content, 0
    output, count = redact(content.decode("utf-8"))
    return output.encode("utf-8"), count


def prepare_push(entry: Entry, repository: Path, target: Path) -> tuple[bytes, int]:
    content = repository.read_bytes()
    if not entry.protected:
        return content, 0
    text = content.decode("utf-8")
    findings = scan_repo_secrets(text)
    if findings:
        raise RuntimeError(
            f"仓库文件包含未脱敏凭据，拒绝 push：{repository} "
            + ", ".join(findings)
        )
    target_text = read_text(target) if target.exists() else ""
    output, count = overlay_target_credentials(text, target_text)
    return output.encode("utf-8"), count
