---
name: testing-strategy
description: What to test, coverage targets, and test pyramid approach for software projects.
domain: software
auto-load: true
used-by:
  - test-agent
  - developer-agent
  - qa-agent
---

# Skill: Testing Strategy

## Purpose
Define what gets tested, at what level, and to what standard. Ensures test coverage is meaningful, not just high in number, and follows the test pyramid for efficient validation.

## When to Use
- When writing tests for new or modified code
- When reviewing test coverage
- When deciding what level of testing a feature needs
- When Test Agent receives code from Developer Agent

## Procedure

### 1. Identify What to Test
- Every new function or module gets unit tests.
- Every integration point (API endpoints, database operations, external services) gets integration tests.
- Critical user flows get end-to-end tests.
- Bug fixes get a regression test that reproduces the bug first.

### 2. Apply the Test Pyramid
- **Unit tests (70%):** Fast, isolated, test one thing. Mock external dependencies.
- **Integration tests (20%):** Test how components work together. Use real dependencies where practical.
- **End-to-end tests (10%):** Test complete user flows. Slower, more brittle — use sparingly for critical paths.

### 3. Write the Test
- **Arrange:** Set up test data and preconditions.
- **Act:** Execute the code under test.
- **Assert:** Verify the expected outcome.
- Test the behavior, not the implementation — tests should survive refactors.

### 4. Validate Coverage
- New code must meet 80% coverage minimum.
- Coverage alone is insufficient — review that tests cover meaningful paths, not just lines.
- Prioritize testing edge cases and error paths over happy paths (happy paths are obvious).

## Reference

### Coverage Targets
| Level | Target | Focus |
|---|---|---|
| Unit | 80%+ of new code | Logic, calculations, transformations |
| Integration | All API endpoints, DB operations | Data flow, contracts |
| E2E | Critical user journeys | Full-stack behavior |

### What NOT to Test
- Framework internals or third-party library behavior
- Trivial getters/setters with no logic
- Implementation details that change during refactoring
- Generated code (unless you own the generator)

## Anti-Patterns
- Testing only the happy path — bugs live in edge cases.
- Mocking everything — over-mocked tests prove nothing.
- Writing tests after shipping — test during development, not after.
- Chasing 100% coverage — diminishing returns past 80%.
- Brittle snapshot tests that break on every minor change.
