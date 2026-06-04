#!/usr/bin/env bash
# Stop Validator: Enforce completion protocol before Claude stops
# Exit 0 = allow stop, Exit 2 = force Claude to continue (with reason on stderr)
set -euo pipefail

INPUT=$(cat)
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
LOG_DIR="$PROJECT_DIR/.claude/logs"
SESSION_MARKER="$LOG_DIR/.session-id"
mkdir -p "$LOG_DIR"

# Allow-stop cleanup: delete the session marker so pre-tool-guard re-truncates
# file-ops.log at the start of the NEXT session. This is what makes the
# counting below genuinely session-scoped (TASK-008).
_allow_stop() {
  rm -f "$SESSION_MARKER" 2>/dev/null || true
  # Also truncate the ops log so a write-less next session doesn't count
  # this session's leftovers (pre-tool-guard only truncates on first write).
  : > "$LOG_DIR/file-ops.log" 2>/dev/null || true
  exit 0
}

# Check if this is a stop-hook re-entry (prevent infinite loops).
# stop_hook_active is an unquoted JSON boolean — grep it, no python (TASK-008).
if printf '%s' "$INPUT" | grep -q '"stop_hook_active"[[:space:]]*:[[:space:]]*true'; then
  echo "$(date -u '+%Y-%m-%dT%H:%M:%SZ') | STOP | re-entry, allowing" >> "$LOG_DIR/session.log"
  _allow_stop
fi

# Log session stop (UTC, consistent with pre-tool-guard — TASK-008)
echo "$(date -u '+%Y-%m-%dT%H:%M:%SZ') | STOP | session ending" >> "$LOG_DIR/session.log"

# Check if any files were modified this session (WARN or ALLOW, not BLOCK/LINT).
# file-ops.log is truncated by pre-tool-guard at session start, so the whole
# file IS the current session — no date filtering needed (TASK-008).
if [ -f "$LOG_DIR/file-ops.log" ]; then
  CHANGES=$(grep -c "| \(ALLOW\|WARN\) |" "$LOG_DIR/file-ops.log" 2>/dev/null) || CHANGES=0

  if [ "$CHANGES" -gt 0 ]; then
    # Files were modified this session — check TASKS.md was updated (WARN or ALLOW)
    TASKS_UPDATED=$(grep -c "| \(ALLOW\|WARN\) | .* | TASKS.md" "$LOG_DIR/file-ops.log" 2>/dev/null) || TASKS_UPDATED=0

    if [ "$TASKS_UPDATED" = "0" ]; then
      echo "COMPLETION CHECK: You modified $CHANGES files this session but TASKS.md was not updated. Update task status before stopping." >&2
      exit 2
    fi
  fi
fi

_allow_stop
