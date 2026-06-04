---
name: change-request
domain: universal
auto-load: false
used-by:
  - pm-agent
  - devops-agent
  - architect-agent
  - qa-agent
description: >-
  Fire when Storm or an agent is about to make a change that will affect a
  customer, a published product, or a load-bearing process — a deploy with
  a schema migration, a price change, a removal of an existing feature, a
  cutover from one vendor to another, or a process change that affects how
  customers interact with OneCAPA / OneLPA / OnePPAP / PFMEASuite. Trigger
  phrases: "change request", "rollout plan", "rollback plan", "cutover",
  "migration plan", "we're about to ship", "communicate the change", "CAB",
  "pre-deploy checklist". For Storm, "approval" is self-approval — but the
  artifact still exists so future-Storm can reconstruct what was committed
  and why if it goes sideways.
---

# Skill: Change Request

## Purpose

A change request is a *commitment device*: by writing down what's changing,
who it affects, what could go wrong, and how to back it out, Storm forces
himself to think it through before pulling the trigger. The mental model:
the cost of writing a change request is always smaller than the cost of
the rollback you didn't plan for.

For an enterprise SaaS — manufacturing-quality products like OneCAPA, OneLPA,
OnePPAP, PFMEASuite — the change request also functions as customer
documentation. When a quality manager at a Fortune 500 manufacturer asks
"what changed in your platform last quarter, and how did you validate it?",
the trail of change requests *is* the answer. That's a compliance artifact
(see `compliance-tracking`), not just internal hygiene.

## When to Use

- Deploying anything that touches an existing customer's data or workflow
- Schema migrations (especially destructive or non-backward-compatible)
- Removing or renaming an existing feature, even a small one
- Cutting over from one vendor / library / service to another
- Changing pricing, billing, or terms of service
- Process changes affecting how customers submit tickets, get support, or use the product
- Any deploy where rollback would require manual intervention (vs. just redeploying)
- Cross-portfolio changes (the four manufacturing-SaaS products share a brand library — changes there ripple)

## Mental Model

> **Plan the rollback before the rollout.** If you can't describe how to
> reverse this in one paragraph, you don't understand the change well
> enough to ship it. The rollback paragraph forces the question: "what
> are the persistent side-effects?" Schema changes, sent emails, charged
> credit cards, third-party API calls — these are the things that don't
> reverse cleanly.

A change request has four jobs:

1. **Force clarity** on what's changing, for whom, and why
2. **Surface impact** that the changer hasn't fully considered
3. **Pre-commit a rollback** so panic doesn't drive recovery
4. **Leave a trail** so future-Storm and customers can reconstruct what happened

For solo work, the "approval" step compresses to self-approval — but the
*artifact* persists. The rollback plan is for future-Storm, not for a CAB.

## Approach

### Communicate the why before the what

When the change affects customers (a OneCAPA workflow change, a OnePPAP
report format change), lead the customer notification with the *why*. "We
changed X" reads as imposition; "Because customers reported Y, we changed
X" reads as responsiveness. Same change, different reception.

### Quantify impact, don't gesture at it

"Some users will see a different layout" is not impact analysis. "About 40
quality managers across 12 customer accounts who use the OnePPAP submission
view daily will see the redesigned form on Monday morning" is. Specifics
force you to know what you're shipping.

### Always have a rollback paragraph

Even for confident, low-risk changes. The rollback paragraph names: the
trigger (what makes us roll back), the steps (literal commands or actions),
and the verification (how we know it worked). If the rollback requires
"contact every affected customer," that's a signal the change should be
gated more carefully (feature flag, cohort rollout) before deploying.

### Phase the rollout when blast radius is large

Big changes go in stages: internal canary → 5% of customers → 50% →
everyone. Each stage has its own go/no-go. Solo-builder version: deploy
to MyWhiskeyPedia or an internal sandbox first, then to one friendly
customer, then broadly.

### Bundle the customer comms with the change request

The communication plan is part of the change request, not a separate task.
Customers should hear about meaningful changes from Storm before they
discover them by surprise. Acknowledge what's being lost, not just what's
being gained — removing or relocating a feature is a loss for the
customers who used it.

## Reference

### Change request template

```markdown
## Change Request: [Title]
**Date:** [YYYY-MM-DD]
**Priority:** Critical | High | Medium | Low
**Risk level:** High | Medium | Low
**Status:** Draft | Ready | In progress | Complete | Rolled back

### Description
What is changing, in one paragraph. Plain language.

### Why
What problem this solves. What evidence drove the decision (customer
request, incident, compliance gap, metrics signal). Link to the spec /
ADR / incident if applicable.

### Impact analysis
| Area | Severity | Details |
|---|---|---|
| Customers | High / Med / Low / None | [Who specifically — names of accounts if known, count if not] |
| Data | High / Med / Low / None | [Schema change? Backfill? Data loss possible?] |
| Other portfolio products | High / Med / Low / None | [Does this touch shared code or patterns?] |
| Compliance | High / Med / Low / None | [21 CFR Part 11, ISO 9001, audit-trail implications] |
| Cost | High / Med / Low / None | [Vendor cost change, infra cost change] |

### Risk assessment
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| [What could go wrong] | H/M/L | H/M/L | [Pre-deploy mitigation] |

### Implementation plan
| Step | Action | When | Reversible? |
|---|---|---|---|
| 1 | [Specific action] | [Time / sequence] | Yes / No |

### Communication plan
| Audience | Message | Channel | Timing |
|---|---|---|---|
| [Customer cohort] | [The why and what] | Email / in-app / call | [Lead time before change] |
| [Future-Storm] | This change request itself | DECISIONS.md link | At deploy |

### Rollback plan
**Trigger:** [What makes us decide to roll back — error rate, customer
report, specific failure signal]
**Steps:**
1. [Literal command or action]
2. [...]
**Verification:** [How we confirm the rollback succeeded]
**Persistent side-effects that won't reverse:** [Sent emails, billed charges,
external-API calls — and what to do about them]

### Post-change verification
- [ ] [Check 1 — typically a metric or smoke test]
- [ ] [Check 2]
- [ ] Customer-visible behavior matches the description above
- [ ] No regression in [linked metric]
- [ ] Updated CONTEXT_PROJECT.md / DECISIONS.md
```

### Phasing patterns

| Pattern | Use when |
|---|---|
| **Big bang** | Tiny blast radius; rollback is trivial; coordinated cutover required |
| **Feature flag** | Behavior change; want to enable per-customer, per-cohort, or per-environment |
| **Canary** | Infra or platform change; want to observe a small slice before going broad |
| **Dark launch** | New code path running but not visible to users; build confidence before enabling |
| **Parallel run** | Old and new systems both run; compare outputs before cutover (good for data-pipeline changes) |
| **Strangler fig** | Long-running migration; new system gradually absorbs scope from old |

### Rollback feasibility check

Before declaring the change request ready, ask:

- Can I undo the schema change without data loss?
- Can I redeploy the previous build cleanly, or does it require migration too?
- Are there third-party API calls or external state changes I can't reverse?
- If users have already taken the new path, what happens to their in-flight work?
- How long after the change am I still able to roll back? (Hours? Days? Forever-loss after some point?)

If any answer is "no" or "not cleanly," the rollback plan needs an explicit
contingency — usually a forward-fix path rather than a true rollback.

### Customer comms template (for the manufacturing-SaaS portfolio)

```markdown
Subject: [Product] — [What changed], [when]

Hi [Customer name / "team"],

We're making a change to [Product] on [date / time]: [one-sentence what].

**Why:** [Specific driver — customer feedback, compliance, performance.]
Lead with the why; it earns trust.

**What you'll see:** [Concrete description from the customer's POV.]

**What you need to do:** [Often nothing; if action required, be specific.]

**If something looks wrong:** [Direct contact, expected response time.]

We've prepared to roll back if needed; the change has been validated in
[sandbox / friendly-customer environment].

— Storm
```

## Gotchas

- _No gotchas documented yet. Add entries when something goes wrong in practice._

## Anti-Patterns

- Shipping a "small" change without a change request — small changes break things too
- Rollback plan that says "redeploy previous version" when the change includes a destructive migration
- Communication plan that fires *after* customers notice the change
- Change request written *after* the deploy to satisfy a checklist — defeats the forcing function
- Combining unrelated changes in one request — entangles the rollback decision
- "Risk: Low" without naming a single risk — restate the analysis
- Phasing skipped for changes with broad blast radius — solo builders especially can't afford a self-inflicted incident
- Customer comms in jargon — quality managers don't speak engineering

## Related Skills

- `incident-response` — failed change requests trigger incidents; write the postmortem against the change-request artifact
- `risk-assessment` — pull the risk table directly from the change-request risk register
- `compliance-tracking` — change records are evidence artifacts for ISO 9001 and 21 CFR Part 11 audits
- `architecture` — significant changes are usually preceded by an ADR; link them
- `process-doc` — process changes need both a change request *and* an updated SOP
- `vendor-review` — vendor cutovers go through both vendor-review and change-request
- `stakeholder-update` — customer comms section overlaps with stakeholder-update format
