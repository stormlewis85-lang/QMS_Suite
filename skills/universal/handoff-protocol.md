---
name: handoff-protocol
description: Structured agent-to-agent handoff format ensuring clean task transitions with no dropped context.
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

# Skill: Handoff Protocol

## Purpose
Ensure every agent-to-agent transition communicates exactly what's done, what's open, what to watch for, and what must pass before the task moves forward. Prevents dropped context and silent assumptions.

## When to Use
- Every time an agent completes its portion of a task and passes work to the next agent
- When escalating a blocker to PM or Storm
- When returning results from a subtask back to the requesting agent

## Procedure

1. **Summarize in one line** what you completed.
2. **Fill in the four handoff fields** (Done, Open, Watch, Gate).
3. **Tag the receiving agent** explicitly — never leave handoffs ambiguous.
4. **Include artifacts** — file paths, decision references, or links to relevant output.

## Reference

### Handoff Template

```
**Handoff: [Source Agent] → [Target Agent]**

- **Done:** [What was completed — concrete deliverables, not vague summaries]
- **Open:** [What remains — unfinished items, pending decisions, known gaps]
- **Watch:** [Risks, edge cases, or concerns the next agent should be aware of]
- **Gate:** [Specific checks that must pass before the task advances]
```

### Gate Rules
- Gates are **mandatory** for Standard, Deep, and Autopilot tiers.
- Quick-tier tasks may skip gates at PM's discretion.
- Gates must be **concrete and verifiable** — not subjective opinions.
- The receiving agent is responsible for validating gates before proceeding.

## Anti-Patterns
- Handing off with "it's done, take a look" — always specify what's done and what to check.
- Including subjective gates like "looks good" — gates must be pass/fail.
- Skipping the Watch field — if there's nothing to watch, say "None" explicitly.
- Handing off to "whoever's next" — always name the specific agent.
