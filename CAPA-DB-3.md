# CAPA-DB-3: 8D Disciplines D4-D6 (Root Cause Through Validation)

**Read RALPH_PATTERNS.md first. CAPA-DB-1 and CAPA-DB-2 must be complete.**

---

## Mission

Add 4 tables for the middle 8D disciplines:
- D4: Root Cause Analysis (5-Why, Fishbone, fault trees)
- D5: Permanent Corrective Actions selection and planning
- D6: Implementation and Validation of corrective actions

These are the analytical heart of the 8D process.

---

## Tables

### 1. capaD4RootCause

D4: Root Cause Analysis. Multiple analysis methods, escape point identification.

| Column | Type | Required | Default | Notes |
|--------|------|----------|---------|-------|
| id | serial | PK | | |
| orgId | uuid FK→organization | ✓ | | |
| capaId | integer FK→capa | ✓ | | CASCADE delete |
| analysisApproach | text | | '[]' | JSON: methods used |
| possibleCauses | text | | '[]' | JSON array - brainstormed causes |
| fiveWhyAnalysis | text | | '[]' | JSON array - 5-Why chains |
| fishboneDiagram | text | | '{}' | JSON - Ishikawa structure |
| faultTreeAnalysis | text | | '{}' | JSON - fault tree structure |
| isIsNotConclusions | text | | | Key conclusions from D2 analysis |
| dataAnalysis | text | | '[]' | JSON: data analysis performed |
| experimentsConducted | text | | '[]' | JSON: DOE, trials, etc. |
| verificationTests | text | | '[]' | JSON: tests to verify cause |
| rootCauseOccurrence | text | | | Root cause of OCCURRENCE (why it happened) |
| rootCauseOccurrenceEvidence | text | | | Evidence supporting occurrence root cause |
| rootCauseOccurrenceVerified | integer | | 0 | Boolean |
| rootCauseOccurrenceVerifiedBy | text | | | |
| rootCauseOccurrenceVerifiedAt | timestamp | | | |
| rootCauseEscape | text | | | Root cause of ESCAPE (why not detected) |
| rootCauseEscapeEvidence | text | | | Evidence supporting escape root cause |
| rootCauseEscapeVerified | integer | | 0 | Boolean |
| rootCauseEscapeVerifiedBy | text | | | |
| rootCauseEscapeVerifiedAt | timestamp | | | |
| escapePoint | text | | | Where defect should have been caught |
| escapePointAnalysis | text | | | Why it wasn't caught |
| systemicCauses | text | | '[]' | JSON: system/process gaps |
| contributingFactors | text | | '[]' | JSON: secondary factors |
| humanFactorsAnalysis | text | | '{}' | JSON: if human error involved |
| equipmentFactorsAnalysis | text | | '{}' | JSON: if equipment involved |
| materialFactorsAnalysis | text | | '{}' | JSON: if material involved |
| methodFactorsAnalysis | text | | '{}' | JSON: if method/process involved |
| environmentFactorsAnalysis | text | | '{}' | JSON: if environment involved |
| rootCauseSummary | text | | | Executive summary of root cause |
| confidenceLevel | text | | | 'high' / 'medium' / 'low' |
| additionalInvestigationNeeded | integer | | 0 | Boolean |
| additionalInvestigationPlan | text | | | What more is needed |
| d4CompletedAt | timestamp | | | |
| d4CompletedBy | text | | | |
| d4VerifiedAt | timestamp | | | |
| d4VerifiedBy | text | | | |
| d4Notes | text | | | |
| createdBy | text | ✓ | | |
| createdAt | timestamp | | NOW | |
| updatedAt | timestamp | | NOW | |

**5-Why Analysis Structure:**
```json
[
  {
    "id": "5W-001",
    "causeType": "occurrence",
    "startingPoint": "Dimension out of specification",
    "whys": [
      {"level": 1, "question": "Why is dimension out of spec?", "answer": "Part is measuring 3.72mm instead of 3.50mm"},
      {"level": 2, "question": "Why is part measuring 3.72mm?", "answer": "Tool insert is worn"},
      {"level": 3, "question": "Why is tool insert worn?", "answer": "Insert exceeded tool life"},
      {"level": 4, "question": "Why did insert exceed tool life?", "answer": "Tool change schedule not followed"},
      {"level": 5, "question": "Why wasn't schedule followed?", "answer": "No automated alert system, relying on manual tracking"}
    ],
    "rootCause": "No automated tool life monitoring system to enforce preventive tool changes",
    "verifiedBy": "user-123",
    "verifiedAt": "2024-02-14T15:00:00Z"
  },
  {
    "id": "5W-002",
    "causeType": "escape",
    "startingPoint": "Defective parts shipped to customer",
    "whys": [
      {"level": 1, "question": "Why were defective parts shipped?", "answer": "Parts passed final inspection"},
      {"level": 2, "question": "Why did they pass inspection?", "answer": "Sampling plan only checks 5 per lot"},
      {"level": 3, "question": "Why only 5 per lot?", "answer": "Control plan based on historical Cpk > 1.67"},
      {"level": 4, "question": "Why wasn't Cpk recalculated?", "answer": "SPC monitoring not catching the drift"},
      {"level": 5, "question": "Why not catching drift?", "answer": "Control limits based on old process capability"}
    ],
    "rootCause": "SPC control limits not updated after process change 6 months ago",
    "verifiedBy": "user-456",
    "verifiedAt": "2024-02-14T16:00:00Z"
  }
]
```

**Fishbone Diagram Structure:**
```json
{
  "problem": "Dimension out of specification",
  "categories": {
    "man": [
      {"cause": "Operator didn't follow tool change procedure", "likelihood": "low", "verified": true},
      {"cause": "Training not current", "likelihood": "medium", "verified": false}
    ],
    "machine": [
      {"cause": "Tool insert worn", "likelihood": "high", "verified": true, "isRootCause": true},
      {"cause": "Press calibration drift", "likelihood": "low", "verified": true}
    ],
    "material": [
      {"cause": "Resin batch variation", "likelihood": "low", "verified": true}
    ],
    "method": [
      {"cause": "Tool life not monitored", "likelihood": "high", "verified": true, "isRootCause": true}
    ],
    "measurement": [
      {"cause": "CMM calibration", "likelihood": "low", "verified": true},
      {"cause": "Sampling frequency", "likelihood": "medium", "verified": true, "isEscapeCause": true}
    ],
    "environment": [
      {"cause": "Temperature variation", "likelihood": "low", "verified": true}
    ]
  },
  "createdAt": "2024-02-14T10:00:00Z",
  "lastUpdated": "2024-02-14T16:00:00Z"
}
```

**Verification Test Structure:**
```json
[
  {
    "testId": "VT-001",
    "hypothesis": "Worn tool insert causes oversized dimension",
    "testMethod": "Replace insert and measure 50 consecutive parts",
    "expectedResult": "All parts within specification",
    "actualResult": "48/50 within spec, 2 at upper limit",
    "conclusion": "Hypothesis confirmed - new insert resolves issue",
    "conductedBy": "user-123",
    "conductedAt": "2024-02-14T14:00:00Z",
    "data": {"samples": 50, "min": 3.42, "max": 3.58, "mean": 3.51, "stdDev": 0.03}
  }
]
```

**Indexes:**
- `capaIdx`: unique index on capaId (one D4 per CAPA)
- `confidenceIdx`: index on confidenceLevel

---

### 2. capaD5CorrectiveAction

D5: Permanent Corrective Actions. Selection, planning, risk assessment.

| Column | Type | Required | Default | Notes |
|--------|------|----------|---------|-------|
| id | serial | PK | | |
| orgId | uuid FK→organization | ✓ | | |
| capaId | integer FK→capa | ✓ | | CASCADE delete |
| correctiveActionsSelected | text | | '[]' | JSON array - see below |
| alternativesConsidered | text | | '[]' | JSON: options evaluated |
| selectionCriteria | text | | '{}' | JSON: decision matrix |
| occurrenceActionSummary | text | | | Summary of occurrence correction |
| escapeActionSummary | text | | | Summary of escape correction |
| riskAssessment | text | | '{}' | JSON: FMEA-style risk |
| implementationPlan | text | | '{}' | JSON: detailed plan |
| resourceRequirements | text | | '{}' | JSON: people, budget, equipment |
| resourcesApproved | integer | | 0 | Boolean |
| resourcesApprovedBy | text | | | |
| resourcesApprovedAt | timestamp | | | |
| timeline | text | | '[]' | JSON: milestones |
| dependencies | text | | '[]' | JSON: what must happen first |
| potentialObstacles | text | | '[]' | JSON: anticipated blockers |
| contingencyPlan | text | | | Backup plan |
| pfmeaUpdatesRequired | integer | | 0 | Boolean |
| pfmeaUpdatePlan | text | | | What to update |
| controlPlanUpdatesRequired | integer | | 0 | Boolean |
| controlPlanUpdatePlan | text | | | What to update |
| documentUpdatesRequired | integer | | 0 | Boolean |
| documentUpdateList | text | | '[]' | JSON: documents to update |
| trainingRequired | integer | | 0 | Boolean |
| trainingPlan | text | | '{}' | JSON: who, what, when |
| customerApprovalRequired | integer | | 0 | Boolean |
| customerApprovalStatus | text | | | pending / approved / rejected |
| customerApprovalDate | timestamp | | | |
| customerApprovalNotes | text | | | |
| managementApprovalRequired | integer | | 1 | Boolean |
| managementApprovalStatus | text | | | pending / approved / rejected |
| managementApprovedBy | text | | | |
| managementApprovedAt | timestamp | | | |
| estimatedCost | real | | | Projected cost |
| estimatedSavings | real | | | Projected savings |
| estimatedPaybackMonths | integer | | | ROI timeframe |
| d5CompletedAt | timestamp | | | |
| d5CompletedBy | text | | | |
| d5VerifiedAt | timestamp | | | |
| d5VerifiedBy | text | | | |
| d5Notes | text | | | |
| createdBy | text | ✓ | | |
| createdAt | timestamp | | NOW | |
| updatedAt | timestamp | | NOW | |

**Corrective Actions Structure:**
```json
[
  {
    "id": "PCA-001",
    "type": "occurrence",
    "rootCauseAddressed": "No automated tool life monitoring",
    "action": "Implement tool life counter with automatic lockout",
    "description": "Install Fanuc tool life management on Press #3. Counter will track shots and lock out press when limit reached.",
    "responsible": "user-123",
    "dueDate": "2024-03-01",
    "priority": "high",
    "status": "planned",
    "resourcesNeeded": ["PLC programmer: 8 hours", "Maintenance: 4 hours", "Parts: $500"],
    "successCriteria": "Zero tool-life-related dimension failures for 3 months",
    "verificationMethod": "Review SPC data and tool change records monthly",
    "implementedAt": null,
    "implementedBy": null,
    "verifiedAt": null,
    "verifiedBy": null,
    "effectivenessResult": null
  },
  {
    "id": "PCA-002",
    "type": "escape",
    "rootCauseAddressed": "SPC limits not updated",
    "action": "Recalculate and update SPC limits quarterly",
    "description": "Add SPC review to quarterly quality review agenda. Process engineer to recalculate limits using recent 100 samples.",
    "responsible": "user-456",
    "dueDate": "2024-02-28",
    "priority": "medium",
    "status": "planned",
    "successCriteria": "Control limits reflect current process capability",
    "verificationMethod": "Audit of SPC chart limits vs calculated values"
  }
]
```

**Alternatives Considered Structure:**
```json
[
  {
    "option": "Manual tool tracking with paper log",
    "pros": ["Low cost", "Quick to implement"],
    "cons": ["Relies on human compliance", "No automatic lockout"],
    "estimatedCost": 500,
    "estimatedEffectiveness": "medium",
    "rejected": true,
    "rejectionReason": "Does not address root cause of human error"
  },
  {
    "option": "Automated tool life management",
    "pros": ["Automatic enforcement", "Data logging", "No human error"],
    "cons": ["Higher cost", "Requires PLC programming"],
    "estimatedCost": 2500,
    "estimatedEffectiveness": "high",
    "selected": true
  }
]
```

**Risk Assessment Structure:**
```json
{
  "beforeCorrection": {
    "severity": 8,
    "occurrence": 6,
    "detection": 5,
    "rpn": 240,
    "actionPriority": "H"
  },
  "afterCorrection": {
    "severity": 8,
    "occurrence": 2,
    "detection": 3,
    "rpn": 48,
    "actionPriority": "L"
  },
  "riskReduction": 80,
  "newControlsAdded": ["Tool life counter", "Quarterly SPC review"],
  "residualRisks": ["Manual override possible", "Counter calibration drift"]
}
```

**Indexes:**
- `capaIdx`: unique index on capaId (one D5 per CAPA)
- `approvalIdx`: index on managementApprovalStatus

---

### 3. capaD6Validation

D6: Implementation and Validation. Track implementation, verify effectiveness.

| Column | Type | Required | Default | Notes |
|--------|------|----------|---------|-------|
| id | serial | PK | | |
| orgId | uuid FK→organization | ✓ | | |
| capaId | integer FK→capa | ✓ | | CASCADE delete |
| implementationStatus | text | | 'not_started' | not_started / in_progress / complete |
| implementationProgress | integer | | 0 | Percentage 0-100 |
| implementationLog | text | | '[]' | JSON: implementation events |
| actionsImplemented | text | | '[]' | JSON: completed actions |
| actionsPending | text | | '[]' | JSON: remaining actions |
| delaysEncountered | text | | '[]' | JSON: delays and reasons |
| deviationsFromPlan | text | | '[]' | JSON: changes made |
| containmentRemoved | integer | | 0 | Boolean: D3 containment lifted? |
| containmentRemovedAt | timestamp | | | |
| containmentRemovalVerifiedBy | text | | | |
| preImplementationBaseline | text | | '{}' | JSON: metrics before |
| postImplementationData | text | | '{}' | JSON: metrics after |
| validationPlan | text | | '{}' | JSON: validation approach |
| validationTests | text | | '[]' | JSON: tests performed |
| validationResults | text | | '[]' | JSON: test results |
| statisticalValidation | text | | '{}' | JSON: Cpk, hypothesis tests |
| effectivenessCheckDate | timestamp | | | When to verify effectiveness |
| effectivenessCheckPeriod | text | | | '30 days' / '90 days' / etc. |
| effectivenessMetric | text | | | What metric defines success |
| effectivenessTarget | text | | | Target value |
| effectivenessActual | text | | | Actual value achieved |
| effectivenessVerified | integer | | 0 | Boolean |
| effectivenessVerifiedBy | text | | | |
| effectivenessVerifiedAt | timestamp | | | |
| effectivenessResult | text | | | effective / partially_effective / not_effective |
| effectivenessEvidence | text | | | Documentation/data |
| reoccurrenceCheck | integer | | 0 | Boolean: no reoccurrence? |
| reoccurrenceCheckDate | timestamp | | | |
| reoccurrenceCheckMethod | text | | | How checked |
| pfmeaUpdated | integer | | 0 | Boolean |
| pfmeaUpdateDetails | text | | | What was updated |
| controlPlanUpdated | integer | | 0 | Boolean |
| controlPlanUpdateDetails | text | | | What was updated |
| documentsUpdated | text | | '[]' | JSON: documents updated |
| trainingCompleted | integer | | 0 | Boolean |
| trainingRecords | text | | '[]' | JSON: training evidence |
| customerNotified | integer | | 0 | Boolean |
| customerNotificationDate | timestamp | | | |
| customerAcceptance | text | | | accepted / pending / rejected |
| lessonsLearned | text | | '[]' | JSON: key learnings |
| d6CompletedAt | timestamp | | | |
| d6CompletedBy | text | | | |
| d6VerifiedAt | timestamp | | | |
| d6VerifiedBy | text | | | |
| d6Notes | text | | | |
| createdBy | text | ✓ | | |
| createdAt | timestamp | | NOW | |
| updatedAt | timestamp | | NOW | |

**Implementation Log Structure:**
```json
[
  {
    "date": "2024-02-20",
    "event": "PLC programmer scheduled",
    "actionId": "PCA-001",
    "by": "user-123"
  },
  {
    "date": "2024-02-25",
    "event": "Tool life counter installed and configured",
    "actionId": "PCA-001",
    "by": "user-789",
    "evidence": "Photo of HMI screen, test results"
  },
  {
    "date": "2024-02-26",
    "event": "Operators trained on new system",
    "actionId": "PCA-001",
    "by": "user-123",
    "attendees": ["user-101", "user-102", "user-103"]
  }
]
```

**Validation Test Structure:**
```json
[
  {
    "testId": "VAL-001",
    "name": "Process Capability Study",
    "method": "Measure 50 parts over 5 days after implementation",
    "acceptanceCriteria": "Cpk ≥ 1.33",
    "conductedAt": "2024-03-01",
    "conductedBy": "user-456",
    "results": {
      "sampleSize": 50,
      "mean": 3.51,
      "stdDev": 0.028,
      "Cp": 2.38,
      "Cpk": 2.14,
      "withinSpec": 50,
      "outsideSpec": 0
    },
    "passed": true,
    "notes": "Process capability significantly improved"
  },
  {
    "testId": "VAL-002",
    "name": "Tool Life Counter Function Test",
    "method": "Run press until counter reaches limit, verify lockout",
    "acceptanceCriteria": "Press locks out at 10,000 shots",
    "conductedAt": "2024-02-28",
    "conductedBy": "user-789",
    "results": {
      "counterActivatedAt": 10000,
      "lockoutTriggered": true,
      "overrideAttempted": true,
      "overrideBlocked": true
    },
    "passed": true
  }
]
```

**Statistical Validation Structure:**
```json
{
  "capabilityStudy": {
    "beforeCpk": 0.89,
    "afterCpk": 2.14,
    "improvement": 140,
    "sampleSize": 50,
    "confidenceLevel": 95
  },
  "hypothesisTest": {
    "type": "paired_t_test",
    "nullHypothesis": "No difference in mean dimension",
    "pValue": 0.0001,
    "conclusion": "Significant improvement confirmed"
  },
  "controlCharts": {
    "xBarInControl": true,
    "rChartInControl": true,
    "noSpecialCauses": true
  }
}
```

**Indexes:**
- `capaIdx`: unique index on capaId (one D6 per CAPA)
- `statusIdx`: index on implementationStatus
- `effectivenessIdx`: index on effectivenessResult

---

### 4. capaD4RootCauseCandidate

Separate table to track individual root cause candidates through verification.

| Column | Type | Required | Default | Notes |
|--------|------|----------|---------|-------|
| id | serial | PK | | |
| orgId | uuid FK→organization | ✓ | | |
| capaId | integer FK→capa | ✓ | | CASCADE delete |
| d4Id | integer FK→capaD4RootCause | ✓ | | CASCADE delete |
| causeType | text | ✓ | | 'occurrence' / 'escape' / 'systemic' / 'contributing' |
| category | text | | | man/machine/material/method/measurement/environment |
| description | text | ✓ | | The proposed cause |
| source | text | | | brainstorm / 5why / fishbone / data_analysis / expert |
| evidenceFor | text | | '[]' | JSON: evidence supporting this cause |
| evidenceAgainst | text | | '[]' | JSON: evidence against |
| likelihood | text | | 'medium' | high / medium / low |
| verificationMethod | text | | | How to verify |
| verificationResult | text | | | confirmed / refuted / inconclusive |
| verifiedAt | timestamp | | | |
| verifiedBy | text | | | |
| isRootCause | integer | | 0 | Boolean: confirmed as root cause? |
| linkedTo5Why | text | | | Reference to 5-Why chain |
| linkedToFishbone | text | | | Reference in fishbone |
| notes | text | | | |
| createdBy | text | ✓ | | |
| createdAt | timestamp | | NOW | |
| updatedAt | timestamp | | NOW | |

**Indexes:**
- `capaIdx`: index on capaId
- `d4Idx`: index on d4Id
- `rootCauseIdx`: index on isRootCause
- `verificationIdx`: index on verificationResult

---

## Relations

```
capaD4RootCause:
  → capa (one-to-one)
  → organization (many-to-one)
  → capaD4RootCauseCandidate as candidates (one-to-many)

capaD4RootCauseCandidate:
  → capa (many-to-one)
  → capaD4RootCause (many-to-one)
  → organization (many-to-one)

capaD5CorrectiveAction:
  → capa (one-to-one)
  → organization (many-to-one)

capaD6Validation:
  → capa (one-to-one)
  → organization (many-to-one)

UPDATE capa relations to add:
  → d4RootCause: capaD4RootCause (one-to-one)
  → d5CorrectiveAction: capaD5CorrectiveAction (one-to-one)
  → d6Validation: capaD6Validation (one-to-one)
```

---

## Storage Methods

### capaD4RootCause
- `getCapaD4(capaId)` → CapaD4RootCause | undefined
- `getCapaD4WithCandidates(capaId)` → CapaD4RootCause with candidates
- `createCapaD4(data)` → CapaD4RootCause
- `updateCapaD4(capaId, data)` → CapaD4RootCause
- `add5WhyChain(capaId, chain)` → CapaD4RootCause
- `update5WhyChain(capaId, chainId, data)` → CapaD4RootCause
- `updateFishbone(capaId, fishbone)` → CapaD4RootCause
- `addVerificationTest(capaId, test)` → CapaD4RootCause
- `verifyOccurrenceRootCause(capaId, userId, evidence)` → CapaD4RootCause
- `verifyEscapeRootCause(capaId, userId, evidence)` → CapaD4RootCause
- `completeD4(capaId, userId)` → CapaD4RootCause
- `verifyD4(capaId, userId)` → CapaD4RootCause

### capaD4RootCauseCandidate
- `getD4Candidates(capaId)` → CapaD4RootCauseCandidate[]
- `getD4Candidate(id)` → CapaD4RootCauseCandidate | undefined
- `getConfirmedRootCauses(capaId)` → CapaD4RootCauseCandidate[]
- `createD4Candidate(data)` → CapaD4RootCauseCandidate
- `updateD4Candidate(id, data)` → CapaD4RootCauseCandidate
- `verifyCandidate(id, result, userId)` → CapaD4RootCauseCandidate
- `markAsRootCause(id, userId)` → CapaD4RootCauseCandidate
- `deleteD4Candidate(id)` → void

### capaD5CorrectiveAction
- `getCapaD5(capaId)` → CapaD5CorrectiveAction | undefined
- `createCapaD5(data)` → CapaD5CorrectiveAction
- `updateCapaD5(capaId, data)` → CapaD5CorrectiveAction
- `addCorrectiveAction(capaId, action)` → CapaD5CorrectiveAction
- `updateCorrectiveAction(capaId, actionId, data)` → CapaD5CorrectiveAction
- `addAlternative(capaId, alternative)` → CapaD5CorrectiveAction
- `requestManagementApproval(capaId, userId)` → CapaD5CorrectiveAction
- `approveD5(capaId, userId)` → CapaD5CorrectiveAction
- `rejectD5(capaId, userId, reason)` → CapaD5CorrectiveAction
- `completeD5(capaId, userId)` → CapaD5CorrectiveAction
- `verifyD5(capaId, userId)` → CapaD5CorrectiveAction

### capaD6Validation
- `getCapaD6(capaId)` → CapaD6Validation | undefined
- `createCapaD6(data)` → CapaD6Validation
- `updateCapaD6(capaId, data)` → CapaD6Validation
- `logImplementationEvent(capaId, event)` → CapaD6Validation
- `markActionImplemented(capaId, actionId, userId)` → CapaD6Validation
- `recordDelay(capaId, delay)` → CapaD6Validation
- `addValidationTest(capaId, test)` → CapaD6Validation
- `recordTestResult(capaId, testId, result)` → CapaD6Validation
- `removeContainment(capaId, userId)` → CapaD6Validation
- `verifyEffectiveness(capaId, userId, result, evidence)` → CapaD6Validation
- `checkReoccurrence(capaId, userId, result)` → CapaD6Validation
- `completeD6(capaId, userId)` → CapaD6Validation
- `verifyD6(capaId, userId)` → CapaD6Validation
- `getImplementationMetrics(orgId)` → {avgDays, onTime%, delayReasons}

---

## Seed Data

### For CAPA-2024-0001

**D4 Root Cause:**
```json
{
  "analysisApproach": ["5_why", "fishbone", "data_analysis"],
  "fiveWhyAnalysis": [/* 2 chains: occurrence and escape */],
  "fishboneDiagram": {/* full 6M analysis */},
  "rootCauseOccurrence": "No automated tool life monitoring system",
  "rootCauseOccurrenceVerified": true,
  "rootCauseEscape": "SPC control limits not recalculated after process change",
  "rootCauseEscapeVerified": true,
  "escapePoint": "In-process SPC monitoring",
  "confidenceLevel": "high",
  "d4CompletedAt": "2024-02-16T17:00:00Z"
}
```

**D4 Candidates** (5-6 records showing verified/refuted causes)

**D5 Corrective Action:**
```json
{
  "correctiveActionsSelected": [/* 2 PCAs */],
  "alternativesConsidered": [/* 2-3 options */],
  "riskAssessment": {/* before/after RPN */},
  "pfmeaUpdatesRequired": true,
  "controlPlanUpdatesRequired": true,
  "trainingRequired": true,
  "managementApprovalStatus": "approved",
  "estimatedCost": 2500,
  "d5CompletedAt": "2024-02-18T16:00:00Z"
}
```

**D6 Validation:**
```json
{
  "implementationStatus": "complete",
  "implementationProgress": 100,
  "implementationLog": [/* 5-6 events */],
  "validationTests": [/* 2 tests with results */],
  "effectivenessVerified": true,
  "effectivenessResult": "effective",
  "pfmeaUpdated": true,
  "controlPlanUpdated": true,
  "trainingCompleted": true,
  "d6CompletedAt": "2024-03-05T17:00:00Z"
}
```

### For CAPA-2024-0002 and CAPA-2024-0003

Appropriate D4-D6 at various stages of completion.

---

## Validation Checklist

- [ ] All 4 tables created in schema.ts
- [ ] All relations defined
- [ ] All Zod insert schemas created
- [ ] All types exported
- [ ] ~45 storage methods implemented
- [ ] 5-Why and Fishbone JSON structures work
- [ ] Validation test structures work
- [ ] Seed creates D4-D6 for all 3 CAPAs
- [ ] Root cause candidates track verification
- [ ] `npx drizzle-kit push` succeeds
- [ ] Server starts without errors
- [ ] `npm run seed` succeeds
- [ ] No TypeScript errors
