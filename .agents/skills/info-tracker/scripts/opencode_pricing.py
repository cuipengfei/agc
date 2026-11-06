import difflib
import http.client
import urllib.request
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path


class TableExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tables = []
        self.current_table = None
        self.current_row = None
        self.in_cell = False
        self.cell_slot = ""
        self.cell_runs = []
        self.current_run = ""
        self.span_depth = 0
        self.pending_rowspan = []
        self.current_cell_rowspan = 1

    def handle_starttag(self, tag, attrs):
        if tag == "table":
            self.current_table = []
            self.pending_rowspan = []
        elif tag == "tr" and self.current_table is not None:
            self.current_row = []
            carry = []
            for col, remaining, text in sorted(self.pending_rowspan):
                while len(self.current_row) < col:
                    self.current_row.append("")
                self.current_row.insert(col, text)
                if remaining > 1:
                    carry.append((col, remaining - 1, text))
            self.pending_rowspan = carry
        elif tag in ("td", "th") and self.current_row is not None:
            attr = dict(attrs)
            self.in_cell = not (
                attr.get("data-slot") == "bars" or attr.get("aria-hidden") == "true"
            )
            self.cell_slot = attr.get("data-slot", "")
            self.cell_runs = []
            self.current_run = ""
            self.span_depth = 0
            try:
                self.current_cell_rowspan = int(attr.get("rowspan", "1"))
            except ValueError:
                self.current_cell_rowspan = 1
        elif self.in_cell and tag in ("span", "small", "bdi", "b", "a"):
            if self.span_depth == 0 and self.current_run.strip():
                self.cell_runs.append(" ".join(self.current_run.split()))
                self.current_run = ""
            self.span_depth += 1

    def handle_endtag(self, tag):
        if tag == "table" and self.current_table is not None:
            if self.current_table:
                self.tables.append(self.current_table)
            self.current_table = None
            self.current_row = None
            self.in_cell = False
            self.pending_rowspan = []
        elif tag == "tr" and self.current_row is not None:
            if self.current_row:
                self.current_table.append(self.current_row)
            self.current_row = None
            self.in_cell = False
        elif tag in ("td", "th") and self.in_cell:
            self.in_cell = False
            if self.current_run.strip():
                self.cell_runs.append(" ".join(self.current_run.split()))
            # 分开保留 Go / Go Plus 数值，与旧监控脚本一致。
            separator = " / " if self.cell_slot == "number" else " "
            text = separator.join(self.cell_runs)
            col = len(self.current_row)
            self.current_row.append(text)
            if self.current_cell_rowspan > 1:
                self.pending_rowspan.append((col, self.current_cell_rowspan - 1, text))
        elif self.in_cell and tag in ("span", "small", "bdi", "b", "a"):
            self.span_depth = max(0, self.span_depth - 1)

    def handle_data(self, data):
        if self.in_cell:
            self.current_run += data


def fetch_and_extract(url):
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(request, timeout=30) as response:
        html = response.read().decode("utf-8")
    extractor = TableExtractor()
    extractor.feed(html)
    extractor.close()
    output = []
    for table in extractor.tables:
        rows = [" | ".join(row) for row in table if row and row[0].strip()]
        if any("$" in row for row in rows):
            output.extend(rows)
            output.append("")
    # 兼容旧脚本 print() 在提取结果末尾额外写入的换行。
    return "\n".join(output) + "\n" if output else ""


def collect(state_dir: Path, config) -> dict:
    result = {"status": "ok", "changes": [], "errors": []}
    try:
        url = config["url"]
        current = fetch_and_extract(url)
        if not current.strip():
            raise ValueError("no pricing table rows containing '$' were extracted")

        state_dir.mkdir(parents=True, exist_ok=True)
        baseline = state_dir / "pricing.baseline"
        if not baseline.exists():
            baseline.write_text(current, encoding="utf-8")
            return result

        previous = baseline.read_text(encoding="utf-8")
        if current == previous:
            return result

        diff = "\n".join(
            difflib.unified_diff(
                previous.splitlines(),
                current.splitlines(),
                fromfile="pricing.baseline",
                tofile="opencode-go.current",
                lineterm="",
            )
        )
        stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S.%fZ")
        archive = state_dir / f"pricing.baseline.{stamp}.bak"
        with archive.open("x", encoding="utf-8") as saved:
            saved.write(previous)
        baseline.write_text(current, encoding="utf-8")
        result["changes"].append(
            {"document": "opencode-go", "url": url, "diff": diff}
        )
    except (OSError, ValueError, http.client.HTTPException) as error:
        result["status"] = "error"
        result["errors"].append(f"opencode-go: {error}")
    return result
