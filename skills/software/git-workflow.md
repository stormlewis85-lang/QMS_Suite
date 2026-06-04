---
name: git-workflow
description: Branching strategy, conventional commits, and PR process for software projects.
domain: software
auto-load: true
used-by:
  - developer-agent
  - test-agent
  - docs-agent
  - devops-agent
---

# Skill: Git Workflow

## Purpose
Define how code moves from development to production through branches, commits, and pull requests. Ensures consistent version control practices across the team.

## When to Use
- Every time code is committed
- When creating or reviewing pull requests
- When branching for new features or fixes
- When resolving merge conflicts

## Procedure

### Branching
1. **Never commit directly to main.** All work happens on feature branches.
2. Branch naming: `<type>/<short-description>` (e.g., `feat/user-auth`, `fix/login-redirect`).
3. Keep branches short-lived — merge within days, not weeks.
4. Pull from main before starting new work to minimize conflicts.

### Committing
1. Use **conventional commit format** for every commit message.
2. One logical change per commit — don't bundle unrelated changes.
3. Write the message in imperative mood ("add feature" not "added feature").
4. Keep the subject line under 70 characters.
5. Add a body for non-obvious changes explaining the "why."

### Pull Requests
1. PR title follows conventional commit format.
2. PR description includes: Summary (what and why), Test plan (how to verify).
3. All PRs require QA Agent review before merge.
4. Address review feedback with new commits — don't force-push over review comments.
5. Squash merge to main for clean history.

## Reference

### Conventional Commit Types
| Prefix | When to Use |
|---|---|
| `feat:` | New feature or capability |
| `fix:` | Bug fix |
| `refactor:` | Code restructuring without behavior change |
| `docs:` | Documentation only |
| `test:` | Adding or updating tests |
| `chore:` | Build, tooling, dependency updates |
| `perf:` | Performance improvement |
| `style:` | Formatting, whitespace (no logic change) |

### Branch Types
| Branch | Purpose |
|---|---|
| `main` | Production-ready code |
| `feat/*` | New features |
| `fix/*` | Bug fixes |
| `refactor/*` | Refactoring work |
| `docs/*` | Documentation updates |

## Anti-Patterns
- Committing with messages like "fix stuff" or "WIP" to main.
- Long-lived feature branches that drift far from main.
- Force-pushing to shared branches.
- Committing secrets, `.env` files, or large binaries.
- Skipping PR review for "small changes" — small changes break things too.
