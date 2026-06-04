---
name: tech-debt
domain: universal
auto-load: false
used-by:
  - developer-agent
  - architect-agent
  - pm-agent
  - qa-agent
description: >-
  Fire when Storm or an agent needs to identify, categorize, or prioritize
  technical debt across any project — running a code-health audit, deciding
  what to refactor next, scoping a debt-paydown sprint, or evaluating whether
  a feature ask is really a debt-payment in disguise. Trigger phrases:
  "tech debt", "what should we refactor", "code health", "this is getting
  hard to change", "the velocity has dropped", "maintenance backlog",
  "we keep working around this". Especially load when one of the four
  manufacturing-SaaS products (OneCAPA, OneLPA, OnePPAP, PFMEASuite) is
  starting to feel slow to evolve, or when MyWhiskeyPedia's content pipeline
  is friction-heavy.
---

# Skill: Tech Debt

## Purpose

Tech debt is not "messy code" — it is *the gap between the system you have
and the system the next quarter of work needs you to have*. The mental
model: every shortcut taken to ship faster is a loan against future velocity.
Some loans are smart (high interest is fine for a 2-week experiment); some
are negligent (compounding interest on a load-bearing component).

For a solo builder, tech debt is uniquely dangerous. There is no team to
absorb the velocity tax — every dropped point lands on Storm directly.
And because Storm context-switches across OneCAPA, OneLPA, OnePPAP,
PFMEASuite, MyWhiskeyPedia, and analytics work, *unfamiliar* debt costs
double: the code feels foreign every time, even though it's all yours.

## When to Use

- A feature in OneCAPA / OneLPA / OnePPAP / PFMEASuite is taking 3x longer than the equivalent feature did six months ago
- Storm catches himself working around the same thing for the third time
- A planned refactor needs to be sized and pitched (to himself or a customer)
- Pre-quarter or pre-portfolio replan — feeding `roadmap-update` with debt items
- Onboarding a contractor or new agent and the answer to "where should I avoid?" is too long
- A new ADR is being written that will produce *more* debt (capture it intentionally)
- After an incident, when the postmortem surfaces debt that contributed (see `incident-response`)

## Mental Model

> **Debt has a category, an interest rate, and a payment plan.** Category
> tells you who can pay it (developer, architect, vendor). Interest rate
> tells you how fast it gets worse. Payment plan tells you whether to fix
> it now, fix it incrementally, or *deliberately keep it* because it's
> cheaper than the cure.

Some debt is worth keeping. A janky CSV-import flow in OneLPA used twice a
quarter doesn't deserve a refactor; the cost of fixing exceeds the cost of
tolerating. Other debt — duplicated audit-trail logic across three
manufacturing-SaaS products — gets worse every quarter and *will* cause an
incident. The framework's job is to tell those apart.

For solo-portfolio work, add a fifth category to the standard list:
**portfolio drift** — patterns that diverged across products that should
share. This is the highest-leverage debt to pay because fixing it once
benefits all products.

## Approach

### Categorize before scoring

Score-then-categorize loses the picture. Walk through each category with
fresh eyes; a single workflow problem can show up as code debt, test debt,
*and* documentation debt simultaneously. Naming the category points to who
fixes it.

### Score with `(Impact + Risk) × (6 − Effort)`

The original framework holds: Impact (how much it slows work, 1–5), Risk
(what blows up if ignored, 1–5), Effort (1–5, *inverted* — a low-effort
fix is high-priority). Multiply, sort. The scores aren't science; they're
a forcing function for honest comparison.

For Storm's portfolio, add a multiplier of **×1.5 for portfolio-drift debt**
— fixing it pays off across multiple products.

### Bundle paydown with feature work

The reliable pattern for a solo builder: never propose a "tech debt sprint."
Propose a feature where 30–40% of the work is debt paydown that lives along
the same code path. The feature gives the work a customer-facing reason; the
debt gets paid as a side effect. Pure-debt sprints get bumped first when
anything else heats up.

### Document deliberate debt

When Storm intentionally takes on debt — shipping a quick OneCAPA fix that
ignores the audit-trail abstraction — write it down *as a debt entry on
the same day*. Future-Storm will not remember the trade-off was deliberate.

### Use the absence of an ADR as a debt signal

Decisions that should have produced an ADR but didn't are debt. The lack
of `architecture` documentation for a load-bearing choice means it gets
re-debated every time someone (Storm, contractor, agent) touches it.

## Reference

### Categories

| Category | Examples | Who pays it | Typical interest rate |
|---|---|---|---|
| **Code** | Duplication, magic numbers, leaky abstractions | Developer | Medium — compounds with each touch |
| **Architecture** | Wrong substrate, monolith that needs split, two products diverging | Architect | High — gets worse silently |
| **Test** | Coverage gaps, flaky tests, missing integration tests | Test / QA | High — invisible until it bites |
| **Dependency** | Outdated libs, unmaintained packages, security CVEs | Developer + Security | High — security risk grows |
| **Documentation** | Missing READMEs, stale runbooks, undocumented decisions | Docs | Low individually, high in aggregate |
| **Infrastructure** | Manual deploys, no monitoring, no IaC | DevOps | High when an incident hits |
| **Portfolio drift** *(solo-builder)* | Same problem solved 4 different ways across the manufacturing-SaaS products | Architect | Compounding — fix-once-benefit-many |

### Scoring template

```markdown
## Debt: [Short name]
**Category:** Code | Architecture | Test | Dependency | Documentation | Infrastructure | Portfolio drift
**Where:** [File / module / product / cross-product]
**Origin:** [How did we get here? Deliberate shortcut? Drift? Outdated assumption?]

**Impact (1–5):** [How much it slows work today]
**Risk (1–5):** [What goes wrong if we ignore it — incident? compliance gap? cost?]
**Effort (1–5):** [Engineering effort to fix; 1=days, 5=quarters]

**Score:** (Impact + Risk) × (6 − Effort) = [N]
**Portfolio multiplier:** ×1.5 if portfolio-drift, else ×1.0
**Final score:** [N]

**Paydown approach:** Bundle with [feature] | Standalone | Deliberate-keep
**Linked to:** [Roadmap item / ADR / incident postmortem]
```

### Prioritized list output

```markdown
## Tech Debt Register: [Project or Portfolio]
**Updated:** [Date]

### Top 5 by score
| Rank | Item | Category | Score | Paydown approach |
|---|---|---|---|---|
| 1 | [...] | [...] | [N] | [Bundle / Standalone / Keep] |

### Deliberate-keep (not worth paying down right now)
| Item | Why we're keeping it | When to revisit |
|---|---|---|

### By category
**Code:** [count]
**Architecture:** [count]
**Test:** [count]
**Dependency:** [count]
**Documentation:** [count]
**Infrastructure:** [count]
**Portfolio drift:** [count]
```

### Triage signals

| Signal | What it tells you |
|---|---|
| Same workaround in code 3+ times | Code or architecture debt |
| "Don't touch this file, it's haunted" | Test debt + documentation debt |
| New feature blocked on legacy decision | Architecture debt |
| Feature works in 3 of 4 portfolio products | Portfolio drift |
| Postmortem identifies a known issue | Risk you can no longer ignore |
| Onboarding doc longer than the code it explains | Documentation debt or design debt |

## Gotchas

- _No gotchas documented yet. Add entries when something goes wrong in practice._

## Anti-Patterns

- "Tech debt sprint" pitched standalone — always loses to a feature ask
- Treating every imperfection as debt — some code is just code
- Refusing to take *any* shortcut — slow shipping is its own debt
- Scoring without categorizing — loses the picture of who can pay
- Ignoring portfolio drift because it lives in "another product" — it's still your code
- Carrying debt mentally rather than writing it down — Storm will forget by next quarter
- Letting documentation debt accumulate because it "feels low priority" — it compounds invisibly until contractor or new-agent onboarding hits a wall
- Refactoring without a customer-facing reason — perfectly fine code refactored to feel cleaner adds no value

## Related Skills

- `architecture` — debt entries often signal a missing or stale ADR
- `roadmap-update` — top-scored debt items compete for roadmap slots
- `incident-response` — postmortems are a high-quality source of debt entries
- `risk-assessment` — high-Risk debt is also a risk-register entry
- `code-review-checklist` (software domain) — code-review catches new debt at commit time
- `process-doc` — documentation debt is process-doc work
