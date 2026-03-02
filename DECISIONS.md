# Decisions

> Owned by PM Agent. Logs every significant architectural, design, and feature decision with rationale. Check here before re-investigating a previously decided topic.

## [DEC-001] Assessment-first before any code changes
**Date:** 2026-03-01
**Decided by:** Storm
**Decision:** Run full codebase audit before any development work. No code changes until Storm reviews findings.
**Rationale:** The codebase was built across multiple phases (Core, Document Control, CAPA) using the Ralph agent army. Pattern drift was expected. Assessment establishes baseline before remediation.
**Alternatives considered:** Jump straight into CAPA module completion; fix issues ad-hoc as discovered.
**Status:** Active

## [DEC-002] Multi-tenancy must be enforced at DB level, not just API
**Date:** 2026-03-01
**Decided by:** Architect Agent (pending Storm approval)
**Decision:** All top-level entity tables must have orgId column with FK to organization. API-layer orgId filtering is necessary but not sufficient.
**Rationale:** 21 CFR Part 11 §11.10(d) requires system access limited to authorized individuals. If API auth is bypassed (bug, misconfiguration, direct DB access), org-scoping at the schema level is the last line of defense. 17 tables currently lack this.
**Alternatives considered:** (1) Rely solely on API middleware — rejected, single point of failure. (2) Row-level security in PostgreSQL — viable but adds complexity; orgId columns still needed as foundation.
**Status:** Active — pending TASK-001, TASK-009

## [DEC-003] Serial-to-UUID migration strategy
**Date:** 2026-03-01
**Decided by:** Architect Agent (pending Storm approval)
**Decision:** Migrate serial IDs to UUID using raw SQL migration scripts in module order: CAPA first (19 tables), then Document Control Phase 2/3 (13 tables), then actionItem/notifications (2 tables). Dual-write approach during migration.
**Rationale:** drizzle-kit push is interactive and can't handle FK rewiring. CAPA module is most isolated with fewest cross-module references, making it safest to migrate first.
**Alternatives considered:** (1) drizzle-kit push — rejected, interactive mode incompatible with CI. (2) Big-bang migration of all 34 tables at once — rejected, too much blast radius. (3) Keep serial IDs — rejected, pattern inconsistency and cross-module FK type mismatches (integer→uuid) cause runtime errors.
**Status:** Active — pending TASK-006

## [DEC-004] routes.ts split strategy
**Date:** 2026-03-01
**Decided by:** Architect Agent (pending Storm approval)
**Decision:** Split routes.ts (11,631 lines) into Express Router modules by domain. One router per module: auth, import, dashboard, parts, processes, pfmea, control-plans, documents, capa, change-packages, auto-review.
**Rationale:** File grew from ~3,800 to 11,631 lines across Document Control and CAPA development. Code review, navigation, and merge conflicts are severely impacted. Pure refactor with no functional changes.
**Alternatives considered:** (1) Keep monolithic — rejected, already causing developer friction. (2) Split by HTTP method — rejected, doesn't match domain boundaries. (3) Full microservices — rejected, premature for current scale.
**Status:** Active — pending TASK-007
