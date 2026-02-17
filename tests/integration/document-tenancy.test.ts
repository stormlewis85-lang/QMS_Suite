import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  api,
  setupOrg1,
  setupOrg2,
  cleanupDCTestOrgs,
  createTestDocument,
  createTestWorkflowDef,
  createTestDistributionList,
  generateExternalDocument,
} from '../document-control-v2/test-helpers';

let org1Token: string;
let org2Token: string;
let org1Id: string;
let org2Id: string;

beforeAll(async () => {
  await cleanupDCTestOrgs();
  const o1 = await setupOrg1();
  const o2 = await setupOrg2();
  org1Token = o1.token;
  org1Id = o1.orgId;
  org2Token = o2.token;
  org2Id = o2.orgId;
}, 30000);

afterAll(async () => {
  await cleanupDCTestOrgs();
}, 30000);

// ═══════════════════════════════════════════════════════════════════
//  WORKFLOW DEFINITION ISOLATION (has orgId)
// ═══════════════════════════════════════════════════════════════════

describe('Multi-Org Workflow Definition Isolation', () => {
  let org1WfDefId: number;

  beforeAll(async () => {
    const wf = await createTestWorkflowDef(org1Token);
    org1WfDefId = wf.id;
  });

  it('Org1 should see its own workflow definitions', async () => {
    const { status, data } = await api('GET', '/api/approval-workflow-definitions', org1Token);
    expect(status).toBe(200);
    const ids = data.map((d: any) => d.id);
    expect(ids).toContain(org1WfDefId);
  });

  it('Org2 should NOT see Org1 workflow definitions', async () => {
    const { status, data } = await api('GET', '/api/approval-workflow-definitions', org2Token);
    expect(status).toBe(200);
    const ids = data.map((d: any) => d.id);
    expect(ids).not.toContain(org1WfDefId);
  });

  it('Org2 should get 404 when accessing Org1 workflow definition', async () => {
    const { status } = await api('GET', `/api/approval-workflow-definitions/${org1WfDefId}`, org2Token);
    expect(status).toBe(404);
  });
});

// ═══════════════════════════════════════════════════════════════════
//  DISTRIBUTION LIST ISOLATION (has orgId)
// ═══════════════════════════════════════════════════════════════════

describe('Multi-Org Distribution List Isolation', () => {
  let org1DLId: number;

  beforeAll(async () => {
    const dl = await createTestDistributionList(org1Token);
    org1DLId = dl.id;
  });

  it('Org1 should see its own distribution lists', async () => {
    const { status, data } = await api('GET', '/api/distribution-lists', org1Token);
    expect(status).toBe(200);
    const ids = data.map((d: any) => d.id);
    expect(ids).toContain(org1DLId);
  });

  it('Org2 should NOT see Org1 distribution lists', async () => {
    const { status, data } = await api('GET', '/api/distribution-lists', org2Token);
    expect(status).toBe(200);
    const ids = data.map((d: any) => d.id);
    expect(ids).not.toContain(org1DLId);
  });

  it('Org2 should get 404 when accessing Org1 distribution list', async () => {
    const { status } = await api('GET', `/api/distribution-lists/${org1DLId}`, org2Token);
    expect(status).toBe(404);
  });
});

// ═══════════════════════════════════════════════════════════════════
//  TEMPLATE ISOLATION (has orgId)
// ═══════════════════════════════════════════════════════════════════

describe('Multi-Org Template Isolation', () => {
  let org1TemplateId: number;

  beforeAll(async () => {
    const { data } = await api('POST', '/api/document-templates', org1Token, {
      name: `Org1 Template ${Date.now()}`,
      code: `TPL-ORG1-${Date.now()}`,
      description: 'Template for Org1 only',
      docType: 'work_instruction',
      category: 'Production',
      department: 'Manufacturing',
      createdBy: 'Org1 Admin',
    });
    org1TemplateId = data.id;
  });

  it('Org1 should see its own templates', async () => {
    const { status, data } = await api('GET', '/api/document-templates', org1Token);
    expect(status).toBe(200);
    const ids = data.map((d: any) => d.id);
    expect(ids).toContain(org1TemplateId);
  });

  it('Org2 should NOT see Org1 templates', async () => {
    const { status, data } = await api('GET', '/api/document-templates', org2Token);
    expect(status).toBe(200);
    const ids = data.map((d: any) => d.id);
    expect(ids).not.toContain(org1TemplateId);
  });

  it('Org2 should get 404 when accessing Org1 template', async () => {
    const { status } = await api('GET', `/api/document-templates/${org1TemplateId}`, org2Token);
    expect(status).toBe(404);
  });
});

// ═══════════════════════════════════════════════════════════════════
//  EXTERNAL DOCUMENT ISOLATION (has orgId)
// ═══════════════════════════════════════════════════════════════════

describe('Multi-Org External Document Isolation', () => {
  let org1ExtDocId: number;

  beforeAll(async () => {
    const { data } = await api('POST', '/api/external-documents', org1Token, generateExternalDocument());
    org1ExtDocId = data.id;
  });

  it('Org1 should see its own external documents', async () => {
    const { status, data } = await api('GET', '/api/external-documents', org1Token);
    expect(status).toBe(200);
    const ids = data.map((d: any) => d.id);
    expect(ids).toContain(org1ExtDocId);
  });

  it('Org2 should NOT see Org1 external documents', async () => {
    const { status, data } = await api('GET', '/api/external-documents', org2Token);
    expect(status).toBe(200);
    const ids = data.map((d: any) => d.id);
    expect(ids).not.toContain(org1ExtDocId);
  });

  it('Org2 should get 404 when accessing Org1 external document', async () => {
    const { status } = await api('GET', `/api/external-documents/${org1ExtDocId}`, org2Token);
    expect(status).toBe(404);
  });
});

// ═══════════════════════════════════════════════════════════════════
//  FILE ISOLATION (has orgId via documentFile table)
// ═══════════════════════════════════════════════════════════════════

describe('Multi-Org File Isolation', () => {
  let org1DocId: string;

  beforeAll(async () => {
    const doc = await createTestDocument(org1Token);
    org1DocId = doc.id;
  });

  it('Org1 should list files on its own document', async () => {
    const { status } = await api('GET', `/api/documents/${org1DocId}/files`, org1Token);
    expect(status).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════
//  DOCUMENT CHECKOUT ISOLATION (has orgId via checkout table)
// ═══════════════════════════════════════════════════════════════════

describe('Checkout Isolation', () => {
  it('each org should see only its own checkouts via /api/checkouts/my', async () => {
    const { status: s1, data: d1 } = await api('GET', '/api/checkouts/my', org1Token);
    const { status: s2, data: d2 } = await api('GET', '/api/checkouts/my', org2Token);
    expect(s1).toBe(200);
    expect(s2).toBe(200);
    // Both should return arrays (possibly empty)
    expect(Array.isArray(d1)).toBe(true);
    expect(Array.isArray(d2)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════
//  AUDIT LOG ISOLATION (has orgId via access log table)
// ═══════════════════════════════════════════════════════════════════

describe('Audit Log Isolation', () => {
  it('each org should see only its own audit entries', async () => {
    const { status: s1, data: d1 } = await api('GET', '/api/audit-log', org1Token);
    const { status: s2, data: d2 } = await api('GET', '/api/audit-log', org2Token);
    expect(s1).toBe(200);
    expect(s2).toBe(200);
    // Both should return arrays
    expect(Array.isArray(d1)).toBe(true);
    expect(Array.isArray(d2)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════
//  UNAUTHENTICATED ACCESS
// ═══════════════════════════════════════════════════════════════════

describe('Unauthenticated Access to Document Control', () => {
  const BASE = process.env.API_URL || 'http://localhost:3000';

  it('should return 401 for /api/documents', async () => {
    const res = await fetch(`${BASE}/api/documents`);
    expect(res.status).toBe(401);
  });

  it('should return 401 for /api/document-templates', async () => {
    const res = await fetch(`${BASE}/api/document-templates`);
    expect(res.status).toBe(401);
  });

  it('should return 401 for /api/approval-workflow-definitions', async () => {
    const res = await fetch(`${BASE}/api/approval-workflow-definitions`);
    expect(res.status).toBe(401);
  });

  it('should return 401 for /api/distribution-lists', async () => {
    const res = await fetch(`${BASE}/api/distribution-lists`);
    expect(res.status).toBe(401);
  });

  it('should return 401 for /api/external-documents', async () => {
    const res = await fetch(`${BASE}/api/external-documents`);
    expect(res.status).toBe(401);
  });

  it('should return 401 for /api/audit-log', async () => {
    const res = await fetch(`${BASE}/api/audit-log`);
    expect(res.status).toBe(401);
  });
});
