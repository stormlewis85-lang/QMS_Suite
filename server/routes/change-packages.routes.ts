import { Router } from "express";
import { storage } from "../storage";
import {
  createChangePackage as createChangePackageService,
  runImpactAnalysis,
  runChangePackageAutoReview,
  requestApprovals,
  processApproval,
  propagateChanges,
  getChangePackage as getChangePackageService,
  listChangePackages as listChangePackagesService,
  cancelChangePackage,
  advanceWorkflow
} from "../change-package-service";

const router = Router();

router.get("/change-packages", async (req, res) => {
  try {
    const packages = await storage.getAllChangePackages();
    res.json(packages);
  } catch (error) {
    console.error("Error fetching change packages:", error);
    res.status(500).json({ message: "Failed to fetch change packages" });
  }
});

router.get("/change-packages/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const pkg = await storage.getChangePackageWithDetails(id);
    if (!pkg) {
      return res.status(404).json({ message: "Change package not found" });
    }
    res.json(pkg);
  } catch (error) {
    console.error("Error fetching change package:", error);
    res.status(500).json({ message: "Failed to fetch change package" });
  }
});

router.post("/change-packages", async (req, res) => {
  try {
    const packageNumber = await storage.generateChangePackageNumber();
    const pkg = await storage.createChangePackage({
      ...req.body,
      packageNumber,
    });
    res.status(201).json(pkg);
  } catch (error) {
    console.error("Error creating change package:", error);
    res.status(500).json({ message: "Failed to create change package" });
  }
});

router.patch("/change-packages/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const pkg = await storage.updateChangePackage(id, req.body);
    res.json(pkg);
  } catch (error) {
    console.error("Error updating change package:", error);
    res.status(500).json({ message: "Failed to update change package" });
  }
});

router.delete("/change-packages/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await storage.deleteChangePackage(id);
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting change package:", error);
    res.status(500).json({ message: "Failed to delete change package" });
  }
});

router.post("/change-packages/:id/transition", async (req, res) => {
  try {
    const { id } = req.params;
    const { newStatus } = req.body;

    const existing = await storage.getChangePackageById(id);
    if (!existing) {
      return res.status(404).json({ message: "Change package not found" });
    }

    const validTransitions: Record<string, string[]> = {
      'draft': ['impact_analysis', 'cancelled'],
      'impact_analysis': ['auto_review', 'draft', 'cancelled'],
      'auto_review': ['pending_signatures', 'impact_analysis', 'cancelled'],
      'pending_signatures': ['effective', 'auto_review', 'cancelled'],
      'effective': [],
      'cancelled': ['draft'],
    };

    if (!validTransitions[existing.status]?.includes(newStatus)) {
      return res.status(400).json({
        message: `Invalid transition from ${existing.status} to ${newStatus}`
      });
    }

    const pkg = await storage.updateChangePackage(id, { status: newStatus });
    res.json(pkg);
  } catch (error) {
    console.error("Error transitioning change package:", error);
    res.status(500).json({ message: "Failed to transition change package" });
  }
});

// Change Package Items
router.post("/change-packages/:packageId/items", async (req, res) => {
  try {
    const { packageId } = req.params;
    const item = await storage.createChangePackageItem({
      ...req.body,
      changePackageId: packageId,
    });
    res.status(201).json(item);
  } catch (error) {
    console.error("Error creating change package item:", error);
    res.status(500).json({ message: "Failed to create change package item" });
  }
});

router.delete("/change-package-items/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await storage.deleteChangePackageItem(id);
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting change package item:", error);
    res.status(500).json({ message: "Failed to delete change package item" });
  }
});

// Change Package Approvals
router.get("/change-packages/:packageId/approvals", async (req, res) => {
  try {
    const { packageId } = req.params;
    const approvals = await storage.getChangePackageApprovals(packageId);
    res.json(approvals);
  } catch (error) {
    console.error("Error fetching approvals:", error);
    res.status(500).json({ message: "Failed to fetch approvals" });
  }
});

router.post("/change-packages/:packageId/approvals", async (req, res) => {
  try {
    const { packageId } = req.params;
    const approval = await storage.createChangePackageApproval({
      ...req.body,
      changePackageId: packageId,
    });
    res.status(201).json(approval);
  } catch (error) {
    console.error("Error creating approval:", error);
    res.status(500).json({ message: "Failed to create approval" });
  }
});

router.patch("/change-package-approvals/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const approval = await storage.updateChangePackageApproval(id, req.body);
    if (!approval) {
      return res.status(404).json({ message: "Approval not found" });
    }
    res.json(approval);
  } catch (error) {
    console.error("Error updating approval:", error);
    res.status(500).json({ message: "Failed to update approval" });
  }
});

// Change Package Propagations
router.get("/change-packages/:packageId/propagations", async (req, res) => {
  try {
    const { packageId } = req.params;
    const propagations = await storage.getChangePackagePropagations(packageId);
    res.json(propagations);
  } catch (error) {
    console.error("Error fetching propagations:", error);
    res.status(500).json({ message: "Failed to fetch propagations" });
  }
});

router.post("/change-packages/:packageId/propagations", async (req, res) => {
  try {
    const { packageId } = req.params;
    const propagation = await storage.createChangePackagePropagation({
      ...req.body,
      changePackageId: packageId,
    });
    res.status(201).json(propagation);
  } catch (error) {
    console.error("Error creating propagation:", error);
    res.status(500).json({ message: "Failed to create propagation" });
  }
});

router.patch("/change-package-propagations/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const propagation = await storage.updateChangePackagePropagation(id, req.body);
    if (!propagation) {
      return res.status(404).json({ message: "Propagation not found" });
    }
    res.json(propagation);
  } catch (error) {
    console.error("Error updating propagation:", error);
    res.status(500).json({ message: "Failed to update propagation" });
  }
});

// Workflow Endpoints
router.get('/change-packages/:packageId/workflow', async (req, res) => {
  try {
    const status = await advanceWorkflow(req.params.packageId);
    res.json(status);
  } catch (error) {
    console.error('Get workflow error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get workflow status'
    });
  }
});

router.post('/change-packages/:packageId/impact-analysis', async (req, res) => {
  try {
    const result = await runImpactAnalysis(req.params.packageId);
    res.json(result);
  } catch (error) {
    console.error('Impact analysis error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to run impact analysis'
    });
  }
});

router.post('/change-packages/:packageId/workflow/auto-review', async (req, res) => {
  try {
    const result = await runChangePackageAutoReview(req.params.packageId);
    res.json(result);
  } catch (error) {
    console.error('Package auto-review error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to run auto-review'
    });
  }
});

router.post('/change-packages/:packageId/request-approvals', async (req, res) => {
  try {
    const { approvers } = req.body;

    if (!approvers || !Array.isArray(approvers)) {
      return res.status(400).json({ error: 'approvers array is required' });
    }

    const approvals = await requestApprovals(req.params.packageId, approvers);
    res.json(approvals);
  } catch (error) {
    console.error('Request approvals error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to request approvals'
    });
  }
});

router.post('/change-packages/approvals/:approvalId/decision', async (req, res) => {
  try {
    const { decision, comments, signatureHash } = req.body;

    if (!decision || !['approved', 'rejected'].includes(decision)) {
      return res.status(400).json({
        error: 'decision must be "approved" or "rejected"'
      });
    }

    const result = await processApproval(
      req.params.approvalId,
      decision,
      comments,
      signatureHash
    );

    res.json(result);
  } catch (error) {
    console.error('Process approval error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to process approval'
    });
  }
});

router.post('/change-packages/:packageId/propagate', async (req, res) => {
  try {
    const { decisions, decidedBy } = req.body;

    if (!decisions || !Array.isArray(decisions)) {
      return res.status(400).json({ error: 'decisions array is required' });
    }

    if (!decidedBy) {
      return res.status(400).json({ error: 'decidedBy is required' });
    }

    const result = await propagateChanges(req.params.packageId, decisions, decidedBy);
    res.json(result);
  } catch (error) {
    console.error('Propagate changes error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to propagate changes'
    });
  }
});

router.post('/change-packages/:packageId/cancel', async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'reason is required' });
    }

    await cancelChangePackage(req.params.packageId, reason);
    res.json({ success: true });
  } catch (error) {
    console.error('Cancel package error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to cancel package'
    });
  }
});

export { router as changePackagesRouter };
