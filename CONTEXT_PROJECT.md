# Project Context

> Project-specific details. Read by all agents at project kickoff. Updated by Docs Agent and PM Agent as the project evolves. Overrides CONTEXT_MASTER where there's a conflict.

## Project Name
PFMEASuite — QMS Suite

## Description
An IATF 16949 quality management system for automotive manufacturing. Manages PFMEAs, control plans, document control with 21 CFR Part 11 e-signatures, and CAPA/8D corrective actions. Multi-tenant SaaS architecture with role-based access control.

## Goals
1. Full IATF 16949 compliance for document control and PFMEA management
2. 21 CFR Part 11 compliant electronic signatures and audit trails
3. Complete 8D CAPA workflow from emergency response through closure
4. Multi-tenant data isolation at every layer
5. Production-ready quality and test coverage

## Target Users
Quality engineers, quality managers, process engineers, and auditors in automotive manufacturing. Technical level: moderate (comfortable with forms and workflows, not developers). Key consideration: regulatory compliance is non-negotiable — incorrect AP calculations or missing audit trails are audit findings.

## Domain Persona

### Who Uses This Daily
- **Quality Engineers:** Create PFMEAs, define failure modes, assign detection/severity/occurrence ratings, calculate APs
- **Quality Managers:** Approve documents, review CAPAs, run auto-reviews, manage distribution lists
- **Process Engineers:** Define process flows, link control plans to PFMEAs, manage equipment
- **Auditors:** Review audit trails, verify document control compliance, check CAPA closure

### What They Hate About Current Tools
- Excel-based PFMEAs with manual AP calculations and no version control
- Paper-based document control with lost signatures and missing distribution records
- CAPA systems that are checkbox exercises instead of real problem-solving tools
- No cross-referencing between PFMEAs, control plans, and CAPAs

### Industry Standards & Regulations
- **IATF 16949:** Automotive quality management standard (clauses 7.5, 8.5, 10.2)
- **21 CFR Part 11:** FDA electronic records/signatures (§11.10, §11.50, §11.70)
- **AIAG-VDA 2019:** FMEA methodology with Action Priority (AP) replacing RPN
- **8D Methodology:** Ford-originated 8-discipline problem-solving for CAPAs

### Domain Vocabulary
- **AP (Action Priority):** H/M/L rating replacing RPN. Determined by S×O×D matrix per AIAG-VDA 2019.
- **PFMEA:** Process Failure Mode and Effects Analysis
- **PFD:** Process Flow Diagram
- **CSR:** Critical/Safety/Regulatory characteristics. Symbols: Ⓢ Safety, ◆ Critical, ⓒ Compliance
- **8D:** Eight Disciplines — D0 Emergency through D8 Closure
- **CAPA:** Corrective and Preventive Action
- **Effective:** Document status meaning approved for production use

## Tech Stack
- **Frontend:** React 18, TypeScript, TanStack Query 5, shadcn/ui, Tailwind CSS, wouter, react-hook-form
- **Backend:** Express, TypeScript, Zod validation
- **Database:** PostgreSQL (Neon serverless), Drizzle ORM
- **Testing:** Vitest (unit/integration), Playwright (e2e)
- **Auth:** bcrypt password hashing, session tokens, httpOnly cookies, RBAC (admin/quality_manager/engineer/viewer)

## File Ownership

| Layer | Files | Notes |
|-------|-------|-------|
| Database | shared/schema.ts, server/storage.ts, server/seed.ts | 68 tables, 355 methods. Schema changes require migration scripts. |
| API | server/routes.ts (11,631 lines — split pending TASK-007) | 441 endpoints. Global auth middleware on /api/*. |
| UI | client/src/pages/ (48), client/src/components/ (99) | Follow shadcn/ui + TanStack Query patterns. |
| Tests | tests/ (33 files), e2e/ (13 specs) | Vitest + Playwright. |
| Services | server/services/ (8 files) | ap-calculator, pfmea-generator, control-plan-generator, auto-review, document-control, export, import, notifications |

## Active Specialists
None yet — using core agent pipeline (PM → Research → Architect → Developer → Test).

## Key Integrations
- PostgreSQL via Neon serverless connector
- Multer for file uploads (50MB document limit, 10MB import limit)
- No external API integrations yet

## Known Constraints
- drizzle-kit push is interactive — use raw SQL migration scripts for schema changes
- ESM import hoisting — use `import 'dotenv/config'` not `dotenv.config()`
- Specific routes must be placed before parameterized routes in Express
- Git config: user.email "storm@local", user.name "Storm"
- routes.ts is 11,631 lines — pending split into module routers (TASK-007)

## Current Phase
**Assessment complete.** Prioritized task list in TASKS.md. Awaiting Storm's approval to begin P0 remediation (multi-tenancy gaps, dashboard data leaks).
