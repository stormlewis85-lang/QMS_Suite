# Process PFMEA Suite

A comprehensive automotive quality management system for Process Failure Mode and Effects Analysis (PFMEA), compliant with IATF 16949 and AIAG-VDA 2019 standards.

## Overview

This application enables quality engineers and process owners to manage:
- **Process Library**: Reusable process definitions with FMEA templates
- **Parts Management**: Track automotive parts across programs and customers
- **PFMEA Analysis**: Risk assessment with automated AP calculation (S × (O + D + P))
- **Control Plans**: Quality control documentation linked to PFMEA
- **Change Management**: Workflow for process and document changes

## Architecture

**Tech Stack**:
- Frontend: React + TypeScript + Vite + Wouter + TanStack Query
- Backend: Express + Drizzle ORM + PostgreSQL (Neon)
- UI: shadcn/ui + Tailwind CSS + Radix UI

**Design System**:
- Professional enterprise design with blue palette (hue 210)
- Sidebar navigation for multi-page workflows
- Data-dense tables and forms for efficiency
- Inter font family for readability

## Project Structure

```
├── client/
│   └── src/
│       ├── components/       # Reusable UI components (shadcn/ui)
│       ├── pages/           # Application pages
│       └── App.tsx          # Root component with sidebar layout
├── server/
│   ├── db.ts               # Database connection
│   ├── storage.ts          # Data access layer
│   └── routes.ts           # API endpoints
├── shared/
│   └── schema.ts           # Database schema + Zod validators
└── scripts/
    └── seed.ts             # Sample data seeding
```

## Database Schema

### Core Tables
- `process_def`: Process definitions (name, rev, status, effective dates)
- `process_step`: Individual process steps with equipment details
- `fmea_template_row`: FMEA failure modes linked to process steps
- `control_template_row`: Control methods linked to FMEA rows
- `part`: Automotive parts (customer, program, part number)
- `pfmea`: Part-specific PFMEA documents
- `control_plan`: Quality control plans for parts

### Supporting Tables
- `rating_scale`: AIAG-VDA rating tables (Severity, Occurrence, Detection)
- `gage_library`: Measurement equipment catalog
- `calibration_link`: Equipment calibration tracking

## API Endpoints

**Parts:**
- `GET /api/parts` - List all parts
- `GET /api/parts/:id` - Get part by ID
- `POST /api/parts` - Create new part

**Processes:**
- `GET /api/processes` - List all process definitions
- `GET /api/processes/:id` - Get process with steps
- `POST /api/processes` - Create new process

**PFMEA:**
- `GET /api/pfmea?partId=<id>` - Get PFMEAs for a part
- `GET /api/pfmea/:id` - Get PFMEA with all failure mode rows
- `POST /api/pfmea/:id/rows` - Create new PFMEA row
- `PATCH /api/pfmea-rows/:id` - Update PFMEA row

**Control Plans:**
- `GET /api/control-plans?partId=<id>` - Get control plans for a part
- `GET /api/control-plans/:id` - Get control plan with all characteristic rows
- `POST /api/control-plans/:id/rows` - Create new control plan row
- `PATCH /api/control-plan-rows/:id` - Update control plan row

**Equipment Library:**
- `GET /api/equipment` - Get all equipment
- `GET /api/equipment/:id` - Get equipment with error-proofing controls and control methods
- `POST /api/equipment` - Create new equipment
- `PATCH /api/equipment/:id` - Update equipment
- `DELETE /api/equipment/:id` - Delete equipment
- `POST /api/equipment/:id/error-proofing` - Create error-proofing control
- `PATCH /api/equipment-error-proofing/:id` - Update error-proofing control
- `DELETE /api/equipment-error-proofing/:id` - Delete error-proofing control
- `POST /api/equipment/:id/control-methods` - Create control method
- `PATCH /api/equipment-control-methods/:id` - Update control method
- `DELETE /api/equipment-control-methods/:id` - Delete control method

## Development

### Setup
1. Database is auto-provisioned (PostgreSQL via Neon)
2. Run migrations: `npm run db:push`
3. Seed sample data: `tsx scripts/seed.ts`
4. Start dev server: `npm run dev`

### Sample Data
The seed script creates:
- 4 automotive parts (Ford F-150 Wheel, GM Brake Caliper, Tesla Engine Mount, Ford Suspension Arm)
- 6 process definitions (Injection Molding with full FMEA, Machining, Welding, Forming, Inspection, Paint)
- 1 PFMEA document for Wheel Assembly with 3 failure mode rows (AP scores: 45, 56, 30)
- 1 Control Plan for Wheel Assembly (Production) with 3 control characteristic rows
- AIAG-VDA 2019 rating scales
- Measurement equipment with calibration tracking
- 4 equipment items with comprehensive error-proofing and control methods:
  - Engel Injection Press 200T (4 error-proofing controls, 4 control methods)
  - Engel Injection Press 350T
  - Branson Ultrasonic Welder (3 error-proofing controls, 3 control methods)
  - Fanuc Robot M-20iA (3 error-proofing controls, 3 control methods)

## Standards Compliance

**AIAG-VDA 2019**: 
- 7-step FMEA methodology
- Structure → Function → Failure → Risk → Optimization → Results
- AP (Action Priority) = Severity × (Occurrence + Detection)

**IATF 16949**:
- Customer-specific requirements (CSR) tracking
- Special characteristics (Ⓢ ◆ ⓒ symbols)
- Control plan linkage to PFMEA
- Change management with approvals

## Recent Changes

**2025-11-24 (Equipment Library)**: Equipment Library feature implemented
- Added comprehensive Equipment Library feature for managing manufacturing equipment
- **Database schema extensions:**
  - equipment_library table: equipment records (name, type, manufacturer, model, serial number, location, status, specifications)
  - equipment_error_proofing table: error-proofing controls (prevention/detection types, failure modes addressed, suggested detection ratings)
  - equipment_control_methods table: control methods (characteristic type, measurement systems, sample size, frequency, acceptance criteria)
  - Added equipmentIds column to process_step table for linking equipment to process steps
- **Backend implementation:**
  - Full CRUD storage operations for all equipment entities
  - RESTful API routes for equipment, error-proofing controls, and control methods
  - Equipment types supported: injection_press, ultrasonic_welder, hot_plate_welder, robot, conveyor, test_station
- **Seed data:**
  - 4 equipment items: 2 Engel injection presses (200T, 350T), Branson ultrasonic welder, Fanuc robot
  - Comprehensive error-proofing controls (prevention and detection types)
  - Detailed control methods with measurement systems and acceptance criteria
- **Equipment Library page (/equipment):**
  - Table view of all equipment with search functionality
  - New Equipment dialog with type selection and full form validation
  - Equipment details dialog showing error-proofing controls and control methods
  - View/Edit/Delete actions for equipment management
  - Status badges (active, maintenance, retired)
  - Integration with sidebar navigation
- **Next steps:**
  - Add CRUD dialogs for managing error-proofing controls and control methods
  - Implement equipment assignment to process steps
  - Auto-populate PFMEA and Control Plan rows from equipment controls

**2025-11-24 (Final)**: Generate PFMEA and Generate Control Plan dialogs completed
- Implemented comprehensive document generation dialogs with:
  - Schema-based validation using insertPfmeaSchema and insertControlPlanSchema
  - Client-side duplicate prevention checking existing revisions before API call
  - Proper error handling with descriptive toast messages ("Duplicate revision - PFMEA with revision X already exists")
  - Dialog remains open on error for user to correct revision
  - Form reset with empty string defaults (not null) to prevent controlled/uncontrolled warnings
  - Auto-close dialog if part selection changes to prevent stale data issues
- POST endpoints for document creation: /api/pfmea and /api/control-plans
- Cache invalidation after successful creation
- Success/error toast notifications
- End-to-end Playwright tests passed:
  - Attempted duplicate PFMEA Rev A → error toast, dialog stays open
  - Corrected to Rev F → success, document created and appears in list
  - Same for Control Plans
  - All behaviors verified working correctly

**2025-11-24 (Late Night)**: Action buttons implemented across all pages
- Fixed all non-functional action buttons across Parts, Processes, PFMEA, and Control Plans pages
- **Parts page actions:**
  - View button: Navigates to PFMEA page with partId URL parameter for deep linking
  - Download button: Exports part data as JSON file using Blob API and createObjectURL
- **Processes page actions:**
  - View button: Shows toast with process details
  - Edit button: Shows toast notification for future editing feature
  - Copy button: Shows toast confirmation for process copying
- **PFMEA page actions:**
  - Generate PFMEA button: Validates part selection, shows appropriate feedback
  - URL parameter support: Pre-selects part when navigating from Parts page
  - Add/Edit Row dialogs already functional from earlier implementation
- **Control Plans page actions:**
  - Generate Control Plan button: Validates part selection, shows appropriate feedback
  - Add/Edit Row dialogs already functional from earlier implementation
- Fixed TypeScript error: specialFlag null → false conversion for form validation
- End-to-end Playwright test passed verifying all action buttons work correctly

**2025-11-24 (Night)**: Settings page implemented
- Created comprehensive Settings page with configuration sections:
  - Company Information: Company name, location, IATF 16949 certificate number
  - Rating Scale Configuration: AIAG-VDA 2019 standard, AP thresholds (high ≥100, medium ≥50)
  - Notifications: Toggle notifications and email digests for PFMEA updates
  - User Preferences: Default dashboard view, auto-save settings
- Added /settings route to App.tsx router
- Follows enterprise design patterns with shadcn/ui Cards, Inputs, Switches
- Toast notifications on save
- End-to-end Playwright test passed: verified page loads, form inputs, toggles, navigation

**2025-11-24 (Late Evening)**: PFMEA and Control Plan editing dialogs completed
- Built comprehensive editing dialogs for PFMEA rows and Control Plan characteristics
  - PFMEA dialog: Step Ref, Function, Requirement, Failure Mode, Effect, Severity, Cause, Occurrence, Detection, Notes, CSR Symbol
  - Control Plan dialog: Char ID, Name, Type, Target, Tolerance, Measurement System, Gage Details, Sample Size, Frequency, Control Method, Acceptance Criteria, Reaction Plan, CSR Symbol
  - Real-time AP calculation display in PFMEA dialog (Severity × (Occurrence + Detection))
  - AP badge with color-coded levels (high ≥100, medium 50-99, low <50)
- Implemented full CRUD operations:
  - Create mode: POST to /api/pfmea/:id/rows and /api/control-plans/:id/rows
  - Edit mode: PATCH to /api/pfmea-rows/:id and /api/control-plan-rows/:id
  - Proper form reset when switching between create/edit modes
  - Cache invalidation for immediate table updates
  - Toast notifications for success/error states
- Fixed critical bugs:
  - apiRequest signature: Changed from `apiRequest(url, { method, body })` to `apiRequest(method, url, data)`
  - Form reset logic: useEffect now properly loads existing row data when editing
- End-to-end Playwright tests passed for complete CRUD workflows:
  - PFMEA row creation with AP=50, editing with AP recalculation to 70
  - Control Plan characteristic creation (C-040), editing with field updates
  - Verified form validation, cache invalidation, and data persistence

**2025-11-24 (Evening)**: PFMEA and Control Plans pages completed
- Extended backend APIs: GET /api/pfmea/:id and GET /api/control-plans/:id with all rows
- Added CRUD endpoints for PFMEA and Control Plan rows (POST/PATCH)
- Built PFMEA page with part selector, revision list, and detail view
  - Displays failure modes with S/O/D ratings and color-coded AP badges
  - Proper loading states and navigation (list → detail → back)
  - APBadge component with level-based coloring (high/medium/low)
- Built Control Plans page with identical structure to PFMEA
  - Displays control characteristics with targets, tolerances, CSR symbols
  - Shows measurement methods, sample sizes, and frequencies
  - Proper field mapping to schema (charId, characteristicName, csrSymbol)
- Extended seed script with comprehensive PFMEA and Control Plan documents
- End-to-end Playwright tests verify both pages work correctly
- Fixed bugs: APBadge props, conditional rendering, Control Plan field names

**2025-11-24 (Earlier)**: Frontend-backend integration completed
- Connected Dashboard to display real metrics from /api/parts and /api/processes
- Connected Parts page with TanStack Query for data fetching and CRUD operations
- Built New Part dialog with react-hook-form + Zod validation, proper cache invalidation
- Connected Processes page with real data from backend API
- Built New Process dialog with controlled Select components (fixed stale data bug)
- Fixed dialog closing sequence: form.reset() before setOpen(false) for proper cleanup
- All CRUD operations tested end-to-end with playwright (Dashboard, Parts, Processes)
- Proper loading states, error handling, and toast notifications implemented throughout

**2025-11-23**: Initial backend integration
- Created comprehensive PostgreSQL schema (20+ tables)
- Implemented DatabaseStorage with Drizzle ORM
- Added API routes for parts, processes, PFMEA, control plans
- Seeded database with realistic automotive sample data
- Integrated backend with existing UI prototype

## User Preferences

- Enterprise-focused design (data density over white space)
- Professional blue color palette for trust/reliability
- Sidebar navigation for complex workflows
- Table-centric views for quality data
