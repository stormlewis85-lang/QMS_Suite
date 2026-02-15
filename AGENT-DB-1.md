# AGENT-DB-1: Core File & Workflow Schema

**Read RALPH_PATTERNS.md first.**

---

## Mission

Add 6 tables enabling:
- File attachments to documents (actual file tracking, not just metadata)
- Document templates (create new docs from templates)
- Configurable approval workflows
- Document checkout/lock for editing

---

## Tables

### 1. documentFile

Tracks physical files attached to documents. A document can have multiple files. Files belong to a specific revision.

| Column | Type | Required | Default | Notes |
|--------|------|----------|---------|-------|
| id | serial | PK | | |
| orgId | uuid FK→organization | ✓ | | CASCADE delete |
| documentId | FK→document | | | CASCADE delete |
| revisionId | FK→documentRevision | | | CASCADE delete |
| fileName | text | ✓ | | Sanitized for storage (no spaces/special chars) |
| originalName | text | ✓ | | What user uploaded |
| fileType | text | ✓ | | Extension: pdf, docx, xlsx, dwg, jpg |
| mimeType | text | ✓ | | application/pdf, etc. |
| fileSize | integer | ✓ | | Bytes |
| storageProvider | text | | 'local' | 'local' or 's3' |
| storagePath | text | ✓ | | Full path or S3 key |
| storageBucket | text | | | For S3 only |
| checksumSha256 | text | ✓ | | For integrity verification |
| checksumVerifiedAt | timestamp | | | Last verification |
| virusScanStatus | text | | 'pending' | pending/clean/infected/error |
| virusScanAt | timestamp | | | |
| thumbnailPath | text | | | Preview image path |
| previewGenerated | integer | | 0 | Boolean: preview ready? |
| textExtracted | integer | | 0 | Boolean: OCR/text extraction done? |
| extractedText | text | | | Searchable text content |
| pageCount | integer | | | For PDFs |
| uploadedBy | text | ✓ | | User ID |
| uploadedAt | timestamp | | NOW | |

**Index:** `orgIdx: index('document_file_org_idx').on(table.orgId)`

**Business Logic:**
- Checksum prevents duplicate uploads to same document
- Text extraction enables full-text search across documents
- Virus scan must complete before file is accessible

---

### 2. documentTemplate

Reusable templates for creating new documents. Templates define structure, default values, and auto-population rules.

| Column | Type | Required | Default | Notes |
|--------|------|----------|---------|-------|
| id | serial | PK | | |
| orgId | uuid FK→organization | ✓ | | CASCADE delete |
| name | text | ✓ | | "Work Instruction Template" |
| code | text | ✓ UNIQUE(orgId, code) | | "TMPL-WI-001" |
| description | text | | | |
| docType | text | ✓ | | work_instruction/procedure/form/checklist/specification/drawing/record |
| category | text | | | Quality, Production, Engineering |
| department | text | | | |
| templateFileId | FK→documentFile | | | The actual template file |
| fieldMappings | text | | '[]' | JSON - see below |
| lockedZones | text | | '[]' | JSON - regions user can't edit |
| version | text | | '1' | Template version |
| status | text | | 'draft' | draft/active/deprecated |
| effectiveFrom | timestamp | | | |
| defaultWorkflowId | FK→approvalWorkflowDefinition | | | Auto-assign this workflow |
| defaultReviewCycleDays | integer | | 365 | |
| createdBy | text | ✓ | | |
| createdAt | timestamp | | NOW | |
| updatedAt | timestamp | | NOW | |

**Field Mappings Structure:**
```json
[
  {"field": "doc_number", "source": "auto_generate", "format": "WI-{department}-{seq:4}"},
  {"field": "revision", "source": "auto_increment", "format": "A"},
  {"field": "effective_date", "source": "current_date", "format": "YYYY-MM-DD"},
  {"field": "part_number", "source": "linked.part.partNumber"},
  {"field": "process_name", "source": "linked.process.name"}
]
```

Sources: `auto_generate`, `auto_increment`, `current_date`, `current_user`, `linked.{entity}.{field}`

**Index:** `orgIdx: index('document_template_org_idx').on(table.orgId)`

---

### 3. approvalWorkflowDefinition

Defines reusable approval workflows. A workflow has ordered steps with assignee rules.

| Column | Type | Required | Default | Notes |
|--------|------|----------|---------|-------|
| id | serial | PK | | |
| orgId | uuid FK→organization | ✓ | | CASCADE delete |
| name | text | ✓ | | "Standard Document Approval" |
| code | text | ✓ UNIQUE(orgId, code) | | "WF-STD-001" |
| description | text | | | |
| appliesToDocTypes | text | | '[]' | JSON array: ["work_instruction", "procedure"] |
| appliesToCategories | text | | '[]' | JSON array |
| steps | text | ✓ | | JSON array - see below |
| allowParallelSteps | integer | | 0 | Future: parallel approvals |
| requireAllSignatures | integer | | 1 | All must sign vs any |
| autoObsoletePrevious | integer | | 1 | When new rev approved |
| status | text | | 'active' | draft/active/inactive |
| createdBy | text | ✓ | | |
| createdAt | timestamp | | NOW | |

**CRITICAL - Steps Structure:**
```json
[
  {
    "step": 1,
    "name": "Author Submission",
    "role": "author",
    "assigneeType": "initiator",
    "action": "submit",
    "required": true,
    "canDelegate": false,
    "dueDays": 5,
    "signatureRequired": false,
    "signatureMeaning": null
  },
  {
    "step": 2,
    "name": "Technical Review",
    "role": "reviewer",
    "assigneeType": "role_based",
    "requiredRole": "engineer",
    "action": "review",
    "required": true,
    "canDelegate": true,
    "dueDays": 3,
    "signatureRequired": false,
    "signatureMeaning": null
  },
  {
    "step": 3,
    "name": "Quality Approval",
    "role": "approver",
    "assigneeType": "role_based",
    "requiredRole": "quality_manager",
    "action": "approve",
    "required": true,
    "canDelegate": false,
    "dueDays": 2,
    "signatureRequired": true,
    "signatureMeaning": "I approve this document for production use per company quality procedures."
  }
]
```

**Index:** `orgIdx: index('approval_workflow_def_org_idx').on(table.orgId)`

**Assignee Types:**
- `initiator` - Person who started the workflow
- `specific_user` - Hardcoded user ID in `assigneeId`
- `role_based` - Anyone with role in `requiredRole`
- `department_head` - Manager of document's department

---

### 4. approvalWorkflowInstance

A running instance of a workflow attached to a specific document revision.

| Column | Type | Required | Default | Notes |
|--------|------|----------|---------|-------|
| id | serial | PK | | |
| orgId | uuid FK→organization | ✓ | | CASCADE delete |
| workflowDefinitionId | FK→approvalWorkflowDefinition | ✓ | | Which workflow template |
| documentId | FK→document | ✓ | | CASCADE |
| revisionId | FK→documentRevision | ✓ | | CASCADE |
| status | text | | 'active' | active/completed/cancelled/rejected |
| currentStep | integer | | 1 | Which step we're on |
| startedAt | timestamp | | NOW | |
| completedAt | timestamp | | | When finished |
| dueDate | timestamp | | | Overall deadline |
| initiatedBy | text | ✓ | | User who started |
| cancelledBy | text | | | |
| cancelledAt | timestamp | | | |
| cancellationReason | text | | | |

**Index:** `orgIdx: index('approval_workflow_inst_org_idx').on(table.orgId)`

**State Machine:**
- `active` → `completed` (all steps approved)
- `active` → `rejected` (any step rejected)
- `active` → `cancelled` (manually cancelled)
- No transitions FROM completed/rejected/cancelled

---

### 5. approvalWorkflowStep

Individual step within a running workflow instance.

| Column | Type | Required | Default | Notes |
|--------|------|----------|---------|-------|
| id | serial | PK | | |
| workflowInstanceId | FK→approvalWorkflowInstance | ✓ | | CASCADE |
| stepNumber | integer | ✓ | | 1, 2, 3... |
| stepName | text | ✓ | | From definition |
| assignedTo | text | | | User ID |
| assignedRole | text | | | |
| assignedAt | timestamp | | | |
| dueDate | timestamp | | | |
| delegatedFrom | text | | | Original assignee if delegated |
| delegatedAt | timestamp | | | |
| delegationReason | text | | | |
| status | text | | 'pending' | pending/in_progress/approved/rejected/skipped/delegated |
| actionTaken | text | | | approve/reject/delegate/skip |
| actionBy | text | | | Who performed action |
| actionAt | timestamp | | | |
| comments | text | | | |
| signatureRequired | integer | | 0 | From definition |
| signatureCaptured | integer | | 0 | Has signature been captured? |
| signatureData | text | | | JSON - see below |
| reminderSentAt | timestamp | | | |
| escalationSentAt | timestamp | | | |

**CRITICAL - 21 CFR Part 11 E-Signature Structure:**
```json
{
  "signerName": "Jane Smith",
  "signerId": "user-qm-001",
  "timestamp": "2024-02-10T14:30:00.000Z",
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "meaning": "I approve this document for production use per company quality procedures.",
  "documentHash": "sha256:a3f2b8c9d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1",
  "revisionId": 42,
  "sessionId": "sess-abc123"
}
```

**ALL fields are required for compliance.** The `documentHash` is SHA-256 of the document content at signing time - proves document wasn't modified after signature.

**Step Status Transitions:**
- `pending` → `in_progress` (assignee opens)
- `pending` → `delegated` (assignee delegates)
- `in_progress` → `approved`
- `in_progress` → `rejected`
- `pending/in_progress` → `skipped` (admin override)

---

### 6. documentCheckout

Implements pessimistic locking - only one user can edit at a time.

| Column | Type | Required | Default | Notes |
|--------|------|----------|---------|-------|
| id | serial | PK | | |
| orgId | uuid FK→organization | ✓ | | CASCADE delete |
| documentId | FK→document | ✓ | | CASCADE |
| checkedOutBy | text | ✓ | | User ID |
| checkedOutAt | timestamp | | NOW | |
| expectedCheckin | timestamp | | | Soft deadline |
| purpose | text | | | Why checking out |
| status | text | | 'active' | active/checked_in/force_released/expired |
| checkedInAt | timestamp | | | |
| checkedInBy | text | | | Could differ if admin force |
| forceReleasedBy | text | | | Admin who forced |
| forceReleasedAt | timestamp | | | |
| forceReleaseReason | text | | | |

**Index:** `orgIdx: index('document_checkout_org_idx').on(table.orgId)`

**Business Rules:**
- Only ONE active checkout per document (enforce with unique partial index or app logic)
- Cannot upload files unless document is checked out to you (or in draft status)
- Checkout expires after expectedCheckin (background job sets status to 'expired')
- Admins can force release with reason (audit trail)

---

## Relations

```
documentFile:
  → document (many-to-one)
  → documentRevision (many-to-one)

documentTemplate:
  → documentFile as templateFile (one-to-one, optional)
  → approvalWorkflowDefinition as defaultWorkflow (one-to-one, optional)

approvalWorkflowDefinition:
  → many approvalWorkflowInstance (one-to-many)
  → many documentTemplate (one-to-many)

approvalWorkflowInstance:
  → approvalWorkflowDefinition (many-to-one)
  → document (many-to-one)
  → documentRevision (many-to-one)
  → many approvalWorkflowStep (one-to-many)

approvalWorkflowStep:
  → approvalWorkflowInstance (many-to-one)

documentCheckout:
  → document (many-to-one)

UPDATE document relations to add:
  → files: many documentFile
  → checkouts: many documentCheckout
  → workflowInstances: many approvalWorkflowInstance

UPDATE documentRevision relations to add:
  → files: many documentFile
  → workflowInstances: many approvalWorkflowInstance
```

---

## Storage Methods

**Auth/Tenancy Pattern:**
- All "get list" methods take `orgId: string` as first parameter
- All "create" methods expect `orgId` in the data object
- Methods that get by ID don't need orgId (verification happens at API layer)

### documentFile
- `getDocumentFiles(orgId, documentId)` → DocumentFile[]
- `getDocumentFilesByRevision(revisionId)` → DocumentFile[]
- `getDocumentFile(id)` → DocumentFile | undefined
- `getDocumentFileByChecksum(checksum, documentId)` → DocumentFile | undefined (for duplicate detection)
- `createDocumentFile(data)` → DocumentFile
- `updateDocumentFile(id, data)` → DocumentFile
- `deleteDocumentFile(id)` → void
- `searchDocumentsByText(searchText)` → DocumentFile[] (searches extractedText)

### documentTemplate
- `getDocumentTemplates(orgId, status?)` → DocumentTemplate[]
- `getDocumentTemplate(id)` → DocumentTemplate | undefined
- `getDocumentTemplateByCode(code)` → DocumentTemplate | undefined
- `getDocumentTemplatesByType(orgId, docType)` → DocumentTemplate[] (active only)
- `createDocumentTemplate(data)` → DocumentTemplate
- `updateDocumentTemplate(id, data)` → DocumentTemplate (also updates updatedAt)
- `deleteDocumentTemplate(id)` → void

### approvalWorkflowDefinition
- `getApprovalWorkflowDefinitions(orgId, status?)` → ApprovalWorkflowDefinition[]
- `getApprovalWorkflowDefinition(id)` → ApprovalWorkflowDefinition | undefined
- `getApprovalWorkflowDefinitionByCode(code)` → ApprovalWorkflowDefinition | undefined
- `getWorkflowDefinitionForDocType(orgId, docType)` → ApprovalWorkflowDefinition | undefined (finds matching active workflow)
- `createApprovalWorkflowDefinition(data)` → ApprovalWorkflowDefinition
- `updateApprovalWorkflowDefinition(id, data)` → ApprovalWorkflowDefinition
- `deleteApprovalWorkflowDefinition(id)` → void

### approvalWorkflowInstance
- `getApprovalWorkflowInstances(orgId, documentId?, status?)` → ApprovalWorkflowInstance[]
- `getApprovalWorkflowInstance(id)` → ApprovalWorkflowInstance | undefined
- `getActiveWorkflowForDocument(documentId)` → ApprovalWorkflowInstance | undefined (status = 'active')
- `createApprovalWorkflowInstance(data)` → ApprovalWorkflowInstance
- `updateApprovalWorkflowInstance(id, data)` → ApprovalWorkflowInstance
- `deleteApprovalWorkflowInstance(id)` → void

### approvalWorkflowStep
- `getApprovalWorkflowSteps(instanceId)` → ApprovalWorkflowStep[] (ordered by stepNumber)
- `getApprovalWorkflowStep(id)` → ApprovalWorkflowStep | undefined
- `getPendingStepsForUser(userId)` → ApprovalWorkflowStep[] (assignedTo = userId AND status = 'pending')
- `getOverdueSteps()` → ApprovalWorkflowStep[] (status = 'pending' AND dueDate < now)
- `createApprovalWorkflowStep(data)` → ApprovalWorkflowStep
- `updateApprovalWorkflowStep(id, data)` → ApprovalWorkflowStep
- `deleteApprovalWorkflowStep(id)` → void

### documentCheckout
- `getDocumentCheckouts(orgId, documentId?, status?)` → DocumentCheckout[]
- `getDocumentCheckout(id)` → DocumentCheckout | undefined
- `getActiveCheckout(documentId)` → DocumentCheckout | undefined (status = 'active')
- `getCheckoutsByUser(orgId, userId)` → DocumentCheckout[] (checkedOutBy = userId AND status = 'active')
- `getAllActiveCheckouts(orgId)` → DocumentCheckout[] (for admin view)
- `createDocumentCheckout(data)` → DocumentCheckout
- `updateDocumentCheckout(id, data)` → DocumentCheckout
- `deleteDocumentCheckout(id)` → void

---

## Seed Data

**Note:** All seed data uses the demo organization created by Core Platform.
Reference: `const demoOrg = await storage.getOrganizationBySlug('acme-manufacturing')`
All inserts include `orgId: demoOrg.id`

### 3 Workflow Definitions

**1. Standard Document Approval (WF-STD-001)**
- Step 1: Author Submission (initiator, 5 days, no signature)
- Step 2: Technical Review (role: engineer, 3 days, can delegate, no signature)
- Step 3: Quality Approval (role: quality_manager, 2 days, signature required)
- Applies to: work_instruction, procedure, specification

**2. Quick Approval (WF-QUICK-001)**
- Step 1: Manager Approval (department_head, 2 days, can delegate, signature required)
- Applies to: form, checklist, record

**3. Safety-Critical Approval (WF-SAFETY-001)**
- Step 1: Author Submission (initiator, 3 days)
- Step 2: Peer Review (role: engineer, 3 days)
- Step 3: Safety Review (role: safety_engineer, 3 days, signature required, meaning: "I have reviewed this document for safety compliance")
- Step 4: Quality Approval (role: quality_manager, 2 days, signature required)
- Step 5: Plant Manager Approval (role: plant_manager, 2 days, signature required, meaning: "I give final approval for this safety-critical document")
- Applies to: specification, drawing with category: Safety, Critical

### 4 Document Templates

**1. Work Instruction (TMPL-WI-001)**
- docType: work_instruction
- category: Production
- department: Manufacturing
- defaultWorkflowId: → Standard
- defaultReviewCycleDays: 365
- fieldMappings: doc_number (WI-{dept}-{seq:4}), revision (A), effective_date, part_number, process_name

**2. Procedure (TMPL-PROC-001)**
- docType: procedure
- category: Quality
- department: Quality
- defaultWorkflowId: → Standard
- defaultReviewCycleDays: 730 (2 years)

**3. Inspection Checklist (TMPL-CHK-001)**
- docType: checklist
- category: Quality
- department: Quality
- defaultWorkflowId: → Quick
- defaultReviewCycleDays: 365

**4. Product Specification (TMPL-SPEC-001)**
- docType: specification
- category: Engineering
- department: Engineering
- defaultWorkflowId: → Safety-Critical
- defaultReviewCycleDays: 365

### Sample Runtime Data

For the first existing document (if any):

**1 documentFile** - A sample PDF attachment
- fileName: "sample-work-instruction.pdf"
- originalName: "WI-PROD-0001 Rev A - Assembly Work Instruction.pdf"
- fileType: "pdf"
- mimeType: "application/pdf"
- fileSize: 245678
- checksumSha256: (generate valid hash)
- virusScanStatus: "clean"
- pageCount: 5
- extractedText: "Sample work instruction for assembly process..."

**1 completed approvalWorkflowInstance** with 3 approvalWorkflowSteps showing full approval flow:
- Step 1: Author submitted (6 days ago)
- Step 2: Engineer reviewed and approved (4 days ago)
- Step 3: QM approved with signature (2 days ago) - include full signatureData JSON

---

## Validation Checklist

- [ ] All 6 tables created in schema.ts
- [ ] All relations defined
- [ ] All Zod insert schemas created
- [ ] All types exported
- [ ] All storage methods implemented (~40 methods)
- [ ] Seed data creates 3 workflows, 4 templates, sample file, sample completed workflow
- [ ] `npx drizzle-kit push` succeeds
- [ ] Server starts without errors
- [ ] `npm run seed` (or equivalent) succeeds
- [ ] No TypeScript errors
