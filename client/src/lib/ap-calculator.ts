/**
 * AIAG-VDA 2019 Action Priority (AP) Calculator
 * 
 * This module implements the AIAG-VDA 2019 harmonized PFMEA methodology
 * for calculating Action Priority based on Severity, Occurrence, and Detection ratings.
 * 
 * Reference: AIAG & VDA FMEA Handbook, First Edition, June 2019
 */

// ============================================================================
// Types & Interfaces
// ============================================================================

export type APLevel = 'H' | 'M' | 'L';
export type RatingKind = 'S' | 'O' | 'D';

export interface RatingScaleEntry {
  rating: number;
  description: string;
  criteria: string;
}

export interface APCalculationResult {
  ap: APLevel;
  reason: string;
  rpn: number;
}

export interface APValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface RatingRecommendation {
  rating: number;
  description: string;
  criteria: string;
  isRecommended: boolean;
  reason?: string;
}

// ============================================================================
// AIAG-VDA 2019 Rating Scales
// ============================================================================

export const SEVERITY_SCALE: RatingScaleEntry[] = [
  { rating: 10, description: 'Hazardous - without warning', criteria: 'May endanger operator/assembly personnel. Failure mode affects safe vehicle operation and/or involves non-compliance with government regulations. Failure will occur without warning.' },
  { rating: 9, description: 'Hazardous - with warning', criteria: 'May endanger operator/assembly personnel. Failure mode affects safe vehicle operation and/or involves non-compliance with government regulations. Failure will occur with warning.' },
  { rating: 8, description: 'Very High', criteria: 'Vehicle/item inoperable with loss of primary function. Customer very dissatisfied.' },
  { rating: 7, description: 'High', criteria: 'Vehicle/item operable but at reduced level of performance. Customer dissatisfied.' },
  { rating: 6, description: 'Moderate', criteria: 'Vehicle/item operable with comfort/convenience items inoperable. Customer experiences discomfort.' },
  { rating: 5, description: 'Low', criteria: 'Vehicle/item operable with comfort/convenience items at reduced level. Customer experiences some dissatisfaction.' },
  { rating: 4, description: 'Very Low', criteria: 'Fit/finish or squeak/rattle item does not conform. Defect noticed by most customers.' },
  { rating: 3, description: 'Minor', criteria: 'Fit/finish or squeak/rattle item does not conform. Defect noticed by average customers.' },
  { rating: 2, description: 'Very Minor', criteria: 'Fit/finish or squeak/rattle item does not conform. Defect noticed by discriminating customers.' },
  { rating: 1, description: 'None', criteria: 'No discernible effect.' },
];

export const OCCURRENCE_SCALE: RatingScaleEntry[] = [
  { rating: 10, description: 'Very High', criteria: '≥1 in 2 — Cpk < 0.33 — Failure is almost inevitable' },
  { rating: 9, description: 'Very High', criteria: '1 in 3 — Cpk ≥ 0.33 — Failures very likely' },
  { rating: 8, description: 'High', criteria: '1 in 8 — Cpk ≥ 0.51 — Repeated failures' },
  { rating: 7, description: 'High', criteria: '1 in 20 — Cpk ≥ 0.67 — Frequent failures' },
  { rating: 6, description: 'Moderate', criteria: '1 in 80 — Cpk ≥ 0.83 — Occasional failures' },
  { rating: 5, description: 'Moderate', criteria: '1 in 400 — Cpk ≥ 1.00 — Infrequent failures' },
  { rating: 4, description: 'Moderate', criteria: '1 in 2,000 — Cpk ≥ 1.17 — Relatively few failures' },
  { rating: 3, description: 'Low', criteria: '1 in 15,000 — Cpk ≥ 1.33 — Isolated failures' },
  { rating: 2, description: 'Very Low', criteria: '1 in 150,000 — Cpk ≥ 1.50 — Only rare failures' },
  { rating: 1, description: 'Remote', criteria: '<1 in 1,500,000 — Cpk ≥ 1.67 — Failure unlikely' },
];

export const DETECTION_SCALE: RatingScaleEntry[] = [
  { rating: 10, description: 'Absolute Uncertainty', criteria: 'No current control; cannot detect or not analyzed. No opportunity for detection.' },
  { rating: 9, description: 'Very Remote', criteria: 'Control will probably not detect. Random checks only.' },
  { rating: 8, description: 'Remote', criteria: 'Control has poor chance of detection. Visual inspection only.' },
  { rating: 7, description: 'Very Low', criteria: 'Control has poor chance of detection. Double visual inspection.' },
  { rating: 6, description: 'Low', criteria: 'Control may detect. Variable gauging after parts leave station.' },
  { rating: 5, description: 'Moderate', criteria: 'Control may detect. Attribute gauging (go/no-go, manual torque check).' },
  { rating: 4, description: 'Moderately High', criteria: 'Control has good chance to detect. Statistical process control (SPC).' },
  { rating: 3, description: 'High', criteria: 'Control has good chance to detect. Improved detection controls.' },
  { rating: 2, description: 'Very High', criteria: 'Control almost certain to detect. Automated in-station detection with automatic stop.' },
  { rating: 1, description: 'Almost Certain', criteria: 'Control certain to detect. Error-proofing in process/product design (Poka-Yoke).' },
];

// ============================================================================
// AP Calculation Logic (AIAG-VDA 2019)
// ============================================================================

/**
 * Calculate Action Priority per AIAG-VDA 2019 methodology.
 * 
 * This replaces the traditional RPN (S×O×D) approach with a logic-based
 * prioritization that considers the severity of the effect first.
 * 
 * AP = H (High): Action required with high priority
 * AP = M (Medium): Action required with medium priority  
 * AP = L (Low): Action may be required
 */
export function calculateAP(severity: number, occurrence: number, detection: number): APCalculationResult {
  if (!isValidRating(severity) || !isValidRating(occurrence) || !isValidRating(detection)) {
    throw new Error('Invalid rating value. All ratings must be integers from 1 to 10.');
  }

  const rpn = severity * occurrence * detection;
  
  // === HIGH PRIORITY (AP = H) ===
  
  if (severity >= 9) {
    return {
      ap: 'H',
      reason: `Safety/Regulatory concern (Severity = ${severity}). Immediate action required regardless of O/D.`,
      rpn,
    };
  }

  if (severity >= 7 && severity <= 8 && occurrence >= 4) {
    return {
      ap: 'H',
      reason: `High severity (S=${severity}) with significant occurrence (O=${occurrence}). Priority action required.`,
      rpn,
    };
  }

  if (severity >= 7 && severity <= 8 && detection >= 7) {
    return {
      ap: 'H',
      reason: `High severity (S=${severity}) with poor detection capability (D=${detection}). Priority action required.`,
      rpn,
    };
  }

  if (severity >= 5 && severity <= 6 && occurrence >= 7 && detection >= 6) {
    return {
      ap: 'H',
      reason: `Moderate severity (S=${severity}) with high occurrence (O=${occurrence}) and limited detection (D=${detection}).`,
      rpn,
    };
  }

  if (detection >= 10 && occurrence >= 4) {
    return {
      ap: 'H',
      reason: `No detection method (D=${detection}) with occurrence ≥ 4. Detection improvement required.`,
      rpn,
    };
  }

  // === MEDIUM PRIORITY (AP = M) ===

  if (severity >= 5 && severity <= 6 && occurrence >= 4 && occurrence <= 6) {
    return {
      ap: 'M',
      reason: `Moderate severity (S=${severity}) with moderate occurrence (O=${occurrence}). Action should be considered.`,
      rpn,
    };
  }

  if (severity >= 5 && severity <= 6 && detection >= 7) {
    return {
      ap: 'M',
      reason: `Moderate severity (S=${severity}) with limited detection (D=${detection}). Improve detection.`,
      rpn,
    };
  }

  if (severity >= 3 && severity <= 4 && occurrence >= 7) {
    return {
      ap: 'M',
      reason: `Lower severity (S=${severity}) but high occurrence (O=${occurrence}). Reduce occurrence.`,
      rpn,
    };
  }

  if (severity >= 7 && severity <= 8 && occurrence <= 3 && detection >= 4 && detection <= 6) {
    return {
      ap: 'M',
      reason: `High severity (S=${severity}) with low occurrence (O=${occurrence}). Monitor and consider detection improvement.`,
      rpn,
    };
  }

  if (detection >= 6 && occurrence >= 3 && severity >= 4) {
    return {
      ap: 'M',
      reason: `Detection improvement opportunity (D=${detection}). Consider enhanced controls.`,
      rpn,
    };
  }

  // === LOW PRIORITY (AP = L) ===
  
  return {
    ap: 'L',
    reason: `Risk adequately controlled. S=${severity}, O=${occurrence}, D=${detection}. Continue monitoring.`,
    rpn,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

export function isValidRating(rating: number): boolean {
  return Number.isInteger(rating) && rating >= 1 && rating <= 10;
}

export function validateRatings(severity: number, occurrence: number, detection: number): APValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!isValidRating(severity)) {
    errors.push(`Severity (${severity}) must be an integer from 1 to 10`);
  } else {
    if (severity >= 9) {
      warnings.push('Safety/Regulatory concern detected (S ≥ 9). Requires mandatory review.');
    }
  }

  if (!isValidRating(occurrence)) {
    errors.push(`Occurrence (${occurrence}) must be an integer from 1 to 10`);
  } else {
    if (occurrence >= 7) {
      warnings.push('High occurrence (O ≥ 7). Consider process improvement.');
    }
  }

  if (!isValidRating(detection)) {
    errors.push(`Detection (${detection}) must be an integer from 1 to 10`);
  } else {
    if (detection >= 7) {
      warnings.push('Poor detection capability (D ≥ 7). Consider improved controls.');
    }
    if (detection >= 9 && severity >= 5) {
      warnings.push('Near-zero detection with moderate+ severity. Detection improvement critical.');
    }
  }

  if (errors.length === 0) {
    if (severity >= 7 && occurrence >= 1 && detection <= 3) {
      warnings.push('Relying heavily on detection. Consider adding prevention controls.');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

export function getRatingEntry(kind: RatingKind, rating: number): RatingScaleEntry | undefined {
  const scale = kind === 'S' ? SEVERITY_SCALE 
    : kind === 'O' ? OCCURRENCE_SCALE 
    : DETECTION_SCALE;
  
  return scale.find(entry => entry.rating === rating);
}

export function getRatingDescription(kind: RatingKind, rating: number): string {
  const entry = getRatingEntry(kind, rating);
  return entry?.description ?? 'Unknown';
}

export function getRatingCriteria(kind: RatingKind, rating: number): string {
  const entry = getRatingEntry(kind, rating);
  return entry?.criteria ?? 'Unknown';
}

export function getScale(kind: RatingKind): RatingScaleEntry[] {
  switch (kind) {
    case 'S': return SEVERITY_SCALE;
    case 'O': return OCCURRENCE_SCALE;
    case 'D': return DETECTION_SCALE;
  }
}

export function getRatingLabel(kind: RatingKind, rating: number): string {
  const description = getRatingDescription(kind, rating);
  return `${rating} - ${description}`;
}

export function calculateRPN(severity: number, occurrence: number, detection: number): number {
  return severity * occurrence * detection;
}

export function getAPColorClass(ap: APLevel): string {
  switch (ap) {
    case 'H': return 'bg-red-100 text-red-800 border-red-200';
    case 'M': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'L': return 'bg-green-100 text-green-800 border-green-200';
  }
}

export function getAPLabel(ap: APLevel): string {
  switch (ap) {
    case 'H': return 'High Priority';
    case 'M': return 'Medium Priority';
    case 'L': return 'Low Priority';
  }
}

export function getRatingColorClass(kind: RatingKind, rating: number): string {
  if (kind === 'S') {
    if (rating >= 9) return 'bg-red-100 text-red-800';
    if (rating >= 7) return 'bg-orange-100 text-orange-800';
    if (rating >= 5) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  }
  
  if (kind === 'O') {
    if (rating >= 7) return 'bg-red-100 text-red-800';
    if (rating >= 4) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  }
  
  if (rating >= 7) return 'bg-red-100 text-red-800';
  if (rating >= 4) return 'bg-yellow-100 text-yellow-800';
  return 'bg-green-100 text-green-800';
}

// ============================================================================
// Batch Operations
// ============================================================================

export interface FMEARowRatings {
  id: string;
  severity: number;
  occurrence: number;
  detection: number;
}

export interface BatchAPResult {
  id: string;
  result: APCalculationResult;
}

export function calculateAPBatch(rows: FMEARowRatings[]): BatchAPResult[] {
  return rows.map(row => ({
    id: row.id,
    result: calculateAP(row.severity, row.occurrence, row.detection),
  }));
}

export function identifyAPMismatches(
  rows: Array<FMEARowRatings & { currentAP: APLevel }>
): Array<{ id: string; currentAP: APLevel; calculatedAP: APLevel; reason: string }> {
  const mismatches: Array<{ id: string; currentAP: APLevel; calculatedAP: APLevel; reason: string }> = [];
  
  for (const row of rows) {
    const calculated = calculateAP(row.severity, row.occurrence, row.detection);
    if (calculated.ap !== row.currentAP) {
      mismatches.push({
        id: row.id,
        currentAP: row.currentAP,
        calculatedAP: calculated.ap,
        reason: calculated.reason,
      });
    }
  }
  
  return mismatches;
}

// ============================================================================
// Statistics & Summary
// ============================================================================

export interface APSummary {
  total: number;
  high: number;
  medium: number;
  low: number;
  highPercent: number;
  mediumPercent: number;
  lowPercent: number;
  averageRPN: number;
  maxRPN: number;
  criticalCount: number;
}

export function generateAPSummary(rows: FMEARowRatings[]): APSummary {
  const results = calculateAPBatch(rows);
  
  const counts = { H: 0, M: 0, L: 0 };
  let totalRPN = 0;
  let maxRPN = 0;
  let criticalCount = 0;
  
  for (let i = 0; i < results.length; i++) {
    const { result } = results[i];
    const row = rows[i];
    
    counts[result.ap]++;
    totalRPN += result.rpn;
    maxRPN = Math.max(maxRPN, result.rpn);
    
    if (row.severity >= 9) {
      criticalCount++;
    }
  }
  
  const total = rows.length || 1;
  
  return {
    total: rows.length,
    high: counts.H,
    medium: counts.M,
    low: counts.L,
    highPercent: Math.round((counts.H / total) * 100),
    mediumPercent: Math.round((counts.M / total) * 100),
    lowPercent: Math.round((counts.L / total) * 100),
    averageRPN: Math.round(totalRPN / total),
    maxRPN,
    criticalCount,
  };
}

// ============================================================================
// Recommendation Engine
// ============================================================================

export interface ImprovementRecommendation {
  currentAP: APLevel;
  targetAP: APLevel;
  suggestions: string[];
  estimatedEffort: 'low' | 'medium' | 'high';
  priority: number;
}

export function generateImprovementRecommendations(
  severity: number,
  occurrence: number,
  detection: number
): ImprovementRecommendation {
  const current = calculateAP(severity, occurrence, detection);
  const suggestions: string[] = [];
  let estimatedEffort: 'low' | 'medium' | 'high' = 'medium';
  let priority = 5;

  if (current.ap === 'L') {
    return {
      currentAP: 'L',
      targetAP: 'L',
      suggestions: ['Risk adequately controlled. Continue monitoring.'],
      estimatedEffort: 'low',
      priority: 1,
    };
  }

  if (severity >= 9) {
    suggestions.push('Severity >=9: Consider design changes to eliminate hazard or add warnings.');
    estimatedEffort = 'high';
    priority = 10;
  } else if (severity >= 7) {
    suggestions.push('High severity: Evaluate if design modifications can reduce effect severity.');
    priority = Math.max(priority, 8);
  }

  if (occurrence >= 7) {
    suggestions.push('High occurrence: Implement prevention controls (error-proofing, process capability improvement).');
    if (occurrence >= 8) {
      suggestions.push('Consider process redesign or additional incoming material controls.');
    }
    priority = Math.max(priority, 7);
  } else if (occurrence >= 4) {
    suggestions.push('Moderate occurrence: Statistical process control (SPC) may help reduce variation.');
  }

  if (detection >= 7) {
    suggestions.push('Poor detection: Add automated inspection or error-proofing (Poka-Yoke).');
    if (detection >= 9) {
      suggestions.push('Near-zero detection: Implement in-station automated gauging with automatic stop.');
      estimatedEffort = 'medium';
    }
    priority = Math.max(priority, 6);
  } else if (detection >= 4) {
    suggestions.push('Moderate detection: Consider SPC or improved gauging to detect variation earlier.');
    estimatedEffort = 'low';
  }

  if (severity >= 7 && detection >= 7) {
    suggestions.unshift('CRITICAL: High severity with poor detection. Prioritize detection improvement immediately.');
    priority = 10;
  }

  if (occurrence <= 3 && detection >= 7) {
    suggestions.push('Low occurrence but poor detection: Focus on detection improvement for early warning.');
  }

  const targetAP = current.ap === 'H' ? 'M' : 'L';

  return {
    currentAP: current.ap,
    targetAP,
    suggestions,
    estimatedEffort,
    priority,
  };
}

// ============================================================================
// Export Default Object (for convenience)
// ============================================================================

export const APCalculator = {
  calculate: calculateAP,
  calculateBatch: calculateAPBatch,
  calculateRPN,
  validate: validateRatings,
  isValidRating,
  
  severityScale: SEVERITY_SCALE,
  occurrenceScale: OCCURRENCE_SCALE,
  detectionScale: DETECTION_SCALE,
  getScale,
  
  getRatingEntry,
  getRatingDescription,
  getRatingCriteria,
  getRatingLabel,
  
  getAPColorClass,
  getAPLabel,
  getRatingColorClass,
  
  generateSummary: generateAPSummary,
  identifyMismatches: identifyAPMismatches,
  generateRecommendations: generateImprovementRecommendations,
};

export default APCalculator;
