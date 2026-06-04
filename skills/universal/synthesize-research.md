---
name: synthesize-research
domain: universal
auto-load: false
used-by:
  - research-agent
  - pm-agent
  - architect-agent
description: >-
  Fire when Storm has a pile of qualitative or quantitative input that needs
  to be turned into structured findings — customer interviews from
  manufacturing-SaaS prospects, support tickets across the OneCAPA / OneLPA /
  OnePPAP / PFMEASuite portfolio, podcast listener feedback, fantasy-sports /
  MLB performance patterns to extract from a season's data, survey results,
  competitor reviews. Trigger phrases: "synthesize", "what are the themes",
  "make sense of this feedback", "thematic analysis", "affinity mapping",
  "what do users think", "patterns in", "interview synthesis", "research roundup".
---

# Skill: Synthesize Research

## Purpose

Synthesis is the move from raw input (transcripts, tickets, survey rows,
game data) to structured findings (themes, frequencies, evidence-backed
recommendations). Without synthesis, research is just a pile of notes
nobody acts on — and the bigger the pile, the more it gets ignored.

The mental model: every observation is coded, codes cluster into themes,
themes get scored on **frequency × impact**, and the top themes become
findings. Each finding is one sentence with supporting evidence and a
confidence level. The output is small (5–8 findings), prioritized, and
actionable.

For Storm's portfolio, this skill applies across very different input types:
manufacturing-SaaS customer interviews (a few deep conversations with
quality managers), podcast listener feedback (lots of short comments),
fantasy / MLB analytics (large-N quantitative data with qualitative outliers
worth investigating). The methodology is the same; the input shape changes.

## When to Use

- After running customer interviews — turn 5+ hours of conversation into a finding set
- Reviewing 6 months of support tickets — what patterns are we missing?
- Quarterly listener / reader / user feedback round-up
- Post-season fantasy / MLB analysis — what worked, what didn't, what to change
- Competitor review-site mining (G2, Capterra) — what do their users complain about
- A pile of survey responses needs to be more than just averages

## Mental Model

> Don't force the data into a predetermined narrative. Code first, theme
> second, prioritize third. The most common synthesis failure is starting
> with a hypothesis and reading the data to confirm it — confirmation bias
> wearing a research-method hat.

Three commitments:

1. **Frequency × Impact**, not just frequency. A pain point mentioned by
   2 of 8 interviewees can be more important than one mentioned by 7 if
   the 2 are paying customers and the 7 are casual lookers.
2. **Evidence is verbatim quotes**, not paraphrases. Quotes preserve the
   user's actual words; paraphrases launder them through your interpretation.
3. **Confidence is explicit**. A finding from 2 interviews is a hypothesis,
   not a conclusion. Label it.

## Approach

### Familiarize before coding

Read everything once before tagging anything. The first pass is for shape;
the second pass is for codes. Mixing the two produces a fragmented map.

### Code generously, theme conservatively

It's easier to merge codes later than to split them. When in doubt during
coding, add a code. When in doubt during theming, *don't* create a theme
— wait for evidence to accumulate.

### Behaviors over stated preferences

What people *do* is stronger evidence than what they *say*. If a user
says "I want feature X" but their workflow shows they never use similar
features, the contradiction is the finding. (For analytics work, this
becomes "what the data shows" over "what the narrative claims" — a 2014
hot streak doesn't make someone elite.)

### Triangulate

A finding supported by interviews + survey + product analytics is much
stronger than one supported by interviews alone. Where sources disagree,
that's interesting — it usually reveals distinct user segments.

### Score with frequency × impact, then write findings

Every theme gets two scores: how often it appeared, and how severe it was
when it did. The intersection tells you which themes are findings vs.
noise.

## Reference

### Synthesis workflow

```
1. Familiarize    — read all input once, no tagging
2. Code           — second pass, descriptive tags per observation
3. Cluster        — group codes into candidate themes
4. Theme review   — does each theme have ≥3 supporting observations? Are themes distinct?
5. Score          — frequency × impact for each theme
6. Findings       — write the top 5–8 as one-sentence statements with evidence
7. Implications   — what should change as a result?
```

### Frequency × Impact priority matrix

| | Low impact | High impact |
|---|---|---|
| **High frequency** | Quality-of-life — note, deprioritize | **Top priority** — most leverage |
| **Low frequency** | Note but skip | **Important for specific segments** — investigate |

### Finding template

```markdown
## Finding [N]: [One-sentence statement]
**Evidence:**
- [Quote 1] — [Source attribution: e.g., "Quality manager, mid-size auto Tier 1"]
- [Quote 2] — [Source attribution]
- [Behavioral data point] — [Source]
**Frequency:** [N of M sources mention this]
**Impact:** [Low / Medium / High — and why]
**Confidence:** [Low / Medium / High] — [Reason: sample size, triangulation, behavioral vs stated]
**Implication:** [What this suggests we should do]
```

### Synthesis output structure

```markdown
## Research Synthesis: [Topic]
**Date:** [YYYY-MM-DD]
**Methodology:** [Interviews (N), survey (N respondents), tickets (range), analytics (period)]
**Research question:** [What we set out to learn]
**Decisions this informs:** [What changes based on this synthesis]

### Top findings (ranked by frequency × impact)
[5–8 finding entries]

### User segments / personas (if revealed)
[Behavioral clusters with distinguishing characteristics]

### Opportunity areas
[Unmet needs, underserved jobs-to-be-done, gaps in current solutions]

### Recommendations
[Specific actionable next steps tied to specific findings]

### Open questions
[What this research did NOT answer; suggested follow-up methods]

### Sources
[Anonymized list of sources with dates]
```

### Interview-note extraction (per interview)

For each interview, capture:

- **Observations** — what they did, said, experienced (concrete, behavioral)
- **Verbatim quotes** — vivid, specific, attributable to participant type (not name)
- **Pain points** — frustrations, workarounds, unmet needs
- **Positive signals** — moments of delight, "aha" moments
- **Stated vs revealed preferences** — flag contradictions
- **Context** — segment, use case, experience level

### Persona template (if behavioral clusters emerge)

```markdown
## [Persona Name] — [One-line description]
**Who they are:** [Role, company type/size, experience]
**Trying to accomplish:** [Primary goals, jobs-to-be-done]
**How they use the product:** [Frequency, depth, key workflows]
**Top pain points:** [Top 3 unmet needs or frustrations]
**What they value:** [What makes them switch / churn]
**Representative quotes:**
- "[Verbatim]"
- "[Verbatim]"
```

3–5 personas is the sweet spot. More than that = not actionable.

### Domain-specific synthesis notes

**Manufacturing SaaS interviews (low N, deep)**
- 5–8 interviews is enough for theme saturation if segments are tight
- Pay heavy attention to workarounds — they reveal product gaps
- Ask "show me how you do this today" — observed behavior > stated preference

**Podcast / content audience feedback (high N, shallow)**
- Short comments need volume; aim for 100+ before drawing conclusions
- Code by emotional valence (positive / negative / suggestion / question)
- Watch for *what listeners didn't bring up* — silence on a feature you thought was important is a finding

**Fantasy / MLB analytics patterns (large-N quantitative + qualitative outliers)**
- Start with the data, then investigate the outliers qualitatively
- "Why did this player overperform projections by 40%?" deserves a deep-dive note
- Distinguish noise (one-season variance) from signal (multi-year trend)
- Triangulate: stat-based projection + scout reports + injury history

## Gotchas

- _No gotchas documented yet. Add entries when something goes wrong in practice._

## Anti-Patterns

- Forcing data into a predetermined narrative — confirmation bias kills synthesis
- Treating quotes as findings — quotes are evidence, findings are interpretation
- Reporting averages without distributions — a 3.5/5 NPS could be lukewarm everyone or polarized halves
- Counting frequency without weighting impact — 7 lookers ≠ 2 paying customers
- Demographic personas (age, location) instead of behavioral ones — behavior predicts product needs
- Making personas without distinguishing them — if two personas behave the same, they're one
- 20 weak findings instead of 7 strong ones — fewer, sharper findings drive action
- Recommendations too vague to act on — "improve onboarding" vs "add a progress indicator to step 3"
- No confidence labels — a finding from 2 interviews and a finding from 50 are not the same thing
- Skipping triangulation — single-source findings are hypotheses, not conclusions

## Related Skills

- `research-methodology` — upstream skill: how to gather the inputs this synthesizes
- `metrics-review` — quantitative analytics often complement qualitative synthesis
- `competitive-brief` — competitor review-mining uses the same synthesis methodology
- `roadmap-update` — synthesis recommendations feed the roadmap
