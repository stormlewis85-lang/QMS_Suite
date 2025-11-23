import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertPartSchema,
  insertProcessDefSchema,
  insertProcessStepSchema,
  insertPfmeaSchema,
  insertControlPlanSchema,
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

  const httpServer = createServer(app);
  return httpServer;
}
