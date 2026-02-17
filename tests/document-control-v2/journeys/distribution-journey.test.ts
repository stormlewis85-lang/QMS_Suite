import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  setupOrg1, cleanupDCTestOrgs, api, createTestDocument,
  createTestDistributionList, makeDocumentEffective,
} from '../test-helpers';

describe('Journey: Document Distribution', () => {
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

  it('should handle full distribution lifecycle: distribute → acknowledge → recall', async () => {
    // 1. Create and make document effective
    const doc = await createTestDocument(token);
    await makeDocumentEffective(token, doc.id);

    // 2. Create distribution list
    const dl = await createTestDistributionList(token);

    // 3. Distribute to list
    const { status: distStatus, data: distData } = await api(
      'POST', `/api/documents/${doc.id}/distribute`, token,
      { distributionListId: dl.id },
    );
    expect(distStatus).toBe(201);

    // 4. Check distributions exist
    const { data: distributions } = await api(
      'GET', `/api/documents/${doc.id}/distributions`, token,
    );
    expect(Array.isArray(distributions)).toBe(true);

    // 5. Check my pending acknowledgments
    const { data: myAcks } = await api('GET', '/api/my/acknowledgments', token);
    expect(Array.isArray(myAcks)).toBe(true);

    // 6. If there are acknowledgments, acknowledge one
    if (myAcks.length > 0) {
      const ackId = myAcks[0].id;
      const { status: ackStatus } = await api(
        'POST', `/api/distributions/${ackId}/acknowledge`, token,
        { method: 'click', comment: 'Read and understood' },
      );
      expect(ackStatus).toBe(200);

      // Verify acknowledgment recorded
      const { data: updatedDists } = await api(
        'GET', `/api/documents/${doc.id}/distributions`, token,
      );
      const acknowledged = updatedDists.find((d: any) => d.id === ackId);
      if (acknowledged) {
        expect(acknowledged.acknowledgedAt).toBeTruthy();
      }
    }

    // 7. Recall all distributions
    const { status: recallStatus } = await api(
      'POST', `/api/documents/${doc.id}/recall`, token,
      { reason: 'Document being revised' },
    );
    expect(recallStatus).toBe(200);
  });

  it('should reject distribution for non-effective documents', async () => {
    const doc = await createTestDocument(token); // draft

    const dl = await createTestDistributionList(token);
    const { status } = await api(
      'POST', `/api/documents/${doc.id}/distribute`, token,
      { distributionListId: dl.id },
    );
    expect(status).toBeGreaterThanOrEqual(400);
  });

  it('should distribute with additional ad-hoc recipients', async () => {
    const doc = await createTestDocument(token);
    await makeDocumentEffective(token, doc.id);

    const { status, data } = await api(
      'POST', `/api/documents/${doc.id}/distribute`, token,
      {
        additionalRecipients: [
          { name: 'Ad Hoc User', email: 'adhoc@test.local', role: 'operator' },
        ],
        comments: 'Special distribution for training',
      },
    );
    expect(status).toBe(201);
  });
});
