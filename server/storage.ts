// Referenced from javascript_database blueprint
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
  
  // PFMEA
  getPFMEAsByPartId(partId: string): Promise<PFMEA[]>;
  getPFMEAById(id: string): Promise<(PFMEA & { rows: PFMEARow[] }) | undefined>;
  createPFMEA(insertPFMEA: InsertPFMEA): Promise<PFMEA>;
  createPFMEARow(insertRow: InsertPFMEARow): Promise<PFMEARow>;
  updatePFMEARow(id: string, updates: Partial<InsertPFMEARow>): Promise<PFMEARow | undefined>;
  
  // Control Plans
  getControlPlansByPartId(partId: string): Promise<ControlPlan[]>;
  getControlPlanById(id: string): Promise<(ControlPlan & { rows: ControlPlanRow[] }) | undefined>;
  createControlPlan(insertControlPlan: InsertControlPlan): Promise<ControlPlan>;
  createControlPlanRow(insertRow: InsertControlPlanRow): Promise<ControlPlanRow>;
  updateControlPlanRow(id: string, updates: Partial<InsertControlPlanRow>): Promise<ControlPlanRow | undefined>;
  
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

  // Individual process step operations
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
    await db.delete(processStep).where(eq(processStep.id, id));
    return true;
  }

  async getStepsByProcessId(processDefId: string): Promise<ProcessStep[]> {
    return await db.select().from(processStep)
      .where(eq(processStep.processDefId, processDefId))
      .orderBy(processStep.seq);
  }

  // Get child steps for a group
  async getChildSteps(parentStepId: string): Promise<ProcessStep[]> {
    return await db.select().from(processStep)
      .where(eq(processStep.parentStepId, parentStepId))
      .orderBy(processStep.seq);
  }

  // Resequence steps after insert/delete
  async resequenceSteps(processDefId: string): Promise<void> {
    const steps = await this.getStepsByProcessId(processDefId);
    for (let i = 0; i < steps.length; i++) {
      if (steps[i].seq !== i + 1) {
        await db.update(processStep)
          .set({ seq: i + 1 })
          .where(eq(processStep.id, steps[i].id));
      }
    }
  }

  async getPFMEAsByPartId(partId: string): Promise<PFMEA[]> {
    return await db.select().from(pfmea).where(eq(pfmea.partId, partId)).orderBy(desc(pfmea.rev));
  }

  async getPFMEAById(id: string): Promise<(PFMEA & { rows: PFMEARow[] }) | undefined> {
    const [pfmeaRecord] = await db.select().from(pfmea).where(eq(pfmea.id, id));
    if (!pfmeaRecord) return undefined;
    
    const rows = await db.select().from(pfmeaRow).where(eq(pfmeaRow.pfmeaId, id));
    return { ...pfmeaRecord, rows };
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

  async getControlPlansByPartId(partId: string): Promise<ControlPlan[]> {
    return await db.select().from(controlPlan).where(eq(controlPlan.partId, partId)).orderBy(desc(controlPlan.rev));
  }

  async getControlPlanById(id: string): Promise<(ControlPlan & { rows: ControlPlanRow[] }) | undefined> {
    const [plan] = await db.select().from(controlPlan).where(eq(controlPlan.id, id));
    if (!plan) return undefined;
    
    const rows = await db.select().from(controlPlanRow).where(eq(controlPlanRow.controlPlanId, id));
    return { ...plan, rows };
  }

  async createControlPlan(insertControlPlan: InsertControlPlan): Promise<ControlPlan> {
    const [newControlPlan] = await db.insert(controlPlan).values(insertControlPlan).returning();
    return newControlPlan;
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

  // Equipment Library
  async getAllEquipment(): Promise<EquipmentLibrary[]> {
    return await db.select().from(equipmentLibrary).orderBy(equipmentLibrary.name);
  }

  async getEquipmentById(id: string): Promise<(EquipmentLibrary & { errorProofingControls: EquipmentErrorProofing[]; controlMethods: EquipmentControlMethods[] }) | undefined> {
    const [equipment] = await db.select().from(equipmentLibrary).where(eq(equipmentLibrary.id, id));
    if (!equipment) return undefined;
    
    const errorProofingControls = await db.select().from(equipmentErrorProofing).where(eq(equipmentErrorProofing.equipmentId, id));
    const controlMethods = await db.select().from(equipmentControlMethods).where(eq(equipmentControlMethods.equipmentId, id));
    
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
    const conditions = [];
    
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
          ilike(failureModesLibrary.failureMode, searchTerm),
          ilike(failureModesLibrary.genericEffect, searchTerm)
        )
      );
    }
    
    if (conditions.length > 0) {
      return await db.select().from(failureModesLibrary)
        .where(and(...conditions))
        .orderBy(failureModesLibrary.category, failureModesLibrary.failureMode);
    }
    
    return await db.select().from(failureModesLibrary)
      .orderBy(failureModesLibrary.category, failureModesLibrary.failureMode);
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
