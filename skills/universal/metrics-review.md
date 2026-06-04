---
name: metrics-review
domain: universal
auto-load: false
used-by:
  - pm-agent
  - research-agent
  - data-agent
description: >-
  Fire when Storm needs to review performance metrics for any project in the
  portfolio — SaaS product health (OneCAPA / OneLPA / OnePPAP / PFMEASuite),
  podcast audience growth, fantasy sports / MLB analytics accuracy. Trigger
  phrases: "metrics review", "how are we doing", "weekly numbers", "what's
  the trend", "did we hit target", "investigate this drop", "north star",
  "OKR check-in", "scorecard". Same hierarchy applies across domains: a
  North Star, 3–5 L1 health indicators, L2 diagnostics for drill-down.
---

# Skill: Metrics Review

## Purpose

A metrics review is a structured re-look at how a product or project is
performing — not a data dump, but a small set of metrics organized into a
hierarchy, compared against history and targets, and read for the *story*
the numbers tell. The output is a scorecard plus a narrative plus 1–3
specific actions; without the actions, it's a vanity exercise.

The mental model: every project has *one* North Star metric (the single
number that captures whether the thing is working), 3–5 L1 health indicators
(the dashboard you check weekly), and a long tail of L2 diagnostics you
only consult when an L1 moves and you need to know why. This skill teaches
how to set up that hierarchy and how to read it.

For Storm's portfolio:
- **Manufacturing SaaS** — North Star is usually weekly active customers
  completing a core quality workflow (CAPAs closed, audits completed,
  PPAPs submitted)
- **Whiskey podcast** — North Star is weekly engaged listening time, not
  download count (downloads inflate; engagement converts)
- **Fantasy sports / MLB analytics** — North Star is prediction accuracy
  measured against a baseline, not site traffic (accuracy is the product;
  traffic is a side effect of being right)

## When to Use

- Weekly check-in on portfolio health (Storm's standing review cadence)
- A metric moved unexpectedly and needs investigation
- Quarter-end: did we hit OKR / KR targets?
- Pre-launch: define the metrics hierarchy *before* shipping so we know what success looks like
- Customer churned or content audience dropped — what does the data say happened?

## Mental Model

> A metric without context is noise. **Always show: current value, comparison
> (previous period or target), trend direction.** Numbers in isolation tell
> nothing — and a 3% movement is meaningless until you know whether 3% is
> a rounding error or a tectonic shift in this metric.

Three layers:

1. **North Star** — the one number. If only one number could move, this is
   the one Storm would want to move.
2. **L1 (3–5 metrics)** — health indicators across the user lifecycle:
   acquisition, activation, engagement, retention, monetization, satisfaction.
3. **L2** — diagnostics. Funnel steps, segments, cohort breakdowns. Only
   consulted when an L1 moves.

The job of a review is to scan the L1 scorecard, spot what moved, drill into
L2 if needed, and exit with 1–3 actions.

## Approach

### Define the hierarchy before shipping, not after

The most common metrics-review failure: launching, then asking "what should
we measure?" By then, the product is collecting incomplete data. Build the
hierarchy as part of the spec.

### Lead with the "so what", not the data

Open the review with the most important takeaway. The reader (often
future-Storm during a busy week) should get the essential story in 30
seconds. Save the full scorecard for after the lead.

### Comparison is mandatory, not optional

A single number is a vanity metric. Always pair with: previous period
(week-over-week, month-over-month), target, and benchmark. If you can't
benchmark externally, benchmark internally against last year.

### Investigate the *why* before recommending action

Correlation is not causation. If retention dropped, drill into segments
and cohorts before recommending an experiment. Many "actions" prescribed
on insufficient analysis make things worse.

### Every review ends with actions

A review without 1–3 next-step actions is a journaling exercise. The
actions should be specific: "investigate the D7 drop in cohort X" or "ship
the onboarding A/B test by Friday" — not "improve onboarding."

## Reference

### Metrics hierarchy template

```markdown
## Metrics: [Project name]

### North Star
**Metric:** [Single number]
**Definition:** [Exactly what counts]
**Why this one:** [How it captures core value delivered]

### L1 (Health Indicators)
| Layer | Metric | Why it matters |
|---|---|---|
| Acquisition | [New users / new listeners / new subscribers] | Are people finding it? |
| Activation | [Reach value moment within X days] | Does the first session deliver? |
| Engagement | [Core action frequency] | Are active users getting value? |
| Retention | [D7, D30, D90 cohort curves] | Do they come back? |
| Monetization | [Conversion / MRR / sponsorship $] | Does value translate to revenue? |
| Satisfaction | [NPS / review score / response sentiment] | How do they feel? |

### L2 (Diagnostics)
[Funnel steps, segment breakdowns, feature-level adoption — populated as needed]
```

### Scorecard template

```markdown
## Metrics Review: [Project] — [Period]
**Prepared:** [Date]

### Summary
[2–3 sentences. The "so what." Lead with the most important takeaway.]

### Scorecard
| Metric | Current | Previous | Δ | Target | Status |
|---|---|---|---|---|---|
| [North Star] | [Value] | [Value] | [%] | [Target] | On track \| At risk \| Miss |
| [L1 — Acquisition] | … | … | … | … | … |
| [L1 — Activation] | … | … | … | … | … |
| [L1 — Engagement] | … | … | … | … | … |
| [L1 — Retention] | … | … | … | … | … |

### Bright spots
- [What's working — beat target, positive trend]

### Concerns
- [What's missing target or trending wrong]
- [Early-warning signals before they become problems]

### Investigations to run
- [Specific drill-downs needed before acting]

### Actions
- [Specific next step with owner and date]
- [Specific next step with owner and date]

### Caveats
- [Data quality issues, comparability gaps, known events]
```

### Domain-specific North Star examples

| Project | North Star | Why this one |
|---|---|---|
| OneCAPA | Weekly active customers closing CAPAs | Captures whether the workflow is producing value, not just signups |
| OneLPA | Weekly active sites completing layered audits on schedule | LPAs are pointless if not done on cadence; cadence completion = working |
| PFMEASuite | New PFMEAs created + revisions per active customer / month | PFMEA is a living doc; usage means it's actually being maintained |
| Whiskey podcast | Weekly engaged listening minutes (50%+ completion) | Engagement, not downloads — downloads can be inflated |
| Fantasy sports rankings | Hit rate on top-decile predictions vs. baseline | Accuracy is the product; if rankings aren't sharper than ESPN, why bother? |
| MLB analytics | Predicted-vs-actual win rate over 162 games | Long-season truth; small samples lie |

### Cadence recommendations (solo-builder scaled)

| Cadence | Duration | What to review |
|---|---|---|
| Weekly | 15 min | North Star + L1 scorecard, anomalies, active experiments |
| Monthly | 30–45 min | Full L1 with month-over-month trends, OKR progress, cohort analysis |
| Quarterly | 60–90 min | OKR scoring, year-over-year comparisons, strategic implications, set next-quarter OKRs |

### Goal-setting (lightweight OKR)

For each project, set 1–2 quarterly Objectives, 2–4 Key Results each:

```markdown
**Objective:** [Qualitative, time-bound, directional]
**Key Results:**
- KR1: [Metric] from [baseline] to [target] by [date]
- KR2: [Metric] from [baseline] to [target] by [date]
```

KRs measure outcomes, not outputs. Not "ship 10 features" but "increase
activation rate from 30% to 45%." 70% completion is the success bar for
stretch KRs — if you hit them all, they weren't ambitious enough.

## Gotchas

- _No gotchas documented yet. Add entries when something goes wrong in practice._

## Anti-Patterns

- Vanity metrics on the scorecard: total signups ever, total downloads ever — they only go up
- Reporting averages without distributions — a 3.5/5 average could mean lukewarm everyone or polarized halves
- Single numbers without comparison — every metric needs previous period and target
- Output dashboards: tickets closed, episodes published, code shipped — these are activity, not outcomes
- Drilling into L2 before scanning L1 — wastes attention on metrics that didn't move
- Reviewing without acting — a review that produces no actions wasn't worth the time
- Confusing correlation with causation when explaining why a metric moved
- Targets set without a baseline — "we want 1000 users" is not a target, it's a wish

## Related Skills

- `synthesize-research` — qualitative findings explain quantitative anomalies
- `competitive-brief` — competitor benchmarks contextualize your numbers
- `roadmap-update` — metrics review insights feed roadmap reprioritization
- `data-visualization` (if extracted later) — charts that pass the 30-second scan test
