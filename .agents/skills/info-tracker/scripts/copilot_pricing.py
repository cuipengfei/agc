import difflib
import http.client
import tempfile
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path


def _write_baseline(path: Path, content: bytes) -> None:
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(dir=path.parent, delete=False) as output:
            temporary = Path(output.name)
            output.write(content)
        temporary.replace(path)
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)


def _archive_baseline(path: Path, content: bytes) -> None:
    timestamp = datetime.now(timezone.utc)
    while True:
        archive = path.with_name(f"{path.name}.{timestamp:%Y%m%d-%H%M%S}")
        try:
            output = archive.open("xb")
        except FileExistsError:
            # 同秒多次变化也保留每份快照。
            timestamp += timedelta(seconds=1)
            continue
        with output:
            output.write(content)
        return


def collect(state_dir: Path, config) -> dict:
    changes = []
    errors = []
    for index, document in enumerate(config):
        name = f"document #{index + 1}"
        try:
            name = document["name"]
            if (
                not isinstance(name, str)
                or not name
                or Path(name).name != name
                or name in (".", "..")
            ):
                raise ValueError("document name must be a nonempty filename")
            url = document["url"]
            request = urllib.request.Request(
                url, headers={"User-Agent": "info-tracker/1.0"}
            )
            with urllib.request.urlopen(request, timeout=30) as response:
                content = response.read()
            current_text = content.decode("utf-8")

            state_dir.mkdir(parents=True, exist_ok=True)
            baseline = state_dir / f"{name}.baseline"
            if not baseline.exists():
                _write_baseline(baseline, content)
                continue
            previous = baseline.read_bytes()
            if previous == content:
                continue

            lines = difflib.unified_diff(
                previous.decode("utf-8").splitlines(keepends=True),
                current_text.splitlines(keepends=True),
                fromfile=baseline.name,
                tofile=f"{name}.current",
            )
            diff = "".join(
                line if line.endswith("\n") else line + "\n\\ No newline at end of file\n"
                for line in lines
            )
            _archive_baseline(baseline, previous)
            _write_baseline(baseline, content)
            changes.append({"document": name, "url": url, "diff": diff})
        except (OSError, ValueError, http.client.HTTPException) as error:
            errors.append(f"{name}: {error}")

    return {
        "status": "error" if errors else "ok",
        "changes": changes,
        "errors": errors,
    }
