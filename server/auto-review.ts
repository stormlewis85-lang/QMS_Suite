// Phase 7: Auto-Review Compliance Validation Engine
// AIAG-VDA 2019 and IATF 16949 Compliance Rules

export interface ReviewFinding {
  id: string;
  level: 'error' | 'warning' | 'info';
  category: 'coverage' | 'effectiveness' | 'documentation' | 'compliance';
  rule: string;
  message: string;
  rowId?: string;
  stepRef?: string;
  suggestion?: string;
}

// Calculate AP based on AIAG-VDA 2019
function calculateAP(severity: number, occurrence: number, detection: number): string {
  // High priority
  if (severity >= 9) return 'H';
  if (severity >= 7 && occurrence >= 7) return 'H';
  if (severity >= 7 && detection >= 7) return 'H';
  if (detection >= 9) return 'H';
  
  // Medium priority
  if (severity >= 5 && severity <= 6 && (occurrence >= 7 || detection >= 7)) return 'M';
  if (severity >= 7 && severity <= 8 && occurrence >= 4 && occurrence <= 6 && detection >= 4 && detection <= 6) return 'M';
  
  // Low priority
  return 'L';
}

export function runAutoReview(data: {
  pfmea: any;
  pfmeaRows: any[];
  controlPlan?: any;
  cpRows?: any[];
  pfd?: any;
}): ReviewFinding[] {
  const findings: ReviewFinding[] = [];
  const { pfmea, pfmeaRows, controlPlan, cpRows = [], pfd } = data;

  // ===================
  // COVERAGE CHECKS
  // ===================
  
  // Check: Every High AP row should have Control Plan coverage
  const highAPRows = pfmeaRows.filter(r => r.ap === 'H');
  for (const row of highAPRows) {
    const hasCPCoverage = cpRows.some(cp => cp.sourcePfmeaRowId === row.id || cp.sourceRowId === row.id);
    if (!hasCPCoverage) {
      findings.push({
        id: `cov-high-ap-${row.id}`,
        level: 'error',
        category: 'coverage',
        rule: 'HIGH_AP_REQUIRES_CP',
        message: `High AP failure mode "${row.failureMode}" has no Control Plan coverage`,
        rowId: row.id,
        stepRef: row.stepRef,
        suggestion: 'Add at least one control characteristic to address this high-priority failure mode',
      });
    }
  }

  // Check: PFD step coverage
  if (pfd?.stepsJson) {
    try {
      const pfdSteps = JSON.parse(pfd.stepsJson);
      const coveredSteps = new Set(pfmeaRows.map(r => r.stepRef));
      
      for (const step of pfdSteps) {
        if (!coveredSteps.has(step.name)) {
          findings.push({
            id: `cov-pfd-step-${step.seq}`,
            level: 'warning',
            category: 'coverage',
            rule: 'PFD_STEP_NOT_COVERED',
            message: `PFD step "${step.name}" (${step.seq}) has no PFMEA analysis`,
            stepRef: step.name,
            suggestion: 'Add at least one failure mode analysis for this process step',
          });
        }
      }
    } catch (e) {
      // Skip PFD parsing errors
    }
  }

  // ===================
  // EFFECTIVENESS CHECKS
  // ===================

  for (const row of pfmeaRows) {
    // Check: AP calculation matches
    const calculatedAP = calculateAP(row.severity, row.occurrence, row.detection);
    if (calculatedAP !== row.ap) {
      findings.push({
        id: `eff-ap-mismatch-${row.id}`,
        level: 'warning',
        category: 'effectiveness',
        rule: 'AP_MISMATCH',
        message: `AP mismatch for "${row.failureMode}": stored=${row.ap}, calculated=${calculatedAP}`,
        rowId: row.id,
        suggestion: `Update AP to "${calculatedAP}" based on S=${row.severity}, O=${row.occurrence}, D=${row.detection}`,
      });
    }

    // Check: High severity needs prevention controls
    if (row.severity >= 7) {
      const preventionControls = row.preventionControls || [];
      if (preventionControls.length === 0) {
        findings.push({
          id: `eff-no-prevention-${row.id}`,
          level: 'error',
          category: 'effectiveness',
          rule: 'HIGH_SEVERITY_NO_PREVENTION',
          message: `High severity (${row.severity}) failure "${row.failureMode}" has no prevention controls`,
          rowId: row.id,
          suggestion: 'Add prevention controls to reduce occurrence probability',
        });
      }
    }

    // Check: Detection-only strategy warning
    const preventionControls = row.preventionControls || [];
    const detectionControls = row.detectionControls || [];
    if (preventionControls.length === 0 && detectionControls.length > 0 && row.severity >= 5) {
      findings.push({
        id: `eff-detection-only-${row.id}`,
        level: 'warning',
        category: 'effectiveness',
        rule: 'DETECTION_ONLY_STRATEGY',
        message: `"${row.failureMode}" relies solely on detection controls`,
        rowId: row.id,
        suggestion: 'Consider adding prevention controls for a more robust risk mitigation strategy',
      });
    }

    // Check: Special characteristic compliance
    if (row.specialFlag) {
      // Must have CSR symbol
      if (!row.csrSymbol) {
        findings.push({
          id: `comp-csr-symbol-${row.id}`,
          level: 'error',
          category: 'compliance',
          rule: 'CSR_MISSING_SYMBOL',
          message: `Special characteristic "${row.failureMode}" missing CSR symbol`,
          rowId: row.id,
          suggestion: 'Assign appropriate CSR symbol (Ⓢ Safety, ◆ Critical, ⓒ Compliance)',
        });
      }
    }

    // Check: Required fields
    if (!row.function?.trim()) {
      findings.push({
        id: `doc-missing-function-${row.id}`,
        level: 'error',
        category: 'documentation',
        rule: 'MISSING_FUNCTION',
        message: `Row missing function description`,
        rowId: row.id,
        suggestion: 'Define the function/purpose of this process step',
      });
    }

    if (!row.cause?.trim()) {
      findings.push({
        id: `doc-missing-cause-${row.id}`,
        level: 'error',
        category: 'documentation',
        rule: 'MISSING_CAUSE',
        message: `Failure mode "${row.failureMode}" has no cause identified`,
        rowId: row.id,
        suggestion: 'Identify the root cause that could result in this failure mode',
      });
    }

    if (!row.effect?.trim()) {
      findings.push({
        id: `doc-missing-effect-${row.id}`,
        level: 'error',
        category: 'documentation',
        rule: 'MISSING_EFFECT',
        message: `Failure mode "${row.failureMode}" has no effect documented`,
        rowId: row.id,
        suggestion: 'Describe the consequence of the failure mode on the customer',
      });
    }

    // Check: Rating validation (1-10 range)
    if (row.severity < 1 || row.severity > 10) {
      findings.push({
        id: `doc-invalid-severity-${row.id}`,
        level: 'error',
        category: 'compliance',
        rule: 'INVALID_SEVERITY',
        message: `Severity rating ${row.severity} is out of valid range (1-10)`,
        rowId: row.id,
        suggestion: 'Adjust severity rating to be between 1 and 10 per AIAG-VDA scale',
      });
    }

    if (row.occurrence < 1 || row.occurrence > 10) {
      findings.push({
        id: `doc-invalid-occurrence-${row.id}`,
        level: 'error',
        category: 'compliance',
        rule: 'INVALID_OCCURRENCE',
        message: `Occurrence rating ${row.occurrence} is out of valid range (1-10)`,
        rowId: row.id,
        suggestion: 'Adjust occurrence rating to be between 1 and 10 per AIAG-VDA scale',
      });
    }

    if (row.detection < 1 || row.detection > 10) {
      findings.push({
        id: `doc-invalid-detection-${row.id}`,
        level: 'error',
        category: 'compliance',
        rule: 'INVALID_DETECTION',
        message: `Detection rating ${row.detection} is out of valid range (1-10)`,
        rowId: row.id,
        suggestion: 'Adjust detection rating to be between 1 and 10 per AIAG-VDA scale',
      });
    }

    // Check: High AP requires recommended action
    if (calculatedAP === 'H' && !row.recommendedAction?.trim()) {
      findings.push({
        id: `comp-high-ap-action-${row.id}`,
        level: 'error',
        category: 'compliance',
        rule: 'HIGH_AP_NO_ACTION',
        message: `High AP failure "${row.failureMode}" requires recommended action per AIAG-VDA 2019`,
        rowId: row.id,
        suggestion: 'Define recommended actions to reduce risk for High AP items',
      });
    }
  }

  // ===================
  // DOCUMENTATION CHECKS
  // ===================

  // Check: PFMEA has document number
  if (!pfmea.docNo) {
    findings.push({
      id: 'doc-pfmea-docno',
      level: 'warning',
      category: 'documentation',
      rule: 'MISSING_DOC_NUMBER',
      message: 'PFMEA is missing document number',
      suggestion: 'Assign a document control number for traceability',
    });
  }

  // Check: Has minimum rows
  if (pfmeaRows.length === 0) {
    findings.push({
      id: 'doc-pfmea-empty',
      level: 'error',
      category: 'documentation',
      rule: 'EMPTY_PFMEA',
      message: 'PFMEA has no failure mode rows',
      suggestion: 'Add failure mode analysis based on process steps',
    });
  }

  // Check: Control Plan exists for effective PFMEA
  if (pfmea.status === 'effective' && !controlPlan) {
    findings.push({
      id: 'cov-no-cp',
      level: 'error',
      category: 'coverage',
      rule: 'EFFECTIVE_PFMEA_NO_CP',
      message: 'Effective PFMEA has no associated Control Plan',
      suggestion: 'Generate a Control Plan from this PFMEA',
    });
  }

  // Check: Special characteristics not covered in Control Plan
  if (controlPlan && cpRows.length > 0) {
    const specialPfmeaRows = pfmeaRows.filter(r => r.specialFlag);
    
    for (const pfmeaRow of specialPfmeaRows) {
      const hasCPCoverage = cpRows.some(cpRow => 
        cpRow.sourceRowId === pfmeaRow.id || 
        cpRow.sourcePfmeaRowId === pfmeaRow.id ||
        cpRow.characteristicName?.includes(pfmeaRow.failureMode)
      );
      
      if (!hasCPCoverage) {
        findings.push({
          id: `cov-special-char-${pfmeaRow.id}`,
          level: 'error',
          category: 'coverage',
          rule: 'SPECIAL_CHAR_NOT_IN_CP',
          message: `Special characteristic "${pfmeaRow.failureMode}" not covered in Control Plan`,
          rowId: pfmeaRow.id,
          suggestion: 'Add corresponding control point in Control Plan for this special characteristic',
        });
      }
    }
  } else if (pfmeaRows.some(r => r.specialFlag)) {
    findings.push({
      id: 'cov-special-no-cp',
      level: 'warning',
      category: 'coverage',
      rule: 'SPECIAL_CHARS_NO_CP',
      message: 'PFMEA contains special characteristics but no Control Plan is linked',
      suggestion: 'Create and link a Control Plan to ensure special characteristics are controlled',
    });
  }

  return findings;
}

export function runControlPlanReview(data: {
  controlPlan: any;
  cpRows: any[];
  pfmea?: any;
  pfmeaRows?: any[];
}): ReviewFinding[] {
  const findings: ReviewFinding[] = [];
  const { controlPlan, cpRows, pfmea, pfmeaRows = [] } = data;

  // ===================
  // COVERAGE CHECKS
  // ===================

  // Check: Special characteristics from PFMEA are in CP
  const specialPfmeaRows = pfmeaRows.filter(r => r.specialFlag);
  for (const pfmeaRow of specialPfmeaRows) {
    const hasCPRow = cpRows.some(cp => 
      cp.sourcePfmeaRowId === pfmeaRow.id || 
      cp.sourceRowId === pfmeaRow.id
    );
    if (!hasCPRow) {
      findings.push({
        id: `cov-special-missing-${pfmeaRow.id}`,
        level: 'error',
        category: 'coverage',
        rule: 'SPECIAL_CHAR_NOT_IN_CP',
        message: `Special characteristic "${pfmeaRow.failureMode}" from PFMEA not in Control Plan`,
        rowId: pfmeaRow.id,
        suggestion: 'Add control characteristic for this special/critical feature',
      });
    }
  }

  // Check: High AP failures from PFMEA are in CP
  const highAPPfmeaRows = pfmeaRows.filter(r => 
    calculateAP(r.severity, r.occurrence, r.detection) === 'H'
  );
  for (const pfmeaRow of highAPPfmeaRows) {
    const hasCPRow = cpRows.some(cp => 
      cp.sourcePfmeaRowId === pfmeaRow.id || 
      cp.sourceRowId === pfmeaRow.id ||
      cp.characteristicName?.toLowerCase().includes(pfmeaRow.failureMode?.toLowerCase())
    );
    if (!hasCPRow) {
      findings.push({
        id: `cov-high-ap-missing-${pfmeaRow.id}`,
        level: 'warning',
        category: 'coverage',
        rule: 'HIGH_AP_NOT_IN_CP',
        message: `High AP failure mode "${pfmeaRow.failureMode}" may not be covered in Control Plan`,
        rowId: pfmeaRow.id,
        suggestion: 'Ensure Control Plan addresses high risk failure modes from PFMEA',
      });
    }
  }

  // ===================
  // COMPLIANCE CHECKS
  // ===================

  for (const row of cpRows) {
    // Check: Required fields
    if (!row.characteristicName?.trim()) {
      findings.push({
        id: `doc-cp-no-name-${row.id}`,
        level: 'error',
        category: 'documentation',
        rule: 'MISSING_CHAR_NAME',
        message: `Control Plan row missing characteristic name`,
        rowId: row.id,
        suggestion: 'Define the product or process characteristic being controlled',
      });
    }

    if (!row.controlMethod?.trim()) {
      findings.push({
        id: `doc-cp-no-method-${row.id}`,
        level: 'error',
        category: 'documentation',
        rule: 'MISSING_CONTROL_METHOD',
        message: `Characteristic "${row.characteristicName}" missing control method`,
        rowId: row.id,
        suggestion: 'Specify the method used to control this characteristic (e.g., SPC, 100% inspection)',
      });
    }

    // Check: Special characteristics have required fields
    if (row.specialFlag) {
      if (!row.acceptanceCriteria) {
        findings.push({
          id: `comp-cp-acceptance-${row.id}`,
          level: 'error',
          category: 'compliance',
          rule: 'CSR_MISSING_ACCEPTANCE',
          message: `Special characteristic "${row.characteristicName}" missing acceptance criteria`,
          rowId: row.id,
          suggestion: 'Add Cpk/Ppk targets or specific acceptance criteria per IATF 16949',
        });
      }

      if (!row.reactionPlan) {
        findings.push({
          id: `comp-cp-reaction-${row.id}`,
          level: 'error',
          category: 'compliance',
          rule: 'CSR_MISSING_REACTION',
          message: `Special characteristic "${row.characteristicName}" missing reaction plan`,
          rowId: row.id,
          suggestion: 'Document containment and corrective action steps',
        });
      }

      // Check for capability requirements in acceptance criteria
      if (row.acceptanceCriteria && !row.acceptanceCriteria.toLowerCase().includes('cpk') && 
          !row.acceptanceCriteria.toLowerCase().includes('ppk')) {
        findings.push({
          id: `comp-cp-capability-${row.id}`,
          level: 'warning',
          category: 'compliance',
          rule: 'CSR_NO_CAPABILITY_TARGET',
          message: `Special characteristic "${row.characteristicName}" should specify Cpk/Ppk target`,
          rowId: row.id,
          suggestion: 'Add capability requirement (e.g., Cpk ≥ 1.33 or Cpk ≥ 1.67 for safety)',
        });
      }

      if (!row.csrSymbol) {
        findings.push({
          id: `comp-cp-csr-symbol-${row.id}`,
          level: 'warning',
          category: 'compliance',
          rule: 'CSR_MISSING_SYMBOL',
          message: `Special characteristic "${row.characteristicName}" missing CSR symbol`,
          rowId: row.id,
          suggestion: 'Assign CSR symbol to match customer-specific requirements',
        });
      }

      if (!row.measurementSystem?.trim()) {
        findings.push({
          id: `eff-cp-no-measurement-${row.id}`,
          level: 'warning',
          category: 'effectiveness',
          rule: 'CSR_NO_MEASUREMENT',
          message: `Special characteristic "${row.characteristicName}" missing measurement system details`,
          rowId: row.id,
          suggestion: 'Specify the measurement system/gage used for this special characteristic',
        });
      }
    }

    // Check: Has measurement method
    if (!row.measurementSystem && !row.controlMethod) {
      findings.push({
        id: `eff-cp-no-method-${row.id}`,
        level: 'warning',
        category: 'effectiveness',
        rule: 'NO_MEASUREMENT_METHOD',
        message: `Characteristic "${row.characteristicName}" has no measurement or control method`,
        rowId: row.id,
        suggestion: 'Specify how this characteristic will be measured or controlled',
      });
    }

    // Check: Has sampling plan
    if (!row.sampleSize && !row.frequency) {
      findings.push({
        id: `eff-cp-no-sampling-${row.id}`,
        level: 'info',
        category: 'effectiveness',
        rule: 'NO_SAMPLING_PLAN',
        message: `Characteristic "${row.characteristicName}" has no sampling plan defined`,
        rowId: row.id,
        suggestion: 'Define sample size and frequency for inspection',
      });
    }

    // Check: SPC charts should have sample size > 1
    if (row.controlMethod) {
      const method = row.controlMethod.toLowerCase();
      if ((method.includes('chart') || method.includes('spc')) && row.sampleSize === '1 pc') {
        findings.push({
          id: `eff-cp-spc-sample-${row.id}`,
          level: 'warning',
          category: 'effectiveness',
          rule: 'SPC_INSUFFICIENT_SAMPLE',
          message: `SPC control method with sample size of 1`,
          rowId: row.id,
          suggestion: 'Consider larger sample size for effective SPC analysis (typically n=5)',
        });
      }

      // 100% inspection should be continuous frequency
      if (method.includes('100%') && row.frequency && !row.frequency.toLowerCase().includes('continuous')) {
        findings.push({
          id: `eff-cp-100-freq-${row.id}`,
          level: 'info',
          category: 'effectiveness',
          rule: '100_PERCENT_NOT_CONTINUOUS',
          message: `100% inspection with non-continuous frequency`,
          rowId: row.id,
          suggestion: 'Verify frequency is appropriate for 100% inspection method',
        });
      }
    }
  }

  // ===================
  // DOCUMENTATION CHECKS
  // ===================

  if (!controlPlan.docNo) {
    findings.push({
      id: 'doc-cp-docno',
      level: 'warning',
      category: 'documentation',
      rule: 'MISSING_DOC_NUMBER',
      message: 'Control Plan is missing document number',
      suggestion: 'Assign a document control number for traceability',
    });
  }

  if (cpRows.length === 0) {
    findings.push({
      id: 'doc-cp-empty',
      level: 'error',
      category: 'documentation',
      rule: 'EMPTY_CONTROL_PLAN',
      message: 'Control Plan has no characteristics',
      suggestion: 'Add control characteristics based on PFMEA analysis',
    });
  }

  return findings;
}
