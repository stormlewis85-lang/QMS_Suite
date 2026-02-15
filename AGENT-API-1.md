# AGENT-API-1: File Management, Templates, Checkout & Workflow APIs

**Read RALPH_PATTERNS.md first. AGENT-DB-1 and AGENT-DB-2 must be complete.**

---

## Mission

Build API endpoints for:
- File upload, download, preview, watermarking
- Document template CRUD and "create from template"
- Document checkout/checkin/force-release
- Starting approval workflows

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

## Files to Modify

- `server/routes.ts` - Add all endpoints below

---

## Endpoints

### File Management

#### `GET /api/documents/:documentId/files`
List all files for a document.

Response 200:
```json
[
  {
    "id": 1,
    "fileName": "work-instruction.pdf",
    "originalName": "WI-PROD-001 Assembly.pdf",
    "fileType": "pdf",
    "mimeType": "application/pdf",
    "fileSize": 245678,
    "pageCount": 5,
    "virusScanStatus": "clean",
    "previewGenerated": 1,
    "uploadedBy": "user-123",
    "uploadedAt": "2024-02-10T08:00:00Z"
  }
]
```

---

#### `POST /api/documents/:documentId/files`
Upload file to document.

**Business Rules:**
1. Document must be in `draft` status OR checked out to current user
2. Compute SHA-256 checksum
3. Reject if duplicate checksum exists for this document
4. Store file (local filesystem for now: `/uploads/documents/{documentId}/{uuid}/{filename}`)
5. Create documentFile record with `virusScanStatus: 'pending'`
6. Log access action: `upload`

Request: `multipart/form-data` with `file` field

Response 201:
```json
{
  "id": 1,
  "fileName": "...",
  "checksumSha256": "...",
  "virusScanStatus": "pending",
  ...
}
```

Response 400: Document not in editable state
Response 409: Duplicate file (same checksum)

---

#### `GET /api/document-files/:id`
Get file metadata.

Response 200: Full documentFile object
Response 404: Not found

---

#### `GET /api/document-files/:id/download`
Download original file.

**Business Rules:**
1. Log access action: `download` with details `{watermarked: false}`
2. Return file with correct Content-Type and Content-Disposition

Response 200: File binary
Response 404: Not found

---

#### `GET /api/document-files/:id/download-watermarked`
Download file with watermark.

**Business Rules:**
1. Generate watermark text:
   ```
   CONTROLLED COPY
   Downloaded by: {userName}
   Date: {YYYY-MM-DD HH:mm}
   Doc: {docNumber} Rev {revision}
   ```
2. For PDFs: Use pdf-lib to add watermark to each page
3. For other files: Skip watermarking, return original with warning header
4. Log access action: `download` with details `{watermarked: true}`

Response 200: Watermarked file binary
Response 404: Not found

---

#### `GET /api/document-files/:id/preview`
Get preview thumbnail or first page.

Response 200: Image (PNG/JPEG) of first page
Response 404: Not found or preview not generated

---

#### `DELETE /api/document-files/:id`
Delete file.

**Business Rules:**
1. Document must be in `draft` status OR checked out to current user
2. Delete from storage
3. Delete database record
4. Log access action: `delete`

Response 204: Deleted
Response 400: Document not in editable state
Response 404: Not found

---

#### `GET /api/documents/search?q={text}`
Full-text search across document content.

**Business Rules:**
1. Search `extractedText` field in documentFile
2. Return matching documents (not files)

Response 200:
```json
[
  {
    "documentId": 1,
    "docNumber": "WI-PROD-001",
    "title": "Assembly Work Instruction",
    "matchingFiles": [
      {"fileId": 5, "snippet": "...matching text excerpt..."}
    ]
  }
]
```

---

### Document Templates

#### `GET /api/document-templates`
List templates.

Query params:
- `status` - Filter by status (active, draft, deprecated)
- `docType` - Filter by document type

Response 200: Array of DocumentTemplate

---

#### `GET /api/document-templates/:id`
Get template by ID.

Response 200: DocumentTemplate with related defaultWorkflow
Response 404: Not found

---

#### `POST /api/document-templates`
Create template.

Request:
```json
{
  "name": "Work Instruction Template",
  "code": "TMPL-WI-001",
  "docType": "work_instruction",
  "category": "Production",
  "department": "Manufacturing",
  "fieldMappings": [...],
  "defaultReviewCycleDays": 365,
  "createdBy": "user-123"
}
```

Response 201: Created template
Response 409: Duplicate code

---

#### `PATCH /api/document-templates/:id`
Update template.

Response 200: Updated template
Response 404: Not found

---

#### `DELETE /api/document-templates/:id`
Delete template.

**Business Rules:**
- Only delete if status is `draft`
- For active templates, set status to `deprecated` instead

Response 204: Deleted
Response 400: Cannot delete active template

---

#### `POST /api/document-templates/:id/activate`
Activate a draft template.

Response 200: Template with status: 'active'
Response 400: Already active or deprecated

---

#### `POST /api/documents/from-template`
Create new document from template.

**Business Rules:**
1. Get template
2. Process fieldMappings to auto-populate fields:
   - `auto_generate`: Generate doc number using format
   - `auto_increment`: Start at 'A' for revision
   - `current_date`: Today's date
   - `current_user`: Current user ID/name
   - `linked.{entity}.{field}`: Pull from linked entity (if linkedEntityId provided)
3. Create document in `draft` status
4. Create first revision (Rev A)
5. Apply defaultWorkflowId from template
6. Set reviewCycleDays from template

Request:
```json
{
  "templateId": 1,
  "title": "Assembly Work Instruction for Part XYZ",
  "linkedEntityType": "part",
  "linkedEntityId": 42,
  "createdBy": "user-123"
}
```

Response 201:
```json
{
  "document": {...},
  "revision": {...},
  "appliedFieldValues": {
    "doc_number": "WI-MFG-0042",
    "revision": "A",
    "effective_date": "2024-02-10",
    "part_number": "XYZ-123"
  }
}
```

---

### Document Checkout

#### `GET /api/documents/:documentId/checkout-status`
Get current checkout status.

Response 200:
```json
{
  "isCheckedOut": true,
  "checkout": {
    "id": 1,
    "checkedOutBy": "user-123",
    "checkedOutByName": "John Smith",
    "checkedOutAt": "2024-02-10T08:00:00Z",
    "expectedCheckin": "2024-02-17T08:00:00Z",
    "purpose": "Updating safety procedures"
  }
}
```
or
```json
{
  "isCheckedOut": false,
  "checkout": null
}
```

---

#### `POST /api/documents/:documentId/checkout`
Check out document for editing.

**Business Rules:**
1. Cannot checkout if already checked out by someone else
2. If already checked out by same user, return existing checkout
3. Cannot checkout if document status is `obsolete`
4. Set expectedCheckin to 7 days from now (default)
5. Log access action: `checkout`

Request:
```json
{
  "purpose": "Updating section 3 based on ECN-2024-001",
  "expectedCheckin": "2024-02-17T08:00:00Z"
}
```

Response 200: DocumentCheckout object
Response 400: Already checked out by another user
Response 400: Document is obsolete

---

#### `POST /api/documents/:documentId/checkin`
Check document back in.

**Business Rules:**
1. Must be checked out to current user (or admin can force)
2. Update checkout status to `checked_in`
3. Log access action: `checkin`

Request:
```json
{
  "comments": "Updated section 3, ready for review"
}
```

Response 200: Updated checkout record
Response 400: Not checked out
Response 403: Checked out to different user

---

#### `POST /api/documents/:documentId/force-release`
Admin: Force release a checkout.

**Business Rules:**
1. Requires admin/manager role (check in application)
2. Update checkout with forceReleasedBy, forceReleasedAt, forceReleaseReason
3. Log access action: `checkin` with details indicating force release

Request:
```json
{
  "reason": "User on extended leave, document needed for audit"
}
```

Response 200: Updated checkout
Response 400: Not checked out
Response 403: Not authorized

---

#### `GET /api/checkouts/my`
Get current user's active checkouts.

Response 200: Array of DocumentCheckout with document info

---

#### `GET /api/checkouts/all`
Admin: Get all active checkouts.

Response 200: Array of DocumentCheckout with document and user info

---

### Workflow Start

#### `POST /api/documents/:documentId/start-workflow`
Start approval workflow for a document.

**Business Rules:**
1. Document must be in `draft` status
2. Cannot start if workflow already active for this document
3. Get workflow definition:
   - If `workflowDefinitionId` provided, use that
   - Else if document has template with defaultWorkflowId, use that
   - Else find matching workflow by docType
4. Create approvalWorkflowInstance
5. Create first approvalWorkflowStep based on definition
6. Assign first step (resolve assignee based on assigneeType)
7. Update document status to `review`
8. Log access action: `submit`

Request:
```json
{
  "workflowDefinitionId": 1,
  "comments": "Ready for review",
  "initiatedBy": "user-123"
}
```

Response 201:
```json
{
  "workflowInstance": {...},
  "currentStep": {...},
  "message": "Workflow started. Assigned to John Smith for Technical Review."
}
```

Response 400: Document not in draft status
Response 400: Workflow already active
Response 404: No matching workflow definition

---

#### `GET /api/documents/:documentId/workflow`
Get current workflow status.

Response 200:
```json
{
  "hasActiveWorkflow": true,
  "instance": {
    "id": 1,
    "status": "active",
    "currentStep": 2,
    "startedAt": "...",
    "dueDate": "..."
  },
  "steps": [
    {
      "stepNumber": 1,
      "stepName": "Author Submission",
      "status": "approved",
      "assignedTo": "user-123",
      "actionAt": "..."
    },
    {
      "stepNumber": 2,
      "stepName": "Technical Review",
      "status": "pending",
      "assignedTo": "user-456",
      "dueDate": "..."
    },
    {
      "stepNumber": 3,
      "stepName": "Quality Approval",
      "status": "pending",
      "assignedTo": null,
      "dueDate": null
    }
  ],
  "definition": {
    "name": "Standard Document Approval",
    "totalSteps": 3
  }
}
```

or if no active workflow:
```json
{
  "hasActiveWorkflow": false,
  "instance": null,
  "steps": [],
  "definition": null,
  "history": [...previous completed workflows...]
}
```

---

## Helper Functions to Implement

### `generateDocNumber(format: string, context: object): string`
Process doc number format template.

Format tokens:
- `{department}` - context.department
- `{category}` - context.category
- `{seq:N}` - Next sequence number, zero-padded to N digits
- `{date:FORMAT}` - Current date in format
- `{year}` - Current 4-digit year

Example: `"WI-{department}-{seq:4}"` → `"WI-MFG-0042"`

---

### `computeFileChecksum(buffer: Buffer): string`
Return SHA-256 hex string.

---

### `resolveWorkflowAssignee(stepDef: object, context: object): string`
Determine who gets assigned based on assigneeType.

- `initiator` → context.initiatedBy
- `specific_user` → stepDef.assigneeId
- `role_based` → Query first user with stepDef.requiredRole (or leave null for any)
- `department_head` → Query department manager (or leave null)

For now, `role_based` and `department_head` can return null (assigned at runtime).

---

### `sanitizeFileName(name: string): string`
Remove special characters, spaces → underscores, lowercase.

---

## Access Logging

For every endpoint that accesses document content, create an access log entry:

```typescript
await storage.createDocumentAccessLog({
  documentId,
  revisionId,
  fileId, // if applicable
  userId: currentUser.id,
  userName: currentUser.name,
  userRole: currentUser.role,
  userDepartment: currentUser.department,
  action: 'view', // or download, upload, checkout, etc.
  actionDetails: JSON.stringify({...}),
  ipAddress: req.ip,
  userAgent: req.headers['user-agent'],
  sessionId: req.session?.id
});
```

---

## Validation Checklist

- [ ] File upload creates record and stores file
- [ ] File download returns correct binary with headers
- [ ] Watermarked download adds watermark to PDF
- [ ] Duplicate file (same checksum) is rejected
- [ ] Checkout prevents others from editing
- [ ] Checkin releases lock
- [ ] Force release works and logs reason
- [ ] Create from template populates fields correctly
- [ ] Workflow start creates instance and first step
- [ ] All actions create access log entries
- [ ] Proper error codes (400, 403, 404, 409)
- [ ] No TypeScript errors
- [ ] Server starts and all endpoints respond
