import { storage } from "./storage";
import { db } from "./db";
import { organization, user, document, documentRevision, documentReview, approvalWorkflowDefinition, documentTemplate, documentFile, approvalWorkflowInstance, distributionList, externalDocument, documentAccessLog, documentComment } from "@shared/schema";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { eq } from "drizzle-orm";

// Helper to hash passwords
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Seed core platform data: organization and users.
 * Returns the demo org ID for use by other seed functions.
 */
async function seedCorePlatform(): Promise<{ orgId: string; adminUserId: string } | null> {
  // Check if organization already exists
  const existingOrg = await storage.getOrganizationBySlug('acme-manufacturing');
  if (existingOrg) {
    console.log("  Core platform seed data already exists, skipping.");
    // Return existing IDs for use by other seeds
    const users = await storage.getUsersByOrgId(existingOrg.id);
    const admin = users.find(u => u.role === 'admin');
    return { orgId: existingOrg.id, adminUserId: admin?.id ?? users[0]?.id ?? '' };
  }

  console.log("  Seeding Core Platform data...");

  // 1. Create demo organization
  const demoOrg = await storage.createOrganization({
    name: 'Acme Manufacturing',
    slug: 'acme-manufacturing',
    settings: {
      defaultTimezone: 'America/Detroit',
      dateFormat: 'MM/DD/YYYY',
    },
  });
  console.log(`  ✓ Created organization: ${demoOrg.name}`);

  // 2. Create demo users
  const adminPasswordHash = await hashPassword('admin123');
  const userPasswordHash = await hashPassword('user123');

  const adminUser = await storage.createUser({
    orgId: demoOrg.id,
    email: 'admin@acme.com',
    passwordHash: adminPasswordHash,
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin',
    status: 'active',
  });
  console.log(`  ✓ Created admin user: ${adminUser.email}`);

  const qmUser = await storage.createUser({
    orgId: demoOrg.id,
    email: 'quality@acme.com',
    passwordHash: userPasswordHash,
    firstName: 'Quality',
    lastName: 'Manager',
    role: 'quality_manager',
    status: 'active',
  });
  console.log(`  ✓ Created quality manager: ${qmUser.email}`);

  const engineerUser = await storage.createUser({
    orgId: demoOrg.id,
    email: 'engineer@acme.com',
    passwordHash: userPasswordHash,
    firstName: 'Process',
    lastName: 'Engineer',
    role: 'engineer',
    status: 'active',
  });
  console.log(`  ✓ Created engineer: ${engineerUser.email}`);

  console.log("  ✓ Core Platform seed data created (1 org, 3 users).");
  return { orgId: demoOrg.id, adminUserId: adminUser.id };
}

async function seedDocumentControl() {
  // Check if documents already exist
  const existing = await storage.getDocuments();
  if (existing.length > 0) {
    console.log("  Document Control seed data already exists, skipping.");
    return;
  }

  console.log("  Seeding Document Control data...");

  // Create sample documents
  const doc1 = await storage.createDocument({
    docNumber: "WI-MOL-001",
    title: "Injection Molding Work Instruction",
    type: "work_instruction",
    category: "Molding",
    department: "Manufacturing",
    currentRev: "B",
    status: "effective",
    owner: "John Smith",
    effectiveDate: new Date("2025-06-15"),
    reviewDueDate: new Date("2026-06-15"),
    reviewCycleDays: 365,
    retentionYears: 7,
    description: "Standard work instruction for injection molding operations including setup, run, and shutdown procedures.",
    isExternal: false,
    tags: ["molding", "production", "operator"],
  });

  const doc2 = await storage.createDocument({
    docNumber: "SOP-QA-010",
    title: "Incoming Material Inspection Procedure",
    type: "procedure",
    category: "Quality",
    department: "Quality Assurance",
    currentRev: "C",
    status: "effective",
    owner: "Jane Doe",
    effectiveDate: new Date("2025-03-01"),
    reviewDueDate: new Date("2026-03-01"),
    reviewCycleDays: 365,
    retentionYears: 10,
    description: "Procedure for inspecting incoming raw materials and components per IATF 16949 requirements.",
    isExternal: false,
    tags: ["quality", "inspection", "incoming"],
  });

  const doc3 = await storage.createDocument({
    docNumber: "SPEC-ENG-042",
    title: "Customer Surface Finish Specification",
    type: "customer_spec",
    category: "Engineering",
    department: "Engineering",
    currentRev: "A",
    status: "review",
    owner: "Mike Chen",
    reviewCycleDays: 730,
    retentionYears: 15,
    description: "Customer-supplied specification for surface finish requirements on exterior components.",
    isExternal: true,
    externalRef: "CUST-SF-2025-Rev3",
    tags: ["customer", "specification", "surface-finish"],
  });

  const doc4 = await storage.createDocument({
    docNumber: "FRM-QA-005",
    title: "First Article Inspection Report Template",
    type: "form",
    category: "Quality",
    department: "Quality Assurance",
    currentRev: "A",
    status: "draft",
    owner: "Sarah Lee",
    reviewCycleDays: 365,
    retentionYears: 7,
    description: "Template for conducting and documenting first article inspections per PPAP requirements.",
    isExternal: false,
    tags: ["form", "FAIR", "PPAP"],
  });

  const doc5 = await storage.createDocument({
    docNumber: "POL-QMS-001",
    title: "Quality Management System Policy",
    type: "policy",
    category: "Management",
    department: "Quality Assurance",
    currentRev: "D",
    status: "effective",
    owner: "Robert Johnson",
    effectiveDate: new Date("2024-12-01"),
    reviewDueDate: new Date("2025-12-01"),
    reviewCycleDays: 365,
    retentionYears: 20,
    description: "Overall quality management system policy document aligned with IATF 16949 and ISO 9001.",
    isExternal: false,
    tags: ["policy", "QMS", "management"],
  });

  const doc6 = await storage.createDocument({
    docNumber: "DWG-ENG-101",
    title: "Bracket Assembly Drawing",
    type: "drawing",
    category: "Engineering",
    department: "Engineering",
    currentRev: "A",
    status: "obsolete",
    owner: "Tom Wilson",
    effectiveDate: new Date("2024-01-15"),
    reviewCycleDays: 365,
    retentionYears: 7,
    description: "Engineering drawing for bracket assembly - replaced by DWG-ENG-102.",
    isExternal: false,
    tags: ["drawing", "bracket", "obsolete"],
  });

  // Create revisions for doc1
  const rev1A = await storage.createRevision({
    documentId: doc1.id,
    rev: "A",
    changeDescription: "Initial release of injection molding work instruction",
    status: "superseded",
    author: "John Smith",
    approvedBy: "Jane Doe",
    approvedAt: new Date("2025-01-10"),
    effectiveDate: new Date("2025-01-15"),
    supersededDate: new Date("2025-06-15"),
  });

  const rev1B = await storage.createRevision({
    documentId: doc1.id,
    rev: "B",
    changeDescription: "Updated startup sequence, added safety checks per audit finding #AF-2025-003",
    status: "effective",
    author: "John Smith",
    approvedBy: "Jane Doe",
    approvedAt: new Date("2025-06-10"),
    effectiveDate: new Date("2025-06-15"),
  });

  // Create revisions for doc2
  await storage.createRevision({
    documentId: doc2.id,
    rev: "A",
    changeDescription: "Initial release",
    status: "superseded",
    author: "Jane Doe",
    approvedBy: "Robert Johnson",
    approvedAt: new Date("2024-06-01"),
    effectiveDate: new Date("2024-06-15"),
    supersededDate: new Date("2024-12-01"),
  });

  await storage.createRevision({
    documentId: doc2.id,
    rev: "B",
    changeDescription: "Added AQL sampling requirements",
    status: "superseded",
    author: "Jane Doe",
    approvedBy: "Robert Johnson",
    approvedAt: new Date("2024-11-25"),
    effectiveDate: new Date("2024-12-01"),
    supersededDate: new Date("2025-03-01"),
  });

  await storage.createRevision({
    documentId: doc2.id,
    rev: "C",
    changeDescription: "Updated per customer audit findings, added traceability requirements",
    status: "effective",
    author: "Jane Doe",
    approvedBy: "Robert Johnson",
    approvedAt: new Date("2025-02-25"),
    effectiveDate: new Date("2025-03-01"),
  });

  // Create revision for doc3 (in review)
  await storage.createRevision({
    documentId: doc3.id,
    rev: "A",
    changeDescription: "Initial intake of customer specification",
    status: "review",
    author: "Mike Chen",
  });

  // Create revision for doc4 (draft)
  await storage.createRevision({
    documentId: doc4.id,
    rev: "A",
    changeDescription: "Initial draft of FAIR template",
    status: "draft",
    author: "Sarah Lee",
  });

  // Create a review request that's overdue (for doc5)
  const pastDue = new Date();
  pastDue.setDate(pastDue.getDate() - 30);
  await storage.createReview({
    documentId: doc5.id,
    reviewerName: "Robert Johnson",
    reviewerRole: "Quality Manager",
    status: "pending",
    dueDate: pastDue,
  });

  // Create a future review request
  const futureDue = new Date();
  futureDue.setDate(futureDue.getDate() + 60);
  await storage.createReview({
    documentId: doc2.id,
    reviewerName: "Jane Doe",
    reviewerRole: "Quality Engineer",
    status: "pending",
    dueDate: futureDue,
  });

  console.log("  ✓ Document Control seed data created (6 documents, 7 revisions, 2 reviews).");
}

/**
 * Seed DC Phase 2: Workflows, Templates, Sample File, Sample Completed Workflow
 */
async function seedDocumentControlPhase2() {
  // Check if workflow definitions already exist
  const demoOrg = await storage.getOrganizationBySlug('acme-manufacturing');
  if (!demoOrg) {
    console.log("  No demo org found, skipping DC Phase 2 seed.");
    return;
  }

  const existingDefs = await storage.getApprovalWorkflowDefinitions(demoOrg.id);
  if (existingDefs.length > 0) {
    console.log("  DC Phase 2 seed data already exists, skipping.");
    return;
  }

  console.log("  Seeding DC Phase 2 data...");
  const orgId = demoOrg.id;

  // Get users for references
  const users = await storage.getUsersByOrgId(orgId);
  const adminUser = users.find(u => u.role === 'admin');
  const qmUser = users.find(u => u.role === 'quality_manager');
  const engUser = users.find(u => u.role === 'engineer');

  // =============================================
  // 3 Workflow Definitions
  // =============================================

  const wfStandard = await storage.createApprovalWorkflowDefinition({
    orgId,
    name: 'Standard Document Approval',
    code: 'WF-STD-001',
    description: 'Standard 3-step approval for work instructions, procedures, and specifications',
    appliesToDocTypes: JSON.stringify(['work_instruction', 'procedure', 'specification']),
    appliesToCategories: JSON.stringify([]),
    steps: JSON.stringify([
      {
        step: 1, name: 'Author Submission', role: 'author', assigneeType: 'initiator',
        action: 'submit', required: true, canDelegate: false, dueDays: 5,
        signatureRequired: false, signatureMeaning: null,
      },
      {
        step: 2, name: 'Technical Review', role: 'reviewer', assigneeType: 'role_based',
        requiredRole: 'engineer', action: 'review', required: true, canDelegate: true, dueDays: 3,
        signatureRequired: false, signatureMeaning: null,
      },
      {
        step: 3, name: 'Quality Approval', role: 'approver', assigneeType: 'role_based',
        requiredRole: 'quality_manager', action: 'approve', required: true, canDelegate: false, dueDays: 2,
        signatureRequired: true,
        signatureMeaning: 'I approve this document for production use per company quality procedures.',
      },
    ]),
    status: 'active',
    createdBy: adminUser?.id ?? 'system',
  });
  console.log(`  ✓ Created workflow: ${wfStandard.name}`);

  const wfQuick = await storage.createApprovalWorkflowDefinition({
    orgId,
    name: 'Quick Approval',
    code: 'WF-QUICK-001',
    description: 'Single-step manager approval for forms, checklists, and records',
    appliesToDocTypes: JSON.stringify(['form', 'checklist', 'record']),
    appliesToCategories: JSON.stringify([]),
    steps: JSON.stringify([
      {
        step: 1, name: 'Manager Approval', role: 'approver', assigneeType: 'department_head',
        action: 'approve', required: true, canDelegate: true, dueDays: 2,
        signatureRequired: true,
        signatureMeaning: 'I approve this document for use.',
      },
    ]),
    status: 'active',
    createdBy: adminUser?.id ?? 'system',
  });
  console.log(`  ✓ Created workflow: ${wfQuick.name}`);

  const wfSafety = await storage.createApprovalWorkflowDefinition({
    orgId,
    name: 'Safety-Critical Approval',
    code: 'WF-SAFETY-001',
    description: '5-step approval for safety-critical specifications and drawings',
    appliesToDocTypes: JSON.stringify(['specification', 'drawing']),
    appliesToCategories: JSON.stringify(['Safety', 'Critical']),
    steps: JSON.stringify([
      {
        step: 1, name: 'Author Submission', role: 'author', assigneeType: 'initiator',
        action: 'submit', required: true, canDelegate: false, dueDays: 3,
        signatureRequired: false, signatureMeaning: null,
      },
      {
        step: 2, name: 'Peer Review', role: 'reviewer', assigneeType: 'role_based',
        requiredRole: 'engineer', action: 'review', required: true, canDelegate: false, dueDays: 3,
        signatureRequired: false, signatureMeaning: null,
      },
      {
        step: 3, name: 'Safety Review', role: 'safety_reviewer', assigneeType: 'role_based',
        requiredRole: 'safety_engineer', action: 'review', required: true, canDelegate: false, dueDays: 3,
        signatureRequired: true,
        signatureMeaning: 'I have reviewed this document for safety compliance.',
      },
      {
        step: 4, name: 'Quality Approval', role: 'approver', assigneeType: 'role_based',
        requiredRole: 'quality_manager', action: 'approve', required: true, canDelegate: false, dueDays: 2,
        signatureRequired: true,
        signatureMeaning: 'I approve this safety-critical document per quality procedures.',
      },
      {
        step: 5, name: 'Plant Manager Approval', role: 'final_approver', assigneeType: 'role_based',
        requiredRole: 'plant_manager', action: 'approve', required: true, canDelegate: false, dueDays: 2,
        signatureRequired: true,
        signatureMeaning: 'I give final approval for this safety-critical document.',
      },
    ]),
    status: 'active',
    createdBy: adminUser?.id ?? 'system',
  });
  console.log(`  ✓ Created workflow: ${wfSafety.name}`);

  // =============================================
  // 4 Document Templates
  // =============================================

  const tmplWI = await storage.createDocumentTemplate({
    orgId,
    name: 'Work Instruction Template',
    code: 'TMPL-WI-001',
    description: 'Standard template for manufacturing work instructions',
    docType: 'work_instruction',
    category: 'Production',
    department: 'Manufacturing',
    fieldMappings: JSON.stringify([
      { field: 'doc_number', source: 'auto_generate', format: 'WI-{department}-{seq:4}' },
      { field: 'revision', source: 'auto_increment', format: 'A' },
      { field: 'effective_date', source: 'current_date', format: 'YYYY-MM-DD' },
      { field: 'part_number', source: 'linked.part.partNumber' },
      { field: 'process_name', source: 'linked.process.name' },
    ]),
    version: '1',
    status: 'active',
    defaultWorkflowId: wfStandard.id,
    defaultReviewCycleDays: 365,
    createdBy: adminUser?.id ?? 'system',
  });
  console.log(`  ✓ Created template: ${tmplWI.name}`);

  const tmplProc = await storage.createDocumentTemplate({
    orgId,
    name: 'Procedure Template',
    code: 'TMPL-PROC-001',
    description: 'Standard template for quality procedures',
    docType: 'procedure',
    category: 'Quality',
    department: 'Quality',
    fieldMappings: JSON.stringify([
      { field: 'doc_number', source: 'auto_generate', format: 'SOP-{department}-{seq:3}' },
      { field: 'revision', source: 'auto_increment', format: 'A' },
      { field: 'effective_date', source: 'current_date', format: 'YYYY-MM-DD' },
    ]),
    version: '1',
    status: 'active',
    defaultWorkflowId: wfStandard.id,
    defaultReviewCycleDays: 730,
    createdBy: adminUser?.id ?? 'system',
  });
  console.log(`  ✓ Created template: ${tmplProc.name}`);

  const tmplChk = await storage.createDocumentTemplate({
    orgId,
    name: 'Inspection Checklist Template',
    code: 'TMPL-CHK-001',
    description: 'Template for quality inspection checklists',
    docType: 'checklist',
    category: 'Quality',
    department: 'Quality',
    fieldMappings: JSON.stringify([
      { field: 'doc_number', source: 'auto_generate', format: 'CHK-{department}-{seq:3}' },
      { field: 'revision', source: 'auto_increment', format: 'A' },
    ]),
    version: '1',
    status: 'active',
    defaultWorkflowId: wfQuick.id,
    defaultReviewCycleDays: 365,
    createdBy: qmUser?.id ?? 'system',
  });
  console.log(`  ✓ Created template: ${tmplChk.name}`);

  const tmplSpec = await storage.createDocumentTemplate({
    orgId,
    name: 'Product Specification Template',
    code: 'TMPL-SPEC-001',
    description: 'Template for engineering product specifications',
    docType: 'specification',
    category: 'Engineering',
    department: 'Engineering',
    fieldMappings: JSON.stringify([
      { field: 'doc_number', source: 'auto_generate', format: 'SPEC-{department}-{seq:3}' },
      { field: 'revision', source: 'auto_increment', format: 'A' },
      { field: 'effective_date', source: 'current_date', format: 'YYYY-MM-DD' },
    ]),
    version: '1',
    status: 'active',
    defaultWorkflowId: wfSafety.id,
    defaultReviewCycleDays: 365,
    createdBy: engUser?.id ?? 'system',
  });
  console.log(`  ✓ Created template: ${tmplSpec.name}`);

  // =============================================
  // Sample Document File (attached to first document)
  // =============================================

  const docs = await storage.getDocuments();
  const firstDoc = docs.find(d => d.docNumber === 'WI-MOL-001');
  if (firstDoc) {
    const revisions = await storage.getDocumentRevisions(firstDoc.id);
    const effectiveRev = revisions.find(r => r.status === 'effective');

    const sampleChecksum = crypto.createHash('sha256')
      .update('sample-work-instruction-content')
      .digest('hex');

    const sampleFile = await storage.createDocumentFile({
      orgId,
      documentId: firstDoc.id,
      revisionId: effectiveRev?.id,
      fileName: 'sample-work-instruction.pdf',
      originalName: 'WI-PROD-0001 Rev A - Assembly Work Instruction.pdf',
      fileType: 'pdf',
      mimeType: 'application/pdf',
      fileSize: 245678,
      storagePath: '/uploads/documents/' + firstDoc.id + '/sample-work-instruction.pdf',
      checksumSha256: sampleChecksum,
      virusScanStatus: 'clean',
      previewGenerated: 1,
      textExtracted: 1,
      extractedText: 'Sample work instruction for assembly process. Step 1: Prepare workstation. Step 2: Verify material lot numbers. Step 3: Begin injection molding cycle per parameters.',
      pageCount: 5,
      uploadedBy: engUser?.id ?? 'system',
    });
    console.log(`  ✓ Created sample file: ${sampleFile.originalName}`);

    // =============================================
    // Sample Completed Workflow Instance
    // =============================================

    if (effectiveRev) {
      const now = new Date();
      const sixDaysAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
      const fourDaysAgo = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000);
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

      const wfInstance = await storage.createApprovalWorkflowInstance({
        orgId,
        workflowDefinitionId: wfStandard.id,
        documentId: firstDoc.id,
        revisionId: effectiveRev.id,
        status: 'completed',
        currentStep: 3,
        completedAt: twoDaysAgo,
        dueDate: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000),
        initiatedBy: engUser?.id ?? 'system',
      });

      // Step 1: Author submitted (6 days ago)
      await storage.createApprovalWorkflowStep({
        workflowInstanceId: wfInstance.id,
        stepNumber: 1,
        stepName: 'Author Submission',
        assignedTo: engUser?.id ?? 'system',
        assignedRole: 'author',
        assignedAt: sixDaysAgo,
        dueDate: new Date(sixDaysAgo.getTime() + 5 * 24 * 60 * 60 * 1000),
        status: 'approved',
        actionTaken: 'submit',
        actionBy: engUser?.id ?? 'system',
        actionAt: sixDaysAgo,
        comments: 'Submitting for review - updated safety procedures',
        signatureRequired: 0,
        signatureCaptured: 0,
      });

      // Step 2: Engineer reviewed (4 days ago)
      await storage.createApprovalWorkflowStep({
        workflowInstanceId: wfInstance.id,
        stepNumber: 2,
        stepName: 'Technical Review',
        assignedTo: engUser?.id ?? 'system',
        assignedRole: 'reviewer',
        assignedAt: sixDaysAgo,
        dueDate: new Date(sixDaysAgo.getTime() + 3 * 24 * 60 * 60 * 1000),
        status: 'approved',
        actionTaken: 'approve',
        actionBy: engUser?.id ?? 'system',
        actionAt: fourDaysAgo,
        comments: 'Technical content verified. Safety procedures are accurate.',
        signatureRequired: 0,
        signatureCaptured: 0,
      });

      // Step 3: QM approved with signature (2 days ago)
      const docHash = crypto.createHash('sha256')
        .update(JSON.stringify({ docId: firstDoc.id, revId: effectiveRev.id, content: 'sample' }))
        .digest('hex');

      await storage.createApprovalWorkflowStep({
        workflowInstanceId: wfInstance.id,
        stepNumber: 3,
        stepName: 'Quality Approval',
        assignedTo: qmUser?.id ?? 'system',
        assignedRole: 'approver',
        assignedAt: fourDaysAgo,
        dueDate: new Date(fourDaysAgo.getTime() + 2 * 24 * 60 * 60 * 1000),
        status: 'approved',
        actionTaken: 'approve',
        actionBy: qmUser?.id ?? 'system',
        actionAt: twoDaysAgo,
        comments: 'Approved for production use.',
        signatureRequired: 1,
        signatureCaptured: 1,
        signatureData: JSON.stringify({
          signerName: qmUser ? `${qmUser.firstName} ${qmUser.lastName}` : 'Quality Manager',
          signerId: qmUser?.id ?? 'system',
          timestamp: twoDaysAgo.toISOString(),
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          meaning: 'I approve this document for production use per company quality procedures.',
          documentHash: docHash,
          revisionId: effectiveRev.id,
          sessionId: 'seed-session-001',
        }),
      });

      console.log(`  ✓ Created completed workflow instance with 3 steps`);
    }
  }

  console.log("  ✓ DC Phase 2 seed data created (3 workflows, 4 templates, 1 file, 1 workflow instance).");
}

async function seedDocumentControlPhase3() {
  // Check if distribution lists already exist
  const demoOrg = await storage.getOrganizationBySlug('acme-manufacturing');
  if (!demoOrg) {
    console.log("  No demo org found, skipping DC Phase 3 seed.");
    return;
  }

  const existingLists = await storage.getDistributionLists(demoOrg.id);
  if (existingLists.length > 0) {
    console.log("  DC Phase 3 seed data already exists, skipping.");
    return;
  }

  console.log("  Seeding DC Phase 3 data...");

  // 1. Create 3 Distribution Lists
  const dlProd = await storage.createDistributionList({
    orgId: demoOrg.id,
    name: 'Production Floor Documents',
    code: 'DL-PROD-001',
    description: 'Distribution list for all production floor personnel',
    recipients: JSON.stringify([
      { type: 'role', role: 'production_supervisor' },
      { type: 'role', role: 'production_operator' },
      { type: 'department', department: 'Production' },
    ]),
    requireAcknowledgment: 1,
    acknowledgmentDueDays: 7,
    sendEmailNotification: 1,
    status: 'active',
    createdBy: 'admin',
  });

  const dlQual = await storage.createDistributionList({
    orgId: demoOrg.id,
    name: 'Quality Team',
    code: 'DL-QUAL-001',
    description: 'Distribution list for quality department members',
    recipients: JSON.stringify([
      { type: 'role', role: 'quality_engineer' },
      { type: 'role', role: 'quality_manager' },
      { type: 'role', role: 'quality_technician' },
    ]),
    requireAcknowledgment: 1,
    acknowledgmentDueDays: 5,
    sendEmailNotification: 1,
    status: 'active',
    createdBy: 'admin',
  });

  const dlAll = await storage.createDistributionList({
    orgId: demoOrg.id,
    name: 'All Hands',
    code: 'DL-ALL-001',
    description: 'Distribution list for all departments',
    recipients: JSON.stringify([
      { type: 'department', department: 'Production' },
      { type: 'department', department: 'Quality' },
      { type: 'department', department: 'Engineering' },
      { type: 'department', department: 'Maintenance' },
    ]),
    requireAcknowledgment: 1,
    acknowledgmentDueDays: 3,
    sendEmailNotification: 1,
    status: 'active',
    createdBy: 'admin',
  });

  console.log(`  ✓ Created ${[dlProd, dlQual, dlAll].length} distribution lists`);

  // 2. Create 4 External Documents
  const extIatf = await storage.createExternalDocument({
    orgId: demoOrg.id,
    docNumber: 'IATF 16949:2016',
    title: 'Quality management systems - Particular requirements for the application of ISO 9001:2015 for automotive production and relevant service part organizations',
    source: 'IATF',
    issuingBody: 'International Automotive Task Force',
    currentVersion: '2016',
    versionDate: new Date('2016-10-01'),
    category: 'Quality',
    applicability: 'All automotive quality management system processes',
    subscriptionActive: 1,
    subscriptionContact: 'quality_manager',
    status: 'active',
    createdBy: 'admin',
  });

  const extIso = await storage.createExternalDocument({
    orgId: demoOrg.id,
    docNumber: 'ISO 9001:2015',
    title: 'Quality management systems - Requirements',
    source: 'ISO',
    issuingBody: 'International Organization for Standardization',
    currentVersion: '2015',
    versionDate: new Date('2015-09-15'),
    category: 'Quality',
    applicability: 'Quality management system foundation',
    subscriptionActive: 1,
    subscriptionContact: 'quality_manager',
    status: 'active',
    createdBy: 'admin',
  });

  const extAiag = await storage.createExternalDocument({
    orgId: demoOrg.id,
    docNumber: 'AIAG-VDA PFMEA Handbook',
    title: 'AIAG & VDA FMEA Handbook - Process FMEA',
    source: 'AIAG',
    issuingBody: 'Automotive Industry Action Group / Verband der Automobilindustrie',
    currentVersion: '1st Edition (2019)',
    versionDate: new Date('2019-06-01'),
    category: 'Quality',
    applicability: 'PFMEA development and maintenance',
    subscriptionActive: 1,
    subscriptionContact: 'quality_manager',
    status: 'active',
    createdBy: 'admin',
  });

  const extAstm = await storage.createExternalDocument({
    orgId: demoOrg.id,
    docNumber: 'ASTM E18',
    title: 'Standard Test Methods for Rockwell Hardness of Metallic Materials',
    source: 'ASTM',
    issuingBody: 'ASTM International',
    currentVersion: '22',
    versionDate: new Date('2022-01-01'),
    category: 'Testing',
    applicability: 'Hardness testing of metallic materials',
    subscriptionActive: 0,
    status: 'active',
    createdBy: 'admin',
  });

  console.log(`  ✓ Created 4 external documents`);

  // 3. Create Sample Access Logs for existing document (WI-MOL-001)
  const docs = await storage.getDocuments();
  const targetDoc = docs.find(d => d.docNumber === 'WI-MOL-001');
  if (targetDoc) {
    // Get a revision for the document
    const revisions = await storage.getDocumentRevisions(targetDoc.id);
    const latestRev = revisions[0];

    const baseTime = new Date('2026-02-01T09:00:00Z');
    const logEntries = [
      { action: 'view', userId: 'admin', userName: 'Admin User', userRole: 'admin', actionDetails: JSON.stringify({ durationSeconds: 45, pagesViewed: [1, 2, 3] }), durationMs: 45000 },
      { action: 'view', userId: 'engineer1', userName: 'Jane Doe', userRole: 'engineer', actionDetails: JSON.stringify({ durationSeconds: 120, pagesViewed: [1, 2, 3, 4, 5] }), durationMs: 120000 },
      { action: 'download', userId: 'admin', userName: 'Admin User', userRole: 'admin', actionDetails: JSON.stringify({ format: 'pdf', watermarked: true, fileSize: 245678 }) },
      { action: 'print', userId: 'engineer1', userName: 'Jane Doe', userRole: 'engineer', actionDetails: JSON.stringify({ copies: 2, printer: 'HP-Floor-1', copyNumbers: [1, 2] }) },
      { action: 'submit', userId: 'admin', userName: 'Admin User', userRole: 'admin', actionDetails: JSON.stringify({ workflowId: 1, comments: 'Ready for review' }) },
      { action: 'approve', userId: 'quality_mgr', userName: 'Bob Wilson', userRole: 'quality_manager', actionDetails: JSON.stringify({ stepNumber: 1, comments: 'Approved - meets requirements' }) },
      { action: 'view', userId: 'viewer1', userName: 'Tom Brown', userRole: 'viewer', actionDetails: JSON.stringify({ durationSeconds: 30, pagesViewed: [1] }), durationMs: 30000 },
      { action: 'distribute', userId: 'admin', userName: 'Admin User', userRole: 'admin', actionDetails: JSON.stringify({ recipients: ['Production Floor'], method: 'electronic' }) },
    ];

    let previousHash = '';
    for (let i = 0; i < logEntries.length; i++) {
      const entry = logEntries[i];
      const entryTime = new Date(baseTime.getTime() + i * 3600000); // 1 hour apart

      // Compute log hash for tamper detection
      const hashInput = `${previousHash}${i + 1}${targetDoc.id}${entry.userId}${entry.action}${entryTime.toISOString()}`;
      const logHash = crypto.createHash('sha256').update(hashInput).digest('hex');

      await storage.createDocumentAccessLog({
        orgId: demoOrg.id,
        documentId: targetDoc.id,
        revisionId: latestRev?.id,
        userId: entry.userId,
        userName: entry.userName,
        userRole: entry.userRole,
        action: entry.action,
        actionDetails: entry.actionDetails,
        ipAddress: '192.168.1.100',
        durationMs: entry.durationMs,
        logHash,
      });

      previousHash = logHash;
    }

    console.log(`  ✓ Created ${logEntries.length} access log entries for ${targetDoc.docNumber}`);

    // 4. Create Sample Comments (threaded)
    const parentComment = await storage.createDocumentComment({
      orgId: demoOrg.id,
      documentId: targetDoc.id,
      revisionId: latestRev?.id,
      commentType: 'question',
      content: 'Section 4.2 specifies a tolerance of ±0.05mm for the cavity dimension. Should this be tightened to ±0.03mm based on the latest customer requirements?',
      createdBy: 'engineer1',
    });

    const reply1 = await storage.createDocumentComment({
      orgId: demoOrg.id,
      documentId: targetDoc.id,
      revisionId: latestRev?.id,
      commentType: 'suggestion',
      content: 'I suggest we update to ±0.03mm and add a note referencing customer spec CS-2024-0145. The Cpk data from last quarter supports this tighter tolerance.',
      parentCommentId: parentComment.id,
      createdBy: 'quality_mgr',
    });

    const reply2 = await storage.createDocumentComment({
      orgId: demoOrg.id,
      documentId: targetDoc.id,
      revisionId: latestRev?.id,
      commentType: 'resolution',
      content: 'Agreed. Updated Section 4.2 to ±0.03mm with reference to CS-2024-0145. Also updated the control plan row for this characteristic.',
      parentCommentId: parentComment.id,
      createdBy: 'admin',
    });

    // Resolve the thread
    await storage.resolveCommentThread(parentComment.id, 'admin');

    console.log(`  ✓ Created comment thread (1 parent + 2 replies, resolved) for ${targetDoc.docNumber}`);
  }

  console.log("  ✓ DC Phase 3 seed data created (3 distribution lists, 4 external docs, access logs, comments).");
}

export async function runAllSeeds() {
  console.log("Running seeds...");
  await seedCorePlatform();
  await seedDocumentControl();
  await seedDocumentControlPhase2();
  await seedDocumentControlPhase3();
  console.log("✓ All seeds completed.");
}
