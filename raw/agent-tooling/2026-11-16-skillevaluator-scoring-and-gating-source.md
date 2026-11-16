# SkillEvaluator 计分与门禁源码摘录

> Source: https://github.com/NVIDIA/SkillEvaluator （main 分支源码，2026-11-16 经 raw.githubusercontent.com 与 github file_read 读取）
> Collected: 2026-11-16
> Published: Unknown（main 分支持续更新；README badge 指向 arXiv 2608.20614，论文发表 2026-08-20）

## src/skillevaluator/config/quality-default.yaml（全文）

```yaml
# Default deterministic quality-check configuration.
expected_headers:
  - heading: "## Prerequisites"
    alternatives:
      - "## Requirements"
    points: 5
    message: "No prerequisites/requirements documented"
    suggestion: "Document dependencies, API keys, or setup needed"
  - heading: "## Limitations"
    points: 5
    message: "No limitations documented"
    suggestion: "Add '## Limitations' section with known issues/constraints"
  - heading: "## Troubleshooting"
    alternatives:
      - "## Common Issues"
      - "## FAQ"
    points: 5
    message: "No troubleshooting section documented"
    suggestion: "Add '## Troubleshooting' with Error/Cause/Solution patterns"

# Reliability error-handling rules. A custom file may set any subset of these;
# omitted blocks and keys keep the values below. Set points to 0 to turn a rule off.
error_handling:
  # SKILL.md mentions none of the terms (whole word, any case).
  mentioned:
    points: 10
    message: "No mention of error handling or validation"
    suggestion: "Document expected errors and how to handle them"
    terms: [error, errors, exception, exceptions, invalid, fail, fails, failed, failure, failures, failing,
            validate, validates, validated, validating, validation, validations]
  # A script has neither try/except nor any marker (case-sensitive substring).
  scripts:
    points: 5
    message: "Scripts may lack error handling"
    suggestion: "Scripts should handle errors explicitly"
    markers: ["if not ", "if error", "raise", "assert", "ValueError", "FileNotFoundError"]
  # A lib module has neither try/except nor any marker (case-sensitive substring).
  lib:
    points: 5
    message: "Lib modules may lack error handling"
    suggestion: "Library code should handle errors explicitly with try/except or raise"
    markers: ["raise", "assert", "ValueError", "TypeError", "RuntimeError"]
```

## src/skillevaluator/constants.py（节选）

```python
QUALITY_SCORE_WEIGHTS = {
    "correctness": 0.35,
    "discoverability": 0.25,
    "reliability": 0.25,
    "efficiency": 0.15,
}

QUALITY_GRADE_THRESHOLDS = [(90, "A"), (80, "B"), (70, "C"), (60, "D"), (0, "F")]
QUALITY_DEFAULT_MIN_SCORE = 70
QUALITY_RECOMMENDED_MAX_TOKENS = 5000
# Tier 1 estimates tokens as characters / QUALITY_CHARS_PER_TOKEN; it does not run a tokenizer.
QUALITY_CHARS_PER_TOKEN = 4
QUALITY_MAX_BODY_LINES = 500

QUALITY_RESERVED_NAMES = ["anthropic", "claude"]
```

rubric 与 Tier 3 常量（同文件）：

```python
RUBRIC_MAX_TOKENS = MAX_COMPLETION_TOKENS
RUBRIC_MIN_SCORE = 60
RUBRIC_REASONING_EFFORT = "medium"
RUBRIC_REASONING_MAX_TOKENS = 32768

# Tier 3 live-agent lift verdict policy. Small deltas stay neutral because
# live agent runs are noisy, especially with low attempt counts.
TIER3_LIFT_PASS_THRESHOLD = 0.05
TIER3_LIFT_FAIL_THRESHOLD = -0.10

# Private paired comparisons resample whole cases with a reproducible seed.
LIFT_BOOTSTRAP_RESAMPLES = 2000
LIFT_BOOTSTRAP_TAIL_RESAMPLES = 200
LIFT_BOOTSTRAP_SEED = 0
LIFT_BOOTSTRAP_CONFIDENCE = 0.95
LIFT_CI_MIN_PAIRED_CASES = 5
LIFT_CI_LOW_PRECISION_WIDTH = 0.20

AGENT_EVAL_DIMENSIONS = ["security", "correctness", "discoverability", "effectiveness", "efficiency"]
AGENT_EVAL_EVALUATORS = ["security", "skill_execution", "skill_efficiency", "accuracy", "goal_accuracy", "behavior_check"]
DEFAULT_SCORE_POLICY = "skill-evaluator-dimension-mean-v1"
AGENT_EVAL_DEFAULT_AGENTS = "codex"
```

维度映射（同文件 DIMENSION_MAPPING，token_efficiency 的排除理由）：

```python
DIMENSION_MAPPING: dict[str, dict] = {
    "security": {"evaluators": ["security"], "weights": [1.0], "fallback_evaluators": ["behavior_check"], "fallback_weights": [1.0], "question": "Is it safe to use?"},
    "correctness": {"evaluators": ["accuracy"], "weights": [1.0], "question": "Is the answer correct?"},
    "discoverability": {"evaluators": ["skill_execution"], "weights": [1.0], "question": "Was the right skill loaded when needed?"},
    "effectiveness": {"evaluators": ["goal_accuracy", "behavior_check"], "weights": [0.5, 0.5], "question": "Did the skill help complete the task?"},
    "efficiency": {
        # token_efficiency is intentionally report-only. Including it here
        # would let token usage alone change the canonical quality verdict.
        "evaluators": ["skill_efficiency"], "weights": [1.0], "question": "Did it avoid wasted tool or skill usage?"
    },
}

TOKEN_EFFICIENCY_HALF_LIFE: int = 200_000

DIMENSION_VERDICT_PASS_THRESHOLD = 0.5
DIMENSION_VERDICT_NEUTRAL_THRESHOLD = 0.4
```

Tier 2 阈值常量（同文件）：

```python
SIMILARITY_CRITICAL_THRESHOLD = 0.95  # EXACT_DUPLICATE
SIMILARITY_HIGH_THRESHOLD = 0.90  # HIGH_SIMILARITY
SIMILARITY_MEDIUM_THRESHOLD = 0.75  # SIMILAR
SIMILARITY_LOW_THRESHOLD = 0.50  # LOOSELY_RELATED

# Default --threshold flag: reports CRITICAL + HIGH + MEDIUM by default
SIMILARITY_DEFAULT_THRESHOLD = 0.75

CONTENT_DEDUP_SIMILARITY_THRESHOLD = 0.80
CONTENT_DEDUP_MIN_CHUNK_CHARS = 80
CONTENT_DEDUP_MAX_CHUNK_CHARS = 3000
```

## src/skillevaluator/models/quality.py（节选）

`deduct` 与 `overall_score`：

```python
    def deduct(self, amount: float, severity: str, message: str, suggestion: str | None = None) -> None:
        """Deduct from score and record the issue."""
        self.issues.append(...)
        self.score = max(0.0, self.score - amount)
```

```python
    @property
    def overall_score(self) -> float:
        return (
            self.correctness.weighted_score
            + self.discoverability.weighted_score
            + self.reliability.weighted_score
            + self.efficiency.weighted_score
        )

    @property
    def grade(self) -> str:
        return score_to_grade(self.overall_score)
```

`to_dict` 的舍入：

```python
        return {
            "overall_score": round(self.overall_score, 1),
            "grade": self.grade,
            ...
```

## src/skillevaluator/validators/quality_score.py（关键函数）

`_validate_single_skill` 内分数门禁与 finding 映射：

```python
        # Convert quality issues into SkillEvaluator Findings
        for qi in qs.all_issues:
            sev_map = {"error": Severity.HIGH, "warning": Severity.MEDIUM, "info": Severity.LOW}
            result.add_finding(
                Finding(
                    category="QUALITY",
                    severity=sev_map.get(qi.severity, Severity.LOW),
                    check_name=f"quality_{qi.dimension}",
                    message=qi.message,
                    file_path=str(manifest),
                    suggestion=qi.suggestion,
                    metadata={"dimension": qi.dimension, "deduction": qi.deduction},
                )
            )

        # Determine pass/fail based on min_score
        if qs.overall_score < self.min_score:
            result.fail_gate(
                f"Quality score {qs.overall_score:.1f}/100 is below the required {self.min_score}/100 in {manifest}"
            )
```

头部匹配（`_check_reliability`）：

```python
        for expected in self.quality_config["expected_headers"]:
            accepted_headings = [expected["heading"], *expected["alternatives"]]
            if not any(heading in content for heading in accepted_headings):
                dim.deduct(expected["points"], "info", expected["message"], expected["suggestion"])
```

脚本类专属扣分（`_check_type_specific`，script-based/hybrid 分支）：

```python
        if skill_type in ("script-based", "hybrid"):
            script_files = self._executable_files(skill_path)
            if self._has_executable_directory(skill_path):
                qs.has_scripts = True
                qs.script_count = len(script_files)
                if qs.script_count == 0:
                    dim.deduct(
                        10, "warning", "scripts/ or tools/ exists but contains no .py, .sh, .mjs, .cjs or .js files"
                    )
            else:
                dim.deduct(
                    25,
                    "error",
                    "No scripts/ or tools/ directory found (detected as script-based skill)",
                    "Create scripts/ or tools/ with at least one executable script",
                )

            if "## Available Scripts" not in content and "| Script |" not in content:
                dim.deduct(
                    10,
                    "warning",
                    "No documented scripts in table format",
                    "Add '## Available Scripts' with table: | Script | Purpose | Arguments |",
                )
            if "run_script" not in content and not self._runs_only_node_scripts(script_files):
                dim.deduct(
                    10,
                    "warning",
                    "Instructions don't mention 'run_script'",
                    "Add explicit run_script() call examples",
                )
```

metadata 缺失扣分（`_check_spec_fields`）：

```python
        nested_fields = {
            "author": "Author name or team (under metadata:)",
            "tags": "Categorization tags (under metadata:, list of 1-5 items)",
        }
        for field_name, desc in nested_fields.items():
            if field_name not in metadata or metadata[field_name] is None:
                qs.correctness.deduct(
                    5,
                    "warning",
                    f"SKILL_SPEC recommended field missing: 'metadata.{field_name}'",
                    f"Add '{field_name}' under metadata: — {desc}",
                )
```

描述长度与触发词（`_check_discoverability`）：

```python
            if len(desc) < 20:
                dim.deduct(20, "warning", f"Description too short ({len(desc)} chars, recommend 50-150)", ...)
            elif len(desc) > 200:
                dim.deduct(5, "info", f"Description very long ({len(desc)} chars, recommend 50-150)", ...)
```

示例存在性与 token 预算（`_check_correctness` 与 `_check_efficiency`）：

```python
        if "```" in content or "Example:" in content or "**Example:**" in content:
            qs.has_examples = True
        elif "## Examples" not in content:
            dim.deduct(5, "info", "No examples provided", "Add example usage with code blocks")
```

```python
        qs.total_tokens = len(content) // QUALITY_CHARS_PER_TOKEN
        if qs.total_tokens > QUALITY_RECOMMENDED_MAX_TOKENS:
            dim.deduct(15, "warning", ... 大 skill 提示 ..., ...)
```

说明段（`## Instructions`/`## Usage`）的切分（`_check_efficiency`）：

```python
        for heading in ("## Instructions", "## Usage"):
            if heading not in content:
                continue
            parts = content.split(f"\n{heading}\n", 1)
            section = parts[1].split("\n## ", 1)[0] if len(parts) > 1 else ""
            break
        else:
            section = ""
```

## src/skillevaluator/validators/rubric_eval.py（关键函数）

聚合在本地算（`_aggregate_rubric_score`）：

```python
_IMPORTANCE_WEIGHTS = {"high": 3, "medium": 2, "low": 1}
_CRITERION_PASS_SCORE = 7

def _aggregate_rubric_score(checks: list[dict]) -> float:
    """Return a local 0-100 score using schema importance weights.

    High, medium, and low importance criteria carry weights 3, 2, and 1.
    The result is rounded to one decimal only after the weighted mean is
    scaled from the criterion 0-10 range to the public 0-100 range.
    """
    weighted_score = sum(check["score"] * _IMPORTANCE_WEIGHTS[check["importance"]] for check in checks)
    total_weight = sum(_IMPORTANCE_WEIGHTS[check["importance"]] for check in checks)
    return round(weighted_score / total_weight * 10, 1)
```

通过判定（`_validate_single_skill`）：

```python
        overall_score = _aggregate_rubric_score(checks)
        overall_pass = overall_score >= self.min_score and all(check["pass"] for check in checks)
```

judge 自报分数只记录不参与判定：

```python
        result.metadata["rubric_eval"] = {
            "execution_status": "succeeded",
            "overall_score": overall_score,
            ...
            "judge_score": report.get("score"),
            "judge_overall_pass": report.get("overall_pass"),
            ...
            "aggregation": {
                "method": "importance_weighted_mean",
                "importance_weights": dict(_IMPORTANCE_WEIGHTS),
                "min_score": self.min_score,
                "criterion_pass_score": _CRITERION_PASS_SCORE,
                "requires_all_criteria_pass": True,
            },
```

无效回复重试一次（`RubricJudge.process` docstring 节选）：

```python
        """Ask the judge, and ask once more, naming the problem, if its reply cannot be scored. ... The
        second reply is returned as parsed, so the validator still fails
        closed when it is invalid too. A provider error that the client's own
        transient-error retries do not clear (a failed request, a refusal or
        a truncated reply) is not asked again: as in :meth:`LLMClient.process`,
        ``last_failure`` records it and the fallback is returned. A truncated
        reply is never salvaged. ...
```

结构化输出 schema（`RUBRIC_JSON_SCHEMA` 要求 checks 数组，每条 id/criterion/pass/score/notes）。

## src/skillevaluator/models/result.py（门禁关键片段）

`fail_gate`：

```python
    def fail_gate(self, message: str) -> None:
        """Record a failed requirement that severity overrides cannot waive."""
        failures = self.gate_failures
        if message not in failures:
            failures.append(message)
            self.metadata["gate_failures"] = failures
            self.add_error(message)
```

`gate_failures` property：

```python
    @property
    def gate_failures(self) -> list[str]:
        """Failed requirements independent of finding severity, such as a minimum score."""
```

`Severity.is_error`：

```python
    def is_error(self, *, fail_on_medium: bool = False, fail_on_low: bool = False) -> bool:
        if self in (Severity.CRITICAL, Severity.HIGH):
            return True
        if self == Severity.MEDIUM and fail_on_medium:
            return True
        return bool(self == Severity.LOW and fail_on_low)
```

`add_finding` 新式 Finding 分支：

```python
        # New style - finding is a Finding object
        finding = finding_or_tag
        self.findings.append(finding)
        self.summary.tally_severity(finding.severity)
        is_error = finding.severity.is_error(fail_on_medium=fail_on_medium, fail_on_low=fail_on_low)
        if is_error:
            self.passed = False
            ...
```

`recalculate_from_findings`：

```python
    def recalculate_from_findings(self) -> None:
        """Rebuild passed, errors, warnings, and summary counts from current findings.

        Call after mutating finding severities (e.g. LLM verification downgrade)
        so that result state is consistent with the actual finding objects.
        Independent gate failures remain errors regardless of those severities.
        ...
        """
        self.errors.clear()
        self.warnings.clear()
        self.passed = not self.is_incomplete
        self.summary.reset_finding_counts()

        for message in self.gate_failures:
            self.add_error(message)

        for finding in self.findings:
            ...
            is_error = sev.is_error(fail_on_medium=fail_on_medium)
            ...
```

## src/skillevaluator/validators/policy.py（override 改写与重算触发，约 339 行附近，`apply_policy` 内）

```python
    for result in results:
        independent_warnings: list[str] | None = None
        for finding in result.findings:
            current = (
                finding.severity if isinstance(finding.severity, Severity) else Severity(str(finding.severity).lower())
            )
            new_severity = policy.severity_for(finding.category, finding.check_name, current)
            if new_severity != current:
                if independent_warnings is None:
                    # Read before any change: a mirrored line names the old severity.
                    independent_warnings = result.independent_warnings()
                finding.severity = new_severity
        if independent_warnings is not None:
            result.recalculate_from_findings()
            # Rebuilding from findings drops every warning. Keep those no
            # finding mirrors, such as why a scanner did not complete.
            for warning in independent_warnings:
                result.add_warning(warning)
```

`severity_for` 的键形式：

```python
        exact_key = f"{category}.{check_name}"
        wildcard_key = f"{category}.*"
```

## src/skillevaluator/tier3/attempt_verdict.py（判定顺序，关键片段）

```python
DEFAULT_GOAL_ACCURACY_PASS_THRESHOLD = 1.0
DEFAULT_SECURITY_PASS_THRESHOLD = 1.0

def attempt_verdict(
    overall_score: float | None,
    pass_threshold: float,
    goal_accuracy: float | None = None,
    *,
    reward: Mapping[str, Any] | None = None,
    ...
) -> AttemptVerdict:
    """Apply required checks before the existing Overall threshold."""
    ...
    if goal_accuracy is not None:
        correct_answer = goal_accuracy >= goal_accuracy_pass_threshold
        if not correct_answer:
            return AttemptVerdict(passed=False, reason=f"goal not met (goal accuracy {goal_accuracy:.2f})", ...)
    if security_clean is False and security_score is not None and not unsupported_security:
        ...
        return AttemptVerdict(passed=False, reason=reason, ..., required_failure="security", ...)
    passed = overall_score is not None and overall_score >= pass_threshold
```

## src/skillevaluator/tier3/runtime_arms.py（全文）

```python
"""Private arm identifiers shared by runtime evidence and comparisons."""

ARM_WITH = "with_skill"
ARM_WITHOUT = "without_skill"
ARM_SUM_OF_PARTS = "sum_of_parts"
ARM_LOOSE_PARTS = "loose_parts"
```

## tests/validators/test_quality_score.py（钉住头部匹配语义的参数化测试）

```python
    # Matching is a case-sensitive substring test on the raw SKILL.md text, not a
    # parsed-heading match. These cases pin that behavior in both directions.
    @pytest.mark.parametrize(
        ("extra_body", "satisfied"),
        [
            pytest.param("\n## Security\n\nReview permissions.\n", True, id="exact-heading"),
            pytest.param("\n### Security\n\nReview permissions.\n", True, id="deeper-heading-level"),
            pytest.param("\n## Security and more\n\nReview permissions.\n", True, id="longer-heading-text"),
            pytest.param("\n```markdown\n## Security\n```\n", True, id="inside-code-block"),
            pytest.param("\nSee the ## Security notes below.\n", True, id="inside-prose"),
            pytest.param("\n# Security\n\nReview permissions.\n", False, id="shallower-heading-level"),
            pytest.param("\n## security\n\nReview permissions.\n", False, id="different-case"),
            pytest.param("\n##Security\n\nReview permissions.\n", False, id="no-space-after-hashes"),
            pytest.param("\nSecurity\n========\n\nReview permissions.\n", False, id="setext-heading"),
        ],
    )
    def test_expected_header_matches_heading_as_text_anywhere(self, tmp_path: Path, extra_body: str, satisfied: bool):
```

加权公式测试：

```python
    def test_weighted_formula(self):
        qs = QualityScoreResult(skill_name="test")
        qs.correctness.score = 80.0
        qs.discoverability.score = 60.0
        qs.reliability.score = 90.0
        qs.efficiency.score = 70.0
        expected = 80 * 0.35 + 60 * 0.25 + 90 * 0.25 + 70 * 0.15
        assert abs(qs.overall_score - expected) < 0.01
```

错误处理词测试（整词匹配）：

```python
ERROR_HANDLING_TERMS = [
    "error", "errors", "exception", "exceptions", "invalid", "fail", "fails", "failed",
    "failure", "failures", "failing", "validate", "validates", "validated",
    "validating", "validation", "validations",
]

    @pytest.mark.parametrize("text", ["errorless", "failsafe", "validator", "éerror", "处理error时", "error٣"])
    def test_terms_inside_other_words_do_not_record_error_handling(self, tmp_path: Path, text: str):
```

## 参考 skill：src/skillevaluator/tier3/reference_skills/text-analyzer/SKILL.md（全文）

```markdown
---
name: text-analyzer
description: Analyze text content and produce statistics including word count, line count, character count, sentence count, average word length, and most frequent words. Use when asked to analyze, count, or summarize a text or a text file (inline text or a file path such as input.txt), or when a request names text-analyzer.
compatibility: Python 3.10+, no external dependencies
metadata:
  author: SkillEvaluator Maintainers <maintainers@example.com>
---

# Text Analyzer

Analyze text and produce structured statistics.

## Purpose

Provide quick text analytics — word counts, line counts, character counts,
top frequent words, average word length, and sentence count — for any
plain-text input.

## Agent Instructions

1. Read this SKILL.md to understand capabilities.
2. Run `scripts/analyze_text.py` with the appropriate arguments.
3. Return the analysis results to the user.

## Examples

### Usage

```bash
# Analyze inline text
python scripts/analyze_text.py --text "Your text content here"

# Analyze a file
python scripts/analyze_text.py --file /path/to/file.txt

# JSON output (default is human-readable)
python scripts/analyze_text.py --text "Hello world" --json
```

### Output

The script prints a structured report with:
- **Word count** — total words
- **Line count** — total lines
- **Character count** — total characters (including whitespace)
- **Sentence count** — estimated sentence count
- **Average word length** — mean characters per word
- **Top 5 words** — most frequent words and their counts

## Limitations

- Sentence detection uses simple period/question/exclamation splitting;
  may be inaccurate for abbreviations (e.g., "U.S.A.").
- Non-UTF-8 files will be read with errors replaced.

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `FileNotFoundError` | Check the `--file` path exists |
| Empty output | Ensure `--text` or `--file` is provided |
```

（该 skill 目录另有 scripts/analyze_text.py，含 argparse、FileNotFoundError 处理与 `if not path.exists()` 判断。）
