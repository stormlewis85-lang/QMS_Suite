// Referenced from javascript_database blueprint
import {
  part,
  processDef,
  processStep,
  pfmea,
  controlPlan,
  type Part,
  type InsertPart,
  type ProcessDef,
  type InsertProcessDef,
  type ProcessStep,
  type InsertProcessStep,
  type PFMEA,
  type InsertPFMEA,
  type ControlPlan,
  type InsertControlPlan,
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
  createPFMEA(insertPFMEA: InsertPFMEA): Promise<PFMEA>;
  
  // Control Plans
  getControlPlansByPartId(partId: string): Promise<ControlPlan[]>;
  createControlPlan(insertControlPlan: InsertControlPlan): Promise<ControlPlan>;
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
    return await db.select().from(pfmea).where(eq(pfmea.partId, partId));
  }

  async createPFMEA(insertPFMEA: InsertPFMEA): Promise<PFMEA> {
    const [newPFMEA] = await db.insert(pfmea).values(insertPFMEA).returning();
    return newPFMEA;
  }

  async getControlPlansByPartId(partId: string): Promise<ControlPlan[]> {
    return await db.select().from(controlPlan).where(eq(controlPlan.partId, partId));
  }

  async createControlPlan(insertControlPlan: InsertControlPlan): Promise<ControlPlan> {
    const [newControlPlan] = await db.insert(controlPlan).values(insertControlPlan).returning();
    return newControlPlan;
  }
}

export const storage = new DatabaseStorage();
