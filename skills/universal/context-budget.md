---
name: context-budget
domain: universal
auto-load: false
used-by:
  - pm-agent
description: >-
  Fire when PM plans which context files to load at session start, when a
  task's scope tier is being set, when the context window is approaching its
  limit, when planning a multi-agent pipeline that shares context, or when
  deciding what to persist to file vs. keep in memory. Trigger phrases:
  "context budget", "token limit", "context window", "compaction", "token
  estimation", "context overflow", "too much context", "we're running out of
  context", "what should each agent load".
---

# Skill: Context Budget

## When to Apply
- At session start when PM plans which context files to load
- When assigning scope tiers that determine context loading depth
- When approaching context window limits and compaction is needed
- When planning multi-agent pipelines that share context
- When deciding what to persist to files vs. keep in memory

## Core Framework

### 1. Context Budget Estimation

| Content Type | Approximate Tokens | Example |
|---|---|---|
| Short .md file (< 50 lines) | 200-500 | TASKS.md (light) |
| Medium .md file (50-200 lines) | 500-2,000 | DECISIONS.md, RESEARCH.md |
| Large .md file (200+ lines) | 2,000-5,000 | CONTEXT_MASTER.md, domain configs |
| Source code file (typical) | 500-3,000 | Depends on length |
| Agent definition | 800-1,500 | *-agent.md files |
| Skill file | 1,000-2,500 | skills/**/*.md |

**Rule of thumb:** 1 token per 4 characters of English text, 1 token per 3 characters of code.

### 2. Context Loading by Tier

| Tier | Budget Target | What to Load |
|---|---|---|
| **Quick** | < 3,000 tokens | TASKS.md + minimal context for the specific task |
| **Standard** | 5,000-15,000 tokens | Standard context chain (CLAUDE.md, CONTEXT_*, PATTERNS, TASKS) |
| **Deep** | 15,000-30,000 tokens | Full chain + RESEARCH.md + DECISIONS.md + relevant skills |
| **Autopilot** | 5,000-10,000 tokens | Task-specific context only, optimized for fresh context per iteration |

### 3. Compaction Triggers
Initiate context compaction when:
- Conversation exceeds 70% of available context window.
- Agent responses become less coherent or start losing earlier context.
- Multiple large files have been loaded that are no longer relevant.
- Switching to a new task that requires different context.

### 4. Compaction Strategy
- **Summarize, don't truncate.** Write key findings to state files before compacting.
- **Persist decisions.** Any decision made during the conversation goes to DECISIONS.md.
- **Persist research.** Any findings go to RESEARCH.md.
- **Update TASKS.md.** Current task state is saved before compaction.
- **Drop completed context.** Remove context from completed subtasks.

### 5. Multi-Agent Context Sharing
When multiple agents work on a task:
- Use state files (TASKS.md, DECISIONS.md) as the shared bus — not conversation context.
- Each agent loads only the context it needs for its role.
- Handoff protocol carries key decisions forward without full context replay.
- Worktree-isolated agents get their own context — no sharing overhead.

## Output Format

```markdown
## Context Budget — [Task/Session]

### Tier: [Quick/Standard/Deep/Autopilot]
### Budget: [N tokens estimated]

### Context Load Plan
| File | Est. Tokens | Required | Notes |
|---|---|---|---|
| CLAUDE.md | [N] | Always | Entry point |
| TASKS.md | [N] | Always | Current state |
| ... | ... | ... | ... |

### Total Estimated: [N tokens]
### Remaining for Conversation: [N tokens]

### Compaction Plan (if needed)
- Persist to: [Which state files]
- Drop: [Which loaded context is no longer needed]
```

## Integration with Other Skills
- **context-management**: Context budget governs HOW MUCH context to load; context management governs WHICH context.
- **session-persistence**: When budget forces compaction, session persistence ensures nothing is lost.
- **handoff-protocol**: Handoffs carry forward key context so receiving agents don't need full replay.
- **spec-driven-development**: Spec files serve as compact context artifacts that survive compaction.
