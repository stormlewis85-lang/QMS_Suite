# CAPA-DB-2: 8D Disciplines D0-D3 (Emergency Response Through Containment)

**Read RALPH_PATTERNS.md first. CAPA-DB-1 must be complete.**

---

## Mission

Add 4 tables for the first four 8D disciplines:
- D0: Awareness & Emergency Response Actions
- D1: Team Formation (detailed tracking beyond capaTeamMember)
- D2: Problem Description using Is/Is Not analysis
- D3: Interim Containment Actions

Each discipline has its own workflow, verification, and documentation requirements.

---

## Tables

### 1. capaD0Emergency

D0: Awareness and Emergency Response Actions. Immediate actions taken upon discovery.

| Column | Type | Required | Default | Notes |
|--------|------|----------|---------|-------|
| id | serial | PK | | |
| orgId | uuid FK→organization | ✓ | | |
| capaId | integer FK→capa | ✓ | | CASCADE delete |
| emergencyResponseRequired | integer | ✓ | 0 | Boolean: was emergency response needed? |
| responseType | text | | | 'containment' / 'stop_shipment' / 'customer_notification' / 'recall' / 'none' |
| immediateThreat | text | | | Description of immediate threat |
| threatLevel | text | | 'none' | 'critical' / 'high' / 'medium' / 'low' / 'none' |
| safetyImpact | integer | | 0 | Boolean: is there safety impact? |
| safetyDescription | text | | | Details of safety concern |
| regulatoryImpact | integer | | 0 | Boolean: regulatory reporting required? |
| regulatoryBody | text | | | Which agency (NHTSA, EPA, etc.) |
| regulatoryDeadline | timestamp | | | Reporting deadline |
| regulatorySubmittedAt | timestamp | | | When submitted |
| customerNotificationRequired | integer | | 0 | Boolean |
| customerNotifiedAt | timestamp | | | |
| customerNotifiedBy | text | | | |
| customerResponse | text | | | |
| stopShipmentIssued | integer | | 0 | Boolean |
| stopShipmentScope | text | | | What was stopped |
| stopShipmentIssuedAt | timestamp | | | |
| stopShipmentIssuedBy | text | | | |
| stopShipmentLiftedAt | timestamp | | | |
| stopShipmentLiftedBy | text | | | |
| emergencyActions | text | | '[]' | JSON array - see below |
| quantityAtRisk | integer | | | Parts at risk |
| quantityContained | integer | | | Parts contained |
| containmentLocations | text | | '[]' | JSON: where is material held |
| initialSortRequired | integer | | 0 | Boolean |
| sortMethod | text | | | 100% / sampling / other |
| sortResults | text | | '{}' | JSON: {total, pass, fail, suspect} |
| symptomsCaptured | integer | | 0 | Boolean: have we captured all symptoms? |
| symptomsDescription | text | | | Initial symptom description |
| d0CompletedAt | timestamp | | | |
| d0CompletedBy | text | | | |
| d0VerifiedAt | timestamp | | | |
| d0VerifiedBy | text | | | |
| d0Notes | text | | | |
| createdBy | text | ✓ | | |
| createdAt | timestamp | | NOW | |
| updatedAt | timestamp | | NOW | |

**Emergency Actions Structure:**
```json
[
  {
    "action": "Stop production on Press #3",
    "priority": "immediate",
    "assignedTo": "user-123",
    "assignedAt": "2024-02-10T08:00:00Z",
    "dueBy": "2024-02-10T08:30:00Z",
    "completedAt": "2024-02-10T08:15:00Z",
    "completedBy": "user-123",
    "result": "Production stopped, line cleared",
    "verifiedAt": "2024-02-10T08:20:00Z",
    "verifiedBy": "user-456"
  },
  {
    "action": "Quarantine suspect material in warehouse",
    "priority": "urgent",
    "assignedTo": "user-789",
    "assignedAt": "2024-02-10T08:00:00Z",
    "dueBy": "2024-02-10T12:00:00Z",
    "completedAt": "2024-02-10T10:30:00Z",
    "completedBy": "user-789",
    "result": "500 parts quarantined in Area Q-3",
    "quantityAffected": 500
  }
]
```

**Indexes:**
- `capaIdx`: unique index on capaId (one D0 per CAPA)
- `threatLevelIdx`: index on threatLevel
- `safetyIdx`: index on safetyImpact

---

### 2. capaD1TeamDetail

D1: Detailed team formation tracking. Extends capaTeamMember with D1-specific data.

| Column | Type | Required | Default | Notes |
|--------|------|----------|---------|-------|
| id | serial | PK | | |
| orgId | uuid FK→organization | ✓ | | |
| capaId | integer FK→capa | ✓ | | CASCADE delete |
| teamFormationDate | timestamp | | | When team was formed |
| teamFormationMethod | text | | | 'ad_hoc' / 'standard_roster' / 'cross_functional' |
| teamCharterDefined | integer | | 0 | Boolean |
| teamCharterDocument | text | | | Reference to charter document |
| teamObjective | text | | | Clear problem-solving objective |
| teamScope | text | | | What is in/out of scope |
| teamBoundaries | text | | | Authority limits |
| communicationPlan | text | | '{}' | JSON: {frequency, method, stakeholders} |
| meetingSchedule | text | | '[]' | JSON: recurring meetings |
| escalationPath | text | | '[]' | JSON: escalation contacts |
| resourcesRequired | text | | '[]' | JSON: tools, budget, access needed |
| resourcesApproved | integer | | 0 | Boolean |
| resourcesApprovedBy | text | | | |
| resourcesApprovedAt | timestamp | | | |
| skillsGapIdentified | text | | '[]' | JSON: missing skills |
| skillsGapAddressed | integer | | 0 | Boolean |
| teamEffectivenessScore | integer | | | 1-5 rating at closure |
| teamEffectivenessNotes | text | | | |
| d1CompletedAt | timestamp | | | |
| d1CompletedBy | text | | | |
| d1VerifiedAt | timestamp | | | |
| d1VerifiedBy | text | | | |
| d1Notes | text | | | |
| createdBy | text | ✓ | | |
| createdAt | timestamp | | NOW | |
| updatedAt | timestamp | | NOW | |

**Communication Plan Structure:**
```json
{
  "frequency": "daily",
  "method": "standup",
  "duration": "15min",
  "stakeholders": [
    {"name": "Plant Manager", "frequency": "weekly", "method": "email"},
    {"name": "Customer", "frequency": "as_needed", "method": "formal_report"}
  ],
  "statusReportTemplate": "8D Status Template v2"
}
```

**Meeting Schedule Structure:**
```json
[
  {
    "name": "Daily Standup",
    "frequency": "daily",
    "time": "08:00",
    "duration": 15,
    "location": "Conference Room B",
    "attendees": ["all_team"]
  },
  {
    "name": "Weekly Review",
    "frequency": "weekly",
    "day": "Friday",
    "time": "14:00",
    "duration": 60,
    "attendees": ["team", "champion", "management"]
  }
]
```

**Indexes:**
- `capaIdx`: unique index on capaId (one D1 per CAPA)

---

### 3. capaD2Problem

D2: Problem Description using Is/Is Not analysis. The foundation of good 8D.

| Column | Type | Required | Default | Notes |
|--------|------|----------|---------|-------|
| id | serial | PK | | |
| orgId | uuid FK→organization | ✓ | | |
| capaId | integer FK→capa | ✓ | | CASCADE delete |
| problemStatement | text | ✓ | | Clear, measurable problem statement |
| problemStatementVerified | integer | | 0 | Boolean |
| problemStatementVerifiedBy | text | | | |
| objectDescription | text | | | WHAT: What object has the problem? |
| defectDescription | text | | | WHAT: What is the defect? |
| isNotWhat | text | | '{}' | JSON: Is/Is Not for WHAT |
| whereGeographic | text | | | WHERE: Geographic location |
| whereOnObject | text | | | WHERE: Location on the object |
| isNotWhere | text | | '{}' | JSON: Is/Is Not for WHERE |
| whenFirstObserved | timestamp | | | WHEN: First occurrence |
| whenPattern | text | | | WHEN: Pattern (continuous, intermittent, etc.) |
| whenLifecycle | text | | | WHEN: In product lifecycle |
| isNotWhen | text | | '{}' | JSON: Is/Is Not for WHEN |
| howManyUnits | integer | | | HOW MANY: Units affected |
| howManyDefects | integer | | | HOW MANY: Defects per unit |
| howManyTrend | text | | | HOW MANY: Trend (increasing, stable, etc.) |
| isNotHowMany | text | | '{}' | JSON: Is/Is Not for HOW MANY |
| distinctionsSummary | text | | | Key distinctions from Is/Is Not |
| changesSummary | text | | | Changes that correlate with problem |
| problemExtent | text | | | Magnitude and significance |
| problemImpact | text | | | Impact on customer/operations |
| fiveWsComplete | integer | | 0 | Boolean: all 5W+1H answered? |
| dataCollectionPlan | text | | '{}' | JSON: what data to collect |
| dataCollected | text | | '[]' | JSON: data points collected |
| measurementSystemValid | integer | | 0 | Boolean: MSA verified? |
| measurementSystemNotes | text | | | MSA details/concerns |
| d2CompletedAt | timestamp | | | |
| d2CompletedBy | text | | | |
| d2VerifiedAt | timestamp | | | |
| d2VerifiedBy | text | | | |
| d2Notes | text | | | |
| createdBy | text | ✓ | | |
| createdAt | timestamp | | NOW | |
| updatedAt | timestamp | | NOW | |

**Is/Is Not Structure (for each dimension):**
```json
{
  "is": [
    {"observation": "Stiffener part 3004-XYZ", "evidence": "Customer complaint, CMM report"},
    {"observation": "3.5mm critical dimension", "evidence": "Drawing callout"}
  ],
  "isNot": [
    {"observation": "Other part numbers (3004-ABC, 3004-DEF)", "distinction": "Only this part affected"},
    {"observation": "Other dimensions on same part", "distinction": "Only one characteristic"}
  ],
  "distinctions": "Unique tooling for this dimension, different supplier for this tool"
}
```

**Data Collection Plan Structure:**
```json
{
  "metrics": [
    {"name": "Dimension 3.5mm", "target": "3.50", "tolerance": "±0.20", "method": "CMM", "frequency": "100%"},
    {"name": "Press Temperature", "target": "210°C", "tolerance": "±5°C", "method": "Thermocouple", "frequency": "continuous"}
  ],
  "samples": {"source": "production", "quantity": 50, "criteria": "consecutive parts"},
  "timeframe": "2024-02-12 to 2024-02-15",
  "responsible": "user-123"
}
```

**Indexes:**
- `capaIdx`: unique index on capaId (one D2 per CAPA)

---

### 4. capaD3Containment

D3: Interim Containment Actions. Protect the customer while investigating.

| Column | Type | Required | Default | Notes |
|--------|------|----------|---------|-------|
| id | serial | PK | | |
| orgId | uuid FK→organization | ✓ | | |
| capaId | integer FK→capa | ✓ | | CASCADE delete |
| containmentRequired | integer | ✓ | 1 | Boolean |
| containmentNotRequiredReason | text | | | Why not needed |
| containmentStrategy | text | | | Overall approach |
| containmentScope | text | | '{}' | JSON: what's covered |
| containmentLocations | text | | '[]' | JSON: where actions apply |
| actions | text | | '[]' | JSON array - see below |
| verificationMethod | text | | | How containment verified |
| verificationFrequency | text | | | How often to verify |
| verificationResults | text | | '[]' | JSON: verification records |
| containmentEffective | integer | | 0 | Boolean |
| containmentEffectiveDate | timestamp | | | When confirmed effective |
| containmentEffectiveEvidence | text | | | Proof of effectiveness |
| quantityInspected | integer | | 0 | |
| quantityPassed | integer | | 0 | |
| quantityFailed | integer | | 0 | |
| quantityReworked | integer | | 0 | |
| quantityScrapped | integer | | 0 | |
| quantityOnHold | integer | | 0 | |
| wip | text | | '{}' | JSON: WIP status by location |
| finishedGoods | text | | '{}' | JSON: FG status by location |
| inTransit | text | | '{}' | JSON: in-transit status |
| atCustomer | text | | '{}' | JSON: at-customer status |
| supplierContainment | text | | '{}' | JSON: supplier actions if applicable |
| sortingInstructions | text | | | Work instructions for sorting |
| sortingTraining | integer | | 0 | Boolean: sorters trained? |
| sortingStartDate | timestamp | | | |
| sortingEndDate | timestamp | | | |
| costOfContainment | real | | 0 | Total containment cost |
| costBreakdown | text | | '{}' | JSON: {labor, material, shipping, expedite} |
| customerApprovalRequired | integer | | 0 | Boolean |
| customerApprovalReceived | integer | | 0 | Boolean |
| customerApprovalDate | timestamp | | | |
| customerApprovalReference | text | | | Customer approval document |
| exitCriteria | text | | | When can containment end? |
| exitCriteriaMet | integer | | 0 | Boolean |
| exitCriteriaMetDate | timestamp | | | |
| transitionToPermanent | text | | | Plan to transition to D5 |
| d3CompletedAt | timestamp | | | |
| d3CompletedBy | text | | | |
| d3VerifiedAt | timestamp | | | |
| d3VerifiedBy | text | | | |
| d3Notes | text | | | |
| createdBy | text | ✓ | | |
| createdAt | timestamp | | NOW | |
| updatedAt | timestamp | | NOW | |

**Containment Actions Structure:**
```json
[
  {
    "id": "ICA-001",
    "action": "100% inspection of critical dimension at Final Inspection",
    "type": "inspection",
    "location": "Final Inspection",
    "assignedTo": "user-123",
    "assignedAt": "2024-02-12T08:00:00Z",
    "dueDate": "2024-02-12T12:00:00Z",
    "implementedAt": "2024-02-12T10:00:00Z",
    "implementedBy": "user-123",
    "instructions": "Use gage #CMM-001, measure per WI-INS-0045",
    "trainingCompleted": true,
    "verifiedAt": "2024-02-12T14:00:00Z",
    "verifiedBy": "user-456",
    "effectivenessCheck": "No defects escaped in 2 shifts",
    "status": "active",
    "endDate": null
  },
  {
    "id": "ICA-002",
    "action": "Sort quarantined inventory",
    "type": "sorting",
    "location": "Warehouse Q-3",
    "assignedTo": "user-789",
    "dueDate": "2024-02-13T17:00:00Z",
    "implementedAt": "2024-02-13T16:00:00Z",
    "results": {"total": 500, "pass": 485, "fail": 15, "suspect": 0},
    "status": "complete"
  }
]
```

**Containment Scope Structure:**
```json
{
  "partNumbers": ["3004-XYZ"],
  "operations": ["Op 30 - Injection Molding", "Op 40 - Final Inspection"],
  "dateRange": {"from": "2024-02-01", "to": "2024-02-12"},
  "lotNumbers": ["L2024-0210", "L2024-0211", "L2024-0212"],
  "equipment": ["Press #3"],
  "shifts": ["all"]
}
```

**WIP/FG/Transit/Customer Status Structure:**
```json
{
  "locations": [
    {"name": "Production Floor", "quantity": 150, "status": "sorted", "passQty": 145, "failQty": 5},
    {"name": "Warehouse A", "quantity": 300, "status": "quarantined", "sortedQty": 0},
    {"name": "Shipping Dock", "quantity": 50, "status": "hold_shipment"}
  ],
  "totalQuantity": 500,
  "totalSorted": 150,
  "totalOnHold": 350
}
```

**Indexes:**
- `capaIdx`: unique index on capaId (one D3 per CAPA)
- `effectiveIdx`: index on containmentEffective

---

## Relations

```
capaD0Emergency:
  → capa (one-to-one)
  → organization (many-to-one)

capaD1TeamDetail:
  → capa (one-to-one)
  → organization (many-to-one)

capaD2Problem:
  → capa (one-to-one)
  → organization (many-to-one)

capaD3Containment:
  → capa (one-to-one)
  → organization (many-to-one)

UPDATE capa relations to add:
  → d0Emergency: capaD0Emergency (one-to-one)
  → d1TeamDetail: capaD1TeamDetail (one-to-one)
  → d2Problem: capaD2Problem (one-to-one)
  → d3Containment: capaD3Containment (one-to-one)
```

---

## Storage Methods

### capaD0Emergency
- `getCapaD0(capaId)` → CapaD0Emergency | undefined
- `createCapaD0(data)` → CapaD0Emergency
- `updateCapaD0(capaId, data)` → CapaD0Emergency
- `addEmergencyAction(capaId, action)` → CapaD0Emergency
- `updateEmergencyAction(capaId, actionIndex, data)` → CapaD0Emergency
- `completeD0(capaId, userId)` → CapaD0Emergency
- `verifyD0(capaId, userId)` → CapaD0Emergency
- `getCapasWithSafetyImpact(orgId)` → Capa[]
- `getCapasWithRegulatoryImpact(orgId)` → Capa[]

### capaD1TeamDetail
- `getCapaD1(capaId)` → CapaD1TeamDetail | undefined
- `createCapaD1(data)` → CapaD1TeamDetail
- `updateCapaD1(capaId, data)` → CapaD1TeamDetail
- `completeD1(capaId, userId)` → CapaD1TeamDetail
- `verifyD1(capaId, userId)` → CapaD1TeamDetail
- `approveResources(capaId, userId)` → CapaD1TeamDetail
- `addMeetingToSchedule(capaId, meeting)` → CapaD1TeamDetail
- `updateTeamEffectiveness(capaId, score, notes)` → CapaD1TeamDetail

### capaD2Problem
- `getCapaD2(capaId)` → CapaD2Problem | undefined
- `createCapaD2(data)` → CapaD2Problem
- `updateCapaD2(capaId, data)` → CapaD2Problem
- `updateIsNotAnalysis(capaId, dimension, data)` → CapaD2Problem
- `verifyProblemStatement(capaId, userId)` → CapaD2Problem
- `addDataPoint(capaId, dataPoint)` → CapaD2Problem
- `completeD2(capaId, userId)` → CapaD2Problem
- `verifyD2(capaId, userId)` → CapaD2Problem
- `verifyMeasurementSystem(capaId, isValid, notes)` → CapaD2Problem

### capaD3Containment
- `getCapaD3(capaId)` → CapaD3Containment | undefined
- `createCapaD3(data)` → CapaD3Containment
- `updateCapaD3(capaId, data)` → CapaD3Containment
- `addContainmentAction(capaId, action)` → CapaD3Containment
- `updateContainmentAction(capaId, actionId, data)` → CapaD3Containment
- `implementAction(capaId, actionId, userId)` → CapaD3Containment
- `verifyAction(capaId, actionId, userId, evidence)` → CapaD3Containment
- `recordSortResults(capaId, location, results)` → CapaD3Containment
- `verifyContainmentEffectiveness(capaId, userId, evidence)` → CapaD3Containment
- `recordVerificationResult(capaId, result)` → CapaD3Containment
- `completeD3(capaId, userId)` → CapaD3Containment
- `verifyD3(capaId, userId)` → CapaD3Containment
- `getActiveContainments(orgId)` → CapaD3Containment[]
- `getContainmentMetrics(orgId)` → {totalActive, totalCost, avgDuration}

---

## Seed Data

### For CAPA-2024-0001 (Customer Complaint)

**D0 Emergency:**
```json
{
  "emergencyResponseRequired": true,
  "responseType": "stop_shipment",
  "threatLevel": "high",
  "safetyImpact": false,
  "customerNotificationRequired": true,
  "customerNotifiedAt": "2024-02-12T09:00:00Z",
  "stopShipmentIssued": true,
  "stopShipmentScope": "All lots since 2024-02-01",
  "quantityAtRisk": 2500,
  "quantityContained": 2500,
  "emergencyActions": [/* 3 actions: stop production, quarantine, notify customer */],
  "d0CompletedAt": "2024-02-12T12:00:00Z"
}
```

**D1 Team Detail:**
```json
{
  "teamFormationDate": "2024-02-12T10:00:00Z",
  "teamFormationMethod": "cross_functional",
  "teamCharterDefined": true,
  "teamObjective": "Identify root cause and implement permanent corrective action for dimension issue",
  "communicationPlan": {/* daily standups, weekly customer updates */},
  "meetingSchedule": [/* daily 15min, weekly 1hr */],
  "d1CompletedAt": "2024-02-12T14:00:00Z"
}
```

**D2 Problem:**
```json
{
  "problemStatement": "Critical dimension 3.5mm ±0.20mm is measuring 3.72mm (out of tolerance high) on part 3004-XYZ, affecting 15 parts in lot L2024-0215, discovered at customer incoming inspection on 2024-02-12",
  "problemStatementVerified": true,
  "objectDescription": "Stiffener part 3004-XYZ",
  "defectDescription": "Dimension 3.72mm vs 3.50mm nominal",
  "isNotWhat": {/* detailed Is/Is Not */},
  "fiveWsComplete": true,
  "measurementSystemValid": true,
  "d2CompletedAt": "2024-02-13T16:00:00Z"
}
```

**D3 Containment:**
```json
{
  "containmentRequired": true,
  "containmentStrategy": "100% inspection of critical dimension + supplier sorting",
  "actions": [/* 4 actions: inspection, sorting, supplier containment, WIP review */],
  "containmentEffective": true,
  "quantityInspected": 2500,
  "quantityPassed": 2350,
  "quantityFailed": 150,
  "d3CompletedAt": "2024-02-15T17:00:00Z"
}
```

### For CAPA-2024-0002 and CAPA-2024-0003

Create appropriate D0-D3 records showing different scenarios:
- CAPA-0002: No emergency response needed, process-focused containment
- CAPA-0003: Audit finding, minimal containment (document updates)

---

## Validation Checklist

- [ ] All 4 tables created in schema.ts
- [ ] All relations defined (one-to-one with capa)
- [ ] All Zod insert schemas created
- [ ] All types exported
- [ ] ~35 storage methods implemented
- [ ] Seed creates D0-D3 for all 3 CAPAs
- [ ] Is/Is Not JSON structures work correctly
- [ ] Action arrays support add/update operations
- [ ] `npx drizzle-kit push` succeeds
- [ ] Server starts without errors
- [ ] `npm run seed` succeeds
- [ ] No TypeScript errors
