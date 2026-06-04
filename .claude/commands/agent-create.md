---
description: Scaffold a new Tier-3 agent from AGENT_TEMPLATE.md after the Skill-vs-Agent decision test
argument-hint: <agent purpose / capability gap>
allowed-tools: Read, Write, Glob, Grep
---

# Create Agent

Create a new agent for the framework: $ARGUMENTS

## Workflow

1. Read CONTEXT_MASTER.md for framework conventions
2. Read AGENT_TEMPLATE.md for the standard agent format
3. Apply the Skill vs Agent Decision Test:
   - Does this need its own authority and pipeline position? → Yes, build as Agent
   - Is it knowledge an existing agent applies? → Should be a Skill, not an Agent
4. Determine the tier:
   - Tier 2 (Core) — if it translates across all domains
   - Tier 3 (Specialist) — if it's domain-specific or narrowly scoped
   - Tier 3 (Meta) — if it creates/manages other agents or skills
5. Create the agent .md file following AGENT_TEMPLATE.md structure:
   - Agent name and nickname
   - Role description
   - Tier and reporting hierarchy
   - Collaborates With list
   - Responsibilities
   - YAML frontmatter with name, description, and isolation: worktree (if the agent writes files)
6. Determine if the agent needs worktree isolation:
   - Writes files → add `isolation: worktree` to frontmatter
   - Read-only → no isolation needed
7. Update CONTEXT_MASTER.md to register the new agent in the hierarchy
8. Verify the agent doesn't overlap with existing agents' responsibilities
