---
name: architecture
domain: universal
auto-load: false
used-by:
  - architect-agent
  - developer-agent
  - pm-agent
  - security-agent
description: >-
  Fire when Storm or an agent is making a meaningful technical decision that
  will shape future work — picking between technologies, designing a new
  component or module, evaluating a vendor's technical fit, or codifying a
  decision so future-Storm doesn't re-litigate it. Trigger phrases: "ADR",
  "architecture decision", "should we use X or Y", "how should we build",
  "design the X", "trade-offs", "build vs buy", "tech stack". Especially load
  when working on cross-cutting decisions in OneCAPA / OneLPA / OnePPAP /
  PFMEASuite (shared brand library, auth approach, audit-trail substrate)
  or when committing to a tool that touches the whole portfolio (analytics
  platform, hosting, observability).
---

# Skill: Architecture

## Purpose

An architecture decision record (ADR) is a letter to future-Storm. The
mental model: every meaningful technical choice is a fork — one path is
taken, others foreclosed. The ADR captures the context that made the choice
make sense, so future-Storm doesn't waste a week rediscovering the
constraints that drove the original call.

For a solo builder running a portfolio (OneCAPA, OneLPA, OnePPAP,
PFMEASuite, MyWhiskeyPedia, analytics work), ADRs do double duty: they
enforce *consistency* across products that should share patterns, and they
capture *intentional divergence* where a product needed something different.
Without ADRs, decisions made in OneCAPA leak into OnePPAP through copy-paste,
and the question "why is this different here?" never gets a real answer.

## When to Use

- Choosing between two or more technologies (queue, DB, framework, vendor)
- Designing a new module or service from a problem statement and constraints
- Codifying a decision Storm has *already made* but will need to defend later
- Reviewing a proposed design before committing — pressure-test the trade-offs
- Build vs. buy analysis (often pairs with `vendor-review`)
- Cross-portfolio decisions: "should all four manufacturing-SaaS products use the same auth?"
- A pattern emerges across products and needs to be promoted to a shared decision

## Mental Model

> **Decisions live forever; rationale evaporates.** The decision itself
> survives in the code. The reasoning behind it disappears the moment it
> isn't written down. An ADR is not bureaucracy — it is the only mechanism
> that lets a future you (or a future agent) revisit a choice without
> starting from zero.

A good ADR holds three things in tension: **the forces** (what made the
choice hard), **the options** (real alternatives, not strawmen), and **the
consequences** (what becomes easier, what becomes harder, what we'll need
to revisit). When any of the three is missing, the ADR collapses into
either a justification or a wish list.

For solo-portfolio work, add a fourth dimension: **scope**. Is this a
project-local decision (fine to diverge) or a portfolio-wide standard
(must apply to all four manufacturing-SaaS products)? Mislabeling scope is
how inconsistency creeps in.

## Approach

### State the forces before stating the decision

The most common ADR failure is "we picked X because it's good." That tells
future-Storm nothing. The forces are the constraints, deadlines, customer
asks, and existing commitments that ruled out other options. Write those
first. Often you'll discover the decision was over-determined by forces
you hadn't named.

### Name real alternatives, not strawmen

If the ADR shows three options and two are obviously bad, the analysis is
theater. Force at least one alternative that a thoughtful person would
genuinely consider. If you can't find one, the decision may not warrant an
ADR — it's just a default.

### Make consequences concrete and bidirectional

"This will improve performance" is not a consequence. "The audit-trail
write path now requires two DB roundtrips instead of one; sub-100ms p95
becomes harder; the immutability guarantee gets simpler" is. Always list
*both* what becomes easier and what becomes harder. ADRs that only list
upsides are sales pitches, not records.

### Mark scope explicitly: project, portfolio, or shared infra

Every ADR should say: *does this apply to one product or to all of them?*
Without that label, a OneCAPA decision will get cargo-culted into PFMEASuite
without anyone reasoning about whether it actually fits.

### Decide the revisit trigger

Most ADRs aren't permanent — they're right *for now*. Note what would
make you reopen the decision: "revisit if we cross 50 customers" or
"revisit if AWS pricing changes more than 30%." Otherwise, the decision
calcifies.

## Reference

### ADR template

```markdown
# ADR-[NNN]: [Short title in plain language]

**Status:** Proposed | Accepted | Deprecated | Superseded by ADR-[NNN]
**Date:** [YYYY-MM-DD]
**Scope:** Project (which) | Portfolio (which products) | Shared infra
**Decider:** Storm

## Context
What is the situation? What forces are at play? What constraints are real?
Include: deadlines, customer asks, existing commitments, regulatory
requirements (e.g. 21 CFR Part 11 for OneCAPA), and the cost of inaction.

## Decision
What did we decide? State it directly in one or two sentences before the
reasoning.

## Options Considered

### Option A — [Name]
| Dimension | Assessment |
|---|---|
| Complexity (build) | Low / Med / High |
| Complexity (operate) | Low / Med / High |
| Cost (year 1) | $[X] |
| Cost (year 3) | $[X] |
| Lock-in | Low / Med / High |
| Compliance fit | [Specific framework hit/miss] |
| Solo-builder fit | Maintainable by one person? |

**Pros:** [Concrete]
**Cons:** [Concrete]

### Option B — [Name]
[Same format]

### Option C — [Name]
[Same format]

## Trade-off Analysis
Which axes mattered most and why. The one or two sentences that explain
why Option [X] won when Option [Y] was also defensible.

## Consequences
**Becomes easier:** [List]
**Becomes harder:** [List]
**Foreclosed:** [What this rules out for future work]

## Revisit trigger
What would make us reopen this decision? (Crossing a customer threshold,
pricing change, new regulatory requirement, an alternative maturing.)

## Action items
- [ ] [Implementation step]
- [ ] [Migration / cleanup of prior approach]
- [ ] [Update PATTERNS.md if pattern is portfolio-wide]
```

### Decision-worthy vs. not

| Reach for an ADR when… | Skip the ADR when… |
|---|---|
| Choice will be hard to reverse | Choice is reversible in a day |
| Touches data shape, auth, or audit trail | Internal naming convention |
| Spans more than one product in the portfolio | Confined to one file |
| Customer or regulator will ask "why" later | Nobody will ever ask |
| You're picking from a real menu of options | Only one option is even viable |

### Common ADR triggers in Storm's portfolio

- Auth approach for the manufacturing-SaaS products (custom vs. SSO-first vs. third-party)
- Audit-trail substrate (append-only DB table, event log, third-party)
- Shared brand library / component approach across the four SaaS products
- Hosting and DB choices (per-product vs. portfolio-wide)
- Analytics stack (event tracker, warehouse, dashboard tool)
- Whether MyWhiskeyPedia and the manufacturing-SaaS products share infra
- Build vs. buy on PDF/print, e-signature, file storage

## Gotchas

- _No gotchas documented yet. Add entries when something goes wrong in practice._

## Anti-Patterns

- ADRs written *after* implementation as post-hoc rationalization
- Strawman options padded in to make the chosen option look obvious
- Consequence lists that only contain benefits
- "We chose X because it's better" with no forces, no alternatives, no scope
- ADRs locked in a folder no future agent will ever load — link them from PATTERNS.md and DECISIONS.md
- Treating every architectural choice as ADR-worthy — bureaucracy without value
- Treating no choice as ADR-worthy — drift without a record
- Mislabeled scope: a project-local decision marketed as portfolio-wide, or vice versa
- No revisit trigger, so a 2024 decision still governs 2026 reality

## Related Skills

- `spec-driven-development` — specs reference ADRs; ADRs document decisions made during specs
- `vendor-review` — many ADRs are build-vs-buy decisions where vendor-review feeds the analysis
- `risk-assessment` — high-RPN risks often produce ADRs (mitigation-by-design)
- `compliance-tracking` — controls and frameworks are forces inside the ADR
- `tech-debt` — deferred ADRs and superseded ADRs are tech-debt entries
- `change-request` — significant ADRs trigger change requests for rollout
