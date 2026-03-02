# Ralph: The Agent Army

## What Is Ralph?

Ralph is a multi-agent orchestration system for building the PFMEASuite — an IATF 16949 quality management system for automotive manufacturing. Instead of one monolithic prompt, Ralph breaks complex module delivery into specialized agents that each own specific files and responsibilities, execute in sequence with validation gates between them, and follow shared conventions defined in `RALPH_PATTERNS.md`.

The system is named "Ralph" and has been used to deliver three modules so far:
- **Phase 0 (Core):** Authentication, multi-tenancy, RBAC foundation
- **Phase 1 (Document Control v2):** Full document lifecycle with 21 CFR Part 11 e-signatures
- **Phase 2 (CAPA/8D):** Corrective/Preventive Actions using the automotive 8D methodology

---

## How It Works

### The Pattern: Layer-by-Layer, Gate-by-Gate

Every module is delivered in the same order:

```
DB Agents → API Agents → UI Agents → Test Agent
```

Each agent:
1. Reads `RALPH_PATTERNS.md` first (shared conventions)
2. Reads its own agent file (e.g., `AGENT-DB-1.md`) for specific instructions
3. Optionally reads a `*_CONTEXT.md` file for code examples from the existing codebase
4. Executes its work within strict file boundaries
5. Must pass a validation gate before the next agent runs

### Append-Only Rule

Agents only **append** code to existing files. They never reorganize or refactor what's already there. This prevents merge conflicts and ensures each agent's output is additive and safe.

### File Ownership Matrix

Each agent type owns specific files and must never touch files outside its boundary:

| Agent Type | Owns | Never Touches |
|------------|------|---------------|
| **DB** | `shared/schema.ts`, `server/storage.ts`, `server/seed.ts` | routes, client, tests |
| **API** | `server/routes.ts` | schema, storage, seed, client, tests |
| **UI** | `client/src/pages/`, `client/src/components/`, `client/src/App.tsx` | server files, tests |
| **TEST** | `tests/` | everything else |

---

## The Agent Roster

### Phase 0: Core Platform (4 agents)

These agents built the authentication and multi-tenancy foundation that all other modules depend on.

| Agent | File | What It Does |
|-------|------|-------------|
| **CORE-AGENT-DB** | `CORE-AGENT-DB.md` | Creates `organization`, `user`, `session` tables. Adds `orgId` foreign key to all existing tables for multi-tenancy. Implements storage methods for auth and tenancy. Seeds demo org and users. |
| **CORE-AGENT-API** | `CORE-AGENT-API.md` | Builds auth endpoints (register, login, logout, me, refresh). Creates auth middleware for session validation. Creates tenancy middleware to scope all queries by `orgId`. Retrofits existing routes with auth. |
| **CORE-AGENT-UI** | `CORE-AGENT-UI.md` | Creates Login and Register pages. Builds `AuthContext` for global auth state. Creates `ProtectedRoute` wrapper. Updates `App.tsx` for auth flow. Adds user info to sidebar. |
| **CORE-AGENT-TEST** | `CORE-AGENT-TEST.md` | Unit tests for auth utilities (password hashing, tokens). Integration tests for auth API. Integration tests for tenancy isolation. E2E tests for login/register flows. |

### Phase 1: Document Control v2 (7 agents + 4 context files)

Full document lifecycle management with regulatory compliance. **~85 storage methods, ~60 API endpoints, 8 UI pages, ~120 tests.**

| Agent | File | What It Does |
|-------|------|-------------|
| **AGENT-DB-1** | `AGENT-DB-1.md` | Creates 6 tables: `documentFile`, `documentTemplate`, `documentWorkflow`, `documentWorkflowStep`, `documentCheckout`, `documentVersion`. File management, templates, checkout/lock, and approval workflow schemas. |
| **AGENT-DB-2** | `AGENT-DB-2.md` | Creates 7 tables: `documentDistributionList`, `documentDistributionRecipient`, `documentAccessLog`, `documentComment`, `documentAnnotation`, `documentLink`, `documentTraining`. Distribution tracking, audit trail with hash chain, comments, and training records. Seeds all tables. |
| **AGENT-API-1** | `AGENT-API-1.md` | File upload/download endpoints. Template CRUD and "create from template". Document checkout/checkin/force-release. Workflow initiation (start review process). Version comparison. |
| **AGENT-API-2** | `AGENT-API-2.md` | Workflow engine (approve/reject/delegate steps, auto-advance). 21 CFR Part 11 e-signature capture. Distribution list management with acknowledgment tracking. Access logging (view, download, print). Comments and annotations. Document linking. |
| **AGENT-UI-1** | `AGENT-UI-1.md` | Document library page with filtering, search, and status badges. Document detail viewer with tabbed interface (info, files, history, comments). Upload wizard with drag-and-drop. Create-from-template flow. |
| **AGENT-UI-2** | `AGENT-UI-2.md` | Approvals inbox (pending workflow actions). Periodic review calendar. Document comparison (side-by-side diff). Admin pages: workflow configuration, distribution list management, audit log viewer. |
| **AGENT-TEST** | `AGENT-TEST.md` | ~120 tests: unit (business logic like revision lettering, status transitions), integration (all API endpoints), journey tests (complete document lifecycle from draft through approval to distribution). |

**Context files** (provide code examples from the existing codebase):
- `AGENT_DB_CONTEXT.md` — Schema patterns, existing table examples
- `AGENT_API_CONTEXT.md` — Route patterns, middleware examples
- `AGENT_UI_CONTEXT.md` — Component patterns, TanStack Query examples
- `AGENT_TEST_CONTEXT.md` — Test patterns, assertion examples

### Phase 2: CAPA/8D Module (14 agents)

Corrective and Preventive Actions using the automotive 8D problem-solving methodology. **18 tables, ~95 API endpoints, 12 UI pages, ~192 tests.**

| Agent | File | What It Does |
|-------|------|-------------|
| **CAPA-DB-1** | `CAPA-DB-1.md` | Core tables (6): `capa` main record, `capaTeamMember`, `capaSource`, `capaAttachment`, `capaRelatedRecord`, `capaNumberSequence` (auto-numbering). |
| **CAPA-DB-2** | `CAPA-DB-2.md` | D0-D3 tables (4): `capaD0Emergency` (emergency response), `capaD1TeamDetail` (team formation), `capaD2Problem` (Is/Is Not analysis), `capaD3Containment` (interim containment actions). |
| **CAPA-DB-3** | `CAPA-DB-3.md` | D4-D6 tables (4): `capaD4RootCause` (root cause analysis), `capaD4RootCauseCandidate` (candidate tracking), `capaD5CorrectiveAction` (permanent corrective actions), `capaD6Validation` (implementation validation). |
| **CAPA-DB-4** | `CAPA-DB-4.md` | D7-D8 + Audit tables (4): `capaD7Preventive` (systemic prevention), `capaD8Closure` (closure criteria and recognition), `capaAuditLog` (immutable trail with hash chain), `capaMetricSnapshot` (analytics snapshots). |
| **CAPA-DB-5** | `CAPA-DB-5.md` | Problem-solving analysis tools: `capaAnalysisTool` table supporting Is/Is Not, 3-Legged 5-Why (Ford methodology), Fishbone/Ishikawa, Fault Tree Analysis, Comparative Analysis, Change Point Analysis, and per-CAPA Pareto. |
| **CAPA-API-1** | `CAPA-API-1.md` | Core CAPA CRUD, team management, source tracking, attachments (upload/download), related records linking. D0-D4 discipline endpoints. (~50 endpoints) |
| **CAPA-API-2** | `CAPA-API-2.md` | D5-D8 discipline endpoints, closure workflow, analytics (summary, status breakdown, Pareto, trends, team performance, metric snapshots). (~45 endpoints) |
| **CAPA-API-3** | `CAPA-API-3.md` | Analysis tools API: CRUD for all tool types, tool-specific operations (verify cause, rule out), export to PDF/SVG/PNG, template libraries, cross-tool linking. |
| **CAPA-UI-1** | `CAPA-UI-1.md` | CAPA dashboard with KPI cards. CAPA list with filtering/pagination. Create CAPA form. D0-D4 discipline forms (emergency response, team formation, problem definition, containment). |
| **CAPA-UI-2** | `CAPA-UI-2.md` | D5-D8 discipline forms (corrective actions, validation, preventive actions, closure). Attachment management UI. Audit trail viewer. Closure workflow with approval. |
| **CAPA-UI-3** | `CAPA-UI-3.md` | Analytics dashboard with interactive charts. Pareto analysis page. Trend analysis page. Team performance metrics. Report generation and export. Metric snapshot comparison. |
| **CAPA-UI-4** | `CAPA-UI-4.md` | Interactive problem-solving tools UI: Is/Is Not builder, 5-Why chain builder, 3-Legged 5-Why (Ford), interactive Fishbone diagram, Fault Tree builder with probability calculations, Comparative Analysis table, Change Point timeline, Pareto chart builder, tool selector wizard. |
| **CAPA-TEST** | `CAPA-TEST.md` | ~192 tests: unit (56 — number generation, status transitions, discipline completion, hash chain), integration (96 — all endpoints), tenancy isolation (25), E2E (15 — including full 8D journey test). |

---

## Orchestration Files

Each module has an orchestration guide that acts as the "project plan":

| File | Purpose |
|------|---------|
| `RALPH_PATTERNS.md` | **Shared conventions** all agents read first. Schema naming, storage method signatures, route patterns, UI stack, file ownership boundaries, business domain context. |
| `ORCHESTRATION.md` | Document Control v2 execution plan. 7 phases, file ownership matrix, business rules, troubleshooting guide, success criteria. |
| `CAPA-ORCHESTRATION.md` | CAPA/8D execution plan. 4 phases (DB→API→UI→Test), 18 tables, ~95 endpoints, validation gates, rollback procedures. |

---

## How to Use an Agent

### Step 1: Check Prerequisites
Each agent file states what must be complete first (e.g., "CAPA-DB-1 through CAPA-DB-4 must be complete").

### Step 2: Feed the Agent
In Claude Code, provide:
1. `RALPH_PATTERNS.md` content (always first)
2. The agent's own `.md` file (e.g., `CAPA-DB-3.md`)
3. Optionally, the relevant `*_CONTEXT.md` file for code examples
4. Ask Claude to execute

### Step 3: Validate the Gate
After the agent completes, run the validation checks listed in the orchestration file:
- **DB agents:** `npx drizzle-kit push` succeeds, server starts, seed runs
- **API agents:** All endpoints return expected responses, no TypeScript errors
- **UI agents:** Pages render, forms submit, data displays correctly
- **Test agents:** All tests pass

### Step 4: Move to Next Agent
Only proceed to the next agent after the gate passes.

---

## Key Business Rules Embedded in Agents

These domain rules are enforced across all agents:

- **IATF 16949** — Automotive quality standard. Documents must be controlled, approved, distributed, and traceable.
- **21 CFR Part 11** — FDA e-signature regulation. Signatures include: signer ID, UTC timestamp, IP address, user agent, session ID, meaning statement, document SHA-256 hash.
- **Document Status Flow:** `draft → review → effective → superseded/obsolete`
- **8D Disciplines:** D0 (Emergency) → D1 (Team) → D2 (Problem) → D3 (Containment) → D4 (Root Cause) → D5 (Corrective) → D6 (Validation) → D7 (Prevention) → D8 (Closure)
- **Revision Letters:** A → B → ... → Z → AA → AB → ...
- **Audit Logs:** Immutable with hash chain for tamper detection
- **Multi-tenancy:** All data scoped by `orgId`, enforced at middleware level

---

## Tech Stack Reference

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, TanStack Query, shadcn/ui, Tailwind CSS, wouter, react-hook-form |
| Backend | Express, TypeScript, Zod validation |
| Database | PostgreSQL (Neon), Drizzle ORM |
| Testing | Vitest (unit/integration), Playwright (E2E) |
| Auth | bcrypt, session tokens, RBAC (admin/quality_manager/engineer/viewer) |

---

## Agent File Inventory

```
Phase 0 — Core Platform
  CORE-AGENT-DB.md          (16 KB)  Auth + multi-tenancy schema
  CORE-AGENT-API.md         (19 KB)  Auth endpoints + middleware
  CORE-AGENT-UI.md          (29 KB)  Login/register + auth context
  CORE-AGENT-TEST.md        (18 KB)  Auth + tenancy tests

Phase 1 — Document Control v2
  AGENT-DB-1.md             (18 KB)  Files, templates, workflows, checkout
  AGENT-DB-2.md             (21 KB)  Distribution, audit, comments, links
  AGENT-API-1.md            (13 KB)  Upload, download, templates, checkout
  AGENT-API-2.md            (16 KB)  Workflow engine, signatures, distribution
  AGENT-UI-1.md              (7 KB)  Library, viewer, upload wizard
  AGENT-UI-2.md             (24 KB)  Approvals, reviews, comparison, admin
  AGENT-TEST.md             (21 KB)  ~120 tests across all layers
  AGENT_DB_CONTEXT.md       Context file with schema examples
  AGENT_API_CONTEXT.md      Context file with route examples
  AGENT_UI_CONTEXT.md       Context file with component examples
  AGENT_TEST_CONTEXT.md     Context file with test examples

Phase 2 — CAPA/8D Module
  CAPA-DB-1.md              (20 KB)  Core tables (capa, team, source, etc.)
  CAPA-DB-2.md              (20 KB)  D0-D3 discipline tables
  CAPA-DB-3.md              (24 KB)  D4-D6 discipline tables
  CAPA-DB-4.md              (19 KB)  D7-D8 + audit + metrics tables
  CAPA-DB-5.md              (25 KB)  Analysis tools table
  CAPA-API-1.md              (6 KB)  Core + D0-D4 endpoints
  CAPA-API-2.md              (8 KB)  D5-D8 + analytics endpoints
  CAPA-API-3.md             (11 KB)  Analysis tools endpoints
  CAPA-UI-1.md              (16 KB)  Dashboard, list, create, D0-D4 forms
  CAPA-UI-2.md              (29 KB)  D5-D8 forms, attachments, audit
  CAPA-UI-3.md              (31 KB)  Analytics, charts, reports, export
  CAPA-UI-4.md              (57 KB)  Interactive problem-solving tools
  CAPA-TEST.md              (25 KB)  ~192 tests

Shared
  RALPH_PATTERNS.md          Conventions all agents follow
  ORCHESTRATION.md           Doc Control execution plan
  CAPA-ORCHESTRATION.md      CAPA/8D execution plan
```

**Total: 28 agent files, 3 orchestration files, ~500 KB of specifications**

---

## Summary Stats

| Metric | Phase 0 | Phase 1 | Phase 2 | Total |
|--------|---------|---------|---------|-------|
| Agent files | 4 | 11 | 14 | **29** |
| Database tables | 3 | 13 | 18 | **34** |
| Storage methods | ~15 | ~85 | ~100 | **~200** |
| API endpoints | ~15 | ~60 | ~95 | **~170** |
| UI pages | 2 | 8 | 12 | **22** |
| Tests | ~40 | ~120 | ~192 | **~352** |
