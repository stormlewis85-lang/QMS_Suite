# CAPA-API-1: Core CAPA & Disciplines D0-D4 Endpoints

**Read RALPH_PATTERNS.md first. All CAPA-DB agents must be complete.**

---

## Mission

Build API endpoints for:
- Core CAPA CRUD with auto-numbering
- Team member management
- Source and attachment handling  
- D0 Emergency Response
- D1 Team Formation
- D2 Problem Description (Is/Is Not)
- D3 Interim Containment
- D4 Root Cause Analysis

---

## Authentication & Authorization

**All endpoints require authentication via `requireAuth` middleware.**

```typescript
app.get("/api/capas", requireAuth, async (req, res) => {
  // req.orgId is guaranteed to exist
});
```

**Role-Based Access:**
- `admin`, `quality_manager`: Full access
- `engineer`: Create/edit CAPAs, participate
- `viewer`: Read-only

---

## Core CAPA Endpoints

### `GET /api/capas`
List CAPAs with filtering and pagination.

Query params: `status`, `priority`, `sourceType`, `category`, `assignedTo`, `overdue`, `search`, `page`, `limit`

Response 200:
```json
{
  "data": [{
    "id": 1,
    "capaNumber": "CAPA-2024-0001",
    "title": "...",
    "priority": "high",
    "status": "d4_root_cause",
    "currentDiscipline": "D4",
    "sourceType": "customer_complaint",
    "targetClosureDate": "2024-03-15",
    "isOverdue": false,
    "teamMemberCount": 5
  }],
  "pagination": {"page": 1, "total": 45}
}
```

### `GET /api/capas/:id`
Get CAPA with full details including D0-D4 data.

### `POST /api/capas`
Create CAPA. Auto-generates capaNumber, sets status to 'd0_awareness'.

### `PATCH /api/capas/:id`
Update CAPA. Logs changes to audit.

### `POST /api/capas/:id/advance-discipline`
Move to next discipline after validation.

### `POST /api/capas/:id/hold`
Put CAPA on hold with reason.

### `POST /api/capas/:id/resume`
Resume CAPA from hold.

### `DELETE /api/capas/:id`
Soft delete (admin/QM only).

---

## Team Member Endpoints

### `GET /api/capas/:id/team`
List team members.

### `POST /api/capas/:id/team`
Add team member. Enforces: one champion, one leader, no duplicates.

### `PATCH /api/capas/:id/team/:memberId`
Update member role/info.

### `DELETE /api/capas/:id/team/:memberId`
Remove member with reason.

---

## Source Endpoints

### `GET /api/capas/:id/sources`
### `POST /api/capas/:id/sources`
### `DELETE /api/capas/:id/sources/:sourceId`

---

## Attachment Endpoints

### `GET /api/capas/:id/attachments`
Query params: `discipline`, `isEvidence`

### `POST /api/capas/:id/attachments`
Multipart upload with discipline, type, isEvidence fields.

### `GET /api/capa-attachments/:id/download`
### `DELETE /api/capa-attachments/:id`

---

## Related Records Endpoints

### `GET /api/capas/:id/related`
### `POST /api/capas/:id/related`
Link to PFMEA, Control Plan, documents, other CAPAs.

### `DELETE /api/capas/:id/related/:relatedId`

---

## D0: Emergency Response

### `GET /api/capas/:id/d0`
### `PUT /api/capas/:id/d0`
Update emergency response data.

### `POST /api/capas/:id/d0/emergency-actions`
Add action with assignee, priority, due date.

### `PATCH /api/capas/:id/d0/emergency-actions/:index`
Complete or verify action.

### `POST /api/capas/:id/d0/complete`
Validate all actions complete, symptoms captured.

### `POST /api/capas/:id/d0/verify`
Manager verification.

---

## D1: Team Formation

### `GET /api/capas/:id/d1`
### `PUT /api/capas/:id/d1`

### `POST /api/capas/:id/d1/meetings`
Add meeting to schedule.

### `POST /api/capas/:id/d1/approve-resources`

### `POST /api/capas/:id/d1/complete`
Validate: champion, leader, min 3 members, charter.

### `POST /api/capas/:id/d1/verify`

---

## D2: Problem Description

### `GET /api/capas/:id/d2`
### `PUT /api/capas/:id/d2`

### `PUT /api/capas/:id/d2/is-not/:dimension`
Update Is/Is Not for what/where/when/howMany.

### `POST /api/capas/:id/d2/verify-problem-statement`
### `POST /api/capas/:id/d2/data-points`
### `POST /api/capas/:id/d2/verify-measurement-system`

### `POST /api/capas/:id/d2/complete`
Validate: 5W+1H complete, Is/Is Not done, MSA verified.

### `POST /api/capas/:id/d2/verify`

---

## D3: Interim Containment

### `GET /api/capas/:id/d3`
### `PUT /api/capas/:id/d3`

### `POST /api/capas/:id/d3/actions`
Add containment action (inspection, sorting, etc).

### `PATCH /api/capas/:id/d3/actions/:actionId`
Update action status.

### `POST /api/capas/:id/d3/actions/:actionId/verify`
Verify action effectiveness.

### `POST /api/capas/:id/d3/sort-results`
Record sorting results by location.

### `POST /api/capas/:id/d3/verify-effectiveness`
Confirm overall containment effectiveness.

### `POST /api/capas/:id/d3/complete`
### `POST /api/capas/:id/d3/verify`

---

## D4: Root Cause Analysis

### `GET /api/capas/:id/d4`
### `PUT /api/capas/:id/d4`

### `POST /api/capas/:id/d4/five-why`
Add 5-Why chain (occurrence or escape).

### `PATCH /api/capas/:id/d4/five-why/:chainId`
Update 5-Why chain.

### `PUT /api/capas/:id/d4/fishbone`
Update fishbone diagram.

### `POST /api/capas/:id/d4/candidates`
Add root cause candidate.

### `PATCH /api/capas/:id/d4/candidates/:candidateId`
Update candidate (verify, refute).

### `POST /api/capas/:id/d4/candidates/:candidateId/verify`
Mark as verified root cause.

### `POST /api/capas/:id/d4/verification-tests`
Add verification test.

### `POST /api/capas/:id/d4/verify-occurrence`
Verify occurrence root cause.

### `POST /api/capas/:id/d4/verify-escape`
Verify escape root cause.

### `POST /api/capas/:id/d4/complete`
Validate: both root causes verified, evidence documented.

### `POST /api/capas/:id/d4/verify`

---

## Dashboard Endpoints

### `GET /api/capas/dashboard`
Summary metrics, by-status counts, recent activity.

### `GET /api/capas/my-assignments`
CAPAs where user is team member.

### `GET /api/capas/overdue`
Overdue CAPAs with days overdue.

---

## Validation Checklist

- [ ] All endpoints use `requireAuth`
- [ ] All list endpoints filter by `req.orgId`
- [ ] All creates set `orgId` from `req.orgId`
- [ ] Audit logs for all state changes
- [ ] File upload handles multipart
- [ ] D0-D4 completion validates requirements
- [ ] Team constraints enforced
- [ ] No TypeScript errors
