---
name: sprint-planning
domain: universal
auto-load: false
used-by:
  - pm-agent
  - architect-agent
  - developer-agent
description: >-
  Fire when Storm is starting a new working block — typically a 1- or 2-week
  cycle on a single project, or a focused chunk on one of the manufacturing-SaaS
  products (OneCAPA / OneLPA / OnePPAP / PFMEASuite), MyWhiskeyPedia, or the
  fantasy/MLB analytics work. Trigger phrases: "plan the next sprint", "what
  am I doing this week", "set up next two weeks", "plan the work block",
  "scope this iteration", "what's P0 this sprint", "carryover". Solo-builder
  context: a "sprint" is Storm's planning unit, not a team ceremony — the
  goal is to size what fits in *available* hours (see `capacity-plan`),
  pick a single clear sprint goal, and identify the cut line if things
  take longer.
---

# Skill: Sprint Planning

## Purpose

A sprint plan is a *commitment* to a specific outcome inside a specific
window. The mental model: pick one clear sprint goal, scope the work that
serves it, size that work against effective capacity (not nominal hours),
and decide upfront what gets cut if reality intrudes. Without those four
moves, "planning a sprint" is just "writing down what I might do" — which
is what people do when they don't want to be held accountable.

For a solo builder, the sprint discipline is unusually high-leverage.
There's no team to carry slipped commitments. Every dropped point is
visible. The reward is also higher: a single well-planned 1–2 week
sprint produces more shipped work than two weeks of unplanned effort,
because the constraint forces ruthless prioritization.

## When to Use

- Starting a new 1- or 2-week working block on any project
- Switching focus from one portfolio product to another (a sprint plan
  *is* the context-switch artifact)
- After a major slippage — using the new sprint to recommit honestly
- Carryover from prior sprint needs to be re-evaluated against new info
- A new customer commitment changes the priority order
- Pairs with `roadmap-update` (zooming into the Now from the broader
  roadmap) and `capacity-plan` (sizing against available hours)

## Mental Model

> **One sprint goal. Sized to effective capacity. Cut line decided in
> advance.** A sprint without a single clear goal is a to-do list; a
> sprint sized to nominal hours instead of effective hours misses; a
> sprint without a pre-decided cut line forces panic decisions when
> things run long.

For solo work, the planning math is:

- **Capacity:** effective build hours/week × sprint length, where
  "effective" already accounts for context-switch tax and reactive work
  reservation (see `capacity-plan`)
- **Sprint load:** estimated hours for everything committed
- **Buffer:** target sprint load ≈ 70–80% of effective capacity; the
  remaining 20–30% absorbs estimation error and surprises

A sprint planned to 100% of effective capacity hits 100% of effective
capacity *only* in the unicorn week with no surprises. Plan to 70–80%
and let the buffer absorb reality.

## Approach

### One sprint goal you can state in one sentence

If the sprint goal needs three sentences, the sprint isn't focused.
Examples that work:
- "Ship the OneCAPA audit-trail export feature, signed off by [pilot customer]"
- "Cut OnePPAP submission flow time from 6 min to under 2 min on the redesigned form"
- "Publish three Frontier Podcast episodes plus close out the season finale show notes"
- "Deliver the Q2 Dynasty draft board with rookie tiers and bust risk flags"

If you can't reduce it that far, the sprint is trying to do two things
and one of them needs to move out.

### Estimate in hours, not story points (for solo work)

Story points are a team-coordination tool. Solo, you're estimating
against your own hours; using points adds noise without adding signal.
Use ranges when uncertain ("4–8 hours") and treat the upper end as the
planning number. Track post-sprint how often actuals exceeded estimates
— most solo estimators are systematically optimistic by 30–50%.

### Pre-decide the cut line — what gets dropped first if things slip

Mark items as P0 (must ship — sprint goal depends on this), P1 (should
ship), P2 (stretch — only if you finish P0/P1 with time left). When the
sprint inevitably runs tight, the cut line is already drawn. The
discipline is to *not* let a P2 sneak past P0 because it's more interesting.

### Carry over honestly

If something didn't ship last sprint, understand why before re-committing.
Was it underscoped? Did a P0 in mid-sprint take precedence? Did Storm
estimate at 30% of actual? "We'll just finish it next sprint" without
diagnosis means it slips again.

### Sprint length is a tunable, not a constant

For complex multi-portfolio work, 1-week sprints keep the loop tight and
catch slippage early. For deep build phases on a single product, 2-week
sprints reduce planning overhead. Don't lock into one cadence; pick what
the work needs.

## Reference

### Sprint plan template

```markdown
## Sprint Plan: [Sprint name — e.g., OneCAPA-2026-W18]
**Dates:** [Start] — [End]
**Sprint length:** [1 week | 2 weeks]

### Sprint goal
[One sentence — the outcome that defines success]

### Effective capacity
**Build hours available this sprint:** [X]
*(Effective hours from `capacity-plan`, × sprint length, − known reductions
this period like PTO or known reactive load)*

### Sprint backlog
| Priority | Item | Estimate (hrs) | Acceptance | Dependencies |
|---|---|---|---|---|
| P0 | [Must ship — sprint goal depends on this] | [hrs] | [How we know it's done] | [Blocked on?] |
| P0 | [...] | [hrs] | [...] | [...] |
| P1 | [Should ship] | [hrs] | [...] | [...] |
| P2 | [Stretch] | [hrs] | [...] | [...] |

### Sprint load
**Sum of P0 + P1:** [X] hours
**Sum including P2:** [Y] hours
**Target load (70–80% of capacity):** [Z] hours
**Verdict:** Fits / Tight / Over-committed → [if over: cut what to where]

### Carryover from last sprint
| Item | Why it didn't ship | Decision |
|---|---|---|
| [Item] | [Diagnosis] | Re-commit / Drop / Re-scope |

### Cut line
If things run long, items dropped in this order:
1. [P2 item]
2. [P2 item]
3. [P1 item — if necessary]
*P0 items are not in the cut order — they ship or the sprint goal fails.*

### Risks
| Risk | Impact | Mitigation |
|---|---|---|
| [What might go wrong this sprint] | [What that costs] | [Pre-mitigation] |

### Definition of done (per item type)
- **Code change:** Tests pass, code reviewed (if applicable), deployed to relevant environment, docs updated where load-bearing
- **Content:** Reviewed, sources cited, published or scheduled
- **Spec / decision:** Written, linked from DECISIONS.md
- **Customer-facing change:** Change request artifact exists, comms drafted
```

### Estimation calibration

Estimate ranges that have aged well:

| Type of work | Realistic range |
|---|---|
| Bug fix in well-known area | 1–4 hours |
| New feature in well-known area | 4–16 hours |
| New feature in unfamiliar area | 8–40 hours |
| Cross-portfolio change (same change in 4 SaaS products) | 1.5–2× single-product version |
| First feature in a new project | 1.5–2× equivalent feature in mature project |
| Spec / design work | 2–8 hours per non-trivial spec |
| Customer-facing process change | Add ≥ 1 hour for comms and change-request artifact |
| Anything involving auth, payments, or audit-trail logic | Add 30–50% buffer for compliance review |

When in doubt, estimate the upper end.

### Carryover diagnosis

| Reason it didn't ship | Lesson |
|---|---|
| Underscoped — work was bigger than I thought | Re-estimate at 1.5× before re-committing; consider breaking into smaller items |
| Reactive load consumed sprint hours | Increase reactive reservation in `capacity-plan` |
| Mid-sprint P0 added (customer issue, incident) | Check whether the new P0 was actually a P0 or whether the original P0 should have held |
| Context-switch tax higher than expected | Move toward fewer simultaneous active projects |
| Blocked on external dependency | Was the dependency surfaced in the plan? If not, plan harder; if yes, build a contingency |
| Stretch work crept into the time budget for P0 | Discipline failure — the cut line wasn't respected |

### Sprint goal patterns by portfolio area

| Portfolio area | Sprint goal pattern |
|---|---|
| Manufacturing SaaS (OneCAPA, OneLPA, OnePPAP, PFMEASuite) | Ship a customer-visible change, validated by [named pilot customer] or via [specific metric] |
| MyWhiskeyPedia | Publish [N] reviews / build out [feature] / improve [specific metric] |
| Frontier Podcast | Produce / release [N episodes] / launch [series] |
| Dynasty / fantasy sports | Deliver [board / strategy doc] for [upcoming event — draft, trade deadline] |
| MLB analytics | Ship [analysis / model update] for [upcoming use — pre-game, season planning] |

## Gotchas

- _No gotchas documented yet. Add entries when something goes wrong in practice._

## Anti-Patterns

- Sprint goal that requires three sentences — split into two sprints
- Planning to 100% of effective capacity — guarantees missed sprint
- No cut line decided up front — panic-cuts are usually wrong cuts
- Story points instead of hours for solo work — adds noise, no signal
- Carrying over without diagnosing — same slippage repeats
- Treating P2 stretch items as P1 commitments
- Multi-product sprints without explicit per-product allocation — context-switch tax kills throughput
- "Sprint" that's a to-do list with no goal — won't drive convergent decisions when time runs short
- Skipping retrospective on missed sprints — the data is the lesson
- Sprint plans without a date — drift; commit to a window

## Related Skills

- `capacity-plan` — supplies the effective-hours number that disciplines sprint load
- `roadmap-update` — sprint goal should be the active Now item from the roadmap
- `write-spec` — P0 items often need a spec before sprint start
- `risk-assessment` — sprint-level risks deserve a row in the plan
- `tech-debt` — debt paydown bundled with feature work earns a sprint slot
- `process-doc` — captures recurring sprint patterns once they stabilize
- `change-request` — customer-facing items in the sprint require change-request artifacts
