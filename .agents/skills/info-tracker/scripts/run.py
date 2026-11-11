import json
from datetime import datetime, timezone
from pathlib import Path

import copilot_pricing
import github_copilot_changelog
import opencode_pricing
import release


SKILL_ROOT = Path(__file__).resolve().parent.parent


def main(root: Path = SKILL_ROOT) -> int:
    root = root.resolve()
    config = json.loads((root / "sources.json").read_text(encoding="utf-8"))
    run_at = datetime.now(timezone.utc)
    result_path = root / "state" / "runs" / f"{run_at:%Y%m%dT%H%M%S.%fZ}.json"
    sources = {}
    for name, state_name, collector in (
        ("releases", "release-tracker", release.collect),
        (
            "github_copilot_pricing",
            "github-copilot-pricing-monitor",
            copilot_pricing.collect,
        ),
        (
            "opencode_go_pricing",
            "opencode-go-pricing-monitor",
            opencode_pricing.collect,
        ),
        (
            "github_copilot_changelog",
            "github-copilot-changelog",
            github_copilot_changelog.collect,
        ),
    ):
        if name in config:
            sources[name] = collector(root / "state" / state_name, config[name])

    payload = {
        "run_at": run_at.isoformat(),
        "result_path": str(result_path),
        "sources": sources,
    }
    output = json.dumps(payload, ensure_ascii=False, indent=2) + "\n"
    print(output, end="")
    result_path.parent.mkdir(parents=True, exist_ok=True)
    result_path.write_text(output, encoding="utf-8")
    return 1 if any(source["errors"] for source in sources.values()) else 0


if __name__ == "__main__":
    raise SystemExit(main())
