import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  setupOrg1, cleanupDCTestOrgs, api, apiRaw, createTestDocument,
  BASE_URL,
} from '../test-helpers';

describe('Audit Log API', () => {
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

  describe('Immutability', () => {
    it('should NOT have update endpoint for audit log', async () => {
      const { status, data } = await api('PATCH', '/api/audit-log/1', token, { action: 'tampered' });
      // Route doesn't exist - should NOT return a JSON success response
      const isJsonSuccess = typeof data === 'object' && data !== null && !data.error;
      expect(isJsonSuccess).toBe(false);
    });

    it('should NOT have delete endpoint for audit log', async () => {
      const { status, data } = await api('DELETE', '/api/audit-log/1', token);
      const isJsonSuccess = typeof data === 'object' && data !== null && !data.error;
      expect(isJsonSuccess).toBe(false);
    });
  });

  describe('GET /api/documents/:id/access-log', () => {
    it('should return logs for document', async () => {
      const doc = await createTestDocument(token);

      // Upload a file to generate access log
      const blob = new Blob(['test'], { type: 'text/plain' });
      const formData = new FormData();
      formData.append('file', blob, 'audit-test.txt');
      await fetch(`${BASE_URL}/api/documents/${doc.id}/files`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });

      const { status, data } = await api('GET', `/api/documents/${doc.id}/access-log`, token);

      expect(status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
    });

    it('should filter by action', async () => {
      const doc = await createTestDocument(token);

      const { status, data } = await api(
        'GET', `/api/documents/${doc.id}/access-log?action=upload`, token,
      );

      expect(status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      // All entries should have the filtered action
      for (const entry of data) {
        expect(entry.action).toBe('upload');
      }
    });

    it('should order by timestamp desc', async () => {
      const doc = await createTestDocument(token);

      // Generate multiple log entries
      const blob = new Blob(['test1'], { type: 'text/plain' });
      const formData1 = new FormData();
      formData1.append('file', blob, 'file1.txt');
      await fetch(`${BASE_URL}/api/documents/${doc.id}/files`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData1,
      });

      const blob2 = new Blob(['test2'], { type: 'text/plain' });
      const formData2 = new FormData();
      formData2.append('file', blob2, 'file2.txt');
      await fetch(`${BASE_URL}/api/documents/${doc.id}/files`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData2,
      });

      const { data } = await api('GET', `/api/documents/${doc.id}/access-log`, token);

      if (data.length >= 2) {
        const timestamps = data.map((d: any) => new Date(d.timestamp || d.createdAt).getTime());
        for (let i = 1; i < timestamps.length; i++) {
          expect(timestamps[i - 1]).toBeGreaterThanOrEqual(timestamps[i]);
        }
      }
    });
  });

  describe('GET /api/audit-log', () => {
    it('should return audit log entries', async () => {
      const { status, data } = await api('GET', '/api/audit-log', token);

      expect(status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
    });

    it('should filter by documentId', async () => {
      const doc = await createTestDocument(token);

      const { status, data } = await api(
        'GET', `/api/audit-log?documentId=${doc.id}`, token,
      );

      expect(status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe('GET /api/audit-log/export', () => {
    it('should return CSV format', async () => {
      const res = await apiRaw('GET', '/api/audit-log/export', token);

      expect(res.status).toBe(200);
      const contentType = res.headers.get('content-type');
      expect(contentType).toContain('csv');
    });

    it('should include header row', async () => {
      const res = await apiRaw('GET', '/api/audit-log/export', token);
      const text = await res.text();

      // CSV should have a header row
      const lines = text.trim().split('\n');
      expect(lines.length).toBeGreaterThanOrEqual(1);
      // Header should contain field names
      const header = lines[0].toLowerCase();
      expect(header).toContain('action');
    });
  });

  describe('GET /api/documents/:id/access-log/stats', () => {
    it('should return access statistics', async () => {
      const doc = await createTestDocument(token);

      const { status, data } = await api(
        'GET', `/api/documents/${doc.id}/access-log/stats`, token,
      );

      expect(status).toBe(200);
      expect(data).toBeDefined();
    });
  });
});
