# AGENT-API CONTEXT: Document Control Module
## Routes & Business Logic (REFINED v2)

---

## YOUR ROLE
You are AGENT-API. Your job is to add Document Control API endpoints and business logic to the existing PFMEA Suite.

## CRITICAL RULES
1. **APPEND ONLY** — Add new routes at the end of routes.ts. Never reorganize existing endpoints.
2. **ONLY MODIFY** this file:
   - `server/routes.ts` — Add new endpoint handlers after line 877
3. **DO NOT TOUCH**: schema.ts, storage.ts, seed.ts, client/ files, test files
4. Output **complete implementations**, not snippets.

## PREREQUISITES
AGENT-DB has already completed:
- Schema tables: document, documentRevision, documentDistribution, documentReview, documentLink
- Storage methods: getDocuments, createDocument, getDocumentRevisions, etc.
- Types: Document, InsertDocument, DocumentRevision, etc.

---

## EXISTING ROUTE PATTERN (from routes.ts) — FOLLOW EXACTLY

### List Endpoint
```typescript
app.get("/api/documents", async (req, res) => {
  try {
    const { type, status, category, search } = req.query;
    const documents = await storage.getDocuments({
      type: type as string | undefined,
      status: status as string | undefined,
      category: category as string | undefined,
      search: search as string | undefined,
    });
    res.json(documents);
  } catch (error) {
    console.error("Error fetching documents:", error);
    res.status(500).json({ error: "Failed to fetch documents" });
  }
});
```

### Get By ID Endpoint
```typescript
app.get("/api/documents/:id", async (req, res) => {
  try {
    const document = await storage.getDocumentById(req.params.id);
    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }
    res.json(document);
  } catch (error) {
    console.error("Error fetching document:", error);
    res.status(500).json({ error: "Failed to fetch document" });
  }
});
```

### Create with Zod Validation
```typescript
app.post("/api/documents", async (req, res) => {
  try {
    const validatedData = insertDocumentSchema.parse(req.body);
    const newDocument = await storage.createDocument(validatedData);
    res.status(201).json(newDocument);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = fromError(error);
      return res.status(400).json({ error: validationError.toString() });
    }
    console.error("Error creating document:", error);
    res.status(500).json({ error: "Failed to create document" });
  }
});
```

### Update Endpoint
```typescript
app.patch("/api/documents/:id", async (req, res) => {
  try {
    const updated = await storage.updateDocument(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: "Document not found" });
    }
    res.json(updated);
  } catch (error) {
    console.error("Error updating document:", error);
    res.status(500).json({ error: "Failed to update document" });
  }
});
```

---

## IMPORTS TO ADD (at top of routes.ts, add to existing imports)

```typescript
import {
  // ... existing imports ...
  insertDocumentSchema,
  insertDocumentRevisionSchema,
  insertDocumentDistributionSchema,
  insertDocumentReviewSchema,
  insertDocumentLinkSchema,
} from "@shared/schema";
```

---

## ENDPOINTS TO CREATE (25 total)

### Documents CRUD (5 endpoints)
```
GET    /api/documents                         # List all, supports ?type=&status=&category=&search=
GET    /api/documents/:id                     # Get by ID
POST   /api/documents                         # Create new document (starts at Rev A, draft)
PATCH  /api/documents/:id                     # Update document metadata
DELETE /api/documents/:id                     # Delete document (cascade deletes related records)
```

### Revisions (4 endpoints)
```
GET    /api/documents/:id/revisions           # Revision history for document
POST   /api/documents/:id/revisions           # Create new revision (auto-increment letter)
GET    /api/document-revisions/:id            # Get specific revision
PATCH  /api/document-revisions/:id            # Update revision (draft only)
```

### Workflow Actions (4 endpoints)
```
POST   /api/documents/:id/submit-review       # draft → review
POST   /api/documents/:id/approve             # review → effective (auto-supersedes previous)
POST   /api/documents/:id/reject              # review → draft (with comments)
POST   /api/documents/:id/obsolete            # effective → obsolete
```

### Distribution (3 endpoints)
```
GET    /api/documents/:id/distributions       # List distributions
POST   /api/documents/:id/distribute          # Create distribution records (body: { recipients: [...] })
POST   /api/document-distributions/:id/acknowledge  # Mark as acknowledged
```

### Reviews - Periodic (4 endpoints)
```
GET    /api/document-reviews                  # All pending reviews
GET    /api/document-reviews/overdue          # Reviews past due date
GET    /api/documents/:id/reviews             # Reviews for specific doc
POST   /api/documents/:id/reviews             # Create review request
PATCH  /api/document-reviews/:id              # Complete/update review
```

### Links (3 endpoints)
```
GET    /api/documents/:id/links               # Cross-references
POST   /api/document-links                    # Create link
DELETE /api/document-links/:id                # Remove link
```

### Metrics (1 endpoint)
```
GET    /api/documents/metrics                 # Dashboard data
```

---

## BUSINESS LOGIC IMPLEMENTATION

### 1. Auto-Increment Revision Letter

Implement this helper function in routes.ts:

```typescript
function getNextRevisionLetter(currentRev: string): string {
  // Handle edge cases
  if (!currentRev || currentRev === '-') return 'A';
  
  // Single letter: A → B → ... → Z
  if (currentRev.length === 1) {
    if (currentRev === 'Z') return 'AA';
    return String.fromCharCode(currentRev.charCodeAt(0) + 1);
  }
  
  // Double letter: AA → AB → ... → AZ → BA → ... → ZZ
  if (currentRev.length === 2) {
    const first = currentRev.charAt(0);
    const second = currentRev.charAt(1);
    
    if (second === 'Z') {
      if (first === 'Z') return 'AAA'; // Overflow to triple letter
      return String.fromCharCode(first.charCodeAt(0) + 1) + 'A';
    }
    return first + String.fromCharCode(second.charCodeAt(0) + 1);
  }
  
  // Fallback for unexpected formats
  return currentRev + '-1';
}
```

### 2. Workflow State Machine Validation

```typescript
function validateTransition(currentStatus: string, targetStatus: string): { valid: boolean; error?: string } {
  const validTransitions: Record<string, string[]> = {
    'draft': ['review'],
    'review': ['effective', 'draft'],  // Can approve (→effective) or reject (→draft)
    'effective': ['obsolete'],
    'superseded': [],  // Terminal state - no transitions
    'obsolete': [],    // Terminal state - no transitions
  };
  
  const allowed = validTransitions[currentStatus] || [];
  if (!allowed.includes(targetStatus)) {
    return { 
      valid: false, 
      error: `Invalid transition from ${currentStatus} to ${targetStatus}. Allowed: ${allowed.join(', ') || 'none'}` 
    };
  }
  return { valid: true };
}
```

### 3. Submit for Review (draft → review)

```typescript
app.post("/api/documents/:id/submit-review", async (req, res) => {
  try {
    const document = await storage.getDocumentById(req.params.id);
    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }
    
    // Validate transition
    const transition = validateTransition(document.status, 'review');
    if (!transition.valid) {
      return res.status(400).json({ error: transition.error });
    }
    
    // Validate required fields for review
    if (!document.owner) {
      return res.status(400).json({ error: "Document must have an owner before submitting for review" });
    }
    
    const updated = await storage.updateDocument(req.params.id, { status: 'review' as any });
    res.json(updated);
  } catch (error) {
    console.error("Error submitting for review:", error);
    res.status(500).json({ error: "Failed to submit for review" });
  }
});
```

### 4. Approve (review → effective)

When approving, you must:
1. Update document status to 'effective'
2. Update current revision status to 'effective'
3. Set effectiveDate on document and revision
4. Calculate next reviewDueDate
5. Auto-supersede previous effective revision (if exists)

```typescript
app.post("/api/documents/:id/approve", async (req, res) => {
  try {
    const { approverName } = req.body;
    if (!approverName) {
      return res.status(400).json({ error: "approverName is required" });
    }
    
    const document = await storage.getDocumentById(req.params.id);
    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }
    
    // Validate transition
    const transition = validateTransition(document.status, 'effective');
    if (!transition.valid) {
      return res.status(400).json({ error: transition.error });
    }
    
    const now = new Date();
    const reviewDueDate = new Date(now);
    reviewDueDate.setDate(reviewDueDate.getDate() + (document.reviewCycleDays || 365));
    
    // Get current revision (the one being approved)
    const revisions = await storage.getDocumentRevisions(req.params.id);
    const currentRevision = revisions.find(r => r.rev === document.currentRev && r.status === 'review');
    
    // Get previous effective revision (to supersede)
    const previousEffective = revisions.find(r => r.status === 'effective');
    
    // Supersede previous revision if exists
    if (previousEffective) {
      await storage.updateRevision(previousEffective.id, {
        status: 'superseded' as any,
        supersededDate: now,
      });
    }
    
    // Update current revision to effective
    if (currentRevision) {
      await storage.updateRevision(currentRevision.id, {
        status: 'effective' as any,
        approvedBy: approverName,
        approvedAt: now,
        effectiveDate: now,
      });
    }
    
    // Update document
    const updated = await storage.updateDocument(req.params.id, {
      status: 'effective' as any,
      effectiveDate: now,
      reviewDueDate,
    });
    
    res.json(updated);
  } catch (error) {
    console.error("Error approving document:", error);
    res.status(500).json({ error: "Failed to approve document" });
  }
});
```

### 5. Reject (review → draft)

```typescript
app.post("/api/documents/:id/reject", async (req, res) => {
  try {
    const { comments } = req.body;
    if (!comments) {
      return res.status(400).json({ error: "comments are required when rejecting" });
    }
    
    const document = await storage.getDocumentById(req.params.id);
    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }
    
    // Validate transition
    const transition = validateTransition(document.status, 'draft');
    if (!transition.valid) {
      return res.status(400).json({ error: transition.error });
    }
    
    // Get current revision and update it back to draft
    const revisions = await storage.getDocumentRevisions(req.params.id);
    const currentRevision = revisions.find(r => r.rev === document.currentRev && r.status === 'review');
    
    if (currentRevision) {
      await storage.updateRevision(currentRevision.id, {
        status: 'draft' as any,
        // Store rejection comments in changeDescription
        changeDescription: currentRevision.changeDescription + ` [REJECTED: ${comments}]`,
      });
    }
    
    const updated = await storage.updateDocument(req.params.id, { status: 'draft' as any });
    res.json({ ...updated, rejectionComments: comments });
  } catch (error) {
    console.error("Error rejecting document:", error);
    res.status(500).json({ error: "Failed to reject document" });
  }
});
```

### 6. Obsolete (effective → obsolete)

```typescript
app.post("/api/documents/:id/obsolete", async (req, res) => {
  try {
    const document = await storage.getDocumentById(req.params.id);
    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }
    
    const transition = validateTransition(document.status, 'obsolete');
    if (!transition.valid) {
      return res.status(400).json({ error: transition.error });
    }
    
    // Mark current revision as obsolete too
    const revisions = await storage.getDocumentRevisions(req.params.id);
    const currentRevision = revisions.find(r => r.rev === document.currentRev && r.status === 'effective');
    if (currentRevision) {
      await storage.updateRevision(currentRevision.id, { status: 'obsolete' as any });
    }
    
    const updated = await storage.updateDocument(req.params.id, { status: 'obsolete' as any });
    res.json(updated);
  } catch (error) {
    console.error("Error marking document obsolete:", error);
    res.status(500).json({ error: "Failed to mark document obsolete" });
  }
});
```

### 7. Create New Revision

```typescript
app.post("/api/documents/:id/revisions", async (req, res) => {
  try {
    const document = await storage.getDocumentById(req.params.id);
    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }
    
    // Can only create new revision if current is effective
    if (document.status !== 'effective') {
      return res.status(400).json({ 
        error: `Cannot create new revision when document status is ${document.status}. Must be 'effective'.` 
      });
    }
    
    const nextRev = getNextRevisionLetter(document.currentRev);
    
    const validatedData = insertDocumentRevisionSchema.parse({
      documentId: req.params.id,
      rev: nextRev,
      changeDescription: req.body.changeDescription || 'New revision',
      status: 'draft',
      author: req.body.author || 'Unknown',
    });
    
    const newRevision = await storage.createRevision(validatedData);
    
    // Update document to point to new revision and set to draft
    await storage.updateDocument(req.params.id, {
      currentRev: nextRev,
      status: 'draft' as any,
    });
    
    res.status(201).json(newRevision);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = fromError(error);
      return res.status(400).json({ error: validationError.toString() });
    }
    console.error("Error creating revision:", error);
    res.status(500).json({ error: "Failed to create revision" });
  }
});
```

### 8. Distribute Document

```typescript
app.post("/api/documents/:id/distribute", async (req, res) => {
  try {
    const { recipients } = req.body; // Array of { recipientName, recipientRole?, method? }
    
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ error: "recipients array is required" });
    }
    
    const document = await storage.getDocumentById(req.params.id);
    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }
    
    // Get current effective revision
    const revisions = await storage.getDocumentRevisions(req.params.id);
    const currentRevision = revisions.find(r => r.rev === document.currentRev);
    
    if (!currentRevision) {
      return res.status(400).json({ error: "No current revision found" });
    }
    
    const distributions = [];
    for (const recipient of recipients) {
      const dist = await storage.createDistribution({
        documentId: req.params.id,
        revisionId: currentRevision.id,
        recipientName: recipient.recipientName,
        recipientRole: recipient.recipientRole,
        method: recipient.method || 'electronic',
      });
      distributions.push(dist);
    }
    
    res.status(201).json(distributions);
  } catch (error) {
    console.error("Error distributing document:", error);
    res.status(500).json({ error: "Failed to distribute document" });
  }
});
```

### 9. Metrics Endpoint

```typescript
app.get("/api/documents/metrics", async (req, res) => {
  try {
    const metrics = await storage.getDocumentMetrics();
    res.json(metrics);
  } catch (error) {
    console.error("Error fetching document metrics:", error);
    res.status(500).json({ error: "Failed to fetch document metrics" });
  }
});
```

---

## WORKFLOW STATE MACHINE DIAGRAM

```
         ┌──────────┐
         │  DRAFT   │◄──── reject (with comments)
         └────┬─────┘          ▲
              │ submit          │
              ▼                 │
         ┌──────────┐          │
         │  REVIEW  │──────────┘
         └────┬─────┘
              │ approve
              ▼
         ┌──────────┐
         │ EFFECTIVE│
         └────┬─────┘
              │ obsolete
              ▼
         ┌──────────┐
         │ OBSOLETE │
         └──────────┘
         
         ┌──────────┐
         │SUPERSEDED│ (auto-set when newer rev goes effective)
         └──────────┘
```

---

## ACCEPTANCE CRITERIA CHECKLIST

Before marking complete, verify:

- [ ] **All endpoints created (25 total):**
  - [ ] 5 document CRUD endpoints
  - [ ] 4 revision endpoints
  - [ ] 4 workflow action endpoints
  - [ ] 3 distribution endpoints  
  - [ ] 5 review endpoints
  - [ ] 3 link endpoints
  - [ ] 1 metrics endpoint

- [ ] **Business logic implemented:**
  - [ ] `getNextRevisionLetter()` function handles A→B→...→Z→AA→AB
  - [ ] `validateTransition()` function enforces state machine
  - [ ] Submit for review validates required fields
  - [ ] Approve auto-supersedes previous revision
  - [ ] Approve calculates next reviewDueDate
  - [ ] Reject requires comments
  - [ ] New revision only allowed from effective status

- [ ] **HTTP status codes correct:**
  - [ ] 200 for successful GET, PATCH
  - [ ] 201 for successful POST
  - [ ] 400 for validation errors and invalid transitions
  - [ ] 404 for not found
  - [ ] 500 for server errors

- [ ] **Validation:**
  - [ ] POST/PATCH use Zod schema validation
  - [ ] Invalid workflow transitions return 400

- [ ] **Commands succeed:**
  - [ ] Server starts without errors
  - [ ] GET /api/documents returns seed data
  - [ ] Create → Submit → Approve → Distribute cycle works
  - [ ] Reject with comments works
  - [ ] New revision increments letter correctly
