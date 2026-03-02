# CAPA-UI-3: Analytics, Reports & Charts

**Read RALPH_PATTERNS.md first. CAPA-UI-1 and CAPA-UI-2 must be complete.**

---

## Mission

Build UI components for:
- CAPA Analytics dashboard with interactive charts
- Pareto analysis
- Trend analysis
- Team performance metrics
- Report generation and export
- Metric snapshots comparison

---

## Pages to Create

### 1. CAPA Analytics (`/capa/analytics`)

**Layout:**
```
┌─────────────────────────────────────────────────────────────────────┐
│  CAPA Analytics                              [Date Range ▼] [Export]│
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┬─────────────┬─────────────┬─────────────┬────────┐│
│  │ Total CAPAs │ Open        │ Closed      │ On-Time %   │ Eff. % ││
│  │     168     │     12      │     156     │    82%      │  94%   ││
│  │   ↑ 12%     │   ↓ 3       │   ↑ 15      │   ↑ 5%      │  ↑ 2%  ││
│  └─────────────┴─────────────┴─────────────┴─────────────┴────────┘│
│                                                                     │
│  ┌─────────────────────────────┬───────────────────────────────────┐│
│  │                             │                                   ││
│  │  Opened vs Closed Trend     │  Status Distribution              ││
│  │  [Line Chart]               │  [Pie Chart]                      ││
│  │                             │                                   ││
│  └─────────────────────────────┴───────────────────────────────────┘│
│                                                                     │
│  ┌─────────────────────────────┬───────────────────────────────────┐│
│  │                             │                                   ││
│  │  By Priority                │  By Source Type                   ││
│  │  [Bar Chart]                │  [Donut Chart]                    ││
│  │                             │                                   ││
│  └─────────────────────────────┴───────────────────────────────────┘│
│                                                                     │
│  ┌─────────────────────────────┬───────────────────────────────────┐│
│  │                             │                                   ││
│  │  Cycle Time Distribution    │  Aging Analysis                   ││
│  │  [Histogram]                │  [Stacked Bar]                    ││
│  │                             │                                   ││
│  └─────────────────────────────┴───────────────────────────────────┘│
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Metric Cards:**
- Total CAPAs (with trend vs previous period)
- Currently Open
- Closed This Period
- On-Time Closure Rate
- Effectiveness Rate
- Recurrence Rate

**Charts:**

1. **Opened vs Closed Trend (Line Chart)**
   - X-axis: Time (weeks/months)
   - Y-axis: Count
   - Two lines: Opened, Closed
   - Net accumulation area

2. **Status Distribution (Pie/Donut Chart)**
   - Segments for each status
   - Click to filter list

3. **By Priority (Bar Chart)**
   - Horizontal bars
   - Critical, High, Medium, Low
   - Color coded

4. **By Source Type (Donut Chart)**
   - Customer Complaint, Internal NCR, Audit, etc.

5. **Cycle Time Distribution (Histogram)**
   - Days to close
   - Target line overlay

6. **Aging Analysis (Stacked Bar)**
   - Age buckets: 0-7, 8-14, 15-30, 30+ days
   - By priority

**Filters:**
- Date range picker
- Priority
- Source type
- Category
- Plant location

---

### 2. Pareto Analysis (`/capa/analytics/pareto`)

**Layout:**
```
┌─────────────────────────────────────────────────────────────────────┐
│  Pareto Analysis                                     [Date Range ▼] │
├─────────────────────────────────────────────────────────────────────┤
│  Analysis Type: [Root Causes ▼]                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │                                                                 ││
│  │  [Pareto Chart - Bars + Cumulative Line]                       ││
│  │                                                                 ││
│  │  ████████████████████ Tool wear           35%  ─────── 35%     ││
│  │  ██████████████       Training gap        25%  ─────── 60%     ││
│  │  ████████            Process drift        15%  ─────── 75%     ││
│  │  ██████              Material var         12%  ─────── 87%     ││
│  │  ████                Documentation        8%   ─────── 95%     ││
│  │  ██                  Other               5%   ─────── 100%    ││
│  │                                                                 ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │  Top 20% Causes Account for 75% of Issues                       ││
│  │                                                                 ││
│  │  Focus Areas:                                                   ││
│  │  1. Tool wear - Implement preventive maintenance                ││
│  │  2. Training gap - Update certification program                 ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Analysis Types:**
- Root Causes (most common)
- Failure Modes
- Source Types
- Products/Parts
- Process Steps
- Plants/Locations

**Features:**
- Click bar to see related CAPAs
- Export to PDF/Excel
- Drill-down capability

---

### 3. Trend Analysis (`/capa/analytics/trends`)

**Layout:**
```
┌─────────────────────────────────────────────────────────────────────┐
│  Trend Analysis                                                     │
├─────────────────────────────────────────────────────────────────────┤
│  Metric: [Cycle Time ▼]  Period: [Monthly ▼]  Range: [12 months]   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │  [Line Chart with Trend Line and Control Limits]               ││
│  │                                                                 ││
│  │  45 ─ UCL ─────────────────────────────────────────────────     ││
│  │     │     ●                                                     ││
│  │  30 ─ ───●───●───●───●───●───●───●───●───●───●───●─── Target   ││
│  │     │  ●                           ●       ●                    ││
│  │  15 ─ LCL ─────────────────────────────────────────────────     ││
│  │     │                                                           ││
│  │   0 ─────────────────────────────────────────────────────────   ││
│  │     Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec             ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │  Trend Summary                                                  ││
│  │  • Average: 28 days                                             ││
│  │  • Trend: Improving (↓ 15% over 12 months)                     ││
│  │  • Best Month: October (22 days)                                ││
│  │  • Worst Month: March (38 days)                                 ││
│  │  • Within Control: Yes (no special causes detected)             ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Metrics Available:**
- Cycle Time (days to close)
- Open Count
- Closure Rate
- On-Time Rate
- Effectiveness Rate
- Recurrence Rate
- Cost of Quality
- By Priority breakdown

**Period Options:**
- Daily
- Weekly
- Monthly
- Quarterly

**Features:**
- Control limits (UCL/LCL)
- Target line
- Trend line (linear regression)
- Annotations for significant events
- Export data

---

### 4. Team Performance (`/capa/analytics/team`)

**Layout:**
```
┌─────────────────────────────────────────────────────────────────────┐
│  Team Performance                                    [Date Range ▼] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │  Leaderboard                                                    ││
│  │  ┌────┬──────────────┬───────┬───────┬─────────┬──────────────┐││
│  │  │Rank│ Team Member  │ Closed│ On-Time│ Avg Days│ Effectiveness│││
│  │  ├────┼──────────────┼───────┼───────┼─────────┼──────────────┤││
│  │  │ 🥇 │ Jane Smith   │  12   │  92%  │   22    │     100%     │││
│  │  │ 🥈 │ John Doe     │  10   │  90%  │   25    │      95%     │││
│  │  │ 🥉 │ Mike Johnson │   8   │  88%  │   28    │      90%     │││
│  │  │ 4  │ Sarah Lee    │   7   │  85%  │   30    │      88%     │││
│  │  └────┴──────────────┴───────┴───────┴─────────┴──────────────┘││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
│  ┌─────────────────────────────┬───────────────────────────────────┐│
│  │  CAPAs by Team Member       │  Workload Distribution            ││
│  │  [Bar Chart]                │  [Radar/Spider Chart]             ││
│  └─────────────────────────────┴───────────────────────────────────┘│
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │  Response Time Analysis                                         ││
│  │  [Box Plot by Team Member]                                      ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Metrics:**
- CAPAs closed
- On-time completion rate
- Average cycle time
- Effectiveness rate
- Current workload (open assignments)

**Charts:**
- Leaderboard table
- CAPAs by team member (bar)
- Workload distribution (radar)
- Response time box plots

---

### 5. Reports Page (`/capa/reports`)

**Layout:**
```
┌─────────────────────────────────────────────────────────────────────┐
│  CAPA Reports                                                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │  Generate Report                                                ││
│  │                                                                 ││
│  │  Report Type: [Monthly Summary ▼]                               ││
│  │                                                                 ││
│  │  Date Range: [Feb 1, 2024] to [Feb 29, 2024]                   ││
│  │                                                                 ││
│  │  Include:                                                       ││
│  │  ☑ Summary metrics                                              ││
│  │  ☑ Status breakdown                                             ││
│  │  ☑ Priority analysis                                            ││
│  │  ☑ Pareto chart                                                 ││
│  │  ☑ Trend analysis                                               ││
│  │  ☑ CAPA list                                                    ││
│  │  ☐ Detailed 8D reports                                          ││
│  │                                                                 ││
│  │  Format: [PDF ▼]                                                ││
│  │                                                                 ││
│  │  [Generate Report]                                              ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │  Recent Reports                                                 ││
│  │  ┌─────────────────┬────────────┬──────────┬───────────────────┐││
│  │  │ Report          │ Generated  │ By       │ Actions           │││
│  │  ├─────────────────┼────────────┼──────────┼───────────────────┤││
│  │  │ Feb 2024 Summary│ 3/1/2024   │ John     │ [⬇] [👁] [🗑]   │││
│  │  │ Jan 2024 Summary│ 2/1/2024   │ Jane     │ [⬇] [👁] [🗑]   │││
│  │  └─────────────────┴────────────┴──────────┴───────────────────┘││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │  Scheduled Reports                                              ││
│  │                                                    [+ Schedule] ││
│  │  ┌─────────────────┬───────────┬──────────┬───────────────────┐││
│  │  │ Report          │ Frequency │ Next Run │ Recipients        │││
│  │  ├─────────────────┼───────────┼──────────┼───────────────────┤││
│  │  │ Monthly Summary │ Monthly   │ 4/1/2024 │ QM Team (5)       │││
│  │  │ Weekly Status   │ Weekly    │ 3/4/2024 │ Leadership (3)    │││
│  │  └─────────────────┴───────────┴──────────┴───────────────────┘││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Report Types:**
- Monthly Summary
- Weekly Status
- Overdue Report
- Single CAPA 8D Report
- Batch 8D Reports
- Pareto Analysis
- Trend Report
- Team Performance

**Formats:**
- PDF
- Excel
- CSV
- Word

**Scheduled Reports:**
- Configure frequency (daily/weekly/monthly)
- Set recipients (email)
- Auto-generate and send

---

### 6. Export Page (`/capa/export`)

**Layout:**
```
┌─────────────────────────────────────────────────────────────────────┐
│  Export CAPA Data                                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Export Type: [All CAPAs ▼]                                        │
│                                                                     │
│  Filters:                                                           │
│  Status: [All ▼]  Priority: [All ▼]  Date: [Last 12 months ▼]     │
│                                                                     │
│  Columns to Include:                                                │
│  ☑ CAPA Number    ☑ Title         ☑ Priority      ☑ Status        │
│  ☑ Source Type    ☑ Customer      ☑ Part Numbers  ☑ Category      │
│  ☑ Date Opened    ☑ Target Date   ☑ Actual Close  ☑ Cycle Time    │
│  ☑ Root Cause     ☑ Owner         ☑ Champion      ☐ Full Details  │
│                                                                     │
│  Format: [Excel ▼]                                                  │
│                                                                     │
│  [Export]                                                           │
│                                                                     │
│  Preview: 156 records will be exported                              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

### 7. Metric Snapshots (`/capa/analytics/snapshots`)

**Compare snapshots over time:**

```
┌─────────────────────────────────────────────────────────────────────┐
│  Metric Snapshots                                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Compare: [Feb 2024 ▼] vs [Jan 2024 ▼]                             │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │  Comparison                                                     ││
│  │  ┌─────────────────┬───────────┬───────────┬───────────────────┐││
│  │  │ Metric          │ Feb 2024  │ Jan 2024  │ Change            │││
│  │  ├─────────────────┼───────────┼───────────┼───────────────────┤││
│  │  │ Total Open      │    12     │    15     │ ↓ 3 (20% better)  │││
│  │  │ Avg Cycle Time  │   28 days │   32 days │ ↓ 4 (12% better)  │││
│  │  │ On-Time Rate    │    82%    │    78%    │ ↑ 4% (improved)   │││
│  │  │ Effectiveness   │    94%    │    92%    │ ↑ 2% (improved)   │││
│  │  │ Cost of Quality │  $45,000  │  $52,000  │ ↓ $7,000 (13%)    │││
│  │  └─────────────────┴───────────┴───────────┴───────────────────┘││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │  [Visual comparison charts]                                     ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Chart Components

Use Recharts library for all charts:

### LineChart
```tsx
<LineChart data={trendData}>
  <XAxis dataKey="date" />
  <YAxis />
  <CartesianGrid strokeDasharray="3 3" />
  <Tooltip />
  <Legend />
  <Line type="monotone" dataKey="opened" stroke="#8884d8" />
  <Line type="monotone" dataKey="closed" stroke="#82ca9d" />
</LineChart>
```

### PieChart
```tsx
<PieChart>
  <Pie
    data={statusData}
    dataKey="value"
    nameKey="name"
    cx="50%"
    cy="50%"
    outerRadius={80}
    label
  >
    {statusData.map((entry, index) => (
      <Cell key={index} fill={COLORS[index % COLORS.length]} />
    ))}
  </Pie>
  <Tooltip />
  <Legend />
</PieChart>
```

### BarChart (Pareto)
```tsx
<ComposedChart data={paretoData}>
  <XAxis dataKey="cause" />
  <YAxis yAxisId="left" />
  <YAxis yAxisId="right" orientation="right" />
  <Bar yAxisId="left" dataKey="count" fill="#8884d8" />
  <Line yAxisId="right" dataKey="cumulative" stroke="#ff7300" />
</ComposedChart>
```

---

## Routes to Register

```typescript
<Route path="/capa/analytics" component={CapaAnalytics} />
<Route path="/capa/analytics/pareto" component={CapaPareto} />
<Route path="/capa/analytics/trends" component={CapaTrends} />
<Route path="/capa/analytics/team" component={CapaTeamPerformance} />
<Route path="/capa/analytics/snapshots" component={CapaSnapshots} />
<Route path="/capa/reports" component={CapaReports} />
<Route path="/capa/export" component={CapaExport} />
```

---

## Validation Checklist

- [ ] Dashboard loads all metrics
- [ ] Charts render correctly
- [ ] Date range filter works
- [ ] Pareto calculates correctly
- [ ] Trend analysis shows control limits
- [ ] Team performance ranks correctly
- [ ] Reports generate PDF
- [ ] Export creates valid files
- [ ] Snapshot comparison works
- [ ] No TypeScript errors
