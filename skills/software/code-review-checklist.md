---
name: code-review-checklist
description: Review criteria for QA Agent when evaluating code for correctness, security, and maintainability.
domain: software
auto-load: true
used-by:
  - qa-agent
  - architect-agent
  - security-agent
---

# Skill: Code Review Checklist

## Purpose
Provide QA Agent with a systematic checklist for reviewing code. Ensures reviews are consistent, thorough, and catch real issues — not just style nitpicks.

## When to Use
- When QA Agent receives code for review from Developer or Test Agent
- When Architect Agent reviews structural changes
- When Security Agent performs security-focused review
- During PR review before merge

## Procedure

### 1. Understand the Change
- Read the PR description and linked task/issue.
- Understand the intent — what problem is being solved?
- Check if DECISIONS.md was updated for architectural changes.

### 2. Run the Checklist
Work through each section below. Flag issues with severity:
- **Blocker:** Must fix before merge.
- **Warning:** Should fix, but not a merge blocker.
- **Nit:** Style preference, take it or leave it.

### 3. Provide Feedback
- Lead with what's good — acknowledge solid work.
- Be specific about issues — include file, line, and what's wrong.
- Suggest fixes, don't just point out problems.
- Ask questions when intent is unclear — don't assume it's wrong.

## Reference

### Correctness
- [ ] Does the code do what the task/PR description says it should?
- [ ] Are edge cases handled (null, empty, boundary values)?
- [ ] Are error paths handled gracefully (not swallowed or ignored)?
- [ ] Does it break any existing functionality? (check test results)

### Security
- [ ] No hardcoded secrets, tokens, or credentials
- [ ] User input is validated and sanitized
- [ ] SQL queries are parameterized (no string concatenation)
- [ ] Auth checks are in place for protected routes/operations
- [ ] Dependencies are from trusted sources with no known vulnerabilities

### Performance
- [ ] No obvious N+1 queries or unnecessary loops
- [ ] Large data sets are paginated or streamed
- [ ] Expensive operations are not in hot paths without caching
- [ ] No synchronous blocking calls where async is available

### Maintainability
- [ ] Code follows existing PATTERNS.md conventions
- [ ] Names are clear and self-documenting
- [ ] No unnecessary complexity or over-engineering
- [ ] No dead code, unused imports, or commented-out blocks
- [ ] Changes are minimal — no scope creep beyond the task

### Tests
- [ ] New/changed code has corresponding tests
- [ ] Tests cover both happy path and error cases
- [ ] Tests are readable and maintainable
- [ ] No flaky tests introduced

## Anti-Patterns
- Reviewing only for style while missing logic bugs.
- Rubber-stamping with "LGTM" without actually reading the code.
- Blocking on subjective preferences — save nits for low-severity comments.
- Reviewing in isolation — check how the change fits the broader system.
- Forgetting to check test coverage and quality.

## Gotchas

- Diffs over ~400 lines get rubber-stamped because reviewers skim. If the diff is large, ask the author to split it before reviewing — or review in sessions of ~200 lines with explicit notes between sessions.
- "Looks fine" comments on complex logic usually mean the reviewer didn't trace the code path. If you can't articulate what a function does after reading it, say so and ask for a doc comment or a worked example.
- Style nits crowd out substantive feedback. Separate P0 (blocks merge) from P3 (nice to have) so the author knows what's actually required.
- Tests passing doesn't mean tests are adequate. Check that new code paths are actually exercised — coverage % is not the same as coverage quality.
