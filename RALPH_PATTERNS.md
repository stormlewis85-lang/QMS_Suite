# RALPH PATTERNS - Shared Context for All Agents

## Purpose
This file contains patterns and conventions that ALL Ralph agents must follow. Read this FIRST, then read your agent-specific file.

---

## Project Structure

```
shared/schema.ts        # Drizzle schema - ALL tables, relations, Zod schemas, types
server/storage.ts       # Data access layer - ALL database methods
server/routes.ts        # Express API - ALL endpoints
server/seed.ts          # Sample data generation
client/src/pages/       # React page components
client/src/components/  # Reusable UI components
```

---

## Schema Conventions

**Study these files to see exact patterns:**
- `shared/schema.ts` lines 1-50 for imports and enums
- Any existing `pgTable` definition for column patterns
- Any existing `Relations` definition for relationship patterns
- Bottom of file for Zod schemas and type exports

**Naming:**
- Tables: camelCase (`documentFile`, `approvalWorkflowStep`)
- Columns: camelCase in code, snake_case in DB (`createdAt` → `created_at`)
- Relations: camelCase, named after the relationship (`document`, `steps`, `parentComment`)

**Booleans:** Use `integer` with 0/1, not boolean (SQLite compatibility)

**JSON fields:** Use `text` with default `'[]'` or `'{}'`, parse in application code

**Timestamps:** Use `timestamp("x")` with `.defaultNow()` for created/updated fields

**Foreign Keys:** Always specify `onDelete` behavior - usually `cascade` for child records

---

## Storage Method Conventions

**Study `server/storage.ts` for exact patterns.**

**Standard CRUD signature for each table:**
```
getXs(filters?)        → X[]           # List with optional filters
getX(id)               → X | undefined  # Single by ID
getXByCode(code)       → X | undefined  # Single by unique code (if applicable)
createX(data)          → X              # Insert and return
updateX(id, data)      → X              # Update and return
deleteX(id)            → void           # Delete
```

**Additional methods as needed:**
- `getXsByY(yId)` - Get children by parent
- `getActiveX(...)` - Get by status filter
- `searchX(text)` - Text search

**Imports:** Add new tables and types to the import block at top of file.

---

## API Route Conventions

**Study `server/routes.ts` for exact patterns.**

**RESTful structure:**
```
GET    /api/xs              → List
GET    /api/xs/:id          → Get one
POST   /api/xs              → Create
PATCH  /api/xs/:id          → Update
DELETE /api/xs/:id          → Delete
```

**Action endpoints:**
```
POST   /api/xs/:id/action   → Perform action (approve, submit, checkout, etc.)
```

**Response codes:**
- 200: Success (GET, PATCH, action)
- 201: Created (POST)
- 204: No content (DELETE)
- 400: Validation error
- 404: Not found
- 409: Conflict (duplicate, invalid state transition)

**Validation:** Use Zod schemas with `.parse()` or `.safeParse()`

---

## UI Conventions

**Study existing pages for patterns:**
- `client/src/pages/Equipment.tsx` - Full CRUD with dialogs
- `client/src/pages/ControlsLibrary.tsx` - Complex filtering and relations
- `client/src/pages/FailureModes.tsx` - Nested data

**Stack:**
- React + TypeScript
- Tanstack Query (`useQuery`, `useMutation`) for API calls
- shadcn/ui components (Button, Dialog, Table, Card, Badge, Tabs, etc.)
- Tailwind CSS for styling
- wouter for routing
- react-hook-form + zod for forms

**Patterns:**
- Queries: `useQuery({ queryKey: [...], queryFn: () => fetch(...) })`
- Mutations: `useMutation({ mutationFn: ..., onSuccess: () => queryClient.invalidateQueries(...) })`
- Loading states: Skeleton components or "Loading..." text
- Error states: Toast notifications via `useToast()`
- Empty states: Descriptive message with action button

---

## Agent Boundaries

**AGENT-DB owns:**
- `shared/schema.ts` - Table definitions, relations, Zod schemas, types
- `server/storage.ts` - Database methods
- `server/seed.ts` - Sample data

**AGENT-API owns:**
- `server/routes.ts` - HTTP endpoints and business logic

**AGENT-UI owns:**
- `client/src/pages/` - Page components
- `client/src/components/` - Shared components (if needed)
- `client/src/App.tsx` - Route registration

**AGENT-TEST owns:**
- `tests/` - Test files

**NEVER touch files outside your boundary.**

---

## Validation Gates

After each agent completes:

1. **AGENT-DB:** `npx drizzle-kit push` succeeds, server starts, seed runs
2. **AGENT-API:** All new endpoints return expected responses, no TypeScript errors
3. **AGENT-UI:** Pages render, forms submit, data displays correctly
4. **AGENT-TEST:** All tests pass

---

## Business Domain Context

**This is a Quality Management System for automotive manufacturing.**

**IATF 16949** - Automotive quality standard. Documents must be controlled, approved, distributed, and traceable.

**21 CFR Part 11** - FDA regulation for electronic signatures. E-signatures must include:
- Unique user identification
- Timestamp (server-side UTC)
- Meaning statement ("I approve this for production use")
- Document hash at time of signature
- Cannot be repudiated

**Document lifecycle:** Draft → Review → Effective → Superseded/Obsolete

**Revision naming:** A, B, C, ... Z, AA, AB, ... (letter-based, not numeric)

**CSR (Critical/Safety/Regulatory):** Special characteristics requiring enhanced controls. Symbols: Ⓢ (Safety), ◆ (Critical), ⓒ (Compliance)
