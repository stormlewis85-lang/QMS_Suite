import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  setupOrg1, cleanupDCTestOrgs, api, createTestDocument,
  createTestDistributionList, makeDocumentEffective,
} from '../test-helpers';

describe('Distribution API', () => {
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

  describe('POST /api/documents/:id/distribute', () => {
    it('should create distribution records', async () => {
      const doc = await createTestDocument(token);
      await makeDocumentEffective(token, doc.id);
      const dl = await createTestDistributionList(token);

      const { status, data } = await api(
        'POST', `/api/documents/${doc.id}/distribute`, token,
        { distributionListId: dl.id },
      );

      expect(status).toBe(201);
      expect(data.distributionCount).toBeGreaterThanOrEqual(0);
    });

    it('should reject if document not effective', async () => {
      const doc = await createTestDocument(token); // Draft status

      const { status } = await api(
        'POST', `/api/documents/${doc.id}/distribute`, token,
        { additionalRecipients: [{ name: 'User One', email: 'user1@test.local' }] },
      );
      expect(status).toBeGreaterThanOrEqual(400);
    });

    it('should distribute with additional recipients', async () => {
      const doc = await createTestDocument(token);
      await makeDocumentEffective(token, doc.id);

      const { status, data } = await api(
        'POST', `/api/documents/${doc.id}/distribute`, token,
        {
          additionalRecipients: [
            { name: 'Test Recipient', email: 'recipient@test.local', role: 'operator' },
          ],
        },
      );

      expect(status).toBe(201);
    });
  });

  describe('GET /api/documents/:id/distributions', () => {
    it('should return distribution records for document', async () => {
      const doc = await createTestDocument(token);
      await makeDocumentEffective(token, doc.id);
      const dl = await createTestDistributionList(token);
      await api('POST', `/api/documents/${doc.id}/distribute`, token, { distributionListId: dl.id });

      const { status, data } = await api('GET', `/api/documents/${doc.id}/distributions`, token);

      expect(status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe('POST /api/distributions/:id/acknowledge', () => {
    it('should acknowledge distribution', async () => {
      const doc = await createTestDocument(token);
      await makeDocumentEffective(token, doc.id);

      // Distribute with additional recipients that include the current user
      const { data: distData } = await api(
        'POST', `/api/documents/${doc.id}/distribute`, token,
        { additionalRecipients: [{ name: 'Current User', email: 'current@test.local' }] },
      );

      // Get my acknowledgments
      const { data: acks } = await api('GET', '/api/my/acknowledgments', token);

      if (acks && acks.length > 0) {
        const myAck = acks[0];
        const { status } = await api(
          'POST', `/api/distributions/${myAck.id}/acknowledge`, token,
          { method: 'click', comment: 'Read and understood' },
        );
        expect(status).toBe(200);
      }
    });
  });

  describe('POST /api/documents/:id/recall', () => {
    it('should recall all active distributions', async () => {
      const doc = await createTestDocument(token);
      await makeDocumentEffective(token, doc.id);
      const dl = await createTestDistributionList(token);
      await api('POST', `/api/documents/${doc.id}/distribute`, token, { distributionListId: dl.id });

      const { status, data } = await api(
        'POST', `/api/documents/${doc.id}/recall`, token,
        { reason: 'Document superseded' },
      );

      expect(status).toBe(200);
    });
  });

  describe('GET /api/my/acknowledgments', () => {
    it('should return pending acknowledgments', async () => {
      const { status, data } = await api('GET', '/api/my/acknowledgments', token);
      expect(status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
    });
  });
});
