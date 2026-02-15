# AGENT-API-2: Workflow Engine, Distribution, Audit & Comments APIs

**Read RALPH_PATTERNS.md first. AGENT-API-1 must be complete.**

---

## Mission

Build API endpoints for:
- Workflow step actions (approve, reject, delegate)
- E-signature capture
- Document distribution and acknowledgment
- Print tracking
- Comments
- External document management
- Enhanced linking
- Audit log access

---

## Authentication & Authorization

**All endpoints require authentication via `requireAuth` middleware.**

Every route handler has access to:
- `req.auth.user` - Current authenticated user
- `req.orgId` - Current organization ID (for tenant scoping)

**Pattern for all endpoints:**
```typescript
app.get("/api/endpoint", requireAuth, async (req, res) => {
  // req.orgId is guaranteed to exist
  // Use req.orgId for all queries and creates
});
```

**Org Access Verification:**
When fetching a resource by ID, verify it belongs to the user's org:
```typescript
const resource = await storage.getResourceById(id);
if (!resource || resource.orgId !== req.orgId) {
  return res.status(404).json({ error: 'Not found' });
}
```

**Tenancy Rules for all endpoints below:**
- **List endpoints:** Filter by `req.orgId` (tenant isolation)
- **Create endpoints:** Set `orgId: req.orgId` on created record
- **Get/Update/Delete by ID:** Verify resource belongs to `req.orgId` (return 404 if not)

---

## Endpoints

### Workflow Actions

#### `GET /api/my/approvals`
Get current user's pending approval steps.

Response 200:
```json
[
  {
    "stepId": 1,
    "stepName": "Technical Review",
    "stepNumber": 2,
    "dueDate": "2024-02-15T00:00:00Z",
    "isOverdue": false,
    "document": {
      "id": 42,
      "docNumber": "WI-PROD-001",
      "title": "Assembly Work Instruction",
      "type": "work_instruction"
    },
    "workflow": {
      "instanceId": 10,
      "definitionName": "Standard Document Approval",
      "startedAt": "2024-02-10T08:00:00Z"
    },
    "previousStep": {
      "stepName": "Author Submission",
      "completedBy": "John Smith",
      "completedAt": "2024-02-10T09:00:00Z",
      "comments": "Ready for review"
    }
  }
]
```

---

#### `GET /api/my/approvals/history`
Get user's completed approval actions.

Query params:
- `limit` - Number of records (default 50)
- `offset` - Pagination offset

Response 200: Array of completed steps with document info

---

#### `POST /api/workflow-steps/:stepId/approve`
Approve a workflow step.

**Business Rules:**
1. Step must be assigned to current user
2. Step status must be `pending` or `in_progress`
3. If step requires signature, signature data must be provided
4. Update step: status='approved', actionTaken='approve', actionAt=now
5. Advance workflow to next step (or complete if last step)
6. Log access action: `approve`

Request:
```json
{
  "comments": "Reviewed and approved. No issues found.",
  "signature": {
    "meaning": "I approve this document for production use.",
    "password": "user-password-for-2fa"
  }
}
```

If signature required, capture full signature data:
```json
{
  "signerName": "Jane Smith",
  "signerId": "user-qm-001",
  "timestamp": "2024-02-10T14:30:00.000Z",
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "meaning": "I approve this document for production use.",
  "documentHash": "sha256:...",
  "revisionId": 42,
  "sessionId": "sess-abc123"
}
```

Response 200:
```json
{
  "step": {...updated step...},
  "workflowAdvanced": true,
  "nextStep": {...next step if any...},
  "workflowCompleted": false,
  "message": "Approved. Advanced to Quality Approval step."
}
```

If workflow completed:
```json
{
  "step": {...},
  "workflowAdvanced": true,
  "nextStep": null,
  "workflowCompleted": true,
  "message": "Approved. Workflow complete. Document is now effective."
}
```

Response 400: Step not in approvable state
Response 400: Signature required but not provided
Response 403: Not assigned to this step

---

#### `POST /api/workflow-steps/:stepId/reject`
Reject a workflow step.

**Business Rules:**
1. Step must be assigned to current user
2. Comments are REQUIRED for rejection
3. Update step: status='rejected', actionTaken='reject'
4. Update workflow instance: status='rejected'
5. Update document: status='draft' (sent back for revision)
6. Log access action: `reject`

Request:
```json
{
  "comments": "Section 3.2 contains incorrect tolerances. Please revise."
}
```

Response 200:
```json
{
  "step": {...},
  "message": "Rejected. Document returned to draft status for revision."
}
```

Response 400: Comments required
Response 403: Not assigned to this step

---

#### `POST /api/workflow-steps/:stepId/delegate`
Delegate step to another user.

**Business Rules:**
1. Step definition must allow delegation (canDelegate: true)
2. Step must be assigned to current user
3. Update current step: status='delegated', delegatedFrom=currentUser
4. Create new step for delegatee with same stepNumber
5. Log access action: `delegate`

Request:
```json
{
  "delegateTo": "user-456",
  "reason": "On vacation until Feb 20. Delegating to backup reviewer."
}
```

Response 200:
```json
{
  "originalStep": {...updated with delegated status...},
  "newStep": {...new step assigned to delegatee...},
  "message": "Delegated to Jane Doe."
}
```

Response 400: Delegation not allowed for this step
Response 403: Not assigned to this step

---

#### `POST /api/workflow-steps/:stepId/comment`
Add comment to workflow step (without taking action).

Request:
```json
{
  "content": "I have a question about section 2.1 before I can approve."
}
```

Response 201: Created comment linked to workflow step

---

### E-Signature Verification

#### `GET /api/signatures/:stepId/verify`
Verify signature integrity.

**Business Rules:**
1. Get the signatureData from the step
2. Recalculate documentHash from current document content
3. Compare with stored documentHash
4. If mismatch, document was modified after signing (INVALID)

Response 200:
```json
{
  "valid": true,
  "signature": {
    "signerName": "Jane Smith",
    "timestamp": "2024-02-10T14:30:00Z",
    "meaning": "I approve this document..."
  },
  "documentHashMatch": true,
  "message": "Signature is valid. Document has not been modified since signing."
}
```

or if invalid:
```json
{
  "valid": false,
  "signature": {...},
  "documentHashMatch": false,
  "message": "WARNING: Document hash mismatch. Document may have been modified after signing."
}
```

---

#### `GET /api/documents/:documentId/signatures`
Get all signatures on a document.

Response 200:
```json
[
  {
    "stepId": 3,
    "stepName": "Quality Approval",
    "signerName": "Jane Smith",
    "signerId": "user-qm-001",
    "timestamp": "2024-02-10T14:30:00Z",
    "meaning": "I approve this document for production use.",
    "valid": true
  }
]
```

---

### Distribution

#### `GET /api/distribution-lists`
List all distribution lists.

Query: `status` - Filter by active/inactive

Response 200: Array of DistributionList

---

#### `POST /api/distribution-lists`
Create distribution list.

Response 201: Created list

---

#### `PATCH /api/distribution-lists/:id`
Update distribution list.

Response 200: Updated list

---

#### `DELETE /api/distribution-lists/:id`
Delete (or deactivate) distribution list.

Response 204: Deleted

---

#### `POST /api/documents/:documentId/distribute`
Distribute document to recipients.

**Business Rules:**
1. Document must be in `effective` status
2. Resolve recipients from distribution list (or ad-hoc list)
3. For each recipient:
   - Create documentDistributionRecord
   - Set acknowledgmentDueDate based on list settings
   - Generate watermarked PDF if watermarkApplied
4. Log access action: `distribute`

Request:
```json
{
  "distributionListId": 1,
  "additionalRecipients": [
    {"userId": "user-789", "name": "Bob Wilson", "email": "bob@example.com"}
  ],
  "comments": "New revision effective immediately. Please acknowledge.",
  "distributedBy": "user-123"
}
```

Response 201:
```json
{
  "distributionCount": 12,
  "records": [...created distribution records...],
  "message": "Distributed to 12 recipients. Acknowledgment due in 7 days."
}
```

Response 400: Document not effective

---

#### `GET /api/documents/:documentId/distributions`
Get distribution history for document.

Response 200: Array of DocumentDistributionRecord with recipient info

---

#### `GET /api/my/acknowledgments`
Get current user's pending acknowledgments.

Response 200:
```json
[
  {
    "id": 1,
    "document": {
      "id": 42,
      "docNumber": "WI-PROD-001",
      "title": "Assembly Work Instruction"
    },
    "distributedAt": "2024-02-10T08:00:00Z",
    "acknowledgmentDueDate": "2024-02-17T08:00:00Z",
    "isOverdue": false
  }
]
```

---

#### `POST /api/distributions/:id/acknowledge`
Acknowledge receipt of document.

**Business Rules:**
1. Distribution must be for current user
2. Must not already be acknowledged
3. Update: acknowledgedAt=now, acknowledgmentMethod, acknowledgmentIp
4. Log access action: `acknowledge`

Request:
```json
{
  "method": "click",
  "comment": "Read and understood."
}
```

Response 200: Updated distribution record

---

#### `POST /api/documents/:documentId/recall`
Recall a distributed document.

**Business Rules:**
1. Create recall notice for all active distributions
2. Update all distribution records: recalledAt, recalledBy, recallReason, status='recalled'
3. Log access action: `recall`

Request:
```json
{
  "reason": "Error found in section 4. Revised document coming.",
  "recalledBy": "user-123"
}
```

Response 200:
```json
{
  "recalledCount": 12,
  "message": "Recalled from 12 recipients."
}
```

---

### Print Tracking

#### `POST /api/documents/:documentId/print`
Record a print job.

**Business Rules:**
1. Get next copy number(s) for document
2. Create print log with copy numbers
3. Generate watermarked PDF for printing
4. Log access action: `print`

Request:
```json
{
  "copies": 2,
  "purpose": "Production floor reference",
  "printerName": "HP-Floor-1",
  "locations": [
    {"location": "Production Floor - Station 3", "holder": "John Smith"},
    {"location": "QC Lab", "holder": "Jane Doe"}
  ]
}
```

Response 201:
```json
{
  "printLog": {...},
  "copyNumbers": [1, 2],
  "watermarkedFileUrl": "/api/document-files/123/download-watermarked"
}
```

---

#### `GET /api/documents/:documentId/print-logs`
Get print history.

Response 200: Array of DocumentPrintLog

---

#### `POST /api/print-logs/:id/recall-copies`
Mark printed copies as recalled.

Request:
```json
{
  "copyNumbers": [1, 2],
  "verifiedBy": "user-123"
}
```

Response 200: Updated print log

---

### Comments

#### `GET /api/documents/:documentId/comments`
Get all comments on document.

Query: `includeDeleted` - Include soft-deleted comments

Response 200: Array of DocumentComment with threading

---

#### `POST /api/documents/:documentId/comments`
Add comment.

Request:
```json
{
  "content": "Should we update the tolerance in section 3?",
  "commentType": "question",
  "parentCommentId": null,
  "pageNumber": 3,
  "positionX": 45.5,
  "positionY": 67.2,
  "highlightedText": "±0.05mm",
  "mentions": ["user-456"],
  "createdBy": "user-123"
}
```

Response 201: Created comment

---

#### `PATCH /api/comments/:id`
Edit comment.

**Rules:** Only author can edit within 24 hours

Response 200: Updated comment

---

#### `DELETE /api/comments/:id`
Soft delete comment.

Response 204: Deleted (soft)

---

#### `POST /api/comments/:id/resolve`
Resolve comment thread.

Response 200: Resolved comment

---

### External Documents

#### `GET /api/external-documents`
List external documents.

Query: `source`, `status`, `hasUpdates`

Response 200: Array of ExternalDocument

---

#### `POST /api/external-documents`
Create external document reference.

Response 201: Created

---

#### `PATCH /api/external-documents/:id`
Update external document.

Response 200: Updated

---

#### `DELETE /api/external-documents/:id`
Delete external document reference.

Response 204: Deleted

---

#### `POST /api/external-documents/:id/check-update`
Mark that we've checked for updates.

Request:
```json
{
  "updateAvailable": true,
  "updateNotes": "New version 2024 released with updated testing requirements."
}
```

Response 200: Updated document

---

### Enhanced Links

#### `GET /api/documents/:documentId/links`
Get all links from this document.

Response 200:
```json
[
  {
    "id": 1,
    "targetType": "pfmea",
    "targetId": 42,
    "targetTitle": "PFMEA - Assembly Process",
    "linkType": "implements",
    "linkDescription": "Control plan implements this PFMEA",
    "verified": true,
    "broken": false
  }
]
```

---

#### `GET /api/links/to/:targetType/:targetId`
Get all documents linking TO this entity.

Response 200: Array of links with source document info

---

#### `POST /api/documents/:documentId/links`
Create link from document to target.

Request:
```json
{
  "targetType": "pfmea",
  "targetId": 42,
  "linkType": "implements",
  "linkDescription": "This control plan implements the PFMEA requirements",
  "bidirectional": false,
  "createdBy": "user-123"
}
```

Response 201: Created link (and reverse link if bidirectional)

---

#### `DELETE /api/links/:id`
Delete link.

Response 204: Deleted (including reverse link if bidirectional)

---

#### `POST /api/links/:id/verify`
Verify link is still valid.

Response 200: Updated link with verification timestamp

---

#### `GET /api/links/broken`
Get all broken links.

Response 200: Array of broken links

---

### Audit Log

#### `GET /api/documents/:documentId/access-log`
Get access log for document.

Query:
- `action` - Filter by action type
- `userId` - Filter by user
- `startDate`, `endDate` - Date range
- `limit` - Max records (default 100)

Response 200:
```json
[
  {
    "id": 1,
    "action": "view",
    "userId": "user-123",
    "userName": "John Smith",
    "timestamp": "2024-02-10T08:00:00Z",
    "ipAddress": "192.168.1.100",
    "details": {"durationSeconds": 45}
  }
]
```

---

#### `GET /api/documents/:documentId/access-log/stats`
Get access statistics.

Response 200:
```json
{
  "totalViews": 156,
  "uniqueViewers": 23,
  "downloads": 12,
  "prints": 5,
  "byAction": [
    {"action": "view", "count": 156},
    {"action": "download", "count": 12},
    {"action": "print", "count": 5}
  ],
  "byUser": [
    {"userId": "user-123", "userName": "John Smith", "count": 45},
    ...
  ]
}
```

---

#### `GET /api/audit-log`
Admin: Global audit log.

Query: Same as document-specific, plus `documentId`

Response 200: Array of access logs

---

#### `GET /api/audit-log/export`
Export audit log as CSV.

Query: Same filters as above

Response 200: CSV file download

---

## Workflow Engine Logic

### `advanceWorkflow(instanceId: number)`

```
1. Get current instance and definition
2. Get current step
3. Find next step in definition (currentStep + 1)
4. If no next step:
   - Mark instance as 'completed'
   - Mark document as 'effective'
   - Update revision effectiveDate
   - If definition.autoObsoletePrevious, mark previous revision as 'superseded'
   - Return {completed: true}
5. If next step exists:
   - Create new approvalWorkflowStep
   - Resolve assignee
   - Set dueDate based on step definition
   - Update instance.currentStep
   - Return {completed: false, nextStep}
```

### `computeDocumentHash(documentId: number, revisionId: number): string`

```
1. Get all files for this revision
2. Concatenate: docNumber + revisionLetter + file checksums (sorted)
3. Return SHA-256 of concatenation
```

This hash changes if:
- Document metadata changes
- Any file is added, removed, or modified
- Revision changes

---

## Validation Checklist

- [ ] Approve advances workflow correctly
- [ ] Reject sends document back to draft
- [ ] Delegate creates new step for delegatee
- [ ] Signature data includes all 21 CFR Part 11 fields
- [ ] Signature verification detects document modification
- [ ] Distribution creates records for all recipients
- [ ] Acknowledgment updates record and logs action
- [ ] Recall updates all active distributions
- [ ] Print tracking assigns sequential copy numbers
- [ ] Comments support threading and resolution
- [ ] External document CRUD works
- [ ] Links support bidirectional creation/deletion
- [ ] Audit log is immutable (no update/delete endpoints)
- [ ] All actions create access log entries
- [ ] Proper error codes
- [ ] No TypeScript errors
