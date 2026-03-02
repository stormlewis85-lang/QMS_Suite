# Patterns — Codebase Conventions

> Owned by Architect Agent. Read by Developer and Test on every task. Defines how code is written in this project — naming, structure, signatures, and patterns. Follow these before inventing new approaches.

<!-- Architect seeds this file at project kickoff and updates it as patterns evolve. -->
<!-- Keep this file under two pages. If it's longer, prune patterns that are obvious from the codebase. -->

## Naming Conventions
<!-- Variable, function, file, and directory naming rules. -->
<!-- e.g., camelCase for functions, PascalCase for components, snake_case for DB columns -->

## Database Patterns
<!-- Schema conventions, column naming, foreign key patterns, migration approach. -->
<!-- e.g., All tables include `id`, `createdAt`, `updatedAt`. Foreign keys use `entityId` format. -->

## API Patterns
<!-- Route structure, middleware order, request/response formats, error handling. -->
<!-- e.g., RESTful routes: GET /api/entities, POST /api/entities, PATCH /api/entities/:id -->

## Component Patterns
<!-- Frontend component structure, state management, data fetching approach. -->
<!-- e.g., TanStack Query for server state, react-hook-form for forms, shadcn/ui for base components. -->

## Test Patterns
<!-- Test file naming, assertion style, fixture patterns, mock approach. -->
<!-- e.g., Test files mirror source: src/utils/auth.ts → tests/utils/auth.test.ts -->

## File Organization
<!-- Where things go. Directory structure rules. -->
<!-- e.g., Shared types in shared/types.ts, route handlers in server/routes/, pages in client/src/pages/ -->

## Error Handling
<!-- Standard error patterns, logging approach, user-facing error format. -->

## Common Gotchas
<!-- Project-specific traps that have bitten us before. Updated as issues are discovered. -->
