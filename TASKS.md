# Tasks

> Owned by PM Agent. Single source of truth for project state.

## Backlog

[TASK-012] Add CSRF protection middleware | Scope: Quick | Assigned: — | Dependencies: none
[TASK-013] Add session cleanup cron/middleware for expired sessions | Scope: Quick | Assigned: — | Dependencies: none
[TASK-014] Add rate limiting to auth endpoints | Scope: Quick | Assigned: — | Dependencies: none
[TASK-015] Remove Replit-specific Vite plugins for production builds | Scope: Quick | Assigned: — | Dependencies: none
[TASK-016] Remove orphaned /components/examples/ directory (9 unused files) | Scope: Quick | Assigned: — | Dependencies: none
[TASK-017] Add React error boundaries in App.tsx | Scope: Quick | Assigned: — | Dependencies: none
[TASK-018] Seed data for documentTemplate, approvalWorkflowDefinition, distributionList | Scope: Quick | Assigned: — | Dependencies: none

## Queue

### P0 — Critical (Security / Compliance)

[TASK-001] Add orgId to Phase-1 document tables (document, documentRevision, documentDistribution, documentReview, documentLink) | Scope: Standard | Assigned: Developer | Dependencies: none
- Add orgId column with FK to organization, NOT NULL, cascade delete
- Update storage methods to accept and filter by orgId
- Update all document routes to pass req.orgId
- Write migration SQL script (not drizzle-kit push)
- **Why:** Multi-tenancy not enforced at DB level. Cross-tenant document access possible. 21 CFR Part 11 §11.10(d) compliance gap.

[TASK-002] Fix dashboard queries to filter by orgId | Scope: Quick | Assigned: Developer | Dependencies: none | **DONE**
- routes.ts:625-713 — dashboard summary/metrics load ALL records without org filter
- Change from `db.select().from(table)` to filtered queries with `where(eq(table.orgId, req.orgId))`
- Use SQL aggregation (COUNT, GROUP BY) instead of loading full result sets into memory
- **Why:** Authenticated users see data from all organizations. Authorization gap + performance issue.

### P1 — High (Data Integrity / Test Coverage)

[TASK-003] Fix CAPA-to-Core FK type mismatches | Scope: Standard | Assigned: Developer | Dependencies: none | **DONE**
- capaSource.pfmeaId (integer) references pfmea.id (uuid) — type mismatch
- Audit all cross-module FK references in CAPA tables
- Fix column types to match referenced table PK types
- Write migration SQL script
- **Why:** Runtime errors when CAPA-to-PFMEA linking feature is used. Latent data integrity bug.

[TASK-004] Unit tests for ap-calculator service | Scope: Standard | Assigned: Test | Dependencies: none | **DONE**
- server/services/ap-calculator.ts — AIAG-VDA 2019 AP logic, ZERO tests
- Boundary value tests for all S/O/D rating combinations at AP level transitions
- Test determineAPLevel() function thoroughly
- **Why:** Incorrect AP results violate IATF 16949. Pure function, easy to test, high regulatory impact.

[TASK-005] Unit tests for auto-review service | Scope: Standard | Assigned: Test | Dependencies: none | **DONE**
- server/services/auto-review.ts — PFMEA compliance validation engine, ZERO tests
- Test all finding categories: coverage, effectiveness, document_control, scoring, csr
- Test finding severity levels: error, warning, info
- **Why:** Auto-review is the automated compliance checker. Incorrect findings mislead quality teams.

### P2 — Medium (Technical Debt / Maintainability)

[TASK-006] Serial-to-UUID migration — CAPA module (19 tables) | Scope: Deep | Assigned: Developer | Dependencies: TASK-003
- Migrate 19 CAPA tables from serial('id') to uuid('id').defaultRandom()
- Dual-write approach: add uuid column, backfill, update FKs, swap, drop serial
- Write raw SQL migration script
- Update storage methods, routes, and client references
- **Why:** Pattern inconsistency (34 serial vs 34 uuid). CAPA module is most isolated, safest to migrate first.

[TASK-007] Split routes.ts into module routers | Scope: Standard | Assigned: Architect + Developer | Dependencies: none
- Current: 11,631 lines in single file
- Target: Express Router per module (auth, import, dashboard, parts, processes, pfmea, control-plans, documents, capa, change-packages, auto-review)
- Pure refactor — no functional changes
- **Why:** Developer velocity. 11K-line file makes code review, navigation, and conflict resolution painful.

[TASK-008] Replace console.* with structured logging | Scope: Standard | Assigned: Developer | Dependencies: none
- 705 console statements across 16 files (399 in routes.ts)
- Introduce pino or winston with log levels (error, warn, info, debug)
- Keep test file console.log as-is
- **Why:** IATF 16949 audit trail requirements. Console.log is not sufficient for regulatory evidence. Also: log injection risk, info disclosure.

[TASK-009] Add orgId to remaining non-child tables | Scope: Standard | Assigned: Developer | Dependencies: TASK-001 | **DONE**
- Tables: actionItem, notifications, auditLog, signature, ownership, calibrationLink
- Change packages and auto-review tables can inherit scope through parent FK
- Write migration SQL scripts
- **Why:** Defense-in-depth for multi-tenancy. Lower urgency than TASK-001 since these tables have indirect org scoping through parent entities.
- **Completed:** Added orgId + FK + index to all 6 tables in schema.ts. Migration SQL in migrations/0003_add_orgid_to_remaining_tables.sql. Updated notification-service.ts, export-service.ts, document-control.ts, and routes.ts to pass orgId in all insert/service calls. 250/250 unit tests pass.

### P3 — Low (Code Quality / Polish)

[TASK-010] Type safety cleanup — replace any types in business logic | Scope: Standard | Assigned: Developer | Dependencies: none | **DONE**
- 539 total `any` occurrences. Priority targets:
  - Replace `catch (error: any)` with `catch (error: unknown)` + type narrowing (59 instances)
  - Define interfaces for JSONB columns ($type<any> in schema.ts, 4 instances)
  - Fix CapaDetail.tsx (44 any) and CapaAnalysisTools.tsx (31 any)
- **Why:** Type safety erosion. Low runtime risk but high maintainability impact.
- **Completed:** Replaced all 59 `catch (error: any)` with `catch (error: unknown)` in routes.ts. Added `getErrorMessage()` utility for type-safe error message extraction. Replaced 4 `$type<any>()` with `$type<Record<string, unknown>>()` in schema.ts JSONB columns. Client-side CAPA components deferred (outside autopilot scope). 250/250 unit tests pass.

[TASK-011] Add pagination to list endpoints | Scope: Standard | Assigned: Developer | Dependencies: none
- getDocuments(), getAllParts(), getAllProcesses(), getAllPFMEAs() return unbounded result sets
- Add limit/offset params to storage methods and API endpoints
- **Why:** Performance at scale. 10,000+ records will cause latency and memory pressure.

## In Progress

## In Review

## Done

[TASK-002] Fix dashboard queries to filter by orgId | Completed: 2026-03-01 | Summary: Rewrote /api/dashboard/summary and /api/dashboard/metrics to use SQL COUNT/GROUP BY with orgId WHERE clauses instead of loading full result sets. pfmeaRow scoped via INNER JOIN to org-scoped pfmea. auditLog scoped via INNER JOIN to user table. 147/147 unit tests pass.

[TASK-001] Add orgId to Phase-1 document tables | Completed: 2026-03-01 | Summary: Added orgId (uuid FK to organization, NOT NULL, cascade delete) + index to 5 tables (document, documentRevision, documentDistribution, documentReview, documentLink). Updated 16 storage methods with orgId filtering. Updated all document routes (Phase 1-3, ~40 handlers) to pass req.orgId. Updated seed.ts. Migration SQL: 0001_add_orgid_to_document_tables.sql. 147/147 unit tests pass.

[TASK-005] Unit tests for auto-review service | Completed: 2026-03-01 | Summary: 49 test cases with DB mocking covering all 16 finding codes (COV-001–004, EFF-001–006, DOC-001–004, TRC-001–002, CMP-001–004), summary calculation (passRate, category breakdown), and recommendation generation. 250/250 unit tests pass.

[TASK-004] Unit tests for ap-calculator service | Completed: 2026-03-01 | Summary: 54 test cases covering input validation, all HIGH/MEDIUM/LOW priority conditions, boundary transitions, result metadata, batch calculation, statistics, and suggestion helpers. 201/201 unit tests pass.

[TASK-003] Fix CAPA-to-Core FK type mismatches | Completed: 2026-03-01 | Summary: Fixed 5 integer→uuid type mismatches in CAPA tables (capaSource.pfmeaId, pfmeaRowId, controlPlanId; capaAttachment.linkedDocumentId; capaD8Closure.finalReportDocumentId). Migration SQL: 0002_fix_capa_fk_type_mismatches.sql. 201/201 unit tests pass.

[TASK-000] Full codebase assessment | Completed: 2026-03-01 | Summary: Deep audit by Research + Architect agents. 68 tables, 441 endpoints, 48 pages audited. Critical findings: multi-tenancy gaps, FK type mismatches, zero tests on core services. See RESEARCH.md [R-001].
