import { describe, it, expect } from 'vitest';
import { computeDocumentHash } from '../test-helpers';

describe('Document Hash', () => {
  it('should include document number in hash', () => {
    const hash1 = computeDocumentHash('DOC-001', 'A', []);
    const hash2 = computeDocumentHash('DOC-002', 'A', []);
    expect(hash1).not.toBe(hash2);
  });

  it('should include revision letter in hash', () => {
    const hash1 = computeDocumentHash('DOC-001', 'A', []);
    const hash2 = computeDocumentHash('DOC-001', 'B', []);
    expect(hash1).not.toBe(hash2);
  });

  it('should include all file checksums sorted', () => {
    const hash1 = computeDocumentHash('DOC-001', 'A', ['abc123', 'def456']);
    const hash2 = computeDocumentHash('DOC-001', 'A', ['def456', 'abc123']);
    // Same checksums in different order should produce same hash
    expect(hash1).toBe(hash2);
  });

  it('should be deterministic for same input', () => {
    const hash1 = computeDocumentHash('DOC-001', 'A', ['checksum1']);
    const hash2 = computeDocumentHash('DOC-001', 'A', ['checksum1']);
    expect(hash1).toBe(hash2);
  });

  it('should differ when any component changes', () => {
    const base = computeDocumentHash('DOC-001', 'A', ['checksum1']);
    const diffDoc = computeDocumentHash('DOC-002', 'A', ['checksum1']);
    const diffRev = computeDocumentHash('DOC-001', 'B', ['checksum1']);
    const diffFile = computeDocumentHash('DOC-001', 'A', ['checksum2']);
    const addedFile = computeDocumentHash('DOC-001', 'A', ['checksum1', 'checksum2']);

    expect(base).not.toBe(diffDoc);
    expect(base).not.toBe(diffRev);
    expect(base).not.toBe(diffFile);
    expect(base).not.toBe(addedFile);
  });

  it('should produce different hash when file added', () => {
    const without = computeDocumentHash('DOC-001', 'A', []);
    const withFile = computeDocumentHash('DOC-001', 'A', ['file-hash-1']);
    expect(without).not.toBe(withFile);
  });

  it('should return a valid SHA-256 hex string', () => {
    const hash = computeDocumentHash('DOC-001', 'A', []);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });
});
