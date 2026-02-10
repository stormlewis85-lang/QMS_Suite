# 🎯 RALPH MULTI-AGENT GAMEPLAN
## Document Control Module — The Guinea Pig

> **Purpose:** Establish the repeatable multi-agent workflow using Document Control as the first module, then replicate across CAPA/8D, MSA/Calibration, Audit Management, etc.
> **Date:** February 9, 2026
> **Status:** PFMEA Suite at 100% test pass rate (85/85 audit, 38/38 functional)
> **Environment:** Windows local (C:\Users\stlew\Documents\Projects\PFMEASuite\PFMEASuite)

---

## 1. WHY DOCUMENT CONTROL FIRST

| Criteria | Score | Reasoning |
|----------|-------|-----------|
| **No hard dependencies** | ✅ | Standalone module — doesn't require other modules |
| **Enhances FMEA** | ✅ | PPAP requires Docs+FMEA, so this unlocks PPAP next |
| **Moderate complexity** | ✅ | Not trivial (like a settings page), not massive (like CAPA) |
| **Clear IATF scope** | ✅ | IATF 16949 Clause 7.5 — well-defined requirements |
| **Tests existing patterns** | ✅ | Schema → Storage → Routes → UI pipeline is proven |
| **Guinea pig sized** | ✅ | ~4-6 new tables, ~15-20 endpoints, 2-3 pages — manageable for process validation |

---

## 2. DOCUMENT CONTROL MODULE SCOPE

### What It Does (IATF 16949 Clause 7.5)
- **Document Registry:** Master list of controlled documents (procedures, work instructions, forms, specs)
- **Version Control:** Check-out/check-in, revision history, supersession chain
- **Review & Approval Workflow:** Draft → Review → Approved → Effective (with e-signatures)
- **Distribution Control:** Who has which version, acknowledgment tracking
- **Periodic Review:** Scheduled review cycles, overdue alerts
- **Obsolescence:** Controlled retirement with archival
- **External Documents:** Customer specs, standards, regulatory docs tracked separately

### What It Doesn't Do (Keep It Bounded)
- ❌ Not a file storage system (links to external storage, doesn't replace SharePoint)
- ❌ Not a wiki (structured metadata, not free-form content)
- ❌ Not CAPA (that's a separate module)
- ❌ Not training records (that's a separate module, but Doc Control triggers "read & acknowledge")

---

## 3. THE RALPH AGENT STRUCTURE

```
┌─────────────────────────────────────────────────────────────────────┐
│                       RALPH (You + Claude)                         │
│  Coordinator: Architecture decisions, conflict resolution,         │
│  integration testing, merge review, context handoff                │
│  Tools: This chat (planning), Claude Code (execution)              │
└─────────────────────────────────────────────────────────────────────┘
         │
         ├── Phase 1 ──────────┬── Phase 2 ──────────┬── Phase 3 ────────┐
         ▼                     ▼                     ▼                   ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   AGENT-DB      │  │   AGENT-API     │  │   AGENT-UI      │  │   AGENT-TEST    │
│   Schema &      │  │   Routes &      │  │   Pages &       │  │   Tests &       │
│   Storage       │  │   Services      │  │   Components    │  │   Validation    │
│                 │  │                 │  │                 │  │                 │
│ Files:          │  │ Files:          │  │ Files:          │  │ Files:          │
│ • schema.ts     │  │ • routes.ts     │  │ • Documents.tsx │  │ • doc-control-  │
│ • storage.ts    │  │ • doc-control/  │  │ • DocDetail.tsx │  │   tests.ts      │
│ • seed.ts       │  │   service files │  │ • DocReview.tsx │  │ • doc-control-  │
│                 │  │                 │  │ • AppSidebar    │  │   audit.ts      │
│ Est: 3-4 hrs    │  │ Est: 4-6 hrs    │  │ Est: 6-8 hrs    │  │ Est: 2-3 hrs    │
└─────────────────┘  └─────────────────┘  └─────────────────┘  └─────────────────┘
```

### Why Sequential, Not Parallel (For Guinea Pig)
For this first module, we run **sequential phases** — each agent picks up where the last left off. Once we've validated the handoff protocol, future modules can parallelize more aggressively (e.g., UI agent starts on skeleton while API agent is still finishing services).

---

## 4. WHAT ALREADY EXISTS (DON'T REBUILD)

### Existing Infrastructure to Leverage
| Component | Location | Reuse How |
|-----------|----------|-----------|
| `statusEnum` | schema.ts line 7 | `['draft', 'review', 'effective', 'superseded', 'obsolete']` — perfect for doc lifecycle |
| `signature` table pattern | Used in PFMEA/CP | Same pattern: entityType + entityId + role + hash |
| `auditLog` pattern | Used across app | Same: entityType + action + actor + payload |
| `notifications` | Existing system | Trigger on status change, review due, approval needed |
| `StatusBadge` component | UI component | Already renders draft/review/effective/etc. |
| `DocumentControlPanel` | Existing component (605 lines) | May need enhancement but foundation exists |
| `SignaturesPanel` | Existing component (412 lines) | Reuse for approval workflow |
| Toast/Dialog/Form patterns | All shadcn/ui components | Proven patterns from Equipment, Controls, etc. |

### Existing API Patterns (53 endpoints)
Every new endpoint follows the same pattern from `routes.ts`:
```typescript
app.get("/api/documents", async (req, res) => {
  try {
    const results = await storage.getDocuments(filters);
    res.json(results);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch documents" });
  }
});
```

---

## 5. AGENT-DB: SCHEMA & STORAGE

### New Tables Needed

```
┌──────────────────────────────────────────────────────────────┐
│ document                                                      │
│──────────────────────────────────────────────────────────────│
│ id            UUID PK                                         │
│ docNumber     TEXT UNIQUE NOT NULL     (e.g., "WI-MOL-001")  │
│ title         TEXT NOT NULL                                   │
│ type          document_type_enum NOT NULL                     │
│ category      TEXT                     (e.g., "Molding")     │
│ department    TEXT                                            │
│ currentRev    TEXT NOT NULL             (e.g., "C")           │
│ status        status_enum NOT NULL DEFAULT 'draft'            │
│ owner         TEXT NOT NULL             (responsible person)  │
│ effectiveDate TIMESTAMP                                      │
│ reviewDueDate TIMESTAMP                (next periodic review)│
│ reviewCycleDays INTEGER DEFAULT 365                          │
│ retentionYears INTEGER DEFAULT 7                             │
│ description   TEXT                                           │
│ externalRef   TEXT                      (external doc link)  │
│ isExternal    BOOLEAN DEFAULT false                          │
│ tags          JSONB DEFAULT []                               │
│ createdAt     TIMESTAMP DEFAULT now()                        │
│ updatedAt     TIMESTAMP DEFAULT now()                        │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ document_revision                                             │
│──────────────────────────────────────────────────────────────│
│ id            UUID PK                                         │
│ documentId    UUID FK → document                              │
│ rev           TEXT NOT NULL             (e.g., "A", "B", "C")│
│ changeDescription TEXT NOT NULL                               │
│ status        status_enum NOT NULL DEFAULT 'draft'            │
│ author        TEXT NOT NULL                                   │
│ reviewedBy    TEXT                                            │
│ approvedBy    TEXT                                            │
│ approvedAt    TIMESTAMP                                      │
│ effectiveDate TIMESTAMP                                      │
│ supersededDate TIMESTAMP                                     │
│ contentHash   TEXT                      (integrity check)    │
│ attachmentUrl TEXT                      (link to actual file)│
│ createdAt     TIMESTAMP DEFAULT now()                        │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ document_distribution                                         │
│──────────────────────────────────────────────────────────────│
│ id            UUID PK                                         │
│ documentId    UUID FK → document                              │
│ revisionId    UUID FK → document_revision                     │
│ recipientName TEXT NOT NULL                                   │
│ recipientRole TEXT                                            │
│ distributedAt TIMESTAMP DEFAULT now()                         │
│ acknowledgedAt TIMESTAMP               (read receipt)        │
│ method        TEXT DEFAULT 'electronic' (electronic/hardcopy)│
│ copyNumber    INTEGER                  (for controlled copies)│
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ document_review                                               │
│──────────────────────────────────────────────────────────────│
│ id            UUID PK                                         │
│ documentId    UUID FK → document                              │
│ revisionId    UUID FK → document_revision                     │
│ reviewerName  TEXT NOT NULL                                   │
│ reviewerRole  TEXT                                            │
│ status        TEXT NOT NULL             (pending/approved/    │
│                                         rejected/deferred)   │
│ comments      TEXT                                           │
│ reviewedAt    TIMESTAMP                                      │
│ dueDate       TIMESTAMP                                      │
│ createdAt     TIMESTAMP DEFAULT now()                        │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ document_link                                                 │
│──────────────────────────────────────────────────────────────│
│ id            UUID PK                                         │
│ sourceDocId   UUID FK → document                              │
│ targetType    TEXT NOT NULL             (pfmea/control_plan/  │
│                                         process/part/document)│
│ targetId      UUID NOT NULL                                   │
│ linkType      TEXT NOT NULL             (references/supersedes/│
│                                         supports/derives_from)│
│ createdAt     TIMESTAMP DEFAULT now()                        │
└──────────────────────────────────────────────────────────────┘
```

### New Enum
```typescript
export const documentTypeEnum = pgEnum('document_type', [
  'procedure',           // SOPs, work procedures
  'work_instruction',    // Operator-level instructions
  'form',                // Blank forms/templates
  'specification',       // Engineering/material specs
  'standard',            // Industry standards (IATF, ISO)
  'drawing',             // Engineering drawings
  'customer_spec',       // Customer-specific requirements
  'external',            // External reference docs
  'policy',              // Quality policy docs
  'record',              // Filled forms, quality records
]);
```

### Storage Methods to Add
```typescript
// Documents CRUD
getDocuments(filters?: DocumentFilters): Promise<Document[]>
getDocumentById(id: string): Promise<Document | undefined>
getDocumentByNumber(docNumber: string): Promise<Document | undefined>
createDocument(data: InsertDocument): Promise<Document>
updateDocument(id: string, data: Partial<InsertDocument>): Promise<Document>
deleteDocument(id: string): Promise<void>

// Revisions
getDocumentRevisions(documentId: string): Promise<DocumentRevision[]>
getRevisionById(id: string): Promise<DocumentRevision | undefined>
createRevision(data: InsertDocumentRevision): Promise<DocumentRevision>
updateRevision(id: string, data: Partial<InsertDocumentRevision>): Promise<DocumentRevision>

// Distribution
getDistributions(documentId: string): Promise<DocumentDistribution[]>
createDistribution(data: InsertDocumentDistribution): Promise<DocumentDistribution>
acknowledgeDistribution(id: string): Promise<DocumentDistribution>

// Reviews
getReviews(documentId: string): Promise<DocumentReview[]>
getPendingReviews(): Promise<DocumentReview[]>
createReview(data: InsertDocumentReview): Promise<DocumentReview>
updateReview(id: string, data: Partial<InsertDocumentReview>): Promise<DocumentReview>

// Links
getDocumentLinks(documentId: string): Promise<DocumentLink[]>
createDocumentLink(data: InsertDocumentLink): Promise<DocumentLink>
deleteDocumentLink(id: string): Promise<void>

// Dashboard helpers
getDocumentMetrics(): Promise<DocumentMetrics>
getOverdueReviews(): Promise<Document[]>
getRecentChanges(limit?: number): Promise<DocumentRevision[]>
```

### AGENT-DB Context File
Save this as `AGENT_DB_CONTEXT.md` alongside the codebase:

```markdown
# AGENT-DB: Schema & Storage for Document Control

## YOUR JOB
Add Document Control tables to schema.ts and storage methods to storage.ts.
Add seed data to seed.ts for testing.

## FILES YOU MODIFY
1. shared/schema.ts — ADD tables/enums/relations/schemas (append, don't modify existing)
2. server/storage.ts — ADD methods to DatabaseStorage class (append, don't modify existing)
3. server/seed.ts — ADD Document Control seed data section

## FILES YOU DO NOT TOUCH
- routes.ts (AGENT-API owns this)
- Any client/ files (AGENT-UI owns this)
- Any test files (AGENT-TEST owns this)

## PATTERNS TO FOLLOW
- Study existing tables in schema.ts (processDef, pfmea, controlPlan patterns)
- Study existing storage methods (getEquipment, createPart, etc.)
- Use uuid PK, timestamp defaults, proper FK references
- Add relations to the relations section
- Add Zod insert schemas at the bottom
- Add to IStorage interface AND DatabaseStorage class

## ACCEPTANCE CRITERIA
- [ ] `npm run db:push` succeeds (schema compiles)
- [ ] TypeScript compiles with no errors
- [ ] Seed data creates 5+ sample documents with revisions
- [ ] All storage methods are callable (even if untested via API yet)
```

---

## 6. AGENT-API: ROUTES & SERVICES

### API Endpoints to Create

```
# Documents CRUD
GET    /api/documents                    # List all (with filters: type, status, category, search)
GET    /api/documents/:id                # Get document with current revision
POST   /api/documents                    # Create new document
PATCH  /api/documents/:id                # Update document metadata
DELETE /api/documents/:id                # Soft delete / archive

# Revisions
GET    /api/documents/:id/revisions      # List revision history
POST   /api/documents/:id/revisions      # Create new revision (auto-supersede)
GET    /api/document-revisions/:id       # Get revision detail
PATCH  /api/document-revisions/:id       # Update revision (draft only)

# Workflow
POST   /api/documents/:id/submit-review  # Submit for review (draft → review)
POST   /api/documents/:id/approve        # Approve (review → effective)
POST   /api/documents/:id/reject         # Reject (review → draft with comments)
POST   /api/documents/:id/obsolete       # Obsolete (effective → obsolete)

# Distribution
GET    /api/documents/:id/distributions  # Who has this doc
POST   /api/documents/:id/distribute     # Send to recipients
POST   /api/document-distributions/:id/acknowledge  # Read receipt

# Reviews (periodic)
GET    /api/document-reviews             # All pending reviews
GET    /api/documents/:id/reviews        # Reviews for specific doc
POST   /api/documents/:id/reviews        # Create review request
PATCH  /api/document-reviews/:id         # Complete review

# Links
GET    /api/documents/:id/links          # Cross-references
POST   /api/document-links               # Create link
DELETE /api/document-links/:id           # Remove link

# Dashboard
GET    /api/documents/metrics            # Counts by status/type, overdue reviews
```

### Service File: `server/services/document-control-service.ts`

```typescript
// Key business logic:
// 1. Auto-increment revision letter (A → B → C)
// 2. Auto-supersede previous revision when new one goes effective
// 3. Calculate next review due date from cycle
// 4. Validate workflow transitions (draft→review→effective only)
// 5. Trigger notifications on status change
// 6. Create audit log entries for all changes
// 7. Content hash verification for integrity
```

### AGENT-API Context File

```markdown
# AGENT-API: Routes & Services for Document Control

## YOUR JOB
Add API endpoints to routes.ts and create service file(s) for business logic.

## FILES YOU MODIFY
1. server/routes.ts — ADD endpoints at end of file (after existing endpoints)
2. server/services/document-control-service.ts — CREATE new service file

## FILES YOU DO NOT TOUCH
- schema.ts (AGENT-DB already completed this)
- storage.ts (AGENT-DB already completed this)
- Any client/ files (AGENT-UI owns this)
- Any test files (AGENT-TEST owns this)

## PATTERNS TO FOLLOW
- Study existing route handlers in routes.ts
- Use try/catch with consistent error responses
- Validate request body with Zod schemas from schema.ts
- Call storage methods, not raw DB queries
- Log to audit trail on mutations

## ACCEPTANCE CRITERIA
- [ ] All endpoints return proper HTTP status codes
- [ ] Create/Update validate input with Zod
- [ ] Workflow transitions enforce valid state machine
- [ ] Notifications triggered on status changes
- [ ] Audit log entries created for all mutations
```

---

## 7. AGENT-UI: PAGES & COMPONENTS

### Pages to Create

#### `Documents.tsx` (~800-1000 lines)
- **List View:** Table with columns: Doc #, Title, Type, Rev, Status, Owner, Review Due
- **Filters:** Type dropdown, Status dropdown, Search text, Category
- **Actions:** Create Document dialog, View/Edit link
- **Status indicators:** Overdue reviews highlighted in red
- **Follows pattern from:** `Equipment.tsx` (list + detail + dialog pattern)

#### `DocumentDetail.tsx` (~1000-1200 lines)
- **Header:** Doc number, title, type badge, status badge, owner
- **Tabs:**
  - **Current Revision:** Content/attachment, metadata
  - **Revision History:** Timeline of all revisions with diffs
  - **Distribution:** Who received, acknowledgment status
  - **Reviews:** Periodic review history and upcoming
  - **Links:** Cross-references to PFMEAs, Control Plans, parts, other docs
- **Actions:** Edit, New Revision, Submit for Review, Approve, Distribute
- **Follows pattern from:** PFMEA detail page (header + tabs + action buttons)

### Components to Create/Modify

#### New Components
- `DocumentForm.tsx` — Create/Edit dialog with doc type, metadata fields
- `RevisionTimeline.tsx` — Visual revision history (A → B → C)
- `DistributionPanel.tsx` — Recipients list with acknowledgment status
- `ReviewRequestDialog.tsx` — Submit for periodic review

#### Modify Existing
- `AppSidebar.tsx` — Add "Documents" nav item under a "Document Control" section
- `Dashboard.tsx` — Add document metrics card (total docs, overdue reviews, pending approvals)

### AGENT-UI Context File

```markdown
# AGENT-UI: Pages & Components for Document Control

## YOUR JOB
Create Document Control UI pages and components.

## FILES YOU CREATE
1. client/src/pages/Documents.tsx — Main document list page
2. client/src/pages/DocumentDetail.tsx — Document detail with tabs

## FILES YOU MODIFY
1. client/src/components/AppSidebar.tsx — Add nav item for Documents
2. client/src/App.tsx — Add route for /documents and /documents/:id
3. client/src/pages/Dashboard.tsx — Add document metrics card

## FILES YOU DO NOT TOUCH
- schema.ts (AGENT-DB owns)
- storage.ts (AGENT-DB owns)
- routes.ts (AGENT-API owns)
- test files (AGENT-TEST owns)

## PATTERNS TO FOLLOW (CRITICAL)
- Study Equipment.tsx (1259 lines) — best example of list+detail+dialog
- Study ControlPlans.tsx (680 lines) — tab-based detail view
- Use TanStack Query: useQuery for GET, useMutation for POST/PATCH/DELETE
- Use shadcn/ui: Dialog, Form, Table, Tabs, Badge, Button, Card
- Use react-hook-form + zodResolver for form validation
- Use useToast() for success/error feedback
- Import types from @shared/schema (Document, InsertDocument, etc.)
- Use queryClient.invalidateQueries on mutation success

## API BASE PATTERN
```typescript
const { data: documents, isLoading } = useQuery({
  queryKey: ["/api/documents"],
  queryFn: () => fetch("/api/documents").then(r => r.json()),
});
```

## ACCEPTANCE CRITERIA
- [ ] Documents page loads with list of documents
- [ ] Can create new document via dialog
- [ ] Can view document detail with tabs
- [ ] Can create new revision
- [ ] Status workflow buttons appear based on current status
- [ ] AppSidebar shows Documents link
- [ ] Dashboard shows document metrics
```

---

## 8. AGENT-TEST: VALIDATION

### Test File: `tests/document-control-tests.ts`

```typescript
// Test categories:
// 1. CRUD Operations (5 tests)
//    - Create document
//    - Get document by ID
//    - Update document
//    - List documents with filters
//    - Delete document

// 2. Revision Management (4 tests)
//    - Create revision
//    - Auto-supersede previous
//    - Revision history order
//    - Content hash integrity

// 3. Workflow State Machine (6 tests)
//    - Draft → Review (valid)
//    - Review → Effective (valid)
//    - Draft → Effective (INVALID - should fail)
//    - Effective → Obsolete (valid)
//    - Review → Rejected → Draft (valid)
//    - Can't edit non-draft revision

// 4. Distribution & Acknowledgment (3 tests)
//    - Distribute to recipients
//    - Acknowledge receipt
//    - Unacknowledged count

// 5. Periodic Review (3 tests)
//    - Create review request
//    - Overdue detection
//    - Review completion

// 6. Cross-Links (2 tests)
//    - Link doc to PFMEA
//    - Link doc to part

// 7. Dashboard Integration (2 tests)
//    - Document metrics endpoint
//    - Overdue reviews in dashboard
```

---

## 9. EXECUTION PROTOCOL

### Step-by-Step Workflow

```
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 1: PREP (You, in this chat)                                   │
│  □ Finalize this gameplan                                           │
│  □ Copy context files to project directory                          │
│  □ Ensure local env is running (port 3000, tests passing)           │
└──────────────────────────┬──────────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 2: AGENT-DB (Claude Code Session 1)                           │
│  Input: AGENT_DB_CONTEXT.md + schema.ts + storage.ts + seed.ts      │
│  Task: "Add Document Control schema, storage, and seed data"        │
│  Verify: npm run db:push succeeds, TypeScript compiles              │
│  Output: Modified schema.ts, storage.ts, seed.ts                    │
└──────────────────────────┬──────────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 3: VALIDATION GATE 1 (You)                                    │
│  □ Review schema changes (correct FKs, indexes, enums?)             │
│  □ Review storage methods (match interface pattern?)                │
│  □ Run: npm run db:push                                             │
│  □ Run: npx tsx server/index-dev.ts (does it start?)                │
│  □ Fix any issues before proceeding                                 │
└──────────────────────────┬──────────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 4: AGENT-API (Claude Code Session 2)                          │
│  Input: AGENT_API_CONTEXT.md + updated schema.ts + routes.ts        │
│  Task: "Add Document Control API endpoints and service"             │
│  Verify: Server starts, endpoints return data from seed             │
│  Output: Modified routes.ts, new service file                       │
└──────────────────────────┬──────────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 5: VALIDATION GATE 2 (You)                                    │
│  □ Server starts without errors                                     │
│  □ curl GET /api/documents returns seed data                        │
│  □ curl POST /api/documents creates new doc                         │
│  □ Workflow transitions work (submit → approve)                     │
│  □ Fix any issues before proceeding                                 │
└──────────────────────────┬──────────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 6: AGENT-UI (Claude Code Session 3)                           │
│  Input: AGENT_UI_CONTEXT.md + full codebase with working API        │
│  Task: "Create Document Control UI pages and components"            │
│  Verify: Pages render, CRUD works in browser                        │
│  Output: New page files, modified sidebar/routes                    │
└──────────────────────────┬──────────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 7: VALIDATION GATE 3 (You)                                    │
│  □ Navigate to /documents — list loads                              │
│  □ Create new document via dialog                                   │
│  □ View document detail page                                        │
│  □ Create revision, submit for review, approve                      │
│  □ Sidebar shows Documents link                                     │
│  □ Fix any issues before proceeding                                 │
└──────────────────────────┬──────────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 8: AGENT-TEST (Claude Code Session 4)                         │
│  Input: AGENT_TEST_CONTEXT.md + complete working module              │
│  Task: "Write comprehensive test suite for Document Control"        │
│  Verify: All tests pass                                             │
│  Output: tests/document-control-tests.ts                            │
└──────────────────────────┬──────────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 9: REGRESSION CHECK (You)                                     │
│  □ Run existing test suite: run-all-tests.ts (38/38 still pass?)    │
│  □ Run existing audit: full-system-audit.ts (85/85 still pass?)     │
│  □ Run new tests: document-control-tests.ts                         │
│  □ Manual smoke test of PFMEA/CP flows (nothing broken?)            │
└──────────────────────────┬──────────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 10: RETROSPECTIVE                                             │
│  □ What worked? What didn't?                                        │
│  □ How long did each phase take?                                    │
│  □ Where did agents need human intervention?                        │
│  □ Update this playbook for next module                             │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 10. CLAUDE CODE SESSION SETUP

### How to Launch Each Agent

Each agent gets its own Claude Code session with a focused context prompt. Here's the template:

```bash
# Navigate to project root
cd C:\Users\stlew\Documents\Projects\PFMEASuite\PFMEASuite

# Start Claude Code for a specific agent
# (Replace with actual Claude Code CLI command)
claude code
```

### Agent Prompt Template

When starting each Claude Code session, paste the relevant agent context file plus this preamble:

```
You are AGENT-[DB/API/UI/TEST] working on the PFMEA Suite's Document Control module.

CRITICAL RULES:
1. Only modify files listed in "FILES YOU MODIFY"
2. Only create files listed in "FILES YOU CREATE"  
3. NEVER modify files listed in "FILES YOU DO NOT TOUCH"
4. Output COMPLETE file implementations, not snippets
5. Follow existing patterns exactly — study the reference files
6. Test your work compiles before marking complete

CURRENT STATE:
- PFMEA Suite is at 100% test pass rate (85/85 audit, 38/38 functional)
- Tech stack: React 18, TypeScript, Express, Drizzle ORM, PostgreSQL (Neon), shadcn/ui
- All existing features work — DO NOT BREAK THEM

[Paste relevant AGENT_*_CONTEXT.md here]
```

---

## 11. GUARDRAILS & CONFLICT PREVENTION

### File Ownership Matrix

| File | AGENT-DB | AGENT-API | AGENT-UI | AGENT-TEST |
|------|----------|-----------|----------|------------|
| schema.ts | ✅ MODIFY | ❌ READ ONLY | ❌ READ ONLY | ❌ READ ONLY |
| storage.ts | ✅ MODIFY | ❌ READ ONLY | ❌ READ ONLY | ❌ READ ONLY |
| seed.ts | ✅ MODIFY | ❌ READ ONLY | ❌ READ ONLY | ❌ READ ONLY |
| routes.ts | ❌ READ ONLY | ✅ MODIFY | ❌ READ ONLY | ❌ READ ONLY |
| services/*.ts | ❌ | ✅ CREATE | ❌ READ ONLY | ❌ READ ONLY |
| pages/*.tsx | ❌ | ❌ | ✅ CREATE/MODIFY | ❌ READ ONLY |
| AppSidebar.tsx | ❌ | ❌ | ✅ MODIFY | ❌ |
| App.tsx | ❌ | ❌ | ✅ MODIFY | ❌ |
| tests/*.ts | ❌ | ❌ | ❌ | ✅ CREATE |

### Append-Only Rule
All agents APPEND to existing files — they never restructure, reorder, or refactor existing code. New code goes at the end of the relevant section.

### Naming Conventions
- Tables: `document`, `document_revision`, `document_distribution`, `document_review`, `document_link`
- Storage methods: `getDocuments`, `createDocument`, `getDocumentRevisions`, etc.
- API routes: `/api/documents/*`, `/api/document-revisions/*`, `/api/document-reviews/*`
- UI files: `Documents.tsx`, `DocumentDetail.tsx`
- Test file: `tests/document-control-tests.ts`

---

## 12. SCALING TO FUTURE MODULES

Once Document Control validates the workflow, apply the same pattern:

### Module Queue
| Priority | Module | Dependencies | Complexity |
|----------|--------|-------------|------------|
| P2 | PPAP Management | Docs + FMEA | High |
| P3 | CAPA / 8D | Standalone | High |
| P4 | MSA / Calibration | Standalone | Medium |
| P5 | Audit Management | Standalone | Medium |
| P6 | SPC | Standalone | Medium |
| P7 | NCR Management | Standalone | Medium |
| P8 | Supplier Quality | Standalone | High |

### What Changes After Guinea Pig
Based on the retrospective, we may:
- **Parallelize:** Run AGENT-DB and AGENT-UI skeleton simultaneously (UI builds mock data while DB is being built)
- **Combine agents:** If API is simple enough, merge DB+API into one agent
- **Add agents:** If UI is complex, split into list-page agent and detail-page agent
- **Shorten validation gates:** If agents are consistently clean, reduce manual checks

### Module Context Template
Each module gets the same set of files:
```
MODULE_CONTEXT/
├── AGENT_DB_CONTEXT.md      # Schema + Storage spec
├── AGENT_API_CONTEXT.md     # Routes + Services spec
├── AGENT_UI_CONTEXT.md      # Pages + Components spec
├── AGENT_TEST_CONTEXT.md    # Test cases spec
└── MODULE_REQUIREMENTS.md   # IATF clause, scope, acceptance criteria
```

---

## 13. TIMELINE ESTIMATE

| Phase | Duration | Cumulative |
|-------|----------|------------|
| Prep (this plan) | 1 hour | 1 hour |
| AGENT-DB + Gate 1 | 2-3 hours | 4 hours |
| AGENT-API + Gate 2 | 3-4 hours | 8 hours |
| AGENT-UI + Gate 3 | 4-6 hours | 14 hours |
| AGENT-TEST + Regression | 2-3 hours | 17 hours |
| Retrospective + Playbook update | 1 hour | 18 hours |

**Total: ~18 hours over 2-3 days**

After the guinea pig, each subsequent module should be **12-14 hours** as the workflow is proven and patterns are established.

---

## 14. SUCCESS CRITERIA

### Document Control Module Complete When:
- [ ] 5 new tables in schema.ts, all with relations and Zod schemas
- [ ] 15+ new storage methods in storage.ts  
- [ ] 20+ new API endpoints in routes.ts
- [ ] Document list page with filtering and search
- [ ] Document detail page with tabs (revisions, distribution, reviews, links)
- [ ] Create/Edit document workflow
- [ ] Revision management (create, supersede, history)
- [ ] Status workflow (draft → review → effective → obsolete)
- [ ] Distribution with acknowledgment tracking
- [ ] Periodic review scheduling and overdue alerts
- [ ] Cross-links to PFMEAs, Control Plans, Parts
- [ ] Sidebar navigation updated
- [ ] Dashboard metrics updated
- [ ] 25+ automated tests passing
- [ ] Zero regressions on existing test suites (38/38 + 85/85)

### Guinea Pig Workflow Validated When:
- [ ] All 4 agent phases completed without major rework
- [ ] File ownership prevented conflicts
- [ ] Context files provided sufficient guidance
- [ ] Validation gates caught issues early
- [ ] Total time within estimate (≤20 hours)
- [ ] Playbook updated with lessons learned
- [ ] Ready to clone pattern for CAPA module

---

*This document is the single source of truth for the Document Control module implementation via the Ralph multi-agent workflow. Update it after each phase completion.*
