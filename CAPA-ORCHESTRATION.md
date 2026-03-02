# CAPA/8D Module Orchestration

## Overview

Complete implementation plan for the CAPA/8D module following the automotive 8D methodology.

**Estimated Total Time: 18-24 hours**

---

## Agent Files

| Agent | File | Focus | Est. Time |
|-------|------|-------|-----------|
| CAPA-DB-1 | CAPA-DB-1.md | Core tables (capa, team, source, attachments, related, sequence) | 2-3 hrs |
| CAPA-DB-2 | CAPA-DB-2.md | D0-D3 tables (emergency, team detail, problem, containment) | 2-3 hrs |
| CAPA-DB-3 | CAPA-DB-3.md | D4-D6 tables (root cause, corrective, validation) | 2-3 hrs |
| CAPA-DB-4 | CAPA-DB-4.md | D7-D8 + Audit (preventive, closure, audit log, metrics) | 2-3 hrs |
| CAPA-API-1 | CAPA-API-1.md | Core + D0-D4 endpoints (~50 endpoints) | 2-3 hrs |
| CAPA-API-2 | CAPA-API-2.md | D5-D8 + Analytics endpoints (~45 endpoints) | 2-3 hrs |
| CAPA-UI-1 | CAPA-UI-1.md | Dashboard, List, Create, D0-D4 forms | 2-3 hrs |
| CAPA-UI-2 | CAPA-UI-2.md | D5-D8 forms, Attachments, Audit | 2-3 hrs |
| CAPA-UI-3 | CAPA-UI-3.md | Analytics, Charts, Reports, Export | 2 hrs |
| CAPA-TEST | CAPA-TEST.md | ~192 tests (unit, integration, E2E) | 2-3 hrs |

---

## Execution Sequence

```
Phase 1: Database (Sequential)
┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│  CAPA-DB-1  │──▶│  CAPA-DB-2  │──▶│  CAPA-DB-3  │──▶│  CAPA-DB-4  │
│  Core       │   │  D0-D3      │   │  D4-D6      │   │  D7-D8+Audit│
└─────────────┘   └─────────────┘   └─────────────┘   └─────────────┘
                                                              │
                         ┌────────────────────────────────────┘
                         ▼
Phase 2: API (Sequential)
┌─────────────┐   ┌─────────────┐
│ CAPA-API-1  │──▶│ CAPA-API-2  │
│ Core+D0-D4  │   │ D5-D8+Anlyt │
└─────────────┘   └─────────────┘
                         │
         ┌───────────────┘
         ▼
Phase 3: UI (Sequential)
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│  CAPA-UI-1  │──▶│  CAPA-UI-2  │──▶│  CAPA-UI-3  │
│  Dash+D0-D4 │   │  D5-D8+Att  │   │  Analytics  │
└─────────────┘   └─────────────┘   └─────────────┘
                                           │
                       ┌───────────────────┘
                       ▼
Phase 4: Testing
┌─────────────┐
│  CAPA-TEST  │
│  192 tests  │
└─────────────┘
```

---

## Validation Gates

### After CAPA-DB-1
- [ ] 6 tables created (capa, capaTeamMember, capaSource, capaAttachment, capaRelatedRecord, capaNumberSequence)
- [ ] `npx drizzle-kit push` succeeds
- [ ] Server starts without errors

### After CAPA-DB-2
- [ ] 4 more tables (capaD0Emergency, capaD1TeamDetail, capaD2Problem, capaD3Containment)
- [ ] Relations to capa established
- [ ] Seed creates D0-D3 data

### After CAPA-DB-3
- [ ] 4 more tables (capaD4RootCause, capaD4RootCauseCandidate, capaD5CorrectiveAction, capaD6Validation)
- [ ] 5-Why and Fishbone JSON structures work
- [ ] Seed creates D4-D6 data

### After CAPA-DB-4
- [ ] 4 more tables (capaD7Preventive, capaD8Closure, capaAuditLog, capaMetricSnapshot)
- [ ] Audit log hash chain works
- [ ] All 3 sample CAPAs complete with full 8D data
- [ ] Total: 18 new tables

### After CAPA-API-1
- [ ] Core CAPA CRUD works
- [ ] Team management works
- [ ] D0-D4 endpoints work
- [ ] Discipline completion validation works

### After CAPA-API-2
- [ ] D5-D8 endpoints work
- [ ] Closure flow works
- [ ] Analytics endpoints return data
- [ ] Total: ~95 endpoints

### After CAPA-UI-1
- [ ] Dashboard renders with metrics
- [ ] List page filters and paginates
- [ ] Create form works
- [ ] D0-D4 forms save data

### After CAPA-UI-2
- [ ] D5-D8 forms save data
- [ ] Attachments upload/download
- [ ] Audit trail displays
- [ ] Closure workflow works

### After CAPA-UI-3
- [ ] Analytics charts render
- [ ] Pareto analysis works
- [ ] Reports generate
- [ ] Export creates files

### After CAPA-TEST
- [ ] ~56 unit tests pass
- [ ] ~96 integration tests pass
- [ ] ~25 tenancy tests pass
- [ ] ~15 E2E tests pass
- [ ] Full 8D journey test passes

---

## Database Summary

### New Tables (18 total)

**Core (6 tables):**
1. `capa` - Main CAPA record
2. `capaTeamMember` - Team composition
3. `capaSource` - Source tracking
4. `capaAttachment` - Evidence/files
5. `capaRelatedRecord` - Links to other entities
6. `capaNumberSequence` - Auto-numbering

**D0-D3 (4 tables):**
7. `capaD0Emergency` - Emergency response
8. `capaD1TeamDetail` - Team formation details
9. `capaD2Problem` - Is/Is Not analysis
10. `capaD3Containment` - Interim containment

**D4-D6 (4 tables):**
11. `capaD4RootCause` - Root cause analysis
12. `capaD4RootCauseCandidate` - Candidate tracking
13. `capaD5CorrectiveAction` - Permanent actions
14. `capaD6Validation` - Implementation validation

**D7-D8 + Audit (4 tables):**
15. `capaD7Preventive` - Preventive actions
16. `capaD8Closure` - Closure criteria
17. `capaAuditLog` - Immutable audit trail
18. `capaMetricSnapshot` - Analytics snapshots

---

## API Summary

### Endpoint Count (~95)

**Core CAPA (15):** CRUD, advance, hold, resume, dashboard
**Team (5):** Add, update, remove, list
**Source (3):** Add, list, delete
**Attachments (4):** Upload, download, list, delete
**Related (3):** Link, list, delete
**D0 (6):** Get, update, add action, complete, verify
**D1 (5):** Get, update, add meeting, approve resources, complete
**D2 (6):** Get, update, Is/Is Not, verify, data points, complete
**D3 (8):** Get, update, add action, verify, sort results, effectiveness, complete
**D4 (9):** Get, update, 5-why, fishbone, candidates, verify occurrence/escape, complete
**D5 (7):** Get, update, add action, alternatives, risk, approve, complete
**D6 (8):** Get, update, log, implement, validate, effectiveness, remove containment, complete
**D7 (6):** Get, update, add action, deployment, lesson learned, complete
**D8 (8):** Get, update, criteria, recognition, metrics, approve, close, reopen
**Audit (4):** List, filter, verify chain
**Analytics (7):** Summary, by-status, pareto, trends, team, snapshots

---

## UI Summary

### Pages (12)

1. `/capa/dashboard` - Dashboard with metrics
2. `/capa` - CAPA list
3. `/capa/new` - Create CAPA
4. `/capa/:id` - CAPA detail with tabs
5. `/capa/:id/audit-log` - Full audit trail
6. `/capa/analytics` - Analytics dashboard
7. `/capa/analytics/pareto` - Pareto analysis
8. `/capa/analytics/trends` - Trend analysis
9. `/capa/analytics/team` - Team performance
10. `/capa/analytics/snapshots` - Metric comparison
11. `/capa/reports` - Report generation
12. `/capa/export` - Data export

---

## Test Summary

### Test Count (~192)

**Unit (56):**
- CAPA number generation (5)
- Status transitions (10)
- Discipline completion (15)
- Team constraints (8)
- Audit hash chain (5)
- Action priority (5)
- Metrics calculation (8)

**Integration (96):**
- CAPA CRUD (15)
- Team management (10)
- Attachments (8)
- D0-D4 (25)
- D5-D8 (20)
- Audit log (8)
- Analytics (10)

**Tenancy (25):**
- CAPA isolation
- Discipline isolation
- Attachment isolation
- Analytics isolation

**E2E (15):**
- Dashboard
- Create CAPA
- Navigate disciplines
- Add team
- Upload attachment
- Complete disciplines
- Analytics
- Export
- Full 8D journey

---

## Success Criteria

✅ All 18 tables created with proper relations
✅ All ~95 API endpoints working
✅ All 12 UI pages rendering correctly
✅ ~192 tests passing
✅ Full 8D workflow functional from creation to closure
✅ Analytics and reporting working
✅ Multi-tenancy isolation verified
✅ Audit trail tamper-evident

---

## Execution Commands

```bash
# Phase 1: Database
# For each CAPA-DB-{1,2,3,4}.md:
# Run Claude Code with the agent file
# Verify: npx drizzle-kit push && npm run dev && npm run seed

# Phase 2: API
# For each CAPA-API-{1,2}.md:
# Run Claude Code with the agent file
# Verify: npm run dev && curl tests

# Phase 3: UI
# For each CAPA-UI-{1,2,3}.md:
# Run Claude Code with the agent file
# Verify: npm run dev && browser test

# Phase 4: Testing
# Run CAPA-TEST.md
# Verify: npm test && npm run test:e2e
```

---

## Rollback Plan

If issues occur:
1. Git stash/revert changes
2. Check validation gates
3. Fix issues in specific agent
4. Re-run from that agent forward

---

## Post-Implementation

After all agents complete:
1. Run full test suite
2. Manual QA of 8D workflow
3. Performance testing
4. Documentation update
5. Demo to stakeholders
