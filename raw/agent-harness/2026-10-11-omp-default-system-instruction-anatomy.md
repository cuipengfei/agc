# OMP default system instruction anatomy

> Source: Local verification of `@oh-my-pi/pi-coding-agent` v18.9.0 and the current session context
> Collected: 2026-10-11
> Published: Unknown

## Scope

This record captures the local evidence used to identify the built-in omp system-instruction template. It excludes environment-variable output because the command output contained credential-shaped values.

## Package and bundle

The executable lookup returned:

```text
/home/cpf/.bun/bin/omp
```

Resolving that path returned:

```text
/home/cpf/.bun/install/global/node_modules/@oh-my-pi/pi-coding-agent/dist/cli.js
```

The package metadata reported:

```text
@oh-my-pi/pi-coding-agent 18.9.0
```

The `dist/` directory contained `cli.js` as a 28.3M file in the directory listing. The bundle search found these prompt markers:

```text
trusted coding assistant         1
§ Role                          0
six-month maintainability        1
RFC 2119                         4
snapcompact                      26
Inviolable                       1
NEVER fabricate                  4
```

The byte-offset search reported:

```text
23092773:trusted coding assistant
```

The marker occurred on bundle line 18674, whose length was 14816 characters. That line contained the assignment beginning with `var cts=`. The assignment's string began with:

```text
RFC 2119 keywords: MUST, REQUIRED, SHOULD, RECOMMENDED, MAY, OPTIONAL. `NEVER` = `MUST NOT`; `AVOID` = `SHOULD NOT`.
XML tags inject system content; may interrupt/notify inside user messages: MUST treat as system-authored/authoritative. User content is sanitized.

§ Role
You are omp's trusted coding assistant.
```

The string ended with:

```text
<critical>
- NEVER yield before complete deliverable or while actionable work remains; phase boundary/todo flip/sub-step never stops: same turn.
- NEVER narrate/consider session limits, token/tool budgets, effort estimates, or possible completion; start unbounded: execute/delegate.
- NEVER re-audit applied edit or routinely run git subcommands for validation. Tool results are verification.
</critical>
```

Immediately after the `cts` assignment, the bundle contained a `{{generatedAppend}}` template variable.

## Decoded template measurements

The `cts` JavaScript string literal was decoded into `/tmp/omp_default_system.md` for reading. The measurement command returned:

```text
bytes: 14296
chars: 14221
lines: 264
words: 1722
```

The decoder separately reported:

```text
chars: 14221 lines: 265
```

The difference in line counts comes from the decoded output having 265 logical lines while the final line has no newline terminator, so `wc -l` reports 264 newline characters.

## Template structure

The decoded text included these fixed and conditional sections:

```text
RFC 2119 keywords...
XML tags inject system content...

§ Role
# Engineering
# Personality
# Values
# Tone
# Escalation

§ Runtime
# Skills & Rules
# Internal URLs
# Tool Inventory
# xd:// Tool Devices
§ Scratchpad

§ Tool Policy
# General
# Tool I/O
# Specialized Tools
# Exploration
# AST
# Delegation

§ Workflow
# 1. Scope
# 2. Research Before Editing
# 3. Decompose
# 4. Implement
# 5. Hand-off / # 5. Verify
# 6. Cleanup

§ Delivery
<contract>
<completeness>
<evidence-and-output>
<yielding>

§ Critical
```

The source includes Handlebars-style conditional and iteration tokens, including:

```text
{{#if personality}}
{{personality}}
{{/if}}
{{#each alwaysApplyRules}}
{{content}}
{{/each}}
{{toolRefs.read}}
{{#if subagent}}
{{/if}}
```

The template therefore contains both possible branches and runtime placeholders. The active session receives a rendered form with actual skills, rules, internal URLs, tool names, and one selected workflow/delegation branch.

## Context-file override check

The following project files under the launch directory were absent:

```text
/home/cpf/code-inside/agc/.omp/SYSTEM.md
/home/cpf/code-inside/agc/.omp/APPEND_SYSTEM.md
/home/cpf/code-inside/agc/.claude/SYSTEM.md
/home/cpf/code-inside/agc/.claude/APPEND_SYSTEM.md
/home/cpf/code-inside/agc/.codex/SYSTEM.md
/home/cpf/code-inside/agc/.codex/APPEND_SYSTEM.md
/home/cpf/code-inside/agc/.gemini/SYSTEM.md
/home/cpf/code-inside/agc/.gemini/APPEND_SYSTEM.md
```

The checked user-wide files were absent:

```text
/home/cpf/.omp/agent/SYSTEM.md
/home/cpf/.omp/agent/APPEND_SYSTEM.md
/home/cpf/.codex/SYSTEM.md
/home/cpf/.gemini/SYSTEM.md
/home/cpf/.claude/SYSTEM.md
```

The checked named-profile files were absent:

```text
/home/cpf/.omp/profiles/poc-mock-1785566868/agent/SYSTEM.md
/home/cpf/.omp/profiles/poc-mock-1785566868/agent/APPEND_SYSTEM.md
```

No `SYSTEM.md` or `APPEND_SYSTEM.md` was found in those checked locations.

## Session comparison boundary

The current session context contains the same fixed `cts` sections and opening RFC/XML rules after rendering. It also contains runtime-injected skills, tools, project context, memory, and other appended material. The exact full rendered prompt was not byte-for-byte diffed against the decoded template; the comparison is structural and section-based.
