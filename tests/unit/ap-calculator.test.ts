import { describe, it, expect } from 'vitest';
import {
  calculateAP,
  calculateAPBatch,
  getAPStatistics,
  suggestSeverityFromEffectCategory,
  suggestDetectionFromControlCategory,
} from '../../server/services/ap-calculator';

describe('AP Calculator — AIAG-VDA 2019', () => {

  // ==========================================
  // Input validation
  // ==========================================

  describe('Input validation', () => {
    it('should reject severity below 1', () => {
      expect(() => calculateAP({ severity: 0, occurrence: 5, detection: 5 })).toThrow('must be between 1 and 10');
    });

    it('should reject severity above 10', () => {
      expect(() => calculateAP({ severity: 11, occurrence: 5, detection: 5 })).toThrow('must be between 1 and 10');
    });

    it('should reject occurrence below 1', () => {
      expect(() => calculateAP({ severity: 5, occurrence: 0, detection: 5 })).toThrow('must be between 1 and 10');
    });

    it('should reject occurrence above 10', () => {
      expect(() => calculateAP({ severity: 5, occurrence: 11, detection: 5 })).toThrow('must be between 1 and 10');
    });

    it('should reject detection below 1', () => {
      expect(() => calculateAP({ severity: 5, occurrence: 5, detection: 0 })).toThrow('must be between 1 and 10');
    });

    it('should reject detection above 10', () => {
      expect(() => calculateAP({ severity: 5, occurrence: 5, detection: 11 })).toThrow('must be between 1 and 10');
    });

    it('should reject negative values', () => {
      expect(() => calculateAP({ severity: -1, occurrence: 5, detection: 5 })).toThrow();
    });

    it('should accept boundary values 1 and 10', () => {
      expect(() => calculateAP({ severity: 1, occurrence: 1, detection: 1 })).not.toThrow();
      expect(() => calculateAP({ severity: 10, occurrence: 10, detection: 10 })).not.toThrow();
    });
  });

  // ==========================================
  // HIGH priority: Severity >= 9
  // ==========================================

  describe('HIGH priority — Severity >= 9', () => {
    it('S=9 O=1 D=1 → H (safety severity alone triggers high)', () => {
      expect(calculateAP({ severity: 9, occurrence: 1, detection: 1 }).priority).toBe('H');
    });

    it('S=10 O=1 D=1 → H (max severity)', () => {
      expect(calculateAP({ severity: 10, occurrence: 1, detection: 1 }).priority).toBe('H');
    });

    it('S=9 O=10 D=10 → H (all maxed)', () => {
      expect(calculateAP({ severity: 9, occurrence: 10, detection: 10 }).priority).toBe('H');
    });

    it('S=10 O=5 D=5 → H (mid O/D irrelevant)', () => {
      expect(calculateAP({ severity: 10, occurrence: 5, detection: 5 }).priority).toBe('H');
    });
  });

  // ==========================================
  // HIGH priority: S=7-8 AND O >= 7
  // ==========================================

  describe('HIGH priority — S 7-8 with O >= 7', () => {
    it('S=7 O=7 D=1 → H (boundary: both at 7)', () => {
      expect(calculateAP({ severity: 7, occurrence: 7, detection: 1 }).priority).toBe('H');
    });

    it('S=8 O=10 D=1 → H', () => {
      expect(calculateAP({ severity: 8, occurrence: 10, detection: 1 }).priority).toBe('H');
    });

    it('S=7 O=6 D=1 → L (O just below threshold)', () => {
      expect(calculateAP({ severity: 7, occurrence: 6, detection: 1 }).priority).toBe('L');
    });
  });

  // ==========================================
  // HIGH priority: S=7-8 AND D >= 7
  // ==========================================

  describe('HIGH priority — S 7-8 with D >= 7', () => {
    it('S=7 D=7 O=1 → H (boundary: both at 7)', () => {
      expect(calculateAP({ severity: 7, occurrence: 1, detection: 7 }).priority).toBe('H');
    });

    it('S=8 D=10 O=1 → H', () => {
      expect(calculateAP({ severity: 8, occurrence: 1, detection: 10 }).priority).toBe('H');
    });

    it('S=7 D=6 O=1 → L (D just below threshold)', () => {
      expect(calculateAP({ severity: 7, occurrence: 1, detection: 6 }).priority).toBe('L');
    });
  });

  // ==========================================
  // HIGH priority: Detection >= 9
  // ==========================================

  describe('HIGH priority — Detection >= 9', () => {
    it('D=9 S=1 O=1 → H (poor detection alone triggers high)', () => {
      expect(calculateAP({ severity: 1, occurrence: 1, detection: 9 }).priority).toBe('H');
    });

    it('D=10 S=1 O=1 → H (worst detection)', () => {
      expect(calculateAP({ severity: 1, occurrence: 1, detection: 10 }).priority).toBe('H');
    });

    it('D=8 S=1 O=1 → L (D just below threshold)', () => {
      expect(calculateAP({ severity: 1, occurrence: 1, detection: 8 }).priority).toBe('L');
    });
  });

  // ==========================================
  // MEDIUM priority: S=5-6 AND (O>=7 OR D>=7)
  // ==========================================

  describe('MEDIUM priority — S 5-6 with high O or D', () => {
    it('S=5 O=7 D=1 → M (boundary S and O)', () => {
      expect(calculateAP({ severity: 5, occurrence: 7, detection: 1 }).priority).toBe('M');
    });

    it('S=6 O=7 D=1 → M', () => {
      expect(calculateAP({ severity: 6, occurrence: 7, detection: 1 }).priority).toBe('M');
    });

    it('S=5 D=7 O=1 → M (high D triggers medium)', () => {
      expect(calculateAP({ severity: 5, occurrence: 1, detection: 7 }).priority).toBe('M');
    });

    it('S=6 D=8 O=1 → M (D>=7 but <9, so medium not high)', () => {
      expect(calculateAP({ severity: 6, occurrence: 1, detection: 8 }).priority).toBe('M');
    });

    it('S=5 O=6 D=6 → L (neither O nor D reaches 7)', () => {
      expect(calculateAP({ severity: 5, occurrence: 6, detection: 6 }).priority).toBe('L');
    });

    it('S=4 O=7 D=1 → L (S below medium range)', () => {
      expect(calculateAP({ severity: 4, occurrence: 7, detection: 1 }).priority).toBe('L');
    });
  });

  // ==========================================
  // LOW priority: all other combinations
  // ==========================================

  describe('LOW priority — remaining combinations', () => {
    it('S=1 O=1 D=1 → L (all minimum)', () => {
      expect(calculateAP({ severity: 1, occurrence: 1, detection: 1 }).priority).toBe('L');
    });

    it('S=7 O=5 D=5 → L (S 7-8 with mid O and D)', () => {
      expect(calculateAP({ severity: 7, occurrence: 5, detection: 5 }).priority).toBe('L');
    });

    it('S=8 O=4 D=4 → L (S 7-8 with O 4-6 and D 4-6)', () => {
      expect(calculateAP({ severity: 8, occurrence: 4, detection: 4 }).priority).toBe('L');
    });

    it('S=4 O=4 D=4 → L (all mid-range)', () => {
      expect(calculateAP({ severity: 4, occurrence: 4, detection: 4 }).priority).toBe('L');
    });

    it('S=3 O=10 D=10 → L (low severity overrides high O/D when below medium range)', () => {
      // S < 5 AND D < 9, so not H from detection; S < 5 so not M from severity range
      expect(calculateAP({ severity: 3, occurrence: 10, detection: 8 }).priority).toBe('L');
    });

    it('S=6 O=6 D=6 → L (S in medium range but O/D below 7)', () => {
      expect(calculateAP({ severity: 6, occurrence: 6, detection: 6 }).priority).toBe('L');
    });
  });

  // ==========================================
  // Boundary transitions
  // ==========================================

  describe('Boundary transitions', () => {
    it('S=8→9 boundary with low O/D: L→H', () => {
      expect(calculateAP({ severity: 8, occurrence: 1, detection: 1 }).priority).toBe('L');
      expect(calculateAP({ severity: 9, occurrence: 1, detection: 1 }).priority).toBe('H');
    });

    it('D=8→9 boundary with low S/O: L→H', () => {
      expect(calculateAP({ severity: 1, occurrence: 1, detection: 8 }).priority).toBe('L');
      expect(calculateAP({ severity: 1, occurrence: 1, detection: 9 }).priority).toBe('H');
    });

    it('S=6→7 with O=7: M→H', () => {
      expect(calculateAP({ severity: 6, occurrence: 7, detection: 1 }).priority).toBe('M');
      expect(calculateAP({ severity: 7, occurrence: 7, detection: 1 }).priority).toBe('H');
    });

    it('S=4→5 with O=7: L→M', () => {
      expect(calculateAP({ severity: 4, occurrence: 7, detection: 1 }).priority).toBe('L');
      expect(calculateAP({ severity: 5, occurrence: 7, detection: 1 }).priority).toBe('M');
    });

    it('O=6→7 with S=7: L→H', () => {
      expect(calculateAP({ severity: 7, occurrence: 6, detection: 1 }).priority).toBe('L');
      expect(calculateAP({ severity: 7, occurrence: 7, detection: 1 }).priority).toBe('H');
    });
  });

  // ==========================================
  // AP result metadata
  // ==========================================

  describe('AP result metadata', () => {
    it('H result has correct label, description, colorClass', () => {
      const result = calculateAP({ severity: 10, occurrence: 10, detection: 10 });
      expect(result.priority).toBe('H');
      expect(result.label).toBe('High');
      expect(result.description).toContain('Highest priority');
      expect(result.colorClass).toContain('red');
    });

    it('M result has correct metadata', () => {
      const result = calculateAP({ severity: 5, occurrence: 7, detection: 1 });
      expect(result.priority).toBe('M');
      expect(result.label).toBe('Medium');
      expect(result.colorClass).toContain('yellow');
    });

    it('L result has correct metadata', () => {
      const result = calculateAP({ severity: 1, occurrence: 1, detection: 1 });
      expect(result.priority).toBe('L');
      expect(result.label).toBe('Low');
      expect(result.colorClass).toContain('green');
    });
  });

  // ==========================================
  // Batch + statistics
  // ==========================================

  describe('Batch calculation', () => {
    it('should calculate AP for multiple inputs', () => {
      const results = calculateAPBatch([
        { severity: 10, occurrence: 1, detection: 1 },
        { severity: 5, occurrence: 7, detection: 1 },
        { severity: 1, occurrence: 1, detection: 1 },
      ]);
      expect(results).toHaveLength(3);
      expect(results[0].priority).toBe('H');
      expect(results[1].priority).toBe('M');
      expect(results[2].priority).toBe('L');
    });

    it('should return empty array for empty input', () => {
      expect(calculateAPBatch([])).toHaveLength(0);
    });
  });

  describe('AP statistics', () => {
    it('should count H/M/L correctly', () => {
      const stats = getAPStatistics([
        { severity: 10, occurrence: 1, detection: 1 }, // H
        { severity: 9, occurrence: 5, detection: 5 },  // H
        { severity: 5, occurrence: 7, detection: 1 },  // M
        { severity: 1, occurrence: 1, detection: 1 },  // L
        { severity: 2, occurrence: 2, detection: 2 },  // L
      ]);
      expect(stats.high).toBe(2);
      expect(stats.medium).toBe(1);
      expect(stats.low).toBe(2);
      expect(stats.total).toBe(5);
    });

    it('should return zeros for empty input', () => {
      const stats = getAPStatistics([]);
      expect(stats).toEqual({ high: 0, medium: 0, low: 0, total: 0 });
    });
  });

  // ==========================================
  // Severity suggestion from effect category
  // ==========================================

  describe('suggestSeverityFromEffectCategory', () => {
    it('safety_no_warning → 10', () => {
      const result = suggestSeverityFromEffectCategory('safety_no_warning');
      expect(result).toEqual({ min: 10, max: 10, suggested: 10 });
    });

    it('safety_with_warning → 9', () => {
      const result = suggestSeverityFromEffectCategory('safety_with_warning');
      expect(result).toEqual({ min: 9, max: 9, suggested: 9 });
    });

    it('no_effect → 1', () => {
      const result = suggestSeverityFromEffectCategory('no_effect');
      expect(result).toEqual({ min: 1, max: 1, suggested: 1 });
    });

    it('unknown category → null', () => {
      expect(suggestSeverityFromEffectCategory('not_a_category')).toBeNull();
    });

    it('primary_function_loss → 7-8 suggested 8', () => {
      const result = suggestSeverityFromEffectCategory('primary_function_loss');
      expect(result).toEqual({ min: 7, max: 8, suggested: 8 });
    });
  });

  // ==========================================
  // Detection suggestion from control category
  // ==========================================

  describe('suggestDetectionFromControlCategory', () => {
    it('error_proofing_prevent → 1 (best detection)', () => {
      const result = suggestDetectionFromControlCategory('error_proofing_prevent');
      expect(result).toEqual({ min: 1, max: 1, suggested: 1 });
    });

    it('no_detection → 10 (worst detection)', () => {
      const result = suggestDetectionFromControlCategory('no_detection');
      expect(result).toEqual({ min: 10, max: 10, suggested: 10 });
    });

    it('spc_monitoring → 4-5 suggested 5', () => {
      const result = suggestDetectionFromControlCategory('spc_monitoring');
      expect(result).toEqual({ min: 4, max: 5, suggested: 5 });
    });

    it('unknown category → null', () => {
      expect(suggestDetectionFromControlCategory('not_a_category')).toBeNull();
    });
  });
});
