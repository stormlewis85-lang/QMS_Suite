#!/usr/bin/env bash
# PreToolUse Guard: Protect critical files and log all write operations
# Exit 0 = allow, Exit 2 = block
#
# Fail-closed (Slice 2 / E4a mv2): a crash or empty payload BLOCKS, never
# silently allows (closes GATE-08 empty-stdin + the crash-open class) — via
# lib-hook-failclosed.sh, with an inline fallback if the lib is absent so this
# hook never hard-depends on a deploy artifact to fail closed.
set -euo pipefail

# ── Fail-closed substrate (source from own dir; inline fallback if absent) ───
_HOOK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if ! . "$_HOOK_DIR/lib-hook-failclosed.sh" 2>/dev/null; then
  _FC_DONE=0
  _fc_deny_json() { printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"%s"}}\n' "$1"; }
  _fc_trap() { local rc=$?; if [ "$_FC_DONE" = 1 ]; then exit "$rc"; fi; _fc_deny_json "BLOCKED (fail-closed, inline): pre-tool-guard internal error (rc=$rc)."; exit 2; }
  _fc_init() { trap _fc_trap EXIT; _FC_INPUT="$(cat 2>/dev/null || true)"; if [ -z "${_FC_INPUT//[[:space:]]/}" ]; then _FC_DONE=1; _fc_deny_json "BLOCKED (fail-closed, inline): empty hook payload."; exit 2; fi; }
  _fc_allow() { _FC_DONE=1; exit 0; }
  _fc_block() { _FC_DONE=1; if [ -n "${1:-}" ]; then printf '%s\n' "$1" >&2; fi; exit 2; }
fi
_fc_init pretooluse
INPUT="$_FC_INPUT"

# Pure-bash JSON field extraction — no Python, no jq, works on Git Bash / macOS / Linux.
# Matches the first occurrence of "key": "value" (flat top-level fields only).
_json_str() {
  local key="$1" input="$2"
  local val=""
  val=$(printf '%s' "$input" | sed -n 's/.*"'"$key"'"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -n 1)
  printf '%s' "$val"
}

TOOL_NAME=$(_json_str "tool_name" "$INPUT")
SESSION_ID=$(_json_str "session_id" "$INPUT")
SESSION_ID="${SESSION_ID:-unknown}"

# The write target lives inside the nested tool_input object under a
# tool-dependent key: file_path for Write/Edit, path for some variants, and
# notebook_path for NotebookEdit. Missing the NotebookEdit key is not benign —
# an unresolved name logs PARSE-FAIL instead of ALLOW, so the write becomes
# invisible to stop-validator's completion check, which counts ALLOW/WARN only.
FILE_PATH=$(_json_str "file_path" "$INPUT")
if [ -z "$FILE_PATH" ]; then
  FILE_PATH=$(_json_str "notebook_path" "$INPUT")
fi
if [ -z "$FILE_PATH" ]; then
  FILE_PATH=$(_json_str "path" "$INPUT")
fi

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
LOG_DIR="$PROJECT_DIR/.claude/logs"
mkdir -p "$LOG_DIR"

# Session-start detection: rotate file-ops.log when the session_id changes, so
# stop-validator.sh only counts THIS session's rows.
#
# Keyed on session_id, not mere marker absence (DEC-014). The previous
# absence-check was defeated by stop-validator deleting the marker on every
# allowed stop: Stop hooks fire per TURN, so the log was silently truncated at
# each turn boundary and only ever held the current turn's writes.
# Marker line 1 = session_id, line 2 = session start (UTC, for the git-log
# window stop-validator uses to spot work that was committed mid-session).
SESSION_MARKER="$LOG_DIR/.session-id"
MARKER_SID=""
if [ -f "$SESSION_MARKER" ]; then
  MARKER_SID=$(sed -n '1p' "$SESSION_MARKER" 2>/dev/null || true)
fi
if [ "$MARKER_SID" != "$SESSION_ID" ]; then
  : > "$LOG_DIR/file-ops.log"
  { printf '%s\n' "$SESSION_ID"; date -u '+%Y-%m-%dT%H:%M:%SZ'; } > "$SESSION_MARKER"
fi

# Parse failure is never silent (TASK-008): if we know the tool but not the
# file, log it loudly instead of falling through to ALLOW with an empty name.
if [ -n "$TOOL_NAME" ] && [ -z "$FILE_PATH" ]; then
  echo "$(date -u '+%Y-%m-%dT%H:%M:%SZ') | PARSE-FAIL | $TOOL_NAME | (no file_path in payload)" >> "$LOG_DIR/file-ops.log"
  echo "[pre-tool-guard] WARNING: could not extract file_path for $TOOL_NAME — guard not applied to this call" >&2
  _fc_allow
fi

# HARD BLOCK: Files only Storm modifies
BLOCKED_FILES="CLAUDE.md CONTEXT_MASTER.md"
BASENAME=$(basename "$FILE_PATH" 2>/dev/null || echo "")
for blocked in $BLOCKED_FILES; do
  if [ "$BASENAME" = "$blocked" ]; then
    echo "$(date -u '+%Y-%m-%dT%H:%M:%SZ') | BLOCK | $TOOL_NAME | $blocked" >> "$LOG_DIR/file-ops.log"
    echo '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"BLOCKED: '"$blocked"' is Storm-owned. Do not modify without explicit permission."}}'
    _fc_block
  fi
done

# WARN: Files that require agent authority (PM-owned or Docs-owned)
GUARDED_FILES="TASKS.md DECISIONS.md RESEARCH.md CONTEXT_PROJECT.md"
for guarded in $GUARDED_FILES; do
  if [ "$BASENAME" = "$guarded" ]; then
    echo "$(date -u '+%Y-%m-%dT%H:%M:%SZ') | WARN | $TOOL_NAME | $BASENAME" >> "$LOG_DIR/file-ops.log"
    echo '{"hookSpecificOutput":{"hookEventName":"PreToolUse","additionalContext":"WARNING: You are modifying '"$guarded"'. Confirm you have authority (PM for TASKS/DECISIONS, Research for RESEARCH, PM/Docs for CONTEXT_PROJECT)."}}'
    _fc_allow
  fi
done

# Log ALLOWED write operation (file is neither blocked nor guarded).
#
# This is an INTENT trail, not an effect record: we log our own PreToolUse
# verdict, and we cannot see sibling PreToolUse hooks. A write that plan-gate
# denies still lands an ALLOW row here and the file is never created. Any
# consumer of this log must therefore reconcile it against real evidence —
# stop-validator does exactly that against the git tree (DEC-014).
echo "$(date -u '+%Y-%m-%dT%H:%M:%SZ') | ALLOW | $TOOL_NAME | $BASENAME" >> "$LOG_DIR/file-ops.log"

# Allow everything else
_fc_allow
