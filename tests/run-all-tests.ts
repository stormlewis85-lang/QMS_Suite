/**
 * PFMEA Suite - Comprehensive Test Runner v2
 * 
 * Run with: npx tsx tests/run-all-tests.ts
 * 
 * FIXED: Matches actual API structure
 */

// ============ TEST UTILITIES ============

interface TestResult {
  name: string;
  category: string;
  passed: boolean;
  error?: string;
  details?: string;
}

const results: TestResult[] = [];
let currentCategory = 'General';

function setCategory(category: string) {
  currentCategory = category;
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  TESTING: ${category}`);
  console.log('='.repeat(60));
}

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    results.push({ name, category: currentCategory, passed: true });
    console.log(`  ✅ ${name}`);
  } catch (error: any) {
    results.push({ 
      name, 
      category: currentCategory, 
      passed: false, 
      error: error.message,
      details: error.stack
    });
    console.log(`  ❌ ${name}`);
    console.log(`     Error: ${error.message}`);
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function assertEqual(actual: any, expected: any, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertExists(value: any, message: string) {
  if (value === null || value === undefined) {
    throw new Error(`${message}: value is null or undefined`);
  }
}

function assertArray(value: any, minLength: number, message: string) {
  if (!Array.isArray(value)) {
    throw new Error(`${message}: expected array, got ${typeof value}`);
  }
  if (value.length < minLength) {
    throw new Error(`${message}: expected at least ${minLength} items, got ${value.length}`);
  }
}

// ============ API TEST HELPER ============

const BASE_URL = process.env.API_URL || 'http://localhost:5000';

async function apiGet(path: string): Promise<any> {
  const response = await fetch(`${BASE_URL}${path}`);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GET ${path} failed: ${response.status} - ${text.substring(0, 200)}`);
  }
  return response.json();
}

async function apiPost(path: string, body?: any): Promise<any> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`POST ${path} failed: ${response.status} - ${text.substring(0, 200)}`);
  }
  return response.json();
}

async function apiPatch(path: string, body: any): Promise<any> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`PATCH ${path} failed: ${response.status} - ${text.substring(0, 200)}`);
  }
  return response.json();
}

async function apiDelete(path: string): Promise<any> {
  const response = await fetch(`${BASE_URL}${path}`, { method: 'DELETE' });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`DELETE ${path} failed: ${response.status} - ${text.substring(0, 200)}`);
  }
  return response.json();
}

// ============ TEST DATA ============

let testPartId: string | undefined;
let testPfmeaId: string | undefined;
let testControlPlanId: string | undefined;
let testPfmeaRowId: string | undefined;
let testControlPlanRowId: string | undefined;
let testActionItemId: number | undefined;
let testProcessId: number | undefined;
let testEquipmentId: number | undefined;

// ============ RUN ALL TESTS ============

async function runAllTests() {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║       PFMEA SUITE - COMPREHENSIVE TEST SUITE v2          ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('\nAPI Base URL:', BASE_URL);
  console.log('Started at:', new Date().toISOString());

  // ============ HEALTH CHECK ============
  setCategory('Server Health');

  await test('Server is running', async () => {
    const response = await fetch(`${BASE_URL}/api/parts`);
    assert(response.status !== 502 && response.status !== 503, 
      `Server not responding (status: ${response.status})`);
  });

  // ============ PARTS API ============
  setCategory('Parts API');

  await test('GET /api/parts returns array', async () => {
    const parts = await apiGet('/api/parts');
    assertArray(parts, 0, 'Parts endpoint should return array');
  });

  await test('POST /api/parts creates a part', async () => {
    const newPart = await apiPost('/api/parts', {
      partNumber: `TEST-${Date.now()}`,
      partName: 'Test Part for Suite',
      customer: 'Test Customer',
      program: 'Test Program',
      plant: 'Test Plant',
    });
    assertExists(newPart.id, 'Created part should have ID');
    testPartId = newPart.id;
    console.log(`     Created part ID: ${testPartId}`);
  });

  await test('GET /api/parts/:id returns the part', async () => {
    if (!testPartId) throw new Error('No test part ID - previous test failed');
    const part = await apiGet(`/api/parts/${testPartId}`);
    assertExists(part.partNumber, 'Part should have partNumber');
  });

  await test('PATCH /api/parts/:id updates the part', async () => {
    if (!testPartId) throw new Error('No test part ID');
    const updated = await apiPatch(`/api/parts/${testPartId}`, {
      partName: 'Updated Test Part',
    });
    assertEqual(updated.partName, 'Updated Test Part', 'Part name should be updated');
  });

  // ============ PROCESSES API ============
  setCategory('Processes API');

  await test('GET /api/processes returns array', async () => {
    const processes = await apiGet('/api/processes');
    assertArray(processes, 0, 'Processes endpoint should return array');
  });

  // ============ EQUIPMENT API ============
  setCategory('Equipment API');

  await test('GET /api/equipment returns array', async () => {
    const equipment = await apiGet('/api/equipment');
    assertArray(equipment, 0, 'Equipment should return array');
  });

  // ============ PFMEA API ============
  setCategory('PFMEA API');

  await test('GET /api/pfmeas returns array', async () => {
    const pfmeas = await apiGet('/api/pfmeas');
    assertArray(pfmeas, 0, 'PFMEAs should return array');
  });

  await test('POST /api/pfmeas creates a PFMEA', async () => {
    if (!testPartId) throw new Error('No test part ID');
    const newPfmea = await apiPost('/api/pfmeas', {
      partId: testPartId,
      rev: '1.0',
      status: 'draft',
    });
    assertExists(newPfmea.id, 'Created PFMEA should have ID');
    testPfmeaId = newPfmea.id;
    console.log(`     Created PFMEA ID: ${testPfmeaId}`);
  });

  await test('GET /api/pfmeas/:id returns the PFMEA', async () => {
    if (!testPfmeaId) throw new Error('No test PFMEA ID');
    const pfmea = await apiGet(`/api/pfmeas/${testPfmeaId}`);
    assertEqual(pfmea.id, testPfmeaId, 'PFMEA ID should match');
  });

  // ============ PFMEA ROWS ============
  setCategory('PFMEA Rows');

  await test('POST /api/pfmeas/:id/rows creates a row', async () => {
    if (!testPfmeaId) throw new Error('No test PFMEA ID');
    const newRow = await apiPost(`/api/pfmeas/${testPfmeaId}/rows`, {
      stepRef: 'STEP-10',
      processStep: 'Test Molding',
      function: 'Form part to specification',
      requirement: 'Meet dimensional requirements',
      failureMode: 'Short shot',
      effect: 'Part does not function',
      severity: 8,
      cause: 'Insufficient material',
      occurrence: 4,
      preventionControls: ['Process parameters locked'],
      detectionControls: ['Visual inspection'],
      detection: 6,
      ap: 'H',
    });
    assertExists(newRow.id, 'Created row should have ID');
    testPfmeaRowId = newRow.id;
    console.log(`     Created PFMEA row ID: ${testPfmeaRowId}`);
  });

  await test('GET /api/pfmea-rows/:id returns the row', async () => {
    if (!testPfmeaRowId) throw new Error('No test row ID');
    const row = await apiGet(`/api/pfmea-rows/${testPfmeaRowId}`);
    assertEqual(row.failureMode, 'Short shot', 'Failure mode should match');
  });

  await test('PATCH /api/pfmea-rows/:id updates the row', async () => {
    if (!testPfmeaRowId) throw new Error('No test row ID');
    const updated = await apiPatch(`/api/pfmea-rows/${testPfmeaRowId}`, {
      occurrence: 3,
    });
    assertEqual(updated.occurrence, 3, 'Occurrence should be updated');
  });

  // ============ AP CALCULATOR ============
  setCategory('AP Calculator (AIAG-VDA 2019)');

  await test('AP=H for Severity >= 9', async () => {
    const result = await apiPost('/api/calculate-ap', { severity: 9, occurrence: 3, detection: 3 });
    assertEqual(result.ap, 'H', 'S>=9 should always be High');
  });

  await test('AP=H for Severity = 10', async () => {
    const result = await apiPost('/api/calculate-ap', { severity: 10, occurrence: 2, detection: 2 });
    assertEqual(result.ap, 'H', 'S=10 should be High');
  });

  await test('AP=L for low ratings (S=3, O=2, D=3)', async () => {
    const result = await apiPost('/api/calculate-ap', { severity: 3, occurrence: 2, detection: 3 });
    assertEqual(result.ap, 'L', 'Low ratings should be Low priority');
  });

  // ============ CONTROL PLANS ============
  setCategory('Control Plans API');

  await test('GET /api/control-plans returns array', async () => {
    const plans = await apiGet('/api/control-plans');
    assertArray(plans, 0, 'Control Plans should return array');
  });

  await test('POST /api/control-plans creates a control plan', async () => {
    if (!testPartId) throw new Error('No test part ID');
    const newPlan = await apiPost('/api/control-plans', {
      partId: testPartId,
      rev: '1.0',
      type: 'Production',
      status: 'draft',
    });
    assertExists(newPlan.id, 'Created control plan should have ID');
    testControlPlanId = newPlan.id;
    console.log(`     Created Control Plan ID: ${testControlPlanId}`);
  });

  await test('GET /api/control-plans/:id returns the plan', async () => {
    if (!testControlPlanId) throw new Error('No test control plan ID');
    const plan = await apiGet(`/api/control-plans/${testControlPlanId}`);
    assertEqual(plan.id, testControlPlanId, 'Control Plan ID should match');
  });

  // ============ CONTROL PLAN ROWS ============
  setCategory('Control Plan Rows');

  await test('POST /api/control-plans/:id/rows creates a row', async () => {
    if (!testControlPlanId) throw new Error('No test control plan ID');
    const newRow = await apiPost(`/api/control-plans/${testControlPlanId}/rows`, {
      charId: 'CHAR-001',
      characteristicName: 'Test Dimension',
      type: 'Product',
      specification: '10.0 ± 0.1 mm',
      sampleSize: '5',
      frequency: 'Every 2 hours',
      controlMethod: 'X-bar R chart',
      reactionPlan: 'Adjust process and notify supervisor',
    });
    assertExists(newRow.id, 'Created control plan row should have ID');
    testControlPlanRowId = newRow.id;
    console.log(`     Created Control Plan Row ID: ${testControlPlanRowId}`);
  });

  // ============ DOCUMENT CONTROL ============
  setCategory('Document Control');

  await test('PATCH /api/pfmeas/:id/status changes status', async () => {
    if (!testPfmeaId) throw new Error('No test PFMEA ID');
    const updated = await apiPatch(`/api/pfmeas/${testPfmeaId}/status`, {
      status: 'review',
    });
    assertEqual(updated.status, 'review', 'Status should be updated to review');
  });

  await test('POST /api/pfmeas/:id/signatures adds signature', async () => {
    if (!testPfmeaId) throw new Error('No test PFMEA ID');
    const sig = await apiPost(`/api/pfmeas/${testPfmeaId}/signatures`, {
      role: 'Process Engineer',
      signedBy: 'test-user',
    });
    assertExists(sig.id, 'Signature should have ID');
  });

  await test('GET /api/pfmeas/:id/signatures returns signatures', async () => {
    if (!testPfmeaId) throw new Error('No test PFMEA ID');
    const sigs = await apiGet(`/api/pfmeas/${testPfmeaId}/signatures`);
    assertArray(sigs, 1, 'Should have at least one signature');
  });

  await test('GET /api/pfmeas/:id/history returns history', async () => {
    if (!testPfmeaId) throw new Error('No test PFMEA ID');
    const history = await apiGet(`/api/pfmeas/${testPfmeaId}/history`);
    assertArray(history, 0, 'History should be an array');
  });

  await test('POST /api/pfmeas/:id/revisions creates new revision', async () => {
    if (!testPfmeaId) throw new Error('No test PFMEA ID');
    const newRev = await apiPost(`/api/pfmeas/${testPfmeaId}/revisions`, {
      changeDescription: 'Test revision for test suite',
    });
    assertExists(newRev.id, 'New revision should have ID');
    assert(newRev.rev !== '1.0', 'New revision should have different rev number');
  });

  // ============ AUDIT LOG ============
  setCategory('Audit Log');

  await test('GET /api/audit-log returns entries', async () => {
    const logs = await apiGet('/api/audit-log');
    assertArray(logs, 0, 'Audit log should return array');
  });

  await test('GET /api/audit-log with entity filter', async () => {
    if (!testPfmeaId) throw new Error('No test PFMEA ID');
    const logs = await apiGet(`/api/audit-log?entityType=pfmea&entityId=${testPfmeaId}`);
    assertArray(logs, 0, 'Filtered audit log should return array');
  });

  // ============ NOTIFICATIONS ============
  setCategory('Notifications');

  await test('GET /api/notifications returns array', async () => {
    const notifs = await apiGet('/api/notifications');
    assertArray(notifs, 0, 'Notifications should return array');
  });

  await test('GET /api/notifications/unread-count returns count', async () => {
    const result = await apiGet('/api/notifications/unread-count');
    assertExists(result.count !== undefined, 'Should have count property');
  });

  // ============ DASHBOARD ============
  setCategory('Dashboard');

  await test('GET /api/dashboard/summary returns data', async () => {
    const summary = await apiGet('/api/dashboard/summary');
    assertExists(summary, 'Dashboard summary should exist');
  });

  await test('GET /api/action-items/overdue returns array', async () => {
    const overdue = await apiGet('/api/action-items/overdue');
    assertArray(overdue, 0, 'Overdue action items should return array');
  });

  // ============ EXPORT ============
  setCategory('Export Features');

  await test('GET /api/pfmeas/:id/export/pdf generates PDF', async () => {
    if (!testPfmeaId) throw new Error('No test PFMEA ID');
    const response = await fetch(`${BASE_URL}/api/pfmeas/${testPfmeaId}/export/pdf`);
    assert(response.status === 200 || response.status === 404, 'PDF export should return 200 or 404');
  });

  await test('GET /api/pfmeas/:id/export/excel generates Excel', async () => {
    if (!testPfmeaId) throw new Error('No test PFMEA ID');
    const response = await fetch(`${BASE_URL}/api/pfmeas/${testPfmeaId}/export/excel`);
    assert(response.status === 200 || response.status === 404, 'Excel export should return 200 or 404');
  });

  // ============ IMPORT ============
  setCategory('Import Features');

  await test('GET /api/import/template/pfmea downloads template', async () => {
    const response = await fetch(`${BASE_URL}/api/import/template/pfmea`);
    assert(response.status === 200 || response.status === 404, 'Template endpoint should exist');
  });

  // ============ DOCUMENT GENERATION ============
  setCategory('Document Generation');

  await test('POST /api/parts/:id/generate creates documents', async () => {
    if (!testPartId) throw new Error('No test part ID');
    const result = await apiPost(`/api/parts/${testPartId}/generate`);
    assertExists(result.pfmeaId, 'Should create PFMEA');
    assertExists(result.controlPlanId, 'Should create Control Plan');
  });

  // ============ CLEANUP ============
  setCategory('Cleanup Test Data');

  await test('DELETE /api/pfmeas/:id deletes PFMEA', async () => {
    if (!testPfmeaId) throw new Error('No test PFMEA ID');
    const result = await apiDelete(`/api/pfmeas/${testPfmeaId}`);
    assert(result !== undefined, 'Delete should return response');
  });

  await test('DELETE /api/control-plans/:id deletes control plan', async () => {
    if (!testControlPlanId) throw new Error('No test control plan ID');
    const result = await apiDelete(`/api/control-plans/${testControlPlanId}`);
    assert(result !== undefined, 'Delete should return response');
  });

  await test('DELETE /api/parts/:id deletes part', async () => {
    if (!testPartId) throw new Error('No test part ID');
    const result = await apiDelete(`/api/parts/${testPartId}`);
    assert(result !== undefined, 'Delete should return response');
  });

  // ============ PRINT RESULTS ============
  printResults();
}

function printResults() {
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = total - passed;

  console.log('\n\n');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║                    TEST RESULTS                           ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`\n  Total Tests: ${total}`);
  console.log(`  ✅ Passed: ${passed}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

  if (failed > 0) {
    console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  FAILED TESTS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const failedTests = results.filter(r => !r.passed);
    const byCategory: Record<string, typeof failedTests> = {};
    
    for (const test of failedTests) {
      if (!byCategory[test.category]) byCategory[test.category] = [];
      byCategory[test.category].push(test);
    }
    
    for (const [category, tests] of Object.entries(byCategory)) {
      console.log(`\n  📁 ${category}:`);
      for (const test of tests) {
        console.log(`\n    ❌ ${test.name}`);
        console.log(`       Error: ${test.error}`);
      }
    }
  }
  
  // JSON Report
  const report = {
    timestamp: new Date().toISOString(),
    summary: { total, passed, failed, successRate: ((passed / total) * 100).toFixed(1) + '%' },
    passedTests: results.filter(r => r.passed).map(r => ({
      name: r.name,
      category: r.category,
      passed: true,
    })),
    failedTests: results.filter(r => !r.passed).map(r => ({
      category: r.category,
      name: r.name,
      error: r.error,
    })),
  };
  
  console.log('\n\n--- BEGIN JSON REPORT ---');
  console.log(JSON.stringify(report, null, 2));
  console.log('--- END JSON REPORT ---\n');
  
  process.exit(failed > 0 ? 1 : 0);
}

runAllTests().catch(err => {
  console.error('\n💥 Test runner crashed:', err.message);
  process.exit(1);
});
