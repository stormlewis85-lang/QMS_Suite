// Referenced from javascript_database blueprint
import {
  part,
  processDef,
  processStep,
  fmeaTemplateRow,
  controlTemplateRow,
  pfmea,
  pfmeaRow,
  controlPlan,
  controlPlanRow,
  partProcessMap,
  equipmentLibrary,
  equipmentErrorProofing,
  equipmentControlMethods,
  failureModesLibrary,
  fmeaTemplateCatalogLink,
  controlsLibrary,
  controlPairings,
  type Part,
  type InsertPart,
  type ProcessDef,
  type InsertProcessDef,
  type ProcessStep,
  type InsertProcessStep,
  type FmeaTemplateRow,
  type InsertFmeaTemplateRow,
  type ControlTemplateRow,
  type InsertControlTemplateRow,
  type PFMEA,
  type InsertPFMEA,
  type PFMEARow,
  type InsertPFMEARow,
  type ControlPlan,
  type InsertControlPlan,
  type ControlPlanRow,
  type InsertControlPlanRow,
  type PartProcessMap,
  type InsertPartProcessMap,
  type EquipmentLibrary,
  type InsertEquipmentLibrary,
  type EquipmentErrorProofing,
  type InsertEquipmentErrorProofing,
  type EquipmentControlMethods,
  type InsertEquipmentControlMethods,
  type FailureModesLibrary,
  type InsertFailureModesLibrary,
  type FmeaTemplateCatalogLink,
  type InsertFmeaTemplateCatalogLink,
  type FailureModeCategory,
  type ControlsLibrary,
  type InsertControlsLibrary,
  type ControlPairings,
  type InsertControlPairings,
  type ControlType,
  type ControlEffectiveness,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, ilike, and, or, sql, inArray } from "drizzle-orm";

export interface IStorage {
  // Parts
  getAllParts(): Promise<Part[]>;
  getPartById(id: string): Promise<Part | undefined>;
  createPart(insertPart: InsertPart): Promise<Part>;
  updatePart(id: string, updates: Partial<InsertPart>): Promise<Part | undefined>;
  deletePart(id: string): Promise<boolean>;
  
  // Part Process Mapping
  getPartProcessMapsByPartId(partId: string): Promise<PartProcessMap[]>;
  getPartProcessMapById(id: string): Promise<PartProcessMap | undefined>;
  createPartProcessMap(insertMap: InsertPartProcessMap): Promise<PartProcessMap>;
  updatePartProcessMap(id: string, updates: Partial<InsertPartProcessMap>): Promise<PartProcessMap | undefined>;
  deletePartProcessMap(id: string): Promise<boolean>;
  resequencePartProcessMaps(partId: string): Promise<void>;
  getPartWithProcessMaps(partId: string): Promise<(Part & { processMaps: (PartProcessMap & { process: ProcessDef & { steps: ProcessStep[] } })[] }) | undefined>;
  
  // Processes
  getAllProcesses(): Promise<ProcessDef[]>;
  getProcessById(id: string): Promise<ProcessDef | undefined>;
  getProcessWithSteps(id: string): Promise<(ProcessDef & { steps: ProcessStep[] }) | undefined>;
  createProcess(insertProcess: InsertProcessDef): Promise<ProcessDef>;
  createProcessWithSteps(insertProcess: InsertProcessDef, steps: InsertProcessStep[]): Promise<ProcessDef & { steps: ProcessStep[] }>;
  updateProcess(id: string, updates: Partial<InsertProcessDef>): Promise<ProcessDef | undefined>;
  deleteProcess(id: string): Promise<boolean>;
  
  // Process Steps
  createProcessStep(step: InsertProcessStep): Promise<ProcessStep>;
  updateProcessStep(id: string, updates: Partial<InsertProcessStep>): Promise<ProcessStep | undefined>;
  deleteProcessStep(id: string): Promise<boolean>;
  getStepsByProcessId(processDefId: string): Promise<ProcessStep[]>;
  getChildSteps(parentStepId: string): Promise<ProcessStep[]>;
  resequenceSteps(processDefId: string): Promise<void>;
  
  // FMEA Template Rows
  getFmeaTemplateRowsByProcessId(processDefId: string): Promise<FmeaTemplateRow[]>;
  getFmeaTemplateRowById(id: string): Promise<FmeaTemplateRow | undefined>;
  getFmeaTemplateRowsByStepId(stepId: string): Promise<FmeaTemplateRow[]>;
  createFmeaTemplateRow(insertRow: InsertFmeaTemplateRow): Promise<FmeaTemplateRow>;
  updateFmeaTemplateRow(id: string, updates: Partial<InsertFmeaTemplateRow>): Promise<FmeaTemplateRow | undefined>;
  deleteFmeaTemplateRow(id: string): Promise<boolean>;
  duplicateFmeaTemplateRow(id: string): Promise<FmeaTemplateRow | undefined>;
  
  // Control Template Rows
  getControlTemplateRowsByProcessId(processDefId: string): Promise<ControlTemplateRow[]>;
  getControlTemplateRowById(id: string): Promise<ControlTemplateRow | undefined>;
  getControlTemplateRowsBySourceRowId(sourceTemplateRowId: string): Promise<ControlTemplateRow[]>;
  createControlTemplateRow(insertRow: InsertControlTemplateRow): Promise<ControlTemplateRow>;
  updateControlTemplateRow(id: string, updates: Partial<InsertControlTemplateRow>): Promise<ControlTemplateRow | undefined>;
  deleteControlTemplateRow(id: string): Promise<boolean>;
  duplicateControlTemplateRow(id: string): Promise<ControlTemplateRow | undefined>;
  
  // PFMEA
  getPFMEAsByPartId(partId: string): Promise<PFMEA[]>;
  getPFMEAById(id: string): Promise<(PFMEA & { rows: PFMEARow[] }) | undefined>;
  getPFMEAWithDetails(id: string): Promise<(PFMEA & { rows: PFMEARow[]; part: Part }) | undefined>;
  createPFMEA(insertPFMEA: InsertPFMEA): Promise<PFMEA>;
  updatePFMEA(id: string, updates: Partial<InsertPFMEA>): Promise<PFMEA | undefined>;
  deletePFMEA(id: string): Promise<boolean>;
  createPFMEARow(insertRow: InsertPFMEARow): Promise<PFMEARow>;
  createPFMEARows(rows: InsertPFMEARow[]): Promise<PFMEARow[]>;
  updatePFMEARow(id: string, updates: Partial<InsertPFMEARow>): Promise<PFMEARow | undefined>;
  deletePFMEARow(id: string): Promise<boolean>;
  getPFMEARowById(id: string): Promise<PFMEARow | undefined>;
  
  // FMEA Template Rows by multiple processes (for PFMEA generation)
  getFmeaTemplateRowsByProcessIds(processDefIds: string[]): Promise<FmeaTemplateRow[]>;
  
  // Control Plans
  getControlPlansByPartId(partId: string): Promise<ControlPlan[]>;
  getControlPlanById(id: string): Promise<(ControlPlan & { rows: ControlPlanRow[] }) | undefined>;
  getControlPlanWithDetails(id: string): Promise<(ControlPlan & { rows: ControlPlanRow[]; part: Part }) | undefined>;
  createControlPlan(insertControlPlan: InsertControlPlan): Promise<ControlPlan>;
  updateControlPlan(id: string, updates: Partial<InsertControlPlan>): Promise<ControlPlan | undefined>;
  deleteControlPlan(id: string): Promise<boolean>;
  createControlPlanRow(insertRow: InsertControlPlanRow): Promise<ControlPlanRow>;
  createControlPlanRows(rows: InsertControlPlanRow[]): Promise<ControlPlanRow[]>;
  updateControlPlanRow(id: string, updates: Partial<InsertControlPlanRow>): Promise<ControlPlanRow | undefined>;
  deleteControlPlanRow(id: string): Promise<boolean>;
  getControlPlanRowById(id: string): Promise<ControlPlanRow | undefined>;
  
  // Control Template Rows by multiple processes (for Control Plan generation)
  getControlTemplateRowsByProcessIds(processDefIds: string[]): Promise<ControlTemplateRow[]>;
  
  // Equipment Library
  getAllEquipment(): Promise<EquipmentLibrary[]>;
  getEquipmentById(id: string): Promise<(EquipmentLibrary & { errorProofingControls: EquipmentErrorProofing[]; controlMethods: EquipmentControlMethods[] }) | undefined>;
  createEquipment(insertEquipment: InsertEquipmentLibrary): Promise<EquipmentLibrary>;
  updateEquipment(id: string, updates: Partial<InsertEquipmentLibrary>): Promise<EquipmentLibrary | undefined>;
  deleteEquipment(id: string): Promise<boolean>;
  createErrorProofingControl(insertControl: InsertEquipmentErrorProofing): Promise<EquipmentErrorProofing>;
  updateErrorProofingControl(id: string, updates: Partial<InsertEquipmentErrorProofing>): Promise<EquipmentErrorProofing | undefined>;
  deleteErrorProofingControl(id: string): Promise<boolean>;
  createControlMethod(insertMethod: InsertEquipmentControlMethods): Promise<EquipmentControlMethods>;
  updateControlMethod(id: string, updates: Partial<InsertEquipmentControlMethods>): Promise<EquipmentControlMethods | undefined>;
  deleteControlMethod(id: string): Promise<boolean>;
  
  // Failure Modes Library
  getAllFailureModes(filters?: { category?: FailureModeCategory; search?: string; status?: string }): Promise<FailureModesLibrary[]>;
  getFailureModeById(id: string): Promise<FailureModesLibrary | undefined>;
  createFailureMode(insertFailureMode: InsertFailureModesLibrary): Promise<FailureModesLibrary>;
  updateFailureMode(id: string, updates: Partial<InsertFailureModesLibrary>): Promise<FailureModesLibrary | undefined>;
  deleteFailureMode(id: string): Promise<boolean>;
  updateFailureModeLastUsed(id: string): Promise<void>;
  
  // Catalog Links
  createCatalogLink(insertLink: InsertFmeaTemplateCatalogLink): Promise<FmeaTemplateCatalogLink>;
  getCatalogLinksByTemplateRowId(templateRowId: string): Promise<FmeaTemplateCatalogLink[]>;
  getCatalogLinksByCatalogItemId(catalogItemId: string): Promise<FmeaTemplateCatalogLink[]>;
  
  // Controls Library
  getAllControls(filters?: { type?: ControlType; effectiveness?: ControlEffectiveness; search?: string; status?: string }): Promise<ControlsLibrary[]>;
  getControlById(id: string): Promise<ControlsLibrary | undefined>;
  createControl(insertControl: InsertControlsLibrary): Promise<ControlsLibrary>;
  updateControl(id: string, updates: Partial<InsertControlsLibrary>): Promise<ControlsLibrary | undefined>;
  deleteControl(id: string): Promise<boolean>;
  updateControlLastUsed(id: string): Promise<void>;
  
  // Control Pairings
  getAllControlPairings(): Promise<ControlPairings[]>;
  getControlPairingsByFailureModeId(failureModeId: string): Promise<ControlPairings[]>;
  createControlPairing(insertPairing: InsertControlPairings): Promise<ControlPairings>;
  deleteControlPairing(id: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getAllParts(): Promise<Part[]> {
    return await db.select().from(part).orderBy(desc(part.partNumber));
  }

  async getPartById(id: string): Promise<Part | undefined> {
    const [result] = await db.select().from(part).where(eq(part.id, id));
    return result || undefined;
  }

  async createPart(insertPart: InsertPart): Promise<Part> {
    const [newPart] = await db.insert(part).values(insertPart).returning();
    return newPart;
  }

  async updatePart(id: string, updates: Partial<InsertPart>): Promise<Part | undefined> {
    const [updated] = await db.update(part)
      .set(updates)
      .where(eq(part.id, id))
      .returning();
    return updated || undefined;
  }

  async deletePart(id: string): Promise<boolean> {
    const result = await db.delete(part).where(eq(part.id, id)).returning();
    return result.length > 0;
  }

  // Part Process Mapping
  async getPartProcessMapsByPartId(partId: string): Promise<PartProcessMap[]> {
    return await db.select().from(partProcessMap)
      .where(eq(partProcessMap.partId, partId))
      .orderBy(partProcessMap.sequence);
  }

  async getPartProcessMapById(id: string): Promise<PartProcessMap | undefined> {
    const [result] = await db.select().from(partProcessMap).where(eq(partProcessMap.id, id));
    return result || undefined;
  }

  async createPartProcessMap(insertMap: InsertPartProcessMap): Promise<PartProcessMap> {
    const [newMap] = await db.insert(partProcessMap).values(insertMap).returning();
    return newMap;
  }

  async updatePartProcessMap(id: string, updates: Partial<InsertPartProcessMap>): Promise<PartProcessMap | undefined> {
    const [updated] = await db.update(partProcessMap)
      .set(updates)
      .where(eq(partProcessMap.id, id))
      .returning();
    return updated || undefined;
  }

  async deletePartProcessMap(id: string): Promise<boolean> {
    const result = await db.delete(partProcessMap).where(eq(partProcessMap.id, id)).returning();
    return result.length > 0;
  }

  async resequencePartProcessMaps(partId: string): Promise<void> {
    const maps = await this.getPartProcessMapsByPartId(partId);
    for (let i = 0; i < maps.length; i++) {
      await db.update(partProcessMap)
        .set({ sequence: (i + 1) * 10 })
        .where(eq(partProcessMap.id, maps[i].id));
    }
  }

  async getPartWithProcessMaps(partId: string): Promise<(Part & { processMaps: (PartProcessMap & { process: ProcessDef & { steps: ProcessStep[] } })[] }) | undefined> {
    const partData = await this.getPartById(partId);
    if (!partData) return undefined;

    const maps = await this.getPartProcessMapsByPartId(partId);
    const enrichedMaps = await Promise.all(
      maps.map(async (map) => {
        const process = await this.getProcessWithSteps(map.processDefId);
        return {
          ...map,
          process: process!,
        };
      })
    );

    return {
      ...partData,
      processMaps: enrichedMaps.filter(m => m.process),
    };
  }

  async getAllProcesses(): Promise<ProcessDef[]> {
    return await db.select().from(processDef).orderBy(desc(processDef.createdAt));
  }

  async getProcessById(id: string): Promise<ProcessDef | undefined> {
    const [result] = await db.select().from(processDef).where(eq(processDef.id, id));
    return result || undefined;
  }

  async getProcessWithSteps(id: string): Promise<(ProcessDef & { steps: ProcessStep[] }) | undefined> {
    const process = await this.getProcessById(id);
    if (!process) return undefined;
    
    const steps = await db.select().from(processStep)
      .where(eq(processStep.processDefId, id))
      .orderBy(processStep.seq);
    
    return { ...process, steps };
  }

  async createProcess(insertProcess: InsertProcessDef): Promise<ProcessDef> {
    const [newProcess] = await db.insert(processDef).values(insertProcess).returning();
    return newProcess;
  }

  async createProcessWithSteps(
    insertProcess: InsertProcessDef, 
    steps: InsertProcessStep[]
  ): Promise<ProcessDef & { steps: ProcessStep[] }> {
    const [newProcess] = await db.insert(processDef).values(insertProcess).returning();
    
    if (steps.length > 0) {
      const stepsWithProcessId = steps.map(step => ({
        ...step,
        processDefId: newProcess.id,
      }));
      const insertedSteps = await db.insert(processStep).values(stepsWithProcessId).returning();
      return { ...newProcess, steps: insertedSteps };
    }
    
    return { ...newProcess, steps: [] };
  }

  async updateProcess(id: string, updates: Partial<InsertProcessDef>): Promise<ProcessDef | undefined> {
    const [updatedProcess] = await db.update(processDef)
      .set(updates)
      .where(eq(processDef.id, id))
      .returning();
    return updatedProcess || undefined;
  }

  async deleteProcess(id: string): Promise<boolean> {
    const result = await db.delete(processDef)
      .where(eq(processDef.id, id));
    return true;
  }

  async createProcessStep(step: InsertProcessStep): Promise<ProcessStep> {
    const [newStep] = await db.insert(processStep).values(step).returning();
    return newStep;
  }

  async updateProcessStep(id: string, updates: Partial<InsertProcessStep>): Promise<ProcessStep | undefined> {
    const [updatedStep] = await db.update(processStep)
      .set(updates)
      .where(eq(processStep.id, id))
      .returning();
    return updatedStep || undefined;
  }

  async deleteProcessStep(id: string): Promise<boolean> {
    const result = await db.delete(processStep)
      .where(eq(processStep.id, id));
    return true;
  }

  async getStepsByProcessId(processDefId: string): Promise<ProcessStep[]> {
    return await db.select().from(processStep)
      .where(eq(processStep.processDefId, processDefId))
      .orderBy(processStep.seq);
  }

  async getChildSteps(parentStepId: string): Promise<ProcessStep[]> {
    return await db.select().from(processStep)
      .where(eq(processStep.parentStepId, parentStepId))
      .orderBy(processStep.seq);
  }

  async resequenceSteps(processDefId: string): Promise<void> {
    const steps = await this.getStepsByProcessId(processDefId);
    
    for (let i = 0; i < steps.length; i++) {
      const newSeq = (i + 1) * 10;
      if (steps[i].seq !== newSeq) {
        await db.update(processStep)
          .set({ seq: newSeq })
          .where(eq(processStep.id, steps[i].id));
      }
    }
  }

  // FMEA Template Rows
  async getFmeaTemplateRowsByProcessId(processDefId: string): Promise<FmeaTemplateRow[]> {
    return await db.select().from(fmeaTemplateRow)
      .where(eq(fmeaTemplateRow.processDefId, processDefId))
      .orderBy(fmeaTemplateRow.stepId);
  }

  async getFmeaTemplateRowById(id: string): Promise<FmeaTemplateRow | undefined> {
    const [result] = await db.select().from(fmeaTemplateRow).where(eq(fmeaTemplateRow.id, id));
    return result || undefined;
  }

  async getFmeaTemplateRowsByStepId(stepId: string): Promise<FmeaTemplateRow[]> {
    return await db.select().from(fmeaTemplateRow)
      .where(eq(fmeaTemplateRow.stepId, stepId));
  }

  async createFmeaTemplateRow(insertRow: InsertFmeaTemplateRow): Promise<FmeaTemplateRow> {
    const [newRow] = await db.insert(fmeaTemplateRow).values(insertRow).returning();
    return newRow;
  }

  async updateFmeaTemplateRow(id: string, updates: Partial<InsertFmeaTemplateRow>): Promise<FmeaTemplateRow | undefined> {
    const [updatedRow] = await db.update(fmeaTemplateRow)
      .set(updates)
      .where(eq(fmeaTemplateRow.id, id))
      .returning();
    return updatedRow || undefined;
  }

  async deleteFmeaTemplateRow(id: string): Promise<boolean> {
    const result = await db.delete(fmeaTemplateRow).where(eq(fmeaTemplateRow.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async duplicateFmeaTemplateRow(id: string): Promise<FmeaTemplateRow | undefined> {
    const original = await this.getFmeaTemplateRowById(id);
    if (!original) return undefined;

    const { id: _, ...rowData } = original;
    const duplicate = {
      ...rowData,
      failureMode: `${rowData.failureMode} (Copy)`,
    };
    
    return await this.createFmeaTemplateRow(duplicate);
  }

  // Control Template Rows
  async getControlTemplateRowsByProcessId(processDefId: string): Promise<ControlTemplateRow[]> {
    return await db.select().from(controlTemplateRow)
      .where(eq(controlTemplateRow.processDefId, processDefId))
      .orderBy(controlTemplateRow.charId);
  }

  async getControlTemplateRowById(id: string): Promise<ControlTemplateRow | undefined> {
    const [result] = await db.select().from(controlTemplateRow).where(eq(controlTemplateRow.id, id));
    return result || undefined;
  }

  async getControlTemplateRowsBySourceRowId(sourceTemplateRowId: string): Promise<ControlTemplateRow[]> {
    return await db.select().from(controlTemplateRow)
      .where(eq(controlTemplateRow.sourceTemplateRowId, sourceTemplateRowId));
  }

  async createControlTemplateRow(insertRow: InsertControlTemplateRow): Promise<ControlTemplateRow> {
    const [newRow] = await db.insert(controlTemplateRow).values(insertRow).returning();
    return newRow;
  }

  async updateControlTemplateRow(id: string, updates: Partial<InsertControlTemplateRow>): Promise<ControlTemplateRow | undefined> {
    const [updatedRow] = await db.update(controlTemplateRow)
      .set(updates)
      .where(eq(controlTemplateRow.id, id))
      .returning();
    return updatedRow || undefined;
  }

  async deleteControlTemplateRow(id: string): Promise<boolean> {
    const result = await db.delete(controlTemplateRow).where(eq(controlTemplateRow.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async duplicateControlTemplateRow(id: string): Promise<ControlTemplateRow | undefined> {
    const original = await this.getControlTemplateRowById(id);
    if (!original) return undefined;

    const { id: _, ...rowData } = original;
    // Generate new char ID
    const prefix = "C";
    const num = Math.floor(Math.random() * 9000) + 1000;
    const newCharId = `${prefix}-${num}`;
    
    const duplicate = {
      ...rowData,
      charId: newCharId,
      characteristicName: `${rowData.characteristicName} (Copy)`,
    };
    
    return await this.createControlTemplateRow(duplicate);
  }

  // PFMEA
  async getPFMEAsByPartId(partId: string): Promise<PFMEA[]> {
    return await db.select().from(pfmea)
      .where(eq(pfmea.partId, partId))
      .orderBy(desc(pfmea.rev));
  }

  async getPFMEAById(id: string): Promise<(PFMEA & { rows: PFMEARow[] }) | undefined> {
    const [pfmeaDoc] = await db.select().from(pfmea).where(eq(pfmea.id, id));
    if (!pfmeaDoc) return undefined;

    const rows = await db.select().from(pfmeaRow).where(eq(pfmeaRow.pfmeaId, id));
    return { ...pfmeaDoc, rows };
  }

  async createPFMEA(insertPFMEA: InsertPFMEA): Promise<PFMEA> {
    const [newPFMEA] = await db.insert(pfmea).values(insertPFMEA).returning();
    return newPFMEA;
  }

  async createPFMEARow(insertRow: InsertPFMEARow): Promise<PFMEARow> {
    const [newRow] = await db.insert(pfmeaRow).values(insertRow).returning();
    return newRow;
  }

  async updatePFMEARow(id: string, updates: Partial<InsertPFMEARow>): Promise<PFMEARow | undefined> {
    const [updatedRow] = await db.update(pfmeaRow)
      .set(updates)
      .where(eq(pfmeaRow.id, id))
      .returning();
    return updatedRow || undefined;
  }

  async getPFMEAWithDetails(id: string): Promise<(PFMEA & { rows: PFMEARow[]; part: Part }) | undefined> {
    const [pfmeaDoc] = await db.select().from(pfmea).where(eq(pfmea.id, id));
    if (!pfmeaDoc) return undefined;

    const [partDoc] = await db.select().from(part).where(eq(part.id, pfmeaDoc.partId));
    if (!partDoc) return undefined;

    const rows = await db.select().from(pfmeaRow).where(eq(pfmeaRow.pfmeaId, id));
    return { ...pfmeaDoc, rows, part: partDoc };
  }

  async updatePFMEA(id: string, updates: Partial<InsertPFMEA>): Promise<PFMEA | undefined> {
    const [updated] = await db.update(pfmea)
      .set(updates)
      .where(eq(pfmea.id, id))
      .returning();
    return updated || undefined;
  }

  async deletePFMEA(id: string): Promise<boolean> {
    const result = await db.delete(pfmea).where(eq(pfmea.id, id)).returning();
    return result.length > 0;
  }

  async createPFMEARows(rows: InsertPFMEARow[]): Promise<PFMEARow[]> {
    if (rows.length === 0) return [];
    const newRows = await db.insert(pfmeaRow).values(rows).returning();
    return newRows;
  }

  async deletePFMEARow(id: string): Promise<boolean> {
    const result = await db.delete(pfmeaRow).where(eq(pfmeaRow.id, id)).returning();
    return result.length > 0;
  }

  async getPFMEARowById(id: string): Promise<PFMEARow | undefined> {
    const [row] = await db.select().from(pfmeaRow).where(eq(pfmeaRow.id, id));
    return row || undefined;
  }

  async getFmeaTemplateRowsByProcessIds(processDefIds: string[]): Promise<FmeaTemplateRow[]> {
    if (processDefIds.length === 0) return [];
    return await db.select().from(fmeaTemplateRow)
      .where(inArray(fmeaTemplateRow.processDefId, processDefIds))
      .orderBy(fmeaTemplateRow.processDefId);
  }

  // Control Plans
  async getControlPlansByPartId(partId: string): Promise<ControlPlan[]> {
    return await db.select().from(controlPlan)
      .where(eq(controlPlan.partId, partId))
      .orderBy(desc(controlPlan.rev));
  }

  async getControlPlanById(id: string): Promise<(ControlPlan & { rows: ControlPlanRow[] }) | undefined> {
    const [cpDoc] = await db.select().from(controlPlan).where(eq(controlPlan.id, id));
    if (!cpDoc) return undefined;

    const rows = await db.select().from(controlPlanRow).where(eq(controlPlanRow.controlPlanId, id));
    return { ...cpDoc, rows };
  }

  async createControlPlan(insertControlPlan: InsertControlPlan): Promise<ControlPlan> {
    const [newCP] = await db.insert(controlPlan).values(insertControlPlan).returning();
    return newCP;
  }

  async createControlPlanRow(insertRow: InsertControlPlanRow): Promise<ControlPlanRow> {
    const [newRow] = await db.insert(controlPlanRow).values(insertRow).returning();
    return newRow;
  }

  async updateControlPlanRow(id: string, updates: Partial<InsertControlPlanRow>): Promise<ControlPlanRow | undefined> {
    const [updatedRow] = await db.update(controlPlanRow)
      .set(updates)
      .where(eq(controlPlanRow.id, id))
      .returning();
    return updatedRow || undefined;
  }

  async getControlPlanWithDetails(id: string): Promise<(ControlPlan & { rows: ControlPlanRow[]; part: Part }) | undefined> {
    const [cpDoc] = await db.select().from(controlPlan).where(eq(controlPlan.id, id));
    if (!cpDoc) return undefined;

    const [partDoc] = await db.select().from(part).where(eq(part.id, cpDoc.partId));
    if (!partDoc) return undefined;

    const rows = await db.select().from(controlPlanRow).where(eq(controlPlanRow.controlPlanId, id));
    return { ...cpDoc, rows, part: partDoc };
  }

  async updateControlPlan(id: string, updates: Partial<InsertControlPlan>): Promise<ControlPlan | undefined> {
    const [updated] = await db.update(controlPlan)
      .set(updates)
      .where(eq(controlPlan.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteControlPlan(id: string): Promise<boolean> {
    const result = await db.delete(controlPlan).where(eq(controlPlan.id, id)).returning();
    return result.length > 0;
  }

  async createControlPlanRows(rows: InsertControlPlanRow[]): Promise<ControlPlanRow[]> {
    if (rows.length === 0) return [];
    const newRows = await db.insert(controlPlanRow).values(rows).returning();
    return newRows;
  }

  async deleteControlPlanRow(id: string): Promise<boolean> {
    const result = await db.delete(controlPlanRow).where(eq(controlPlanRow.id, id)).returning();
    return result.length > 0;
  }

  async getControlPlanRowById(id: string): Promise<ControlPlanRow | undefined> {
    const [row] = await db.select().from(controlPlanRow).where(eq(controlPlanRow.id, id));
    return row || undefined;
  }

  async getControlTemplateRowsByProcessIds(processDefIds: string[]): Promise<ControlTemplateRow[]> {
    if (processDefIds.length === 0) return [];
    return await db.select().from(controlTemplateRow)
      .where(inArray(controlTemplateRow.processDefId, processDefIds))
      .orderBy(controlTemplateRow.processDefId);
  }

  // Equipment Library
  async getAllEquipment(): Promise<EquipmentLibrary[]> {
    return await db.select().from(equipmentLibrary)
      .orderBy(equipmentLibrary.type, equipmentLibrary.name);
  }

  async getEquipmentById(id: string): Promise<(EquipmentLibrary & { errorProofingControls: EquipmentErrorProofing[]; controlMethods: EquipmentControlMethods[] }) | undefined> {
    const [equipment] = await db.select().from(equipmentLibrary).where(eq(equipmentLibrary.id, id));
    if (!equipment) return undefined;

    const errorProofingControls = await db.select().from(equipmentErrorProofing)
      .where(eq(equipmentErrorProofing.equipmentId, id));

    const controlMethods = await db.select().from(equipmentControlMethods)
      .where(eq(equipmentControlMethods.equipmentId, id));

    return { ...equipment, errorProofingControls, controlMethods };
  }

  async createEquipment(insertEquipment: InsertEquipmentLibrary): Promise<EquipmentLibrary> {
    const [newEquipment] = await db.insert(equipmentLibrary).values(insertEquipment).returning();
    return newEquipment;
  }

  async updateEquipment(id: string, updates: Partial<InsertEquipmentLibrary>): Promise<EquipmentLibrary | undefined> {
    const [updatedEquipment] = await db.update(equipmentLibrary)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(equipmentLibrary.id, id))
      .returning();
    return updatedEquipment || undefined;
  }

  async deleteEquipment(id: string): Promise<boolean> {
    const result = await db.delete(equipmentLibrary).where(eq(equipmentLibrary.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async createErrorProofingControl(insertControl: InsertEquipmentErrorProofing): Promise<EquipmentErrorProofing> {
    const [newControl] = await db.insert(equipmentErrorProofing).values(insertControl).returning();
    return newControl;
  }

  async updateErrorProofingControl(id: string, updates: Partial<InsertEquipmentErrorProofing>): Promise<EquipmentErrorProofing | undefined> {
    const [updatedControl] = await db.update(equipmentErrorProofing)
      .set(updates)
      .where(eq(equipmentErrorProofing.id, id))
      .returning();
    return updatedControl || undefined;
  }

  async deleteErrorProofingControl(id: string): Promise<boolean> {
    const result = await db.delete(equipmentErrorProofing).where(eq(equipmentErrorProofing.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async createControlMethod(insertMethod: InsertEquipmentControlMethods): Promise<EquipmentControlMethods> {
    const [newMethod] = await db.insert(equipmentControlMethods).values(insertMethod).returning();
    return newMethod;
  }

  async updateControlMethod(id: string, updates: Partial<InsertEquipmentControlMethods>): Promise<EquipmentControlMethods | undefined> {
    const [updatedMethod] = await db.update(equipmentControlMethods)
      .set(updates)
      .where(eq(equipmentControlMethods.id, id))
      .returning();
    return updatedMethod || undefined;
  }

  async deleteControlMethod(id: string): Promise<boolean> {
    const result = await db.delete(equipmentControlMethods).where(eq(equipmentControlMethods.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Failure Modes Library
  async getAllFailureModes(filters?: { category?: FailureModeCategory; search?: string; status?: string }): Promise<FailureModesLibrary[]> {
    const conditions: any[] = [];
    
    if (filters?.category) {
      conditions.push(eq(failureModesLibrary.category, filters.category));
    }
    
    if (filters?.status) {
      conditions.push(eq(failureModesLibrary.status, filters.status));
    }
    
    if (filters?.search) {
      const searchTerm = `%${filters.search}%`;
      conditions.push(
        or(
          ilike(failureModesLibrary.name, searchTerm),
          ilike(failureModesLibrary.effect, searchTerm),
          ilike(failureModesLibrary.typicalCauses, searchTerm)
        )
      );
    }
    
    if (conditions.length > 0) {
      return await db.select().from(failureModesLibrary)
        .where(and(...conditions))
        .orderBy(failureModesLibrary.category, failureModesLibrary.name);
    }
    
    return await db.select().from(failureModesLibrary)
      .orderBy(failureModesLibrary.category, failureModesLibrary.name);
  }

  async getFailureModeById(id: string): Promise<FailureModesLibrary | undefined> {
    const [result] = await db.select().from(failureModesLibrary).where(eq(failureModesLibrary.id, id));
    return result || undefined;
  }

  async createFailureMode(insertFailureMode: InsertFailureModesLibrary): Promise<FailureModesLibrary> {
    const [newFailureMode] = await db.insert(failureModesLibrary).values(insertFailureMode).returning();
    return newFailureMode;
  }

  async updateFailureMode(id: string, updates: Partial<InsertFailureModesLibrary>): Promise<FailureModesLibrary | undefined> {
    const [updatedFailureMode] = await db.update(failureModesLibrary)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(failureModesLibrary.id, id))
      .returning();
    return updatedFailureMode || undefined;
  }

  async deleteFailureMode(id: string): Promise<boolean> {
    const result = await db.delete(failureModesLibrary).where(eq(failureModesLibrary.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async updateFailureModeLastUsed(id: string): Promise<void> {
    await db.update(failureModesLibrary)
      .set({ lastUsed: new Date() })
      .where(eq(failureModesLibrary.id, id));
  }

  // Catalog Links
  async createCatalogLink(insertLink: InsertFmeaTemplateCatalogLink): Promise<FmeaTemplateCatalogLink> {
    const [newLink] = await db.insert(fmeaTemplateCatalogLink).values(insertLink).returning();
    return newLink;
  }

  async getCatalogLinksByTemplateRowId(templateRowId: string): Promise<FmeaTemplateCatalogLink[]> {
    return await db.select().from(fmeaTemplateCatalogLink)
      .where(eq(fmeaTemplateCatalogLink.templateRowId, templateRowId));
  }

  async getCatalogLinksByCatalogItemId(catalogItemId: string): Promise<FmeaTemplateCatalogLink[]> {
    return await db.select().from(fmeaTemplateCatalogLink)
      .where(eq(fmeaTemplateCatalogLink.catalogItemId, catalogItemId));
  }

  // Controls Library
  async getAllControls(filters?: { type?: ControlType; effectiveness?: ControlEffectiveness; search?: string; status?: string }): Promise<ControlsLibrary[]> {
    const conditions: any[] = [];
    
    if (filters?.type) {
      conditions.push(eq(controlsLibrary.type, filters.type));
    }
    
    if (filters?.effectiveness) {
      conditions.push(eq(controlsLibrary.effectiveness, filters.effectiveness));
    }
    
    if (filters?.status) {
      conditions.push(eq(controlsLibrary.status, filters.status));
    }
    
    if (filters?.search) {
      const searchTerm = `%${filters.search}%`;
      conditions.push(
        or(
          ilike(controlsLibrary.name, searchTerm),
          ilike(controlsLibrary.description, searchTerm)
        )
      );
    }
    
    if (conditions.length > 0) {
      return await db.select().from(controlsLibrary)
        .where(and(...conditions))
        .orderBy(controlsLibrary.type, controlsLibrary.name);
    }
    
    return await db.select().from(controlsLibrary)
      .orderBy(controlsLibrary.type, controlsLibrary.name);
  }

  async getControlById(id: string): Promise<ControlsLibrary | undefined> {
    const [result] = await db.select().from(controlsLibrary).where(eq(controlsLibrary.id, id));
    return result || undefined;
  }

  async createControl(insertControl: InsertControlsLibrary): Promise<ControlsLibrary> {
    const [newControl] = await db.insert(controlsLibrary).values(insertControl).returning();
    return newControl;
  }

  async updateControl(id: string, updates: Partial<InsertControlsLibrary>): Promise<ControlsLibrary | undefined> {
    const [updatedControl] = await db.update(controlsLibrary)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(controlsLibrary.id, id))
      .returning();
    return updatedControl || undefined;
  }

  async deleteControl(id: string): Promise<boolean> {
    const result = await db.delete(controlsLibrary).where(eq(controlsLibrary.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async updateControlLastUsed(id: string): Promise<void> {
    await db.update(controlsLibrary)
      .set({ lastUsed: new Date() })
      .where(eq(controlsLibrary.id, id));
  }

  // Control Pairings
  async getAllControlPairings(): Promise<ControlPairings[]> {
    return await db.select().from(controlPairings).orderBy(controlPairings.createdAt);
  }

  async getControlPairingsByFailureModeId(failureModeId: string): Promise<ControlPairings[]> {
    return await db.select().from(controlPairings)
      .where(eq(controlPairings.failureModeId, failureModeId));
  }

  async createControlPairing(insertPairing: InsertControlPairings): Promise<ControlPairings> {
    const [newPairing] = await db.insert(controlPairings).values(insertPairing).returning();
    return newPairing;
  }

  async deleteControlPairing(id: string): Promise<boolean> {
    const result = await db.delete(controlPairings).where(eq(controlPairings.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }
}

export const storage = new DatabaseStorage();