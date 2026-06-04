---
name: compliance-tracking
domain: universal
auto-load: false
used-by:
  - pm-agent
  - architect-agent
  - qa-agent
  - security-agent
description: >-
  Fire when Storm or an agent needs to track regulatory or quality-system
  compliance for a manufacturing SaaS product, prepare for an external audit,
  map controls to a framework, or build evidence-collection workflows. Trigger
  phrases: "ISO 9001", "ISO 27001", "21 CFR Part 11", "SOC 2", "FDA audit",
  "compliance gap", "audit prep", "GDPR", "control mapping", "regulatory
  requirement". Especially load this when working on OneCAPA, OneLPA, OnePPAP,
  or PFMEASuite — manufacturing-quality SaaS lives in compliance territory.
---

# Skill: Compliance Tracking

## Purpose

Compliance is not a checkbox exercise — it is a living system of controls,
evidence, and gap-closure that must keep pace with the product. The mental
model: every regulatory requirement maps to one or more controls; every
control needs an owner, a frequency, and an evidence artifact; every gap is
a risk register entry until it's closed.

For Storm specifically, the manufacturing-SaaS portfolio sits in a stack of
overlapping frameworks: customers' quality systems (ISO 9001, IATF 16949,
AS9100), records and electronic-signature requirements (21 CFR Part 11 for
regulated industries), and SaaS-platform expectations (SOC 2, GDPR if EU
data is in scope). The product becomes part of *their* audit trail, so the
product itself must be auditable.

## When to Use

- Designing a new feature in OneCAPA / OneLPA / OnePPAP / PFMEASuite that
  produces records, signatures, or workflow approvals
- Customer asks "are you SOC 2?" or "21 CFR Part 11 ready?" — need a real answer
- Preparing for a security questionnaire from an enterprise prospect
- Architect adds new data flows that touch personal data (GDPR scope)
- Storm explicitly asks to set up compliance tracking for a product

## Mental Model

A compliance program has four moving parts. Get any one wrong and the rest
collapses:

> **Requirement → Control → Evidence → Owner.** A requirement is what the
> framework demands. A control is what you do about it. Evidence is the
> artifact that proves the control is operating. An owner is the person (or
> agent) responsible when the control fails an audit.

Every gap is the absence of one of those four. Audit findings are almost
always: "control exists but no evidence" or "evidence exists but no owner."

For a solo builder, the owner is almost always Storm — but the evidence
artifact must still be produced consistently, or the framework will break
the moment a real auditor shows up.

## Approach

### Pick the framework based on customer demand, not aspiration

Do not pursue SOC 2 because it sounds professional. Pursue it because a
deal will close on it. Same for 21 CFR Part 11 — it matters when a regulated
manufacturer asks. Map the framework to revenue, not to a vague feeling
of legitimacy.

### Build the control inventory before the evidence

Map every requirement of the chosen framework to one explicit control. Write
each control as a one-sentence assertion the product or process makes:
"Every CAPA record carries an immutable audit trail of who modified what and
when." If you cannot write the assertion in one sentence, the control is
not yet defined.

### Evidence is a recurring task, not a one-time artifact

A control like "user access reviewed quarterly" is not satisfied by a
screenshot. It is satisfied by *four* screenshots per year, captured on
schedule. Wire evidence collection into the product (logs, exports) wherever
possible — manual evidence collection always falls behind.

### Gap analysis as a risk register

Every gap from current state to compliance is a risk. Score it on impact
(does this block a deal? trigger a finding?) and effort (days, weeks, months
to close). Prioritize. Do not pretend you'll close all gaps before the
auditor arrives — pick the highest-impact ones and document remediation
plans for the rest.

## Reference

### Framework cheat-sheet for Storm's portfolio

| Framework | When it matters | Key requirements that hit the product |
|---|---|---|
| ISO 9001 / IATF 16949 / AS9100 | Customer is a manufacturer | Document control, audit trails, CAPA workflows, training records |
| 21 CFR Part 11 | Customer is FDA-regulated (med-device, pharma, food) | Electronic signatures, immutable records, access control, audit trails |
| SOC 2 Type II | Enterprise SaaS prospect asks | Access controls, change management, monitoring, vendor management |
| ISO 27001 | International enterprise prospect asks | Information security management system, risk assessment, control set |
| GDPR | EU data subjects in scope | Lawful basis, data subject rights, breach notification within 72hrs |

### Control inventory template

```markdown
## Control: [ID — short name]
**Framework requirement:** [Specific clause/section]
**Control statement:** [One sentence — what the system or process guarantees]
**Owner:** Storm | [Agent name]
**Frequency:** Continuous | Daily | Weekly | Quarterly | On demand
**Evidence artifact:** [Where the proof lives — log path, screenshot, signed doc]
**Last verified:** [Date]
**Status:** Operating | Gap | Remediation in progress
```

### Gap analysis entry

```markdown
## Gap: [Framework requirement]
**Current state:** [What exists today]
**Required state:** [What the framework demands]
**Impact if not closed:** Blocks [deal/audit/cert] | Audit finding | Customer escalation
**Effort to close:** [hours/days/weeks]
**Plan:** [Concrete next steps]
**Target close date:** [Date]
```

### Audit prep checklist

- Control inventory complete and current (no controls in "TBD" status)
- Evidence collected for every control on its required frequency
- Gap register reviewed and remediation plans documented
- Access logs, audit trails, and change records exportable on demand
- Training records (for Storm and any contractors) up to date
- Vendor SOC reports collected for all critical sub-processors

## Gotchas

- _No gotchas documented yet. Add entries when something goes wrong in practice._

## Anti-Patterns

- Pursuing certifications for prestige rather than to unblock a specific customer or deal
- Treating compliance as a one-time project — frameworks demand continuous evidence
- Storing evidence in places only Storm knows about (use predictable paths so future-Storm can find them)
- Conflating "we have a control" with "we have evidence the control operated"
- Letting the product drift away from the controls — every architecture change should re-check the control inventory
- Manufacturing-SaaS projects: forgetting that *your customer's* auditors will look at *your* product as part of *their* audit. Audit-trail completeness is a product feature, not an internal concern.

## Related Skills

- `risk-assessment` — gaps in the compliance register feed the risk register
- `process-doc` — many controls need a documented SOP as their evidence artifact
- `security-review` — overlapping but narrower (technical security; compliance is broader)
- `architecture` — control changes should produce ADRs for traceability
