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
**Status:** Superseded by DEC-005 (2026-08-29) — TASK-006 retired; monolith CAPA scheduled for deletion under the 2026-07-12 completion plan

## [DEC-004] routes.ts split strategy
**Date:** 2026-03-01
**Decided by:** Architect Agent (pending Storm approval)
**Decision:** Split routes.ts (11,631 lines) into Express Router modules by domain. One router per module: auth, import, dashboard, parts, processes, pfmea, control-plans, documents, capa, change-packages, auto-review.
**Rationale:** File grew from ~3,800 to 11,631 lines across Document Control and CAPA development. Code review, navigation, and merge conflicts are severely impacted. Pure refactor with no functional changes.
**Alternatives considered:** (1) Keep monolithic — rejected, already causing developer friction. (2) Split by HTTP method — rejected, doesn't match domain boundaries. (3) Full microservices — rejected, premature for current scale.
**Status:** Active — pending TASK-007

## [DEC-005] CAPA serial-to-UUID migration retired — the monolith's CAPA module is scheduled for deletion, not repair
**Date:** 2026-08-29
**Decided by:** Storm
**Decision:** Do not execute TASK-006. The suite completion plan (2026-07-12, on the PFMEA Suite project card) declares the 19 CAPA tables dead once the consolidation-track dedup verdict ratifies OneCAPA as the canonical CAPA module, and freezes this monolith read-only at Phase 6. A Deep migration of tables slated for deletion has no customer. The attempted working tree is preserved as archive branch `feat/capa-uuid-migration` (7855b8c) and must not merge; the pino logging it also carried is salvaged on `feat/pino-logger`.
**Rationale:** The remaining serial/uuid inconsistency (DEC-003's motivation) lives only in a module that will be extracted out of this codebase; fixing it here spends a Deep session and a risky remote-DB migration on code the plan retires. DEC-003's Document Control and actionItem/notifications phases are likewise deferred to the Phase 7 module decisions.
**Alternatives considered:** (1) Run the migration anyway against a Neon branch — rejected, no consumer for the result. (2) Hunk-level salvage of the logger wiring across 28 route files — rejected, the logger and UUID edits are interleaved and the app-level `log()` helper already routes everything through pino.
**Status:** Active. **Supersedes:** DEC-003 (Status now "Superseded by DEC-005").

## [DEC-006] feat/design-system parked unmerged — token rewrite never reconciled with the shadcn consumer layer
**Date:** 2026-08-30
**Decided by:** Storm
**Decision:** Branch `feat/design-system` (2026-04-02 work; HEAD `6817052`) stays on origin, unmerged, as a parked spec input. `DESIGN.md` on that branch is the visual spec; the CSS/tailwind implementation on it is NOT to be merged into this monolith. If the OneQMS design system is implemented, it is implemented in the app that will own it (the Hub / OneAdmin is the natural home — see the 2026-07-12 completion plan: this monolith goes read-only at Phase 6), against the findings below.
**Review record (2026-08-30, code-review at medium, 13 candidates all CONFIRMED, 10 reported; two fixed on the branch at `6817052` — outline-border tokens and `--sidebar-border`, guarded by `tests/unit/design-tokens.test.ts`):**
1. `.hover-elevate` / `.active-elevate-2` / `.toggle-elevate` utilities and `--elevate-1/2` deleted; every Button/Badge and several clickable cards lose all hover/pressed styling (no variant carries `hover:` classes).
2. `--sidebar-ring` and `--sidebar-accent-foreground` still deleted (focus ring falls to Tailwind blue); `--sidebar-accent` repurposed from hover-gray to brand teal so hovered and active nav items paint identically.
3. WCAG AA failures the same commit's `DESIGN.md` claims to pass: white-on-primary 3.85:1 light / 2.4:1 dark; white-on-warning 2.1:1; input border vs page 1.14:1.
4. Un-layered `.animate-in` overrides tailwindcss-animate's; tooltips and context menus get the wrong entrance, dialogs keep the old one.
5. `primary/destructive/secondary.border` config keys removed; every filled button shows a light-gray ring.
6. `@media (pointer: coarse)` forces 44px min-height on comboboxes/typed inputs with no opt-out; compact PFMEA / Control Plan grid rows balloon on the target tablets; coverage inconsistent (`<Input>` without `type` unaffected).
7. `--accent` changed from neutral surface to saturated teal + white foreground; table-row hovers, toggles, dropdown/select/command focus states all change behavior.
8. Reduced-motion block is a hand list of nine classes; dialogs, sheets, accordions, press scale and smooth scroll still animate.
9. `borderRadius` config (12/10/8) contradicts `DESIGN.md` (8/6/4) in the same commit.
10. `DESIGN.md` drops 17 of the old guideline's 20 sections (data tables, forms, modals, wizards, FMEA table, control plan grid, process library, part details); `fontFamily.mono` removed while 57 `font-mono` uses remain.
**Rationale:** Reconciling is Standard-to-Deep work (utility classes, sidebar tokens, contrast re-tuning, animation layering, radius scale) in a codebase the plan retires — the TASK-006 shape again (DEC-005). The spec has value; the implementation does not, here.
**Alternatives considered:** (B) reconcile in this repo — rejected per above; (C) delete the branch and keep only `DESIGN.md` — rejected, the token work is useful reference for whoever implements it.
**Status:** Active. **Related:** DEC-005.
