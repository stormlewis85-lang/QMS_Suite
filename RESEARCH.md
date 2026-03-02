# Research

> Owned by Research Agent. Findings from landscape analysis, competitor research, and technical investigation. Check here before starting new research on a previously explored topic.

## [R-001] Full Codebase Audit — QMS Suite
**Date:** 2026-03-01
**Scope:** Deep
**Sources reviewed:** All source files (~249 .ts/.tsx), configs, tests, schema

### What Exists

**Scale:** 68 tables, 355 storage methods, 441 API endpoints, 48 pages, 99 components, 46 test files.

**Modules delivered:**
- Core Platform: Auth (bcrypt sessions, RBAC), multi-tenancy (orgId), 3 tables
- PFMEA/Core: Parts, processes, PFD, PFMEA, control plans, equipment, failure modes, controls, 22 tables
- Change Management: Change packages, auto-review, 6 tables
- Document Control: Full lifecycle with 21 CFR Part 11 e-signatures, 16 tables (Phase 1 + Phase 2/3)
- CAPA/8D: Full 8-discipline problem-solving, 17 tables + 1 analysis tool table

**Architecture:** Express monolith. Single schema.ts (3,038 lines), single storage.ts (3,453 lines), single routes.ts (11,631 lines). React SPA with TanStack Query, shadcn/ui, Tailwind, wouter.

### What Works

1. **Consistent CRUD patterns** — storage methods follow getX/createX/updateX/deleteX naming uniformly
2. **Auth infrastructure** — global middleware at `/api/*`, session-based with httpOnly cookies, RBAC with requireRole()
3. **Zod validation** — all mutations validated, 66 insert schemas auto-generated via createInsertSchema()
4. **UI patterns** — TanStack Query, react-hook-form + zodResolver, toast notifications, loading/empty states
5. **Seed data** — comprehensive across all modules, runs on startup
6. **Test infrastructure** — vitest (unit/integration) + Playwright (e2e), helpers and fixtures in place
7. **SQL injection safe** — Drizzle ORM parameterizes all queries, no raw SQL detected
8. **XSS safe** — React escapes template values, no dangerouslySetInnerHTML detected

### What Doesn't

1. **Multi-tenancy incomplete at DB level** — 17 tables missing orgId (5 Phase-1 doc tables, approvalWorkflowStep, actionItem, notifications, 5 change-package/auto-review tables, signature, auditLog, ownership, calibrationLink)
2. **Dashboard leaks cross-tenant data** — queries at routes.ts:625-713 load ALL records without orgId filter, then count in JS
3. **FK type mismatch** — CAPA module uses integer IDs referencing Core module UUID columns (e.g., capaSource.pfmeaId: integer → pfmea.id: uuid). Will break at runtime on cross-module joins.
4. **Schema split** — 34 tables use uuid PK, 34 tables use serial PK. Document Control Phase 2/3 and CAPA modules diverged from the uuid pattern.
5. **Zero tests on critical services** — ap-calculator, pfmea-generator, control-plan-generator, auto-review, export-service, notification-service all untested
6. **539 `any` types** — 304 in server/, 224 in client/, 11 in shared/. Most in catch blocks (59) but ~480 in business logic and components.
7. **routes.ts is 11,631 lines** — grew from ~3,800 with DC and CAPA additions. No module splitting.
8. **No pagination** on list endpoints — getDocuments(), getAllParts(), etc. return full result sets
9. **Console.log everywhere** — 705 statements across 16 files (399 in routes.ts alone)
10. **No error boundaries** in React — page-level crash takes down entire SPA

### What We Steal
(Not applicable — internal audit, not competitive analysis)

### What We Avoid

1. **Don't migrate serial→uuid with drizzle-kit push** — it's interactive and can't handle complex FK rewiring. Use raw SQL migration scripts.
2. **Don't add orgId to child tables that inherit scope through parent** — approvalWorkflowStep inherits from approvalWorkflowInstance. Adding orgId everywhere creates redundancy. Defense-in-depth tables: only top-level entities need direct orgId.
3. **Don't refactor routes.ts while fixing security issues** — split and fix are separate tasks to reduce blast radius.

### Recommendation

**Immediate (P0):** Fix cross-tenant data leaks — add orgId to Phase-1 document tables, fix dashboard queries.
**Next (P1):** Fix CAPA-to-Core FK type mismatches, add tests for AP calculator and auto-review.
**Then (P2):** Serial-to-UUID migration, routes.ts split, structured logging.
**Polish (P3):** Type safety cleanup, pagination, error boundaries.

See TASKS.md for the full prioritized task list.
