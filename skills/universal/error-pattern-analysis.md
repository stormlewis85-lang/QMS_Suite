---
name: error-pattern-analysis
domain: universal
auto-load: false
used-by:
  - pm-agent
description: >
  Analyze error logger data from quality-errors.log, detect recurring patterns, and
  recommend governance hooks or process improvements based on REAL data. Triggers:
  "error patterns", "quality errors", "error log analysis", "recurring errors",
  "governance hooks", "error trends", "quality report".
---

# Skill: Error Pattern Analysis

## When to Apply
- Periodically (weekly or per-sprint) to review accumulated error data
- When quality-errors.log grows beyond a threshold
- When PM notices recurring issues across tasks
- When deciding whether to add new PreToolUse/PostToolUse hooks
- When evaluating the effectiveness of existing governance hooks

## Core Framework

### 1. Data Collection
Read `.claude/logs/quality-errors.log` and parse entries:

Each entry contains:
```
--- [Timestamp] agent=[Session ID] ---
file: [File path]
[Error output]
```

Extract:
- **Timestamp** — when did this occur?
- **File** — which files trigger errors most?
- **Error type** — categorize (type error, syntax error, import error, test failure, etc.)
- **Agent session** — which workflows produce the most errors?
- **Frequency** — how often does each pattern recur?

### 2. Pattern Classification

| Pattern | Description | Governance Response |
|---|---|---|
| **Repeated same-file errors** | Same file fails repeatedly across sessions | File needs refactoring or is poorly understood |
| **Type errors after edits** | TypeScript/type errors introduced by edits | Consider PreToolUse type-check hook |
| **Import/module errors** | Missing imports or circular dependencies | Add import validation to PostToolUse |
| **Test regression** | Tests break after code changes | Strengthen test coverage requirement |
| **Config errors** | Environment or configuration mistakes | Add config validation hook |
| **Pattern violations** | Code doesn't follow PATTERNS.md | Add linting or pattern-check hook |

### 3. Trend Analysis
Look for patterns over time:
- **Increasing errors:** Something is degrading — investigate root cause.
- **Decreasing errors:** Governance is working — document what helped.
- **Clustered errors:** Errors spike around specific tasks or areas — targeted intervention needed.
- **Agent-correlated errors:** Certain agent workflows produce more errors — review agent prompts or skill gaps.

### 4. Governance Recommendations
Based on patterns, recommend one of:

| Intervention | When | Hook Type |
|---|---|---|
| **PreToolUse hook** | Prevent errors before they happen | Validates inputs before tool execution |
| **PostToolUse hook** | Catch errors immediately after they happen | Validates outputs after tool execution |
| **Skill update** | Agents lack knowledge to avoid the error | Add guidance to relevant skill |
| **Pattern addition** | Convention isn't documented | Add to PATTERNS.md |
| **Agent prompt update** | Agent behavior needs adjustment | Modify agent definition |

### 5. Effectiveness Tracking
After implementing a governance change:
- Monitor error rates for the targeted pattern.
- If errors decrease within 2 sprints, the intervention worked — document in DECISIONS.md.
- If errors persist, the intervention missed the root cause — investigate deeper.

## Output Format

```markdown
## Error Pattern Report — [Date Range]

### Summary
- Total errors analyzed: [N]
- Unique error types: [N]
- Most affected files: [Top 3]
- Most common error type: [Type]

### Top Patterns
| Rank | Pattern | Frequency | Severity | Trend |
|---|---|---|---|---|
| 1 | [Pattern] | [N occurrences] | [High/Med/Low] | [Rising/Stable/Falling] |
| 2 | ... | ... | ... | ... |

### Recommended Interventions
1. **[Intervention type]:** [Specific recommendation] — Targets pattern #[N]
   - Expected impact: [What should improve]
   - Implementation: [How to implement]
2. ...

### Effectiveness of Previous Interventions
| Intervention | Date Implemented | Target Pattern | Result |
|---|---|---|---|
| ... | ... | ... | [Effective/Ineffective/Too early to tell] |
```

## Integration with Other Skills
- **systematic-debugging**: Recurring error patterns may indicate systemic bugs worth debugging.
- **security-review**: Security-related errors in the log trigger security review.
- **performance-profiling**: Performance-related errors trigger profiling.
- **context-management**: Error analysis results are persisted in RESEARCH.md or DECISIONS.md.
