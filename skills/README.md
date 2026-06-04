# Skill Library

Reusable knowledge modules that agents load to perform domain-specific work. Skills are not agents — they're reference material and procedural guides that agents consult.

## Structure

```
skills/
├── universal/       ← Loaded in every domain
├── software/        ← Tagged: software
├── content/         ← Tagged: content
└── fantasy-sports/  ← Tagged: fantasy-sports
```

## How Skills Are Loaded

1. **Auto-loaded skills** activate at session start based on the active domain config (`/domains/<domain>.md` → Domain Skills → Auto-Loaded Skills).
2. **Available skills** are invoked on demand by agents when relevant.
3. **Universal skills** are always available regardless of domain.

## Frontmatter Schema

Every skill file must include YAML frontmatter:

```yaml
---
name: skill-name
description: One sentence — when to FIRE this skill (model perspective — triggers, conditions, user phrases), not what it provides.
domain: universal | software | content | fantasy-sports
auto-load: true | false
used-by:
  - agent-name
  - agent-name
---
```

## Canonical Source

**This directory (`skills/`) is the canonical skill library.** The `SKILL.md` directories under `.claude/skills/` (project root and agents-master) are Claude-Code-loadable mirrors of a subset of these skills. Edit the canonical file here first, then update the mirror; never edit a mirror alone — mirrors drift silently.

## Adding New Skills

Use the `/skill-create` slash command or follow `SKILL_TEMPLATE.md`.
