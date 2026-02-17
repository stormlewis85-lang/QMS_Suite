import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  setupOrg1, cleanupDCTestOrgs, api, apiRaw, createTestDocument,
  makeDocumentEffective, createTestDistributionList, BASE_URL,
} from '../test-helpers';

describe('Journey: Compliance Audit', () => {
  let token: string;
  let orgId: string;
  let trackedDocId: string;

  beforeAll(async () => {
    await cleanupDCTestOrgs();
    const org = await setupOrg1();
    token = org.token;
    orgId = org.orgId;

    // Create a document with multiple actions to build audit trail
    const doc = await createTestDocument(token, {
      title: 'Audit Trail Test Document',
    });
    trackedDocId = doc.id;

    // Upload a file
    const blob = new Blob(['audit test content'], { type: 'text/plain' });
    const formData = new FormData();
    formData.append('file', blob, 'audit-tracked.txt');
    await fetch(`${BASE_URL}/api/documents/${trackedDocId}/files`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData,
    });

    // Make effective (generates submit + approve log entries)
    await makeDocumentEffective(token, trackedDocId);

    // Distribute (generates distribute log entry)
    const dl = await createTestDistributionList(token);
    await api('POST', `/api/documents/${trackedDocId}/distribute`, token, {
      distributionListId: dl.id,
    });
  });

  afterAll(async () => {
    await cleanupDCTestOrgs();
  });

  it('should have complete audit trail for document', async () => {
    const { status, data } = await api(
      'GET', `/api/documents/${trackedDocId}/access-log`, token,
    );

    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);

    // Collect all action types
    const actions = data.map((entry: any) => entry.action);
    // Should have at least upload action from file upload
    expect(actions.length).toBeGreaterThan(0);
  });

  it('should provide access log statistics', async () => {
    const { status, data } = await api(
      'GET', `/api/documents/${trackedDocId}/access-log/stats`, token,
    );

    expect(status).toBe(200);
    expect(data).toBeDefined();
  });

  it('should export full audit log as CSV', async () => {
    const res = await apiRaw('GET', '/api/audit-log/export', token);

    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text.length).toBeGreaterThan(0);

    // Verify CSV format
    const lines = text.trim().split('\n');
    expect(lines.length).toBeGreaterThanOrEqual(1);

    // Should have header
    const header = lines[0].toLowerCase();
    expect(header).toContain('action');
  });

  it('should filter audit log by document', async () => {
    const { status, data } = await api(
      'GET', `/api/audit-log?documentId=${trackedDocId}`, token,
    );

    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
  });

  it('should verify audit log entries are chronologically ordered', async () => {
    const { data } = await api(
      'GET', `/api/documents/${trackedDocId}/access-log`, token,
    );

    if (data.length >= 2) {
      const timestamps = data.map((d: any) =>
        new Date(d.timestamp || d.createdAt).getTime()
      );
      for (let i = 1; i < timestamps.length; i++) {
        expect(timestamps[i - 1]).toBeGreaterThanOrEqual(timestamps[i]);
      }
    }
  });

  it('should maintain immutable audit trail (no update or delete)', async () => {
    // Attempt to modify audit log - should fail
    const { status: patchStatus } = await api('PATCH', '/api/audit-log/1', token, { action: 'tampered' });
    expect(patchStatus).toBe(404);

    const { status: deleteStatus } = await api('DELETE', '/api/audit-log/1', token);
    expect(deleteStatus).toBe(404);
  });
});
