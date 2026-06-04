---
name: vendor-review
domain: universal
auto-load: false
used-by:
  - pm-agent
  - architect-agent
  - security-agent
description: >-
  Fire when Storm or an agent is evaluating a vendor — picking a SaaS tool,
  deciding on a renewal, comparing two options, or running a build-vs-buy
  for the manufacturing-SaaS portfolio. Trigger phrases: "vendor review",
  "should we use [tool]", "renewal coming up", "compare X vs Y",
  "TCO breakdown", "build vs buy", "are we getting value from [tool]",
  "negotiate", "switch from X to Y". Particularly relevant for: e-signature
  / PDF tools (used across the four manufacturing-SaaS apps), hosting and
  DB providers, analytics platforms, audio production tools (Frontier
  Podcast), fantasy-sports analytics platforms (Dynasty, MLB analytics).
---

# Skill: Vendor Review

## Purpose

Vendor decisions are *contractual debt* — every signed agreement locks in
cost, behavior, and switching friction for the term of the contract. The
mental model: a good vendor review forces TCO honesty (the license fee is
rarely the biggest line) and rollback honesty (what does it actually take
to get out of this vendor, and what data do they keep?).

For Storm's portfolio, vendor decisions cascade. A SaaS billing platform
chosen for OneCAPA tends to get reused for OneLPA, OnePPAP, and PFMEASuite
— so the cost of the wrong choice multiplies. Conversely, a vendor that
fits one product (e.g., audio mastering for Frontier Podcast) may have no
relevance to the manufacturing-SaaS apps, and vendor reuse should not be
a goal in itself.

## When to Use

- New vendor evaluation (haven't bought yet)
- Renewal decision — keep, renegotiate, or replace
- Side-by-side comparison of two or more vendors
- Build vs. buy analysis (often pairs with `architecture`)
- Vendor consolidation — can one tool replace three?
- Post-incident review of a vendor that caused or worsened an incident
- Pre-renewal cost/value check, ideally 60+ days before contract end

## Mental Model

> **The license is the smallest line.** Total cost includes implementation,
> migration, training, integration, ongoing support, *and* exit costs.
> Vendors quote the license to anchor; you compare on TCO. The vendor
> with the lowest list price often has the highest TCO once integration
> and switching costs are counted.

Vendor risk has three flavors that matter for solo-builder SaaS work:

1. **Stability risk** — will the vendor exist in 3 years? (Especially for
   small SaaS tools; an acqui-hire or shutdown is a rollback you didn't plan)
2. **Lock-in risk** — how hard is it to leave? Do they hold your data
   formats? Are there proprietary APIs your integrations depend on?
3. **Compliance risk** — does their security/compliance posture match what
   *your* customers expect? Manufacturing-SaaS customers will ask for
   sub-processor lists and SOC reports — *your* vendors become *their*
   audit concern.

For solo-builder portfolio decisions, also weigh **operational fit**: can
one person realistically operate this, or does it assume a team? A vendor
designed for a 50-person ops team will be friction-heavy in solo mode.

## Approach

### Anchor on the decision being made

Every vendor review has a single decision at the end: proceed, negotiate,
pass, renew, replace. The analysis exists to support that decision. Front-
load the recommendation in two sentences; let the rest of the document
defend it.

### Calculate three-year TCO, not annual list

Annual list prices flatter the cheaper option. Three-year TCO including
implementation, migration, training, support, and an estimated exit cost
shows the real shape. For renewals, also calculate the *replacement* TCO
— what would it cost to switch — because that's the negotiation leverage.

### Map vendor risk to *your customers*' compliance posture

If the manufacturing-SaaS portfolio's customers are subject to ISO 9001
audits, the vendors *you* use for hosting, auth, e-signature, and audit
trails become *their* audit scope. Asking "does this vendor have a SOC 2
Type II report and a GDPR DPA?" is not optional for vendors in the data
path — it's a precondition.

### Build the comparison matrix; don't free-text the comparison

Two vendors described in prose look subtly equivalent. Two vendors in a
side-by-side matrix have visible deltas. Force the matrix even when only
one vendor is being evaluated — the empty column for "alternatives
considered" makes you go find one.

### Always identify negotiation leverage before signing

Even with one vendor in the running, there are levers: term length,
auto-renewal terms, price escalators, payment cadence, named-user vs.
seat-based pricing, support tiers, exit-data assistance. Solo builders
get conditioned to take the offered price — vendors expect negotiation.

## Reference

### Evaluation framework

```markdown
## Vendor Review: [Vendor Name]
**Date:** [YYYY-MM-DD] | **Type:** New | Renewal | Comparison | Build-vs-Buy
**Recommendation:** Proceed | Negotiate | Pass | Switch | Build instead
**Decision driver:** [One sentence — what made this win or lose]

### Use case
What problem are we solving? Which products in the portfolio? How many
users / records / transactions / hours-of-audio per month?

### TCO — 3-year
| Component | Year 1 | Year 2 | Year 3 | 3-yr total |
|---|---|---|---|---|
| License / subscription | $[X] | $[X] | $[X] | $[X] |
| Implementation / setup | $[X] | — | — | $[X] |
| Integration build | $[X] | — | — | $[X] |
| Storm's time to operate | $[X] | $[X] | $[X] | $[X] |
| Support / add-ons | $[X] | $[X] | $[X] | $[X] |
| Estimated exit cost | — | — | $[X] | $[X] |
| **Total** | **$[X]** | **$[X]** | **$[X]** | **$[X]** |

### Risk assessment
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Vendor stability (will they exist in 3 yrs?) | H/M/L | H/M/L | [Multi-vendor strategy? Escrow?] |
| Lock-in (data, APIs, contract) | H/M/L | H/M/L | [Open formats? Export tools?] |
| Compliance (does posture match customer expectations?) | H/M/L | H/M/L | [DPA, SOC report, sub-processor list] |
| Operational fit (solo-builder feasible?) | H/M/L | H/M/L | [Setup hours, ongoing maintenance] |
| Pricing escalation | H/M/L | H/M/L | [Cap in contract, lock multi-year] |

### Strengths
- [Concrete — not "great UX"; "5-step PPAP submission flow takes 90s vs. 6 min in current tool"]

### Concerns
- [Concrete — specific gaps, not vague worries]

### Comparison matrix (when multiple vendors)
| Dimension | [Vendor A] | [Vendor B] | [Vendor C / build] |
|---|---|---|---|
| 3-yr TCO | $[X] | $[X] | $[X] |
| Compliance posture | [SOC 2 yes/no, DPA yes/no] | [...] | [...] |
| Lock-in level | Low / Med / High | [...] | [...] |
| Solo-builder operability | Low / Med / High | [...] | [...] |
| Time-to-value | [Weeks] | [Weeks] | [Weeks/months for build] |
| Integration burden | [Hours] | [Hours] | [Weeks for build] |

### Negotiation points (if Proceed or Renew)
- [Lever 1: e.g., "Asking for 12-month term instead of 24, with year-2 cancellation right"]
- [Lever 2]
- [Lever 3]

### Exit plan (worst-case)
1. How we get our data out
2. Time required to migrate to alternative
3. Persistent dependencies (integrations, links, embedded UIs)
4. Trigger conditions for actually exiting
```

### Vendor categories common in Storm's portfolio

| Category | Examples | Critical risk dimensions |
|---|---|---|
| Hosting / DB | AWS, GCP, managed Postgres | Lock-in (data, networking), pricing escalation |
| Auth / SSO | Auth0, WorkOS, Clerk | Lock-in (token format, user store), compliance posture |
| E-signature / PDF | DocuSign, BoldSign, custom | Compliance (21 CFR Part 11), per-document pricing |
| Email / transactional | SendGrid, Postmark, SES | Deliverability, compliance, audit trail |
| Analytics / events | PostHog, Mixpanel, Amplitude | Data export, EU residency, sampling at scale |
| Audio production | Descript, Riverside, mastering services | Output quality, storage cost, integration with podcast workflow |
| Fantasy-sports data | Sleeper API, FantasyPros, third-party data feeds | Reliability during peak NFL season, rate limits, cost |

### TCO honesty check

Before submitting a TCO calculation, ask:

- Did I include Storm's time to set up, integrate, and operate? (Hours × hourly rate)
- Did I include the time to learn the tool? (Often a week of slow shipping)
- Did I include data migration? (For renewals/replacements: pulling from current, loading to new)
- Did I include integration with adjacent tools? (Auth, billing, analytics tie-ins)
- Did I include exit cost? (Non-zero even if "we'll never leave" — vendors fail, get acquired)

If any of these is "$0" or "negligible," the TCO is wrong.

### Build-vs-buy quick check

Build wins when:
- The capability is *core differentiation* (audit-trail logic for OneCAPA, ranking models for fantasy analytics)
- Vendors charge per-record/per-event and your volume is high
- No vendor matches the compliance bar your customers demand
- The integration burden of buying ≈ the build cost

Buy wins when:
- The capability is *commodity* (PDF generation, transactional email, billing)
- Vendor TCO < 1 month of build effort
- Compliance and security posture is hard to replicate (e.g., e-signature)
- Speed matters more than perfect fit (initial launch of a new SaaS product)

If the answer is "we should build" but the build estimate is more than 4
weeks of solo-builder time, re-examine the buy options. Solo builds slip.

## Gotchas

- _No gotchas documented yet. Add entries when something goes wrong in practice._

## Anti-Patterns

- Anchoring on list price; ignoring implementation, integration, ongoing ops, and exit cost
- Comparing only the vendors that pitched you — go find the alternatives that didn't
- "We'll handle compliance later" — for manufacturing-SaaS customers, vendor compliance posture is *the* gate
- Free-text comparisons that hide deltas — force the matrix
- Choosing on the demo experience — demos are sales theater
- Skipping the exit plan because "we'll never leave" — vendors fail, get acquired, raise prices, deprecate
- Bundling unrelated capabilities into one vendor for convenience — increases lock-in
- Renewing without re-pricing — vendor knows you have inertia
- Solo-builder mode: assuming the tool is operable as advertised — many SaaS tools assume a team

## Related Skills

- `architecture` — build-vs-buy decisions become ADRs
- `risk-assessment` — risk tables in vendor reviews feed the broader risk register
- `compliance-tracking` — vendor sub-processor evidence is part of the compliance evidence chain
- `change-request` — vendor cutovers go through change-request
- `roadmap-update` — vendor decisions affect timeline; integration work becomes roadmap items
- `tech-debt` — bad vendor choices show up later as portfolio drift or integration debt
