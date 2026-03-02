import { Router } from "express";
import { randomUUID, createHash } from "crypto";
import fs from "fs";
import path from "path";
import { z } from "zod";
import { fromError } from "zod-validation-error";
import { storage } from "../../storage";
import { db } from "../../db";
import { requireAuth, requireRole } from "../../middleware/auth";
import { upload } from "../_config";
import { getErrorMessage } from "../_helpers";
import {
  capa,
  capaTeamMember,
  capaSource,
  capaAttachment,
  capaRelatedRecord,
  insertCapaSchema,
  insertCapaTeamMemberSchema,
  insertCapaSourceSchema,
  insertCapaAttachmentSchema,
  insertCapaRelatedRecordSchema,
} from "@shared/schema";

const router = Router();

// =============================================
// CAPA/8D Module: Dashboard & Core CRUD
// =============================================

// Dashboard
router.get("/capas/dashboard", requireAuth, async (req, res) => {
  try {
    const orgId = req.orgId!;
    const metrics = await storage.getCapaMetrics(orgId);
    const capas = await storage.getCapas(orgId);
    const recentActivity = capas
      .sort((a, b) => new Date(b.updatedAt!).getTime() - new Date(a.updatedAt!).getTime())
      .slice(0, 10);
    res.json({ metrics, recentActivity });
  } catch (error) {
    console.error("Error fetching CAPA dashboard:", error);
    res.status(500).json({ error: "Failed to fetch dashboard" });
  }
});

// My assignments
router.get("/capas/my-assignments", requireAuth, async (req, res) => {
  try {
    const orgId = req.orgId!;
    const userId = req.auth!.user.id;
    const capas = await storage.getCapasForUser(orgId, userId);
    res.json(capas);
  } catch (error) {
    console.error("Error fetching my CAPA assignments:", error);
    res.status(500).json({ error: "Failed to fetch assignments" });
  }
});

// Overdue CAPAs
router.get("/capas/overdue", requireAuth, async (req, res) => {
  try {
    const orgId = req.orgId!;
    const capas = await storage.getCapas(orgId);
    const now = new Date();
    const overdue = capas
      .filter(c => c.targetClosureDate && new Date(c.targetClosureDate) < now && !c.closedAt && !c.deletedAt)
      .map(c => ({
        ...c,
        daysOverdue: Math.floor((now.getTime() - new Date(c.targetClosureDate!).getTime()) / (1000 * 60 * 60 * 24)),
      }));
    res.json(overdue);
  } catch (error) {
    console.error("Error fetching overdue CAPAs:", error);
    res.status(500).json({ error: "Failed to fetch overdue CAPAs" });
  }
});

// List CAPAs
router.get("/capas", requireAuth, async (req, res) => {
  try {
    const orgId = req.orgId!;
    const { status, priority, sourceType, search, page, limit } = req.query;
    const filters: { status?: string; priority?: string; sourceType?: string; search?: string } = {};
    if (status) filters.status = status as string;
    if (priority) filters.priority = priority as string;
    if (sourceType) filters.sourceType = sourceType as string;
    if (search) filters.search = search as string;

    const capas = await storage.getCapas(orgId, filters);
    const pageNum = parseInt(page as string) || 1;
    const pageSize = parseInt(limit as string) || 50;
    const start = (pageNum - 1) * pageSize;
    const paginated = capas.slice(start, start + pageSize);

    res.json({
      data: paginated,
      pagination: { page: pageNum, limit: pageSize, total: capas.length },
    });
  } catch (error) {
    console.error("Error listing CAPAs:", error);
    res.status(500).json({ error: "Failed to list CAPAs" });
  }
});

// Export CAPAs (must come BEFORE :id route)
router.get("/capas/export", requireAuth, async (req, res) => {
  try {
    const orgId = req.orgId!;
    const capas = await storage.getCapas(orgId);
    const format = (req.query.format as string) || 'json';

    if (format === 'json') {
      return res.json(capas.filter(c => !c.deletedAt));
    }

    const headers = ['ID', 'CAPA Number', 'Title', 'Status', 'Priority', 'Source Type', 'Current Discipline', 'Created At', 'Target Closure', 'Closed At'];
    const rows = capas.filter(c => !c.deletedAt).map(c => [
      c.id, c.capaNumber, `"${(c.title || '').replace(/"/g, '""')}"`, c.status, c.priority,
      c.sourceType, c.currentDiscipline, c.createdAt, c.targetClosureDate || '', c.closedAt || '',
    ].join(','));

    const csv = [headers.join(','), ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=capas-export.csv');
    res.send(csv);
  } catch (error) {
    console.error("Error exporting CAPAs:", error);
    res.status(500).json({ error: "Failed to export CAPAs" });
  }
});

// Get CAPA by ID
router.get("/capas/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid CAPA ID" });

    const capaRecord = await storage.getCapa(id);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) {
      return res.status(404).json({ error: "CAPA not found" });
    }

    // Load discipline data
    const [d0, d1, d2, d3, d4, team, sources] = await Promise.all([
      storage.getCapaD0(id),
      storage.getCapaD1(id),
      storage.getCapaD2(id),
      storage.getCapaD3(id),
      storage.getCapaD4(id),
      storage.getCapaTeamMembers(id),
      storage.getCapaSources(id),
    ]);

    res.json({ ...capaRecord, d0, d1, d2, d3, d4, team, sources });
  } catch (error) {
    console.error("Error fetching CAPA:", error);
    res.status(500).json({ error: "Failed to fetch CAPA" });
  }
});

// Create CAPA
router.post("/capas", requireAuth, async (req, res) => {
  try {
    const orgId = req.orgId!;
    const userId = req.auth!.user.id;

    // Auto-generate CAPA number
    const capaNumber = await storage.getNextCapaNumber(orgId);

    const parsed = insertCapaSchema.parse({
      ...req.body,
      orgId,
      capaNumber,
      createdBy: userId,
      status: 'd0_awareness',
      currentDiscipline: 'D0',
    });

    const created = await storage.createCapa(parsed);

    // Create audit log
    await storage.createCapaAuditLog({
      orgId,
      capaId: created.id,
      action: 'created',
      userId: userId,
      newValue: JSON.stringify({ title: created.title, capaNumber: created.capaNumber }),
    });

    res.status(201).json(created);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: fromError(error).toString() });
    }
    console.error("Error creating CAPA:", error);
    res.status(500).json({ error: "Failed to create CAPA" });
  }
});

// Update CAPA
router.patch("/capas/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid CAPA ID" });

    const existing = await storage.getCapa(id);
    if (!existing || existing.orgId !== req.orgId!) {
      return res.status(404).json({ error: "CAPA not found" });
    }

    const updated = await storage.updateCapa(id, req.body);

    // Audit log for update
    await storage.createCapaAuditLog({
      orgId: req.orgId!,
      capaId: id,
      action: 'updated',
      userId: req.auth!.user.id,
      previousValue: JSON.stringify(existing),
      newValue: JSON.stringify(updated),
    });

    res.json(updated);
  } catch (error) {
    console.error("Error updating CAPA:", error);
    res.status(500).json({ error: "Failed to update CAPA" });
  }
});

// Advance discipline
router.post("/capas/:id/advance-discipline", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid CAPA ID" });

    const capaRecord = await storage.getCapa(id);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) {
      return res.status(404).json({ error: "CAPA not found" });
    }

    const disciplineOrder = ['D0', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8'];
    const statusMap: Record<string, string> = {
      D0: 'd0_awareness', D1: 'd1_team', D2: 'd2_problem',
      D3: 'd3_containment', D4: 'd4_root_cause', D5: 'd5_corrective',
      D6: 'd6_validation', D7: 'd7_preventive', D8: 'd8_closure',
    };

    const currentIdx = disciplineOrder.indexOf(capaRecord.currentDiscipline);
    if (currentIdx === -1 || currentIdx >= disciplineOrder.length - 1) {
      return res.status(400).json({ error: "Cannot advance beyond D8" });
    }

    const nextDiscipline = disciplineOrder[currentIdx + 1];
    const nextStatus = statusMap[nextDiscipline];

    const updated = await storage.updateCapa(id, {
      currentDiscipline: nextDiscipline,
      status: nextStatus,
    });

    await storage.createCapaAuditLog({
      orgId: req.orgId!,
      capaId: id,
      action: 'discipline_advanced',
      userId: req.auth!.user.id,
      changeDescription: 'Discipline advanced',
      previousValue: capaRecord.currentDiscipline,
      newValue: nextDiscipline,
    });

    res.json(updated);
  } catch (error) {
    console.error("Error advancing discipline:", error);
    res.status(500).json({ error: "Failed to advance discipline" });
  }
});

// Hold CAPA
router.post("/capas/:id/hold", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid CAPA ID" });

    const capaRecord = await storage.getCapa(id);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) {
      return res.status(404).json({ error: "CAPA not found" });
    }

    const { reason } = req.body;
    if (!reason) return res.status(400).json({ error: "Hold reason is required" });

    const previousStatus = capaRecord.status;
    const updated = await storage.updateCapa(id, { status: 'on_hold' });

    await storage.createCapaAuditLog({
      orgId: req.orgId!,
      capaId: id,
      action: 'status_changed',
      userId: req.auth!.user.id,
      changeDescription: `Put on hold: ${reason}`,
      previousValue: previousStatus,
      newValue: 'on_hold',
    });

    res.json(updated);
  } catch (error) {
    console.error("Error putting CAPA on hold:", error);
    res.status(500).json({ error: "Failed to put CAPA on hold" });
  }
});

// Resume CAPA
router.post("/capas/:id/resume", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid CAPA ID" });

    const capaRecord = await storage.getCapa(id);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) {
      return res.status(404).json({ error: "CAPA not found" });
    }

    if (capaRecord.status !== 'on_hold') {
      return res.status(400).json({ error: "CAPA is not on hold" });
    }

    const statusMap: Record<string, string> = {
      D0: 'd0_awareness', D1: 'd1_team', D2: 'd2_problem',
      D3: 'd3_containment', D4: 'd4_root_cause', D5: 'd5_corrective',
      D6: 'd6_validation', D7: 'd7_preventive', D8: 'd8_closure',
    };

    const resumeStatus = statusMap[capaRecord.currentDiscipline] || 'd0_awareness';
    const updated = await storage.updateCapa(id, { status: resumeStatus });

    await storage.createCapaAuditLog({
      orgId: req.orgId!,
      capaId: id,
      action: 'status_changed',
      userId: req.auth!.user.id,
      changeDescription: 'Status changed',
      previousValue: 'on_hold',
      newValue: resumeStatus,
    });

    res.json(updated);
  } catch (error) {
    console.error("Error resuming CAPA:", error);
    res.status(500).json({ error: "Failed to resume CAPA" });
  }
});

// Delete CAPA (soft delete)
router.delete("/capas/:id", requireAuth, requireRole("admin", "quality_manager"), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid CAPA ID" });

    const capaRecord = await storage.getCapa(id);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) {
      return res.status(404).json({ error: "CAPA not found" });
    }

    await storage.updateCapa(id, { deletedAt: new Date() });

    await storage.createCapaAuditLog({
      orgId: req.orgId!,
      capaId: id,
      action: 'deleted',
      userId: req.auth!.user.id,
    });

    res.status(204).send();
  } catch (error) {
    console.error("Error deleting CAPA:", error);
    res.status(500).json({ error: "Failed to delete CAPA" });
  }
});

// =============================================
// CAPA/8D Module: Team Members
// =============================================

router.get("/capas/:id/team", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });

    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) {
      return res.status(404).json({ error: "CAPA not found" });
    }

    const members = await storage.getCapaTeamMembers(capaId);
    res.json(members);
  } catch (error) {
    console.error("Error fetching team members:", error);
    res.status(500).json({ error: "Failed to fetch team members" });
  }
});

router.post("/capas/:id/team", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });

    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) {
      return res.status(404).json({ error: "CAPA not found" });
    }

    const parsed = insertCapaTeamMemberSchema.parse({
      ...req.body,
      orgId: req.orgId!,
      capaId,
      createdBy: req.auth!.user.id,
    });

    // Enforce constraints: one champion, one leader
    const existingMembers = await storage.getCapaTeamMembers(capaId);
    if (parsed.isChampion && existingMembers.some(m => m.isChampion && !m.leftAt)) {
      return res.status(409).json({ error: "CAPA already has a champion" });
    }
    if (parsed.isLeader && existingMembers.some(m => m.isLeader && !m.leftAt)) {
      return res.status(409).json({ error: "CAPA already has a leader" });
    }

    const member = await storage.createCapaTeamMember(parsed);

    await storage.createCapaAuditLog({
      orgId: req.orgId!,
      capaId,
      action: 'team_member_added',
      userId: req.auth!.user.id,
      newValue: JSON.stringify({ userId: parsed.userId, role: parsed.role }),
    });

    res.status(201).json(member);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: fromError(error).toString() });
    }
    console.error("Error adding team member:", error);
    res.status(500).json({ error: "Failed to add team member" });
  }
});

router.patch("/capas/:id/team/:memberId", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    const memberId = parseInt(req.params.memberId);
    if (isNaN(capaId) || isNaN(memberId)) return res.status(400).json({ error: "Invalid ID" });

    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) {
      return res.status(404).json({ error: "CAPA not found" });
    }

    const existing = await storage.getCapaTeamMember(memberId);
    if (!existing || existing.capaId !== capaId) {
      return res.status(404).json({ error: "Team member not found" });
    }

    const updated = await storage.updateCapaTeamMember(memberId, req.body);
    res.json(updated);
  } catch (error) {
    console.error("Error updating team member:", error);
    res.status(500).json({ error: "Failed to update team member" });
  }
});

router.delete("/capas/:id/team/:memberId", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    const memberId = parseInt(req.params.memberId);
    if (isNaN(capaId) || isNaN(memberId)) return res.status(400).json({ error: "Invalid ID" });

    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) {
      return res.status(404).json({ error: "CAPA not found" });
    }

    const existing = await storage.getCapaTeamMember(memberId);
    if (!existing || existing.capaId !== capaId) {
      return res.status(404).json({ error: "Team member not found" });
    }

    const reason = req.body?.reason || 'Removed from team';
    await storage.removeCapaTeamMember(memberId, reason);

    await storage.createCapaAuditLog({
      orgId: req.orgId!,
      capaId,
      action: 'team_member_removed',
      userId: req.auth!.user.id,
      previousValue: JSON.stringify({ userId: existing.userId, role: existing.role }),
      changeDescription: reason,
    });

    res.status(204).send();
  } catch (error) {
    console.error("Error removing team member:", error);
    res.status(500).json({ error: "Failed to remove team member" });
  }
});

// =============================================
// CAPA/8D Module: Sources
// =============================================

router.get("/capas/:id/sources", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });

    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) {
      return res.status(404).json({ error: "CAPA not found" });
    }

    const sources = await storage.getCapaSources(capaId);
    res.json(sources);
  } catch (error) {
    console.error("Error fetching CAPA sources:", error);
    res.status(500).json({ error: "Failed to fetch sources" });
  }
});

router.post("/capas/:id/sources", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });

    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) {
      return res.status(404).json({ error: "CAPA not found" });
    }

    const parsed = insertCapaSourceSchema.parse({
      ...req.body,
      orgId: req.orgId!,
      capaId,
      createdBy: req.auth!.user.id,
    });

    const source = await storage.createCapaSource(parsed);
    res.status(201).json(source);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: fromError(error).toString() });
    }
    console.error("Error creating CAPA source:", error);
    res.status(500).json({ error: "Failed to create source" });
  }
});

router.delete("/capas/:id/sources/:sourceId", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    const sourceId = parseInt(req.params.sourceId);
    if (isNaN(capaId) || isNaN(sourceId)) return res.status(400).json({ error: "Invalid ID" });

    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) {
      return res.status(404).json({ error: "CAPA not found" });
    }

    const existing = await storage.getCapaSource(sourceId);
    if (!existing || existing.capaId !== capaId) {
      return res.status(404).json({ error: "Source not found" });
    }

    await storage.deleteCapaSource(sourceId);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting CAPA source:", error);
    res.status(500).json({ error: "Failed to delete source" });
  }
});

// =============================================
// CAPA/8D Module: Attachments
// =============================================

router.get("/capas/:id/attachments", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });

    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) {
      return res.status(404).json({ error: "CAPA not found" });
    }

    const discipline = req.query.discipline as string | undefined;
    const attachments = await storage.getCapaAttachments(capaId, discipline);

    // Filter by isEvidence if requested
    const isEvidence = req.query.isEvidence;
    if (isEvidence !== undefined) {
      const evidenceVal = isEvidence === 'true' || isEvidence === '1' ? 1 : 0;
      const filtered = attachments.filter(a => a.isEvidence === evidenceVal);
      return res.json(filtered);
    }

    res.json(attachments);
  } catch (error) {
    console.error("Error fetching attachments:", error);
    res.status(500).json({ error: "Failed to fetch attachments" });
  }
});

router.post("/capas/:id/attachments", requireAuth, upload.single('file'), async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });

    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) {
      return res.status(404).json({ error: "CAPA not found" });
    }

    const file = req.file;
    if (!file) return res.status(400).json({ error: "No file uploaded" });

    const checksum = createHash('sha256').update(fs.readFileSync(file.path)).digest('hex');

    const parsed = insertCapaAttachmentSchema.parse({
      orgId: req.orgId!,
      capaId,
      discipline: req.body.discipline || 'general',
      attachmentType: req.body.attachmentType || 'document',
      title: req.body.title || file.originalname,
      description: req.body.description,
      fileName: file.filename,
      originalName: file.originalname,
      fileType: path.extname(file.originalname).replace('.', ''),
      mimeType: file.mimetype,
      fileSize: file.size,
      storagePath: file.path,
      checksumSha256: checksum,
      isEvidence: req.body.isEvidence ? parseInt(req.body.isEvidence) : 0,
      evidenceDescription: req.body.evidenceDescription,
      uploadedBy: req.auth!.user.id,
    });

    const attachment = await storage.createCapaAttachment(parsed);
    res.status(201).json(attachment);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: fromError(error).toString() });
    }
    console.error("Error uploading attachment:", error);
    res.status(500).json({ error: "Failed to upload attachment" });
  }
});

router.get("/capa-attachments/:id/download", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid attachment ID" });

    const attachment = await storage.getCapaAttachment(id);
    if (!attachment || attachment.orgId !== req.orgId!) {
      return res.status(404).json({ error: "Attachment not found" });
    }

    if (!fs.existsSync(attachment.storagePath)) {
      return res.status(404).json({ error: "File not found on disk" });
    }

    res.download(attachment.storagePath, attachment.originalName);
  } catch (error) {
    console.error("Error downloading attachment:", error);
    res.status(500).json({ error: "Failed to download attachment" });
  }
});

router.delete("/capa-attachments/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid attachment ID" });

    const attachment = await storage.getCapaAttachment(id);
    if (!attachment || attachment.orgId !== req.orgId!) {
      return res.status(404).json({ error: "Attachment not found" });
    }

    // Soft delete
    await storage.updateCapaAttachment(id, {
      deletedAt: new Date(),
      deletedBy: req.auth!.user.id,
      deletionReason: req.body?.reason || 'Deleted by user',
    });

    res.status(204).send();
  } catch (error) {
    console.error("Error deleting attachment:", error);
    res.status(500).json({ error: "Failed to delete attachment" });
  }
});

// =============================================
// CAPA/8D Module: Related Records
// =============================================

router.get("/capas/:id/related", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });

    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) {
      return res.status(404).json({ error: "CAPA not found" });
    }

    const relatedType = req.query.relatedType as string | undefined;
    const records = await storage.getCapaRelatedRecords(capaId, relatedType);
    res.json(records);
  } catch (error) {
    console.error("Error fetching related records:", error);
    res.status(500).json({ error: "Failed to fetch related records" });
  }
});

router.post("/capas/:id/related", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });

    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) {
      return res.status(404).json({ error: "CAPA not found" });
    }

    const parsed = insertCapaRelatedRecordSchema.parse({
      ...req.body,
      orgId: req.orgId!,
      capaId,
      linkedBy: req.auth!.user.id,
    });

    const record = await storage.createCapaRelatedRecord(parsed);
    res.status(201).json(record);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: fromError(error).toString() });
    }
    console.error("Error creating related record:", error);
    res.status(500).json({ error: "Failed to create related record" });
  }
});

router.delete("/capas/:id/related/:relatedId", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    const relatedId = parseInt(req.params.relatedId);
    if (isNaN(capaId) || isNaN(relatedId)) return res.status(400).json({ error: "Invalid ID" });

    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) {
      return res.status(404).json({ error: "CAPA not found" });
    }

    const existing = await storage.getCapaRelatedRecord(relatedId);
    if (!existing || existing.capaId !== capaId) {
      return res.status(404).json({ error: "Related record not found" });
    }

    await storage.deleteCapaRelatedRecord(relatedId);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting related record:", error);
    res.status(500).json({ error: "Failed to delete related record" });
  }
});

export { router };
