---
name: skill-name
domain: universal
auto-load: false
used-by:
  - agent-name
description: >-
  One sentence from the model's perspective — when should this skill fire?
  Include trigger phrases, user intent signals, and conditions. Do NOT describe
  what the skill "provides" or "handles" — describe when to reach for it.
  Example format: "Fire when the user requests a code review, when a PR is ready
  for merge, or when the quality pipeline reaches the code-review gate.
  Trigger phrases: 'review', 'PR ready', 'check my code', 'look this over'."
---

# Skill: [Skill Name]

## Purpose

One paragraph: What mental model does this skill teach? What is the underlying
framework or philosophy the agent should internalize when applying this skill?

This is NOT a feature list. It is the lens the agent should look through when
a trigger fires.

## When to Use (Triggers)

- Exact user prompts or situations that should fire this skill
- Pipeline stages where this skill activates
- Which agent role typically owns this skill

## Mental Model

Describe the conceptual framework. Goals and constraints, not sequential steps.

Example:
> A good API design balances developer experience (predictable conventions),
> contract stability (versioning strategy), and security (input validation at
> boundaries). When the three conflict, pick the axis most important for the
> use case.

## Approach

When concrete guidance is necessary, group by goal — not sequence. Prefer
decision matrices, patterns, and reference code over prescriptive step lists.
If step-by-step is genuinely required, keep steps minimal and justified.

## Reference

Tables, decision matrices, code patterns, pseudo-code, formulas — concrete
artifacts the agent can consult. Prose belongs in Mental Model, not here.

## Gotchas

Known failure modes, silent assumptions, and edge cases that have tripped Claude
or developers in practice. Populate as failures occur in real sessions.

- _No gotchas documented yet. Add entries when something goes wrong in practice._

## Anti-Patterns

Common mistakes to avoid when applying this skill.

## Related Skills

- Skills that complement this one
- Skills that conflict with this one (and how to choose)
