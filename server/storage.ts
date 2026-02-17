// Phase 6: Complete Storage with FMEA Template Row and Control Template Row support
// Phase 9: Auto-Review and Change Package Tables
import {
  organization,
  user,
  session,
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
  autoReviewRun,
  autoReviewFinding,
  changePackage,
  changePackageItem,
  changePackageApproval,
  changePackagePropagation,
  type Organization,
  type InsertOrganization,
  type User,
  type InsertUser,
  type Session,
  type InsertSession,
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
  type AutoReviewRun,
  type InsertAutoReviewRun,
  type AutoReviewFinding,
  type InsertAutoReviewFinding,
  type ChangePackage,
  type InsertChangePackage,
  type ChangePackageItem,
  type InsertChangePackageItem,
  type ChangePackageApproval,
  type InsertChangePackageApproval,
  type ChangePackagePropagation,
  type InsertChangePackagePropagation,
  document,
  documentRevision,
  documentDistribution,
  documentReview,
  documentLink,
  documentFile,
  documentTemplate,
  approvalWorkflowDefinition,
  approvalWorkflowInstance,
  approvalWorkflowStep,
  documentCheckout,
  distributionList,
  documentDistributionRecord,
  documentAccessLog,
  documentPrintLog,
  documentComment,
  externalDocument,
  documentLinkEnhanced,
  type Document,
  type InsertDocument,
  type DocumentRevision,
  type InsertDocumentRevision,
  type DocumentDistribution,
  type InsertDocumentDistribution,
  type DocumentReview,
  type InsertDocumentReview,
  type DocumentLink,
  type InsertDocumentLink,
  type DocumentFile,
  type InsertDocumentFile,
  type DocumentTemplate,
  type InsertDocumentTemplate,
  type ApprovalWorkflowDefinition,
  type InsertApprovalWorkflowDefinition,
  type ApprovalWorkflowInstance,
  type InsertApprovalWorkflowInstance,
  type ApprovalWorkflowStep,
  type InsertApprovalWorkflowStep,
  type DocumentCheckout,
  type InsertDocumentCheckout,
  type DistributionList,
  type InsertDistributionList,
  type DocumentDistributionRecord,
  type InsertDocumentDistributionRecord,
  type DocumentAccessLog,
  type InsertDocumentAccessLog,
  type DocumentPrintLog,
  type InsertDocumentPrintLog,
  type DocumentComment,
  type InsertDocumentComment,
  type ExternalDocument,
  type InsertExternalDocument,
  type DocumentLinkEnhanced,
  type InsertDocumentLinkEnhanced,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, ilike, and, or, sql, inArray, lt, gte, lte, isNull, isNotNull, count } from "drizzle-orm";
import crypto from "crypto";

export interface IStorage {
  // Organization
  getOrganizationById(id: string): Promise<Organization | undefined>;
  getOrganizationBySlug(slug: string): Promise<Organization | undefined>;
  getAllOrganizations(): Promise<Organization[]>;
  createOrganization(data: InsertOrganization): Promise<Organization>;
  updateOrganization(id: string, data: Partial<InsertOrganization>): Promise<Organization | undefined>;

  // User
  getUserById(id: string): Promise<User | undefined>;
  getUserByEmail(orgId: string, email: string): Promise<User | undefined>;
  getUsersByOrgId(orgId: string): Promise<User[]>;
  createUser(data: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined>;
  updateUserLastLogin(id: string): Promise<void>;

  // Session
  getSessionByToken(token: string): Promise<(Session & { user: User & { organization: Organization } }) | undefined>;
  createSession(data: InsertSession): Promise<Session>;
  deleteSession(token: string): Promise<void>;
  deleteExpiredSessions(): Promise<number>;
  deleteUserSessions(userId: string): Promise<void>;

  // Parts
  getAllParts(orgId?: string): Promise<Part[]>;
  getPartById(id: string): Promise<Part | undefined>;
  createPart(insertPart: InsertPart): Promise<Part>;
  updatePart(id: string, updates: Partial<InsertPart>): Promise<Part | undefined>;
  deletePart(id: string): Promise<boolean>;
  
  // Processes
  getAllProcesses(orgId?: string): Promise<ProcessDef[]>;
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
  createPFDWithSteps(insertPfd: InsertPFD, steps: Omit<InsertPFDStep, 'pfdId'>[]): Promise<PFD & { steps: PFDStep[] }>;

  // PFMEA
  getPFMEAsByPartId(partId: string): Promise<PFMEA[]>;
  getPFMEAById(id: string): Promise<(PFMEA & { rows: PFMEARow[] }) | undefined>;
  getAllPFMEAs(): Promise<PFMEA[]>;
  getPFMEARows(pfmeaId: string): Promise<PFMEARow[]>;
  createPFMEA(insertPFMEA: InsertPFMEA): Promise<PFMEA>;
  updatePFMEA(id: string, updates: Partial<InsertPFMEA>): Promise<PFMEA | undefined>;
  createPFMEARow(insertRow: InsertPFMEARow): Promise<PFMEARow>;
  updatePFMEARow(id: string, updates: Partial<InsertPFMEARow>): Promise<PFMEARow | undefined>;
  deletePFMEARow(id: string): Promise<boolean>;
  
  // Part Process Mappings
  getPartProcessMappings(partId: string): Promise<{ id: string; processDefId: string; processName: string; processRev: string; sequence: number }[]>;

  // Control Plans
  getControlPlansByPartId(partId: string): Promise<ControlPlan[]>;
  getControlPlanById(id: string): Promise<(ControlPlan & { rows: ControlPlanRow[] }) | undefined>;
  getAllControlPlans(): Promise<ControlPlan[]>;
  getControlPlanRows(controlPlanId: string): Promise<ControlPlanRow[]>;
  createControlPlan(insertControlPlan: InsertControlPlan): Promise<ControlPlan>;
  updateControlPlan(id: string, updates: Partial<InsertControlPlan>): Promise<ControlPlan | undefined>;
  createControlPlanRow(insertRow: InsertControlPlanRow): Promise<ControlPlanRow>;
  updateControlPlanRow(id: string, updates: Partial<InsertControlPlanRow>): Promise<ControlPlanRow | undefined>;
  deleteControlPlanRow(id: string): Promise<boolean>;
  
  // Equipment Library
  getAllEquipment(orgId?: string): Promise<EquipmentLibrary[]>;
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
  getAllFailureModes(filters?: { orgId?: string; category?: FailureModeCategory; search?: string; status?: string }): Promise<FailureModesLibrary[]>;
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
  getAllControls(filters?: { orgId?: string; type?: ControlType; effectiveness?: ControlEffectiveness; search?: string; status?: string }): Promise<ControlsLibrary[]>;
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
  // AUTO-REVIEW & CHANGE MANAGEMENT (Phase 9)
  // ============================================
  
  // Auto-Review Runs
  getAutoReviewRunsByPfmea(pfmeaId: string): Promise<AutoReviewRun[]>;
  getAutoReviewRunsByControlPlan(controlPlanId: string): Promise<AutoReviewRun[]>;
  getAutoReviewRunById(id: string): Promise<AutoReviewRun | undefined>;
  createAutoReviewRun(insertRun: InsertAutoReviewRun): Promise<AutoReviewRun>;
  
  // Auto-Review Findings
  getAutoReviewFindingsByRun(reviewRunId: string): Promise<AutoReviewFinding[]>;
  createAutoReviewFinding(insertFinding: InsertAutoReviewFinding): Promise<AutoReviewFinding>;
  updateAutoReviewFinding(id: string, updates: Partial<InsertAutoReviewFinding>): Promise<AutoReviewFinding | undefined>;
  
  // Change Package
  getAllChangePackages(): Promise<ChangePackage[]>;
  getChangePackageById(id: string): Promise<ChangePackage | undefined>;
  getChangePackageWithDetails(id: string): Promise<(ChangePackage & { items: ChangePackageItem[]; approvals: ChangePackageApproval[]; propagations: ChangePackagePropagation[] }) | undefined>;
  createChangePackage(insertPkg: InsertChangePackage): Promise<ChangePackage>;
  updateChangePackage(id: string, updates: Partial<InsertChangePackage>): Promise<ChangePackage | undefined>;
  deleteChangePackage(id: string): Promise<boolean>;
  
  // Change Package Items
  getChangePackageItems(changePackageId: string): Promise<ChangePackageItem[]>;
  createChangePackageItem(insertItem: InsertChangePackageItem): Promise<ChangePackageItem>;
  deleteChangePackageItem(id: string): Promise<boolean>;
  
  // Change Package Approvals
  getChangePackageApprovals(changePackageId: string): Promise<ChangePackageApproval[]>;
  createChangePackageApproval(insertApproval: InsertChangePackageApproval): Promise<ChangePackageApproval>;
  updateChangePackageApproval(id: string, updates: Partial<InsertChangePackageApproval>): Promise<ChangePackageApproval | undefined>;
  
  // Change Package Propagations
  getChangePackagePropagations(changePackageId: string): Promise<ChangePackagePropagation[]>;
  createChangePackagePropagation(insertProp: InsertChangePackagePropagation): Promise<ChangePackagePropagation>;
  updateChangePackagePropagation(id: string, updates: Partial<InsertChangePackagePropagation>): Promise<ChangePackagePropagation | undefined>;

  // ============================================
  // DOCUMENT CONTROL
  // ============================================

  // Documents
  getDocuments(filters?: { type?: string; status?: string; category?: string; search?: string }): Promise<Document[]>;
  getDocumentById(id: string): Promise<Document | undefined>;
  createDocument(data: InsertDocument): Promise<Document>;
  updateDocument(id: string, data: Partial<InsertDocument>): Promise<Document | undefined>;
  deleteDocument(id: string): Promise<boolean>;

  // Revisions
  getDocumentRevisions(documentId: string): Promise<DocumentRevision[]>;
  getRevisionById(id: string): Promise<DocumentRevision | undefined>;
  createRevision(data: InsertDocumentRevision): Promise<DocumentRevision>;
  updateRevision(id: string, data: Partial<InsertDocumentRevision>): Promise<DocumentRevision | undefined>;

  // Distribution
  getDistributions(documentId: string): Promise<DocumentDistribution[]>;
  createDistribution(data: InsertDocumentDistribution): Promise<DocumentDistribution>;
  acknowledgeDistribution(id: string): Promise<DocumentDistribution | undefined>;

  // Reviews
  getReviews(documentId: string): Promise<DocumentReview[]>;
  getPendingReviews(): Promise<DocumentReview[]>;
  getOverdueReviews(): Promise<DocumentReview[]>;
  createReview(data: InsertDocumentReview): Promise<DocumentReview>;
  updateReview(id: string, data: Partial<InsertDocumentReview>): Promise<DocumentReview | undefined>;

  // Links
  getDocumentLinks(documentId: string): Promise<DocumentLink[]>;
  createDocumentLink(data: InsertDocumentLink): Promise<DocumentLink>;
  deleteDocumentLink(id: string): Promise<boolean>;

  // Metrics
  getDocumentMetrics(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
    overdueReviews: number;
    pendingApprovals: number;
    recentChanges: number;
  }>;

  // ============================================
  // DOCUMENT CONTROL PHASE 2: File, Template, Workflow, Checkout
  // ============================================

  // Document Files
  getDocumentFiles(orgId: string, documentId: string): Promise<DocumentFile[]>;
  getDocumentFilesByRevision(revisionId: string): Promise<DocumentFile[]>;
  getDocumentFile(id: number): Promise<DocumentFile | undefined>;
  getDocumentFileByChecksum(checksum: string, documentId: string): Promise<DocumentFile | undefined>;
  createDocumentFile(data: InsertDocumentFile): Promise<DocumentFile>;
  updateDocumentFile(id: number, data: Partial<InsertDocumentFile>): Promise<DocumentFile | undefined>;
  deleteDocumentFile(id: number): Promise<void>;
  searchDocumentsByText(searchText: string): Promise<DocumentFile[]>;

  // Document Templates
  getDocumentTemplates(orgId: string, status?: string): Promise<DocumentTemplate[]>;
  getDocumentTemplate(id: number): Promise<DocumentTemplate | undefined>;
  getDocumentTemplateByCode(code: string): Promise<DocumentTemplate | undefined>;
  getDocumentTemplatesByType(orgId: string, docType: string): Promise<DocumentTemplate[]>;
  createDocumentTemplate(data: InsertDocumentTemplate): Promise<DocumentTemplate>;
  updateDocumentTemplate(id: number, data: Partial<InsertDocumentTemplate>): Promise<DocumentTemplate | undefined>;
  deleteDocumentTemplate(id: number): Promise<void>;

  // Approval Workflow Definitions
  getApprovalWorkflowDefinitions(orgId: string, status?: string): Promise<ApprovalWorkflowDefinition[]>;
  getApprovalWorkflowDefinition(id: number): Promise<ApprovalWorkflowDefinition | undefined>;
  getApprovalWorkflowDefinitionByCode(code: string): Promise<ApprovalWorkflowDefinition | undefined>;
  getWorkflowDefinitionForDocType(orgId: string, docType: string): Promise<ApprovalWorkflowDefinition | undefined>;
  createApprovalWorkflowDefinition(data: InsertApprovalWorkflowDefinition): Promise<ApprovalWorkflowDefinition>;
  updateApprovalWorkflowDefinition(id: number, data: Partial<InsertApprovalWorkflowDefinition>): Promise<ApprovalWorkflowDefinition | undefined>;
  deleteApprovalWorkflowDefinition(id: number): Promise<void>;

  // Approval Workflow Instances
  getApprovalWorkflowInstances(orgId: string, documentId?: string, status?: string): Promise<ApprovalWorkflowInstance[]>;
  getApprovalWorkflowInstance(id: number): Promise<ApprovalWorkflowInstance | undefined>;
  getActiveWorkflowForDocument(documentId: string): Promise<ApprovalWorkflowInstance | undefined>;
  createApprovalWorkflowInstance(data: InsertApprovalWorkflowInstance): Promise<ApprovalWorkflowInstance>;
  updateApprovalWorkflowInstance(id: number, data: Partial<InsertApprovalWorkflowInstance>): Promise<ApprovalWorkflowInstance | undefined>;
  deleteApprovalWorkflowInstance(id: number): Promise<void>;

  // Approval Workflow Steps
  getApprovalWorkflowSteps(instanceId: number): Promise<ApprovalWorkflowStep[]>;
  getApprovalWorkflowStep(id: number): Promise<ApprovalWorkflowStep | undefined>;
  getPendingStepsForUser(userId: string): Promise<ApprovalWorkflowStep[]>;
  getOverdueSteps(): Promise<ApprovalWorkflowStep[]>;
  createApprovalWorkflowStep(data: InsertApprovalWorkflowStep): Promise<ApprovalWorkflowStep>;
  updateApprovalWorkflowStep(id: number, data: Partial<InsertApprovalWorkflowStep>): Promise<ApprovalWorkflowStep | undefined>;
  deleteApprovalWorkflowStep(id: number): Promise<void>;

  // Document Checkouts
  getDocumentCheckouts(orgId: string, documentId?: string, status?: string): Promise<DocumentCheckout[]>;
  getDocumentCheckout(id: number): Promise<DocumentCheckout | undefined>;
  getActiveCheckout(documentId: string): Promise<DocumentCheckout | undefined>;
  getCheckoutsByUser(orgId: string, userId: string): Promise<DocumentCheckout[]>;
  getAllActiveCheckouts(orgId: string): Promise<DocumentCheckout[]>;
  createDocumentCheckout(data: InsertDocumentCheckout): Promise<DocumentCheckout>;
  updateDocumentCheckout(id: number, data: Partial<InsertDocumentCheckout>): Promise<DocumentCheckout | undefined>;
  deleteDocumentCheckout(id: number): Promise<void>;

  // Distribution Lists
  getDistributionLists(orgId: string, status?: string): Promise<DistributionList[]>;
  getDistributionList(id: number): Promise<DistributionList | undefined>;
  getDistributionListByCode(code: string): Promise<DistributionList | undefined>;
  createDistributionList(data: InsertDistributionList): Promise<DistributionList>;
  updateDistributionList(id: number, data: Partial<InsertDistributionList>): Promise<DistributionList | undefined>;
  deleteDistributionList(id: number): Promise<void>;

  // Document Distribution Records
  getDocumentDistributionRecords(orgId: string, documentId?: string, status?: string): Promise<DocumentDistributionRecord[]>;
  getDocumentDistributionRecord(id: number): Promise<DocumentDistributionRecord | undefined>;
  getPendingAcknowledgments(orgId: string, userId: string): Promise<DocumentDistributionRecord[]>;
  getOverdueAcknowledgments(orgId: string): Promise<DocumentDistributionRecord[]>;
  createDocumentDistributionRecord(data: InsertDocumentDistributionRecord): Promise<DocumentDistributionRecord>;
  updateDocumentDistributionRecord(id: number, data: Partial<InsertDocumentDistributionRecord>): Promise<DocumentDistributionRecord | undefined>;
  deleteDocumentDistributionRecord(id: number): Promise<void>;

  // Document Access Logs (immutable - no update/delete)
  getDocumentAccessLogs(orgId: string, documentId?: string, action?: string, limit?: number): Promise<DocumentAccessLog[]>;
  getDocumentAccessLogsByUser(orgId: string, userId: string, limit?: number): Promise<DocumentAccessLog[]>;
  getDocumentAccessLogsByDateRange(orgId: string, startDate: Date, endDate: Date): Promise<DocumentAccessLog[]>;
  createDocumentAccessLog(data: InsertDocumentAccessLog): Promise<DocumentAccessLog>;
  getAccessLogStats(orgId: string, documentId: string): Promise<{ action: string; count: number }[]>;

  // Document Print Logs
  getDocumentPrintLogs(orgId: string, documentId?: string): Promise<DocumentPrintLog[]>;
  getDocumentPrintLog(id: number): Promise<DocumentPrintLog | undefined>;
  getUnrecalledPrintLogs(orgId: string, documentId: string): Promise<DocumentPrintLog[]>;
  createDocumentPrintLog(data: InsertDocumentPrintLog): Promise<DocumentPrintLog>;
  updateDocumentPrintLog(id: number, data: Partial<InsertDocumentPrintLog>): Promise<DocumentPrintLog | undefined>;
  getNextCopyNumber(documentId: string): Promise<number>;

  // Document Comments
  getDocumentComments(orgId: string, documentId: string, includeDeleted?: boolean): Promise<DocumentComment[]>;
  getDocumentComment(id: number): Promise<DocumentComment | undefined>;
  getCommentThread(parentId: number): Promise<DocumentComment[]>;
  getUnresolvedComments(orgId: string, documentId: string): Promise<DocumentComment[]>;
  createDocumentComment(data: InsertDocumentComment): Promise<DocumentComment>;
  updateDocumentComment(id: number, data: Partial<InsertDocumentComment>): Promise<DocumentComment | undefined>;
  softDeleteDocumentComment(id: number): Promise<void>;
  resolveCommentThread(id: number, resolvedBy: string): Promise<DocumentComment | undefined>;

  // External Documents
  getExternalDocuments(orgId: string, source?: string, status?: string): Promise<ExternalDocument[]>;
  getExternalDocument(id: number): Promise<ExternalDocument | undefined>;
  getExternalDocumentByNumber(docNumber: string): Promise<ExternalDocument | undefined>;
  getExternalDocumentsWithUpdates(orgId: string): Promise<ExternalDocument[]>;
  createExternalDocument(data: InsertExternalDocument): Promise<ExternalDocument>;
  updateExternalDocument(id: number, data: Partial<InsertExternalDocument>): Promise<ExternalDocument | undefined>;
  deleteExternalDocument(id: number): Promise<void>;

  // Document Links Enhanced
  getDocumentLinksFrom(orgId: string, sourceDocumentId: string): Promise<DocumentLinkEnhanced[]>;
  getDocumentLinksTo(orgId: string, targetType: string, targetId: number): Promise<DocumentLinkEnhanced[]>;
  getDocumentLinkEnhanced(id: number): Promise<DocumentLinkEnhanced | undefined>;
  getBrokenLinks(orgId: string): Promise<DocumentLinkEnhanced[]>;
  createDocumentLinkEnhanced(data: InsertDocumentLinkEnhanced): Promise<DocumentLinkEnhanced>;
  updateDocumentLinkEnhanced(id: number, data: Partial<InsertDocumentLinkEnhanced>): Promise<DocumentLinkEnhanced | undefined>;
  deleteDocumentLinkEnhanced(id: number): Promise<void>;
  verifyDocumentLink(id: number, verifiedBy: string): Promise<DocumentLinkEnhanced | undefined>;
  markLinkBroken(id: number, reason: string): Promise<DocumentLinkEnhanced | undefined>;
}

class DatabaseStorage implements IStorage {
  // ============================================
  // ORGANIZATION
  // ============================================

  async getOrganizationById(id: string): Promise<Organization | undefined> {
    const [org] = await db.select().from(organization).where(eq(organization.id, id));
    return org;
  }

  async getOrganizationBySlug(slug: string): Promise<Organization | undefined> {
    const [org] = await db.select().from(organization).where(eq(organization.slug, slug));
    return org;
  }

  async getAllOrganizations(): Promise<Organization[]> {
    return db.select().from(organization);
  }

  async createOrganization(data: InsertOrganization): Promise<Organization> {
    const [org] = await db.insert(organization).values(data as any).returning();
    return org;
  }

  async updateOrganization(id: string, data: Partial<InsertOrganization>): Promise<Organization | undefined> {
    const [updated] = await db.update(organization)
      .set({ ...data, updatedAt: new Date() } as any)
      .where(eq(organization.id, id))
      .returning();
    return updated;
  }

  // ============================================
  // USER
  // ============================================

  async getUserById(id: string): Promise<User | undefined> {
    const [u] = await db.select().from(user).where(eq(user.id, id));
    return u;
  }

  async getUserByEmail(orgId: string, email: string): Promise<User | undefined> {
    const [u] = await db.select().from(user)
      .where(and(eq(user.orgId, orgId), eq(user.email, email.toLowerCase())));
    return u;
  }

  async getUsersByOrgId(orgId: string): Promise<User[]> {
    return db.select().from(user).where(eq(user.orgId, orgId));
  }

  async createUser(data: InsertUser): Promise<User> {
    const [u] = await db.insert(user).values({
      ...data,
      email: data.email.toLowerCase(),
    }).returning();
    return u;
  }

  async updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined> {
    const updateData: any = { ...data, updatedAt: new Date() };
    if (data.email) updateData.email = data.email.toLowerCase();
    const [updated] = await db.update(user)
      .set(updateData)
      .where(eq(user.id, id))
      .returning();
    return updated;
  }

  async updateUserLastLogin(id: string): Promise<void> {
    await db.update(user)
      .set({ lastLoginAt: new Date(), updatedAt: new Date() } as any)
      .where(eq(user.id, id));
  }

  // ============================================
  // SESSION
  // ============================================

  async getSessionByToken(token: string): Promise<(Session & { user: User & { organization: Organization } }) | undefined> {
    const result = await db.query.session.findFirst({
      where: and(
        eq(session.token, token),
        sql`${session.expiresAt} > NOW()`
      ),
      with: {
        user: {
          with: {
            organization: true,
          },
        },
      },
    });
    return result as any;
  }

  async createSession(data: InsertSession): Promise<Session> {
    const [s] = await db.insert(session).values(data).returning();
    return s;
  }

  async deleteSession(token: string): Promise<void> {
    await db.delete(session).where(eq(session.token, token));
  }

  async deleteExpiredSessions(): Promise<number> {
    const result = await db.delete(session)
      .where(sql`${session.expiresAt} <= NOW()`)
      .returning();
    return result.length;
  }

  async deleteUserSessions(userId: string): Promise<void> {
    await db.delete(session).where(eq(session.userId, userId));
  }

  // ============================================
  // PARTS
  // ============================================

  // Parts
  async getAllParts(orgId?: string): Promise<Part[]> {
    if (orgId) {
      return await db.select().from(part).where(eq(part.orgId, orgId)).orderBy(desc(part.partNumber));
    }
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
  async getAllProcesses(orgId?: string): Promise<ProcessDef[]> {
    if (orgId) {
      return await db.select().from(processDef).where(eq(processDef.orgId, orgId)).orderBy(desc(processDef.createdAt));
    }
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

  async getPFMEARows(pfmeaId: string): Promise<PFMEARow[]> {
    return await db.select().from(pfmeaRow).where(eq(pfmeaRow.pfmeaId, pfmeaId));
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

  // Part Process Mappings - derived from PFMEAs and their template rows
  async getPartProcessMappings(partId: string): Promise<{ id: string; processDefId: string; processName: string; processRev: string; sequence: number }[]> {
    // Get all PFMEAs for the part
    const partPfmeas = await db.select().from(pfmea).where(eq(pfmea.partId, partId));
    
    if (partPfmeas.length === 0) {
      return [];
    }
    
    // Get unique process definitions used in PFMEAs via template rows
    const pfmeaIds = partPfmeas.map(p => p.id);
    const rows = await db.select().from(pfmeaRow)
      .where(inArray(pfmeaRow.pfmeaId, pfmeaIds));
    
    // Get unique template row IDs that have parent templates
    const templateRowIds = [...new Set(rows.filter(r => r.parentTemplateRowId).map(r => r.parentTemplateRowId as string))];
    
    if (templateRowIds.length === 0) {
      return [];
    }
    
    // Get the template rows to find process definitions
    const templateRows = await db.select().from(fmeaTemplateRow)
      .where(inArray(fmeaTemplateRow.id, templateRowIds));
    
    // Get unique process definition IDs
    const processDefIds = [...new Set(templateRows.map(r => r.processDefId))];
    
    if (processDefIds.length === 0) {
      return [];
    }
    
    // Get the process definitions
    const processes = await db.select().from(processDef)
      .where(inArray(processDef.id, processDefIds))
      .orderBy(processDef.name);
    
    // Return the mappings with sequence based on order
    return processes.map((p, index) => ({
      id: `${partId}-${p.id}`,
      processDefId: p.id,
      processName: p.name,
      processRev: p.rev,
      sequence: index + 1
    }));
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

  async getControlPlanRows(controlPlanId: string): Promise<ControlPlanRow[]> {
    return await db.select().from(controlPlanRow).where(eq(controlPlanRow.controlPlanId, controlPlanId));
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
  async getAllEquipment(orgId?: string): Promise<EquipmentLibrary[]> {
    if (orgId) {
      return await db.select().from(equipmentLibrary).where(eq(equipmentLibrary.orgId, orgId)).orderBy(equipmentLibrary.name);
    }
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
  async getAllFailureModes(filters?: { orgId?: string; category?: FailureModeCategory; search?: string; status?: string }): Promise<FailureModesLibrary[]> {
    const conditions = [];

    if (filters?.orgId) {
      conditions.push(eq(failureModesLibrary.orgId, filters.orgId));
    }

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
  async getAllControls(filters?: { orgId?: string; type?: ControlType; effectiveness?: ControlEffectiveness; search?: string; status?: string }): Promise<ControlsLibrary[]> {
    const conditions = [];

    if (filters?.orgId) {
      conditions.push(eq(controlsLibrary.orgId, filters.orgId));
    }

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
  // AUTO-REVIEW & CHANGE MANAGEMENT (Phase 9)
  // ============================================

  // Auto-Review Runs
  async getAutoReviewRunsByPfmea(pfmeaId: string): Promise<AutoReviewRun[]> {
    return await db.select().from(autoReviewRun)
      .where(eq(autoReviewRun.pfmeaId, pfmeaId))
      .orderBy(desc(autoReviewRun.runAt));
  }

  async getAutoReviewRunsByControlPlan(controlPlanId: string): Promise<AutoReviewRun[]> {
    return await db.select().from(autoReviewRun)
      .where(eq(autoReviewRun.controlPlanId, controlPlanId))
      .orderBy(desc(autoReviewRun.runAt));
  }

  async getAutoReviewRunById(id: string): Promise<AutoReviewRun | undefined> {
    const [result] = await db.select().from(autoReviewRun).where(eq(autoReviewRun.id, id));
    return result;
  }

  async createAutoReviewRun(insertRun: InsertAutoReviewRun): Promise<AutoReviewRun> {
    const [newRun] = await db.insert(autoReviewRun).values(insertRun as any).returning();
    return newRun;
  }

  // Auto-Review Findings
  async getAutoReviewFindingsByRun(reviewRunId: string): Promise<AutoReviewFinding[]> {
    return await db.select().from(autoReviewFinding)
      .where(eq(autoReviewFinding.reviewRunId, reviewRunId));
  }

  async createAutoReviewFinding(insertFinding: InsertAutoReviewFinding): Promise<AutoReviewFinding> {
    const [newFinding] = await db.insert(autoReviewFinding).values(insertFinding as any).returning();
    return newFinding;
  }

  async updateAutoReviewFinding(id: string, updates: Partial<InsertAutoReviewFinding>): Promise<AutoReviewFinding | undefined> {
    const [updated] = await db.update(autoReviewFinding).set(updates as any).where(eq(autoReviewFinding.id, id)).returning();
    return updated;
  }

  // Change Package
  async getAllChangePackages(): Promise<ChangePackage[]> {
    return await db.select().from(changePackage).orderBy(desc(changePackage.initiatedAt));
  }

  async getChangePackageById(id: string): Promise<ChangePackage | undefined> {
    const [result] = await db.select().from(changePackage).where(eq(changePackage.id, id));
    return result;
  }

  async getChangePackageWithDetails(id: string): Promise<(ChangePackage & { items: ChangePackageItem[]; approvals: ChangePackageApproval[]; propagations: ChangePackagePropagation[] }) | undefined> {
    const [pkg] = await db.select().from(changePackage).where(eq(changePackage.id, id));
    if (!pkg) return undefined;

    const items = await db.select().from(changePackageItem)
      .where(eq(changePackageItem.changePackageId, id));
    const approvals = await db.select().from(changePackageApproval)
      .where(eq(changePackageApproval.changePackageId, id));
    const propagations = await db.select().from(changePackagePropagation)
      .where(eq(changePackagePropagation.changePackageId, id));

    return { ...pkg, items, approvals, propagations };
  }

  async createChangePackage(insertPkg: InsertChangePackage): Promise<ChangePackage> {
    const [newPkg] = await db.insert(changePackage).values(insertPkg as any).returning();
    return newPkg;
  }

  async updateChangePackage(id: string, updates: Partial<InsertChangePackage>): Promise<ChangePackage | undefined> {
    const [updated] = await db.update(changePackage)
      .set(updates as any)
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

  async deleteChangePackageItem(id: string): Promise<boolean> {
    const result = await db.delete(changePackageItem).where(eq(changePackageItem.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Change Package Approvals
  async getChangePackageApprovals(changePackageId: string): Promise<ChangePackageApproval[]> {
    return await db.select().from(changePackageApproval)
      .where(eq(changePackageApproval.changePackageId, changePackageId));
  }

  async createChangePackageApproval(insertApproval: InsertChangePackageApproval): Promise<ChangePackageApproval> {
    const [newApproval] = await db.insert(changePackageApproval).values(insertApproval as any).returning();
    return newApproval;
  }

  async updateChangePackageApproval(id: string, updates: Partial<InsertChangePackageApproval>): Promise<ChangePackageApproval | undefined> {
    const [updated] = await db.update(changePackageApproval).set(updates as any).where(eq(changePackageApproval.id, id)).returning();
    return updated;
  }

  // Change Package Propagations
  async getChangePackagePropagations(changePackageId: string): Promise<ChangePackagePropagation[]> {
    return await db.select().from(changePackagePropagation)
      .where(eq(changePackagePropagation.changePackageId, changePackageId));
  }

  async createChangePackagePropagation(insertProp: InsertChangePackagePropagation): Promise<ChangePackagePropagation> {
    const [newProp] = await db.insert(changePackagePropagation).values(insertProp as any).returning();
    return newProp;
  }

  async updateChangePackagePropagation(id: string, updates: Partial<InsertChangePackagePropagation>): Promise<ChangePackagePropagation | undefined> {
    const [updated] = await db.update(changePackagePropagation).set(updates as any).where(eq(changePackagePropagation.id, id)).returning();
    return updated;
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  async generateChangePackageNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const existing = await db.select().from(changePackage)
      .where(sql`${changePackage.packageNumber} LIKE ${'CP-' + year + '-%'}`)
      .orderBy(desc(changePackage.initiatedAt));
    const nextNum = existing.length + 1;
    return `CP-${year}-${String(nextNum).padStart(3, '0')}`;
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
    const steps = await db.select().from(pfdStep).where(eq(pfdStep.pfdId, id)).orderBy(pfdStep.seq);
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

  async createPFDWithSteps(insertPfd: InsertPFD, steps: Omit<InsertPFDStep, 'pfdId'>[]): Promise<PFD & { steps: PFDStep[] }> {
    const createdPFD = await this.createPFD(insertPfd);
    const createdSteps: PFDStep[] = [];
    for (const step of steps) {
      const createdStep = await this.createPFDStep({ ...step, pfdId: createdPFD.id });
      createdSteps.push(createdStep);
    }
    return { ...createdPFD, steps: createdSteps };
  }

  // ============================================
  // DOCUMENT CONTROL
  // ============================================

  async getDocuments(filters?: { type?: string; status?: string; category?: string; search?: string }): Promise<Document[]> {
    const conditions = [];

    if (filters?.type) {
      conditions.push(eq(document.type, filters.type as any));
    }
    if (filters?.status) {
      conditions.push(eq(document.status, filters.status as any));
    }
    if (filters?.category) {
      conditions.push(eq(document.category, filters.category));
    }
    if (filters?.search) {
      conditions.push(
        or(
          ilike(document.title, `%${filters.search}%`),
          ilike(document.docNumber, `%${filters.search}%`),
          ilike(document.description, `%${filters.search}%`)
        )
      );
    }

    if (conditions.length > 0) {
      return await db.select().from(document)
        .where(and(...conditions))
        .orderBy(desc(document.updatedAt));
    }

    return await db.select().from(document).orderBy(desc(document.updatedAt));
  }

  async getDocumentById(id: string): Promise<Document | undefined> {
    const [result] = await db.select().from(document).where(eq(document.id, id));
    return result;
  }

  async createDocument(data: InsertDocument): Promise<Document> {
    const [newDoc] = await db.insert(document).values(data).returning();
    return newDoc;
  }

  async updateDocument(id: string, data: Partial<InsertDocument>): Promise<Document | undefined> {
    const [updated] = await db.update(document)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(document.id, id))
      .returning();
    return updated;
  }

  async deleteDocument(id: string): Promise<boolean> {
    const result = await db.delete(document).where(eq(document.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Revisions
  async getDocumentRevisions(documentId: string): Promise<DocumentRevision[]> {
    return await db.select().from(documentRevision)
      .where(eq(documentRevision.documentId, documentId))
      .orderBy(desc(documentRevision.createdAt));
  }

  async getRevisionById(id: string): Promise<DocumentRevision | undefined> {
    const [result] = await db.select().from(documentRevision).where(eq(documentRevision.id, id));
    return result;
  }

  async createRevision(data: InsertDocumentRevision): Promise<DocumentRevision> {
    const [newRev] = await db.insert(documentRevision).values(data).returning();
    return newRev;
  }

  async updateRevision(id: string, data: Partial<InsertDocumentRevision>): Promise<DocumentRevision | undefined> {
    const [updated] = await db.update(documentRevision)
      .set(data)
      .where(eq(documentRevision.id, id))
      .returning();
    return updated;
  }

  // Distribution
  async getDistributions(documentId: string): Promise<DocumentDistribution[]> {
    return await db.select().from(documentDistribution)
      .where(eq(documentDistribution.documentId, documentId))
      .orderBy(desc(documentDistribution.distributedAt));
  }

  async createDistribution(data: InsertDocumentDistribution): Promise<DocumentDistribution> {
    const [newDist] = await db.insert(documentDistribution).values(data).returning();
    return newDist;
  }

  async acknowledgeDistribution(id: string): Promise<DocumentDistribution | undefined> {
    const [updated] = await db.update(documentDistribution)
      .set({ acknowledgedAt: new Date() })
      .where(eq(documentDistribution.id, id))
      .returning();
    return updated;
  }

  // Reviews
  async getReviews(documentId: string): Promise<DocumentReview[]> {
    return await db.select().from(documentReview)
      .where(eq(documentReview.documentId, documentId))
      .orderBy(desc(documentReview.createdAt));
  }

  async getPendingReviews(): Promise<DocumentReview[]> {
    return await db.select().from(documentReview)
      .where(eq(documentReview.status, 'pending'))
      .orderBy(documentReview.dueDate);
  }

  async getOverdueReviews(): Promise<DocumentReview[]> {
    return await db.select().from(documentReview)
      .where(and(
        eq(documentReview.status, 'pending'),
        lt(documentReview.dueDate, new Date())
      ))
      .orderBy(documentReview.dueDate);
  }

  async createReview(data: InsertDocumentReview): Promise<DocumentReview> {
    const [newReview] = await db.insert(documentReview).values(data).returning();
    return newReview;
  }

  async updateReview(id: string, data: Partial<InsertDocumentReview>): Promise<DocumentReview | undefined> {
    const [updated] = await db.update(documentReview)
      .set(data)
      .where(eq(documentReview.id, id))
      .returning();
    return updated;
  }

  // Links
  async getDocumentLinks(documentId: string): Promise<DocumentLink[]> {
    return await db.select().from(documentLink)
      .where(eq(documentLink.sourceDocId, documentId))
      .orderBy(desc(documentLink.createdAt));
  }

  async createDocumentLink(data: InsertDocumentLink): Promise<DocumentLink> {
    const [newLink] = await db.insert(documentLink).values(data).returning();
    return newLink;
  }

  async deleteDocumentLink(id: string): Promise<boolean> {
    const result = await db.delete(documentLink).where(eq(documentLink.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Metrics
  async getDocumentMetrics(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
    overdueReviews: number;
    pendingApprovals: number;
    recentChanges: number;
  }> {
    const allDocs = await db.select().from(document);
    const total = allDocs.length;

    const byStatus: Record<string, number> = {};
    const byType: Record<string, number> = {};
    for (const doc of allDocs) {
      byStatus[doc.status] = (byStatus[doc.status] || 0) + 1;
      byType[doc.type] = (byType[doc.type] || 0) + 1;
    }

    const overdueReviewsList = await this.getOverdueReviews();
    const overdueReviews = overdueReviewsList.length;

    const pendingApprovalDocs = allDocs.filter(d => d.status === 'review');
    const pendingApprovals = pendingApprovalDocs.length;

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const recentRevisions = await db.select().from(documentRevision)
      .where(sql`${documentRevision.createdAt} > ${oneWeekAgo}`);
    const recentChanges = recentRevisions.length;

    return { total, byStatus, byType, overdueReviews, pendingApprovals, recentChanges };
  }

  // ============================================
  // DOCUMENT FILES
  // ============================================

  async getDocumentFiles(orgId: string, documentId: string): Promise<DocumentFile[]> {
    return await db.select().from(documentFile)
      .where(and(eq(documentFile.orgId, orgId), eq(documentFile.documentId, documentId)))
      .orderBy(desc(documentFile.uploadedAt));
  }

  async getDocumentFilesByRevision(revisionId: string): Promise<DocumentFile[]> {
    return await db.select().from(documentFile)
      .where(eq(documentFile.revisionId, revisionId));
  }

  async getDocumentFile(id: number): Promise<DocumentFile | undefined> {
    const [result] = await db.select().from(documentFile).where(eq(documentFile.id, id));
    return result;
  }

  async getDocumentFileByChecksum(checksum: string, documentId: string): Promise<DocumentFile | undefined> {
    const [result] = await db.select().from(documentFile)
      .where(and(eq(documentFile.checksumSha256, checksum), eq(documentFile.documentId, documentId)));
    return result;
  }

  async createDocumentFile(data: InsertDocumentFile): Promise<DocumentFile> {
    const [created] = await db.insert(documentFile).values(data as any).returning();
    return created;
  }

  async updateDocumentFile(id: number, data: Partial<InsertDocumentFile>): Promise<DocumentFile | undefined> {
    const [updated] = await db.update(documentFile).set(data as any).where(eq(documentFile.id, id)).returning();
    return updated;
  }

  async deleteDocumentFile(id: number): Promise<void> {
    await db.delete(documentFile).where(eq(documentFile.id, id));
  }

  async searchDocumentsByText(searchText: string): Promise<DocumentFile[]> {
    return await db.select().from(documentFile)
      .where(ilike(documentFile.extractedText, `%${searchText}%`));
  }

  // ============================================
  // DOCUMENT TEMPLATES
  // ============================================

  async getDocumentTemplates(orgId: string, status?: string): Promise<DocumentTemplate[]> {
    const conditions = [eq(documentTemplate.orgId, orgId)];
    if (status) conditions.push(eq(documentTemplate.status, status));
    return await db.select().from(documentTemplate)
      .where(and(...conditions))
      .orderBy(documentTemplate.name);
  }

  async getDocumentTemplate(id: number): Promise<DocumentTemplate | undefined> {
    const [result] = await db.select().from(documentTemplate).where(eq(documentTemplate.id, id));
    return result;
  }

  async getDocumentTemplateByCode(code: string): Promise<DocumentTemplate | undefined> {
    const [result] = await db.select().from(documentTemplate).where(eq(documentTemplate.code, code));
    return result;
  }

  async getDocumentTemplatesByType(orgId: string, docType: string): Promise<DocumentTemplate[]> {
    return await db.select().from(documentTemplate)
      .where(and(
        eq(documentTemplate.orgId, orgId),
        eq(documentTemplate.docType, docType),
        eq(documentTemplate.status, 'active')
      ))
      .orderBy(documentTemplate.name);
  }

  async createDocumentTemplate(data: InsertDocumentTemplate): Promise<DocumentTemplate> {
    const [created] = await db.insert(documentTemplate).values(data as any).returning();
    return created;
  }

  async updateDocumentTemplate(id: number, data: Partial<InsertDocumentTemplate>): Promise<DocumentTemplate | undefined> {
    const [updated] = await db.update(documentTemplate)
      .set({ ...data, updatedAt: new Date() } as any)
      .where(eq(documentTemplate.id, id))
      .returning();
    return updated;
  }

  async deleteDocumentTemplate(id: number): Promise<void> {
    await db.delete(documentTemplate).where(eq(documentTemplate.id, id));
  }

  // ============================================
  // APPROVAL WORKFLOW DEFINITIONS
  // ============================================

  async getApprovalWorkflowDefinitions(orgId: string, status?: string): Promise<ApprovalWorkflowDefinition[]> {
    const conditions = [eq(approvalWorkflowDefinition.orgId, orgId)];
    if (status) conditions.push(eq(approvalWorkflowDefinition.status, status));
    return await db.select().from(approvalWorkflowDefinition)
      .where(and(...conditions))
      .orderBy(approvalWorkflowDefinition.name);
  }

  async getApprovalWorkflowDefinition(id: number): Promise<ApprovalWorkflowDefinition | undefined> {
    const [result] = await db.select().from(approvalWorkflowDefinition).where(eq(approvalWorkflowDefinition.id, id));
    return result;
  }

  async getApprovalWorkflowDefinitionByCode(code: string): Promise<ApprovalWorkflowDefinition | undefined> {
    const [result] = await db.select().from(approvalWorkflowDefinition).where(eq(approvalWorkflowDefinition.code, code));
    return result;
  }

  async getWorkflowDefinitionForDocType(orgId: string, docType: string): Promise<ApprovalWorkflowDefinition | undefined> {
    const defs = await db.select().from(approvalWorkflowDefinition)
      .where(and(
        eq(approvalWorkflowDefinition.orgId, orgId),
        eq(approvalWorkflowDefinition.status, 'active')
      ));
    // Find one whose appliesToDocTypes JSON array includes the docType
    return defs.find(d => {
      try {
        const types = JSON.parse(d.appliesToDocTypes || '[]');
        return types.includes(docType);
      } catch { return false; }
    });
  }

  async createApprovalWorkflowDefinition(data: InsertApprovalWorkflowDefinition): Promise<ApprovalWorkflowDefinition> {
    const [created] = await db.insert(approvalWorkflowDefinition).values(data as any).returning();
    return created;
  }

  async updateApprovalWorkflowDefinition(id: number, data: Partial<InsertApprovalWorkflowDefinition>): Promise<ApprovalWorkflowDefinition | undefined> {
    const [updated] = await db.update(approvalWorkflowDefinition)
      .set(data as any)
      .where(eq(approvalWorkflowDefinition.id, id))
      .returning();
    return updated;
  }

  async deleteApprovalWorkflowDefinition(id: number): Promise<void> {
    await db.delete(approvalWorkflowDefinition).where(eq(approvalWorkflowDefinition.id, id));
  }

  // ============================================
  // APPROVAL WORKFLOW INSTANCES
  // ============================================

  async getApprovalWorkflowInstances(orgId: string, documentId?: string, status?: string): Promise<ApprovalWorkflowInstance[]> {
    const conditions = [eq(approvalWorkflowInstance.orgId, orgId)];
    if (documentId) conditions.push(eq(approvalWorkflowInstance.documentId, documentId));
    if (status) conditions.push(eq(approvalWorkflowInstance.status, status));
    return await db.select().from(approvalWorkflowInstance)
      .where(and(...conditions))
      .orderBy(desc(approvalWorkflowInstance.startedAt));
  }

  async getApprovalWorkflowInstance(id: number): Promise<ApprovalWorkflowInstance | undefined> {
    const [result] = await db.select().from(approvalWorkflowInstance).where(eq(approvalWorkflowInstance.id, id));
    return result;
  }

  async getActiveWorkflowForDocument(documentId: string): Promise<ApprovalWorkflowInstance | undefined> {
    const [result] = await db.select().from(approvalWorkflowInstance)
      .where(and(
        eq(approvalWorkflowInstance.documentId, documentId),
        eq(approvalWorkflowInstance.status, 'active')
      ));
    return result;
  }

  async createApprovalWorkflowInstance(data: InsertApprovalWorkflowInstance): Promise<ApprovalWorkflowInstance> {
    const [created] = await db.insert(approvalWorkflowInstance).values(data as any).returning();
    return created;
  }

  async updateApprovalWorkflowInstance(id: number, data: Partial<InsertApprovalWorkflowInstance>): Promise<ApprovalWorkflowInstance | undefined> {
    const [updated] = await db.update(approvalWorkflowInstance)
      .set(data as any)
      .where(eq(approvalWorkflowInstance.id, id))
      .returning();
    return updated;
  }

  async deleteApprovalWorkflowInstance(id: number): Promise<void> {
    await db.delete(approvalWorkflowInstance).where(eq(approvalWorkflowInstance.id, id));
  }

  // ============================================
  // APPROVAL WORKFLOW STEPS
  // ============================================

  async getApprovalWorkflowSteps(instanceId: number): Promise<ApprovalWorkflowStep[]> {
    return await db.select().from(approvalWorkflowStep)
      .where(eq(approvalWorkflowStep.workflowInstanceId, instanceId))
      .orderBy(approvalWorkflowStep.stepNumber);
  }

  async getApprovalWorkflowStep(id: number): Promise<ApprovalWorkflowStep | undefined> {
    const [result] = await db.select().from(approvalWorkflowStep).where(eq(approvalWorkflowStep.id, id));
    return result;
  }

  async getPendingStepsForUser(userId: string): Promise<ApprovalWorkflowStep[]> {
    return await db.select().from(approvalWorkflowStep)
      .where(and(
        eq(approvalWorkflowStep.assignedTo, userId),
        eq(approvalWorkflowStep.status, 'pending')
      ))
      .orderBy(approvalWorkflowStep.dueDate);
  }

  async getOverdueSteps(): Promise<ApprovalWorkflowStep[]> {
    return await db.select().from(approvalWorkflowStep)
      .where(and(
        eq(approvalWorkflowStep.status, 'pending'),
        lt(approvalWorkflowStep.dueDate, new Date())
      ))
      .orderBy(approvalWorkflowStep.dueDate);
  }

  async createApprovalWorkflowStep(data: InsertApprovalWorkflowStep): Promise<ApprovalWorkflowStep> {
    const [created] = await db.insert(approvalWorkflowStep).values(data as any).returning();
    return created;
  }

  async updateApprovalWorkflowStep(id: number, data: Partial<InsertApprovalWorkflowStep>): Promise<ApprovalWorkflowStep | undefined> {
    const [updated] = await db.update(approvalWorkflowStep)
      .set(data as any)
      .where(eq(approvalWorkflowStep.id, id))
      .returning();
    return updated;
  }

  async deleteApprovalWorkflowStep(id: number): Promise<void> {
    await db.delete(approvalWorkflowStep).where(eq(approvalWorkflowStep.id, id));
  }

  // ============================================
  // DOCUMENT CHECKOUTS
  // ============================================

  async getDocumentCheckouts(orgId: string, documentId?: string, status?: string): Promise<DocumentCheckout[]> {
    const conditions = [eq(documentCheckout.orgId, orgId)];
    if (documentId) conditions.push(eq(documentCheckout.documentId, documentId));
    if (status) conditions.push(eq(documentCheckout.status, status));
    return await db.select().from(documentCheckout)
      .where(and(...conditions))
      .orderBy(desc(documentCheckout.checkedOutAt));
  }

  async getDocumentCheckout(id: number): Promise<DocumentCheckout | undefined> {
    const [result] = await db.select().from(documentCheckout).where(eq(documentCheckout.id, id));
    return result;
  }

  async getActiveCheckout(documentId: string): Promise<DocumentCheckout | undefined> {
    const [result] = await db.select().from(documentCheckout)
      .where(and(
        eq(documentCheckout.documentId, documentId),
        eq(documentCheckout.status, 'active')
      ));
    return result;
  }

  async getCheckoutsByUser(orgId: string, userId: string): Promise<DocumentCheckout[]> {
    return await db.select().from(documentCheckout)
      .where(and(
        eq(documentCheckout.orgId, orgId),
        eq(documentCheckout.checkedOutBy, userId),
        eq(documentCheckout.status, 'active')
      ));
  }

  async getAllActiveCheckouts(orgId: string): Promise<DocumentCheckout[]> {
    return await db.select().from(documentCheckout)
      .where(and(
        eq(documentCheckout.orgId, orgId),
        eq(documentCheckout.status, 'active')
      ))
      .orderBy(desc(documentCheckout.checkedOutAt));
  }

  async createDocumentCheckout(data: InsertDocumentCheckout): Promise<DocumentCheckout> {
    const [created] = await db.insert(documentCheckout).values(data as any).returning();
    return created;
  }

  async updateDocumentCheckout(id: number, data: Partial<InsertDocumentCheckout>): Promise<DocumentCheckout | undefined> {
    const [updated] = await db.update(documentCheckout)
      .set(data as any)
      .where(eq(documentCheckout.id, id))
      .returning();
    return updated;
  }

  async deleteDocumentCheckout(id: number): Promise<void> {
    await db.delete(documentCheckout).where(eq(documentCheckout.id, id));
  }

  // ============================================
  // DISTRIBUTION LISTS
  // ============================================

  async getDistributionLists(orgId: string, status?: string): Promise<DistributionList[]> {
    const conditions = [eq(distributionList.orgId, orgId)];
    if (status) conditions.push(eq(distributionList.status, status));
    return db.select().from(distributionList).where(and(...conditions));
  }

  async getDistributionList(id: number): Promise<DistributionList | undefined> {
    const [result] = await db.select().from(distributionList).where(eq(distributionList.id, id));
    return result;
  }

  async getDistributionListByCode(code: string): Promise<DistributionList | undefined> {
    const [result] = await db.select().from(distributionList).where(eq(distributionList.code, code));
    return result;
  }

  async createDistributionList(data: InsertDistributionList): Promise<DistributionList> {
    const [created] = await db.insert(distributionList).values(data as any).returning();
    return created;
  }

  async updateDistributionList(id: number, data: Partial<InsertDistributionList>): Promise<DistributionList | undefined> {
    const [updated] = await db.update(distributionList)
      .set({ ...data, updatedAt: new Date() } as any)
      .where(eq(distributionList.id, id))
      .returning();
    return updated;
  }

  async deleteDistributionList(id: number): Promise<void> {
    await db.delete(distributionList).where(eq(distributionList.id, id));
  }

  // ============================================
  // DOCUMENT DISTRIBUTION RECORDS
  // ============================================

  async getDocumentDistributionRecords(orgId: string, documentId?: string, status?: string): Promise<DocumentDistributionRecord[]> {
    const conditions = [eq(documentDistributionRecord.orgId, orgId)];
    if (documentId) conditions.push(eq(documentDistributionRecord.documentId, documentId));
    if (status) conditions.push(eq(documentDistributionRecord.status, status));
    return db.select().from(documentDistributionRecord).where(and(...conditions));
  }

  async getDocumentDistributionRecord(id: number): Promise<DocumentDistributionRecord | undefined> {
    const [result] = await db.select().from(documentDistributionRecord).where(eq(documentDistributionRecord.id, id));
    return result;
  }

  async getPendingAcknowledgments(orgId: string, userId: string): Promise<DocumentDistributionRecord[]> {
    return db.select().from(documentDistributionRecord)
      .where(and(
        eq(documentDistributionRecord.orgId, orgId),
        eq(documentDistributionRecord.recipientUserId, userId),
        eq(documentDistributionRecord.requiresAcknowledgment, 1),
        isNull(documentDistributionRecord.acknowledgedAt),
        eq(documentDistributionRecord.status, 'distributed')
      ));
  }

  async getOverdueAcknowledgments(orgId: string): Promise<DocumentDistributionRecord[]> {
    return db.select().from(documentDistributionRecord)
      .where(and(
        eq(documentDistributionRecord.orgId, orgId),
        eq(documentDistributionRecord.requiresAcknowledgment, 1),
        isNull(documentDistributionRecord.acknowledgedAt),
        eq(documentDistributionRecord.status, 'distributed'),
        lt(documentDistributionRecord.acknowledgmentDueDate, new Date())
      ));
  }

  async createDocumentDistributionRecord(data: InsertDocumentDistributionRecord): Promise<DocumentDistributionRecord> {
    const [created] = await db.insert(documentDistributionRecord).values(data as any).returning();
    return created;
  }

  async updateDocumentDistributionRecord(id: number, data: Partial<InsertDocumentDistributionRecord>): Promise<DocumentDistributionRecord | undefined> {
    const [updated] = await db.update(documentDistributionRecord)
      .set(data as any)
      .where(eq(documentDistributionRecord.id, id))
      .returning();
    return updated;
  }

  async deleteDocumentDistributionRecord(id: number): Promise<void> {
    await db.delete(documentDistributionRecord).where(eq(documentDistributionRecord.id, id));
  }

  // ============================================
  // DOCUMENT ACCESS LOGS (immutable - no update/delete)
  // ============================================

  async getDocumentAccessLogs(orgId: string, documentId?: string, action?: string, limit?: number): Promise<DocumentAccessLog[]> {
    const conditions = [eq(documentAccessLog.orgId, orgId)];
    if (documentId) conditions.push(eq(documentAccessLog.documentId, documentId));
    if (action) conditions.push(eq(documentAccessLog.action, action));
    let query = db.select().from(documentAccessLog).where(and(...conditions)).orderBy(desc(documentAccessLog.timestamp));
    if (limit) return (query as any).limit(limit);
    return query;
  }

  async getDocumentAccessLogsByUser(orgId: string, userId: string, limit?: number): Promise<DocumentAccessLog[]> {
    let query = db.select().from(documentAccessLog)
      .where(and(eq(documentAccessLog.orgId, orgId), eq(documentAccessLog.userId, userId)))
      .orderBy(desc(documentAccessLog.timestamp));
    if (limit) return (query as any).limit(limit);
    return query;
  }

  async getDocumentAccessLogsByDateRange(orgId: string, startDate: Date, endDate: Date): Promise<DocumentAccessLog[]> {
    return db.select().from(documentAccessLog)
      .where(and(
        eq(documentAccessLog.orgId, orgId),
        gte(documentAccessLog.timestamp, startDate),
        lte(documentAccessLog.timestamp, endDate)
      ))
      .orderBy(desc(documentAccessLog.timestamp));
  }

  async createDocumentAccessLog(data: InsertDocumentAccessLog): Promise<DocumentAccessLog> {
    const [created] = await db.insert(documentAccessLog).values(data as any).returning();
    return created;
  }

  async getAccessLogStats(orgId: string, documentId: string): Promise<{ action: string; count: number }[]> {
    const results = await db.select({
      action: documentAccessLog.action,
      count: count(),
    }).from(documentAccessLog)
      .where(and(
        eq(documentAccessLog.orgId, orgId),
        eq(documentAccessLog.documentId, documentId)
      ))
      .groupBy(documentAccessLog.action);
    return results.map(r => ({ action: r.action, count: Number(r.count) }));
  }

  // ============================================
  // DOCUMENT PRINT LOGS
  // ============================================

  async getDocumentPrintLogs(orgId: string, documentId?: string): Promise<DocumentPrintLog[]> {
    const conditions = [eq(documentPrintLog.orgId, orgId)];
    if (documentId) conditions.push(eq(documentPrintLog.documentId, documentId));
    return db.select().from(documentPrintLog).where(and(...conditions)).orderBy(desc(documentPrintLog.printedAt));
  }

  async getDocumentPrintLog(id: number): Promise<DocumentPrintLog | undefined> {
    const [result] = await db.select().from(documentPrintLog).where(eq(documentPrintLog.id, id));
    return result;
  }

  async getUnrecalledPrintLogs(orgId: string, documentId: string): Promise<DocumentPrintLog[]> {
    return db.select().from(documentPrintLog)
      .where(and(
        eq(documentPrintLog.orgId, orgId),
        eq(documentPrintLog.documentId, documentId),
        eq(documentPrintLog.allRecalled, 0)
      ));
  }

  async createDocumentPrintLog(data: InsertDocumentPrintLog): Promise<DocumentPrintLog> {
    const [created] = await db.insert(documentPrintLog).values(data as any).returning();
    return created;
  }

  async updateDocumentPrintLog(id: number, data: Partial<InsertDocumentPrintLog>): Promise<DocumentPrintLog | undefined> {
    const [updated] = await db.update(documentPrintLog)
      .set(data as any)
      .where(eq(documentPrintLog.id, id))
      .returning();
    return updated;
  }

  async getNextCopyNumber(documentId: string): Promise<number> {
    const result = await db.select({
      maxCopy: sql<number>`COALESCE(MAX(${documentPrintLog.printCopies}), 0)`,
    }).from(documentPrintLog)
      .where(eq(documentPrintLog.documentId, documentId));
    return (result[0]?.maxCopy ?? 0) + 1;
  }

  // ============================================
  // DOCUMENT COMMENTS
  // ============================================

  async getDocumentComments(orgId: string, documentId: string, includeDeleted?: boolean): Promise<DocumentComment[]> {
    const conditions = [
      eq(documentComment.orgId, orgId),
      eq(documentComment.documentId, documentId),
    ];
    if (!includeDeleted) conditions.push(isNull(documentComment.deletedAt));
    return db.select().from(documentComment).where(and(...conditions)).orderBy(documentComment.createdAt);
  }

  async getDocumentComment(id: number): Promise<DocumentComment | undefined> {
    const [result] = await db.select().from(documentComment).where(eq(documentComment.id, id));
    return result;
  }

  async getCommentThread(parentId: number): Promise<DocumentComment[]> {
    return db.select().from(documentComment)
      .where(and(
        eq(documentComment.parentCommentId, parentId),
        isNull(documentComment.deletedAt)
      ))
      .orderBy(documentComment.createdAt);
  }

  async getUnresolvedComments(orgId: string, documentId: string): Promise<DocumentComment[]> {
    return db.select().from(documentComment)
      .where(and(
        eq(documentComment.orgId, orgId),
        eq(documentComment.documentId, documentId),
        isNull(documentComment.parentCommentId),
        eq(documentComment.threadResolved, 0),
        isNull(documentComment.deletedAt)
      ))
      .orderBy(documentComment.createdAt);
  }

  async createDocumentComment(data: InsertDocumentComment): Promise<DocumentComment> {
    const [created] = await db.insert(documentComment).values(data as any).returning();
    return created;
  }

  async updateDocumentComment(id: number, data: Partial<InsertDocumentComment>): Promise<DocumentComment | undefined> {
    const [updated] = await db.update(documentComment)
      .set({ ...data, updatedAt: new Date() } as any)
      .where(eq(documentComment.id, id))
      .returning();
    return updated;
  }

  async softDeleteDocumentComment(id: number): Promise<void> {
    await db.update(documentComment)
      .set({ deletedAt: new Date() } as any)
      .where(eq(documentComment.id, id));
  }

  async resolveCommentThread(id: number, resolvedBy: string): Promise<DocumentComment | undefined> {
    const [updated] = await db.update(documentComment)
      .set({ threadResolved: 1, resolvedBy, resolvedAt: new Date() } as any)
      .where(eq(documentComment.id, id))
      .returning();
    return updated;
  }

  // ============================================
  // EXTERNAL DOCUMENTS
  // ============================================

  async getExternalDocuments(orgId: string, source?: string, status?: string): Promise<ExternalDocument[]> {
    const conditions = [eq(externalDocument.orgId, orgId)];
    if (source) conditions.push(eq(externalDocument.source, source));
    if (status) conditions.push(eq(externalDocument.status, status));
    return db.select().from(externalDocument).where(and(...conditions));
  }

  async getExternalDocument(id: number): Promise<ExternalDocument | undefined> {
    const [result] = await db.select().from(externalDocument).where(eq(externalDocument.id, id));
    return result;
  }

  async getExternalDocumentByNumber(docNumber: string): Promise<ExternalDocument | undefined> {
    const [result] = await db.select().from(externalDocument).where(eq(externalDocument.docNumber, docNumber));
    return result;
  }

  async getExternalDocumentsWithUpdates(orgId: string): Promise<ExternalDocument[]> {
    return db.select().from(externalDocument)
      .where(and(
        eq(externalDocument.orgId, orgId),
        eq(externalDocument.updateAvailable, 1)
      ));
  }

  async createExternalDocument(data: InsertExternalDocument): Promise<ExternalDocument> {
    const [created] = await db.insert(externalDocument).values(data as any).returning();
    return created;
  }

  async updateExternalDocument(id: number, data: Partial<InsertExternalDocument>): Promise<ExternalDocument | undefined> {
    const [updated] = await db.update(externalDocument)
      .set({ ...data, updatedAt: new Date() } as any)
      .where(eq(externalDocument.id, id))
      .returning();
    return updated;
  }

  async deleteExternalDocument(id: number): Promise<void> {
    await db.delete(externalDocument).where(eq(externalDocument.id, id));
  }

  // ============================================
  // DOCUMENT LINKS ENHANCED
  // ============================================

  async getDocumentLinksFrom(orgId: string, sourceDocumentId: string): Promise<DocumentLinkEnhanced[]> {
    return db.select().from(documentLinkEnhanced)
      .where(and(
        eq(documentLinkEnhanced.orgId, orgId),
        eq(documentLinkEnhanced.sourceDocumentId, sourceDocumentId)
      ));
  }

  async getDocumentLinksTo(orgId: string, targetType: string, targetId: number): Promise<DocumentLinkEnhanced[]> {
    return db.select().from(documentLinkEnhanced)
      .where(and(
        eq(documentLinkEnhanced.orgId, orgId),
        eq(documentLinkEnhanced.targetType, targetType),
        eq(documentLinkEnhanced.targetId, targetId)
      ));
  }

  async getDocumentLinkEnhanced(id: number): Promise<DocumentLinkEnhanced | undefined> {
    const [result] = await db.select().from(documentLinkEnhanced).where(eq(documentLinkEnhanced.id, id));
    return result;
  }

  async getBrokenLinks(orgId: string): Promise<DocumentLinkEnhanced[]> {
    return db.select().from(documentLinkEnhanced)
      .where(and(
        eq(documentLinkEnhanced.orgId, orgId),
        eq(documentLinkEnhanced.linkBroken, 1)
      ));
  }

  async createDocumentLinkEnhanced(data: InsertDocumentLinkEnhanced): Promise<DocumentLinkEnhanced> {
    const [created] = await db.insert(documentLinkEnhanced).values(data as any).returning();

    // Handle bidirectional linking
    if (data.bidirectional === 1 && data.targetType === 'internal_document') {
      // Determine reverse link type
      const reverseLinkTypes: Record<string, string> = {
        'supersedes': 'superseded_by',
        'superseded_by': 'supersedes',
        'references': 'references',
        'supports': 'supports',
        'implements': 'implements',
        'derived_from': 'derived_from',
        'related_to': 'related_to',
        'training_required': 'training_required',
        'audit_evidence': 'audit_evidence',
        'capa_evidence': 'capa_evidence',
      };
      const reverseLinkType = reverseLinkTypes[data.linkType] || data.linkType;

      // Create reverse link
      const [reverseCreated] = await db.insert(documentLinkEnhanced).values({
        orgId: data.orgId,
        sourceDocumentId: data.targetId as any, // targetId is the doc ID for internal_document
        targetType: 'internal_document',
        targetId: created.id, // point back to original
        linkType: reverseLinkType,
        linkDescription: data.linkDescription,
        bidirectional: 1,
        reverseLinkId: created.id,
        createdBy: data.createdBy,
      } as any).returning();

      // Update original link with reverse link ID
      await db.update(documentLinkEnhanced)
        .set({ reverseLinkId: reverseCreated.id } as any)
        .where(eq(documentLinkEnhanced.id, created.id));

      return { ...created, reverseLinkId: reverseCreated.id };
    }

    return created;
  }

  async updateDocumentLinkEnhanced(id: number, data: Partial<InsertDocumentLinkEnhanced>): Promise<DocumentLinkEnhanced | undefined> {
    const [updated] = await db.update(documentLinkEnhanced)
      .set(data as any)
      .where(eq(documentLinkEnhanced.id, id))
      .returning();
    return updated;
  }

  async deleteDocumentLinkEnhanced(id: number): Promise<void> {
    // Check for bidirectional - delete reverse link too
    const [link] = await db.select().from(documentLinkEnhanced).where(eq(documentLinkEnhanced.id, id));
    if (link?.reverseLinkId) {
      await db.delete(documentLinkEnhanced).where(eq(documentLinkEnhanced.id, link.reverseLinkId));
    }
    await db.delete(documentLinkEnhanced).where(eq(documentLinkEnhanced.id, id));
  }

  async verifyDocumentLink(id: number, verifiedBy: string): Promise<DocumentLinkEnhanced | undefined> {
    const [updated] = await db.update(documentLinkEnhanced)
      .set({ linkVerifiedAt: new Date(), linkVerifiedBy: verifiedBy, linkBroken: 0, linkBrokenReason: null } as any)
      .where(eq(documentLinkEnhanced.id, id))
      .returning();
    return updated;
  }

  async markLinkBroken(id: number, reason: string): Promise<DocumentLinkEnhanced | undefined> {
    const [updated] = await db.update(documentLinkEnhanced)
      .set({ linkBroken: 1, linkBrokenReason: reason } as any)
      .where(eq(documentLinkEnhanced.id, id))
      .returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();