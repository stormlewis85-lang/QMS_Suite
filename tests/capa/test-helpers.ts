import 'dotenv/config';

export const BASE_URL = process.env.API_URL || 'http://localhost:3000';

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

/**
 * Cleanup is a no-op. We use unique org names per test run (with timestamps)
 * so test data doesn't collide. Direct DB cleanup was hitting Neon cold start
 * timeouts. The test orgs are lightweight and isolated by design.
 */
export async function cleanupCapaTestOrgs() {
  // No-op: each test run creates unique orgs with timestamp-based names
  // Stale test data is harmless since it's isolated by orgId
}

// ── Generators ──────────────────────────────────────────────────

let seqCounter = 0;
function seq() { return ++seqCounter; }

export function generateCapa(overrides: Record<string, unknown> = {}) {
  return {
    title: `Test CAPA ${seq()}`,
    description: `Test CAPA description ${Date.now()}`,
    type: 'corrective',
    priority: 'high',
    sourceType: 'customer_complaint',
    category: 'quality',
    ...overrides,
  };
}

// ── Setup helpers ────────────────────────────────────────────────

const runId = Date.now();

export async function setupOrg1() {
  return registerOrg(`CAPA Test Alpha ${runId}`, `capa-admin-${runId}@alpha.test`, 'Alpha', 'Admin');
}

export async function setupOrg2() {
  return registerOrg(`CAPA Test Beta ${runId}`, `capa-admin-${runId}@beta.test`, 'Beta', 'Admin');
}

export async function createTestCapa(token: string, overrides: Record<string, unknown> = {}) {
  const { status, data } = await api('POST', '/api/capas', token, generateCapa(overrides));
  if (status !== 201) throw new Error(`Failed to create CAPA (${status}): ${JSON.stringify(data)}`);
  return data;
}

export async function setupCapaWithD0(token: string) {
  const capa = await createTestCapa(token);

  // Create D0 data
  await api('PUT', `/api/capas/${capa.id}/d0`, token, {
    emergencyResponseRequired: 0,
    symptomsCaptured: 1,
    symptomsDescription: 'Test symptoms for D0',
    threatLevel: 'low',
  });

  return capa;
}

export async function completeD0(token: string, capaId: number) {
  // Ensure D0 has required fields
  await api('PUT', `/api/capas/${capaId}/d0`, token, {
    emergencyResponseRequired: 0,
    symptomsCaptured: 1,
    symptomsDescription: 'Test symptoms',
    threatLevel: 'low',
  });
  return api('POST', `/api/capas/${capaId}/d0/complete`, token);
}

export async function advanceDiscipline(token: string, capaId: number) {
  return api('POST', `/api/capas/${capaId}/advance-discipline`, token);
}

// ── Utility Functions ────────────────────────────────────────────

/**
 * Valid CAPA status transitions for 8D disciplines
 */
export const DISCIPLINE_ORDER = ['D0', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8'];

export const STATUS_MAP: Record<string, string> = {
  D0: 'd0_awareness', D1: 'd1_team', D2: 'd2_problem',
  D3: 'd3_containment', D4: 'd4_root_cause', D5: 'd5_corrective',
  D6: 'd6_validation', D7: 'd7_preventive', D8: 'd8_closure',
};

/**
 * Compute SHA-256 hash for audit log chain verification
 */
export function computeAuditHash(entry: {
  capaId: number;
  action: string;
  userId: string;
  timestamp: string;
  previousHash: string | null;
}): string {
  const crypto = require('crypto');
  const payload = `${entry.capaId}|${entry.action}|${entry.userId}|${entry.timestamp}|${entry.previousHash || ''}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
}

/**
 * Validate CAPA number format: CAPA-YYYY-NNNN
 */
export function isValidCapaNumber(num: string): boolean {
  return /^CAPA-\d{4}-\d{4}$/.test(num);
}

/**
 * Calculate expected target closure date based on priority
 */
export function getExpectedTargetDays(priority: string): number {
  const map: Record<string, number> = {
    critical: 14,
    high: 30,
    medium: 60,
    low: 90,
  };
  return map[priority] || 60;
}
