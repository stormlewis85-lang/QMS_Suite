import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
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

  app.patch("/api/parts/:id", async (req, res) => {
    try {
      const validatedData = insertPartSchema.partial().parse(req.body);
      const updatedPart = await storage.updatePart(req.params.id, validatedData);
      if (!updatedPart) {
        return res.status(404).json({ error: "Part not found" });
      }
      res.json(updatedPart);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = fromError(error);
        return res.status(400).json({ error: validationError.toString() });
      }
      console.error("Error updating part:", error);
      res.status(500).json({ error: "Failed to update part" });
    }
  });

  app.delete("/api/parts/:id", async (req, res) => {
    try {
      const deleted = await storage.deletePart(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Part not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting part:", error);
      res.status(500).json({ error: "Failed to delete part" });
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

  const httpServer = createServer(app);
  return httpServer;
}
