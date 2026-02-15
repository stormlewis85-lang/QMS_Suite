# AGENT-TEST: Document Control v2 Test Suite

**Read RALPH_PATTERNS.md first. All DB, API, and UI work must be complete.**

---

## Mission

Create comprehensive test coverage:
- Unit tests for business logic
- Integration tests for API endpoints
- End-to-end journey tests for complete workflows

---

## Test Files to Create

```
tests/
├── document-control-v2/
│   ├── unit/
│   │   ├── workflow-engine.test.ts
│   │   ├── signature-verification.test.ts
│   │   ├── document-hash.test.ts
│   │   ├── revision-letter.test.ts
│   │   └── watermark-generation.test.ts
│   ├── integration/
│   │   ├── file-management.test.ts
│   │   ├── workflow-api.test.ts
│   │   ├── distribution-api.test.ts
│   │   ├── checkout-api.test.ts
│   │   └── audit-log.test.ts
│   └── journeys/
│       ├── new-document-journey.test.ts
│       ├── revision-journey.test.ts
│       ├── distribution-journey.test.ts
│       └── audit-journey.test.ts
```

---

## Unit Tests

### workflow-engine.test.ts

Test the workflow state machine logic.

```typescript
describe('Workflow Engine', () => {
  describe('Step Status Transitions', () => {
    it('should allow pending → in_progress', () => {});
    it('should allow pending → delegated', () => {});
    it('should allow in_progress → approved', () => {});
    it('should allow in_progress → rejected', () => {});
    it('should NOT allow approved → any other status', () => {});
    it('should NOT allow rejected → any other status', () => {});
  });

  describe('Workflow Instance Transitions', () => {
    it('should allow active → completed when all steps approved', () => {});
    it('should allow active → rejected when any step rejected', () => {});
    it('should allow active → cancelled by admin', () => {});
    it('should NOT allow completed → any other status', () => {});
  });

  describe('Step Assignment', () => {
    it('should assign to initiator for assigneeType=initiator', () => {});
    it('should assign to specific user for assigneeType=specific_user', () => {});
    it('should leave null for role_based (runtime assignment)', () => {});
  });

  describe('Workflow Advancement', () => {
    it('should create next step when current step approved', () => {});
    it('should complete workflow when last step approved', () => {});
    it('should set document to effective when workflow completed', () => {});
    it('should supersede previous revision when autoObsoletePrevious=true', () => {});
  });

  describe('Delegation', () => {
    it('should reject delegation when canDelegate=false', () => {});
    it('should create new step for delegatee', () => {});
    it('should mark original step as delegated', () => {});
    it('should preserve original assignee in delegatedFrom', () => {});
  });
});
```

### signature-verification.test.ts

Test e-signature integrity checking.

```typescript
describe('Signature Verification', () => {
  describe('Hash Computation', () => {
    it('should compute SHA-256 of document content', () => {});
    it('should include all file checksums in hash', () => {});
    it('should produce different hash when file added', () => {});
    it('should produce different hash when file content changes', () => {});
    it('should produce same hash for same content', () => {});
  });

  describe('Signature Validation', () => {
    it('should return valid=true when hash matches', () => {});
    it('should return valid=false when hash mismatches', () => {});
    it('should include all required 21 CFR Part 11 fields', () => {});
  });

  describe('Required Signature Fields', () => {
    it('should require signerName', () => {});
    it('should require signerId', () => {});
    it('should require timestamp in ISO format', () => {});
    it('should require ipAddress', () => {});
    it('should require meaning', () => {});
    it('should require documentHash', () => {});
    it('should require sessionId', () => {});
  });
});
```

### document-hash.test.ts

Test document hash computation.

```typescript
describe('Document Hash', () => {
  it('should include document number in hash', () => {});
  it('should include revision letter in hash', () => {});
  it('should include all file checksums sorted', () => {});
  it('should be deterministic for same input', () => {});
  it('should differ when any component changes', () => {});
});
```

### revision-letter.test.ts

Test revision letter incrementing logic.

```typescript
describe('Revision Letter', () => {
  it('should return A for first revision', () => {});
  it('should increment A → B', () => {});
  it('should increment Y → Z', () => {});
  it('should increment Z → AA', () => {});
  it('should increment AA → AB', () => {});
  it('should increment AZ → BA', () => {});
  it('should increment ZZ → AAA', () => {});
  it('should skip I, O, Q, S, X, Z (if configured)', () => {});
});
```

### watermark-generation.test.ts

Test watermark content and application.

```typescript
describe('Watermark Generation', () => {
  describe('Watermark Content', () => {
    it('should include CONTROLLED COPY text', () => {});
    it('should include recipient name', () => {});
    it('should include date in correct format', () => {});
    it('should include copy number when provided', () => {});
    it('should include document ID', () => {});
  });

  describe('PDF Watermarking', () => {
    it('should add watermark to all pages', () => {});
    it('should preserve original PDF content', () => {});
    it('should handle multi-page PDFs', () => {});
  });
});
```

---

## Integration Tests

### file-management.test.ts

```typescript
describe('File Management API', () => {
  describe('POST /api/documents/:id/files', () => {
    it('should upload file and create record', () => {});
    it('should compute checksum correctly', () => {});
    it('should reject duplicate checksum', () => {});
    it('should reject if document not editable', () => {});
    it('should set virusScanStatus to pending', () => {});
    it('should create access log entry', () => {});
  });

  describe('GET /api/document-files/:id/download', () => {
    it('should return file with correct headers', () => {});
    it('should create access log entry', () => {});
  });

  describe('GET /api/document-files/:id/download-watermarked', () => {
    it('should apply watermark to PDF', () => {});
    it('should include user name in watermark', () => {});
    it('should create access log with watermarked=true', () => {});
  });

  describe('DELETE /api/document-files/:id', () => {
    it('should delete file if document editable', () => {});
    it('should reject if document not editable', () => {});
    it('should create access log entry', () => {});
  });

  describe('GET /api/documents/search', () => {
    it('should search extractedText field', () => {});
    it('should return matching documents', () => {});
    it('should handle empty results', () => {});
  });
});
```

### workflow-api.test.ts

```typescript
describe('Workflow API', () => {
  describe('POST /api/documents/:id/start-workflow', () => {
    it('should create workflow instance', () => {});
    it('should create first step', () => {});
    it('should assign first step correctly', () => {});
    it('should update document status to review', () => {});
    it('should reject if document not draft', () => {});
    it('should reject if workflow already active', () => {});
  });

  describe('POST /api/workflow-steps/:id/approve', () => {
    it('should update step status to approved', () => {});
    it('should advance to next step', () => {});
    it('should complete workflow on last step', () => {});
    it('should capture signature when required', () => {});
    it('should reject if signature missing when required', () => {});
    it('should reject if not assigned to user', () => {});
    it('should create access log entry', () => {});
  });

  describe('POST /api/workflow-steps/:id/reject', () => {
    it('should update step status to rejected', () => {});
    it('should update workflow status to rejected', () => {});
    it('should return document to draft', () => {});
    it('should require comments', () => {});
  });

  describe('POST /api/workflow-steps/:id/delegate', () => {
    it('should create new step for delegatee', () => {});
    it('should mark original step as delegated', () => {});
    it('should reject if delegation not allowed', () => {});
  });

  describe('GET /api/my/approvals', () => {
    it('should return steps assigned to user', () => {});
    it('should include document info', () => {});
    it('should indicate overdue steps', () => {});
  });
});
```

### distribution-api.test.ts

```typescript
describe('Distribution API', () => {
  describe('POST /api/documents/:id/distribute', () => {
    it('should create distribution records for all recipients', () => {});
    it('should resolve distribution list recipients', () => {});
    it('should set acknowledgment due dates', () => {});
    it('should reject if document not effective', () => {});
    it('should create access log entry', () => {});
  });

  describe('POST /api/distributions/:id/acknowledge', () => {
    it('should update acknowledgedAt', () => {});
    it('should capture IP address', () => {});
    it('should reject if already acknowledged', () => {});
    it('should reject if not recipient', () => {});
  });

  describe('POST /api/documents/:id/recall', () => {
    it('should update all active distributions', () => {});
    it('should set recallReason', () => {});
    it('should update status to recalled', () => {});
  });

  describe('GET /api/my/acknowledgments', () => {
    it('should return pending acknowledgments', () => {});
    it('should indicate overdue items', () => {});
  });
});
```

### checkout-api.test.ts

```typescript
describe('Checkout API', () => {
  describe('POST /api/documents/:id/checkout', () => {
    it('should create checkout record', () => {});
    it('should set expectedCheckin', () => {});
    it('should reject if already checked out', () => {});
    it('should return existing checkout if same user', () => {});
    it('should reject if document obsolete', () => {});
  });

  describe('POST /api/documents/:id/checkin', () => {
    it('should update checkout status', () => {});
    it('should reject if not checked out to user', () => {});
  });

  describe('POST /api/documents/:id/force-release', () => {
    it('should release checkout with reason', () => {});
    it('should record forceReleasedBy', () => {});
  });

  describe('GET /api/documents/:id/checkout-status', () => {
    it('should return checkout info if checked out', () => {});
    it('should return isCheckedOut=false if not', () => {});
  });
});
```

### audit-log.test.ts

```typescript
describe('Audit Log API', () => {
  describe('Immutability', () => {
    it('should NOT have update endpoint', () => {});
    it('should NOT have delete endpoint', () => {});
  });

  describe('GET /api/documents/:id/access-log', () => {
    it('should return logs for document', () => {});
    it('should filter by action', () => {});
    it('should filter by user', () => {});
    it('should filter by date range', () => {});
    it('should order by timestamp desc', () => {});
  });

  describe('Log Hash Chain', () => {
    it('should include previous log hash in computation', () => {});
    it('should detect tampering', () => {});
  });

  describe('GET /api/audit-log/export', () => {
    it('should return CSV format', () => {});
    it('should include all required fields', () => {});
    it('should apply filters', () => {});
  });
});
```

---

## Journey Tests

### new-document-journey.test.ts

Complete flow: Create document from template → Upload files → Start workflow → Approve all steps → Distribute

```typescript
describe('Journey: New Document Creation', () => {
  it('should complete full document creation flow', async () => {
    // 1. Create document from template
    const doc = await api.post('/api/documents/from-template', {
      templateId: workInstructionTemplate.id,
      title: 'Test Assembly Work Instruction',
      linkedEntityType: 'part',
      linkedEntityId: testPart.id
    });
    expect(doc.document.docNumber).toMatch(/^WI-/);
    expect(doc.document.status).toBe('draft');
    expect(doc.revision.revision).toBe('A');

    // 2. Upload file
    const file = await api.upload(`/api/documents/${doc.document.id}/files`, testPdf);
    expect(file.virusScanStatus).toBe('pending');

    // 3. Start workflow
    const workflow = await api.post(`/api/documents/${doc.document.id}/start-workflow`, {
      workflowDefinitionId: standardWorkflow.id
    });
    expect(workflow.workflowInstance.status).toBe('active');
    expect(workflow.workflowInstance.currentStep).toBe(1);

    // Verify document status changed
    const docAfterStart = await api.get(`/api/documents/${doc.document.id}`);
    expect(docAfterStart.status).toBe('review');

    // 4. Author submits (step 1)
    const step1 = workflow.currentStep;
    await api.post(`/api/workflow-steps/${step1.id}/approve`, {
      comments: 'Ready for review'
    });

    // 5. Technical reviewer approves (step 2)
    const workflowAfter1 = await api.get(`/api/documents/${doc.document.id}/workflow`);
    const step2 = workflowAfter1.steps.find(s => s.stepNumber === 2);
    await api.post(`/api/workflow-steps/${step2.id}/approve`, {
      comments: 'Technically accurate'
    });

    // 6. Quality manager approves with signature (step 3)
    const workflowAfter2 = await api.get(`/api/documents/${doc.document.id}/workflow`);
    const step3 = workflowAfter2.steps.find(s => s.stepNumber === 3);
    await api.post(`/api/workflow-steps/${step3.id}/approve`, {
      comments: 'Approved for production',
      signature: {
        meaning: 'I approve this document for production use',
        password: 'testPassword123'
      }
    });

    // 7. Verify workflow completed
    const finalWorkflow = await api.get(`/api/documents/${doc.document.id}/workflow`);
    expect(finalWorkflow.instance.status).toBe('completed');

    // 8. Verify document is effective
    const finalDoc = await api.get(`/api/documents/${doc.document.id}`);
    expect(finalDoc.status).toBe('effective');

    // 9. Distribute document
    const distribution = await api.post(`/api/documents/${doc.document.id}/distribute`, {
      distributionListId: productionDistList.id
    });
    expect(distribution.distributionCount).toBeGreaterThan(0);

    // 10. Verify audit trail
    const auditLog = await api.get(`/api/documents/${doc.document.id}/access-log`);
    const actions = auditLog.map(l => l.action);
    expect(actions).toContain('upload');
    expect(actions).toContain('submit');
    expect(actions).toContain('approve');
    expect(actions).toContain('sign');
    expect(actions).toContain('distribute');
  });
});
```

### revision-journey.test.ts

Complete flow: Checkout → Edit → New revision → Approve → Old revision superseded

```typescript
describe('Journey: Document Revision', () => {
  it('should complete revision flow', async () => {
    // Start with effective document
    // 1. Checkout document
    const checkout = await api.post(`/api/documents/${effectiveDoc.id}/checkout`, {
      purpose: 'Updating section 3'
    });
    expect(checkout.status).toBe('active');

    // 2. Create new revision
    const newRev = await api.post(`/api/document-revisions`, {
      documentId: effectiveDoc.id
    });
    expect(newRev.revision).toBe('B'); // Incremented from A

    // 3. Upload updated file
    await api.upload(`/api/documents/${effectiveDoc.id}/files`, updatedPdf);

    // 4. Checkin
    await api.post(`/api/documents/${effectiveDoc.id}/checkin`, {
      comments: 'Section 3 updated'
    });

    // 5. Start workflow for new revision
    await api.post(`/api/documents/${effectiveDoc.id}/start-workflow`);

    // 6. Approve all steps
    // ... (abbreviated)

    // 7. Verify new revision is effective
    const doc = await api.get(`/api/documents/${effectiveDoc.id}`);
    expect(doc.currentRevision.revision).toBe('B');
    expect(doc.currentRevision.status).toBe('effective');

    // 8. Verify old revision is superseded
    const revisions = await api.get(`/api/document-revisions?documentId=${effectiveDoc.id}`);
    const revA = revisions.find(r => r.revision === 'A');
    expect(revA.status).toBe('superseded');
  });
});
```

### distribution-journey.test.ts

Complete flow: Distribute → Track acknowledgments → Recall when superseded

```typescript
describe('Journey: Document Distribution', () => {
  it('should handle full distribution lifecycle', async () => {
    // 1. Distribute to list
    const dist = await api.post(`/api/documents/${effectiveDoc.id}/distribute`, {
      distributionListId: allHandsList.id
    });
    const recordCount = dist.distributionCount;
    expect(recordCount).toBeGreaterThan(0);

    // 2. Check pending acknowledgments
    const pending = await api.get('/api/my/acknowledgments');
    expect(pending.length).toBeGreaterThan(0);

    // 3. Acknowledge
    const myDist = pending[0];
    await api.post(`/api/distributions/${myDist.id}/acknowledge`, {
      method: 'click',
      comment: 'Read and understood'
    });

    // 4. Verify acknowledgment recorded
    const updated = await api.get(`/api/documents/${effectiveDoc.id}/distributions`);
    const myRecord = updated.find(d => d.id === myDist.id);
    expect(myRecord.acknowledgedAt).toBeTruthy();

    // 5. Recall all
    const recall = await api.post(`/api/documents/${effectiveDoc.id}/recall`, {
      reason: 'Document superseded'
    });
    expect(recall.recalledCount).toBe(recordCount);

    // 6. Verify all recalled
    const afterRecall = await api.get(`/api/documents/${effectiveDoc.id}/distributions`);
    const allRecalled = afterRecall.every(d => d.status === 'recalled');
    expect(allRecalled).toBe(true);
  });
});
```

### audit-journey.test.ts

Verify complete audit trail for compliance audit simulation.

```typescript
describe('Journey: Compliance Audit', () => {
  it('should provide complete audit trail', async () => {
    // 1. Get all effective documents
    const docs = await api.get('/api/documents?status=effective');

    // 2. For each document, verify required audit data exists
    for (const doc of docs) {
      // Has valid signatures
      const signatures = await api.get(`/api/documents/${doc.id}/signatures`);
      for (const sig of signatures) {
        const verification = await api.get(`/api/signatures/${sig.stepId}/verify`);
        expect(verification.valid).toBe(true);
      }

      // Has distribution records
      const distributions = await api.get(`/api/documents/${doc.id}/distributions`);
      expect(distributions.length).toBeGreaterThan(0);

      // Has access log
      const accessLog = await api.get(`/api/documents/${doc.id}/access-log`);
      expect(accessLog.length).toBeGreaterThan(0);

      // Access log chain is intact (no tampering)
      // ... verify hash chain
    }

    // 3. Export full audit log
    const exportCsv = await api.get('/api/audit-log/export?format=csv');
    expect(exportCsv).toContain('timestamp');
    expect(exportCsv).toContain('action');
  });
});
```

---

## Test Data Generators

Create helpers for generating test data:

```typescript
// test-helpers/generators.ts

export function generateTestDocument(overrides = {}) {
  return {
    title: `Test Document ${Date.now()}`,
    type: 'work_instruction',
    category: 'Production',
    department: 'Manufacturing',
    owner: 'test-user',
    ...overrides
  };
}

export function generateTestWorkflow(overrides = {}) {
  return {
    name: `Test Workflow ${Date.now()}`,
    code: `WF-TEST-${Date.now()}`,
    appliesToDocTypes: ['work_instruction'],
    steps: [
      { step: 1, name: 'Submit', role: 'author', assigneeType: 'initiator', required: true, dueDays: 5 },
      { step: 2, name: 'Approve', role: 'approver', assigneeType: 'role_based', required: true, dueDays: 3 }
    ],
    ...overrides
  };
}

export function generateTestFile(): Buffer {
  // Return minimal valid PDF
  return Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj...');
}
```

---

## Tenancy Isolation Tests

### Multi-Org Document Isolation
- Create documents in two different orgs
- Verify Org A cannot see/access Org B's documents
- Verify cross-org document access returns 404 (not 403)

### Cross-Org Workflow Isolation
- Create workflow definitions in different orgs
- Verify Org A cannot use Org B's workflow definitions
- Verify workflow instances are isolated

### Cross-Org Template Isolation
- Create templates in different orgs
- Verify "create from template" only shows own org's templates

---

## Validation Checklist

- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] All journey tests pass
- [ ] Test coverage > 80% for new code
- [ ] No flaky tests
- [ ] Tests run in < 5 minutes
- [ ] Tests are independent (no shared state)
- [ ] Test data is cleaned up after each test
- [ ] Mocks are used appropriately for external services
