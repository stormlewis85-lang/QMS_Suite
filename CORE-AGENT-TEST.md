# CORE-AGENT-TEST: Core Platform MVP - Test Layer

## READ FIRST
1. Read `RALPH_PATTERNS.md` for conventions
2. Study existing test patterns in `pfmea-journey-tests.ts`
3. Ensure CORE-AGENT-DB, CORE-AGENT-API, and CORE-AGENT-UI have completed

---

## Mission
Comprehensive test coverage for authentication and multi-tenancy:
- Unit tests for auth utilities
- Integration tests for auth API endpoints
- Integration tests for tenancy isolation
- E2E tests for login/register flows

---

## Phase 1: Unit Tests

### 1.1 Create tests/unit/auth.test.ts

```typescript
import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, generateSessionToken, sanitizeUser } from '../../server/auth';

describe('Auth Utilities', () => {
  describe('Password Hashing', () => {
    it('should hash a password', async () => {
      const password = 'testPassword123';
      const hash = await hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.startsWith('$2')).toBe(true); // bcrypt prefix
    });

    it('should verify correct password', async () => {
      const password = 'testPassword123';
      const hash = await hashPassword(password);
      
      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'testPassword123';
      const hash = await hashPassword(password);
      
      const isValid = await verifyPassword('wrongPassword', hash);
      expect(isValid).toBe(false);
    });

    it('should generate different hashes for same password', async () => {
      const password = 'testPassword123';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);
      
      expect(hash1).not.toBe(hash2); // Salt makes them different
    });
  });

  describe('Session Token Generation', () => {
    it('should generate a 64-character hex token', () => {
      const token = generateSessionToken();
      
      expect(token).toBeDefined();
      expect(token.length).toBe(64);
      expect(/^[a-f0-9]+$/.test(token)).toBe(true);
    });

    it('should generate unique tokens', () => {
      const tokens = new Set<string>();
      for (let i = 0; i < 100; i++) {
        tokens.add(generateSessionToken());
      }
      expect(tokens.size).toBe(100);
    });
  });

  describe('User Sanitization', () => {
    it('should remove sensitive fields from user object', () => {
      const mockUser = {
        id: 'user-123',
        orgId: 'org-456',
        email: 'test@example.com',
        passwordHash: 'secret-hash-should-not-appear',
        firstName: 'John',
        lastName: 'Doe',
        role: 'engineer' as const,
        status: 'active' as const,
        lastLoginAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        organization: {
          id: 'org-456',
          name: 'Test Org',
          slug: 'test-org',
          settings: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      const sanitized = sanitizeUser(mockUser as any);

      expect(sanitized.id).toBe('user-123');
      expect(sanitized.email).toBe('test@example.com');
      expect(sanitized.firstName).toBe('John');
      expect(sanitized.role).toBe('engineer');
      
      // Should NOT have password hash
      expect((sanitized as any).passwordHash).toBeUndefined();
    });
  });
});
```

---

## Phase 2: API Integration Tests

### 2.1 Create tests/integration/auth-api.test.ts

```typescript
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { db } from '../../server/db';
import { organization, user, session } from '@shared/schema';
import { eq } from 'drizzle-orm';

const TEST_ORG = {
  name: 'Test Organization',
  slug: 'test-organization',
};

const TEST_USER = {
  email: 'test@example.com',
  password: 'testPassword123',
  firstName: 'Test',
  lastName: 'User',
};

describe('Auth API Integration', () => {
  let baseUrl: string;

  beforeEach(async () => {
    baseUrl = process.env.API_URL || 'http://localhost:5000';
    // Clean up test data
    await db.delete(session);
    await db.delete(user);
    await db.delete(organization).where(eq(organization.slug, TEST_ORG.slug));
  });

  afterAll(async () => {
    await db.delete(session);
    await db.delete(user);
    await db.delete(organization).where(eq(organization.slug, TEST_ORG.slug));
  });

  describe('POST /api/auth/register', () => {
    it('should create organization and admin user', async () => {
      const response = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationName: TEST_ORG.name,
          email: TEST_USER.email,
          password: TEST_USER.password,
          firstName: TEST_USER.firstName,
          lastName: TEST_USER.lastName,
        }),
      });

      expect(response.status).toBe(201);
      
      const data = await response.json();
      expect(data.user).toBeDefined();
      expect(data.user.email).toBe(TEST_USER.email);
      expect(data.user.role).toBe('admin');
      expect(data.token).toBeDefined();
      expect(data.user.passwordHash).toBeUndefined();
    });

    it('should reject duplicate organization slug', async () => {
      // First registration
      await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationName: TEST_ORG.name,
          email: 'first@example.com',
          password: TEST_USER.password,
          firstName: 'First',
          lastName: 'User',
        }),
      });

      // Second registration with same org name
      const response = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationName: TEST_ORG.name,
          email: 'second@example.com',
          password: TEST_USER.password,
          firstName: 'Second',
          lastName: 'User',
        }),
      });

      expect(response.status).toBe(409);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationName: TEST_ORG.name,
          email: TEST_USER.email,
          password: TEST_USER.password,
          firstName: TEST_USER.firstName,
          lastName: TEST_USER.lastName,
        }),
      });
    });

    it('should login with valid credentials', async () => {
      const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: TEST_USER.email,
          password: TEST_USER.password,
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.user).toBeDefined();
      expect(data.token).toBeDefined();
    });

    it('should reject invalid password', async () => {
      const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: TEST_USER.email,
          password: 'wrongPassword',
        }),
      });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/auth/me', () => {
    let token: string;

    beforeEach(async () => {
      const response = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationName: TEST_ORG.name,
          email: TEST_USER.email,
          password: TEST_USER.password,
          firstName: TEST_USER.firstName,
          lastName: TEST_USER.lastName,
        }),
      });
      const data = await response.json();
      token = data.token;
    });

    it('should return current user with valid token', async () => {
      const response = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.user.email).toBe(TEST_USER.email);
    });

    it('should reject request without token', async () => {
      const response = await fetch(`${baseUrl}/api/auth/me`);
      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    let token: string;

    beforeEach(async () => {
      const response = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationName: TEST_ORG.name,
          email: TEST_USER.email,
          password: TEST_USER.password,
          firstName: TEST_USER.firstName,
          lastName: TEST_USER.lastName,
        }),
      });
      token = (await response.json()).token;
    });

    it('should invalidate session on logout', async () => {
      await fetch(`${baseUrl}/api/auth/logout`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const meResponse = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      expect(meResponse.status).toBe(401);
    });
  });
});
```

---

## Phase 3: Tenancy Isolation Tests

### 3.1 Create tests/integration/tenancy.test.ts

```typescript
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { db } from '../../server/db';
import { organization, user, session, part } from '@shared/schema';
import { eq } from 'drizzle-orm';

describe('Multi-Tenancy Isolation', () => {
  let baseUrl: string;
  let org1Token: string;
  let org2Token: string;
  let org1PartId: string;

  beforeEach(async () => {
    baseUrl = process.env.API_URL || 'http://localhost:5000';

    // Clean up
    await db.delete(session);
    await db.delete(part);
    await db.delete(user);
    await db.delete(organization).where(eq(organization.slug, 'organization-one'));
    await db.delete(organization).where(eq(organization.slug, 'organization-two'));

    // Create two organizations
    const reg1 = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organizationName: 'Organization One',
        email: 'admin@org1.com',
        password: 'password123',
        firstName: 'Admin',
        lastName: 'One',
      }),
    });
    org1Token = (await reg1.json()).token;

    const reg2 = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organizationName: 'Organization Two',
        email: 'admin@org2.com',
        password: 'password123',
        firstName: 'Admin',
        lastName: 'Two',
      }),
    });
    org2Token = (await reg2.json()).token;

    // Create a part in org1
    const partResponse = await fetch(`${baseUrl}/api/parts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${org1Token}`,
      },
      body: JSON.stringify({
        partNumber: 'ORG1-PART-001',
        partName: 'Org 1 Part',
        customer: 'Customer A',
        program: 'Program A',
        plant: 'Plant A',
      }),
    });
    org1PartId = (await partResponse.json()).id;
  });

  afterAll(async () => {
    await db.delete(session);
    await db.delete(part);
    await db.delete(user);
    await db.delete(organization).where(eq(organization.slug, 'organization-one'));
    await db.delete(organization).where(eq(organization.slug, 'organization-two'));
  });

  describe('Data Isolation', () => {
    it('should only return parts from own organization', async () => {
      // Org1 sees their part
      const org1Response = await fetch(`${baseUrl}/api/parts`, {
        headers: { 'Authorization': `Bearer ${org1Token}` },
      });
      const org1Parts = await org1Response.json();
      expect(org1Parts.length).toBe(1);
      expect(org1Parts[0].partNumber).toBe('ORG1-PART-001');

      // Org2 does NOT see org1's part
      const org2Response = await fetch(`${baseUrl}/api/parts`, {
        headers: { 'Authorization': `Bearer ${org2Token}` },
      });
      const org2Parts = await org2Response.json();
      expect(org2Parts.length).toBe(0);
    });

    it('should return 404 when accessing another org resource', async () => {
      const response = await fetch(`${baseUrl}/api/parts/${org1PartId}`, {
        headers: { 'Authorization': `Bearer ${org2Token}` },
      });
      expect(response.status).toBe(404);
    });
  });

  describe('Cross-Org Protection', () => {
    it('should prevent updating resources from another org', async () => {
      const response = await fetch(`${baseUrl}/api/parts/${org1PartId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${org2Token}`,
        },
        body: JSON.stringify({ partName: 'Hacked' }),
      });
      expect(response.status).toBe(404);
    });

    it('should prevent deleting resources from another org', async () => {
      const response = await fetch(`${baseUrl}/api/parts/${org1PartId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${org2Token}` },
      });
      expect(response.status).toBe(404);

      // Verify part still exists
      const verify = await fetch(`${baseUrl}/api/parts/${org1PartId}`, {
        headers: { 'Authorization': `Bearer ${org1Token}` },
      });
      expect(verify.status).toBe(200);
    });
  });
});
```

---

## Phase 4: E2E Tests

### 4.1 Create tests/e2e/auth-flow.spec.ts

```typescript
import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  const uniqueEmail = `e2e-${Date.now()}@test.com`;

  test.describe('Registration', () => {
    test('should register a new organization', async ({ page }) => {
      await page.goto('/register');

      await page.fill('input[name="organizationName"]', 'E2E Test Org');
      await page.fill('input[name="firstName"]', 'E2E');
      await page.fill('input[name="lastName"]', 'Tester');
      await page.fill('input[name="email"]', uniqueEmail);
      await page.fill('input[name="password"]', 'testPassword123');
      await page.fill('input[name="confirmPassword"]', 'testPassword123');

      await page.click('button[type="submit"]');
      await expect(page).toHaveURL('/');
    });

    test('should show error for mismatched passwords', async ({ page }) => {
      await page.goto('/register');

      await page.fill('input[name="password"]', 'password123');
      await page.fill('input[name="confirmPassword"]', 'different123');
      await page.click('button[type="submit"]');

      await expect(page.getByText('Passwords do not match')).toBeVisible();
    });
  });

  test.describe('Login', () => {
    test('should login with valid credentials', async ({ page, request }) => {
      // Ensure user exists
      await request.post('/api/auth/register', {
        data: {
          organizationName: 'Login Test Org',
          email: 'login-e2e@test.com',
          password: 'loginTest123',
          firstName: 'Login',
          lastName: 'Test',
        },
      });

      await page.goto('/login');
      await page.fill('input[id="email"]', 'login-e2e@test.com');
      await page.fill('input[id="password"]', 'loginTest123');
      await page.click('button[type="submit"]');

      await expect(page).toHaveURL('/');
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[id="email"]', 'wrong@test.com');
      await page.fill('input[id="password"]', 'wrongPassword');
      await page.click('button[type="submit"]');

      await expect(page.getByText('Invalid credentials')).toBeVisible();
    });

    test('should redirect unauthenticated users to login', async ({ page }) => {
      await page.context().clearCookies();
      await page.goto('/parts');
      await expect(page).toHaveURL('/login');
    });
  });

  test.describe('Logout', () => {
    test('should logout and redirect to login', async ({ page, request }) => {
      // Setup and login
      await request.post('/api/auth/register', {
        data: {
          organizationName: 'Logout Test Org',
          email: 'logout-e2e@test.com',
          password: 'logoutTest123',
          firstName: 'Logout',
          lastName: 'Test',
        },
      });

      await page.goto('/login');
      await page.fill('input[id="email"]', 'logout-e2e@test.com');
      await page.fill('input[id="password"]', 'logoutTest123');
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL('/');

      // Logout
      await page.click('button:has-text("Sign out")');
      await expect(page).toHaveURL('/login');
    });
  });
});
```

---

## Validation Checklist

After completing CORE-AGENT-TEST:

- [ ] All unit tests pass: `npm run test:unit`
- [ ] All integration tests pass: `npm run test:integration`
- [ ] All E2E tests pass: `npm run test:e2e`
- [ ] No TypeScript errors in test files

---

## Test Commands

Add to `package.json` scripts:

```json
{
  "scripts": {
    "test": "vitest",
    "test:unit": "vitest run tests/unit",
    "test:integration": "vitest run tests/integration",
    "test:e2e": "playwright test"
  }
}
```

---

## Files Created

| File | Description |
|------|-------------|
| `tests/unit/auth.test.ts` | Unit tests for auth utilities |
| `tests/integration/auth-api.test.ts` | API integration tests |
| `tests/integration/tenancy.test.ts` | Multi-tenancy isolation tests |
| `tests/e2e/auth-flow.spec.ts` | E2E tests for UI flows |

---

## Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- tests/unit/auth.test.ts

# Run E2E tests
npx playwright test

# Run E2E with UI
npx playwright test --ui
```
