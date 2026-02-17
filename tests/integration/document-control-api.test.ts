import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  BASE_URL,
  api,
  apiRaw,
  setupOrg1,
  cleanupDCTestOrgs,
  createTestDocument,
  createTestWorkflowDef,
  createTestDistributionList,
  makeDocumentEffective,
  generateDocument,
  generateExternalDocument,
} from '../document-control-v2/test-helpers';

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
}, 30000);

// ═══════════════════════════════════════════════════════════════════
//  DOCUMENT CRUD
// ═══════════════════════════════════════════════════════════════════

describe('Document CRUD API', () => {
  let docId: string;

  it('POST /api/documents – should create a document', async () => {
    const { status, data } = await api('POST', '/api/documents', token, generateDocument());
    expect(status).toBe(201);
    expect(data.id).toBeDefined();
    expect(data.status).toBe('draft');
    docId = data.id;
  });

  it('GET /api/documents – should list documents', async () => {
    const { status, data } = await api('GET', '/api/documents', token);
    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
  });

  it('GET /api/documents/:id – should return single document', async () => {
    const { status, data } = await api('GET', `/api/documents/${docId}`, token);
    expect(status).toBe(200);
    expect(data.id).toBe(docId);
  });

  it('PATCH /api/documents/:id – should update document', async () => {
    const { status, data } = await api('PATCH', `/api/documents/${docId}`, token, {
      title: 'Updated Title',
    });
    expect(status).toBe(200);
    expect(data.title).toBe('Updated Title');
  });

  it('DELETE /api/documents/:id – should delete document', async () => {
    const temp = await createTestDocument(token);
    const { status } = await api('DELETE', `/api/documents/${temp.id}`, token);
    expect(status).toBe(204);
    const { status: getStatus } = await api('GET', `/api/documents/${temp.id}`, token);
    expect(getStatus).toBe(404);
  });

  it('GET /api/documents/metrics – should return metrics', async () => {
    const { status, data } = await api('GET', '/api/documents/metrics', token);
    expect(status).toBe(200);
    expect(data.total).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════
//  DOCUMENT REVISIONS
// ═══════════════════════════════════════════════════════════════════

describe('Document Revisions API', () => {
  let docId: string;

  beforeAll(async () => {
    const doc = await createTestDocument(token);
    docId = doc.id;
  });

  it('GET /api/documents/:id/revisions – should list revisions', async () => {
    const { status, data } = await api('GET', `/api/documents/${docId}/revisions`, token);
    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    // Document creation should auto-create an initial revision
    expect(data.length).toBeGreaterThanOrEqual(1);
  });

  it('POST /api/documents/:id/revisions – should create revision on effective doc', async () => {
    // Creating a new revision requires the document to be effective
    const effDoc = await createTestDocument(token);
    await makeDocumentEffective(token, effDoc.id);
    const { status, data } = await api('POST', `/api/documents/${effDoc.id}/revisions`, token, {
      changeDescription: 'Updated section 3',
    });
    expect(status).toBe(201);
    expect(data.documentId || data.document_id).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════
//  FILE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════

describe('File Management API', () => {
  let docId: string;
  let fileId: number;

  beforeAll(async () => {
    const doc = await createTestDocument(token);
    docId = doc.id;
  });

  async function uploadTestFile(documentId: string, filename = 'test.txt', content = 'Hello World') {
    const blob = new Blob([content], { type: 'text/plain' });
    const form = new FormData();
    form.append('file', blob, filename);

    const res = await fetch(`${BASE_URL}/api/documents/${documentId}/files`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: form,
    });
    return { status: res.status, data: await res.json() };
  }

  it('POST /api/documents/:id/files – should upload file', async () => {
    const { status, data } = await uploadTestFile(docId);
    expect(status).toBe(201);
    expect(data.id).toBeDefined();
    fileId = data.id;
  });

  it('GET /api/documents/:id/files – should list files', async () => {
    const { status, data } = await api('GET', `/api/documents/${docId}/files`, token);
    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
  });

  it('GET /api/document-files/:id – should return file metadata', async () => {
    if (!fileId) return;
    const { status, data } = await api('GET', `/api/document-files/${fileId}`, token);
    expect(status).toBe(200);
    expect(data.originalName).toBe('test.txt');
  });

  it('GET /api/document-files/:id/download – should download file', async () => {
    if (!fileId) return;
    const res = await apiRaw('GET', `/api/document-files/${fileId}/download`, token);
    expect(res.status).toBe(200);
    const disposition = res.headers.get('content-disposition');
    expect(disposition).toBeTruthy();
  });

  it('DELETE /api/document-files/:id – should delete file', async () => {
    // Upload a fresh file specifically for deletion (avoids FK from access log on previous file)
    const { data: freshFile } = await uploadTestFile(docId, 'delete-me.txt', 'delete this');
    expect(freshFile.id).toBeDefined();
    const { status } = await api('DELETE', `/api/document-files/${freshFile.id}`, token);
    // May be 204 (success) or 500 (FK constraint from access log) - both indicate delete was attempted
    expect([200, 204]).toContain(status);
  });

  it('GET /api/documents/search – should handle search query', async () => {
    const { status } = await api('GET', '/api/documents/search?q=test', token);
    expect(status).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════
//  WORKFLOW
// ═══════════════════════════════════════════════════════════════════

describe('Workflow API', () => {
  let docId: string;
  let workflowDefId: number;

  beforeAll(async () => {
    const wfDef = await createTestWorkflowDef(token, {
      steps: JSON.stringify([
        { name: 'Submit', assigneeType: 'initiator', assigneeValue: '', dueDays: 5, signatureRequired: false, signatureMeaning: '', canDelegate: false },
      ]),
    });
    workflowDefId = wfDef.id;
  });

  it('POST /api/documents/:id/start-workflow – should start workflow', async () => {
    const doc = await createTestDocument(token);
    docId = doc.id;
    // Verify the document has a revision (auto-created)
    const { data: revs } = await api('GET', `/api/documents/${docId}/revisions`, token);
    expect(revs.length).toBeGreaterThan(0);

    const { status, data } = await api('POST', `/api/documents/${docId}/start-workflow`, token, {
      workflowDefinitionId: workflowDefId,
    });
    expect(status).toBe(201);
    expect(data.workflowInstance).toBeDefined();
  });

  it('should update document to review status', async () => {
    const { data } = await api('GET', `/api/documents/${docId}`, token);
    expect(data.status).toBe('review');
  });

  it('should reject starting workflow on non-draft document', async () => {
    const { status } = await api('POST', `/api/documents/${docId}/start-workflow`, token, {
      workflowDefinitionId: workflowDefId,
    });
    expect([400, 409]).toContain(status);
  });

  it('POST /api/workflow-steps/:id/approve – should approve step', async () => {
    // Create a fresh document with workflow for approve test
    const approveDoc = await createTestDocument(token);
    const { status: startStatus, data: startData } = await api('POST', `/api/documents/${approveDoc.id}/start-workflow`, token, {
      workflowDefinitionId: workflowDefId,
    });
    expect(startStatus).toBe(201);
    // Use the step from the start-workflow response directly
    const step = startData.currentStep || (startData.steps && startData.steps[0]);
    expect(step).toBeDefined();
    expect(step.status).toBe('pending');

    const { status } = await api('POST', `/api/workflow-steps/${step.id}/approve`, token, {
      comments: 'Approved',
    });
    expect(status).toBe(200);
  });

  it('POST /api/workflow-steps/:id/reject – should reject step', async () => {
    const doc2 = await createTestDocument(token);
    const { status: wfStatus, data: wfData } = await api('POST', `/api/documents/${doc2.id}/start-workflow`, token, {
      workflowDefinitionId: workflowDefId,
    });
    expect(wfStatus).toBe(201);
    const step = wfData.currentStep || (wfData.steps && wfData.steps[0]);
    expect(step).toBeDefined();

    const { status } = await api('POST', `/api/workflow-steps/${step.id}/reject`, token, {
      comments: 'Needs rework',
    });
    expect(status).toBe(200);
    // Document should return to draft
    const { data: docAfter } = await api('GET', `/api/documents/${doc2.id}`, token);
    expect(docAfter.status).toBe('draft');
  });

  it('GET /api/documents/:id/workflow – should return workflow details', async () => {
    // docId already has a completed workflow
    const { status, data } = await api('GET', `/api/documents/${docId}/workflow`, token);
    expect(status).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════
//  CHECKOUT
// ═══════════════════════════════════════════════════════════════════

describe('Checkout API', () => {
  let docId: string;

  beforeAll(async () => {
    const doc = await createTestDocument(token);
    docId = doc.id;
  });

  it('POST /api/documents/:id/checkout – should check out document', async () => {
    const { status, data } = await api('POST', `/api/documents/${docId}/checkout`, token, {
      purpose: 'Editing section 2',
    });
    expect(status).toBe(201);
    expect(data.status).toBe('active');
  });

  it('GET /api/documents/:id/checkout-status – should show checked out', async () => {
    const { status, data } = await api('GET', `/api/documents/${docId}/checkout-status`, token);
    expect(status).toBe(200);
    expect(data.isCheckedOut).toBe(true);
  });

  it('POST /api/documents/:id/checkout – same user gets existing checkout', async () => {
    const { status, data } = await api('POST', `/api/documents/${docId}/checkout`, token, {
      purpose: 'Again',
    });
    expect(status).toBe(200);
  });

  it('POST /api/documents/:id/checkin – should check in document', async () => {
    const { status } = await api('POST', `/api/documents/${docId}/checkin`, token, {
      comments: 'Done editing',
    });
    expect(status).toBe(200);
  });

  it('GET /api/documents/:id/checkout-status – should show not checked out', async () => {
    const { data } = await api('GET', `/api/documents/${docId}/checkout-status`, token);
    expect(data.isCheckedOut).toBe(false);
  });

  it('POST /api/documents/:id/force-release – should force release', async () => {
    // Check out again
    await api('POST', `/api/documents/${docId}/checkout`, token, { purpose: 'Force test' });
    const { status } = await api('POST', `/api/documents/${docId}/force-release`, token, {
      reason: 'Emergency override',
    });
    expect(status).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════
//  DISTRIBUTION
// ═══════════════════════════════════════════════════════════════════

describe('Distribution API', () => {
  let docId: string;
  let distListId: number;

  beforeAll(async () => {
    const doc = await createTestDocument(token);
    docId = doc.id;
    await makeDocumentEffective(token, docId);
    const dl = await createTestDistributionList(token);
    distListId = dl.id;
  });

  it('POST /api/documents/:id/distribute – should distribute effective document', async () => {
    const { status, data } = await api('POST', `/api/documents/${docId}/distribute`, token, {
      distributionListId: distListId,
    });
    expect(status).toBe(201);
  });

  it('POST /api/documents/:id/distribute – should reject non-effective document', async () => {
    const draftDoc = await createTestDocument(token);
    const { status } = await api('POST', `/api/documents/${draftDoc.id}/distribute`, token, {
      distributionListId: distListId,
    });
    expect([400, 403]).toContain(status);
  });

  it('GET /api/documents/:id/distributions – should list distribution records', async () => {
    const { status, data } = await api('GET', `/api/documents/${docId}/distributions`, token);
    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
  });

  it('GET /api/my/acknowledgments – should return pending acknowledgments', async () => {
    const { status, data } = await api('GET', '/api/my/acknowledgments', token);
    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
  });

  it('POST /api/documents/:id/recall – should recall distributions', async () => {
    const { status } = await api('POST', `/api/documents/${docId}/recall`, token, {
      reason: 'Document updated',
    });
    expect(status).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════
//  DISTRIBUTION LISTS
// ═══════════════════════════════════════════════════════════════════

describe('Distribution Lists API', () => {
  let listId: number;

  it('POST /api/distribution-lists – should create list', async () => {
    const dl = await createTestDistributionList(token);
    expect(dl.id).toBeDefined();
    listId = dl.id;
  });

  it('GET /api/distribution-lists – should list all', async () => {
    const { status, data } = await api('GET', '/api/distribution-lists', token);
    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
  });

  it('GET /api/distribution-lists/:id – should return single list', async () => {
    const { status, data } = await api('GET', `/api/distribution-lists/${listId}`, token);
    expect(status).toBe(200);
    expect(data.id).toBe(listId);
  });

  it('PATCH /api/distribution-lists/:id – should update list', async () => {
    const { status, data } = await api('PATCH', `/api/distribution-lists/${listId}`, token, {
      name: 'Updated DL Name',
    });
    expect(status).toBe(200);
    expect(data.name).toBe('Updated DL Name');
  });
});

// ═══════════════════════════════════════════════════════════════════
//  TEMPLATES
// ═══════════════════════════════════════════════════════════════════

describe('Document Templates API', () => {
  let templateId: number;

  it('POST /api/document-templates – should create template', async () => {
    const { status, data } = await api('POST', '/api/document-templates', token, {
      name: `Test Template ${Date.now()}`,
      code: `TPL-TEST-${Date.now()}`,
      description: 'Test template',
      docType: 'work_instruction',
      category: 'Testing',
      department: 'QA',
      createdBy: 'Test Runner',
    });
    expect(status).toBe(201);
    expect(data.id).toBeDefined();
    templateId = data.id;
  });

  it('GET /api/document-templates – should list templates', async () => {
    const { status, data } = await api('GET', '/api/document-templates', token);
    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
  });

  it('GET /api/document-templates/:id – should return single template', async () => {
    if (!templateId) return;
    const { status, data } = await api('GET', `/api/document-templates/${templateId}`, token);
    expect(status).toBe(200);
    expect(data.id).toBe(templateId);
  });

  it('PATCH /api/document-templates/:id – should update template', async () => {
    if (!templateId) return;
    const { status, data } = await api('PATCH', `/api/document-templates/${templateId}`, token, {
      description: 'Updated description',
    });
    expect(status).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════
//  WORKFLOW DEFINITIONS
// ═══════════════════════════════════════════════════════════════════

describe('Approval Workflow Definitions API', () => {
  let defId: number;

  it('POST /api/approval-workflow-definitions – should create definition', async () => {
    const def = await createTestWorkflowDef(token);
    expect(def.id).toBeDefined();
    defId = def.id;
  });

  it('GET /api/approval-workflow-definitions – should list definitions', async () => {
    const { status, data } = await api('GET', '/api/approval-workflow-definitions', token);
    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
  });

  it('GET /api/approval-workflow-definitions/:id – should return single', async () => {
    const { status, data } = await api('GET', `/api/approval-workflow-definitions/${defId}`, token);
    expect(status).toBe(200);
    expect(data.id).toBe(defId);
  });

  it('PATCH /api/approval-workflow-definitions/:id – should update', async () => {
    const { status } = await api('PATCH', `/api/approval-workflow-definitions/${defId}`, token, {
      description: 'Updated workflow',
    });
    expect(status).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════
//  EXTERNAL DOCUMENTS
// ═══════════════════════════════════════════════════════════════════

describe('External Documents API', () => {
  let extDocId: number;

  it('POST /api/external-documents – should create external doc', async () => {
    const { status, data } = await api('POST', '/api/external-documents', token, generateExternalDocument());
    expect(status).toBe(201);
    expect(data.id).toBeDefined();
    extDocId = data.id;
  });

  it('GET /api/external-documents – should list external docs', async () => {
    const { status, data } = await api('GET', '/api/external-documents', token);
    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
  });

  it('GET /api/external-documents/:id – should return single', async () => {
    const { status, data } = await api('GET', `/api/external-documents/${extDocId}`, token);
    expect(status).toBe(200);
    expect(data.id).toBe(extDocId);
  });

  it('PATCH /api/external-documents/:id – should update', async () => {
    const { status } = await api('PATCH', `/api/external-documents/${extDocId}`, token, {
      title: 'Updated External Doc',
    });
    expect(status).toBe(200);
  });

  it('DELETE /api/external-documents/:id – should delete', async () => {
    const { status } = await api('DELETE', `/api/external-documents/${extDocId}`, token);
    expect(status).toBe(204);
  });
});

// ═══════════════════════════════════════════════════════════════════
//  AUDIT LOG
// ═══════════════════════════════════════════════════════════════════

describe('Audit Log API', () => {
  let trackedDocId: string;

  beforeAll(async () => {
    const doc = await createTestDocument(token, { title: 'Audit Tracked Doc' });
    trackedDocId = doc.id;

    // Generate some audit entries by uploading a file
    const blob = new Blob(['audit test content'], { type: 'text/plain' });
    const form = new FormData();
    form.append('file', blob, 'audit-test.txt');
    await fetch(`${BASE_URL}/api/documents/${trackedDocId}/files`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: form,
    });
  });

  it('GET /api/documents/:id/access-log – should return log entries', async () => {
    const { status, data } = await api('GET', `/api/documents/${trackedDocId}/access-log`, token);
    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
  });

  it('GET /api/documents/:id/access-log/stats – should return stats', async () => {
    const { status, data } = await api('GET', `/api/documents/${trackedDocId}/access-log/stats`, token);
    expect(status).toBe(200);
    expect(data).toBeDefined();
  });

  it('GET /api/audit-log – should return global audit entries', async () => {
    const { status, data } = await api('GET', '/api/audit-log', token);
    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
  });

  it('GET /api/audit-log/export – should export CSV', async () => {
    const res = await apiRaw('GET', '/api/audit-log/export', token);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toBeTruthy();
  });

  it('should NOT have PUT/PATCH/DELETE for access logs (immutability)', async () => {
    const { status: patchStatus } = await api('PATCH', `/api/documents/${trackedDocId}/access-log`, token, {});
    expect([404, 405]).toContain(patchStatus);

    const { status: delStatus } = await api('DELETE', `/api/documents/${trackedDocId}/access-log`, token);
    expect([404, 405]).toContain(delStatus);
  });
});

// ═══════════════════════════════════════════════════════════════════
//  DOCUMENT REVIEW & STATUS TRANSITIONS
// ═══════════════════════════════════════════════════════════════════

describe('Document Review & Status Transitions API', () => {
  it('POST /api/documents/:id/submit-review – should move to review', async () => {
    const doc = await createTestDocument(token);
    const { status } = await api('POST', `/api/documents/${doc.id}/submit-review`, token);
    expect(status).toBe(200);
    const { data } = await api('GET', `/api/documents/${doc.id}`, token);
    expect(data.status).toBe('review');
  });

  it('POST /api/documents/:id/approve – should move to effective', async () => {
    const doc = await createTestDocument(token);
    await api('POST', `/api/documents/${doc.id}/submit-review`, token);
    const { status } = await api('POST', `/api/documents/${doc.id}/approve`, token, {
      approverName: 'Test Approver',
    });
    expect(status).toBe(200);
    const { data } = await api('GET', `/api/documents/${doc.id}`, token);
    expect(data.status).toBe('effective');
  });

  it('POST /api/documents/:id/reject – should return to draft', async () => {
    const doc = await createTestDocument(token);
    await api('POST', `/api/documents/${doc.id}/submit-review`, token);
    const { status } = await api('POST', `/api/documents/${doc.id}/reject`, token, {
      comments: 'Needs revision',
    });
    expect(status).toBe(200);
    const { data } = await api('GET', `/api/documents/${doc.id}`, token);
    expect(data.status).toBe('draft');
  });

  it('POST /api/documents/:id/obsolete – should mark as obsolete', async () => {
    const doc = await createTestDocument(token);
    await makeDocumentEffective(token, doc.id);
    const { status } = await api('POST', `/api/documents/${doc.id}/obsolete`, token, {
      reason: 'Replaced by new procedure',
    });
    expect(status).toBe(200);
    const { data } = await api('GET', `/api/documents/${doc.id}`, token);
    expect(data.status).toBe('obsolete');
  });
});

// ═══════════════════════════════════════════════════════════════════
//  DOCUMENT COMMENTS
// ═══════════════════════════════════════════════════════════════════

describe('Document Comments API', () => {
  let docId: string;

  beforeAll(async () => {
    const doc = await createTestDocument(token);
    docId = doc.id;
  });

  it('POST /api/documents/:id/comments – should create comment', async () => {
    const { status, data } = await api('POST', `/api/documents/${docId}/comments`, token, {
      content: 'This is a test comment',
      commentType: 'general',
      createdBy: 'Test Runner',
    });
    expect(status).toBe(201);
    expect(data.id).toBeDefined();
  });

  it('GET /api/documents/:id/comments – should list comments', async () => {
    const { status, data } = await api('GET', `/api/documents/${docId}/comments`, token);
    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════
//  DOCUMENT LINKS
// ═══════════════════════════════════════════════════════════════════

describe('Document Links API', () => {
  let docId: string;

  beforeAll(async () => {
    const doc = await createTestDocument(token);
    docId = doc.id;
  });

  it('GET /api/documents/:id/links – should list links (initially empty)', async () => {
    const { status, data } = await api('GET', `/api/documents/${docId}/links`, token);
    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════
//  PRINT LOGS
// ═══════════════════════════════════════════════════════════════════

describe('Print Logs API', () => {
  let docId: string;

  beforeAll(async () => {
    const doc = await createTestDocument(token);
    docId = doc.id;

    // Print route requires at least one file on the document
    const blob = new Blob(['print test content'], { type: 'text/plain' });
    const form = new FormData();
    form.append('file', blob, 'print-test.txt');
    await fetch(`${BASE_URL}/api/documents/${docId}/files`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: form,
    });
  });

  it('POST /api/documents/:id/print – should log print', async () => {
    const { status } = await api('POST', `/api/documents/${docId}/print`, token, {
      copies: 2,
      purpose: 'Audit copy',
    });
    expect(status).toBe(201);
  });

  it('GET /api/documents/:id/print-logs – should list print logs', async () => {
    const { status, data } = await api('GET', `/api/documents/${docId}/print-logs`, token);
    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
  });
});
