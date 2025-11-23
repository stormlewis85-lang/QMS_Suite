// AIAG-VDA 2019 Action Priority Calculator

export type AP = 'H' | 'M' | 'L';

export interface APCalculationResult {
  ap: AP;
  reason: string;
}

interface RatingScale {
  rating: number;
  description: string;
  criteria: string;
}

interface APMatrix {
  S: RatingScale[];
  O: RatingScale[];
  D: RatingScale[];
}

export class APCalculator {
  constructor(private matrix: APMatrix) {}

  /**
   * Calculate Action Priority per AIAG-VDA 2019 methodology
   * @param S Severity (1-10)
   * @param O Occurrence (1-10)
   * @param D Detection (1-10)
   */
  calculate(S: number, O: number, D: number): APCalculationResult {
    // AIAG-VDA 2019 Action Priority Logic
    
    // HIGH: S ≥ 9 regardless of O or D (Safety/Regulatory critical)
    if (S >= 9) {
      return { ap: 'H', reason: 'Severity ≥ 9 (Safety/Regulatory critical)' };
    }

    // HIGH: S = 7-8 AND O ≥ 7 (High severity with high occurrence)
    if (S >= 7 && S <= 8 && O >= 7) {
      return { ap: 'H', reason: 'Severity 7-8 with high occurrence ≥ 7' };
    }

    // HIGH: S = 7-8 AND D ≥ 7 (High severity with poor detection)
    if (S >= 7 && S <= 8 && D >= 7) {
      return { ap: 'H', reason: 'Severity 7-8 with poor detection ≥ 7' };
    }

    // HIGH: Detection-only (D ≥ 9) regardless of S/O (No control/detection)
    if (D >= 9) {
      return { ap: 'H', reason: 'Detection ≥ 9 (no detection control)' };
    }

    // MEDIUM: S = 5-6 AND (O ≥ 7 OR D ≥ 7)
    if (S >= 5 && S <= 6 && (O >= 7 || D >= 7)) {
      return { ap: 'M', reason: 'Moderate severity with high O or D' };
    }

    // MEDIUM: S = 7-8 AND O = 4-6 AND D = 4-6
    if (S >= 7 && S <= 8 && O >= 4 && O <= 6 && D >= 4 && D <= 6) {
      return { ap: 'M', reason: 'High severity with moderate O and D' };
    }

    // LOW: All other combinations
    return { ap: 'L', reason: 'Low risk - effective controls in place' };
  }

  /**
   * Recompute AP for multiple rows
   */
  recompute(rows: Array<{ severity: number; occurrence: number; detection: number }>): Array<APCalculationResult> {
    return rows.map(({ severity, occurrence, detection }) => 
      this.calculate(severity, occurrence, detection)
    );
  }

  /**
   * Validate S/O/D ratings are in valid range
   */
  validateRatings(S: number, O: number, D: number): boolean {
    return (
      S >= 1 && S <= 10 &&
      O >= 1 && O <= 10 &&
      D >= 1 && D <= 10
    );
  }
}

/**
 * Create AP Calculator with AIAG-VDA 2019 matrix
 */
export function createAPCalculator(matrix: APMatrix): APCalculator {
  return new APCalculator(matrix);
}
