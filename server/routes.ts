import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { runAutoReview, runControlPlanReview } from "./auto-review";
import {
  insertPartSchema,
  insertProcessDefSchema,
  insertProcessStepSchema,
  insertPfmeaSchema,
  insertPfmeaRowSchema,
  insertControlPlanSchema,
  insertControlPlanRowSchema,
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
import { z } from "zod";
import { fromError } from "zod-validation-error";

export async function registerRoutes(app: Express): Promise<Server> {
  // Parts API
  app.get("/api/parts", async (req, res) => {
    try {
      const parts = await storage.getAllParts();
      res.json(parts);
    } catch (error) {
      console.error("Error fetching parts:", error);
      res.status(500).json({ error: "Failed to fetch parts" });
    }
  });

  app.get("/api/parts/:id", async (req, res) => {
    try {
      const part = await storage.getPartById(req.params.id);
      if (!part) {
        return res.status(404).json({ error: "Part not found" });
      }
      res.json(part);
    } catch (error) {
      console.error("Error fetching part:", error);
      res.status(500).json({ error: "Failed to fetch part" });
    }
  });

  app.post("/api/parts", async (req, res) => {
    try {
      const validatedData = insertPartSchema.parse(req.body);
      const newPart = await storage.createPart(validatedData);
      res.status(201).json(newPart);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = fromError(error);
        return res.status(400).json({ error: validationError.toString() });
      }
      console.error("Error creating part:", error);
      res.status(500).json({ error: "Failed to create part" });
    }
  });

  // Processes API
  app.get("/api/processes", async (req, res) => {
    try {
      const processes = await storage.getAllProcesses();
      res.json(processes);
    } catch (error) {
      console.error("Error fetching processes:", error);
      res.status(500).json({ error: "Failed to fetch processes" });
    }
  });

  app.get("/api/processes/:id", async (req, res) => {
    try {
      const process = await storage.getProcessWithSteps(req.params.id);
      if (!process) {
        return res.status(404).json({ error: "Process not found" });
      }
      res.json(process);
    } catch (error) {
      console.error("Error fetching process:", error);
      res.status(500).json({ error: "Failed to fetch process" });
    }
  });

  const createProcessWithStepsSchema = z.object({
    process: insertProcessDefSchema.extend({
      createdBy: z.string().uuid().optional(),
    }),
    steps: z.array(insertProcessStepSchema).default([]),
  });

  app.post("/api/processes", async (req, res) => {
    try {
      const validatedData = createProcessWithStepsSchema.parse(req.body);
      const userId = validatedData.process.createdBy || crypto.randomUUID();
      
      const processData = {
        ...validatedData.process,
        createdBy: userId,
      };

      const newProcess = await storage.createProcessWithSteps(
        processData,
        validatedData.steps
      );
      res.status(201).json(newProcess);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = fromError(error);
        return res.status(400).json({ error: validationError.toString() });
      }
      console.error("Error creating process:", error);
      res.status(500).json({ error: "Failed to create process" });
    }
  });

  app.patch("/api/processes/:id", async (req, res) => {
    try {
      const updates = insertProcessDefSchema.partial().parse(req.body);
      const updatedProcess = await storage.updateProcess(req.params.id, updates);
      if (!updatedProcess) {
        return res.status(404).json({ error: "Process not found" });
      }
      res.json(updatedProcess);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = fromError(error);
        return res.status(400).json({ error: validationError.toString() });
      }
      console.error("Error updating process:", error);
      res.status(500).json({ error: "Failed to update process" });
    }
  });

  app.delete("/api/processes/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteProcess(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Process not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting process:", error);
      res.status(500).json({ error: "Failed to delete process" });
    }
  });

  // Process Steps API
  app.get("/api/processes/:processId/steps", async (req, res) => {
    try {
      const steps = await storage.getStepsByProcessId(req.params.processId);
      res.json(steps);
    } catch (error) {
      console.error("Error fetching process steps:", error);
      res.status(500).json({ error: "Failed to fetch process steps" });
    }
  });

  app.post("/api/processes/:processId/steps", async (req, res) => {
    try {
      const stepData = insertProcessStepSchema.parse({
        ...req.body,
        processDefId: req.params.processId,
      });
      
      // Validate subprocess_ref requires subprocessRefId
      if (stepData.stepType === 'subprocess_ref' && !stepData.subprocessRefId) {
        return res.status(400).json({ error: "Subprocess reference steps require a subprocessRefId" });
      }
      
      // Validate parentStepId belongs to same process and is a group
      if (stepData.parentStepId) {
        const steps = await storage.getStepsByProcessId(req.params.processId);
        const parentStep = steps.find(s => s.id === stepData.parentStepId);
        if (!parentStep) {
          return res.status(400).json({ error: "Parent step not found in this process" });
        }
        if (parentStep.stepType !== 'group') {
          return res.status(400).json({ error: "Parent step must be a group" });
        }
      }
      
      const newStep = await storage.createProcessStep(stepData);
      res.status(201).json(newStep);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = fromError(error);
        return res.status(400).json({ error: validationError.toString() });
      }
      console.error("Error creating process step:", error);
      res.status(500).json({ error: "Failed to create process step" });
    }
  });

  app.patch("/api/processes/:processId/steps/:stepId", async (req, res) => {
    try {
      const updates = insertProcessStepSchema.partial().parse(req.body);
      
      // Validate subprocess_ref requires subprocessRefId
      if (updates.stepType === 'subprocess_ref' && updates.subprocessRefId === null) {
        return res.status(400).json({ error: "Subprocess reference steps require a subprocessRefId" });
      }
      
      // Validate parentStepId belongs to same process and is a group
      if (updates.parentStepId) {
        const steps = await storage.getStepsByProcessId(req.params.processId);
        const parentStep = steps.find(s => s.id === updates.parentStepId);
        if (!parentStep) {
          return res.status(400).json({ error: "Parent step not found in this process" });
        }
        if (parentStep.stepType !== 'group') {
          return res.status(400).json({ error: "Parent step must be a group" });
        }
        // Prevent circular references (can't parent to self or own children)
        if (updates.parentStepId === req.params.stepId) {
          return res.status(400).json({ error: "Step cannot be its own parent" });
        }
      }
      
      const updatedStep = await storage.updateProcessStep(req.params.stepId, updates);
      if (!updatedStep) {
        return res.status(404).json({ error: "Process step not found" });
      }
      res.json(updatedStep);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = fromError(error);
        return res.status(400).json({ error: validationError.toString() });
      }
      console.error("Error updating process step:", error);
      res.status(500).json({ error: "Failed to update process step" });
    }
  });

  app.delete("/api/processes/:processId/steps/:stepId", async (req, res) => {
    try {
      const deleted = await storage.deleteProcessStep(req.params.stepId);
      if (!deleted) {
        return res.status(404).json({ error: "Process step not found" });
      }
      // Resequence after deletion
      await storage.resequenceSteps(req.params.processId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting process step:", error);
      res.status(500).json({ error: "Failed to delete process step" });
    }
  });

  // Get child steps of a group
  app.get("/api/processes/steps/:stepId/children", async (req, res) => {
    try {
      const children = await storage.getChildSteps(req.params.stepId);
      res.json(children);
    } catch (error) {
      console.error("Error fetching child steps:", error);
      res.status(500).json({ error: "Failed to fetch child steps" });
    }
  });

  // PFMEA API
  app.get("/api/pfmea", async (req, res) => {
    try {
      const partId = req.query.partId as string;
      if (!partId) {
        return res.status(400).json({ error: "partId query parameter is required" });
      }
      const pfmeas = await storage.getPFMEAsByPartId(partId);
      res.json(pfmeas);
    } catch (error) {
      console.error("Error fetching PFMEAs:", error);
      res.status(500).json({ error: "Failed to fetch PFMEAs" });
    }
  });

  app.get("/api/pfmea/:id", async (req, res) => {
    try {
      const pfmea = await storage.getPFMEAById(req.params.id);
      if (!pfmea) {
        return res.status(404).json({ error: "PFMEA not found" });
      }
      res.json(pfmea);
    } catch (error) {
      console.error("Error fetching PFMEA:", error);
      res.status(500).json({ error: "Failed to fetch PFMEA" });
    }
  });

  app.post("/api/pfmea", async (req, res) => {
    try {
      const validatedData = insertPfmeaSchema.parse(req.body);
      const newPFMEA = await storage.createPFMEA(validatedData);
      res.status(201).json(newPFMEA);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = fromError(error);
        return res.status(400).json({ error: validationError.toString() });
      }
      console.error("Error creating PFMEA:", error);
      res.status(500).json({ error: "Failed to create PFMEA" });
    }
  });

  app.post("/api/pfmea/:id/rows", async (req, res) => {
    try {
      const pfmeaRow = insertPfmeaRowSchema.parse({
        ...req.body,
        pfmeaId: req.params.id,
      });
      const newRow = await storage.createPFMEARow(pfmeaRow);
      res.status(201).json(newRow);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = fromError(error);
        return res.status(400).json({ error: validationError.toString() });
      }
      console.error("Error creating PFMEA row:", error);
      res.status(500).json({ error: "Failed to create PFMEA row" });
    }
  });

  app.patch("/api/pfmea-rows/:id", async (req, res) => {
    try {
      const updates = insertPfmeaRowSchema.partial().parse(req.body);
      const updatedRow = await storage.updatePFMEARow(req.params.id, updates);
      if (!updatedRow) {
        return res.status(404).json({ error: "PFMEA row not found" });
      }
      res.json(updatedRow);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = fromError(error);
        return res.status(400).json({ error: validationError.toString() });
      }
      console.error("Error updating PFMEA row:", error);
      res.status(500).json({ error: "Failed to update PFMEA row" });
    }
  });

  // Control Plans API
  app.get("/api/control-plans", async (req, res) => {
    try {
      const partId = req.query.partId as string;
      if (!partId) {
        return res.status(400).json({ error: "partId query parameter is required" });
      }
      const controlPlans = await storage.getControlPlansByPartId(partId);
      res.json(controlPlans);
    } catch (error) {
      console.error("Error fetching control plans:", error);
      res.status(500).json({ error: "Failed to fetch control plans" });
    }
  });

  app.get("/api/control-plans/:id", async (req, res) => {
    try {
      const controlPlan = await storage.getControlPlanById(req.params.id);
      if (!controlPlan) {
        return res.status(404).json({ error: "Control Plan not found" });
      }
      res.json(controlPlan);
    } catch (error) {
      console.error("Error fetching control plan:", error);
      res.status(500).json({ error: "Failed to fetch control plan" });
    }
  });

  app.post("/api/control-plans", async (req, res) => {
    try {
      const validatedData = insertControlPlanSchema.parse(req.body);
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

  app.post("/api/control-plans/:id/rows", async (req, res) => {
    try {
      const controlPlanRow = insertControlPlanRowSchema.parse({
        ...req.body,
        controlPlanId: req.params.id,
      });
      const newRow = await storage.createControlPlanRow(controlPlanRow);
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

  app.patch("/api/control-plan-rows/:id", async (req, res) => {
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

  // Equipment Library API
  app.get("/api/equipment", async (req, res) => {
    try {
      const equipment = await storage.getAllEquipment();
      res.json(equipment);
    } catch (error) {
      console.error("Error fetching equipment:", error);
      res.status(500).json({ error: "Failed to fetch equipment" });
    }
  });

  app.get("/api/equipment/:id", async (req, res) => {
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

  app.post("/api/equipment", async (req, res) => {
    try {
      const validatedData = insertEquipmentLibrarySchema.parse(req.body);
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

  app.patch("/api/equipment/:id", async (req, res) => {
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

  app.delete("/api/equipment/:id", async (req, res) => {
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
  app.post("/api/equipment/:id/error-proofing", async (req, res) => {
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

  app.patch("/api/equipment-error-proofing/:id", async (req, res) => {
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

  app.delete("/api/equipment-error-proofing/:id", async (req, res) => {
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
  app.post("/api/equipment/:id/control-methods", async (req, res) => {
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

  app.patch("/api/equipment-control-methods/:id", async (req, res) => {
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

  app.delete("/api/equipment-control-methods/:id", async (req, res) => {
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

  // Failure Modes Library API
  app.get("/api/failure-modes", async (req, res) => {
    try {
      const { category, search, status } = req.query;
      const filters: { category?: FailureModeCategory; search?: string; status?: string } = {};
      
      if (category && typeof category === 'string') {
        filters.category = category as FailureModeCategory;
      }
      if (search && typeof search === 'string') {
        filters.search = search;
      }
      if (status && typeof status === 'string') {
        filters.status = status;
      }
      
      const failureModes = await storage.getAllFailureModes(
        Object.keys(filters).length > 0 ? filters : undefined
      );
      res.json(failureModes);
    } catch (error) {
      console.error("Error fetching failure modes:", error);
      res.status(500).json({ error: "Failed to fetch failure modes" });
    }
  });

  app.get("/api/failure-modes/:id", async (req, res) => {
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

  app.post("/api/failure-modes", async (req, res) => {
    try {
      const validatedData = insertFailureModesLibrarySchema.parse(req.body);
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

  app.patch("/api/failure-modes/:id", async (req, res) => {
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

  app.delete("/api/failure-modes/:id", async (req, res) => {
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
  app.post("/api/failure-modes/:id/adopt", async (req, res) => {
    try {
      await storage.updateFailureModeLastUsed(req.params.id);
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error updating failure mode last used:", error);
      res.status(500).json({ error: "Failed to update failure mode" });
    }
  });

  // Catalog Links API
  app.post("/api/catalog-links", async (req, res) => {
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

  app.get("/api/catalog-links/by-template/:templateRowId", async (req, res) => {
    try {
      const links = await storage.getCatalogLinksByTemplateRowId(req.params.templateRowId);
      res.json(links);
    } catch (error) {
      console.error("Error fetching catalog links:", error);
      res.status(500).json({ error: "Failed to fetch catalog links" });
    }
  });

  app.get("/api/catalog-links/by-catalog/:catalogItemId", async (req, res) => {
    try {
      const links = await storage.getCatalogLinksByCatalogItemId(req.params.catalogItemId);
      res.json(links);
    } catch (error) {
      console.error("Error fetching catalog links:", error);
      res.status(500).json({ error: "Failed to fetch catalog links" });
    }
  });

  // Controls Library API
  app.get("/api/controls-library", async (req, res) => {
    try {
      const { type, effectiveness, search, status } = req.query;
      const filters: { type?: ControlType; effectiveness?: ControlEffectiveness; search?: string; status?: string } = {};
      
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
      
      const controls = await storage.getAllControls(
        Object.keys(filters).length > 0 ? filters : undefined
      );
      res.json(controls);
    } catch (error) {
      console.error("Error fetching controls:", error);
      res.status(500).json({ error: "Failed to fetch controls" });
    }
  });

  app.get("/api/controls-library/:id", async (req, res) => {
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

  app.post("/api/controls-library", async (req, res) => {
    try {
      const validatedData = insertControlsLibrarySchema.parse(req.body);
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

  app.patch("/api/controls-library/:id", async (req, res) => {
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

  app.delete("/api/controls-library/:id", async (req, res) => {
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
  app.post("/api/controls-library/:id/adopt", async (req, res) => {
    try {
      await storage.updateControlLastUsed(req.params.id);
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error updating control last used:", error);
      res.status(500).json({ error: "Failed to update control" });
    }
  });

  // Control Pairings API (for smart suggestions)
  app.get("/api/control-pairings", async (req, res) => {
    try {
      const pairings = await storage.getAllControlPairings();
      res.json(pairings);
    } catch (error) {
      console.error("Error fetching control pairings:", error);
      res.status(500).json({ error: "Failed to fetch control pairings" });
    }
  });

  app.get("/api/control-pairings/by-failure-mode/:failureModeId", async (req, res) => {
    try {
      const pairings = await storage.getControlPairingsByFailureModeId(req.params.failureModeId);
      res.json(pairings);
    } catch (error) {
      console.error("Error fetching control pairings:", error);
      res.status(500).json({ error: "Failed to fetch control pairings" });
    }
  });

  app.post("/api/control-pairings", async (req, res) => {
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

  app.delete("/api/control-pairings/:id", async (req, res) => {
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
  
  // Get all FMEA template rows for a process
  app.get("/api/processes/:processId/fmea-template-rows", async (req, res) => {
    try {
      const rows = await storage.getFmeaTemplateRowsByProcessId(req.params.processId);
      res.json(rows);
    } catch (error) {
      console.error("Error fetching FMEA template rows:", error);
      res.status(500).json({ error: "Failed to fetch FMEA template rows" });
    }
  });

  // Get a single FMEA template row by ID
  app.get("/api/fmea-template-rows/:id", async (req, res) => {
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

  // Create a new FMEA template row
  app.post("/api/processes/:processId/fmea-template-rows", async (req, res) => {
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

  // Update an FMEA template row
  app.patch("/api/fmea-template-rows/:id", async (req, res) => {
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

  // Delete an FMEA template row
  app.delete("/api/fmea-template-rows/:id", async (req, res) => {
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

  // Duplicate an FMEA template row
  app.post("/api/fmea-template-rows/:id/duplicate", async (req, res) => {
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
  
  // Get all control template rows for a process
  app.get("/api/processes/:processId/control-template-rows", async (req, res) => {
    try {
      const rows = await storage.getControlTemplateRowsByProcessId(req.params.processId);
      res.json(rows);
    } catch (error) {
      console.error("Error fetching control template rows:", error);
      res.status(500).json({ error: "Failed to fetch control template rows" });
    }
  });

  // Get a single control template row by ID
  app.get("/api/control-template-rows/:id", async (req, res) => {
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

  // Create a new control template row
  app.post("/api/processes/:processId/control-template-rows", async (req, res) => {
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

  // Update a control template row
  app.patch("/api/control-template-rows/:id", async (req, res) => {
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

  // Delete a control template row
  app.delete("/api/control-template-rows/:id", async (req, res) => {
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

  // Duplicate a control template row
  app.post("/api/control-template-rows/:id/duplicate", async (req, res) => {
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

  // ============================================
  // AUTO-REVIEW ENDPOINTS (Phase 7)
  // ============================================

  // Run auto-review for a PFMEA
  app.post("/api/pfmeas/:id/auto-review", async (req, res) => {
    try {
      const { id } = req.params;
      
      const pfmea = await storage.getPFMEAById(id);
      if (!pfmea) {
        return res.status(404).json({ message: "PFMEA not found" });
      }

      const pfmeaRows = await storage.getPFMEARowsForReview(id);
      
      const controlPlans = await storage.getControlPlansByPartId(pfmea.partId);
      const latestCP = controlPlans[0];
      let cpRows: any[] = [];
      if (latestCP) {
        cpRows = await storage.getControlPlanRowsForReview(latestCP.id);
      }

      const findings = runAutoReview({
        pfmea,
        pfmeaRows,
        controlPlan: latestCP,
        cpRows,
      });

      res.json({
        pfmeaId: id,
        reviewedAt: new Date().toISOString(),
        summary: {
          total: findings.length,
          errors: findings.filter(f => f.level === 'error').length,
          warnings: findings.filter(f => f.level === 'warning').length,
          info: findings.filter(f => f.level === 'info').length,
        },
        findings,
      });
    } catch (error) {
      console.error("Auto-review error:", error);
      res.status(500).json({ message: "Failed to run auto-review" });
    }
  });

  // Run auto-review for a Control Plan
  app.post("/api/control-plans/:id/auto-review", async (req, res) => {
    try {
      const { id } = req.params;
      
      const controlPlan = await storage.getControlPlanById(id);
      if (!controlPlan) {
        return res.status(404).json({ message: "Control Plan not found" });
      }

      const cpRows = await storage.getControlPlanRowsForReview(id);
      
      const pfmeas = await storage.getPFMEAsByPartId(controlPlan.partId);
      const latestPFMEA = pfmeas[0];
      let pfmeaRows: any[] = [];
      if (latestPFMEA) {
        pfmeaRows = await storage.getPFMEARowsForReview(latestPFMEA.id);
      }

      const findings = runControlPlanReview({
        controlPlan,
        cpRows,
        pfmea: latestPFMEA,
        pfmeaRows,
      });

      res.json({
        controlPlanId: id,
        reviewedAt: new Date().toISOString(),
        summary: {
          total: findings.length,
          errors: findings.filter(f => f.level === 'error').length,
          warnings: findings.filter(f => f.level === 'warning').length,
          info: findings.filter(f => f.level === 'info').length,
        },
        findings,
      });
    } catch (error) {
      console.error("Auto-review error:", error);
      res.status(500).json({ message: "Failed to run auto-review" });
    }
  });

  // Run comprehensive review for a Part (all documents)
  app.post("/api/parts/:id/auto-review", async (req, res) => {
    try {
      const { id } = req.params;
      
      const partData = await storage.getPartWithDocuments(id);
      if (!partData) {
        return res.status(404).json({ message: "Part not found" });
      }

      const allFindings: any[] = [];

      // Review each PFMEA
      for (const pfmeaDoc of partData.pfmeas) {
        const pfmeaRows = await storage.getPFMEARowsForReview(pfmeaDoc.id);
        const cpForPfmea = partData.controlPlans.find(cp => cp.pfmeaId === pfmeaDoc.id);
        let cpRows: any[] = [];
        if (cpForPfmea) {
          cpRows = await storage.getControlPlanRowsForReview(cpForPfmea.id);
        }
        
        const findings = runAutoReview({
          pfmea: pfmeaDoc,
          pfmeaRows,
          controlPlan: cpForPfmea,
          cpRows,
        });
        
        allFindings.push(...findings.map(f => ({
          ...f,
          documentType: 'PFMEA',
          documentId: pfmeaDoc.id,
          documentRev: pfmeaDoc.rev,
        })));
      }

      // Review each Control Plan
      for (const cp of partData.controlPlans) {
        const cpRows = await storage.getControlPlanRowsForReview(cp.id);
        const pfmeaForCp = partData.pfmeas.find(p => p.id === cp.pfmeaId);
        let pfmeaRows: any[] = [];
        if (pfmeaForCp) {
          pfmeaRows = await storage.getPFMEARowsForReview(pfmeaForCp.id);
        }

        const findings = runControlPlanReview({
          controlPlan: cp,
          cpRows,
          pfmea: pfmeaForCp,
          pfmeaRows,
        });

        allFindings.push(...findings.map(f => ({
          ...f,
          documentType: 'ControlPlan',
          documentId: cp.id,
          documentRev: cp.rev,
        })));
      }

      res.json({
        partId: id,
        partNumber: partData.part.partNumber,
        reviewedAt: new Date().toISOString(),
        summary: {
          total: allFindings.length,
          errors: allFindings.filter(f => f.level === 'error').length,
          warnings: allFindings.filter(f => f.level === 'warning').length,
          info: allFindings.filter(f => f.level === 'info').length,
        },
        findings: allFindings,
      });
    } catch (error) {
      console.error("Auto-review error:", error);
      res.status(500).json({ message: "Failed to run auto-review" });
    }
  });

  // ============================================
  // AUDIT LOG ENDPOINTS (Phase 8)
  // ============================================

  app.get("/api/audit-logs/:entityType/:entityId", async (req, res) => {
    try {
      const { entityType, entityId } = req.params;
      const logs = await storage.getAuditLogsByEntity(entityType, entityId);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  });

  app.get("/api/audit-logs", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const logs = await storage.getRecentAuditLogs(limit);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  });

  app.get("/api/audit-logs/actor/:actorId", async (req, res) => {
    try {
      const { actorId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      const logs = await storage.getAuditLogsByActor(actorId, limit);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  });

  // ============================================
  // SIGNATURE ENDPOINTS (Phase 8)
  // ============================================

  app.get("/api/signatures/:entityType/:entityId", async (req, res) => {
    try {
      const { entityType, entityId } = req.params;
      const signatures = await storage.getSignaturesByEntity(entityType, entityId);
      res.json(signatures);
    } catch (error) {
      console.error("Error fetching signatures:", error);
      res.status(500).json({ message: "Failed to fetch signatures" });
    }
  });

  app.post("/api/signatures", async (req, res) => {
    try {
      const data = req.body;
      
      let content: any = null;
      if (data.entityType === 'pfmea') {
        content = await storage.getPFMEAById(data.entityId);
      } else if (data.entityType === 'control_plan') {
        content = await storage.getControlPlanById(data.entityId);
      } else if (data.entityType === 'process_def') {
        content = await storage.getProcessById(data.entityId);
      }

      const contentHash = storage.computeContentHash(content);
      
      const signature = await storage.createSignature({
        ...data,
        contentHash,
      });

      await storage.logAuditEvent(
        data.entityType,
        data.entityId,
        'sign',
        data.signerUserId,
        data.signerName,
        undefined,
        { role: data.role, meaning: data.meaning },
        `Signed as ${data.role}`
      );

      const approvalStatus = await storage.checkApprovalStatus(data.entityType, data.entityId);
      
      if (approvalStatus.complete) {
        if (data.entityType === 'pfmea') {
          await storage.updatePFMEA(data.entityId, { 
            status: 'effective',
            approvedBy: data.signerUserId,
            approvedAt: new Date(),
            effectiveFrom: new Date(),
          });
        } else if (data.entityType === 'control_plan') {
          await storage.updateControlPlan(data.entityId, { 
            status: 'effective',
            approvedBy: data.signerUserId,
            approvedAt: new Date(),
            effectiveFrom: new Date(),
          });
        } else if (data.entityType === 'process_def') {
          await storage.updateProcess(data.entityId, { 
            status: 'effective',
            effectiveFrom: new Date(),
          });
        }
      }

      res.status(201).json({ signature, approvalStatus });
    } catch (error) {
      console.error("Error creating signature:", error);
      res.status(500).json({ message: "Failed to create signature" });
    }
  });

  app.delete("/api/signatures/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteSignature(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting signature:", error);
      res.status(500).json({ message: "Failed to delete signature" });
    }
  });

  app.get("/api/approval-status/:entityType/:entityId", async (req, res) => {
    try {
      const { entityType, entityId } = req.params;
      const status = await storage.checkApprovalStatus(entityType, entityId);
      res.json(status);
    } catch (error) {
      console.error("Error checking approval status:", error);
      res.status(500).json({ message: "Failed to check approval status" });
    }
  });

  // ============================================
  // APPROVAL MATRIX ENDPOINTS (Phase 8)
  // ============================================

  app.get("/api/approval-matrix/:documentType", async (req, res) => {
    try {
      const { documentType } = req.params;
      const matrix = await storage.getApprovalMatrixByDocType(documentType);
      res.json(matrix);
    } catch (error) {
      console.error("Error fetching approval matrix:", error);
      res.status(500).json({ message: "Failed to fetch approval matrix" });
    }
  });

  app.post("/api/approval-matrix", async (req, res) => {
    try {
      const entry = await storage.createApprovalMatrix(req.body);
      res.status(201).json(entry);
    } catch (error) {
      console.error("Error creating approval matrix entry:", error);
      res.status(500).json({ message: "Failed to create approval matrix entry" });
    }
  });

  app.patch("/api/approval-matrix/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const entry = await storage.updateApprovalMatrix(id, req.body);
      res.json(entry);
    } catch (error) {
      console.error("Error updating approval matrix entry:", error);
      res.status(500).json({ message: "Failed to update approval matrix entry" });
    }
  });

  app.delete("/api/approval-matrix/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteApprovalMatrix(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting approval matrix entry:", error);
      res.status(500).json({ message: "Failed to delete approval matrix entry" });
    }
  });

  // ============================================
  // CHANGE PACKAGE ENDPOINTS (Phase 8)
  // ============================================

  app.get("/api/change-packages", async (req, res) => {
    try {
      const packages = await storage.getAllChangePackages();
      res.json(packages);
    } catch (error) {
      console.error("Error fetching change packages:", error);
      res.status(500).json({ message: "Failed to fetch change packages" });
    }
  });

  app.get("/api/change-packages/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const pkg = await storage.getChangePackageWithDetails(id);
      if (!pkg) {
        return res.status(404).json({ message: "Change package not found" });
      }
      const signatures = await storage.getSignaturesByEntity('change_package', id);
      res.json({ ...pkg, signatures });
    } catch (error) {
      console.error("Error fetching change package:", error);
      res.status(500).json({ message: "Failed to fetch change package" });
    }
  });

  app.post("/api/change-packages", async (req, res) => {
    try {
      const packageNumber = await storage.generateChangePackageNumber();
      const pkg = await storage.createChangePackage({
        ...req.body,
        packageNumber,
      });

      await storage.logAuditEvent(
        'change_package',
        pkg.id,
        'create',
        req.body.initiatedBy,
        req.body.initiatedByName,
        undefined,
        pkg as any,
        'Change package created'
      );

      res.status(201).json(pkg);
    } catch (error) {
      console.error("Error creating change package:", error);
      res.status(500).json({ message: "Failed to create change package" });
    }
  });

  app.patch("/api/change-packages/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const existing = await storage.getChangePackageById(id);
      const pkg = await storage.updateChangePackage(id, req.body);

      await storage.logAuditEvent(
        'change_package',
        id,
        'update',
        req.body.updatedBy || 'system',
        req.body.updatedByName,
        existing as any,
        pkg as any,
        req.body.changeNote
      );

      res.json(pkg);
    } catch (error) {
      console.error("Error updating change package:", error);
      res.status(500).json({ message: "Failed to update change package" });
    }
  });

  app.delete("/api/change-packages/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteChangePackage(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting change package:", error);
      res.status(500).json({ message: "Failed to delete change package" });
    }
  });

  app.post("/api/change-packages/:id/transition", async (req, res) => {
    try {
      const { id } = req.params;
      const { newStatus, actor, actorName, note } = req.body;
      
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

      await storage.logAuditEvent(
        'change_package',
        id,
        'status_change',
        actor,
        actorName,
        { status: existing.status },
        { status: newStatus },
        note
      );

      res.json(pkg);
    } catch (error) {
      console.error("Error transitioning change package:", error);
      res.status(500).json({ message: "Failed to transition change package" });
    }
  });

  // ============================================
  // CHANGE PACKAGE ITEM ENDPOINTS (Phase 8)
  // ============================================

  app.post("/api/change-packages/:packageId/items", async (req, res) => {
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

  app.patch("/api/change-package-items/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const item = await storage.updateChangePackageItem(id, req.body);
      res.json(item);
    } catch (error) {
      console.error("Error updating change package item:", error);
      res.status(500).json({ message: "Failed to update change package item" });
    }
  });

  app.delete("/api/change-package-items/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteChangePackageItem(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting change package item:", error);
      res.status(500).json({ message: "Failed to delete change package item" });
    }
  });

  // ============================================
  // TRAINING ACKNOWLEDGMENT ENDPOINTS (Phase 8)
  // ============================================

  app.get("/api/change-packages/:packageId/training", async (req, res) => {
    try {
      const { packageId } = req.params;
      const acks = await storage.getTrainingAcks(packageId);
      res.json(acks);
    } catch (error) {
      console.error("Error fetching training acks:", error);
      res.status(500).json({ message: "Failed to fetch training acknowledgments" });
    }
  });

  app.post("/api/change-packages/:packageId/training", async (req, res) => {
    try {
      const { packageId } = req.params;
      const ack = await storage.createTrainingAck({
        ...req.body,
        changePackageId: packageId,
      });
      res.status(201).json(ack);
    } catch (error) {
      console.error("Error creating training ack:", error);
      res.status(500).json({ message: "Failed to create training requirement" });
    }
  });

  app.post("/api/training-acks/:id/acknowledge", async (req, res) => {
    try {
      const { id } = req.params;
      const { trainingMethod, evidence } = req.body;
      const ack = await storage.updateTrainingAck(id, {
        acknowledgedAt: new Date(),
        trainingMethod,
        evidence,
      });
      res.json(ack);
    } catch (error) {
      console.error("Error acknowledging training:", error);
      res.status(500).json({ message: "Failed to acknowledge training" });
    }
  });

  app.get("/api/users/:userId/pending-training", async (req, res) => {
    try {
      const { userId } = req.params;
      const pending = await storage.getPendingTrainingForUser(userId);
      res.json(pending);
    } catch (error) {
      console.error("Error fetching pending training:", error);
      res.status(500).json({ message: "Failed to fetch pending training" });
    }
  });

  // ============================================
  // OWNERSHIP ENDPOINTS (Phase 8)
  // ============================================

  app.get("/api/ownership/:entityType/:entityId", async (req, res) => {
    try {
      const { entityType, entityId } = req.params;
      const own = await storage.getOwnershipByEntity(entityType, entityId);
      res.json(own);
    } catch (error) {
      console.error("Error fetching ownership:", error);
      res.status(500).json({ message: "Failed to fetch ownership" });
    }
  });

  app.post("/api/ownership", async (req, res) => {
    try {
      const existing = await storage.getOwnershipByEntity(req.body.entityType, req.body.entityId);
      let own;
      if (existing) {
        own = await storage.updateOwnership(existing.id, req.body);
      } else {
        own = await storage.createOwnership(req.body);
      }
      res.status(201).json(own);
    } catch (error) {
      console.error("Error setting ownership:", error);
      res.status(500).json({ message: "Failed to set ownership" });
    }
  });

  app.post("/api/ownership/:entityType/:entityId/watchers", async (req, res) => {
    try {
      const { entityType, entityId } = req.params;
      const own = await storage.addWatcher(entityType, entityId, req.body);
      res.json(own);
    } catch (error) {
      console.error("Error adding watcher:", error);
      res.status(500).json({ message: "Failed to add watcher" });
    }
  });

  app.delete("/api/ownership/:entityType/:entityId/watchers/:userId", async (req, res) => {
    try {
      const { entityType, entityId, userId } = req.params;
      const own = await storage.removeWatcher(entityType, entityId, userId);
      res.json(own);
    } catch (error) {
      console.error("Error removing watcher:", error);
      res.status(500).json({ message: "Failed to remove watcher" });
    }
  });

  app.get("/api/users/:userId/owned-entities", async (req, res) => {
    try {
      const { userId } = req.params;
      const owned = await storage.getOwnedEntities(userId);
      res.json(owned);
    } catch (error) {
      console.error("Error fetching owned entities:", error);
      res.status(500).json({ message: "Failed to fetch owned entities" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}