import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  runAutoReview as runAutoReviewService, 
  getAutoReviewHistory, 
  getAutoReviewRun, 
  resolveFinding, 
  waiveFinding 
} from "./autoReviewService";
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
} from "./change-package-service";
import { runAllSeeds } from "./seed";
import { generatePFMEA } from "./services/pfmea-generator";
import { generateControlPlan } from "./services/control-plan-generator";
import { calculateAP } from "./services/ap-calculator";
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
  // Run seeds on startup
  runAllSeeds().catch(console.error);

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

  app.get("/api/parts/:id/pfmeas", async (req, res) => {
    try {
      const pfmeas = await storage.getPFMEAsByPartId(req.params.id);
      res.json(pfmeas);
    } catch (error) {
      console.error("Error fetching part PFMEAs:", error);
      res.status(500).json({ error: "Failed to fetch part PFMEAs" });
    }
  });

  app.get("/api/parts/:id/control-plans", async (req, res) => {
    try {
      const controlPlans = await storage.getControlPlansByPartId(req.params.id);
      res.json(controlPlans);
    } catch (error) {
      console.error("Error fetching part control plans:", error);
      res.status(500).json({ error: "Failed to fetch part control plans" });
    }
  });

  app.get("/api/parts/:id/processes", async (req, res) => {
    try {
      const mappings = await storage.getPartProcessMappings(req.params.id);
      res.json(mappings);
    } catch (error) {
      console.error("Error fetching part processes:", error);
      res.status(500).json({ error: "Failed to fetch part processes" });
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

  // PFD (Process Flow Diagram) API
  app.get("/api/pfd", async (req, res) => {
    try {
      const partId = req.query.partId as string;
      if (!partId) {
        return res.status(400).json({ error: "partId query parameter is required" });
      }
      const pfds = await storage.getPFDsByPartId(partId);
      res.json(pfds);
    } catch (error) {
      console.error("Error fetching PFDs:", error);
      res.status(500).json({ error: "Failed to fetch PFDs" });
    }
  });

  app.get("/api/pfd/:id", async (req, res) => {
    try {
      const pfdDoc = await storage.getPFDById(req.params.id);
      if (!pfdDoc) {
        return res.status(404).json({ error: "PFD not found" });
      }
      res.json(pfdDoc);
    } catch (error) {
      console.error("Error fetching PFD:", error);
      res.status(500).json({ error: "Failed to fetch PFD" });
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

  // PFMEA endpoints with plural naming (for PFMEADetail page)
  app.get("/api/pfmeas", async (req, res) => {
    try {
      const pfmeas = await storage.getAllPFMEAs();
      res.json(pfmeas);
    } catch (error) {
      console.error("Error fetching PFMEAs:", error);
      res.status(500).json({ error: "Failed to fetch PFMEAs" });
    }
  });

  app.get("/api/pfmeas/:id", async (req, res) => {
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

  app.get("/api/pfmeas/:id/rows", async (req, res) => {
    try {
      const rows = await storage.getPFMEARows(req.params.id);
      res.json(rows);
    } catch (error) {
      console.error("Error fetching PFMEA rows:", error);
      res.status(500).json({ error: "Failed to fetch PFMEA rows" });
    }
  });

  app.get("/api/pfmeas/:id/details", async (req, res) => {
    try {
      const pfmea = await storage.getPFMEAById(req.params.id);
      if (!pfmea) {
        return res.status(404).json({ error: "PFMEA not found" });
      }
      const rows = await storage.getPFMEARows(req.params.id);
      const part = await storage.getPartById(pfmea.partId);
      res.json({ ...pfmea, rows, part });
    } catch (error) {
      console.error("Error fetching PFMEA details:", error);
      res.status(500).json({ error: "Failed to fetch PFMEA details" });
    }
  });

  app.post("/api/calculate-ap", async (req, res) => {
    try {
      const { severity, occurrence, detection } = req.body;
      
      if (!severity || !occurrence || !detection) {
        return res.status(400).json({ error: 'severity, occurrence, and detection are required' });
      }
      
      const s = parseInt(severity);
      const o = parseInt(occurrence);
      const d = parseInt(detection);
      
      if (isNaN(s) || isNaN(o) || isNaN(d) || s < 1 || s > 10 || o < 1 || o > 10 || d < 1 || d > 10) {
        return res.status(400).json({ error: 'S, O, D must be integers between 1 and 10' });
      }
      
      const result = calculateAP({ severity: s, occurrence: o, detection: d });
      res.json({ ap: result.priority, reason: result.description });
    } catch (error) {
      console.error("Error calculating AP:", error);
      res.status(500).json({ error: "Failed to calculate AP" });
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

  app.get("/api/control-plans/:id/rows", async (req, res) => {
    try {
      const rows = await storage.getControlPlanRows(req.params.id);
      res.json(rows);
    } catch (error) {
      console.error("Error fetching control plan rows:", error);
      res.status(500).json({ error: "Failed to fetch control plan rows" });
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
  // AUTO-REVIEW ENDPOINTS (Phase 9)
  // ============================================

  // Run auto-review for a PFMEA
  app.post("/api/pfmeas/:id/auto-review", async (req, res) => {
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
  app.post("/api/control-plans/:id/auto-review", async (req, res) => {
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
  app.get("/api/auto-reviews", async (req, res) => {
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
  app.get("/api/auto-reviews/:id", async (req, res) => {
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
  app.post("/api/auto-review-findings/:id/resolve", async (req, res) => {
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
  app.post("/api/auto-review-findings/:id/waive", async (req, res) => {
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
  app.post("/api/parts/:id/auto-review", async (req, res) => {
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
        // For each PFMEA, pair it with each Control Plan for comprehensive cross-validation
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
          // PFMEA with no Control Plans
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

  // Generate PFMEA from process templates
  app.post("/api/parts/:id/generate-pfmea", async (req, res) => {
    const { id } = req.params;
    const { processIds } = req.body;

    if (!Array.isArray(processIds) || processIds.length === 0) {
      return res.status(400).json({ error: "processIds must be a non-empty array" });
    }

    try {
      const result = await generatePFMEA({ partId: id, processDefIds: processIds });
      res.json(result);
    } catch (error: any) {
      console.error("Error generating PFMEA:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Generate Control Plan from PFMEA
  app.post("/api/pfmeas/:id/generate-control-plan", async (req, res) => {
    const { id } = req.params;
    const { partId, type } = req.body;

    if (!partId) {
      return res.status(400).json({ error: "partId is required" });
    }

    try {
      const result = await generateControlPlan({
        partId,
        pfmeaId: id,
        type: type || 'Production'
      });
      res.json(result);
    } catch (error: any) {
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: error.message });
    }
  });

  // Generate both PFMEA and Control Plan at once
  app.post("/api/parts/:id/generate-documents", async (req, res) => {
    const { id } = req.params;
    const { processIds, controlPlanType } = req.body;

    if (!Array.isArray(processIds) || processIds.length === 0) {
      return res.status(400).json({ error: "processIds must be a non-empty array" });
    }

    try {
      const pfmeaResult = await generatePFMEA({ partId: id, processDefIds: processIds });

      const cpResult = await generateControlPlan({
        partId: id,
        pfmeaId: pfmeaResult.pfmea.id,
        type: controlPlanType || 'Production'
      });

      res.json({
        pfmea: pfmeaResult,
        controlPlan: cpResult,
        message: `Generated PFMEA with ${pfmeaResult.summary.totalRows} rows and Control Plan with ${cpResult.summary.totalRows} characteristics`
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // CHANGE PACKAGE ENDPOINTS (Phase 9)
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
      res.json(pkg);
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
      res.status(201).json(pkg);
    } catch (error) {
      console.error("Error creating change package:", error);
      res.status(500).json({ message: "Failed to create change package" });
    }
  });

  app.patch("/api/change-packages/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const pkg = await storage.updateChangePackage(id, req.body);
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

  // ============================================
  // CHANGE PACKAGE ITEM ENDPOINTS (Phase 9)
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
  // CHANGE PACKAGE APPROVAL ENDPOINTS (Phase 9)
  // ============================================

  app.get("/api/change-packages/:packageId/approvals", async (req, res) => {
    try {
      const { packageId } = req.params;
      const approvals = await storage.getChangePackageApprovals(packageId);
      res.json(approvals);
    } catch (error) {
      console.error("Error fetching approvals:", error);
      res.status(500).json({ message: "Failed to fetch approvals" });
    }
  });

  app.post("/api/change-packages/:packageId/approvals", async (req, res) => {
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

  app.patch("/api/change-package-approvals/:id", async (req, res) => {
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

  // ============================================
  // CHANGE PACKAGE PROPAGATION ENDPOINTS (Phase 9)
  // ============================================

  app.get("/api/change-packages/:packageId/propagations", async (req, res) => {
    try {
      const { packageId } = req.params;
      const propagations = await storage.getChangePackagePropagations(packageId);
      res.json(propagations);
    } catch (error) {
      console.error("Error fetching propagations:", error);
      res.status(500).json({ message: "Failed to fetch propagations" });
    }
  });

  app.post("/api/change-packages/:packageId/propagations", async (req, res) => {
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

  app.patch("/api/change-package-propagations/:id", async (req, res) => {
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

  // ============================================
  // CHANGE PACKAGE WORKFLOW ENDPOINTS (Phase 9)
  // Full workflow: create → impact analysis → auto-review → approvals → propagation
  // ============================================

  /**
   * Run auto-review on PFMEA and/or Control Plan
   * POST /api/auto-review/run
   */
  app.post('/api/auto-review/run', async (req, res) => {
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

  /**
   * Get auto-review history
   * GET /api/auto-review/history
   */
  app.get('/api/auto-review/history', async (req, res) => {
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

  /**
   * Get single auto-review run with findings
   * GET /api/auto-review/:runId
   */
  app.get('/api/auto-review/:runId', async (req, res) => {
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

  /**
   * Resolve a finding
   * POST /api/auto-review/findings/:findingId/resolve
   */
  app.post('/api/auto-review/findings/:findingId/resolve', async (req, res) => {
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

  /**
   * Waive a finding
   * POST /api/auto-review/findings/:findingId/waive
   */
  app.post('/api/auto-review/findings/:findingId/waive', async (req, res) => {
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

  /**
   * Get workflow status for a change package
   * GET /api/change-packages/:packageId/workflow
   */
  app.get('/api/change-packages/:packageId/workflow', async (req, res) => {
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

  /**
   * Run impact analysis for a change package
   * POST /api/change-packages/:packageId/impact-analysis
   */
  app.post('/api/change-packages/:packageId/impact-analysis', async (req, res) => {
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

  /**
   * Run auto-review for change package
   * POST /api/change-packages/:packageId/auto-review
   */
  app.post('/api/change-packages/:packageId/workflow/auto-review', async (req, res) => {
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

  /**
   * Request approvals for a change package
   * POST /api/change-packages/:packageId/request-approvals
   */
  app.post('/api/change-packages/:packageId/request-approvals', async (req, res) => {
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

  /**
   * Process an approval decision
   * POST /api/change-packages/approvals/:approvalId/decision
   */
  app.post('/api/change-packages/approvals/:approvalId/decision', async (req, res) => {
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

  /**
   * Propagate changes to affected documents
   * POST /api/change-packages/:packageId/propagate
   */
  app.post('/api/change-packages/:packageId/propagate', async (req, res) => {
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

  /**
   * Cancel a change package
   * POST /api/change-packages/:packageId/cancel
   */
  app.post('/api/change-packages/:packageId/cancel', async (req, res) => {
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

  const httpServer = createServer(app);
  return httpServer;
}