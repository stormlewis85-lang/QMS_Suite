import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  setupOrg1, cleanupDCTestOrgs, api, createTestDocument,
  createTestWorkflowDef, createTestDistributionList, BASE_URL,
} from '../test-helpers';

describe('Journey: New Document Creation', () => {
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

  it('should complete full document creation flow: create → upload → workflow → approve → distribute', async () => {
    // 1. Create document
    const doc = await createTestDocument(token, {
      title: 'Assembly Work Instruction',
      type: 'work_instruction',
      category: 'Production',
      department: 'Manufacturing',
    });
    expect(doc.status).toBe('draft');
    expect(doc.id).toBeDefined();

    // 2. Upload file
    const blob = new Blob(['%PDF-1.4 Test content for assembly instructions'], { type: 'application/pdf' });
    const formData = new FormData();
    formData.append('file', blob, 'assembly-instructions.pdf');
    const uploadRes = await fetch(`${BASE_URL}/api/documents/${doc.id}/files`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData,
    });
    expect(uploadRes.status).toBe(201);
    const file = await uploadRes.json();
    expect(file.originalName).toBe('assembly-instructions.pdf');

    // 3. Create and start single-step workflow for quick test
    const wfDef = await createTestWorkflowDef(token, {
      steps: JSON.stringify([
        { name: 'Author Submit', assigneeType: 'initiator', assigneeValue: '', dueDays: 5, signatureRequired: false, signatureMeaning: '', canDelegate: false },
      ]),
    });

    const { status: wfStatus, data: wfData } = await api(
      'POST', `/api/documents/${doc.id}/start-workflow`, token,
      { workflowDefinitionId: wfDef.id },
    );
    expect(wfStatus).toBe(201);
    expect(wfData.workflowInstance.status).toBe('active');

    // 4. Verify document status changed to review
    const { data: docInReview } = await api('GET', `/api/documents/${doc.id}`, token);
    expect(docInReview.status).toBe('review');

    // 5. Approve step (single step = workflow completes)
    const step1Id = wfData.steps[0].id;
    const { status: approveStatus } = await api(
      'POST', `/api/workflow-steps/${step1Id}/approve`, token,
      { comments: 'Ready for production' },
    );
    expect(approveStatus).toBe(200);

    // 6. Verify workflow completed
    const { data: wfFinal } = await api('GET', `/api/documents/${doc.id}/workflow`, token);
    // After completion, active instance is null (moved to history)
    if (wfFinal.instance) {
      expect(wfFinal.instance.status).toBe('completed');
    } else {
      expect(wfFinal.hasActiveWorkflow).toBe(false);
      expect(wfFinal.history).toBeDefined();
      const completed = wfFinal.history.find((h: any) => h.status === 'completed');
      expect(completed).toBeDefined();
    }

    // 7. Verify document is effective
    const { data: effectiveDoc } = await api('GET', `/api/documents/${doc.id}`, token);
    expect(effectiveDoc.status).toBe('effective');

    // 8. Distribute document
    const dl = await createTestDistributionList(token);
    const { status: distStatus, data: distData } = await api(
      'POST', `/api/documents/${doc.id}/distribute`, token,
      { distributionListId: dl.id },
    );
    expect(distStatus).toBe(201);

    // 9. Verify audit trail exists
    const { data: accessLog } = await api('GET', `/api/documents/${doc.id}/access-log`, token);
    expect(Array.isArray(accessLog)).toBe(true);
  });

  it('should handle rejection and resubmission', async () => {
    // 1. Create document
    const doc = await createTestDocument(token);

    // 2. Create workflow
    const wfDef = await createTestWorkflowDef(token, {
      steps: JSON.stringify([
        { name: 'Review', assigneeType: 'initiator', assigneeValue: '', dueDays: 3, signatureRequired: false, signatureMeaning: '', canDelegate: false },
      ]),
    });

    // 3. Start workflow
    const { data: wf } = await api(
      'POST', `/api/documents/${doc.id}/start-workflow`, token,
      { workflowDefinitionId: wfDef.id },
    );

    // 4. Reject
    const stepId = wf.steps[0].id;
    await api('POST', `/api/workflow-steps/${stepId}/reject`, token, {
      comments: 'Needs more detail in section 3',
    });

    // 5. Verify document back to draft
    const { data: draftDoc } = await api('GET', `/api/documents/${doc.id}`, token);
    expect(draftDoc.status).toBe('draft');

    // 6. Start new workflow (resubmit)
    const wfDef2 = await createTestWorkflowDef(token, {
      steps: JSON.stringify([
        { name: 'Re-Review', assigneeType: 'initiator', assigneeValue: '', dueDays: 3, signatureRequired: false, signatureMeaning: '', canDelegate: false },
      ]),
    });
    const { status: wf2Status, data: wf2 } = await api(
      'POST', `/api/documents/${doc.id}/start-workflow`, token,
      { workflowDefinitionId: wfDef2.id },
    );
    expect(wf2Status).toBe(201);

    // 7. Approve this time
    const step2Id = wf2.steps[0].id;
    await api('POST', `/api/workflow-steps/${step2Id}/approve`, token, {
      comments: 'Now complete',
    });

    // 8. Verify effective
    const { data: finalDoc } = await api('GET', `/api/documents/${doc.id}`, token);
    expect(finalDoc.status).toBe('effective');
  });
});
