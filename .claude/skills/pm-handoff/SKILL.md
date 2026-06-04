---
name: pm-handoff
description: |
  ALWAYS load when delegating work to a subagent. Use before every @explore, @developer,
  @test, @qa, @architect, or any other subagent spawn. Forces structured handoff format
  that prevents vague delegation and token blowout. Do NOT skip this for any delegation.
---

# PM Handoff Protocol

When spawning ANY subagent, your delegation prompt MUST include ALL of these fields. Do not delegate without them.

## Required Handoff Fields

```
TASK: [one-line description]
SCOPE: Quick | Standard | Deep
FILES TO READ: [exact paths — max 5 for Quick, max 10 for Standard]
FILES TO CREATE/MODIFY: [exact paths]
PATTERN TO FOLLOW: [exact file to match, if applicable]
ACCEPTANCE CRITERIA: [what "done" looks like — testable, not vague]
DO NOT: [explicit boundaries — what to avoid, where not to explore]
```

## Agent-Specific Constraints

### @explore
- Cap at 5 files for Quick, 10 for Standard.
- MUST specify which files to read and what question to answer.
- NEVER say "explore the codebase."

### @architect
- Receives the specific design question and relevant prior decisions from DECISIONS.md.
- Cap at 3-5 files to review. No codebase exploration.
- Returns a decision, not a research report.

### @developer
- Receives ONLY the files to create/modify and the pattern to follow.
- Cap at the files listed. No scope creep. No exploration.
- If the task has more than 10 files, split into parallel batches of 5-7 with EXACT file lists per batch.

### @test
- Receives ONLY: the source file being tested, the test directory, and one existing test file as pattern.
- 3 files max in FILES TO READ. No codebase exploration.
- NEVER hand off "write tests for this feature" — hand off "write tests for src/lib/format-date.ts following the pattern in tests/unit/format-id.test.ts."

### @qa
- Receives ONLY: the list of changed files and the acceptance criteria.
- QA does NOT explore. QA reads the diff and the acceptance criteria, then verdicts.
- For refactors: include the grep/search command that proves completion (e.g., "run grep -r toLocaleDateString src/ — expect zero results").
- Cap at changed files only. If 20 files changed, QA reads 20 files. QA does NOT read unchanged files for context.

## Examples

### Good handoff (to @developer):
```
TASK: Add zero-padded CAPA ID formatter
SCOPE: Quick
FILES TO READ: src/lib/format-id.ts (existing pattern)
FILES TO CREATE/MODIFY: src/lib/format-capa-id.ts
PATTERN TO FOLLOW: src/lib/format-id.ts
ACCEPTANCE CRITERIA: formatCapaId(42) returns "CAPA-0042", handles null/undefined with "—"
DO NOT: modify any existing files, explore beyond src/lib/
```

### Good handoff (to @test):
```
TASK: Write unit tests for format-date.ts
SCOPE: Quick
FILES TO READ: src/lib/format-date.ts, tests/unit/format-id.test.ts (pattern)
FILES TO CREATE/MODIFY: tests/unit/format-date.test.ts
PATTERN TO FOLLOW: tests/unit/format-id.test.ts
ACCEPTANCE CRITERIA: Cover null/undefined, invalid input, each format function, edge cases
DO NOT: read any files outside src/lib/ and tests/unit/, do not modify source code
```

### Good handoff (to @qa):
```
TASK: Review T-022 toLocaleDateString refactor
SCOPE: Standard
FILES TO READ: [list of 20 changed files]
ACCEPTANCE CRITERIA: zero toLocaleDateString() in src/, all replacements use formatDate/formatDateTime/formatShortDate, npm run build passes
GATE CHECK: run "grep -r toLocaleDateString src/" — must return empty
DO NOT: explore files that were not changed, do not review architecture or style — correctness only
```

### Bad handoff (causes 87k token QA burn):
```
Review the date utility refactor across the codebase. Make sure everything looks right.
```
