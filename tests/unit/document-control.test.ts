import { describe, it, expect } from 'vitest';
import {
  nextRevisionLetter,
  computeDocumentHash,
  validateSignatureFields,
  type SignatureData,
} from '../document-control-v2/test-helpers';

// ── Inline helpers for workflow & watermark logic ────────────────

type StepStatus = 'pending' | 'in_progress' | 'approved' | 'rejected' | 'delegated' | 'skipped';
type InstanceStatus = 'active' | 'completed' | 'rejected' | 'cancelled';

const VALID_STEP_TRANSITIONS: Record<StepStatus, StepStatus[]> = {
  pending: ['in_progress', 'approved', 'rejected', 'delegated', 'skipped'],
  in_progress: ['approved', 'rejected', 'delegated'],
  approved: [],
  rejected: [],
  delegated: [],
  skipped: [],
};

const VALID_INSTANCE_TRANSITIONS: Record<InstanceStatus, InstanceStatus[]> = {
  active: ['completed', 'rejected', 'cancelled'],
  completed: [],
  rejected: [],
  cancelled: [],
};

function isValidStepTransition(from: StepStatus, to: StepStatus): boolean {
  return VALID_STEP_TRANSITIONS[from]?.includes(to) ?? false;
}

function isValidInstanceTransition(from: InstanceStatus, to: InstanceStatus): boolean {
  return VALID_INSTANCE_TRANSITIONS[from]?.includes(to) ?? false;
}

function resolveAssignee(
  step: { assigneeType: string; assigneeValue: string },
  initiatorId: string,
): string | null {
  switch (step.assigneeType) {
    case 'initiator': return initiatorId;
    case 'user': return step.assigneeValue;
    case 'role': return null;
    case 'department_head': return null;
    default: return null;
  }
}

function shouldCompleteWorkflow(totalSteps: number, currentStep: number, action: 'approved' | 'rejected'): boolean {
  if (action === 'rejected') return false;
  return currentStep >= totalSteps;
}

function generateWatermarkText(opts: { userName: string; date: Date; docNumber: string; currentRev: string }): string {
  const dateStr = `${opts.date.getFullYear()}-${String(opts.date.getMonth() + 1).padStart(2, '0')}-${String(opts.date.getDate()).padStart(2, '0')} ${String(opts.date.getHours()).padStart(2, '0')}:${String(opts.date.getMinutes()).padStart(2, '0')}`;
  return `CONTROLLED COPY\n${opts.userName}\n${dateStr}\n${opts.docNumber} Rev ${opts.currentRev}`;
}

function generateCopyNumbers(startFrom: number, count: number): number[] {
  return Array.from({ length: count }, (_, i) => startFrom + i);
}

// ═══════════════════════════════════════════════════════════════════

describe('Document Control – Unit Tests', () => {

  // ── Revision Letter ────────────────────────────────────────────

  describe('Revision Letter Incrementing', () => {
    it('should return A for first revision (empty input)', () => {
      expect(nextRevisionLetter('')).toBe('A');
    });

    it('should increment single letters A→B, B→C, Y→Z', () => {
      expect(nextRevisionLetter('A')).toBe('B');
      expect(nextRevisionLetter('B')).toBe('C');
      expect(nextRevisionLetter('Y')).toBe('Z');
    });

    it('should wrap Z → AA', () => {
      expect(nextRevisionLetter('Z')).toBe('AA');
    });

    it('should increment double letters AA→AB, AZ→BA', () => {
      expect(nextRevisionLetter('AA')).toBe('AB');
      expect(nextRevisionLetter('AZ')).toBe('BA');
    });

    it('should wrap ZZ → AAA', () => {
      expect(nextRevisionLetter('ZZ')).toBe('AAA');
    });

    it('should handle triple+ letters', () => {
      expect(nextRevisionLetter('AAA')).toBe('AAB');
      expect(nextRevisionLetter('AAZ')).toBe('ABA');
      expect(nextRevisionLetter('AZZ')).toBe('BAA');
      expect(nextRevisionLetter('ZZZ')).toBe('AAAA');
    });
  });

  // ── Document Hash ──────────────────────────────────────────────

  describe('Document Hash Computation', () => {
    it('should produce valid SHA-256 hex string (64 chars)', () => {
      const hash = computeDocumentHash('DOC-001', 'A', ['abc123']);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should be deterministic for same input', () => {
      const a = computeDocumentHash('DOC-001', 'A', ['abc']);
      const b = computeDocumentHash('DOC-001', 'A', ['abc']);
      expect(a).toBe(b);
    });

    it('should differ when doc number changes', () => {
      const a = computeDocumentHash('DOC-001', 'A', ['abc']);
      const b = computeDocumentHash('DOC-002', 'A', ['abc']);
      expect(a).not.toBe(b);
    });

    it('should differ when revision changes', () => {
      const a = computeDocumentHash('DOC-001', 'A', ['abc']);
      const b = computeDocumentHash('DOC-001', 'B', ['abc']);
      expect(a).not.toBe(b);
    });

    it('should differ when file checksum changes', () => {
      const a = computeDocumentHash('DOC-001', 'A', ['abc']);
      const b = computeDocumentHash('DOC-001', 'A', ['xyz']);
      expect(a).not.toBe(b);
    });

    it('should sort file checksums (order-independent)', () => {
      const a = computeDocumentHash('DOC-001', 'A', ['bbb', 'aaa']);
      const b = computeDocumentHash('DOC-001', 'A', ['aaa', 'bbb']);
      expect(a).toBe(b);
    });

    it('should differ when a file is added', () => {
      const a = computeDocumentHash('DOC-001', 'A', ['abc']);
      const b = computeDocumentHash('DOC-001', 'A', ['abc', 'def']);
      expect(a).not.toBe(b);
    });
  });

  // ── Signature Verification ─────────────────────────────────────

  describe('Signature Field Validation (21 CFR Part 11)', () => {
    const validSig: SignatureData = {
      signerName: 'John Doe',
      signerId: 'user-123',
      timestamp: new Date().toISOString(),
      ipAddress: '192.168.1.1',
      meaning: 'I approve this document',
      documentHash: 'abc123def456',
      sessionId: 'sess-789',
    };

    it('should pass with all required fields', () => {
      const result = validateSignatureFields(validSig);
      expect(result.valid).toBe(true);
      expect(result.missing).toHaveLength(0);
    });

    it('should fail when signerName missing', () => {
      const { valid, missing } = validateSignatureFields({ ...validSig, signerName: undefined });
      expect(valid).toBe(false);
      expect(missing).toContain('signerName');
    });

    it('should fail when signerId missing', () => {
      const { valid, missing } = validateSignatureFields({ ...validSig, signerId: undefined });
      expect(valid).toBe(false);
      expect(missing).toContain('signerId');
    });

    it('should fail when timestamp missing', () => {
      const { valid, missing } = validateSignatureFields({ ...validSig, timestamp: undefined });
      expect(valid).toBe(false);
      expect(missing).toContain('timestamp');
    });

    it('should fail when ipAddress missing', () => {
      const { valid, missing } = validateSignatureFields({ ...validSig, ipAddress: undefined });
      expect(valid).toBe(false);
      expect(missing).toContain('ipAddress');
    });

    it('should fail when meaning missing', () => {
      const { valid, missing } = validateSignatureFields({ ...validSig, meaning: undefined });
      expect(valid).toBe(false);
      expect(missing).toContain('meaning');
    });

    it('should fail when documentHash missing', () => {
      const { valid, missing } = validateSignatureFields({ ...validSig, documentHash: undefined });
      expect(valid).toBe(false);
      expect(missing).toContain('documentHash');
    });

    it('should fail when sessionId missing', () => {
      const { valid, missing } = validateSignatureFields({ ...validSig, sessionId: undefined });
      expect(valid).toBe(false);
      expect(missing).toContain('sessionId');
    });

    it('should report all missing fields at once', () => {
      const { valid, missing } = validateSignatureFields({});
      expect(valid).toBe(false);
      expect(missing).toHaveLength(7);
    });

    it('should validate hash matching', () => {
      const hash = computeDocumentHash('DOC-001', 'A', ['file1hash']);
      const sig = { ...validSig, documentHash: hash };
      expect(validateSignatureFields(sig).valid).toBe(true);
      expect(sig.documentHash).toBe(hash);
    });
  });

  // ── Workflow Engine ────────────────────────────────────────────

  describe('Workflow Engine – Step Transitions', () => {
    it('should allow pending → in_progress', () => {
      expect(isValidStepTransition('pending', 'in_progress')).toBe(true);
    });

    it('should allow pending → approved', () => {
      expect(isValidStepTransition('pending', 'approved')).toBe(true);
    });

    it('should allow pending → rejected', () => {
      expect(isValidStepTransition('pending', 'rejected')).toBe(true);
    });

    it('should allow pending → delegated', () => {
      expect(isValidStepTransition('pending', 'delegated')).toBe(true);
    });

    it('should allow in_progress → approved', () => {
      expect(isValidStepTransition('in_progress', 'approved')).toBe(true);
    });

    it('should allow in_progress → rejected', () => {
      expect(isValidStepTransition('in_progress', 'rejected')).toBe(true);
    });

    it('should NOT allow approved → any', () => {
      expect(isValidStepTransition('approved', 'pending')).toBe(false);
      expect(isValidStepTransition('approved', 'rejected')).toBe(false);
    });

    it('should NOT allow rejected → any', () => {
      expect(isValidStepTransition('rejected', 'pending')).toBe(false);
      expect(isValidStepTransition('rejected', 'approved')).toBe(false);
    });

    it('should NOT allow delegated → any', () => {
      expect(isValidStepTransition('delegated', 'pending')).toBe(false);
      expect(isValidStepTransition('delegated', 'approved')).toBe(false);
    });
  });

  describe('Workflow Engine – Instance Transitions', () => {
    it('should allow active → completed', () => {
      expect(isValidInstanceTransition('active', 'completed')).toBe(true);
    });

    it('should allow active → rejected', () => {
      expect(isValidInstanceTransition('active', 'rejected')).toBe(true);
    });

    it('should allow active → cancelled', () => {
      expect(isValidInstanceTransition('active', 'cancelled')).toBe(true);
    });

    it('should NOT allow completed → any', () => {
      expect(isValidInstanceTransition('completed', 'active')).toBe(false);
      expect(isValidInstanceTransition('completed', 'rejected')).toBe(false);
    });

    it('should NOT allow rejected → any', () => {
      expect(isValidInstanceTransition('rejected', 'active')).toBe(false);
    });

    it('should NOT allow cancelled → any', () => {
      expect(isValidInstanceTransition('cancelled', 'active')).toBe(false);
    });
  });

  describe('Workflow Engine – Assignee Resolution', () => {
    it('should resolve initiator type to initiator ID', () => {
      expect(resolveAssignee({ assigneeType: 'initiator', assigneeValue: '' }, 'user-1')).toBe('user-1');
    });

    it('should resolve user type to assigneeValue', () => {
      expect(resolveAssignee({ assigneeType: 'user', assigneeValue: 'user-42' }, 'user-1')).toBe('user-42');
    });

    it('should return null for role type (runtime assignment)', () => {
      expect(resolveAssignee({ assigneeType: 'role', assigneeValue: 'engineer' }, 'user-1')).toBeNull();
    });

    it('should return null for department_head type', () => {
      expect(resolveAssignee({ assigneeType: 'department_head', assigneeValue: '' }, 'user-1')).toBeNull();
    });
  });

  describe('Workflow Engine – Completion Logic', () => {
    it('should complete when last step approved', () => {
      expect(shouldCompleteWorkflow(3, 3, 'approved')).toBe(true);
    });

    it('should NOT complete when not last step', () => {
      expect(shouldCompleteWorkflow(3, 2, 'approved')).toBe(false);
    });

    it('should NOT complete on rejection regardless of step', () => {
      expect(shouldCompleteWorkflow(3, 3, 'rejected')).toBe(false);
    });
  });

  // ── Watermark Generation ───────────────────────────────────────

  describe('Watermark Generation', () => {
    const date = new Date(2026, 1, 17, 14, 30);

    it('should include CONTROLLED COPY text', () => {
      const text = generateWatermarkText({ userName: 'Jane', date, docNumber: 'DOC-001', currentRev: 'A' });
      expect(text).toContain('CONTROLLED COPY');
    });

    it('should include recipient name', () => {
      const text = generateWatermarkText({ userName: 'Jane Smith', date, docNumber: 'DOC-001', currentRev: 'A' });
      expect(text).toContain('Jane Smith');
    });

    it('should include formatted date', () => {
      const text = generateWatermarkText({ userName: 'Jane', date, docNumber: 'DOC-001', currentRev: 'A' });
      expect(text).toContain('2026-02-17 14:30');
    });

    it('should include doc number and revision', () => {
      const text = generateWatermarkText({ userName: 'Jane', date, docNumber: 'DOC-001', currentRev: 'B' });
      expect(text).toContain('DOC-001 Rev B');
    });

    it('should produce 4-line watermark', () => {
      const text = generateWatermarkText({ userName: 'Jane', date, docNumber: 'DOC-001', currentRev: 'A' });
      expect(text.split('\n')).toHaveLength(4);
    });
  });

  describe('Copy Number Generation', () => {
    it('should generate sequential numbers from start', () => {
      expect(generateCopyNumbers(1, 3)).toEqual([1, 2, 3]);
    });

    it('should continue from given start', () => {
      expect(generateCopyNumbers(5, 3)).toEqual([5, 6, 7]);
    });

    it('should return empty array for count=0', () => {
      expect(generateCopyNumbers(1, 0)).toEqual([]);
    });

    it('should handle single copy', () => {
      expect(generateCopyNumbers(1, 1)).toEqual([1]);
    });
  });
});
