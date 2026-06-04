---
name: context-management
description: >-
  Auto-loads at session start so agents know which project context files to
  read, when to update them, and how to reference existing knowledge before
  regenerating it. Fire explicitly when the user asks what was previously
  researched or decided, when an agent is about to redo work that likely
  exists in DECISIONS.md or RESEARCH.md, or when session state needs to be
  persisted before handoff. Trigger phrases: "what did we decide", "did we
  already research this", "check DECISIONS.md", "update context", "persist
  this to file", "what's in TASKS.md", "end-of-session update".
domain: universal
auto-load: true
used-by:
  - pm-agent
  - architect-agent
  - developer-agent
  - test-agent
  - qa-agent
  - research-agent
  - docs-agent
---

# Skill: Context Management

## Purpose
Ensure agents efficiently load the right context at session start, reference existing knowledge before regenerating it, and keep persistent state files current. Prevents redundant work and stale state.

## When to Use
- At the start of every session
- Before beginning research or analysis on any topic
- After completing work that changes project state
- When context seems stale or contradictory

## Procedure

### Session Start
1. Read `CLAUDE.md` — always first.
2. Read `TASKS.md` — understand current project state and what's in progress.
3. Read `DECISIONS.md` if the current task involves architectural or strategic choices.
4. Read `RESEARCH.md` if the current task involves a previously researched topic.
5. Read domain config (`/domains/<domain>.md`) for domain-specific behavior.
6. Read `CONTEXT_PROJECT.md` for project-specific conventions.
7. Read `PATTERNS.md` if the task involves producing deliverables.

### Before Generating New Analysis
1. **Check RESEARCH.md** — has this topic been explored before?
2. **Check DECISIONS.md** — has a decision already been made on this?
3. If prior work exists, **reference it** — don't regenerate.
4. If prior work is stale or incomplete, **extend it** — don't start from scratch.

### After Completing Work
1. Update `TASKS.md` with task status changes.
2. Update `DECISIONS.md` if a new decision was made.
3. Update `RESEARCH.md` if new findings were discovered.
4. Update `CONTEXT_PROJECT.md` if project state changed.
5. Update domain-specific memory files as defined in the active domain config.

## Reference

### Context File Hierarchy
```
CLAUDE.md                    ← Entry point, read first
├── CONTEXT_MASTER.md        ← Universal standards
├── /domains/<domain>.md     ← Domain behavior
├── CONTEXT_PROJECT.md       ← Project specifics (overrides where conflicts)
├── PATTERNS.md              ← Conventions for deliverables
├── TASKS.md                 ← Current work state
├── DECISIONS.md             ← Past decisions
└── RESEARCH.md              ← Past research
```

### Token Economy Rules
- **Quick tier:** Load only TASKS.md + the minimum context needed.
- **Standard tier:** Load standard context chain.
- **Deep tier:** Load full context including research and decisions history.
- Match context loading to the tier — don't over-read for Quick tasks.

## Anti-Patterns
- Reading every context file for a Quick-tier typo fix.
- Regenerating research that already exists in RESEARCH.md.
- Forgetting to update state files after completing work.
- Loading domain config for the wrong domain.
- Treating context files as append-only — prune stale content.

## Gotchas

- Agents re-research topics already in RESEARCH.md because they don't check first. The auto-load of this skill exists specifically to prevent that — don't skip the conditional read.
- State files drift when sessions end without the end-of-session update. Put the update step in the task's acceptance criteria, not as a "nice-to-have" afterword.
- Reading the entire TASKS.md board when you only need one task wastes tokens. Read the specific task brief, not the full board, unless PM is triaging.
- CONTEXT_MASTER.md is a first-task read. Loading it every session is wasted context — internalize it once.

