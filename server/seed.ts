import { storage } from "./storage";
import { db } from "./db";
import { document, documentRevision, documentReview } from "@shared/schema";

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

export async function runAllSeeds() {
  console.log("Running seeds...");
  await seedDocumentControl();
  console.log("✓ All seeds completed.");
}
