---
name: skill-routing-engine
domain: universal
auto-load: false
used-by:
  - pm-agent
description: >
  Prompt analysis for automatic skill activation, keyword matching, domain-aware
  routing, and UserPromptSubmit hook patterns for intelligent skill loading. Triggers:
  "skill routing", "auto-activate skill", "skill matching", "prompt analysis",
  "which skill applies", "skill dispatch", "UserPromptSubmit hook".
---

# Skill: Skill Routing Engine

## When to Apply
- When PM Agent receives a new request and needs to determine which skills to load
- When designing UserPromptSubmit hooks for automatic skill activation
- When evaluating whether existing skill routing is catching the right triggers
- When adding new skills and defining their trigger patterns
- When debugging why a skill was or wasn't activated for a task

## Core Framework

### 1. Routing Logic
When a prompt arrives, match it against skill triggers in this order:

1. **Domain filter:** Only consider skills tagged with the active domain + universal skills.
2. **Auto-loaded skills:** These are always active — no routing needed.
3. **Keyword matching:** Check prompt against each available skill's trigger phrases.
4. **Context matching:** Check if the current task or context implies a skill is needed.
5. **Explicit invocation:** User or agent explicitly requests a skill by name.

### 2. Trigger Pattern Design
Each skill defines trigger phrases in its frontmatter description. Good triggers are:

| Quality | Good Trigger | Bad Trigger |
|---|---|---|
| Specific | "trade valuation", "surplus value" | "help", "do something" |
| Action-oriented | "audit dependencies", "review security" | "dependencies", "security" |
| Domain-scoped | "episode structure" (content) | Generic terms that match everywhere |
| Multi-form | "TDD", "test-driven", "red green refactor" | Only one phrasing |

### 3. Routing Decision Matrix

| Signal | Confidence | Action |
|---|---|---|
| Exact trigger match | High | Activate skill |
| Partial trigger match + domain match | Medium | Activate skill, note partial match |
| Context implies skill (no keyword match) | Low | Suggest skill to PM, don't auto-activate |
| Multiple skills match | — | Load all matching, let agent choose which to consult |
| No skills match | — | Proceed without skill, flag if task seems skill-worthy |

### 4. UserPromptSubmit Hook Pattern
For automatic skill routing via hooks:

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "prompt",
            "prompt": "Analyze this user prompt and determine which skills from the skill library should be activated. Check the prompt against skill trigger phrases. Return a JSON list of skill names to activate, or empty list if none match. Prompt: $ARGUMENTS"
          }
        ]
      }
    ]
  }
}
```

**Considerations:**
- Hook adds latency — only use if the skill library is large enough to benefit.
- For small libraries (< 20 skills), manual routing by PM is faster.
- For large libraries (20+ skills), automated routing prevents PM from missing relevant skills.

### 5. Routing Effectiveness Audit
Periodically evaluate routing quality:
- **False positives:** Skills activated that weren't needed. Tighten trigger phrases.
- **False negatives:** Skills not activated that should have been. Add trigger phrases.
- **Prompt coverage:** What % of prompts match at least one skill? (Target: 60-80% for domain-specific work)

## Output Format

```markdown
## Skill Routing — [Prompt Summary]

### Domain: [Active domain]
### Prompt Keywords: [Extracted keywords]

### Matched Skills
| Skill | Confidence | Trigger Matched | Action |
|---|---|---|---|
| [skill-name] | [High/Med/Low] | [Trigger phrase] | [Activate/Suggest] |

### No Match
[If no skills matched, note whether this is expected or a gap]

### Routing Notes
- [Any context that influenced routing beyond keyword matching]
```

## Integration with Other Skills
- **context-budget**: Skill activation affects context budget — each activated skill costs tokens.
- **context-management**: Skill routing happens during the context loading phase of session start.
- **spec-driven-development**: Spec requirements may trigger skill loading for the execution phase.
- **error-pattern-analysis**: If errors correlate with missing skill activation, add triggers.
