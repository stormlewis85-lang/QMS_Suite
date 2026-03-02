import { Router } from "express";
import { randomUUID } from "crypto";
import { z } from "zod";
import { fromError } from "zod-validation-error";
import { storage } from "../../storage";
import { requireAuth, requireRole } from "../../middleware/auth";
import {
  insertCapaD0EmergencySchema,
  insertCapaD1TeamDetailSchema,
  insertCapaD2ProblemSchema,
  insertCapaD3ContainmentSchema,
  insertCapaD4RootCauseSchema,
  insertCapaD4RootCauseCandidateSchema,
  insertCapaD5CorrectiveActionSchema,
  insertCapaD6ValidationSchema,
  insertCapaD7PreventiveSchema,
  insertCapaD8ClosureSchema,
  capaD4RootCauseCandidate,
} from "@shared/schema";

const router = Router();

// =============================================
// CAPA/8D Module: D0 Emergency Response
// =============================================

router.get("/capas/:id/d0", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });

    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) {
      return res.status(404).json({ error: "CAPA not found" });
    }

    const d0 = await storage.getCapaD0(capaId);
    res.json(d0 || null);
  } catch (error) {
    console.error("Error fetching D0:", error);
    res.status(500).json({ error: "Failed to fetch D0 data" });
  }
});

router.put("/capas/:id/d0", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });

    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) {
      return res.status(404).json({ error: "CAPA not found" });
    }

    let d0 = await storage.getCapaD0(capaId);
    if (d0) {
      d0 = (await storage.updateCapaD0(capaId, req.body))!;
    } else {
      const parsed = insertCapaD0EmergencySchema.parse({
        ...req.body,
        orgId: req.orgId!,
        capaId,
        createdBy: req.auth!.user.id,
      });
      d0 = await storage.createCapaD0(parsed);
    }

    res.json(d0);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: fromError(error).toString() });
    }
    console.error("Error updating D0:", error);
    res.status(500).json({ error: "Failed to update D0 data" });
  }
});

// D0 emergency actions (stored in emergencyActions JSON array)
router.post("/capas/:id/d0/emergency-actions", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });

    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) {
      return res.status(404).json({ error: "CAPA not found" });
    }

    let d0 = await storage.getCapaD0(capaId);
    if (!d0) {
      d0 = await storage.createCapaD0({
        orgId: req.orgId!,
        capaId,
        createdBy: req.auth!.user.id,
        emergencyResponseRequired: 1,
      } as any);
    }

    const actions = JSON.parse(d0.emergencyActions || '[]');
    const newAction = {
      id: randomUUID(),
      ...req.body,
      createdAt: new Date().toISOString(),
      status: 'open',
    };
    actions.push(newAction);

    await storage.updateCapaD0(capaId, { emergencyActions: JSON.stringify(actions) });

    res.status(201).json(newAction);
  } catch (error) {
    console.error("Error adding emergency action:", error);
    res.status(500).json({ error: "Failed to add emergency action" });
  }
});

// Update emergency action by index/id
router.patch("/capas/:id/d0/emergency-actions/:actionId", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });

    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) {
      return res.status(404).json({ error: "CAPA not found" });
    }

    const d0 = await storage.getCapaD0(capaId);
    if (!d0) return res.status(404).json({ error: "D0 not found" });

    const actions = JSON.parse(d0.emergencyActions || '[]');
    const actionId = req.params.actionId;
    const idx = actions.findIndex((a: any) => a.id === actionId);
    if (idx === -1) return res.status(404).json({ error: "Action not found" });

    actions[idx] = { ...actions[idx], ...req.body, updatedAt: new Date().toISOString() };
    await storage.updateCapaD0(capaId, { emergencyActions: JSON.stringify(actions) });

    res.json(actions[idx]);
  } catch (error) {
    console.error("Error updating emergency action:", error);
    res.status(500).json({ error: "Failed to update emergency action" });
  }
});

// D0 complete
router.post("/capas/:id/d0/complete", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });

    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) {
      return res.status(404).json({ error: "CAPA not found" });
    }

    const d0 = await storage.getCapaD0(capaId);
    if (!d0) return res.status(400).json({ error: "D0 data must be created first" });

    // Validate: symptoms captured, emergency actions completed
    if (!d0.symptomsCaptured) {
      return res.status(400).json({ error: "Symptoms must be captured before completing D0" });
    }

    const actions = JSON.parse(d0.emergencyActions || '[]');
    const incomplete = actions.filter((a: any) => a.status !== 'completed' && a.status !== 'verified');
    if (d0.emergencyResponseRequired && incomplete.length > 0) {
      return res.status(400).json({ error: `${incomplete.length} emergency actions are not complete` });
    }

    await storage.updateCapaD0(capaId, {
      d0CompletedAt: new Date(),
      d0CompletedBy: req.auth!.user.id,
    });

    await storage.createCapaAuditLog({
      orgId: req.orgId!,
      capaId,
      action: 'discipline_completed',
      userId: req.auth!.user.id,
      discipline: 'D0',
      changeDescription: 'D0 completed',
    });

    res.json({ message: "D0 completed successfully" });
  } catch (error) {
    console.error("Error completing D0:", error);
    res.status(500).json({ error: "Failed to complete D0" });
  }
});

// D0 verify
router.post("/capas/:id/d0/verify", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });

    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) {
      return res.status(404).json({ error: "CAPA not found" });
    }

    const d0 = await storage.getCapaD0(capaId);
    if (!d0 || !d0.d0CompletedAt) {
      return res.status(400).json({ error: "D0 must be completed before verification" });
    }

    await storage.updateCapaD0(capaId, {
      d0VerifiedAt: new Date(),
      d0VerifiedBy: req.auth!.user.id,
    });

    await storage.createCapaAuditLog({
      orgId: req.orgId!,
      capaId,
      action: 'discipline_verified',
      userId: req.auth!.user.id,
      discipline: 'D0',
      changeDescription: 'D0 verified',
    });

    res.json({ message: "D0 verified successfully" });
  } catch (error) {
    console.error("Error verifying D0:", error);
    res.status(500).json({ error: "Failed to verify D0" });
  }
});

// =============================================
// CAPA/8D Module: D1 Team Formation
// =============================================

router.get("/capas/:id/d1", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });

    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) {
      return res.status(404).json({ error: "CAPA not found" });
    }

    const d1 = await storage.getCapaD1(capaId);
    res.json(d1 || null);
  } catch (error) {
    console.error("Error fetching D1:", error);
    res.status(500).json({ error: "Failed to fetch D1 data" });
  }
});

router.put("/capas/:id/d1", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });

    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) {
      return res.status(404).json({ error: "CAPA not found" });
    }

    let d1 = await storage.getCapaD1(capaId);
    if (d1) {
      d1 = (await storage.updateCapaD1(capaId, req.body))!;
    } else {
      const parsed = insertCapaD1TeamDetailSchema.parse({
        ...req.body,
        orgId: req.orgId!,
        capaId,
        createdBy: req.auth!.user.id,
      });
      d1 = await storage.createCapaD1(parsed);
    }

    res.json(d1);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: fromError(error).toString() });
    }
    console.error("Error updating D1:", error);
    res.status(500).json({ error: "Failed to update D1 data" });
  }
});

// D1 add meeting
router.post("/capas/:id/d1/meetings", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });

    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) {
      return res.status(404).json({ error: "CAPA not found" });
    }

    let d1 = await storage.getCapaD1(capaId);
    if (!d1) {
      d1 = await storage.createCapaD1({
        orgId: req.orgId!,
        capaId,
        createdBy: req.auth!.user.id,
      } as any);
    }

    const meetings = JSON.parse(d1.meetingSchedule || '[]');
    const newMeeting = {
      id: randomUUID(),
      ...req.body,
      createdAt: new Date().toISOString(),
    };
    meetings.push(newMeeting);

    await storage.updateCapaD1(capaId, { meetingSchedule: JSON.stringify(meetings) });

    res.status(201).json(newMeeting);
  } catch (error) {
    console.error("Error adding meeting:", error);
    res.status(500).json({ error: "Failed to add meeting" });
  }
});

// D1 approve resources
router.post("/capas/:id/d1/approve-resources", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });

    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) {
      return res.status(404).json({ error: "CAPA not found" });
    }

    const d1 = await storage.getCapaD1(capaId);
    if (!d1) return res.status(400).json({ error: "D1 data must be created first" });

    await storage.updateCapaD1(capaId, {
      resourcesApproved: 1,
      resourcesApprovedBy: req.auth!.user.id,
      resourcesApprovedAt: new Date(),
    });

    res.json({ message: "Resources approved" });
  } catch (error) {
    console.error("Error approving resources:", error);
    res.status(500).json({ error: "Failed to approve resources" });
  }
});

// D1 complete
router.post("/capas/:id/d1/complete", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });

    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) {
      return res.status(404).json({ error: "CAPA not found" });
    }

    const d1 = await storage.getCapaD1(capaId);
    if (!d1) return res.status(400).json({ error: "D1 data must be created first" });

    // Validate: champion, leader, min 3 members, charter
    const members = await storage.getCapaTeamMembers(capaId);
    const activeMembers = members.filter(m => !m.leftAt);

    if (!activeMembers.some(m => m.isChampion)) {
      return res.status(400).json({ error: "A champion must be assigned" });
    }
    if (!activeMembers.some(m => m.isLeader)) {
      return res.status(400).json({ error: "A leader must be assigned" });
    }
    if (activeMembers.length < 3) {
      return res.status(400).json({ error: "At least 3 active team members required" });
    }
    if (!d1.teamCharterDefined) {
      return res.status(400).json({ error: "Team charter must be defined" });
    }

    await storage.updateCapaD1(capaId, {
      d1CompletedAt: new Date(),
      d1CompletedBy: req.auth!.user.id,
    });

    await storage.createCapaAuditLog({
      orgId: req.orgId!,
      capaId,
      action: 'discipline_completed',
      userId: req.auth!.user.id,
      discipline: 'D1',
      changeDescription: 'D1 completed',
    });

    res.json({ message: "D1 completed successfully" });
  } catch (error) {
    console.error("Error completing D1:", error);
    res.status(500).json({ error: "Failed to complete D1" });
  }
});

// D1 verify
router.post("/capas/:id/d1/verify", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });

    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) {
      return res.status(404).json({ error: "CAPA not found" });
    }

    const d1 = await storage.getCapaD1(capaId);
    if (!d1 || !d1.d1CompletedAt) {
      return res.status(400).json({ error: "D1 must be completed before verification" });
    }

    await storage.updateCapaD1(capaId, {
      d1VerifiedAt: new Date(),
      d1VerifiedBy: req.auth!.user.id,
    });

    await storage.createCapaAuditLog({
      orgId: req.orgId!,
      capaId,
      action: 'discipline_verified',
      userId: req.auth!.user.id,
      discipline: 'D1',
      changeDescription: 'D1 verified',
    });

    res.json({ message: "D1 verified successfully" });
  } catch (error) {
    console.error("Error verifying D1:", error);
    res.status(500).json({ error: "Failed to verify D1" });
  }
});

// =============================================
// CAPA/8D Module: D2 Problem Description
// =============================================

router.get("/capas/:id/d2", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });

    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) {
      return res.status(404).json({ error: "CAPA not found" });
    }

    const d2 = await storage.getCapaD2(capaId);
    res.json(d2 || null);
  } catch (error) {
    console.error("Error fetching D2:", error);
    res.status(500).json({ error: "Failed to fetch D2 data" });
  }
});

router.put("/capas/:id/d2", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });

    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) {
      return res.status(404).json({ error: "CAPA not found" });
    }

    let d2 = await storage.getCapaD2(capaId);
    if (d2) {
      d2 = (await storage.updateCapaD2(capaId, req.body))!;
    } else {
      const parsed = insertCapaD2ProblemSchema.parse({
        ...req.body,
        orgId: req.orgId!,
        capaId,
        createdBy: req.auth!.user.id,
      });
      d2 = await storage.createCapaD2(parsed);
    }

    res.json(d2);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: fromError(error).toString() });
    }
    console.error("Error updating D2:", error);
    res.status(500).json({ error: "Failed to update D2 data" });
  }
});

// D2 Is/Is Not update by dimension
router.put("/capas/:id/d2/is-not/:dimension", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });

    const dimension = req.params.dimension;
    const validDimensions = ['what', 'where', 'when', 'howMany'];
    if (!validDimensions.includes(dimension)) {
      return res.status(400).json({ error: `Invalid dimension. Must be one of: ${validDimensions.join(', ')}` });
    }

    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) {
      return res.status(404).json({ error: "CAPA not found" });
    }

    const d2 = await storage.getCapaD2(capaId);
    if (!d2) return res.status(400).json({ error: "D2 data must be created first" });

    const fieldMap: Record<string, string> = {
      what: 'isNotWhat',
      where: 'isNotWhere',
      when: 'isNotWhen',
      howMany: 'isNotHowMany',
    };

    const fieldName = fieldMap[dimension];
    const updateData: Record<string, any> = {};
    updateData[fieldName] = JSON.stringify(req.body);

    const updated = await storage.updateCapaD2(capaId, updateData);
    res.json(updated);
  } catch (error) {
    console.error("Error updating Is/Is Not:", error);
    res.status(500).json({ error: "Failed to update Is/Is Not" });
  }
});

// D2 verify problem statement
router.post("/capas/:id/d2/verify-problem-statement", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });

    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) {
      return res.status(404).json({ error: "CAPA not found" });
    }

    const d2 = await storage.getCapaD2(capaId);
    if (!d2) return res.status(400).json({ error: "D2 data must be created first" });

    await storage.updateCapaD2(capaId, {
      problemStatementVerified: 1,
      problemStatementVerifiedBy: req.auth!.user.id,
    });

    res.json({ message: "Problem statement verified" });
  } catch (error) {
    console.error("Error verifying problem statement:", error);
    res.status(500).json({ error: "Failed to verify problem statement" });
  }
});

// D2 data points
router.post("/capas/:id/d2/data-points", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });

    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) {
      return res.status(404).json({ error: "CAPA not found" });
    }

    const d2 = await storage.getCapaD2(capaId);
    if (!d2) return res.status(400).json({ error: "D2 data must be created first" });

    const dataPoints = JSON.parse(d2.dataCollected || '[]');
    const newPoint = {
      id: randomUUID(),
      ...req.body,
      collectedAt: new Date().toISOString(),
      collectedBy: req.auth!.user.id,
    };
    dataPoints.push(newPoint);

    await storage.updateCapaD2(capaId, { dataCollected: JSON.stringify(dataPoints) });

    res.status(201).json(newPoint);
  } catch (error) {
    console.error("Error adding data point:", error);
    res.status(500).json({ error: "Failed to add data point" });
  }
});

// D2 verify measurement system
router.post("/capas/:id/d2/verify-measurement-system", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });

    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) {
      return res.status(404).json({ error: "CAPA not found" });
    }

    const d2 = await storage.getCapaD2(capaId);
    if (!d2) return res.status(400).json({ error: "D2 data must be created first" });

    await storage.updateCapaD2(capaId, {
      measurementSystemValid: 1,
      measurementSystemNotes: req.body.notes || null,
    });

    res.json({ message: "Measurement system verified" });
  } catch (error) {
    console.error("Error verifying measurement system:", error);
    res.status(500).json({ error: "Failed to verify measurement system" });
  }
});

// D2 complete
router.post("/capas/:id/d2/complete", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });

    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) {
      return res.status(404).json({ error: "CAPA not found" });
    }

    const d2 = await storage.getCapaD2(capaId);
    if (!d2) return res.status(400).json({ error: "D2 data must be created first" });

    // Validate
    if (!d2.fiveWsComplete) {
      return res.status(400).json({ error: "5W+1H must be complete" });
    }
    if (!d2.measurementSystemValid) {
      return res.status(400).json({ error: "Measurement system must be verified" });
    }

    await storage.updateCapaD2(capaId, {
      d2CompletedAt: new Date(),
      d2CompletedBy: req.auth!.user.id,
    });

    await storage.createCapaAuditLog({
      orgId: req.orgId!,
      capaId,
      action: 'discipline_completed',
      userId: req.auth!.user.id,
      discipline: 'D2',
      changeDescription: 'D2 completed',
    });

    res.json({ message: "D2 completed successfully" });
  } catch (error) {
    console.error("Error completing D2:", error);
    res.status(500).json({ error: "Failed to complete D2" });
  }
});

// D2 verify
router.post("/capas/:id/d2/verify", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });

    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) {
      return res.status(404).json({ error: "CAPA not found" });
    }

    const d2 = await storage.getCapaD2(capaId);
    if (!d2 || !d2.d2CompletedAt) {
      return res.status(400).json({ error: "D2 must be completed before verification" });
    }

    await storage.updateCapaD2(capaId, {
      d2VerifiedAt: new Date(),
      d2VerifiedBy: req.auth!.user.id,
    });

    await storage.createCapaAuditLog({
      orgId: req.orgId!,
      capaId,
      action: 'discipline_verified',
      userId: req.auth!.user.id,
      discipline: 'D2',
      changeDescription: 'D2 verified',
    });

    res.json({ message: "D2 verified successfully" });
  } catch (error) {
    console.error("Error verifying D2:", error);
    res.status(500).json({ error: "Failed to verify D2" });
  }
});

// =============================================
// CAPA/8D Module: D3 Interim Containment
// =============================================

router.get("/capas/:id/d3", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });

    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) {
      return res.status(404).json({ error: "CAPA not found" });
    }

    const d3 = await storage.getCapaD3(capaId);
    res.json(d3 || null);
  } catch (error) {
    console.error("Error fetching D3:", error);
    res.status(500).json({ error: "Failed to fetch D3 data" });
  }
});

router.put("/capas/:id/d3", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });

    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) {
      return res.status(404).json({ error: "CAPA not found" });
    }

    let d3 = await storage.getCapaD3(capaId);
    if (d3) {
      d3 = (await storage.updateCapaD3(capaId, req.body))!;
    } else {
      const parsed = insertCapaD3ContainmentSchema.parse({
        ...req.body,
        orgId: req.orgId!,
        capaId,
        createdBy: req.auth!.user.id,
      });
      d3 = await storage.createCapaD3(parsed);
    }

    res.json(d3);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: fromError(error).toString() });
    }
    console.error("Error updating D3:", error);
    res.status(500).json({ error: "Failed to update D3 data" });
  }
});

// D3 add containment action
router.post("/capas/:id/d3/actions", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });

    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) {
      return res.status(404).json({ error: "CAPA not found" });
    }

    let d3 = await storage.getCapaD3(capaId);
    if (!d3) {
      d3 = await storage.createCapaD3({
        orgId: req.orgId!,
        capaId,
        createdBy: req.auth!.user.id,
      } as any);
    }

    const actions = JSON.parse(d3.actions || '[]');
    const newAction = {
      id: randomUUID(),
      ...req.body,
      status: 'open',
      createdAt: new Date().toISOString(),
      createdBy: req.auth!.user.id,
    };
    actions.push(newAction);

    await storage.updateCapaD3(capaId, { actions: JSON.stringify(actions) });

    res.status(201).json(newAction);
  } catch (error) {
    console.error("Error adding containment action:", error);
    res.status(500).json({ error: "Failed to add containment action" });
  }
});

// D3 update containment action
router.patch("/capas/:id/d3/actions/:actionId", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });

    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) {
      return res.status(404).json({ error: "CAPA not found" });
    }

    const d3 = await storage.getCapaD3(capaId);
    if (!d3) return res.status(404).json({ error: "D3 not found" });

    const actions = JSON.parse(d3.actions || '[]');
    const actionId = req.params.actionId;
    const idx = actions.findIndex((a: any) => a.id === actionId);
    if (idx === -1) return res.status(404).json({ error: "Action not found" });

    actions[idx] = { ...actions[idx], ...req.body, updatedAt: new Date().toISOString() };
    await storage.updateCapaD3(capaId, { actions: JSON.stringify(actions) });

    res.json(actions[idx]);
  } catch (error) {
    console.error("Error updating containment action:", error);
    res.status(500).json({ error: "Failed to update containment action" });
  }
});

// D3 verify action effectiveness
router.post("/capas/:id/d3/actions/:actionId/verify", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });

    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) {
      return res.status(404).json({ error: "CAPA not found" });
    }

    const d3 = await storage.getCapaD3(capaId);
    if (!d3) return res.status(404).json({ error: "D3 not found" });

    const actions = JSON.parse(d3.actions || '[]');
    const actionId = req.params.actionId;
    const idx = actions.findIndex((a: any) => a.id === actionId);
    if (idx === -1) return res.status(404).json({ error: "Action not found" });

    actions[idx] = {
      ...actions[idx],
      status: 'verified',
      verifiedAt: new Date().toISOString(),
      verifiedBy: req.auth!.user.id,
      verificationNotes: req.body.notes,
    };
    await storage.updateCapaD3(capaId, { actions: JSON.stringify(actions) });

    res.json(actions[idx]);
  } catch (error) {
    console.error("Error verifying action:", error);
    res.status(500).json({ error: "Failed to verify action" });
  }
});

// D3 sort results
router.post("/capas/:id/d3/sort-results", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });

    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) {
      return res.status(404).json({ error: "CAPA not found" });
    }

    const d3 = await storage.getCapaD3(capaId);
    if (!d3) return res.status(400).json({ error: "D3 data must be created first" });

    const { quantityInspected, quantityPassed, quantityFailed, quantityReworked, quantityScrapped } = req.body;

    await storage.updateCapaD3(capaId, {
      quantityInspected: quantityInspected ?? d3.quantityInspected,
      quantityPassed: quantityPassed ?? d3.quantityPassed,
      quantityFailed: quantityFailed ?? d3.quantityFailed,
      quantityReworked: quantityReworked ?? d3.quantityReworked,
      quantityScrapped: quantityScrapped ?? d3.quantityScrapped,
    });

    res.json({ message: "Sort results updated" });
  } catch (error) {
    console.error("Error updating sort results:", error);
    res.status(500).json({ error: "Failed to update sort results" });
  }
});

// D3 verify effectiveness
router.post("/capas/:id/d3/verify-effectiveness", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });

    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) {
      return res.status(404).json({ error: "CAPA not found" });
    }

    const d3 = await storage.getCapaD3(capaId);
    if (!d3) return res.status(400).json({ error: "D3 data must be created first" });

    await storage.updateCapaD3(capaId, {
      containmentEffective: 1,
      containmentEffectiveDate: new Date(),
      containmentEffectiveEvidence: req.body.evidence || null,
    });

    res.json({ message: "Containment effectiveness verified" });
  } catch (error) {
    console.error("Error verifying effectiveness:", error);
    res.status(500).json({ error: "Failed to verify effectiveness" });
  }
});

// D3 complete
router.post("/capas/:id/d3/complete", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });

    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) {
      return res.status(404).json({ error: "CAPA not found" });
    }

    const d3 = await storage.getCapaD3(capaId);
    if (!d3) return res.status(400).json({ error: "D3 data must be created first" });

    // Validate containment actions are complete
    const actions = JSON.parse(d3.actions || '[]');
    if (d3.containmentRequired && actions.length === 0) {
      return res.status(400).json({ error: "At least one containment action is required" });
    }

    await storage.updateCapaD3(capaId, {
      d3CompletedAt: new Date(),
      d3CompletedBy: req.auth!.user.id,
    });

    await storage.createCapaAuditLog({
      orgId: req.orgId!,
      capaId,
      action: 'discipline_completed',
      userId: req.auth!.user.id,
      discipline: 'D3',
      changeDescription: 'D3 completed',
    });

    res.json({ message: "D3 completed successfully" });
  } catch (error) {
    console.error("Error completing D3:", error);
    res.status(500).json({ error: "Failed to complete D3" });
  }
});

// D3 verify
router.post("/capas/:id/d3/verify", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });

    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) {
      return res.status(404).json({ error: "CAPA not found" });
    }

    const d3 = await storage.getCapaD3(capaId);
    if (!d3 || !d3.d3CompletedAt) {
      return res.status(400).json({ error: "D3 must be completed before verification" });
    }

    await storage.updateCapaD3(capaId, {
      d3VerifiedAt: new Date(),
      d3VerifiedBy: req.auth!.user.id,
    });

    await storage.createCapaAuditLog({
      orgId: req.orgId!,
      capaId,
      action: 'discipline_verified',
      userId: req.auth!.user.id,
      discipline: 'D3',
      changeDescription: 'D3 verified',
    });

    res.json({ message: "D3 verified successfully" });
  } catch (error) {
    console.error("Error verifying D3:", error);
    res.status(500).json({ error: "Failed to verify D3" });
  }
});

// =============================================
// CAPA/8D Module: D4 Root Cause Analysis
// =============================================

router.get("/capas/:id/d4", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });

    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) {
      return res.status(404).json({ error: "CAPA not found" });
    }

    const d4 = await storage.getCapaD4(capaId);
    if (d4) {
      const candidates = await storage.getD4Candidates(capaId);
      return res.json({ ...d4, candidates });
    }
    res.json(null);
  } catch (error) {
    console.error("Error fetching D4:", error);
    res.status(500).json({ error: "Failed to fetch D4 data" });
  }
});

router.put("/capas/:id/d4", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });

    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) {
      return res.status(404).json({ error: "CAPA not found" });
    }

    let d4 = await storage.getCapaD4(capaId);
    if (d4) {
      d4 = (await storage.updateCapaD4(capaId, req.body))!;
    } else {
      const parsed = insertCapaD4RootCauseSchema.parse({
        ...req.body,
        orgId: req.orgId!,
        capaId,
        createdBy: req.auth!.user.id,
      });
      d4 = await storage.createCapaD4(parsed);
    }

    res.json(d4);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: fromError(error).toString() });
    }
    console.error("Error updating D4:", error);
    res.status(500).json({ error: "Failed to update D4 data" });
  }
});

// D4 five-why chain
router.post("/capas/:id/d4/five-why", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });

    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) {
      return res.status(404).json({ error: "CAPA not found" });
    }

    let d4 = await storage.getCapaD4(capaId);
    if (!d4) {
      d4 = await storage.createCapaD4({
        orgId: req.orgId!,
        capaId,
        createdBy: req.auth!.user.id,
      } as any);
    }

    const chains = JSON.parse(d4.fiveWhyAnalysis || '[]');
    const newChain = {
      id: randomUUID(),
      ...req.body,
      createdAt: new Date().toISOString(),
      createdBy: req.auth!.user.id,
    };
    chains.push(newChain);

    await storage.updateCapaD4(capaId, { fiveWhyAnalysis: JSON.stringify(chains) });

    res.status(201).json(newChain);
  } catch (error) {
    console.error("Error adding 5-Why chain:", error);
    res.status(500).json({ error: "Failed to add 5-Why chain" });
  }
});

// D4 update five-why chain
router.patch("/capas/:id/d4/five-why/:chainId", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });

    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) {
      return res.status(404).json({ error: "CAPA not found" });
    }

    const d4 = await storage.getCapaD4(capaId);
    if (!d4) return res.status(404).json({ error: "D4 not found" });

    const chains = JSON.parse(d4.fiveWhyAnalysis || '[]');
    const chainId = req.params.chainId;
    const idx = chains.findIndex((c: any) => c.id === chainId);
    if (idx === -1) return res.status(404).json({ error: "5-Why chain not found" });

    chains[idx] = { ...chains[idx], ...req.body, updatedAt: new Date().toISOString() };
    await storage.updateCapaD4(capaId, { fiveWhyAnalysis: JSON.stringify(chains) });

    res.json(chains[idx]);
  } catch (error) {
    console.error("Error updating 5-Why chain:", error);
    res.status(500).json({ error: "Failed to update 5-Why chain" });
  }
});

// D4 fishbone diagram
router.put("/capas/:id/d4/fishbone", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });

    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) {
      return res.status(404).json({ error: "CAPA not found" });
    }

    let d4 = await storage.getCapaD4(capaId);
    if (!d4) {
      d4 = await storage.createCapaD4({
        orgId: req.orgId!,
        capaId,
        createdBy: req.auth!.user.id,
      } as any);
    }

    await storage.updateCapaD4(capaId, { fishboneDiagram: JSON.stringify(req.body) });

    const updated = await storage.getCapaD4(capaId);
    res.json(updated);
  } catch (error) {
    console.error("Error updating fishbone:", error);
    res.status(500).json({ error: "Failed to update fishbone diagram" });
  }
});

// D4 root cause candidates
router.post("/capas/:id/d4/candidates", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });

    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) {
      return res.status(404).json({ error: "CAPA not found" });
    }

    let d4 = await storage.getCapaD4(capaId);
    if (!d4) {
      d4 = await storage.createCapaD4({
        orgId: req.orgId!,
        capaId,
        createdBy: req.auth!.user.id,
      } as any);
    }

    const parsed = insertCapaD4RootCauseCandidateSchema.parse({
      ...req.body,
      orgId: req.orgId!,
      capaId,
      d4Id: d4.id,
      createdBy: req.auth!.user.id,
    });

    const candidate = await storage.createD4Candidate(parsed);
    res.status(201).json(candidate);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: fromError(error).toString() });
    }
    console.error("Error adding root cause candidate:", error);
    res.status(500).json({ error: "Failed to add root cause candidate" });
  }
});

// D4 update candidate
router.patch("/capas/:id/d4/candidates/:candidateId", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    const candidateId = parseInt(req.params.candidateId);
    if (isNaN(capaId) || isNaN(candidateId)) return res.status(400).json({ error: "Invalid ID" });

    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) {
      return res.status(404).json({ error: "CAPA not found" });
    }

    const existing = await storage.getD4Candidate(candidateId);
    if (!existing || existing.capaId !== capaId) {
      return res.status(404).json({ error: "Candidate not found" });
    }

    const updated = await storage.updateD4Candidate(candidateId, req.body);
    res.json(updated);
  } catch (error) {
    console.error("Error updating candidate:", error);
    res.status(500).json({ error: "Failed to update candidate" });
  }
});

// D4 verify candidate as root cause
router.post("/capas/:id/d4/candidates/:candidateId/verify", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    const candidateId = parseInt(req.params.candidateId);
    if (isNaN(capaId) || isNaN(candidateId)) return res.status(400).json({ error: "Invalid ID" });

    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) {
      return res.status(404).json({ error: "CAPA not found" });
    }

    const existing = await storage.getD4Candidate(candidateId);
    if (!existing || existing.capaId !== capaId) {
      return res.status(404).json({ error: "Candidate not found" });
    }

    const updated = await storage.updateD4Candidate(candidateId, {
      isRootCause: 1,
      verificationResult: 'confirmed',
      verifiedAt: new Date(),
      verifiedBy: req.auth!.user.id,
    });

    await storage.createCapaAuditLog({
      orgId: req.orgId!,
      capaId,
      action: 'root_cause_verified',
      userId: req.auth!.user.id,
      newValue: JSON.stringify({ candidateId, description: existing.description }),
    });

    res.json(updated);
  } catch (error) {
    console.error("Error verifying candidate:", error);
    res.status(500).json({ error: "Failed to verify candidate" });
  }
});

// D4 verification tests
router.post("/capas/:id/d4/verification-tests", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });

    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) {
      return res.status(404).json({ error: "CAPA not found" });
    }

    const d4 = await storage.getCapaD4(capaId);
    if (!d4) return res.status(400).json({ error: "D4 data must be created first" });

    const tests = JSON.parse(d4.verificationTests || '[]');
    const newTest = {
      id: randomUUID(),
      ...req.body,
      createdAt: new Date().toISOString(),
      createdBy: req.auth!.user.id,
    };
    tests.push(newTest);

    await storage.updateCapaD4(capaId, { verificationTests: JSON.stringify(tests) });

    res.status(201).json(newTest);
  } catch (error) {
    console.error("Error adding verification test:", error);
    res.status(500).json({ error: "Failed to add verification test" });
  }
});

// D4 verify occurrence root cause
router.post("/capas/:id/d4/verify-occurrence", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });

    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) {
      return res.status(404).json({ error: "CAPA not found" });
    }

    const d4 = await storage.getCapaD4(capaId);
    if (!d4) return res.status(400).json({ error: "D4 data must be created first" });

    await storage.updateCapaD4(capaId, {
      rootCauseOccurrenceVerified: 1,
      rootCauseOccurrenceVerifiedBy: req.auth!.user.id,
      rootCauseOccurrenceVerifiedAt: new Date(),
    });

    res.json({ message: "Occurrence root cause verified" });
  } catch (error) {
    console.error("Error verifying occurrence root cause:", error);
    res.status(500).json({ error: "Failed to verify occurrence root cause" });
  }
});

// D4 verify escape root cause
router.post("/capas/:id/d4/verify-escape", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });

    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) {
      return res.status(404).json({ error: "CAPA not found" });
    }

    const d4 = await storage.getCapaD4(capaId);
    if (!d4) return res.status(400).json({ error: "D4 data must be created first" });

    await storage.updateCapaD4(capaId, {
      rootCauseEscapeVerified: 1,
      rootCauseEscapeVerifiedBy: req.auth!.user.id,
      rootCauseEscapeVerifiedAt: new Date(),
    });

    res.json({ message: "Escape root cause verified" });
  } catch (error) {
    console.error("Error verifying escape root cause:", error);
    res.status(500).json({ error: "Failed to verify escape root cause" });
  }
});

// D4 complete
router.post("/capas/:id/d4/complete", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });

    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) {
      return res.status(404).json({ error: "CAPA not found" });
    }

    const d4 = await storage.getCapaD4(capaId);
    if (!d4) return res.status(400).json({ error: "D4 data must be created first" });

    // Validate: both root causes verified
    if (!d4.rootCauseOccurrenceVerified) {
      return res.status(400).json({ error: "Occurrence root cause must be verified" });
    }
    if (!d4.rootCauseEscapeVerified) {
      return res.status(400).json({ error: "Escape root cause must be verified" });
    }

    await storage.updateCapaD4(capaId, {
      d4CompletedAt: new Date(),
      d4CompletedBy: req.auth!.user.id,
    });

    await storage.createCapaAuditLog({
      orgId: req.orgId!,
      capaId,
      action: 'discipline_completed',
      userId: req.auth!.user.id,
      discipline: 'D4',
      changeDescription: 'D4 completed',
    });

    res.json({ message: "D4 completed successfully" });
  } catch (error) {
    console.error("Error completing D4:", error);
    res.status(500).json({ error: "Failed to complete D4" });
  }
});

// D4 verify
router.post("/capas/:id/d4/verify", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });

    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) {
      return res.status(404).json({ error: "CAPA not found" });
    }

    const d4 = await storage.getCapaD4(capaId);
    if (!d4 || !d4.d4CompletedAt) {
      return res.status(400).json({ error: "D4 must be completed before verification" });
    }

    await storage.updateCapaD4(capaId, {
      d4VerifiedAt: new Date(),
      d4VerifiedBy: req.auth!.user.id,
    });

    await storage.createCapaAuditLog({
      orgId: req.orgId!,
      capaId,
      action: 'discipline_verified',
      userId: req.auth!.user.id,
      discipline: 'D4',
      changeDescription: 'D4 verified',
    });

    res.json({ message: "D4 verified successfully" });
  } catch (error) {
    console.error("Error verifying D4:", error);
    res.status(500).json({ error: "Failed to verify D4" });
  }
});

// =============================================
// CAPA/8D Module: D5 Permanent Corrective Actions
// =============================================

router.get("/capas/:id/d5", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });
    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) return res.status(404).json({ error: "CAPA not found" });
    const d5 = await storage.getCapaD5(capaId);
    res.json(d5 || null);
  } catch (error) {
    console.error("Error fetching D5:", error);
    res.status(500).json({ error: "Failed to fetch D5 data" });
  }
});

router.put("/capas/:id/d5", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });
    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) return res.status(404).json({ error: "CAPA not found" });

    let d5 = await storage.getCapaD5(capaId);
    if (d5) {
      d5 = (await storage.updateCapaD5(capaId, req.body))!;
    } else {
      const parsed = insertCapaD5CorrectiveActionSchema.parse({
        ...req.body, orgId: req.orgId!, capaId, createdBy: req.auth!.user.id,
      });
      d5 = await storage.createCapaD5(parsed);
    }
    res.json(d5);
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: fromError(error).toString() });
    console.error("Error updating D5:", error);
    res.status(500).json({ error: "Failed to update D5 data" });
  }
});

// D5 add corrective action
router.post("/capas/:id/d5/actions", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });
    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) return res.status(404).json({ error: "CAPA not found" });

    let d5 = await storage.getCapaD5(capaId);
    if (!d5) {
      d5 = await storage.createCapaD5({ orgId: req.orgId!, capaId, createdBy: req.auth!.user.id } as any);
    }

    const actions = JSON.parse(d5.correctiveActionsSelected || '[]');
    const newAction = { id: randomUUID(), ...req.body, status: 'open', createdAt: new Date().toISOString(), createdBy: req.auth!.user.id };
    actions.push(newAction);
    await storage.updateCapaD5(capaId, { correctiveActionsSelected: JSON.stringify(actions) });
    res.status(201).json(newAction);
  } catch (error) {
    console.error("Error adding corrective action:", error);
    res.status(500).json({ error: "Failed to add corrective action" });
  }
});

// D5 update corrective action
router.patch("/capas/:id/d5/actions/:actionId", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });
    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) return res.status(404).json({ error: "CAPA not found" });

    const d5 = await storage.getCapaD5(capaId);
    if (!d5) return res.status(404).json({ error: "D5 not found" });

    const actions = JSON.parse(d5.correctiveActionsSelected || '[]');
    const idx = actions.findIndex((a: any) => a.id === req.params.actionId);
    if (idx === -1) return res.status(404).json({ error: "Action not found" });

    actions[idx] = { ...actions[idx], ...req.body, updatedAt: new Date().toISOString() };
    await storage.updateCapaD5(capaId, { correctiveActionsSelected: JSON.stringify(actions) });
    res.json(actions[idx]);
  } catch (error) {
    console.error("Error updating corrective action:", error);
    res.status(500).json({ error: "Failed to update corrective action" });
  }
});

// D5 add alternative considered
router.post("/capas/:id/d5/alternatives", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });
    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) return res.status(404).json({ error: "CAPA not found" });

    let d5 = await storage.getCapaD5(capaId);
    if (!d5) {
      d5 = await storage.createCapaD5({ orgId: req.orgId!, capaId, createdBy: req.auth!.user.id } as any);
    }

    const alternatives = JSON.parse(d5.alternativesConsidered || '[]');
    const newAlt = { id: randomUUID(), ...req.body, createdAt: new Date().toISOString() };
    alternatives.push(newAlt);
    await storage.updateCapaD5(capaId, { alternativesConsidered: JSON.stringify(alternatives) });
    res.status(201).json(newAlt);
  } catch (error) {
    console.error("Error adding alternative:", error);
    res.status(500).json({ error: "Failed to add alternative" });
  }
});

// D5 risk assessment
router.put("/capas/:id/d5/risk-assessment", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });
    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) return res.status(404).json({ error: "CAPA not found" });

    const d5 = await storage.getCapaD5(capaId);
    if (!d5) return res.status(400).json({ error: "D5 data must be created first" });

    await storage.updateCapaD5(capaId, { riskAssessment: JSON.stringify(req.body) });
    const updated = await storage.getCapaD5(capaId);
    res.json(updated);
  } catch (error) {
    console.error("Error updating risk assessment:", error);
    res.status(500).json({ error: "Failed to update risk assessment" });
  }
});

// D5 request approval
router.post("/capas/:id/d5/request-approval", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });
    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) return res.status(404).json({ error: "CAPA not found" });

    const d5 = await storage.getCapaD5(capaId);
    if (!d5) return res.status(400).json({ error: "D5 data must be created first" });

    await storage.updateCapaD5(capaId, { managementApprovalStatus: 'pending' });

    await storage.createCapaAuditLog({
      orgId: req.orgId!, capaId, action: 'approval_requested', userId: req.auth!.user.id,
      discipline: 'D5', changeDescription: 'D5 submitted for management approval',
    });

    res.json({ message: "Approval requested" });
  } catch (error) {
    console.error("Error requesting approval:", error);
    res.status(500).json({ error: "Failed to request approval" });
  }
});

// D5 approve
router.post("/capas/:id/d5/approve", requireAuth, requireRole("admin", "quality_manager"), async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });
    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) return res.status(404).json({ error: "CAPA not found" });

    await storage.updateCapaD5(capaId, {
      managementApprovalStatus: 'approved',
      managementApprovedBy: req.auth!.user.id,
      managementApprovedAt: new Date(),
    });

    await storage.createCapaAuditLog({
      orgId: req.orgId!, capaId, action: 'approved', userId: req.auth!.user.id,
      discipline: 'D5', changeDescription: 'D5 corrective actions approved by management',
    });

    res.json({ message: "D5 approved" });
  } catch (error) {
    console.error("Error approving D5:", error);
    res.status(500).json({ error: "Failed to approve D5" });
  }
});

// D5 reject
router.post("/capas/:id/d5/reject", requireAuth, requireRole("admin", "quality_manager"), async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });
    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) return res.status(404).json({ error: "CAPA not found" });

    const { reason } = req.body;
    if (!reason) return res.status(400).json({ error: "Rejection reason is required" });

    await storage.updateCapaD5(capaId, { managementApprovalStatus: 'rejected' });

    await storage.createCapaAuditLog({
      orgId: req.orgId!, capaId, action: 'rejected', userId: req.auth!.user.id,
      discipline: 'D5', changeDescription: `D5 rejected: ${reason}`,
    });

    res.json({ message: "D5 rejected" });
  } catch (error) {
    console.error("Error rejecting D5:", error);
    res.status(500).json({ error: "Failed to reject D5" });
  }
});

// D5 complete
router.post("/capas/:id/d5/complete", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });
    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) return res.status(404).json({ error: "CAPA not found" });

    const d5 = await storage.getCapaD5(capaId);
    if (!d5) return res.status(400).json({ error: "D5 data must be created first" });

    const actions = JSON.parse(d5.correctiveActionsSelected || '[]');
    if (actions.length === 0) return res.status(400).json({ error: "At least one corrective action must be defined" });
    if (d5.managementApprovalRequired && d5.managementApprovalStatus !== 'approved') {
      return res.status(400).json({ error: "Management approval is required" });
    }

    await storage.updateCapaD5(capaId, { d5CompletedAt: new Date(), d5CompletedBy: req.auth!.user.id });

    await storage.createCapaAuditLog({
      orgId: req.orgId!, capaId, action: 'discipline_completed', userId: req.auth!.user.id,
      discipline: 'D5', changeDescription: 'D5 completed',
    });

    res.json({ message: "D5 completed successfully" });
  } catch (error) {
    console.error("Error completing D5:", error);
    res.status(500).json({ error: "Failed to complete D5" });
  }
});

// D5 verify
router.post("/capas/:id/d5/verify", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });
    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) return res.status(404).json({ error: "CAPA not found" });

    const d5 = await storage.getCapaD5(capaId);
    if (!d5 || !d5.d5CompletedAt) return res.status(400).json({ error: "D5 must be completed before verification" });

    await storage.updateCapaD5(capaId, { d5VerifiedAt: new Date(), d5VerifiedBy: req.auth!.user.id });

    await storage.createCapaAuditLog({
      orgId: req.orgId!, capaId, action: 'discipline_verified', userId: req.auth!.user.id,
      discipline: 'D5', changeDescription: 'D5 verified',
    });

    res.json({ message: "D5 verified successfully" });
  } catch (error) {
    console.error("Error verifying D5:", error);
    res.status(500).json({ error: "Failed to verify D5" });
  }
});

// =============================================
// CAPA/8D Module: D6 Implementation & Validation
// =============================================

router.get("/capas/:id/d6", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });
    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) return res.status(404).json({ error: "CAPA not found" });
    const d6 = await storage.getCapaD6(capaId);
    res.json(d6 || null);
  } catch (error) {
    console.error("Error fetching D6:", error);
    res.status(500).json({ error: "Failed to fetch D6 data" });
  }
});

router.put("/capas/:id/d6", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });
    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) return res.status(404).json({ error: "CAPA not found" });

    let d6 = await storage.getCapaD6(capaId);
    if (d6) {
      d6 = (await storage.updateCapaD6(capaId, req.body))!;
    } else {
      const parsed = insertCapaD6ValidationSchema.parse({
        ...req.body, orgId: req.orgId!, capaId, createdBy: req.auth!.user.id,
      });
      d6 = await storage.createCapaD6(parsed);
    }
    res.json(d6);
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: fromError(error).toString() });
    console.error("Error updating D6:", error);
    res.status(500).json({ error: "Failed to update D6 data" });
  }
});

// D6 implementation log
router.post("/capas/:id/d6/implementation-log", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });
    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) return res.status(404).json({ error: "CAPA not found" });

    let d6 = await storage.getCapaD6(capaId);
    if (!d6) {
      d6 = await storage.createCapaD6({ orgId: req.orgId!, capaId, createdBy: req.auth!.user.id } as any);
    }

    const log = JSON.parse(d6.implementationLog || '[]');
    const entry = { id: randomUUID(), ...req.body, timestamp: new Date().toISOString(), loggedBy: req.auth!.user.id };
    log.push(entry);
    await storage.updateCapaD6(capaId, { implementationLog: JSON.stringify(log) });
    res.status(201).json(entry);
  } catch (error) {
    console.error("Error adding implementation log:", error);
    res.status(500).json({ error: "Failed to add implementation log entry" });
  }
});

// D6 mark action as implemented
router.post("/capas/:id/d6/actions/:actionId/implement", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });
    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) return res.status(404).json({ error: "CAPA not found" });

    let d6 = await storage.getCapaD6(capaId);
    if (!d6) return res.status(400).json({ error: "D6 data must be created first" });

    const implemented = JSON.parse(d6.actionsImplemented || '[]');
    const pending = JSON.parse(d6.actionsPending || '[]');
    const actionId = req.params.actionId;

    // Move from pending to implemented
    const pendingIdx = pending.findIndex((a: any) => a.id === actionId);
    if (pendingIdx !== -1) pending.splice(pendingIdx, 1);

    implemented.push({
      id: actionId,
      ...req.body,
      implementedAt: new Date().toISOString(),
      implementedBy: req.auth!.user.id,
    });

    await storage.updateCapaD6(capaId, {
      actionsImplemented: JSON.stringify(implemented),
      actionsPending: JSON.stringify(pending),
    });

    res.json({ message: "Action marked as implemented" });
  } catch (error) {
    console.error("Error implementing action:", error);
    res.status(500).json({ error: "Failed to mark action as implemented" });
  }
});

// D6 record delay
router.post("/capas/:id/d6/delays", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });
    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) return res.status(404).json({ error: "CAPA not found" });

    let d6 = await storage.getCapaD6(capaId);
    if (!d6) return res.status(400).json({ error: "D6 data must be created first" });

    const delays = JSON.parse(d6.delaysEncountered || '[]');
    const delay = { id: randomUUID(), ...req.body, reportedAt: new Date().toISOString(), reportedBy: req.auth!.user.id };
    delays.push(delay);
    await storage.updateCapaD6(capaId, { delaysEncountered: JSON.stringify(delays) });
    res.status(201).json(delay);
  } catch (error) {
    console.error("Error recording delay:", error);
    res.status(500).json({ error: "Failed to record delay" });
  }
});

// D6 validation tests
router.post("/capas/:id/d6/validation-tests", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });
    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) return res.status(404).json({ error: "CAPA not found" });

    let d6 = await storage.getCapaD6(capaId);
    if (!d6) {
      d6 = await storage.createCapaD6({ orgId: req.orgId!, capaId, createdBy: req.auth!.user.id } as any);
    }

    const tests = JSON.parse(d6.validationTests || '[]');
    const newTest = { id: randomUUID(), ...req.body, status: 'pending', createdAt: new Date().toISOString() };
    tests.push(newTest);
    await storage.updateCapaD6(capaId, { validationTests: JSON.stringify(tests) });
    res.status(201).json(newTest);
  } catch (error) {
    console.error("Error adding validation test:", error);
    res.status(500).json({ error: "Failed to add validation test" });
  }
});

// D6 record validation test result
router.post("/capas/:id/d6/validation-tests/:testId/result", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });
    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) return res.status(404).json({ error: "CAPA not found" });

    const d6 = await storage.getCapaD6(capaId);
    if (!d6) return res.status(400).json({ error: "D6 data must be created first" });

    const tests = JSON.parse(d6.validationTests || '[]');
    const idx = tests.findIndex((t: any) => t.id === req.params.testId);
    if (idx === -1) return res.status(404).json({ error: "Validation test not found" });

    tests[idx] = { ...tests[idx], ...req.body, status: 'completed', completedAt: new Date().toISOString(), completedBy: req.auth!.user.id };
    await storage.updateCapaD6(capaId, { validationTests: JSON.stringify(tests) });
    res.json(tests[idx]);
  } catch (error) {
    console.error("Error recording test result:", error);
    res.status(500).json({ error: "Failed to record test result" });
  }
});

// D6 statistical validation
router.put("/capas/:id/d6/statistical-validation", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });
    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) return res.status(404).json({ error: "CAPA not found" });

    const d6 = await storage.getCapaD6(capaId);
    if (!d6) return res.status(400).json({ error: "D6 data must be created first" });

    await storage.updateCapaD6(capaId, { statisticalValidation: JSON.stringify(req.body) });
    const updated = await storage.getCapaD6(capaId);
    res.json(updated);
  } catch (error) {
    console.error("Error updating statistical validation:", error);
    res.status(500).json({ error: "Failed to update statistical validation" });
  }
});

// D6 remove containment
router.post("/capas/:id/d6/remove-containment", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });
    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) return res.status(404).json({ error: "CAPA not found" });

    const d6 = await storage.getCapaD6(capaId);
    if (!d6) return res.status(400).json({ error: "D6 data must be created first" });
    if (!d6.effectivenessVerified) return res.status(400).json({ error: "Effectiveness must be verified before removing containment" });

    await storage.updateCapaD6(capaId, {
      containmentRemoved: 1,
      containmentRemovedAt: new Date(),
      containmentRemovalVerifiedBy: req.auth!.user.id,
    });

    await storage.createCapaAuditLog({
      orgId: req.orgId!, capaId, action: 'containment_removed', userId: req.auth!.user.id,
      discipline: 'D6', changeDescription: 'Containment measures removed',
    });

    res.json({ message: "Containment removed" });
  } catch (error) {
    console.error("Error removing containment:", error);
    res.status(500).json({ error: "Failed to remove containment" });
  }
});

// D6 verify effectiveness
router.post("/capas/:id/d6/verify-effectiveness", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });
    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) return res.status(404).json({ error: "CAPA not found" });

    const d6 = await storage.getCapaD6(capaId);
    if (!d6) return res.status(400).json({ error: "D6 data must be created first" });

    await storage.updateCapaD6(capaId, {
      effectivenessVerified: 1,
      effectivenessVerifiedBy: req.auth!.user.id,
      effectivenessVerifiedAt: new Date(),
      effectivenessResult: req.body.result || 'effective',
      effectivenessEvidence: req.body.evidence || null,
    });

    res.json({ message: "Effectiveness verified" });
  } catch (error) {
    console.error("Error verifying effectiveness:", error);
    res.status(500).json({ error: "Failed to verify effectiveness" });
  }
});

// D6 reoccurrence check
router.post("/capas/:id/d6/reoccurrence-check", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });
    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) return res.status(404).json({ error: "CAPA not found" });

    const d6 = await storage.getCapaD6(capaId);
    if (!d6) return res.status(400).json({ error: "D6 data must be created first" });

    await storage.updateCapaD6(capaId, {
      reoccurrenceCheck: 1,
      reoccurrenceCheckDate: new Date(),
      reoccurrenceCheckMethod: req.body.method || null,
    });

    res.json({ message: "Reoccurrence check recorded" });
  } catch (error) {
    console.error("Error recording reoccurrence check:", error);
    res.status(500).json({ error: "Failed to record reoccurrence check" });
  }
});

// D6 complete
router.post("/capas/:id/d6/complete", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });
    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) return res.status(404).json({ error: "CAPA not found" });

    const d6 = await storage.getCapaD6(capaId);
    if (!d6) return res.status(400).json({ error: "D6 data must be created first" });

    if (!d6.effectivenessVerified) return res.status(400).json({ error: "Effectiveness must be verified" });

    await storage.updateCapaD6(capaId, {
      implementationStatus: 'complete',
      d6CompletedAt: new Date(),
      d6CompletedBy: req.auth!.user.id,
    });

    await storage.createCapaAuditLog({
      orgId: req.orgId!, capaId, action: 'discipline_completed', userId: req.auth!.user.id,
      discipline: 'D6', changeDescription: 'D6 completed',
    });

    res.json({ message: "D6 completed successfully" });
  } catch (error) {
    console.error("Error completing D6:", error);
    res.status(500).json({ error: "Failed to complete D6" });
  }
});

// D6 verify
router.post("/capas/:id/d6/verify", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });
    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) return res.status(404).json({ error: "CAPA not found" });

    const d6 = await storage.getCapaD6(capaId);
    if (!d6 || !d6.d6CompletedAt) return res.status(400).json({ error: "D6 must be completed before verification" });

    await storage.updateCapaD6(capaId, { d6VerifiedAt: new Date(), d6VerifiedBy: req.auth!.user.id });

    await storage.createCapaAuditLog({
      orgId: req.orgId!, capaId, action: 'discipline_verified', userId: req.auth!.user.id,
      discipline: 'D6', changeDescription: 'D6 verified',
    });

    res.json({ message: "D6 verified successfully" });
  } catch (error) {
    console.error("Error verifying D6:", error);
    res.status(500).json({ error: "Failed to verify D6" });
  }
});

// =============================================
// CAPA/8D Module: D7 Preventive Actions
// =============================================

router.get("/capas/:id/d7", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });
    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) return res.status(404).json({ error: "CAPA not found" });
    const d7 = await storage.getCapaD7(capaId);
    res.json(d7 || null);
  } catch (error) {
    console.error("Error fetching D7:", error);
    res.status(500).json({ error: "Failed to fetch D7 data" });
  }
});

router.put("/capas/:id/d7", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });
    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) return res.status(404).json({ error: "CAPA not found" });

    let d7 = await storage.getCapaD7(capaId);
    if (d7) {
      d7 = (await storage.updateCapaD7(capaId, req.body))!;
    } else {
      const parsed = insertCapaD7PreventiveSchema.parse({
        ...req.body, orgId: req.orgId!, capaId, createdBy: req.auth!.user.id,
      });
      d7 = await storage.createCapaD7(parsed);
    }
    res.json(d7);
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: fromError(error).toString() });
    console.error("Error updating D7:", error);
    res.status(500).json({ error: "Failed to update D7 data" });
  }
});

// D7 systemic analysis
router.post("/capas/:id/d7/systemic-analysis", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });
    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) return res.status(404).json({ error: "CAPA not found" });

    let d7 = await storage.getCapaD7(capaId);
    if (!d7) {
      d7 = await storage.createCapaD7({ orgId: req.orgId!, capaId, createdBy: req.auth!.user.id } as any);
    }

    await storage.updateCapaD7(capaId, {
      systemicAnalysisComplete: 1,
      systemicAnalysisSummary: req.body.summary || null,
      managementSystemsReviewed: JSON.stringify(req.body.systemsReviewed || []),
    });

    res.json({ message: "Systemic analysis recorded" });
  } catch (error) {
    console.error("Error recording systemic analysis:", error);
    res.status(500).json({ error: "Failed to record systemic analysis" });
  }
});

// D7 similar processes
router.post("/capas/:id/d7/similar-processes", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });
    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) return res.status(404).json({ error: "CAPA not found" });

    let d7 = await storage.getCapaD7(capaId);
    if (!d7) return res.status(400).json({ error: "D7 data must be created first" });

    const processes = JSON.parse(d7.similarProcessesIdentified || '[]');
    const newProcess = { id: randomUUID(), ...req.body, identifiedAt: new Date().toISOString() };
    processes.push(newProcess);
    await storage.updateCapaD7(capaId, { similarProcessesIdentified: JSON.stringify(processes) });
    res.status(201).json(newProcess);
  } catch (error) {
    console.error("Error adding similar process:", error);
    res.status(500).json({ error: "Failed to add similar process" });
  }
});

// D7 add preventive action
router.post("/capas/:id/d7/actions", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });
    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) return res.status(404).json({ error: "CAPA not found" });

    let d7 = await storage.getCapaD7(capaId);
    if (!d7) {
      d7 = await storage.createCapaD7({ orgId: req.orgId!, capaId, createdBy: req.auth!.user.id } as any);
    }

    const actions = JSON.parse(d7.preventiveActions || '[]');
    const newAction = { id: randomUUID(), ...req.body, status: 'open', createdAt: new Date().toISOString(), createdBy: req.auth!.user.id };
    actions.push(newAction);
    await storage.updateCapaD7(capaId, { preventiveActions: JSON.stringify(actions) });
    res.status(201).json(newAction);
  } catch (error) {
    console.error("Error adding preventive action:", error);
    res.status(500).json({ error: "Failed to add preventive action" });
  }
});

// D7 update preventive action
router.patch("/capas/:id/d7/actions/:actionId", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });
    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) return res.status(404).json({ error: "CAPA not found" });

    const d7 = await storage.getCapaD7(capaId);
    if (!d7) return res.status(404).json({ error: "D7 not found" });

    const actions = JSON.parse(d7.preventiveActions || '[]');
    const idx = actions.findIndex((a: any) => a.id === req.params.actionId);
    if (idx === -1) return res.status(404).json({ error: "Action not found" });

    actions[idx] = { ...actions[idx], ...req.body, updatedAt: new Date().toISOString() };
    await storage.updateCapaD7(capaId, { preventiveActions: JSON.stringify(actions) });
    res.json(actions[idx]);
  } catch (error) {
    console.error("Error updating preventive action:", error);
    res.status(500).json({ error: "Failed to update preventive action" });
  }
});

// D7 verify preventive action
router.post("/capas/:id/d7/actions/:actionId/verify", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });
    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) return res.status(404).json({ error: "CAPA not found" });

    const d7 = await storage.getCapaD7(capaId);
    if (!d7) return res.status(404).json({ error: "D7 not found" });

    const actions = JSON.parse(d7.preventiveActions || '[]');
    const idx = actions.findIndex((a: any) => a.id === req.params.actionId);
    if (idx === -1) return res.status(404).json({ error: "Action not found" });

    actions[idx] = { ...actions[idx], status: 'verified', verifiedAt: new Date().toISOString(), verifiedBy: req.auth!.user.id };
    await storage.updateCapaD7(capaId, { preventiveActions: JSON.stringify(actions) });
    res.json(actions[idx]);
  } catch (error) {
    console.error("Error verifying preventive action:", error);
    res.status(500).json({ error: "Failed to verify preventive action" });
  }
});

// D7 horizontal deployment
router.put("/capas/:id/d7/horizontal-deployment", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });
    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) return res.status(404).json({ error: "CAPA not found" });

    const d7 = await storage.getCapaD7(capaId);
    if (!d7) return res.status(400).json({ error: "D7 data must be created first" });

    await storage.updateCapaD7(capaId, { horizontalDeploymentPlan: JSON.stringify(req.body) });
    const updated = await storage.getCapaD7(capaId);
    res.json(updated);
  } catch (error) {
    console.error("Error updating horizontal deployment:", error);
    res.status(500).json({ error: "Failed to update horizontal deployment" });
  }
});

// D7 deployment status for location
router.post("/capas/:id/d7/horizontal-deployment/:location", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });
    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) return res.status(404).json({ error: "CAPA not found" });

    const d7 = await storage.getCapaD7(capaId);
    if (!d7) return res.status(400).json({ error: "D7 data must be created first" });

    const plan = JSON.parse(d7.horizontalDeploymentPlan || '{}');
    const location = decodeURIComponent(req.params.location);
    if (!plan.locations) plan.locations = {};
    plan.locations[location] = { ...req.body, updatedAt: new Date().toISOString(), updatedBy: req.auth!.user.id };
    await storage.updateCapaD7(capaId, { horizontalDeploymentPlan: JSON.stringify(plan) });
    res.json({ message: `Deployment status updated for ${location}` });
  } catch (error) {
    console.error("Error updating deployment status:", error);
    res.status(500).json({ error: "Failed to update deployment status" });
  }
});

// D7 lesson learned
router.post("/capas/:id/d7/lesson-learned", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });
    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) return res.status(404).json({ error: "CAPA not found" });

    let d7 = await storage.getCapaD7(capaId);
    if (!d7) return res.status(400).json({ error: "D7 data must be created first" });

    const entries = JSON.parse(d7.knowledgeBaseEntries || '[]');
    const entry = { id: randomUUID(), ...req.body, createdAt: new Date().toISOString(), createdBy: req.auth!.user.id };
    entries.push(entry);
    await storage.updateCapaD7(capaId, { knowledgeBaseEntries: JSON.stringify(entries), lessonLearnedCreated: 1 });
    res.status(201).json(entry);
  } catch (error) {
    console.error("Error creating lesson learned:", error);
    res.status(500).json({ error: "Failed to create lesson learned" });
  }
});

// D7 complete
router.post("/capas/:id/d7/complete", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });
    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) return res.status(404).json({ error: "CAPA not found" });

    const d7 = await storage.getCapaD7(capaId);
    if (!d7) return res.status(400).json({ error: "D7 data must be created first" });

    if (!d7.systemicAnalysisComplete) return res.status(400).json({ error: "Systemic analysis must be complete" });

    await storage.updateCapaD7(capaId, { d7CompletedAt: new Date(), d7CompletedBy: req.auth!.user.id });

    await storage.createCapaAuditLog({
      orgId: req.orgId!, capaId, action: 'discipline_completed', userId: req.auth!.user.id,
      discipline: 'D7', changeDescription: 'D7 completed',
    });

    res.json({ message: "D7 completed successfully" });
  } catch (error) {
    console.error("Error completing D7:", error);
    res.status(500).json({ error: "Failed to complete D7" });
  }
});

// D7 verify
router.post("/capas/:id/d7/verify", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });
    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) return res.status(404).json({ error: "CAPA not found" });

    const d7 = await storage.getCapaD7(capaId);
    if (!d7 || !d7.d7CompletedAt) return res.status(400).json({ error: "D7 must be completed before verification" });

    await storage.updateCapaD7(capaId, { d7VerifiedAt: new Date(), d7VerifiedBy: req.auth!.user.id });

    await storage.createCapaAuditLog({
      orgId: req.orgId!, capaId, action: 'discipline_verified', userId: req.auth!.user.id,
      discipline: 'D7', changeDescription: 'D7 verified',
    });

    res.json({ message: "D7 verified successfully" });
  } catch (error) {
    console.error("Error verifying D7:", error);
    res.status(500).json({ error: "Failed to verify D7" });
  }
});

// =============================================
// CAPA/8D Module: D8 Team Recognition & Closure
// =============================================

router.get("/capas/:id/d8", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });
    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) return res.status(404).json({ error: "CAPA not found" });
    const d8 = await storage.getCapaD8(capaId);
    res.json(d8 || null);
  } catch (error) {
    console.error("Error fetching D8:", error);
    res.status(500).json({ error: "Failed to fetch D8 data" });
  }
});

router.put("/capas/:id/d8", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });
    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) return res.status(404).json({ error: "CAPA not found" });

    let d8 = await storage.getCapaD8(capaId);
    if (d8) {
      d8 = (await storage.updateCapaD8(capaId, req.body))!;
    } else {
      const parsed = insertCapaD8ClosureSchema.parse({
        ...req.body, orgId: req.orgId!, capaId, createdBy: req.auth!.user.id,
      });
      d8 = await storage.createCapaD8(parsed);
    }
    res.json(d8);
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: fromError(error).toString() });
    console.error("Error updating D8:", error);
    res.status(500).json({ error: "Failed to update D8 data" });
  }
});

// D8 closure criteria
router.post("/capas/:id/d8/closure-criteria/:itemId", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });
    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) return res.status(404).json({ error: "CAPA not found" });

    let d8 = await storage.getCapaD8(capaId);
    if (!d8) return res.status(400).json({ error: "D8 data must be created first" });

    const checklist = JSON.parse(d8.closureCriteriaChecklist || '{}');
    checklist[req.params.itemId] = { met: true, metAt: new Date().toISOString(), metBy: req.auth!.user.id, ...req.body };
    await storage.updateCapaD8(capaId, { closureCriteriaChecklist: JSON.stringify(checklist) });
    res.json({ message: `Criteria ${req.params.itemId} marked as met` });
  } catch (error) {
    console.error("Error updating closure criteria:", error);
    res.status(500).json({ error: "Failed to update closure criteria" });
  }
});

// D8 team recognition
router.put("/capas/:id/d8/team-recognition", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });
    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) return res.status(404).json({ error: "CAPA not found" });

    const d8 = await storage.getCapaD8(capaId);
    if (!d8) return res.status(400).json({ error: "D8 data must be created first" });

    await storage.updateCapaD8(capaId, {
      teamRecognition: JSON.stringify(req.body),
      teamRecognitionDate: req.body.date ? new Date(req.body.date) : new Date(),
      teamRecognitionMethod: req.body.recognitionType || null,
    });

    const updated = await storage.getCapaD8(capaId);
    res.json(updated);
  } catch (error) {
    console.error("Error updating team recognition:", error);
    res.status(500).json({ error: "Failed to update team recognition" });
  }
});

// D8 success metrics
router.put("/capas/:id/d8/success-metrics", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });
    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) return res.status(404).json({ error: "CAPA not found" });

    const d8 = await storage.getCapaD8(capaId);
    if (!d8) return res.status(400).json({ error: "D8 data must be created first" });

    await storage.updateCapaD8(capaId, { successMetrics: JSON.stringify(req.body) });
    const updated = await storage.getCapaD8(capaId);
    res.json(updated);
  } catch (error) {
    console.error("Error updating success metrics:", error);
    res.status(500).json({ error: "Failed to update success metrics" });
  }
});

// D8 lessons learned
router.post("/capas/:id/d8/lessons-learned", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });
    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) return res.status(404).json({ error: "CAPA not found" });

    const d8 = await storage.getCapaD8(capaId);
    if (!d8) return res.status(400).json({ error: "D8 data must be created first" });

    const feedback = JSON.parse(d8.teamFeedback || '[]');
    const entry = { id: randomUUID(), ...req.body, createdAt: new Date().toISOString(), createdBy: req.auth!.user.id };
    feedback.push(entry);
    await storage.updateCapaD8(capaId, { teamFeedback: JSON.stringify(feedback), lessonsLearnedShared: 1 });
    res.status(201).json(entry);
  } catch (error) {
    console.error("Error adding lessons learned:", error);
    res.status(500).json({ error: "Failed to add lessons learned" });
  }
});

// D8 submit for approval
router.post("/capas/:id/d8/submit-for-approval", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });
    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) return res.status(404).json({ error: "CAPA not found" });

    await storage.updateCapa(capaId, { approvalStatus: 'pending_review' });

    await storage.createCapaAuditLog({
      orgId: req.orgId!, capaId, action: 'closure_submitted', userId: req.auth!.user.id,
      discipline: 'D8', changeDescription: 'CAPA submitted for closure approval',
    });

    res.json({ message: "Submitted for closure approval" });
  } catch (error) {
    console.error("Error submitting for approval:", error);
    res.status(500).json({ error: "Failed to submit for approval" });
  }
});

// D8 approve closure
router.post("/capas/:id/d8/approve-closure", requireAuth, requireRole("admin", "quality_manager"), async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });
    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) return res.status(404).json({ error: "CAPA not found" });

    const d8 = await storage.getCapaD8(capaId);
    if (!d8) return res.status(400).json({ error: "D8 data must be created first" });

    await storage.updateCapaD8(capaId, { approvedBy: req.auth!.user.id, approvedAt: new Date() });
    await storage.updateCapa(capaId, { approvalStatus: 'approved', approvedBy: req.auth!.user.id, approvedAt: new Date() });

    await storage.createCapaAuditLog({
      orgId: req.orgId!, capaId, action: 'closure_approved', userId: req.auth!.user.id,
      discipline: 'D8', changeDescription: 'CAPA closure approved',
    });

    res.json({ message: "Closure approved" });
  } catch (error) {
    console.error("Error approving closure:", error);
    res.status(500).json({ error: "Failed to approve closure" });
  }
});

// D8 close
router.post("/capas/:id/d8/close", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });
    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) return res.status(404).json({ error: "CAPA not found" });

    const d8 = await storage.getCapaD8(capaId);
    if (!d8) return res.status(400).json({ error: "D8 data must be created first" });
    if (!d8.approvedAt) return res.status(400).json({ error: "Closure must be approved first" });

    const now = new Date();
    await storage.updateCapaD8(capaId, { closedBy: req.auth!.user.id, closedAt: now, closureCriteriaMet: 1 });
    await storage.updateCapa(capaId, { status: 'closed', closedBy: req.auth!.user.id, closedAt: now, actualClosureDate: now });

    await storage.createCapaAuditLog({
      orgId: req.orgId!, capaId, action: 'closed', userId: req.auth!.user.id,
      discipline: 'D8', changeDescription: 'CAPA closed',
    });

    res.json({ message: "CAPA closed successfully" });
  } catch (error) {
    console.error("Error closing CAPA:", error);
    res.status(500).json({ error: "Failed to close CAPA" });
  }
});

// D8 reopen
router.post("/capas/:id/d8/reopen", requireAuth, requireRole("admin", "quality_manager"), async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });
    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) return res.status(404).json({ error: "CAPA not found" });

    const { reason } = req.body;
    if (!reason) return res.status(400).json({ error: "Reopen reason is required" });

    await storage.updateCapa(capaId, {
      status: capaRecord.currentDiscipline === 'D8' ? 'd8_closure' : 'd0_awareness',
      closedAt: null,
      closedBy: null,
      actualClosureDate: null,
      approvalStatus: 'draft',
    });

    await storage.createCapaAuditLog({
      orgId: req.orgId!, capaId, action: 'reopened', userId: req.auth!.user.id,
      changeDescription: `CAPA reopened: ${reason}`,
    });

    res.json({ message: "CAPA reopened" });
  } catch (error) {
    console.error("Error reopening CAPA:", error);
    res.status(500).json({ error: "Failed to reopen CAPA" });
  }
});

// D8 final report
router.get("/capas/:id/d8/final-report", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });
    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) return res.status(404).json({ error: "CAPA not found" });

    const [d0, d1, d2, d3, d4, d5, d6, d7, d8, team, sources, attachments, auditLogs] = await Promise.all([
      storage.getCapaD0(capaId), storage.getCapaD1(capaId), storage.getCapaD2(capaId),
      storage.getCapaD3(capaId), storage.getCapaD4(capaId), storage.getCapaD5(capaId),
      storage.getCapaD6(capaId), storage.getCapaD7(capaId), storage.getCapaD8(capaId),
      storage.getCapaTeamMembers(capaId), storage.getCapaSources(capaId),
      storage.getCapaAttachments(capaId), storage.getCapaAuditLogs(capaId),
    ]);

    let candidates = null;
    if (d4) candidates = await storage.getD4Candidates(capaId);

    res.json({
      capa: capaRecord, d0, d1, d2, d3, d4: d4 ? { ...d4, candidates } : null,
      d5, d6, d7, d8, team, sources,
      attachments: attachments.filter(a => !a.deletedAt),
      auditLogSummary: { totalEntries: auditLogs.length, latestEntry: auditLogs[0] || null },
    });
  } catch (error) {
    console.error("Error generating final report:", error);
    res.status(500).json({ error: "Failed to generate final report" });
  }
});

// D8 complete
router.post("/capas/:id/d8/complete", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });
    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) return res.status(404).json({ error: "CAPA not found" });

    const d8 = await storage.getCapaD8(capaId);
    if (!d8) return res.status(400).json({ error: "D8 data must be created first" });

    await storage.updateCapaD8(capaId, { d8CompletedAt: new Date(), d8CompletedBy: req.auth!.user.id });

    await storage.createCapaAuditLog({
      orgId: req.orgId!, capaId, action: 'discipline_completed', userId: req.auth!.user.id,
      discipline: 'D8', changeDescription: 'D8 completed',
    });

    res.json({ message: "D8 completed successfully" });
  } catch (error) {
    console.error("Error completing D8:", error);
    res.status(500).json({ error: "Failed to complete D8" });
  }
});

// D8 verify
router.post("/capas/:id/d8/verify", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });
    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) return res.status(404).json({ error: "CAPA not found" });

    const d8 = await storage.getCapaD8(capaId);
    if (!d8 || !d8.d8CompletedAt) return res.status(400).json({ error: "D8 must be completed before verification" });

    await storage.updateCapaD8(capaId, { d8VerifiedAt: new Date(), d8VerifiedBy: req.auth!.user.id });

    await storage.createCapaAuditLog({
      orgId: req.orgId!, capaId, action: 'discipline_verified', userId: req.auth!.user.id,
      discipline: 'D8', changeDescription: 'D8 verified',
    });

    res.json({ message: "D8 verified successfully" });
  } catch (error) {
    console.error("Error verifying D8:", error);
    res.status(500).json({ error: "Failed to verify D8" });
  }
});

export { router };
