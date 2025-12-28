// Phase 6: Complete Storage with FMEA Template Row and Control Template Row support
// Phase 8: Governance & Document Control Tables
import {
  part,
  processDef,
  processStep,
  pfd,
  pfdStep,
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
  auditLog,
  signature,
  approvalMatrix,
  changePackage,
  changePackageItem,
  changePackageAffectedPart,
  trainingAck,
  ownership,
  type Part,
  type InsertPart,
  type ProcessDef,
  type InsertProcessDef,
  type ProcessStep,
  type InsertProcessStep,
  type PFD,
  type InsertPFD,
  type PFDStep,
  type InsertPFDStep,
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
  type AuditLog,
  type InsertAuditLog,
  type Signature,
  type InsertSignature,
  type ApprovalMatrix,
  type InsertApprovalMatrix,
  type ChangePackage,
  type InsertChangePackage,
  type ChangePackageItem,
  type InsertChangePackageItem,
  type ChangePackageAffectedPart,
  type InsertChangePackageAffectedPart,
  type TrainingAck,
  type InsertTrainingAck,
  type Ownership,
  type InsertOwnership,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, ilike, and, or, sql, isNull } from "drizzle-orm";
import crypto from "crypto";

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
  
  // PFD (Process Flow Diagrams)
  getPFDsByPartId(partId: string): Promise<PFD[]>;
  getPFDById(id: string): Promise<(PFD & { steps: PFDStep[] }) | undefined>;
  createPFD(insertPFD: InsertPFD): Promise<PFD>;
  createPFDStep(insertStep: InsertPFDStep): Promise<PFDStep>;
  createPFDWithSteps(insertPFD: InsertPFD, steps: InsertPFDStep[]): Promise<PFD & { steps: PFDStep[] }>;

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
  
  // ============================================
  // GOVERNANCE & DOCUMENT CONTROL (Phase 8)
  // ============================================
  
  // Audit Log
  getAuditLogsByEntity(entityType: string, entityId: string): Promise<AuditLog[]>;
  getAuditLogsByActor(actorId: string): Promise<AuditLog[]>;
  createAuditLog(insertLog: InsertAuditLog): Promise<AuditLog>;
  
  // Signatures
  getSignaturesByEntity(entityType: string, entityId: string): Promise<Signature[]>;
  getSignatureById(id: string): Promise<Signature | undefined>;
  createSignature(insertSig: InsertSignature): Promise<Signature>;
  deleteSignature(id: string): Promise<boolean>;
  
  // Approval Matrix
  getAllApprovalMatrices(): Promise<ApprovalMatrix[]>;
  getApprovalMatrixByDocType(documentType: string): Promise<ApprovalMatrix[]>;
  createApprovalMatrix(insertMatrix: InsertApprovalMatrix): Promise<ApprovalMatrix>;
  updateApprovalMatrix(id: string, updates: Partial<InsertApprovalMatrix>): Promise<ApprovalMatrix | undefined>;
  deleteApprovalMatrix(id: string): Promise<boolean>;
  
  // Change Package
  getAllChangePackages(): Promise<ChangePackage[]>;
  getChangePackageById(id: string): Promise<ChangePackage | undefined>;
  getChangePackageWithDetails(id: string): Promise<(ChangePackage & { items: ChangePackageItem[]; affectedParts: ChangePackageAffectedPart[]; trainingAcks: TrainingAck[] }) | undefined>;
  createChangePackage(insertPkg: InsertChangePackage): Promise<ChangePackage>;
  updateChangePackage(id: string, updates: Partial<InsertChangePackage>): Promise<ChangePackage | undefined>;
  deleteChangePackage(id: string): Promise<boolean>;
  
  // Change Package Items
  getChangePackageItems(changePackageId: string): Promise<ChangePackageItem[]>;
  createChangePackageItem(insertItem: InsertChangePackageItem): Promise<ChangePackageItem>;
  updateChangePackageItem(id: string, updates: Partial<InsertChangePackageItem>): Promise<ChangePackageItem | undefined>;
  deleteChangePackageItem(id: string): Promise<boolean>;
  
  // Affected Parts
  getAffectedParts(changePackageId: string): Promise<ChangePackageAffectedPart[]>;
  createAffectedPart(insertPart: InsertChangePackageAffectedPart): Promise<ChangePackageAffectedPart>;
  updateAffectedPart(id: string, updates: Partial<InsertChangePackageAffectedPart>): Promise<ChangePackageAffectedPart | undefined>;
  deleteAffectedPart(id: string): Promise<boolean>;
  
  // Training Acknowledgments
  getTrainingAcks(changePackageId: string): Promise<TrainingAck[]>;
  createTrainingAck(insertAck: InsertTrainingAck): Promise<TrainingAck>;
  updateTrainingAck(id: string, updates: Partial<InsertTrainingAck>): Promise<TrainingAck | undefined>;
  deleteTrainingAck(id: string): Promise<boolean>;
  
  // Ownership
  getOwnershipByEntity(entityType: string, entityId: string): Promise<Ownership | undefined>;
  createOwnership(insertOwnership: InsertOwnership): Promise<Ownership>;
  updateOwnership(id: string, updates: Partial<InsertOwnership>): Promise<Ownership | undefined>;
  deleteOwnership(id: string): Promise<boolean>;
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
          ilike(failureModesLibrary.genericEffect, `%${filters.search}%`)
        )
      );
    }
    
    if (conditions.length > 0) {
      return await db.select().from(failureModesLibrary)
        .where(and(...conditions))
        .orderBy(desc(failureModesLibrary.createdAt));
    }
    
    return await db.select().from(failureModesLibrary)
      .orderBy(desc(failureModesLibrary.createdAt));
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
        lastUsed: new Date()
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
        .orderBy(desc(controlsLibrary.createdAt));
    }
    
    return await db.select().from(controlsLibrary)
      .orderBy(desc(controlsLibrary.createdAt));
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
        lastUsed: new Date()
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

  // ============================================
  // GOVERNANCE & DOCUMENT CONTROL (Phase 8)
  // ============================================

  // Audit Log
  async getAuditLogsByEntity(entityType: string, entityId: string): Promise<AuditLog[]> {
    return await db.select().from(auditLog)
      .where(and(eq(auditLog.entityType, entityType), eq(auditLog.entityId, entityId)))
      .orderBy(desc(auditLog.at));
  }

  async getAuditLogsByActor(actorId: string): Promise<AuditLog[]> {
    return await db.select().from(auditLog)
      .where(eq(auditLog.actor, actorId))
      .orderBy(desc(auditLog.at));
  }

  async createAuditLog(insertLog: InsertAuditLog): Promise<AuditLog> {
    const [newLog] = await db.insert(auditLog).values(insertLog as any).returning();
    return newLog;
  }

  // Signatures
  async getSignaturesByEntity(entityType: string, entityId: string): Promise<Signature[]> {
    return await db.select().from(signature)
      .where(and(eq(signature.entityType, entityType), eq(signature.entityId, entityId)))
      .orderBy(desc(signature.signedAt));
  }

  async getSignatureById(id: string): Promise<Signature | undefined> {
    const [result] = await db.select().from(signature).where(eq(signature.id, id));
    return result;
  }

  async createSignature(insertSig: InsertSignature): Promise<Signature> {
    const [newSig] = await db.insert(signature).values(insertSig as any).returning();
    return newSig;
  }

  async deleteSignature(id: string): Promise<boolean> {
    const result = await db.delete(signature).where(eq(signature.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Approval Matrix
  async getAllApprovalMatrices(): Promise<ApprovalMatrix[]> {
    return await db.select().from(approvalMatrix).orderBy(approvalMatrix.documentType, approvalMatrix.sequence);
  }

  async getApprovalMatrixByDocType(documentType: string): Promise<ApprovalMatrix[]> {
    return await db.select().from(approvalMatrix)
      .where(eq(approvalMatrix.documentType, documentType))
      .orderBy(approvalMatrix.sequence);
  }

  async createApprovalMatrix(insertMatrix: InsertApprovalMatrix): Promise<ApprovalMatrix> {
    const [newMatrix] = await db.insert(approvalMatrix).values(insertMatrix as any).returning();
    return newMatrix;
  }

  async updateApprovalMatrix(id: string, updates: Partial<InsertApprovalMatrix>): Promise<ApprovalMatrix | undefined> {
    const [updated] = await db.update(approvalMatrix).set(updates as any).where(eq(approvalMatrix.id, id)).returning();
    return updated;
  }

  async deleteApprovalMatrix(id: string): Promise<boolean> {
    const result = await db.delete(approvalMatrix).where(eq(approvalMatrix.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Change Package
  async getAllChangePackages(): Promise<ChangePackage[]> {
    return await db.select().from(changePackage).orderBy(desc(changePackage.createdAt));
  }

  async getChangePackageById(id: string): Promise<ChangePackage | undefined> {
    const [result] = await db.select().from(changePackage).where(eq(changePackage.id, id));
    return result;
  }

  async getChangePackageWithDetails(id: string): Promise<(ChangePackage & { items: ChangePackageItem[]; affectedParts: ChangePackageAffectedPart[]; trainingAcks: TrainingAck[] }) | undefined> {
    const [pkg] = await db.select().from(changePackage).where(eq(changePackage.id, id));
    if (!pkg) return undefined;

    const items = await db.select().from(changePackageItem)
      .where(eq(changePackageItem.changePackageId, id));
    const affectedParts = await db.select().from(changePackageAffectedPart)
      .where(eq(changePackageAffectedPart.changePackageId, id));
    const trainingAcks = await db.select().from(trainingAck)
      .where(eq(trainingAck.changePackageId, id));

    return { ...pkg, items, affectedParts, trainingAcks };
  }

  async createChangePackage(insertPkg: InsertChangePackage): Promise<ChangePackage> {
    const [newPkg] = await db.insert(changePackage).values(insertPkg as any).returning();
    return newPkg;
  }

  async updateChangePackage(id: string, updates: Partial<InsertChangePackage>): Promise<ChangePackage | undefined> {
    const [updated] = await db.update(changePackage)
      .set({ ...updates as any, updatedAt: new Date() })
      .where(eq(changePackage.id, id))
      .returning();
    return updated;
  }

  async deleteChangePackage(id: string): Promise<boolean> {
    const result = await db.delete(changePackage).where(eq(changePackage.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Change Package Items
  async getChangePackageItems(changePackageId: string): Promise<ChangePackageItem[]> {
    return await db.select().from(changePackageItem)
      .where(eq(changePackageItem.changePackageId, changePackageId));
  }

  async createChangePackageItem(insertItem: InsertChangePackageItem): Promise<ChangePackageItem> {
    const [newItem] = await db.insert(changePackageItem).values(insertItem as any).returning();
    return newItem;
  }

  async updateChangePackageItem(id: string, updates: Partial<InsertChangePackageItem>): Promise<ChangePackageItem | undefined> {
    const [updated] = await db.update(changePackageItem).set(updates as any).where(eq(changePackageItem.id, id)).returning();
    return updated;
  }

  async deleteChangePackageItem(id: string): Promise<boolean> {
    const result = await db.delete(changePackageItem).where(eq(changePackageItem.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Affected Parts
  async getAffectedParts(changePackageId: string): Promise<ChangePackageAffectedPart[]> {
    return await db.select().from(changePackageAffectedPart)
      .where(eq(changePackageAffectedPart.changePackageId, changePackageId));
  }

  async createAffectedPart(insertPart: InsertChangePackageAffectedPart): Promise<ChangePackageAffectedPart> {
    const [newPart] = await db.insert(changePackageAffectedPart).values(insertPart as any).returning();
    return newPart;
  }

  async updateAffectedPart(id: string, updates: Partial<InsertChangePackageAffectedPart>): Promise<ChangePackageAffectedPart | undefined> {
    const [updated] = await db.update(changePackageAffectedPart).set(updates as any).where(eq(changePackageAffectedPart.id, id)).returning();
    return updated;
  }

  async deleteAffectedPart(id: string): Promise<boolean> {
    const result = await db.delete(changePackageAffectedPart).where(eq(changePackageAffectedPart.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Training Acknowledgments
  async getTrainingAcks(changePackageId: string): Promise<TrainingAck[]> {
    return await db.select().from(trainingAck)
      .where(eq(trainingAck.changePackageId, changePackageId));
  }

  async createTrainingAck(insertAck: InsertTrainingAck): Promise<TrainingAck> {
    const [newAck] = await db.insert(trainingAck).values(insertAck as any).returning();
    return newAck;
  }

  async updateTrainingAck(id: string, updates: Partial<InsertTrainingAck>): Promise<TrainingAck | undefined> {
    const [updated] = await db.update(trainingAck).set(updates as any).where(eq(trainingAck.id, id)).returning();
    return updated;
  }

  async deleteTrainingAck(id: string): Promise<boolean> {
    const result = await db.delete(trainingAck).where(eq(trainingAck.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Ownership
  async getOwnershipByEntity(entityType: string, entityId: string): Promise<Ownership | undefined> {
    const [result] = await db.select().from(ownership)
      .where(and(eq(ownership.entityType, entityType), eq(ownership.entityId, entityId)));
    return result;
  }

  async createOwnership(insertOwn: InsertOwnership): Promise<Ownership> {
    const [newOwn] = await db.insert(ownership).values(insertOwn as any).returning();
    return newOwn;
  }

  async updateOwnership(id: string, updates: Partial<InsertOwnership>): Promise<Ownership | undefined> {
    const [updated] = await db.update(ownership)
      .set({ ...updates as any, updatedAt: new Date() })
      .where(eq(ownership.id, id))
      .returning();
    return updated;
  }

  async deleteOwnership(id: string): Promise<boolean> {
    const result = await db.delete(ownership).where(eq(ownership.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // ============================================
  // ADDITIONAL GOVERNANCE HELPERS
  // ============================================

  async getRecentAuditLogs(limit: number = 100): Promise<AuditLog[]> {
    return await db.select().from(auditLog)
      .orderBy(desc(auditLog.at))
      .limit(limit);
  }

  async getSignatureByRole(entityType: string, entityId: string, role: string): Promise<Signature | null> {
    const [sig] = await db.select().from(signature)
      .where(and(
        eq(signature.entityType, entityType),
        eq(signature.entityId, entityId),
        eq(signature.role, role)
      ));
    return sig || null;
  }

  async generateChangePackageNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const existing = await db.select().from(changePackage)
      .where(sql`${changePackage.packageNumber} LIKE ${'CP-' + year + '-%'}`)
      .orderBy(desc(changePackage.createdAt));
    const nextNum = existing.length + 1;
    return `CP-${year}-${String(nextNum).padStart(3, '0')}`;
  }

  async getPendingTrainingForUser(userId: string): Promise<TrainingAck[]> {
    return await db.select().from(trainingAck)
      .where(and(
        eq(trainingAck.userId, userId),
        isNull(trainingAck.acknowledgedAt)
      ));
  }

  async getOwnedEntities(userId: string): Promise<Ownership[]> {
    return await db.select().from(ownership)
      .where(eq(ownership.ownerUserId, userId));
  }

  async addWatcher(entityType: string, entityId: string, watcher: { userId: string; name: string; email?: string }): Promise<Ownership | null> {
    const existing = await this.getOwnershipByEntity(entityType, entityId);
    if (!existing) return null;
    const watchers = existing.watchers || [];
    if (!watchers.find(w => w.userId === watcher.userId)) {
      watchers.push(watcher);
      return await this.updateOwnership(existing.id, { watchers } as any);
    }
    return existing;
  }

  async removeWatcher(entityType: string, entityId: string, userId: string): Promise<Ownership | null> {
    const existing = await this.getOwnershipByEntity(entityType, entityId);
    if (!existing) return null;
    const watchers = (existing.watchers || []).filter(w => w.userId !== userId);
    return await this.updateOwnership(existing.id, { watchers } as any);
  }

  async logAuditEvent(
    entityType: string,
    entityId: string,
    action: string,
    actor: string,
    actorName?: string,
    previousValue?: Record<string, any>,
    newValue?: Record<string, any>,
    changeNote?: string
  ): Promise<AuditLog> {
    return await this.createAuditLog({
      entityType,
      entityId,
      action,
      actor,
      actorName,
      previousValue,
      newValue,
      changeNote,
    } as any);
  }

  async checkApprovalStatus(entityType: string, entityId: string): Promise<{
    complete: boolean;
    pending: string[];
    signed: { role: string; signerName: string; signedAt: Date }[];
  }> {
    const matrix = await this.getApprovalMatrixByDocType(entityType);
    const signatures = await this.getSignaturesByEntity(entityType, entityId);
    const signedRoles = new Set(signatures.map(s => s.role));
    const requiredRoles = matrix.filter(m => m.required).map(m => m.role);
    const pending = requiredRoles.filter(role => !signedRoles.has(role));
    return {
      complete: pending.length === 0,
      pending,
      signed: signatures.map(s => ({
        role: s.role,
        signerName: s.signerName,
        signedAt: s.signedAt,
      })),
    };
  }

  computeContentHash(content: any): string {
    const json = JSON.stringify(content, Object.keys(content).sort());
    return crypto.createHash('sha256').update(json).digest('hex');
  }

  // ============================================
  // PFD (Process Flow Diagrams)
  // ============================================

  async getPFDsByPartId(partId: string): Promise<PFD[]> {
    return await db.select().from(pfd).where(eq(pfd.partId, partId)).orderBy(desc(pfd.createdAt));
  }

  async getPFDById(id: string): Promise<(PFD & { steps: PFDStep[] }) | undefined> {
    const [pfdDoc] = await db.select().from(pfd).where(eq(pfd.id, id));
    if (!pfdDoc) return undefined;
    const steps = await db.select().from(pfdStep).where(eq(pfdStep.pfdId, id)).orderBy(pfdStep.sequence);
    return { ...pfdDoc, steps };
  }

  async createPFD(insertPFD: InsertPFD): Promise<PFD> {
    const [created] = await db.insert(pfd).values(insertPFD).returning();
    return created;
  }

  async createPFDStep(insertStep: InsertPFDStep): Promise<PFDStep> {
    const [created] = await db.insert(pfdStep).values(insertStep).returning();
    return created;
  }

  async createPFDWithSteps(insertPFD: InsertPFD, steps: InsertPFDStep[]): Promise<PFD & { steps: PFDStep[] }> {
    const createdPFD = await this.createPFD(insertPFD);
    const createdSteps: PFDStep[] = [];
    for (const step of steps) {
      const createdStep = await this.createPFDStep({ ...step, pfdId: createdPFD.id });
      createdSteps.push(createdStep);
    }
    return { ...createdPFD, steps: createdSteps };
  }
}

export const storage = new DatabaseStorage();