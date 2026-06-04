---
name: stakeholder-update
domain: universal
auto-load: false
used-by:
  - pm-agent
  - docs-agent
  - architect-agent
description: >-
  Fire when Storm needs to communicate progress, risks, or changes to a
  specific audience — a customer-facing release note for OneCAPA / OneLPA /
  OnePPAP / PFMEASuite, a weekly update to a podcast partner or sponsor,
  a status report to a fantasy-league community, or a "what changed"
  message to MyWhiskeyPedia subscribers. Trigger phrases: "status update",
  "weekly update", "monthly update", "release note", "announce", "let
  customers know", "update sponsors", "progress report", "where are we",
  "what should I tell [audience]". Distinct from `metrics-review` (analyzes
  the numbers) and `change-request` (commits to a change) — this skill
  *communicates* what's happening to a specific audience.
---

# Skill: Stakeholder Update

## Purpose

A stakeholder update earns its keep when the audience can act on it
without re-asking. The mental model: every update has a *single most
important thing*; everything else supports or contextualizes that. Updates
that bury the lead, or that match length to effort instead of audience
attention, fail their job.

For Storm, "stakeholders" cuts across very different audiences:

- **Customers** of the manufacturing-SaaS portfolio — quality managers,
  process engineers, plant managers reading what changed in OneCAPA,
  OneLPA, OnePPAP, or PFMEASuite
- **Podcast audience and sponsors** for Frontier Podcast — listeners
  expecting episode updates, sponsors expecting reach data
- **Fantasy-league community / MLB analytics readers** — decision-driven
  audiences reading for actionable input
- **Future-Storm** — re-reading the update three months later to
  reconstruct what happened
- **Contractors or collaborators** if engaged

Each audience needs a different shape, length, and tone. The skill is
matching shape to audience, not picking a "best" template.

## When to Use

- Weekly or monthly cadence updates (release notes, podcast season recap,
  fantasy-strategy newsletter)
- Launch announcements (new feature in OneCAPA, season premiere, new
  analytics tier)
- Risk escalation — something changed and a customer/audience needs to
  know before they discover it
- Customer success-style updates — "here's what we shipped that benefits
  you" framing
- Quarterly retrospectives — what got done, what got cut, what's next
- Pre-/post-incident communication (pairs with `incident-response`)

## Mental Model

> **Lead with the conclusion. Match length to attention. Make asks
> specific.** The audience reads the first sentence; the determined ones
> read the first paragraph; the small minority reads to the end. Front-
> load the most important thing on the assumption everyone bails after
> sentence one.

Three elements every update needs:

1. **The headline** — the single most important sentence. State of project,
   what shipped, the risk, the ask.
2. **The substance** — context, details, supporting data. Sized to audience
   attention.
3. **The next step** — what happens next, what's needed from the reader,
   when the next update will come.

Updates that include all three feel complete; updates missing any one
feel either thin or shapeless.

## Approach

### Identify the audience before writing

The same week's progress can produce a 5-paragraph customer release note,
a 200-word executive summary for a sponsor, or a one-sentence Slack
message to a contractor. Decide the audience first; tone, length, jargon,
and emphasis follow from that decision.

### Lead with status color when status applies

For ongoing projects with a goal and timeline (most SaaS work, season-
length podcast or fantasy projects), open with a Green / Yellow / Red
status. Yellow used proactively is a strength signal, not a weakness
— it's good risk management.

### Asks must be specific

"We need help" is not an ask. "We need a decision on whether to launch
the redesigned PPAP form by Friday — current proposal attached" is.
Vague asks get vague responses; specific asks get decisions.

### Acknowledge what's being lost, not just gained

When customer-facing changes remove or relocate something, name the loss
explicitly. "We removed the X view because Y" is better received than
"We've improved the interface" if X was something customers used. Honest
acknowledgment earns trust; spin erodes it.

### Frame for the audience's perspective

For customers: outcomes and benefits, not features and tickets. ("Your
team can now [do X]" beats "We shipped feature Y.") For Future-Storm:
context generously — assumptions that are obvious now will not be obvious
in three months. For sponsors / partners: shared goals and the data that
shows progress against them.

## Reference

### Audience templates

#### Customer / external (manufacturing-SaaS portfolio)

```markdown
Subject: [Product] update — [headline change], [date]

Hi [Customer / team],

[One-sentence headline: what changed and when, framed as customer benefit.]

**What's new:**
- [Change 1] — [Concrete benefit in customer terms]. [How to use it.]
- [Change 2] — [Benefit]. [Link to docs if non-obvious.]

**Coming soon:**
- [Item] — [Expected timing, only as specific as you can commit]

**Known issues / heads-up:**
- [Issue with workaround if applicable]

[Direct contact for questions. Expected response time.]

— Storm
```

**Tone notes:** No internal jargon. No ticket numbers. Frame in terms of
what the customer can now *do*. Be honest about timelines but don't
overcommit; "later this quarter" beats a date you might miss.

#### Customer release note (pattern for a single feature)

```markdown
## [Product] — [Feature name]
**Released:** [Date]

**What's new:** [One-sentence summary]

**Why we built it:** [Customer signal — feedback, support pattern,
compliance requirement]

**How to use it:**
[Concrete steps, screenshots if applicable, or link to docs]

**What changed for existing users:** [If anything changed in current
workflows, name it explicitly]

**Known limitations:** [If any]
```

#### Sponsor / partner update (Frontier Podcast pattern)

```markdown
## Frontier Podcast — [Period] update
**For:** [Sponsor name / partner]

**Headline:** [The one thing that matters most — usually a metric movement
or a milestone]

**Episodes published this period:**
- [Episode title] — [Topic / guest] — [Listens to date if relevant]

**Audience metrics:**
- [Total listens / downloads]
- [Trend vs. prior period]
- [Subscriber / follower changes]

**Where we're going:**
- [Next 1–3 episodes / focus]
- [Strategic moves — guests, topic shifts, new formats]

**Asks:** [Specific — guest intros, promotional support, content collaboration]
```

#### Future-Storm (project journal entry)

```markdown
## [Project] — [Period]
**Date:** [YYYY-MM-DD]

**Status:** Green / Yellow / Red — [one-sentence diagnosis]

**Shipped this period:**
- [Item] — [Link to spec / PR / commit / publish] — [Note any non-obvious context]

**In progress:**
- [Item] — [Where it stands] — [What's next]

**Blocked or at risk:**
- [Item] — [What's blocking] — [Plan to unblock]

**Decisions made:**
- [Decision] — [Link to ADR or DECISIONS.md entry]

**Lessons / things to remember:**
- [Anything that surprised you] — [What you'd do differently next time]

**Next period focus:** [Sprint goal or theme]
```

#### Quick / async update (Slack-style)

```markdown
🟢/🟡/🔴 [Project]: [One-sentence status]

✅ [Shipped item, link]
🚧 [In progress, owner if multiple, ETA]
🚨 [Risk — what changed, what we're doing]

Decision needed: [Specific ask, by-when]
```

### Status colors

| Color | Meaning | When to use |
|---|---|---|
| 🟢 **Green** | Progressing as planned, no significant risks | Don't default to Green — earn it with evidence |
| 🟡 **Yellow** | Progress slower than planned, or risk has materialized but mitigation underway | Use proactively — earlier flag = more options |
| 🔴 **Red** | Significantly behind, missing commitments without intervention | Use when you genuinely need help; don't wait |

### ROAM framework for risk communication

When updating on risks, use ROAM to avoid vague "things might slip" language:

- **Resolved** — risk is no longer a concern; document how it was resolved
- **Owned** — risk is acknowledged, someone (Storm, an agent, a vendor)
  is actively managing it; state who and what they're doing
- **Accepted** — risk is known and we're proceeding without mitigation;
  document why
- **Mitigated** — actions have reduced the risk to acceptable; document
  what was done

### Length targets by audience

| Audience | Target length | Why |
|---|---|---|
| Customer release note (one feature) | 100–200 words | Skimmable; benefit-focused |
| Customer monthly update | 200–400 words | Multiple changes, but still skimmable |
| Sponsor / partner update | 200–400 words | Metric-driven; respect their time |
| Async chat update (Slack-style) | 50–150 words | High-frequency; decision-driving |
| Future-Storm journal entry | 300–600 words | Context-heavy; you'll thank yourself |
| Launch announcement (customer) | 200–500 words | Headline + benefit + how-to + next |
| Quarterly retrospective | 600–1000 words | Substantive; retrospection takes space |

### Common patterns to adopt

- Lead every update with the most important sentence
- Use bold sparingly to highlight scannable points
- Use status color or emoji when status applies
- Match length to audience, not effort expended
- Make every ask specific — "decision on X by Friday"
- Acknowledge losses, not just wins
- Frame customer-facing changes in customer outcomes
- Include the next-update timing (so audience knows when to expect it)

## Gotchas

- _No gotchas documented yet. Add entries when something goes wrong in practice._

## Anti-Patterns

- Burying the lead — most important thing in paragraph three
- Same update sent to all audiences — wrong for each
- Length matching effort — long updates because the work was hard
- Vague asks — "support needed", "thoughts?", "any questions?"
- Hiding bad news under good news
- Status colors as decoration — Green by default, regardless of reality
- Customer updates in internal jargon — ticket IDs, codenames, implementation details
- Removing or relocating customer-facing capability without naming the loss
- No next-update timing — audience doesn't know when to expect more
- Update written *for* an audience but never sent because Storm got busy — the unsent update is the worst version

## Related Skills

- `metrics-review` — supplies the data for metric-driven updates
- `change-request` — customer-facing changes that go through change-request
  also need a stakeholder update; the comms section overlaps
- `incident-response` — incident comms are stakeholder updates with a
  tighter time pressure
- `risk-assessment` — risk register entries become Yellow/Red status
  signals in stakeholder updates
- `roadmap-update` — quarterly/monthly updates often summarize roadmap state
- `synthesize-research` — research updates use this skill's templates
