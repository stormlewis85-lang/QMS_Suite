import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  setupOrg1, cleanupDCTestOrgs, api, apiRaw, createTestDocument,
  BASE_URL,
} from '../test-helpers';

describe('File Management API', () => {
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

  async function uploadTestFile(documentId: string, filename = 'test-doc.txt', content = 'Test file content') {
    const blob = new Blob([content], { type: 'text/plain' });
    const formData = new FormData();
    formData.append('file', blob, filename);

    const res = await fetch(`${BASE_URL}/api/documents/${documentId}/files`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData,
    });
    const data = await res.json();
    return { status: res.status, data };
  }

  describe('POST /api/documents/:id/files', () => {
    it('should upload file and create record', async () => {
      const doc = await createTestDocument(token);
      const { status, data } = await uploadTestFile(doc.id);

      expect(status).toBe(201);
      expect(data.originalName).toBe('test-doc.txt');
      expect(data.documentId).toBe(doc.id);
    });

    it('should compute checksum', async () => {
      const doc = await createTestDocument(token);
      const { data } = await uploadTestFile(doc.id, 'checksummed.txt', 'checksum test content');

      // Field is checksumSha256 in the database
      expect(data.checksumSha256).toBeDefined();
      expect(data.checksumSha256.length).toBeGreaterThan(0);
    });

    it('should handle multiple file uploads', async () => {
      const doc = await createTestDocument(token);
      await uploadTestFile(doc.id, 'file1.txt', 'Content 1');
      await uploadTestFile(doc.id, 'file2.txt', 'Content 2');

      const { data } = await api('GET', `/api/documents/${doc.id}/files`, token);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('GET /api/documents/:id/files', () => {
    it('should list files for document', async () => {
      const doc = await createTestDocument(token);
      await uploadTestFile(doc.id, 'listed-file.txt');

      const { status, data } = await api('GET', `/api/documents/${doc.id}/files`, token);

      expect(status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /api/document-files/:id', () => {
    it('should get file metadata', async () => {
      const doc = await createTestDocument(token);
      const { data: uploaded } = await uploadTestFile(doc.id);

      const { status, data } = await api('GET', `/api/document-files/${uploaded.id}`, token);

      expect(status).toBe(200);
      expect(data.originalName).toBe('test-doc.txt');
    });
  });

  describe('GET /api/document-files/:id/download', () => {
    it('should return file with correct headers', async () => {
      const doc = await createTestDocument(token);
      const { data: uploaded } = await uploadTestFile(doc.id, 'download-test.txt', 'Download me');

      const res = await apiRaw('GET', `/api/document-files/${uploaded.id}/download`, token);

      expect(res.status).toBe(200);
      expect(res.headers.get('content-disposition')).toContain('download-test.txt');
    });
  });

  describe('DELETE /api/document-files/:id', () => {
    it('should delete file if document editable', async () => {
      const doc = await createTestDocument(token);
      const { data: uploaded } = await uploadTestFile(doc.id, 'to-delete.txt');

      const { status } = await api('DELETE', `/api/document-files/${uploaded.id}`, token);

      expect([200, 204]).toContain(status);

      // Verify deleted
      const { status: getStatus } = await api('GET', `/api/document-files/${uploaded.id}`, token);
      expect(getStatus).toBe(404);
    });
  });

  describe('GET /api/documents/search', () => {
    it('should handle search query', async () => {
      const { status, data } = await api('GET', '/api/documents/search?q=test', token);
      // May return 200 with empty results or actual results
      expect(status).toBe(200);
    });
  });
});
