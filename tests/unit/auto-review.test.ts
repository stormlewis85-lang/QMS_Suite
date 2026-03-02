import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database module — hoisted before imports
vi.mock('../../server/db', () => ({
  db: {
    query: {
      pfmea: { findFirst: vi.fn() },
      controlPlan: { findFirst: vi.fn() },
    },
  },
}));

import { db } from '../../server/db';
import { AutoReviewService } from '../../server/services/auto-review';
import type { AutoReviewInput } from '../../server/services/auto-review';

const mockPfmeaFind = db.query.pfmea.findFirst as ReturnType<typeof vi.fn>;
const mockCPFind = db.query.controlPlan.findFirst as ReturnType<typeof vi.fn>;

// ── Helpers ──────────────────────────────────────────────────────────

function makePfmea(overrides: Record<string, any> = {}) {
  return {
    id: 'pfmea-1',
    partId: 'part-1',
    status: 'effective',
    docNo: 'PFMEA-001',
    basis: 'AIAG-VDA 2019',
    approvedBy: 'user-1',
    createdAt: new Date().toISOString(),
    part: { partNumber: 'PN-001' },
    rows: [],
    ...overrides,
  };
}

function makeRow(overrides: Record<string, any> = {}) {
  return {
    id: `row-${Math.random().toString(36).substr(2, 5)}`,
    failureMode: 'Test Failure Mode',
    severity: 5,
    occurrence: 3,
    detection: 4,
    ap: 'L',
    preventionControls: ['PC-1'],
    detectionControls: ['DC-1'],
    specialFlag: false,
    csrSymbol: null,
    parentTemplateRowId: 'template-1',
    ...overrides,
  };
}

function makeCP(overrides: Record<string, any> = {}) {
  return {
    id: 'cp-1',
    docNo: 'CP-001',
    type: 'Production',
    rows: [],
    ...overrides,
  };
}

function makeCPRow(overrides: Record<string, any> = {}) {
  return {
    id: `cp-row-${Math.random().toString(36).substr(2, 5)}`,
    characteristicName: 'Test Characteristic',
    sourcePfmeaRowId: 'row-1',
    specialFlag: false,
    csrSymbol: null,
    acceptanceCriteria: 'Cpk >= 1.33',
    reactionPlan: 'Quarantine and sort',
    measurementSystem: null,
    gageId: null,
    ...overrides,
  };
}

const only = (check: string): AutoReviewInput['options'] => ({
  checkCoverage: check === 'coverage',
  checkEffectiveness: check === 'effectiveness',
  checkDocumentControl: check === 'documentControl',
  checkTraceability: check === 'traceability',
  checkCompliance: check === 'compliance',
});

// ═════════════════════════════════════════════════════════════════════

describe('AutoReviewService', () => {
  let service: AutoReviewService;

  beforeEach(() => {
    service = new AutoReviewService();
    vi.clearAllMocks();
    mockCPFind.mockResolvedValue(null);
  });

  // ═══════════════════════════════════════════════════
  // Basics
  // ═══════════════════════════════════════════════════

  describe('runReview basics', () => {
    it('should throw when PFMEA not found', async () => {
      mockPfmeaFind.mockResolvedValue(null);
      await expect(service.runReview({ pfmeaId: 'missing' }))
        .rejects.toThrow('PFMEA not found');
    });

    it('should return valid result structure for clean PFMEA', async () => {
      mockPfmeaFind.mockResolvedValue(makePfmea());
      const result = await service.runReview({ pfmeaId: 'pfmea-1' });
      expect(result.reviewId).toMatch(/^AR-/);
      expect(result.pfmeaId).toBe('pfmea-1');
      expect(result.partNumber).toBe('PN-001');
      expect(result.summary.totalFindings).toBe(0);
      expect(result.summary.errors).toBe(0);
      expect(result.findings).toHaveLength(0);
    });

    it('should disable checks via options', async () => {
      mockPfmeaFind.mockResolvedValue(makePfmea({ docNo: null }));
      const result = await service.runReview({
        pfmeaId: 'pfmea-1',
        options: only('coverage'),
      });
      expect(result.findings.find(f => f.code === 'DOC-001')).toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════════════
  // Coverage checks
  // ═══════════════════════════════════════════════════

  describe('Coverage checks', () => {
    it('COV-001: error for HIGH AP row without CP coverage', async () => {
      const row = makeRow({ id: 'row-h', ap: 'H', severity: 9, occurrence: 1, detection: 1 });
      mockPfmeaFind.mockResolvedValue(makePfmea({ rows: [row] }));
      mockCPFind.mockResolvedValue(makeCP({ rows: [] }));
      const result = await service.runReview({
        pfmeaId: 'pfmea-1', controlPlanId: 'cp-1', options: only('coverage'),
      });
      const f = result.findings.find(f => f.code === 'COV-001');
      expect(f).toBeDefined();
      expect(f!.level).toBe('error');
      expect(f!.category).toBe('coverage');
    });

    it('COV-001: no error when CP covers the HIGH AP row', async () => {
      const row = makeRow({ id: 'row-h', ap: 'H', severity: 9, occurrence: 1, detection: 1 });
      const cpRow = makeCPRow({ sourcePfmeaRowId: 'row-h' });
      mockPfmeaFind.mockResolvedValue(makePfmea({ rows: [row] }));
      mockCPFind.mockResolvedValue(makeCP({ rows: [cpRow] }));
      const result = await service.runReview({
        pfmeaId: 'pfmea-1', controlPlanId: 'cp-1', options: only('coverage'),
      });
      expect(result.findings.find(f => f.code === 'COV-001')).toBeUndefined();
    });

    it('COV-002: warning for MEDIUM AP row without CP coverage', async () => {
      const row = makeRow({ id: 'row-m', ap: 'M', severity: 5, occurrence: 7, detection: 1 });
      mockPfmeaFind.mockResolvedValue(makePfmea({ rows: [row] }));
      mockCPFind.mockResolvedValue(makeCP({ rows: [] }));
      const result = await service.runReview({
        pfmeaId: 'pfmea-1', controlPlanId: 'cp-1', options: only('coverage'),
      });
      const f = result.findings.find(f => f.code === 'COV-002');
      expect(f).toBeDefined();
      expect(f!.level).toBe('warning');
    });

    it('COV-003: error for special characteristic without CP', async () => {
      const row = makeRow({ id: 'row-sc', specialFlag: true, csrSymbol: 'SC' });
      mockPfmeaFind.mockResolvedValue(makePfmea({ rows: [row] }));
      mockCPFind.mockResolvedValue(makeCP({ rows: [] }));
      const result = await service.runReview({
        pfmeaId: 'pfmea-1', controlPlanId: 'cp-1', options: only('coverage'),
      });
      const f = result.findings.find(f => f.code === 'COV-003');
      expect(f).toBeDefined();
      expect(f!.level).toBe('error');
    });

    it('COV-003: triggers for csrSymbol alone', async () => {
      const row = makeRow({ id: 'row-csr', specialFlag: false, csrSymbol: 'CC' });
      mockPfmeaFind.mockResolvedValue(makePfmea({ rows: [row] }));
      mockCPFind.mockResolvedValue(makeCP({ rows: [] }));
      const result = await service.runReview({
        pfmeaId: 'pfmea-1', controlPlanId: 'cp-1', options: only('coverage'),
      });
      expect(result.findings.find(f => f.code === 'COV-003')).toBeDefined();
    });

    it('COV-004: warning for CP row not linked to PFMEA', async () => {
      const cpRow = makeCPRow({ sourcePfmeaRowId: null });
      mockPfmeaFind.mockResolvedValue(makePfmea());
      mockCPFind.mockResolvedValue(makeCP({ rows: [cpRow] }));
      const result = await service.runReview({
        pfmeaId: 'pfmea-1', controlPlanId: 'cp-1', options: only('coverage'),
      });
      const f = result.findings.find(f => f.code === 'COV-004');
      expect(f).toBeDefined();
      expect(f!.level).toBe('warning');
    });

    it('should skip CP checks when no controlPlanId', async () => {
      mockPfmeaFind.mockResolvedValue(makePfmea());
      const result = await service.runReview({
        pfmeaId: 'pfmea-1', options: only('coverage'),
      });
      expect(result.findings.filter(f => f.code === 'COV-004')).toHaveLength(0);
    });
  });

  // ═══════════════════════════════════════════════════
  // Effectiveness checks
  // ═══════════════════════════════════════════════════

  describe('Effectiveness checks', () => {
    it('EFF-001: error when stored AP differs from calculated', async () => {
      const row = makeRow({ ap: 'M', severity: 5, occurrence: 3, detection: 4 });
      mockPfmeaFind.mockResolvedValue(makePfmea({ rows: [row] }));
      const result = await service.runReview({
        pfmeaId: 'pfmea-1', options: only('effectiveness'),
      });
      const f = result.findings.find(f => f.code === 'EFF-001');
      expect(f).toBeDefined();
      expect(f!.level).toBe('error');
      expect(f!.message).toContain('stored AP="M"');
      expect(f!.message).toContain('calculated AP="L"');
    });

    it('EFF-001: no error when stored AP matches calculated', async () => {
      const row = makeRow({ ap: 'L', severity: 5, occurrence: 3, detection: 4 });
      mockPfmeaFind.mockResolvedValue(makePfmea({ rows: [row] }));
      const result = await service.runReview({
        pfmeaId: 'pfmea-1', options: only('effectiveness'),
      });
      expect(result.findings.find(f => f.code === 'EFF-001')).toBeUndefined();
    });

    it('EFF-002: error for safety-critical (S>=9) without prevention', async () => {
      const row = makeRow({
        severity: 9, occurrence: 1, detection: 1,
        ap: 'H', preventionControls: [], detectionControls: [],
      });
      mockPfmeaFind.mockResolvedValue(makePfmea({ rows: [row] }));
      const result = await service.runReview({
        pfmeaId: 'pfmea-1', options: only('effectiveness'),
      });
      const f = result.findings.find(f => f.code === 'EFF-002');
      expect(f).toBeDefined();
      expect(f!.level).toBe('error');
    });

    it('EFF-002: no error when S>=9 has prevention controls', async () => {
      const row = makeRow({
        severity: 10, occurrence: 1, detection: 1,
        ap: 'H', preventionControls: ['Error proofing'],
      });
      mockPfmeaFind.mockResolvedValue(makePfmea({ rows: [row] }));
      const result = await service.runReview({
        pfmeaId: 'pfmea-1', options: only('effectiveness'),
      });
      expect(result.findings.find(f => f.code === 'EFF-002')).toBeUndefined();
    });

    it('EFF-003: warning for detection-only strategy with high severity', async () => {
      const row = makeRow({
        severity: 7, occurrence: 3, detection: 4,
        ap: 'L', preventionControls: [], detectionControls: ['Visual inspection'],
      });
      mockPfmeaFind.mockResolvedValue(makePfmea({ rows: [row] }));
      const result = await service.runReview({
        pfmeaId: 'pfmea-1', options: only('effectiveness'),
      });
      const f = result.findings.find(f => f.code === 'EFF-003');
      expect(f).toBeDefined();
      expect(f!.level).toBe('warning');
    });

    it('EFF-003: no warning when prevention controls exist', async () => {
      const row = makeRow({
        severity: 8, occurrence: 3, detection: 4,
        ap: 'L', preventionControls: ['Process control'], detectionControls: ['Visual'],
      });
      mockPfmeaFind.mockResolvedValue(makePfmea({ rows: [row] }));
      const result = await service.runReview({
        pfmeaId: 'pfmea-1', options: only('effectiveness'),
      });
      expect(result.findings.find(f => f.code === 'EFF-003')).toBeUndefined();
    });

    it('EFF-004: error for D=10 with high severity (S>=7)', async () => {
      const row = makeRow({
        severity: 8, occurrence: 1, detection: 10,
        ap: 'H', preventionControls: ['PC-1'],
      });
      mockPfmeaFind.mockResolvedValue(makePfmea({ rows: [row] }));
      const result = await service.runReview({
        pfmeaId: 'pfmea-1', options: only('effectiveness'),
      });
      const f = result.findings.find(f => f.code === 'EFF-004');
      expect(f).toBeDefined();
      expect(f!.level).toBe('error');
    });

    it('EFF-004: warning for D=10 with low severity (S<7)', async () => {
      const row = makeRow({
        severity: 4, occurrence: 1, detection: 10,
        ap: 'H', preventionControls: ['PC-1'],
      });
      mockPfmeaFind.mockResolvedValue(makePfmea({ rows: [row] }));
      const result = await service.runReview({
        pfmeaId: 'pfmea-1', options: only('effectiveness'),
      });
      const f = result.findings.find(f => f.code === 'EFF-004');
      expect(f).toBeDefined();
      expect(f!.level).toBe('warning');
    });

    it('EFF-005: warning for special CP characteristic without Cpk', async () => {
      const cpRow = makeCPRow({
        specialFlag: true, csrSymbol: 'SC', acceptanceCriteria: 'Within tolerance',
      });
      mockPfmeaFind.mockResolvedValue(makePfmea());
      mockCPFind.mockResolvedValue(makeCP({ rows: [cpRow] }));
      const result = await service.runReview({
        pfmeaId: 'pfmea-1', controlPlanId: 'cp-1', options: only('effectiveness'),
      });
      const f = result.findings.find(f => f.code === 'EFF-005');
      expect(f).toBeDefined();
      expect(f!.level).toBe('warning');
    });

    it('EFF-005: no warning when acceptance criteria includes cpk', async () => {
      const cpRow = makeCPRow({ specialFlag: true, acceptanceCriteria: 'Cpk >= 1.67' });
      mockPfmeaFind.mockResolvedValue(makePfmea());
      mockCPFind.mockResolvedValue(makeCP({ rows: [cpRow] }));
      const result = await service.runReview({
        pfmeaId: 'pfmea-1', controlPlanId: 'cp-1', options: only('effectiveness'),
      });
      expect(result.findings.find(f => f.code === 'EFF-005')).toBeUndefined();
    });

    it('EFF-006: error for special CP row missing reaction plan', async () => {
      const cpRow = makeCPRow({ specialFlag: true, reactionPlan: null });
      mockPfmeaFind.mockResolvedValue(makePfmea());
      mockCPFind.mockResolvedValue(makeCP({ rows: [cpRow] }));
      const result = await service.runReview({
        pfmeaId: 'pfmea-1', controlPlanId: 'cp-1', options: only('effectiveness'),
      });
      const f = result.findings.find(f => f.code === 'EFF-006');
      expect(f).toBeDefined();
      expect(f!.level).toBe('error');
    });

    it('EFF-006: warning for non-special CP row missing reaction plan', async () => {
      const cpRow = makeCPRow({ specialFlag: false, reactionPlan: null });
      mockPfmeaFind.mockResolvedValue(makePfmea());
      mockCPFind.mockResolvedValue(makeCP({ rows: [cpRow] }));
      const result = await service.runReview({
        pfmeaId: 'pfmea-1', controlPlanId: 'cp-1', options: only('effectiveness'),
      });
      const f = result.findings.find(f => f.code === 'EFF-006');
      expect(f).toBeDefined();
      expect(f!.level).toBe('warning');
    });
  });

  // ═══════════════════════════════════════════════════
  // Document control checks
  // ═══════════════════════════════════════════════════

  describe('Document control checks', () => {
    it('DOC-001: error for PFMEA without document number', async () => {
      mockPfmeaFind.mockResolvedValue(makePfmea({ docNo: null }));
      const result = await service.runReview({
        pfmeaId: 'pfmea-1', options: only('documentControl'),
      });
      const f = result.findings.find(f => f.code === 'DOC-001');
      expect(f).toBeDefined();
      expect(f!.level).toBe('error');
    });

    it('DOC-001: no error when docNo present', async () => {
      mockPfmeaFind.mockResolvedValue(makePfmea({ docNo: 'PFMEA-001' }));
      const result = await service.runReview({
        pfmeaId: 'pfmea-1', options: only('documentControl'),
      });
      expect(result.findings.find(f => f.code === 'DOC-001')).toBeUndefined();
    });

    it('DOC-002: error for CP without document number', async () => {
      mockPfmeaFind.mockResolvedValue(makePfmea());
      mockCPFind.mockResolvedValue(makeCP({ docNo: null }));
      const result = await service.runReview({
        pfmeaId: 'pfmea-1', controlPlanId: 'cp-1', options: only('documentControl'),
      });
      const f = result.findings.find(f => f.code === 'DOC-002');
      expect(f).toBeDefined();
      expect(f!.level).toBe('error');
    });

    it('DOC-003: info for draft PFMEA older than 30 days', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 60);
      mockPfmeaFind.mockResolvedValue(makePfmea({
        status: 'draft', createdAt: oldDate.toISOString(),
      }));
      const result = await service.runReview({
        pfmeaId: 'pfmea-1', options: only('documentControl'),
      });
      const f = result.findings.find(f => f.code === 'DOC-003');
      expect(f).toBeDefined();
      expect(f!.level).toBe('info');
    });

    it('DOC-003: no finding for draft under 30 days', async () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 10);
      mockPfmeaFind.mockResolvedValue(makePfmea({
        status: 'draft', createdAt: recentDate.toISOString(),
      }));
      const result = await service.runReview({
        pfmeaId: 'pfmea-1', options: only('documentControl'),
      });
      expect(result.findings.find(f => f.code === 'DOC-003')).toBeUndefined();
    });

    it('DOC-004: error for effective PFMEA without approval', async () => {
      mockPfmeaFind.mockResolvedValue(makePfmea({ status: 'effective', approvedBy: null }));
      const result = await service.runReview({
        pfmeaId: 'pfmea-1', options: only('documentControl'),
      });
      const f = result.findings.find(f => f.code === 'DOC-004');
      expect(f).toBeDefined();
      expect(f!.level).toBe('error');
    });

    it('DOC-004: no error when approved', async () => {
      mockPfmeaFind.mockResolvedValue(makePfmea({ status: 'effective', approvedBy: 'user-1' }));
      const result = await service.runReview({
        pfmeaId: 'pfmea-1', options: only('documentControl'),
      });
      expect(result.findings.find(f => f.code === 'DOC-004')).toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════════════
  // Traceability checks
  // ═══════════════════════════════════════════════════

  describe('Traceability checks', () => {
    it('TRC-001: info when rows lack template linkage', async () => {
      const row = makeRow({ parentTemplateRowId: null });
      mockPfmeaFind.mockResolvedValue(makePfmea({ rows: [row] }));
      const result = await service.runReview({
        pfmeaId: 'pfmea-1', options: only('traceability'),
      });
      const f = result.findings.find(f => f.code === 'TRC-001');
      expect(f).toBeDefined();
      expect(f!.level).toBe('info');
      expect(f!.message).toContain('1 PFMEA row(s)');
    });

    it('TRC-001: no finding when all rows linked', async () => {
      const row = makeRow({ parentTemplateRowId: 'tmpl-1' });
      mockPfmeaFind.mockResolvedValue(makePfmea({ rows: [row] }));
      const result = await service.runReview({
        pfmeaId: 'pfmea-1', options: only('traceability'),
      });
      expect(result.findings.find(f => f.code === 'TRC-001')).toBeUndefined();
    });

    it('TRC-002: warning for special CP row with measurement but no gage', async () => {
      const cpRow = makeCPRow({ specialFlag: true, measurementSystem: 'Micrometer', gageId: null });
      mockPfmeaFind.mockResolvedValue(makePfmea());
      mockCPFind.mockResolvedValue(makeCP({ rows: [cpRow] }));
      const result = await service.runReview({
        pfmeaId: 'pfmea-1', controlPlanId: 'cp-1', options: only('traceability'),
      });
      const f = result.findings.find(f => f.code === 'TRC-002');
      expect(f).toBeDefined();
      expect(f!.level).toBe('warning');
    });

    it('TRC-002: no warning when gage is linked', async () => {
      const cpRow = makeCPRow({ specialFlag: true, measurementSystem: 'Micrometer', gageId: 'gage-1' });
      mockPfmeaFind.mockResolvedValue(makePfmea());
      mockCPFind.mockResolvedValue(makeCP({ rows: [cpRow] }));
      const result = await service.runReview({
        pfmeaId: 'pfmea-1', controlPlanId: 'cp-1', options: only('traceability'),
      });
      expect(result.findings.find(f => f.code === 'TRC-002')).toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════════════
  // Compliance checks
  // ═══════════════════════════════════════════════════

  describe('Compliance checks', () => {
    it('CMP-001: info for non-AIAG-VDA methodology', async () => {
      mockPfmeaFind.mockResolvedValue(makePfmea({ basis: 'AIAG 4th Ed' }));
      const result = await service.runReview({
        pfmeaId: 'pfmea-1', options: only('compliance'),
      });
      const f = result.findings.find(f => f.code === 'CMP-001');
      expect(f).toBeDefined();
      expect(f!.level).toBe('info');
    });

    it('CMP-001: no finding for AIAG-VDA 2019', async () => {
      mockPfmeaFind.mockResolvedValue(makePfmea({ basis: 'AIAG-VDA 2019' }));
      const result = await service.runReview({
        pfmeaId: 'pfmea-1', options: only('compliance'),
      });
      expect(result.findings.find(f => f.code === 'CMP-001')).toBeUndefined();
    });

    it('CMP-002: error for invalid S/O/D ratings', async () => {
      const row = makeRow({ severity: 0, occurrence: 5, detection: 5, ap: 'L' });
      mockPfmeaFind.mockResolvedValue(makePfmea({ rows: [row] }));
      const result = await service.runReview({
        pfmeaId: 'pfmea-1', options: only('compliance'),
      });
      const f = result.findings.find(f => f.code === 'CMP-002');
      expect(f).toBeDefined();
      expect(f!.level).toBe('error');
    });

    it('CMP-002: error for out-of-range detection', async () => {
      const row = makeRow({ severity: 5, occurrence: 5, detection: 11, ap: 'L' });
      mockPfmeaFind.mockResolvedValue(makePfmea({ rows: [row] }));
      const result = await service.runReview({
        pfmeaId: 'pfmea-1', options: only('compliance'),
      });
      expect(result.findings.find(f => f.code === 'CMP-002')).toBeDefined();
    });

    it('CMP-003: error for empty failure mode', async () => {
      const row = makeRow({ failureMode: '' });
      mockPfmeaFind.mockResolvedValue(makePfmea({ rows: [row] }));
      const result = await service.runReview({
        pfmeaId: 'pfmea-1', options: only('compliance'),
      });
      const f = result.findings.find(f => f.code === 'CMP-003');
      expect(f).toBeDefined();
      expect(f!.level).toBe('error');
    });

    it('CMP-003: error for whitespace-only failure mode', async () => {
      const row = makeRow({ failureMode: '   ' });
      mockPfmeaFind.mockResolvedValue(makePfmea({ rows: [row] }));
      const result = await service.runReview({
        pfmeaId: 'pfmea-1', options: only('compliance'),
      });
      expect(result.findings.find(f => f.code === 'CMP-003')).toBeDefined();
    });

    it('CMP-004: warning for non-standard CP type', async () => {
      mockPfmeaFind.mockResolvedValue(makePfmea());
      mockCPFind.mockResolvedValue(makeCP({ type: 'Prototype' }));
      const result = await service.runReview({
        pfmeaId: 'pfmea-1', controlPlanId: 'cp-1', options: only('compliance'),
      });
      const f = result.findings.find(f => f.code === 'CMP-004');
      expect(f).toBeDefined();
      expect(f!.level).toBe('warning');
    });

    it('CMP-004: no warning for Production type', async () => {
      mockPfmeaFind.mockResolvedValue(makePfmea());
      mockCPFind.mockResolvedValue(makeCP({ type: 'Production' }));
      const result = await service.runReview({
        pfmeaId: 'pfmea-1', controlPlanId: 'cp-1', options: only('compliance'),
      });
      expect(result.findings.find(f => f.code === 'CMP-004')).toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════════════
  // Summary calculation
  // ═══════════════════════════════════════════════════

  describe('Summary calculation', () => {
    it('passRate = 0 when errors exist', async () => {
      mockPfmeaFind.mockResolvedValue(makePfmea({ docNo: null }));
      const result = await service.runReview({
        pfmeaId: 'pfmea-1', options: only('documentControl'),
      });
      expect(result.summary.errors).toBeGreaterThan(0);
      expect(result.summary.passRate).toBe(0);
    });

    it('passRate = 100 with no findings', async () => {
      mockPfmeaFind.mockResolvedValue(makePfmea());
      const result = await service.runReview({
        pfmeaId: 'pfmea-1', options: only('documentControl'),
      });
      expect(result.summary.totalFindings).toBe(0);
      expect(result.summary.passRate).toBe(100);
    });

    it('passRate decreases by 5 per warning (no errors)', async () => {
      const cpRows = [
        makeCPRow({ id: 'o1', sourcePfmeaRowId: null }),
        makeCPRow({ id: 'o2', sourcePfmeaRowId: null }),
      ];
      mockPfmeaFind.mockResolvedValue(makePfmea());
      mockCPFind.mockResolvedValue(makeCP({ rows: cpRows }));
      const result = await service.runReview({
        pfmeaId: 'pfmea-1', controlPlanId: 'cp-1', options: only('coverage'),
      });
      expect(result.summary.errors).toBe(0);
      expect(result.summary.warnings).toBe(2);
      expect(result.summary.passRate).toBe(90);
    });

    it('category breakdown counts correctly', async () => {
      mockPfmeaFind.mockResolvedValue(makePfmea({ docNo: null }));
      const result = await service.runReview({
        pfmeaId: 'pfmea-1', options: only('documentControl'),
      });
      expect(result.summary.categories.document_control.errors).toBe(1);
      expect(result.summary.categories.coverage.errors).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════
  // Recommendations
  // ═══════════════════════════════════════════════════

  describe('Recommendations', () => {
    it('generates coverage recommendation for coverage errors', async () => {
      const row = makeRow({ id: 'row-h', ap: 'H', severity: 9, occurrence: 1, detection: 1 });
      mockPfmeaFind.mockResolvedValue(makePfmea({ rows: [row] }));
      mockCPFind.mockResolvedValue(makeCP({ rows: [] }));
      const result = await service.runReview({
        pfmeaId: 'pfmea-1', controlPlanId: 'cp-1', options: only('coverage'),
      });
      expect(result.recommendations.some(r => r.includes('coverage gap'))).toBe(true);
    });

    it('generates "Excellent" when no findings', async () => {
      mockPfmeaFind.mockResolvedValue(makePfmea());
      const result = await service.runReview({ pfmeaId: 'pfmea-1' });
      expect(result.recommendations.some(r => r.includes('Excellent'))).toBe(true);
    });

    it('generates orphaned rows recommendation for COV-004', async () => {
      const cpRow = makeCPRow({ sourcePfmeaRowId: null });
      mockPfmeaFind.mockResolvedValue(makePfmea());
      mockCPFind.mockResolvedValue(makeCP({ rows: [cpRow] }));
      const result = await service.runReview({
        pfmeaId: 'pfmea-1', controlPlanId: 'cp-1', options: only('coverage'),
      });
      expect(result.recommendations.some(r => r.includes('orphaned'))).toBe(true);
    });

    it('generates priority recommendation for EFF-002', async () => {
      const row = makeRow({
        severity: 9, occurrence: 1, detection: 1,
        ap: 'H', preventionControls: [], detectionControls: [],
      });
      mockPfmeaFind.mockResolvedValue(makePfmea({ rows: [row] }));
      const result = await service.runReview({
        pfmeaId: 'pfmea-1', options: only('effectiveness'),
      });
      expect(result.recommendations.some(r => r.includes('prevention controls'))).toBe(true);
    });
  });
});
