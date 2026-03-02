import { storage } from "./storage";
import { db } from "./db";
import { organization, user, document, documentRevision, documentReview, approvalWorkflowDefinition, documentTemplate, documentFile, approvalWorkflowInstance, distributionList, externalDocument, documentAccessLog, documentComment, capa } from "@shared/schema";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { eq, count } from "drizzle-orm";

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
  const demoOrg = await storage.getOrganizationBySlug('acme-manufacturing');
  if (!demoOrg) {
    console.log("  No demo org found, skipping Document Control seed.");
    return;
  }
  const orgId = demoOrg.id;

  // Check if documents already exist
  const existingResult = await storage.getDocuments(orgId);
  if (existingResult.data.length > 0) {
    console.log("  Document Control seed data already exists, skipping.");
    return;
  }

  console.log("  Seeding Document Control data...");

  // Create sample documents
  const doc1 = await storage.createDocument({
    orgId,
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
    orgId,
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
    orgId,
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
    orgId,
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
    orgId,
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
    orgId,
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
    orgId,
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
    orgId,
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
    orgId,
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
    orgId,
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
    orgId,
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
    orgId,
    documentId: doc3.id,
    rev: "A",
    changeDescription: "Initial intake of customer specification",
    status: "review",
    author: "Mike Chen",
  });

  // Create revision for doc4 (draft)
  await storage.createRevision({
    orgId,
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
    orgId,
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
    orgId,
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

  const docsResult = await storage.getDocuments(orgId);
  const firstDoc = docsResult.data.find(d => d.docNumber === 'WI-MOL-001');
  if (firstDoc) {
    const revisions = await storage.getDocumentRevisions(firstDoc.id, orgId);
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
  const docsResult2 = await storage.getDocuments(demoOrg.id);
  const targetDoc = docsResult2.data.find(d => d.docNumber === 'WI-MOL-001');
  if (targetDoc) {
    // Get a revision for the document
    const revisions = await storage.getDocumentRevisions(targetDoc.id, demoOrg.id);
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

/**
 * Seed CAPA/8D Module: 3 sample CAPAs with disciplines, team members, analysis tools, and audit logs.
 */
async function seedCAPA() {
  // Check if CAPAs already exist
  const [capaCount] = await db.select({ value: count() }).from(capa);
  if (capaCount.value > 0) {
    console.log("  CAPA seed data already exists, skipping.");
    return;
  }

  const demoOrg = await storage.getOrganizationBySlug('acme-manufacturing');
  if (!demoOrg) {
    console.log("  No demo org found, skipping CAPA seed.");
    return;
  }

  console.log("  Seeding CAPA/8D data...");
  const orgId = demoOrg.id;
  const users = await storage.getUsersByOrgId(orgId);
  if (users.length === 0) {
    console.log("  No users found in demo org, skipping CAPA seed.");
    return;
  }
  const adminUser = users.find(u => u.role === 'admin') ?? users[0];
  const qmUser = users.find(u => u.role === 'quality_manager') ?? users[0];
  const engUser = users.find(u => u.role === 'engineer') ?? users[0];

  // =============================================
  // CAPA 1: Closed (Customer Complaint) — Full D0-D8
  // =============================================
  const capa1 = await storage.createCapa({
    orgId,
    capaNumber: 'auto',
    title: 'Critical Dimension Out of Spec - Part 3004-XYZ Stiffener',
    type: 'corrective',
    status: 'd8_closure',
    priority: 'critical',
    sourceType: 'customer_complaint',
    description: 'Customer reported dimension 3.72mm vs 3.50mm ±0.20mm target on Part 3004-XYZ Stiffener. 15 parts (1.5%) affected since Feb 1, 2026. Root cause: tool insert A-4421 accelerated wear without automated monitoring.',
    createdBy: adminUser.id,
    targetClosureDate: new Date('2026-03-15'),
    actualClosureDate: new Date('2026-03-10'),
    closedBy: adminUser.id,
    closedAt: new Date('2026-03-10'),
    costOfQuality: 22500,
    riskLevel: 'high',
    customerName: 'Apex Automotive',
    customerPartNumber: '3004-XYZ',
    plantLocation: 'Fraser Plant',
  });

  // Team members for CAPA 1
  await storage.createCapaTeamMember({ capaId: capa1.id, orgId, userId: adminUser.id, userName: 'Admin User', role: 'champion', isChampion: 1, joinedAt: new Date('2026-02-01'), createdBy: adminUser.id });
  await storage.createCapaTeamMember({ capaId: capa1.id, orgId, userId: qmUser.id, userName: 'Quality Manager', role: 'leader', isLeader: 1, joinedAt: new Date('2026-02-01'), createdBy: adminUser.id });
  await storage.createCapaTeamMember({ capaId: capa1.id, orgId, userId: engUser.id, userName: 'Process Engineer', role: 'process_engineer', joinedAt: new Date('2026-02-01'), createdBy: adminUser.id });

  // Source
  await storage.createCapaSource({ capaId: capa1.id, orgId, sourceType: 'customer_complaint', customerComplaintNumber: 'CC-2026-0042', initialAssessment: 'Customer reported 15 parts with critical dimension out of specification', createdBy: adminUser.id });

  // D0 Emergency
  await storage.createCapaD0({
    capaId: capa1.id, orgId,
    emergencyResponseRequired: 1,
    responseType: 'stop_shipment',
    immediateThreat: 'Critical dimension out of specification — customer safety concern',
    threatLevel: 'high',
    customerNotificationRequired: 1,
    customerNotifiedAt: new Date('2026-02-01'),
    customerNotifiedBy: qmUser.id,
    stopShipmentIssued: 1,
    stopShipmentScope: 'All lots of Part 3004-XYZ from Fraser Plant Press #3',
    stopShipmentIssuedAt: new Date('2026-02-01'),
    stopShipmentIssuedBy: adminUser.id,
    emergencyActions: JSON.stringify([
      { action: 'Stop shipment of suspect lot', responsible: adminUser.id, completedAt: '2026-02-01T10:00:00Z' },
      { action: 'Sort 100% of WIP and finished goods', responsible: engUser.id, completedAt: '2026-02-01T14:00:00Z' },
      { action: 'Notify customer of containment actions', responsible: qmUser.id, completedAt: '2026-02-01T16:00:00Z' },
    ]),
    symptomsCaptured: 1,
    symptomsDescription: 'Critical dimension 3.72mm on Part 3004-XYZ Stiffener (target: 3.50mm ±0.20mm). 15 parts (1.5%) rejected at customer incoming inspection.',
    initialSortRequired: 1,
    sortMethod: '100% CMM inspection of Feature #3',
    sortResults: JSON.stringify({ totalInspected: 500, rejected: 8 }),
    d0CompletedAt: new Date('2026-02-01'),
    d0CompletedBy: adminUser.id,
    createdBy: adminUser.id,
  });

  // D1 Team Detail
  await storage.createCapaD1({
    capaId: capa1.id, orgId,
    teamFormationDate: new Date('2026-02-02'),
    teamFormationMethod: 'cross_functional',
    teamCharterDefined: 1,
    teamObjective: 'Investigate and resolve critical dimension nonconformance on Part 3004-XYZ using 8D methodology. Target: permanent corrective action within 30 days.',
    communicationPlan: JSON.stringify({ frequency: 'daily', method: 'email + stand-up', escalation: 'Plant Manager if >3 days blocked' }),
    resourcesRequired: JSON.stringify(['CMM time', 'Tool crib records', 'SPC data access', 'Maintenance records']),
    resourcesApproved: 1,
    d1CompletedAt: new Date('2026-02-02'),
    d1CompletedBy: qmUser.id,
    createdBy: adminUser.id,
  });

  // D2 Problem
  await storage.createCapaD2({
    capaId: capa1.id, orgId,
    problemStatement: 'Since February 1, 2026, Part 3004-XYZ Stiffener produced on Press #3 at Fraser Plant has exhibited critical dimension Feature #3 measuring 3.72mm (0.22mm out of specification vs target 3.50mm ±0.20mm), affecting 15 parts (1.5% defect rate).',
    defectDescription: 'Dimension 3.72mm on Feature #3 (target 3.50mm ±0.20mm)',
    whereGeographic: 'Fraser Plant, Press #3',
    whereOnObject: 'Feature #3 (3.5mm critical dimension)',
    whenFirstObserved: new Date('2026-02-01'),
    whenPattern: 'Continuous, all shifts since Feb 1',
    howManyUnits: 15,
    howManyTrend: 'Increasing',
    isNotWhat: JSON.stringify({ is: 'Part 3004-XYZ Feature #3', isNot: 'Other part numbers or features' }),
    isNotWhere: JSON.stringify({ is: 'Fraser Plant Press #3', isNot: 'Monroe Plant or other presses' }),
    isNotWhen: JSON.stringify({ is: 'Since Feb 1 continuously', isNot: 'Before Feb 1 or intermittent' }),
    isNotHowMany: JSON.stringify({ is: '15 parts (1.5%)', isNot: '0% before Feb 1' }),
    measurementSystemValid: 1,
    fiveWsComplete: 1,
    d2CompletedAt: new Date('2026-02-04'),
    d2CompletedBy: engUser.id,
    createdBy: engUser.id,
  });

  // D3 Containment
  await storage.createCapaD3({
    capaId: capa1.id, orgId,
    containmentRequired: 1,
    containmentStrategy: 'Sort, replace tooling, 100% inspect until permanent fix',
    actions: JSON.stringify([
      { action: '100% sort of WIP and finished goods', result: '8 additional OOS parts found', responsible: engUser.id },
      { action: 'Replaced tool insert A-4421 with new A-4420', result: 'First 50 parts all in spec', responsible: engUser.id },
      { action: 'Added temporary 100% inspection at press', result: 'Running since Feb 2', responsible: qmUser.id },
    ]),
    containmentEffective: 1,
    containmentEffectiveEvidence: 'Zero OOS parts detected since containment implementation on Feb 2',
    quantityInspected: 1200,
    quantityPassed: 1177,
    quantityFailed: 23,
    d3CompletedAt: new Date('2026-02-05'),
    d3CompletedBy: engUser.id,
    createdBy: engUser.id,
  });

  // D4 Root Cause
  const d4_1 = await storage.createCapaD4({
    capaId: capa1.id, orgId,
    analysisApproach: JSON.stringify(['is_is_not', 'five_why', 'three_leg_five_why', 'fishbone', 'change_point', 'comparative']),
    fiveWhyAnalysis: JSON.stringify([
      { level: 1, question: 'Why is dimension OOS?', answer: 'Tool insert worn beyond tolerance' },
      { level: 2, question: 'Why is insert worn?', answer: 'Exceeded recommended tool life (10,000 shots)' },
      { level: 3, question: 'Why exceeded tool life?', answer: 'Tool change schedule not followed' },
      { level: 4, question: 'Why not followed?', answer: 'Manual tracking only, no automated alerts' },
      { level: 5, question: 'Why no automated alerts?', answer: 'No tool life monitoring system on Press #3' },
    ]),
    fishboneDiagram: JSON.stringify({ type: '6M', rootCauses: ['Tool wear (machine)', 'No counter (machine)', 'Manual procedure (method)', 'SPC limits outdated (measurement)'] }),
    rootCauseOccurrence: 'No automated tool life monitoring on Press #3',
    rootCauseOccurrenceEvidence: 'Equipment assessment confirmed no counter installed',
    rootCauseOccurrenceVerified: 1,
    rootCauseOccurrenceVerifiedBy: engUser.id,
    rootCauseEscape: 'No periodic SPC limit review in control plan',
    rootCauseEscapeEvidence: 'SPC review confirmed limits based on 2024 data',
    rootCauseEscapeVerified: 1,
    rootCauseEscapeVerifiedBy: qmUser.id,
    systemicCauses: JSON.stringify(['CAPA procedure lacks PFMEA/CP update requirement']),
    rootCauseSummary: 'Primary: No automated tool life monitoring. Escape: Outdated SPC limits. Systemic: Missing PFMEA update in CAPA closure.',
    confidenceLevel: 'high',
    d4CompletedAt: new Date('2026-02-08'),
    d4CompletedBy: engUser.id,
    createdBy: engUser.id,
  });

  // D4 Root Cause Candidates
  await storage.createD4Candidate({ capaId: capa1.id, orgId, d4Id: d4_1.id, causeType: 'occurrence', description: 'Tool insert worn beyond tolerance', category: 'machine', likelihood: 'high', verificationResult: 'confirmed', verificationMethod: 'Insert measurement showed 0.15mm wear', verifiedBy: engUser.id, verifiedAt: new Date('2026-02-07'), isRootCause: 1, createdBy: engUser.id });
  await storage.createD4Candidate({ capaId: capa1.id, orgId, d4Id: d4_1.id, causeType: 'escape', description: 'SPC limits outdated (last review 2024)', category: 'measurement', likelihood: 'medium', verificationResult: 'confirmed', verificationMethod: 'SPC review confirmed limits based on 2024 data', verifiedBy: qmUser.id, verifiedAt: new Date('2026-02-07'), isRootCause: 1, createdBy: engUser.id });
  await storage.createD4Candidate({ capaId: capa1.id, orgId, d4Id: d4_1.id, causeType: 'contributing', description: 'Operator training gap', category: 'man', likelihood: 'low', verificationResult: 'refuted', verificationMethod: 'Training records current, interviewed operator — ruled out', createdBy: engUser.id });

  // D5 Corrective Action (single discipline record per CAPA)
  await storage.createCapaD5({
    capaId: capa1.id, orgId,
    correctiveActionsSelected: JSON.stringify([
      { description: 'Install tool life counter with automatic lockout on Press #3', type: 'occurrence', responsible: engUser.id, dueDate: '2026-02-28', completedAt: '2026-02-12' },
      { description: 'Add annual SPC review requirement to control plan', type: 'detection', responsible: qmUser.id, dueDate: '2026-02-28', completedAt: '2026-02-14' },
      { description: 'Revise CAPA closure procedure to require PFMEA/CP update evidence', type: 'systemic', responsible: qmUser.id, dueDate: '2026-03-15', completedAt: '2026-02-20' },
    ]),
    occurrenceActionSummary: 'Install tool life counter with automatic lockout on Press #3',
    escapeActionSummary: 'Add annual SPC review requirement to control plan',
    pfmeaUpdatesRequired: 1,
    controlPlanUpdatesRequired: 1,
    documentUpdatesRequired: 1,
    managementApprovalStatus: 'approved',
    managementApprovedBy: adminUser.id,
    managementApprovedAt: new Date('2026-02-10'),
    d5CompletedAt: new Date('2026-02-10'),
    d5CompletedBy: qmUser.id,
    createdBy: qmUser.id,
  });

  // D6 Validation
  await storage.createCapaD6({
    capaId: capa1.id, orgId,
    implementationStatus: 'complete',
    implementationProgress: 100,
    implementationLog: JSON.stringify([
      { date: '2026-02-12', action: 'Tool life counter installed on Press #3', verifiedBy: engUser.id },
      { date: '2026-02-14', action: 'SPC limits recalculated and updated', verifiedBy: qmUser.id },
      { date: '2026-02-20', action: 'CAPA procedure revised (SOP-QA-015 Rev C)', verifiedBy: adminUser.id },
    ]),
    validationTests: JSON.stringify([
      { test: '500 part production run', result: 'All in spec (Cpk 1.67)', passed: true },
      { test: 'Tool counter lockout test', result: 'Press locked at 9,500 shots as configured', passed: true },
      { test: 'SPC chart monitoring', result: 'Process stable for 2 weeks', passed: true },
    ]),
    effectivenessVerified: 1,
    effectivenessResult: 'effective',
    effectivenessEvidence: 'Cpk improved from 0.85 to 1.67 after corrective actions. Zero defects in 2,000 parts since implementation.',
    containmentRemoved: 1,
    containmentRemovedAt: new Date('2026-02-18'),
    pfmeaUpdated: 1,
    pfmeaUpdateDetails: 'Updated PFMEA for Part 3004-XYZ — RPN reduced from 192 to 48',
    controlPlanUpdated: 1,
    controlPlanUpdateDetails: 'Updated Control Plan to include tool life monitoring and annual SPC review',
    d6CompletedAt: new Date('2026-02-15'),
    d6CompletedBy: qmUser.id,
    createdBy: qmUser.id,
  });

  // D7 Preventive
  await storage.createCapaD7({
    capaId: capa1.id, orgId,
    systemicAnalysisComplete: 1,
    systemicAnalysisSummary: 'Three systemic gaps identified: equipment monitoring, procedure review schedule, feedback loop from CAPA to PFMEA.',
    preventiveActions: JSON.stringify([
      { action: 'Install tool life counters on all 12 presses', dueDate: '2026-06-30', responsible: engUser.id },
      { action: 'Implement automated SPC alert system plant-wide', dueDate: '2026-09-30', responsible: qmUser.id },
    ]),
    horizontalDeploymentPlan: JSON.stringify({
      areas: [
        { area: 'Monroe Plant', action: 'Audit all presses for tool life monitoring', dueDate: '2026-04-30' },
        { area: 'All injection molding cells', action: 'Review SPC limits vs current capability', dueDate: '2026-05-31' },
      ],
    }),
    procedureChangesRequired: 1,
    procedureChanges: JSON.stringify(['SOP-QA-015 Rev C (CAPA procedure)', 'CP-3004-XYZ Rev B (control plan)']),
    fmeaSystemReviewComplete: 1,
    fmeaSystemReviewNotes: 'Updated PFMEA for Part 3004-XYZ (RPN reduced from 192 to 48)',
    lessonLearnedCreated: 1,
    lessonLearnedReference: 'LL-2026-001: Manual tool life tracking is insufficient for critical dimensions',
    standardizationComplete: 1,
    standardizationSummary: 'Standardized tool life monitoring requirement across all critical-dimension tooling',
    d7CompletedAt: new Date('2026-02-20'),
    d7CompletedBy: engUser.id,
    createdBy: engUser.id,
  });

  // D8 Closure
  await storage.createCapaD8({
    capaId: capa1.id, orgId,
    closureCriteriaMet: 1,
    closureCriteriaChecklist: JSON.stringify({
      rootCauseVerified: true,
      correctiveActionsImplemented: true,
      preventiveActionsScheduled: true,
      documentationUpdated: true,
      customerNotified: true,
    }),
    allActionsComplete: 1,
    actionsCompletionSummary: 'All 3 corrective actions completed. All preventive actions scheduled with owners.',
    effectivenessConfirmed: 1,
    effectivenessSummary: 'Cpk improved from 0.85 to 1.67. Zero defects in 2,000+ parts since implementation.',
    noRecurrence: 1,
    recurrenceMonitoringPeriod: '90 days',
    containmentRemoved: 1,
    containmentRemovalDate: new Date('2026-02-18'),
    documentationComplete: 1,
    customerClosed: 1,
    customerClosureDate: new Date('2026-03-08'),
    teamRecognition: JSON.stringify({ note: 'Team completed 8D in 38 days (target: 45). Special recognition to Process Engineer for rapid tool counter installation.' }),
    teamRecognitionDate: new Date('2026-03-10'),
    lessonsLearnedSummary: 'Manual tool life tracking is insufficient for critical dimensions. Automated monitoring with lockout prevents tool-wear-related nonconformances.',
    lessonsLearnedShared: 1,
    successMetrics: JSON.stringify({ cpkBefore: 0.85, cpkAfter: 1.67, defectRateBefore: 1.5, defectRateAfter: 0, costSavingsAnnual: 150000 }),
    costSavingsRealized: 150000,
    cycleTimeDays: 38,
    onTimeCompletion: 1,
    approvedBy: adminUser.id,
    approvedAt: new Date('2026-03-10'),
    closedBy: adminUser.id,
    closedAt: new Date('2026-03-10'),
    d8CompletedAt: new Date('2026-03-10'),
    d8CompletedBy: adminUser.id,
    createdBy: adminUser.id,
  });

  // Audit log entries for CAPA 1 (hash-chained)
  const auditActions: Array<{ action: string; userId: string; changeDescription?: string; previousValue?: string; newValue?: string }> = [
    { action: 'capa_created', userId: adminUser.id, changeDescription: 'CAPA created from customer complaint CC-2026-0042' },
    { action: 'status_changed', userId: adminUser.id, previousValue: 'd0_awareness', newValue: 'd1_team', changeDescription: 'D0 completed, advancing to D1' },
    { action: 'team_member_added', userId: adminUser.id, changeDescription: 'Quality Manager added as leader' },
    { action: 'd0_completed', userId: engUser.id, changeDescription: 'D0 Emergency Response completed' },
    { action: 'd1_completed', userId: qmUser.id, changeDescription: 'D1 Team Formation completed' },
    { action: 'd2_completed', userId: engUser.id, changeDescription: 'D2 Problem Description completed' },
    { action: 'd3_completed', userId: engUser.id, changeDescription: 'D3 Containment completed' },
    { action: 'd4_completed', userId: engUser.id, changeDescription: 'D4 Root Cause Analysis completed' },
    { action: 'd5_completed', userId: qmUser.id, changeDescription: 'D5 Corrective Actions selected and approved' },
    { action: 'd6_completed', userId: qmUser.id, changeDescription: 'D6 Validation completed — effectiveness verified' },
    { action: 'd7_completed', userId: engUser.id, changeDescription: 'D7 Preventive Actions established' },
    { action: 'd8_completed', userId: adminUser.id, changeDescription: 'D8 Closure — all criteria met' },
    { action: 'capa_closed', userId: adminUser.id, previousValue: 'd8_closure', newValue: 'closed', changeDescription: 'CAPA formally closed' },
  ];
  for (const entry of auditActions) {
    await storage.createCapaAuditLog({
      capaId: capa1.id,
      orgId,
      action: entry.action,
      userId: entry.userId,
      changeDescription: entry.changeDescription,
      previousValue: entry.previousValue,
      newValue: entry.newValue,
    });
  }

  // Analysis tools for CAPA 1
  await storage.createCapaAnalysisTool({
    orgId,
    capaId: capa1.id,
    toolType: 'is_is_not',
    name: 'Initial Is/Is Not Analysis',
    discipline: 'D2',
    data: JSON.stringify({
      what: { object: { is: [{ observation: 'Part 3004-XYZ Stiffener', evidence: 'Customer complaint' }], isNot: [{ observation: 'Other part numbers', distinction: 'Only this part affected' }] } },
      where: { geographic: { is: [{ observation: 'Fraser Plant', evidence: '' }], isNot: [{ observation: 'Monroe Plant', distinction: 'Different equipment' }] } },
      therefore: 'Tool insert A-4421 causing dimension drift on feature #3',
    }),
    status: 'complete',
    conclusion: 'Tool insert change on 1/30 is root cause',
    linkedToRootCause: 1,
    createdBy: engUser.id,
    completedAt: new Date('2026-02-04'),
    completedBy: engUser.id,
  });

  await storage.createCapaAnalysisTool({
    orgId,
    capaId: capa1.id,
    toolType: 'three_leg_five_why',
    name: '3-Legged 5-Why Analysis',
    discipline: 'D4',
    data: JSON.stringify({
      startingPoint: 'Critical dimension 3.72mm vs 3.50mm target',
      occurrenceLeg: { whys: [{ level: 1, question: 'Why dimension OOS?', answer: 'Tool insert worn' }, { level: 2, question: 'Why insert worn?', answer: 'Exceeded tool life' }, { level: 3, question: 'Why exceeded life?', answer: 'No counter' }], rootCause: 'No automated tool life monitoring', verified: true },
      detectionLeg: { whys: [{ level: 1, question: 'Why not detected?', answer: 'SPC limits too wide' }, { level: 2, question: 'Why too wide?', answer: 'Based on old capability' }], rootCause: 'No periodic SPC limit review', verified: true },
      systemicLeg: { whys: [{ level: 1, question: 'Why system allowed?', answer: 'PFMEA not updated' }, { level: 2, question: 'Why not updated?', answer: 'No feedback loop' }], rootCause: 'CAPA procedure lacks PFMEA update requirement', verified: true },
    }),
    status: 'verified',
    conclusion: 'Three root causes: equipment gap (occurrence), procedure gap (detection), system gap (systemic)',
    linkedToRootCause: 1,
    createdBy: engUser.id,
    completedAt: new Date('2026-02-07'),
    completedBy: engUser.id,
    verifiedAt: new Date('2026-02-08'),
    verifiedBy: qmUser.id,
  });

  await storage.createCapaAnalysisTool({
    orgId,
    capaId: capa1.id,
    toolType: 'fishbone',
    name: '6M Fishbone Analysis',
    discipline: 'D4',
    data: JSON.stringify({
      type: '6M',
      effect: 'Dimension out of specification',
      categories: {
        machine: [{ id: 'mc1', text: 'Tool insert worn', status: 'verified' }, { id: 'mc2', text: 'No tool life counter', status: 'verified' }],
        method: [{ id: 'me1', text: 'Tool change procedure gap', status: 'verified' }],
        measurement: [{ id: 'ms1', text: 'SPC limits outdated', status: 'verified' }],
        man: [{ id: 'm1', text: 'Operator training', status: 'ruled_out' }],
        material: [{ id: 'mt1', text: 'Resin lot variation', status: 'ruled_out' }],
      },
    }),
    status: 'complete',
    conclusion: 'Primary: Tool wear due to no life monitoring. Contributing: Manual procedure and outdated SPC limits.',
    createdBy: engUser.id,
    completedAt: new Date('2026-02-06'),
    completedBy: engUser.id,
  });

  await storage.createCapaAnalysisTool({
    orgId,
    capaId: capa1.id,
    toolType: 'change_point',
    name: 'Change Point Timeline',
    discipline: 'D2',
    data: JSON.stringify({
      problemFirstObserved: '2026-02-10',
      changes: [
        { date: '2026-01-30', category: 'machine', description: 'Tool insert changed to A-4421', isLikelyCause: true },
        { date: '2026-01-22', category: 'machine', description: 'PM performed on Press #3', ruledOut: true },
      ],
      hypothesis: 'Tool change on 1/30 is the change point',
    }),
    status: 'complete',
    conclusion: 'Tool insert change correlates with defect onset',
    createdBy: engUser.id,
    completedAt: new Date('2026-02-04'),
    completedBy: engUser.id,
  });

  await storage.createCapaAnalysisTool({
    orgId,
    capaId: capa1.id,
    toolType: 'comparative',
    name: 'Good vs Bad Part Comparison',
    discipline: 'D4',
    data: JSON.stringify({
      comparison: { good: [{ id: 'SN-0542', date: '2026-01-28' }], bad: [{ id: 'SN-0523', date: '2026-02-03' }] },
      factors: [
        { name: 'Tool Insert', good: 'A-4420', bad: 'A-4421', isDifferent: true, significance: 'Different insert!' },
        { name: 'Tool Life Count', good: '2,450', bad: '8,920', isDifferent: true, significance: 'High wear' },
      ],
      hypothesis: 'Insert A-4421 wears faster',
    }),
    status: 'complete',
    conclusion: 'Tool insert and tool life count are significant differences',
    createdBy: engUser.id,
    completedAt: new Date('2026-02-05'),
    completedBy: engUser.id,
  });

  console.log(`  ✓ CAPA-1 created (closed, full D0-D8, 13 audit logs, 5 analysis tools)`);

  // =============================================
  // CAPA 2: In Progress at D4 (Internal NCR)
  // =============================================
  const capa2 = await storage.createCapa({
    orgId,
    capaNumber: 'auto',
    title: 'Surface Finish Defect on Housing Assembly — Line 2',
    type: 'corrective',
    status: 'd4_root_cause',
    priority: 'high',
    sourceType: 'internal_ncr',
    description: 'Recurring surface finish defects (orange peel) on Housing Assembly produced on Line 2. Defect rate increased from 0.5% to 3.2% over past 2 weeks.',
    createdBy: engUser.id,
    targetClosureDate: new Date('2026-04-01'),
    costOfQuality: 15000,
    riskLevel: 'medium',
    plantLocation: 'Fraser Plant',
  });

  // Team members
  await storage.createCapaTeamMember({ capaId: capa2.id, orgId, userId: qmUser.id, userName: 'Quality Manager', role: 'champion', isChampion: 1, joinedAt: new Date('2026-02-10'), createdBy: qmUser.id });
  await storage.createCapaTeamMember({ capaId: capa2.id, orgId, userId: engUser.id, userName: 'Process Engineer', role: 'leader', isLeader: 1, joinedAt: new Date('2026-02-10'), createdBy: qmUser.id });
  await storage.createCapaTeamMember({ capaId: capa2.id, orgId, userId: adminUser.id, userName: 'Admin User', role: 'quality_engineer', joinedAt: new Date('2026-02-11'), createdBy: qmUser.id });

  await storage.createCapaSource({ capaId: capa2.id, orgId, sourceType: 'internal_ncr', ncrNumber: 'NCR-2026-0088', initialAssessment: 'Internal NCR for surface finish defects on Line 2', createdBy: engUser.id });

  // D0
  await storage.createCapaD0({
    capaId: capa2.id, orgId,
    emergencyResponseRequired: 0,
    threatLevel: 'medium',
    symptomsCaptured: 1,
    symptomsDescription: 'Orange peel surface finish defect on Housing Assembly. Defect rate 3.2% (was 0.5%).',
    emergencyActions: JSON.stringify([
      { action: 'Increased visual inspection frequency to every 25 parts', responsible: qmUser.id },
      { action: 'Quarantined suspect inventory (2 pallets)', responsible: engUser.id },
    ]),
    d0CompletedAt: new Date('2026-02-10'),
    d0CompletedBy: engUser.id,
    createdBy: engUser.id,
  });

  // D1
  await storage.createCapaD1({
    capaId: capa2.id, orgId,
    teamFormationDate: new Date('2026-02-11'),
    teamFormationMethod: 'cross_functional',
    teamObjective: 'Identify root cause of surface finish defects on Line 2 Housing Assembly and implement permanent corrective action.',
    resourcesRequired: JSON.stringify(['Surface profilometer', 'Paint booth environmental data', 'Material COCs']),
    d1CompletedAt: new Date('2026-02-11'),
    d1CompletedBy: engUser.id,
    createdBy: engUser.id,
  });

  // D2
  await storage.createCapaD2({
    capaId: capa2.id, orgId,
    problemStatement: 'Since February 3, 2026, Housing Assembly parts produced on Line 2 exhibit orange peel surface finish defect at 3.2% rate (baseline 0.5%), affecting all shifts.',
    defectDescription: 'Orange peel texture on painted surface',
    whereGeographic: 'Line 2, paint booth #4',
    whenFirstObserved: new Date('2026-02-03'),
    whenPattern: 'All shifts since Feb 3',
    measurementSystemValid: 1,
    d2CompletedAt: new Date('2026-02-13'),
    d2CompletedBy: engUser.id,
    createdBy: engUser.id,
  });

  // D3
  await storage.createCapaD3({
    capaId: capa2.id, orgId,
    containmentRequired: 1,
    actions: JSON.stringify([
      { action: '100% visual inspection with surface finish comparator', responsible: qmUser.id },
      { action: 'Suspect inventory quarantined and sorted', result: '12 parts rejected', responsible: engUser.id },
    ]),
    containmentEffective: 1,
    d3CompletedAt: new Date('2026-02-14'),
    d3CompletedBy: engUser.id,
    createdBy: engUser.id,
  });

  // D4 (in progress)
  await storage.createCapaD4({
    capaId: capa2.id, orgId,
    analysisApproach: JSON.stringify(['fishbone', 'five_why', 'comparative']),
    createdBy: engUser.id,
  });

  // One analysis tool in progress for CAPA 2
  await storage.createCapaAnalysisTool({
    orgId,
    capaId: capa2.id,
    toolType: 'fishbone',
    name: 'Surface Finish Fishbone',
    discipline: 'D4',
    data: JSON.stringify({
      type: '6M',
      effect: 'Orange peel surface finish',
      categories: {
        machine: [{ id: 'mc1', text: 'Paint gun nozzle wear', status: 'investigating' }],
        material: [{ id: 'mt1', text: 'Paint viscosity variation', status: 'investigating' }],
        environment: [{ id: 'e1', text: 'Booth humidity fluctuation', status: 'suspected' }],
      },
    }),
    status: 'in_progress',
    createdBy: engUser.id,
  });

  console.log(`  ✓ CAPA-2 created (in progress at D4, D0-D3 complete)`);

  // =============================================
  // CAPA 3: New (Audit Finding) — Only D0 started
  // =============================================
  const capa3 = await storage.createCapa({
    orgId,
    capaNumber: 'auto',
    title: 'Calibration Records Gap — Lab Equipment',
    type: 'preventive',
    status: 'd0_awareness',
    priority: 'medium',
    sourceType: 'audit_finding',
    description: 'Internal audit finding: 3 CMMs in the metrology lab have calibration records that are 45+ days overdue. IATF 16949 clause 7.1.5.1 nonconformance.',
    createdBy: qmUser.id,
    targetClosureDate: new Date('2026-04-30'),
    costOfQuality: 5000,
    riskLevel: 'medium',
    plantLocation: 'Fraser Plant',
  });

  await storage.createCapaTeamMember({ capaId: capa3.id, orgId, userId: qmUser.id, userName: 'Quality Manager', role: 'leader', isLeader: 1, joinedAt: new Date('2026-02-15'), createdBy: qmUser.id });

  await storage.createCapaSource({ capaId: capa3.id, orgId, sourceType: 'audit_finding', auditId: 'AF-2026-0015', auditType: 'internal', auditFindingCategory: 'minor', initialAssessment: 'Calibration records overdue per IATF 16949 7.1.5.1', createdBy: qmUser.id });

  await storage.createCapaD0({
    capaId: capa3.id, orgId,
    emergencyResponseRequired: 0,
    threatLevel: 'medium',
    symptomsCaptured: 1,
    symptomsDescription: '3 CMMs (CMM-001, CMM-003, CMM-007) have calibration due dates 45+ days past. No evidence of calibration or out-of-calibration assessment.',
    emergencyActions: JSON.stringify([
      { action: 'Schedule emergency calibration for all 3 CMMs', responsible: qmUser.id },
      { action: 'Identify all parts measured by affected CMMs since last valid calibration', responsible: engUser.id },
    ]),
    createdBy: qmUser.id,
  });

  console.log(`  ✓ CAPA-3 created (new, D0 awareness only)`);

  // Metric snapshot
  await storage.createCapaMetricSnapshot({
    orgId,
    snapshotDate: new Date('2026-02-17'),
    snapshotPeriod: 'weekly',
    totalCapas: 3,
    byStatus: JSON.stringify({ d0_awareness: 1, d4_root_cause: 1, d8_closure: 1 }),
    byPriority: JSON.stringify({ critical: 1, high: 1, medium: 1 }),
    bySourceType: JSON.stringify({ customer_complaint: 1, internal_ncr: 1, audit_finding: 1 }),
    openedThisPeriod: 3,
    closedThisPeriod: 1,
    overdueCount: 0,
    avgCycleTimeDays: 38,
    onTimeClosureRate: 100,
    effectivenessRate: 100,
    costOfQuality: 42500,
    costSavings: 150000,
  });

  console.log("  ✓ CAPA/8D seed data created (3 CAPAs, team members, disciplines, audit logs, analysis tools, metrics).");
}

export async function runAllSeeds() {
  console.log("Running seeds...");
  await seedCorePlatform();
  await seedDocumentControl();
  await seedDocumentControlPhase2();
  await seedDocumentControlPhase3();
  await seedCAPA();
  console.log("✓ All seeds completed.");
}
