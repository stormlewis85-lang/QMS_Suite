# CAPA-DB-4: 8D Disciplines D7-D8 (Preventive Actions & Closure) + Audit

**Read RALPH_PATTERNS.md first. CAPA-DB-1, CAPA-DB-2, and CAPA-DB-3 must be complete.**

---

## Mission

Add 4 tables for the final 8D disciplines and system-wide tracking:
- D7: Preventive Actions (systemic improvements)
- D8: Team Recognition & Closure
- CAPA Audit Log (immutable event trail)
- CAPA Metrics/Analytics support

---

## Tables

### 1. capaD7Preventive

D7: Preventive Actions. Systemic improvements to prevent recurrence anywhere.

| Column | Type | Required | Default | Notes |
|--------|------|----------|---------|-------|
| id | serial | PK | | |
| orgId | uuid FK→organization | ✓ | | |
| capaId | integer FK→capa | ✓ | | CASCADE delete |
| systemicAnalysisComplete | integer | | 0 | Boolean |
| systemicAnalysisSummary | text | | | Summary of systemic review |
| managementSystemsReviewed | text | | '[]' | JSON: which systems reviewed |
| similarProcessesIdentified | text | | '[]' | JSON: other processes at risk |
| similarProductsIdentified | text | | '[]' | JSON: other products at risk |
| otherPlantsIdentified | text | | '[]' | JSON: other facilities at risk |
| horizontalDeploymentPlan | text | | '{}' | JSON: rollout to other areas |
| preventiveActions | text | | '[]' | JSON array - see below |
| policyChangesRequired | integer | | 0 | Boolean |
| policyChanges | text | | '[]' | JSON: policy updates |
| procedureChangesRequired | integer | | 0 | Boolean |
| procedureChanges | text | | '[]' | JSON: procedure updates |
| systemChangesRequired | integer | | 0 | Boolean |
| systemChanges | text | | '[]' | JSON: system updates |
| designChangesRequired | integer | | 0 | Boolean |
| designChanges | text | | '[]' | JSON: design updates |
| supplierActionsRequired | integer | | 0 | Boolean |
| supplierActions | text | | '[]' | JSON: supplier actions |
| fmeaSystemReviewComplete | integer | | 0 | Boolean |
| fmeaSystemReviewNotes | text | | | |
| lessonLearnedCreated | integer | | 0 | Boolean |
| lessonLearnedReference | text | | | Link to lesson learned |
| knowledgeBaseUpdated | integer | | 0 | Boolean |
| knowledgeBaseEntries | text | | '[]' | JSON: KB entries created |
| trainingMaterialsUpdated | integer | | 0 | Boolean |
| trainingMaterialsList | text | | '[]' | JSON: updated materials |
| auditChecklistUpdated | integer | | 0 | Boolean |
| auditChecklistChanges | text | | | What was added to audits |
| standardizationComplete | integer | | 0 | Boolean |
| standardizationSummary | text | | | How standardized |
| preventiveActionVerification | text | | '[]' | JSON: verification results |
| d7CompletedAt | timestamp | | | |
| d7CompletedBy | text | | | |
| d7VerifiedAt | timestamp | | | |
| d7VerifiedBy | text | | | |
| d7Notes | text | | | |
| createdBy | text | ✓ | | |
| createdAt | timestamp | | NOW | |
| updatedAt | timestamp | | NOW | |

**Preventive Actions Structure:**
```json
[
  {
    "id": "PA-001",
    "type": "horizontal_deployment",
    "action": "Implement tool life monitoring on all injection molding presses",
    "scope": ["Press #1", "Press #2", "Press #4", "Press #5"],
    "rationale": "Same root cause could occur on other presses",
    "responsible": "user-123",
    "dueDate": "2024-06-01",
    "status": "in_progress",
    "progress": 40,
    "implementedLocations": ["Press #1", "Press #2"],
    "pendingLocations": ["Press #4", "Press #5"],
    "verifiedAt": null,
    "verifiedBy": null
  },
  {
    "id": "PA-002",
    "type": "procedure_update",
    "action": "Add quarterly SPC limit review to quality procedure QP-0012",
    "scope": ["All SPC-monitored characteristics"],
    "rationale": "Systemic gap in SPC maintenance",
    "responsible": "user-456",
    "dueDate": "2024-03-15",
    "status": "complete",
    "documentReference": "QP-0012 Rev D",
    "verifiedAt": "2024-03-10T15:00:00Z",
    "verifiedBy": "user-789"
  },
  {
    "id": "PA-003",
    "type": "training",
    "action": "Update injection molding operator certification to include tool life system",
    "scope": ["All injection molding operators"],
    "rationale": "Ensure operators understand new control",
    "responsible": "user-234",
    "dueDate": "2024-04-01",
    "status": "planned",
    "trainingRecordIds": []
  }
]
```

**Horizontal Deployment Plan Structure:**
```json
{
  "targetAreas": [
    {"location": "Press #1", "plannedDate": "2024-04-01", "status": "complete"},
    {"location": "Press #2", "plannedDate": "2024-04-15", "status": "complete"},
    {"location": "Press #4", "plannedDate": "2024-05-01", "status": "planned"},
    {"location": "Press #5", "plannedDate": "2024-05-15", "status": "planned"},
    {"location": "Plant B - All presses", "plannedDate": "2024-07-01", "status": "planned"}
  ],
  "verificationMethod": "Audit of tool life system functionality",
  "completionTarget": "2024-07-31",
  "progress": 40
}
```

**Indexes:**
- `capaIdx`: unique index on capaId (one D7 per CAPA)

---

### 2. capaD8Closure

D8: Team Recognition & Closure. Final wrap-up and celebration.

| Column | Type | Required | Default | Notes |
|--------|------|----------|---------|-------|
| id | serial | PK | | |
| orgId | uuid FK→organization | ✓ | | |
| capaId | integer FK→capa | ✓ | | CASCADE delete |
| closureCriteriaMet | integer | | 0 | Boolean |
| closureCriteriaChecklist | text | | '{}' | JSON: checklist items |
| allActionsComplete | integer | | 0 | Boolean |
| actionsCompletionSummary | text | | | Summary of all actions |
| effectivenessConfirmed | integer | | 0 | Boolean |
| effectivenessSummary | text | | | Final effectiveness statement |
| noRecurrence | integer | | 0 | Boolean |
| recurrenceMonitoringPeriod | text | | | How long monitored |
| containmentRemoved | integer | | 0 | Boolean |
| containmentRemovalDate | timestamp | | | |
| documentationComplete | integer | | 0 | Boolean |
| documentationChecklist | text | | '{}' | JSON: docs verified |
| customerClosed | integer | | 0 | Boolean |
| customerClosureDate | timestamp | | | |
| customerClosureReference | text | | | Customer approval doc |
| customerFeedback | text | | | Customer comments |
| teamRecognition | text | | '{}' | JSON: recognition details |
| teamRecognitionDate | timestamp | | | |
| teamRecognitionMethod | text | | | How team was recognized |
| teamFeedback | text | | '[]' | JSON: team retrospective |
| lessonsLearnedSummary | text | | | Key takeaways |
| lessonsLearnedShared | integer | | 0 | Boolean |
| lessonsLearnedAudience | text | | '[]' | JSON: who was informed |
| successMetrics | text | | '{}' | JSON: quantified results |
| costSavingsRealized | real | | | Actual savings |
| costOfQualityReduction | real | | | COQ improvement |
| cycleTimeDays | integer | | | Total days to close |
| onTimeCompletion | integer | | 0 | Boolean: met target date? |
| finalReport | text | | '{}' | JSON: report structure |
| finalReportDocumentId | integer | | | FK to document |
| archiveComplete | integer | | 0 | Boolean |
| archiveLocation | text | | | Where archived |
| closedBy | text | | | Final closer |
| closedAt | timestamp | | | |
| approvedBy | text | | | Management approval |
| approvedAt | timestamp | | | |
| d8CompletedAt | timestamp | | | |
| d8CompletedBy | text | | | |
| d8VerifiedAt | timestamp | | | |
| d8VerifiedBy | text | | | |
| d8Notes | text | | | |
| createdBy | text | ✓ | | |
| createdAt | timestamp | | NOW | |
| updatedAt | timestamp | | NOW | |

**Closure Criteria Checklist Structure:**
```json
{
  "items": [
    {"id": "CC-001", "description": "All containment actions closed", "required": true, "met": true, "verifiedBy": "user-123", "verifiedAt": "2024-03-05"},
    {"id": "CC-002", "description": "Root cause verified and documented", "required": true, "met": true, "verifiedBy": "user-456", "verifiedAt": "2024-03-05"},
    {"id": "CC-003", "description": "All corrective actions implemented", "required": true, "met": true, "verifiedBy": "user-123", "verifiedAt": "2024-03-05"},
    {"id": "CC-004", "description": "Effectiveness verified", "required": true, "met": true, "verifiedBy": "user-789", "verifiedAt": "2024-03-05"},
    {"id": "CC-005", "description": "Preventive actions deployed", "required": true, "met": true, "verifiedBy": "user-123", "verifiedAt": "2024-03-05"},
    {"id": "CC-006", "description": "Documentation updated (PFMEA, CP, WI)", "required": true, "met": true, "verifiedBy": "user-456", "verifiedAt": "2024-03-05"},
    {"id": "CC-007", "description": "Training completed", "required": true, "met": true, "verifiedBy": "user-234", "verifiedAt": "2024-03-05"},
    {"id": "CC-008", "description": "Customer acceptance received", "required": false, "met": true, "verifiedBy": "user-123", "verifiedAt": "2024-03-05"}
  ],
  "allRequiredMet": true,
  "completionDate": "2024-03-05"
}
```

**Team Recognition Structure:**
```json
{
  "recognitionType": "team_celebration",
  "date": "2024-03-10",
  "location": "Conference Room A",
  "attendees": ["user-123", "user-456", "user-789"],
  "managementPresent": ["user-001"],
  "achievements": [
    "Resolved critical customer issue in 21 days",
    "Implemented sustainable fix with 80% risk reduction",
    "Zero defects escaped since implementation"
  ],
  "awards": [
    {"recipient": "user-456", "award": "Problem Solving Excellence", "reason": "Led root cause analysis"}
  ],
  "notes": "Plant manager thanked team for rapid response"
}
```

**Success Metrics Structure:**
```json
{
  "qualityMetrics": {
    "defectRateBefore": 0.015,
    "defectRateAfter": 0,
    "improvement": 100,
    "measurementPeriod": "30 days"
  },
  "customerMetrics": {
    "complaintsClosed": true,
    "customerSatisfaction": "positive feedback received",
    "noRecurrence": true
  },
  "processMetrics": {
    "cpkBefore": 0.89,
    "cpkAfter": 2.14,
    "improvement": 140
  },
  "financialMetrics": {
    "containmentCost": 5000,
    "correctiveActionCost": 2500,
    "totalCost": 7500,
    "projectedAnnualSavings": 25000,
    "paybackMonths": 4
  }
}
```

**Indexes:**
- `capaIdx`: unique index on capaId (one D8 per CAPA)

---

### 3. capaAuditLog

Immutable audit trail for CAPA activities. Never update, never delete.

| Column | Type | Required | Default | Notes |
|--------|------|----------|---------|-------|
| id | serial | PK | | |
| orgId | uuid FK→organization | ✓ | | |
| capaId | integer FK→capa | ✓ | | NO CASCADE - keep orphan logs |
| discipline | text | | | D0-D8 or 'general' |
| action | text | ✓ | | See action list |
| entityType | text | | | What was affected |
| entityId | integer | | | ID of affected entity |
| userId | text | ✓ | | Who performed |
| userName | text | | | Denormalized |
| userRole | text | | | Role at time of action |
| timestamp | timestamp | | NOW | |
| previousValue | text | | | JSON: before state |
| newValue | text | | | JSON: after state |
| changeDescription | text | | | Human-readable change |
| ipAddress | text | | | |
| userAgent | text | | | |
| sessionId | text | | | |
| logHash | text | | | SHA-256 for tamper detection |
| previousLogHash | text | | | Chain reference |

**Action Values:**
- `created` - CAPA created
- `updated` - CAPA updated
- `status_changed` - Status transition
- `discipline_changed` - Moved to next discipline
- `team_member_added` - Team member added
- `team_member_removed` - Team member removed
- `attachment_uploaded` - File uploaded
- `attachment_deleted` - File deleted
- `source_added` - Source linked
- `related_record_linked` - Related record linked
- `emergency_action_added` - D0 action
- `containment_action_added` - D3 action
- `containment_verified` - D3 verified
- `root_cause_candidate_added` - D4 candidate
- `root_cause_verified` - D4 verified
- `corrective_action_added` - D5 action
- `corrective_action_approved` - D5 approved
- `validation_test_completed` - D6 test
- `effectiveness_verified` - D6 effectiveness
- `preventive_action_added` - D7 action
- `horizontal_deployment_completed` - D7 deployment
- `closure_criteria_met` - D8 criteria
- `capa_closed` - CAPA closed
- `capa_reopened` - CAPA reopened
- `commented` - Comment added
- `viewed` - CAPA viewed
- `exported` - Report exported
- `printed` - Report printed

**Hash Chain Logic (same as Document Control):**
```typescript
logHash = SHA256(previousLogHash + id + capaId + action + userId + timestamp)
```

**Indexes:**
- `capaIdx`: index on capaId
- `actionIdx`: index on action
- `userIdx`: index on userId
- `timestampIdx`: index on timestamp DESC
- `disciplineIdx`: index on discipline

---

### 4. capaMetricSnapshot

Periodic snapshots for analytics and trending.

| Column | Type | Required | Default | Notes |
|--------|------|----------|---------|-------|
| id | serial | PK | | |
| orgId | uuid FK→organization | ✓ | | |
| snapshotDate | timestamp | ✓ | | Date of snapshot |
| snapshotPeriod | text | ✓ | | 'daily' / 'weekly' / 'monthly' |
| totalCapas | integer | | 0 | Total active CAPAs |
| byStatus | text | | '{}' | JSON: count by status |
| byPriority | text | | '{}' | JSON: count by priority |
| bySourceType | text | | '{}' | JSON: count by source |
| byCategory | text | | '{}' | JSON: count by category |
| byDiscipline | text | | '{}' | JSON: count by current discipline |
| openedThisPeriod | integer | | 0 | New CAPAs |
| closedThisPeriod | integer | | 0 | Closed CAPAs |
| overdueCount | integer | | 0 | Past target date |
| avgAgeDays | real | | 0 | Average age of open CAPAs |
| avgCycleTimeDays | real | | 0 | Avg days to close |
| onTimeClosureRate | real | | 0 | % closed on time |
| effectivenessRate | real | | 0 | % verified effective |
| recurrenceRate | real | | 0 | % with recurrence |
| containmentEffectivenessRate | real | | 0 | D3 effectiveness |
| customerCapaCount | integer | | 0 | Customer-related |
| safetyCapaCount | integer | | 0 | Safety-related |
| topFailureModes | text | | '[]' | JSON: most common issues |
| topRootCauses | text | | '[]' | JSON: most common causes |
| costOfQuality | real | | 0 | Total COQ for period |
| costSavings | real | | 0 | Total savings |
| createdAt | timestamp | | NOW | |

**Indexes:**
- `orgDateIdx`: index on (orgId, snapshotDate)
- `periodIdx`: index on snapshotPeriod

---

## Relations

```
capaD7Preventive:
  → capa (one-to-one)
  → organization (many-to-one)

capaD8Closure:
  → capa (one-to-one)
  → organization (many-to-one)
  → document as finalReportDocument (many-to-one, optional)

capaAuditLog:
  → capa (many-to-one, NO CASCADE)
  → organization (many-to-one)

capaMetricSnapshot:
  → organization (many-to-one)

UPDATE capa relations to add:
  → d7Preventive: capaD7Preventive (one-to-one)
  → d8Closure: capaD8Closure (one-to-one)
  → auditLogs: capaAuditLog (one-to-many)
```

---

## Storage Methods

### capaD7Preventive
- `getCapaD7(capaId)` → CapaD7Preventive | undefined
- `createCapaD7(data)` → CapaD7Preventive
- `updateCapaD7(capaId, data)` → CapaD7Preventive
- `addPreventiveAction(capaId, action)` → CapaD7Preventive
- `updatePreventiveAction(capaId, actionId, data)` → CapaD7Preventive
- `updateHorizontalDeployment(capaId, location, status)` → CapaD7Preventive
- `verifyPreventiveAction(capaId, actionId, userId)` → CapaD7Preventive
- `createLessonLearned(capaId, lesson)` → CapaD7Preventive
- `completeD7(capaId, userId)` → CapaD7Preventive
- `verifyD7(capaId, userId)` → CapaD7Preventive
- `getHorizontalDeploymentStatus(orgId)` → {pending, complete, byArea}

### capaD8Closure
- `getCapaD8(capaId)` → CapaD8Closure | undefined
- `createCapaD8(data)` → CapaD8Closure
- `updateCapaD8(capaId, data)` → CapaD8Closure
- `updateClosureCriteriaItem(capaId, itemId, met, userId)` → CapaD8Closure
- `recordTeamRecognition(capaId, recognition)` → CapaD8Closure
- `submitForApproval(capaId, userId)` → CapaD8Closure
- `approveClosure(capaId, userId)` → CapaD8Closure
- `closeCapa(capaId, userId)` → CapaD8Closure (also updates main capa record)
- `reopenCapa(capaId, userId, reason)` → Capa
- `completeD8(capaId, userId)` → CapaD8Closure
- `verifyD8(capaId, userId)` → CapaD8Closure
- `generateFinalReport(capaId)` → FinalReport JSON

### capaAuditLog
- `getCapaAuditLogs(capaId, limit?)` → CapaAuditLog[]
- `getCapaAuditLogsByAction(capaId, action)` → CapaAuditLog[]
- `getCapaAuditLogsByUser(orgId, userId, limit?)` → CapaAuditLog[]
- `getCapaAuditLogsByDateRange(orgId, startDate, endDate)` → CapaAuditLog[]
- `createCapaAuditLog(data)` → CapaAuditLog (computes hash)
- `verifyAuditLogChain(capaId)` → {valid: boolean, brokenAt?: number}
- `getRecentActivity(orgId, limit?)` → CapaAuditLog[]

**Note: NO update or delete methods - audit logs are immutable**

### capaMetricSnapshot
- `getLatestSnapshot(orgId)` → CapaMetricSnapshot | undefined
- `getSnapshotsByDateRange(orgId, startDate, endDate)` → CapaMetricSnapshot[]
- `getSnapshotsByPeriod(orgId, period, limit?)` → CapaMetricSnapshot[]
- `createSnapshot(orgId)` → CapaMetricSnapshot (calculates current metrics)
- `getTrendData(orgId, metric, periods)` → {date, value}[]
- `compareSnapshots(snapshot1Id, snapshot2Id)` → Comparison

---

## Seed Data

### For CAPA-2024-0001 (Complete)

**D7 Preventive:**
```json
{
  "systemicAnalysisComplete": true,
  "similarProcessesIdentified": ["Injection molding on Press #1, #2, #4, #5"],
  "horizontalDeploymentPlan": {/* deployment to other presses */},
  "preventiveActions": [/* 3 actions: horizontal deployment, procedure update, training */],
  "policyChangesRequired": false,
  "procedureChangesRequired": true,
  "procedureChanges": [{"document": "QP-0012", "change": "Added quarterly SPC review"}],
  "lessonLearnedCreated": true,
  "d7CompletedAt": "2024-03-08T17:00:00Z"
}
```

**D8 Closure:**
```json
{
  "closureCriteriaMet": true,
  "closureCriteriaChecklist": {/* 8 items all met */},
  "allActionsComplete": true,
  "effectivenessConfirmed": true,
  "customerClosed": true,
  "teamRecognition": {/* celebration details */},
  "successMetrics": {/* quality, financial metrics */},
  "cycleTimeDays": 23,
  "onTimeCompletion": true,
  "closedAt": "2024-03-10T16:00:00Z",
  "d8CompletedAt": "2024-03-10T16:00:00Z"
}
```

### Audit Logs (15-20 entries for CAPA-0001 showing full lifecycle)

### Metric Snapshots (3 monthly snapshots with sample data)

---

## Validation Checklist

- [ ] All 4 tables created in schema.ts
- [ ] All relations defined
- [ ] All Zod insert schemas created
- [ ] All types exported
- [ ] ~35 storage methods implemented
- [ ] Audit log hash chain works correctly
- [ ] Metric snapshot calculation works
- [ ] Seed creates D7-D8 for completed CAPA
- [ ] Audit logs populated for all 3 CAPAs
- [ ] Metric snapshots populated
- [ ] `npx drizzle-kit push` succeeds
- [ ] Server starts without errors
- [ ] `npm run seed` succeeds
- [ ] No TypeScript errors
