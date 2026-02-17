import { describe, it, expect } from 'vitest';

// Test watermark text generation (pure logic, no PDF manipulation)

function generateWatermarkText(opts: {
  userName: string;
  date: Date;
  docNumber: string;
  currentRev: string;
}): string {
  const dateStr = opts.date.toISOString().substring(0, 16).replace('T', ' ');
  return `CONTROLLED COPY\nDownloaded by: ${opts.userName}\nDate: ${dateStr}\nDoc: ${opts.docNumber} Rev ${opts.currentRev}`;
}

function generatePrintWatermark(docNumber: string, currentRev: string): string {
  return `CONTROLLED COPY - ${docNumber} Rev ${currentRev}`;
}

function generateCopyNumbers(startFrom: number, count: number): number[] {
  return Array.from({ length: count }, (_, i) => startFrom + i + 1);
}

describe('Watermark Generation', () => {
  describe('Watermark Content', () => {
    it('should include CONTROLLED COPY text', () => {
      const text = generateWatermarkText({
        userName: 'John Smith',
        date: new Date('2026-02-15T10:30:00Z'),
        docNumber: 'DOC-001',
        currentRev: 'A',
      });
      expect(text).toContain('CONTROLLED COPY');
    });

    it('should include recipient name', () => {
      const text = generateWatermarkText({
        userName: 'Jane Doe',
        date: new Date('2026-02-15T10:30:00Z'),
        docNumber: 'DOC-001',
        currentRev: 'A',
      });
      expect(text).toContain('Jane Doe');
    });

    it('should include date in correct format', () => {
      const text = generateWatermarkText({
        userName: 'John Smith',
        date: new Date('2026-02-15T10:30:00Z'),
        docNumber: 'DOC-001',
        currentRev: 'A',
      });
      expect(text).toContain('2026-02-15 10:30');
    });

    it('should include document number and revision', () => {
      const text = generateWatermarkText({
        userName: 'John Smith',
        date: new Date('2026-02-15T10:30:00Z'),
        docNumber: 'WI-2026-001',
        currentRev: 'B',
      });
      expect(text).toContain('Doc: WI-2026-001 Rev B');
    });

    it('should have correct multiline structure', () => {
      const text = generateWatermarkText({
        userName: 'John Smith',
        date: new Date('2026-02-15T10:30:00Z'),
        docNumber: 'DOC-001',
        currentRev: 'A',
      });
      const lines = text.split('\n');
      expect(lines).toHaveLength(4);
      expect(lines[0]).toBe('CONTROLLED COPY');
      expect(lines[1]).toMatch(/^Downloaded by:/);
      expect(lines[2]).toMatch(/^Date:/);
      expect(lines[3]).toMatch(/^Doc:/);
    });
  });

  describe('Print Watermark', () => {
    it('should include CONTROLLED COPY with doc info', () => {
      const text = generatePrintWatermark('DOC-001', 'A');
      expect(text).toBe('CONTROLLED COPY - DOC-001 Rev A');
    });

    it('should handle multi-letter revisions', () => {
      const text = generatePrintWatermark('DOC-001', 'AA');
      expect(text).toBe('CONTROLLED COPY - DOC-001 Rev AA');
    });
  });

  describe('Copy Number Generation', () => {
    it('should generate sequential copy numbers starting from offset', () => {
      const copies = generateCopyNumbers(0, 3);
      expect(copies).toEqual([1, 2, 3]);
    });

    it('should continue from existing count', () => {
      const copies = generateCopyNumbers(5, 3);
      expect(copies).toEqual([6, 7, 8]);
    });

    it('should return empty array for zero copies', () => {
      const copies = generateCopyNumbers(0, 0);
      expect(copies).toEqual([]);
    });

    it('should generate single copy', () => {
      const copies = generateCopyNumbers(10, 1);
      expect(copies).toEqual([11]);
    });
  });
});
