# CAPA-API-3: Problem-Solving Analysis Tools Endpoints

**Read RALPH_PATTERNS.md first. CAPA-API-1, CAPA-API-2, and CAPA-DB-5 must be complete.**

---

## Mission

Build API endpoints for the enhanced problem-solving tools:
- CRUD for all analysis tool types
- Tool-specific operations (verify cause, rule out, etc.)
- Export to PDF/SVG/PNG
- Template libraries
- Cross-tool linking

---

## Endpoints

### Analysis Tool CRUD

#### `GET /api/capas/:id/analysis-tools`
List all analysis tools for a CAPA.

Query params:
- `toolType` - Filter by type (is_is_not, five_why, etc.)
- `discipline` - Filter by discipline (D2, D4)
- `status` - Filter by status

Response 200:
```json
{
  "tools": [
    {
      "id": 1,
      "toolType": "is_is_not",
      "name": "Initial Is/Is Not Analysis",
      "discipline": "D2",
      "status": "complete",
      "conclusion": "Tool insert change is root cause",
      "linkedToRootCause": true,
      "createdAt": "2024-02-12T10:00:00Z",
      "createdBy": {"id": "...", "name": "John Smith"}
    }
  ]
}
```

---

#### `POST /api/capas/:id/analysis-tools`
Create new analysis tool.

Request:
```json
{
  "toolType": "three_leg_five_why",
  "name": "3-Legged 5-Why Analysis",
  "discipline": "D4",
  "data": {
    "startingPoint": "Critical dimension out of spec"
  }
}
```

Response 201: Created tool with ID

---

#### `GET /api/capas/:id/analysis-tools/:toolId`
Get analysis tool with full data.

Response 200: Full tool object with parsed data

---

#### `PUT /api/capas/:id/analysis-tools/:toolId`
Update analysis tool.

Request: Partial tool object (merges with existing data)

Response 200: Updated tool

---

#### `DELETE /api/capas/:id/analysis-tools/:toolId`
Delete analysis tool.

Response 200: `{"deleted": true}`

---

#### `POST /api/capas/:id/analysis-tools/:toolId/complete`
Mark tool as complete with conclusion.

Request:
```json
{
  "conclusion": "Root cause: No automated tool life monitoring"
}
```

Response 200: Updated tool with completedAt/By

---

#### `POST /api/capas/:id/analysis-tools/:toolId/verify`
Verify completed tool (manager review).

Response 200: Updated tool with verifiedAt/By

---

#### `POST /api/capas/:id/analysis-tools/:toolId/link-to-root-cause`
Mark this analysis as supporting D4 root cause.

Response 200: Updated tool with linkedToRootCause=true

---

### Is/Is Not Specific

#### `PUT /api/capas/:id/analysis-tools/:toolId/is-is-not/:dimension`
Update specific dimension (what, where, when, howMany).

Request:
```json
{
  "object": {
    "is": [{"observation": "Part 3004-XYZ", "evidence": "CMM report"}],
    "isNot": [{"observation": "Other parts", "distinction": "Different tooling"}],
    "distinctions": "Only this part uses insert A-4421"
  }
}
```

Response 200: Updated tool

---

#### `POST /api/capas/:id/analysis-tools/:toolId/is-is-not/verify-therefore`
Verify the "THEREFORE" conclusion.

Request:
```json
{
  "therefore": "Tool insert A-4421 causing dimension drift"
}
```

Response 200: Updated with thereforeVerified=true

---

### 5-Why Specific

#### `POST /api/capas/:id/analysis-tools/:toolId/five-why/add-why`
Add a Why level to the chain.

Request:
```json
{
  "level": 3,
  "question": "Why was schedule not followed?",
  "answer": "Manual tracking only, no alerts",
  "evidence": "Procedure review"
}
```

Response 200: Updated tool

---

#### `PUT /api/capas/:id/analysis-tools/:toolId/five-why/whys/:level`
Update a specific Why level.

Request:
```json
{
  "answer": "Updated answer",
  "evidence": "New evidence",
  "attachmentId": 45
}
```

Response 200: Updated tool

---

#### `POST /api/capas/:id/analysis-tools/:toolId/five-why/set-root-cause`
Set the root cause conclusion.

Request:
```json
{
  "rootCause": "No automated tool life monitoring",
  "rootCauseCategory": "machine"
}
```

Response 200: Updated tool

---

#### `POST /api/capas/:id/analysis-tools/:toolId/five-why/verify`
Verify the 5-Why chain and root cause.

Request:
```json
{
  "verificationMethod": "Replaced insert, monitored 500 parts - all in spec"
}
```

Response 200: Updated tool with verified=true

---

### 3-Legged 5-Why Specific

#### `PUT /api/capas/:id/analysis-tools/:toolId/three-leg/:leg`
Update a specific leg (occurrence, detection, systemic).

Request:
```json
{
  "whys": [...],
  "rootCause": "...",
  "correctiveAction": "..."
}
```

Response 200: Updated tool

---

#### `POST /api/capas/:id/analysis-tools/:toolId/three-leg/:leg/verify`
Verify a specific leg.

Response 200: Updated tool with leg.verified=true

---

### Fishbone Specific

#### `POST /api/capas/:id/analysis-tools/:toolId/fishbone/cause`
Add a cause to a category.

Request:
```json
{
  "category": "machine",
  "text": "Tool insert worn",
  "parentCauseId": null
}
```

Response 200: Updated tool with new cause

---

#### `PUT /api/capas/:id/analysis-tools/:toolId/fishbone/cause/:causeId`
Update a cause.

Request:
```json
{
  "status": "verified",
  "evidence": "Insert measurement showed wear",
  "linkedFiveWhyId": "5w-001"
}
```

Response 200: Updated tool

---

#### `POST /api/capas/:id/analysis-tools/:toolId/fishbone/cause/:causeId/verify`
Mark cause as verified root cause.

Request:
```json
{
  "evidence": "Testing confirmed this cause"
}
```

Response 200: Updated cause with status=verified

---

#### `POST /api/capas/:id/analysis-tools/:toolId/fishbone/cause/:causeId/rule-out`
Rule out a cause.

Request:
```json
{
  "reason": "Training records current, interviewed operator"
}
```

Response 200: Updated cause with status=ruled_out

---

#### `POST /api/capas/:id/analysis-tools/:toolId/fishbone/cause/:causeId/sub-cause`
Add a sub-cause (branch) to existing cause.

Request:
```json
{
  "text": "No tool life counter"
}
```

Response 200: Updated tool with nested cause

---

### Fault Tree Specific

#### `POST /api/capas/:id/analysis-tools/:toolId/fault-tree/node`
Add a node to the fault tree.

Request:
```json
{
  "parentId": "int1",
  "type": "basic_event",
  "description": "Tool wear",
  "probability": 0.08,
  "gate": null
}
```

Response 200: Updated tool

---

#### `PUT /api/capas/:id/analysis-tools/:toolId/fault-tree/node/:nodeId`
Update a node.

Request:
```json
{
  "probability": 0.10,
  "isRootCause": true,
  "evidence": "Insert measurement"
}
```

Response 200: Updated tool

---

#### `DELETE /api/capas/:id/analysis-tools/:toolId/fault-tree/node/:nodeId`
Delete a node and its children.

Response 200: Updated tool

---

#### `POST /api/capas/:id/analysis-tools/:toolId/fault-tree/calculate`
Calculate probabilities and minimal cut sets.

Response 200:
```json
{
  "topEventProbability": 0.0214,
  "minimalCutSets": [
    {"events": ["be1", "be2"], "probability": 0.076}
  ],
  "criticalPath": ["be1", "be2"]
}
```

---

### Comparative Analysis Specific

#### `POST /api/capas/:id/analysis-tools/:toolId/comparative/items`
Add good/bad items to compare.

Request:
```json
{
  "type": "good",
  "id": "SN-0542",
  "date": "2024-01-28",
  "source": "Production records"
}
```

Response 200: Updated tool

---

#### `POST /api/capas/:id/analysis-tools/:toolId/comparative/factors`
Add comparison factor.

Request:
```json
{
  "name": "Tool Insert",
  "category": "machine",
  "good": "A-4420",
  "bad": "A-4421"
}
```

Response 200: Updated tool (auto-calculates isDifferent)

---

#### `PUT /api/capas/:id/analysis-tools/:toolId/comparative/factors/:index`
Update factor significance.

Request:
```json
{
  "significance": "Different insert - key difference!"
}
```

Response 200: Updated tool

---

#### `POST /api/capas/:id/analysis-tools/:toolId/comparative/verify-hypothesis`
Verify the hypothesis.

Request:
```json
{
  "verificationMethod": "Replaced insert, measured 50 parts - all in spec"
}
```

Response 200: Updated with hypothesisVerified=true

---

### Change Point Specific

#### `POST /api/capas/:id/analysis-tools/:toolId/change-point/changes`
Add a change to the timeline.

Request:
```json
{
  "date": "2024-01-30",
  "category": "machine",
  "description": "Tool insert changed to A-4421",
  "source": "Tool crib log"
}
```

Response 200: Updated tool

---

#### `PUT /api/capas/:id/analysis-tools/:toolId/change-point/changes/:index`
Update a change (relevance, rule out, mark as cause).

Request:
```json
{
  "relevance": "high",
  "isLikelyCause": true
}
```

Response 200: Updated tool

---

#### `POST /api/capas/:id/analysis-tools/:toolId/change-point/changes/:index/rule-out`
Rule out a change.

Request:
```json
{
  "reason": "Same lot in use before and after problem"
}
```

Response 200: Updated change with ruledOut=true

---

### Pareto Specific

#### `PUT /api/capas/:id/analysis-tools/:toolId/pareto/data`
Update Pareto data.

Request:
```json
{
  "dataSource": "Defect log Feb 2024",
  "analysisType": "defect_type",
  "categories": [
    {"name": "Dimension OOS", "count": 23},
    {"name": "Cosmetic", "count": 12}
  ]
}
```

Response 200: Updated tool (auto-calculates percentages, cumulative)

---

### Export

#### `POST /api/capas/:id/analysis-tools/:toolId/export`
Export analysis tool to file.

Request:
```json
{
  "format": "pdf"
}
```

Formats: `pdf`, `svg`, `png`, `json`

Response 200: File download or base64

---

### Templates

#### `GET /api/analysis-tool-templates`
Get available templates by tool type.

Response 200:
```json
{
  "fishbone": {
    "5M": ["man", "machine", "material", "method", "measurement"],
    "6M": ["...plus environment"],
    "8M": ["...plus management, money"]
  },
  "commonCauses": {
    "man": ["Training gap", "Fatigue", "Skill level", "Communication"],
    "machine": ["Tool wear", "Calibration", "Maintenance", "Age"]
  }
}
```

---

#### `GET /api/analysis-tool-templates/fishbone/:category`
Get common causes for a fishbone category.

Response 200:
```json
{
  "causes": [
    "Tool wear",
    "Equipment age",
    "Calibration drift",
    "Maintenance overdue",
    "Setup error"
  ]
}
```

---

### Cross-Tool Linking

#### `POST /api/capas/:id/analysis-tools/:toolId/link`
Link one analysis tool to another.

Request:
```json
{
  "targetToolId": 5,
  "linkType": "supports",
  "description": "Change point analysis supports 5-Why conclusion"
}
```

Response 200: Link created

---

#### `GET /api/capas/:id/analysis-tools/:toolId/links`
Get linked analysis tools.

Response 200: Array of linked tools with link type

---

## Validation Checklist

- [ ] All endpoints use `requireAuth`
- [ ] All endpoints filter by `req.orgId`
- [ ] Tool type validation on create
- [ ] JSON structure validation per tool type
- [ ] Verify operations check completion first
- [ ] Export generates valid files
- [ ] Fishbone SVG rendering works
- [ ] Fault tree probability calculations correct
- [ ] Pareto percentages sum to 100%
- [ ] Audit log entries for state changes
- [ ] No TypeScript errors
