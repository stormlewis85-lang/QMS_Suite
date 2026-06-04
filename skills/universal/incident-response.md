---
name: incident-response
domain: universal
auto-load: false
used-by:
  - devops-agent
  - developer-agent
  - qa-agent
  - pm-agent
description: >-
  Fire when a production system is broken, degraded, or behaving unexpectedly,
  when an alert needs severity assessment, when Storm is mid-incident and
  needs to write a status update, or when an incident has resolved and a
  postmortem is needed. Trigger phrases: "production is down", "site is broken",
  "customer reports", "users can't", "we have an incident", "postmortem",
  "what just happened", "rollback now". Especially load this when working on
  customer-facing manufacturing-SaaS products (OneCAPA, OneLPA, OnePPAP,
  PFMEASuite) where a quality-system outage during an audit is high-impact.
---

# Skill: Incident Response

## Purpose

An incident response workflow turns chaos into a sequence of small, ordered
decisions. The mental model has four phases — **triage, communicate,
mitigate, learn** — each with a specific output. The goal in the moment is
not to find the root cause; it is to stop the bleeding, communicate honestly,
and capture enough information to learn from later.

For a solo SaaS builder, "incident response" is a different shape than at
a 50-person ops team — there is no on-call rotation, no incident commander,
no comms lead. Storm is all of them at once. That makes *discipline* matter
more, not less: without a structured workflow, panic drives the response
and the postmortem lessons never get captured.

## When to Use

- Customer reports the product is broken or behaving wrong
- Monitoring/alert fires (or *should* have fired and didn't)
- Build is broken in a way that blocks customer access
- Storm spots something off in the data and needs to assess
- Post-resolution: writing the postmortem (do this every time, not just for SEV1s)

## Mental Model

> Phase 1 — **Triage**: classify severity, identify scope, decide whether to
> stop the bleed now or investigate first. Phase 2 — **Communicate**: tell
> affected users (and yourself, via a running log) what's happening, even if
> you don't yet know what's wrong. Phase 3 — **Mitigate**: rollback, hotfix,
> failover, manual workaround — anything that restores service, even if
> ugly. Phase 4 — **Learn**: blameless postmortem, action items with owners
> and dates.

The order matters. Do not investigate before triaging. Do not write code
before communicating. Do not skip the postmortem because the incident was
"small" — small incidents missed are the dress rehearsal for the SEV1 you
didn't see coming.

## Approach

### Triage in 90 seconds

The first decision is severity, and it should take less than two minutes:

- How many users affected?
- Is core workflow broken or just degraded?
- Is data integrity at risk? (Manufacturing SaaS: is anyone's audit trail
  being corrupted right now?)
- Is anyone *currently in the product* and stuck?

That tells you SEV. Pick a level, write it down, and move.

### Communicate before you have answers

The single most-violated rule. Customers tolerate "we know about it,
investigating, will update in 30 min" — they do not tolerate silence. For
a solo builder: a one-line status posted to your status page, sent as an
email, or pinned in support is enough. Do this *before* you start digging
into the cause.

### Mitigate before you fix

Rollback is the default. A clean rollback to a known-good state buys you
the time to investigate properly. If rollback isn't possible, a manual
workaround communicated to affected users is better than a frantic hotfix
written under time pressure.

### Postmortem every time, even SEV4

The discipline of writing the postmortem is what makes the incident
educational. Skip it for "small" incidents and you build a habit of not
learning. The postmortem template below scales — for a SEV4 it might be
six lines; for a SEV1 it's a multi-page artifact. Both go in the lessons-learned file.

## Reference

### Severity classification (solo-builder scaled)

| Level | Criteria | Response |
|---|---|---|
| SEV1 | Product completely unusable for all customers, OR active data corruption / breach | Drop everything. Stabilize first, fix later. Notify affected customers within 30 min. |
| SEV2 | Major feature broken, OR usable but significantly degraded for many customers | Begin work within 1 hour. Communicate proactively. |
| SEV3 | Specific feature broken or degraded for some customers, workaround exists | Fix within 1 business day. Notify if customer-impacting. |
| SEV4 | Minor bug, cosmetic issue, edge case affecting few customers | Add to backlog with clear acceptance criteria. Postmortem still required. |

**Quality-system context note:** For OneCAPA / OneLPA / PFMEASuite users
mid-audit, even a SEV3 can be effectively SEV1 — they cannot show their
auditor a broken quality system. Bump severity for any incident affecting
audit-trail integrity, electronic signatures, or record immutability.

### Status update template (use during incident)

```markdown
## Incident: [Short title]
**Severity:** SEV[1-4] | **Status:** Investigating | Identified | Mitigating | Monitoring | Resolved
**Started:** [Timestamp]
**Last updated:** [Timestamp]
**Impact:** [Who/what is affected — be specific]

### What we know
[One paragraph — confirmed facts only, no speculation]

### What we're doing
- [Concrete action being taken now]
- [Next action queued]

### Next update
[When the next status post will go out — set an expectation, then beat it]

### Timeline
| Time | Event |
|---|---|
| [HH:MM] | [Detection / first symptom / first action] |
```

### Postmortem template

```markdown
## Postmortem: [Incident title]
**Date:** [Date]
**Duration:** [Detection to resolution]
**Severity:** SEV[1-4]
**Status:** Draft | Reviewed | Final

### Summary
[2-3 sentences in plain language. What broke, who was affected, how it ended.]

### Impact
- **Customers affected:** [Count or names]
- **Duration of customer impact:** [From first user-visible symptom to resolution]
- **Business impact:** [Revenue, churn risk, support burden, audit exposure]

### Timeline
| Time (UTC) | Event |
|---|---|
| [HH:MM] | [What happened — detection, action, status change] |

### Root cause
[Explanation of what actually caused the incident. Not "the server failed"
but the chain of conditions that led to the failure.]

### Five whys
1. Why did [symptom]? → [Because…]
2. Why did [cause 1]? → [Because…]
3. Why did [cause 2]? → [Because…]
4. Why did [cause 3]? → [Because…]
5. Why did [cause 4]? → [Root cause — usually a process or design issue, not a person]

### What went well
- [Detection was fast / rollback worked / customer comms were clear]

### What went poorly
- [Detection was slow / rollback didn't / panic drove decisions]

### Action items
| Action | Owner | Priority | Due |
|---|---|---|---|
| [Concrete change] | Storm \| [Agent] | P0 \| P1 \| P2 | [Date] |

### Lessons for `lessons-learned.md`
[The transferable insight. What pattern should agents recognize next time?]
```

### Solo-builder communication channels

- **Status page** — even a Notion page is fine; just have a public URL
- **Email or in-app banner** — for customer-impacting incidents
- **Running log file** — your own internal scratch document; capture timestamps obsessively, you will need them for the postmortem and you will not remember
- **Customer support thread** — if the incident was reported by a customer, keep them updated in the original thread

## Gotchas

- _No gotchas documented yet. Add entries when something goes wrong in practice._

## Anti-Patterns

- Investigating before triaging — wasting the first 30 minutes on diagnosis when severity could have been classified in 90 seconds
- Coding under time pressure when a rollback exists — hotfixes-during-fire produce the next incident
- Silence during incident — customers fill the vacuum with worst-case assumptions
- "Root cause: [name] made a mistake" — postmortems are blameless because the same mistake-prone-environment will produce the same mistake from anyone
- Skipping the postmortem because the incident was small or the cause was obvious — discipline lives in the small ones
- Action items without owners or dates — they will not happen
- Postmortem buried where future-Storm won't find it — every postmortem feeds `lessons-learned.md`

## Related Skills

- `error-pattern-analysis` — postmortem action items often map to patterns already in the error register
- `risk-assessment` — recurring incident causes should be promoted to risk-register entries
- `process-doc` — incidents in customer-facing workflows often reveal SOP gaps
- `runbook` (if extracted later) — runbooks reduce decision-making under pressure
- `compliance-tracking` — incidents involving regulated data trigger reporting obligations (e.g., GDPR 72-hour breach notice)
