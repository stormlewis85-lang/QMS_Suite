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
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

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
}

export const storage = new DatabaseStorage();
