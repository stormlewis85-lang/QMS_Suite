---
name: competitive-brief
domain: universal
auto-load: false
used-by:
  - research-agent
  - pm-agent
  - architect-agent
description: >-
  Fire when Storm needs to size up a competitor, a competitive set, or a
  feature area against the market. Applies across the portfolio — manufacturing
  SaaS competitors (Plex, ETQ, MasterControl, Intelex, AssurX), content
  competitors (other whiskey podcasts and review sites), and analytics
  competitors (FantasyPros, Dynasty Process, MLB analytics tools). Trigger
  phrases: "competitive analysis", "how do they do X", "compare us to",
  "what's [competitor] doing", "where should we differentiate", "competitive
  brief", "battle card", "positioning analysis".
---

# Skill: Competitive Brief

## Purpose

A competitive brief is an honest, evidence-based assessment of where a
product sits relative to alternatives — what real users actually buy
*instead of* this product, and why. The output is not a feature checklist;
it is a strategic map that informs build/differentiate/parity decisions.

The mental model: customers compare products on a small number of axes
that *they* care about, not the axes a builder cares about. The job of a
competitive brief is to identify those buyer-relevant axes, place the
competitive set on them honestly, and surface the gaps and opportunities
that should drive product strategy.

For Storm: this skill spans three very different domains. Manufacturing-SaaS
competitors are large enterprise tools with feature breadth; the angle is
"smaller, sharper, faster." Content competitors compete on taste and
distribution. Analytics competitors compete on accuracy, freshness, and
the sharpness of the take. The methodology is the same; the buyer-relevant
axes change.

## When to Use

- Before committing to a build/buy/parity decision on a feature competitors handle differently
- A prospect mentions a specific competitor they're also evaluating
- Quarterly portfolio review — has the competitive landscape shifted enough to require a strategic response?
- New domain entry (new SaaS product, new podcast topic, new analytics vertical)
- Storm asks "are we still the better choice for [use case]?" — the answer needs evidence, not gut

## Mental Model

> A competitive brief has four moves: **define the set**, **find the buyer-relevant
> axes**, **place competitors honestly**, **derive strategic implications**.
> Skipping any of them produces marketing fluff. Skipping the last one
> produces a research report nobody acts on.

The competitive set is rarely just direct competitors. It includes:
**direct** (same problem, same approach), **indirect** (same problem, different
approach), **adjacent** (could expand into the space), and **substitutes**
(non-consumption, manual processes, "just use Excel"). For a manufacturing
SaaS, the substitute is often the customer's existing tribal-knowledge
spreadsheet — and that is the real competitor for most deals.

## Approach

### Define the set wider than feels comfortable

If the competitive set has only direct competitors, it's incomplete. Manufacturing
SaaS prospects compare against Excel, ETQ, Plex, *and* hiring a quality
consultant. Whiskey podcast listeners compare against other podcasts, YouTube
channels, written reviews, and "just buy a bottle." Include all of them.

### Pick buyer-relevant axes, not seller-relevant ones

Buyers in manufacturing care about: time-to-implement, audit-readiness,
training cost, integration with their ERP. They do not care about: tech
stack elegance, microservices architecture, development velocity. Sellers
who lead with the latter lose on the former.

### Score honestly — competitor strengths are not threats to suppress

A competitive brief that always shows you winning is useless. Find the
axes where competitors are genuinely better and write them down. Those are
either differentiation opportunities (build something they can't follow on)
or parity gaps to close.

### End with the "so what"

Every section produces an implication. Group implications into:
**differentiate** (lean in, make this unmistakably yours), **achieve parity**
(close the gap fast), **monitor** (watch but don't act), **ignore** (explicitly
decide this isn't relevant). Without the "so what", the brief is a research
artifact, not a strategic input.

## Reference

### Competitive set categories

| Category | Definition | Example (manufacturing SaaS) |
|---|---|---|
| Direct | Same problem, same approach, same buyer | ETQ Reliance, MasterControl, Intelex |
| Indirect | Same problem, different approach | A consultant who runs the CAPA process for them |
| Adjacent | Different problem today, could expand | Plex (ERP that's adding quality modules) |
| Substitute | Non-consumption / manual workaround | The customer's existing Excel + email workflow |

### Feature comparison matrix

```markdown
| Capability | OneCAPA | ETQ Reliance | MasterControl | Excel workflow |
|---|---|---|---|---|
| **CAPA workflow** | Strong | Strong | Strong | Weak |
| - 8D structure | Strong | Adequate | Strong | Absent |
| - Containment tracking | Strong | Adequate | Strong | Absent |
| **Audit-trail integrity** | Strong | Strong | Strong | Absent |
| **Time to implement** | Strong (weeks) | Weak (months) | Weak (months) | Strong (already there) |
| **Training cost** | Strong (low) | Weak (high) | Weak (high) | Strong (zero) |
| **ERP integration** | Adequate | Strong | Strong | Adequate |
```

**Rating scale:**
- **Strong** — Best-in-class for this axis, customers praise it
- **Adequate** — Functional, gets the job done, no differentiation
- **Weak** — Exists but limited, gaps or poor execution
- **Absent** — Capability not present

### Positioning statement extraction

For each competitor, fill in:

> For [target customer] who [need/problem], [Product] is a [category] that
> [key benefit]. Unlike [alternative], [Product] [key differentiator].

Sources: homepage hero, app store description, sales-deck headlines,
analyst report quotes, earnings-call language (public), job postings
(strategic-intent signal).

### Win/loss reason patterns

Common reasons in solo-builder SaaS deals:

- **Feature gap** — competitor has a specific capability that's a dealbreaker
- **Integration advantage** — competitor connects to a tool the buyer already uses
- **Pricing structure mismatch** — not always cheaper, often a different model fits the buyer better
- **Incumbent inertia** — buyer stays on what they have because switching cost feels high
- **Trust/safety signal** — buyer chooses a larger, "safer" vendor for risk-aversion reasons
- **Sales execution** — better demo, faster response, more relevant case study

### Strategic implications template

For each finding, classify the response:

| Implication type | When to use | Action |
|---|---|---|
| Differentiate | Competitor cannot easily follow | Lean in, make this signature |
| Parity | Buyer-relevant axis we're losing on | Close the gap fast |
| Monitor | Competitor making a bet we disagree with | Watch, don't react |
| Ignore | Not relevant to our buyer / strategy | Explicitly decide and move on |

### Output structure

```markdown
## Competitive Brief: [Subject]
**Date:** [YYYY-MM-DD] (briefs go stale fast)
**Prepared by:** [Storm | Agent]
**Decision this informs:** [Specific decision — what changes based on this brief]

### Executive summary
[3 sentences. Who's in the set, where we sit, top strategic implication.]

### Competitive set
[Direct / Indirect / Adjacent / Substitute table]

### Capability comparison
[Feature matrix]

### Positioning analysis
[Each competitor's positioning statement, distilled]

### Strengths and gaps (honest)
**Where we're strong:** [Evidence-backed]
**Where competitors are stronger:** [Evidence-backed — name them, do not soften]

### Strategic implications
**Differentiate:** [What to lean into]
**Parity:** [What to close]
**Monitor:** [What to watch]
**Ignore:** [What to explicitly drop]

### Sources
[Links, dates, quotes]
```

## Gotchas

- _No gotchas documented yet. Add entries when something goes wrong in practice._

## Anti-Patterns

- Defining the set as direct competitors only — substitutes (Excel, status quo) win most deals
- Comparing on seller-relevant axes — buyers don't care about your architecture
- Soft-pedaling competitor strengths to make the brief feel reassuring
- Skipping strategic implications — research without action is decoration
- Treating the brief as evergreen — pricing pages, feature lists, and positioning shift in months
- Cherry-picking review quotes — read the median review, not the best/worst
- Conflating "they have feature X" with "they do X well" — features exist on a spectrum

## Related Skills

- `synthesize-research` — competitive intel often comes from interviews and reviews; same synthesis methodology applies
- `metrics-review` — competitive performance metrics (G2 ratings, review velocity, share-of-voice)
- `roadmap-update` — strategic implications feed roadmap reprioritization
- `research-methodology` — sourcing rigor; cite, date, evaluate authority
