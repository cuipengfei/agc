import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path


def _read_json(path: Path, default):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return default


def _write_json(path: Path, value) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(f".{path.name}.tmp")
    try:
        temporary.write_text(
            json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
        temporary.replace(path)
    finally:
        temporary.unlink(missing_ok=True)


def _release_list(value) -> list:
    if not isinstance(value, list):
        raise ValueError("release response/cache must be a JSON array")
    releases = []
    seen = set()
    for item in value:
        if not isinstance(item, dict):
            raise ValueError("release entries must be JSON objects")
        if item.get("draft"):
            continue
        tag = item.get("tag_name")
        published = item.get("published_at")
        if not isinstance(tag, str) or not tag:
            raise ValueError("release is missing tag_name")
        if not isinstance(published, str) or not published:
            raise ValueError(f"release {tag} is missing published_at")
        if item.get("body") is not None and not isinstance(item["body"], str):
            raise ValueError(f"release {tag} has invalid notes")
        if tag not in seen:
            seen.add(tag)
            releases.append(item)
    return sorted(releases, key=lambda item: item["published_at"], reverse=True)


def collect(state_dir: Path, config) -> dict:
    changes = []
    errors = []
    state_path = state_dir / "state.json"
    try:
        state = _read_json(state_path, {"pairs": [], "repos": {}, "solo": []})
        if not isinstance(state, dict) or not isinstance(state.get("repos"), dict):
            raise ValueError("state.json must contain a repos object")
    except (OSError, ValueError) as exc:
        return {
            "status": "error",
            "changes": [],
            "errors": [f"{source['owner']}/{source['repo']}: {exc}" for source in config],
        }

    checked_at = datetime.now(timezone.utc).isoformat()
    for source in config:
        owner = source["owner"]
        key = source["repo"]
        repository = f"{owner}/{key}"
        cache_path = state_dir / "repos" / f"{key}.json"
        try:
            previous = state["repos"].get(key, {})
            if not isinstance(previous, dict):
                raise ValueError("repository state must be a JSON object")
            version_history = previous.get("version_history", [])
            if not isinstance(version_history, list) or any(
                not isinstance(entry, dict)
                or not isinstance(entry.get("tag"), str)
                or not entry["tag"]
                or not isinstance(entry.get("published_at"), str)
                for entry in version_history
            ):
                raise ValueError("repository version_history must contain tag and published_at strings")
            if not all(
                isinstance(previous.get(field, ""), str)
                for field in ("latest_tag", "latest_published")
            ):
                raise ValueError("repository latest_tag and latest_published must be strings")
            if previous.get("latest_published") and not previous.get("latest_tag"):
                raise ValueError("repository latest_published requires latest_tag")
            if not isinstance(previous.get("history", []), list):
                raise ValueError("repository history must be a JSON array")
            cached = []
            if key not in state["repos"]:
                cached = _release_list(_read_json(cache_path, []))
            result = subprocess.run(
                ["gh", "api", "--paginate", "--slurp", f"repos/{repository}/releases?per_page=30"],
                check=True,
                capture_output=True,
                text=True,
            )
            pages = json.loads(result.stdout)
            if not isinstance(pages, list) or any(not isinstance(page, list) for page in pages):
                raise ValueError("release response must be an array of pages")
            releases = _release_list([item for page in pages for item in page])
            if not releases:
                continue

            known_tags = {entry["tag"] for entry in version_history}
            known_tags.update(entry["tag_name"] for entry in cached)
            if previous.get("latest_tag"):
                known_tags.add(previous["latest_tag"])
            published_history = [previous.get("latest_published", "")]
            published_history.extend(entry.get("published_at", "") for entry in version_history)
            published_history.extend(entry["published_at"] for entry in cached)
            cutoff = max(published_history)
            has_baseline = bool(known_tags or cutoff)
            new_changes = []
            for item in reversed(releases):
                if (
                    has_baseline
                    and item["tag_name"] not in known_tags
                    and item["published_at"] >= cutoff
                ):
                    new_changes.append(
                        {
                            "repository": repository,
                            "tag": item["tag_name"],
                            "published_at": item["published_at"],
                            "url": item.get("html_url", ""),
                            "prerelease": item.get("prerelease", False),
                            "notes": item.get("body") or "",
                        }
                    )

            summaries = {
                entry["tag"]: entry for entry in version_history
            }
            for item in releases:
                summaries[item["tag_name"]] = {
                    "tag": item["tag_name"],
                    "published_at": item["published_at"],
                    "prerelease": item.get("prerelease", False),
                    "notes_digest": (item.get("body") or "")[:10000],
                }
            recent = sorted(
                summaries.values(), key=lambda entry: entry.get("published_at", ""), reverse=True
            )
            if len(recent) > 5:
                boundary = recent[4].get("published_at", "")
                recent = [entry for entry in recent if entry.get("published_at", "") >= boundary]
            updated = dict(previous)
            updated.update(owner=owner, repo=key, version_history=recent)
            latest = recent[0]
            if latest["published_at"] >= previous.get("latest_published", ""):
                if not isinstance(latest.get("notes_digest"), str):
                    raise ValueError("repository version_history notes_digest must be a string")
                updated.update(
                    latest_tag=latest["tag"],
                    latest_published=latest["published_at"],
                    notes_digest=latest["notes_digest"],
                )
            updated["history"] = (
                previous.get("history", [])
                + [{"checked_at": checked_at, "tag": updated["latest_tag"]}]
            )[-20:]
            next_state = dict(state)
            next_state["repos"] = {**state["repos"], key: updated}
            _write_json(cache_path, releases[:5])
            _write_json(state_path, next_state)
            state = next_state
            changes.extend(new_changes)
        except (OSError, ValueError, subprocess.SubprocessError) as exc:
            detail = getattr(exc, "stderr", None) or str(exc)
            errors.append(f"{repository}: {detail.strip()}")

    changes.sort(key=lambda item: item["published_at"])
    return {"status": "error" if errors else "ok", "changes": changes, "errors": errors}
