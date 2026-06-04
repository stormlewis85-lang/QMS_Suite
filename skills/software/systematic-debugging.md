---
name: systematic-debugging
domain: software
auto-load: false
used-by:
  - developer-agent
description: >
  Four-phase root cause methodology — investigate before fixing. Prevents shotgun
  debugging and ensures fixes address causes, not symptoms. Triggers: "debug", "bug",
  "broken", "not working", "error", "investigate", "root cause".
---

# Skill: Systematic Debugging

## When to Apply
- When a test fails unexpectedly
- When a user reports a bug
- When behavior doesn't match expectations
- When an error appears in logs or the quality-errors.log
- **Always before attempting a fix** — investigate first

## Core Framework

### Phase 1: Reproduce
1. **Get the exact reproduction steps.** If you can't reproduce it, you can't fix it.
2. Write the steps down — don't rely on memory.
3. Identify the expected vs. actual behavior precisely.
4. Determine if it's deterministic or intermittent.
5. If intermittent, identify conditions that increase frequency.

**Gate:** Do not proceed until you can reliably reproduce the issue.

### Phase 2: Isolate
1. **Narrow the scope.** Which file, function, or line produces the wrong behavior?
2. Use binary search — comment out half the code path, see if the bug persists.
3. Check recent changes — `git log` and `git diff` for what changed since it last worked.
4. Check inputs — is the function receiving what it expects?
5. Check assumptions — read the code, don't assume you know what it does.

**Techniques:**
- Add targeted logging at decision points (not everywhere).
- Use a debugger to step through the code path.
- Compare working vs. broken states — what's different?
- Check environment differences (dev vs. staging vs. prod).

### Phase 3: Diagnose
1. **State the root cause in one sentence.** If you can't, you haven't found it yet.
2. Distinguish root cause from symptom:
   - Symptom: "The page shows a 500 error."
   - Root cause: "The query joins on a nullable column without a NULL check, returning no rows."
3. Verify the diagnosis — does it explain ALL observed symptoms?
4. Check for secondary issues — did the root cause reveal other problems?

**Gate:** Do not proceed to fixing until you can explain the root cause clearly.

### Phase 4: Fix
1. Write a regression test that reproduces the bug (it should fail).
2. Apply the minimal fix that addresses the root cause.
3. Run the regression test — it should now pass.
4. Run the full test suite — no other tests should break.
5. Document what you found and fixed.

## Rubric: Quality of Debugging

| Signal | Good | Bad |
|---|---|---|
| Reproduction | Documented, reliable steps | "It just happens sometimes" |
| Isolation | Narrowed to specific cause | Shotgun changes across files |
| Diagnosis | One-sentence root cause | Vague "something with the data" |
| Fix | Minimal, targeted, tested | Large diff touching unrelated code |
| Prevention | Regression test added | Same bug can recur |

## Output Format

```markdown
## Bug Report — [Issue Title]

**Reproduction:** [Steps to reproduce]
**Expected:** [What should happen]
**Actual:** [What happens instead]

**Root Cause:** [One sentence explanation]
**Evidence:** [How you confirmed this is the cause]

**Fix:** [What was changed and why]
**Regression Test:** [Test name and what it verifies]
**Related Issues:** [Any secondary problems discovered]
```

## Integration with Other Skills
- **tdd-workflow**: Phase 4 (Fix) follows TDD — failing test first, then fix.
- **error-pattern-analysis**: Recurring bugs found here feed pattern analysis for governance improvements.
- **code-review-checklist**: QA checks that bug fixes include regression tests.
- **handoff-protocol**: Bug investigation results use Done/Open/Watch format when handing off.

## Gotchas

- The "reproduce it first" rule fails silently on non-deterministic bugs (timing, race conditions, concurrency). When a repro is hard, capture the failure *once* with maximum logging rather than chasing the bug interactively — you'll spend fewer tokens.
- Reading only the top of a stack trace misses the originating call. Read the full trace, then the first frame owned by project code — that's usually the culprit.
- Three fix attempts without a hypothesis is the tell for "you're guessing." The skill's `Investigate → Hypothesize → Fix → Verify` loop exists because guessing compounds into context rot faster than any other debugging anti-pattern.
- `console.log` debugging persists. Stash or branch before adding temporary logging so cleanup is one `git restore`, not a manual sweep.

