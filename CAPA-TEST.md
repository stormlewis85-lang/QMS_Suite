# CAPA-TEST: Comprehensive Test Coverage

**Read RALPH_PATTERNS.md first. All CAPA-DB, CAPA-API, and CAPA-UI agents must be complete.**

---

## Mission

Create comprehensive test coverage for the CAPA/8D module:
- Unit tests for business logic
- Integration tests for API endpoints
- Tenancy isolation tests
- E2E tests for critical user journeys

**Target: 150+ tests with 90%+ coverage**

---

## Test Files to Create

### 1. Unit Tests: `tests/unit/capa.test.ts`

**CAPA Number Generation (~5 tests):**
```typescript
describe('CAPA Number Generation', () => {
  it('generates sequential numbers within a year', () => {
    // CAPA-2024-0001, CAPA-2024-0002, etc.
  });

  it('resets sequence at year boundary', () => {
    // 2024-9999 → 2025-0001
  });

  it('pads numbers to 4 digits', () => {
    // 0001, 0010, 0100, 1000
  });

  it('handles concurrent number generation', () => {
    // No duplicates under concurrent requests
  });

  it('supports custom prefix per org', () => {
    // CAR-2024-0001 for org with prefix "CAR"
  });
});
```

**Status Transitions (~10 tests):**
```typescript
describe('CAPA Status Transitions', () => {
  it('allows d0_awareness → d1_team_formation', () => {});
  it('allows d1 → d2 → d3 → d4 → d5 → d6 → d7 → d8 → closed', () => {});
  it('allows any status → on_hold', () => {});
  it('allows on_hold → previous status', () => {});
  it('allows any status → cancelled', () => {});
  it('prevents backwards transitions (d4 → d3)', () => {});
  it('prevents transitions from closed', () => {});
  it('prevents transitions from cancelled', () => {});
  it('allows closed → reopened (with reason)', () => {});
  it('validates discipline completion before advancing', () => {});
});
```

**Discipline Completion Validation (~15 tests):**
```typescript
describe('Discipline Completion Validation', () => {
  describe('D0 Completion', () => {
    it('requires all emergency actions complete if response required', () => {});
    it('allows completion without actions if response not required', () => {});
    it('requires symptoms captured', () => {});
  });

  describe('D1 Completion', () => {
    it('requires champion assigned', () => {});
    it('requires leader assigned', () => {});
    it('requires minimum 3 team members', () => {});
    it('requires team charter defined', () => {});
  });

  describe('D2 Completion', () => {
    it('requires problem statement verified', () => {});
    it('requires all 5W+1H answered', () => {});
    it('requires Is/Is Not analysis complete', () => {});
    it('requires measurement system verified', () => {});
  });

  describe('D3 Completion', () => {
    it('requires at least one action if containment required', () => {});
    it('requires all actions implemented', () => {});
    it('requires effectiveness verified', () => {});
  });

  describe('D4 Completion', () => {
    it('requires occurrence root cause verified', () => {});
    it('requires escape root cause verified', () => {});
    it('requires confidence level set', () => {});
  });

  // D5-D8 similar
});
```

**Team Constraints (~8 tests):**
```typescript
describe('Team Constraints', () => {
  it('allows only one champion per CAPA', () => {});
  it('allows only one leader per CAPA', () => {});
  it('allows champion and leader to be same person', () => {});
  it('prevents duplicate team members', () => {});
  it('tracks member join and leave dates', () => {});
  it('requires reason when removing member', () => {});
  it('allows changing member role', () => {});
  it('prevents removing last champion without replacement', () => {});
});
```

**Audit Log Hash Chain (~5 tests):**
```typescript
describe('Audit Log Hash Chain', () => {
  it('computes SHA-256 hash including previous hash', () => {});
  it('creates valid chain from first to last entry', () => {});
  it('detects tampering in middle of chain', () => {});
  it('detects deleted entries', () => {});
  it('handles empty/new CAPA correctly', () => {});
});
```

**Action Priority Calculation (~5 tests):**
```typescript
describe('Action Priority', () => {
  it('calculates priority from severity and urgency', () => {});
  it('escalates safety-related to critical', () => {});
  it('escalates regulatory-related to critical', () => {});
  it('considers customer impact', () => {});
  it('defaults to medium for standard issues', () => {});
});
```

**Metrics Calculation (~8 tests):**
```typescript
describe('Metrics Calculation', () => {
  it('calculates average cycle time correctly', () => {});
  it('calculates on-time closure rate', () => {});
  it('calculates effectiveness rate', () => {});
  it('calculates recurrence rate', () => {});
  it('handles zero division cases', () => {});
  it('filters by date range correctly', () => {});
  it('calculates Pareto percentages', () => {});
  it('calculates trend direction', () => {});
});
```

---

### 2. Integration Tests: `tests/integration/capa-api.test.ts`

**CAPA CRUD (~15 tests):**
```typescript
describe('CAPA CRUD', () => {
  it('POST /api/capas - creates CAPA with auto-number', async () => {
    const res = await request(app)
      .post('/api/capas')
      .set('Cookie', authCookie)
      .send({
        title: 'Test CAPA',
        description: 'Test description',
        type: 'corrective',
        priority: 'high',
        sourceType: 'customer_complaint'
      });
    
    expect(res.status).toBe(201);
    expect(res.body.capaNumber).toMatch(/^CAPA-\d{4}-\d{4}$/);
    expect(res.body.status).toBe('d0_awareness');
  });

  it('GET /api/capas - lists with pagination', async () => {});
  it('GET /api/capas - filters by status', async () => {});
  it('GET /api/capas - filters by priority', async () => {});
  it('GET /api/capas - filters by source type', async () => {});
  it('GET /api/capas - searches title and description', async () => {});
  it('GET /api/capas/:id - returns full CAPA with relations', async () => {});
  it('PATCH /api/capas/:id - updates CAPA', async () => {});
  it('PATCH /api/capas/:id - creates audit log entry', async () => {});
  it('DELETE /api/capas/:id - soft deletes', async () => {});
  it('DELETE /api/capas/:id - requires admin role', async () => {});
  it('POST /api/capas/:id/advance-discipline - validates completion', async () => {});
  it('POST /api/capas/:id/hold - puts on hold', async () => {});
  it('POST /api/capas/:id/resume - resumes from hold', async () => {});
  it('returns 404 for non-existent CAPA', async () => {});
});
```

**Team Management (~10 tests):**
```typescript
describe('Team Management', () => {
  it('POST /api/capas/:id/team - adds member', async () => {});
  it('POST /api/capas/:id/team - prevents duplicate', async () => {});
  it('POST /api/capas/:id/team - enforces single champion', async () => {});
  it('POST /api/capas/:id/team - enforces single leader', async () => {});
  it('GET /api/capas/:id/team - lists members', async () => {});
  it('PATCH /api/capas/:id/team/:id - updates role', async () => {});
  it('DELETE /api/capas/:id/team/:id - removes with reason', async () => {});
  it('DELETE /api/capas/:id/team/:id - prevents removing last champion', async () => {});
  it('validates user exists in org', async () => {});
  it('creates audit log for team changes', async () => {});
});
```

**Attachments (~8 tests):**
```typescript
describe('Attachments', () => {
  it('POST /api/capas/:id/attachments - uploads file', async () => {});
  it('POST /api/capas/:id/attachments - computes checksum', async () => {});
  it('POST /api/capas/:id/attachments - stores with discipline', async () => {});
  it('GET /api/capas/:id/attachments - lists by discipline', async () => {});
  it('GET /api/capas/:id/attachments - filters evidence', async () => {});
  it('GET /api/capa-attachments/:id/download - returns file', async () => {});
  it('DELETE /api/capa-attachments/:id - soft deletes', async () => {});
  it('rejects oversized files', async () => {});
});
```

**D0-D4 Endpoints (~25 tests):**
```typescript
describe('D0 Emergency', () => {
  it('PUT /api/capas/:id/d0 - updates emergency data', async () => {});
  it('POST /api/capas/:id/d0/emergency-actions - adds action', async () => {});
  it('PATCH /api/capas/:id/d0/emergency-actions/:idx - completes action', async () => {});
  it('POST /api/capas/:id/d0/complete - validates requirements', async () => {});
  it('POST /api/capas/:id/d0/verify - records verification', async () => {});
});

describe('D1 Team', () => {
  it('PUT /api/capas/:id/d1 - updates team formation', async () => {});
  it('POST /api/capas/:id/d1/meetings - adds meeting', async () => {});
  it('POST /api/capas/:id/d1/approve-resources - approves', async () => {});
  it('POST /api/capas/:id/d1/complete - validates min team', async () => {});
});

describe('D2 Problem', () => {
  it('PUT /api/capas/:id/d2 - updates problem data', async () => {});
  it('PUT /api/capas/:id/d2/is-not/:dim - updates Is/Is Not', async () => {});
  it('POST /api/capas/:id/d2/verify-problem-statement', async () => {});
  it('POST /api/capas/:id/d2/complete - validates 5W+1H', async () => {});
});

describe('D3 Containment', () => {
  it('PUT /api/capas/:id/d3 - updates containment', async () => {});
  it('POST /api/capas/:id/d3/actions - adds action', async () => {});
  it('POST /api/capas/:id/d3/actions/:id/verify - verifies', async () => {});
  it('POST /api/capas/:id/d3/sort-results - records results', async () => {});
  it('POST /api/capas/:id/d3/verify-effectiveness', async () => {});
  it('POST /api/capas/:id/d3/complete - validates actions', async () => {});
});

describe('D4 Root Cause', () => {
  it('PUT /api/capas/:id/d4 - updates root cause', async () => {});
  it('POST /api/capas/:id/d4/five-why - adds chain', async () => {});
  it('PUT /api/capas/:id/d4/fishbone - updates diagram', async () => {});
  it('POST /api/capas/:id/d4/candidates - adds candidate', async () => {});
  it('POST /api/capas/:id/d4/verify-occurrence', async () => {});
  it('POST /api/capas/:id/d4/verify-escape', async () => {});
  it('POST /api/capas/:id/d4/complete - validates both causes', async () => {});
});
```

**D5-D8 Endpoints (~20 tests):**
```typescript
describe('D5 Corrective', () => {
  it('POST /api/capas/:id/d5/actions - adds action', async () => {});
  it('PUT /api/capas/:id/d5/risk-assessment - updates risk', async () => {});
  it('POST /api/capas/:id/d5/approve - management approval', async () => {});
  it('POST /api/capas/:id/d5/complete - validates approval', async () => {});
});

describe('D6 Validation', () => {
  it('POST /api/capas/:id/d6/implementation-log - logs event', async () => {});
  it('POST /api/capas/:id/d6/validation-tests - adds test', async () => {});
  it('POST /api/capas/:id/d6/verify-effectiveness', async () => {});
  it('POST /api/capas/:id/d6/remove-containment', async () => {});
  it('POST /api/capas/:id/d6/complete - validates effectiveness', async () => {});
});

describe('D7 Preventive', () => {
  it('POST /api/capas/:id/d7/actions - adds action', async () => {});
  it('PUT /api/capas/:id/d7/horizontal-deployment', async () => {});
  it('POST /api/capas/:id/d7/lesson-learned', async () => {});
  it('POST /api/capas/:id/d7/complete - validates deployment', async () => {});
});

describe('D8 Closure', () => {
  it('POST /api/capas/:id/d8/closure-criteria/:id - marks met', async () => {});
  it('PUT /api/capas/:id/d8/team-recognition', async () => {});
  it('PUT /api/capas/:id/d8/success-metrics', async () => {});
  it('POST /api/capas/:id/d8/submit-for-approval', async () => {});
  it('POST /api/capas/:id/d8/approve-closure', async () => {});
  it('POST /api/capas/:id/d8/close - closes CAPA', async () => {});
  it('POST /api/capas/:id/d8/close - validates all criteria', async () => {});
  it('POST /api/capas/:id/d8/reopen - reopens with reason', async () => {});
});
```

**Audit Log (~8 tests):**
```typescript
describe('Audit Log', () => {
  it('GET /api/capas/:id/audit-log - returns entries', async () => {});
  it('filters by action type', async () => {});
  it('filters by user', async () => {});
  it('filters by date range', async () => {});
  it('GET /api/capas/:id/audit-log/verify-chain - validates', async () => {});
  it('detects broken chain', async () => {});
  it('prevents direct modification', async () => {});
  it('records all state changes automatically', async () => {});
});
```

**Analytics (~10 tests):**
```typescript
describe('Analytics', () => {
  it('GET /api/capa-analytics/summary - returns metrics', async () => {});
  it('GET /api/capa-analytics/by-status - counts by status', async () => {});
  it('GET /api/capa-analytics/pareto - calculates pareto', async () => {});
  it('GET /api/capa-analytics/trends - returns trend data', async () => {});
  it('GET /api/capa-analytics/team - returns team metrics', async () => {});
  it('respects date range filter', async () => {});
  it('respects org scope', async () => {});
  it('handles empty data gracefully', async () => {});
  it('calculates percentages correctly', async () => {});
  it('sorts pareto descending', async () => {});
});
```

---

### 3. Tenancy Tests: `tests/integration/capa-tenancy.test.ts`

```typescript
describe('CAPA Multi-Tenancy Isolation', () => {
  let org1Cookie: string;
  let org2Cookie: string;
  let org1Capa: number;
  let org2Capa: number;

  beforeAll(async () => {
    // Create two orgs with users
    // Create CAPAs in each org
  });

  describe('CAPA Access', () => {
    it('org1 cannot see org2 CAPAs in list', async () => {});
    it('org1 cannot access org2 CAPA by ID', async () => {});
    it('org1 cannot update org2 CAPA', async () => {});
    it('org1 cannot delete org2 CAPA', async () => {});
  });

  describe('Team Members', () => {
    it('org1 cannot add member to org2 CAPA', async () => {});
    it('org1 cannot see org2 CAPA team', async () => {});
  });

  describe('Attachments', () => {
    it('org1 cannot upload to org2 CAPA', async () => {});
    it('org1 cannot download org2 attachment', async () => {});
  });

  describe('Disciplines', () => {
    it('org1 cannot update org2 D0', async () => {});
    it('org1 cannot update org2 D1', async () => {});
    it('org1 cannot update org2 D2', async () => {});
    it('org1 cannot update org2 D3', async () => {});
    it('org1 cannot update org2 D4', async () => {});
    it('org1 cannot update org2 D5', async () => {});
    it('org1 cannot update org2 D6', async () => {});
    it('org1 cannot update org2 D7', async () => {});
    it('org1 cannot update org2 D8', async () => {});
  });

  describe('Audit Logs', () => {
    it('org1 cannot see org2 audit logs', async () => {});
  });

  describe('Analytics', () => {
    it('org1 analytics only include org1 data', async () => {});
    it('org2 analytics only include org2 data', async () => {});
  });

  describe('Unauthenticated Access', () => {
    it('cannot list CAPAs without auth', async () => {});
    it('cannot create CAPA without auth', async () => {});
    it('cannot access CAPA without auth', async () => {});
  });
});
```

---

### 4. E2E Tests: `tests/e2e/capa.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('CAPA Module', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="email"]', 'admin@acme.com');
    await page.fill('[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('dashboard shows CAPA metrics', async ({ page }) => {
    await page.goto('/capa/dashboard');
    await expect(page.locator('text=Open')).toBeVisible();
    await expect(page.locator('text=Overdue')).toBeVisible();
    await expect(page.locator('text=Closed')).toBeVisible();
  });

  test('can create new CAPA', async ({ page }) => {
    await page.goto('/capa/new');
    await page.fill('[name="title"]', 'E2E Test CAPA');
    await page.fill('[name="description"]', 'Created by E2E test');
    await page.selectOption('[name="type"]', 'corrective');
    await page.selectOption('[name="priority"]', 'high');
    await page.selectOption('[name="sourceType"]', 'customer_complaint');
    await page.click('button:has-text("Create")');
    
    await expect(page).toHaveURL(/\/capa\/\d+/);
    await expect(page.locator('text=E2E Test CAPA')).toBeVisible();
    await expect(page.locator('text=CAPA-')).toBeVisible();
  });

  test('can navigate through 8D disciplines', async ({ page }) => {
    // Create or use existing CAPA
    await page.goto('/capa/1');
    
    // Check D0 tab
    await page.click('text=D0');
    await expect(page.locator('text=Emergency Response')).toBeVisible();
    
    // Check D1 tab
    await page.click('text=D1');
    await expect(page.locator('text=Team Formation')).toBeVisible();
    
    // Check D2 tab
    await page.click('text=D2');
    await expect(page.locator('text=Problem Description')).toBeVisible();
    
    // Continue for D3-D8...
  });

  test('can add team member', async ({ page }) => {
    await page.goto('/capa/1');
    await page.click('button:has-text("Add Team Member")');
    await page.fill('[name="search"]', 'quality');
    await page.click('text=quality@acme.com');
    await page.selectOption('[name="role"]', 'quality_engineer');
    await page.click('button:has-text("Add")');
    
    await expect(page.locator('text=quality@acme.com')).toBeVisible();
  });

  test('can upload attachment', async ({ page }) => {
    await page.goto('/capa/1');
    await page.click('text=Attachments');
    await page.click('button:has-text("Upload")');
    
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('test content')
    });
    
    await page.selectOption('[name="discipline"]', 'D0');
    await page.click('button:has-text("Upload")');
    
    await expect(page.locator('text=test.pdf')).toBeVisible();
  });

  test('can complete D0 discipline', async ({ page }) => {
    await page.goto('/capa/1?tab=d0');
    
    // Fill required fields
    await page.check('[name="emergencyResponseRequired"]');
    await page.fill('[name="symptomsDescription"]', 'Test symptoms');
    
    // Complete D0
    await page.click('button:has-text("Complete D0")');
    
    await expect(page.locator('text=D0 Completed')).toBeVisible();
  });

  test('can view analytics', async ({ page }) => {
    await page.goto('/capa/analytics');
    
    await expect(page.locator('text=Total CAPAs')).toBeVisible();
    await expect(page.locator('canvas')).toBeVisible(); // Charts
  });

  test('can export CAPA list', async ({ page }) => {
    await page.goto('/capa/export');
    
    await page.selectOption('[name="format"]', 'xlsx');
    
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('button:has-text("Export")')
    ]);
    
    expect(download.suggestedFilename()).toMatch(/\.xlsx$/);
  });

  test('can generate 8D report', async ({ page }) => {
    await page.goto('/capa/1?tab=d8');
    
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('button:has-text("Generate Report")')
    ]);
    
    expect(download.suggestedFilename()).toMatch(/\.pdf$/);
  });

  test('sidebar shows CAPA in navigation', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('nav >> text=CAPA')).toBeVisible();
  });

  test('protected routes redirect to login', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/capa');
    await expect(page).toHaveURL(/\/login/);
  });
});
```

---

### 5. Full 8D Journey Test: `tests/e2e/capa-8d-journey.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Complete 8D Journey', () => {
  test('can complete full 8D process from creation to closure', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[name="email"]', 'admin@acme.com');
    await page.fill('[name="password"]', 'admin123');
    await page.click('button[type="submit"]');

    // Create CAPA
    await page.goto('/capa/new');
    await page.fill('[name="title"]', 'Full Journey CAPA');
    await page.fill('[name="description"]', 'Testing complete 8D process');
    await page.selectOption('[name="type"]', 'corrective');
    await page.selectOption('[name="priority"]', 'high');
    await page.selectOption('[name="sourceType"]', 'customer_complaint');
    await page.fill('[name="customerName"]', 'Test Customer');
    await page.click('button:has-text("Create")');
    
    const capaUrl = page.url();
    
    // D0: Emergency Response
    await page.click('text=D0');
    await page.click('[name="emergencyResponseRequired"]');
    await page.selectOption('[name="responseType"]', 'containment');
    await page.fill('[name="symptomsDescription"]', 'Dimensional issue on parts');
    await page.click('button:has-text("Complete D0")');
    await expect(page.locator('text=D0 Completed')).toBeVisible();
    
    // D1: Team Formation
    await page.click('text=D1');
    // Add champion (already logged in user)
    // Add leader
    // Add team members
    await page.fill('[name="teamObjective"]', 'Find and fix root cause');
    await page.click('button:has-text("Complete D1")');
    await expect(page.locator('text=D1 Completed')).toBeVisible();
    
    // D2: Problem Description
    await page.click('text=D2');
    await page.fill('[name="problemStatement"]', 'Critical dimension measuring out of spec');
    await page.fill('[name="objectDescription"]', 'Part XYZ-123');
    await page.fill('[name="defectDescription"]', 'Dimension 3.72mm vs 3.50mm target');
    // Fill Is/Is Not
    await page.click('button:has-text("Verify Problem Statement")');
    await page.click('button:has-text("Complete D2")');
    
    // D3: Containment
    await page.click('text=D3');
    await page.click('button:has-text("Add Action")');
    await page.fill('[name="action"]', '100% inspection');
    await page.click('button:has-text("Save")');
    // Implement and verify action
    await page.click('button:has-text("Verify Effectiveness")');
    await page.click('button:has-text("Complete D3")');
    
    // D4: Root Cause
    await page.click('text=D4');
    await page.click('button:has-text("Add 5-Why")');
    // Fill 5-Why chain
    await page.fill('[name="rootCauseOccurrence"]', 'Tool wear not monitored');
    await page.click('button:has-text("Verify Occurrence")');
    await page.fill('[name="rootCauseEscape"]', 'SPC limits outdated');
    await page.click('button:has-text("Verify Escape")');
    await page.click('button:has-text("Complete D4")');
    
    // D5: Corrective Actions
    await page.click('text=D5');
    await page.click('button:has-text("Add Action")');
    await page.fill('[name="action"]', 'Implement tool life counter');
    await page.click('button:has-text("Save")');
    await page.click('button:has-text("Request Approval")');
    await page.click('button:has-text("Approve")');
    await page.click('button:has-text("Complete D5")');
    
    // D6: Implementation & Validation
    await page.click('text=D6');
    await page.click('button:has-text("Mark Implemented")');
    await page.click('button:has-text("Add Validation Test")');
    await page.fill('[name="testName"]', 'Capability Study');
    await page.click('button:has-text("Record Result")');
    await page.click('button:has-text("Verify Effectiveness")');
    await page.click('button:has-text("Complete D6")');
    
    // D7: Preventive Actions
    await page.click('text=D7');
    await page.click('button:has-text("Add Action")');
    await page.fill('[name="action"]', 'Deploy to all presses');
    await page.click('button:has-text("Save")');
    await page.click('button:has-text("Complete D7")');
    
    // D8: Closure
    await page.click('text=D8');
    // Mark all criteria met
    await page.click('button:has-text("Submit for Approval")');
    await page.click('button:has-text("Approve Closure")');
    await page.click('button:has-text("Close CAPA")');
    
    // Verify closed
    await expect(page.locator('text=Closed')).toBeVisible();
    
    // Verify in audit log
    await page.click('text=Audit Log');
    await expect(page.locator('text=capa_closed')).toBeVisible();
  });
});
```

---

## Validation Checklist

- [ ] ~56 unit tests pass
- [ ] ~96 integration tests pass
- [ ] ~25 tenancy tests pass
- [ ] ~15 E2E tests pass
- [ ] Full 8D journey test passes
- [ ] Total: ~192 tests
- [ ] No TypeScript errors
- [ ] Coverage > 90%
