/**
 * Auto-Review Service
 * 
 * Validates PFMEA and Control Plan documents against AIAG-VDA 2019 rules.
 * Returns findings categorized by level (error/warning/info) and category.
 */

import { db } from './db';
import { 
  pfmea, pfmeaRow, controlPlan, controlPlanRow, pfd, pfdStep,
  autoReviewRun, autoReviewFinding,
  type AutoReviewRun, type AutoReviewFinding
} from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';

export interface Finding {
  level: 'error' | 'warning' | 'info';
  category: 'coverage' | 'effectiveness' | 'document_control' | 'scoring' | 'csr';
  ruleId: string;
  message: string;
  entityType?: string;
  entityId?: string;
  details?: Record<string, any>;
}

export interface AutoReviewResult {
  runId: string;
  pfmeaId?: string;
  controlPlanId?: string;
  passedValidation: boolean;
  totalFindings: number;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  findings: Finding[];
  durationMs: number;
}

/**
 * AIAG-VDA 2019 Action Priority (AP) Calculation
 * Based on the official AIAG-VDA 2019 FMEA Handbook AP lookup table.
 * 
 * HIGH (H): Immediate action required - highest priority
 * MEDIUM (M): Action required - secondary priority  
 * LOW (L): Action may be taken - lowest priority
 */
export function calculateAP(severity: number, occurrence: number, detection: number): 'H' | 'M' | 'L' {
  const s = Math.max(1, Math.min(10, severity));
  const o = Math.max(1, Math.min(10, occurrence));
  const d = Math.max(1, Math.min(10, detection));

  // HIGH Priority Conditions (per AIAG-VDA 2019)
  // S=9-10: Always high regardless of O and D
  if (s >= 9 && o >= 4) return 'H';
  if (s >= 9 && d >= 4) return 'H';
  
  // S=7-8 with high O or D
  if (s >= 7 && s <= 8 && o >= 7) return 'H';
  if (s >= 7 && s <= 8 && d >= 7) return 'H';
  if (s >= 7 && s <= 8 && o >= 5 && d >= 5) return 'H';
  
  // Very high D regardless of S (D=9-10)
  if (d >= 9 && o >= 4) return 'H';
  
  // S=5-6 with very high O and D
  if (s >= 5 && s <= 6 && o >= 7 && d >= 7) return 'H';

  // MEDIUM Priority Conditions
  // S=9-10 with low O and D
  if (s >= 9 && o >= 4 && o <= 6 && d >= 4 && d <= 6) return 'M';
  if (s >= 9 && o <= 3 && d >= 4) return 'M';
  if (s >= 9 && d <= 3 && o >= 4) return 'M';
  
  // S=7-8 with moderate O and D
  if (s >= 7 && s <= 8 && o >= 4 && o <= 6 && d >= 4 && d <= 6) return 'M';
  if (s >= 7 && s <= 8 && o >= 4 && o <= 6 && d >= 2 && d <= 3) return 'M';
  if (s >= 7 && s <= 8 && d >= 4 && d <= 6 && o >= 2 && o <= 3) return 'M';
  
  // S=5-6 with high O or high D
  if (s >= 5 && s <= 6 && o >= 7) return 'M';
  if (s >= 5 && s <= 6 && d >= 7) return 'M';
  if (s >= 5 && s <= 6 && o >= 4 && o <= 6 && d >= 4 && d <= 6) return 'M';
  
  // S=4 with very high O and D
  if (s === 4 && o >= 7 && d >= 7) return 'M';
  
  // D=7-8 with moderate S and O
  if (d >= 7 && d <= 8 && s >= 4 && s <= 6 && o >= 4) return 'M';
  
  // O=7-8 with moderate S and D
  if (o >= 7 && o <= 8 && s >= 4 && s <= 6 && d >= 4) return 'M';

  // LOW Priority - everything else
  return 'L';
}

interface ValidationContext {
  pfmeaData?: any;
  controlPlanData?: any;
  pfdData?: any;
}

type ValidationRule = (ctx: ValidationContext, findings: Finding[]) => void;

const VALIDATION_RULES: ValidationRule[] = [
  // PFD_PFMEA_COVERAGE - Every PFD step should have at least one PFMEA row
  (ctx, findings) => {
    if (!ctx.pfdData || !ctx.pfmeaData) return;
    const pfmeaStepRefs = new Set(ctx.pfmeaData.rows?.map((r: any) => r.stepRef?.toLowerCase().trim()) || []);
    for (const step of ctx.pfdData.steps || []) {
      const stepName = step.name?.toLowerCase().trim();
      if (stepName && !pfmeaStepRefs.has(stepName)) {
        const hasMatch = ctx.pfmeaData.rows?.some((r: any) => 
          r.stepRef?.toLowerCase().includes(stepName) || 
          r.processStep?.toLowerCase().includes(stepName)
        );
        if (!hasMatch) {
          findings.push({
            level: 'error',
            category: 'coverage',
            ruleId: 'PFD_PFMEA_COVERAGE',
            message: `PFD step "${step.name}" has no PFMEA coverage`,
            entityType: 'pfd_step',
            entityId: step.id,
            details: { stepName: step.name, processNo: step.processNo }
          });
        }
      }
    }
  },

  // AP_HIGH_NEEDS_CP - Every AP=HIGH PFMEA row must have Control Plan coverage
  (ctx, findings) => {
    if (!ctx.pfmeaData || !ctx.controlPlanData) return;
    const highAPRows = ctx.pfmeaData.rows?.filter((r: any) => r.ap === 'H') || [];
    for (const fmeaRow of highAPRows) {
      const hasCPCoverage = ctx.controlPlanData.rows?.some((cp: any) => 
        cp.sourcePfmeaRowId === fmeaRow.id
      );
      if (!hasCPCoverage) {
        findings.push({
          level: 'error',
          category: 'coverage',
          ruleId: 'AP_HIGH_NEEDS_CP',
          message: `High AP PFMEA row "${fmeaRow.failureMode}" requires Control Plan coverage`,
          entityType: 'pfmea_row',
          entityId: fmeaRow.id,
          details: { 
            failureMode: fmeaRow.failureMode,
            severity: fmeaRow.severity,
            occurrence: fmeaRow.occurrence,
            detection: fmeaRow.detection,
            ap: fmeaRow.ap
          }
        });
      }
    }
  },

  // CSR_NEEDS_CP - All CSR characteristics must have Control Plan rows
  (ctx, findings) => {
    if (!ctx.pfmeaData || !ctx.controlPlanData) return;
    const csrRows = ctx.pfmeaData.rows?.filter((r: any) => r.csrSymbol || r.specialFlag) || [];
    for (const fmeaRow of csrRows) {
      const hasCPCoverage = ctx.controlPlanData.rows?.some((cp: any) => 
        cp.sourcePfmeaRowId === fmeaRow.id
      );
      if (!hasCPCoverage) {
        findings.push({
          level: 'error',
          category: 'csr',
          ruleId: 'CSR_NEEDS_CP',
          message: `CSR-flagged failure mode "${fmeaRow.failureMode}" requires Control Plan coverage`,
          entityType: 'pfmea_row',
          entityId: fmeaRow.id,
          details: { csrSymbol: fmeaRow.csrSymbol, specialFlag: fmeaRow.specialFlag }
        });
      }
    }
  },

  // AP_CALCULATION_MISMATCH - Verify AP matches S×O×D per AIAG-VDA 2019
  (ctx, findings) => {
    if (!ctx.pfmeaData) return;
    for (const row of ctx.pfmeaData.rows || []) {
      const calculatedAP = calculateAP(row.severity, row.occurrence, row.detection);
      if (calculatedAP !== row.ap) {
        findings.push({
          level: 'warning',
          category: 'scoring',
          ruleId: 'AP_CALCULATION_MISMATCH',
          message: `AP mismatch for "${row.failureMode}": stored=${row.ap}, calculated=${calculatedAP}`,
          entityType: 'pfmea_row',
          entityId: row.id,
          details: {
            severity: row.severity,
            occurrence: row.occurrence,
            detection: row.detection,
            storedAP: row.ap,
            calculatedAP
          }
        });
      }
    }
  },

  // HIGH_SEVERITY_NO_PREVENTION - S≥7 detection-only rows need prevention controls
  (ctx, findings) => {
    if (!ctx.pfmeaData) return;
    for (const row of ctx.pfmeaData.rows || []) {
      if (row.severity >= 7) {
        const preventionControls = row.preventionControls || [];
        const hasPreventionControls = preventionControls.length > 0 && 
          preventionControls.some((c: string) => c && c.trim() !== '' && c.toLowerCase() !== 'none');
        if (!hasPreventionControls) {
          findings.push({
            level: 'error',
            category: 'effectiveness',
            ruleId: 'HIGH_SEVERITY_NO_PREVENTION',
            message: `High severity (S=${row.severity}) failure mode "${row.failureMode}" requires prevention controls`,
            entityType: 'pfmea_row',
            entityId: row.id,
            details: { severity: row.severity, failureMode: row.failureMode, preventionControls }
          });
        }
      }
    }
  },

  // DETECTION_ONLY_HIGH - Detection-only with no prevention for AP=HIGH needs action
  (ctx, findings) => {
    if (!ctx.pfmeaData) return;
    for (const row of ctx.pfmeaData.rows || []) {
      if (row.ap === 'H') {
        const preventionControls = row.preventionControls || [];
        const detectionControls = row.detectionControls || [];
        const hasPreventionControls = preventionControls.some((c: string) => c && c.trim() !== '' && c.toLowerCase() !== 'none');
        const hasDetectionControls = detectionControls.some((c: string) => c && c.trim() !== '' && c.toLowerCase() !== 'none');
        if (!hasPreventionControls && hasDetectionControls) {
          if (!row.actionStatus || row.actionStatus === 'none') {
            findings.push({
              level: 'warning',
              category: 'effectiveness',
              ruleId: 'DETECTION_ONLY_HIGH',
              message: `Detection-only HIGH AP row "${row.failureMode}" - consider adding prevention controls`,
              entityType: 'pfmea_row',
              entityId: row.id,
              details: { detectionControls, actionStatus: row.actionStatus }
            });
          }
        }
      }
    }
  },

  // RATING_OUT_OF_RANGE - S/O/D must be 1-10
  (ctx, findings) => {
    if (!ctx.pfmeaData) return;
    for (const row of ctx.pfmeaData.rows || []) {
      if (row.severity < 1 || row.severity > 10) {
        findings.push({
          level: 'error',
          category: 'scoring',
          ruleId: 'SEVERITY_OUT_OF_RANGE',
          message: `Severity ${row.severity} out of valid range (1-10) for "${row.failureMode}"`,
          entityType: 'pfmea_row',
          entityId: row.id
        });
      }
      if (row.occurrence < 1 || row.occurrence > 10) {
        findings.push({
          level: 'error',
          category: 'scoring',
          ruleId: 'OCCURRENCE_OUT_OF_RANGE',
          message: `Occurrence ${row.occurrence} out of valid range (1-10) for "${row.failureMode}"`,
          entityType: 'pfmea_row',
          entityId: row.id
        });
      }
      if (row.detection < 1 || row.detection > 10) {
        findings.push({
          level: 'error',
          category: 'scoring',
          ruleId: 'DETECTION_OUT_OF_RANGE',
          message: `Detection ${row.detection} out of valid range (1-10) for "${row.failureMode}"`,
          entityType: 'pfmea_row',
          entityId: row.id
        });
      }
    }
  },

  // CSR_NEEDS_CPK - CSR characteristics must have Cpk target
  (ctx, findings) => {
    if (!ctx.controlPlanData) return;
    const csrRows = ctx.controlPlanData.rows?.filter((r: any) => r.csrSymbol || r.specialFlag) || [];
    for (const row of csrRows) {
      const acceptanceCriteria = row.acceptanceCriteria || '';
      const hasCpkTarget = /cpk|ppk/i.test(acceptanceCriteria);
      if (!hasCpkTarget) {
        findings.push({
          level: 'warning',
          category: 'csr',
          ruleId: 'CSR_NEEDS_CPK',
          message: `CSR characteristic "${row.characteristicName}" should have Cpk/Ppk target`,
          entityType: 'control_plan_row',
          entityId: row.id,
          details: { acceptanceCriteria, csrSymbol: row.csrSymbol }
        });
      }
    }
  },

  // CSR_NEEDS_REACTION - CSR characteristics must have reaction plan
  (ctx, findings) => {
    if (!ctx.controlPlanData) return;
    const csrRows = ctx.controlPlanData.rows?.filter((r: any) => r.csrSymbol || r.specialFlag) || [];
    for (const row of csrRows) {
      if (!row.reactionPlan || row.reactionPlan.trim() === '') {
        findings.push({
          level: 'error',
          category: 'csr',
          ruleId: 'CSR_NEEDS_REACTION',
          message: `CSR characteristic "${row.characteristicName}" missing reaction plan`,
          entityType: 'control_plan_row',
          entityId: row.id,
          details: { csrSymbol: row.csrSymbol }
        });
      }
    }
  },

  // CSR_S9_REQUIREMENT - CSR with S≥9 requires both prevention AND detection
  (ctx, findings) => {
    if (!ctx.pfmeaData) return;
    for (const row of ctx.pfmeaData.rows || []) {
      if (row.severity >= 9 && (row.csrSymbol || row.specialFlag)) {
        const preventionControls = row.preventionControls || [];
        const detectionControls = row.detectionControls || [];
        const hasPreventionControls = preventionControls.some((c: string) => c && c.trim() !== '' && c.toLowerCase() !== 'none');
        const hasDetectionControls = detectionControls.some((c: string) => c && c.trim() !== '' && c.toLowerCase() !== 'none');
        if (!hasPreventionControls || !hasDetectionControls) {
          findings.push({
            level: 'error',
            category: 'csr',
            ruleId: 'CSR_S9_REQUIREMENT',
            message: `CSR failure mode "${row.failureMode}" with S≥9 requires both prevention AND detection controls`,
            entityType: 'pfmea_row',
            entityId: row.id,
            details: { severity: row.severity, hasPreventionControls, hasDetectionControls }
          });
        }
      }
    }
  },

  // PFMEA_DOC_NUMBER - PFMEA must have document number
  (ctx, findings) => {
    if (!ctx.pfmeaData) return;
    if (!ctx.pfmeaData.pfmeaNumber && !ctx.pfmeaData.docNo) {
      findings.push({
        level: 'warning',
        category: 'document_control',
        ruleId: 'PFMEA_DOC_NUMBER',
        message: 'PFMEA missing document number',
        entityType: 'pfmea',
        entityId: ctx.pfmeaData.id
      });
    }
  },

  // CP_DOC_NUMBER - Control Plan must have document number
  (ctx, findings) => {
    if (!ctx.controlPlanData) return;
    if (!ctx.controlPlanData.controlPlanNumber && !ctx.controlPlanData.docNo) {
      findings.push({
        level: 'warning',
        category: 'document_control',
        ruleId: 'CP_DOC_NUMBER',
        message: 'Control Plan missing document number',
        entityType: 'control_plan',
        entityId: ctx.controlPlanData.id
      });
    }
  },

  // PFMEA_BASIS - PFMEA should specify basis
  (ctx, findings) => {
    if (!ctx.pfmeaData) return;
    if (!ctx.pfmeaData.basis) {
      findings.push({
        level: 'info',
        category: 'document_control',
        ruleId: 'PFMEA_BASIS',
        message: 'PFMEA should specify methodology basis (e.g., "AIAG-VDA 2019")',
        entityType: 'pfmea',
        entityId: ctx.pfmeaData.id
      });
    }
  },

  // CP_CONTROL_METHOD - Control Plan rows should have control method
  (ctx, findings) => {
    if (!ctx.controlPlanData) return;
    for (const row of ctx.controlPlanData.rows || []) {
      if (!row.controlMethod || row.controlMethod.trim() === '') {
        findings.push({
          level: 'warning',
          category: 'effectiveness',
          ruleId: 'CP_CONTROL_METHOD',
          message: `Control Plan characteristic "${row.characteristicName}" missing control method`,
          entityType: 'control_plan_row',
          entityId: row.id
        });
      }
    }
  },

  // CP_SAMPLE_FREQUENCY - Control Plan should have sample size and frequency
  (ctx, findings) => {
    if (!ctx.controlPlanData) return;
    for (const row of ctx.controlPlanData.rows || []) {
      if (!row.sampleSize || row.sampleSize.trim() === '') {
        findings.push({
          level: 'info',
          category: 'effectiveness',
          ruleId: 'CP_SAMPLE_SIZE',
          message: `Control Plan characteristic "${row.characteristicName}" missing sample size`,
          entityType: 'control_plan_row',
          entityId: row.id
        });
      }
      if (!row.frequency || row.frequency.trim() === '') {
        findings.push({
          level: 'info',
          category: 'effectiveness',
          ruleId: 'CP_FREQUENCY',
          message: `Control Plan characteristic "${row.characteristicName}" missing frequency`,
          entityType: 'control_plan_row',
          entityId: row.id
        });
      }
    }
  },

  // OPEN_ACTIONS - Flag open actions past target date
  (ctx, findings) => {
    if (!ctx.pfmeaData) return;
    const now = new Date();
    for (const row of ctx.pfmeaData.rows || []) {
      if (row.actionStatus === 'open' || row.actionStatus === 'in_progress') {
        if (row.targetDate && new Date(row.targetDate) < now) {
          findings.push({
            level: 'warning',
            category: 'effectiveness',
            ruleId: 'OVERDUE_ACTION',
            message: `Action for "${row.failureMode}" is past target date`,
            entityType: 'pfmea_row',
            entityId: row.id,
            details: { targetDate: row.targetDate, actionStatus: row.actionStatus, responsibility: row.responsibility }
          });
        }
      }
    }
  }
];

export async function runAutoReview(
  pfmeaId?: string,
  controlPlanId?: string,
  runBy?: string
): Promise<AutoReviewResult> {
  const startTime = Date.now();
  const findings: Finding[] = [];
  const ctx: ValidationContext = {};

  if (pfmeaId) {
    const [pfmeaData] = await db.select().from(pfmea).where(eq(pfmea.id, pfmeaId));
    if (pfmeaData) {
      const rows = await db.select().from(pfmeaRow).where(eq(pfmeaRow.pfmeaId, pfmeaId));
      ctx.pfmeaData = { ...pfmeaData, rows };

      const [pfdData] = await db.select().from(pfd).where(eq(pfd.partId, pfmeaData.partId)).orderBy(desc(pfd.createdAt));
      if (pfdData) {
        const steps = await db.select().from(pfdStep).where(eq(pfdStep.pfdId, pfdData.id));
        ctx.pfdData = { ...pfdData, steps };
      }
    }
  }

  if (controlPlanId) {
    const [cpData] = await db.select().from(controlPlan).where(eq(controlPlan.id, controlPlanId));
    if (cpData) {
      const rows = await db.select().from(controlPlanRow).where(eq(controlPlanRow.controlPlanId, controlPlanId));
      ctx.controlPlanData = { ...cpData, rows };
    }
  }

  for (const rule of VALIDATION_RULES) {
    try {
      rule(ctx, findings);
    } catch (err) {
      console.error('Validation rule error:', err);
    }
  }

  const errorCount = findings.filter(f => f.level === 'error').length;
  const warningCount = findings.filter(f => f.level === 'warning').length;
  const infoCount = findings.filter(f => f.level === 'info').length;
  const durationMs = Date.now() - startTime;

  const [run] = await db.insert(autoReviewRun).values({
    pfmeaId,
    controlPlanId,
    totalFindings: findings.length,
    errorCount,
    warningCount,
    infoCount,
    passedValidation: errorCount === 0,
    runBy,
    durationMs,
    rulesetVersion: '1.0.0'
  }).returning();

  if (findings.length > 0) {
    await db.insert(autoReviewFinding).values(
      findings.map(f => ({
        reviewRunId: run.id,
        level: f.level,
        category: f.category,
        ruleId: f.ruleId,
        message: f.message,
        entityType: f.entityType,
        entityId: f.entityId,
        details: f.details || {}
      }))
    );
  }

  if (pfmeaId) {
    await db.update(pfmea)
      .set({ lastAutoReviewId: run.id, lastAutoReviewAt: new Date() })
      .where(eq(pfmea.id, pfmeaId));
  }

  if (controlPlanId) {
    await db.update(controlPlan)
      .set({ lastAutoReviewId: run.id, lastAutoReviewAt: new Date() })
      .where(eq(controlPlan.id, controlPlanId));
  }

  return {
    runId: run.id,
    pfmeaId,
    controlPlanId,
    passedValidation: errorCount === 0,
    totalFindings: findings.length,
    errorCount,
    warningCount,
    infoCount,
    findings,
    durationMs
  };
}

export async function getAutoReviewHistory(
  pfmeaId?: string,
  controlPlanId?: string,
  limit: number = 10
): Promise<AutoReviewRun[]> {
  const conditions = [];
  if (pfmeaId) conditions.push(eq(autoReviewRun.pfmeaId, pfmeaId));
  if (controlPlanId) conditions.push(eq(autoReviewRun.controlPlanId, controlPlanId));
  if (conditions.length === 0) return [];

  const runs = await db.select().from(autoReviewRun)
    .where(conditions.length === 1 ? conditions[0] : and(...conditions))
    .orderBy(desc(autoReviewRun.runAt))
    .limit(limit);

  return runs;
}

export async function getAutoReviewRun(runId: string): Promise<(AutoReviewRun & { findings: AutoReviewFinding[] }) | null> {
  const [run] = await db.select().from(autoReviewRun).where(eq(autoReviewRun.id, runId));
  if (!run) return null;

  const findings = await db.select().from(autoReviewFinding).where(eq(autoReviewFinding.reviewRunId, runId));
  return { ...run, findings };
}

export async function resolveFinding(
  findingId: string,
  resolution: string,
  resolvedBy?: string
): Promise<AutoReviewFinding | null> {
  const [updated] = await db.update(autoReviewFinding)
    .set({
      resolved: true,
      resolution,
      resolvedBy,
      resolvedAt: new Date()
    })
    .where(eq(autoReviewFinding.id, findingId))
    .returning();
  return updated || null;
}

export async function waiveFinding(
  findingId: string,
  waiverReason: string
): Promise<AutoReviewFinding | null> {
  const [updated] = await db.update(autoReviewFinding)
    .set({
      waived: true,
      waiverReason
    })
    .where(eq(autoReviewFinding.id, findingId))
    .returning();
  return updated || null;
}
