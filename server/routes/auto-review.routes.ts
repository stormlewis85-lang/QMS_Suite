import { Router } from "express";
import { storage } from "../storage";
import {
  runAutoReview as runAutoReviewService,
  getAutoReviewHistory,
  getAutoReviewRun,
  resolveFinding,
  waiveFinding
} from "../autoReviewService";
import { autoReviewService } from "../services/auto-review";
import { getErrorMessage } from "./_helpers";

const router = Router();

// Run auto-review for a PFMEA
router.post("/pfmeas/:id/auto-review", async (req, res) => {
  try {
    const { id } = req.params;
    const pfmeaData = await storage.getPFMEAById(id);
    if (!pfmeaData) {
      return res.status(404).json({ message: "PFMEA not found" });
    }

    const controlPlans = await storage.getControlPlansByPartId(pfmeaData.partId);
    const latestCPId = controlPlans[0]?.id;

    const result = await runAutoReviewService(id, latestCPId, req.body.runBy);
    res.json(result);
  } catch (error) {
    console.error("Auto-review error:", error);
    res.status(500).json({ message: "Failed to run auto-review" });
  }
});

// Run auto-review for a Control Plan
router.post("/control-plans/:id/auto-review", async (req, res) => {
  try {
    const { id } = req.params;
    const cpData = await storage.getControlPlanById(id);
    if (!cpData) {
      return res.status(404).json({ message: "Control Plan not found" });
    }

    const pfmeas = await storage.getPFMEAsByPartId(cpData.partId);
    const latestPFMEAId = pfmeas[0]?.id;

    const result = await runAutoReviewService(latestPFMEAId, id, req.body.runBy);
    res.json(result);
  } catch (error) {
    console.error("Auto-review error:", error);
    res.status(500).json({ message: "Failed to run auto-review" });
  }
});

// Get auto-review history
router.get("/auto-reviews", async (req, res) => {
  try {
    const { pfmeaId, controlPlanId, limit } = req.query;
    const history = await getAutoReviewHistory(
      pfmeaId as string | undefined,
      controlPlanId as string | undefined,
      limit ? parseInt(limit as string) : 10
    );
    res.json(history);
  } catch (error) {
    console.error("Error fetching auto-review history:", error);
    res.status(500).json({ message: "Failed to fetch auto-review history" });
  }
});

// Get single auto-review run with findings
router.get("/auto-reviews/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const run = await getAutoReviewRun(id);
    if (!run) {
      return res.status(404).json({ message: "Auto-review run not found" });
    }
    res.json(run);
  } catch (error) {
    console.error("Error fetching auto-review run:", error);
    res.status(500).json({ message: "Failed to fetch auto-review run" });
  }
});

// Resolve a finding
router.post("/auto-review-findings/:id/resolve", async (req, res) => {
  try {
    const { id } = req.params;
    const { resolution, resolvedBy } = req.body;
    const finding = await resolveFinding(id, resolution, resolvedBy);
    if (!finding) {
      return res.status(404).json({ message: "Finding not found" });
    }
    res.json(finding);
  } catch (error) {
    console.error("Error resolving finding:", error);
    res.status(500).json({ message: "Failed to resolve finding" });
  }
});

// Waive a finding
router.post("/auto-review-findings/:id/waive", async (req, res) => {
  try {
    const { id } = req.params;
    const { waiverReason } = req.body;
    const finding = await waiveFinding(id, waiverReason);
    if (!finding) {
      return res.status(404).json({ message: "Finding not found" });
    }
    res.json(finding);
  } catch (error) {
    console.error("Error waiving finding:", error);
    res.status(500).json({ message: "Failed to waive finding" });
  }
});

// Run comprehensive review for a Part (all documents)
router.post("/parts/:id/auto-review", async (req, res) => {
  try {
    const { id } = req.params;
    const partData = await storage.getPartWithDocuments(id);
    if (!partData) {
      return res.status(404).json({ message: "Part not found" });
    }

    const results: any[] = [];
    const reviewedCPs = new Set<string>();

    // Review each PFMEA with all associated Control Plans
    for (const pfmeaDoc of partData.pfmeas) {
      if (partData.controlPlans.length > 0) {
        for (const cp of partData.controlPlans) {
          const result = await runAutoReviewService(pfmeaDoc.id, cp.id, req.body.runBy);
          results.push({
            documentType: 'PFMEA_CP_Pair',
            pfmeaId: pfmeaDoc.id,
            pfmeaRev: pfmeaDoc.rev,
            controlPlanId: cp.id,
            controlPlanRev: cp.rev,
            ...result
          });
          reviewedCPs.add(cp.id);
        }
      } else {
        const result = await runAutoReviewService(pfmeaDoc.id, undefined, req.body.runBy);
        results.push({
          documentType: 'PFMEA',
          documentId: pfmeaDoc.id,
          documentRev: pfmeaDoc.rev,
          ...result
        });
      }
    }

    // Review any Control Plans not yet paired with PFMEAs
    for (const cp of partData.controlPlans) {
      if (!reviewedCPs.has(cp.id)) {
        const result = await runAutoReviewService(undefined, cp.id, req.body.runBy);
        results.push({
          documentType: 'ControlPlan',
          documentId: cp.id,
          documentRev: cp.rev,
          ...result
        });
      }
    }

    const totalFindings = results.reduce((sum, r) => sum + (r.totalFindings || 0), 0);
    const totalErrors = results.reduce((sum, r) => sum + (r.errorCount || 0), 0);
    const totalWarnings = results.reduce((sum, r) => sum + (r.warningCount || 0), 0);
    const totalInfo = results.reduce((sum, r) => sum + (r.infoCount || 0), 0);

    res.json({
      partId: id,
      partNumber: partData.part.partNumber,
      reviewedAt: new Date().toISOString(),
      summary: {
        total: totalFindings,
        errors: totalErrors,
        warnings: totalWarnings,
        info: totalInfo,
      },
      results,
    });
  } catch (error) {
    console.error("Auto-review error:", error);
    res.status(500).json({ message: "Failed to run auto-review" });
  }
});

// ============================================
// Advanced Auto-Review Endpoints
// ============================================

// Run auto-review on PFMEA and/or Control Plan
router.post('/auto-review/run', async (req, res) => {
  try {
    const { pfmeaId, controlPlanId, runBy } = req.body;

    if (!pfmeaId && !controlPlanId) {
      return res.status(400).json({
        error: 'At least one of pfmeaId or controlPlanId is required'
      });
    }

    const result = await runAutoReviewService(pfmeaId, controlPlanId, runBy);
    res.json(result);
  } catch (error) {
    console.error('Auto-review error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to run auto-review'
    });
  }
});

// Get auto-review history
router.get('/auto-review/history', async (req, res) => {
  try {
    const { pfmeaId, controlPlanId, limit } = req.query;

    const history = await getAutoReviewHistory(
      pfmeaId as string | undefined,
      controlPlanId as string | undefined,
      limit ? parseInt(limit as string, 10) : undefined
    );

    res.json(history);
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get history'
    });
  }
});

// Get auto-review summary for dashboard
router.get('/auto-review/summary', async (req, res) => {
  try {
    const { data: parts } = await storage.getAllParts();

    let partsWithPfmea = 0;
    let partsWithCP = 0;

    for (const part of parts) {
      const pfmeas = await storage.getPFMEAsByPartId(part.id);
      const controlPlans = await storage.getControlPlansByPartId(part.id);

      if (pfmeas.length > 0) partsWithPfmea++;
      if (controlPlans.length > 0) partsWithCP++;
    }

    const summary = {
      totalParts: parts.length,
      partsWithPfmea,
      partsWithCP,
      partsNeedingReview: parts.length - partsWithPfmea,
      lastReviewDate: null as string | null,
    };

    res.json(summary);
  } catch (error: unknown) {
    res.status(500).json({ error: getErrorMessage(error) });
  }
});

// Run auto-review for PFMEA (optionally with Control Plan)
router.post('/auto-review/validate', async (req, res) => {
  const { pfmeaId, controlPlanId, options } = req.body;

  if (!pfmeaId) {
    return res.status(400).json({ error: 'pfmeaId is required' });
  }

  try {
    const result = await autoReviewService.runReview({
      pfmeaId,
      controlPlanId,
      options,
    });

    res.json(result);
  } catch (error: unknown) {
    console.error('Auto-review failed:', error);
    res.status(500).json({ error: getErrorMessage(error) });
  }
});

// Get single auto-review run with findings
router.get('/auto-review/:runId', async (req, res) => {
  try {
    const run = await getAutoReviewRun(req.params.runId);

    if (!run) {
      return res.status(404).json({ error: 'Auto-review run not found' });
    }

    res.json(run);
  } catch (error) {
    console.error('Get run error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get run'
    });
  }
});

// Resolve a finding (advanced)
router.post('/auto-review/findings/:findingId/resolve', async (req, res) => {
  try {
    const { resolution, resolvedBy } = req.body;

    if (!resolution || !resolvedBy) {
      return res.status(400).json({
        error: 'resolution and resolvedBy are required'
      });
    }

    await resolveFinding(req.params.findingId, resolution, resolvedBy);
    res.json({ success: true });
  } catch (error) {
    console.error('Resolve finding error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to resolve finding'
    });
  }
});

// Waive a finding (advanced)
router.post('/auto-review/findings/:findingId/waive', async (req, res) => {
  try {
    const { waiverReason } = req.body;

    if (!waiverReason) {
      return res.status(400).json({
        error: 'waiverReason is required'
      });
    }

    await waiveFinding(req.params.findingId, waiverReason);
    res.json({ success: true });
  } catch (error) {
    console.error('Waive finding error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to waive finding'
    });
  }
});

export { router as autoReviewRouter };
