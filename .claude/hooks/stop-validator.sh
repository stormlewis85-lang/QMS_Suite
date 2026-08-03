#!/usr/bin/env bash
# Stop Validator: Enforce completion protocol before Claude stops
# Exit 0 = allow stop, Exit 2 = force Claude to continue (with reason on stderr)
#
# Fail-closed (Slice 2 / E4a mv2): a crash force-continues (exit 2) rather than
# silently allowing the stop; empty stdin allow-stops (loop-safety — we cannot
# read the re-entry signal). Via lib-hook-failclosed.sh with an inline fallback.
set -euo pipefail

# ── Fail-closed substrate (source from own dir; inline fallback if absent) ───
_HOOK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if ! . "$_HOOK_DIR/lib-hook-failclosed.sh" 2>/dev/null; then
  _FC_DONE=0; _FC_REENTRY=0
  _fc_trap() { local rc=$?; if [ "$_FC_DONE" = 1 ]; then exit "$rc"; fi; if [ "$_FC_REENTRY" = 1 ]; then exit 0; fi; printf '[stop-validator] internal error (rc=%s) — failing closed (force-continue)\n' "$rc" >&2; exit 2; }
  _fc_init() { trap _fc_trap EXIT; _FC_INPUT="$(cat 2>/dev/null || true)"; if printf '%s' "$_FC_INPUT" | grep -q '"stop_hook_active"[[:space:]]*:[[:space:]]*true'; then _FC_REENTRY=1; fi; if [ -z "${_FC_INPUT//[[:space:]]/}" ]; then _fc_pass; fi; }
  _fc_pass() { _FC_DONE=1; exit 0; }
  _fc_block() { _FC_DONE=1; if [ -n "${1:-}" ]; then printf '%s\n' "$1" >&2; fi; exit 2; }
fi
_fc_init stop
INPUT="$_FC_INPUT"
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
LOG_DIR="$PROJECT_DIR/.claude/logs"
SESSION_MARKER="$LOG_DIR/.session-id"
mkdir -p "$LOG_DIR"

# Allow-stop is now pure: it must NOT touch the marker or the ops log.
#
# The old version deleted both on every allowed stop, assuming a stop ends a
# session. It does not — Stop hooks fire at every TURN boundary, so that cleanup
# wiped the log mid-session and the completion check below only ever saw the
# current turn. A TASKS.md update from an earlier turn became invisible,
# producing the chronic false block this slice removes (DEC-014). Log lifecycle
# now belongs solely to pre-tool-guard, keyed on session_id.
_allow_stop() {
  _fc_pass
}

# Check if this is a stop-hook re-entry (prevent infinite loops).
# stop_hook_active is an unquoted JSON boolean — grep it, no python (TASK-008).
if printf '%s' "$INPUT" | grep -q '"stop_hook_active"[[:space:]]*:[[:space:]]*true'; then
  echo "$(date -u '+%Y-%m-%dT%H:%M:%SZ') | STOP | re-entry, allowing" >> "$LOG_DIR/session.log"
  _allow_stop
fi

# Log session stop (UTC, consistent with pre-tool-guard — TASK-008)
echo "$(date -u '+%Y-%m-%dT%H:%M:%SZ') | STOP | session ending" >> "$LOG_DIR/session.log"

# ── Completion check: session-scoped intent, reconciled against the tree ────
#
# file-ops.log records what pre-tool-guard INTENDED to allow, which is not the
# same as what happened: a sibling PreToolUse hook (plan-gate) can deny a write
# that is already logged ALLOW here. Counting the log alone therefore fires on
# writes that never landed. Each logged path must show real evidence in the git
# tree — dirty, or committed inside this session's window — before it counts.
#
# Matching is by basename, which is what the log records. Two same-named files
# in different directories are indistinguishable here; the cost is a slightly
# wrong count on a completion nag, and it is not worth a log-format break to
# close. Non-git projects keep the old log-only behaviour (see GIT_OK).
SESSION_ID=$(printf '%s' "$INPUT" | sed -n 's/.*"session_id"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -n 1)
MARKER_SID=""; SESSION_START=""
if [ -f "$SESSION_MARKER" ]; then
  MARKER_SID=$(sed -n '1p' "$SESSION_MARKER" 2>/dev/null || true)
  SESSION_START=$(sed -n '2p' "$SESSION_MARKER" 2>/dev/null || true)
fi

# A log written by a different session is stale: this session changed nothing.
# pre-tool-guard rotates on its first write; until then the rows are not ours.
if [ -n "$SESSION_ID" ] && [ -n "$MARKER_SID" ] && [ "$MARKER_SID" != "$SESSION_ID" ]; then
  _allow_stop
fi

# Basenames with real evidence: dirty in the worktree, or committed this session.
# Rename rows ("R  old -> new") reduce to the destination, which is the file
# that now exists. Every git call is optional — a failure must never crash the
# hook into its fail-closed trap and force-continue on a healthy session.
_evidence() {
  # -uall lists untracked files individually; the default collapses a new
  # directory to "newdir/", which would hide every file created inside it.
  git -C "$PROJECT_DIR" status --porcelain -uall 2>/dev/null | sed 's/^...//; s/.* -> //' || true
  if [ -n "$SESSION_START" ]; then
    git -C "$PROJECT_DIR" log --since="$SESSION_START" --name-only --format= 2>/dev/null || true
  fi
}

GIT_OK=0
git -C "$PROJECT_DIR" rev-parse --git-dir >/dev/null 2>&1 && GIT_OK=1
EVIDENCE=""
[ "$GIT_OK" = 1 ] && EVIDENCE=$(_evidence | sed 's#.*/##; s/^"//; s/"$//' | sort -u)

CHANGES=0
TASKS_UPDATED=0
if [ -f "$LOG_DIR/file-ops.log" ]; then
  while IFS= read -r row || [ -n "$row" ]; do
    case "$row" in
      *"| ALLOW | "*|*"| WARN | "*) ;;
      *) continue ;;
    esac
    NAME="${row##*| }"
    [ -n "$NAME" ] || continue
    # Unreconciled (non-git) projects count intent, as before.
    if [ "$GIT_OK" = 1 ]; then
      printf '%s\n' "$EVIDENCE" | grep -qxF "$NAME" || continue
    fi
    CHANGES=$((CHANGES + 1))
    [ "$NAME" = "TASKS.md" ] && TASKS_UPDATED=1
  done < "$LOG_DIR/file-ops.log"
fi

if [ "$CHANGES" -gt 0 ] && [ "$TASKS_UPDATED" = "0" ]; then
  echo "COMPLETION CHECK: You modified $CHANGES files this session but TASKS.md was not updated. Update task status before stopping." >&2
  _fc_block
fi

_allow_stop
