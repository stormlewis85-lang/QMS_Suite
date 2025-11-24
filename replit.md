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

- `GET /api/parts` - List all parts
- `GET /api/parts/:id` - Get part by ID
- `POST /api/parts` - Create new part
- `GET /api/processes` - List all process definitions
- `GET /api/processes/:id` - Get process with steps
- `POST /api/processes` - Create new process
- `GET /api/pfmea?partId=<id>` - Get PFMEAs for a part
- `GET /api/control-plans?partId=<id>` - Get control plans for a part

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
- AIAG-VDA 2019 rating scales
- Measurement equipment with calibration tracking

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

**2025-11-24**: Frontend-backend integration completed
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
