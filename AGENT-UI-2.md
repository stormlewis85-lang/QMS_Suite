# AGENT-UI-2: Approvals, Reviews, Comparison & Admin

**Read RALPH_PATTERNS.md first. AGENT-UI-1 must be complete.**

---

## Authentication

All pages are protected by `<ProtectedRoute>` wrapper in App.tsx.
The `useAuth()` hook provides:
- `user` - Current user with `orgId` and `organization` info
- `isAuthenticated` - Boolean
- `logout()` - Sign out function

No additional auth handling needed in individual pages.

---

## Mission

Build supporting pages:
- My Approvals queue
- Document review calendar
- Revision comparison view
- Admin pages for workflows, templates, distribution lists

---

## Pages

### 1. Approvals.tsx - My Approval Queue

**Route:** `/approvals`

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ My Approvals                                                │
├──────────┬──────────┬────────────────────────────────────────┤
│ Pending  │ Completed│ Delegated to Me                        │
│ (5)      │          │                                        │
├──────────┴──────────┴────────────────────────────────────────┤
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ⚠️ OVERDUE                                               │ │
│ │ WI-PROD-001: Assembly Work Instruction                  │ │
│ │ Step: Technical Review                                  │ │
│ │ Due: Feb 13 (2 days overdue)                           │ │
│ │                           [View] [Approve] [Reject]     │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ WI-PROD-005: Welding Procedure                          │ │
│ │ Step: Quality Approval (Signature Required)             │ │
│ │ Due: Feb 17 (3 days)                                   │ │
│ │                           [View] [Approve] [Reject]     │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Tabs:**
- **Pending** - Steps assigned to user, status=pending
- **Completed** - User's completed approvals (history)
- **Delegated to Me** - Steps delegated from others

**Each Pending Card Shows:**
- Document number and title
- Step name
- Due date with overdue warning
- Previous step info (who submitted, comments)
- Quick action buttons: View, Approve, Reject, Delegate

**Approve Action:**
1. If signature not required: Confirm modal with comments field
2. If signature required: Full signature capture modal
   - Shows meaning statement
   - Password field
   - Legal confirmation checkbox
   - Sign button

**Bulk Actions:**
- Select multiple → Bulk Approve (if no signatures required)

**API:** `GET /api/my/approvals`, `POST /api/workflow-steps/:id/approve`

---

### 2. DocumentReviews.tsx - Review Calendar

**Route:** `/document-reviews`

**Purpose:** Periodic document reviews (documents must be reviewed annually or per schedule)

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ Document Reviews                              [Calendar ↔ List]│
├─────────────────────────────────────────────────────────────┤
│                    February 2024                            │
│ ┌─────┬─────┬─────┬─────┬─────┬─────┬─────┐                │
│ │ Sun │ Mon │ Tue │ Wed │ Thu │ Fri │ Sat │                │
│ ├─────┼─────┼─────┼─────┼─────┼─────┼─────┤                │
│ │     │     │     │     │  1  │  2  │  3  │                │
│ │     │     │     │     │     │     │     │                │
│ ├─────┼─────┼─────┼─────┼─────┼─────┼─────┤                │
│ │  4  │  5  │  6  │  7  │  8  │  9  │ 10  │                │
│ │     │     │     │ 🔴2 │     │     │ 🟡1 │                │
│ └─────┴─────┴─────┴─────┴─────┴─────┴─────┘                │
│                                                             │
│ 🔴 Overdue (2)    🟡 Due this week (3)    ⚪ Upcoming (12)  │
├─────────────────────────────────────────────────────────────┤
│ February 7 - Overdue Reviews:                               │
│   • WI-PROD-001 - Last reviewed: Feb 7, 2023               │
│   • PROC-QC-003 - Last reviewed: Feb 7, 2023               │
│                                          [Review] [Review]  │
└─────────────────────────────────────────────────────────────┘
```

**Views:**
- Calendar view (month)
- List view (sortable table)

**Review Action Modal:**
```
Review Document: WI-PROD-001

Last reviewed: February 7, 2023
Review cycle: 365 days

What is the status of this document?

○ Still Valid - No changes needed
○ Needs Revision - Document requires updates  
○ Obsolete - Document should be retired

Comments: [_________________________________]

Next review date: [February 7, 2025    ] (auto-calculated)

                              [Cancel] [Complete Review]
```

**API:** `GET /api/documents?reviewDueBefore=...`, `PATCH /api/documents/:id` (update lastReviewedAt)

---

### 3. DocumentCompare.tsx - Revision Comparison

**Route:** `/documents/:id/compare?rev1=A&rev2=B`

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ Compare Revisions: WI-PROD-001                              │
├─────────────────────────────────────────────────────────────┤
│ Left: [Rev A ▼]                    Right: [Rev B ▼]         │
├─────────────────────────────────────────────────────────────┤
│        Side-by-Side │ Unified │ Metadata │ Summary         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Rev A                    │  Rev B                          │
│  ─────────────────────────│──────────────────────────────── │
│  3.2 Tolerances           │  3.2 Tolerances                 │
│  Dimension A: ±0.05mm     │  Dimension A: ±0.02mm  ← CHANGED│
│  Dimension B: ±0.10mm     │  Dimension B: ±0.10mm           │
│                           │  Dimension C: ±0.05mm  ← ADDED  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Views:**
- **Side-by-Side:** Two columns showing each revision
- **Unified:** Single view with additions (green) and deletions (red)
- **Metadata:** Table comparing document properties
- **Summary:** Auto-generated change summary

**Metadata Comparison:**
| Field | Rev A | Rev B |
|-------|-------|-------|
| Effective Date | Jan 1, 2024 | Feb 10, 2024 |
| Approved By | John Smith | Jane Doe |
| Files | 1 | 2 |

**Export:** "Export Change Report" → PDF for training records

**API:** `GET /api/document-revisions/:id` (for each revision)

---

### 4. Admin: WorkflowBuilder.tsx

**Route:** `/admin/workflows`

**List View:**
- Table of workflow definitions
- Columns: Name, Code, Applies To, Steps, Status
- Actions: Edit, Clone, Deactivate

**Editor View:**
```
┌─────────────────────────────────────────────────────────────┐
│ Edit Workflow: Standard Document Approval                   │
├─────────────────────────────────────────────────────────────┤
│ Name: [Standard Document Approval    ]                      │
│ Code: [WF-STD-001                     ]                     │
│                                                             │
│ Applies to document types:                                  │
│ [✓] Work Instruction  [✓] Procedure  [ ] Form              │
│ [ ] Checklist  [✓] Specification  [ ] Drawing              │
├─────────────────────────────────────────────────────────────┤
│ Workflow Steps:                                    [+ Add]  │
│                                                             │
│ ┌─ Step 1 ──────────────────────────────────────────────┐  │
│ │ Name: [Author Submission        ]                      │  │
│ │ Assignee: [Initiator            ▼]                    │  │
│ │ Due in: [5] days                                       │  │
│ │ [ ] Signature Required   [ ] Can Delegate             │  │
│ │                                            [↑] [↓] [✗] │  │
│ └────────────────────────────────────────────────────────┘  │
│                                                             │
│ ┌─ Step 2 ──────────────────────────────────────────────┐  │
│ │ Name: [Technical Review         ]                      │  │
│ │ Assignee: [Role: Engineer       ▼]                    │  │
│ │ Due in: [3] days                                       │  │
│ │ [ ] Signature Required   [✓] Can Delegate             │  │
│ └────────────────────────────────────────────────────────┘  │
│                                                             │
│                                        [Cancel] [Save]      │
└─────────────────────────────────────────────────────────────┘
```

**Step Configuration:**
- Name
- Assignee type: Initiator, Specific User, Role-based, Department Head
- Role selection (if role-based)
- Due days
- Signature required checkbox
- Signature meaning text (if signature required)
- Can delegate checkbox
- Reorder buttons (up/down)
- Delete button

**API:** `GET/POST/PATCH/DELETE /api/approval-workflow-definitions`

---

### 5. Admin: DistributionLists.tsx

**Route:** `/admin/distribution-lists`

**List View:**
- Table of lists
- Columns: Name, Code, Recipient Count, Acknowledgment Required
- Actions: Edit, Delete

**Editor:**
```
┌─────────────────────────────────────────────────────────────┐
│ Edit Distribution List: Production Floor                    │
├─────────────────────────────────────────────────────────────┤
│ Name: [Production Floor Documents    ]                      │
│ Code: [DL-PROD-001                   ]                      │
│                                                             │
│ Recipients:                                        [+ Add]  │
│                                                             │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ 👤 Role: Production Supervisor                    [✗]  │ │
│ │ 👤 Role: Production Operator                      [✗]  │ │
│ │ 🏢 Department: Production                         [✗]  │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                             │
│ Settings:                                                   │
│ [✓] Require acknowledgment                                 │
│ Acknowledgment due in: [7] days                            │
│ [✓] Send email notification                                │
│                                                             │
│                                        [Cancel] [Save]      │
└─────────────────────────────────────────────────────────────┘
```

**Add Recipient Dialog:**
- Type selector: User, Role, Department
- User: Search/select user
- Role: Dropdown of roles
- Department: Dropdown of departments

**API:** `GET/POST/PATCH/DELETE /api/distribution-lists`

---

### 6. Admin: DocumentTemplates.tsx

**Route:** `/admin/document-templates`

**List View:**
- Table of templates
- Columns: Name, Code, Type, Status, Default Workflow
- Actions: Edit, Activate, Deprecate

**Editor:**
```
┌─────────────────────────────────────────────────────────────┐
│ Edit Template: Work Instruction Template                    │
├─────────────────────────────────────────────────────────────┤
│ Name: [Work Instruction Template     ]                      │
│ Code: [TMPL-WI-001                   ]                      │
│ Type: [Work Instruction              ▼]                     │
│ Category: [Production                ▼]                     │
│ Department: [Manufacturing           ▼]                     │
│                                                             │
│ Template File:                                              │
│ [📄 wi-template.docx] [Replace] [Download]                 │
│                                                             │
│ Field Mappings:                                   [+ Add]   │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ doc_number  → auto_generate: WI-{dept}-{seq:4}    [✗]  │ │
│ │ revision    → auto_increment: A                    [✗]  │ │
│ │ date        → current_date: YYYY-MM-DD            [✗]  │ │
│ │ part_number → linked.part.partNumber              [✗]  │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                             │
│ Default Workflow: [Standard Document Approval    ▼]         │
│ Review Cycle: [365] days                                    │
│                                                             │
│                                        [Cancel] [Save]      │
└─────────────────────────────────────────────────────────────┘
```

**API:** `GET/POST/PATCH/DELETE /api/document-templates`

---

### 7. Admin: AuditLog.tsx

**Route:** `/admin/audit-log`

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ Audit Log                                       [Export CSV]│
├─────────────────────────────────────────────────────────────┤
│ Document: [All          ▼] User: [All        ▼]            │
│ Action:   [All          ▼] Date: [Last 7 days ▼]           │
├─────────────────────────────────────────────────────────────┤
│ Timestamp          │ User        │ Action   │ Document     │
│────────────────────┼─────────────┼──────────┼──────────────│
│ Feb 10 14:32:05   │ John Smith  │ approve  │ WI-PROD-001  │
│ Feb 10 14:30:12   │ John Smith  │ view     │ WI-PROD-001  │
│ Feb 10 12:15:33   │ Jane Doe    │ download │ PROC-QC-003  │
│ Feb 10 11:45:00   │ Bob Wilson  │ print    │ WI-PROD-001  │
└─────────────────────────────────────────────────────────────┘
```

**Features:**
- Filters: Document, User, Action type, Date range
- Sortable columns
- Click row to see full details
- Export to CSV
- Infinite scroll or pagination

**Detail Panel (on row click):**
```
Action: approve
Timestamp: Feb 10, 2024 14:32:05 UTC
User: John Smith (quality_engineer)
Document: WI-PROD-001 Rev B
IP Address: 192.168.1.100
Session: sess-abc123

Details:
{
  "stepNumber": 2,
  "workflowInstanceId": 42,
  "comments": "Reviewed and approved"
}
```

**API:** `GET /api/audit-log`, `GET /api/audit-log/export`

---

### 8. ExternalDocuments.tsx

**Route:** `/external-documents`

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ External Documents                              [+ Add]     │
├─────────────────────────────────────────────────────────────┤
│ 🔍 Search...              Source: [All ▼]  Status: [All ▼] │
├─────────────────────────────────────────────────────────────┤
│ ⚠️ Updates Available (2)                                    │
│   ASTM E18 - New version 2024 available                    │
│                                          [Review Update]    │
├─────────────────────────────────────────────────────────────┤
│ Document          │ Source │ Version │ Status  │ Updated   │
│───────────────────┼────────┼─────────┼─────────┼───────────│
│ IATF 16949:2016   │ IATF   │ 2016    │ Active  │ Jan 2024  │
│ ISO 9001:2015     │ ISO    │ 2015    │ Active  │ Jan 2024  │
│ AIAG PFMEA        │ AIAG   │ 2019    │ Active  │ Jan 2024  │
│ ASTM E18 ⚠️       │ ASTM   │ 2022    │ Update  │ Feb 2024  │
└─────────────────────────────────────────────────────────────┘
```

**Add/Edit Dialog:**
- Document number
- Title
- Source (ISO, ASTM, AIAG, SAE, Customer, Government)
- External URL
- Current version
- Version date
- Local file upload (optional)
- Subscription active checkbox
- Category

**API:** `GET/POST/PATCH/DELETE /api/external-documents`

---

## Navigation Updates

Add to sidebar:

```
Documents
├── All Documents      → /documents
├── My Approvals       → /approvals
├── Reviews Due        → /document-reviews
└── External Docs      → /external-documents

Admin
├── Workflows          → /admin/workflows
├── Templates          → /admin/document-templates
├── Distribution Lists → /admin/distribution-lists
└── Audit Log          → /admin/audit-log
```

---

## Validation Checklist

- [ ] Approvals page shows pending items
- [ ] Approve/Reject work from approvals page
- [ ] Signature capture works for required steps
- [ ] Bulk approve works (non-signature)
- [ ] Reviews calendar shows due dates
- [ ] Review action modal updates document
- [ ] Comparison view shows differences
- [ ] Metadata comparison works
- [ ] Workflow builder creates/edits workflows
- [ ] Step reordering works
- [ ] Distribution list editor works
- [ ] Template editor works with field mappings
- [ ] Audit log displays with filters
- [ ] CSV export works
- [ ] External documents CRUD works
- [ ] Update alerts display
- [ ] All routes registered in App.tsx
- [ ] Sidebar navigation works
- [ ] No TypeScript errors
