---
name: pr-workflow
domain: software
auto-load: false
used-by:
  - docs-agent
description: >-
  Fire when the user is opening a PR, writing a PR description, drafting a
  changelog entry, picking reviewers, or running a merge-readiness check.
  Also fire during QA's pre-review completeness sweep. Trigger phrases: "pull
  request", "PR description", "changelog", "review assignment", "PR
  template", "merge checklist", "commit message", "ready to merge".
---

# Skill: PR Workflow

## When to Apply
- When Docs Agent prepares PR descriptions
- When Developer Agent opens a PR after completing work
- When maintaining changelog entries for releases
- When assigning reviewers to PRs
- When QA Agent checks PR completeness before review

## Core Framework

### 1. PR Description

Every PR must include:
- **Title:** Conventional commit format, under 70 characters.
- **Summary:** 1-3 bullet points explaining what changed and why.
- **Test plan:** How to verify the changes work.
- **Related issues:** Links to tasks or issues this addresses.

### 2. Commit Messages
Follow conventional commits (see git-workflow skill):
- Subject line: `<type>: <description>` (imperative, < 70 chars)
- Body (when needed): Explain the "why," not the "what."
- Footer: Reference issues (`Closes #123`), breaking changes (`BREAKING CHANGE:`).

### 3. Changelog Entry
Add an entry to CHANGELOG.md for user-facing changes:

```markdown
## [Unreleased]

### Added
- [Brief description of new feature] (#PR)

### Changed
- [Brief description of change] (#PR)

### Fixed
- [Brief description of bug fix] (#PR)
```

Follow [Keep a Changelog](https://keepachangelog.com) format.

### 4. Review Assignment

| Change Type | Required Reviewers |
|---|---|
| Feature (new code) | QA Agent + Architect Agent (if structural) |
| Bug fix | QA Agent |
| Refactor | QA Agent + Architect Agent |
| Docs only | QA Agent (light review) |
| Security-sensitive | QA Agent + Security Agent |
| Database/schema | Architect Agent + QA Agent |

### 5. Merge Checklist
- [ ] PR description complete (summary, test plan, related issues)
- [ ] All CI checks pass
- [ ] Required reviewers approved
- [ ] No unresolved review comments
- [ ] Changelog updated (if user-facing)
- [ ] DECISIONS.md updated (if architectural)
- [ ] Squash merge to main

## Output Format

### PR Description Template
```markdown
## Summary
- [What changed and why — 1-3 bullets]

## Test Plan
- [ ] [How to verify change 1]
- [ ] [How to verify change 2]

## Related
- Closes #[issue]
- Task: [TASKS.md reference]

## Changelog
- [Category]: [Description]
```

### Changelog Entry Template
```markdown
### [Category]
- [Description] ([#PR](link))
```

## Integration with Other Skills
- **git-workflow**: PR workflow builds on git conventions — branching, commits, merge strategy.
- **code-review-checklist**: Reviewers use the checklist skill during PR review.
- **handoff-protocol**: PR creation is a handoff from Developer to QA — use Done/Open/Watch.
- **context-management**: PR descriptions reference TASKS.md and DECISIONS.md for traceability.
