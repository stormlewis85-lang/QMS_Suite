// Phase 7: Auto-Review Compliance Validation Engine
// AIAG-VDA 2019 and IATF 16949 Compliance Rules

export interface ReviewFinding {
  id: string;
  level: 'error' | 'warning' | 'info';
  category: 'coverage' | 'effectiveness' | 'completeness' | 'compliance';
  rule: string;
  message: string;
  location?: {
    rowId?: string;
    stepId?: string;
    field?: string;
  };
  suggestion?: string;
}

interface PFMEAReviewInput {
  pfmea: any;
  pfmeaRows: any[];
  controlPlan?: any;
  cpRows?: any[];
}

interface ControlPlanReviewInput {
  controlPlan: any;
  cpRows: any[];
  pfmea?: any;
  pfmeaRows?: any[];
}

// AIAG-VDA 2019 Action Priority calculation
function calculateAP(S: number, O: number, D: number): 'H' | 'M' | 'L' {
  // HIGH: S >= 9 regardless of O or D
  if (S >= 9) return 'H';
  // HIGH: S = 7-8 AND O >= 7
  if (S >= 7 && S <= 8 && O >= 7) return 'H';
  // HIGH: S = 7-8 AND D >= 7
  if (S >= 7 && S <= 8 && D >= 7) return 'H';
  // HIGH: D >= 9 regardless of S/O
  if (D >= 9) return 'H';
  // MEDIUM: S = 5-6 AND (O >= 7 OR D >= 7)
  if (S >= 5 && S <= 6 && (O >= 7 || D >= 7)) return 'M';
  // MEDIUM: S = 7-8 AND O = 4-6 AND D = 4-6
  if (S >= 7 && S <= 8 && O >= 4 && O <= 6 && D >= 4 && D <= 6) return 'M';
  // LOW: All other combinations
  return 'L';
}

// Run PFMEA auto-review
export function runAutoReview(input: PFMEAReviewInput): ReviewFinding[] {
  const findings: ReviewFinding[] = [];
  const { pfmea, pfmeaRows, controlPlan, cpRows = [] } = input;

  // 1. Check for empty PFMEA
  if (pfmeaRows.length === 0) {
    findings.push({
      id: crypto.randomUUID(),
      level: 'error',
      category: 'completeness',
      rule: 'PFMEA-001',
      message: 'PFMEA has no failure mode analysis rows',
      suggestion: 'Add failure mode analysis for each process step',
    });
    return findings;
  }

  // 2. Validate each PFMEA row
  pfmeaRows.forEach((row, index) => {
    const rowLocation = { rowId: row.id, field: '' };

    // 2.1 Required fields check
    if (!row.function?.trim()) {
      findings.push({
        id: crypto.randomUUID(),
        level: 'error',
        category: 'completeness',
        rule: 'PFMEA-002',
        message: `Row ${index + 1}: Missing function description`,
        location: { ...rowLocation, field: 'function' },
        suggestion: 'Define the function/purpose of this process step',
      });
    }

    if (!row.failureMode?.trim()) {
      findings.push({
        id: crypto.randomUUID(),
        level: 'error',
        category: 'completeness',
        rule: 'PFMEA-003',
        message: `Row ${index + 1}: Missing failure mode`,
        location: { ...rowLocation, field: 'failureMode' },
        suggestion: 'Describe how the function could fail to meet requirements',
      });
    }

    if (!row.effect?.trim()) {
      findings.push({
        id: crypto.randomUUID(),
        level: 'error',
        category: 'completeness',
        rule: 'PFMEA-004',
        message: `Row ${index + 1}: Missing failure effect`,
        location: { ...rowLocation, field: 'effect' },
        suggestion: 'Describe the consequence of the failure mode on the customer',
      });
    }

    if (!row.cause?.trim()) {
      findings.push({
        id: crypto.randomUUID(),
        level: 'error',
        category: 'completeness',
        rule: 'PFMEA-005',
        message: `Row ${index + 1}: Missing cause`,
        location: { ...rowLocation, field: 'cause' },
        suggestion: 'Identify the root cause that could result in this failure mode',
      });
    }

    // 2.2 Rating validation (1-10 range)
    if (row.severity < 1 || row.severity > 10) {
      findings.push({
        id: crypto.randomUUID(),
        level: 'error',
        category: 'compliance',
        rule: 'PFMEA-006',
        message: `Row ${index + 1}: Severity rating ${row.severity} is out of valid range (1-10)`,
        location: { ...rowLocation, field: 'severity' },
        suggestion: 'Adjust severity rating to be between 1 and 10 per AIAG-VDA scale',
      });
    }

    if (row.occurrence < 1 || row.occurrence > 10) {
      findings.push({
        id: crypto.randomUUID(),
        level: 'error',
        category: 'compliance',
        rule: 'PFMEA-007',
        message: `Row ${index + 1}: Occurrence rating ${row.occurrence} is out of valid range (1-10)`,
        location: { ...rowLocation, field: 'occurrence' },
        suggestion: 'Adjust occurrence rating to be between 1 and 10 per AIAG-VDA scale',
      });
    }

    if (row.detection < 1 || row.detection > 10) {
      findings.push({
        id: crypto.randomUUID(),
        level: 'error',
        category: 'compliance',
        rule: 'PFMEA-008',
        message: `Row ${index + 1}: Detection rating ${row.detection} is out of valid range (1-10)`,
        location: { ...rowLocation, field: 'detection' },
        suggestion: 'Adjust detection rating to be between 1 and 10 per AIAG-VDA scale',
      });
    }

    // 2.3 AP Calculation validation
    const calculatedAP = calculateAP(row.severity, row.occurrence, row.detection);
    if (row.ap && row.ap !== calculatedAP) {
      findings.push({
        id: crypto.randomUUID(),
        level: 'warning',
        category: 'compliance',
        rule: 'PFMEA-009',
        message: `Row ${index + 1}: Stored AP (${row.ap}) does not match calculated AP (${calculatedAP})`,
        location: { ...rowLocation, field: 'ap' },
        suggestion: `Update AP to ${calculatedAP} based on AIAG-VDA 2019 methodology`,
      });
    }

    // 2.4 High severity without proper controls
    if (row.severity >= 9) {
      const preventionControls = Array.isArray(row.preventionControls) ? row.preventionControls : [];
      const detectionControls = Array.isArray(row.detectionControls) ? row.detectionControls : [];
      
      if (preventionControls.length === 0) {
        findings.push({
          id: crypto.randomUUID(),
          level: 'error',
          category: 'effectiveness',
          rule: 'PFMEA-010',
          message: `Row ${index + 1}: Safety-critical severity (${row.severity}) requires prevention controls`,
          location: { ...rowLocation, field: 'preventionControls' },
          suggestion: 'Add at least one prevention control for safety-critical failure modes',
        });
      }

      if (detectionControls.length === 0) {
        findings.push({
          id: crypto.randomUUID(),
          level: 'error',
          category: 'effectiveness',
          rule: 'PFMEA-011',
          message: `Row ${index + 1}: Safety-critical severity (${row.severity}) requires detection controls`,
          location: { ...rowLocation, field: 'detectionControls' },
          suggestion: 'Add at least one detection control for safety-critical failure modes',
        });
      }
    }

    // 2.5 High AP requires action
    if (calculatedAP === 'H') {
      if (!row.recommendedAction?.trim()) {
        findings.push({
          id: crypto.randomUUID(),
          level: 'error',
          category: 'compliance',
          rule: 'PFMEA-012',
          message: `Row ${index + 1}: High AP requires recommended action per AIAG-VDA 2019`,
          location: { ...rowLocation, field: 'recommendedAction' },
          suggestion: 'Define recommended actions to reduce risk for High AP items',
        });
      }
    }

    // 2.6 Special characteristic checks
    if (row.specialFlag) {
      if (!row.csrSymbol) {
        findings.push({
          id: crypto.randomUUID(),
          level: 'warning',
          category: 'compliance',
          rule: 'PFMEA-013',
          message: `Row ${index + 1}: Special characteristic marked but CSR symbol not assigned`,
          location: { ...rowLocation, field: 'csrSymbol' },
          suggestion: 'Assign appropriate CSR symbol (Ⓢ Safety, ◆ Critical, ⓒ Compliance)',
        });
      }
    }

    // 2.7 Detection rating vs control type
    if (row.detection <= 3) {
      const detectionControls = Array.isArray(row.detectionControls) ? row.detectionControls : [];
      if (detectionControls.length === 0) {
        findings.push({
          id: crypto.randomUUID(),
          level: 'warning',
          category: 'effectiveness',
          rule: 'PFMEA-014',
          message: `Row ${index + 1}: Low detection rating (${row.detection}) but no detection controls listed`,
          location: { ...rowLocation, field: 'detectionControls' },
          suggestion: 'Document the detection controls that justify this low detection rating',
        });
      }
    }
  });

  // 3. PFMEA to Control Plan coverage
  if (controlPlan && cpRows.length > 0) {
    const specialPfmeaRows = pfmeaRows.filter(r => r.specialFlag);
    
    specialPfmeaRows.forEach((pfmeaRow) => {
      const hasCPCoverage = cpRows.some(cpRow => 
        cpRow.sourceRowId === pfmeaRow.id || 
        cpRow.characteristicName?.includes(pfmeaRow.failureMode)
      );
      
      if (!hasCPCoverage) {
        findings.push({
          id: crypto.randomUUID(),
          level: 'error',
          category: 'coverage',
          rule: 'PFMEA-015',
          message: `Special characteristic "${pfmeaRow.failureMode}" not covered in Control Plan`,
          location: { rowId: pfmeaRow.id },
          suggestion: 'Add corresponding control point in Control Plan for this special characteristic',
        });
      }
    });
  } else if (pfmeaRows.some(r => r.specialFlag)) {
    findings.push({
      id: crypto.randomUUID(),
      level: 'warning',
      category: 'coverage',
      rule: 'PFMEA-016',
      message: 'PFMEA contains special characteristics but no Control Plan is linked',
      suggestion: 'Create and link a Control Plan to ensure special characteristics are controlled',
    });
  }

  return findings;
}

// Run Control Plan auto-review
export function runControlPlanReview(input: ControlPlanReviewInput): ReviewFinding[] {
  const findings: ReviewFinding[] = [];
  const { controlPlan, cpRows, pfmea, pfmeaRows = [] } = input;

  // 1. Check for empty Control Plan
  if (cpRows.length === 0) {
    findings.push({
      id: crypto.randomUUID(),
      level: 'error',
      category: 'completeness',
      rule: 'CP-001',
      message: 'Control Plan has no control characteristics defined',
      suggestion: 'Add control characteristics for each critical process output',
    });
    return findings;
  }

  // 2. Validate each Control Plan row
  cpRows.forEach((row, index) => {
    const rowLocation = { rowId: row.id, field: '' };

    // 2.1 Required fields
    if (!row.characteristicName?.trim()) {
      findings.push({
        id: crypto.randomUUID(),
        level: 'error',
        category: 'completeness',
        rule: 'CP-002',
        message: `Row ${index + 1}: Missing characteristic name`,
        location: { ...rowLocation, field: 'characteristicName' },
        suggestion: 'Define the product or process characteristic being controlled',
      });
    }

    if (!row.controlMethod?.trim()) {
      findings.push({
        id: crypto.randomUUID(),
        level: 'error',
        category: 'completeness',
        rule: 'CP-003',
        message: `Row ${index + 1}: Missing control method`,
        location: { ...rowLocation, field: 'controlMethod' },
        suggestion: 'Specify the method used to control this characteristic (e.g., SPC, 100% inspection)',
      });
    }

    // 2.2 Sample size and frequency
    if (!row.sampleSize?.trim()) {
      findings.push({
        id: crypto.randomUUID(),
        level: 'warning',
        category: 'completeness',
        rule: 'CP-004',
        message: `Row ${index + 1}: Sample size not specified`,
        location: { ...rowLocation, field: 'sampleSize' },
        suggestion: 'Define sample size for inspection/measurement',
      });
    }

    if (!row.frequency?.trim()) {
      findings.push({
        id: crypto.randomUUID(),
        level: 'warning',
        category: 'completeness',
        rule: 'CP-005',
        message: `Row ${index + 1}: Frequency not specified`,
        location: { ...rowLocation, field: 'frequency' },
        suggestion: 'Define inspection/measurement frequency (e.g., 1/hour, per lot)',
      });
    }

    // 2.3 Reaction plan for special characteristics
    if (row.specialFlag && !row.reactionPlan?.trim()) {
      findings.push({
        id: crypto.randomUUID(),
        level: 'error',
        category: 'compliance',
        rule: 'CP-006',
        message: `Row ${index + 1}: Special characteristic missing reaction plan`,
        location: { ...rowLocation, field: 'reactionPlan' },
        suggestion: 'Define reaction plan for out-of-spec conditions per IATF 16949',
      });
    }

    // 2.4 Measurement system for critical items
    if (row.specialFlag && !row.measurementSystem?.trim()) {
      findings.push({
        id: crypto.randomUUID(),
        level: 'warning',
        category: 'effectiveness',
        rule: 'CP-007',
        message: `Row ${index + 1}: Special characteristic missing measurement system details`,
        location: { ...rowLocation, field: 'measurementSystem' },
        suggestion: 'Specify the measurement system/gage used for this special characteristic',
      });
    }

    // 2.5 CSR Symbol consistency
    if (row.specialFlag && !row.csrSymbol) {
      findings.push({
        id: crypto.randomUUID(),
        level: 'warning',
        category: 'compliance',
        rule: 'CP-008',
        message: `Row ${index + 1}: Special characteristic missing CSR symbol`,
        location: { ...rowLocation, field: 'csrSymbol' },
        suggestion: 'Assign CSR symbol to match customer-specific requirements',
      });
    }
  });

  // 3. Control Plan to PFMEA traceability
  if (pfmea && pfmeaRows.length > 0) {
    const highAPRows = pfmeaRows.filter(r => 
      calculateAP(r.severity, r.occurrence, r.detection) === 'H'
    );

    highAPRows.forEach((pfmeaRow) => {
      const hasCPCoverage = cpRows.some(cpRow => 
        cpRow.sourceRowId === pfmeaRow.id ||
        cpRow.characteristicName?.toLowerCase().includes(pfmeaRow.failureMode?.toLowerCase())
      );

      if (!hasCPCoverage) {
        findings.push({
          id: crypto.randomUUID(),
          level: 'warning',
          category: 'coverage',
          rule: 'CP-009',
          message: `High AP failure mode "${pfmeaRow.failureMode}" may not be covered in Control Plan`,
          location: { rowId: pfmeaRow.id },
          suggestion: 'Ensure Control Plan addresses high risk failure modes from PFMEA',
        });
      }
    });
  }

  // 4. Control method validation
  cpRows.forEach((row, index) => {
    if (row.controlMethod) {
      const method = row.controlMethod.toLowerCase();
      
      // SPC charts should have sample size > 1
      if ((method.includes('chart') || method.includes('spc')) && row.sampleSize === '1 pc') {
        findings.push({
          id: crypto.randomUUID(),
          level: 'warning',
          category: 'effectiveness',
          rule: 'CP-010',
          message: `Row ${index + 1}: SPC control method with sample size of 1`,
          location: { rowId: row.id, field: 'sampleSize' },
          suggestion: 'Consider larger sample size for effective SPC analysis (typically n=5)',
        });
      }

      // 100% inspection should be continuous frequency
      if (method.includes('100%') && row.frequency && !row.frequency.toLowerCase().includes('continuous')) {
        findings.push({
          id: crypto.randomUUID(),
          level: 'info',
          category: 'effectiveness',
          rule: 'CP-011',
          message: `Row ${index + 1}: 100% inspection with non-continuous frequency`,
          location: { rowId: row.id, field: 'frequency' },
          suggestion: 'Verify frequency is appropriate for 100% inspection method',
        });
      }
    }
  });

  return findings;
}
