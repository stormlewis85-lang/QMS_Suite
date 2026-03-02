# CAPA-DB-1: Core CAPA Structure & Source Tracking

**Read RALPH_PATTERNS.md first.**

---

## Mission

Add 6 foundational tables for the CAPA/8D system:
- Main CAPA record with full lifecycle
- Team membership with roles and responsibilities
- Source tracking (where the problem originated)
- Attachments/evidence management
- Related records linking
- CAPA numbering and categorization

---

## Tables

### 1. capa

The master CAPA record. One CAPA = one 8D report.

| Column | Type | Required | Default | Notes |
|--------|------|----------|---------|-------|
| id | serial | PK | | |
| orgId | uuid FK→organization | ✓ | | CASCADE delete |
| capaNumber | text | ✓ | | Auto-generated: CAPA-{YYYY}-{seq:4} |
| title | text | ✓ | | Brief description |
| description | text | ✓ | | Detailed problem statement |
| type | text | ✓ | | 'corrective' / 'preventive' / 'both' |
| priority | text | ✓ | 'medium' | 'critical' / 'high' / 'medium' / 'low' |
| status | text | ✓ | 'd0_awareness' | See state machine below |
| currentDiscipline | text | ✓ | 'D0' | D0-D8 |
| sourceType | text | ✓ | | customer_complaint / internal_ncr / audit_finding / supplier_issue / pfmea_risk / process_deviation / other |
| sourceId | integer | | | FK to source record if applicable |
| category | text | | | quality / safety / delivery / cost / environmental |
| subcategory | text | | | More specific classification |
| productLine | text | | | Affected product line |
| partNumbers | text | | '[]' | JSON array of affected part numbers |
| processIds | text | | '[]' | JSON array of affected process IDs |
| plantLocation | text | | | Plant/facility |
| customerName | text | | | If customer-related |
| customerPartNumber | text | | | Customer's part identifier |
| dateOccurred | timestamp | | | When problem occurred |
| dateDiscovered | timestamp | ✓ | NOW | When problem was discovered |
| dateReported | timestamp | | | When reported to customer (if applicable) |
| targetClosureDate | timestamp | | | Expected completion |
| actualClosureDate | timestamp | | | When closed |
| recurrenceCheck | integer | | 0 | Boolean: has recurrence check been done? |
| recurrenceCheckDate | timestamp | | | When recurrence was verified |
| recurrenceResult | text | | | 'no_recurrence' / 'recurred' / 'pending' |
| effectivenessVerified | integer | | 0 | Boolean |
| effectivenessDate | timestamp | | | |
| effectivenessResult | text | | | 'effective' / 'not_effective' / 'partially_effective' |
| costOfQuality | real | | | Total cost impact |
| costBreakdown | text | | '{}' | JSON: {scrap, rework, sorting, shipping, warranty, labor} |
| riskLevel | text | | | 'high' / 'medium' / 'low' (calculated from severity/occurrence) |
| approvalStatus | text | | 'draft' | draft / pending_review / approved / rejected |
| approvedBy | text | | | User ID |
| approvedAt | timestamp | | | |
| closedBy | text | | | User ID who closed |
| closedAt | timestamp | | | |
| createdBy | text | ✓ | | User ID |
| createdAt | timestamp | | NOW | |
| updatedAt | timestamp | | NOW | |
| deletedAt | timestamp | | | Soft delete |

**Status State Machine:**
```
d0_awareness → d1_team_formation
d1_team_formation → d2_problem_definition
d2_problem_definition → d3_containment
d3_containment → d4_root_cause
d4_root_cause → d5_corrective_actions
d5_corrective_actions → d6_validation
d6_validation → d7_preventive_actions
d7_preventive_actions → d8_closure
d8_closure → closed

Any state can go to:
- on_hold (with reason)
- cancelled (with reason)

on_hold can return to previous state
cancelled is terminal
```

**Priority Definitions:**
- `critical`: Safety issue, customer line down, immediate action required
- `high`: Major quality issue, risk of customer impact, 24-48hr response
- `medium`: Significant but contained, 1-week response
- `low`: Minor issue, process improvement opportunity

**Indexes:**
- `orgIdx`: index on orgId
- `capaNumberIdx`: unique index on (orgId, capaNumber)
- `statusIdx`: index on status
- `priorityIdx`: index on priority
- `sourceTypeIdx`: index on sourceType
- `createdAtIdx`: index on createdAt DESC

---

### 2. capaTeamMember

Team composition for the 8D. Tracks roles, responsibilities, and participation.

| Column | Type | Required | Default | Notes |
|--------|------|----------|---------|-------|
| id | serial | PK | | |
| orgId | uuid FK→organization | ✓ | | |
| capaId | integer FK→capa | ✓ | | CASCADE delete |
| userId | text | ✓ | | User ID from auth system |
| userName | text | ✓ | | Denormalized for display |
| userEmail | text | | | For notifications |
| role | text | ✓ | | See roles below |
| department | text | | | User's department |
| expertise | text | | | Why they're on the team |
| responsibilities | text | | | Specific tasks assigned |
| timeCommitment | text | | | Expected hours/percentage |
| isChampion | integer | | 0 | Boolean: is this the 8D champion? |
| isLeader | integer | | 0 | Boolean: team leader? |
| joinedAt | timestamp | | NOW | |
| leftAt | timestamp | | | If removed from team |
| leftReason | text | | | Why removed |
| notificationsEnabled | integer | | 1 | Boolean |
| lastActivityAt | timestamp | | | Last action on this CAPA |
| createdBy | text | ✓ | | |
| createdAt | timestamp | | NOW | |

**Roles:**
- `champion` - Management sponsor, removes roadblocks, single point of accountability
- `leader` - Facilitates team, owns timeline, coordinates activities
- `quality_engineer` - Quality expertise, measurement, verification
- `process_engineer` - Process knowledge, implementation
- `manufacturing_engineer` - Production expertise
- `supplier_quality` - If supplier-related
- `design_engineer` - If design-related
- `production_supervisor` - Shop floor knowledge
- `operator` - Direct process knowledge
- `maintenance` - Equipment expertise
- `logistics` - If logistics-related
- `customer_contact` - Customer interface
- `subject_matter_expert` - Domain expertise
- `observer` - Informed but not active participant

**Business Rules:**
- Every CAPA must have exactly ONE champion
- Every CAPA must have exactly ONE leader
- Champion and leader can be same person for smaller issues
- Minimum team size: 3 (champion, leader, one technical member)
- Recommended team size: 4-8 for complex issues

**Indexes:**
- `capaIdx`: index on capaId
- `userIdx`: index on userId
- `roleIdx`: index on role
- `uniqueMember`: unique on (capaId, userId) - one entry per person per CAPA

---

### 3. capaSource

Detailed tracking of where the CAPA originated. Links to external systems/records.

| Column | Type | Required | Default | Notes |
|--------|------|----------|---------|-------|
| id | serial | PK | | |
| orgId | uuid FK→organization | ✓ | | |
| capaId | integer FK→capa | ✓ | | CASCADE delete |
| sourceType | text | ✓ | | Same enum as capa.sourceType |
| sourceSystem | text | | | 'internal' / 'customer_portal' / 'supplier_portal' / 'qms' / 'erp' / 'manual' |
| externalId | text | | | ID in external system |
| externalUrl | text | | | Link to external system |
| customerComplaintNumber | text | | | Customer's reference number |
| ncrNumber | text | | | Internal NCR number |
| auditId | text | | | Audit finding reference |
| auditType | text | | | internal / external / customer / certification |
| auditFindingCategory | text | | | major / minor / observation / opportunity |
| supplierName | text | | | If supplier-related |
| supplierCode | text | | | Supplier ID |
| pfmeaId | integer | | | FK to pfmea if from PFMEA risk |
| pfmeaRowId | integer | | | Specific PFMEA row |
| controlPlanId | integer | | | If control plan related |
| processDeviationId | text | | | If from process deviation system |
| originalReportDate | timestamp | | | When originally reported |
| originalReporter | text | | | Who found/reported it |
| originalReporterContact | text | | | Contact info |
| quantityAffected | integer | | | Parts/units affected |
| lotNumbers | text | | '[]' | JSON array |
| serialNumbers | text | | '[]' | JSON array |
| dateCodeRange | text | | | Affected date codes |
| shipmentInfo | text | | '{}' | JSON: {shipDate, carrier, trackingNumbers} |
| receivedCondition | text | | | How it was received/discovered |
| initialAssessment | text | | | First look evaluation |
| evidenceCollected | text | | '[]' | JSON array of evidence descriptions |
| createdBy | text | ✓ | | |
| createdAt | timestamp | | NOW | |
| updatedAt | timestamp | | NOW | |

**Source Type Details:**

`customer_complaint`:
- customerComplaintNumber required
- customerName required on CAPA
- May have quantityAffected, lotNumbers, serialNumbers

`internal_ncr`:
- ncrNumber required
- Links to internal NCR system

`audit_finding`:
- auditId required
- auditType and auditFindingCategory required

`supplier_issue`:
- supplierName and supplierCode required

`pfmea_risk`:
- pfmeaId and pfmeaRowId required
- Initiated when AP=HIGH identified

`process_deviation`:
- processDeviationId required

**Indexes:**
- `capaIdx`: index on capaId
- `sourceTypeIdx`: index on sourceType
- `externalIdIdx`: index on externalId

---

### 4. capaAttachment

Evidence and documentation attached to the CAPA at any stage.

| Column | Type | Required | Default | Notes |
|--------|------|----------|---------|-------|
| id | serial | PK | | |
| orgId | uuid FK→organization | ✓ | | |
| capaId | integer FK→capa | ✓ | | CASCADE delete |
| discipline | text | | | D0-D8 or 'general' |
| attachmentType | text | ✓ | | See types below |
| title | text | ✓ | | Display name |
| description | text | | | What this attachment shows |
| fileName | text | ✓ | | Sanitized filename |
| originalName | text | ✓ | | User's original filename |
| fileType | text | ✓ | | Extension |
| mimeType | text | ✓ | | |
| fileSize | integer | ✓ | | Bytes |
| storagePath | text | ✓ | | File location |
| storageProvider | text | | 'local' | 'local' / 's3' |
| checksumSha256 | text | ✓ | | Integrity check |
| thumbnailPath | text | | | Preview image |
| isEvidence | integer | | 0 | Boolean: is this evidence? |
| evidenceDescription | text | | | What it proves |
| evidenceCollectedAt | timestamp | | | When evidence collected |
| evidenceCollectedBy | text | | | Who collected |
| evidenceChainOfCustody | text | | '[]' | JSON: who handled it |
| linkedDocumentId | integer | | | FK to document (Document Control) |
| uploadedBy | text | ✓ | | |
| uploadedAt | timestamp | | NOW | |
| deletedAt | timestamp | | | Soft delete |
| deletedBy | text | | | |
| deletionReason | text | | | |

**Attachment Types:**
- `photo` - Image of defect, condition, setup
- `video` - Process video, failure recreation
- `document` - PDF, Word, Excel
- `report` - Formal report (lab, inspection, etc)
- `drawing` - CAD, print, sketch
- `data` - Raw data, CSV, measurements
- `email` - Email correspondence
- `presentation` - PowerPoint, training materials
- `form` - Filled forms, checklists
- `certificate` - Certifications, qualifications
- `other` - Anything else

**Evidence Chain of Custody:**
```json
[
  {"action": "collected", "by": "user-123", "at": "2024-02-10T08:00:00Z", "location": "Production Line 3"},
  {"action": "transferred", "by": "user-123", "to": "user-456", "at": "2024-02-10T09:00:00Z"},
  {"action": "analyzed", "by": "user-456", "at": "2024-02-10T14:00:00Z", "notes": "Microscope analysis"}
]
```

**Indexes:**
- `capaIdx`: index on capaId
- `disciplineIdx`: index on discipline
- `typeIdx`: index on attachmentType
- `evidenceIdx`: index on isEvidence

---

### 5. capaRelatedRecord

Links CAPA to other entities in the QMS for traceability.

| Column | Type | Required | Default | Notes |
|--------|------|----------|---------|-------|
| id | serial | PK | | |
| orgId | uuid FK→organization | ✓ | | |
| capaId | integer FK→capa | ✓ | | CASCADE delete |
| relatedType | text | ✓ | | See types below |
| relatedId | integer | ✓ | | ID of related record |
| relationshipType | text | ✓ | | See relationships below |
| relationshipDescription | text | | | Why linked |
| linkedAt | timestamp | | NOW | |
| linkedBy | text | ✓ | | User ID |
| verifiedAt | timestamp | | | Link verified still valid |
| verifiedBy | text | | | |
| notes | text | | | |

**Related Types:**
- `capa` - Another CAPA (related issue, similar problem)
- `document` - Document from Document Control
- `pfmea` - PFMEA record
- `pfmea_row` - Specific PFMEA failure mode
- `control_plan` - Control Plan
- `control_plan_row` - Specific characteristic
- `part` - Part record
- `process` - Process definition
- `equipment` - Equipment involved
- `gage` - Measurement equipment
- `supplier` - Supplier record (future)
- `training_record` - Training evidence (future)
- `audit` - Audit record (future)

**Relationship Types:**
- `caused_by` - This record caused the issue
- `affected` - This record was affected
- `updated_as_result` - Updated due to this CAPA
- `evidence_for` - Provides evidence
- `similar_issue` - Similar problem (for pattern analysis)
- `duplicate_of` - Duplicate CAPA
- `parent` - Parent CAPA (if broken down)
- `child` - Child CAPA (sub-issue)
- `reference` - General reference

**Indexes:**
- `capaIdx`: index on capaId
- `relatedIdx`: index on (relatedType, relatedId)
- `uniqueLink`: unique on (capaId, relatedType, relatedId, relationshipType)

---

### 6. capaNumberSequence

Manages CAPA number generation per organization per year.

| Column | Type | Required | Default | Notes |
|--------|------|----------|---------|-------|
| id | serial | PK | | |
| orgId | uuid FK→organization | ✓ | | |
| year | integer | ✓ | | 4-digit year |
| lastNumber | integer | ✓ | 0 | Last used sequence number |
| prefix | text | | 'CAPA' | Customizable prefix |
| format | text | | '{prefix}-{year}-{seq:4}' | Number format |
| updatedAt | timestamp | | NOW | |

**Unique constraint:** (orgId, year)

**Number Generation Logic:**
```typescript
async function getNextCapaNumber(orgId: string): Promise<string> {
  const year = new Date().getFullYear();
  
  // Upsert sequence record
  const seq = await db.insert(capaNumberSequence)
    .values({ orgId, year, lastNumber: 1 })
    .onConflict(['orgId', 'year'])
    .set({ lastNumber: sql`${capaNumberSequence.lastNumber} + 1` })
    .returning();
  
  // Format: CAPA-2024-0001
  return `CAPA-${year}-${String(seq.lastNumber).padStart(4, '0')}`;
}
```

---

## Relations

```
capa:
  → organization (many-to-one)
  → capaTeamMember as teamMembers (one-to-many)
  → capaSource as sources (one-to-many)
  → capaAttachment as attachments (one-to-many)
  → capaRelatedRecord as relatedRecords (one-to-many)

capaTeamMember:
  → capa (many-to-one)
  → organization (many-to-one)

capaSource:
  → capa (many-to-one)
  → organization (many-to-one)
  → pfmea (many-to-one, optional)

capaAttachment:
  → capa (many-to-one)
  → organization (many-to-one)
  → document (many-to-one, optional)

capaRelatedRecord:
  → capa (many-to-one)
  → organization (many-to-one)

capaNumberSequence:
  → organization (many-to-one)
```

---

## Storage Methods

### capa
- `getCapas(orgId, filters?)` → Capa[] (with pagination, sorting)
- `getCapa(id)` → Capa | undefined
- `getCapaByNumber(orgId, capaNumber)` → Capa | undefined
- `getCapaWithDetails(id)` → Capa with team, sources, attachments
- `getCapasByStatus(orgId, status)` → Capa[]
- `getCapasByPriority(orgId, priority)` → Capa[]
- `getCapasBySourceType(orgId, sourceType)` → Capa[]
- `getCapasForUser(orgId, userId)` → Capa[] (where user is team member)
- `getOverdueCapas(orgId)` → Capa[] (past targetClosureDate, not closed)
- `getCapaMetrics(orgId, dateRange?)` → {total, byStatus, byPriority, avgClosureTime}
- `createCapa(data)` → Capa (auto-generates capaNumber)
- `updateCapa(id, data)` → Capa
- `updateCapaStatus(id, status, userId)` → Capa (with validation)
- `updateCapaDiscipline(id, discipline, userId)` → Capa
- `softDeleteCapa(id, userId, reason)` → void
- `searchCapas(orgId, searchText)` → Capa[]

### capaTeamMember
- `getCapaTeamMembers(capaId)` → CapaTeamMember[]
- `getCapaTeamMember(id)` → CapaTeamMember | undefined
- `getCapaChampion(capaId)` → CapaTeamMember | undefined
- `getCapaLeader(capaId)` → CapaTeamMember | undefined
- `getUserCapaAssignments(orgId, userId)` → CapaTeamMember[]
- `createCapaTeamMember(data)` → CapaTeamMember
- `updateCapaTeamMember(id, data)` → CapaTeamMember
- `removeCapaTeamMember(id, reason)` → void (sets leftAt)
- `updateLastActivity(id)` → void

### capaSource
- `getCapaSources(capaId)` → CapaSource[]
- `getCapaSource(id)` → CapaSource | undefined
- `getCapaSourceByExternalId(orgId, sourceType, externalId)` → CapaSource | undefined
- `createCapaSource(data)` → CapaSource
- `updateCapaSource(id, data)` → CapaSource
- `deleteCapaSource(id)` → void

### capaAttachment
- `getCapaAttachments(capaId, discipline?)` → CapaAttachment[]
- `getCapaAttachment(id)` → CapaAttachment | undefined
- `getCapaEvidence(capaId)` → CapaAttachment[] (isEvidence = true)
- `createCapaAttachment(data)` → CapaAttachment
- `updateCapaAttachment(id, data)` → CapaAttachment
- `softDeleteCapaAttachment(id, userId, reason)` → void
- `addToChainOfCustody(id, entry)` → CapaAttachment

### capaRelatedRecord
- `getCapaRelatedRecords(capaId, relatedType?)` → CapaRelatedRecord[]
- `getCapaRelatedRecord(id)` → CapaRelatedRecord | undefined
- `getCapasForRelatedRecord(relatedType, relatedId)` → Capa[] (reverse lookup)
- `getSimilarCapas(capaId)` → Capa[] (same part/process/failure mode)
- `createCapaRelatedRecord(data)` → CapaRelatedRecord
- `updateCapaRelatedRecord(id, data)` → CapaRelatedRecord
- `deleteCapaRelatedRecord(id)` → void
- `verifyCapaRelatedRecord(id, userId)` → CapaRelatedRecord

### capaNumberSequence
- `getNextCapaNumber(orgId)` → string
- `getCurrentSequence(orgId, year)` → CapaNumberSequence | undefined
- `resetSequence(orgId, year, startFrom)` → void (admin only)

---

## Seed Data

### 3 Sample CAPAs

**CAPA-2024-0001: Customer Complaint - Dimensional Issue**
```json
{
  "title": "Critical dimension out of spec on Stiffener part",
  "description": "Customer reported 3.5mm dimension measuring 3.72mm on multiple parts from lot L2024-0215",
  "type": "corrective",
  "priority": "high",
  "status": "d4_root_cause",
  "currentDiscipline": "D4",
  "sourceType": "customer_complaint",
  "category": "quality",
  "customerName": "Kautex",
  "partNumbers": ["3004-XYZ"],
  "plantLocation": "Fraser",
  "dateOccurred": "2024-02-10",
  "dateDiscovered": "2024-02-12",
  "targetClosureDate": "2024-03-15"
}
```
- Team: 5 members (champion, leader, QE, process eng, operator)
- Source: Customer complaint with lot/serial numbers
- Attachments: 3 (defect photo, CMM report, customer email)
- Related: Link to PFMEA row, Control Plan row

**CAPA-2024-0002: Internal NCR - Process Deviation**
```json
{
  "title": "Injection molding temperature drift causing short shots",
  "description": "SPC chart showed temperature trending outside control limits on Press #3",
  "type": "both",
  "priority": "medium",
  "status": "d6_validation",
  "currentDiscipline": "D6",
  "sourceType": "internal_ncr",
  "category": "quality"
}
```
- Team: 4 members
- Source: Internal NCR
- Attachments: SPC charts, maintenance logs

**CAPA-2024-0003: Audit Finding - Documentation Gap**
```json
{
  "title": "Work instructions missing revision control",
  "description": "IATF audit identified 3 work instructions without proper revision history",
  "type": "corrective",
  "priority": "medium",
  "status": "d8_closure",
  "currentDiscipline": "D8",
  "sourceType": "audit_finding",
  "category": "quality"
}
```
- Team: 3 members
- Source: IATF audit finding
- Related: Link to 3 documents in Document Control

---

## Validation Checklist

- [ ] All 6 tables created in schema.ts
- [ ] All relations defined
- [ ] All Zod insert schemas created
- [ ] All types exported
- [ ] ~50 storage methods implemented
- [ ] Seed creates 3 CAPAs with full data
- [ ] `npx drizzle-kit push` succeeds
- [ ] Server starts without errors
- [ ] `npm run seed` succeeds
- [ ] No TypeScript errors
