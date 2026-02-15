import 'dotenv/config';
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { db } from '../../server/db';
import { organization, user, session } from '@shared/schema';
import { eq, inArray } from 'drizzle-orm';

const BASE_URL = process.env.API_URL || 'http://localhost:3000';

const TEST_SLUG = 'test-organization';

const TEST_USER = {
  email: 'test@example.com',
  password: 'testPassword123',
  firstName: 'Test',
  lastName: 'User',
};

async function cleanup() {
  // Only clean up the specific test organization and its cascade data
  const testOrgs = await db.select({ id: organization.id })
    .from(organization)
    .where(eq(organization.slug, TEST_SLUG));

  if (testOrgs.length > 0) {
    const orgIds = testOrgs.map(o => o.id);
    // Delete sessions for users in test orgs
    const testUsers = await db.select({ id: user.id })
      .from(user)
      .where(inArray(user.orgId, orgIds));
    if (testUsers.length > 0) {
      const userIds = testUsers.map(u => u.id);
      await db.delete(session).where(inArray(session.userId, userIds));
    }
    await db.delete(user).where(inArray(user.orgId, orgIds));
    await db.delete(organization).where(eq(organization.slug, TEST_SLUG));
  }
}

describe('Auth API Integration', () => {
  beforeEach(async () => {
    await cleanup();
  });

  afterAll(async () => {
    await cleanup();
  });

  describe('POST /api/auth/register', () => {
    it('should create organization and admin user', async () => {
      const response = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationName: 'Test Organization',
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
      await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationName: 'Test Organization',
          email: 'first@example.com',
          password: TEST_USER.password,
          firstName: 'First',
          lastName: 'User',
        }),
      });

      // Second registration with same org name
      const response = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationName: 'Test Organization',
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
      await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationName: 'Test Organization',
          email: TEST_USER.email,
          password: TEST_USER.password,
          firstName: TEST_USER.firstName,
          lastName: TEST_USER.lastName,
        }),
      });
    });

    it('should login with valid credentials', async () => {
      const response = await fetch(`${BASE_URL}/api/auth/login`, {
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
      const response = await fetch(`${BASE_URL}/api/auth/login`, {
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
      const response = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationName: 'Test Organization',
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
      const response = await fetch(`${BASE_URL}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.user.email).toBe(TEST_USER.email);
    });

    it('should reject request without token', async () => {
      const response = await fetch(`${BASE_URL}/api/auth/me`);
      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    let token: string;

    beforeEach(async () => {
      const response = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationName: 'Test Organization',
          email: TEST_USER.email,
          password: TEST_USER.password,
          firstName: TEST_USER.firstName,
          lastName: TEST_USER.lastName,
        }),
      });
      token = (await response.json()).token;
    });

    it('should invalidate session on logout', async () => {
      await fetch(`${BASE_URL}/api/auth/logout`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const meResponse = await fetch(`${BASE_URL}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      expect(meResponse.status).toBe(401);
    });
  });
});
