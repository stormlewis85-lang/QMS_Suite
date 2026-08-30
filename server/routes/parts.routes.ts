import { Router } from "express";
import { z } from "zod";
import { fromError } from "zod-validation-error";
import { storage } from "../storage";
import { insertPartSchema } from "@shared/schema";
import logger from '../logger';

const router = Router();

router.get("/parts", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;
    const result = await storage.getAllParts(req.orgId!, { limit, offset });
    res.json(req.query.limit || req.query.offset ? result : result.data);
  } catch (error) {
    logger.error({ err: error }, 'Error fetching parts');
    res.status(500).json({ error: "Failed to fetch parts" });
  }
});

router.get("/parts/:id", async (req, res) => {
  try {
    const part = await storage.getPartById(req.params.id);
    if (!part) {
      return res.status(404).json({ error: "Part not found" });
    }
    res.json(part);
  } catch (error) {
    logger.error({ err: error }, 'Error fetching part');
    res.status(500).json({ error: "Failed to fetch part" });
  }
});

router.get("/parts/:id/pfmeas", async (req, res) => {
  try {
    const pfmeas = await storage.getPFMEAsByPartId(req.params.id);
    res.json(pfmeas);
  } catch (error) {
    logger.error({ err: error }, 'Error fetching part PFMEAs');
    res.status(500).json({ error: "Failed to fetch part PFMEAs" });
  }
});

router.get("/parts/:id/control-plans", async (req, res) => {
  try {
    const controlPlans = await storage.getControlPlansByPartId(req.params.id);
    res.json(controlPlans);
  } catch (error) {
    logger.error({ err: error }, 'Error fetching part control plans');
    res.status(500).json({ error: "Failed to fetch part control plans" });
  }
});

router.get("/parts/:id/processes", async (req, res) => {
  try {
    const mappings = await storage.getPartProcessMappings(req.params.id);
    res.json(mappings);
  } catch (error) {
    logger.error({ err: error }, 'Error fetching part processes');
    res.status(500).json({ error: "Failed to fetch part processes" });
  }
});

router.post("/parts", async (req, res) => {
  try {
    const validatedData = insertPartSchema.parse({ ...req.body, orgId: req.orgId });
    const newPart = await storage.createPart(validatedData);
    res.status(201).json(newPart);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = fromError(error);
      return res.status(400).json({ error: validationError.toString() });
    }
    logger.error({ err: error }, 'Error creating part');
    res.status(500).json({ error: "Failed to create part" });
  }
});

// PATCH /api/parts/:id - Update a part
router.patch("/parts/:id", async (req, res) => {
  try {
    const updated = await storage.updatePart(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: "Part not found" });
    }
    res.json(updated);
  } catch (error) {
    logger.error({ err: error }, 'Error updating part');
    res.status(500).json({ error: "Failed to update part" });
  }
});

// DELETE /api/parts/:id - Delete a part
router.delete("/parts/:id", async (req, res) => {
  try {
    await storage.deletePart(req.params.id);
    res.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, 'Error deleting part');
    res.status(500).json({ error: "Failed to delete part" });
  }
});

export { router as partsRouter };
