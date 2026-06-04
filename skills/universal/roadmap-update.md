---
name: roadmap-update
domain: universal
auto-load: false
used-by:
  - pm-agent
  - architect-agent
  - research-agent
description: >-
  Fire when Storm needs to update, re-prioritize, or build a roadmap for any
  project in the portfolio (SaaS apps, content, analytics) — adding a new
  initiative and deciding what gets bumped, shifting priorities after research
  or customer feedback, moving timelines after a slip, or building a Now /
  Next / Later from scratch. Trigger phrases: "roadmap", "what's next",
  "reprioritize", "now next later", "what should I work on", "what gets
  bumped", "RICE", "MoSCoW", "ICE score". The skill applies portfolio-wide,
  including across-project trade-offs (do I work on OneCAPA or PFMEASuite this week?).
---

# Skill: Roadmap Update

## Purpose

A roadmap is a communication artifact — it captures what's being worked on,
what's coming, and what's been explicitly deferred, with enough rigor that
trade-offs become visible. It is *not* a project plan. The right altitude
is themes and outcomes, not Gantt-chart task breakdowns.

The mental model: roadmaps are zero-sum against capacity. Adding something
means another thing moves out, slips, or gets cut. The discipline of an
update is to make those trade-offs explicit, not to pretend the team can
do more.

For a solo builder, that discipline matters even more. The constraint is
not "the team's capacity" — it's *Storm's hours per week, minus context-switch
tax across projects*. A multi-project portfolio with no roadmap collapses
into "whatever felt urgent that morning." The roadmap is the antidote.

## When to Use

- Quarterly portfolio replan — what's getting attention, what's getting deferred
- New customer commitment that needs to fit into an existing plan
- A project slipped and downstream items need re-sequencing
- Storm asks "what should I work on next" and the answer should be evidence-based
- Building a roadmap for a brand-new project (especially before committing)
- New competitive or market info that changes priorities (see `competitive-brief`)

## Mental Model

> A good roadmap holds three shapes simultaneously: **Now** (committed,
> high confidence in scope and timeline), **Next** (planned, scoped and
> prioritized but not started), **Later** (directional bets — strategic
> intent, scope and timing flexible). When something moves into Now, something
> else moves out — there is no "Now plus one more thing."

The roadmap is also a portfolio-allocation tool, not just a single-project
artifact. For Storm, the question "what's in Now?" cuts across OneCAPA,
OneLPA, OnePPAP, PFMEASuite, whiskey podcast, fantasy sports — and the
sum of all "Now" items must fit into one solo builder's available hours.

## Approach

### Default to Now / Next / Later

Other formats (quarterly themes, OKR-aligned, Gantt) have their place, but
Now/Next/Later avoids false precision on dates, communicates well externally,
and is the right shape for solo-builder portfolio planning. Reach for
something fancier only when there's a specific need.

### Every Now item names what it bumped

A roadmap update that adds without subtracting is dishonest. When something
moves into Now, write down explicitly what moved out, slipped, or was cut.
"Adding X to Now bumps Y to Next" makes the trade-off visible.

### Score before reordering

When reprioritizing, run a quick prioritization framework — RICE for big
decisions, ICE for fast ones, MoSCoW when scope-cutting a release. Score-
then-discuss is harder than it sounds; the temptation to skip to the answer
is constant. Resist.

### Capacity is the constraint, not ambition

Solo-builder capacity = available hours per week, minus context-switch tax.
A rule of thumb: each additional active project costs ~20% capacity in
context-switching. Three active projects ≈ 0.6 effective capacity, not 1.0.
Plan accordingly.

### Surface dependencies before they bite

Cross-project dependencies are the highest-risk items. Pre-PFMEASuite work
that needs to happen before OneCAPA can use the shared brand library, for
example. Flag these explicitly; they slip more than anything else.

## Reference

### Now / Next / Later template

```markdown
## Roadmap: [Project or portfolio]
**Updated:** [Date]
**Owner:** Storm

### Now (active — committed, high confidence)
- [Item] — [One-line outcome] — [Status: on track / at risk / blocked]
- [Item] — [One-line outcome] — [Status]

### Next (1–3 months out — planned, scoped)
- [Item] — [One-line outcome]
- [Item] — [One-line outcome]

### Later (3–6+ months — directional bets)
- [Item] — [One-line outcome]
- [Item] — [One-line outcome]

### Recently changed
| Change | Item | From → To | Reason |
|---|---|---|---|
| Bumped | [Item] | Now → Next | [Why] |
| Added | [Item] | — → Now | [Why this, why now, what got bumped] |
| Cut | [Item] | Later → ∅ | [Why] |

### At-risk / blocked
- [Item — what the blocker is — owner of the unblock]

### Capacity check
**Current Now items:** [N] | **Estimated weekly hours required:** [X]
**Available capacity:** [Y] hours/week × [adjusted for context switching]
**Verdict:** Fits | Tight | Over — [if over, what to bump]
```

### Prioritization frameworks

**RICE** — for big roadmap-shaping decisions:

`RICE = (Reach × Impact × Confidence) / Effort`

- **Reach**: users/customers affected per period (use real numbers)
- **Impact**: 3 (massive) / 2 (high) / 1 (medium) / 0.5 (low) / 0.25 (minimal)
- **Confidence**: 100% (data-backed) / 80% (some evidence) / 50% (gut)
- **Effort**: person-weeks (for solo: just weeks)

**ICE** — for quick prioritization, no formal RICE inputs:

`ICE = Impact (1–10) × Confidence (1–10) × Ease (1–10)`

**MoSCoW** — for scoping a release or quarter:

| Bucket | Meaning | Use when |
|---|---|---|
| Must | Release fails without it | Non-negotiable commitments |
| Should | Important and expected | Pressured but viable to defer |
| Could | Desirable, lower priority | Only if capacity allows |
| Won't | Explicitly out of scope | Important for clarity |

**Value vs Effort matrix** — for visual planning:

| | Low effort | High effort |
|---|---|---|
| **High value** | Quick wins (do first) | Big bets (plan carefully) |
| **Low value** | Fill-ins (when slack) | Money pits (don't) |

### Capacity model for solo-builder portfolio

```markdown
**Available hours/week:** [Total work hours, e.g., 40]
- Minus standing meetings / customer calls: [X]
- Minus support / inbox: [X]
- Minus context-switch tax (~20% per additional active project): [X]
- = Effective build hours: [Y]

**Allocation target:**
- 70% planned roadmap work
- 20% maintenance / tech debt / reliability across active products
- 10% unplanned / customer issues / quick wins
```

### Dependency tracking

```markdown
| Dependency | Type | Owner | Need-by | Status | Contingency |
|---|---|---|---|---|---|
| [What] | Technical / external / knowledge | [Who] | [Date] | Resolved / In progress / Slipping | [What if it slips] |
```

### Communicating roadmap changes

When the roadmap changes (and it will), the communication template:

1. **What changed** — be direct
2. **Why now** — what new info drove it
3. **The trade-off** — what got bumped to make room
4. **The new plan** — updated roadmap with changes reflected
5. **Who's affected** — anyone expecting deprioritized work hears it directly

## Gotchas

- _No gotchas documented yet. Add entries when something goes wrong in practice._

## Anti-Patterns

- Adding to Now without subtracting from Now — dishonest about capacity
- Roadmaps in Gantt format used externally — creates false precision on dates
- Whiplash: changing the roadmap on every new piece of info — have a threshold
- Tasks on the roadmap instead of outcomes — wrong altitude
- Capacity ignored in favor of ambition — the work doesn't get done by hoping
- Multi-project portfolio with no shared roadmap — invisible context-switch tax
- Dependencies listed but not owned — they will slip
- Quarterly themes without a quarterly outcome — themes are nice; outcomes are accountable
- Hidden "Won't" items — explicitly listing what's out of scope is clarity, not negativity

## Related Skills

- `metrics-review` — metrics insights drive roadmap reprioritization
- `competitive-brief` — strategic implications feed roadmap moves
- `synthesize-research` — research findings often surface new roadmap candidates
- `spec-driven-development` — items in Now should have specs before they start
- `risk-assessment` — high-RPN risks may earn a roadmap slot
