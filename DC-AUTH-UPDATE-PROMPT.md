# DC-AUTH-UPDATE: Update Document Control Agents for Auth/Tenancy

## Context

We just completed Core Platform MVP which added:
- `organization`, `user`, `session` tables
- `orgId` foreign key on all root tables
- `requireAuth` middleware for route protection
- `req.orgId` for tenant scoping

Now we need to update the Document Control agent files to use these patterns.

---

## TASK 1: Update AGENT-DB-1.md

Open `/AGENT-DB-1.md` and make these changes:

### 1.1 Add orgId to these 6 tables:

**documentFile** - Add after `id`:
```
| orgId | uuid FK→organization | ✓ | | CASCADE delete |
```
Add index: `orgIdx: index('document_file_org_idx').on(table.orgId)`

**documentTemplate** - Add after `id`:
```
| orgId | uuid FK→organization | ✓ | | CASCADE delete |
```
Add index: `orgIdx: index('document_template_org_idx').on(table.orgId)`
Update unique constraint: `code` becomes `(orgId, code)`

**approvalWorkflowDefinition** - Add after `id`:
```
| orgId | uuid FK→organization | ✓ | | CASCADE delete |
```
Add index: `orgIdx: index('approval_workflow_def_org_idx').on(table.orgId)`
Update unique constraint: `code` becomes `(orgId, code)`

**approvalWorkflowInstance** - Add after `id`:
```
| orgId | uuid FK→organization | ✓ | | CASCADE delete |
```
Add index: `orgIdx: index('approval_workflow_inst_org_idx').on(table.orgId)`

**approvalWorkflowStep** - NO orgId needed (inherits via workflowInstanceId)

**documentCheckout** - Add after `id`:
```
| orgId | uuid FK→organization | ✓ | | CASCADE delete |
```
Add index: `orgIdx: index('document_checkout_org_idx').on(table.orgId)`

### 1.2 Update Storage Methods section

Add this note at the top of Storage Methods:
```
**Auth/Tenancy Pattern:**
- All "get list" methods take `orgId: string` as first parameter
- All "create" methods expect `orgId` in the data object
- Methods that get by ID don't need orgId (verification happens at API layer)
```

Update method signatures:
- `getDocumentFiles(orgId, documentId)` 
- `getDocumentTemplates(orgId, status?)`
- `getDocumentTemplatesByType(orgId, docType)`
- `getApprovalWorkflowDefinitions(orgId, status?)`
- `getWorkflowDefinitionForDocType(orgId, docType)`
- `getApprovalWorkflowInstances(orgId, documentId?, status?)`
- `getDocumentCheckouts(orgId, documentId?, status?)`
- `getAllActiveCheckouts(orgId)`
- `getCheckoutsByUser(orgId, userId)`

### 1.3 Update Seed Data section

Add at top:
```
**Note:** All seed data uses the demo organization created by Core Platform.
Reference: `const demoOrg = await storage.getOrganizationBySlug('acme-manufacturing')`
All inserts include `orgId: demoOrg.id`
```

---

## TASK 2: Update AGENT-DB-2.md

Open `/AGENT-DB-2.md` and make these changes:

### 2.1 Add orgId to these 7 tables:

**distributionList** - Add after `id`:
```
| orgId | uuid FK→organization | ✓ | | CASCADE delete |
```
Add index, update `code` unique to `(orgId, code)`

**documentDistributionRecord** - Add after `id`:
```
| orgId | uuid FK→organization | ✓ | | CASCADE delete |
```
Add index

**documentAccessLog** - Add after `id`:
```
| orgId | uuid FK→organization | ✓ | | CASCADE delete |
```
Add index

**documentPrintLog** - Add after `id`:
```
| orgId | uuid FK→organization | ✓ | | CASCADE delete |
```
Add index

**documentComment** - Add after `id`:
```
| orgId | uuid FK→organization | ✓ | | CASCADE delete |
```
Add index

**externalDocument** - Add after `id`:
```
| orgId | uuid FK→organization | ✓ | | CASCADE delete |
```
Add index, add unique `(orgId, docNumber)`

**documentLinkEnhanced** - Add after `id`:
```
| orgId | uuid FK→organization | ✓ | | CASCADE delete |
```
Add index

### 2.2 Update Storage Methods

Same pattern as TASK 1.2 - add `orgId` as first parameter to all list methods.

### 2.3 Update Seed Data

Same note as TASK 1.3.

---

## TASK 3: Update AGENT-API-1.md

Open `/AGENT-API-1.md` and make these changes:

### 3.1 Add Auth Section at top (after Mission)

Insert this section:
```markdown
---

## Authentication & Authorization

**All endpoints require authentication via `requireAuth` middleware.**

Every route handler has access to:
- `req.auth.user` - Current authenticated user
- `req.orgId` - Current organization ID (for tenant scoping)

**Pattern for all endpoints:**
```typescript
app.get("/api/endpoint", requireAuth, async (req, res) => {
  // req.orgId is guaranteed to exist
  // Use req.orgId for all queries and creates
});
```

**Org Access Verification:**
When fetching a resource by ID, verify it belongs to the user's org:
```typescript
const resource = await storage.getResourceById(id);
if (!resource || resource.orgId !== req.orgId) {
  return res.status(404).json({ error: 'Not found' });
}
```
```

### 3.2 Update all endpoint descriptions

For each endpoint, add these notes:

**List endpoints** - Add to Business Rules:
```
- Filter by `req.orgId` (tenant isolation)
```

**Create endpoints** - Add to Business Rules:
```
- Set `orgId: req.orgId` on created record
```

**Get/Update/Delete by ID endpoints** - Add to Business Rules:
```
- Verify resource belongs to `req.orgId` (return 404 if not)
```

---

## TASK 4: Update AGENT-API-2.md

Open `/AGENT-API-2.md` and make the same changes as TASK 3.

---

## TASK 5: Update AGENT-UI-1.md and AGENT-UI-2.md

These files need minimal changes since auth is handled at App.tsx level.

Add this note to the top of each file (after READ FIRST):
```markdown
---

## Authentication

All pages are protected by `<ProtectedRoute>` wrapper in App.tsx.
The `useAuth()` hook provides:
- `user` - Current user with `orgId` and `organization` info
- `isAuthenticated` - Boolean
- `logout()` - Sign out function

No additional auth handling needed in individual pages.
```

---

## TASK 6: Update AGENT-TEST.md

Add this section after the existing test categories:

```markdown
---

## Tenancy Isolation Tests

### Multi-Org Document Isolation
- Create documents in two different orgs
- Verify Org A cannot see/access Org B's documents
- Verify cross-org document access returns 404 (not 403)

### Cross-Org Workflow Isolation
- Create workflow definitions in different orgs
- Verify Org A cannot use Org B's workflow definitions
- Verify workflow instances are isolated

### Cross-Org Template Isolation
- Create templates in different orgs
- Verify "create from template" only shows own org's templates
```

---

## Validation

After making all changes, verify:
- [ ] All 13 DC tables have `orgId` column specified
- [ ] All unique constraints include `orgId` where applicable
- [ ] All list storage methods have `orgId` parameter
- [ ] All API routes mention `requireAuth`
- [ ] All API routes mention `req.orgId` for scoping
- [ ] Seed data references demo org
- [ ] UI files mention `useAuth()` availability

---

## Summary of Changes

| File | Tables Updated | Methods Updated | Routes Updated |
|------|----------------|-----------------|----------------|
| AGENT-DB-1.md | 5 tables + orgId | ~25 methods | N/A |
| AGENT-DB-2.md | 7 tables + orgId | ~30 methods | N/A |
| AGENT-API-1.md | N/A | N/A | ~25 routes |
| AGENT-API-2.md | N/A | N/A | ~45 routes |
| AGENT-UI-1.md | N/A | N/A | Auth note added |
| AGENT-UI-2.md | N/A | N/A | Auth note added |
| AGENT-TEST.md | N/A | N/A | Tenancy tests added |

Now execute these updates in the files.
