# CAPA-DB-5: Problem-Solving Analysis Tools

**Read RALPH_PATTERNS.md first. CAPA-DB-1 through CAPA-DB-4 must be complete.**

---

## Mission

Add the `capaAnalysisTool` table and supporting structures for enhanced problem-solving tools:
- Is/Is Not Analysis (enhanced, interactive)
- 3-Legged 5-Why (Ford methodology)
- Fishbone/Ishikawa (interactive, 5M/6M/8M)
- Fault Tree Analysis (FTA)
- Comparative Analysis
- Change Point Analysis
- Per-CAPA Pareto Analysis

These tools turn form-filling into actual problem-solving.

---

## Table

### capaAnalysisTool

Stores all analysis tool instances for a CAPA. One CAPA can have multiple tools of the same type (e.g., multiple 5-Why chains).

| Column | Type | Required | Default | Notes |
|--------|------|----------|---------|-------|
| id | serial | PK | | |
| orgId | uuid FK→organization | ✓ | | CASCADE delete |
| capaId | integer FK→capa | ✓ | | CASCADE delete |
| toolType | text | ✓ | | See Tool Types below |
| name | text | | | User-defined name for this analysis |
| discipline | text | | | Which 8D discipline (D2, D4, etc.) |
| data | text | ✓ | '{}' | JSON - tool-specific structure |
| status | text | | 'in_progress' | 'in_progress' / 'complete' / 'verified' |
| conclusion | text | | | Summary conclusion from analysis |
| linkedToRootCause | integer | | 0 | Boolean: feeds into D4 root cause |
| createdBy | uuid FK→user | ✓ | | |
| createdAt | timestamp | | NOW() | |
| updatedAt | timestamp | | NOW() | |
| completedAt | timestamp | | | |
| completedBy | uuid FK→user | | | |
| verifiedAt | timestamp | | | |
| verifiedBy | uuid FK→user | | | |

**Indexes:**
- `capa_analysis_tool_capa_idx` on (capaId)
- `capa_analysis_tool_type_idx` on (capaId, toolType)
- `capa_analysis_tool_org_idx` on (orgId)

---

## Tool Types

| toolType | Description | Used In |
|----------|-------------|---------|
| `is_is_not` | Is/Is Not Analysis | D2 |
| `five_why` | Single 5-Why Chain | D4 |
| `three_leg_five_why` | 3-Legged 5-Why (Ford) | D4 |
| `fishbone` | Fishbone/Ishikawa Diagram | D4 |
| `fault_tree` | Fault Tree Analysis | D4 |
| `comparative` | Good vs Bad Comparison | D2, D4 |
| `change_point` | Change Point Analysis | D2, D4 |
| `pareto` | Per-CAPA Pareto | D2, D4 |

---

## JSON Data Structures

### is_is_not

```json
{
  "what": {
    "object": {
      "is": [
        {"observation": "Part 3004-XYZ", "evidence": "CMM report #2024-0542"}
      ],
      "isNot": [
        {"observation": "Part 3004-ABC", "distinction": "Different tool insert"}
      ],
      "distinctions": "Only this part uses insert A-4421"
    },
    "defect": {
      "is": [{"observation": "Dimension 3.72mm (0.22mm OOS)", "evidence": "Measurement data"}],
      "isNot": [{"observation": "Other dimensions", "distinction": "Feature #3 only"}],
      "distinctions": "Single dimension affected"
    }
  },
  "where": {
    "geographic": {
      "is": [{"observation": "Fraser Plant", "evidence": ""}],
      "isNot": [{"observation": "Monroe Plant", "distinction": "Different equipment"}],
      "distinctions": ""
    },
    "onObject": {
      "is": [{"observation": "Feature #3 (3.5mm critical dim)", "evidence": "Print rev C"}],
      "isNot": [{"observation": "Features #1, #2, #4-8", "distinction": "Different tooling"}],
      "distinctions": "Unique insert for this feature"
    }
  },
  "when": {
    "firstObserved": "2024-02-10",
    "timeline": {
      "is": [{"observation": "Since Feb 1, 2024", "evidence": "SPC data"}],
      "isNot": [{"observation": "Before Feb 1", "distinction": "Tool change on 1/30"}],
      "distinctions": "Correlates with tool insert change"
    },
    "pattern": {
      "is": [{"observation": "Continuous, all shifts", "evidence": ""}],
      "isNot": [{"observation": "Intermittent", "distinction": ""}],
      "distinctions": ""
    },
    "lifecycle": "production"
  },
  "howMany": {
    "units": {
      "is": [{"observation": "15 parts (1.5%)", "evidence": "Sort results"}],
      "isNot": [{"observation": "0% before Feb 1", "distinction": "New condition"}],
      "distinctions": ""
    },
    "trend": {
      "is": [{"observation": "Increasing", "evidence": "Trend chart"}],
      "isNot": [{"observation": "Random/stable", "distinction": "Degradation pattern"}],
      "distinctions": "Consistent with tool wear"
    },
    "defectsPerUnit": 1
  },
  "therefore": "Tool insert A-4421 installed on 1/30 is causing dimension drift on feature #3 due to accelerated wear.",
  "thereforeVerified": true,
  "thereforeVerifiedBy": "user-123",
  "thereforeVerifiedAt": "2024-02-14T15:00:00Z"
}
```

### five_why

```json
{
  "causeType": "occurrence",
  "startingPoint": "Critical dimension 3.72mm vs 3.50mm target",
  "whys": [
    {
      "level": 1,
      "question": "Why is the dimension out of specification?",
      "answer": "Tool insert is worn beyond tolerance",
      "evidence": "Insert measurement showed 0.15mm wear",
      "attachmentId": 45
    },
    {
      "level": 2,
      "question": "Why is the tool insert worn?",
      "answer": "Insert exceeded recommended tool life (10,000 shots)",
      "evidence": "Shot counter showed 8,920 shots"
    },
    {
      "level": 3,
      "question": "Why did the insert exceed tool life?",
      "answer": "Tool change schedule was not followed",
      "evidence": "Maintenance log shows missed change"
    },
    {
      "level": 4,
      "question": "Why wasn't the schedule followed?",
      "answer": "Manual tracking only, no automated alerts",
      "evidence": "Procedure review"
    },
    {
      "level": 5,
      "question": "Why no automated alerts?",
      "answer": "No tool life monitoring system installed on this press",
      "evidence": "Equipment assessment"
    }
  ],
  "rootCause": "No automated tool life monitoring system on Press #3",
  "rootCauseCategory": "machine",
  "verified": true,
  "verifiedBy": "user-123",
  "verifiedAt": "2024-02-14T15:30:00Z",
  "verificationMethod": "Replaced insert, monitored 500 parts - all in spec",
  "linkedCorrectiveAction": "Install tool life counter with automatic lockout"
}
```

### three_leg_five_why

```json
{
  "startingPoint": "Critical dimension 3.72mm vs 3.50mm ±0.20mm target",
  
  "occurrenceLeg": {
    "title": "Why did the nonconformance OCCUR?",
    "whys": [
      {"level": 1, "question": "Why is dimension out of spec?", "answer": "Tool insert worn"},
      {"level": 2, "question": "Why is insert worn?", "answer": "Exceeded tool life"},
      {"level": 3, "question": "Why exceeded tool life?", "answer": "No counter/alerts"},
      {"level": 4, "question": "Why no counter?", "answer": "Manual tracking only"},
      {"level": 5, "question": "Why manual only?", "answer": "Legacy equipment, no upgrade"}
    ],
    "rootCause": "No automated tool life monitoring on legacy equipment",
    "verified": true,
    "verifiedBy": "user-123",
    "verifiedAt": "2024-02-14T15:00:00Z",
    "correctiveAction": "Install tool life counter with automatic lockout"
  },
  
  "detectionLeg": {
    "title": "Why wasn't it DETECTED before reaching customer?",
    "whys": [
      {"level": 1, "question": "Why didn't SPC catch it?", "answer": "Limits too wide"},
      {"level": 2, "question": "Why limits too wide?", "answer": "Based on old capability"},
      {"level": 3, "question": "Why old capability?", "answer": "Last MSA was 2022"},
      {"level": 4, "question": "Why no recent MSA?", "answer": "No periodic review scheduled"},
      {"level": 5, "question": "Why not scheduled?", "answer": "Procedure gap"}
    ],
    "rootCause": "No periodic SPC limit review requirement in control plan",
    "verified": true,
    "verifiedBy": "user-456",
    "verifiedAt": "2024-02-14T16:00:00Z",
    "correctiveAction": "Add annual SPC review to control plan"
  },
  
  "systemicLeg": {
    "title": "Why did the SYSTEM allow this?",
    "whys": [
      {"level": 1, "question": "Why wasn't tool life in PFMEA?", "answer": "Not identified as risk"},
      {"level": 2, "question": "Why not identified?", "answer": "PFMEA not updated"},
      {"level": 3, "question": "Why not updated?", "answer": "No trigger from similar issues"},
      {"level": 4, "question": "Why no trigger?", "answer": "Lessons learned not feeding back"},
      {"level": 5, "question": "Why no feedback loop?", "answer": "CAPA closure doesn't require it"}
    ],
    "rootCause": "CAPA procedure doesn't require PFMEA/CP update verification",
    "verified": true,
    "verifiedBy": "user-789",
    "verifiedAt": "2024-02-15T10:00:00Z",
    "correctiveAction": "Revise CAPA procedure to require PFMEA update evidence"
  },
  
  "summary": "Three root causes identified: equipment gap (occurrence), procedure gap (detection), system gap (systemic). All require corrective action."
}
```

### fishbone

```json
{
  "type": "6M",
  "effect": "Critical dimension out of specification (3.72mm vs 3.50mm ±0.20mm)",
  
  "categories": {
    "man": [
      {
        "id": "m1",
        "text": "Operator not trained on tool life indicators",
        "status": "ruled_out",
        "ruledOutReason": "Training records current, interviewed operator",
        "subCauses": []
      },
      {
        "id": "m2",
        "text": "No backup operator for PM coverage",
        "status": "suspected",
        "subCauses": []
      }
    ],
    "machine": [
      {
        "id": "mc1",
        "text": "Tool insert worn",
        "status": "verified",
        "evidence": "Insert measurement showed 0.15mm wear",
        "linkedFiveWhyId": "5w-001",
        "verifiedBy": "user-123",
        "verifiedAt": "2024-02-14T15:00:00Z",
        "subCauses": [
          {
            "id": "mc1a",
            "text": "No tool life counter",
            "status": "verified",
            "evidence": "Equipment does not have this feature"
          },
          {
            "id": "mc1b",
            "text": "Insert quality issue",
            "status": "ruled_out",
            "ruledOutReason": "Supplier COC verified, hardness test OK"
          }
        ]
      }
    ],
    "material": [
      {
        "id": "mt1",
        "text": "Resin lot variation",
        "status": "ruled_out",
        "ruledOutReason": "Same lot used before issue started",
        "subCauses": []
      }
    ],
    "method": [
      {
        "id": "me1",
        "text": "Tool change procedure gap",
        "status": "verified",
        "evidence": "Procedure relies on manual tracking",
        "subCauses": []
      }
    ],
    "measurement": [
      {
        "id": "ms1",
        "text": "SPC limits outdated",
        "status": "verified",
        "evidence": "Last review was 2022",
        "subCauses": []
      }
    ],
    "environment": [
      {
        "id": "e1",
        "text": "Temperature variation",
        "status": "ruled_out",
        "ruledOutReason": "HVAC logs show stable conditions",
        "subCauses": []
      }
    ]
  },
  
  "rootCauses": ["mc1", "mc1a", "me1", "ms1"],
  "summary": "Primary: Tool wear due to no life monitoring. Contributing: Manual procedure and outdated SPC limits."
}
```

### fault_tree

```json
{
  "topEvent": {
    "id": "top",
    "type": "top_event",
    "description": "Dimension Out of Specification",
    "probability": 0.015,
    "gate": "OR",
    "children": [
      {
        "id": "int1",
        "type": "intermediate",
        "description": "Process Variation",
        "probability": 0.012,
        "gate": "AND",
        "children": [
          {
            "id": "be1",
            "type": "basic_event",
            "description": "Tool Wear",
            "probability": 0.08,
            "isRootCause": true,
            "evidence": "Insert measurement"
          },
          {
            "id": "be2",
            "type": "basic_event",
            "description": "No Tool Life Counter",
            "probability": 0.95,
            "isRootCause": true,
            "evidence": "Equipment assessment"
          },
          {
            "id": "be3",
            "type": "basic_event",
            "description": "Detection System Failure",
            "probability": 0.15,
            "evidence": "SPC review"
          }
        ]
      },
      {
        "id": "int2",
        "type": "intermediate",
        "description": "Measurement Error",
        "probability": 0.003,
        "gate": "OR",
        "children": [
          {
            "id": "be4",
            "type": "basic_event",
            "description": "CMM Out of Calibration",
            "probability": 0.01,
            "isRootCause": false,
            "evidence": "Calibration current"
          },
          {
            "id": "be5",
            "type": "basic_event",
            "description": "Gage R&R Failure",
            "probability": 0.02,
            "isRootCause": false,
            "evidence": "GRR < 10%"
          }
        ]
      }
    ]
  },
  
  "minimalCutSets": [
    {
      "events": ["be1", "be2", "be3"],
      "probability": 0.0114,
      "description": "Tool Wear AND No Counter AND Detection Failure"
    },
    {
      "events": ["be4"],
      "probability": 0.01,
      "description": "CMM Out of Calibration"
    }
  ],
  
  "criticalPath": ["be1", "be2"],
  "calculatedTopProbability": 0.0214
}
```

### comparative

```json
{
  "comparison": {
    "good": [
      {"id": "SN-0542", "source": "Production records", "date": "2024-01-28"}
    ],
    "bad": [
      {"id": "SN-0523", "source": "Customer return", "date": "2024-02-03"}
    ]
  },
  
  "factors": [
    {
      "name": "Production Date",
      "category": "when",
      "good": "Jan 28, 2024",
      "bad": "Feb 3, 2024",
      "isDifferent": true,
      "significance": "After tool change"
    },
    {
      "name": "Shift",
      "category": "man",
      "good": "1st",
      "bad": "2nd",
      "isDifferent": false,
      "significance": ""
    },
    {
      "name": "Operator",
      "category": "man",
      "good": "J. Smith",
      "bad": "M. Johnson",
      "isDifferent": false,
      "significance": "Both trained"
    },
    {
      "name": "Machine",
      "category": "machine",
      "good": "Press #3",
      "bad": "Press #3",
      "isDifferent": false,
      "significance": ""
    },
    {
      "name": "Tool Insert",
      "category": "machine",
      "good": "A-4420",
      "bad": "A-4421",
      "isDifferent": true,
      "significance": "Different insert!"
    },
    {
      "name": "Tool Life Count",
      "category": "machine",
      "good": "2,450",
      "bad": "8,920",
      "isDifferent": true,
      "significance": "High wear"
    },
    {
      "name": "Material Lot",
      "category": "material",
      "good": "L-2024-0128",
      "bad": "L-2024-0128",
      "isDifferent": false,
      "significance": ""
    },
    {
      "name": "Dimension 3.5mm",
      "category": "measurement",
      "good": "3.48 mm",
      "bad": "3.72 mm",
      "isDifferent": true,
      "significance": "OOS"
    }
  ],
  
  "significantDifferences": ["Production Date", "Tool Insert", "Tool Life Count", "Dimension 3.5mm"],
  
  "hypothesis": "Insert A-4421 (installed 1/30) wears faster than A-4420, or was defective. Tool life count 8,920 on bad part vs 2,450 on good indicates wear correlation.",
  
  "hypothesisVerified": true,
  "verificationMethod": "Replaced insert, measured 50 consecutive parts - all in spec"
}
```

### change_point

```json
{
  "problemFirstObserved": "2024-02-10",
  "analysisWindow": {
    "start": "2024-01-01",
    "end": "2024-02-10"
  },
  
  "changes": [
    {
      "date": "2024-01-01",
      "category": "material",
      "description": "New resin supplier ABC Polymers qualified",
      "source": "Supplier quality records",
      "relevance": "low",
      "ruledOut": true,
      "ruledOutReason": "Same lot in use before and after problem"
    },
    {
      "date": "2024-01-10",
      "category": "measurement",
      "description": "CMM calibration performed",
      "source": "Calibration records",
      "relevance": "low",
      "ruledOut": true,
      "ruledOutReason": "Calibration verified OK"
    },
    {
      "date": "2024-01-15",
      "category": "man",
      "description": "New operator M. Johnson started on Press #3",
      "source": "HR records",
      "relevance": "low",
      "ruledOut": true,
      "ruledOutReason": "Issue occurs on all shifts, not operator-specific"
    },
    {
      "date": "2024-01-22",
      "category": "machine",
      "description": "PM performed on Press #3 (scheduled)",
      "source": "Maintenance records",
      "relevance": "medium",
      "ruledOut": true,
      "ruledOutReason": "Standard PM, no tooling changes"
    },
    {
      "date": "2024-01-30",
      "category": "machine",
      "description": "Tool insert changed from A-4420 to A-4421",
      "source": "Tool crib log",
      "relevance": "high",
      "ruledOut": false,
      "isLikelyCause": true
    }
  ],
  
  "timeline": "Problem started ~11 days after tool insert change, consistent with wear-in and accelerated degradation pattern.",
  
  "hypothesis": "Tool insert A-4421 installed on Jan 30 is the change point. Accelerated wear led to dimension drift starting around Feb 1, detected by customer on Feb 10.",
  
  "hypothesisSupports": ["Comparative Analysis shows insert difference", "5-Why traces to tool life"]
}
```

### pareto

```json
{
  "dataSource": "Defect log Feb 2024",
  "dateRange": {
    "start": "2024-02-01",
    "end": "2024-02-29"
  },
  "analysisType": "defect_type",
  "totalCount": 47,
  
  "categories": [
    {"name": "Dimension OOS", "count": 23, "percentage": 48.9, "cumulative": 48.9},
    {"name": "Cosmetic", "count": 12, "percentage": 25.5, "cumulative": 74.4},
    {"name": "Flash", "count": 6, "percentage": 12.8, "cumulative": 87.2},
    {"name": "Short shot", "count": 4, "percentage": 8.5, "cumulative": 95.7},
    {"name": "Other", "count": 2, "percentage": 4.3, "cumulative": 100.0}
  ],
  
  "focusArea": "Dimension OOS (49%) + Cosmetic (25%) = 74% of issues",
  "vitalFew": ["Dimension OOS", "Cosmetic"],
  "trivialMany": ["Flash", "Short shot", "Other"],
  
  "recommendation": "Focus corrective actions on dimensional issues first, representing nearly half of all defects."
}
```

---

## Schema Definition

```typescript
// In schema.ts, add:

export const capaAnalysisTool = pgTable("capa_analysis_tool", {
  id: serial("id").primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
  capaId: integer("capa_id").notNull().references(() => capa.id, { onDelete: "cascade" }),
  toolType: text("tool_type").notNull(), // is_is_not, five_why, three_leg_five_why, fishbone, fault_tree, comparative, change_point, pareto
  name: text("name"),
  discipline: text("discipline"), // D2, D4, etc.
  data: text("data").notNull().default("{}"), // JSON
  status: text("status").default("in_progress"), // in_progress, complete, verified
  conclusion: text("conclusion"),
  linkedToRootCause: integer("linked_to_root_cause").default(0),
  createdBy: uuid("created_by").notNull().references(() => user.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  completedBy: uuid("completed_by").references(() => user.id),
  verifiedAt: timestamp("verified_at"),
  verifiedBy: uuid("verified_by").references(() => user.id),
}, (table) => ({
  capaIdx: index("capa_analysis_tool_capa_idx").on(table.capaId),
  typeIdx: index("capa_analysis_tool_type_idx").on(table.capaId, table.toolType),
  orgIdx: index("capa_analysis_tool_org_idx").on(table.orgId),
}));

// Relations
export const capaAnalysisToolRelations = relations(capaAnalysisTool, ({ one }) => ({
  organization: one(organization, {
    fields: [capaAnalysisTool.orgId],
    references: [organization.id],
  }),
  capa: one(capa, {
    fields: [capaAnalysisTool.capaId],
    references: [capa.id],
  }),
  creator: one(user, {
    fields: [capaAnalysisTool.createdBy],
    references: [user.id],
  }),
}));
```

---

## Storage Methods

```typescript
// In storage.ts, add:

// Analysis Tools
async getCapaAnalysisTools(capaId: number): Promise<CapaAnalysisTool[]>
async getCapaAnalysisToolsByType(capaId: number, toolType: string): Promise<CapaAnalysisTool[]>
async getCapaAnalysisTool(id: number): Promise<CapaAnalysisTool | undefined>
async createCapaAnalysisTool(tool: InsertCapaAnalysisTool): Promise<CapaAnalysisTool>
async updateCapaAnalysisTool(id: number, updates: Partial<CapaAnalysisTool>): Promise<CapaAnalysisTool>
async deleteCapaAnalysisTool(id: number): Promise<void>
async completeCapaAnalysisTool(id: number, userId: string, conclusion: string): Promise<CapaAnalysisTool>
async verifyCapaAnalysisTool(id: number, userId: string): Promise<CapaAnalysisTool>
async linkAnalysisToolToRootCause(id: number): Promise<CapaAnalysisTool>

// Template helpers (common causes for fishbone, etc.)
async getFishboneTemplates(category: string): Promise<string[]>
async getFiveWhyTemplates(causeType: string): Promise<string[]>
```

---

## Seed Data

```typescript
// Add to seed.ts:

// Analysis tools for CAPA-0001 (customer complaint)
await storage.createCapaAnalysisTool({
  orgId: acmeOrg.id,
  capaId: capa1.id,
  toolType: "is_is_not",
  name: "Initial Is/Is Not Analysis",
  discipline: "D2",
  data: JSON.stringify({
    what: {
      object: {
        is: [{ observation: "Part 3004-XYZ Stiffener", evidence: "Customer complaint" }],
        isNot: [{ observation: "Other part numbers", distinction: "Only this part affected" }]
      }
    },
    // ... abbreviated for seed
    therefore: "Tool insert A-4421 causing dimension drift on feature #3"
  }),
  status: "complete",
  conclusion: "Tool insert change on 1/30 is root cause",
  linkedToRootCause: 1,
  createdBy: adminUser.id,
  completedAt: new Date(),
  completedBy: adminUser.id
});

await storage.createCapaAnalysisTool({
  orgId: acmeOrg.id,
  capaId: capa1.id,
  toolType: "three_leg_five_why",
  name: "3-Legged 5-Why Analysis",
  discipline: "D4",
  data: JSON.stringify({
    startingPoint: "Critical dimension 3.72mm vs 3.50mm target",
    occurrenceLeg: {
      whys: [
        { level: 1, question: "Why dimension OOS?", answer: "Tool insert worn" },
        { level: 2, question: "Why insert worn?", answer: "Exceeded tool life" },
        { level: 3, question: "Why exceeded life?", answer: "No counter" },
        { level: 4, question: "Why no counter?", answer: "Manual tracking" },
        { level: 5, question: "Why manual?", answer: "Legacy equipment" }
      ],
      rootCause: "No automated tool life monitoring",
      verified: true
    },
    // ... other legs
  }),
  status: "verified",
  createdBy: adminUser.id,
  verifiedAt: new Date(),
  verifiedBy: qualityUser.id
});

await storage.createCapaAnalysisTool({
  orgId: acmeOrg.id,
  capaId: capa1.id,
  toolType: "fishbone",
  name: "6M Fishbone Analysis",
  discipline: "D4",
  data: JSON.stringify({
    type: "6M",
    effect: "Dimension out of specification",
    categories: {
      machine: [
        { id: "mc1", text: "Tool insert worn", status: "verified" },
        { id: "mc2", text: "No tool life counter", status: "verified" }
      ],
      method: [
        { id: "me1", text: "Tool change procedure gap", status: "verified" }
      ],
      measurement: [
        { id: "ms1", text: "SPC limits outdated", status: "verified" }
      ]
    }
  }),
  status: "complete",
  createdBy: adminUser.id
});

await storage.createCapaAnalysisTool({
  orgId: acmeOrg.id,
  capaId: capa1.id,
  toolType: "comparative",
  name: "Good vs Bad Part Comparison",
  discipline: "D4",
  data: JSON.stringify({
    comparison: {
      good: [{ id: "SN-0542", date: "2024-01-28" }],
      bad: [{ id: "SN-0523", date: "2024-02-03" }]
    },
    factors: [
      { name: "Tool Insert", good: "A-4420", bad: "A-4421", isDifferent: true },
      { name: "Tool Life Count", good: "2,450", bad: "8,920", isDifferent: true }
    ],
    hypothesis: "Insert A-4421 wears faster"
  }),
  status: "complete",
  createdBy: adminUser.id
});

await storage.createCapaAnalysisTool({
  orgId: acmeOrg.id,
  capaId: capa1.id,
  toolType: "change_point",
  name: "Change Point Timeline",
  discipline: "D2",
  data: JSON.stringify({
    problemFirstObserved: "2024-02-10",
    changes: [
      { date: "2024-01-30", category: "machine", description: "Tool insert changed to A-4421", isLikelyCause: true }
    ],
    hypothesis: "Tool change on 1/30 is the change point"
  }),
  status: "complete",
  createdBy: adminUser.id
});
```

---

## Validation Checklist

- [ ] Table created with proper indexes
- [ ] All 8 tool types supported
- [ ] JSON structures validate correctly
- [ ] Relations to capa and user work
- [ ] Storage methods implemented
- [ ] Seed data creates sample tools
- [ ] No TypeScript errors
- [ ] `npx drizzle-kit push` succeeds
