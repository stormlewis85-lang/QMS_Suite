import { Router } from "express";
import { z } from "zod";
import { fromError } from "zod-validation-error";
import { storage } from "../storage";
import {
  insertEquipmentLibrarySchema,
  insertEquipmentErrorProofingSchema,
  insertEquipmentControlMethodsSchema,
  insertFailureModesLibrarySchema,
  insertFmeaTemplateCatalogLinkSchema,
  insertControlsLibrarySchema,
  insertControlPairingsSchema,
  insertFmeaTemplateRowSchema,
  insertControlTemplateRowSchema,
  type FailureModeCategory,
  type ControlType,
  type ControlEffectiveness,
} from "@shared/schema";

const router = Router();

// ==================== Equipment Library API ====================

router.get("/equipment", async (req, res) => {
  try {
    const equipment = await storage.getAllEquipment(req.orgId!);
    res.json(equipment);
  } catch (error) {
    console.error("Error fetching equipment:", error);
    res.status(500).json({ error: "Failed to fetch equipment" });
  }
});

router.get("/equipment/:id", async (req, res) => {
  try {
    const equipment = await storage.getEquipmentById(req.params.id);
    if (!equipment) {
      return res.status(404).json({ error: "Equipment not found" });
    }
    res.json(equipment);
  } catch (error) {
    console.error("Error fetching equipment:", error);
    res.status(500).json({ error: "Failed to fetch equipment" });
  }
});

router.post("/equipment", async (req, res) => {
  try {
    const validatedData = insertEquipmentLibrarySchema.parse({ ...req.body, orgId: req.orgId });
    const newEquipment = await storage.createEquipment(validatedData);
    res.status(201).json(newEquipment);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = fromError(error);
      return res.status(400).json({ error: validationError.toString() });
    }
    console.error("Error creating equipment:", error);
    res.status(500).json({ error: "Failed to create equipment" });
  }
});

router.patch("/equipment/:id", async (req, res) => {
  try {
    const updates = insertEquipmentLibrarySchema.partial().parse(req.body);
    const updatedEquipment = await storage.updateEquipment(req.params.id, updates);
    if (!updatedEquipment) {
      return res.status(404).json({ error: "Equipment not found" });
    }
    res.json(updatedEquipment);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = fromError(error);
      return res.status(400).json({ error: validationError.toString() });
    }
    console.error("Error updating equipment:", error);
    res.status(500).json({ error: "Failed to update equipment" });
  }
});

router.delete("/equipment/:id", async (req, res) => {
  try {
    const success = await storage.deleteEquipment(req.params.id);
    if (!success) {
      return res.status(404).json({ error: "Equipment not found" });
    }
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting equipment:", error);
    res.status(500).json({ error: "Failed to delete equipment" });
  }
});

// Equipment Error-Proofing Controls API
router.post("/equipment/:id/error-proofing", async (req, res) => {
  try {
    const control = insertEquipmentErrorProofingSchema.parse({
      ...req.body,
      equipmentId: req.params.id,
    });
    const newControl = await storage.createErrorProofingControl(control);
    res.status(201).json(newControl);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = fromError(error);
      return res.status(400).json({ error: validationError.toString() });
    }
    console.error("Error creating error-proofing control:", error);
    res.status(500).json({ error: "Failed to create error-proofing control" });
  }
});

router.patch("/equipment-error-proofing/:id", async (req, res) => {
  try {
    const updates = insertEquipmentErrorProofingSchema.partial().parse(req.body);
    const updatedControl = await storage.updateErrorProofingControl(req.params.id, updates);
    if (!updatedControl) {
      return res.status(404).json({ error: "Error-proofing control not found" });
    }
    res.json(updatedControl);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = fromError(error);
      return res.status(400).json({ error: validationError.toString() });
    }
    console.error("Error updating error-proofing control:", error);
    res.status(500).json({ error: "Failed to update error-proofing control" });
  }
});

router.delete("/equipment-error-proofing/:id", async (req, res) => {
  try {
    const success = await storage.deleteErrorProofingControl(req.params.id);
    if (!success) {
      return res.status(404).json({ error: "Error-proofing control not found" });
    }
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting error-proofing control:", error);
    res.status(500).json({ error: "Failed to delete error-proofing control" });
  }
});

// Equipment Control Methods API
router.post("/equipment/:id/control-methods", async (req, res) => {
  try {
    const method = insertEquipmentControlMethodsSchema.parse({
      ...req.body,
      equipmentId: req.params.id,
    });
    const newMethod = await storage.createControlMethod(method);
    res.status(201).json(newMethod);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = fromError(error);
      return res.status(400).json({ error: validationError.toString() });
    }
    console.error("Error creating control method:", error);
    res.status(500).json({ error: "Failed to create control method" });
  }
});

router.patch("/equipment-control-methods/:id", async (req, res) => {
  try {
    const updates = insertEquipmentControlMethodsSchema.partial().parse(req.body);
    const updatedMethod = await storage.updateControlMethod(req.params.id, updates);
    if (!updatedMethod) {
      return res.status(404).json({ error: "Control method not found" });
    }
    res.json(updatedMethod);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = fromError(error);
      return res.status(400).json({ error: validationError.toString() });
    }
    console.error("Error updating control method:", error);
    res.status(500).json({ error: "Failed to update control method" });
  }
});

router.delete("/equipment-control-methods/:id", async (req, res) => {
  try {
    const success = await storage.deleteControlMethod(req.params.id);
    if (!success) {
      return res.status(404).json({ error: "Control method not found" });
    }
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting control method:", error);
    res.status(500).json({ error: "Failed to delete control method" });
  }
});

// ==================== Failure Modes Library API ====================

router.get("/failure-modes", async (req, res) => {
  try {
    const { category, search, status } = req.query;
    const filters: { orgId?: string; category?: FailureModeCategory; search?: string; status?: string } = {
      orgId: req.orgId,
    };

    if (category && typeof category === 'string') {
      filters.category = category as FailureModeCategory;
    }
    if (search && typeof search === 'string') {
      filters.search = search;
    }
    if (status && typeof status === 'string') {
      filters.status = status;
    }

    const failureModes = await storage.getAllFailureModes(filters);
    res.json(failureModes);
  } catch (error) {
    console.error("Error fetching failure modes:", error);
    res.status(500).json({ error: "Failed to fetch failure modes" });
  }
});

router.get("/failure-modes/:id", async (req, res) => {
  try {
    const failureMode = await storage.getFailureModeById(req.params.id);
    if (!failureMode) {
      return res.status(404).json({ error: "Failure mode not found" });
    }
    res.json(failureMode);
  } catch (error) {
    console.error("Error fetching failure mode:", error);
    res.status(500).json({ error: "Failed to fetch failure mode" });
  }
});

router.post("/failure-modes", async (req, res) => {
  try {
    const validatedData = insertFailureModesLibrarySchema.parse({ ...req.body, orgId: req.orgId });
    const newFailureMode = await storage.createFailureMode(validatedData);
    res.status(201).json(newFailureMode);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = fromError(error);
      return res.status(400).json({ error: validationError.toString() });
    }
    console.error("Error creating failure mode:", error);
    res.status(500).json({ error: "Failed to create failure mode" });
  }
});

router.patch("/failure-modes/:id", async (req, res) => {
  try {
    const updates = insertFailureModesLibrarySchema.partial().parse(req.body);
    const updatedFailureMode = await storage.updateFailureMode(req.params.id, updates);
    if (!updatedFailureMode) {
      return res.status(404).json({ error: "Failure mode not found" });
    }
    res.json(updatedFailureMode);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = fromError(error);
      return res.status(400).json({ error: validationError.toString() });
    }
    console.error("Error updating failure mode:", error);
    res.status(500).json({ error: "Failed to update failure mode" });
  }
});

router.delete("/failure-modes/:id", async (req, res) => {
  try {
    const success = await storage.deleteFailureMode(req.params.id);
    if (!success) {
      return res.status(404).json({ error: "Failure mode not found" });
    }
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting failure mode:", error);
    res.status(500).json({ error: "Failed to delete failure mode" });
  }
});

// Update last used timestamp when adopting
router.post("/failure-modes/:id/adopt", async (req, res) => {
  try {
    await storage.updateFailureModeLastUsed(req.params.id);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error updating failure mode last used:", error);
    res.status(500).json({ error: "Failed to update failure mode" });
  }
});

// ==================== Catalog Links API ====================

router.post("/catalog-links", async (req, res) => {
  try {
    const validatedData = insertFmeaTemplateCatalogLinkSchema.parse(req.body);
    const newLink = await storage.createCatalogLink(validatedData);
    res.status(201).json(newLink);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = fromError(error);
      return res.status(400).json({ error: validationError.toString() });
    }
    console.error("Error creating catalog link:", error);
    res.status(500).json({ error: "Failed to create catalog link" });
  }
});

router.get("/catalog-links/by-template/:templateRowId", async (req, res) => {
  try {
    const links = await storage.getCatalogLinksByTemplateRowId(req.params.templateRowId);
    res.json(links);
  } catch (error) {
    console.error("Error fetching catalog links:", error);
    res.status(500).json({ error: "Failed to fetch catalog links" });
  }
});

router.get("/catalog-links/by-catalog/:catalogItemId", async (req, res) => {
  try {
    const links = await storage.getCatalogLinksByCatalogItemId(req.params.catalogItemId);
    res.json(links);
  } catch (error) {
    console.error("Error fetching catalog links:", error);
    res.status(500).json({ error: "Failed to fetch catalog links" });
  }
});

// ==================== Controls Library API ====================

router.get("/controls-library", async (req, res) => {
  try {
    const { type, effectiveness, search, status } = req.query;
    const filters: { orgId?: string; type?: ControlType; effectiveness?: ControlEffectiveness; search?: string; status?: string } = {
      orgId: req.orgId,
    };

    if (type && typeof type === 'string') {
      filters.type = type as ControlType;
    }
    if (effectiveness && typeof effectiveness === 'string') {
      filters.effectiveness = effectiveness as ControlEffectiveness;
    }
    if (search && typeof search === 'string') {
      filters.search = search;
    }
    if (status && typeof status === 'string') {
      filters.status = status;
    }

    const controls = await storage.getAllControls(filters);
    res.json(controls);
  } catch (error) {
    console.error("Error fetching controls:", error);
    res.status(500).json({ error: "Failed to fetch controls" });
  }
});

router.get("/controls-library/:id", async (req, res) => {
  try {
    const control = await storage.getControlById(req.params.id);
    if (!control) {
      return res.status(404).json({ error: "Control not found" });
    }
    res.json(control);
  } catch (error) {
    console.error("Error fetching control:", error);
    res.status(500).json({ error: "Failed to fetch control" });
  }
});

router.post("/controls-library", async (req, res) => {
  try {
    const validatedData = insertControlsLibrarySchema.parse({ ...req.body, orgId: req.orgId });
    const newControl = await storage.createControl(validatedData);
    res.status(201).json(newControl);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = fromError(error);
      return res.status(400).json({ error: validationError.toString() });
    }
    console.error("Error creating control:", error);
    res.status(500).json({ error: "Failed to create control" });
  }
});

router.patch("/controls-library/:id", async (req, res) => {
  try {
    const updates = insertControlsLibrarySchema.partial().parse(req.body);
    const updatedControl = await storage.updateControl(req.params.id, updates);
    if (!updatedControl) {
      return res.status(404).json({ error: "Control not found" });
    }
    res.json(updatedControl);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = fromError(error);
      return res.status(400).json({ error: validationError.toString() });
    }
    console.error("Error updating control:", error);
    res.status(500).json({ error: "Failed to update control" });
  }
});

router.delete("/controls-library/:id", async (req, res) => {
  try {
    const success = await storage.deleteControl(req.params.id);
    if (!success) {
      return res.status(404).json({ error: "Control not found" });
    }
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting control:", error);
    res.status(500).json({ error: "Failed to delete control" });
  }
});

// Update last used timestamp when adopting a control
router.post("/controls-library/:id/adopt", async (req, res) => {
  try {
    await storage.updateControlLastUsed(req.params.id);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error updating control last used:", error);
    res.status(500).json({ error: "Failed to update control" });
  }
});

// ==================== Control Pairings API ====================

router.get("/control-pairings", async (req, res) => {
  try {
    const pairings = await storage.getAllControlPairings();
    res.json(pairings);
  } catch (error) {
    console.error("Error fetching control pairings:", error);
    res.status(500).json({ error: "Failed to fetch control pairings" });
  }
});

router.get("/control-pairings/by-failure-mode/:failureModeId", async (req, res) => {
  try {
    const pairings = await storage.getControlPairingsByFailureModeId(req.params.failureModeId);
    res.json(pairings);
  } catch (error) {
    console.error("Error fetching control pairings:", error);
    res.status(500).json({ error: "Failed to fetch control pairings" });
  }
});

router.post("/control-pairings", async (req, res) => {
  try {
    const validatedData = insertControlPairingsSchema.parse(req.body);
    const newPairing = await storage.createControlPairing(validatedData);
    res.status(201).json(newPairing);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = fromError(error);
      return res.status(400).json({ error: validationError.toString() });
    }
    console.error("Error creating control pairing:", error);
    res.status(500).json({ error: "Failed to create control pairing" });
  }
});

router.delete("/control-pairings/:id", async (req, res) => {
  try {
    const success = await storage.deleteControlPairing(req.params.id);
    if (!success) {
      return res.status(404).json({ error: "Control pairing not found" });
    }
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting control pairing:", error);
    res.status(500).json({ error: "Failed to delete control pairing" });
  }
});

// ==================== FMEA Template Rows API (Phase 6) ====================

router.get("/processes/:processId/fmea-template-rows", async (req, res) => {
  try {
    const rows = await storage.getFmeaTemplateRowsByProcessId(req.params.processId);
    res.json(rows);
  } catch (error) {
    console.error("Error fetching FMEA template rows:", error);
    res.status(500).json({ error: "Failed to fetch FMEA template rows" });
  }
});

router.get("/fmea-template-rows/:id", async (req, res) => {
  try {
    const row = await storage.getFmeaTemplateRowById(req.params.id);
    if (!row) {
      return res.status(404).json({ error: "FMEA template row not found" });
    }
    res.json(row);
  } catch (error) {
    console.error("Error fetching FMEA template row:", error);
    res.status(500).json({ error: "Failed to fetch FMEA template row" });
  }
});

router.post("/processes/:processId/fmea-template-rows", async (req, res) => {
  try {
    const validatedData = insertFmeaTemplateRowSchema.parse({
      ...req.body,
      processDefId: req.params.processId,
    });
    const newRow = await storage.createFmeaTemplateRow(validatedData);
    res.status(201).json(newRow);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = fromError(error);
      return res.status(400).json({ error: validationError.toString() });
    }
    console.error("Error creating FMEA template row:", error);
    res.status(500).json({ error: "Failed to create FMEA template row" });
  }
});

router.patch("/fmea-template-rows/:id", async (req, res) => {
  try {
    const updates = insertFmeaTemplateRowSchema.partial().parse(req.body);
    const updatedRow = await storage.updateFmeaTemplateRow(req.params.id, updates);
    if (!updatedRow) {
      return res.status(404).json({ error: "FMEA template row not found" });
    }
    res.json(updatedRow);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = fromError(error);
      return res.status(400).json({ error: validationError.toString() });
    }
    console.error("Error updating FMEA template row:", error);
    res.status(500).json({ error: "Failed to update FMEA template row" });
  }
});

router.delete("/fmea-template-rows/:id", async (req, res) => {
  try {
    const deleted = await storage.deleteFmeaTemplateRow(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "FMEA template row not found" });
    }
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting FMEA template row:", error);
    res.status(500).json({ error: "Failed to delete FMEA template row" });
  }
});

router.post("/fmea-template-rows/:id/duplicate", async (req, res) => {
  try {
    const duplicatedRow = await storage.duplicateFmeaTemplateRow(req.params.id);
    if (!duplicatedRow) {
      return res.status(404).json({ error: "FMEA template row not found" });
    }
    res.status(201).json(duplicatedRow);
  } catch (error) {
    console.error("Error duplicating FMEA template row:", error);
    res.status(500).json({ error: "Failed to duplicate FMEA template row" });
  }
});

// ==================== Control Template Rows API (Phase 6) ====================

router.get("/processes/:processId/control-template-rows", async (req, res) => {
  try {
    const rows = await storage.getControlTemplateRowsByProcessId(req.params.processId);
    res.json(rows);
  } catch (error) {
    console.error("Error fetching control template rows:", error);
    res.status(500).json({ error: "Failed to fetch control template rows" });
  }
});

router.get("/control-template-rows/:id", async (req, res) => {
  try {
    const row = await storage.getControlTemplateRowById(req.params.id);
    if (!row) {
      return res.status(404).json({ error: "Control template row not found" });
    }
    res.json(row);
  } catch (error) {
    console.error("Error fetching control template row:", error);
    res.status(500).json({ error: "Failed to fetch control template row" });
  }
});

router.post("/processes/:processId/control-template-rows", async (req, res) => {
  try {
    const validatedData = insertControlTemplateRowSchema.parse({
      ...req.body,
      processDefId: req.params.processId,
    });
    const newRow = await storage.createControlTemplateRow(validatedData);
    res.status(201).json(newRow);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = fromError(error);
      return res.status(400).json({ error: validationError.toString() });
    }
    console.error("Error creating control template row:", error);
    res.status(500).json({ error: "Failed to create control template row" });
  }
});

router.patch("/control-template-rows/:id", async (req, res) => {
  try {
    const updates = insertControlTemplateRowSchema.partial().parse(req.body);
    const updatedRow = await storage.updateControlTemplateRow(req.params.id, updates);
    if (!updatedRow) {
      return res.status(404).json({ error: "Control template row not found" });
    }
    res.json(updatedRow);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = fromError(error);
      return res.status(400).json({ error: validationError.toString() });
    }
    console.error("Error updating control template row:", error);
    res.status(500).json({ error: "Failed to update control template row" });
  }
});

router.delete("/control-template-rows/:id", async (req, res) => {
  try {
    const deleted = await storage.deleteControlTemplateRow(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Control template row not found" });
    }
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting control template row:", error);
    res.status(500).json({ error: "Failed to delete control template row" });
  }
});

router.post("/control-template-rows/:id/duplicate", async (req, res) => {
  try {
    const duplicatedRow = await storage.duplicateControlTemplateRow(req.params.id);
    if (!duplicatedRow) {
      return res.status(404).json({ error: "Control template row not found" });
    }
    res.status(201).json(duplicatedRow);
  } catch (error) {
    console.error("Error duplicating control template row:", error);
    res.status(500).json({ error: "Failed to duplicate control template row" });
  }
});

export { router as librariesRouter };
