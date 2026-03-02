# CAPA-UI-1: Dashboard, List, Core Forms & D0-D4

**Read RALPH_PATTERNS.md first. All CAPA-API agents must be complete.**

---

## Mission

Build UI components for:
- CAPA Dashboard with metrics and charts
- CAPA list with filtering/search
- CAPA create/edit forms
- Team management panel
- D0-D4 discipline forms
- 8D progress timeline

---

## Authentication

All pages protected by `<ProtectedRoute>`. Use `useAuth()` hook for user context.

---

## Pages to Create

### 1. CAPA Dashboard (`/capa/dashboard`)

**Components:**
- Summary cards: Open, Overdue, Closed This Month, Avg Cycle Time
- Status distribution chart (pie/donut)
- Priority distribution chart (bar)
- Trend chart (line) - opened vs closed over time
- My Assignments table
- Recent Activity feed
- Overdue CAPAs alert section

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  CAPA Dashboard                                    [+ New]  │
├─────────┬─────────┬─────────┬─────────┬───────────────────┤
│  Open   │ Overdue │ Closed  │ Avg Time│                   │
│   12    │    3    │   156   │  28 days│                   │
├─────────┴─────────┼─────────┴─────────┼───────────────────┤
│                   │                   │                   │
│  Status Pie       │  Priority Bar     │  Trend Line       │
│                   │                   │                   │
├───────────────────┴───────────────────┴───────────────────┤
│  My Assignments (5)                                        │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ CAPA-2024-0001 │ High │ D4 │ Root Cause │ user-123 │  │
│  └─────────────────────────────────────────────────────┘  │
├───────────────────────────────────────────────────────────┤
│  Recent Activity                      │  Overdue Alert    │
│  • John completed D3 on CAPA-001      │  ⚠ 3 CAPAs past  │
│  • Jane added root cause candidate    │    target date   │
└───────────────────────────────────────┴───────────────────┘
```

---

### 2. CAPA List (`/capa`)

**Features:**
- Filterable table with columns: Number, Title, Priority, Status, Source, Owner, Target Date, Age
- Priority badges (Critical=red, High=orange, Medium=yellow, Low=green)
- Status badges with discipline indicator (D0-D8)
- Overdue indicator (red text/icon)
- Search by number, title, part number
- Filters: Status, Priority, Source Type, Category, Assigned To, Overdue
- Pagination
- Sort by any column
- Click row to navigate to detail

**Filter Bar:**
```
[Search...                    ] [Status ▼] [Priority ▼] [Source ▼] [Overdue ☐]
```

---

### 3. CAPA Detail (`/capa/:id`)

**Layout with tabs:**
```
┌─────────────────────────────────────────────────────────────┐
│  CAPA-2024-0001: Critical dimension out of spec            │
│  Priority: [HIGH]  Status: [D4 - Root Cause]  Source: CC   │
├───────────────────────────────────┬─────────────────────────┤
│  8D Progress Timeline             │  Actions               │
│  ●──●──●──●──◐──○──○──○──○        │  [Advance] [Hold] [Edit]│
│  D0 D1 D2 D3 D4 D5 D6 D7 D8       │                        │
├───────────────────────────────────┴─────────────────────────┤
│  [Overview] [D0] [D1] [D2] [D3] [D4] [D5] [D6] [D7] [D8]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Tab Content Area                                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Overview Tab:**
- Problem description
- Key dates (Occurred, Discovered, Target, Actual)
- Part numbers affected
- Customer info
- Source details
- Team members list
- Attachments summary
- Related records

**Sidebar (always visible):**
- Progress timeline
- Team quick view
- Quick links to each discipline

---

### 4. CAPA Create (`/capa/new`)

**Multi-step wizard or single form:**

**Fields:**
- Title (required)
- Description (required, rich text)
- Type: Corrective / Preventive / Both
- Priority: Critical / High / Medium / Low
- Source Type (dropdown with conditional fields)
- Category: Quality / Safety / Delivery / Cost / Environmental
- Customer Name (if customer-related)
- Part Numbers (multi-select from parts list)
- Process IDs (multi-select)
- Plant Location
- Date Occurred
- Date Discovered (defaults to today)
- Target Closure Date (auto-calculate based on priority)

**Source-specific fields (show based on sourceType):**
- Customer Complaint: Complaint number, quantity affected, lots
- Internal NCR: NCR number
- Audit Finding: Audit ID, type, category
- Supplier Issue: Supplier name, code
- PFMEA Risk: Link to PFMEA row

---

### 5. Team Management Panel (Component)

**Features:**
- Current team members table
- Role badges
- Champion/Leader indicators
- Add member button → modal with user search
- Remove member button with reason prompt
- Role dropdown to change
- Activity indicator (last active)

---

### 6. D0: Emergency Response Form (`/capa/:id?tab=d0`)

**Sections:**

**Emergency Assessment:**
- Emergency response required? (toggle)
- Response type dropdown
- Threat level selector
- Safety impact toggle
- Regulatory impact toggle + body + deadline

**Customer Notification:**
- Required toggle
- Notified date
- Response notes

**Stop Shipment:**
- Issued toggle
- Scope description
- Dates

**Emergency Actions Table:**
| Action | Priority | Assigned | Due | Status | Actions |
|--------|----------|----------|-----|--------|---------|
| Stop Press #3 | Immediate | John | 8:30 | ✓ Complete | [View] |
| Quarantine WIP | Urgent | Jane | 12:00 | In Progress | [Complete] |

[+ Add Action] button → modal

**Quantities:**
- At risk
- Contained
- Sorted (pass/fail)

**Completion:**
[Complete D0] [Verify D0] buttons with validation

---

### 7. D1: Team Formation Form (`/capa/:id?tab=d1`)

**Sections:**

**Team Setup:**
- Formation date picker
- Formation method dropdown
- Charter defined toggle
- Charter document link

**Objectives:**
- Team objective (text area)
- Scope (text area)
- Boundaries (text area)

**Communication Plan:**
- Frequency dropdown
- Method dropdown
- Stakeholder list editor

**Meeting Schedule:**
| Meeting | Frequency | Time | Duration | Location |
|---------|-----------|------|----------|----------|
| Daily Standup | Daily | 08:00 | 15 min | Conf B |

[+ Add Meeting]

**Resources:**
- Resources needed (list editor)
- Approved toggle
- Approved by

**Completion:**
[Complete D1] [Verify D1]

---

### 8. D2: Problem Description Form (`/capa/:id?tab=d2`)

**Sections:**

**Problem Statement:**
- Problem statement (rich text, prominently displayed)
- Verified toggle + verifier

**What:**
- Object description
- Defect description
- Is/Is Not table (editable)

**Where:**
- Geographic location
- On object location
- Is/Is Not table

**When:**
- First observed date
- Pattern description
- Lifecycle phase
- Is/Is Not table

**How Many:**
- Units affected
- Defects per unit
- Trend
- Is/Is Not table

**Is/Is Not Editor Component:**
```
┌─────────────────────────────────────────────────────────────┐
│  IS                           │  IS NOT                     │
├───────────────────────────────┼─────────────────────────────┤
│ [+ Add observation]           │ [+ Add observation]         │
│ • Part 3004-XYZ              │ • Other part numbers        │
│   Evidence: Customer report   │   Distinction: Only this    │
└───────────────────────────────┴─────────────────────────────┘
│ Distinctions: Unique tooling for this dimension             │
└─────────────────────────────────────────────────────────────┘
```

**Data Collection:**
- Plan editor
- Data points table with add/import
- Measurement system valid toggle + notes

**Completion:**
[Complete D2] [Verify D2]

---

### 9. D3: Containment Form (`/capa/:id?tab=d3`)

**Sections:**

**Containment Strategy:**
- Required toggle (if no, show reason field)
- Strategy description
- Scope JSON editor (parts, operations, dates, lots)
- Locations list

**Containment Actions Table:**
| ID | Action | Type | Location | Assigned | Due | Status | Verified |
|----|--------|------|----------|----------|-----|--------|----------|
| ICA-001 | 100% inspection | Inspection | Final Insp | John | 2/12 | ✓ Active | ✓ |

[+ Add Action] → modal with:
- Action description
- Type (inspection/sorting/hold/rework/etc)
- Location
- Assigned to (user picker)
- Due date
- Instructions (rich text)

Action row expansion → implementation details, verification, results

**Inventory Status:**
| Location | Qty | Status | Pass | Fail | Sorted |
|----------|-----|--------|------|------|--------|
| Production | 150 | Sorted | 145 | 5 | ✓ |
| Warehouse A | 300 | Quarantined | - | - | ☐ |

**Sort Results Entry:**
[+ Record Sort Results] → modal

**Verification:**
- Verification method
- Frequency
- Results log

**Effectiveness:**
- Effective toggle
- Evidence
- Customer approval (if required)

**Costs:**
- Cost breakdown (labor, material, shipping, expedite)
- Total

**Completion:**
[Complete D3] [Verify D3]

---

### 10. D4: Root Cause Analysis Form (`/capa/:id?tab=d4`)

**Sections:**

**Analysis Approach:**
- Methods used (checkboxes): 5-Why, Fishbone, Fault Tree, DOE, Other

**5-Why Analysis:**
Interactive 5-Why builder:
```
┌─────────────────────────────────────────────────────────────┐
│  5-Why Chain #1: Occurrence                      [Delete]   │
├─────────────────────────────────────────────────────────────┤
│  Starting Point: Dimension out of specification            │
├─────────────────────────────────────────────────────────────┤
│  Why 1: Why is dimension out of spec?                       │
│  → Tool insert is worn                                      │
├─────────────────────────────────────────────────────────────┤
│  Why 2: Why is tool insert worn?                            │
│  → Insert exceeded tool life                                │
├─────────────────────────────────────────────────────────────┤
│  Why 3: Why did insert exceed tool life?                    │
│  → Tool change schedule not followed                        │
├─────────────────────────────────────────────────────────────┤
│  Why 4: Why wasn't schedule followed?                       │
│  → Manual tracking, no alerts                               │
├─────────────────────────────────────────────────────────────┤
│  Why 5: Why no alerts?                                      │
│  → No automated tool life monitoring                        │
├─────────────────────────────────────────────────────────────┤
│  ROOT CAUSE: No automated tool life monitoring system       │
│  [Mark Verified] ✓ Verified by John on 2/14                │
└─────────────────────────────────────────────────────────────┘
```

[+ Add 5-Why Chain]

**Fishbone Diagram:**
Interactive Ishikawa diagram:
- 6M categories (Man, Machine, Material, Method, Measurement, Environment)
- Click category to add causes
- Mark causes as verified/refuted
- Highlight root causes

**Root Cause Candidates Table:**
| Cause | Category | Type | Likelihood | Verification | Result |
|-------|----------|------|------------|--------------|--------|
| Tool worn | Machine | Occurrence | High | Tested | ✓ Root Cause |
| Training gap | Man | Occurrence | Low | Verified | Refuted |

[+ Add Candidate]

**Verification Tests:**
| Test | Hypothesis | Method | Result | Conclusion |
|------|------------|--------|--------|------------|
| VT-001 | Worn insert causes issue | Replace & measure | 48/50 in spec | Confirmed |

[+ Add Test]

**Root Cause Summary:**
- Occurrence root cause (read from verified candidates)
- Evidence
- Escape root cause
- Evidence
- Escape point
- Confidence level

**Completion:**
[Complete D4] [Verify D4]

---

## Shared Components

### 8D Progress Timeline
Horizontal timeline showing D0-D8 with:
- Completed (filled circle, green)
- Current (half-filled circle, blue)
- Pending (empty circle, gray)
- Click to navigate to that discipline

### Priority Badge
Color-coded badge component.

### Status Badge
Badge showing current discipline + status.

### Discipline Completion Card
Shows completion status, completed by, verified by for each discipline.

---

## Routes to Register (App.tsx)

```typescript
<Route path="/capa/dashboard" component={CapaDashboard} />
<Route path="/capa" component={CapaList} />
<Route path="/capa/new" component={CapaCreate} />
<Route path="/capa/:id" component={CapaDetail} />
```

---

## Validation Checklist

- [ ] Dashboard loads metrics correctly
- [ ] List filtering works
- [ ] Create form validates and submits
- [ ] Team management works
- [ ] D0-D4 forms save data
- [ ] Is/Is Not editor works
- [ ] 5-Why builder works
- [ ] Fishbone diagram interactive
- [ ] Progress timeline clickable
- [ ] Completion buttons validate requirements
- [ ] No TypeScript errors
