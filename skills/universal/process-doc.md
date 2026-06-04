---
name: process-doc
domain: universal
auto-load: false
used-by:
  - pm-agent
  - architect-agent
  - docs-agent
  - qa-agent
description: >-
  Fire when Storm needs to capture a recurring process as a documented SOP,
  build a RACI for a workflow that crosses agents or external collaborators,
  document a customer-facing process for a manufacturing-SaaS product (CAPA
  workflow, layered audit cadence, PPAP submission flow), or formalize a
  podcast/content production loop. Trigger phrases: "process doc", "SOP",
  "RACI", "document this workflow", "how does X work", "who owns this step",
  "swim-lane", "exception handling".
---

# Skill: Process Documentation

## Purpose

A process is a repeatable sequence of steps with a known input, known output,
and explicit ownership at every step. Process documentation makes the implicit
explicit so that the same work can be done the same way without Storm being
in the loop on every iteration.

The mental model: a process doc is not a description of what happens — it is
a contract about what *will* happen, who is responsible at each step, and
what the system does when reality deviates from the happy path. Most
process docs fail because they describe the happy path and leave the
exceptions undocumented; the exceptions are the reason you're writing it.

For Storm specifically: this skill produces *two* kinds of process doc:
internal SOPs (how the agents-master pipeline runs a UI sprint, how content
gets from raw recording to published episode), and *customer-facing* SOPs
embedded in manufacturing-SaaS products (CAPA workflow, LPA cadence, PPAP
submission). Both use the same template — the audience changes, the
discipline doesn't.

## When to Use

- Storm describes a process that "lives in his head" and wants it written down
- A workflow is about to be handed to an agent for repeated execution (Autopilot mode candidates)
- Building a feature in OneCAPA / OneLPA / OnePPAP that *implements* a customer process — the SOP is half spec, half UX
- Onboarding a contractor or future-self after a long gap
- Audit prep: the auditor will ask "show me your SOP for X" and the answer must exist

## Mental Model

> A process doc is owned, scoped, and bounded. **Owned**: someone is accountable
> when it fails. **Scoped**: explicit start/end conditions, no scope creep
> into adjacent processes. **Bounded**: every exception case has a defined
> response — not "use judgment", but "if X then Y, escalate to Z."

The hardest part of process documentation is *not* the steps. It is the
exceptions. "Usually we do X, but sometimes Y" is where institutional
knowledge lives, and where unwritten processes break.

## Approach

### Start messy, structure later

Walk through the process out loud or in a stream of consciousness. Capture
every step, every decision point, every "oh, and sometimes…" Do this before
filling in the template. The template is the second pass, not the first.

### Name the people, even though they may change

Roles get fuzzy. Names are concrete. Write the SOP with named owners (or
named agents — "PM Agent", "Developer Agent"). Future-you can swap the names
when the role changes; abstract roles invite ambiguity.

### Document the exceptions before the happy path is approved

If you cannot list at least three exception cases for a process, you have
not understood it well enough to document it. The exception table is the
quality gate, not a footnote.

### For customer-facing SOPs, write the doc and the spec together

When documenting a process that the product *implements* (e.g., a CAPA
workflow inside OneCAPA), the SOP and the feature spec are the same
artifact at different altitudes. The SOP names the human steps, the spec
names the system support for each step. Build them in parallel.

## Reference

### SOP template

```markdown
## Process: [Name]
**Owner:** [Storm | Agent | Customer role]
**Last updated:** [Date]
**Review cadence:** [Quarterly | Annually | On change]

### Purpose
[Why this process exists. One paragraph. What problem does it solve, what
outcome does it produce?]

### Scope
**Starts when:** [Trigger condition]
**Ends when:** [Completion condition]
**Out of scope:** [What this process explicitly does not cover]

### RACI
| Step | Responsible (does it) | Accountable (owns it) | Consulted | Informed |
|---|---|---|---|---|
| 1. [Step] | [Who] | [Who] | [Who] | [Who] |
| 2. [Step] | [Who] | [Who] | [Who] | [Who] |

### Process flow
[ASCII flowchart, swim-lane sketch, or numbered prose. Show parallel paths
and decision points explicitly.]

### Detailed steps
#### Step 1: [Name]
- **Trigger:** [What kicks this step off]
- **Actor:** [Who performs it]
- **Inputs:** [What they need]
- **Action:** [What they do]
- **Output:** [What this step produces]
- **Validation:** [How you know it was done right]

[Repeat for each step]

### Exceptions and edge cases
| Scenario | Response | Escalation |
|---|---|---|
| [Exception condition] | [What to do] | [Who to involve] |

### Metrics
| Metric | Target | How measured |
|---|---|---|
| [Cycle time, defect rate, etc.] | [Number] | [Source] |

### Related processes
- [Upstream / downstream / sibling SOPs]
```

### Lightweight RACI for solo-builder workflows

When the process is mostly Storm + agents:

| Step | Responsible | Accountable | Consulted | Informed |
|---|---|---|---|---|
| 1. Triage incoming request | PM Agent | Storm | — | — |
| 2. Decompose into tasks | PM Agent | PM Agent | Storm (if Deep tier) | Storm |
| 3. Execute task | Developer Agent | PM Agent | Architect (if structural) | Storm |

Use the RACI even when most cells say "PM Agent" — the exercise of filling
it in surfaces hidden ambiguity.

### Customer-facing SOP example shape (manufacturing context)

For OneCAPA / OneLPA / OnePPAP, the SOP needs to be writable *by* the
customer's quality manager (or auto-generated by the product) and *readable*
by their auditor. That means: include explicit references to the framework
clause being satisfied (e.g., "Step 4 satisfies IATF 16949 §10.2.3") and
include a signed-off-by row at the bottom.

## Gotchas

- _No gotchas documented yet. Add entries when something goes wrong in practice._

## Anti-Patterns

- Documenting only the happy path — the exceptions are why you're writing this
- Using vague verbs ("review", "check", "ensure") without naming the artifact produced
- Writing SOPs in prose paragraphs instead of structured steps — paragraphs hide gaps
- Updating the process without updating the SOP — drift kills the doc within months
- For customer SOPs: assuming the product UX will guide the user, so the doc can be terse. Auditors do not run the UX.
- RACI with multiple "Accountable" entries on the same step — only one party can be accountable

## Related Skills

- `spec-driven-development` — for processes the product implements, the SOP and spec are co-authored
- `compliance-tracking` — most controls need an SOP as their evidence artifact
- `runbook` (if extracted later) — a runbook is an operational subset of a process doc
- `handoff-protocol` — handoffs between agents follow the same RACI logic at micro-scale
