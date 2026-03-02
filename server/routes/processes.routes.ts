import { Router } from "express";
import { z } from "zod";
import { fromError } from "zod-validation-error";
import { storage } from "../storage";
import { insertProcessDefSchema, insertProcessStepSchema } from "@shared/schema";
import { getErrorMessage } from "./_helpers";

const router = Router();

router.get("/processes", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;
    const result = await storage.getAllProcesses(req.orgId!, { limit, offset });
    res.json(req.query.limit || req.query.offset ? result : result.data);
  } catch (error) {
    console.error("Error fetching processes:", error);
    res.status(500).json({ error: "Failed to fetch processes" });
  }
});

router.get("/processes/:id", async (req, res) => {
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

router.post("/processes", async (req, res) => {
  try {
    const validatedData = createProcessWithStepsSchema.parse(req.body);
    const userId = validatedData.process.createdBy || crypto.randomUUID();

    const processData = {
      ...validatedData.process,
      orgId: req.orgId!,
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

router.patch("/processes/:id", async (req, res) => {
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

router.delete("/processes/:id", async (req, res) => {
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
router.get("/processes/:processId/steps", async (req, res) => {
  try {
    const steps = await storage.getStepsByProcessId(req.params.processId);
    res.json(steps);
  } catch (error) {
    console.error("Error fetching process steps:", error);
    res.status(500).json({ error: "Failed to fetch process steps" });
  }
});

router.post("/processes/:processId/steps", async (req, res) => {
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

router.patch("/processes/:processId/steps/:stepId", async (req, res) => {
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

router.delete("/processes/:processId/steps/:stepId", async (req, res) => {
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
router.get("/processes/steps/:stepId/children", async (req, res) => {
  try {
    const children = await storage.getChildSteps(req.params.stepId);
    res.json(children);
  } catch (error) {
    console.error("Error fetching child steps:", error);
    res.status(500).json({ error: "Failed to fetch child steps" });
  }
});

// PFD (Process Flow Diagram) API
router.get("/pfd", async (req, res) => {
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

router.get("/pfd/:id", async (req, res) => {
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

router.post("/pfd/preview", async (req, res) => {
  const { processIds } = req.body;

  if (!Array.isArray(processIds) || processIds.length === 0) {
    return res.status(400).json({ error: 'processIds must be a non-empty array' });
  }

  try {
    const allSteps: { seq: number; name: string; area: string | null; processName: string | undefined }[] = [];
    let stepNum = 10;

    for (const processId of processIds) {
      const processWithSteps = await storage.getProcessWithSteps(processId);
      if (!processWithSteps) continue;
      const steps = processWithSteps.steps;

      for (const step of steps) {
        allSteps.push({
          seq: stepNum,
          name: step.name,
          area: step.area,
          processName: processWithSteps.name,
        });
        stepNum += 10;
      }
    }

    let mermaid = 'graph TD\n';
    mermaid += '  Start([Start]) --> ';

    allSteps.forEach((step, idx) => {
      const nodeId = `S${step.seq}`;
      const label = `${step.seq}: ${step.name}`;

      if (idx === 0) {
        mermaid += `${nodeId}["${label}"]\n`;
      } else {
        const prevNodeId = `S${allSteps[idx - 1].seq}`;
        mermaid += `  ${prevNodeId} --> ${nodeId}["${label}"]\n`;
      }
    });

    if (allSteps.length > 0) {
      const lastNodeId = `S${allSteps[allSteps.length - 1].seq}`;
      mermaid += `  ${lastNodeId} --> End([End])\n`;
    }

    res.json({ mermaid, steps: allSteps });
  } catch (error: unknown) {
    console.error("Error generating PFD preview:", error);
    res.status(500).json({ error: getErrorMessage(error) || "Failed to generate PFD preview" });
  }
});

export { router as processesRouter };
