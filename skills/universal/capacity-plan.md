---
name: capacity-plan
domain: universal
auto-load: false
used-by:
  - pm-agent
  - architect-agent
description: >-
  Fire when Storm or an agent needs to size what's actually doable against
  the hours Storm has — pre-quarter portfolio replan, deciding whether to
  take on a new commitment, stress-testing whether the next month's roadmap
  will actually fit, or diagnosing why everything has been slipping.
  Trigger phrases: "do I have time for", "can I take on", "what should I
  cut", "capacity check", "feels overcommitted", "everything is slipping",
  "how much can I do this quarter". This is the solo-builder version: no
  team, no FTEs — just Storm's hours, minus context-switch tax across
  OneCAPA / OneLPA / OnePPAP / PFMEASuite / MyWhiskeyPedia / fantasy /
  MLB analytics.
---

# Skill: Capacity Plan

## Purpose

A capacity plan is a brutal honesty exercise: how much Storm can *actually*
get done in a week, in a month, in a quarter — and whether the current
roadmap fits inside that number. The mental model: ambition is unconstrained;
hours are not. Without an explicit capacity plan, the roadmap quietly grows
larger than the calendar, and the slip becomes visible only after every
project is late.

For a solo builder, the standard utilization advice (75–80% target) is
actively misleading. The constraint is not just hours, it's *context-switch
tax across an active portfolio*. Each additional active project costs
roughly 20% of effective capacity. A plan that ignores this collapses on
contact with reality.

## When to Use

- Pre-quarter or pre-month replan — sizing what fits before committing
- A new customer ask or commitment lands and Storm needs to know if it fits
- Roadmap items have been slipping for two consecutive sprints — diagnose capacity, not motivation
- Considering whether to put MyWhiskeyPedia / fantasy / MLB analytics on hold to focus
- Considering hiring a contractor for a specific scope of work (sets a budget)
- Storm asks "what should I cut?" — capacity planning produces the answer
- Pairs with `roadmap-update` — capacity is the input that disciplines the roadmap

## Mental Model

> **Effective capacity = available hours − context-switch tax − reactive
> work.** The available hours are the easy number. The context-switch tax
> compounds with every active project. Reactive work (customer support,
> incidents, inbox) is unpredictable but never zero. What's left is what
> you can plan.

For Storm specifically, the math:

- **Base hours/week:** total work hours in a week (e.g., 40)
- **Minus standing meetings, customer calls, inbox:** typically 5–10 hours
- **Minus context-switch tax:** ~20% of remaining capacity per *additional*
  active project beyond the first
- **Minus reactive support / incident time:** typically 10–20% (varies by
  product maturity; OneCAPA in production is more reactive than a brand-new
  side project)
- **= Effective build hours/week:** the number you actually plan against

A four-active-project portfolio (e.g., OneCAPA + OneLPA + OnePPAP +
PFMEASuite all active) gives roughly: `40 − 8 (meetings/inbox) − 32 × 0.6
(context-switch on 3 additional projects) − 32 × 0.15 (reactive)` ≈
**~13 build hours/week**, not 40. That's the honest planning number.

## Approach

### Start with the effective-hours number, not the wish list

The temptation is to list the work first and then check if there's time.
Reverse it: calculate effective hours, then fit work to that number.
Otherwise the planning meeting becomes a negotiation against reality.

### Account for context-switch tax explicitly

The tax is real and it grows non-linearly. Two active projects ≈ 0.85
effective; three ≈ 0.7; four ≈ 0.55; five ≈ 0.4. The number isn't
science, but the *direction* is correct: more active projects = less
output per total hour worked. Capacity plans that ignore this consistently
overestimate.

### Treat reactive work as a fixed reservation

Customer support, incident response, "small fixes that became big" — these
land unpredictably but consume a roughly fixed share of weekly capacity.
Reserve 10–20% explicitly. Plans that don't reserve it absorb reactive
work *into* roadmap time, and the roadmap silently slips.

### Identify the bottleneck skill, not just the bottleneck hours

Solo-builder bottlenecks are often skill-specific, not time-specific.
Storm's hours might be technically available but UI design is slower per
hour than backend work. A capacity plan that treats all hours as fungible
will overestimate UI throughput. Track effective hours by *type of work*
when it matters.

### Use scenarios, not point estimates

A single capacity number invites false precision. Run three scenarios:
status quo (everything stays active), focus (deprioritize 1–2 projects),
hire (a contractor takes scope X). For each, show what fits and what
doesn't. The scenarios make the trade-offs visible.

## Reference

### Capacity calculation template

```markdown
## Capacity Plan: [Period — e.g., Q3 2026]
**Date:** [YYYY-MM-DD]
**Active projects:** [Count and list]

### Hours math
| Component | Hours/week | Notes |
|---|---|---|
| Base work hours | [X] | [Realistic, not aspirational] |
| − Standing meetings, customer calls | [X] | [List the recurring ones] |
| − Inbox, admin, async messaging | [X] | [Honest estimate] |
| − Context-switch tax (~20% per additional active project) | [X] | [Active count − 1 = multiplier] |
| − Reactive support / incident reservation (10–20%) | [X] | [Higher for mature products] |
| = **Effective build hours/week** | **[X]** | |

### Allocation across active projects
| Project | Target % | Hours/week | Status |
|---|---|---|---|
| [OneCAPA] | [X]% | [X] | Active / Maintenance / Paused |
| [OneLPA] | [X]% | [X] | Active / Maintenance / Paused |
| [OnePPAP] | [X]% | [X] | Active / Maintenance / Paused |
| [PFMEASuite] | [X]% | [X] | Active / Maintenance / Paused |
| [MyWhiskeyPedia] | [X]% | [X] | Active / Maintenance / Paused |
| [Frontier Podcast] | [X]% | [X] | Active / Maintenance / Paused |
| [Dynasty / fantasy] | [X]% | [X] | Active / Maintenance / Paused |
| [MLB analytics] | [X]% | [X] | Active / Maintenance / Paused |
| **Total** | **100%** | **[Effective build hours]** | |

### Demand vs. capacity
| Roadmap item | Estimated hours | Fits in target allocation? |
|---|---|---|
| [Item] | [X] | Yes / No / Tight |

### Bottlenecks
- [Skill / type of work where demand > supply]
- [Time period with crunch — release windows, fantasy season start, audit dates]

### Scenarios
| Scenario | What changes | Effective build hours | What fits |
|---|---|---|---|
| Status quo | All projects active | [X] | [List] |
| Focus | Pause [project], move [project] to maintenance | [X] | [List] |
| Hire contractor | Contractor takes [scope] | [X] | [List] |

### Recommendation
[One paragraph — which scenario and why]
```

### Project status definitions

| Status | What it means for capacity |
|---|---|
| **Active** | New feature work; counts at full hourly cost + context-switch tax |
| **Maintenance** | Reactive only — bug fixes, customer support; ~10% of project's typical share |
| **Paused** | No new work, no support commitment; 0% capacity but not 0 risk (debt accrues) |
| **Sunset** | Active deprecation work to wind down; counts at full cost during the wind-down period |

### Common capacity pitfalls (solo-specific)

| Pitfall | What happens | Fix |
|---|---|---|
| Planning to 100% of available hours | Any surprise blows the plan | Plan to effective hours, reserve 10–20% reactive |
| Ignoring context-switch tax | Multi-project work consistently slips | Add explicit tax in the math |
| Treating "Maintenance" as 0 cost | Reactive support drains active-project hours | Reserve a maintenance share per active maintained product |
| Planning by quarter without adjusting weekly | Holiday weeks, sick days, conference weeks aren't 40-hour | Walk the calendar, adjust |
| Single capacity number, no scenarios | Trade-offs aren't visible; nothing gets cut | Always model 2–3 scenarios |
| Counting hours in calendar slots, not in deep-work blocks | Calendar fragments produce far less than calendar suggests | Track build-block availability separately |

### Calendar-walk worksheet

For the next 12 weeks, mark each week as:

- **Full** — standard work week (~base hours available)
- **Reduced** — known PTO, conference, family commitment
- **Crunch** — known external deadline (audit, release, fantasy season open)
- **Buffer** — intentionally light, used for catch-up

Sum the *full-equivalent* weeks and multiply by effective build hours/week.
That's the realistic capacity for the period — usually 20–30% lower than a
naive `12 weeks × hours/week` calculation.

## Gotchas

- _No gotchas documented yet. Add entries when something goes wrong in practice._

## Anti-Patterns

- Planning to 100% utilization — any surprise blows up the plan
- Ignoring context-switch tax — capacity looks higher than it is
- Treating "Maintenance" projects as costing zero capacity — they always cost something
- Capacity plans built once per quarter and never revisited — they go stale within weeks
- Planning by total hours without walking the calendar — holidays and crunch periods invisible
- Hiring "more capacity" without naming what scope the contractor will take — money spent without freeing your hours
- Letting the roadmap drive capacity instead of the reverse — guarantees slippage
- Pretending fantasy season or audit windows don't shrink available hours — they do, every year
- Rounding up the math: "I'll just work an extra Saturday" — a planning premise, not a sustainable input

## Related Skills

- `roadmap-update` — capacity is the input that disciplines what fits in Now / Next / Later
- `risk-assessment` — overcommitment is the most common risk, and it's a capacity problem
- `process-optimization` — when capacity is short, look for process waste before assuming the work is too big
- `tech-debt` — debt that's slowing build velocity is effectively a capacity tax; surface it
- `sprint-planning` — sprint plans should be sized against effective build hours, not nominal hours
- `vendor-review` — buy vs. build often comes down to "do I have the capacity to build this in time?"
