#!/usr/bin/env bash
# PreToolUse Guard: Protect critical files and log all write operations
# Exit 0 = allow, Exit 2 = block
set -euo pipefail

INPUT=$(cat)

# Pure-bash JSON field extraction — no Python, no jq, works on Git Bash / macOS / Linux.
# Matches the first occurrence of "key": "value" (flat top-level fields only).
_json_str() {
  local key="$1" input="$2"
  local val=""
  val=$(printf '%s' "$input" | sed -n 's/.*"'"$key"'"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -n 1)
  printf '%s' "$val"
}

TOOL_NAME=$(_json_str "tool_name" "$INPUT")

# file_path lives inside the nested tool_input object; try file_path then path.
FILE_PATH=$(_json_str "file_path" "$INPUT")
if [ -z "$FILE_PATH" ]; then
  FILE_PATH=$(_json_str "path" "$INPUT")
fi

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
LOG_DIR="$PROJECT_DIR/.claude/logs"
mkdir -p "$LOG_DIR"

# Session-start detection: truncate file-ops.log on the first invocation of
# each session so stop-validator.sh only counts current-session modifications.
SESSION_MARKER="$LOG_DIR/.session-id"
if [ ! -f "$SESSION_MARKER" ]; then
  : > "$LOG_DIR/file-ops.log"
  date -u '+%Y-%m-%dT%H:%M:%SZ' > "$SESSION_MARKER"
fi

# Parse failure is never silent (TASK-008): if we know the tool but not the
# file, log it loudly instead of falling through to ALLOW with an empty name.
if [ -n "$TOOL_NAME" ] && [ -z "$FILE_PATH" ]; then
  echo "$(date -u '+%Y-%m-%dT%H:%M:%SZ') | PARSE-FAIL | $TOOL_NAME | (no file_path in payload)" >> "$LOG_DIR/file-ops.log"
  echo "[pre-tool-guard] WARNING: could not extract file_path for $TOOL_NAME — guard not applied to this call" >&2
  exit 0
fi

# HARD BLOCK: Files only Storm modifies
BLOCKED_FILES="CLAUDE.md CONTEXT_MASTER.md"
BASENAME=$(basename "$FILE_PATH" 2>/dev/null || echo "")
for blocked in $BLOCKED_FILES; do
  if [ "$BASENAME" = "$blocked" ]; then
    echo "$(date -u '+%Y-%m-%dT%H:%M:%SZ') | BLOCK | $TOOL_NAME | $blocked" >> "$LOG_DIR/file-ops.log"
    echo '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"BLOCKED: '"$blocked"' is Storm-owned. Do not modify without explicit permission."}}'
    exit 2
  fi
done

# WARN: Files that require agent authority (PM-owned or Docs-owned)
GUARDED_FILES="TASKS.md DECISIONS.md RESEARCH.md CONTEXT_PROJECT.md"
for guarded in $GUARDED_FILES; do
  if [ "$BASENAME" = "$guarded" ]; then
    echo "$(date -u '+%Y-%m-%dT%H:%M:%SZ') | WARN | $TOOL_NAME | $BASENAME" >> "$LOG_DIR/file-ops.log"
    echo '{"hookSpecificOutput":{"hookEventName":"PreToolUse","additionalContext":"WARNING: You are modifying '"$guarded"'. Confirm you have authority (PM for TASKS/DECISIONS, Research for RESEARCH, PM/Docs for CONTEXT_PROJECT)."}}'
    exit 0
  fi
done

# Log ALLOWED write operation (file is neither blocked nor guarded)
echo "$(date -u '+%Y-%m-%dT%H:%M:%SZ') | ALLOW | $TOOL_NAME | $BASENAME" >> "$LOG_DIR/file-ops.log"

# Allow everything else
exit 0
