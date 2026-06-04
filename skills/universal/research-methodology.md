---
name: research-methodology
description: How to gather, evaluate, verify, and document research findings across any domain.
domain: universal
auto-load: true
used-by:
  - research-agent
  - architect-agent
  - pm-agent
---

# Skill: Research Methodology

## Purpose
Provide a consistent framework for how agents investigate topics, evaluate sources, and document findings. Ensures research is thorough, verifiable, and reusable across sessions.

## When to Use
- When PM assigns a research task
- When any agent encounters an unknown and needs to investigate before proceeding
- Before making architectural or strategic decisions that depend on external information
- When validating assumptions or claims

## Procedure

### 1. Define the Question
- State the research question in one sentence.
- Identify what a good answer looks like — what would make this "done"?
- Set scope boundaries — what's in scope and what's explicitly out.

### 2. Gather Sources
- Search the codebase and project files for prior art.
- Check RESEARCH.md for previous findings on this or related topics.
- Use web search for external information when needed.
- Prioritize primary sources over secondary commentary.

### 3. Evaluate What You Find
- **Relevance:** Does this directly answer the research question?
- **Recency:** Is this current or outdated?
- **Authority:** Is the source credible for this topic?
- **Consistency:** Do multiple sources agree, or is there conflict?
- Flag uncertainty explicitly — never present disputed findings as settled.

### 4. Synthesize Findings
- Lead with the answer or recommendation.
- Present options with tradeoffs when multiple valid approaches exist.
- Include supporting evidence — not just conclusions.
- Note what you didn't find or couldn't verify.

### 5. Document in RESEARCH.md
- Add a dated entry with the research question, findings, and sources.
- Tag with relevant domain and topic for future searchability.
- If findings inform a decision, cross-reference DECISIONS.md.

## Reference

### Research Entry Template
```markdown
### [Topic] — [Date]
**Question:** [What were we trying to find out?]
**Findings:** [What did we learn?]
**Sources:** [Where did we learn it?]
**Recommendation:** [What do we suggest based on findings?]
**Uncertainty:** [What remains unverified or disputed?]
```

### Depth by Tier
- **Quick:** One search pass, summarize top findings, 2-3 sentences.
- **Standard:** Multiple sources, compare options, document in RESEARCH.md.
- **Deep:** Comprehensive landscape analysis, detailed tradeoff matrix, full documentation.

## Anti-Patterns
- Presenting opinions as findings — always cite sources.
- Stopping at the first result — cross-reference with at least one other source.
- Writing a research essay when a Quick-tier summary was requested.
- Forgetting to document — undocumented research will be repeated next session.
- Making the decision — Research presents options, Architect or PM decides.
