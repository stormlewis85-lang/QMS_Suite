#!/usr/bin/env bash
# lib-hook-failclosed.sh — fail-closed substrate for blocking hooks (Slice 2 / E4a).
#
# A blocking hook may be bypassed by contract, never by its own bug. Claude Code
# treats any non-2 exit from a PreToolUse/Stop hook as NON-blocking (allow), so a
# crash under `set -euo pipefail` silently fails OPEN. This library converts every
# un-blessed termination into the fail-closed decision, and blocks on empty stdin.
#
# CONTRACT — source at the TOP of a blocking hook, before any real work:
#     set -euo pipefail
#     . "$(dirname "${BASH_SOURCE[0]}")/lib-hook-failclosed.sh"
#     _fc_init pretooluse          # or: _fc_init stop
#     INPUT="$_FC_INPUT"           # stdin, already read by _fc_init (do NOT re-cat)
#     ...hook logic...
#     _fc_allow                    # PreToolUse: allow the call        (exit 0)
#     _fc_block "reason"           # PreToolUse/Stop: block            (exit 2)
#     _fc_pass                     # Stop: allow the stop              (exit 0)
#
# REQUIRES the host set `set -e`: without it a failing command does not abort, so
# the script could continue to a wrong _fc_allow. With it, a failure aborts into
# the EXIT trap, which fails closed. The `_FC_DONE` sentinel is how the trap tells
# an intended exit (allow/block/pass ran) from a crash (it did not).
#
# Empty-stdin policy is mode-asymmetric BY DESIGN:
#   pretooluse -> BLOCK (a guard fed nothing cannot identify the tool/target; the
#                 security boundary — GATE-08).
#   stop       -> allow-stop. A Stop gate that force-continues when it cannot even
#                 read the stop_hook_active re-entry signal risks an unbreakable
#                 loop; Stop hooks here are completion/integrity nudges, not
#                 security boundaries, so loop-safety wins.
#
# Pure bash + grep. No jq/python. No git spawns (hot path: fires on every write).

_FC_MODE="pretooluse"
_FC_DONE=0
_FC_REENTRY=0
_FC_INPUT=""

# PreToolUse deny, stdout JSON form (Claude Code surfaces the reason to the model).
_fc_deny_json() { # <reason>
  printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"%s"}}\n' "$1"
}

# EXIT trap: fires on EVERY exit. If an intended exit already decided (_FC_DONE=1)
# re-exit with its code; otherwise this is a crash -> fail closed for the mode.
_fc_trap() {
  local rc=$?
  if [ "$_FC_DONE" = 1 ]; then exit "$rc"; fi
  if [ "$_FC_MODE" = "stop" ]; then
    # Never trap a re-entry into a loop; otherwise force the model to continue.
    if [ "$_FC_REENTRY" = 1 ]; then exit 0; fi
    printf '[hook] internal error (rc=%s) — failing closed (force-continue)\n' "$rc" >&2
    exit 2
  fi
  _fc_deny_json "BLOCKED (fail-closed): hook internal error (rc=$rc). A guard that cannot evaluate must not allow."
  printf '[hook] internal error (rc=%s) — failing closed (block)\n' "$rc" >&2
  exit 2
}

_fc_init() { # <mode: pretooluse|stop> [empty_policy: block|pass|proceed]
  _FC_MODE="${1:-pretooluse}"
  # Empty-stdin policy. Default by mode: pretooluse -> block (security boundary,
  # GATE-08); stop -> pass (loop-safety — see header). A dual-mode hook that can
  # still function without stdin (e.g. verify-lessons in standalone `<file>`
  # mode) passes 'proceed' to keep the crash trap but not short-circuit on empty.
  local ep="${2:-}"
  if [ -z "$ep" ]; then
    if [ "$_FC_MODE" = "stop" ]; then ep="pass"; else ep="block"; fi
  fi
  trap _fc_trap EXIT
  _FC_INPUT="$(cat 2>/dev/null || true)"
  # Re-entry detection (read BEFORE any strict logic). if-form keeps it set -e safe.
  if printf '%s' "$_FC_INPUT" | grep -q '"stop_hook_active"[[:space:]]*:[[:space:]]*true'; then
    _FC_REENTRY=1
  fi
  if [ -z "${_FC_INPUT//[[:space:]]/}" ]; then
    case "$ep" in
      pass)    _fc_pass ;;
      proceed) : ;;
      *)       _FC_DONE=1
               _fc_deny_json "BLOCKED (fail-closed): empty hook payload — cannot identify the tool or target file."
               printf '[hook] empty payload — failing closed (block)\n' >&2
               exit 2 ;;
    esac
  fi
}

_fc_allow() { _FC_DONE=1; exit 0; }   # PreToolUse: allow the tool call
_fc_pass()  { _FC_DONE=1; exit 0; }   # Stop: allow the stop
# Intended block. The caller emits its own rich message first (plan-gate heredoc /
# pre-tool-guard JSON); an optional <reason> is appended to stderr. No JSON is
# emitted here so callers keep full control of the block payload.
_fc_block() { # [reason]
  _FC_DONE=1
  if [ -n "${1:-}" ]; then printf '%s\n' "$1" >&2; fi
  exit 2
}
