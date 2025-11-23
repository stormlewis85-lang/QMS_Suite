# PFMEA Suite Design Guidelines

## Design Approach

**System-Based Approach**: Enterprise productivity application inspired by Linear, Notion, and modern data management tools. Focus on information hierarchy, data density, and workflow efficiency for quality engineers and process owners.

**Core Principle**: Clean, professional interface that prioritizes data clarity, quick scanning, and efficient workflows over visual flair.

---

## Typography System

**Font Family**:
- Primary: Inter or System UI stack (`-apple-system, BlinkMacSystemFont, "Segoe UI"`)
- Monospace: `"JetBrains Mono", "Consolas"` for part numbers, IDs, ratings

**Hierarchy**:
- Page Headers: 2xl font (24px), font-semibold
- Section Headers: xl font (20px), font-semibold
- Card/Panel Headers: lg font (18px), font-medium
- Body Text: base font (16px), font-normal
- Labels/Metadata: sm font (14px), font-medium
- Table Headers: sm font (14px), font-semibold, uppercase tracking-wide
- Table Data: sm font (14px), font-normal
- Captions/Help Text: xs font (12px), font-normal

---

## Layout System

**Spacing Primitives**: Use Tailwind units of **2, 3, 4, 6, 8, 12, 16**
- Tight spacing: `gap-2, p-3` for compact data
- Standard spacing: `gap-4, p-4` for cards and sections  
- Generous spacing: `gap-6, p-6, p-8` for major sections
- Section breaks: `mb-12, mb-16` between major content areas

**Grid System**:
- Application Shell: Fixed sidebar (256px) + main content area
- Content Max Width: `max-w-7xl` for full-width data tables, `max-w-4xl` for forms
- Card Grids: `grid-cols-1 md:grid-cols-2 xl:grid-cols-3` for dashboard cards
- Multi-column Forms: `grid-cols-1 lg:grid-cols-2` for side-by-side inputs

---

## Component Library

### Navigation
**Sidebar Navigation** (Left, Fixed):
- Width: w-64, full-height sidebar
- Logo/Brand at top (h-16)
- Navigation items: px-3 py-2, rounded-md, text-sm font-medium
- Active state: distinct treatment with indicator
- Collapsible sections for: Parts, Processes, PFMEA, Control Plans, Library, Settings

**Top Bar** (Contextual):
- Page title + breadcrumbs on left
- Actions (New Part, Generate PFMEA) on right
- Height: h-16, border-b

### Data Tables
**Enterprise Data Grid**:
- Sticky header row with sortable columns
- Row height: h-12 for scanning efficiency
- Alternating row treatment for readability
- Hover state on rows
- Checkbox column (w-12) for bulk actions
- Action column (w-24) on right with icon buttons
- Compact spacing: px-4 py-2 in cells
- Borders: border-b on rows, subtle vertical borders between columns

**Table Features**:
- Column headers: sticky top-0, font-semibold text-xs uppercase
- Pagination footer: Items per page selector + page navigation
- Empty state: Centered message with icon and CTA
- Loading state: Skeleton rows

### Forms & Inputs
**Form Layout**:
- Form sections separated by mb-8
- Section headers: mb-4
- Field groups: space-y-4
- Two-column layout where logical: `grid grid-cols-2 gap-4`

**Input Fields**:
- Standard height: h-10 for text inputs
- Border: border rounded-md
- Padding: px-3
- Label above input: text-sm font-medium mb-1
- Help text below: text-xs
- Error state: distinct border treatment + error message

**Special Inputs**:
- Rating dropdowns (S/O/D): Inline label + value display with dropdown
- Part number search: Autocomplete with dropdown suggestions
- Date pickers: Calendar icon + formatted display
- File upload: Drag-and-drop zone with file list

### Cards & Panels
**Dashboard Cards**:
- Padding: p-6
- Border: border rounded-lg
- Header: flex justify-between items-start mb-4
- Body: Data visualization or key metrics
- Footer: Actions or metadata

**Detail Panels**:
- Slide-out from right (w-96 or w-1/2)
- Header: p-6 with title + close button
- Body: p-6 with overflow-scroll
- Footer: p-6 border-t with action buttons

### Buttons & Actions
**Primary Actions**: 
- Height: h-10, px-4, rounded-md
- Font: text-sm font-medium
- Icon + text or text only

**Secondary Actions**:
- Height: h-10, px-4, rounded-md, border
- Font: text-sm font-medium

**Icon Buttons** (Table actions):
- Size: w-8 h-8, rounded
- Icons: 16px or 20px

**Button Groups**: 
- Space-x-2 for horizontal groups
- Border between in segmented controls

### Data Display
**Status Badges**:
- Pill shape: px-2.5 py-0.5 rounded-full
- Text: text-xs font-medium
- For: Draft, Review, Effective, Obsolete statuses
- For: High/Medium/Low AP ratings

**Metric Display**:
- Large number: text-3xl font-bold
- Label below: text-sm
- Trend indicator if applicable
- Used in dashboard cards

**Process Flow Diagram**:
- Full-width canvas area
- Node-based visualization
- Zoom controls
- Mini-map for navigation

### Modals & Dialogs
**Modal Structure**:
- Overlay with centered dialog
- Max width: max-w-2xl for forms, max-w-4xl for tables
- Padding: p-6
- Header: pb-4 border-b with title + close
- Body: py-6 with form or content
- Footer: pt-4 border-t with Cancel + Confirm buttons

**Confirmation Dialogs**:
- Smaller: max-w-md
- Icon + message + actions

### Wizards & Multi-Step
**PFMEA Generator Wizard**:
- Step indicator at top: numbered steps with lines
- Content area: py-8 px-6
- Navigation: Back + Next/Generate buttons at bottom
- Progress saved indicator

---

## Application-Specific Patterns

### FMEA Table View
- Wide data grid with horizontal scroll
- Columns: Process Step | Function | Requirement | Failure Mode | Effect | S | O | D | AP | Controls
- Rating columns (S/O/D): Fixed width w-12, centered, bold
- AP column: Color-coded badge based on value
- Special flags: Icon indicators (⚠️ for special characteristics)
- Expandable rows for detailed controls

### Control Plan Grid
- Similar grid structure to FMEA
- Columns: Characteristic | Type | Spec | Tolerance | Method | Sample Size | Frequency | Reaction Plan
- Inline editing for certain fields
- Visual indicators for special characteristics

### Process Library View
- List view with process cards
- Each card: Process name, rev, status, effective date
- Quick actions: View, Edit, Create New Rev
- Filter by status (Draft, Effective, Obsolete)

### Part Details Page
- Header section: Part info grid (Customer, Program, Part #, Plant)
- Tabs: Overview | PFD | PFMEA | Control Plan | History
- Quick stats cards above content
- Action buttons: Generate PFD, Generate PFMEA, Export

---

## Responsive Behavior

**Desktop First** (1280px+): Full sidebar, multi-column forms, wide tables
**Tablet** (768px-1279px): Collapsible sidebar, single-column forms, horizontal scroll tables
**Mobile** (< 768px): Hidden sidebar with menu button, stacked layout, card-based table view

---

## Animations

**Minimal & Purposeful**:
- Sidebar collapse/expand: 200ms ease
- Modal enter/exit: 150ms fade + slide
- Dropdown menus: 100ms fade
- Row hover: Instant (no transition)
- Page transitions: None (instant)

**NO animations** for: Data updates, table sorting, form validation feedback