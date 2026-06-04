---
name: risk-assessment
domain: universal
auto-load: false
used-by:
  - architect-agent
  - pm-agent
  - qa-agent
  - security-agent
description: >-
  Fire when Storm or an agent needs to enumerate, score, and prioritize risks
  on a project, vendor, architectural decision, release, or business move.
  This is PFMEA-thinking applied generally — likelihood × impact × detectability
  produces a scored register, and every risk gets an owner. Trigger phrases:
  "what could go wrong", "risk assessment", "risk register", "FMEA", "RPN",
  "is this safe", "what's the worst case", "what are we missing". Especially
  load this when working on PFMEA Suite features (the product literally is a
  risk assessment tool — methodology must be sound).
---

# Skill: Risk Assessment

## Purpose

A risk register is the explicit, scored enumeration of what can go wrong,
how likely it is, what the impact would be, and who owns the response. The
goal is not to eliminate risk — it is to make risk *visible* so it can be
prioritized against effort and accepted, mitigated, transferred, or avoided
with intent.

This skill formalizes the same methodology Storm builds into PFMEASuite
(Process Failure Mode and Effects Analysis): enumerate failure modes, score
on Severity / Occurrence / Detection, multiply for a Risk Priority Number,
sort, attack the top of the list. The generalized form drops the manufacturing
vocabulary but keeps the discipline.

## When to Use

- Before committing to an architectural decision (new dependency, new vendor, new framework)
- Pre-release: what could go wrong when this ships?
- Vendor evaluation (renewal, switch, new pick)
- Strategic decision (entering a new market, pivoting a product, taking on a new domain)
- Architect Agent escalates a structural concern that needs explicit weighing
- Storm asks "what's the worst case here?" or "are we missing anything?"

## Mental Model

> Risk = (Likelihood it happens) × (Impact if it does) × (Inverse of how
> easily we'd catch it before damage spreads). The third axis — detectability
> — is what separates a real risk register from a wishlist of fears. A
> high-impact risk that's automatically detected and contained is lower
> priority than a low-impact risk that festers undetected for months.

This is the PFMEA Risk Priority Number model: **RPN = Severity × Occurrence
× Detection**. PFMEASuite makes Storm think in three axes by default. Apply
that same three-axis thinking to software, vendor, and strategy decisions —
not just manufacturing processes.

The output is a *prioritized* register, not a complete one. Risks below the
RPN threshold are accepted-and-noted; risks above it get explicit mitigation
plans with owners and dates.

## Approach

### Enumerate before you score

Brainstorm failure modes broadly first, then score. Mixing enumeration and
scoring produces a censored list — you'll skip risks that "feel paranoid"
during enumeration, which are exactly the ones that bite later.

### Score with anchors, not vibes

Severity 1–10 means nothing without anchors. Define them up front for the
domain: what does Severity 9 actually look like? (e.g., for SaaS: data loss
or breach. For content: published a factual error that requires retraction.)
Same for Occurrence and Detection. Without anchors, scoring drifts every
session.

### Detectability is where most work pays off

You cannot always reduce severity (a data breach is a data breach). You
often cannot reduce occurrence below a floor (humans make mistakes). But
you can almost always *improve detection* — monitoring, audit trails, tests,
review gates. When mitigating, ask first whether you can detect failure
faster, before trying to prevent it entirely.

### Owners are mandatory

A risk without an owner is a risk that will not be mitigated. Every entry
in the register names a single owner — Storm, an agent, or a specific
contractor. "The team" is not a valid owner.

### Re-score after mitigation

A mitigated risk gets a new RPN. The point of the register is to track that
the score is *coming down*. If RPNs never change, the register is a
decoration.

## Reference

### RPN scoring (PFMEA-style)

| Score | Severity (S) | Occurrence (O) | Detection (D) |
|---|---|---|---|
| 9–10 | Catastrophic — data loss, customer breach, deal-killer | Almost certain (>1 in 10 events) | No way to detect before damage |
| 7–8 | Major — significant downtime, customer escalation, major rework | Frequent (1 in 100) | Detection unlikely |
| 4–6 | Moderate — recoverable incident, customer noticeable | Occasional (1 in 1k) | Moderate detection capability |
| 2–3 | Minor — internal-only, minor friction | Rare (1 in 10k) | High detection probability |
| 1 | Negligible — no real impact | Almost never | Detected immediately |

**RPN = S × O × D** (range 1–1000). Threshold for action depends on the
domain — for safety-critical or regulated work, attack everything ≥125;
for low-stakes, ≥200 may be acceptable.

### Lightweight matrix (when full RPN is overkill)

For quick assessments — a single architectural decision, a vendor pick:

| | Low Impact | Medium Impact | High Impact |
|---|---|---|---|
| **High Likelihood** | Medium | High | Critical |
| **Medium Likelihood** | Low | Medium | High |
| **Low Likelihood** | Low | Low | Medium |

### Risk register entry

```markdown
## Risk: [Short ID — descriptive name]
**Description:** [What could happen, in one sentence]
**Category:** Operational | Financial | Compliance | Strategic | Reputational | Security | Technical
**Severity (1–10):** [Score with one-line justification]
**Occurrence (1–10):** [Score with one-line justification]
**Detection (1–10):** [Score — high = harder to detect]
**RPN:** [S × O × D]
**Owner:** [Storm | Agent name | Contractor]
**Current mitigation:** [What's already in place]
**Planned mitigation:** [What's being added; target date]
**Post-mitigation RPN:** [Re-score after mitigation]
**Status:** Open | Mitigation in progress | Mitigated | Accepted | Closed
**Last reviewed:** [Date]
```

### Categories to scan when enumerating

- **Operational**: workflow gaps, missing SOPs, single-point-of-failure on Storm
- **Technical**: dependency risk, architectural decisions, data integrity, performance under load
- **Financial**: vendor cost, customer concentration, runway
- **Compliance**: regulatory exposure (see `compliance-tracking`)
- **Strategic**: market shifts, competitive moves, pivot risk
- **Reputational**: customer impact, public errors (especially relevant to whiskey podcast / content domain)
- **Security**: see `security-review` for the technical-security subset
- **Personal/portfolio**: bus factor (Storm-only knowledge), context-switch tax across projects

### Mitigation strategies (in increasing order of cost)

1. **Detect faster** — add monitoring, audit trails, alerts, gates
2. **Reduce occurrence** — process change, automation, validation
3. **Reduce severity** — graceful degradation, partial failure modes, blast-radius limits
4. **Transfer** — insurance, vendor SLA, indemnification clause
5. **Avoid** — choose a different architecture or approach

## Gotchas

- _No gotchas documented yet. Add entries when something goes wrong in practice._

## Anti-Patterns

- Scoring before enumerating — bias filters the list
- Treating the register as a one-time artifact instead of a living document
- Counting severity but ignoring detection — the most common failure of casual risk assessments
- "The team" as owner — every risk needs a single named owner
- Stopping the assessment when the obvious risks are listed — the dangerous risks are the non-obvious ones (PFMEA culture: spend extra time looking for *what hasn't been imagined*)
- Treating the post-mitigation RPN as theoretical — verify the mitigation actually works before re-scoring
- Mistaking risk register completeness for risk reduction — uncrossed-off entries are still active risks

## Related Skills

- `compliance-tracking` — compliance gaps feed the register as risks
- `security-review` — technical-security subset; both produce register entries
- `architecture` — risk assessment should run before any non-trivial ADR
- `error-pattern-analysis` — past failures inform what risks to enumerate
- `process-doc` — high-RPN process risks may need an SOP as mitigation
