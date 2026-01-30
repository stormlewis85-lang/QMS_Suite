/**
 * PFMEA Generator Service
 * 
 * Generates part-specific PFMEA documents from process templates.
 * Uses AIAG-VDA 2019 Action Priority calculation.
 */

import { db } from '../db';
import { pfmea, pfmeaRow, fmeaTemplateRow, processStep, part } from '@shared/schema';
import { calculateAP } from './ap-calculator';
import { eq, inArray } from 'drizzle-orm';

export interface GeneratePFMEAInput {
  partId: string;
  processDefIds: string[];
  rev?: string;
}

export interface GeneratePFMEAResult {
  pfmea: typeof pfmea.$inferSelect;
  rows: (typeof pfmeaRow.$inferSelect)[];
  summary: {
    totalRows: number;
    highAP: number;
    mediumAP: number;
    lowAP: number;
  };
}

/**
 * Generate a PFMEA for a part based on selected process definitions
 */
export async function generatePFMEA(input: GeneratePFMEAInput): Promise<GeneratePFMEAResult> {
  const { partId, processDefIds, rev } = input;

  // 1. Validate partId exists
  const [existingPart] = await db
    .select()
    .from(part)
    .where(eq(part.id, partId))
    .limit(1);

  if (!existingPart) {
    throw new Error(`Part not found: ${partId}`);
  }

  // 2. Fetch all fmea_template_rows for the selected processes, joined with process_steps
  const templateRows = await db
    .select({
      template: fmeaTemplateRow,
      step: processStep,
    })
    .from(fmeaTemplateRow)
    .innerJoin(processStep, eq(fmeaTemplateRow.stepId, processStep.id))
    .where(inArray(fmeaTemplateRow.processDefId, processDefIds));

  // 3. Validate we have template rows
  if (templateRows.length === 0) {
    throw new Error('No FMEA templates found for selected processes');
  }

  // 4. Use transaction for atomicity
  const result = await db.transaction(async (tx) => {
    // 4a. Insert PFMEA header
    const [newPfmea] = await tx
      .insert(pfmea)
      .values({
        partId,
        rev: rev || '1.0.0',
        status: 'draft',
        basis: 'AIAG-VDA 2019',
      })
      .returning();

    // 4b. Insert PFMEA rows
    const rowsToInsert = templateRows.map(({ template, step }) => {
      const apResult = calculateAP({
        severity: template.severity,
        occurrence: template.occurrence,
        detection: template.detection,
      });

      return {
        pfmeaId: newPfmea.id,
        parentTemplateRowId: template.id,
        stepRef: step.name,
        function: template.function,
        requirement: template.requirement,
        failureMode: template.failureMode,
        effect: template.effect,
        severity: template.severity,
        cause: template.cause,
        occurrence: template.occurrence,
        preventionControls: template.preventionControls || [],
        detectionControls: template.detectionControls || [],
        detection: template.detection,
        ap: apResult.priority,
        specialFlag: template.specialFlag || false,
        csrSymbol: template.csrSymbol || null,
        notes: null,
        overrideFlags: {},
      };
    });

    const insertedRows = await tx
      .insert(pfmeaRow)
      .values(rowsToInsert)
      .returning();

    return { newPfmea, insertedRows };
  });

  // 5. Calculate summary
  const summary = {
    totalRows: result.insertedRows.length,
    highAP: result.insertedRows.filter(r => r.ap === 'H').length,
    mediumAP: result.insertedRows.filter(r => r.ap === 'M').length,
    lowAP: result.insertedRows.filter(r => r.ap === 'L').length,
  };

  return {
    pfmea: result.newPfmea,
    rows: result.insertedRows,
    summary,
  };
}

export default { generatePFMEA };
