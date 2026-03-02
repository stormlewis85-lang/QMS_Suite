# CAPA-UI-2: D5-D8 Forms, Attachments, Audit Trail

**Read RALPH_PATTERNS.md first. CAPA-UI-1 must be complete.**

---

## Mission

Build UI components for:
- D5 Permanent Corrective Actions form
- D6 Implementation & Validation form
- D7 Preventive Actions form
- D8 Team Recognition & Closure form
- Attachments panel with upload
- Related records panel
- Audit trail viewer
- Source details panel

---

## Pages/Tabs to Create

### 1. D5: Corrective Actions Form (`/capa/:id?tab=d5`)

**Sections:**

**Corrective Actions Table:**
```
┌─────────────────────────────────────────────────────────────────────┐
│  Permanent Corrective Actions                           [+ Add]    │
├──────┬────────────┬─────────────────────────┬──────────┬───────────┤
│ ID   │ Type       │ Action                  │ Owner    │ Status    │
├──────┼────────────┼─────────────────────────┼──────────┼───────────┤
│PCA-001│ Occurrence │ Implement tool life... │ J.Smith  │ Planned   │
│PCA-002│ Escape     │ Update SPC limits...   │ J.Doe    │ Planned   │
└──────┴────────────┴─────────────────────────┴──────────┴───────────┘
```

**Add/Edit Action Modal:**
- Type: Occurrence / Escape
- Root cause addressed (text)
- Action description (rich text)
- Detailed description
- Responsible (user picker)
- Due date
- Priority
- Resources needed (list)
- Success criteria
- Verification method

**Alternatives Considered Table:**
| Option | Pros | Cons | Cost | Effectiveness | Selected |
|--------|------|------|------|---------------|----------|
| Manual tracking | Low cost | Human error | $500 | Medium | ✗ |
| Automated system | No human error | Higher cost | $2500 | High | ✓ |

[+ Add Alternative]

**Risk Assessment Panel:**
```
┌─────────────────────────────────────────────────────────────┐
│  Risk Assessment (FMEA-style)                              │
├─────────────────────────┬───────────────────────────────────┤
│  BEFORE Correction      │  AFTER Correction (Projected)    │
├─────────────────────────┼───────────────────────────────────┤
│  Severity: 8            │  Severity: 8                     │
│  Occurrence: 6          │  Occurrence: 2                   │
│  Detection: 5           │  Detection: 3                    │
│  RPN: 240               │  RPN: 48                         │
│  AP: HIGH               │  AP: LOW                         │
├─────────────────────────┴───────────────────────────────────┤
│  Risk Reduction: 80%                                        │
│  New Controls: Tool life counter, Quarterly SPC review      │
└─────────────────────────────────────────────────────────────┘
```

**Implementation Plan:**
- Resources required (JSON editor)
- Timeline/milestones (Gantt or table)
- Dependencies
- Potential obstacles
- Contingency plan

**Document Updates:**
- PFMEA updates required? (toggle + plan)
- Control Plan updates required? (toggle + plan)
- Documents to update (multi-select from Document Control)
- Training required? (toggle + plan)

**Approvals:**
- Customer approval required? (toggle + status)
- Management approval status
- [Request Approval] [Approve] [Reject] buttons

**Cost Analysis:**
- Estimated cost
- Estimated savings
- Payback months

**Completion:**
[Complete D5] [Verify D5]

---

### 2. D6: Validation Form (`/capa/:id?tab=d6`)

**Sections:**

**Implementation Status:**
```
┌─────────────────────────────────────────────────────────────┐
│  Implementation Progress                                    │
│  ████████████████████░░░░░░░░░░ 65%                        │
├─────────────────────────────────────────────────────────────┤
│  Actions Implemented: 2 of 3                                │
│  Containment Removed: No                                    │
└─────────────────────────────────────────────────────────────┘
```

**Actions Progress Table:**
| ID | Action | Status | Implemented | Verified |
|----|--------|--------|-------------|----------|
| PCA-001 | Tool life counter | ✓ Complete | 2/25 by John | 2/26 by Jane |
| PCA-002 | SPC limit review | In Progress | - | - |

[Mark Implemented] [Mark Verified] buttons per row

**Implementation Log:**
```
┌─────────────────────────────────────────────────────────────┐
│  Implementation Log                             [+ Add]     │
├──────────┬──────────────────────────────────────┬───────────┤
│ Date     │ Event                                │ By        │
├──────────┼──────────────────────────────────────┼───────────┤
│ 2/25     │ Tool life counter installed          │ J.Smith   │
│ 2/26     │ Operators trained on new system      │ J.Smith   │
│ 2/27     │ First production run successful      │ J.Doe     │
└──────────┴──────────────────────────────────────┴───────────┘
```

**Delays:**
| Delay | Reason | Impact | Mitigation |
|-------|--------|--------|------------|
| 3 days | Parts delivery | Minor | Expedited shipping |

[+ Record Delay]

**Validation Tests:**
```
┌─────────────────────────────────────────────────────────────┐
│  Validation Tests                               [+ Add]     │
├──────┬─────────────────┬────────────────┬──────────┬────────┤
│ ID   │ Test Name       │ Criteria       │ Result   │ Pass   │
├──────┼─────────────────┼────────────────┼──────────┼────────┤
│VAL-001│ Capability Study│ Cpk ≥ 1.33    │ Cpk=2.14 │ ✓      │
│VAL-002│ Function Test   │ Lockout@10k   │ Pass     │ ✓      │
└──────┴─────────────────┴────────────────┴──────────┴────────┘
```

**Add Test Modal:**
- Test name
- Method description
- Acceptance criteria
- [Run Test] → [Record Result]

**Statistical Validation Panel:**
```
┌─────────────────────────────────────────────────────────────┐
│  Statistical Validation                                     │
├─────────────────────────┬───────────────────────────────────┤
│  Capability Study       │  Hypothesis Test                  │
│  Before Cpk: 0.89       │  Type: Paired t-test              │
│  After Cpk: 2.14        │  p-value: 0.0001                  │
│  Improvement: 140%      │  Conclusion: Significant          │
├─────────────────────────┴───────────────────────────────────┤
│  Control Charts: ✓ X-bar in control  ✓ R in control        │
└─────────────────────────────────────────────────────────────┘
```

**Pre/Post Comparison:**
- Baseline metrics (before)
- Current metrics (after)
- Visual comparison chart

**Containment Removal:**
- [Remove Containment] button
- Confirmation dialog
- Verified by

**Effectiveness:**
- Check date
- Period (30/60/90 days)
- Metric and target
- Actual result
- Verified? [Verify Effectiveness]
- Result: Effective / Partially / Not Effective
- Evidence (text + attachments)

**Reoccurrence Check:**
- Check date
- Method
- Result: No reoccurrence / Recurred
- [Record Check]

**Document Updates:**
Checkboxes with details:
- [ ] PFMEA updated → link to PFMEA
- [ ] Control Plan updated → link to CP
- [ ] Documents updated → list
- [ ] Training completed → records

**Completion:**
[Complete D6] [Verify D6]

---

### 3. D7: Preventive Actions Form (`/capa/:id?tab=d7`)

**Sections:**

**Systemic Analysis:**
- Analysis complete? (toggle)
- Summary (rich text)
- Management systems reviewed (checklist)

**Similar Areas at Risk:**
```
┌─────────────────────────────────────────────────────────────┐
│  Areas at Risk                                              │
├─────────────────────────────────────────────────────────────┤
│  Similar Processes: Press #1, #2, #4, #5                    │
│  Similar Products: [none identified]                        │
│  Other Plants: Plant B injection molding                    │
└─────────────────────────────────────────────────────────────┘
```

**Preventive Actions Table:**
| ID | Type | Action | Scope | Owner | Due | Progress |
|----|------|--------|-------|-------|-----|----------|
| PA-001 | Horizontal | Tool life on all presses | 5 presses | John | 6/1 | 40% |
| PA-002 | Procedure | Quarterly SPC review | All SPC | Jane | 3/15 | 100% |

[+ Add Action]

**Horizontal Deployment Tracker:**
```
┌─────────────────────────────────────────────────────────────┐
│  Horizontal Deployment: Tool Life Monitoring                │
├───────────────┬──────────────┬──────────────┬───────────────┤
│ Location      │ Planned      │ Completed    │ Verified      │
├───────────────┼──────────────┼──────────────┼───────────────┤
│ Press #1      │ 4/1          │ ✓ 3/28      │ ✓ 4/2        │
│ Press #2      │ 4/15         │ ✓ 4/12      │ ✓ 4/15       │
│ Press #4      │ 5/1          │ -            │ -             │
│ Press #5      │ 5/15         │ -            │ -             │
├───────────────┴──────────────┴──────────────┴───────────────┤
│  Overall Progress: ████████░░░░░░░░░░ 40%                   │
└─────────────────────────────────────────────────────────────┘
```

[Mark Complete] [Mark Verified] per location

**System Changes:**
Sections for each type:
- Policy changes (list)
- Procedure changes (list with doc links)
- System changes (list)
- Design changes (list)
- Supplier actions (list)

**Knowledge Capture:**
- FMEA system review complete? (toggle + notes)
- Lesson learned created? (toggle + link)
- Knowledge base updated? (toggle + entries)
- Training materials updated? (toggle + list)
- Audit checklists updated? (toggle + changes)

**Standardization:**
- Complete? (toggle)
- Summary of how standardized

**Completion:**
[Complete D7] [Verify D7]

---

### 4. D8: Closure Form (`/capa/:id?tab=d8`)

**Sections:**

**Closure Criteria Checklist:**
```
┌─────────────────────────────────────────────────────────────┐
│  Closure Criteria                    8 of 8 Complete ✓      │
├─────────────────────────────────────────────────────────────┤
│ ✓ All containment actions closed          Verified: John   │
│ ✓ Root cause verified and documented      Verified: Jane   │
│ ✓ All corrective actions implemented      Verified: John   │
│ ✓ Effectiveness verified                  Verified: Mike   │
│ ✓ Preventive actions deployed             Verified: John   │
│ ✓ Documentation updated                   Verified: Jane   │
│ ✓ Training completed                      Verified: HR     │
│ ✓ Customer acceptance received            Verified: John   │
└─────────────────────────────────────────────────────────────┘
```

Each item clickable to mark met + add verifier

**Team Recognition:**
```
┌─────────────────────────────────────────────────────────────┐
│  Team Recognition                                           │
├─────────────────────────────────────────────────────────────┤
│  Type: Team Celebration                                     │
│  Date: March 10, 2024                                       │
│  Location: Conference Room A                                │
├─────────────────────────────────────────────────────────────┤
│  Achievements:                                              │
│  • Resolved critical customer issue in 21 days              │
│  • Implemented sustainable fix with 80% risk reduction      │
│  • Zero defects escaped since implementation                │
├─────────────────────────────────────────────────────────────┤
│  Awards:                                                    │
│  🏆 Jane Doe - Problem Solving Excellence                   │
└─────────────────────────────────────────────────────────────┘
```

[Edit Recognition]

**Success Metrics Dashboard:**
```
┌─────────────────────────────────────────────────────────────┐
│  Success Metrics                                            │
├─────────────────┬─────────────────┬─────────────────────────┤
│ Quality         │ Process         │ Financial               │
├─────────────────┼─────────────────┼─────────────────────────┤
│ Defect Rate:    │ Cpk Before: 0.89│ Containment: $5,000     │
│ Before: 1.5%    │ Cpk After: 2.14 │ Correction: $2,500      │
│ After: 0%       │ Improve: 140%   │ Total Cost: $7,500      │
│ Improve: 100%   │                 │ Ann. Savings: $25,000   │
│                 │                 │ Payback: 4 months       │
└─────────────────┴─────────────────┴─────────────────────────┘
```

**Lessons Learned:**
| Lesson | Category | Shared With |
|--------|----------|-------------|
| Tool life monitoring prevents wear-related defects | Prevention | All Plants |
| SPC limits need periodic review | Detection | Quality Dept |

[+ Add Lesson]

**Team Feedback (Retrospective):**
- What went well?
- What could improve?
- Recommendations for future CAPAs

**Final Report:**
- [Generate Report] → Preview
- [Download PDF]
- [Link to Document Control]

**Customer Closure:**
- Customer notified? (toggle + date)
- Customer acceptance: Accepted / Pending / Rejected
- Customer feedback

**Cycle Time Summary:**
```
Total Days: 23  |  Target: 30  |  On Time: ✓
```

**Approvals:**
- [Submit for Approval]
- Approved by: [Management signature]
- Approved at: [date]

**Closure:**
- [Close CAPA] button (requires all criteria met + approval)
- Confirmation dialog with summary
- [Reopen CAPA] button (if closed, with reason prompt)

---

### 5. Attachments Panel (Component)

**Used on CAPA detail page sidebar or tab:**

```
┌─────────────────────────────────────────────────────────────┐
│  Attachments (12)                          [+ Upload]       │
├─────────────────────────────────────────────────────────────┤
│  Filter: [All ▼] [Evidence Only ☐]                         │
├─────────────────────────────────────────────────────────────┤
│  D0 - Emergency (3)                                    [▼]  │
│  ├── 📷 defect_photo_001.jpg         Evidence  [⬇] [🗑]    │
│  ├── 📄 customer_complaint.pdf                [⬇] [🗑]    │
│  └── 📧 initial_notification.msg              [⬇] [🗑]    │
│                                                             │
│  D3 - Containment (2)                                  [▼]  │
│  ├── 📄 sort_instructions.pdf                 [⬇] [🗑]    │
│  └── 📊 sort_results.xlsx            Evidence  [⬇] [🗑]    │
│                                                             │
│  D4 - Root Cause (4)                                   [▼]  │
│  ├── 📄 cmm_report.pdf               Evidence  [⬇] [🗑]    │
│  └── ...                                                    │
└─────────────────────────────────────────────────────────────┘
```

**Upload Modal:**
- Drag & drop zone
- Discipline selector (D0-D8 or General)
- Attachment type dropdown
- Title
- Description
- Is Evidence? toggle
- Evidence description (if evidence)

**Attachment Detail Modal:**
- Preview (images, PDFs)
- Metadata (uploaded by, date, size, checksum)
- Evidence chain of custody (if evidence)
- [Download] [Delete]

---

### 6. Related Records Panel (Component)

```
┌─────────────────────────────────────────────────────────────┐
│  Related Records (5)                        [+ Link]        │
├─────────────────────────────────────────────────────────────┤
│  PFMEA                                                      │
│  └── Row: Short shot failure mode    [caused_by]   [→]     │
│                                                             │
│  Control Plan                                               │
│  └── Row: C-100 Critical dimension   [affected]    [→]     │
│                                                             │
│  Documents                                                  │
│  ├── WI-INS-0045 Inspection Instr.   [updated]     [→]     │
│  └── QP-0012 SPC Procedure           [updated]     [→]     │
│                                                             │
│  CAPAs                                                      │
│  └── CAPA-2023-0045                  [similar]     [→]     │
└─────────────────────────────────────────────────────────────┘
```

**Link Modal:**
- Related type dropdown (PFMEA, Control Plan, Document, CAPA, etc.)
- Search/select the specific record
- Relationship type dropdown
- Description

---

### 7. Audit Trail Panel (Component or Page)

**Panel view (sidebar):**
```
┌─────────────────────────────────────────────────────────────┐
│  Recent Activity                          [View Full Log]   │
├─────────────────────────────────────────────────────────────┤
│  Today                                                      │
│  • John completed D4 verification            2:30 PM        │
│  • Jane added root cause candidate           1:15 PM        │
│                                                             │
│  Yesterday                                                  │
│  • Mike verified containment action ICA-001  4:00 PM        │
│  • John uploaded CMM report                  10:30 AM       │
└─────────────────────────────────────────────────────────────┘
```

**Full Audit Log Page (`/capa/:id/audit-log`):**
```
┌─────────────────────────────────────────────────────────────┐
│  Audit Trail - CAPA-2024-0001                              │
├─────────────────────────────────────────────────────────────┤
│  Filters: [Action ▼] [User ▼] [Date Range]  Chain: ✓ Valid │
├─────────────────────────────────────────────────────────────┤
│  #  │ Timestamp           │ Action          │ User   │ Details│
├─────┼─────────────────────┼─────────────────┼────────┼────────┤
│ 45  │ 2024-02-14 14:30:00 │ d4_verified     │ John   │ [View] │
│ 44  │ 2024-02-14 13:15:00 │ candidate_added │ Jane   │ [View] │
│ 43  │ 2024-02-13 16:00:00 │ d3_completed    │ Mike   │ [View] │
│ ... │                     │                 │        │        │
└─────┴─────────────────────┴─────────────────┴────────┴────────┘
```

**Detail Modal:**
- Full action details
- Previous value (JSON formatted)
- New value (JSON formatted)
- Diff view option
- Hash verification status

**Chain Verification:**
[Verify Chain Integrity] → Shows result

---

### 8. Source Details Panel (Component)

Displayed on Overview tab based on sourceType:

**Customer Complaint:**
```
┌─────────────────────────────────────────────────────────────┐
│  Source: Customer Complaint                                 │
├─────────────────────────────────────────────────────────────┤
│  Complaint #: CC-2024-0542                                  │
│  Customer: Kautex                                           │
│  Reported By: Customer QE                                   │
│  Report Date: February 10, 2024                             │
├─────────────────────────────────────────────────────────────┤
│  Quantity Affected: 15 parts                                │
│  Lots: L2024-0215                                           │
│  Serial Numbers: SN-001 through SN-015                      │
├─────────────────────────────────────────────────────────────┤
│  External System: Customer Portal                           │
│  External Link: [View in Portal →]                          │
└─────────────────────────────────────────────────────────────┘
```

Similar panels for other source types.

---

## Shared Components

### Discipline Tab Navigation
Horizontal tabs D0-D8 with completion indicators.

### Completion/Verification Buttons
Standard pattern for all disciplines:
- [Complete Dx] - validates requirements, shows errors if not met
- [Verify Dx] - manager/supervisor verification

### User Picker
Searchable dropdown for selecting users from organization.

### Rich Text Editor
For descriptions, notes, etc.

### JSON Editor
For complex structured data (scope, plans, etc.).

---

## Routes to Register

```typescript
// These are tabs on /capa/:id, not separate routes
// But audit log has its own route:
<Route path="/capa/:id/audit-log" component={CapaAuditLog} />
```

---

## Validation Checklist

- [ ] D5 corrective actions CRUD works
- [ ] D5 risk assessment calculates correctly
- [ ] D6 implementation tracking works
- [ ] D6 validation tests record results
- [ ] D7 horizontal deployment tracker works
- [ ] D8 closure criteria checklist works
- [ ] D8 close button validates all requirements
- [ ] Attachments upload/download works
- [ ] Related records linking works
- [ ] Audit trail displays correctly
- [ ] Chain verification works
- [ ] No TypeScript errors
