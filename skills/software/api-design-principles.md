---
name: api-design-principles
domain: software
auto-load: false
used-by:
  - architect-agent
description: >
  REST conventions, error formats, versioning strategy, and input validation patterns
  for API design. Triggers: "API design", "endpoint", "REST", "error format",
  "API versioning", "request validation", "response schema".
---

# Skill: API Design Principles

## When to Apply
- When Architect Agent designs new API endpoints
- When reviewing API changes in PRs
- When adding error handling to existing endpoints
- When planning API versioning strategy
- When Developer Agent asks for guidance on endpoint structure

## Core Framework

### 1. URL Design
- Use nouns, not verbs: `/users` not `/getUsers`.
- Use plural nouns: `/users` not `/user`.
- Nest for relationships: `/users/:id/posts`.
- Keep nesting shallow — max 2 levels deep.
- Use kebab-case for multi-word resources: `/user-profiles`.
- Query parameters for filtering, sorting, pagination: `/users?role=admin&sort=name&page=2`.

### 2. HTTP Methods

| Method | Purpose | Idempotent | Body |
|---|---|---|---|
| GET | Read resource(s) | Yes | No |
| POST | Create resource | No | Yes |
| PUT | Replace resource entirely | Yes | Yes |
| PATCH | Partial update | Yes | Yes |
| DELETE | Remove resource | Yes | No |

### 3. Response Format
Consistent envelope for all responses:

```json
{
  "data": { ... },
  "meta": { "page": 1, "total": 42 },
  "errors": null
}
```

### 4. Error Format
Standardized error responses:

```json
{
  "data": null,
  "errors": [
    {
      "code": "VALIDATION_ERROR",
      "message": "Email is required",
      "field": "email",
      "status": 422
    }
  ]
}
```

| Status Code | When to Use |
|---|---|
| 400 | Malformed request (bad JSON, missing required headers) |
| 401 | Not authenticated |
| 403 | Authenticated but not authorized |
| 404 | Resource not found |
| 409 | Conflict (duplicate, state conflict) |
| 422 | Validation error (valid JSON, invalid data) |
| 429 | Rate limited |
| 500 | Server error (never expose internals) |

### 5. Versioning
- URL prefix versioning: `/api/v1/users` (preferred for simplicity).
- Increment major version only for breaking changes.
- Support previous version for a defined deprecation window.
- Document breaking changes in DECISIONS.md.

### 6. Input Validation
- Validate at the boundary — every input from outside the system.
- Reject early with clear error messages.
- Sanitize strings (trim whitespace, normalize encoding).
- Enforce type constraints (numbers, dates, enums).
- Set reasonable limits (max string length, max array size, max page size).

## Output Format

```markdown
## API Design — [Feature/Resource]

### Endpoints
| Method | Path | Description | Auth |
|---|---|---|---|
| GET | /api/v1/... | ... | Required |
| POST | /api/v1/... | ... | Required |

### Request/Response Examples
**POST /api/v1/resource**
Request: { ... }
Response (201): { ... }
Response (422): { ... }

### Validation Rules
| Field | Type | Required | Constraints |
|---|---|---|---|
| ... | ... | ... | ... |
```

## Integration with Other Skills
- **testing-strategy**: Every endpoint gets integration tests covering happy path and error cases.
- **security-review**: Auth checks, input validation, and rate limiting are security concerns.
- **code-review-checklist**: QA verifies API conventions during review.
- **migration-planner**: Breaking API changes trigger the migration planning workflow.
