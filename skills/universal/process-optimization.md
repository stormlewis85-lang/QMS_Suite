---
name: process-optimization
domain: universal
auto-load: false
used-by:
  - pm-agent
  - architect-agent
  - docs-agent
  - qa-agent
description: >-
  Fire when Storm catches himself doing the same friction-y thing repeatedly,
  when a workflow that worked at the start of a project now feels heavy,
  when there's a step that always takes longer than it should, or when a
  customer-facing process (CAPA submission, PPAP review, layered audit
  scheduling, podcast publishing) needs to be streamlined. Trigger phrases:
  "this process is slow", "too many steps", "bottleneck", "every time I do
  X", "we keep redoing", "streamline", "automate this", "why does this
  take so long". Distinct from `process-doc` — this skill *changes* a
  process; that skill *captures* one.
---

# Skill: Process Optimization

## Purpose

A process exists to coordinate work; it earns its keep only when the
coordination is cheaper than ad-hoc. The mental model: every process step
is paying rent, and many stop earning it after the first few cycles. The
optimization mindset is to ruthlessly examine each step against the
question — *is this still doing what it was added to do?*

For Storm, processes are double-purpose. Internally, they coordinate
Storm-with-Storm-across-time and Storm-with-agents. Externally, they
coordinate Storm with customers — the CAPA submission flow in OneCAPA,
the PPAP review cadence in OnePPAP, the layered-audit schedule in OneLPA
all *are* processes from the customer's perspective. Internal optimization
removes friction for Storm; external optimization is a customer-facing
product feature.

## When to Use

- Storm catches himself working around the same thing 3+ times
- A handoff between agents (Architect → Developer, Developer → QA) keeps
  generating misunderstanding or rework
- A customer process (CAPA loop, PPAP submission, layered audit cadence)
  takes longer than the customer thinks reasonable
- A team-of-one workflow that worked when there was 1 product now creaks
  with 4 manufacturing-SaaS products active
- After an incident or a missed commitment, when retrospection identifies
  a process that contributed
- Pre-onboarding a contractor — process gaps become onboarding gaps
- A new customer is about to ramp and the current process won't scale to
  their volume

## Mental Model

> **Map the current state honestly before redesigning.** The temptation is
> to skip to "what should this be?" The discipline is to first describe
> what it actually is — including the steps people skip, the workarounds
> baked in, and the unspoken handoffs. The redesign emerges from honest
> mapping, not from imagination.

The five wastes (from Lean) translate cleanly to solo-builder and SaaS work:

1. **Waiting** — time spent in queues, waiting for approvals, waiting for
   information. (Customer waiting on PPAP feedback, Storm waiting for a
   synthetic-data run to complete.)
2. **Rework** — steps that fail and have to be redone. (Spec misread, code
   reviewed and rejected, content draft missing a required source.)
3. **Handoffs** — every transition is a chance to drop information.
   (Architect → Developer, Storm → contractor, Storm → future-Storm.)
4. **Over-processing** — steps that add no value. (Form fields no one uses,
   approvals that are always granted, status updates no one reads.)
5. **Manual work** — tasks that could be automated. (Renaming exports,
   reformatting a customer report, copy-pasting between tools.)

Customer-facing processes have a sixth waste: **inscrutability** — the
customer doesn't know what's happening or what's expected. A CAPA loop
where the customer can't see whose desk the record is on isn't slow; it's
opaque, which feels slow.

## Approach

### Map current state with timestamps and actors, not just steps

A step list is a wish; a current-state map has *durations* and *who-does-what*.
"Customer submits PPAP → Storm reviews → Customer revises → Storm
re-reviews → approval" is a step list. The real process is "Customer
submits PPAP → form sits in inbox 2.4 days median → Storm reviews in 35
min → email goes back to customer → customer revises in 4.1 days median →
re-review 12 min → approval email". The numbers are where the optimization
hides.

### Categorize each step by waste type before redesigning

Walk every step and label: waiting, rework, handoff, over-processing,
manual, or value-adding. Most steps are value-adding *or* support a
value-adding step. The ones that are pure waste are usually obvious once
labeled — but only after the mapping is honest.

### Future-state design: eliminate, automate, parallelize, in that order

The strongest move is to eliminate a step entirely. The second-strongest
is to automate it. The third is to make it run in parallel with another
step. Adding tooling to make a slow step *less* slow is the weakest move
— often the step itself shouldn't exist.

### Add checkpoints, not gates

Gates require approval before progress. Checkpoints surface state without
blocking it. A CAPA workflow with mandatory approval at every transition
is a gate. The same workflow with visible state changes and an exception
escalation path is a checkpoint system. Checkpoints flow faster and catch
the same problems with less ceremony.

### Measure before and after — even roughly

Before redesigning, capture baseline numbers (cycle time, error rate, hours
per cycle). After redesigning, recapture. Without measurement, you don't
know if the redesign helped, and "feels better" is a poor proxy.

## Reference

### Current-state mapping template

```markdown
## Process: [Name]
**Current owner:** Storm | [Agent or customer-side actor]
**Frequency:** [Per-cycle context — e.g., 12 CAPAs/month, 1 podcast/week]

### Current state — step-by-step
| # | Step | Actor | Median duration | Waste type |
|---|---|---|---|---|
| 1 | [Action] | [Storm / customer / agent] | [Time] | Value / Waiting / Rework / Handoff / Over-processing / Manual |

### Current-state metrics
- **Total cycle time:** [Calendar time start to finish]
- **Total hands-on time:** [Sum of actor minutes]
- **% time waiting:** [Waiting time / total cycle time]
- **Error / rework rate:** [% of cycles requiring rework]
- **Cost per cycle:** [Hours × hourly cost, or external cost]
```

### Future-state template

```markdown
### Future state — proposed
| # | Step | Actor | Expected duration | Change from current |
|---|---|---|---|---|
| 1 | [Action] | [Actor] | [Time] | Same / Eliminated / Automated / Parallelized / New |

### Expected impact
- **Cycle time:** [Before] → [After] ([% change])
- **Hands-on time:** [Before] → [After]
- **Error rate:** [Before] → [After]
- **Cost per cycle:** [Before] → [After]

### Implementation plan
1. [Concrete action — usually a config change, a code change, or a doc change]
2. [...]

### Rollback / contingency
If the new process underperforms, what's the rollback?
What's the metric and threshold that triggers a revert?
```

### Optimization moves, ranked

| Move | When to use | Example |
|---|---|---|
| **Eliminate** | Step has no value-adding rationale that survives questioning | Remove the "approval" stage on a process where approval is always granted |
| **Automate** | Step is rule-based, repeated, and error-prone for humans | Auto-rename exports, auto-route customer support tickets by product |
| **Parallelize** | Step doesn't depend on the prior step's output | Send PPAP form to customer *while* Storm is preparing internal review |
| **Make visible** | Step is opaque to a downstream actor (often a customer) | Add status visibility to the CAPA loop so customers see whose desk it's on |
| **Replace gate with checkpoint** | Approval that's almost always granted | Convert "manager approval required" to "manager notified, can intervene" |
| **Move work upstream** | Late-stage rework is common because of bad inputs | Make the customer's PPAP form smarter — validate at submission, not at review |
| **Move work downstream** | Step is being done early "just in case" but often isn't needed | Skip pre-formatting an export until the customer asks for it |
| **Tool support** | Step is genuinely necessary but slow due to friction | Better keyboard shortcuts, templates, snippets — last-resort move |

### Solo-builder process patterns worth optimizing first

- **Cross-portfolio handoffs:** OneCAPA → OneLPA shared component updates,
  brand library changes, customer-list sync — these handoffs are
  Storm-to-Storm-across-context-switch and pay for any optimization
- **Customer onboarding:** for the manufacturing-SaaS products, the time
  from "deal closed" to "customer using" is the leakiest stage; usually
  half handoffs and waiting
- **Content publishing (Frontier Podcast):** record → edit → master →
  publish → notify is a fixed-cycle process that compounds — every minute
  saved per episode pays back across the season
- **Fantasy / MLB analytics weekly cadence:** if the same data-pull /
  analyze / decide loop runs weekly, even small per-cycle savings matter

### Customer-process scrutiny (manufacturing-SaaS specific)

For OneCAPA, OneLPA, OnePPAP, PFMEASuite, examine externally-visible
processes against:

- **Visibility:** can the customer see status without asking?
- **Predictability:** can the customer know how long each stage typically takes?
- **Reversibility:** if the customer makes a mistake, is undo cheap?
- **Auditability:** does the process produce evidence artifacts (see `compliance-tracking`) without extra effort?

A customer process that scores poorly on these is a feature problem
masquerading as a process problem.

## Gotchas

- _No gotchas documented yet. Add entries when something goes wrong in practice._

## Anti-Patterns

- Skipping current-state mapping — redesigning from imagination instead of reality
- Adding tooling to a slow step that shouldn't exist
- Eliminating a step without identifying *why it was added* — it might have been a fix for a real problem
- Optimizing without measuring — "feels better" is not data
- Replacing a process with "we'll just remember" — works for one person on one task; collapses on context-switch
- Adding gates "for safety" that nobody respects — they get bypassed; the safety is illusory
- Optimizing internal processes while ignoring customer-facing ones — customer friction is product friction
- Optimizing a process before automating it — automating a bad process makes the bad process faster
- Building elaborate tooling for a process that runs 3x/year — the optimization costs more than the savings

## Related Skills

- `process-doc` — capture the new process after optimizing; an unmapped optimization erodes
- `runbook` (operations domain) — many optimized processes become runbooks
- `incident-response` — postmortems often surface processes that contributed; optimization is the follow-up
- `change-request` — process changes that affect customers go through change-request
- `capacity-plan` — process waste shows up as capacity drain; optimization recovers hours
- `tech-debt` — manual workarounds in code are often process debt in disguise
