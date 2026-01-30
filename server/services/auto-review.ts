import { db } from '../db';
import { 
  pfmea, 
  pfmeaRow, 
  controlPlan, 
  controlPlanRow, 
  pfd,
  pfdStep,
  fmeaTemplateRow,
  controlTemplateRow,
  calibrationLink,
  gageLibrary
} from '@shared/schema';
import { eq } from 'drizzle-orm';
import { calculateAP } from './ap-calculator';

export type FindingLevel = 'error' | 'warning' | 'info';
export type FindingCategory = 'coverage' | 'effectiveness' | 'document_control' | 'traceability' | 'compliance';

export interface AutoReviewFinding {
  id: string;
  level: FindingLevel;
  category: FindingCategory;
  code: string;
  title: string;
  message: string;
  ref?: {
    type: 'pfmea_row' | 'control_plan_row' | 'process_step' | 'pfmea' | 'control_plan';
    id: string;
    name?: string;
  };
  suggestion?: string;
  aiagVdaRef?: string;
}

export interface AutoReviewInput {
  pfmeaId: string;
  controlPlanId?: string;
  options?: {
    checkCoverage?: boolean;
    checkEffectiveness?: boolean;
    checkDocumentControl?: boolean;
    checkTraceability?: boolean;
    checkCompliance?: boolean;
  };
}

export interface AutoReviewResult {
  reviewId: string;
  reviewedAt: string;
  pfmeaId: string;
  controlPlanId?: string;
  partId: string;
  partNumber: string;
  summary: {
    totalFindings: number;
    errors: number;
    warnings: number;
    info: number;
    passRate: number;
    categories: {
      coverage: { errors: number; warnings: number; info: number };
      effectiveness: { errors: number; warnings: number; info: number };
      document_control: { errors: number; warnings: number; info: number };
      traceability: { errors: number; warnings: number; info: number };
      compliance: { errors: number; warnings: number; info: number };
    };
  };
  findings: AutoReviewFinding[];
  recommendations: string[];
}

function generateFindingId(): string {
  return `FR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function createFinding(
  level: FindingLevel,
  category: FindingCategory,
  code: string,
  title: string,
  message: string,
  options?: {
    ref?: AutoReviewFinding['ref'];
    suggestion?: string;
    aiagVdaRef?: string;
  }
): AutoReviewFinding {
  return {
    id: generateFindingId(),
    level,
    category,
    code,
    title,
    message,
    ...options,
  };
}

export class AutoReviewService {
  private findings: AutoReviewFinding[] = [];
  
  async runReview(input: AutoReviewInput): Promise<AutoReviewResult> {
    this.findings = [];
    
    const options = {
      checkCoverage: true,
      checkEffectiveness: true,
      checkDocumentControl: true,
      checkTraceability: true,
      checkCompliance: true,
      ...input.options,
    };
    
    const pfmeaData = await db.query.pfmea.findFirst({
      where: eq(pfmea.id, input.pfmeaId),
      with: {
        part: true,
        rows: true,
      },
    });
    
    if (!pfmeaData) {
      throw new Error('PFMEA not found');
    }
    
    let cpData = null;
    if (input.controlPlanId) {
      cpData = await db.query.controlPlan.findFirst({
        where: eq(controlPlan.id, input.controlPlanId),
        with: {
          rows: true,
        },
      });
    }
    
    if (options.checkCoverage) {
      await this.checkCoverage(pfmeaData, cpData);
    }
    
    if (options.checkEffectiveness) {
      await this.checkEffectiveness(pfmeaData, cpData);
    }
    
    if (options.checkDocumentControl) {
      await this.checkDocumentControl(pfmeaData, cpData);
    }
    
    if (options.checkTraceability) {
      await this.checkTraceability(pfmeaData, cpData);
    }
    
    if (options.checkCompliance) {
      await this.checkCompliance(pfmeaData, cpData);
    }
    
    const summary = this.calculateSummary();
    const recommendations = this.generateRecommendations();
    
    return {
      reviewId: `AR-${Date.now()}`,
      reviewedAt: new Date().toISOString(),
      pfmeaId: input.pfmeaId,
      controlPlanId: input.controlPlanId,
      partId: pfmeaData.partId,
      partNumber: pfmeaData.part?.partNumber || 'Unknown',
      summary,
      findings: this.findings,
      recommendations,
    };
  }
  
  private async checkCoverage(pfmeaData: any, cpData: any) {
    const pfmeaRows = pfmeaData.rows || [];
    const cpRows = cpData?.rows || [];
    
    const highAPRows = pfmeaRows.filter((r: any) => r.ap === 'H');
    for (const row of highAPRows) {
      const hasCPCoverage = cpRows.some((cp: any) => cp.sourcePfmeaRowId === row.id);
      if (!hasCPCoverage) {
        this.findings.push(createFinding(
          'error',
          'coverage',
          'COV-001',
          'High AP Row Missing Control Plan Coverage',
          `PFMEA row "${row.failureMode}" has HIGH Action Priority but no corresponding Control Plan characteristic.`,
          {
            ref: { type: 'pfmea_row', id: row.id, name: row.failureMode },
            suggestion: 'Add a Control Plan characteristic linked to this PFMEA row, or document a waiver with justification.',
            aiagVdaRef: 'AIAG-VDA PFMEA 1st Ed, Section 6.5',
          }
        ));
      }
    }
    
    const mediumAPRows = pfmeaRows.filter((r: any) => r.ap === 'M');
    for (const row of mediumAPRows) {
      const hasCPCoverage = cpRows.some((cp: any) => cp.sourcePfmeaRowId === row.id);
      if (!hasCPCoverage) {
        this.findings.push(createFinding(
          'warning',
          'coverage',
          'COV-002',
          'Medium AP Row Without Control Plan Coverage',
          `PFMEA row "${row.failureMode}" has MEDIUM Action Priority without Control Plan coverage.`,
          {
            ref: { type: 'pfmea_row', id: row.id, name: row.failureMode },
            suggestion: 'Consider adding Control Plan coverage for medium-risk items.',
          }
        ));
      }
    }
    
    const specialRows = pfmeaRows.filter((r: any) => r.specialFlag || r.csrSymbol);
    for (const row of specialRows) {
      const hasCPCoverage = cpRows.some((cp: any) => cp.sourcePfmeaRowId === row.id);
      if (!hasCPCoverage) {
        this.findings.push(createFinding(
          'error',
          'coverage',
          'COV-003',
          'Special Characteristic Missing Control Plan',
          `PFMEA row "${row.failureMode}" is marked as special characteristic (${row.csrSymbol || 'SC'}) but has no Control Plan coverage.`,
          {
            ref: { type: 'pfmea_row', id: row.id, name: row.failureMode },
            suggestion: 'All special characteristics require Control Plan coverage per IATF 16949.',
            aiagVdaRef: 'IATF 16949:2016 Section 8.3.3.3',
          }
        ));
      }
    }
    
    if (cpData) {
      const orphanedCPRows = cpRows.filter((cp: any) => !cp.sourcePfmeaRowId);
      for (const row of orphanedCPRows) {
        this.findings.push(createFinding(
          'warning',
          'coverage',
          'COV-004',
          'Control Plan Row Not Linked to PFMEA',
          `Control Plan characteristic "${row.characteristicName}" is not linked to any PFMEA row.`,
          {
            ref: { type: 'control_plan_row', id: row.id, name: row.characteristicName },
            suggestion: 'Link this characteristic to the appropriate PFMEA failure mode for traceability.',
          }
        ));
      }
    }
  }
  
  private async checkEffectiveness(pfmeaData: any, cpData: any) {
    const pfmeaRows = pfmeaData.rows || [];
    const cpRows = cpData?.rows || [];
    
    for (const row of pfmeaRows) {
      const calculated = calculateAP({ severity: row.severity, occurrence: row.occurrence, detection: row.detection });
      if (calculated.priority !== row.ap) {
        this.findings.push(createFinding(
          'error',
          'effectiveness',
          'EFF-001',
          'AP Calculation Mismatch',
          `PFMEA row "${row.failureMode}" has stored AP="${row.ap}" but calculated AP="${calculated.priority}" (S=${row.severity}, O=${row.occurrence}, D=${row.detection}).`,
          {
            ref: { type: 'pfmea_row', id: row.id, name: row.failureMode },
            suggestion: 'Recalculate AP or verify S/O/D ratings are correct.',
            aiagVdaRef: 'AIAG-VDA PFMEA 1st Ed, Appendix B',
          }
        ));
      }
    }
    
    const highSeverityRows = pfmeaRows.filter((r: any) => r.severity >= 9);
    for (const row of highSeverityRows) {
      if (!row.preventionControls || row.preventionControls.length === 0) {
        this.findings.push(createFinding(
          'error',
          'effectiveness',
          'EFF-002',
          'Safety-Critical Without Prevention Controls',
          `PFMEA row "${row.failureMode}" has Severity ≥9 (safety-critical) but no prevention controls defined.`,
          {
            ref: { type: 'pfmea_row', id: row.id, name: row.failureMode },
            suggestion: 'Safety-critical failure modes require both prevention AND detection controls.',
            aiagVdaRef: 'AIAG-VDA PFMEA 1st Ed, Section 5.4.2',
          }
        ));
      }
    }
    
    const highSeverityDetectionOnly = pfmeaRows.filter((r: any) => 
      r.severity >= 7 && 
      (!r.preventionControls || r.preventionControls.length === 0) &&
      r.detectionControls && r.detectionControls.length > 0
    );
    for (const row of highSeverityDetectionOnly) {
      this.findings.push(createFinding(
        'warning',
        'effectiveness',
        'EFF-003',
        'Detection-Only Strategy for High Severity',
        `PFMEA row "${row.failureMode}" (S=${row.severity}) relies only on detection controls. Prevention is preferred.`,
        {
          ref: { type: 'pfmea_row', id: row.id, name: row.failureMode },
          suggestion: 'Add prevention controls to reduce occurrence. Detection alone cannot prevent defects from being produced.',
        }
      ));
    }
    
    const noDetectionRows = pfmeaRows.filter((r: any) => r.detection === 10);
    for (const row of noDetectionRows) {
      this.findings.push(createFinding(
        row.severity >= 7 ? 'error' : 'warning',
        'effectiveness',
        'EFF-004',
        'No Detection Capability',
        `PFMEA row "${row.failureMode}" has Detection=10, meaning the defect will reach the customer.`,
        {
          ref: { type: 'pfmea_row', id: row.id, name: row.failureMode },
          suggestion: 'Implement detection controls or error-proofing to prevent defects from reaching the customer.',
        }
      ));
    }
    
    if (cpData) {
      const specialCPRows = cpRows.filter((cp: any) => cp.specialFlag || cp.csrSymbol);
      for (const row of specialCPRows) {
        if (!row.acceptanceCriteria || !row.acceptanceCriteria.toLowerCase().includes('cpk')) {
          this.findings.push(createFinding(
            'warning',
            'effectiveness',
            'EFF-005',
            'Special Characteristic Without Capability Target',
            `Control Plan characteristic "${row.characteristicName}" (${row.csrSymbol || 'SC'}) should have Cpk target in acceptance criteria.`,
            {
              ref: { type: 'control_plan_row', id: row.id, name: row.characteristicName },
              suggestion: 'Add capability requirement (e.g., "Cpk ≥ 1.33" or "Cpk ≥ 1.67" for safety-critical).',
              aiagVdaRef: 'IATF 16949:2016 Section 9.1.1.1',
            }
          ));
        }
      }
    }
    
    if (cpData) {
      const noReactionPlan = cpRows.filter((cp: any) => !cp.reactionPlan);
      for (const row of noReactionPlan) {
        this.findings.push(createFinding(
          row.specialFlag ? 'error' : 'warning',
          'effectiveness',
          'EFF-006',
          'Missing Reaction Plan',
          `Control Plan characteristic "${row.characteristicName}" has no reaction plan defined.`,
          {
            ref: { type: 'control_plan_row', id: row.id, name: row.characteristicName },
            suggestion: 'Define what actions to take when the characteristic is out of specification.',
          }
        ));
      }
    }
  }
  
  private async checkDocumentControl(pfmeaData: any, cpData: any) {
    if (!pfmeaData.docNo) {
      this.findings.push(createFinding(
        'error',
        'document_control',
        'DOC-001',
        'PFMEA Missing Document Number',
        'PFMEA does not have a document number assigned.',
        {
          ref: { type: 'pfmea', id: pfmeaData.id },
          suggestion: 'Assign a document number per your document control procedure.',
        }
      ));
    }
    
    if (cpData && !cpData.docNo) {
      this.findings.push(createFinding(
        'error',
        'document_control',
        'DOC-002',
        'Control Plan Missing Document Number',
        'Control Plan does not have a document number assigned.',
        {
          ref: { type: 'control_plan', id: cpData.id },
          suggestion: 'Assign a document number per your document control procedure.',
        }
      ));
    }
    
    if (pfmeaData.status === 'draft') {
      const createdAt = new Date(pfmeaData.createdAt);
      const daysSinceCreation = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceCreation > 30) {
        this.findings.push(createFinding(
          'info',
          'document_control',
          'DOC-003',
          'PFMEA in Draft for Extended Period',
          `PFMEA has been in draft status for ${Math.floor(daysSinceCreation)} days.`,
          {
            ref: { type: 'pfmea', id: pfmeaData.id },
            suggestion: 'Review and approve the PFMEA or document reason for delay.',
          }
        ));
      }
    }
    
    if (pfmeaData.status === 'effective' && !pfmeaData.approvedBy) {
      this.findings.push(createFinding(
        'error',
        'document_control',
        'DOC-004',
        'Effective PFMEA Without Approval',
        'PFMEA is marked as effective but has no approval signature.',
        {
          ref: { type: 'pfmea', id: pfmeaData.id },
          suggestion: 'Documents must be approved before becoming effective.',
        }
      ));
    }
  }
  
  private async checkTraceability(pfmeaData: any, cpData: any) {
    const pfmeaRows = pfmeaData.rows || [];
    
    const unlinkedRows = pfmeaRows.filter((r: any) => !r.parentTemplateRowId);
    if (unlinkedRows.length > 0) {
      this.findings.push(createFinding(
        'info',
        'traceability',
        'TRC-001',
        'PFMEA Rows Not Linked to Templates',
        `${unlinkedRows.length} PFMEA row(s) are not linked to process library templates.`,
        {
          suggestion: 'Rows created from templates maintain traceability for change propagation.',
        }
      ));
    }
    
    if (cpData) {
      const cpRows = cpData.rows || [];
      const rowsWithGages = cpRows.filter((r: any) => r.measurementSystem);
      
      for (const row of rowsWithGages) {
        if (row.specialFlag && !row.gageId) {
          this.findings.push(createFinding(
            'warning',
            'traceability',
            'TRC-002',
            'Special Characteristic Without Gage Link',
            `Control Plan characteristic "${row.characteristicName}" uses "${row.measurementSystem}" but has no gage linked.`,
            {
              ref: { type: 'control_plan_row', id: row.id, name: row.characteristicName },
              suggestion: 'Link a gage from the gage library for MSA traceability.',
              aiagVdaRef: 'IATF 16949:2016 Section 7.1.5.1.1',
            }
          ));
        }
      }
    }
  }
  
  private async checkCompliance(pfmeaData: any, cpData: any) {
    const pfmeaRows = pfmeaData.rows || [];
    
    if (pfmeaData.basis !== 'AIAG-VDA 2019') {
      this.findings.push(createFinding(
        'info',
        'compliance',
        'CMP-001',
        'Non-Standard PFMEA Methodology',
        `PFMEA uses "${pfmeaData.basis || 'Unknown'}" methodology instead of AIAG-VDA 2019.`,
        {
          ref: { type: 'pfmea', id: pfmeaData.id },
          suggestion: 'AIAG-VDA 2019 is the current industry standard for automotive PFMEA.',
        }
      ));
    }
    
    for (const row of pfmeaRows) {
      if (row.severity < 1 || row.severity > 10 ||
          row.occurrence < 1 || row.occurrence > 10 ||
          row.detection < 1 || row.detection > 10) {
        this.findings.push(createFinding(
          'error',
          'compliance',
          'CMP-002',
          'Invalid S/O/D Rating',
          `PFMEA row "${row.failureMode}" has invalid rating values (S=${row.severity}, O=${row.occurrence}, D=${row.detection}).`,
          {
            ref: { type: 'pfmea_row', id: row.id, name: row.failureMode },
            suggestion: 'All S/O/D ratings must be between 1 and 10.',
          }
        ));
      }
    }
    
    const emptyFailureModes = pfmeaRows.filter((r: any) => !r.failureMode || r.failureMode.trim() === '');
    if (emptyFailureModes.length > 0) {
      this.findings.push(createFinding(
        'error',
        'compliance',
        'CMP-003',
        'Empty Failure Mode Description',
        `${emptyFailureModes.length} PFMEA row(s) have empty failure mode descriptions.`,
        {
          suggestion: 'Every PFMEA row must have a failure mode description.',
        }
      ));
    }
    
    if (cpData) {
      if (!['Pre-Launch', 'Production'].includes(cpData.type)) {
        this.findings.push(createFinding(
          'warning',
          'compliance',
          'CMP-004',
          'Non-Standard Control Plan Type',
          `Control Plan type "${cpData.type}" is not a standard APQP phase.`,
          {
            ref: { type: 'control_plan', id: cpData.id },
            suggestion: 'Use "Pre-Launch" or "Production" for standard APQP compliance.',
          }
        ));
      }
    }
  }
  
  private calculateSummary() {
    const categories: AutoReviewResult['summary']['categories'] = {
      coverage: { errors: 0, warnings: 0, info: 0 },
      effectiveness: { errors: 0, warnings: 0, info: 0 },
      document_control: { errors: 0, warnings: 0, info: 0 },
      traceability: { errors: 0, warnings: 0, info: 0 },
      compliance: { errors: 0, warnings: 0, info: 0 },
    };
    
    let errors = 0, warnings = 0, info = 0;
    
    for (const finding of this.findings) {
      categories[finding.category][finding.level === 'error' ? 'errors' : finding.level === 'warning' ? 'warnings' : 'info']++;
      
      if (finding.level === 'error') errors++;
      else if (finding.level === 'warning') warnings++;
      else info++;
    }
    
    const passRate = errors > 0 ? 0 : Math.max(0, 100 - (warnings * 5));
    
    return {
      totalFindings: this.findings.length,
      errors,
      warnings,
      info,
      passRate,
      categories,
    };
  }
  
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    
    const errorCounts = {
      coverage: this.findings.filter(f => f.category === 'coverage' && f.level === 'error').length,
      effectiveness: this.findings.filter(f => f.category === 'effectiveness' && f.level === 'error').length,
      document_control: this.findings.filter(f => f.category === 'document_control' && f.level === 'error').length,
    };
    
    if (errorCounts.coverage > 0) {
      recommendations.push(`Address ${errorCounts.coverage} coverage gap(s) - High AP and special characteristics require Control Plan coverage.`);
    }
    
    if (errorCounts.effectiveness > 0) {
      recommendations.push(`Review ${errorCounts.effectiveness} effectiveness issue(s) - Verify AP calculations and control strategies.`);
    }
    
    if (errorCounts.document_control > 0) {
      recommendations.push(`Resolve ${errorCounts.document_control} document control issue(s) - Ensure proper numbering and approvals.`);
    }
    
    const highAPWithoutPrevention = this.findings.filter(f => f.code === 'EFF-002').length;
    if (highAPWithoutPrevention > 0) {
      recommendations.push('Priority: Add prevention controls for safety-critical failure modes (Severity ≥9).');
    }
    
    const orphanedRows = this.findings.filter(f => f.code === 'COV-004').length;
    if (orphanedRows > 0) {
      recommendations.push(`Link ${orphanedRows} orphaned Control Plan row(s) to PFMEA for full traceability.`);
    }
    
    if (this.findings.length === 0) {
      recommendations.push('Excellent! No compliance issues detected. Continue regular reviews to maintain quality.');
    }
    
    return recommendations;
  }
}

export const autoReviewService = new AutoReviewService();
