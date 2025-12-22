/**
 * AIAG-VDA 2019 Action Priority (AP) Calculator
 * 
 * This module provides the logic for calculating Action Priority ratings
 * based on Severity (S), Occurrence (O), and Detection (D) ratings
 * according to the AIAG-VDA FMEA Handbook (2019) guidelines.
 */

export type ActionPriority = 'H' | 'M' | 'L';
export type APLevel = ActionPriority; // Backward compatibility alias
export type RatingKind = 'S' | 'O' | 'D';

export interface APCalculationResult {
  ap: ActionPriority;
  reason: string;
  color: string;
  requiresAction: boolean;
}

export interface RatingScaleEntry {
  rating: number;
  description: string;
  criteria: string;
}

export interface RatingValidation {
  isValid: boolean;
  errors: string[];
}

/**
 * Validates that S, O, D ratings are within acceptable range (1-10)
 */
export function validateRatings(severity: number, occurrence: number, detection: number): RatingValidation {
  const errors: string[] = [];
  
  if (severity < 1 || severity > 10) {
    errors.push(`Severity must be between 1 and 10 (got ${severity})`);
  }
  if (occurrence < 1 || occurrence > 10) {
    errors.push(`Occurrence must be between 1 and 10 (got ${occurrence})`);
  }
  if (detection < 1 || detection > 10) {
    errors.push(`Detection must be between 1 and 10 (got ${detection})`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Calculate Action Priority (AP) based on AIAG-VDA 2019 guidelines
 * 
 * The AP rating prioritizes actions based on the combination of S, O, and D:
 * - HIGH (H): Requires immediate action - safety/regulatory critical or high risk combination
 * - MEDIUM (M): Action should be taken with priority - moderate risk combination
 * - LOW (L): May be addressed with standard controls - lower risk combination
 * 
 * Key principles:
 * 1. Safety-critical failures (S ≥ 9) always get HIGH priority
 * 2. High severity with either high occurrence or poor detection gets HIGH
 * 3. Detection alone ≥ 9 indicates no control exists, so HIGH priority
 * 4. Moderate combinations get MEDIUM
 * 5. Well-controlled low severity gets LOW
 */
export function calculateAP(
  severity: number, 
  occurrence: number, 
  detection: number
): APCalculationResult {
  // Validate inputs
  const validation = validateRatings(severity, occurrence, detection);
  if (!validation.isValid) {
    throw new Error(`Invalid ratings: ${validation.errors.join(', ')}`);
  }

  // Priority 1: Safety/Regulatory Critical (S ≥ 9)
  // Regardless of O or D, if S is 9 or 10, immediate action is required
  if (severity >= 9) {
    return {
      ap: 'H',
      reason: `Severity ≥ 9 (S=${severity}): Safety/regulatory critical failure mode requires immediate action`,
      color: 'red',
      requiresAction: true,
    };
  }

  // Priority 2: High severity with high occurrence
  // S = 7-8 combined with O ≥ 7 means failure likely to occur with significant effect
  if (severity >= 7 && severity <= 8 && occurrence >= 7) {
    return {
      ap: 'H',
      reason: `High severity (S=${severity}) with high occurrence (O=${occurrence}): Significant failure likely to occur`,
      color: 'red',
      requiresAction: true,
    };
  }

  // Priority 3: High severity with poor detection
  // S = 7-8 combined with D ≥ 7 means significant failure may not be caught
  if (severity >= 7 && severity <= 8 && detection >= 7) {
    return {
      ap: 'H',
      reason: `High severity (S=${severity}) with poor detection (D=${detection}): Significant failure may escape`,
      color: 'red',
      requiresAction: true,
    };
  }

  // Priority 4: No detection capability
  // D ≥ 9 means essentially no control to detect the failure
  if (detection >= 9) {
    return {
      ap: 'H',
      reason: `Detection ≥ 9 (D=${detection}): No effective detection control exists`,
      color: 'red',
      requiresAction: true,
    };
  }

  // Priority 5: Moderate severity with high O or D
  // S = 5-6 with either O ≥ 7 or D ≥ 7 warrants medium priority
  if (severity >= 5 && severity <= 6 && (occurrence >= 7 || detection >= 7)) {
    return {
      ap: 'M',
      reason: `Moderate severity (S=${severity}) with ${occurrence >= 7 ? `high occurrence (O=${occurrence})` : `poor detection (D=${detection})`}`,
      color: 'yellow',
      requiresAction: true,
    };
  }

  // Priority 6: High severity with moderate O and D
  // S = 7-8 with moderate O (4-6) and moderate D (4-6)
  if (severity >= 7 && severity <= 8 && occurrence >= 4 && occurrence <= 6 && detection >= 4 && detection <= 6) {
    return {
      ap: 'M',
      reason: `High severity (S=${severity}) with moderate occurrence (O=${occurrence}) and detection (D=${detection})`,
      color: 'yellow',
      requiresAction: true,
    };
  }

  // Priority 7: Moderate combinations
  // Various combinations that warrant attention but not urgent action
  if (severity >= 5 && (occurrence >= 5 || detection >= 5)) {
    return {
      ap: 'M',
      reason: `Moderate risk combination (S=${severity}, O=${occurrence}, D=${detection}): Standard controls may be enhanced`,
      color: 'yellow',
      requiresAction: true,
    };
  }

  // Default: Low priority
  // Well-controlled low to moderate severity
  return {
    ap: 'L',
    reason: `Low risk (S=${severity}, O=${occurrence}, D=${detection}): Effective controls in place`,
    color: 'green',
    requiresAction: false,
  };
}

/**
 * Get the color class for an AP rating
 */
export function getAPColor(ap: ActionPriority): string {
  switch (ap) {
    case 'H':
      return 'bg-red-100 text-red-800 border-red-300';
    case 'M':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'L':
      return 'bg-green-100 text-green-800 border-green-300';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
}

/**
 * Get the badge variant for an AP rating
 */
export function getAPBadgeVariant(ap: ActionPriority): 'destructive' | 'outline' | 'default' {
  switch (ap) {
    case 'H':
      return 'destructive';
    case 'M':
      return 'outline';
    case 'L':
      return 'default';
    default:
      return 'outline';
  }
}

/**
 * Get display label for AP rating
 */
export function getAPLabel(ap: ActionPriority): string {
  switch (ap) {
    case 'H':
      return 'High';
    case 'M':
      return 'Medium';
    case 'L':
      return 'Low';
    default:
      return ap;
  }
}

/**
 * AIAG-VDA 2019 Severity Rating Descriptions
 */
export const SEVERITY_RATINGS = [
  { value: 10, label: '10', description: 'Hazardous without warning - May endanger operator/user without warning', category: 'Safety' },
  { value: 9, label: '9', description: 'Hazardous with warning - May endanger operator/user with warning', category: 'Safety' },
  { value: 8, label: '8', description: 'Very High - Vehicle/item inoperable with loss of primary function', category: 'Function' },
  { value: 7, label: '7', description: 'High - Vehicle/item operable but with reduced performance level', category: 'Function' },
  { value: 6, label: '6', description: 'Moderate - Vehicle/item operable with degraded performance', category: 'Function' },
  { value: 5, label: '5', description: 'Low - Vehicle/item operable with some discomfort', category: 'Function' },
  { value: 4, label: '4', description: 'Very Low - Fit/finish issues noticed by most customers (75%+)', category: 'Appearance' },
  { value: 3, label: '3', description: 'Minor - Fit/finish issues noticed by some customers (50%)', category: 'Appearance' },
  { value: 2, label: '2', description: 'Very Minor - Fit/finish issues noticed by discriminating customers (<25%)', category: 'Appearance' },
  { value: 1, label: '1', description: 'None - No discernible effect', category: 'None' },
];

/**
 * AIAG-VDA 2019 Occurrence Rating Descriptions
 */
export const OCCURRENCE_RATINGS = [
  { value: 10, label: '10', description: 'Very High: ≥1 in 2 - Cpk < 0.33', probability: '≥50%' },
  { value: 9, label: '9', description: 'Very High: 1 in 3 - Cpk ≥ 0.33', probability: '33%' },
  { value: 8, label: '8', description: 'High: 1 in 8 - Cpk ≥ 0.51', probability: '12.5%' },
  { value: 7, label: '7', description: 'High: 1 in 20 - Cpk ≥ 0.67', probability: '5%' },
  { value: 6, label: '6', description: 'Moderate: 1 in 80 - Cpk ≥ 0.83', probability: '1.25%' },
  { value: 5, label: '5', description: 'Moderate: 1 in 400 - Cpk ≥ 1.00', probability: '0.25%' },
  { value: 4, label: '4', description: 'Moderate: 1 in 2,000 - Cpk ≥ 1.17', probability: '0.05%' },
  { value: 3, label: '3', description: 'Low: 1 in 15,000 - Cpk ≥ 1.33', probability: '0.0067%' },
  { value: 2, label: '2', description: 'Remote: 1 in 150,000 - Cpk ≥ 1.50', probability: '0.00067%' },
  { value: 1, label: '1', description: 'Remote: <1 in 1,500,000 - Cpk ≥ 1.67', probability: '<0.000067%' },
];

/**
 * AIAG-VDA 2019 Detection Rating Descriptions
 */
export const DETECTION_RATINGS = [
  { value: 10, label: '10', description: 'Absolute Uncertainty - No detection method or not analyzed', method: 'None' },
  { value: 9, label: '9', description: 'Very Remote - Detection not likely at any stage', method: 'Occasional inspection' },
  { value: 8, label: '8', description: 'Remote - Low detection capability', method: 'Visual inspection only' },
  { value: 7, label: '7', description: 'Very Low - Detection unlikely', method: 'Double visual inspection' },
  { value: 6, label: '6', description: 'Low - Detection may occur', method: 'Charting methods (SPC)' },
  { value: 5, label: '5', description: 'Moderate - Controls may detect', method: 'Variable gauging after processing' },
  { value: 4, label: '4', description: 'Moderately High - Good detection capability', method: 'Error detection in subsequent operation' },
  { value: 3, label: '3', description: 'High - Detection likely', method: 'Error detection in-station' },
  { value: 2, label: '2', description: 'Very High - Detection almost certain', method: 'Error detection with automatic stop' },
  { value: 1, label: '1', description: 'Almost Certain - Detection guaranteed', method: 'Error prevention (mistake-proofing)' },
];

/**
 * Calculate Risk Priority Number (RPN) - legacy metric
 * Note: AIAG-VDA 2019 recommends using AP over RPN, but RPN is still tracked for reference
 */
export function calculateRPN(severity: number, occurrence: number, detection: number): number {
  const validation = validateRatings(severity, occurrence, detection);
  if (!validation.isValid) {
    throw new Error(`Invalid ratings: ${validation.errors.join(', ')}`);
  }
  return severity * occurrence * detection;
}

/**
 * Get suggested actions based on AP rating
 */
export function getSuggestedActions(ap: ActionPriority): string[] {
  switch (ap) {
    case 'H':
      return [
        'Immediate action required to reduce risk',
        'Assign dedicated team member for resolution',
        'Implement error-proofing where possible',
        'Add redundant detection controls',
        'Review and validate corrective actions before production',
        'Management review required before proceeding',
      ];
    case 'M':
      return [
        'Prioritize action to reduce risk',
        'Review current controls for adequacy',
        'Consider additional prevention controls',
        'Evaluate detection method effectiveness',
        'Monitor and track until resolved',
      ];
    case 'L':
      return [
        'Current controls appear adequate',
        'Continue monitoring during production',
        'Review during next scheduled FMEA update',
        'Document justification for current controls',
      ];
    default:
      return [];
  }
}

// ============================================================================
// Backward Compatibility - Rating Scales in legacy format
// ============================================================================

export const SEVERITY_SCALE: RatingScaleEntry[] = SEVERITY_RATINGS.map(r => ({
  rating: r.value,
  description: r.label + ' - ' + r.description.split(' - ')[0],
  criteria: r.description,
}));

export const OCCURRENCE_SCALE: RatingScaleEntry[] = OCCURRENCE_RATINGS.map(r => ({
  rating: r.value,
  description: r.description.split(':')[0] || r.label,
  criteria: r.description,
}));

export const DETECTION_SCALE: RatingScaleEntry[] = DETECTION_RATINGS.map(r => ({
  rating: r.value,
  description: r.description.split(' - ')[0],
  criteria: r.description,
}));

// ============================================================================
// Backward Compatibility - Utility Functions
// ============================================================================

export function getScale(kind: RatingKind): RatingScaleEntry[] {
  switch (kind) {
    case 'S': return SEVERITY_SCALE;
    case 'O': return OCCURRENCE_SCALE;
    case 'D': return DETECTION_SCALE;
  }
}

export function getRatingEntry(kind: RatingKind, rating: number): RatingScaleEntry | undefined {
  return getScale(kind).find(entry => entry.rating === rating);
}

export function getRatingDescription(kind: RatingKind, rating: number): string {
  const entry = getRatingEntry(kind, rating);
  return entry?.description ?? 'Unknown';
}

export function getRatingCriteria(kind: RatingKind, rating: number): string {
  const entry = getRatingEntry(kind, rating);
  return entry?.criteria ?? 'Unknown';
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
  
  // Detection
  if (rating >= 7) return 'bg-red-100 text-red-800';
  if (rating >= 4) return 'bg-yellow-100 text-yellow-800';
  return 'bg-green-100 text-green-800';
}

// Alias for backward compatibility
export function getAPColorClass(ap: ActionPriority): string {
  return getAPColor(ap);
}

// ============================================================================
// Batch Operations & Summary (Backward Compatibility)
// ============================================================================

export interface FMEARowRatings {
  id: string;
  severity: number;
  occurrence: number;
  detection: number;
}

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
  const counts = { H: 0, M: 0, L: 0 };
  let totalRPN = 0;
  let maxRPN = 0;
  let criticalCount = 0;
  
  for (const row of rows) {
    try {
      const result = calculateAP(row.severity, row.occurrence, row.detection);
      counts[result.ap]++;
      const rpn = row.severity * row.occurrence * row.detection;
      totalRPN += rpn;
      maxRPN = Math.max(maxRPN, rpn);
      
      if (row.severity >= 9) {
        criticalCount++;
      }
    } catch {
      // Skip invalid rows
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

export default {
  calculateAP,
  validateRatings,
  getAPColor,
  getAPColorClass,
  getAPBadgeVariant,
  getAPLabel,
  calculateRPN,
  getSuggestedActions,
  getScale,
  getRatingEntry,
  getRatingDescription,
  getRatingCriteria,
  getRatingColorClass,
  generateAPSummary,
  SEVERITY_RATINGS,
  OCCURRENCE_RATINGS,
  DETECTION_RATINGS,
  SEVERITY_SCALE,
  OCCURRENCE_SCALE,
  DETECTION_SCALE,
};