# Process PFMEA Suite

## Overview
This project is an automotive quality management system for Process Failure Mode and Effects Analysis (PFMEA), designed to be compliant with IATF 16949 and AIAG-VDA 2019 standards. It provides quality engineers and process owners with tools to manage a process library, track parts, perform PFMEA analysis with automated Action Priority (AP) calculation, generate control plans, and manage changes. The system aims to streamline quality processes and ensure compliance within the automotive industry.

## User Preferences
- Enterprise-focused design (data density over white space)
- Professional blue color palette for trust/reliability
- Sidebar navigation for complex workflows
- Table-centric views for quality data

## System Architecture
The application uses a modern web stack:
- **Frontend**: React, TypeScript, Vite, Wouter, TanStack Query.
- **Backend**: Express, Drizzle ORM, PostgreSQL (Neon).
- **UI/UX**: `shadcn/ui`, Tailwind CSS, Radix UI are used for a professional enterprise design featuring a blue palette (hue 210), sidebar navigation, and data-dense tables with the Inter font family.

**Key Features**:
- **Process Management**: Define and manage reusable process definitions and steps with FMEA templates.
- **Parts Management**: Track automotive parts across various programs and customers.
- **PFMEA Analysis**: Conduct risk assessments, including the calculation of Action Priority (AP) based on Severity × (Occurrence + Detection).
- **Control Plans**: Generate quality control documentation directly linked to PFMEA.
- **Change Management**: Workflow for managing and approving process and document changes.
- **Equipment Library**: Comprehensive management of manufacturing equipment, including error-proofing controls and control methods, with full CRUD operations.
- **Standards Compliance**: Adheres to AIAG-VDA 2019 7-step FMEA methodology and IATF 16949 requirements for customer-specific requirements, special characteristics, and change management.

**Database Schema Overview**:
- **Core Entities**: `process_def`, `process_step`, `fmea_template_row`, `control_template_row`, `part`, `pfmea`, `control_plan`, `pfd`, `pfd_step`.
- **Supporting Entities**: `rating_scale`, `gage_library`, `calibration_link`, `equipment_library`, `equipment_error_proofing`, `equipment_control_methods`.
- **Governance Entities**: `audit_log`, `signature`, `approval_matrix`, `change_package`, `change_package_item`, `change_package_affected_part`, `training_ack`, `ownership`.
- **Library Entities**: `failure_modes_library`, `controls_library`, `control_pairings`, `fmea_template_catalog_link`.

**Recent Schema Updates** (Dec 2024):
- Added Process Flow Diagram (PFD) tables for visual process documentation
- Extended Part table with mold/tooling info and CSR notes
- Extended PFMEA with document header fields (number, key contact, team)
- Extended PFMEA Row with action tracking fields (recommended action, responsibility, target date, post-action ratings)
- Added subprocess support in process steps (step_type, parent_step_id, subprocess_ref_id)

**API Endpoints**: The system exposes RESTful APIs for managing Parts, Processes, PFMEA, Control Plans, and Equipment Library, supporting full CRUD operations for these entities and their related sub-entities.

## Testing
- **E2E Tests**: Playwright test suite with 31 tests covering:
  - Navigation tests (sidebar navigation to all pages)
  - Scrolling & sticky header tests
  - CRUD operations (Parts, Equipment, Failure Modes, Controls, Processes)
  - Document generation workflows
  - API health checks for all endpoints
- **Test Data Attributes**: Components use `data-testid` attributes for reliable selectors
- **Run Tests**: `npx playwright test e2e/app.spec.ts`

## External Dependencies
- **Database**: PostgreSQL (specifically Neon for cloud-hosted PostgreSQL).
- **UI Frameworks**: `shadcn/ui`, Tailwind CSS, Radix UI.
- **Frontend State Management/Data Fetching**: TanStack Query.
- **Routing**: Wouter (for client-side routing).
- **ORM**: Drizzle ORM.