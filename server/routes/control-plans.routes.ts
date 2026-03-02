import { Router } from "express";
import { randomUUID } from "crypto";
import { z } from "zod";
import { fromError } from "zod-validation-error";
import { storage } from "../storage";
import { db } from "../db";
import { eq, desc, inArray } from "drizzle-orm";
import { pfmea, controlPlan, controlPlanRow, autoReviewRun } from "@shared/schema";
import { insertControlPlanSchema, insertControlPlanRowSchema } from "@shared/schema";
import { getErrorMessage } from "./_helpers";

const router = Router();

router.get("/control-plans", async (req, res) => {
  try {
    const partId = req.query.partId as string | undefined;
    if (partId) {
      const controlPlans = await storage.getControlPlansByPartId(partId);
      res.json(controlPlans);
    } else {
      // Return all control plans when no partId specified
      const controlPlans = await storage.getAllControlPlans();
      res.json(controlPlans);
    }
  } catch (error) {
    console.error("Error fetching control plans:", error);
    res.status(500).json({ error: "Failed to fetch control plans" });
  }
});

router.get("/control-plans/:id", async (req, res) => {
  try {
    const cp = await storage.getControlPlanById(req.params.id);
    if (!cp) {
      return res.status(404).json({ error: "Control Plan not found" });
    }
    res.json(cp);
  } catch (error) {
    console.error("Error fetching control plan:", error);
    res.status(500).json({ error: "Failed to fetch control plan" });
  }
});

router.get("/control-plans/:id/rows", async (req, res) => {
  try {
    const rows = await storage.getControlPlanRows(req.params.id);
    res.json(rows);
  } catch (error) {
    console.error("Error fetching control plan rows:", error);
    res.status(500).json({ error: "Failed to fetch control plan rows" });
  }
});

router.post("/control-plans", async (req, res) => {
  try {
    const validatedData = insertControlPlanSchema.parse({ ...req.body, orgId: req.orgId });
    const newControlPlan = await storage.createControlPlan(validatedData);
    res.status(201).json(newControlPlan);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = fromError(error);
      return res.status(400).json({ error: validationError.toString() });
    }
    console.error("Error creating control plan:", error);
    res.status(500).json({ error: "Failed to create control plan" });
  }
});

router.post("/control-plans/:id/rows", async (req, res) => {
  try {
    const cpRow = insertControlPlanRowSchema.parse({
      ...req.body,
      controlPlanId: req.params.id,
    });
    const newRow = await storage.createControlPlanRow(cpRow);
    res.status(201).json(newRow);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = fromError(error);
      return res.status(400).json({ error: validationError.toString() });
    }
    console.error("Error creating control plan row:", error);
    res.status(500).json({ error: "Failed to create control plan row" });
  }
});

router.patch("/control-plan-rows/:id", async (req, res) => {
  try {
    const updates = insertControlPlanRowSchema.partial().parse(req.body);
    const updatedRow = await storage.updateControlPlanRow(req.params.id, updates);
    if (!updatedRow) {
      return res.status(404).json({ error: "Control plan row not found" });
    }
    res.json(updatedRow);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = fromError(error);
      return res.status(400).json({ error: validationError.toString() });
    }
    console.error("Error updating control plan row:", error);
    res.status(500).json({ error: "Failed to update control plan row" });
  }
});

// Copy Control Plan Row
router.post('/control-plan-rows/:id/copy', async (req, res) => {
  const { id } = req.params;

  try {
    const original = await db.query.controlPlanRow.findFirst({
      where: eq(controlPlanRow.id, id),
    });

    if (!original) {
      return res.status(404).json({ error: 'Row not found' });
    }

    // Generate new char ID
    const existingRows = await db.query.controlPlanRow.findMany({
      where: eq(controlPlanRow.controlPlanId, original.controlPlanId),
    });
    const maxCharNum = Math.max(...existingRows.map(r => {
      const match = r.charId?.match(/\d+/);
      return match ? parseInt(match[0]) : 0;
    }), 0);
    const newCharId = `C-${(maxCharNum + 1).toString().padStart(3, '0')}`;

    const [newRow] = await db.insert(controlPlanRow).values({
      id: randomUUID(),
      controlPlanId: original.controlPlanId,
      sourcePfmeaRowId: original.sourcePfmeaRowId,
      parentControlTemplateRowId: original.parentControlTemplateRowId,
      charId: newCharId,
      characteristicName: `${original.characteristicName} (Copy)`,
      type: original.type,
      target: original.target,
      tolerance: original.tolerance,
      specialFlag: original.specialFlag,
      csrSymbol: original.csrSymbol,
      measurementSystem: original.measurementSystem,
      gageDetails: original.gageDetails,
      sampleSize: original.sampleSize,
      frequency: original.frequency,
      controlMethod: original.controlMethod,
      acceptanceCriteria: original.acceptanceCriteria,
      reactionPlan: original.reactionPlan,
      overrideFlags: {},
    }).returning();

    res.json(newRow);
  } catch (error: unknown) {
    console.error('Error copying Control Plan row:', error);
    res.status(500).json({ error: getErrorMessage(error) });
  }
});

// Export Control Plan
router.get('/control-plans/:id/export', async (req, res) => {
  const { id } = req.params;
  const format = (req.query.format as string) || 'pdf';
  const includeSignatures = req.query.includeSignatures !== 'false';

  if (!['pdf', 'xlsx'].includes(format)) {
    return res.status(400).json({ error: 'Invalid format. Use pdf or xlsx' });
  }

  try {
    const { exportService } = await import('../services/export-service');
    const result = await exportService.export({
      format: format as 'pdf' | 'xlsx',
      documentType: 'control_plan',
      documentId: id,
      orgId: req.orgId!,
      includeSignatures,
      orientation: 'landscape',
    });

    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.setHeader('Content-Length', result.buffer.length);
    res.send(result.buffer);
  } catch (error: unknown) {
    console.error('Export failed:', error);
    res.status(500).json({ error: getErrorMessage(error) });
  }
});

// Bulk export for a part (all documents)
router.get('/parts/:id/export-all', async (req, res) => {
  const { id } = req.params;
  const format = (req.query.format as string) || 'xlsx';

  try {
    const latestPfmea = await db.query.pfmea.findFirst({
      where: eq(pfmea.partId, id),
      orderBy: (p, { desc }) => [desc(p.createdAt)],
    });

    const latestCP = await db.query.controlPlan.findFirst({
      where: eq(controlPlan.partId, id),
      orderBy: (cp, { desc }) => [desc(cp.createdAt)],
    });

    if (!latestPfmea && !latestCP) {
      return res.status(404).json({ error: 'No documents found for this part' });
    }

    const { exportService } = await import('../services/export-service');
    const exports: any = {};

    if (latestPfmea) {
      const pfmeaExport = await exportService.export({
        format: format as 'pdf' | 'xlsx',
        documentType: 'pfmea',
        documentId: latestPfmea.id,
        orgId: req.orgId!,
      });
      exports.pfmea = {
        filename: pfmeaExport.filename,
        mimeType: pfmeaExport.mimeType,
        base64: pfmeaExport.buffer.toString('base64'),
      };
    }

    if (latestCP) {
      const cpExport = await exportService.export({
        format: format as 'pdf' | 'xlsx',
        documentType: 'control_plan',
        documentId: latestCP.id,
        orgId: req.orgId!,
      });
      exports.controlPlan = {
        filename: cpExport.filename,
        mimeType: cpExport.mimeType,
        base64: cpExport.buffer.toString('base64'),
      };
    }

    res.json(exports);
  } catch (error: unknown) {
    console.error('Bulk export failed:', error);
    res.status(500).json({ error: getErrorMessage(error) });
  }
});

// DELETE /api/control-plans/:id - Delete Control Plan
router.delete("/control-plans/:id", async (req, res) => {
  try {
    const cpId = req.params.id;
    // Clear lastAutoReviewId on this CP to avoid FK issues
    await db.update(controlPlan).set({ lastAutoReviewId: null }).where(eq(controlPlan.id, cpId));
    // Clear cross-references: PFMEAs pointing to auto_review_runs owned by this CP
    const runs = await db.select({ id: autoReviewRun.id }).from(autoReviewRun).where(eq(autoReviewRun.controlPlanId, cpId));
    if (runs.length > 0) {
      await db.update(pfmea).set({ lastAutoReviewId: null }).where(inArray(pfmea.lastAutoReviewId, runs.map(r => r.id)));
    }
    // Delete associated rows then the control plan (auto_review_runs cascade)
    await db.delete(controlPlanRow).where(eq(controlPlanRow.controlPlanId, cpId));
    await db.delete(controlPlan).where(eq(controlPlan.id, cpId));
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting control plan:", error);
    res.status(500).json({ error: "Failed to delete control plan" });
  }
});

// Control Plans Status Change
router.patch('/control-plans/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const [updated] = await db.update(controlPlan)
      .set({ status })
      .where(eq(controlPlan.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Control Plan not found' });
    }

    res.json(updated);
  } catch (error: unknown) {
    res.status(500).json({ error: getErrorMessage(error) });
  }
});

export { router as controlPlansRouter };
