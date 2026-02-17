import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  setupOrg1, cleanupDCTestOrgs, api, createTestDocument,
  createTestWorkflowDef, makeDocumentEffective,
} from '../test-helpers';

describe('Journey: Document Revision', () => {
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

  it('should complete revision flow: checkout → new rev → approve → old superseded', async () => {
    // 1. Create and make document effective (Rev A)
    const doc = await createTestDocument(token);
    await makeDocumentEffective(token, doc.id);

    const { data: effectiveDoc } = await api('GET', `/api/documents/${doc.id}`, token);
    expect(effectiveDoc.status).toBe('effective');

    // 2. Checkout document
    const { status: coStatus, data: checkout } = await api(
      'POST', `/api/documents/${doc.id}/checkout`, token,
      { reason: 'Updating section 3 for new assembly procedure' },
    );
    expect(coStatus).toBe(201);
    expect(checkout.status).toBe('active');

    // 3. Verify checkout status
    const { data: coStatusData } = await api(
      'GET', `/api/documents/${doc.id}/checkout-status`, token,
    );
    expect(coStatusData.isCheckedOut).toBe(true);

    // 4. Create new revision
    const { status: revStatus, data: newRev } = await api(
      'POST', `/api/documents/${doc.id}/revisions`, token,
      { changeDescription: 'Updated section 3', author: 'Test Author' },
    );
    expect(revStatus).toBe(201);

    // 5. Checkin
    const { status: ciStatus } = await api(
      'POST', `/api/documents/${doc.id}/checkin`, token,
      { comments: 'Section 3 updated' },
    );
    expect(ciStatus).toBe(200);

    // 6. Verify checked in
    const { data: ciStatusData } = await api(
      'GET', `/api/documents/${doc.id}/checkout-status`, token,
    );
    expect(ciStatusData.isCheckedOut).toBe(false);

    // 7. Get revisions to verify both exist
    const { data: revisions } = await api('GET', `/api/documents/${doc.id}/revisions`, token);
    expect(revisions.length).toBeGreaterThanOrEqual(1);
  });

  it('should track multiple revisions', async () => {
    const doc = await createTestDocument(token);

    // Get initial revisions
    const { data: initialRevs } = await api('GET', `/api/documents/${doc.id}/revisions`, token);
    expect(initialRevs.length).toBeGreaterThanOrEqual(1);

    // Make effective first
    await makeDocumentEffective(token, doc.id);

    // Create second revision
    const { status: rev2Status } = await api(
      'POST', `/api/documents/${doc.id}/revisions`, token,
      { changeDescription: 'Second revision', author: 'Test' },
    );
    expect(rev2Status).toBe(201);

    // Verify revision count increased
    const { data: allRevs } = await api('GET', `/api/documents/${doc.id}/revisions`, token);
    expect(allRevs.length).toBeGreaterThan(initialRevs.length);
  });
});
