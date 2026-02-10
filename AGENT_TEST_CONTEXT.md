# AGENT-TEST CONTEXT: Document Control Module
## Comprehensive Test Suite (REFINED v2)

---

## YOUR ROLE
You are AGENT-TEST. Your job is to write a comprehensive automated test suite that validates the entire Document Control module.

## CRITICAL RULES
1. **ONLY CREATE** this file:
   - `tests/document-control-tests.ts`
2. **DO NOT TOUCH** any other files
3. Follow the exact same pattern as existing test files
4. Tests should be runnable with: `npx tsx tests/document-control-tests.ts`

## PREREQUISITES
- All previous agents completed their work
- Server is running on localhost:5000 (check existing tests for correct port)
- Seed data is loaded

---

## COMPLETE TEST FILE

```typescript
/**
 * Document Control Module - Comprehensive Test Suite
 * Tests all CRUD, workflow, distribution, review, and link functionality
 * 
 * Run with: npx tsx tests/document-control-tests.ts
 */

const API_URL = process.env.API_URL || "http://localhost:5000";

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

const results: TestResult[] = [];

// Store IDs from creation for use in later tests
let testDocId: string;
let testRevisionId: string;
let testDistributionId: string;
let testReviewId: string;
let testLinkId: string;

async function test(name: string, fn: () => Promise<void>): Promise<void> {
  const start = Date.now();
  try {
    await fn();
    const duration = Date.now() - start;
    results.push({ name, passed: true, duration });
    console.log(`  ✅ ${name} (${duration}ms)`);
  } catch (error: any) {
    const duration = Date.now() - start;
    results.push({ name, passed: false, error: error.message, duration });
    console.log(`  ❌ ${name}: ${error.message}`);
  }
}

async function api(
  method: string, 
  path: string, 
  body?: any
): Promise<{ status: number; data: any }> {
  const options: RequestInit = {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
  };
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  const res = await fetch(`${API_URL}${path}`, options);
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEqual(actual: any, expected: any, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`);
  }
}

function assertExists(value: any, message: string): void {
  if (value === null || value === undefined) {
    throw new Error(`${message}: value is null or undefined`);
  }
}

// ============================================================
// TEST SUITE
// ============================================================

async function runTests() {
  console.log("\n" + "=".repeat(60));
  console.log("DOCUMENT CONTROL MODULE - TEST SUITE");
  console.log("=".repeat(60) + "\n");

  // ----------------------------------------------------------
  // SECTION 1: Document CRUD
  // ----------------------------------------------------------
  console.log("\n📁 SECTION 1: Document CRUD\n");

  await test("1.1 GET /api/documents returns array with seed data", async () => {
    const { status, data } = await api("GET", "/api/documents");
    assertEqual(status, 200, "Status code");
    assert(Array.isArray(data), "Response should be an array");
    assert(data.length >= 5, "Should have at least 5 seed documents");
  });

  await test("1.2 POST /api/documents creates new document", async () => {
    const { status, data } = await api("POST", "/api/documents", {
      docNumber: "TEST-DC-001",
      title: "Test Document for Automated Testing",
      type: "work_instruction",
      category: "Testing",
      department: "QA",
      owner: "Test Runner",
      description: "This is a test document created by automated tests",
      reviewCycleDays: 365,
    });
    assertEqual(status, 201, "Status code");
    assertExists(data.id, "Should return document with ID");
    assertEqual(data.status, "draft", "New document should be draft");
    assertEqual(data.currentRev, "A", "Should start at Rev A");
    testDocId = data.id;
  });

  await test("1.3 GET /api/documents/:id returns created document", async () => {
    const { status, data } = await api("GET", `/api/documents/${testDocId}`);
    assertEqual(status, 200, "Status code");
    assertEqual(data.docNumber, "TEST-DC-001", "Doc number should match");
    assertEqual(data.owner, "Test Runner", "Owner should match");
  });

  await test("1.4 PATCH /api/documents/:id updates title", async () => {
    const { status, data } = await api("PATCH", `/api/documents/${testDocId}`, {
      title: "Updated Test Document Title",
    });
    assertEqual(status, 200, "Status code");
    assertEqual(data.title, "Updated Test Document Title", "Title should be updated");
  });

  await test("1.5 GET /api/documents?type=work_instruction filters correctly", async () => {
    const { status, data } = await api("GET", "/api/documents?type=work_instruction");
    assertEqual(status, 200, "Status code");
    assert(Array.isArray(data), "Response should be an array");
    assert(data.every((d: any) => d.type === "work_instruction"), "All docs should be work_instruction type");
  });

  // ----------------------------------------------------------
  // SECTION 2: Revision Management
  // ----------------------------------------------------------
  console.log("\n📝 SECTION 2: Revision Management\n");

  await test("2.1 GET /api/documents/:id/revisions returns array", async () => {
    const { status, data } = await api("GET", `/api/documents/${testDocId}/revisions`);
    assertEqual(status, 200, "Status code");
    assert(Array.isArray(data), "Response should be an array");
  });

  await test("2.2 Cannot create revision when document is draft", async () => {
    const { status, data } = await api("POST", `/api/documents/${testDocId}/revisions`, {
      changeDescription: "Attempt revision on draft",
      author: "Test Runner",
    });
    assertEqual(status, 400, "Should fail with 400");
    assert(data.error.includes("effective"), "Error should mention effective status");
  });

  // ----------------------------------------------------------
  // SECTION 3: Workflow State Machine
  // ----------------------------------------------------------
  console.log("\n🔄 SECTION 3: Workflow State Machine\n");

  await test("3.1 POST /api/documents/:id/submit-review changes status to review", async () => {
    const { status, data } = await api("POST", `/api/documents/${testDocId}/submit-review`);
    assertEqual(status, 200, "Status code");
    assertEqual(data.status, "review", "Status should be review");
  });

  await test("3.2 Cannot submit-review on already in-review document", async () => {
    const { status, data } = await api("POST", `/api/documents/${testDocId}/submit-review`);
    assertEqual(status, 400, "Should fail with 400");
    assert(data.error.includes("Invalid transition"), "Error should mention invalid transition");
  });

  await test("3.3 POST /api/documents/:id/reject requires comments", async () => {
    const { status, data } = await api("POST", `/api/documents/${testDocId}/reject`, {});
    assertEqual(status, 400, "Should fail with 400");
    assert(data.error.includes("comments"), "Error should mention comments required");
  });

  await test("3.4 POST /api/documents/:id/reject returns to draft with comments", async () => {
    const { status, data } = await api("POST", `/api/documents/${testDocId}/reject`, {
      comments: "Please fix formatting issues",
    });
    assertEqual(status, 200, "Status code");
    assertEqual(data.status, "draft", "Status should be draft");
  });

  await test("3.5 Re-submit for review after rejection", async () => {
    const { status, data } = await api("POST", `/api/documents/${testDocId}/submit-review`);
    assertEqual(status, 200, "Status code");
    assertEqual(data.status, "review", "Status should be review");
  });

  await test("3.6 POST /api/documents/:id/approve requires approverName", async () => {
    const { status, data } = await api("POST", `/api/documents/${testDocId}/approve`, {});
    assertEqual(status, 400, "Should fail with 400");
    assert(data.error.includes("approverName"), "Error should mention approverName");
  });

  await test("3.7 POST /api/documents/:id/approve changes status to effective", async () => {
    const { status, data } = await api("POST", `/api/documents/${testDocId}/approve`, {
      approverName: "Quality Manager",
    });
    assertEqual(status, 200, "Status code");
    assertEqual(data.status, "effective", "Status should be effective");
    assertExists(data.effectiveDate, "Should have effective date");
    assertExists(data.reviewDueDate, "Should have review due date");
  });

  await test("3.8 Cannot approve already effective document", async () => {
    const { status, data } = await api("POST", `/api/documents/${testDocId}/approve`, {
      approverName: "Quality Manager",
    });
    assertEqual(status, 400, "Should fail with 400");
    assert(data.error.includes("Invalid transition"), "Error should mention invalid transition");
  });

  // ----------------------------------------------------------
  // SECTION 4: Revision After Effective
  // ----------------------------------------------------------
  console.log("\n📋 SECTION 4: Revision After Effective\n");

  await test("4.1 POST /api/documents/:id/revisions creates new revision", async () => {
    const { status, data } = await api("POST", `/api/documents/${testDocId}/revisions`, {
      changeDescription: "Second revision with improvements",
      author: "Test Engineer",
    });
    assertEqual(status, 201, "Status code");
    assertEqual(data.rev, "B", "New revision should be B");
    assertEqual(data.status, "draft", "New revision should be draft");
    testRevisionId = data.id;
  });

  await test("4.2 Document is now in draft after new revision", async () => {
    const { status, data } = await api("GET", `/api/documents/${testDocId}`);
    assertEqual(status, 200, "Status code");
    assertEqual(data.status, "draft", "Document should be draft");
    assertEqual(data.currentRev, "B", "Current rev should be B");
  });

  await test("4.3 Revision history shows both revisions", async () => {
    const { status, data } = await api("GET", `/api/documents/${testDocId}/revisions`);
    assertEqual(status, 200, "Status code");
    assert(data.length >= 2, "Should have at least 2 revisions");
  });

  await test("4.4 Complete workflow for revision B and verify supersession", async () => {
    // Submit
    let res = await api("POST", `/api/documents/${testDocId}/submit-review`);
    assertEqual(res.status, 200, "Submit should succeed");
    
    // Approve
    res = await api("POST", `/api/documents/${testDocId}/approve`, {
      approverName: "Quality Director",
    });
    assertEqual(res.status, 200, "Approve should succeed");
    assertEqual(res.data.status, "effective", "Should be effective");
    
    // Verify previous revision is superseded
    res = await api("GET", `/api/documents/${testDocId}/revisions`);
    const revA = res.data.find((r: any) => r.rev === "A");
    assertExists(revA, "Should find revision A");
    assertEqual(revA.status, "superseded", "Rev A should be superseded");
  });

  // ----------------------------------------------------------
  // SECTION 5: Distribution & Acknowledgment
  // ----------------------------------------------------------
  console.log("\n📤 SECTION 5: Distribution & Acknowledgment\n");

  await test("5.1 POST /api/documents/:id/distribute creates records", async () => {
    const { status, data } = await api("POST", `/api/documents/${testDocId}/distribute`, {
      recipients: [
        { recipientName: "John Doe", recipientRole: "Engineer", method: "electronic" },
        { recipientName: "Jane Smith", recipientRole: "Supervisor", method: "electronic" },
      ],
    });
    assertEqual(status, 201, "Status code");
    assert(Array.isArray(data), "Should return array");
    assertEqual(data.length, 2, "Should create 2 distribution records");
    testDistributionId = data[0].id;
  });

  await test("5.2 GET /api/documents/:id/distributions returns records", async () => {
    const { status, data } = await api("GET", `/api/documents/${testDocId}/distributions`);
    assertEqual(status, 200, "Status code");
    assert(data.length >= 2, "Should have at least 2 distributions");
  });

  await test("5.3 POST /api/document-distributions/:id/acknowledge sets timestamp", async () => {
    const { status, data } = await api("POST", `/api/document-distributions/${testDistributionId}/acknowledge`);
    assertEqual(status, 200, "Status code");
    assertExists(data.acknowledgedAt, "Should have acknowledged timestamp");
  });

  await test("5.4 Distribution now shows acknowledged", async () => {
    const { status, data } = await api("GET", `/api/documents/${testDocId}/distributions`);
    const acknowledged = data.find((d: any) => d.id === testDistributionId);
    assertExists(acknowledged.acknowledgedAt, "Should be acknowledged");
  });

  // ----------------------------------------------------------
  // SECTION 6: Periodic Reviews
  // ----------------------------------------------------------
  console.log("\n🔍 SECTION 6: Periodic Reviews\n");

  await test("6.1 POST /api/documents/:id/reviews creates review request", async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    
    const { status, data } = await api("POST", `/api/documents/${testDocId}/reviews`, {
      reviewerName: "Review Specialist",
      reviewerRole: "Quality Auditor",
      dueDate: futureDate.toISOString(),
    });
    assertEqual(status, 201, "Status code");
    assertEqual(data.status, "pending", "Review should be pending");
    testReviewId = data.id;
  });

  await test("6.2 GET /api/document-reviews returns pending reviews", async () => {
    const { status, data } = await api("GET", "/api/document-reviews");
    assertEqual(status, 200, "Status code");
    assert(Array.isArray(data), "Should return array");
  });

  await test("6.3 GET /api/documents/:id/reviews returns document reviews", async () => {
    const { status, data } = await api("GET", `/api/documents/${testDocId}/reviews`);
    assertEqual(status, 200, "Status code");
    assert(data.some((r: any) => r.id === testReviewId), "Should find our review");
  });

  await test("6.4 PATCH /api/document-reviews/:id completes review", async () => {
    const { status, data } = await api("PATCH", `/api/document-reviews/${testReviewId}`, {
      status: "approved",
      comments: "Document reviewed and approved for continued use",
    });
    assertEqual(status, 200, "Status code");
    assertEqual(data.status, "approved", "Review should be approved");
  });

  // ----------------------------------------------------------
  // SECTION 7: Cross-Links
  // ----------------------------------------------------------
  console.log("\n🔗 SECTION 7: Cross-Links\n");

  await test("7.1 POST /api/document-links creates link", async () => {
    // First get a process ID from existing data
    const processRes = await api("GET", "/api/processes");
    assert(processRes.data.length > 0, "Need at least one process for linking");
    const processId = processRes.data[0].id;
    
    const { status, data } = await api("POST", "/api/document-links", {
      sourceDocId: testDocId,
      targetType: "process",
      targetId: processId,
      linkType: "references",
    });
    assertEqual(status, 201, "Status code");
    assertEqual(data.linkType, "references", "Link type should match");
    testLinkId = data.id;
  });

  await test("7.2 GET /api/documents/:id/links returns links", async () => {
    const { status, data } = await api("GET", `/api/documents/${testDocId}/links`);
    assertEqual(status, 200, "Status code");
    assert(data.some((l: any) => l.id === testLinkId), "Should find our link");
  });

  await test("7.3 DELETE /api/document-links/:id removes link", async () => {
    const { status } = await api("DELETE", `/api/document-links/${testLinkId}`);
    assertEqual(status, 200, "Status code");
    
    // Verify it's gone
    const { data: links } = await api("GET", `/api/documents/${testDocId}/links`);
    assert(!links.some((l: any) => l.id === testLinkId), "Link should be removed");
  });

  // ----------------------------------------------------------
  // SECTION 8: Metrics
  // ----------------------------------------------------------
  console.log("\n📊 SECTION 8: Metrics\n");

  await test("8.1 GET /api/documents/metrics returns dashboard data", async () => {
    const { status, data } = await api("GET", "/api/documents/metrics");
    assertEqual(status, 200, "Status code");
    assertExists(data.total, "Should have total count");
    assertExists(data.byStatus, "Should have byStatus breakdown");
    assertExists(data.byType, "Should have byType breakdown");
    assert(typeof data.overdueReviews === "number", "Should have overdueReviews count");
  });

  // ----------------------------------------------------------
  // SECTION 9: Obsolete Workflow
  // ----------------------------------------------------------
  console.log("\n🗄️ SECTION 9: Obsolete Workflow\n");

  await test("9.1 POST /api/documents/:id/obsolete marks as obsolete", async () => {
    const { status, data } = await api("POST", `/api/documents/${testDocId}/obsolete`);
    assertEqual(status, 200, "Status code");
    assertEqual(data.status, "obsolete", "Status should be obsolete");
  });

  await test("9.2 Cannot take actions on obsolete document", async () => {
    const { status: s1 } = await api("POST", `/api/documents/${testDocId}/submit-review`);
    assertEqual(s1, 400, "Submit should fail");
    
    const { status: s2 } = await api("POST", `/api/documents/${testDocId}/revisions`, {
      changeDescription: "Attempt on obsolete",
      author: "Test",
    });
    assertEqual(s2, 400, "New revision should fail");
  });

  // ----------------------------------------------------------
  // SECTION 10: Cleanup
  // ----------------------------------------------------------
  console.log("\n🧹 SECTION 10: Cleanup\n");

  await test("10.1 DELETE /api/documents/:id removes test document", async () => {
    const { status } = await api("DELETE", `/api/documents/${testDocId}`);
    assertEqual(status, 200, "Status code");
  });

  await test("10.2 Verify document is deleted", async () => {
    const { status } = await api("GET", `/api/documents/${testDocId}`);
    assertEqual(status, 404, "Should return 404");
  });

  // ----------------------------------------------------------
  // SUMMARY
  // ----------------------------------------------------------
  console.log("\n" + "=".repeat(60));
  console.log("TEST RESULTS SUMMARY");
  console.log("=".repeat(60));
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  
  console.log(`\n✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total:  ${results.length}`);
  console.log(`⏱️  Time:   ${totalDuration}ms`);
  
  if (failed > 0) {
    console.log("\n❌ FAILED TESTS:");
    results.filter(r => !r.passed).forEach(r => {
      console.log(`   • ${r.name}`);
      console.log(`     Error: ${r.error}`);
    });
  }
  
  console.log("\n" + "=".repeat(60));
  console.log(failed === 0 ? "✅ ALL TESTS PASSED!" : "❌ SOME TESTS FAILED");
  console.log("=".repeat(60) + "\n");
  
  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

// Run the tests
runTests().catch((error) => {
  console.error("Fatal error running tests:", error);
  process.exit(1);
});
```

---

## TEST COVERAGE SUMMARY

| Section | Tests | Description |
|---------|-------|-------------|
| 1. Document CRUD | 5 | List, create, get, update, filter |
| 2. Revision Management | 2 | Get revisions, cannot create on draft |
| 3. Workflow State Machine | 8 | Submit, reject, approve, transitions |
| 4. Revision After Effective | 4 | New revision, supersession |
| 5. Distribution | 4 | Distribute, list, acknowledge |
| 6. Periodic Reviews | 4 | Create, list, complete |
| 7. Cross-Links | 3 | Create, list, delete |
| 8. Metrics | 1 | Dashboard data |
| 9. Obsolete Workflow | 2 | Mark obsolete, no further actions |
| 10. Cleanup | 2 | Delete test data |

**Total: 35 tests**

---

## ACCEPTANCE CRITERIA CHECKLIST

- [ ] **File created:** `tests/document-control-tests.ts`
- [ ] **All 35 tests implemented**
- [ ] **Test isolation:** Creates own test data, cleans up after
- [ ] **Clear output:** Pass/fail with timing
- [ ] **Exit codes:** 0 on success, 1 on failure
- [ ] **Runnable:** `npx tsx tests/document-control-tests.ts` works
- [ ] **All tests pass** when run against working API

## IMPORTANT NOTES

1. **Port number:** Check existing tests for correct port (likely 5000, not 3000)
2. **Test order matters:** Later tests depend on data from earlier tests
3. **Store IDs:** Save IDs from creation for use in later tests
4. **Cleanup:** Always delete test data at end
5. **Unique identifiers:** Use "TEST-" prefix for test document numbers
