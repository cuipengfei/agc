#!/bin/bash
# win-ntf-notify.sh — Codex hook that mirrors opencode/Claude Code win-ntf notifications.
# Usage: ~/.codex/hooks/win-ntf-notify.sh <idle|error|approve|question>

set -euo pipefail

NOTIFY_URL="http://127.0.0.1:9876/notify"
TYPE="${1:-}"
INPUT=$(cat)

json_get() {
  jq -r "$1" 2>/dev/null <<<"$INPUT" || true
}

PROJECT=$(json_get '.cwd // ""' | xargs basename 2>/dev/null || true)
PROJECT="${PROJECT:-codex}"

EVENT=$(json_get '.hook_event_name // .event // .type // ""')
TOOL=$(json_get '.tool_name // .toolName // .tool // .name // .tool_input.name // ""')

VARIANT="info"
HEADLINE=""
DETAIL=""

case "$TYPE" in
  idle)
    VARIANT="info"
    HEADLINE="空闲，等待你的输入"
    ;;
  approve)
    VARIANT="warning"
    HEADLINE="等待审批 / 需要确认"
    DETAIL=$(json_get '.tool_name // .toolName // .tool // .permission // .message // ""' | tr -d '\n')
    ;;
  question)
    case "${EVENT}:${TOOL}" in
      *AskUserQuestion*|*ask_user_question*|*question*) ;;
      *) exit 0 ;;
    esac
    VARIANT="warning"
    HEADLINE="需要你回答问题"
    DETAIL=$(json_get '.question // .tool_input.question // .message // .prompt // ""' | tr -d '\n')
    ;;
  error)
    STATUS=$(json_get '.exit_code // .exitCode // .status // .tool_response.exit_code // ""')
    ERROR=$(json_get '.error // .error_message // .stderr // .tool_response.stderr // ""' | tr -d '\n')
    if [ -z "$STATUS$ERROR" ] || [ "$STATUS" = "0" ]; then
      exit 0
    fi
    VARIANT="error"
    HEADLINE="会话出错"
    DETAIL="${ERROR:-exit_code=$STATUS}"
    ;;
  *)
    exit 0
    ;;
esac

if [ -n "$DETAIL" ]; then
  TEXT="${HEADLINE}\n${DETAIL}"
else
  TEXT="$HEADLINE"
fi

curl -s --max-time 3 -X POST "$NOTIFY_URL" \
  -H "Content-Type: application/json" \
  -d "$(jq -n \
    --arg title "cx: $PROJECT" \
    --arg text "$TEXT" \
    --arg variant "$VARIANT" \
    '{title: $title, text: $text, variant: $variant, durationMs: 20000}'
  )" >/dev/null 2>&1 || true

exit 0

