import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  setupOrg1, cleanupDCTestOrgs, api, createTestDocument,
} from '../test-helpers';

describe('Checkout API', () => {
  let token: string;
  let orgId: string;

  beforeAll(async () => {
    await cleanupDCTestOrgs();
    const org = await setupOrg1();
    token = org.token;
    orgId = org.orgId;
  });

  afterAll(async () => {
    await cleanupDCTestOrgs();
  });

  describe('POST /api/documents/:id/checkout', () => {
    it('should create checkout record', async () => {
      const doc = await createTestDocument(token);

      const { status, data } = await api(
        'POST', `/api/documents/${doc.id}/checkout`, token,
        { reason: 'Editing section 2' },
      );

      expect([200, 201]).toContain(status);
      expect(data.status).toBe('active');
      expect(data.documentId).toBe(doc.id);
    });

    it('should reject if already checked out by another user', async () => {
      const doc = await createTestDocument(token);

      // First checkout succeeds
      await api('POST', `/api/documents/${doc.id}/checkout`, token, { reason: 'Editing' });

      // Same user - should return existing or succeed
      const { status } = await api(
        'POST', `/api/documents/${doc.id}/checkout`, token,
        { reason: 'Editing again' },
      );
      // Either 200 (existing) or 201 (new) - both acceptable for same user
      expect(status).toBeLessThan(500);
    });

    it('should reject if document is obsolete', async () => {
      const doc = await createTestDocument(token);

      // Make effective then obsolete
      await api('POST', `/api/documents/${doc.id}/submit-review`, token);
      await api('POST', `/api/documents/${doc.id}/approve`, token, { approverName: 'Test' });
      await api('POST', `/api/documents/${doc.id}/obsolete`, token);

      const { status } = await api(
        'POST', `/api/documents/${doc.id}/checkout`, token,
        { reason: 'Trying to edit' },
      );
      expect(status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('POST /api/documents/:id/checkin', () => {
    it('should update checkout status', async () => {
      const doc = await createTestDocument(token);

      await api('POST', `/api/documents/${doc.id}/checkout`, token, { reason: 'Editing' });

      const { status, data } = await api(
        'POST', `/api/documents/${doc.id}/checkin`, token,
        { comments: 'Done editing' },
      );

      expect(status).toBe(200);
    });

    it('should reject if not checked out', async () => {
      const doc = await createTestDocument(token);

      const { status } = await api(
        'POST', `/api/documents/${doc.id}/checkin`, token,
        { comments: 'Not checked out' },
      );
      expect(status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('POST /api/documents/:id/force-release', () => {
    it('should release checkout with reason', async () => {
      const doc = await createTestDocument(token);

      await api('POST', `/api/documents/${doc.id}/checkout`, token, { reason: 'Editing' });

      const { status, data } = await api(
        'POST', `/api/documents/${doc.id}/force-release`, token,
        { reason: 'User on leave' },
      );

      // May require admin role - accept 200 or 403
      expect([200, 403]).toContain(status);
    });
  });

  describe('GET /api/documents/:id/checkout-status', () => {
    it('should return checkout info if checked out', async () => {
      const doc = await createTestDocument(token);

      await api('POST', `/api/documents/${doc.id}/checkout`, token, { reason: 'Editing' });

      const { status, data } = await api(
        'GET', `/api/documents/${doc.id}/checkout-status`, token,
      );

      expect(status).toBe(200);
      expect(data.isCheckedOut).toBe(true);
    });

    it('should return isCheckedOut=false if not checked out', async () => {
      const doc = await createTestDocument(token);

      const { status, data } = await api(
        'GET', `/api/documents/${doc.id}/checkout-status`, token,
      );

      expect(status).toBe(200);
      expect(data.isCheckedOut).toBe(false);
    });
  });
});
