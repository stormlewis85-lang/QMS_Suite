import 'dotenv/config';
import { pool } from '../../server/db';

export const BASE_URL = process.env.API_URL || 'http://localhost:3000';

const DC_ORG1_SLUG = 'dc-test-org-alpha';
const DC_ORG2_SLUG = 'dc-test-org-beta';

// ── Auth helpers ──────────────────────────────────────────────

export async function registerOrg(orgName: string, email: string, firstName = 'Test', lastName = 'User') {
  const res = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      organizationName: orgName,
      email,
      password: 'password123',
      firstName,
      lastName,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Register failed (${res.status}): ${text}`);
  }
  const data = await res.json();
  return { token: data.token as string, user: data.user, orgId: data.user.orgId as string };
}

export function authHeaders(token: string, extra: Record<string, string> = {}) {
  return { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', ...extra };
}

export async function api(method: string, path: string, token: string, body?: unknown) {
  const opts: RequestInit = {
    method,
    headers: authHeaders(token),
  };
  if (body !== undefined) {
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(`${BASE_URL}${path}`, opts);
  const text = await res.text();
  let data: any = null;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data, ok: res.ok };
}

export async function apiRaw(method: string, path: string, token: string, init?: RequestInit) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { 'Authorization': `Bearer ${token}` },
    ...init,
  });
  return res;
}

// ── Cleanup ────────────────────────────────────────────────────

export async function cleanupDCTestOrgs() {
  try {
    // 1. Find test documents by doc_number pattern
    const { rows: docs } = await pool.query(
      `SELECT id FROM document WHERE doc_number LIKE 'DC-TEST-%'`
    );

    for (const doc of docs) {
      const docId = doc.id;
      await pool.query(`DELETE FROM document_comment WHERE document_id = $1`, [docId]).catch(() => {});
      await pool.query(`DELETE FROM document_print_log WHERE document_id = $1`, [docId]).catch(() => {});
      await pool.query(`DELETE FROM document_access_log WHERE document_id = $1`, [docId]).catch(() => {});
      await pool.query(`DELETE FROM document_distribution_record WHERE document_id = $1`, [docId]).catch(() => {});
      await pool.query(`DELETE FROM document_link_enhanced WHERE source_document_id = $1`, [docId]).catch(() => {});
      await pool.query(`DELETE FROM document_checkout WHERE document_id = $1`, [docId]).catch(() => {});

      const { rows: wfInstances } = await pool.query(
        `SELECT id FROM approval_workflow_instance WHERE document_id = $1`, [docId]
      ).catch(() => ({ rows: [] as any[] }));
      for (const wf of wfInstances) {
        await pool.query(`DELETE FROM approval_workflow_step WHERE workflow_instance_id = $1`, [wf.id]).catch(() => {});
      }
      await pool.query(`DELETE FROM approval_workflow_instance WHERE document_id = $1`, [docId]).catch(() => {});
      await pool.query(`DELETE FROM document_file WHERE document_id = $1`, [docId]).catch(() => {});
      await pool.query(`DELETE FROM document_link WHERE source_doc_id = $1`, [docId]).catch(() => {});
      await pool.query(`DELETE FROM document_distribution WHERE document_id = $1`, [docId]).catch(() => {});
      await pool.query(`DELETE FROM document_review WHERE document_id = $1`, [docId]).catch(() => {});
      await pool.query(`DELETE FROM document_revision WHERE document_id = $1`, [docId]).catch(() => {});
      await pool.query(`DELETE FROM document WHERE id = $1`, [docId]).catch(() => {});
    }

    // 2. Find and delete test orgs
    const { rows: testOrgs } = await pool.query(
      `SELECT id FROM organization WHERE slug IN ($1, $2)`,
      [DC_ORG1_SLUG, DC_ORG2_SLUG]
    );

    for (const org of testOrgs) {
      const orgId = org.id;

      // Delete org-level child tables
      await pool.query(`DELETE FROM approval_workflow_definition WHERE org_id = $1`, [orgId]).catch(() => {});
      await pool.query(`DELETE FROM distribution_list WHERE org_id = $1`, [orgId]).catch(() => {});
      await pool.query(`DELETE FROM external_document WHERE org_id = $1`, [orgId]).catch(() => {});
      await pool.query(`DELETE FROM document_template WHERE org_id = $1`, [orgId]).catch(() => {});

      // Delete users and sessions
      const { rows: testUsers } = await pool.query(
        `SELECT id FROM "user" WHERE org_id = $1`, [orgId]
      );
      for (const u of testUsers) {
        await pool.query(`DELETE FROM session WHERE user_id = $1`, [u.id]).catch(() => {});
      }
      await pool.query(`DELETE FROM "user" WHERE org_id = $1`, [orgId]).catch(() => {});
      await pool.query(`DELETE FROM organization WHERE id = $1`, [orgId]).catch(() => {});
    }
  } catch (error) {
    console.warn('Cleanup warning (non-fatal):', (error as Error).message);
  }
}

// ── Generators ──────────────────────────────────────────────────

let seqCounter = 0;
function seq() { return ++seqCounter; }

export function generateDocNumber() {
  return `DC-TEST-${Date.now()}-${seq()}`;
}

export function generateDocument(overrides: Record<string, unknown> = {}) {
  return {
    docNumber: generateDocNumber(),
    title: `Test Document ${seq()}`,
    type: 'work_instruction',
    category: 'Testing',
    department: 'QA',
    owner: 'Test Runner',
    description: 'Automated test document',
    reviewCycleDays: 365,
    ...overrides,
  };
}

export function generateWorkflowDefinition(overrides: Record<string, unknown> = {}) {
  const id = seq();
  return {
    name: `Test Workflow ${id}`,
    code: `WF-TEST-${Date.now()}-${id}`,
    description: 'Test workflow',
    appliesToDocTypes: JSON.stringify(['work_instruction']),
    appliesToCategories: '[]',
    steps: JSON.stringify([
      { name: 'Author Submit', assigneeType: 'initiator', assigneeValue: '', dueDays: 5, signatureRequired: false, signatureMeaning: '', canDelegate: false },
      { name: 'Technical Review', assigneeType: 'role', assigneeValue: 'engineer', dueDays: 3, signatureRequired: false, signatureMeaning: '', canDelegate: true },
    ]),
    createdBy: 'Test Runner',
    ...overrides,
  };
}

export function generateDistributionList(overrides: Record<string, unknown> = {}) {
  const id = seq();
  return {
    name: `Test DL ${id}`,
    code: `DL-TEST-${Date.now()}-${id}`,
    description: 'Test distribution list',
    recipients: JSON.stringify([
      { name: 'Test Engineer', role: 'engineer', email: 'engineer@test.local' },
    ]),
    requireAcknowledgment: 1,
    acknowledgmentDueDays: 7,
    sendEmailNotification: 0,
    createdBy: 'Test Runner',
    ...overrides,
  };
}

export function generateExternalDocument(overrides: Record<string, unknown> = {}) {
  const id = seq();
  return {
    docNumber: `EXT-TEST-${Date.now()}-${id}`,
    title: `External Test Doc ${id}`,
    source: 'ISO',
    currentVersion: '2024',
    category: 'Quality Management',
    createdBy: 'Test Runner',
    ...overrides,
  };
}

// ── Setup helpers ────────────────────────────────────────────────

export async function setupOrg1() {
  return registerOrg('DC Test Org Alpha', `dc-admin-${Date.now()}@alpha.test`, 'Alpha', 'Admin');
}

export async function setupOrg2() {
  return registerOrg('DC Test Org Beta', `dc-admin-${Date.now()}@beta.test`, 'Beta', 'Admin');
}

export async function createTestDocument(token: string, overrides: Record<string, unknown> = {}) {
  const { status, data } = await api('POST', '/api/documents', token, generateDocument(overrides));
  if (status !== 201) throw new Error(`Failed to create document: ${JSON.stringify(data)}`);
  return data;
}

export async function createTestWorkflowDef(token: string, overrides: Record<string, unknown> = {}) {
  const { status, data } = await api('POST', '/api/approval-workflow-definitions', token, generateWorkflowDefinition(overrides));
  if (status !== 201) throw new Error(`Failed to create workflow def: ${JSON.stringify(data)}`);
  return data;
}

export async function createTestDistributionList(token: string, overrides: Record<string, unknown> = {}) {
  const { status, data } = await api('POST', '/api/distribution-lists', token, generateDistributionList(overrides));
  if (status !== 201) throw new Error(`Failed to create dist list: ${JSON.stringify(data)}`);
  return data;
}

export async function makeDocumentEffective(token: string, docId: string) {
  // Submit for review then approve
  await api('POST', `/api/documents/${docId}/submit-review`, token);
  await api('POST', `/api/documents/${docId}/approve`, token, { approverName: 'Test Approver' });
}

// ── Revision letter utilities (for unit tests) ─────────────────

export function nextRevisionLetter(current: string): string {
  if (!current) return 'A';
  const chars = current.split('');
  let carry = true;
  for (let i = chars.length - 1; i >= 0 && carry; i--) {
    if (chars[i] === 'Z') {
      chars[i] = 'A';
    } else {
      chars[i] = String.fromCharCode(chars[i].charCodeAt(0) + 1);
      carry = false;
    }
  }
  if (carry) return 'A' + chars.join('');
  return chars.join('');
}

// ── Document hash utility (for unit tests) ──────────────────────

export function computeDocumentHash(docNumber: string, rev: string, fileChecksums: string[]): string {
  const crypto = require('crypto');
  const sorted = [...fileChecksums].sort();
  const payload = `${docNumber}|${rev}|${sorted.join(',')}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
}

// ── Signature fields validator (for unit tests) ────────────────

export interface SignatureData {
  signerName?: string;
  signerId?: string;
  timestamp?: string;
  ipAddress?: string;
  meaning?: string;
  documentHash?: string;
  sessionId?: string;
}

export function validateSignatureFields(sig: SignatureData): { valid: boolean; missing: string[] } {
  const required: (keyof SignatureData)[] = [
    'signerName', 'signerId', 'timestamp', 'ipAddress', 'meaning', 'documentHash', 'sessionId',
  ];
  const missing = required.filter(f => !sig[f]);
  return { valid: missing.length === 0, missing };
}
