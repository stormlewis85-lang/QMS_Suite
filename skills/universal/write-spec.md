---
name: write-spec
domain: universal
auto-load: false
used-by:
  - pm-agent
  - architect-agent
  - developer-agent
description: >-
  Fire when Storm has converged on what to build (after `product-brainstorming`
  or in response to a customer ask) and needs to turn it into a structured
  spec before development starts. Trigger phrases: "write the spec",
  "draft a PRD", "scope this feature", "what are the requirements",
  "acceptance criteria", "non-goals", "P0 / P1 / P2", "MoSCoW",
  "let's get this on paper". Distinct from `product-brainstorming`
  (divergent thinking before the spec) and `architecture` (technical
  decision records that may follow the spec). For Storm's portfolio:
  every meaningful feature in OneCAPA / OneLPA / OnePPAP / PFMEASuite
  earns a spec; podcast / fantasy / MLB analytics earn lighter specs but
  still benefit from explicit goals and non-goals.
---

# Skill: Write Spec

## Purpose

A spec is the *contract between intention and implementation*. The mental
model: writing it down forces the questions Storm would otherwise discover
mid-build, when answering them is expensive. A spec earns its keep when
Storm reads it after building and can verify the thing built matches what
was scoped — and when future-Storm can reconstruct *why* this was built
this way without spelunking through commits.

For solo work, the temptation to skip the spec is constant. The argument
("I'm the one building it; I know what I want") feels right and is wrong.
Skipped specs produce: scope creep ("while I'm in there…"), ambiguous
done-state ("it works on my machine, ship?"), and forgotten non-goals
("oh I added that thing we said we wouldn't"). The spec is cheap insurance
against all three.

## When to Use

- Any meaningful feature in the manufacturing-SaaS portfolio (OneCAPA,
  OneLPA, OnePPAP, PFMEASuite) — features that touch customer workflows,
  data shape, or compliance scope must have specs
- A customer ask that needs scoping before commitment
- After `product-brainstorming` converges on a direction
- A roadmap item moves from "Next" to "Now" — write the spec before
  starting build
- A vague idea ("we should do something about X") needs to either become
  concrete or get parked
- Multi-product features that need consistent scope across the portfolio
  — the spec is the cross-product source of truth
- For lighter-weight projects (MyWhiskeyPedia features, fantasy strategy
  docs, podcast series): a one-page spec; not skipped, just compressed

## Mental Model

> **A spec is goals, non-goals, requirements (P0/P1/P2), and acceptance
> criteria.** Goals tell you why this matters. Non-goals tell you what to
> *not* do. Requirements tell you what to build, prioritized by what
> ships if time runs short. Acceptance criteria tell you when it's done.
> Missing any of the four produces a spec that won't survive contact with
> reality.

The spec is *also* a stress-test of the idea. If you can't write a
problem statement in 2–3 sentences, the problem isn't well understood.
If you can't list 3–5 non-goals, the scope hasn't been pressure-tested.
If acceptance criteria are vague ("works well", "user-friendly"), the
done-state isn't real.

For solo-portfolio work, add **scope: which products** and **carryover
implications: what does this do to other products in the portfolio?** —
specifically, does this become a new shared pattern, or an intentional
single-product divergence? Without those, OneCAPA and OnePPAP slowly
drift apart on the same problem.

## Approach

### Write the problem statement first; iterate it

The 2–3 sentence problem statement is the hardest part of the spec.
Iterate it. Show it to yourself an hour later. If it doesn't survive
re-reading, the spec isn't ready. Most specs that fail in implementation
fail because the problem wasn't crisp.

### Write 3–5 non-goals before any requirements

Goals are easy; non-goals are where scope discipline lives. Write what
this *won't* do — explicitly — before listing what it will. This is the
move that prevents scope creep three weeks into the build.

### Categorize requirements by ship-if-cut, not by importance

P0 = the feature doesn't work without this; cutting it kills the spec.
P1 = significantly improves the experience; usually a fast follow.
P2 = future consideration; design to allow but don't build now.

Be ruthless about P0. The classic test: "If we cut this, does the spec
still solve the core problem?" If yes, it's P1 — even if you really
want it.

### Acceptance criteria in Given/When/Then or checklist

Vague acceptance criteria ("works well", "fast enough") let half-built
features ship. Concrete criteria force the question of done. Use
Given/When/Then for behavior-rich features; use a checklist for
discrete capabilities. Either way, every criterion should be
independently testable.

### Capture open questions explicitly, with owners and blocking status

Every spec has unknowns. Hiding them produces mid-build surprises.
Surface them: question, who answers it, blocking-or-not. The act of
listing them often reveals the spec needs more pre-work before
implementation can start.

### For solo-portfolio work, add scope and carryover sections

Two lines that protect the portfolio:

- **Scope:** which products this applies to (just OneCAPA, or all four
  manufacturing-SaaS apps, or shared brand library?)
- **Carryover implications:** if shipped here, does the same problem
  exist elsewhere? Is this a candidate for promotion to a shared pattern
  in the brand library or PATTERNS.md?

Without these, single-product specs accumulate into portfolio drift.

## Reference

### Full spec template (manufacturing-SaaS pattern)

```markdown
# Spec: [Feature name]
**Project:** [OneCAPA | OneLPA | OnePPAP | PFMEASuite | MyWhiskeyPedia | ...]
**Date:** [YYYY-MM-DD]
**Status:** Draft | Ready | In progress | Shipped | Cancelled
**Owner:** Storm

## Problem statement
[2–3 sentences. Who experiences the problem, how often, what does it
cost them, what evidence shaped this scope?]

## Goals
1. [Specific, measurable outcome]
2. [...]
3. [...]

## Non-goals
1. [Explicitly out of scope] — [Why excluded: too complex, too small,
   separate initiative, premature]
2. [...]
3. [...]

## Scope (portfolio context)
**Applies to:** [Single product | Multi-product list | Shared infra]
**Carryover implications:** [If shipped here, what does it imply for
other portfolio products? Is this a candidate for a shared pattern?]

## Users / personas
**Primary:** [Specific user type — e.g., "quality manager at a Tier-1
automotive supplier doing weekly CAPA review"]
**Secondary:** [Other affected user types]

## User stories
- As a [user type], I want [capability] so that [benefit]
- As a [user type], I want [capability] so that [benefit]
- (Include edge cases — error states, empty states, boundary conditions)

## Requirements

### P0 — Must ship
- [ ] [Requirement] — [Acceptance: Given/When/Then or condition]
- [ ] [Requirement] — [Acceptance]

### P1 — Should ship
- [ ] [Requirement] — [Acceptance]

### P2 — Future considerations
- [ ] [Requirement] — [Note about how the design should accommodate this
      later without committing to it now]

## Success metrics
**Leading (visible within days–weeks):**
- [Metric] — [Target] — [Measurement method]

**Lagging (visible weeks–quarters):**
- [Metric] — [Target] — [Measurement method]

## Compliance / regulatory considerations
[Specifically for OneCAPA / OneLPA / OnePPAP / PFMEASuite — does this
touch audit-trail, e-signature, immutable record, or access-control
scope? See `compliance-tracking`.]

## Open questions
| Question | Who answers | Blocking? |
|---|---|---|
| [Q] | Storm / agent / customer / external | Yes / No |

## Timeline considerations
- **Hard deadlines:** [Customer commitments, audit dates, season starts]
- **Dependencies:** [Other work that must complete first]
- **Phasing (if too large for one release):** [Phase 1 / Phase 2 / ...]

## Linked artifacts
- ADR(s): [link]
- Brainstorm capture: [link]
- Customer conversations: [link]
- Roadmap entry: [link]
```

### Lighter-weight spec (for content / fantasy / podcast work)

```markdown
# Spec: [Name]
**Project:** [Frontier Podcast | MyWhiskeyPedia | Dynasty | MLB analytics]
**Date:** [YYYY-MM-DD]

## What
[1–2 sentences — what's being created]

## Why
[1–2 sentences — what audience need / strategic reason this serves]

## Goals (1–3)
- [Outcome]

## Non-goals (1–3)
- [Out of scope] — [why]

## Acceptance
- [How we'll know it's done — concrete checklist]

## Open questions
- [Q]
```

### Requirement categorization (MoSCoW mapped to P0/P1/P2)

| MoSCoW | This skill's tier | Test |
|---|---|---|
| Must have | P0 | "If we cut this, does the spec still solve the core problem?" If no → P0 |
| Should have | P1 | Significantly improves experience; usually a fast follow |
| Could have | P2 | Design-to-allow but don't build now |
| Won't have | Listed in non-goals | Explicitly out of scope |

### User-story quality checklist

- **Independent** — can be built and shipped on its own
- **Negotiable** — details can be discussed; not a contract
- **Valuable** — delivers user value (not just team satisfaction)
- **Estimable** — solo-Storm can roughly size it
- **Small** — completes in one sprint; otherwise split it
- **Testable** — there's a clear way to verify

Common bad-story patterns:
- "As a user, I want the product to be faster" — what specifically?
- "As a user, I want a dropdown menu" — UI prescription, not a need
- "As a user, I want to click a button" — no benefit stated
- "As the engineering team, we want to refactor" — task, not user story

### Acceptance criteria patterns

**Given/When/Then** (behavior-rich features):
```
Given the customer has submitted a PPAP record
When the record is missing the dimensional report
Then the system flags it as incomplete and notifies the customer
```

**Checklist** (discrete capabilities):
```
- [ ] Admin can configure SSO provider URL in organization settings
- [ ] Team members see "Log in with SSO" button on login page
- [ ] SSO login creates a new account if one does not exist
- [ ] Failed SSO attempts show a clear error message with remediation guidance
```

Both formats: cover happy path, error cases, edge cases, and what should
*not* happen (negative cases).

### Success metric patterns

**Leading (changes within days–weeks):**
- Adoption rate: % of eligible users who try the feature
- Activation rate: % who complete the core action
- Task completion rate: % who succeed at the workflow
- Time-to-complete: how long the core flow takes
- Error rate: how often users hit dead ends

**Lagging (changes weeks–months):**
- Retention impact
- Revenue / conversion impact
- Support-ticket reduction
- NPS / satisfaction change
- Competitive win rate

### Scope-creep prevention checklist

- Have I written 3–5 non-goals?
- Does every P0 pass the "still solves the core problem if cut?" test?
- Is there a clear v1 / v2 separation?
- Have I time-boxed any open investigation? ("If I can't figure out X
  in 2 days, it's cut")
- Is there a "parking lot" for good ideas that aren't in scope?

## Gotchas

- _No gotchas documented yet. Add entries when something goes wrong in practice._

## Anti-Patterns

- Skipping the spec because "I'm the one building it"
- Vague problem statement ("users are unhappy") that won't survive re-reading
- No non-goals — guarantees scope creep
- Everything is P0 — nothing is P0
- Acceptance criteria with weasel words ("user-friendly", "fast enough")
- Open questions hidden or omitted — they surface mid-build as surprises
- Spec written for one product without surfacing portfolio implications
- Solution-prescriptive user stories ("user wants dropdown") instead of need-based
- Success metrics that are unmeasurable — define the metric, the target, and the measurement method
- Spec that doesn't link back to the brainstorm, the customer ask, or the roadmap item — orphan specs accumulate
- Treating the spec as immutable — specs change as you learn; mark changes, don't pretend they didn't happen

## Related Skills

- `product-brainstorming` — divergent thinking that should *precede* the spec
- `architecture` — technical decisions inside the spec earn their own ADRs
- `compliance-tracking` — manufacturing-SaaS specs must consider compliance scope
- `risk-assessment` — open questions and risks in the spec feed the risk register
- `roadmap-update` — specs map to roadmap items; "spec ready" is a roadmap state
- `change-request` — customer-facing specs become change requests at deploy time
- `metrics-review` — success metrics defined in spec become the metrics tracked post-launch
- `sprint-planning` — P0 spec items become sprint backlog items
- `synthesize-research` — research findings often drive spec scope
