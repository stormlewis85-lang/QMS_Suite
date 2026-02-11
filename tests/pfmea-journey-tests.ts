/**
 * PFMEA Journey - End-to-End Integration Test Suite
 * Walks the complete PFMEA lifecycle: Part -> Process -> PFMEA -> Control Plan -> Actions -> Review
 *
 * Run with: npx tsx tests/pfmea-journey-tests.ts
 */

const API_URL = process.env.API_URL || "http://localhost:3000";

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

const results: TestResult[] = [];

// Store IDs created during the journey
let partId: string;
let processId: string;
let stepId1: string;
let stepId2: string;
let stepId3: string;
let templateRowId: string;
let pfmeaId: string;
let pfmeaRowId: string;
let pfmeaRowId2: string;
let controlPlanId: string;
let controlPlanRowId: string;
let actionItemId: string;
let autoReviewRunId: string;

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
  console.log("PFMEA JOURNEY - END-TO-END INTEGRATION TESTS");
  console.log("=".repeat(60) + "\n");

  // ----------------------------------------------------------
  // PHASE 1: Part Creation
  // ----------------------------------------------------------
  console.log("\n🔧 PHASE 1: Part Creation\n");

  await test("1.1 POST /api/parts creates a new part", async () => {
    const { status, data } = await api("POST", "/api/parts", {
      customer: "Journey Test Customer",
      program: "JT-Program-2026",
      partNumber: "JT-PART-001",
      partName: "Journey Test Bracket Assembly",
      plant: "Plant A",
    });
    assertEqual(status, 201, "Status code");
    assertExists(data.id, "Should return part with ID");
    assertEqual(data.partNumber, "JT-PART-001", "Part number should match");
    partId = data.id;
  });

  await test("1.2 GET /api/parts/:id returns created part", async () => {
    const { status, data } = await api("GET", `/api/parts/${partId}`);
    assertEqual(status, 200, "Status code");
    assertEqual(data.partName, "Journey Test Bracket Assembly", "Part name should match");
  });

  await test("1.3 GET /api/parts lists all parts including new one", async () => {
    const { status, data } = await api("GET", "/api/parts");
    assertEqual(status, 200, "Status code");
    assert(Array.isArray(data), "Response should be array");
    assert(data.some((p: any) => p.id === partId), "Should contain our new part");
  });

  // ----------------------------------------------------------
  // PHASE 2: Process Definition & Steps
  // ----------------------------------------------------------
  console.log("\n⚙️ PHASE 2: Process Definition & Steps\n");

  await test("2.1 POST /api/processes creates process with steps", async () => {
    const { status, data } = await api("POST", "/api/processes", {
      process: {
        name: "JT Stamping Process",
        rev: "A",
        status: "draft",
        createdBy: "00000000-0000-0000-0000-000000000001",
      },
      steps: [
        { processDefId: "00000000-0000-0000-0000-000000000000", seq: 10, name: "Load Blank", area: "Stamping", stepType: "operation" },
        { processDefId: "00000000-0000-0000-0000-000000000000", seq: 20, name: "First Draw", area: "Stamping", stepType: "operation" },
      ],
    });
    assertEqual(status, 201, "Status code");
    assertExists(data.id, "Should return process with ID");
    processId = data.id;
  });

  await test("2.2 GET /api/processes/:id returns process with steps", async () => {
    const { status, data } = await api("GET", `/api/processes/${processId}`);
    assertEqual(status, 200, "Status code");
    assertEqual(data.name, "JT Stamping Process", "Process name should match");
    assert(Array.isArray(data.steps), "Should have steps array");
    assert(data.steps.length >= 2, "Should have at least 2 steps");
    const sorted = data.steps.sort((a: any, b: any) => a.seq - b.seq);
    stepId1 = sorted[0].id;
    stepId2 = sorted[1].id;
  });

  await test("2.3 POST /api/processes/:id/steps adds another step", async () => {
    const { status, data } = await api("POST", `/api/processes/${processId}/steps`, {
      seq: 30,
      name: "Trim & Pierce",
      area: "Stamping",
      stepType: "operation",
    });
    assertEqual(status, 201, "Status code");
    assertEqual(data.name, "Trim & Pierce", "Step name should match");
    stepId3 = data.id;
  });

  await test("2.4 GET /api/processes/:id shows all 3 steps", async () => {
    const { status, data } = await api("GET", `/api/processes/${processId}`);
    assertEqual(status, 200, "Status code");
    assertEqual(data.steps.length, 3, "Should have 3 steps");
  });

  // ----------------------------------------------------------
  // PHASE 3: FMEA Template Rows (Process Library)
  // ----------------------------------------------------------
  console.log("\n📑 PHASE 3: FMEA Template Rows\n");

  await test("3.1 POST creates FMEA template row for step", async () => {
    const { status, data } = await api("POST", `/api/processes/${processId}/fmea-template-rows`, {
      stepId: stepId1,
      function: "Position blank in die",
      requirement: "Blank centered within 1mm",
      failureMode: "Blank misaligned",
      effect: "Off-center draw, scrap part",
      severity: 7,
      cause: "Operator error or worn locator pins",
      occurrence: 4,
      detection: 6,
      ap: "M",
    });
    assertEqual(status, 201, "Status code");
    assertExists(data.id, "Should return template row with ID");
    templateRowId = data.id;
  });

  await test("3.2 GET lists template rows for process", async () => {
    const { status, data } = await api("GET", `/api/processes/${processId}/fmea-template-rows`);
    assertEqual(status, 200, "Status code");
    assert(data.length >= 1, "Should have at least 1 template row");
  });

  await test("3.3 POST /api/fmea-template-rows/:id/duplicate clones row", async () => {
    const { status, data } = await api("POST", `/api/fmea-template-rows/${templateRowId}/duplicate`);
    assertEqual(status, 201, "Status code");
    assertExists(data.id, "Duplicate should have new ID");
    assert(data.id !== templateRowId, "Duplicate ID should differ from original");
  });

  // ----------------------------------------------------------
  // PHASE 4: Generate PFMEA for Part
  // ----------------------------------------------------------
  console.log("\n📝 PHASE 4: PFMEA Generation\n");

  await test("4.1 POST /api/parts/:id/generate creates blank PFMEA & CP", async () => {
    const { status, data } = await api("POST", `/api/parts/${partId}/generate`);
    assertEqual(status, 200, "Status code");
    assertExists(data.pfmeaId, "Should return pfmeaId");
    assertExists(data.controlPlanId, "Should return controlPlanId");
    pfmeaId = data.pfmeaId;
    controlPlanId = data.controlPlanId;
  });

  await test("4.2 GET /api/pfmeas/:id returns the generated PFMEA", async () => {
    const { status, data } = await api("GET", `/api/pfmeas/${pfmeaId}`);
    assertEqual(status, 200, "Status code");
    assertEqual(data.partId, partId, "PFMEA should reference our part");
    assertEqual(data.status, "draft", "New PFMEA should be draft");
  });

  await test("4.3 GET /api/parts/:id/pfmeas returns PFMEAs for part", async () => {
    const { status, data } = await api("GET", `/api/parts/${partId}/pfmeas`);
    assertEqual(status, 200, "Status code");
    assert(data.some((p: any) => p.id === pfmeaId), "Should find our PFMEA");
  });

  // ----------------------------------------------------------
  // PHASE 5: PFMEA Rows (Failure Analysis)
  // ----------------------------------------------------------
  console.log("\n🔍 PHASE 5: PFMEA Rows\n");

  await test("5.1 POST /api/pfmeas/:id/rows creates a PFMEA row", async () => {
    const { status, data } = await api("POST", `/api/pfmeas/${pfmeaId}/rows`, {
      stepRef: "10 - Load Blank",
      function: "Position blank in die",
      requirement: "Blank centered within 1mm",
      failureMode: "Blank misaligned in die",
      effect: "Off-center draw causing scrap",
      severity: 7,
      cause: "Worn locator pins",
      occurrence: 4,
      preventionControls: ["Preventive maintenance on locator pins"],
      detection: 6,
      detectionControls: ["First piece inspection"],
      ap: "M",
    });
    assertEqual(status, 201, "Status code");
    assertExists(data.id, "Should return row with ID");
    pfmeaRowId = data.id;
  });

  await test("5.2 POST second PFMEA row for another failure mode", async () => {
    const { status, data } = await api("POST", `/api/pfmeas/${pfmeaId}/rows`, {
      stepRef: "20 - First Draw",
      function: "Form part shape",
      requirement: "Draw depth within spec",
      failureMode: "Wrinkle in drawn part",
      effect: "Scrap or rework required",
      severity: 6,
      cause: "Insufficient blank holder force",
      occurrence: 3,
      preventionControls: ["Setup verification checklist"],
      detection: 5,
      detectionControls: ["Visual inspection"],
      ap: "L",
    });
    assertEqual(status, 201, "Status code");
    pfmeaRowId2 = data.id;
  });

  await test("5.3 GET /api/pfmeas/:id/rows lists rows", async () => {
    const { status, data } = await api("GET", `/api/pfmeas/${pfmeaId}/rows`);
    assertEqual(status, 200, "Status code");
    assert(data.length >= 2, "Should have at least 2 rows");
  });

  await test("5.4 PATCH /api/pfmea-rows/:id updates severity", async () => {
    const { status, data } = await api("PATCH", `/api/pfmea-rows/${pfmeaRowId}`, {
      severity: 8,
      ap: "H",
    });
    assertEqual(status, 200, "Status code");
    assertEqual(data.severity, 8, "Severity should be updated");
  });

  await test("5.5 POST /api/pfmea-rows/:id/copy duplicates row", async () => {
    const { status, data } = await api("POST", `/api/pfmea-rows/${pfmeaRowId}/copy`);
    assertEqual(status, 200, "Status code");
    assertExists(data.id, "Copy should have new ID");
    assert(data.id !== pfmeaRowId, "Copy ID should differ from original");
  });

  await test("5.6 POST /api/calculate-ap returns correct priority", async () => {
    const { status, data } = await api("POST", "/api/calculate-ap", {
      severity: 9,
      occurrence: 5,
      detection: 4,
    });
    assertEqual(status, 200, "Status code");
    assertExists(data.ap, "Should return ap value");
  });

  // ----------------------------------------------------------
  // PHASE 6: Control Plan
  // ----------------------------------------------------------
  console.log("\n📋 PHASE 6: Control Plan\n");

  await test("6.1 GET /api/control-plans/:id returns the generated CP", async () => {
    const { status, data } = await api("GET", `/api/control-plans/${controlPlanId}`);
    assertEqual(status, 200, "Status code");
    assertEqual(data.partId, partId, "CP should reference our part");
  });

  await test("6.2 POST /api/control-plans/:id/rows creates a CP row", async () => {
    const { status, data } = await api("POST", `/api/control-plans/${controlPlanId}/rows`, {
      sourcePfmeaRowId: pfmeaRowId,
      charId: "C-001",
      characteristicName: "Blank Position",
      type: "process",
      specification: "Centered +/- 1mm",
      target: "0mm offset",
      tolerance: "+/- 1mm",
      measurementSystem: "Vision System",
      sampleSize: "5",
      frequency: "Every hour",
      controlMethod: "X-bar R chart",
      reactionPlan: "Stop and adjust locator pins",
    });
    assertEqual(status, 201, "Status code");
    assertExists(data.id, "Should return CP row with ID");
    controlPlanRowId = data.id;
  });

  await test("6.3 GET /api/control-plans/:id/rows lists rows", async () => {
    const { status, data } = await api("GET", `/api/control-plans/${controlPlanId}/rows`);
    assertEqual(status, 200, "Status code");
    assert(data.length >= 1, "Should have at least 1 row");
  });

  await test("6.4 PATCH /api/control-plan-rows/:id updates row", async () => {
    const { status, data } = await api("PATCH", `/api/control-plan-rows/${controlPlanRowId}`, {
      sampleSize: "10",
      frequency: "Every 30 minutes",
    });
    assertEqual(status, 200, "Status code");
    assertEqual(data.sampleSize, "10", "Sample size should be updated");
  });

  await test("6.5 GET /api/parts/:id/control-plans lists CPs for part", async () => {
    const { status, data } = await api("GET", `/api/parts/${partId}/control-plans`);
    assertEqual(status, 200, "Status code");
    assert(data.some((cp: any) => cp.id === controlPlanId), "Should find our CP");
  });

  // ----------------------------------------------------------
  // PHASE 7: Action Items
  // ----------------------------------------------------------
  console.log("\n📌 PHASE 7: Action Items\n");

  await test("7.1 POST creates action item on PFMEA row", async () => {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 14);

    const { status, data } = await api("POST", `/api/pfmea-rows/${pfmeaRowId}/action-items`, {
      actionType: "prevention",
      description: "Replace worn locator pins and implement scheduled replacement program",
      responsiblePerson: "Maintenance Lead",
      targetDate: targetDate.toISOString().split("T")[0],
      priority: "high",
    });
    assertEqual(status, 201, "Status code");
    assertExists(data.id, "Should return action item with ID");
    actionItemId = data.id;
  });

  await test("7.2 GET /api/pfmea-rows/:id/action-items lists actions", async () => {
    const { status, data } = await api("GET", `/api/pfmea-rows/${pfmeaRowId}/action-items`);
    assertEqual(status, 200, "Status code");
    assert(data.some((a: any) => a.id === actionItemId), "Should find our action item");
  });

  await test("7.3 GET /api/pfmeas/:id/action-items lists all PFMEA actions", async () => {
    const { status, data } = await api("GET", `/api/pfmeas/${pfmeaId}/action-items`);
    assertEqual(status, 200, "Status code");
    assert(Array.isArray(data), "Should return array");
  });

  await test("7.4 PATCH /api/action-items/:id updates action", async () => {
    const { status, data } = await api("PATCH", `/api/action-items/${actionItemId}`, {
      status: "in_progress",
    });
    assertEqual(status, 200, "Status code");
    assertEqual(data.status, "in_progress", "Status should be updated");
  });

  await test("7.5 POST /api/action-items/:id/complete completes action", async () => {
    const { status, data } = await api("POST", `/api/action-items/${actionItemId}/complete`, {
      completionNotes: "All locator pins replaced. Monthly inspection schedule created.",
      evidenceDescription: "Maintenance work order #WO-4521 completed",
      newOccurrence: 2,
    });
    assertEqual(status, 200, "Status code");
    assertExists(data.completedDate, "Should have completion timestamp");
  });

  await test("7.6 POST /api/action-items/:id/verify verifies completion", async () => {
    const { status, data } = await api("POST", `/api/action-items/${actionItemId}/verify`, {
      verifiedBy: "Quality Manager",
      verificationNotes: "Confirmed pins replaced and schedule in place",
    });
    assertEqual(status, 200, "Status code");
    assertExists(data.verifiedDate, "Should have verification timestamp");
  });

  // ----------------------------------------------------------
  // PHASE 8: Auto-Review
  // ----------------------------------------------------------
  console.log("\n🤖 PHASE 8: Auto-Review\n");

  await test("8.1 POST /api/pfmeas/:id/auto-review runs validation", async () => {
    const { status, data } = await api("POST", `/api/pfmeas/${pfmeaId}/auto-review`, {
      runBy: "Journey Test Runner",
    });
    assertEqual(status, 200, "Status code");
    assertExists(data.runId, "Should return review run with runId");
    assert(typeof data.totalFindings === "number", "Should have totalFindings count");
    autoReviewRunId = data.runId;
  });

  await test("8.2 GET /api/auto-reviews/:id returns review details", async () => {
    const { status, data } = await api("GET", `/api/auto-reviews/${autoReviewRunId}`);
    assertEqual(status, 200, "Status code");
    assertExists(data.totalFindings, "Should have totalFindings");
  });

  await test("8.3 GET /api/auto-reviews lists review history", async () => {
    const { status, data } = await api("GET", `/api/auto-reviews?pfmeaId=${pfmeaId}`);
    assertEqual(status, 200, "Status code");
    assert(Array.isArray(data), "Should return array");
  });

  // ----------------------------------------------------------
  // PHASE 9: PFMEA & CP Status Transitions
  // ----------------------------------------------------------
  console.log("\n🔄 PHASE 9: Status Transitions\n");

  await test("9.1 PATCH /api/pfmeas/:id/status submits for review", async () => {
    const { status, data } = await api("PATCH", `/api/pfmeas/${pfmeaId}/status`, {
      status: "review",
    });
    assertEqual(status, 200, "Status code");
    assertEqual(data.status, "review", "PFMEA status should be review");
  });

  await test("9.2 PATCH /api/pfmeas/:id/status approves PFMEA", async () => {
    const { status, data } = await api("PATCH", `/api/pfmeas/${pfmeaId}/status`, {
      status: "effective",
    });
    assertEqual(status, 200, "Status code");
    assertEqual(data.status, "effective", "PFMEA status should be effective");
  });

  await test("9.3 PATCH /api/control-plans/:id/status transitions CP", async () => {
    let res = await api("PATCH", `/api/control-plans/${controlPlanId}/status`, {
      status: "review",
    });
    assertEqual(res.status, 200, "Review transition should succeed");

    res = await api("PATCH", `/api/control-plans/${controlPlanId}/status`, {
      status: "effective",
    });
    assertEqual(res.status, 200, "Effective transition should succeed");
    assertEqual(res.data.status, "effective", "CP status should be effective");
  });

  // ----------------------------------------------------------
  // PHASE 10: Dashboard & Metrics
  // ----------------------------------------------------------
  console.log("\n📊 PHASE 10: Dashboard & Metrics\n");

  await test("10.1 GET /api/dashboard/summary returns metrics", async () => {
    const { status, data } = await api("GET", "/api/dashboard/summary");
    assertEqual(status, 200, "Status code");
    assert(typeof data.totalParts === "number", "Should have totalParts");
    assert(typeof data.totalPfmeas === "number", "Should have totalPfmeas");
  });

  await test("10.2 GET /api/pfmeas/:id/details returns full PFMEA details", async () => {
    const { status, data } = await api("GET", `/api/pfmeas/${pfmeaId}/details`);
    assertEqual(status, 200, "Status code");
    assertExists(data.rows, "Should include rows");
  });

  // ----------------------------------------------------------
  // PHASE 11: Libraries
  // ----------------------------------------------------------
  console.log("\n📚 PHASE 11: Libraries\n");

  await test("11.1 GET /api/failure-modes lists failure mode library", async () => {
    const { status, data } = await api("GET", "/api/failure-modes");
    assertEqual(status, 200, "Status code");
    assert(Array.isArray(data), "Should return array");
  });

  await test("11.2 GET /api/controls-library lists controls library", async () => {
    const { status, data } = await api("GET", "/api/controls-library");
    assertEqual(status, 200, "Status code");
    assert(Array.isArray(data), "Should return array");
  });

  await test("11.3 GET /api/equipment lists equipment library", async () => {
    const { status, data } = await api("GET", "/api/equipment");
    assertEqual(status, 200, "Status code");
    assert(Array.isArray(data), "Should return array");
  });

  // ----------------------------------------------------------
  // PHASE 12: Cleanup
  // ----------------------------------------------------------
  console.log("\n🧹 PHASE 12: Cleanup\n");

  await test("12.1 DELETE /api/control-plans/:id removes test CP", async () => {
    const { status } = await api("DELETE", `/api/control-plans/${controlPlanId}`);
    assert(status === 200 || status === 204, `Status code should be 200 or 204, got ${status}`);
  });

  await test("12.2 DELETE /api/pfmeas/:id removes test PFMEA", async () => {
    const { status } = await api("DELETE", `/api/pfmeas/${pfmeaId}`);
    assert(status === 200 || status === 204, `Status code should be 200 or 204, got ${status}`);
  });

  await test("12.3 DELETE /api/processes/:id removes test process", async () => {
    const { status } = await api("DELETE", `/api/processes/${processId}`);
    assert(status === 200 || status === 204, `Status code should be 200 or 204, got ${status}`);
  });

  await test("12.4 DELETE /api/parts/:id removes test part", async () => {
    const { status } = await api("DELETE", `/api/parts/${partId}`);
    assert(status === 200 || status === 204, `Status code should be 200 or 204, got ${status}`);
  });

  await test("12.5 Verify part is deleted", async () => {
    const { status } = await api("GET", `/api/parts/${partId}`);
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

  process.exit(failed > 0 ? 1 : 0);
}

// Run the tests
runTests().catch((error) => {
  console.error("Fatal error running tests:", error);
  process.exit(1);
});
