---
name: spec-driven-development
domain: universal
auto-load: false
used-by:
  - pm-agent
description: >
  Requirements to spec to acceptance criteria to task decomposition to agent dispatch.
  A structured pipeline from idea to execution. Triggers: "spec", "requirements",
  "acceptance criteria", "task decomposition", "spec-driven", "define requirements",
  "write a spec".
---

# Skill: Spec-Driven Development

## When to Apply
- When PM receives a new feature request or project requirement
- When a task is too complex for direct assignment (Standard or Deep tier)
- When requirements are ambiguous and need formal definition before work begins
- When multiple agents need to coordinate on a shared deliverable
- When Autopilot mode needs clearly defined task boundaries

## Core Framework

### 1. Requirements Gathering
Before writing a spec, clarify:
- **What** is being requested? (Feature, fix, improvement, research)
- **Why** does this matter? (User need, business goal, technical debt)
- **Who** is affected? (End users, other agents, external systems)
- **What does done look like?** (Observable behavior, measurable outcome)
- **What's out of scope?** (Explicitly state what this does NOT include)

### 2. Spec Structure

```markdown
# Spec: [Feature/Task Name]

## Problem Statement
[1-2 sentences — what problem does this solve?]

## Requirements
1. [Functional requirement — what the system must do]
2. [Functional requirement]
3. ...

## Non-Requirements (Out of Scope)
- [What this explicitly does NOT cover]

## Acceptance Criteria
- [ ] [Given X, when Y, then Z — testable condition]
- [ ] [Given X, when Y, then Z]
- [ ] ...

## Technical Notes
[Optional — any technical context, constraints, or dependencies]

## Open Questions
- [Unresolved question that needs PM or Storm input]
```

### 3. Acceptance Criteria Rules
Every acceptance criterion must be:
- **Testable:** Can be verified as pass/fail.
- **Specific:** Not vague ("works correctly") but precise ("returns 200 with user object").
- **Independent:** Each criterion can be verified on its own.
- **Complete:** All criteria together fully define "done."

Use Given/When/Then format when behavior is conditional:
> Given [precondition], when [action], then [expected result].

### 4. Task Decomposition
Break the spec into tasks for TASKS.md:

1. Map each requirement to one or more tasks.
2. Map each task to an agent (or minimum viable agent team).
3. Identify dependencies between tasks (what must complete before what).
4. Assign scope tier to each task.
5. Define gates between phases (using handoff-protocol skill).

### 5. Agent Dispatch
For each task:
- **Single agent:** Assign directly with clear acceptance criteria.
- **Multi-agent pipeline:** Define handoff sequence with gates.
- **Parallel agents:** Identify independent tasks that can run concurrently.

## Output Format

```markdown
## Spec: [Name]

### Problem Statement
[1-2 sentences]

### Requirements
1. [Requirement]
2. [Requirement]

### Acceptance Criteria
- [ ] [Criterion]
- [ ] [Criterion]

### Task Breakdown
| Task | Agent | Tier | Depends On | Gate |
|---|---|---|---|---|
| [Task 1] | [Agent] | [Quick/Standard] | None | [Gate criteria] |
| [Task 2] | [Agent] | [Quick/Standard] | Task 1 | [Gate criteria] |

### Open Questions
- [Question needing resolution before work begins]
```

## Integration with Other Skills
- **context-budget**: Specs are compact context artifacts — they survive compaction and inform context loading.
- **session-persistence**: Spec files serve as persistent state for multi-session tasks.
- **handoff-protocol**: Task decomposition defines handoff points with gates.
- **research-methodology**: Ambiguous requirements may trigger research before spec can be written.
