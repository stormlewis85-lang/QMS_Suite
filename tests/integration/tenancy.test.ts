import 'dotenv/config';
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { db } from '../../server/db';
import { organization, user, session, part } from '@shared/schema';
import { eq, or, inArray } from 'drizzle-orm';

const BASE_URL = process.env.API_URL || 'http://localhost:3000';

const ORG1_SLUG = 'organization-one';
const ORG2_SLUG = 'organization-two';

async function cleanup() {
  // Find test orgs
  const testOrgs = await db.select({ id: organization.id })
    .from(organization)
    .where(or(
      eq(organization.slug, ORG1_SLUG),
      eq(organization.slug, ORG2_SLUG),
    ));

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
    // Delete parts in test orgs
    await db.delete(part).where(inArray(part.orgId, orgIds));
    // Delete users and orgs
    await db.delete(user).where(inArray(user.orgId, orgIds));
    await db.delete(organization).where(or(
      eq(organization.slug, ORG1_SLUG),
      eq(organization.slug, ORG2_SLUG),
    ));
  }
}

describe('Multi-Tenancy Isolation', () => {
  let org1Token: string;
  let org2Token: string;

  beforeEach(async () => {
    await cleanup();

    // Create two organizations
    const reg1 = await fetch(`${BASE_URL}/api/auth/register`, {
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

    const reg2 = await fetch(`${BASE_URL}/api/auth/register`, {
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
    await fetch(`${BASE_URL}/api/parts`, {
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
  });

  afterAll(async () => {
    await cleanup();
  });

  describe('Data Isolation', () => {
    it('should only return parts from own organization', async () => {
      // Org1 sees their part
      const org1Response = await fetch(`${BASE_URL}/api/parts`, {
        headers: { 'Authorization': `Bearer ${org1Token}` },
      });
      const org1Parts = await org1Response.json();
      expect(org1Parts.length).toBe(1);
      expect(org1Parts[0].partNumber).toBe('ORG1-PART-001');

      // Org2 does NOT see org1's part
      const org2Response = await fetch(`${BASE_URL}/api/parts`, {
        headers: { 'Authorization': `Bearer ${org2Token}` },
      });
      const org2Parts = await org2Response.json();
      expect(org2Parts.length).toBe(0);
    });
  });

  describe('Unauthenticated Access', () => {
    it('should return 401 when accessing parts without token', async () => {
      const response = await fetch(`${BASE_URL}/api/parts`);
      expect(response.status).toBe(401);
    });

    it('should return 401 when accessing processes without token', async () => {
      const response = await fetch(`${BASE_URL}/api/processes`);
      expect(response.status).toBe(401);
    });

    it('should return 401 when accessing equipment without token', async () => {
      const response = await fetch(`${BASE_URL}/api/equipment`);
      expect(response.status).toBe(401);
    });
  });
});
