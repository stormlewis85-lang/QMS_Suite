---
name: reflexion-protocol
domain: universal
auto-load: true
used-by:
  - all-agents
description: >-
  Auto-loads for every agent. Forces a self-check loop before any agent
  declares work complete — reread acceptance criteria, test the output
  against them, flag unresolved gaps. Fire explicitly when the user asks to
  double-check work, verify a handoff, or run a "reflexion" pass. Trigger
  phrases: "are you sure", "did you verify", "reflexion", "self-check",
  "double-check this before handoff", "before you declare done".
---

# Skill: Reflexion Protocol

> Universal protocol upgrade — applies to all agents across all domains.
> Originally a patch to AGENT_TEMPLATE.md's `## Handoff Protocol` section;
> now the canonical Handoff Protocol reference agents load at session start.
> The code block below is the current Handoff Protocol — agents should treat
> this as the authoritative version.

## Canonical Handoff Protocol Section

```markdown
## Handoff Protocol

### Pre-Handoff Self-Check
<!-- Every agent runs this before writing the Done/Open/Watch handoff. -->
<!-- This is not optional. Skip only if PM explicitly waives for a Quick-tier task. -->

Before declaring work complete, verify:

1. **Requirements match.** Re-read the acceptance criteria from TASKS.md. Does the output satisfy every criterion? If any criterion is unmet, either address it or move it to Open with justification.
2. **Scope discipline.** Does the output stay within the assigned task scope? Flag anything that drifted — added scope goes to Open, not Done.
3. **Own-lane check.** Did you stay in your lane, or did you make decisions that belong to another agent? If you crossed a boundary, call it out.
4. **Failure modes.** What breaks this? Identify the most likely failure and confirm it's either handled or flagged in Watch.
5. **Completeness gut check.** If another agent picked this up cold with only your handoff brief, would they have everything they need? If not, what's missing?

### Handoff Brief
<!-- What this agent documents when passing work forward. -->
<!-- Format: Done | Open | Watch -->
```

---

## How It Works in Practice

The self-check adds ~30 seconds of agent "thinking" before handoff. It catches:

- **Drifted scope** — agent added unrequested work or missed a requirement
- **Lane violations** — developer making architecture calls, QA writing code
- **Silent gaps** — things the agent knows are incomplete but didn't flag
- **Broken handoffs** — next agent can't pick up the work without asking clarifying questions

### Scope Tier Behavior

| Tier | Self-Check Behavior |
|------|-------------------|
| **Quick** | PM can waive. If not waived, agent runs checks mentally but doesn't document them — just writes the handoff. |
| **Standard** | Full self-check. No documentation of the check itself — it's internalized. The handoff brief reflects the outcomes. |
| **Deep** | Full self-check. Agent briefly notes any corrections made during self-check in the handoff brief under a `Self-corrections` line. |

### What Changes for Existing Agents

No agent config needs rewriting. The self-check is inherited from the template. Individual agent handoff sections (the Done/Open/Watch specifics) remain unchanged — they just gain the pre-step.

Agents that already have strong handoff discipline (QA's rejection protocol, Test's structured reports) benefit the most from checks 1-3. Agents with weaker handoff habits (Developer, Docs) benefit most from check 5.

---

## Example: Developer Agent After Patch

```
## Handoff Protocol

### Pre-Handoff Self-Check
Before declaring work complete, verify:
1. Requirements match — re-read acceptance criteria from TASKS.md
2. Scope discipline — output stays within assigned task scope
3. Own-lane check — no decisions made outside Developer authority
4. Failure modes — most likely failure is handled or flagged
5. Completeness gut check — Test Agent can pick this up cold

### Handoff Brief
When passing code to Test Agent:
- **Done:** Files created/modified, what the code does, how to run it
- **Open:** Known limitations or incomplete areas within scope
- **Watch:** Edge cases considered, areas most likely to have issues, dependencies added
```

---

## Implementation Notes

- The 5-point checklist is intentionally short. Longer checklists get skipped.
- Checks are sequential — requirements match comes first because it's the most common failure.
- "Completeness gut check" is last because it's the meta-check that catches anything the first four missed.
- The self-check is a thinking step, not an output step. Agents don't write "I checked my work" — they just produce better handoffs because they checked.
- For Deep-tier tasks, the `Self-corrections` line creates a lightweight audit trail without adding bureaucracy to Standard work.

## Gotchas

- Self-check loops become performative if the agent treats them as a formality. The value is in *actually* rereading acceptance criteria and testing each one, not in writing "I verified" at the end of a handoff.
- "I ran the tests" is not verification unless the agent actually names which tests ran and what they covered. Vague claims hide gaps.
- Reflexion can loop indefinitely on ambiguous acceptance criteria. If the third pass still surfaces unresolved gaps, escalate to PM — don't pretend they're minor.
- Skipping reflexion on "quick" tasks is where regressions live. The hook between a 5-minute fix and a 20-minute bug is usually "no one reread the criteria."

