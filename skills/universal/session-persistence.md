---
name: session-persistence
domain: universal
auto-load: false
used-by:
  - pm-agent
description: >
  File-based state persistence across context windows using the planning-with-files
  pattern. Ensures no work is lost during compaction or session boundaries. Triggers:
  "session persistence", "save state", "context lost", "planning with files",
  "persist across sessions", "state management", "compaction safety".
---

# Skill: Session Persistence

## When to Apply
- Before context compaction to preserve in-progress work
- At the end of sessions to capture current state
- When switching between tasks that require different context
- When multi-agent workflows need state shared across isolated contexts
- When a session is interrupted unexpectedly

## Core Framework

### 1. State File Hierarchy
Persistent state lives in files, not conversation context:

| File | What It Persists | Update Frequency |
|---|---|---|
| TASKS.md | Task status, assignments, blockers | Every task state change |
| DECISIONS.md | Architectural and strategic decisions | When decisions are made |
| RESEARCH.md | Research findings and sources | When research is completed |
| PATTERNS.md | Codebase conventions | When patterns are established |
| CONTEXT_PROJECT.md | Project-level state and configuration | When project state changes |
| Domain memory files | Domain-specific state (ROSTER.md, INTEL.md, etc.) | As defined by domain config |

### 2. Pre-Compaction Checklist
Before any compaction event:
- [ ] Current task status updated in TASKS.md
- [ ] Any decisions made in this session added to DECISIONS.md
- [ ] Any research findings added to RESEARCH.md
- [ ] In-progress work summarized in a state file or task comment
- [ ] Handoff state captured if work is being passed to another agent

### 3. Planning-with-Files Pattern
For complex, multi-step tasks that may span compaction boundaries:

1. **Create a plan file** at task start: `.claude/plans/<task-id>.md`
2. **Structure the plan** with checkboxes for each step.
3. **Update the plan file** as steps complete — check off items, add notes.
4. **Reference the plan file** at session resume — it tells you exactly where you left off.
5. **Delete the plan file** when the task is complete.

```markdown
# Plan: [Task Title]
Created: [Date]
Status: In Progress

## Steps
- [x] Step 1: [Description] — Done [Date]
- [x] Step 2: [Description] — Done [Date]
- [ ] Step 3: [Description] — IN PROGRESS
  - Notes: [Where you left off, what's remaining]
- [ ] Step 4: [Description]
- [ ] Step 5: [Description]

## Context
- Key decision: [Reference DECISIONS.md entry]
- Blocker: [If any]
```

### 4. Session Resume Protocol
When starting a new session or resuming after compaction:
1. Read TASKS.md — what's the current state?
2. Check `.claude/plans/` — any in-progress plan files?
3. Read the plan file — it tells you exactly where to resume.
4. Load only the context needed for the current step (see context-budget skill).
5. Continue from where the plan file says you left off.

### 5. Emergency State Save
If you detect that compaction is imminent or a session may end:
- Write a quick summary to the relevant state file.
- Favor completeness over formatting — capture what matters, clean up later.
- Include: what was being worked on, what's done, what's next, any blockers.

## Output Format

```markdown
## Session State — [Date/Time]

### Active Task
- Task: [From TASKS.md]
- Status: [In Progress / Blocked / Completing]
- Current step: [Where you are in the plan]

### Unsaved Context
- [Any decisions, findings, or state not yet written to files]

### Resume Instructions
1. [First thing to do when resuming]
2. [Second thing]
```

## Integration with Other Skills
- **context-budget**: Budget determines when compaction is needed; this skill ensures nothing is lost.
- **context-management**: Context management governs what to load; session persistence governs what to save.
- **handoff-protocol**: Handoffs between agents persist state through the Done/Open/Watch format.
- **spec-driven-development**: Spec files are a form of persistent state that survives compaction.
