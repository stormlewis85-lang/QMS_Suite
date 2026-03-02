# CAPA-API-2: Disciplines D5-D8, Analytics & Reporting

**Read RALPH_PATTERNS.md first. CAPA-API-1 must be complete.**

---

## Mission

Build API endpoints for:
- D5 Permanent Corrective Actions
- D6 Implementation & Validation
- D7 Preventive Actions
- D8 Team Recognition & Closure
- Audit log access
- Analytics and reporting
- Export functionality

---

## D5: Permanent Corrective Actions

### `GET /api/capas/:id/d5`
Get D5 corrective action data.

### `PUT /api/capas/:id/d5`
Update D5 data (summary, risk assessment, plans).

### `POST /api/capas/:id/d5/actions`
Add corrective action.

Request:
```json
{
  "type": "occurrence",
  "rootCauseAddressed": "No automated tool life monitoring",
  "action": "Implement tool life counter with automatic lockout",
  "description": "Install Fanuc tool life management...",
  "responsible": "user-123",
  "dueDate": "2024-03-01",
  "priority": "high",
  "resourcesNeeded": ["PLC programmer: 8 hours"],
  "successCriteria": "Zero tool-life failures for 3 months"
}
```

### `PATCH /api/capas/:id/d5/actions/:actionId`
Update corrective action.

### `POST /api/capas/:id/d5/alternatives`
Add alternative considered.

### `PUT /api/capas/:id/d5/risk-assessment`
Update before/after risk assessment.

### `POST /api/capas/:id/d5/request-approval`
Submit for management approval.

### `POST /api/capas/:id/d5/approve`
Management approval (requires role).

### `POST /api/capas/:id/d5/reject`
Management rejection with reason.

### `POST /api/capas/:id/d5/complete`
Validate: actions defined, risk assessed, approved.

### `POST /api/capas/:id/d5/verify`

---

## D6: Implementation & Validation

### `GET /api/capas/:id/d6`
Get D6 implementation/validation data.

### `PUT /api/capas/:id/d6`
Update D6 data.

### `POST /api/capas/:id/d6/implementation-log`
Log implementation event.

Request:
```json
{
  "event": "Tool life counter installed and configured",
  "actionId": "PCA-001",
  "evidence": "Photo of HMI screen, test results"
}
```

### `POST /api/capas/:id/d6/actions/:actionId/implement`
Mark action as implemented.

### `POST /api/capas/:id/d6/delays`
Record delay with reason.

### `POST /api/capas/:id/d6/validation-tests`
Add validation test.

Request:
```json
{
  "name": "Process Capability Study",
  "method": "Measure 50 parts over 5 days",
  "acceptanceCriteria": "Cpk ≥ 1.33"
}
```

### `POST /api/capas/:id/d6/validation-tests/:testId/result`
Record test result.

### `PUT /api/capas/:id/d6/statistical-validation`
Update statistical validation (Cpk, hypothesis tests).

### `POST /api/capas/:id/d6/remove-containment`
Remove D3 containment (requires verification).

### `POST /api/capas/:id/d6/verify-effectiveness`
Verify corrective action effectiveness.

Request:
```json
{
  "result": "effective",
  "evidence": "Cpk improved from 0.89 to 2.14, zero defects in 30 days"
}
```

### `POST /api/capas/:id/d6/reoccurrence-check`
Record reoccurrence check result.

### `POST /api/capas/:id/d6/complete`
Validate: all actions implemented, effectiveness verified, no reoccurrence.

### `POST /api/capas/:id/d6/verify`

---

## D7: Preventive Actions

### `GET /api/capas/:id/d7`
Get D7 preventive action data.

### `PUT /api/capas/:id/d7`
Update D7 data.

### `POST /api/capas/:id/d7/systemic-analysis`
Record systemic analysis results.

### `POST /api/capas/:id/d7/similar-processes`
Identify similar processes at risk.

### `POST /api/capas/:id/d7/actions`
Add preventive action.

Request:
```json
{
  "type": "horizontal_deployment",
  "action": "Implement tool life monitoring on all presses",
  "scope": ["Press #1", "Press #2", "Press #4", "Press #5"],
  "rationale": "Same root cause could occur on other presses",
  "responsible": "user-123",
  "dueDate": "2024-06-01"
}
```

### `PATCH /api/capas/:id/d7/actions/:actionId`
Update preventive action.

### `POST /api/capas/:id/d7/actions/:actionId/verify`
Verify preventive action completion.

### `PUT /api/capas/:id/d7/horizontal-deployment`
Update horizontal deployment plan.

### `POST /api/capas/:id/d7/horizontal-deployment/:location`
Update deployment status for location.

### `POST /api/capas/:id/d7/lesson-learned`
Create lesson learned entry.

### `POST /api/capas/:id/d7/complete`
Validate: systemic review done, actions deployed, lessons captured.

### `POST /api/capas/:id/d7/verify`

---

## D8: Team Recognition & Closure

### `GET /api/capas/:id/d8`
Get D8 closure data.

### `PUT /api/capas/:id/d8`
Update D8 data.

### `POST /api/capas/:id/d8/closure-criteria/:itemId`
Mark closure criteria item as met.

### `PUT /api/capas/:id/d8/team-recognition`
Record team recognition.

Request:
```json
{
  "recognitionType": "team_celebration",
  "date": "2024-03-10",
  "achievements": ["Resolved in 21 days", "80% risk reduction"],
  "awards": [{"recipient": "user-456", "award": "Problem Solving Excellence"}]
}
```

### `PUT /api/capas/:id/d8/success-metrics`
Record quantified success metrics.

### `POST /api/capas/:id/d8/lessons-learned`
Add lessons learned entry.

### `POST /api/capas/:id/d8/submit-for-approval`
Submit for closure approval.

### `POST /api/capas/:id/d8/approve-closure`
Approve closure (management).

### `POST /api/capas/:id/d8/close`
Close the CAPA.

**Business Rules:**
1. All closure criteria met
2. Management approval received
3. Updates main CAPA record
4. Creates final audit log entry

### `POST /api/capas/:id/d8/reopen`
Reopen closed CAPA with reason.

### `GET /api/capas/:id/d8/final-report`
Generate final 8D report JSON.

### `POST /api/capas/:id/d8/complete`
### `POST /api/capas/:id/d8/verify`

---

## Audit Log Endpoints

### `GET /api/capas/:id/audit-log`
Get audit trail for CAPA.

Query params: `action`, `userId`, `limit`

### `GET /api/capa-audit-logs`
Get audit logs across all CAPAs.

Query params: `dateFrom`, `dateTo`, `action`, `userId`, `limit`

### `GET /api/capas/:id/audit-log/verify-chain`
Verify audit log hash chain integrity.

Response:
```json
{
  "valid": true,
  "totalEntries": 45,
  "checkedAt": "2024-03-10T16:00:00Z"
}
```

---

## Analytics Endpoints

### `GET /api/capa-analytics/summary`
Overall CAPA metrics.

Response:
```json
{
  "totalOpen": 12,
  "totalClosed": 156,
  "avgCycleTimeDays": 28,
  "onTimeRate": 0.82,
  "effectivenessRate": 0.94,
  "recurrenceRate": 0.03
}
```

### `GET /api/capa-analytics/by-status`
Count by status.

### `GET /api/capa-analytics/by-priority`
Count by priority.

### `GET /api/capa-analytics/by-source`
Count by source type.

### `GET /api/capa-analytics/by-category`
Count by category.

### `GET /api/capa-analytics/trends`
Trend data over time.

Query params: `metric`, `period` (daily/weekly/monthly), `months`

### `GET /api/capa-analytics/pareto`
Pareto analysis of root causes.

### `GET /api/capa-analytics/aging`
Aging analysis of open CAPAs.

### `GET /api/capa-analytics/team-performance`
Team performance metrics.

---

## Reporting Endpoints

### `GET /api/capas/:id/report`
Generate 8D report.

Query params: `format` (json/pdf)

### `GET /api/capas/:id/report/pdf`
Generate PDF 8D report.

**Business Rules:**
1. Include all 8 disciplines
2. Include attachments list
3. Include audit trail summary
4. Include signatures

### `POST /api/capa-reports/batch`
Generate batch report.

Request:
```json
{
  "capaIds": [1, 2, 3],
  "format": "pdf",
  "includeDetails": true
}
```

### `GET /api/capa-reports/summary`
Generate summary report for date range.

Query params: `dateFrom`, `dateTo`, `format`

---

## Metric Snapshot Endpoints

### `GET /api/capa-metrics/snapshots`
Get metric snapshots.

Query params: `period`, `limit`

### `POST /api/capa-metrics/snapshot`
Create metric snapshot (admin/scheduled job).

### `GET /api/capa-metrics/compare`
Compare two snapshots.

Query params: `snapshot1`, `snapshot2`

---

## Export Endpoints

### `GET /api/capas/export`
Export CAPAs to CSV/Excel.

Query params: `format` (csv/xlsx), `status`, `dateFrom`, `dateTo`

### `GET /api/capas/:id/export`
Export single CAPA with all data.

---

## Validation Checklist

- [ ] All endpoints use `requireAuth`
- [ ] All list endpoints filter by `req.orgId`
- [ ] D5-D8 completion validates requirements
- [ ] Closure requires all criteria met
- [ ] Audit log chain verification works
- [ ] Analytics calculate correctly
- [ ] PDF generation works
- [ ] Export formats correct
- [ ] No TypeScript errors
