"""Credential detection, redaction, and credential-preserving overlays."""

from __future__ import annotations

import re
from dataclasses import dataclass


SENSITIVE_KEY = re.compile(
    r"(?<![A-Za-z0-9])"
    r"(?:api[_-]?key|access[_-]?key|client[_-]?secret|password|passwd|"
    r"token|secret|authorization|bearer|cookie|oauth|private[_-]?key|"
    r"x-session-id)"
    r"(?![A-Za-z0-9])",
    re.IGNORECASE,
)
SENSITIVE_QUERY = re.compile(
    r"(?P<prefix>[?&])"
    r"(?P<name>[A-Za-z0-9_.-]*(?:key|token|secret|auth|password|credential)[A-Za-z0-9_.-]*)"
    r"(?P<equals>=)(?P<quote>['\"]?)(?P<value>[^&\s'\"]+)",
    re.IGNORECASE,
)
SENSITIVE_ASSIGNMENT = re.compile(
    r"(?P<prefix>['\"]?(?P<name>"
    r"api[_-]?key|access[_-]?key|client[_-]?secret|password|passwd|token|secret|"
    r"authorization|bearer|cookie|oauth|private[_-]?key|x-session-id"
    r")['\"]?\s*[:=]\s*['\"]?)(?P<value>(?![\[{])[^'\"\s,}\]]+)",
    re.IGNORECASE,
)
CLI_SECRET = re.compile(
    r"(?P<prefix>--(?:api-key|access-key|token|secret|password)\s+['\"]?)"
    r"(?P<value>[^'\"\s,\]]+)",
    re.IGNORECASE,
)
AUTH_VALUE = re.compile(
    r"(?P<prefix>['\"]?Authorization['\"]?\s*[:=]\s*['\"]?)"
    r"(?P<value>(?:Bearer|Basic)\s+[^'\" ,}]+|[^'\" ,}]+)",
    re.IGNORECASE,
)
SECRET_LITERAL = re.compile(
    r"(?:ctx7sk-[A-Za-z0-9_-]{8,}|sk-[A-Za-z0-9_-]{12,}|"
    r"gh[pousr]_[A-Za-z0-9_-]{12,}|xox[baprs]-[A-Za-z0-9-]{10,}|"
    r"fc-[0-9a-fA-F]{32}|"
    r"-----BEGIN .*PRIVATE KEY-----)",
    re.IGNORECASE,
)
REDACTED = "<REDACTED>"
EXCLUDED_USER_PATH = re.compile(
    r"(?P<prefix>(?:/|~/)[^\"'\s]*/umans-status\.ts)"
)
SAFE_VALUE = re.compile(
    r"^(?:<REDACTED>|REDACTED|\$\{[A-Z][A-Z0-9_]*\}|"
    r"(?:Bearer|Basic)\s+<REDACTED>|['\"]?['\"]?|null|none)$",
    re.IGNORECASE,
)


@dataclass(frozen=True)
class Slot:
    key: str
    start: int
    end: int
    value: str


def _slots_for_line(line: str) -> list[Slot]:
    candidates: list[tuple[int, int, int, Slot]] = []
    for priority, (regex, prefix) in enumerate(
        (
            (SENSITIVE_QUERY, "query"),
            (CLI_SECRET, "cli"),
            (AUTH_VALUE, "authorization"),
            (SENSITIVE_ASSIGNMENT, "assignment"),
        )
    ):
        for match in regex.finditer(line):
            value = match.group("value")
            name = match.groupdict().get("name") or prefix
            slot = Slot(
                f"{prefix}:{name.lower()}",
                match.start("value"),
                match.end("value"),
                value,
            )
            candidates.append((slot.start, -slot.end, priority, slot))

    slots: list[Slot] = []
    occupied: list[tuple[int, int]] = []
    for start, _, _, slot in sorted(
        candidates, key=lambda item: (item[0], item[1], item[2])
    ):
        if any(start < end and slot.end > begin for begin, end in occupied):
            continue
        slots.append(slot)
        occupied.append((slot.start, slot.end))
    return slots


def _all_slots(text: str) -> list[tuple[int, Slot]]:
    return [
        (line_no, slot)
        for line_no, line in enumerate(text.splitlines())
        for slot in _slots_for_line(line)
    ]


def _is_actual_secret(value: str) -> bool:
    stripped = value.strip()
    if SAFE_VALUE.fullmatch(stripped):
        return False
    if re.fullmatch(r"[A-Z][A-Z0-9_]*", stripped):
        return False
    if re.fullmatch(
        r"(?:true|false|null|none|[-+]?\d+(?:\.\d+)?)",
        stripped,
        re.IGNORECASE,
    ):
        return False
    if SECRET_LITERAL.search(value):
        return True
    return bool(stripped)


def _replace_slots(text: str, replacements: dict[tuple[int, str], str]) -> str:
    output: list[str] = []
    for line_no, line in enumerate(text.splitlines(keepends=True)):
        newline = "\n" if line.endswith("\n") else ""
        body = line[:-1] if newline else line
        for slot in sorted(_slots_for_line(body), key=lambda item: item.start, reverse=True):
            replacement = replacements.get((line_no, slot.key))
            if replacement is not None:
                body = body[: slot.start] + replacement + body[slot.end :]
        output.append(body + newline)

    return "".join(output)

def redact(text: str) -> tuple[str, int]:
    replacements: dict[tuple[int, str], str] = {}
    count = 0
    for line_no, slot in _all_slots(text):
        if not _is_actual_secret(slot.value):
            continue
        replacement = REDACTED
        if slot.key.startswith("authorization:") and slot.value.lower().startswith(
            ("bearer ", "basic ")
        ):
            replacement = slot.value.split(None, 1)[0] + " " + REDACTED
        replacements[(line_no, slot.key)] = replacement
        count += 1

    output = _replace_slots(text, replacements)
    literal_count = 0
    redacted_lines: list[str] = []
    for line in output.splitlines(keepends=True):
        newline = "\n" if line.endswith("\n") else ""
        body = line[:-1] if newline else line
        path_matches = list(EXCLUDED_USER_PATH.finditer(body))
        if path_matches:
            for match in reversed(path_matches):
                start, end = match.span("prefix")
                body = body[:start] + REDACTED + body[end:]
            literal_count += len(path_matches)
        matches = list(SECRET_LITERAL.finditer(body))
        if matches:
            body = SECRET_LITERAL.sub(REDACTED, body)
            literal_count += len(matches)
        redacted_lines.append(body + newline)
    return "".join(redacted_lines), count + literal_count


def overlay_target_credentials(repo_text: str, target_text: str) -> tuple[str, int]:
    target_slots: dict[str, list[Slot]] = {}
    for _, slot in _all_slots(target_text):
        if _is_actual_secret(slot.value):
            target_slots.setdefault(slot.key, []).append(slot)

    replacements: dict[tuple[int, str], str] = {}
    used: dict[str, int] = {}
    for line_no, slot in _all_slots(repo_text):
        candidates = target_slots.get(slot.key, [])
        index = used.get(slot.key, 0)
        if index < len(candidates):
            replacements[(line_no, slot.key)] = candidates[index].value
            used[slot.key] = index + 1

    missing = sorted(set(target_slots) - set(used))
    if missing:
        raise RuntimeError(
            "仓库结构缺少目标凭据对应字段，拒绝 push：" + ", ".join(missing)
        )

    output = _replace_slots(repo_text, replacements)
    output_lines = output.splitlines(keepends=True)
    target_lines = target_text.splitlines(keepends=True)
    preserved = sum(len(values) for values in target_slots.values())

    for line_no, line in enumerate(output_lines):
        if REDACTED not in line or line_no >= len(target_lines):
            continue
        target_literals = SECRET_LITERAL.findall(target_lines[line_no])
        if not target_literals:
            continue
        iterator = iter(target_literals)
        output_lines[line_no] = re.sub(
            re.escape(REDACTED),
            lambda _: next(iterator, REDACTED),
            line,
            count=len(target_literals),
        )
        preserved += len(target_literals)

    return "".join(output_lines), preserved


def scan_repo_secrets(text: str) -> list[str]:
    findings: list[str] = []
    for line_no, line in enumerate(text.splitlines(), 1):
        if SECRET_LITERAL.search(line):
            findings.append(f"line {line_no} literal-secret")
    for line_no, slot in _all_slots(text):
        if _is_actual_secret(slot.value):
            findings.append(f"line {line_no + 1} {slot.key}")
    return findings
