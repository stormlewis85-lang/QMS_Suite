---
name: migration-planner
domain: software
auto-load: false
used-by:
  - architect-agent
description: >-
  Fire when the user asks to plan a major framework/runtime upgrade, database
  schema migration, breaking API change, tool/library swap, or any staged
  rollout with rollback. Also fire when dependency-audit surfaces a major
  version bump that touches many call sites. Trigger phrases: "migrate",
  "upgrade framework", "version bump", "breaking changes", "database
  migration", "API versioning", "rollback plan", "swap ORM", "how do we
  roll this out safely".
---

# Skill: Migration Planner

## When to Apply
- When upgrading a framework, language, or runtime to a new major version
- When migrating database schemas (adding/removing/altering tables or columns)
- When introducing breaking API changes that affect consumers
- When switching from one tool/library to another (e.g., ORM swap, bundler change)
- When dependency-audit identifies major version upgrades needed

## Core Framework

### 1. Impact Assessment
- **Scope:** What files, modules, and systems are affected?
- **Breaking changes:** List every breaking change from the migration target's changelog.
- **Dependency cascade:** Which other dependencies are affected by this migration?
- **Data risk:** Does this migration touch persistent data (DB, files, configs)?
- **Consumer impact:** Do external consumers (APIs, integrations) need to change?

### 2. Risk Classification

| Risk Level | Criteria | Approach |
|---|---|---|
| **Low** | No data changes, no breaking API changes, < 10 files affected | Single PR, standard review |
| **Medium** | Schema changes with rollback, internal API changes, 10-50 files | Phased PRs, feature flags |
| **High** | Breaking external API changes, irreversible data transforms, 50+ files | Multi-sprint plan, parallel running |

### 3. Migration Strategy

**Incremental (preferred):**
1. Create compatibility layer / adapter pattern.
2. Migrate consumers one by one behind feature flags.
3. Remove compatibility layer after full migration.
4. Delete old code.

**Big Bang (when incremental isn't feasible):**
1. Create migration branch.
2. Complete all changes.
3. Run full test suite.
4. Deploy with rollback plan ready.

### 4. Rollback Plan
Every migration must have a documented rollback:
- **Database:** Down migration script tested before running up migration.
- **API:** Previous version remains available during transition period.
- **Framework:** Git revert path identified and tested.
- **Data:** Backup taken before irreversible transforms.

### 5. Execution Checklist
- [ ] Impact assessment completed and documented in DECISIONS.md
- [ ] Breaking changes cataloged
- [ ] Rollback plan documented and tested
- [ ] Migration script written and tested against staging data
- [ ] Feature flags in place (if phased)
- [ ] Consumer notification sent (if external API changes)
- [ ] Test suite passes at every phase boundary
- [ ] PATTERNS.md updated with new conventions post-migration

## Output Format

```markdown
## Migration Plan: [What] v[Current] -> v[Target]

### Impact
- Files affected: [N]
- Risk level: [Low/Medium/High]
- Breaking changes: [List]
- Data migration required: [Yes/No]

### Strategy: [Incremental/Big Bang]
**Phase 1:** [Description] — [PR scope] — [Gate]
**Phase 2:** [Description] — [PR scope] — [Gate]
**Phase N:** [Cleanup] — remove compatibility layer, update docs

### Rollback
- Trigger: [What failure triggers rollback]
- Procedure: [Step-by-step rollback]
- Data recovery: [How to restore data if needed]

### Timeline
- Estimated effort: [T-shirt size]
- Dependencies: [What must happen first]
```

## Integration with Other Skills
- **dependency-audit**: Feeds migration targets — major version upgrades become migration plans.
- **testing-strategy**: Migration phases must maintain test coverage at every boundary.
- **git-workflow**: Each migration phase gets its own branch and PR.
- **handoff-protocol**: Migration phases use gates to enforce phase boundaries.

## Gotchas

- "Big bang" migrations almost always slip. If the plan has no intermediate gate where both old and new coexist in production, it's a big bang — break it up.
- Forgetting the rollback plan until something breaks. Write the rollback procedure before Phase 1 ships, not during the incident.
- Compatibility shims that become permanent. If Phase N ("remove the shim") has no owner and no date, the shim is now architecture. Put a sunset date on it and escalate when it slips.
- Data migrations that assume the old schema won't receive writes during cutover. Unless writes are actually blocked, plan for backfill + catch-up, not a single snapshot copy.
