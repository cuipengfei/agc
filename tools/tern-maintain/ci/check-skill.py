import argparse
import sys
from pathlib import Path
from urllib.parse import unquote, urlsplit

import yaml
from markdown_it import MarkdownIt


FEATURE_HEADINGS = [
    "Sub-features",
    "How to get to it (user POV)",
    "Driving it with release scripts",
    "Gotchas",
]
DEFAULT_ROOT = Path(__file__).resolve().parents[3] / ".agents/skills/tern-font-only-deploy"


def markdown_links(tokens):
    for token in tokens:
        if token.type == "link_open":
            href = token.attrGet("href")
            if isinstance(href, str):
                yield href
        if token.children:
            yield from markdown_links(token.children)


def h2_headings(tokens):
    return [
        tokens[index + 1].content
        for index, token in enumerate(tokens[:-1])
        if token.type == "heading_open" and token.tag == "h2"
    ]


def check_skill(root):
    root = root.resolve()
    parser = MarkdownIt("commonmark")
    errors = []

    def fail(path, message):
        errors.append(f"{path.relative_to(root)}: {message}")

    skill_md = root / "SKILL.md"
    skill_text = skill_md.read_text(encoding="utf-8")
    lines = skill_text.splitlines()
    body = skill_text
    frontmatter = None
    if not lines or lines[0] != "---":
        fail(skill_md, "frontmatter must start with --- on the first line")
    else:
        try:
            end = lines.index("---", 1)
        except ValueError:
            fail(skill_md, "frontmatter has no closing ---")
        else:
            body = "\n".join(lines[end + 1 :])
            try:
                frontmatter = yaml.safe_load("\n".join(lines[1:end]))
            except yaml.YAMLError as error:
                fail(skill_md, f"invalid YAML frontmatter: {error}")
    if not isinstance(frontmatter, dict):
        fail(skill_md, "frontmatter must be a YAML mapping")
    else:
        if frontmatter.get("name") != root.name:
            fail(skill_md, f"frontmatter name must be {root.name}")
        description = frontmatter.get("description")
        if not isinstance(description, str) or not description.strip():
            fail(skill_md, "frontmatter description must be a non-empty string")

    documents = sorted(root.rglob("*.md"))
    parsed = {path: parser.parse(path.read_text(encoding="utf-8")) for path in documents}
    body_tokens = parser.parse(body)

    features = root / "features"
    readme = features / "README.md"
    siblings = {path for path in features.glob("*.md") if path.name != "README.md"}
    indexed = []
    if readme in parsed:
        for href in markdown_links(parsed[readme]):
            parts = urlsplit(href)
            if parts.scheme or parts.netloc or not parts.path:
                continue
            target = (readme.parent / unquote(parts.path)).resolve()
            if target.parent == features.resolve() and target.suffix == ".md" and target.name != "README.md":
                indexed.append(target)
    missing = sorted(path.name for path in siblings - set(indexed))
    stale = sorted(path.name for path in set(indexed) - siblings if not path.exists())
    duplicates = sorted({path.name for path in indexed if indexed.count(path) > 1})
    if missing:
        fail(readme, f"unindexed feature files: {', '.join(missing)}")
    if stale:
        fail(readme, f"index links to missing features: {', '.join(stale)}")
    if duplicates:
        fail(readme, f"duplicate feature index links: {', '.join(duplicates)}")

    for path in sorted(siblings):
        headings = h2_headings(parsed[path])
        if headings != FEATURE_HEADINGS:
            fail(path, "H2 headings must be exactly, in order: " + ", ".join(FEATURE_HEADINGS))

    for path, tokens in parsed.items():
        for href in markdown_links(tokens):
            parts = urlsplit(href)
            if parts.scheme or parts.netloc or not parts.path:
                continue
            target = (path.parent / unquote(parts.path)).resolve()
            if not target.is_file():
                fail(path, f"broken internal link: {href}")

    documented = "\n".join(
        token.content for token in body_tokens if token.type in {"inline", "fence", "code_block"}
    )
    helpers = sorted(path for path in (root / "scripts").rglob("*") if path.suffix in {".sh", ".mjs"})
    for helper in helpers:
        relative = helper.relative_to(root).as_posix()
        if helper.suffix == ".sh" and not helper.stat().st_mode & 0o111:
            fail(helper, "Bash helper must be executable")
        if relative not in documented:
            fail(skill_md, f"helper has no call or pointer in SKILL.md: {relative}")

    return errors


def main():
    parser = argparse.ArgumentParser(description="Check the Tern deployment skill's deterministic documentation contract")
    parser.add_argument("skill_root", nargs="?", type=Path, default=DEFAULT_ROOT)
    args = parser.parse_args()
    errors = check_skill(args.skill_root)
    for error in errors:
        print(f"ERROR: {error}", file=sys.stderr)
    if errors:
        return 1
    print(f"Skill checks passed: {args.skill_root}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
