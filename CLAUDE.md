# CLAUDE.md — Agent System Configuration

> This project uses a structured agent system. Read this file first on every session.

## Agent System

**Read `./agents-master/CLAUDE.md` for the full agent workflow, pipeline, hierarchy, and session protocol. Follow it.**

This file is the project-level config. The submodule file defines how the agent team works.

- **Master agents:** `./agents-master/`
- **Project overrides:** `./agents/overrides/`
- **Custom agents:** `./agents/custom/`
- **Agent resolution order:** overrides → custom → master

## Context Files

1. Read `./agents-master/CONTEXT_MASTER.md` for universal standards
2. Read `./CONTEXT_PROJECT.md` for project-specific details
3. Read the active domain config from `./domains/software.md` (Active Domain: software — role translations + skill manifest)
4. Read `./PATTERNS.md` for codebase conventions (if it exists)
5. Project context overrides master where there's a conflict. Domain config overrides both for role translation and skill loading.

## Project State

- **Tasks:** `./TASKS.md` — PM-owned task tracker, single source of truth
- **Decisions:** `./DECISIONS.md` — Architectural and feature decision log
- **Research:** `./RESEARCH.md` — Research findings and landscape analysis
- **Patterns:** `./PATTERNS.md` — Codebase conventions (owned by Architect, read by Developer and Test)
- **Design:** `./DESIGN.md` — Visual design system (owned by UI/UX, optional)
- **Autopilot:** `./autopilot-rules.md` — Unattended execution rules (optional, read by PM in Autopilot mode)

## Session Start Protocol

### Interactive Mode (Default)
1. Read this file (CLAUDE.md)
2. Read TASKS.md to understand current project state
3. Resume work where the last session left off
4. Check DECISIONS.md if the current task involves architectural choices
5. Check RESEARCH.md if the current task involves previously researched topics

### Autopilot Mode (Ralph Loop)
1. Read this file (CLAUDE.md)
2. Read autopilot-rules.md for execution boundaries
3. Read TASKS.md — identify next Autopilot-eligible task
4. PM validates the task against autopilot rules:
   - Within scope ceiling? (Quick/Standard only unless rules say otherwise)
   - Outside risk boundaries? (skip if it touches restricted areas)
   - Dependencies met? (prior tasks complete, gates passed)
5. If no eligible tasks remain, exit cleanly with status summary
6. If eligible task found, PM assigns agents and executes the pipeline
7. On completion, update TASKS.md, commit, exit — next iteration gets fresh context

## Pipeline

```
Storm → PM → Research → Architect → Developer → Test → QA → Docs
```

Not every task uses every step. PM determines the pipeline per task.

## Hierarchy

- **Tier 1:** PM Agent (orchestrator — all work flows through PM)
- **Tier 2:** Research, Architect, Developer, Test, QA, Docs (always available)
- **Tier 3:** Specialists activated per project (see CONTEXT_PROJECT.md)
- **Meta:** capability-gap handling via the `/agent-create` slash command — no standing Agent Creator agent

## Token Economy

- PM assigns scope tiers: **Quick** / **Standard** / **Deep** / **Autopilot**
- Agents match effort and verbosity to the assigned tier
- Minimum viable agent team per task — not every task needs the full pipeline
- Check DECISIONS.md and RESEARCH.md before regenerating prior analysis
- Be brief by default. Offer to elaborate when depth might help.

## Golden Rules

1. Always discuss and plan before building. Build authorization requires one of: "build," "implement," "write the code," "go ahead and code," or "I approve the plan." "Execute" alone is NOT sufficient. (Exception: Autopilot mode executes pre-approved tasks.)
2. Minimum viable team per task.
3. No redundant work — check existing docs first.
4. Own your lane — don't do another agent's job.
5. Flag blockers immediately.
6. Ship incrementally.
