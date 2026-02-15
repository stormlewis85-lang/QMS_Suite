# Document Control v2 - Ralph Orchestration Guide

## Overview

This is the execution guide for building Document Control v2 using the Ralph multi-agent system.

**Total Scope:**
- 13 new database tables
- ~85 storage methods
- ~60 API endpoints
- 8 new UI pages + components
- ~120 tests

**Estimated Time:** 40-50 hours across 7 agent phases

---

## Agent Files

| Agent | File | Focus | Est. Hours |
|-------|------|-------|------------|
| AGENT-DB-1 | `AGENT-DB-1.md` | Files, templates, workflows, checkout | 3-4h |
| AGENT-DB-2 | `AGENT-DB-2.md` | Distribution, audit, comments, links | 3-4h |
| AGENT-API-1 | `AGENT-API-1.md` | File upload/download, templates, checkout, workflow start | 4-5h |
| AGENT-API-2 | `AGENT-API-2.md` | Workflow actions, signatures, distribution, audit | 4-5h |
| AGENT-UI-1 | `AGENT-UI-1.md` | Document library, viewer, upload wizard | 6-8h |
| AGENT-UI-2 | `AGENT-UI-2.md` | Approvals, reviews, comparison, admin pages | 6-8h |
| AGENT-TEST | `AGENT-TEST.md` | Unit, integration, journey tests | 4-6h |

**Shared Context:** All agents read `RALPH_PATTERNS.md` first.

---

## Execution Sequence

### Phase 1: AGENT-DB-1
```bash
# In Claude Code, provide:
# 1. RALPH_PATTERNS.md content
# 2. AGENT-DB-1.md content
# 3. Ask Claude to execute

# Validation:
npx drizzle-kit push
npm run dev  # Server starts
# Check: 6 new tables exist
```

### Phase 2: AGENT-DB-2
```bash
# Prerequisite: Phase 1 complete
# Provide: RALPH_PATTERNS.md + AGENT-DB-2.md

# Validation:
npx drizzle-kit push
npm run dev
npm run seed
# Check: 7 more tables, seed data present
```

### Phase 3: AGENT-API-1
```bash
# Prerequisite: Phase 2 complete
# Provide: RALPH_PATTERNS.md + AGENT-API-1.md

# Validation:
npm run dev
# Test endpoints manually:
# - POST /api/documents/:id/files (upload)
# - GET /api/document-files/:id/download
# - POST /api/documents/:id/checkout
# - POST /api/documents/from-template
# - POST /api/documents/:id/start-workflow
```

### Phase 4: AGENT-API-2
```bash
# Prerequisite: Phase 3 complete
# Provide: RALPH_PATTERNS.md + AGENT-API-2.md

# Validation:
npm run dev
# Test endpoints:
# - POST /api/workflow-steps/:id/approve
# - POST /api/documents/:id/distribute
# - GET /api/documents/:id/access-log
# - POST /api/comments
```

### Phase 5: AGENT-UI-1
```bash
# Prerequisite: Phase 4 complete
# Provide: RALPH_PATTERNS.md + AGENT-UI-1.md

# Validation:
npm run dev
# Test in browser:
# - /documents loads
# - /documents/:id shows all tabs
# - Upload wizard works
# - Create from template works
```

### Phase 6: AGENT-UI-2
```bash
# Prerequisite: Phase 5 complete
# Provide: RALPH_PATTERNS.md + AGENT-UI-2.md

# Validation:
npm run dev
# Test in browser:
# - /approvals shows pending
# - /document-reviews shows calendar
# - /admin/workflows CRUD works
# - /admin/audit-log displays
```

### Phase 7: AGENT-TEST
```bash
# Prerequisite: Phase 6 complete
# Provide: RALPH_PATTERNS.md + AGENT-TEST.md

# Validation:
npm run test
# All tests pass
```

---

## File Ownership Matrix

| File | DB-1 | DB-2 | API-1 | API-2 | UI-1 | UI-2 | TEST |
|------|------|------|-------|-------|------|------|------|
| shared/schema.ts | ✓ | ✓ | | | | | |
| server/storage.ts | ✓ | ✓ | | | | | |
| server/seed.ts | ✓ | ✓ | | | | | |
| server/routes.ts | | | ✓ | ✓ | | | |
| client/src/pages/Documents.tsx | | | | | ✓ | | |
| client/src/pages/DocumentDetail.tsx | | | | | ✓ | | |
| client/src/pages/DocumentUpload.tsx | | | | | ✓ | | |
| client/src/pages/Approvals.tsx | | | | | | ✓ | |
| client/src/pages/DocumentReviews.tsx | | | | | | ✓ | |
| client/src/pages/admin/* | | | | | | ✓ | |
| tests/document-control-v2/* | | | | | | | ✓ |

---

## Critical Business Rules (All Agents Must Know)

### E-Signature (21 CFR Part 11)
Required fields:
- signerName, signerId
- timestamp (ISO 8601 UTC)
- ipAddress, userAgent, sessionId
- meaning (the statement being signed)
- documentHash (SHA-256 at time of signing)

### Document Status Flow
```
draft → review → effective → superseded
                          ↘ obsolete
```

### Workflow Step Status Flow
```
pending → in_progress → approved
                      ↘ rejected
        ↘ delegated
```

### Revision Letters
A → B → ... → Z → AA → AB → ... → AZ → BA → ...

### Checkout Rules
- Only one active checkout per document
- Must checkout to upload files (unless draft)
- Admin can force release

### Distribution Rules
- Only effective documents can be distributed
- Acknowledgment tracking per recipient
- Recall updates all active distributions

### Audit Log
- Immutable (no update/delete)
- Hash chain for tamper detection
- Log every access, download, print, workflow action

---

## Troubleshooting

### Schema push fails
```bash
# Check for syntax errors
npx tsc --noEmit

# Reset database (dev only)
dropdb pfmea_db && createdb pfmea_db
npx drizzle-kit push
```

### Server won't start
```bash
# Check for missing imports
npm run dev 2>&1 | grep "Cannot find"

# Check for circular dependencies
# Usually in schema.ts relations
```

### Tests fail
```bash
# Run specific test
npm test -- --grep "workflow"

# Check test database
# Tests should use separate DB or transactions
```

### UI doesn't load
```bash
# Check API is running
curl http://localhost:5000/api/documents

# Check browser console for errors
# Usually missing route registration in App.tsx
```

---

## Success Criteria

### Phase Complete Checklist

**After DB Phases:**
- [ ] All tables created
- [ ] All relations defined
- [ ] Seed data loads
- [ ] No TypeScript errors

**After API Phases:**
- [ ] All endpoints respond
- [ ] Proper error codes returned
- [ ] Access logs created for all actions
- [ ] Workflow engine advances correctly

**After UI Phases:**
- [ ] All pages render
- [ ] CRUD operations work
- [ ] Workflow actions work
- [ ] Navigation complete

**After Test Phase:**
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] All journey tests pass
- [ ] Coverage > 80%

---

## Post-Completion

After all phases complete:

1. **Manual QA** - Walk through complete journey manually
2. **Performance check** - Large document list, many files
3. **Security review** - Authorization on all endpoints
4. **Documentation** - Update user docs if needed
5. **Demo** - Show stakeholders the new capability

---

## Notes

- Each agent should complete fully before moving to next
- If agent gets stuck, provide more context from RALPH_PATTERNS.md
- Validation at each gate prevents cascading errors
- Keep this file updated with any discoveries during execution
