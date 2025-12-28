import { storage } from "./storage";

export async function seedApprovalMatrix() {
  const approvalMatrixData = [
    { documentType: 'pfmea', role: 'qe', sequence: 1, required: true, canDelegate: true },
    { documentType: 'pfmea', role: 'process_owner', sequence: 2, required: true, canDelegate: true },
    { documentType: 'pfmea', role: 'quality_manager', sequence: 3, required: true, canDelegate: false },
    
    { documentType: 'control_plan', role: 'qe', sequence: 1, required: true, canDelegate: true },
    { documentType: 'control_plan', role: 'process_owner', sequence: 2, required: true, canDelegate: true },
    { documentType: 'control_plan', role: 'quality_manager', sequence: 3, required: true, canDelegate: false },
    
    { documentType: 'process_def', role: 'process_owner', sequence: 1, required: true, canDelegate: true },
    { documentType: 'process_def', role: 'quality_manager', sequence: 2, required: true, canDelegate: false },
    
    { documentType: 'change_package', role: 'qe', sequence: 1, required: true, canDelegate: true },
    { documentType: 'change_package', role: 'quality_manager', sequence: 2, required: true, canDelegate: false },
  ];

  const existing = await storage.getAllApprovalMatrices();
  if (existing.length > 0) {
    console.log("✓ Approval matrix already seeded");
    return;
  }

  for (const entry of approvalMatrixData) {
    await storage.createApprovalMatrix(entry);
  }

  console.log("✓ Seeded approval matrix");
}

export async function runAllSeeds() {
  console.log("Running seeds...");
  await seedApprovalMatrix();
  console.log("All seeds completed.");
}
