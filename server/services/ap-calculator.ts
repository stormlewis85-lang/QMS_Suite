/**
 * AIAG-VDA 2019 Action Priority (AP) Calculator
 * 
 * Calculates Action Priority based on Severity (S), Occurrence (O), and Detection (D)
 * according to AIAG-VDA FMEA Handbook (1st Edition, 2019) guidelines.
 */

export type ActionPriority = 'H' | 'M' | 'L';

export interface APResult {
  priority: ActionPriority;
  label: string;
  description: string;
  colorClass: string;
}

export interface APInput {
  severity: number;
  occurrence: number;
  detection: number;
}

/**
 * Calculate Action Priority based on AIAG-VDA 2019 methodology
 * 
 * HIGH (H) - Highest priority for action:
 * - Severity >= 9 (regardless of O or D)
 * - Severity 7-8 AND Occurrence >= 7
 * - Severity 7-8 AND Detection >= 7
 * - Detection >= 9 (regardless of S or O)
 * 
 * MEDIUM (M) - Medium priority for action:
 * - Severity 5-6 AND (Occurrence >= 7 OR Detection >= 7)
 * 
 * LOW (L) - Lower priority for action:
 * - All other combinations
 */
export function calculateAP(input: APInput): APResult {
  const { severity, occurrence, detection } = input;

  // Validate inputs are within 1-10 range
  if (severity < 1 || severity > 10 || 
      occurrence < 1 || occurrence > 10 || 
      detection < 1 || detection > 10) {
    throw new Error('S, O, and D ratings must be between 1 and 10');
  }

  const priority = determineAPLevel(severity, occurrence, detection);
  
  return getAPResult(priority);
}

function determineAPLevel(s: number, o: number, d: number): ActionPriority {
  // HIGH priority conditions
  if (s >= 9) {
    return 'H';
  }
  
  if (s >= 7 && s <= 8 && o >= 7) {
    return 'H';
  }
  
  if (s >= 7 && s <= 8 && d >= 7) {
    return 'H';
  }
  
  if (d >= 9) {
    return 'H';
  }

  // MEDIUM priority conditions
  if (s >= 5 && s <= 6 && (o >= 7 || d >= 7)) {
    return 'M';
  }

  // LOW priority - all other combinations
  return 'L';
}

function getAPResult(priority: ActionPriority): APResult {
  switch (priority) {
    case 'H':
      return {
        priority: 'H',
        label: 'High',
        description: 'Highest priority for action - requires immediate attention and risk mitigation',
        colorClass: 'bg-red-500 text-white'
      };
    case 'M':
      return {
        priority: 'M',
        label: 'Medium',
        description: 'Medium priority - action should be taken to reduce risk',
        colorClass: 'bg-yellow-500 text-black'
      };
    case 'L':
      return {
        priority: 'L',
        label: 'Low',
        description: 'Lower priority - review for potential improvement opportunities',
        colorClass: 'bg-green-500 text-white'
      };
  }
}

/**
 * Batch calculate AP for multiple FMEA rows
 */
export function calculateAPBatch(inputs: APInput[]): APResult[] {
  return inputs.map(input => calculateAP(input));
}

/**
 * Get AP statistics for a set of FMEA rows
 */
export function getAPStatistics(inputs: APInput[]): {
  high: number;
  medium: number;
  low: number;
  total: number;
} {
  const results = calculateAPBatch(inputs);
  
  return {
    high: results.filter(r => r.priority === 'H').length,
    medium: results.filter(r => r.priority === 'M').length,
    low: results.filter(r => r.priority === 'L').length,
    total: results.length
  };
}

/**
 * Suggest severity rating based on effect category (for auto-scoring)
 */
export function suggestSeverityFromEffectCategory(effectCategory: string): { min: number; max: number; suggested: number } | null {
  const categoryMap: Record<string, { min: number; max: number; suggested: number }> = {
    'safety_no_warning': { min: 10, max: 10, suggested: 10 },
    'safety_with_warning': { min: 9, max: 9, suggested: 9 },
    'regulatory': { min: 9, max: 10, suggested: 9 },
    'primary_function_loss': { min: 7, max: 8, suggested: 8 },
    'primary_function_degraded': { min: 5, max: 6, suggested: 6 },
    'secondary_function_loss': { min: 4, max: 5, suggested: 5 },
    'secondary_function_degraded': { min: 3, max: 4, suggested: 4 },
    'appearance_high': { min: 2, max: 3, suggested: 3 },
    'appearance_moderate': { min: 1, max: 2, suggested: 2 },
    'no_effect': { min: 1, max: 1, suggested: 1 }
  };

  return categoryMap[effectCategory] || null;
}

/**
 * Suggest detection rating based on control category (for auto-scoring)
 */
export function suggestDetectionFromControlCategory(controlCategory: string): { min: number; max: number; suggested: number } | null {
  const categoryMap: Record<string, { min: number; max: number; suggested: number }> = {
    'error_proofing_prevent': { min: 1, max: 1, suggested: 1 },
    'error_proofing_detect': { min: 2, max: 2, suggested: 2 },
    'automated_inline_100': { min: 2, max: 3, suggested: 3 },
    'automated_offline_100': { min: 3, max: 4, suggested: 4 },
    'spc_monitoring': { min: 4, max: 5, suggested: 5 },
    'manual_inspection_sampling': { min: 5, max: 6, suggested: 6 },
    'visual_only': { min: 6, max: 7, suggested: 7 },
    'indirect_detection': { min: 7, max: 8, suggested: 8 },
    'random_audit': { min: 8, max: 9, suggested: 9 },
    'no_detection': { min: 10, max: 10, suggested: 10 }
  };

  return categoryMap[controlCategory] || null;
}
