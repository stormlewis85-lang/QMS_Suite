---
name: developer-toolbelt
domain: software
auto-load: false
used-by:
  - developer-agent
description: >-
  Fire when the Developer Agent starts a Standard or Deep task and needs the
  full toolbelt reference — version control conventions, linter/type-check
  expectations, build/run workflow, database migration rules, environment
  configuration, debugging approach, dependency management, pre-handoff
  testing, and Claude Code session patterns. Also fire when a junior
  contributor joins a project and needs the shared playbook. Trigger phrases:
  "Developer toolbelt", "how should I commit", "dev workflow", "pre-handoff
  checklist", "what tools does Developer use".
---

# Skill: Developer Toolbelt

## Purpose

One consolidated reference for the operational patterns the Developer Agent
applies during implementation work. Extracted from `developer-agent.md` so the
agent file stays lean and so other agents (Test, QA) can reference the same
conventions when they collaborate with Developer.

## Mental Model

A Developer's tool choices are downstream of three constraints: **the
project's existing conventions** (follow them — don't reinvent), **the scope
tier assigned by PM** (Quick tasks skip heavy tooling; Deep tasks run the
full suite), and **token economy** (prefer one well-aimed command over many
speculative ones). When a tool's cost exceeds the value it adds for this
task, skip it and note why.

## Approach

### Version Control

**Tools:** Git (branching, committing, merging, stashing, diffing).
**When:** Every task. Create feature branches for Standard/Deep tasks. Commit at
logical checkpoints — not just at the end of a task.
**Conventions:**
- Branch naming: `feature/[task-id]-short-description`,
  `fix/[task-id]-short-description`, `refactor/[task-id]-short-description`
- Commit messages: imperative mood, under 72 characters. "Add user
  authentication endpoint" not "Added stuff"
- One logical change per commit. If you can't describe it in one sentence,
  split it.
**Token guidance:** Git operations are cheap. Commit early, commit often.
Checking `git status` and `git diff` before committing costs almost nothing
and prevents mistakes.

### Code Quality

**Tools:** ESLint, Prettier, TypeScript compiler, Pyright, project-specific linters.
**When:** Before every handoff to Test Agent. Run after significant code blocks
during development — don't wait until the end.
**Conventions:**
- Never hand off code with linting errors or type errors
- Follow project's existing linter config — don't modify it without Architect approval
- If the linter flags something you disagree with, follow the linter and raise it with Architect later
**Token guidance:** Run linters as a single command, not file-by-file. Check
project scripts (`package.json`, `Makefile`, etc.) for existing lint commands
before constructing your own.

### Build & Run

**Tools:** npm/yarn/pnpm, pip/poetry, Vite/webpack/esbuild, dev servers, build scripts.
**When:** After scaffolding new modules, after adding dependencies, before
handoff to verify the build succeeds.
**Conventions:**
- Use the project's existing package manager — don't switch without Architect approval
- Run the full build before handoff, not just the file you changed
- Dev server should be running during frontend work to catch errors in real time
**Token guidance:** Know the project's build commands. `npm run build`,
`npm run dev`, etc. Check `package.json` scripts first — don't reinvent
existing commands.

### Database

**Tools:** Database CLI, ORM commands, migration tools (Prisma, Drizzle, Alembic, Knex, etc.).
**When:** Any task involving data model changes.
**Conventions:**
- Always use migrations — never modify the database schema directly
- Migrations must be reversible (up and down)
- Seed data for development environments should be part of the migration workflow
- Test migrations on a clean database before considering them done
**Token guidance:** Migrations are high-stakes — get them right the first time.
Read the existing migration history before creating new ones. Check for
conflicts with other migrations.

### Environment Management

**Tools:** .env files, dotenv, environment variable configuration.
**When:** Any task involving configuration, API keys, service connections, or
multi-environment behavior.
**Conventions:**
- Never hardcode secrets, API keys, URLs, or environment-specific values
- Maintain a `.env.example` with all required variables (no real values)
- Document any new environment variables in the handoff
- Different environments (dev, staging, prod) should differ only in
  configuration, not in code
**Token guidance:** Check `.env.example` or existing config files before
creating new environment variables — the variable you need might already exist.

### Debugging

**Tools:** Console logging, debugger, stack traces, **systematic-debugging skill**.
**When:** Bug fixes, unexpected test failures, runtime errors.
**Conventions:**
- Reproduce the bug before attempting to fix it
- Read the error message and stack trace fully before writing code
- If three fix attempts fail, STOP. Load the `systematic-debugging` skill and
  follow its four-phase process: Investigate → Hypothesize → Fix → Verify
- Remove debug logging before committing — don't ship console.log statements
**Token guidance:** Debugging is the biggest token sink when done poorly. The
`systematic-debugging` skill exists specifically to prevent the "try random
things" spiral. Load it early, not after wasting tokens.

### Dependency Management

**Tools:** npm/pip/package managers, dependency audit tools, license checkers,
**dependency-audit skill**.
**When:** Adding new libraries, updating existing ones, responding to security advisories.
**Conventions:**
- Before adding a dependency, check: Is it actively maintained? Does the
  license work? Is there a lighter alternative already in the project?
- Pin major versions. Use lock files. Don't `npm install` without checking
  what changed.
- Run `npm audit` / `pip-audit` after adding or updating dependencies
- New dependencies that add significant bundle size or change the tech stack
  need Architect approval
**Token guidance:** One `npm install` command with all needed packages is
better than five separate installs. Check what's already in `package.json`
before adding something new.

### Testing (Pre-Handoff)

**Tools:** Jest, Vitest, pytest, project test runner.
**When:** Before every handoff to Test Agent. Developer runs existing tests to
catch regressions — Test Agent writes new tests.
**Conventions:**
- Run the full test suite (or relevant subset) before handing off
- If existing tests fail, fix them or flag to PM if the failure is outside
  your scope
- For Quick bug fixes, at minimum run the tests for the affected module
- Don't modify existing tests to make them pass your code — that's Test
  Agent's call
**Token guidance:** Know the project's test command. `npm test`, `pytest`,
etc. Running the full suite once costs less than going back and forth with
Test Agent over regressions.

### Claude Code Patterns

**Tools:** Worktrees, subagents, `/batch`, plan mode, `/compact`, `/clear`, hooks.
**When:** Session management and workload optimization.
**Conventions:**
- Use worktrees for isolated parallel work — feature branch in one, hotfix in another
- Manual `/compact` at 50% context usage — don't wait for auto-compaction
- `/clear` when switching to a completely different task
- Plan mode before complex implementations — read and think before writing
- Check context usage (`/usage`) periodically during Deep tasks
- When a task naturally splits into independent subtasks, propose `/batch` to PM
**Token guidance:** Context management is the single biggest factor in code
quality. A Developer at 90% context usage writes worse code than one at 30%.
Compact proactively. Clear between unrelated tasks. Split work into subagents
when it makes sense — the token cost of coordination is lower than the
quality cost of exhausted context.

## Reference: Quick Lookup

| Need | First Action | Related Skill |
|---|---|---|
| Starting a feature | Create branch, read PATTERNS.md | — |
| Code won't type-check | Run project's lint/typecheck command before opening files | — |
| Build is failing | Run full build, read the first error only | — |
| Schema change | Write migration, verify reversibility on clean DB | — |
| Bug after 3 fix attempts | Load systematic-debugging skill | systematic-debugging |
| New dependency | Check existing, run audit | dependency-audit |
| Context usage > 50% | Manual `/compact` | context-budget |
| Pre-handoff | Lint + typecheck + full test suite | — |

## Gotchas

- Running `npm install` without checking `package.json` scripts first often
  duplicates effort — the command you need is usually already defined.
- `/compact` mid-debugging can lose the crucial earlier stack trace. Compact
  *before* starting a debug session, not during.
- `git stash` is easy to forget about. Use `git stash push -m "desc"` and
  `git stash list` regularly, or prefer a branch.

## Anti-Patterns

- Running individual linter commands per file instead of the project's
  aggregate command.
- Modifying a failing test to pass — that's Test Agent's call, not Developer's.
- Adding a dependency for functionality that could be written in under 100
  lines of project-native code.
- Hardcoding environment values "just for now" — it's never just for now.

## Related Skills

- **systematic-debugging**: Four-phase process for stuck bugs.
- **dependency-audit**: CVE + maintenance evaluation.
- **context-budget**: Token allocation and compaction strategy.
- **pr-workflow**: Commit conventions and PR structure for handoff.
- **code-review-checklist**: What QA will check — run against yourself first.
