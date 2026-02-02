// tests/full-system-audit.ts
// Run with: npx tsx tests/full-system-audit.ts

import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const RESULTS: AuditResult[] = [];

interface AuditResult {
  category: string;
  item: string;
  status: 'PASS' | 'FAIL' | 'WARN' | 'SKIP' | 'PLACEHOLDER';
  message: string;
  details?: any;
}

interface APITestResult {
  endpoint: string;
  method: string;
  status: number;
  success: boolean;
  responseTime: number;
  error?: string;
  hasData?: boolean;
}

function log(result: AuditResult) {
  RESULTS.push(result);
  const icon = {
    PASS: '✅',
    FAIL: '❌',
    WARN: '⚠️',
    SKIP: '⏭️',
    PLACEHOLDER: '🚧',
  }[result.status];
  console.log(`${icon} [${result.category}] ${result.item}: ${result.message}`);
}

async function apiTest(
  method: string,
  endpoint: string,
  body?: any,
  expectedStatus: number = 200
): Promise<APITestResult> {
  const start = Date.now();
  try {
    const options: RequestInit = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const responseTime = Date.now() - start;
    
    let data;
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    return {
      endpoint,
      method,
      status: response.status,
      success: response.status === expectedStatus,
      responseTime,
      hasData: Array.isArray(data) ? data.length > 0 : !!data,
      error: response.ok ? undefined : String(data).substring(0, 200),
    };
  } catch (error: any) {
    return {
      endpoint,
      method,
      status: 0,
      success: false,
      responseTime: Date.now() - start,
      error: error.message,
    };
  }
}

function scanFileForPatterns(filePath: string, patterns: { name: string; regex: RegExp }[]): string[] {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const found: string[] = [];
    for (const { name, regex } of patterns) {
      if (regex.test(content)) {
        found.push(name);
      }
    }
    return found;
  } catch {
    return [];
  }
}

function findFilesRecursive(dir: string, extension: string): string[] {
  const files: string[] = [];
  try {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory() && !item.includes('node_modules') && !item.startsWith('.')) {
        files.push(...findFilesRecursive(fullPath, extension));
      } else if (item.endsWith(extension)) {
        files.push(fullPath);
      }
    }
  } catch {}
  return files;
}

async function testServerHealth() {
  console.log('\n' + '='.repeat(60));
  console.log('SECTION 1: SERVER HEALTH & DATABASE');
  console.log('='.repeat(60) + '\n');

  const health = await apiTest('GET', '/api/health');
  if (health.success || health.status === 404) {
    log({ category: 'Server', item: 'Server Running', status: 'PASS', message: 'Server is responding' });
  } else {
    log({ category: 'Server', item: 'Server Running', status: 'FAIL', message: `Server error: ${health.error}` });
    return false;
  }

  const dbTest = await apiTest('GET', '/api/parts');
  if (dbTest.success) {
    log({ category: 'Database', item: 'Connection', status: 'PASS', message: 'Database connected and responding' });
  } else {
    log({ category: 'Database', item: 'Connection', status: 'FAIL', message: `Database error: ${dbTest.error}` });
  }

  return true;
}

async function testAllAPIEndpoints() {
  console.log('\n' + '='.repeat(60));
  console.log('SECTION 2: API ENDPOINTS');
  console.log('='.repeat(60) + '\n');

  const endpoints = [
    { method: 'GET', path: '/api/parts', name: 'List Parts' },
    { method: 'GET', path: '/api/processes', name: 'List Processes' },
    { method: 'GET', path: '/api/pfmeas', name: 'List PFMEAs' },
    { method: 'GET', path: '/api/control-plans', name: 'List Control Plans' },
    { method: 'GET', path: '/api/failure-modes', name: 'List Failure Modes' },
    { method: 'GET', path: '/api/controls', name: 'List Controls' },
    { method: 'GET', path: '/api/equipment', name: 'List Equipment' },
    { method: 'GET', path: '/api/action-items', name: 'List Action Items' },
    { method: 'GET', path: '/api/notifications', name: 'List Notifications' },
    { method: 'GET', path: '/api/notifications/unread-count', name: 'Unread Count' },
    { method: 'GET', path: '/api/dashboard/metrics', name: 'Dashboard Metrics' },
    { method: 'GET', path: '/api/dashboard/summary', name: 'Dashboard Summary' },
    { method: 'GET', path: '/api/audit-log', name: 'Audit Log' },
    { method: 'POST', path: '/api/calculate-ap', name: 'AP Calculator', body: { severity: 8, occurrence: 5, detection: 4 } },
  ];

  for (const ep of endpoints) {
    const result = await apiTest(ep.method, ep.path, ep.body);
    
    if (result.success) {
      log({ category: 'API', item: ep.name, status: 'PASS', message: `${ep.method} ${ep.path} - ${result.responseTime}ms` });
    } else if (result.status === 404) {
      log({ category: 'API', item: ep.name, status: 'FAIL', message: `MISSING: ${ep.method} ${ep.path}` });
    } else if (result.status === 500) {
      log({ category: 'API', item: ep.name, status: 'FAIL', message: `SERVER ERROR: ${result.error}` });
    } else {
      log({ category: 'API', item: ep.name, status: 'WARN', message: `${ep.method} ${ep.path} returned ${result.status}` });
    }
  }
}

async function testPFMEAEndpoints() {
  console.log('\n' + '='.repeat(60));
  console.log('SECTION 3: PFMEA DOCUMENT LIFECYCLE');
  console.log('='.repeat(60) + '\n');

  let pfmeaId: string | null = null;
  try {
    const response = await fetch(`${BASE_URL}/api/pfmeas`);
    const pfmeas = await response.json();
    if (Array.isArray(pfmeas) && pfmeas.length > 0) {
      pfmeaId = pfmeas[0].id;
      log({ category: 'PFMEA', item: 'Sample Data', status: 'PASS', message: `Found ${pfmeas.length} PFMEAs, using ID: ${pfmeaId}` });
    } else {
      log({ category: 'PFMEA', item: 'Sample Data', status: 'WARN', message: 'No PFMEAs exist - some tests will be skipped' });
      return;
    }
  } catch (e) {
    log({ category: 'PFMEA', item: 'Sample Data', status: 'FAIL', message: 'Error fetching PFMEAs' });
    return;
  }

  const pfmeaEndpoints: { method: string; path: string; name: string; body?: any }[] = [
    { method: 'GET', path: `/api/pfmeas/${pfmeaId}`, name: 'Get PFMEA Detail' },
    { method: 'GET', path: `/api/pfmeas/${pfmeaId}/rows`, name: 'Get PFMEA Rows' },
    { method: 'GET', path: `/api/pfmeas/${pfmeaId}/signatures`, name: 'Get Signatures' },
    { method: 'GET', path: `/api/pfmeas/${pfmeaId}/history`, name: 'Get History' },
  ];

  for (const ep of pfmeaEndpoints) {
    const result = await apiTest(ep.method, ep.path, ep.body);
    
    if (result.success) {
      log({ category: 'PFMEA Lifecycle', item: ep.name, status: 'PASS', message: `OK - ${result.responseTime}ms` });
    } else if (result.status === 404) {
      log({ category: 'PFMEA Lifecycle', item: ep.name, status: 'FAIL', message: `ENDPOINT MISSING` });
    } else {
      log({ category: 'PFMEA Lifecycle', item: ep.name, status: 'FAIL', message: `Error ${result.status}: ${result.error}` });
    }
  }
}

async function testControlPlanEndpoints() {
  console.log('\n' + '='.repeat(60));
  console.log('SECTION 4: CONTROL PLAN DOCUMENT LIFECYCLE');
  console.log('='.repeat(60) + '\n');

  let cpId: string | null = null;
  try {
    const response = await fetch(`${BASE_URL}/api/control-plans`);
    const cps = await response.json();
    if (Array.isArray(cps) && cps.length > 0) {
      cpId = cps[0].id;
      log({ category: 'Control Plan', item: 'Sample Data', status: 'PASS', message: `Found ${cps.length} Control Plans` });
    } else {
      log({ category: 'Control Plan', item: 'Sample Data', status: 'WARN', message: 'No Control Plans exist' });
      return;
    }
  } catch (e) {
    log({ category: 'Control Plan', item: 'Sample Data', status: 'FAIL', message: 'Error fetching Control Plans' });
    return;
  }

  const cpEndpoints: { method: string; path: string; name: string; body?: any }[] = [
    { method: 'GET', path: `/api/control-plans/${cpId}`, name: 'Get Control Plan Detail' },
    { method: 'GET', path: `/api/control-plans/${cpId}/rows`, name: 'Get Control Plan Rows' },
    { method: 'GET', path: `/api/control-plans/${cpId}/signatures`, name: 'Get Signatures' },
  ];

  for (const ep of cpEndpoints) {
    const result = await apiTest(ep.method, ep.path, ep.body);
    
    if (result.success) {
      log({ category: 'CP Lifecycle', item: ep.name, status: 'PASS', message: `OK - ${result.responseTime}ms` });
    } else if (result.status === 404) {
      log({ category: 'CP Lifecycle', item: ep.name, status: 'FAIL', message: `ENDPOINT MISSING` });
    } else {
      log({ category: 'CP Lifecycle', item: ep.name, status: 'FAIL', message: `Error ${result.status}: ${result.error}` });
    }
  }
}

async function testExportEndpoints() {
  console.log('\n' + '='.repeat(60));
  console.log('SECTION 5: EXPORT FUNCTIONALITY');
  console.log('='.repeat(60) + '\n');

  let pfmeaId: string | null = null;
  let cpId: string | null = null;

  try {
    const pfmeas = await (await fetch(`${BASE_URL}/api/pfmeas`)).json();
    if (pfmeas.length > 0) pfmeaId = pfmeas[0].id;

    const cps = await (await fetch(`${BASE_URL}/api/control-plans`)).json();
    if (cps.length > 0) cpId = cps[0].id;
  } catch {}

  const exportEndpoints = [
    { path: `/api/pfmeas/${pfmeaId}/export/pdf`, name: 'PFMEA PDF Export', skip: !pfmeaId },
    { path: `/api/pfmeas/${pfmeaId}/export/excel`, name: 'PFMEA Excel Export', skip: !pfmeaId },
    { path: `/api/control-plans/${cpId}/export/pdf`, name: 'Control Plan PDF Export', skip: !cpId },
    { path: `/api/control-plans/${cpId}/export/excel`, name: 'Control Plan Excel Export', skip: !cpId },
  ];

  for (const ep of exportEndpoints) {
    if (ep.skip) {
      log({ category: 'Export', item: ep.name, status: 'SKIP', message: 'No data to export' });
      continue;
    }

    try {
      const response = await fetch(`${BASE_URL}${ep.path}`);
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        log({ category: 'Export', item: ep.name, status: 'PASS', message: `Content-Type: ${contentType}` });
      } else if (response.status === 404) {
        log({ category: 'Export', item: ep.name, status: 'FAIL', message: 'ENDPOINT MISSING' });
      } else {
        log({ category: 'Export', item: ep.name, status: 'FAIL', message: `Status ${response.status}` });
      }
    } catch (e: any) {
      log({ category: 'Export', item: ep.name, status: 'FAIL', message: e.message });
    }
  }
}

async function auditCodeForPlaceholders() {
  console.log('\n' + '='.repeat(60));
  console.log('SECTION 6: CODE AUDIT - PLACEHOLDERS & INCOMPLETE FEATURES');
  console.log('='.repeat(60) + '\n');

  const patterns = [
    { name: 'Coming Soon', regex: /coming\s*soon/i },
    { name: 'TODO Comment', regex: /\/\/\s*TODO|\/\*\s*TODO/i },
    { name: 'FIXME Comment', regex: /\/\/\s*FIXME|\/\*\s*FIXME/i },
    { name: 'Not Implemented', regex: /not\s*implemented/i },
  ];

  const clientFiles = findFilesRecursive('./client/src', '.tsx');
  const serverFiles = findFilesRecursive('./server', '.ts');
  const allFiles = [...clientFiles, ...serverFiles];

  const findings: { file: string; issues: string[] }[] = [];

  for (const file of allFiles) {
    const issues = scanFileForPatterns(file, patterns);
    if (issues.length > 0) {
      findings.push({ file: file.replace(process.cwd(), ''), issues });
    }
  }

  if (findings.length === 0) {
    log({ category: 'Code Audit', item: 'Placeholders', status: 'PASS', message: 'No placeholder patterns found!' });
  } else {
    for (const f of findings) {
      for (const issue of f.issues) {
        log({ 
          category: 'Code Audit', 
          item: issue, 
          status: 'PLACEHOLDER', 
          message: f.file 
        });
      }
    }
  }
}

async function auditUIComponents() {
  console.log('\n' + '='.repeat(60));
  console.log('SECTION 7: UI COMPONENTS AUDIT');
  console.log('='.repeat(60) + '\n');

  const requiredComponents = [
    { path: 'client/src/pages/Dashboard.tsx', name: 'Dashboard Page' },
    { path: 'client/src/pages/Parts.tsx', name: 'Parts Page' },
    { path: 'client/src/pages/PartDetail.tsx', name: 'Part Detail Page' },
    { path: 'client/src/pages/Processes.tsx', name: 'Processes Page' },
    { path: 'client/src/pages/PFMEA.tsx', name: 'PFMEA List Page' },
    { path: 'client/src/pages/PFMEADetail.tsx', name: 'PFMEA Detail Page' },
    { path: 'client/src/pages/ControlPlans.tsx', name: 'Control Plans Page' },
    { path: 'client/src/pages/ControlPlanDetail.tsx', name: 'Control Plan Detail Page' },
    { path: 'client/src/pages/FailureModes.tsx', name: 'Failure Modes Library' },
    { path: 'client/src/pages/ControlsLibrary.tsx', name: 'Controls Library' },
    { path: 'client/src/pages/Equipment.tsx', name: 'Equipment Library' },
    { path: 'client/src/pages/Actions.tsx', name: 'Actions Page' },
    { path: 'client/src/pages/Import.tsx', name: 'Import Page' },
    { path: 'client/src/pages/Notifications.tsx', name: 'Notifications Page' },
    { path: 'client/src/components/SignaturesPanel.tsx', name: 'Signatures Panel' },
    { path: 'client/src/components/NotificationBell.tsx', name: 'Notification Bell' },
    { path: 'client/src/components/ImportWizard.tsx', name: 'Import Wizard' },
    { path: 'client/src/components/PrintHeader.tsx', name: 'Print Header' },
    { path: 'client/src/components/APBadge.tsx', name: 'AP Badge' },
    { path: 'client/src/components/DocumentControlPanel.tsx', name: 'Document Control Panel' },
  ];

  for (const comp of requiredComponents) {
    if (fs.existsSync(comp.path)) {
      const content = fs.readFileSync(comp.path, 'utf-8');
      const lines = content.split('\n').filter(l => l.trim()).length;
      
      if (lines < 10) {
        log({ category: 'UI Components', item: comp.name, status: 'WARN', message: `File exists but only ${lines} lines - may be stub` });
      } else if (/coming\s*soon/i.test(content)) {
        log({ category: 'UI Components', item: comp.name, status: 'PLACEHOLDER', message: 'Contains "Coming Soon" placeholder' });
      } else {
        log({ category: 'UI Components', item: comp.name, status: 'PASS', message: `${lines} lines` });
      }
    } else {
      log({ category: 'UI Components', item: comp.name, status: 'FAIL', message: 'FILE MISSING' });
    }
  }
}

async function auditRoutes() {
  console.log('\n' + '='.repeat(60));
  console.log('SECTION 8: ROUTE CONFIGURATION');
  console.log('='.repeat(60) + '\n');

  const appPath = 'client/src/App.tsx';
  if (!fs.existsSync(appPath)) {
    log({ category: 'Routes', item: 'App.tsx', status: 'FAIL', message: 'App.tsx not found' });
    return;
  }

  const appContent = fs.readFileSync(appPath, 'utf-8');

  const expectedRoutes = [
    { path: '/', name: 'Dashboard' },
    { path: '/parts', name: 'Parts List' },
    { path: '/processes', name: 'Processes' },
    { path: '/pfmea', name: 'PFMEA List' },
    { path: '/control-plans', name: 'Control Plans List' },
    { path: '/failure-modes', name: 'Failure Modes' },
    { path: '/controls-library', name: 'Controls Library' },
    { path: '/equipment', name: 'Equipment' },
    { path: '/actions', name: 'Actions' },
    { path: '/import', name: 'Import' },
    { path: '/notifications', name: 'Notifications' },
  ];

  for (const route of expectedRoutes) {
    const patterns = [
      `path="${route.path}"`,
      `path='${route.path}'`,
      `"${route.path}"`,
    ];
    
    const found = patterns.some(p => appContent.includes(p));
    
    if (found) {
      log({ category: 'Routes', item: route.name, status: 'PASS', message: route.path });
    } else {
      log({ category: 'Routes', item: route.name, status: 'FAIL', message: `Route ${route.path} not found in App.tsx` });
    }
  }
}

async function auditDatabaseSchema() {
  console.log('\n' + '='.repeat(60));
  console.log('SECTION 9: DATABASE SCHEMA');
  console.log('='.repeat(60) + '\n');

  const schemaPath = 'shared/schema.ts';
  if (!fs.existsSync(schemaPath)) {
    log({ category: 'Schema', item: 'Schema File', status: 'FAIL', message: 'Schema file not found' });
    return;
  }

  const schemaContent = fs.readFileSync(schemaPath, 'utf-8');

  const requiredTables = [
    'part',
    'processDef',
    'processStep',
    'pfmea',
    'pfmeaRow',
    'controlPlan',
    'controlPlanRow',
    'failureModesLibrary',
    'controlsLibrary',
    'equipmentLibrary',
    'actionItem',
    'notifications',
    'signature',
    'auditLog',
  ];

  for (const table of requiredTables) {
    const regex = new RegExp(`export\\s+const\\s+${table}\\s*=`, 'i');
    if (regex.test(schemaContent)) {
      log({ category: 'Schema', item: table, status: 'PASS', message: 'Table defined' });
    } else {
      log({ category: 'Schema', item: table, status: 'FAIL', message: 'TABLE MISSING' });
    }
  }
}

async function auditFeatureCompleteness() {
  console.log('\n' + '='.repeat(60));
  console.log('SECTION 10: FEATURE COMPLETENESS');
  console.log('='.repeat(60) + '\n');

  const features = [
    { name: 'Dashboard Metrics', api: '/api/dashboard/metrics', ui: 'client/src/pages/Dashboard.tsx' },
    { name: 'Parts Management', api: '/api/parts', ui: 'client/src/pages/Parts.tsx' },
    { name: 'Process Library', api: '/api/processes', ui: 'client/src/pages/Processes.tsx' },
    { name: 'PFMEA Documents', api: '/api/pfmeas', ui: 'client/src/pages/PFMEA.tsx' },
    { name: 'Control Plans', api: '/api/control-plans', ui: 'client/src/pages/ControlPlans.tsx' },
    { name: 'Failure Modes Library', api: '/api/failure-modes', ui: 'client/src/pages/FailureModes.tsx' },
    { name: 'Controls Library', api: '/api/controls', ui: 'client/src/pages/ControlsLibrary.tsx' },
    { name: 'Equipment Library', api: '/api/equipment', ui: 'client/src/pages/Equipment.tsx' },
    { name: 'Action Items', api: '/api/action-items', ui: 'client/src/pages/Actions.tsx' },
    { name: 'Notifications', api: '/api/notifications', ui: 'client/src/pages/Notifications.tsx' },
  ];

  for (const feature of features) {
    const apiResult = await apiTest('GET', feature.api);
    const uiExists = fs.existsSync(feature.ui);

    if (apiResult.success && uiExists) {
      log({ category: 'Features', item: feature.name, status: 'PASS', message: 'API + UI complete' });
    } else if (!apiResult.success && !uiExists) {
      log({ category: 'Features', item: feature.name, status: 'FAIL', message: 'BOTH API and UI missing' });
    } else if (!apiResult.success) {
      log({ category: 'Features', item: feature.name, status: 'WARN', message: 'API missing, UI exists' });
    } else {
      log({ category: 'Features', item: feature.name, status: 'WARN', message: 'UI missing, API exists' });
    }
  }
}

function generateSummaryReport() {
  console.log('\n' + '='.repeat(60));
  console.log('AUDIT SUMMARY REPORT');
  console.log('='.repeat(60) + '\n');

  const counts = { PASS: 0, FAIL: 0, WARN: 0, SKIP: 0, PLACEHOLDER: 0 };
  for (const r of RESULTS) {
    counts[r.status]++;
  }

  const total = RESULTS.length;
  const passRate = ((counts.PASS / total) * 100).toFixed(1);

  console.log(`Total Checks: ${total}`);
  console.log(`✅ PASS: ${counts.PASS} (${passRate}%)`);
  console.log(`❌ FAIL: ${counts.FAIL}`);
  console.log(`⚠️  WARN: ${counts.WARN}`);
  console.log(`🚧 PLACEHOLDER: ${counts.PLACEHOLDER}`);
  console.log(`⏭️  SKIP: ${counts.SKIP}`);

  const failures = RESULTS.filter(r => r.status === 'FAIL');
  if (failures.length > 0) {
    console.log('\n' + '-'.repeat(40));
    console.log('CRITICAL FAILURES (Must Fix):');
    console.log('-'.repeat(40) + '\n');

    const byCategory = new Map<string, AuditResult[]>();
    for (const f of failures) {
      if (!byCategory.has(f.category)) byCategory.set(f.category, []);
      byCategory.get(f.category)!.push(f);
    }

    for (const [cat, items] of byCategory) {
      console.log(`[${cat}]`);
      for (const item of items) {
        console.log(`  • ${item.item}: ${item.message}`);
      }
      console.log();
    }
  }

  const placeholders = RESULTS.filter(r => r.status === 'PLACEHOLDER');
  if (placeholders.length > 0) {
    console.log('-'.repeat(40));
    console.log('PLACEHOLDERS (Need Implementation):');
    console.log('-'.repeat(40) + '\n');
    for (const p of placeholders) {
      console.log(`  🚧 ${p.item}: ${p.message}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('END OF AUDIT');
  console.log('='.repeat(60) + '\n');

  return { counts, total, passRate, failures };
}

async function main() {
  console.log('╔' + '═'.repeat(60) + '╗');
  console.log('║     PFMEA SUITE - COMPREHENSIVE SYSTEM AUDIT               ║');
  console.log('╚' + '═'.repeat(60) + '╝');

  const serverUp = await testServerHealth();
  if (!serverUp) {
    console.log('\n❌ Server is not running. Please start the server and try again.');
    process.exit(1);
  }

  await testAllAPIEndpoints();
  await testPFMEAEndpoints();
  await testControlPlanEndpoints();
  await testExportEndpoints();
  await auditCodeForPlaceholders();
  await auditUIComponents();
  await auditRoutes();
  await auditDatabaseSchema();
  await auditFeatureCompleteness();

  const summary = generateSummaryReport();

  if (summary.counts.FAIL > 0) {
    process.exit(1);
  }
}

main().catch(console.error);
