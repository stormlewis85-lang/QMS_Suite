// Phase 6: Complete Storage with FMEA Template Row and Control Template Row support
import {
  part,
  processDef,
  processStep,
  pfmea,
  pfmeaRow,
  controlPlan,
  controlPlanRow,
  equipmentLibrary,
  equipmentErrorProofing,
  equipmentControlMethods,
  failureModesLibrary,
  fmeaTemplateCatalogLink,
  fmeaTemplateRow,
  controlTemplateRow,
  controlsLibrary,
  controlPairings,
  type Part,
  type InsertPart,
  type ProcessDef,
  type InsertProcessDef,
  type ProcessStep,
  type InsertProcessStep,
  type PFMEA,
  type InsertPFMEA,
  type PFMEARow,
  type InsertPFMEARow,
  type ControlPlan,
  type InsertControlPlan,
  type ControlPlanRow,
  type InsertControlPlanRow,
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
  type FmeaTemplateRow,
  type InsertFmeaTemplateRow,
  type ControlTemplateRow,
  type InsertControlTemplateRow,
  type FailureModeCategory,
  type ControlsLibrary,
  type InsertControlsLibrary,
  type ControlPairings,
  type InsertControlPairings,
  type ControlType,
  type ControlEffectiveness,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, ilike, and, or, sql } from "drizzle-orm";

export interface IStorage {
  // Parts
  getAllParts(): Promise<Part[]>;
  getPartById(id: string): Promise<Part | undefined>;
  createPart(insertPart: InsertPart): Promise<Part>;
  updatePart(id: string, updates: Partial<InsertPart>): Promise<Part | undefined>;
  deletePart(id: string): Promise<boolean>;
  
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
  
  // FMEA Template Rows (Phase 6)
  getFmeaTemplateRowsByProcessId(processDefId: string): Promise<FmeaTemplateRow[]>;
  getFmeaTemplateRowById(id: string): Promise<FmeaTemplateRow | undefined>;
  createFmeaTemplateRow(row: InsertFmeaTemplateRow): Promise<FmeaTemplateRow>;
  updateFmeaTemplateRow(id: string, updates: Partial<InsertFmeaTemplateRow>): Promise<FmeaTemplateRow | undefined>;
  deleteFmeaTemplateRow(id: string): Promise<boolean>;
  duplicateFmeaTemplateRow(id: string): Promise<FmeaTemplateRow | undefined>;
  
  // Control Template Rows (Phase 6)
  getControlTemplateRowsByProcessId(processDefId: string): Promise<ControlTemplateRow[]>;
  getControlTemplateRowById(id: string): Promise<ControlTemplateRow | undefined>;
  createControlTemplateRow(row: InsertControlTemplateRow): Promise<ControlTemplateRow>;
  updateControlTemplateRow(id: string, updates: Partial<InsertControlTemplateRow>): Promise<ControlTemplateRow | undefined>;
  deleteControlTemplateRow(id: string): Promise<boolean>;
  duplicateControlTemplateRow(id: string): Promise<ControlTemplateRow | undefined>;
  
  // PFMEA
  getPFMEAsByPartId(partId: string): Promise<PFMEA[]>;
  getPFMEAById(id: string): Promise<(PFMEA & { rows: PFMEARow[] }) | undefined>;
  getAllPFMEAs(): Promise<PFMEA[]>;
  createPFMEA(insertPFMEA: InsertPFMEA): Promise<PFMEA>;
  updatePFMEA(id: string, updates: Partial<InsertPFMEA>): Promise<PFMEA | undefined>;
  createPFMEARow(insertRow: InsertPFMEARow): Promise<PFMEARow>;
  updatePFMEARow(id: string, updates: Partial<InsertPFMEARow>): Promise<PFMEARow | undefined>;
  deletePFMEARow(id: string): Promise<boolean>;
  
  // Control Plans
  getControlPlansByPartId(partId: string): Promise<ControlPlan[]>;
  getControlPlanById(id: string): Promise<(ControlPlan & { rows: ControlPlanRow[] }) | undefined>;
  getAllControlPlans(): Promise<ControlPlan[]>;
  createControlPlan(insertControlPlan: InsertControlPlan): Promise<ControlPlan>;
  updateControlPlan(id: string, updates: Partial<InsertControlPlan>): Promise<ControlPlan | undefined>;
  createControlPlanRow(insertRow: InsertControlPlanRow): Promise<ControlPlanRow>;
  updateControlPlanRow(id: string, updates: Partial<InsertControlPlanRow>): Promise<ControlPlanRow | undefined>;
  deleteControlPlanRow(id: string): Promise<boolean>;
  
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

class DatabaseStorage implements IStorage {
  // Parts
  async getAllParts(): Promise<Part[]> {
    return await db.select().from(part).orderBy(desc(part.partNumber));
  }

  async getPartById(id: string): Promise<Part | undefined> {
    const [result] = await db.select().from(part).where(eq(part.id, id));
    return result;
  }

  async createPart(insertPart: InsertPart): Promise<Part> {
    const [newPart] = await db.insert(part).values(insertPart).returning();
    return newPart;
  }

  async updatePart(id: string, updates: Partial<InsertPart>): Promise<Part | undefined> {
    const [updatedPart] = await db.update(part).set(updates).where(eq(part.id, id)).returning();
    return updatedPart;
  }

  async deletePart(id: string): Promise<boolean> {
    const result = await db.delete(part).where(eq(part.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Processes
  async getAllProcesses(): Promise<ProcessDef[]> {
    return await db.select().from(processDef).orderBy(desc(processDef.createdAt));
  }

  async getProcessById(id: string): Promise<ProcessDef | undefined> {
    const [result] = await db.select().from(processDef).where(eq(processDef.id, id));
    return result;
  }

  async getProcessWithSteps(id: string): Promise<(ProcessDef & { steps: ProcessStep[] }) | undefined> {
    const [process] = await db.select().from(processDef).where(eq(processDef.id, id));
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

  async createProcessWithSteps(insertProcess: InsertProcessDef, steps: InsertProcessStep[]): Promise<ProcessDef & { steps: ProcessStep[] }> {
    const [newProcess] = await db.insert(processDef).values(insertProcess).returning();
    
    const createdSteps: ProcessStep[] = [];
    for (const step of steps) {
      const [newStep] = await db.insert(processStep)
        .values({ ...step, processDefId: newProcess.id })
        .returning();
      createdSteps.push(newStep);
    }
    
    return { ...newProcess, steps: createdSteps };
  }

  async updateProcess(id: string, updates: Partial<InsertProcessDef>): Promise<ProcessDef | undefined> {
    const [updatedProcess] = await db.update(processDef).set(updates).where(eq(processDef.id, id)).returning();
    return updatedProcess;
  }

  async deleteProcess(id: string): Promise<boolean> {
    const result = await db.delete(processDef).where(eq(processDef.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Process Steps
  async createProcessStep(step: InsertProcessStep): Promise<ProcessStep> {
    const [newStep] = await db.insert(processStep).values(step).returning();
    return newStep;
  }

  async updateProcessStep(id: string, updates: Partial<InsertProcessStep>): Promise<ProcessStep | undefined> {
    const [updatedStep] = await db.update(processStep).set(updates).where(eq(processStep.id, id)).returning();
    return updatedStep;
  }

  async deleteProcessStep(id: string): Promise<boolean> {
    const result = await db.delete(processStep).where(eq(processStep.id, id));
    return (result.rowCount ?? 0) > 0;
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
      await db.update(processStep)
        .set({ seq: (i + 1) * 10 })
        .where(eq(processStep.id, steps[i].id));
    }
  }

  // FMEA Template Rows (Phase 6)
  async getFmeaTemplateRowsByProcessId(processDefId: string): Promise<FmeaTemplateRow[]> {
    return await db.select().from(fmeaTemplateRow)
      .where(eq(fmeaTemplateRow.processDefId, processDefId))
      .orderBy(fmeaTemplateRow.stepId);
  }

  async getFmeaTemplateRowById(id: string): Promise<FmeaTemplateRow | undefined> {
    const [result] = await db.select().from(fmeaTemplateRow).where(eq(fmeaTemplateRow.id, id));
    return result;
  }

  async createFmeaTemplateRow(row: InsertFmeaTemplateRow): Promise<FmeaTemplateRow> {
    const [newRow] = await db.insert(fmeaTemplateRow).values(row).returning();
    return newRow;
  }

  async updateFmeaTemplateRow(id: string, updates: Partial<InsertFmeaTemplateRow>): Promise<FmeaTemplateRow | undefined> {
    const [updatedRow] = await db.update(fmeaTemplateRow).set(updates).where(eq(fmeaTemplateRow.id, id)).returning();
    return updatedRow;
  }

  async deleteFmeaTemplateRow(id: string): Promise<boolean> {
    const result = await db.delete(fmeaTemplateRow).where(eq(fmeaTemplateRow.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async duplicateFmeaTemplateRow(id: string): Promise<FmeaTemplateRow | undefined> {
    const original = await this.getFmeaTemplateRowById(id);
    if (!original) return undefined;

    const newRow: InsertFmeaTemplateRow = {
      processDefId: original.processDefId,
      stepId: original.stepId,
      function: original.function,
      requirement: original.requirement,
      failureMode: `${original.failureMode} (Copy)`,
      effect: original.effect,
      severity: original.severity,
      cause: original.cause,
      occurrence: original.occurrence,
      preventionControls: original.preventionControls,
      detectionControls: original.detectionControls,
      detection: original.detection,
      ap: original.ap,
      specialFlag: original.specialFlag,
      csrSymbol: original.csrSymbol,
      notes: original.notes,
    };

    return await this.createFmeaTemplateRow(newRow);
  }

  // Control Template Rows (Phase 6)
  async getControlTemplateRowsByProcessId(processDefId: string): Promise<ControlTemplateRow[]> {
    return await db.select().from(controlTemplateRow)
      .where(eq(controlTemplateRow.processDefId, processDefId))
      .orderBy(controlTemplateRow.charId);
  }

  async getControlTemplateRowById(id: string): Promise<ControlTemplateRow | undefined> {
    const [result] = await db.select().from(controlTemplateRow).where(eq(controlTemplateRow.id, id));
    return result;
  }

  async createControlTemplateRow(row: InsertControlTemplateRow): Promise<ControlTemplateRow> {
    const [newRow] = await db.insert(controlTemplateRow).values(row).returning();
    return newRow;
  }

  async updateControlTemplateRow(id: string, updates: Partial<InsertControlTemplateRow>): Promise<ControlTemplateRow | undefined> {
    const [updatedRow] = await db.update(controlTemplateRow).set(updates).where(eq(controlTemplateRow.id, id)).returning();
    return updatedRow;
  }

  async deleteControlTemplateRow(id: string): Promise<boolean> {
    const result = await db.delete(controlTemplateRow).where(eq(controlTemplateRow.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async duplicateControlTemplateRow(id: string): Promise<ControlTemplateRow | undefined> {
    const original = await this.getControlTemplateRowById(id);
    if (!original) return undefined;

    // Generate new charId by appending "-COPY" or incrementing copy number
    let newCharId = `${original.charId}-COPY`;
    
    // Check if copy already exists and increment
    const existingCopies = await db.select().from(controlTemplateRow)
      .where(and(
        eq(controlTemplateRow.processDefId, original.processDefId),
        sql`${controlTemplateRow.charId} LIKE ${original.charId + '-COPY%'}`
      ));
    
    if (existingCopies.length > 0) {
      newCharId = `${original.charId}-COPY-${existingCopies.length + 1}`;
    }

    const newRow: InsertControlTemplateRow = {
      processDefId: original.processDefId,
      sourceTemplateRowId: original.sourceTemplateRowId,
      characteristicName: `${original.characteristicName} (Copy)`,
      charId: newCharId,
      type: original.type,
      target: original.target,
      tolerance: original.tolerance,
      specialFlag: original.specialFlag,
      csrSymbol: original.csrSymbol,
      measurementSystem: original.measurementSystem,
      gageDetails: original.gageDetails,
      defaultSampleSize: original.defaultSampleSize,
      defaultFrequency: original.defaultFrequency,
      controlMethod: original.controlMethod,
      acceptanceCriteria: original.acceptanceCriteria,
      reactionPlan: original.reactionPlan,
    };

    return await this.createControlTemplateRow(newRow);
  }

  // PFMEA
  async getPFMEAsByPartId(partId: string): Promise<PFMEA[]> {
    return await db.select().from(pfmea)
      .where(eq(pfmea.partId, partId))
      .orderBy(desc(pfmea.rev));
  }

  async getAllPFMEAs(): Promise<PFMEA[]> {
    return await db.select().from(pfmea).orderBy(desc(pfmea.rev));
  }

  async getPFMEAById(id: string): Promise<(PFMEA & { rows: PFMEARow[] }) | undefined> {
    const [pfmeaResult] = await db.select().from(pfmea).where(eq(pfmea.id, id));
    if (!pfmeaResult) return undefined;
    
    const rows = await db.select().from(pfmeaRow).where(eq(pfmeaRow.pfmeaId, id));
    
    return { ...pfmeaResult, rows };
  }

  async createPFMEA(insertPFMEA: InsertPFMEA): Promise<PFMEA> {
    const [newPFMEA] = await db.insert(pfmea).values(insertPFMEA).returning();
    return newPFMEA;
  }

  async updatePFMEA(id: string, updates: Partial<InsertPFMEA>): Promise<PFMEA | undefined> {
    const [updatedPFMEA] = await db.update(pfmea).set(updates).where(eq(pfmea.id, id)).returning();
    return updatedPFMEA;
  }

  async createPFMEARow(insertRow: InsertPFMEARow): Promise<PFMEARow> {
    const [newRow] = await db.insert(pfmeaRow).values(insertRow).returning();
    return newRow;
  }

  async updatePFMEARow(id: string, updates: Partial<InsertPFMEARow>): Promise<PFMEARow | undefined> {
    const [updatedRow] = await db.update(pfmeaRow).set(updates).where(eq(pfmeaRow.id, id)).returning();
    return updatedRow;
  }

  async deletePFMEARow(id: string): Promise<boolean> {
    const result = await db.delete(pfmeaRow).where(eq(pfmeaRow.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Control Plans
  async getControlPlansByPartId(partId: string): Promise<ControlPlan[]> {
    return await db.select().from(controlPlan)
      .where(eq(controlPlan.partId, partId))
      .orderBy(desc(controlPlan.rev));
  }

  async getAllControlPlans(): Promise<ControlPlan[]> {
    return await db.select().from(controlPlan).orderBy(desc(controlPlan.rev));
  }

  async getControlPlanById(id: string): Promise<(ControlPlan & { rows: ControlPlanRow[] }) | undefined> {
    const [cpResult] = await db.select().from(controlPlan).where(eq(controlPlan.id, id));
    if (!cpResult) return undefined;
    
    const rows = await db.select().from(controlPlanRow).where(eq(controlPlanRow.controlPlanId, id));
    
    return { ...cpResult, rows };
  }

  async createControlPlan(insertControlPlan: InsertControlPlan): Promise<ControlPlan> {
    const [newControlPlan] = await db.insert(controlPlan).values(insertControlPlan).returning();
    return newControlPlan;
  }

  async updateControlPlan(id: string, updates: Partial<InsertControlPlan>): Promise<ControlPlan | undefined> {
    const [updatedCP] = await db.update(controlPlan).set(updates).where(eq(controlPlan.id, id)).returning();
    return updatedCP;
  }

  async createControlPlanRow(insertRow: InsertControlPlanRow): Promise<ControlPlanRow> {
    const [newRow] = await db.insert(controlPlanRow).values(insertRow).returning();
    return newRow;
  }

  async updateControlPlanRow(id: string, updates: Partial<InsertControlPlanRow>): Promise<ControlPlanRow | undefined> {
    const [updatedRow] = await db.update(controlPlanRow).set(updates).where(eq(controlPlanRow.id, id)).returning();
    return updatedRow;
  }

  async deleteControlPlanRow(id: string): Promise<boolean> {
    const result = await db.delete(controlPlanRow).where(eq(controlPlanRow.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Equipment Library
  async getAllEquipment(): Promise<EquipmentLibrary[]> {
    return await db.select().from(equipmentLibrary).orderBy(equipmentLibrary.name);
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
    return updatedEquipment;
  }

  async deleteEquipment(id: string): Promise<boolean> {
    const result = await db.delete(equipmentLibrary).where(eq(equipmentLibrary.id, id));
    return (result.rowCount ?? 0) > 0;
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
    return updatedControl;
  }

  async deleteErrorProofingControl(id: string): Promise<boolean> {
    const result = await db.delete(equipmentErrorProofing).where(eq(equipmentErrorProofing.id, id));
    return (result.rowCount ?? 0) > 0;
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
    return updatedMethod;
  }

  async deleteControlMethod(id: string): Promise<boolean> {
    const result = await db.delete(equipmentControlMethods).where(eq(equipmentControlMethods.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Failure Modes Library
  async getAllFailureModes(filters?: { category?: FailureModeCategory; search?: string; status?: string }): Promise<FailureModesLibrary[]> {
    const conditions = [];
    
    if (filters?.category) {
      conditions.push(eq(failureModesLibrary.category, filters.category));
    }
    
    if (filters?.status) {
      conditions.push(eq(failureModesLibrary.status, filters.status));
    }
    
    if (filters?.search) {
      conditions.push(
        or(
          ilike(failureModesLibrary.failureMode, `%${filters.search}%`),
          ilike(failureModesLibrary.genericEffect, `%${filters.search}%`),
          ilike(failureModesLibrary.genericCause, `%${filters.search}%`)
        )
      );
    }
    
    if (conditions.length > 0) {
      return await db.select().from(failureModesLibrary)
        .where(and(...conditions))
        .orderBy(desc(failureModesLibrary.usageCount));
    }
    
    return await db.select().from(failureModesLibrary)
      .orderBy(desc(failureModesLibrary.usageCount));
  }

  async getFailureModeById(id: string): Promise<FailureModesLibrary | undefined> {
    const [result] = await db.select().from(failureModesLibrary).where(eq(failureModesLibrary.id, id));
    return result;
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
    return updatedFailureMode;
  }

  async deleteFailureMode(id: string): Promise<boolean> {
    const result = await db.delete(failureModesLibrary).where(eq(failureModesLibrary.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async updateFailureModeLastUsed(id: string): Promise<void> {
    await db.update(failureModesLibrary)
      .set({ 
        lastUsed: new Date(),
        usageCount: sql`${failureModesLibrary.usageCount} + 1`
      })
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
    const conditions = [];
    
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
      conditions.push(
        or(
          ilike(controlsLibrary.name, `%${filters.search}%`),
          ilike(controlsLibrary.description, `%${filters.search}%`)
        )
      );
    }
    
    if (conditions.length > 0) {
      return await db.select().from(controlsLibrary)
        .where(and(...conditions))
        .orderBy(desc(controlsLibrary.usageCount));
    }
    
    return await db.select().from(controlsLibrary)
      .orderBy(desc(controlsLibrary.usageCount));
  }

  async getControlById(id: string): Promise<ControlsLibrary | undefined> {
    const [result] = await db.select().from(controlsLibrary).where(eq(controlsLibrary.id, id));
    return result;
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
    return updatedControl;
  }

  async deleteControl(id: string): Promise<boolean> {
    const result = await db.delete(controlsLibrary).where(eq(controlsLibrary.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async updateControlLastUsed(id: string): Promise<void> {
    await db.update(controlsLibrary)
      .set({ 
        lastUsed: new Date(),
        usageCount: sql`${controlsLibrary.usageCount} + 1`
      })
      .where(eq(controlsLibrary.id, id));
  }

  // Control Pairings
  async getAllControlPairings(): Promise<ControlPairings[]> {
    return await db.select().from(controlPairings);
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
    return (result.rowCount ?? 0) > 0;
  }

  // ============================================
  // AUTO-REVIEW FUNCTIONS (Phase 7)
  // ============================================

  // Get all PFMEA rows for a PFMEA (for validation)
  async getPFMEARowsForReview(pfmeaId: string): Promise<PFMEARow[]> {
    return await db
      .select()
      .from(pfmeaRow)
      .where(eq(pfmeaRow.pfmeaId, pfmeaId));
  }

  // Get all Control Plan rows for a Control Plan (for validation)
  async getControlPlanRowsForReview(controlPlanId: string): Promise<ControlPlanRow[]> {
    return await db
      .select()
      .from(controlPlanRow)
      .where(eq(controlPlanRow.controlPlanId, controlPlanId));
  }

  // Get process steps for a process (for validation)
  async getProcessStepsForReview(processDefId: string): Promise<ProcessStep[]> {
    return await db
      .select()
      .from(processStep)
      .where(eq(processStep.processDefId, processDefId))
      .orderBy(processStep.seq);
  }

  // Get part with all related documents for review
  async getPartWithDocuments(partId: string): Promise<{
    part: Part;
    pfmeas: PFMEA[];
    controlPlans: ControlPlan[];
  } | null> {
    const [partData] = await db
      .select()
      .from(part)
      .where(eq(part.id, partId));
    
    if (!partData) return null;

    const partPfmeas = await db
      .select()
      .from(pfmea)
      .where(eq(pfmea.partId, partId));

    const partControlPlans = await db
      .select()
      .from(controlPlan)
      .where(eq(controlPlan.partId, partId));

    return {
      part: partData,
      pfmeas: partPfmeas,
      controlPlans: partControlPlans,
    };
  }

  // Get FMEA template rows for a process (for coverage validation)
  async getFmeaTemplateRowsForReview(processDefId: string): Promise<FmeaTemplateRow[]> {
    return await db
      .select()
      .from(fmeaTemplateRow)
      .where(eq(fmeaTemplateRow.processDefId, processDefId));
  }

  // Get Control template rows for a process (for coverage validation)
  async getControlTemplateRowsForReview(processDefId: string): Promise<ControlTemplateRow[]> {
    return await db
      .select()
      .from(controlTemplateRow)
      .where(eq(controlTemplateRow.processDefId, processDefId));
  }
}

export const storage = new DatabaseStorage();