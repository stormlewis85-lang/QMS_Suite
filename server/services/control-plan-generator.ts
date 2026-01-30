import { db } from '../db';
import { controlPlan, controlPlanRow, pfmeaRow, controlTemplateRow, fmeaTemplateRow, part, pfmea } from '@shared/schema';
import { eq, inArray } from 'drizzle-orm';

interface GenerateControlPlanInput {
  partId: string;
  pfmeaId: string;
  type?: 'Pre-Launch' | 'Production';
  rev?: string;
}

interface GenerateControlPlanResult {
  controlPlan: typeof controlPlan.$inferSelect;
  rows: (typeof controlPlanRow.$inferSelect)[];
  summary: {
    totalRows: number;
    specialCharacteristics: number;
    linkedToPfmea: number;
  };
}

export async function generateControlPlan(input: GenerateControlPlanInput): Promise<GenerateControlPlanResult> {
  try {
    const existingPart = await db.select().from(part).where(eq(part.id, input.partId)).limit(1);
    if (existingPart.length === 0) {
      throw new Error('Part not found');
    }

    const existingPfmea = await db.select().from(pfmea).where(eq(pfmea.id, input.pfmeaId)).limit(1);
    if (existingPfmea.length === 0) {
      throw new Error('PFMEA not found');
    }
    if (existingPfmea[0].partId !== input.partId) {
      throw new Error('PFMEA does not belong to this part');
    }

    const pfmeaRows = await db.select().from(pfmeaRow).where(eq(pfmeaRow.pfmeaId, input.pfmeaId));

    const templateRowIds = pfmeaRows
      .filter(row => row.parentTemplateRowId !== null)
      .map(row => row.parentTemplateRowId as string);

    if (templateRowIds.length === 0) {
      throw new Error('No PFMEA rows with linked templates found. Ensure PFMEA was generated from templates.');
    }

    const controlTemplates = await db.select()
      .from(controlTemplateRow)
      .where(inArray(controlTemplateRow.sourceTemplateRowId, templateRowIds));

    if (controlTemplates.length === 0) {
      throw new Error('No Control Plan templates found for this PFMEA. Ensure FMEA template rows have linked control templates.');
    }

    const pfmeaRowByTemplateId = new Map<string, typeof pfmeaRow.$inferSelect>();
    for (const row of pfmeaRows) {
      if (row.parentTemplateRowId) {
        pfmeaRowByTemplateId.set(row.parentTemplateRowId, row);
      }
    }

    return await db.transaction(async (tx) => {
      const [newControlPlan] = await tx.insert(controlPlan).values({
        partId: input.partId,
        rev: input.rev || '1.0.0',
        status: 'draft',
        type: input.type || 'Production',
        docNo: null,
        approvedBy: null,
        approvedAt: null,
        effectiveFrom: null,
        supersedesId: null,
      }).returning();

      const createdRows: (typeof controlPlanRow.$inferSelect)[] = [];
      let rowSeq = 1;

      for (const template of controlTemplates) {
        const matchingPfmeaRow = template.sourceTemplateRowId 
          ? pfmeaRowByTemplateId.get(template.sourceTemplateRowId)
          : undefined;

        const [newRow] = await tx.insert(controlPlanRow).values({
          controlPlanId: newControlPlan.id,
          sourcePfmeaRowId: matchingPfmeaRow?.id || null,
          parentControlTemplateRowId: template.id,
          rowSeq: rowSeq++,
          processNo: matchingPfmeaRow?.processNo || null,
          processName: matchingPfmeaRow?.processStep || null,
          charId: template.charId,
          characteristicName: template.characteristicName,
          type: template.type,
          classColumn: template.classColumn,
          specification: template.specification,
          target: template.target,
          tolerance: template.tolerance,
          specialFlag: template.specialFlag,
          csrSymbol: template.csrSymbol,
          measurementSystem: template.measurementSystem,
          gageDetails: template.gageDetails,
          sampleSize: template.defaultSampleSize,
          frequency: template.defaultFrequency,
          controlMethod: template.controlMethod,
          acceptanceCriteria: template.acceptanceCriteria,
          reactionPlan: template.reactionPlan,
          responsibility: template.defaultResponsibility,
          overrideFlags: {},
        }).returning();

        createdRows.push(newRow);
      }

      const summary = {
        totalRows: createdRows.length,
        specialCharacteristics: createdRows.filter(r => r.specialFlag === true).length,
        linkedToPfmea: createdRows.filter(r => r.sourcePfmeaRowId !== null).length,
      };

      return {
        controlPlan: newControlPlan,
        rows: createdRows,
        summary,
      };
    });
  } catch (error) {
    throw error;
  }
}
