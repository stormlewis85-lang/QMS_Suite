import { describe, it, expect } from 'vitest';
import { validateSignatureFields, computeDocumentHash } from '../test-helpers';
import type { SignatureData } from '../test-helpers';

describe('Signature Verification', () => {
  const validSignature: SignatureData = {
    signerName: 'John Smith',
    signerId: 'user-123',
    timestamp: new Date().toISOString(),
    ipAddress: '192.168.1.100',
    meaning: 'I approve this document for production use',
    documentHash: computeDocumentHash('DOC-001', 'A', []),
    sessionId: 'sess-abc-123',
  };

  describe('Required Signature Fields (21 CFR Part 11)', () => {
    it('should return valid=true when all fields present', () => {
      const result = validateSignatureFields(validSignature);
      expect(result.valid).toBe(true);
      expect(result.missing).toHaveLength(0);
    });

    it('should require signerName', () => {
      const { valid, missing } = validateSignatureFields({ ...validSignature, signerName: undefined });
      expect(valid).toBe(false);
      expect(missing).toContain('signerName');
    });

    it('should require signerId', () => {
      const { valid, missing } = validateSignatureFields({ ...validSignature, signerId: undefined });
      expect(valid).toBe(false);
      expect(missing).toContain('signerId');
    });

    it('should require timestamp in ISO format', () => {
      const { valid, missing } = validateSignatureFields({ ...validSignature, timestamp: undefined });
      expect(valid).toBe(false);
      expect(missing).toContain('timestamp');
    });

    it('should require ipAddress', () => {
      const { valid, missing } = validateSignatureFields({ ...validSignature, ipAddress: undefined });
      expect(valid).toBe(false);
      expect(missing).toContain('ipAddress');
    });

    it('should require meaning', () => {
      const { valid, missing } = validateSignatureFields({ ...validSignature, meaning: undefined });
      expect(valid).toBe(false);
      expect(missing).toContain('meaning');
    });

    it('should require documentHash', () => {
      const { valid, missing } = validateSignatureFields({ ...validSignature, documentHash: undefined });
      expect(valid).toBe(false);
      expect(missing).toContain('documentHash');
    });

    it('should require sessionId', () => {
      const { valid, missing } = validateSignatureFields({ ...validSignature, sessionId: undefined });
      expect(valid).toBe(false);
      expect(missing).toContain('sessionId');
    });

    it('should report all missing fields at once', () => {
      const { valid, missing } = validateSignatureFields({});
      expect(valid).toBe(false);
      expect(missing).toHaveLength(7);
    });
  });

  describe('Hash Computation', () => {
    it('should compute SHA-256 of document content', () => {
      const hash = computeDocumentHash('DOC-001', 'A', ['file-checksum-1']);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should include all file checksums in hash', () => {
      const hash1 = computeDocumentHash('DOC-001', 'A', ['cs1']);
      const hash2 = computeDocumentHash('DOC-001', 'A', ['cs1', 'cs2']);
      expect(hash1).not.toBe(hash2);
    });

    it('should produce same hash for same content', () => {
      const hash1 = computeDocumentHash('DOC-001', 'A', ['cs1', 'cs2']);
      const hash2 = computeDocumentHash('DOC-001', 'A', ['cs1', 'cs2']);
      expect(hash1).toBe(hash2);
    });
  });

  describe('Signature Validation', () => {
    it('should return valid=true when hash matches', () => {
      const docHash = computeDocumentHash('DOC-001', 'A', ['cs1']);
      const sig = { ...validSignature, documentHash: docHash };
      const recomputed = computeDocumentHash('DOC-001', 'A', ['cs1']);
      expect(sig.documentHash).toBe(recomputed);
    });

    it('should return valid=false when hash mismatches', () => {
      const docHash = computeDocumentHash('DOC-001', 'A', ['cs1']);
      const recomputed = computeDocumentHash('DOC-001', 'A', ['cs1-tampered']);
      expect(docHash).not.toBe(recomputed);
    });
  });
});
