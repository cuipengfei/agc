import html
import http.client
import json
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

from release import _write_json


SOURCE = "GitHub Copilot changelog"
FIELDS = "id,date_gmt,modified_gmt,link,title,content"


def _timestamp(value: str) -> datetime:
    return datetime.fromisoformat(value.removesuffix("Z")).replace(tzinfo=timezone.utc)


def _get_json(url: str):
    request = urllib.request.Request(url, headers={"User-Agent": "info-tracker/1.0"})
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.load(response), response.headers


def _label_id(api_url: str, label: str) -> int:
    taxonomy_url = api_url.rsplit("/", 1)[0] + "/label"
    labels, _ = _get_json(taxonomy_url + "?" + urllib.parse.urlencode({"slug": label}))
    if not isinstance(labels, list) or any(not isinstance(item, dict) for item in labels):
        raise ValueError("label response must be an array of objects")
    matches = [item for item in labels if item.get("slug") == label]
    if len(matches) != 1 or not isinstance(matches[0].get("id"), int):
        raise ValueError(f"label {label!r} did not resolve to one taxonomy entry")
    return matches[0]["id"]


def _article(item) -> dict:
    if not isinstance(item, dict):
        raise ValueError("changelog entry must be an object")
    title = item.get("title")
    content = item.get("content")
    if not isinstance(title, dict) or not isinstance(content, dict):
        raise ValueError("changelog entry title and content must be objects")
    title = title.get("rendered")
    content = content.get("rendered")
    if not all(
        isinstance(item.get(field), str) and item[field]
        for field in ("date_gmt", "modified_gmt", "link")
    ) or not isinstance(title, str) or not isinstance(content, str):
        raise ValueError("changelog entry is missing required fields")
    if isinstance(item.get("id"), bool) or not isinstance(item.get("id"), int):
        raise ValueError("changelog entry must have an integer id")
    published_at = _timestamp(item["date_gmt"]).isoformat().replace("+00:00", "Z")
    return {
        "id": item["id"],
        "title": html.unescape(title),
        "published_at": published_at,
        "modified_at": _timestamp(item["modified_gmt"]).isoformat().replace("+00:00", "Z"),
        "url": item["link"],
        "content": content,
    }


def _fetch_articles(api_url: str, label_id: int, cutoff: datetime) -> dict:
    query = {
        "label": label_id,
        "after": cutoff.isoformat(),
        "modified_after": cutoff.isoformat(),
        "per_page": 100,
        "orderby": "date",
        "order": "desc",
        "_fields": FIELDS,
    }
    items, headers = _get_json(f"{api_url}?{urllib.parse.urlencode({**query, 'page': 1})}")
    if not isinstance(items, list):
        raise ValueError("changelog response must be an array")
    pages = int(headers.get("X-WP-TotalPages", "1"))
    for page in range(2, pages + 1):
        more, _ = _get_json(f"{api_url}?{urllib.parse.urlencode({**query, 'page': page})}")
        if not isinstance(more, list):
            raise ValueError("changelog response must be an array")
        items.extend(more)
    articles = {}
    for item in items:
        article = _article(item)
        key = str(article["id"])
        if key in articles and articles[key] != article:
            raise ValueError(f"conflicting entries for changelog id {key}")
        articles[key] = article
    return articles


def collect(state_dir: Path, config) -> dict:
    result = {"status": "ok", "changes": [], "errors": []}
    try:
        days = config["backfill_days"]
        if isinstance(days, bool) or not isinstance(days, int) or days < 1:
            raise ValueError("backfill_days must be a positive integer")
        state_path = state_dir / "state.json"
        if state_path.exists():
            state = json.loads(state_path.read_text(encoding="utf-8"))
            if (
                not isinstance(state, dict)
                or not isinstance(state.get("articles"), dict)
                or not isinstance(state.get("cutoff"), str)
            ):
                raise ValueError("state.json must contain cutoff and an articles object")
            cutoff = _timestamp(state["cutoff"])
        else:
            state = {"articles": {}}
            cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        current = _fetch_articles(
            config["api_url"], _label_id(config["api_url"], config["label"]), cutoff
        )
        current = {
            key: article
            for key, article in current.items()
            if _timestamp(article["published_at"]) >= cutoff
            or _timestamp(article["modified_at"]) >= cutoff
        }
        for key, article in sorted(
            current.items(), key=lambda pair: (pair[1]["published_at"], int(pair[0]))
        ):
            previous = state["articles"].get(key)
            if previous is None and _timestamp(article["published_at"]) >= cutoff:
                result["changes"].append({"change_type": "added", **article})
            elif previous is not None and previous != article:
                result["changes"].append({"change_type": "modified", **article})
        _write_json(
            state_path,
            {
                "cutoff": cutoff.isoformat().replace("+00:00", "Z"),
                "articles": {**state["articles"], **current},
            },
        )
    except (OSError, ValueError, http.client.HTTPException) as error:
        result["status"] = "error"
        result["errors"] = [f"{SOURCE}: {error}"]
    return result
