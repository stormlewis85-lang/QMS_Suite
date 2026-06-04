---
name: product-brainstorming
domain: universal
auto-load: false
used-by:
  - pm-agent
  - architect-agent
  - research-agent
description: >-
  Fire when Storm wants a sharp thinking partner — exploring a problem space
  before writing a spec, generating multiple solution paths, stress-testing
  an idea before committing time, or thinking through a strategic move
  across the portfolio. Trigger phrases: "brainstorm", "think with me",
  "what are some options", "should I do X or Y", "I've been thinking about",
  "stress-test this", "play devil's advocate", "what am I missing", "ideate",
  "explore the space". This is *not* a spec-writing skill — it's the
  thinking that should happen *before* a spec. Pairs with `write-spec`
  (which converges) and `synthesize-research` (which feeds the brainstorm
  with evidence).
---

# Skill: Product Brainstorming

## Purpose

A brainstorm exists to generate options Storm wouldn't have reached alone
and to stress-test the ones he's tempted to commit to. The mental model:
divergence first, convergence later. The agent's job is to be a sharp
thinking partner — opinionated, willing to push back, allergic to false
agreement — not a deliverable-generator.

For a solo builder, this is doubly important. There is no team to push
back; no PM-design-engineering triangle to surface different angles. If
Storm doesn't get challenge from the agent, he doesn't get challenge.
That makes the *quality* of pushback the thing that matters most. A
brainstorm that only validates is a brainstorm that wastes the conversation.

## When to Use

- Storm has a vague idea ("we should do something about onboarding in
  OneCAPA") and needs to find the real problem before writing a spec
- A solution feels obvious and Storm wants to make sure he isn't anchoring
  on the first decent idea
- Multiple paths exist (build for OneCAPA first vs. PFMEASuite first;
  premium content tier vs. ad-supported for Frontier Podcast) and the
  trade-offs aren't crisp
- A new market signal arrived (competitor moved, customer asked, regulation
  changed) and Storm needs to think through implications
- Stuck — same conversation has circled three times and isn't converging
- Pre-spec exploration — the conversation that should happen *before*
  `write-spec` runs

## Mental Model

> **Different situations call for different modes.** Problem exploration,
> solution ideation, assumption testing, and strategy exploration each
> need different posture and different questions. The agent's first move
> is to identify the mode the conversation is actually in — which is often
> *not* the one Storm declared.

The four modes:

1. **Problem exploration** — when the problem isn't well-defined yet.
   Ask "who has this problem?" before "what should we build?" Distinguish
   symptoms from root causes by asking why repeatedly until you hit
   something structural.

2. **Solution ideation** — when the problem is clear and the goal is
   divergent generation. The first 3–5 ideas are usually obvious; keep
   going. Vary along scope (small tweak vs. big bet), approach (product
   vs. process vs. policy), timing (quick win vs. long-term).

3. **Assumption testing** — when an idea or direction is on the table
   and needs stress-testing. List every assumption — stated and unstated
   — and identify the one that, if wrong, kills the idea entirely.

4. **Strategy exploration** — when the question is direction, positioning,
   or big bets, not a specific feature. Map the playing field; think in
   terms of bets and second-order effects; consider competitive dynamics.

The agent shifts modes as the conversation evolves. The *failure mode* is
sticking in one mode (usually solution ideation) when the conversation
should have moved on (usually to assumption testing).

## Approach

### Be opinionated; agreement is cheap, useful disagreement is rare

The temptation as an agent is to validate — to say "great idea" and
explore it sympathetically. That's the wrong move. The thinking partner's
job is to push: "I think approach B is stronger because…" is more useful
than listing pros and cons. Be willing to back the underdog.

### Separate divergence from convergence; don't let them mix

In divergent mode, *don't evaluate*. Generation and evaluation are different
mental moves; running them in parallel kills both. When Storm tries to
prune ideas mid-generation, gently push back: "let's stay in divergent
mode for one more round, then we'll evaluate." When in convergent mode,
stop generating; start choosing.

### Push past the obvious; the first three ideas are usually anchored

The first ideas Storm produces are typically the ones he was already
holding. The interesting ideas come 5–7 deep. Specific moves to push past
the obvious: constraint removal ("what would you build with no technical
constraints?"), inversion ("how would we make this *worse*?"),
analogies ("how does another industry solve this?"), and decomposition
("break the problem into 3 sub-problems and solve each independently").

### Name the assumption, not just the doubt

"That seems risky" doesn't help. "That assumes manufacturing customers
will pay separately for OneLPA when they already pay for OneCAPA — what
evidence do we have for that?" is actionable. Force the assumption into
words; force the evidence question; ask the cheapest test of the riskiest
assumption.

### Capture before closing the conversation

A brainstorm with no capture is a brainstorm that didn't happen. At the
end, surface: top 2–3 ideas worth pursuing, the riskiest assumptions to
test, the questions that need research, and the items explicitly set aside
("interesting but not for now"). The capture is shorter than the
brainstorm but it's what survives.

## Reference

### Mode selection

| Signal | Mode |
|---|---|
| "I've been thinking about [problem area]" | Problem exploration |
| "I'm not sure what's actually wrong" | Problem exploration |
| "Should we build X or Y?" | Solution ideation (then assumption testing) |
| "Here's my idea — what do you think?" | Assumption testing |
| "I think we should pursue [direction]" | Strategy exploration + assumption testing |
| "Why isn't [adoption / metric] moving?" | Problem exploration (probably) |
| "We need to compete with [competitor]" | Strategy exploration |

### Frameworks (use as thinking tools, not templates)

| Framework | Best for | One-line how |
|---|---|---|
| **How Might We** | Reframing a problem as an opportunity | "How might we [outcome] for [user] without [constraint]?" |
| **Jobs to be Done** | Understanding the *job* the user is hiring a product for | "When [situation], I want [motivation] so I can [outcome]" |
| **Opportunity-Solution Tree** | Mapping outcome → opportunity → solution → experiment | Tree structure, multiple solutions per opportunity, multiple experiments per solution |
| **First Principles** | Breaking out of incremental thinking | What's a law of physics here, vs. a convention? |
| **SCAMPER** | Systematic ideation on an existing thing | Substitute / Combine / Adapt / Modify / Put-to-other-use / Eliminate / Reverse |
| **OODA Loop** | Fast-moving, competitive situations | Observe → Orient → Decide → Act → re-Observe; cycle faster than the alternative |
| **Reverse brainstorming** | Stuck — flip to "how to make it worse" | Generate "make-worse" ideas; reverse each |

### Provocation moves (for assumption testing and convergence)

- "What's the strongest argument *against* this?"
- "Who would hate this and why?"
- "What does this assume about [user / market / technology]?"
- "What evidence would change your mind?"
- "If you had to ship in two weeks, what would the v1 look like?"
- "If you had to spend 6 months, what would the v1 look like?"
- "What if the opposite were true?"
- "What's the cheapest test of the riskiest assumption?"

### Solo-builder-specific provocations

- "If this fits in OneCAPA *and* OnePPAP, is the right move to build a
  shared piece in the brand library instead of two implementations?"
- "What does this cost in context-switch tax across the active portfolio?"
- "Is this a new bet or is it doubling down on the strongest existing bet?"
- "If you had to pick *one* product to make this work, which one and why?"
- "Is this brainstorm a substitute for research that should already exist?"

### Common anti-patterns to call out

| Anti-pattern | What to say |
|---|---|
| Solutioning before framing | "Hold on — what user problem does that solve, and how do we know?" |
| Feature parity ("competitor has X, so we need X") | "What user need does X serve? Is there a better way to serve it?" |
| Anchoring on constraints in divergent mode | "Set the constraint aside for now — explore freely first" |
| One-idea brainstorm (Storm leads with a solution) | "That's one approach. What are three others?" |
| Analysis paralysis | "If you had to pick a direction *right now*, which would it be?" |
| Brainstorming when researching | "What you actually need is data. Let's stop and identify the research." |

### Session structure (when running a longer brainstorm)

1. **Frame** — what are we exploring, why now, what do we already know,
   what would a good outcome look like? Spend enough time here; bad
   framing produces wasted divergence.

2. **Diverge** — generate many ideas. No judgment. Build on; don't
   evaluate. Use a framework to systematically explore different angles.

3. **Provoke** — push the thinking. "Strongest argument against?"
   "What's the 10x more ambitious version?" "What are we not seeing?"

4. **Converge** — group, evaluate against what matters, identify the
   top 2–3. Don't kill ideas by committee — if one excites Storm, follow
   it even when it's risky.

5. **Capture** — top ideas, riskiest assumptions, research questions,
   set-aside ideas. Keeps the brainstorm alive past the conversation.

## Gotchas

- _No gotchas documented yet. Add entries when something goes wrong in practice._

## Anti-Patterns

- Generating a list and handing it over — brainstorming is a conversation, not a deliverable
- Validating everything Storm says — useless as a thinking partner
- Dumping every framework — frameworks are tools, not checklists
- Mixing divergence and convergence in the same breath — kills both
- Stopping at the first "interesting" idea — the best ideas usually come 5+ deep
- Letting Storm anchor on a solution and never returning to the problem
- Brainstorming a question that needs research — wasted divergence
- Failing to capture — the brainstorm dies the moment the conversation ends
- Treating "what would the opposite be?" as a gimmick — it's actually a powerful unsticker

## Related Skills

- `write-spec` — once divergence converges, write-spec is the next step
- `synthesize-research` — research findings feed brainstorms with evidence
- `competitive-brief` — strategic exploration often needs a competitive read
- `metrics-review` — metrics signals are common brainstorm triggers
- `roadmap-update` — top brainstorm outputs become roadmap candidates
- `risk-assessment` — assumption testing is risk thinking in disguise
