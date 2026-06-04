---
name: tdd-workflow
domain: software
auto-load: false
used-by:
  - developer-agent
description: >
  Red-Green-Refactor test-driven development workflow with subagent isolation for
  disciplined incremental development. Triggers: "TDD", "test first", "red green refactor",
  "write tests before code", "test-driven".
---

# Skill: TDD Workflow

## When to Apply
- When building new features where requirements are clear enough for test cases
- When fixing bugs — write the failing test first, then fix
- When PM or Architect specifies TDD as the development approach
- When working on logic-heavy code (calculations, state machines, parsers)
- When refactoring — tests provide the safety net

## Core Framework

### Phase 1: Red (Write a Failing Test)
1. Read the spec or acceptance criteria for the current task.
2. Write the simplest test that captures one requirement.
3. Run the test — **it must fail**. If it passes, the test isn't testing anything new.
4. Verify the failure message is clear and points to the right thing.

### Phase 2: Green (Make It Pass)
1. Write the **minimum code** to make the failing test pass.
2. Don't optimize, don't generalize, don't clean up — just make it green.
3. Run all tests — the new test passes, no existing tests break.
4. If existing tests break, fix the implementation before moving on.

### Phase 3: Refactor (Clean Up)
1. Now improve the code — extract functions, rename variables, simplify logic.
2. Run all tests after every refactor step — they must stay green.
3. Don't add new behavior during refactoring — that's a new Red phase.
4. Commit when the refactor is complete and all tests pass.

### Cycle
Repeat Red → Green → Refactor for each requirement or acceptance criterion. Each cycle should take 5-15 minutes. If a cycle takes longer, the step is too big — break it down.

### Subagent Isolation Pattern
When working in worktree isolation:
1. Developer Agent writes tests + implementation in the worktree.
2. Test Agent validates the test suite independently.
3. QA Agent reviews the final code + tests together.
4. Each agent works on an isolated copy — no conflicts.

## Rubric: Is This Good TDD?

| Signal | Yes | No |
|---|---|---|
| Tests written before code? | Each test fails before implementation | Tests written after implementation |
| Minimal implementation? | Only enough code to pass the test | Gold-plating, premature optimization |
| Refactoring separate? | Clean-up happens after green, not during | Mixing new behavior with refactoring |
| Small cycles? | 5-15 minutes per Red-Green-Refactor | Large steps, long feedback loops |
| Tests describe behavior? | Test names read like requirements | Test names describe implementation |

## Output Format

```markdown
## TDD Log — [Feature/Task]

### Cycle 1
- **Red:** [Test name] — [What it tests]
- **Green:** [What code was written to pass]
- **Refactor:** [What was cleaned up]

### Cycle 2
- **Red:** ...
- **Green:** ...
- **Refactor:** ...

### Final State
- Tests: [N passing, 0 failing]
- Coverage: [X%]
- Files changed: [List]
```

## Integration with Other Skills
- **testing-strategy**: TDD produces tests that align with the test pyramid — mostly unit, some integration.
- **systematic-debugging**: When a test unexpectedly fails, switch to debugging methodology before guessing.
- **git-workflow**: Commit after each completed Red-Green-Refactor cycle.
- **code-review-checklist**: QA verifies that tests were written first (commit history shows test before implementation).

## Gotchas

- Writing the test after the code and calling it TDD. The commit history should show the test file modified before the implementation file. If they land in the same commit, the discipline has already slipped.
- Skipping Refactor because the code "works." Red-Green-Refactor is the cycle; the refactor step is where compounding quality comes from. Omitting it accumulates debt faster than no-TDD would.
- Over-mocking in Red. If the test needs 10 mocks to run, the design is wrong — the test is telling you the unit has too many collaborators. Listen to it.
- Testing implementation details (private methods, internal state) instead of behavior. These tests break on every refactor and erode trust in the suite.
