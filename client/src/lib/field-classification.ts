/**
 * Field Classification for Change Control
 * Determines which workflow a change triggers
 */

// Field impact levels determine the change workflow
export type FieldImpact = 'critical' | 'standard' | 'minor';

export type ChangeFlow = 'wizard' | 'confirm' | 'audit-only';

// FMEA Template Row field definitions
export const FMEA_TEMPLATE_FIELDS: Record<string, {
  label: string;
  impact: FieldImpact;
  inputType: 'text' | 'textarea' | 'number' | 'select' | 'multi-select' | 'rating' | 'ap' | 'csr' | 'boolean';
  options?: { value: string | number; label: string; description?: string }[];
  computed?: boolean;
  required?: boolean;
}> = {
  // Critical fields - trigger full wizard
  severity: {
    label: 'Severity (S)',
    impact: 'critical',
    inputType: 'rating',
    required: true,
    options: [
      { value: 10, label: '10', description: 'Hazardous without warning - May endanger operator' },
      { value: 9, label: '9', description: 'Hazardous with warning - May endanger operator' },
      { value: 8, label: '8', description: 'Very High - Vehicle/item inoperable, loss of primary function' },
      { value: 7, label: '7', description: 'High - Vehicle/item operable, reduced performance' },
      { value: 6, label: '6', description: 'Moderate - Vehicle/item operable, comfort item inoperable' },
      { value: 5, label: '5', description: 'Low - Vehicle/item operable, comfort item reduced' },
      { value: 4, label: '4', description: 'Very Low - Fit & finish nonconformance noticed by most' },
      { value: 3, label: '3', description: 'Minor - Fit & finish nonconformance noticed by average' },
      { value: 2, label: '2', description: 'Very Minor - Fit & finish nonconformance noticed by discriminating' },
      { value: 1, label: '1', description: 'None - No discernible effect' },
    ],
  },
  occurrence: {
    label: 'Occurrence (O)',
    impact: 'critical',
    inputType: 'rating',
    required: true,
    options: [
      { value: 10, label: '10', description: 'Very High - ≥100 per 1,000 (≥1 in 10)' },
      { value: 9, label: '9', description: 'High - 50 per 1,000 (1 in 20)' },
      { value: 8, label: '8', description: 'High - 20 per 1,000 (1 in 50)' },
      { value: 7, label: '7', description: 'Moderate - 10 per 1,000 (1 in 100)' },
      { value: 6, label: '6', description: 'Moderate - 2 per 1,000 (1 in 500)' },
      { value: 5, label: '5', description: 'Low - 0.5 per 1,000 (1 in 2,000)' },
      { value: 4, label: '4', description: 'Low - 0.1 per 1,000 (1 in 10,000)' },
      { value: 3, label: '3', description: 'Very Low - 0.01 per 1,000 (1 in 100,000)' },
      { value: 2, label: '2', description: 'Remote - ≤0.001 per 1,000 (1 in 1,000,000)' },
      { value: 1, label: '1', description: 'Nearly Impossible - Failure eliminated through preventive control' },
    ],
  },
  detection: {
    label: 'Detection (D)',
    impact: 'critical',
    inputType: 'rating',
    required: true,
    options: [
      { value: 10, label: '10', description: 'Absolute Uncertainty - No detection opportunity' },
      { value: 9, label: '9', description: 'Very Remote - Not likely to detect at any stage' },
      { value: 8, label: '8', description: 'Remote - Problem detection post-processing' },
      { value: 7, label: '7', description: 'Very Low - Problem detection at source' },
      { value: 6, label: '6', description: 'Low - Problem detection post-processing w/ gauging' },
      { value: 5, label: '5', description: 'Moderate - Problem detection at source w/ gauging' },
      { value: 4, label: '4', description: 'Moderately High - Problem detection post-processing w/ auto' },
      { value: 3, label: '3', description: 'High - Problem detection at source w/ auto' },
      { value: 2, label: '2', description: 'Very High - Error detection and/or problem prevention' },
      { value: 1, label: '1', description: 'Almost Certain - Detection not applicable; error prevention' },
    ],
  },
  preventionControls: {
    label: 'Prevention Controls (PC)',
    impact: 'critical',
    inputType: 'multi-select',
  },
  detectionControls: {
    label: 'Detection Controls (DC)',
    impact: 'critical',
    inputType: 'multi-select',
  },
  specialFlag: {
    label: 'Special Characteristic',
    impact: 'critical',
    inputType: 'boolean',
  },
  csrSymbol: {
    label: 'CSR Symbol',
    impact: 'critical',
    inputType: 'csr',
    options: [
      { value: '', label: 'None', description: 'Not a special characteristic' },
      { value: 'Ⓢ', label: 'Ⓢ Safety', description: 'Safety characteristic - regulatory compliance' },
      { value: '◆', label: '◆ Critical', description: 'Critical characteristic - fit/function' },
      { value: 'ⓒ', label: 'ⓒ Significant', description: 'Significant characteristic - customer specified' },
    ],
  },
  
  // Standard fields - trigger confirmation dialog
  failureMode: {
    label: 'Failure Mode',
    impact: 'standard',
    inputType: 'text',
    required: true,
  },
  effect: {
    label: 'Effect',
    impact: 'standard',
    inputType: 'textarea',
    required: true,
  },
  cause: {
    label: 'Cause',
    impact: 'standard',
    inputType: 'textarea',
    required: true,
  },
  function: {
    label: 'Function',
    impact: 'standard',
    inputType: 'text',
    required: true,
  },
  requirement: {
    label: 'Requirement',
    impact: 'standard',
    inputType: 'text',
    required: true,
  },
  
  // Minor fields - audit log only
  notes: {
    label: 'Notes',
    impact: 'minor',
    inputType: 'textarea',
  },
  
  // Computed fields - not directly editable
  ap: {
    label: 'Action Priority (AP)',
    impact: 'critical',
    inputType: 'ap',
    computed: true,
  },
};

// Control Plan Template Row field definitions  
export const CONTROL_TEMPLATE_FIELDS: Record<string, {
  label: string;
  impact: FieldImpact;
  inputType: 'text' | 'textarea' | 'number' | 'select' | 'multi-select' | 'csr' | 'boolean';
  options?: { value: string | number; label: string; description?: string }[];
  computed?: boolean;
  required?: boolean;
}> = {
  // Critical fields
  specialFlag: {
    label: 'Special Characteristic',
    impact: 'critical',
    inputType: 'boolean',
  },
  csrSymbol: {
    label: 'CSR Symbol',
    impact: 'critical',
    inputType: 'csr',
    options: [
      { value: '', label: 'None' },
      { value: 'Ⓢ', label: 'Ⓢ Safety' },
      { value: '◆', label: '◆ Critical' },
      { value: 'ⓒ', label: 'ⓒ Significant' },
    ],
  },
  acceptanceCriteria: {
    label: 'Acceptance Criteria',
    impact: 'critical',
    inputType: 'text',
  },
  reactionPlan: {
    label: 'Reaction Plan',
    impact: 'critical',
    inputType: 'textarea',
  },
  controlMethod: {
    label: 'Control Method',
    impact: 'critical',
    inputType: 'select',
    options: [
      { value: 'X̄-R Chart', label: 'X̄-R Chart' },
      { value: 'X̄-S Chart', label: 'X̄-S Chart' },
      { value: 'p-Chart', label: 'p-Chart' },
      { value: 'c-Chart', label: 'c-Chart' },
      { value: '100% Inspection', label: '100% Inspection' },
      { value: 'First Piece', label: 'First Piece Inspection' },
      { value: 'Visual', label: 'Visual Inspection' },
      { value: 'Go/No-Go', label: 'Go/No-Go Gage' },
      { value: 'Error-Proof', label: 'Error-Proofing' },
    ],
  },
  
  // Standard fields
  characteristicName: {
    label: 'Characteristic Name',
    impact: 'standard',
    inputType: 'text',
    required: true,
  },
  type: {
    label: 'Type',
    impact: 'standard',
    inputType: 'select',
    options: [
      { value: 'Product', label: 'Product' },
      { value: 'Process', label: 'Process' },
    ],
  },
  target: {
    label: 'Target',
    impact: 'standard',
    inputType: 'text',
  },
  tolerance: {
    label: 'Tolerance',
    impact: 'standard',
    inputType: 'text',
  },
  measurementSystem: {
    label: 'Measurement System',
    impact: 'standard',
    inputType: 'text',
  },
  gageDetails: {
    label: 'Gage Details',
    impact: 'standard',
    inputType: 'text',
  },
  defaultSampleSize: {
    label: 'Sample Size',
    impact: 'standard',
    inputType: 'select',
    options: [
      { value: '1', label: '1 pc' },
      { value: '3', label: '3 pcs' },
      { value: '5', label: '5 pcs' },
      { value: '5/cavity', label: '5 per cavity' },
      { value: '100%', label: '100%' },
    ],
  },
  defaultFrequency: {
    label: 'Frequency',
    impact: 'standard',
    inputType: 'select',
    options: [
      { value: 'Continuous', label: 'Continuous' },
      { value: '1/hour', label: '1 per hour' },
      { value: '1/shift', label: '1 per shift' },
      { value: 'Start/End', label: 'Start & End of shift' },
      { value: '1/lot', label: '1 per lot' },
      { value: '1/setup', label: 'Each setup' },
    ],
  },
  
  // Minor fields
  charId: {
    label: 'Characteristic ID',
    impact: 'minor',
    inputType: 'text',
  },
};

// Determine which flow a set of changes should trigger
export function determineChangeFlow(
  changedFields: string[],
  fieldDefs: Record<string, { impact: FieldImpact }>
): ChangeFlow {
  let maxImpact: FieldImpact = 'minor';
  
  for (const field of changedFields) {
    const def = fieldDefs[field];
    if (!def) continue;
    
    if (def.impact === 'critical') {
      return 'wizard'; // Any critical field triggers wizard
    }
    if (def.impact === 'standard') {
      maxImpact = 'standard';
    }
  }
  
  if (maxImpact === 'standard') return 'confirm';
  return 'audit-only';
}

// Detect changes between original and updated data
export interface FieldDiff {
  fieldPath: string;
  fieldLabel: string;
  oldValue: any;
  newValue: any;
  impact: FieldImpact;
}

export function detectChanges(
  original: Record<string, any>,
  updated: Record<string, any>,
  fieldDefs: Record<string, { label: string; impact: FieldImpact }>
): FieldDiff[] {
  const diffs: FieldDiff[] = [];
  
  // Check all fields in definitions
  for (const [field, def] of Object.entries(fieldDefs)) {
    const oldVal = original[field];
    const newVal = updated[field];
    
    if (!valuesEqual(oldVal, newVal)) {
      diffs.push({
        fieldPath: field,
        fieldLabel: def.label,
        oldValue: oldVal,
        newValue: newVal,
        impact: def.impact,
      });
    }
  }
  
  return diffs;
}

function valuesEqual(a: any, b: any): boolean {
  // Handle null/undefined
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  
  // Handle arrays
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => valuesEqual(v, b[i]));
  }
  
  // Handle objects
  if (typeof a === 'object' && typeof b === 'object') {
    return JSON.stringify(a) === JSON.stringify(b);
  }
  
  // Primitive comparison
  return a === b;
}

// Format value for display
export function formatDisplayValue(value: any): string {
  if (value === undefined || value === null || value === '') return '—';
  if (Array.isArray(value)) {
    if (value.length === 0) return '—';
    return value.join(', ');
  }
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

// Get field definitions based on entity type
export function getFieldDefs(entityType: string) {
  switch (entityType) {
    case 'fmea_template_row':
      return FMEA_TEMPLATE_FIELDS;
    case 'control_template_row':
      return CONTROL_TEMPLATE_FIELDS;
    default:
      return {};
  }
}

// Calculate AP from S, O, D (AIAG-VDA 2019)
export function calculateAP(s: number, o: number, d: number): 'H' | 'M' | 'L' {
  // High priority conditions
  if (s >= 9) return 'H';
  if (s >= 7 && o >= 4) return 'H';
  if (s >= 7 && d >= 7) return 'H';
  if (o >= 6 && d >= 6) return 'H';
  
  // Medium priority conditions
  if (s >= 5 && s <= 6 && o >= 4) return 'M';
  if (s >= 5 && s <= 6 && d >= 5) return 'M';
  if (s >= 7 && o >= 2 && o <= 3) return 'M';
  if (s >= 7 && d >= 3 && d <= 6) return 'M';
  if (o >= 4 && o <= 5 && d >= 4 && d <= 5) return 'M';
  
  // Low priority - everything else
  return 'L';
}
