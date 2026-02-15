# AGENT-DB-2: Audit, Distribution & Access Control Schema

**Read RALPH_PATTERNS.md first. AGENT-DB-1 must be complete before starting.**

---

## Mission

Add 7 tables enabling:
- Distribution lists with configurable recipients
- Document distribution tracking with acknowledgment
- Complete access audit logging (who viewed/downloaded/printed what, when)
- Print tracking with controlled copy management
- Threaded comments on documents
- External document tracking (standards, customer specs)
- Enhanced cross-entity linking

---

## Tables

### 1. distributionList

Reusable recipient groups for document distribution.

| Column | Type | Required | Default | Notes |
|--------|------|----------|---------|-------|
| id | serial | PK | | |
| orgId | uuid FK→organization | ✓ | | CASCADE delete |
| name | text | ✓ | | "Production Floor Documents" |
| code | text | ✓ UNIQUE(orgId, code) | | "DL-PROD-001" |
| description | text | | | |
| recipients | text | ✓ | '[]' | JSON - see below |
| requireAcknowledgment | integer | | 1 | Boolean |
| acknowledgmentDueDays | integer | | 7 | |
| sendEmailNotification | integer | | 1 | Boolean |
| status | text | | 'active' | active/inactive |
| createdBy | text | ✓ | | |
| createdAt | timestamp | | NOW | |
| updatedAt | timestamp | | NOW | |

**Recipients Structure:**
```json
[
  {"type": "user", "id": "user-123", "name": "John Smith"},
  {"type": "role", "role": "quality_engineer"},
  {"type": "department", "department": "Production"},
  {"type": "dynamic", "query": "part.plant = document.plant"}
]
```

**Index:** `orgIdx: index('distribution_list_org_idx').on(table.orgId)`

Recipient types:
- `user` - Specific user by ID
- `role` - All users with this role
- `department` - All users in this department
- `dynamic` - Query-based (advanced, evaluated at distribution time)

---

### 2. documentDistributionRecord

Tracks each distribution event and acknowledgment status.

| Column | Type | Required | Default | Notes |
|--------|------|----------|---------|-------|
| id | serial | PK | | |
| orgId | uuid FK→organization | ✓ | | CASCADE delete |
| documentId | FK→document | ✓ | | CASCADE |
| revisionId | FK→documentRevision | ✓ | | CASCADE |
| distributionListId | FK→distributionList | | | Optional - can distribute ad-hoc |
| recipientUserId | text | | | User ID if known |
| recipientName | text | ✓ | | Display name |
| recipientEmail | text | | | For notifications |
| recipientRole | text | | | |
| recipientDepartment | text | | | |
| distributedAt | timestamp | | NOW | |
| distributedBy | text | ✓ | | User who initiated |
| distributionMethod | text | | 'electronic' | electronic/hardcopy/both |
| copyNumber | integer | | | For hardcopy tracking |
| watermarkApplied | integer | | 1 | Boolean |
| watermarkText | text | | | The actual watermark |
| watermarkedFileId | FK→documentFile | | | Pre-generated watermarked copy |
| requiresAcknowledgment | integer | | 1 | Boolean |
| acknowledgmentDueDate | timestamp | | | |
| acknowledgedAt | timestamp | | | |
| acknowledgmentMethod | text | | | click/signature/training_record |
| acknowledgmentIp | text | | | |
| acknowledgmentComment | text | | | |
| recalledAt | timestamp | | | |
| recalledBy | text | | | |
| recallReason | text | | | |
| recallAcknowledgedAt | timestamp | | | |
| status | text | | 'distributed' | distributed/acknowledged/recalled/expired |

**Index:** `orgIdx: index('document_distribution_record_org_idx').on(table.orgId)`

**CRITICAL - Watermark Content:**
```
CONTROLLED COPY
Issued to: {recipientName}
Date: {YYYY-MM-DD HH:mm}
Copy #: {copyNumber}
Doc ID: {docNumber} Rev {revision}
```

**Business Rules:**
- When document is superseded, all distributions of old revision should be recalled
- Acknowledgment is legally binding confirmation of receipt
- Recall requires acknowledgment that recipient has destroyed/returned copies

---

### 3. documentAccessLog

Immutable audit trail of all document access. **Never delete, never update.**

| Column | Type | Required | Default | Notes |
|--------|------|----------|---------|-------|
| id | serial | PK | | |
| orgId | uuid FK→organization | ✓ | | CASCADE delete |
| documentId | FK→document | ✓ | | CASCADE |
| revisionId | FK→documentRevision | | | |
| fileId | FK→documentFile | | | Which file accessed |
| userId | text | ✓ | | |
| userName | text | | | Denormalized for audit |
| userRole | text | | | |
| userDepartment | text | | | |
| action | text | ✓ | | See action list |
| actionDetails | text | | | JSON - action-specific |
| ipAddress | text | | | |
| userAgent | text | | | Browser/client info |
| sessionId | text | | | |
| timestamp | timestamp | | NOW | |
| durationMs | integer | | | For view actions |
| logHash | text | | | Tamper detection |

**Index:** `orgIdx: index('document_access_log_org_idx').on(table.orgId)`

**Action Values:**
- `view` - Opened document/file
- `download` - Downloaded file
- `print` - Sent to printer
- `email` - Emailed document
- `edit` - Modified content
- `checkout` - Checked out for editing
- `checkin` - Checked back in
- `upload` - Uploaded new file
- `delete` - Deleted file
- `submit` - Submitted for approval
- `approve` - Approved workflow step
- `reject` - Rejected workflow step
- `delegate` - Delegated approval
- `distribute` - Distributed to recipients
- `recall` - Recalled distribution
- `acknowledge` - Acknowledged receipt
- `comment` - Added comment
- `link` - Created link
- `unlink` - Removed link
- `sign` - Captured e-signature

**Action Details Examples:**
```json
// view
{"durationSeconds": 45, "pagesViewed": [1, 2, 3]}

// download
{"format": "pdf", "watermarked": true, "fileSize": 245678}

// print
{"copies": 2, "printer": "HP-Floor-1", "copyNumbers": [1, 2]}

// email
{"recipients": ["a@example.com", "b@example.com"], "subject": "..."}

// approve
{"stepNumber": 2, "workflowInstanceId": 123, "comments": "Looks good"}

// sign
{"signatureId": "...", "meaning": "I approve...", "documentHash": "sha256:..."}
```

**CRITICAL - Log Hash for Tamper Detection:**
```
logHash = SHA256(previousLogHash + id + documentId + userId + action + timestamp)
```

First record uses empty string for previousLogHash. This creates a blockchain-like chain where any modification breaks the chain.

---

### 4. documentPrintLog

Specialized print tracking with controlled copy management.

| Column | Type | Required | Default | Notes |
|--------|------|----------|---------|-------|
| id | serial | PK | | |
| orgId | uuid FK→organization | ✓ | | CASCADE delete |
| documentId | FK→document | ✓ | | CASCADE |
| revisionId | FK→documentRevision | ✓ | | |
| fileId | FK→documentFile | ✓ | | |
| printedBy | text | ✓ | | |
| printedAt | timestamp | | NOW | |
| printCopies | integer | | 1 | |
| printPurpose | text | | | Why printing |
| watermarkApplied | integer | | 1 | Boolean |
| watermarkText | text | | | |
| copyNumbers | text | | | JSON array: [1, 2, 3] |
| printerName | text | | | |
| ipAddress | text | | | |
| controlledCopies | text | | '[]' | JSON - see below |
| copiesRecalled | integer | | 0 | Count |
| allRecalled | integer | | 0 | Boolean |
| recallVerifiedAt | timestamp | | | |
| recallVerifiedBy | text | | | |

**Controlled Copies Structure:**
```json
[
  {
    "copyNumber": 1,
    "location": "Production Floor - Station 3",
    "holder": "John Smith",
    "issuedAt": "2024-02-10T08:00:00Z",
    "recalledAt": null
  },
  {
    "copyNumber": 2,
    "location": "QC Lab",
    "holder": "Jane Doe",
    "issuedAt": "2024-02-10T08:00:00Z",
    "recalledAt": "2024-02-15T16:00:00Z"
  }
]
```

**Index:** `orgIdx: index('document_print_log_org_idx').on(table.orgId)`

**Business Rules:**
- Copy numbers are sequential per document (not global)
- When document superseded, ALL unrecalled copies must be recalled
- allRecalled = true only when every copy in controlledCopies has recalledAt set

---

### 5. documentComment

Threaded comments with optional position anchoring for inline comments.

| Column | Type | Required | Default | Notes |
|--------|------|----------|---------|-------|
| id | serial | PK | | |
| orgId | uuid FK→organization | ✓ | | CASCADE delete |
| documentId | FK→document | ✓ | | CASCADE |
| revisionId | FK→documentRevision | | | |
| pageNumber | integer | | | For positioned comments |
| positionX | real | | | 0-100 percentage |
| positionY | real | | | 0-100 percentage |
| highlightedText | text | | | Selected text |
| commentType | text | | 'general' | general/question/suggestion/issue/resolution |
| content | text | ✓ | | The comment text |
| parentCommentId | FK→documentComment | | | For threading |
| threadResolved | integer | | 0 | Boolean |
| resolvedBy | text | | | |
| resolvedAt | timestamp | | | |
| mentions | text | | '[]' | JSON array of user IDs |
| workflowStepId | FK→approvalWorkflowStep | | | If during approval |
| createdBy | text | ✓ | | |
| createdAt | timestamp | | NOW | |
| updatedAt | timestamp | | | |
| deletedAt | timestamp | | | Soft delete |

**Index:** `orgIdx: index('document_comment_org_idx').on(table.orgId)`

**Comment Types:**
- `general` - General comment
- `question` - Question needing answer
- `suggestion` - Suggested change
- `issue` - Problem that needs resolution
- `resolution` - Response/fix to an issue

**Business Rules:**
- Comments are soft-deleted (set deletedAt, never hard delete)
- Resolving a parent comment resolves entire thread
- Mentions should trigger notifications (future)
- Comments during approval workflow are linked to the step

---

### 6. externalDocument

Tracks external standards, customer specs, and regulatory documents that internal documents reference.

| Column | Type | Required | Default | Notes |
|--------|------|----------|---------|-------|
| id | serial | PK | | |
| orgId | uuid FK→organization | ✓ | | CASCADE delete |
| docNumber | text | ✓ UNIQUE(orgId, docNumber) | | "IATF 16949:2016", "ASTM E18" |
| title | text | ✓ | | Full title |
| source | text | ✓ | | ISO/ASTM/SAE/AIAG/Customer/Government |
| externalUrl | text | | | Link to official source |
| issuingBody | text | | | "International Organization for Standardization" |
| currentVersion | text | | | "2016", "Rev 3" |
| versionDate | timestamp | | | |
| previousVersion | text | | | For tracking updates |
| localFileId | FK→documentFile | | | Our copy if we have one |
| subscriptionActive | integer | | 0 | Boolean - are we tracking updates? |
| subscriptionContact | text | | | Who to notify of updates |
| lastCheckedAt | timestamp | | | |
| updateAvailable | integer | | 0 | Boolean |
| updateNotes | text | | | What changed |
| affectedInternalDocs | text | | '[]' | JSON array of document IDs |
| category | text | | | Quality/Safety/Environmental/Testing |
| applicability | text | | | What it applies to |
| status | text | | 'active' | active/superseded/withdrawn |
| notes | text | | | |
| createdBy | text | ✓ | | |
| createdAt | timestamp | | NOW | |
| updatedAt | timestamp | | | |

**Index:** `orgIdx: index('external_document_org_idx').on(table.orgId)`

**Business Rules:**
- When external document is updated, all affected internal docs need review
- Track previous version for change impact assessment
- subscriptionActive = 1 means we should be checking for updates

---

### 7. documentLinkEnhanced

Comprehensive cross-entity linking with bidirectional support.

| Column | Type | Required | Default | Notes |
|--------|------|----------|---------|-------|
| id | serial | PK | | |
| orgId | uuid FK→organization | ✓ | | CASCADE delete |
| sourceDocumentId | FK→document | ✓ | | CASCADE |
| sourceRevisionId | FK→documentRevision | | | Specific revision |
| targetType | text | ✓ | | See target types |
| targetId | integer | ✓ | | ID in target table |
| targetRevision | text | | | If applicable |
| targetTitle | text | | | Cached for display |
| linkType | text | ✓ | | See link types |
| linkDescription | text | | | |
| bidirectional | integer | | 0 | Boolean |
| reverseLinkId | FK→documentLinkEnhanced | | | The other direction |
| linkVerifiedAt | timestamp | | | |
| linkVerifiedBy | text | | | |
| linkBroken | integer | | 0 | Boolean |
| linkBrokenReason | text | | | |
| createdBy | text | ✓ | | |
| createdAt | timestamp | | NOW | |

**Target Types:**
- `internal_document` - Another document in our system
- `external_document` - External standard/spec
- `pfmea` - PFMEA record
- `control_plan` - Control Plan
- `part` - Part record
- `process` - Process definition
- `equipment` - Equipment record
- `failure_mode` - Failure mode record
- `training_record` - Training record (future)
- `capa` - CAPA record (future)
- `audit` - Audit record (future)

**Link Types:**
- `references` - Document references target
- `supersedes` - Document supersedes target (requires bidirectional)
- `superseded_by` - Reverse of supersedes
- `supports` - Document provides supporting info for target
- `implements` - Document implements requirements from target
- `derived_from` - Document derived from target
- `related_to` - General relationship
- `training_required` - Target requires training on this document
- `audit_evidence` - Document is evidence for target audit
- `capa_evidence` - Document is evidence for target CAPA

**Index:** `orgIdx: index('document_link_enhanced_org_idx').on(table.orgId)`

**Bidirectional Linking:**
When `bidirectional = 1` and `targetType = 'internal_document'`:
- Creating link A→B also creates link B→A
- `reverseLinkId` points to the other link
- Deleting either deletes both
- Link types may differ (supersedes → superseded_by)

---

## Relations

```
distributionList:
  → many documentDistributionRecord (one-to-many)

documentDistributionRecord:
  → document (many-to-one)
  → documentRevision (many-to-one)
  → distributionList (many-to-one, optional)
  → documentFile as watermarkedFile (many-to-one, optional)

documentAccessLog:
  → document (many-to-one)
  → documentRevision (many-to-one, optional)
  → documentFile (many-to-one, optional)

documentPrintLog:
  → document (many-to-one)
  → documentRevision (many-to-one)
  → documentFile (many-to-one)

documentComment:
  → document (many-to-one)
  → documentRevision (many-to-one, optional)
  → documentComment as parentComment (self-reference, many-to-one)
  → many documentComment as replies (self-reference, one-to-many)
  → approvalWorkflowStep (many-to-one, optional)

externalDocument:
  → documentFile as localFile (one-to-one, optional)

documentLinkEnhanced:
  → document as sourceDocument (many-to-one)
  → documentRevision as sourceRevision (many-to-one, optional)
  → documentLinkEnhanced as reverseLink (self-reference, one-to-one)

UPDATE document relations to add:
  → distributionRecords: many documentDistributionRecord
  → accessLogs: many documentAccessLog
  → printLogs: many documentPrintLog
  → comments: many documentComment
  → linksFrom: many documentLinkEnhanced
```

---

## Storage Methods

**Auth/Tenancy Pattern:**
- All "get list" methods take `orgId: string` as first parameter
- All "create" methods expect `orgId` in the data object
- Methods that get by ID don't need orgId (verification happens at API layer)

### distributionList
- `getDistributionLists(orgId, status?)` → DistributionList[]
- `getDistributionList(id)` → DistributionList | undefined
- `getDistributionListByCode(code)` → DistributionList | undefined
- `createDistributionList(data)` → DistributionList
- `updateDistributionList(id, data)` → DistributionList
- `deleteDistributionList(id)` → void

### documentDistributionRecord
- `getDocumentDistributionRecords(orgId, documentId?, status?)` → DocumentDistributionRecord[]
- `getDocumentDistributionRecord(id)` → DocumentDistributionRecord | undefined
- `getPendingAcknowledgments(orgId, userId)` → DocumentDistributionRecord[] (for this user)
- `getOverdueAcknowledgments(orgId)` → DocumentDistributionRecord[] (past due, not acknowledged)
- `createDocumentDistributionRecord(data)` → DocumentDistributionRecord
- `updateDocumentDistributionRecord(id, data)` → DocumentDistributionRecord
- `deleteDocumentDistributionRecord(id)` → void

### documentAccessLog
- `getDocumentAccessLogs(orgId, documentId?, action?, limit?)` → DocumentAccessLog[]
- `getDocumentAccessLogsByUser(orgId, userId, limit?)` → DocumentAccessLog[]
- `getDocumentAccessLogsByDateRange(orgId, startDate, endDate)` → DocumentAccessLog[]
- `createDocumentAccessLog(data)` → DocumentAccessLog
- `getAccessLogStats(orgId, documentId)` → {action: string, count: number}[]

**Note: NO update or delete methods - audit logs are immutable**

### documentPrintLog
- `getDocumentPrintLogs(orgId, documentId?)` → DocumentPrintLog[]
- `getDocumentPrintLog(id)` → DocumentPrintLog | undefined
- `getUnrecalledPrintLogs(orgId, documentId)` → DocumentPrintLog[] (allRecalled = 0)
- `createDocumentPrintLog(data)` → DocumentPrintLog
- `updateDocumentPrintLog(id, data)` → DocumentPrintLog
- `getNextCopyNumber(documentId)` → number

### documentComment
- `getDocumentComments(orgId, documentId, includeDeleted?)` → DocumentComment[]
- `getDocumentComment(id)` → DocumentComment | undefined
- `getCommentThread(parentId)` → DocumentComment[] (replies)
- `getUnresolvedComments(orgId, documentId)` → DocumentComment[] (top-level, unresolved)
- `createDocumentComment(data)` → DocumentComment
- `updateDocumentComment(id, data)` → DocumentComment
- `softDeleteDocumentComment(id)` → void (sets deletedAt)
- `resolveCommentThread(id, resolvedBy)` → DocumentComment

### externalDocument
- `getExternalDocuments(orgId, source?, status?)` → ExternalDocument[]
- `getExternalDocument(id)` → ExternalDocument | undefined
- `getExternalDocumentByNumber(docNumber)` → ExternalDocument | undefined
- `getExternalDocumentsWithUpdates(orgId)` → ExternalDocument[] (updateAvailable = 1)
- `createExternalDocument(data)` → ExternalDocument
- `updateExternalDocument(id, data)` → ExternalDocument
- `deleteExternalDocument(id)` → void

### documentLinkEnhanced
- `getDocumentLinksFrom(orgId, sourceDocumentId)` → DocumentLinkEnhanced[]
- `getDocumentLinksTo(orgId, targetType, targetId)` → DocumentLinkEnhanced[]
- `getDocumentLinkEnhanced(id)` → DocumentLinkEnhanced | undefined
- `getBrokenLinks(orgId)` → DocumentLinkEnhanced[] (linkBroken = 1)
- `createDocumentLinkEnhanced(data)` → DocumentLinkEnhanced (handles bidirectional)
- `updateDocumentLinkEnhanced(id, data)` → DocumentLinkEnhanced
- `deleteDocumentLinkEnhanced(id)` → void (handles bidirectional)
- `verifyDocumentLink(id, verifiedBy)` → DocumentLinkEnhanced
- `markLinkBroken(id, reason)` → DocumentLinkEnhanced

---

## Seed Data

**Note:** All seed data uses the demo organization created by Core Platform.
Reference: `const demoOrg = await storage.getOrganizationBySlug('acme-manufacturing')`
All inserts include `orgId: demoOrg.id`

### 3 Distribution Lists

**1. Production Floor (DL-PROD-001)**
```json
{
  "recipients": [
    {"type": "role", "role": "production_supervisor"},
    {"type": "role", "role": "production_operator"},
    {"type": "department", "department": "Production"}
  ],
  "requireAcknowledgment": 1,
  "acknowledgmentDueDays": 7
}
```

**2. Quality Team (DL-QUAL-001)**
```json
{
  "recipients": [
    {"type": "role", "role": "quality_engineer"},
    {"type": "role", "role": "quality_manager"},
    {"type": "role", "role": "quality_technician"}
  ],
  "requireAcknowledgment": 1,
  "acknowledgmentDueDays": 5
}
```

**3. All Hands (DL-ALL-001)**
```json
{
  "recipients": [
    {"type": "department", "department": "Production"},
    {"type": "department", "department": "Quality"},
    {"type": "department", "department": "Engineering"},
    {"type": "department", "department": "Maintenance"}
  ],
  "requireAcknowledgment": 1,
  "acknowledgmentDueDays": 3
}
```

### 4 External Documents

1. **IATF 16949:2016** - Source: IATF, Category: Quality
2. **ISO 9001:2015** - Source: ISO, Category: Quality
3. **AIAG PFMEA Handbook** - Source: AIAG, Category: Quality, Version: 1st Edition (2019)
4. **ASTM E18** - Source: ASTM, Category: Testing (Rockwell Hardness)

### Sample Access Logs

For existing document, create 5-10 access log entries showing:
- View actions with duration
- Download (watermarked)
- Print (2 copies)
- Workflow actions (submit, approve)

### Sample Comments

For existing document, create a thread:
1. Parent comment: Question about tolerance
2. Reply 1: Suggestion for clarification
3. Reply 2: Resolution confirming change
4. Mark thread as resolved

---

## Validation Checklist

- [ ] All 7 tables created in schema.ts
- [ ] All relations defined
- [ ] All Zod insert schemas created
- [ ] All types exported
- [ ] All storage methods implemented (~45 methods)
- [ ] documentAccessLog has NO update/delete methods (immutable)
- [ ] Bidirectional linking works in createDocumentLinkEnhanced
- [ ] Seed data creates distribution lists, external docs, access logs, comments
- [ ] `npx drizzle-kit push` succeeds
- [ ] Server starts without errors
- [ ] Seed runs successfully
- [ ] No TypeScript errors
