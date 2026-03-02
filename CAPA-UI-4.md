# CAPA-UI-4: Problem-Solving Analysis Tools

**Read RALPH_PATTERNS.md first. CAPA-UI-1, CAPA-UI-2, and CAPA-API-3 must be complete.**

---

## Mission

Build interactive UI components for the problem-solving tools:
- Is/Is Not interactive builder
- 5-Why chain builder
- 3-Legged 5-Why (Ford methodology)
- Interactive Fishbone diagram
- Fault Tree builder with calculations
- Comparative Analysis table
- Change Point timeline
- Pareto chart builder
- Tool selector wizard

---

## Components to Create

### 1. Analysis Tools Panel (`AnalysisToolsPanel.tsx`)

Shows all analysis tools for a CAPA, used in D2 and D4 tabs.

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Analysis Tools                                          [+ New Tool ▼]│
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐
│  │ 📊 Is/Is Not Analysis                              ✓ Complete       │
│  │ Initial problem definition                                          │
│  │ Conclusion: Tool insert A-4421 causing dimension drift              │
│  │                                                    [Open] [Export]  │
│  └─────────────────────────────────────────────────────────────────────┘
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐
│  │ 🔗 3-Legged 5-Why                                  ✓ Verified       │
│  │ Ford methodology analysis                                           │
│  │ Root causes: Occurrence + Detection + Systemic identified          │
│  │                                                    [Open] [Export]  │
│  └─────────────────────────────────────────────────────────────────────┘
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐
│  │ 🐟 Fishbone Diagram                               ○ In Progress     │
│  │ 6M Analysis                                                         │
│  │ 4 causes verified, 2 ruled out                                      │
│  │                                                    [Open] [Export]  │
│  └─────────────────────────────────────────────────────────────────────┘
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**New Tool Dropdown:**
- Is/Is Not Analysis
- 5-Why Chain
- 3-Legged 5-Why
- Fishbone (5M/6M/8M)
- Fault Tree Analysis
- Comparative Analysis
- Change Point Analysis
- Pareto Chart

---

### 2. Is/Is Not Builder (`IsIsNotBuilder.tsx`)

Interactive 4-dimension builder with evidence attachment.

```
┌─────────────────────────────────────────────────────────────────────────┐
│  IS / IS NOT ANALYSIS                    [Save] [Complete] [Export PDF]│
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─ WHAT ───────────────────────────────────────────────────────────── │
│  │                                                                     │
│  │  Object (What is affected?)                                         │
│  │  ┌───────────────────┬───────────────────┬─────────────────────────┐│
│  │  │ IS                │ IS NOT            │ DISTINCTION             ││
│  │  ├───────────────────┼───────────────────┼─────────────────────────┤│
│  │  │ Part 3004-XYZ     │ Part 3004-ABC     │ Different tool insert   ││
│  │  │ 📎 CMM report     │ Part 3004-DEF     │                         ││
│  │  │ [+ Add]           │ [+ Add]           │                         ││
│  │  └───────────────────┴───────────────────┴─────────────────────────┘│
│  │  Overall distinction: [Only this part uses insert A-4421          ]│
│  │                                                                     │
│  │  Defect (What is wrong?)                                           │
│  │  ┌───────────────────┬───────────────────┬─────────────────────────┐│
│  │  │ IS                │ IS NOT            │ DISTINCTION             ││
│  │  ├───────────────────┼───────────────────┼─────────────────────────┤│
│  │  │ Dim 3.72mm OOS    │ Other dimensions  │ Feature #3 only         ││
│  │  │ [+ Add]           │ [+ Add]           │                         ││
│  │  └───────────────────┴───────────────────┴─────────────────────────┘│
│  └─────────────────────────────────────────────────────────────────────│
│                                                                         │
│  ┌─ WHERE ──────────────────────────────────────────────────────────── │
│  │  [Similar structure for Geographic and On Object]                  │
│  └─────────────────────────────────────────────────────────────────────│
│                                                                         │
│  ┌─ WHEN ───────────────────────────────────────────────────────────── │
│  │  First Observed: [2024-02-10        ]                              │
│  │  [Similar structure for Timeline and Pattern]                      │
│  └─────────────────────────────────────────────────────────────────────│
│                                                                         │
│  ┌─ HOW MANY ───────────────────────────────────────────────────────── │
│  │  [Similar structure for Units and Trend]                           │
│  └─────────────────────────────────────────────────────────────────────│
│                                                                         │
│  ┌─ THEREFORE ──────────────────────────────────────────────────────── │
│  │                                                                     │
│  │  Based on the analysis above, the most likely cause is:            │
│  │  ┌─────────────────────────────────────────────────────────────────┐│
│  │  │ Tool insert A-4421 installed on 1/30 is causing dimension      ││
│  │  │ drift on feature #3 due to accelerated wear.                   ││
│  │  └─────────────────────────────────────────────────────────────────┘│
│  │                                                                     │
│  │  [✓] Verified by: John Smith on Feb 14, 2024                       │
│  │                                                    [Verify]         │
│  └─────────────────────────────────────────────────────────────────────│
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Features:**
- Add/remove observations with inline editing
- Attach evidence to any observation (file or link)
- Auto-suggest distinctions based on IS vs IS NOT
- Collapsible sections
- Real-time save
- Export to PDF in standard format

---

### 3. Five-Why Builder (`FiveWhyBuilder.tsx`)

Interactive chain builder with verification.

```
┌─────────────────────────────────────────────────────────────────────────┐
│  5-WHY ANALYSIS                          [Save] [Complete] [Export PDF]│
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Type: [● Occurrence  ○ Escape]          Name: [5-Why Chain #1       ] │
│                                                                         │
│  Starting Point:                                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐
│  │ Critical dimension 3.72mm vs 3.50mm ±0.20mm target                 │
│  └─────────────────────────────────────────────────────────────────────┘
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐
│  │ WHY 1: Why is the dimension out of specification?                  │
│  │ ┌───────────────────────────────────────────────────────────────── │
│  │ │ Tool insert is worn beyond tolerance                             │
│  │ └───────────────────────────────────────────────────────────────── │
│  │ Evidence: [Insert measurement: 0.15mm wear     ] [📎 Attach]       │
│  └───────────────────────────────────────────────────────────────────┬─┘
│                                      ↓                                │
│  ┌─────────────────────────────────────────────────────────────────────┐
│  │ WHY 2: Why is the tool insert worn?                                │
│  │ ┌───────────────────────────────────────────────────────────────── │
│  │ │ Insert exceeded recommended tool life (10,000 shots)             │
│  │ └───────────────────────────────────────────────────────────────── │
│  │ Evidence: [Shot counter: 8,920 shots            ]                  │
│  └───────────────────────────────────────────────────────────────────┬─┘
│                                      ↓                                │
│  ┌─────────────────────────────────────────────────────────────────────┐
│  │ WHY 3: Why did the insert exceed tool life?                        │
│  │ ┌───────────────────────────────────────────────────────────────── │
│  │ │ Tool change schedule was not followed                            │
│  │ └───────────────────────────────────────────────────────────────── │
│  │ Evidence: [Maintenance log shows missed change  ]                  │
│  └───────────────────────────────────────────────────────────────────┬─┘
│                                      ↓                                │
│  ┌─────────────────────────────────────────────────────────────────────┐
│  │ WHY 4: Why wasn't the schedule followed?                           │
│  │ ┌───────────────────────────────────────────────────────────────── │
│  │ │ Manual tracking only, no automated alerts                        │
│  │ └───────────────────────────────────────────────────────────────── │
│  └───────────────────────────────────────────────────────────────────┬─┘
│                                      ↓                                │
│  ┌─────────────────────────────────────────────────────────────────────┐
│  │ WHY 5: Why no automated alerts?                                    │
│  │ ┌───────────────────────────────────────────────────────────────── │
│  │ │ No tool life monitoring system on this press                     │
│  │ └───────────────────────────────────────────────────────────────── │
│  └─────────────────────────────────────────────────────────────────────┘
│                                      ↓                                 │
│  [+ Add Why]                                                           │
│                                                                         │
│  ┌─ ROOT CAUSE ─────────────────────────────────────────────────────── │
│  │                                                                     │
│  │ ┌─────────────────────────────────────────────────────────────────┐│
│  │ │ No automated tool life monitoring system on Press #3            ││
│  │ └─────────────────────────────────────────────────────────────────┘│
│  │                                                                     │
│  │ Category: [Machine ▼]                                               │
│  │                                                                     │
│  │ Verification:                                                       │
│  │ ┌─────────────────────────────────────────────────────────────────┐│
│  │ │ Replaced insert, monitored 500 parts - all in spec              ││
│  │ └─────────────────────────────────────────────────────────────────┘│
│  │                                                                     │
│  │ [✓] Verified by: John Smith on Feb 14, 2024          [Verify]      │
│  │                                                                     │
│  │ Linked Corrective Action: [Install tool life counter         ▼]   │
│  └─────────────────────────────────────────────────────────────────────│
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Features:**
- Add/remove Why levels (typically 5, but flexible)
- Attach evidence at each level
- Auto-generate question from previous answer
- Category dropdown for root cause
- Verification workflow
- Link to corrective actions

---

### 4. Three-Legged 5-Why (`ThreeLegFiveWhy.tsx`)

Ford methodology with three parallel analyses.

```
┌─────────────────────────────────────────────────────────────────────────┐
│  3-LEGGED 5-WHY (Ford Methodology)       [Save] [Complete] [Export PDF]│
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Starting Point:                                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐
│  │ Critical dimension 3.72mm vs 3.50mm ±0.20mm target                 │
│  └─────────────────────────────────────────────────────────────────────┘
│                                                                         │
│  ┌───────────────────┬───────────────────┬─────────────────────────────┐
│  │ LEG 1: OCCURRENCE │ LEG 2: DETECTION  │ LEG 3: SYSTEMIC             │
│  │ Why did it happen?│ Why not detected? │ Why did system allow?       │
│  ├───────────────────┼───────────────────┼─────────────────────────────┤
│  │                   │                   │                             │
│  │ W1: Tool worn     │ W1: SPC no alarm  │ W1: Not in PFMEA           │
│  │       ↓           │       ↓           │       ↓                     │
│  │ W2: Life exceeded │ W2: Limits wide   │ W2: PFMEA not updated      │
│  │       ↓           │       ↓           │       ↓                     │
│  │ W3: No counter    │ W3: Old MSA       │ W3: No feedback loop       │
│  │       ↓           │       ↓           │       ↓                     │
│  │ W4: Manual only   │ W4: No schedule   │ W4: CAPA doesn't require   │
│  │       ↓           │       ↓           │       ↓                     │
│  │ W5: Legacy equip  │ W5: Procedure gap │ W5: Procedure gap          │
│  │                   │                   │                             │
│  ├───────────────────┼───────────────────┼─────────────────────────────┤
│  │ ROOT CAUSE:       │ ROOT CAUSE:       │ ROOT CAUSE:                 │
│  │ No automated tool │ SPC review not in │ CAPA doesn't require       │
│  │ life monitoring   │ control plan      │ PFMEA update evidence      │
│  │                   │                   │                             │
│  │ [✓ Verified]      │ [✓ Verified]      │ [○ Verify]                  │
│  ├───────────────────┼───────────────────┼─────────────────────────────┤
│  │ ACTION:           │ ACTION:           │ ACTION:                     │
│  │ Install counter   │ Add annual review │ Revise CAPA procedure      │
│  │ [Link to D5 ▼]    │ [Link to D5 ▼]    │ [Link to D7 ▼]             │
│  └───────────────────┴───────────────────┴─────────────────────────────┘
│                                                                         │
│  Summary:                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐
│  │ Three root causes identified: equipment (occurrence), procedure    │
│  │ (detection), system (systemic). All require corrective action.     │
│  └─────────────────────────────────────────────────────────────────────┘
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Features:**
- Three parallel columns
- Each leg independently editable
- Independent verification per leg
- Link each leg to different corrective actions
- Visual progress (all legs verified = complete)

---

### 5. Interactive Fishbone (`FishboneDiagram.tsx`)

Click-to-add visual Ishikawa diagram.

```
┌─────────────────────────────────────────────────────────────────────────┐
│  FISHBONE DIAGRAM                   [5M ▼] [Save] [Complete] [Export]  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│                        MAN                    MACHINE                   │
│                          │                       │                      │
│            Not trained ──┤         Tool worn ────┤                      │
│            on tool life  │             ★        │                      │
│                   ○      │                       │                      │
│                          │    No counter ────────┤                      │
│            No backup ────┤         ★            │                      │
│            operator      │                       │                      │
│                   ●      │                       │                      │
│                          │                       │                      │
│  ════════════════════════╪═══════════════════════╪══════════════════▶  │
│                          │                       │                      │
│                          │               EFFECT: │                      │
│                          │        Dimension OOS  │                      │
│                          │                       │                      │
│  ════════════════════════╪═══════════════════════╪══════════════════    │
│                          │                       │                      │
│            Resin lot ────┤     SPC limits ───────┤                      │
│            variation     │     too wide          │                      │
│                   ○      │         ★            │                      │
│                          │                       │                      │
│            Moisture ─────┤     No periodic ──────┤                      │
│            content       │     MSA review        │                      │
│                   ○      │         ●            │                      │
│                          │                       │                      │
│                      MATERIAL               MEASUREMENT                 │
│                                                                         │
│  ────────────────────────────────┬──────────────────────────────────── │
│                                  │                                      │
│                Procedure gap ────┤                                      │
│                      ★          │                                      │
│                                  │                                      │
│                               METHOD                                    │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│  ★ Verified Root Cause (3)   ● Suspected (2)   ○ Ruled Out (3)         │
│                                                                         │
│  Click any cause to: [Verify] [Rule Out] [Add Sub-cause] [Link 5-Why]  │
│  Click category label to add new cause                                  │
└─────────────────────────────────────────────────────────────────────────┘
```

**Features:**
- Click category to add cause
- Click cause to open action menu
- Drag to reposition (optional)
- Status icons (★ verified, ● suspected, ○ ruled out)
- Nested sub-causes (branches)
- Link any cause to a 5-Why for deeper dive
- Export as SVG/PNG/PDF
- 5M/6M/8M selector changes visible categories

---

### 6. Fault Tree Builder (`FaultTreeBuilder.tsx`)

Visual tree with AND/OR gates and probability.

```
┌─────────────────────────────────────────────────────────────────────────┐
│  FAULT TREE ANALYSIS                 [Save] [Calculate] [Complete]     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│                        ┌─────────────────┐                              │
│                        │   TOP EVENT     │                              │
│                        │ Dimension OOS   │                              │
│                        │   P = 0.0214    │                              │
│                        └────────┬────────┘                              │
│                                 │                                       │
│                            ┌────┴────┐                                 │
│                            │   OR    │                                 │
│                            └────┬────┘                                 │
│                    ┌────────────┴────────────┐                         │
│                    │                         │                          │
│         ┌──────────┴──────────┐   ┌─────────┴──────────┐               │
│         │ Process Variation   │   │ Measurement Error  │               │
│         │     P = 0.012       │   │     P = 0.003      │               │
│         └──────────┬──────────┘   └─────────┬──────────┘               │
│                    │                         │                          │
│               ┌────┴────┐              ┌────┴────┐                     │
│               │   AND   │              │   OR    │                     │
│               └────┬────┘              └────┬────┘                     │
│         ┌──────────┼──────────┐             │                          │
│         │          │          │        ┌────┴────┐                     │
│    ┌────┴───┐ ┌────┴───┐ ┌────┴───┐   │         │                     │
│    │ Tool   │ │ No     │ │ Detect │   │ CMM     │ │ Gage   │          │
│    │ Wear   │ │ Counter│ │ Fail   │   │ OOC     │ │ R&R    │          │
│    │ ★ 0.08│ │ ★ 0.95│ │ ● 0.15│   │ ○ 0.01 │ │ ○ 0.02│          │
│    └────────┘ └────────┘ └────────┘   └─────────┘ └────────┘          │
│                                                                         │
│  ★ = Root Cause    ● = Contributing    ○ = Not Applicable             │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│  MINIMAL CUT SETS:                                                      │
│  1. Tool Wear ∧ No Counter ∧ Detect Fail     P = 0.0114               │
│  2. CMM Out of Calibration                    P = 0.0100               │
│  3. Gage R&R Failure                          P = 0.0200               │
│                                                                         │
│  CRITICAL PATH: Tool Wear → No Counter (highest contribution)         │
│                                                                         │
│  [+ Add Gate]  [+ Add Event]  Click node to edit                       │
└─────────────────────────────────────────────────────────────────────────┘
```

**Features:**
- Drag-and-drop tree building
- AND/OR/NOT gate selection
- Probability input for basic events
- Auto-calculate top event probability
- Minimal cut set calculation
- Visual highlighting of critical path
- Export as SVG/PDF

---

### 7. Comparative Analysis Table (`ComparativeAnalysis.tsx`)

Side-by-side good vs bad comparison.

```
┌─────────────────────────────────────────────────────────────────────────┐
│  COMPARATIVE ANALYSIS                    [Save] [Complete] [Export PDF]│
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Good Items: [+ Add]              Bad Items: [+ Add]                   │
│  • SN-0542 (Jan 28)               • SN-0523 (Feb 3)                    │
│                                                                         │
│  ┌────────────────┬───────────────┬───────────────┬─────────┬──────────┐
│  │ FACTOR         │ GOOD          │ BAD           │ DIFF?   │ SIGNIF.  │
│  ├────────────────┼───────────────┼───────────────┼─────────┼──────────┤
│  │ Production Date│ Jan 28, 2024  │ Feb 3, 2024   │   ★     │ After    │
│  │                │               │               │         │ change   │
│  ├────────────────┼───────────────┼───────────────┼─────────┼──────────┤
│  │ Shift          │ 1st           │ 2nd           │         │          │
│  ├────────────────┼───────────────┼───────────────┼─────────┼──────────┤
│  │ Operator       │ J. Smith      │ M. Johnson    │         │          │
│  ├────────────────┼───────────────┼───────────────┼─────────┼──────────┤
│  │ Machine        │ Press #3      │ Press #3      │         │          │
│  ├────────────────┼───────────────┼───────────────┼─────────┼──────────┤
│  │ Tool Insert    │ A-4420        │ A-4421        │   ★     │ DIFFER-  │
│  │                │               │               │         │ ENT!     │
│  ├────────────────┼───────────────┼───────────────┼─────────┼──────────┤
│  │ Tool Life      │ 2,450         │ 8,920         │   ★     │ High     │
│  │                │               │               │         │ wear     │
│  ├────────────────┼───────────────┼───────────────┼─────────┼──────────┤
│  │ Material Lot   │ L-2024-0128   │ L-2024-0128   │         │          │
│  ├────────────────┼───────────────┼───────────────┼─────────┼──────────┤
│  │ Dim 3.5mm      │ 3.48 mm       │ 3.72 mm       │   ★     │ OOS      │
│  └────────────────┴───────────────┴───────────────┴─────────┴──────────┘
│                                                                         │
│  [+ Add Factor]                             ★ = Significant Difference │
│                                                                         │
│  ┌─ HYPOTHESIS ────────────────────────────────────────────────────────┐
│  │                                                                     │
│  │ Insert A-4421 (installed 1/30) wears faster than A-4420, or was    │
│  │ defective. Tool life count 8,920 vs 2,450 indicates wear pattern.  │
│  │                                                                     │
│  │ Verification: [Replaced insert, measured 50 parts - all in spec   ]│
│  │                                                                     │
│  │ [✓] Verified                                               [Verify]│
│  └─────────────────────────────────────────────────────────────────────┘
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Features:**
- Add multiple good/bad items
- Add comparison factors
- Auto-detect differences (string comparison)
- Manual significance notes
- Hypothesis with verification

---

### 8. Change Point Timeline (`ChangePointTimeline.tsx`)

Visual timeline of 5M changes before problem.

```
┌─────────────────────────────────────────────────────────────────────────┐
│  CHANGE POINT ANALYSIS                   [Save] [Complete] [Export PDF]│
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Problem First Observed: [2024-02-10    ]                              │
│  Analysis Window: [2024-01-01] to [2024-02-10]                         │
│                                                                         │
│  TIMELINE:                                                              │
│  ──────────────────────────────────────────────────────────────────────│
│  Jan 1        Jan 15       Jan 30       Feb 10                         │
│  │            │            │            │                              │
│  │            │            │            ▼ PROBLEM STARTS               │
│  │            │            │            ════════════════               │
│  │            │            │                                           │
│  │            │            ▼ Tool insert changed (A-4421)    ★        │
│  │            │            ──────────────────────────────              │
│  │            │                                                        │
│  │            ▼ New operator started                     ○            │
│  │            ───────────────────────────                              │
│  │                                                                     │
│  ▼ New resin supplier qualified                         ○            │
│  ───────────────────────────────                                       │
│  ──────────────────────────────────────────────────────────────────────│
│                                                                         │
│  CHANGES BY 5M:                                         [+ Add Change] │
│                                                                         │
│  MAN:                                                                  │
│  ○ Jan 15: New operator M. Johnson started on Press #3                │
│    Ruled out: Issue on all shifts                      [Rule Out]     │
│                                                                         │
│  MACHINE:                                                              │
│  ★ Jan 30: Tool insert changed from A-4420 to A-4421   [★ Likely]    │
│  ○ Jan 22: PM performed (scheduled)                                    │
│    Ruled out: Standard PM, no tooling changes          [Rule Out]     │
│                                                                         │
│  MATERIAL:                                                             │
│  ○ Jan 1: New resin supplier ABC Polymers qualified                   │
│    Ruled out: Same lot before and after problem        [Rule Out]     │
│                                                                         │
│  ★ = Likely Change Point    ○ = Ruled Out                             │
│                                                                         │
│  ┌─ HYPOTHESIS ────────────────────────────────────────────────────────┐
│  │                                                                     │
│  │ Tool insert A-4421 installed on Jan 30 is the change point.        │
│  │ Problem started ~11 days later (accelerated wear pattern).         │
│  └─────────────────────────────────────────────────────────────────────┘
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Features:**
- Visual timeline
- Add changes by category (5M)
- Mark as likely cause or rule out
- Auto-correlate with problem date
- Hypothesis builder

---

### 9. Pareto Chart Builder (`ParetoChart.tsx`)

Interactive Pareto with drill-down.

```
┌─────────────────────────────────────────────────────────────────────────┐
│  PARETO ANALYSIS                         [Save] [Complete] [Export PDF]│
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Data Source: [Defect Log - Feb 2024 ▼]   Analysis: [Defect Type ▼]   │
│                                                                         │
│  Count                                              Cumulative %        │
│  25 ┤████████████████████████████                          ─── 100%    │
│     │                                                      │            │
│  20 ┤███████████████████████                    ───────────┤   80%     │
│     │                         █████████████████            │            │
│  15 ┤                                          ────────────┤   60%     │
│     │                                     █████            │            │
│  10 ┤                                          ────────────┤   40%     │
│     │                                          ████        │            │
│   5 ┤                                               ███    ┤   20%     │
│     │                                                  ██  │            │
│   0 ┼─────────────────────────────────────────────────────┼   0%      │
│       Dim OOS   Cosmetic    Flash     Short    Other                   │
│         23         12         6         4        2                      │
│       (49%)      (25%)     (13%)      (9%)     (4%)                    │
│                                                                         │
│  Click bar to drill down                                               │
│                                                                         │
│  ┌─ FOCUS AREA ────────────────────────────────────────────────────────┐
│  │                                                                     │
│  │ Dimension OOS (49%) + Cosmetic (25%) = 74% of issues               │
│  │                                                                     │
│  │ VITAL FEW: Dimension OOS, Cosmetic                                  │
│  │ TRIVIAL MANY: Flash, Short shot, Other                              │
│  │                                                                     │
│  │ Recommendation: Focus corrective actions on dimensional issues     │
│  └─────────────────────────────────────────────────────────────────────┘
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Features:**
- Import data from defect logs
- Multiple analysis types (defect, cause, location)
- Auto-calculate percentages
- Cumulative line overlay
- Click to drill down
- Auto-identify vital few (80/20)

---

### 10. Tool Selector Wizard (`ToolSelectorWizard.tsx`)

Guides user to right tool based on situation.

```
┌─────────────────────────────────────────────────────────────────────────┐
│  SELECT ANALYSIS TOOL                                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  What are you trying to do?                                            │
│                                                                         │
│  ○ Define the problem clearly            → Is/Is Not Analysis          │
│  ○ Find the root cause                   → 5-Why or Fishbone          │
│  ○ Full Ford 8D analysis                 → 3-Legged 5-Why             │
│  ○ Analyze a safety/complex failure      → Fault Tree Analysis        │
│  ○ Compare good vs bad samples           → Comparative Analysis       │
│  ○ Find what changed                     → Change Point Analysis      │
│  ○ Prioritize issues                     → Pareto Chart               │
│                                                                         │
│  ──────────────────────────────────────────────────────────────────────│
│                                                                         │
│  Based on your CAPA:                                                   │
│  • Priority: HIGH                                                      │
│  • Source: Customer Complaint                                          │
│  • Methodology: 8D                                                     │
│                                                                         │
│  RECOMMENDED SEQUENCE:                                                  │
│  1. Is/Is Not Analysis (D2) ────────────────────────── [Start →]      │
│  2. Change Point Analysis (D2)                                         │
│  3. 3-Legged 5-Why (D4)                                                │
│  4. Fishbone for visualization (D4)                                    │
│                                                                         │
│                                                         [Skip Wizard]  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Routes / Integration

These components integrate into existing CAPA detail page tabs:

- **D2 Tab**: Shows Is/Is Not, Comparative, Change Point, Pareto
- **D4 Tab**: Shows 5-Why, 3L5Y, Fishbone, Fault Tree

Add to sidebar:
```
Analysis Tools (8)
├─ Is/Is Not ✓
├─ 3-Legged 5-Why ✓  
├─ Fishbone ○
└─ + Add Tool
```

---

## Validation Checklist

- [ ] All tools save data correctly
- [ ] Is/Is Not 4 dimensions work
- [ ] 5-Why chains add/remove levels
- [ ] 3L5Y three columns independent
- [ ] Fishbone click-to-add works
- [ ] Fishbone SVG export works
- [ ] Fault tree probability calculates
- [ ] Comparative auto-detects differences
- [ ] Change point timeline renders
- [ ] Pareto calculates percentages
- [ ] Tool selector recommends correctly
- [ ] PDF export for all tools
- [ ] No TypeScript errors
