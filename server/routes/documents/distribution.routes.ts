import { Router } from "express";
import { z } from "zod";
import { fromError } from "zod-validation-error";
import { storage } from "../../storage";
import { db } from "../../db";
import {
  insertDistributionListSchema,
  insertDocumentCommentSchema,
  insertExternalDocumentSchema,
  insertDocumentLinkEnhancedSchema,
  insertDocumentPrintLogSchema,
} from "@shared/schema";
import { requireAuth, requireRole } from "../../middleware/auth";
import { getErrorMessage } from "../_helpers";

const router = Router();

// ============================================
// DC PHASE 3: Distribution, Audit, Comments, Links
// ============================================

// --- DISTRIBUTION LISTS ---

// GET /api/distribution-lists
router.get("/distribution-lists", requireAuth, async (req, res) => {
  try {
    const status = req.query.status as string | undefined;
    const lists = await storage.getDistributionLists(req.orgId!, status);
    res.json(lists);
  } catch (error) {
    console.error("Error fetching distribution lists:", error);
    res.status(500).json({ error: "Failed to fetch distribution lists" });
  }
});

// GET /api/distribution-lists/:id
router.get("/distribution-lists/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    const list = await storage.getDistributionList(id);
    if (!list || list.orgId !== req.orgId!) {
      return res.status(404).json({ error: "Distribution list not found" });
    }
    res.json(list);
  } catch (error) {
    console.error("Error fetching distribution list:", error);
    res.status(500).json({ error: "Failed to fetch distribution list" });
  }
});

// POST /api/distribution-lists
router.post("/distribution-lists", requireAuth, async (req, res) => {
  try {
    const data = insertDistributionListSchema.parse({
      ...req.body,
      orgId: req.orgId!,
      createdBy: req.auth!.user.id,
    });
    const list = await storage.createDistributionList(data);
    res.status(201).json(list);
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error: " + fromError(error).message });
    }
    console.error("Error creating distribution list:", error);
    res.status(500).json({ error: "Failed to create distribution list" });
  }
});

// PATCH /api/distribution-lists/:id
router.patch("/distribution-lists/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    const existing = await storage.getDistributionList(id);
    if (!existing || existing.orgId !== req.orgId!) {
      return res.status(404).json({ error: "Distribution list not found" });
    }

    const updated = await storage.updateDistributionList(id, req.body);
    res.json(updated);
  } catch (error) {
    console.error("Error updating distribution list:", error);
    res.status(500).json({ error: "Failed to update distribution list" });
  }
});

// DELETE /api/distribution-lists/:id
router.delete("/distribution-lists/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    const existing = await storage.getDistributionList(id);
    if (!existing || existing.orgId !== req.orgId!) {
      return res.status(404).json({ error: "Distribution list not found" });
    }

    await storage.deleteDistributionList(id);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting distribution list:", error);
    res.status(500).json({ error: "Failed to delete distribution list" });
  }
});

// --- DOCUMENT DISTRIBUTION ---

// POST /api/documents/:documentId/distribute
router.post("/documents/:documentId/distribute", requireAuth, async (req, res) => {
  try {
    const { documentId } = req.params;
    const user = req.auth!.user;

    const doc = await storage.getDocumentById(documentId, req.orgId!);
    if (!doc) {
      return res.status(404).json({ error: "Document not found" });
    }

    if (doc.status !== 'effective') {
      return res.status(400).json({ error: "Document must be in effective status to distribute" });
    }

    const revisions = await storage.getDocumentRevisions(documentId, req.orgId!);
    const latestRevision = revisions[0];
    if (!latestRevision) {
      return res.status(400).json({ error: "Document has no revisions" });
    }

    const { distributionListId, additionalRecipients, comments } = req.body;

    let recipients: { userId?: string; name: string; email?: string; role?: string; department?: string }[] = [];
    let ackDueDays = 7;

    if (distributionListId) {
      const list = await storage.getDistributionList(parseInt(distributionListId));
      if (!list || list.orgId !== req.orgId!) {
        return res.status(404).json({ error: "Distribution list not found" });
      }
      ackDueDays = list.acknowledgmentDueDays || 7;
      try {
        recipients = JSON.parse(list.recipients);
      } catch { recipients = []; }
    }

    if (additionalRecipients && Array.isArray(additionalRecipients)) {
      recipients = [...recipients, ...additionalRecipients];
    }

    if (recipients.length === 0) {
      return res.status(400).json({ error: "No recipients specified" });
    }

    const ackDueDate = new Date(Date.now() + ackDueDays * 24 * 60 * 60 * 1000);
    const records = [];

    for (const recipient of recipients) {
      const record = await storage.createDocumentDistributionRecord({
        orgId: req.orgId!,
        documentId,
        revisionId: latestRevision.id,
        distributionListId: distributionListId ? parseInt(distributionListId) : null,
        recipientUserId: recipient.userId || null,
        recipientName: recipient.name,
        recipientEmail: recipient.email || null,
        recipientRole: recipient.role || null,
        recipientDepartment: recipient.department || null,
        distributedBy: user.id,
        distributionMethod: 'electronic',
        watermarkApplied: 1,
        requiresAcknowledgment: 1,
        acknowledgmentDueDate: ackDueDate,
        status: 'distributed',
      } as any);
      records.push(record);
    }

    await storage.createDocumentAccessLog({
      orgId: req.orgId!,
      documentId,
      revisionId: latestRevision.id,
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`,
      userRole: user.role,
      action: 'distribute',
      actionDetails: JSON.stringify({ recipientCount: records.length, distributionListId, comments }),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.status(201).json({
      distributionCount: records.length,
      records,
      message: `Distributed to ${records.length} recipients. Acknowledgment due in ${ackDueDays} days.`,
    });
  } catch (error) {
    console.error("Error distributing document:", error);
    res.status(500).json({ error: "Failed to distribute document" });
  }
});

// GET /api/documents/:documentId/distributions
router.get("/documents/:documentId/distributions", requireAuth, async (req, res) => {
  try {
    const { documentId } = req.params;
    const status = req.query.status as string | undefined;
    const records = await storage.getDocumentDistributionRecords(req.orgId!, documentId, status);
    res.json(records);
  } catch (error) {
    console.error("Error fetching distributions:", error);
    res.status(500).json({ error: "Failed to fetch distributions" });
  }
});

// GET /api/my/acknowledgments
router.get("/my/acknowledgments", requireAuth, async (req, res) => {
  try {
    const userId = req.auth!.user.id;
    const pending = await storage.getPendingAcknowledgments(req.orgId!, userId);

    const enriched = await Promise.all(pending.map(async (record) => {
      const doc = await storage.getDocumentById(record.documentId, req.orgId!);
      const isOverdue = record.acknowledgmentDueDate
        ? new Date(record.acknowledgmentDueDate) < new Date()
        : false;
      return {
        id: record.id,
        document: doc ? { id: doc.id, docNumber: doc.docNumber, title: doc.title } : null,
        distributedAt: record.distributedAt,
        acknowledgmentDueDate: record.acknowledgmentDueDate,
        isOverdue,
      };
    }));

    res.json(enriched);
  } catch (error) {
    console.error("Error fetching acknowledgments:", error);
    res.status(500).json({ error: "Failed to fetch acknowledgments" });
  }
});

// POST /api/distributions/:id/acknowledge
router.post("/distributions/:id/acknowledge", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    const record = await storage.getDocumentDistributionRecord(id);
    if (!record || record.orgId !== req.orgId!) {
      return res.status(404).json({ error: "Distribution record not found" });
    }

    const userId = req.auth!.user.id;
    if (record.recipientUserId && record.recipientUserId !== userId) {
      return res.status(403).json({ error: "This distribution is not assigned to you" });
    }

    if (record.acknowledgedAt) {
      return res.status(409).json({ error: "Already acknowledged" });
    }

    const { method, comment } = req.body;
    const user = req.auth!.user;

    const updated = await storage.updateDocumentDistributionRecord(id, {
      acknowledgedAt: new Date(),
      acknowledgmentMethod: method || 'click',
      acknowledgmentIp: req.ip,
      acknowledgmentComment: comment || null,
      status: 'acknowledged',
    } as any);

    await storage.createDocumentAccessLog({
      orgId: req.orgId!,
      documentId: record.documentId,
      revisionId: record.revisionId,
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`,
      userRole: user.role,
      action: 'acknowledge',
      actionDetails: JSON.stringify({ distributionRecordId: id, method, comment }),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json(updated);
  } catch (error) {
    console.error("Error acknowledging distribution:", error);
    res.status(500).json({ error: "Failed to acknowledge distribution" });
  }
});

// POST /api/documents/:documentId/recall
router.post("/documents/:documentId/recall", requireAuth, async (req, res) => {
  try {
    const { documentId } = req.params;
    const user = req.auth!.user;
    const { reason } = req.body;

    const doc = await storage.getDocumentById(documentId, req.orgId!);
    if (!doc) {
      return res.status(404).json({ error: "Document not found" });
    }

    const distributions = await storage.getDocumentDistributionRecords(req.orgId!, documentId);
    const activeDistributions = distributions.filter(d => d.status === 'distributed' || d.status === 'acknowledged');

    let recalledCount = 0;
    for (const dist of activeDistributions) {
      await storage.updateDocumentDistributionRecord(dist.id, {
        recalledAt: new Date(),
        recalledBy: user.id,
        recallReason: reason || null,
        status: 'recalled',
      } as any);
      recalledCount++;
    }

    await storage.createDocumentAccessLog({
      orgId: req.orgId!,
      documentId,
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`,
      userRole: user.role,
      action: 'recall',
      actionDetails: JSON.stringify({ reason, recalledCount }),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({
      recalledCount,
      message: `Recalled from ${recalledCount} recipients.`,
    });
  } catch (error) {
    console.error("Error recalling document:", error);
    res.status(500).json({ error: "Failed to recall document" });
  }
});

// --- ACCESS LOGS (Immutable - no update/delete) ---

// GET /api/documents/:documentId/access-log
router.get("/documents/:documentId/access-log", requireAuth, async (req, res) => {
  try {
    const { documentId } = req.params;
    const action = req.query.action as string | undefined;
    const userId = req.query.userId as string | undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;
    const limit = parseInt(req.query.limit as string) || 100;

    let logs;
    if (startDate && endDate) {
      logs = await storage.getDocumentAccessLogsByDateRange(req.orgId!, new Date(startDate), new Date(endDate));
      logs = logs.filter(l => l.documentId === documentId);
    } else if (userId) {
      logs = await storage.getDocumentAccessLogsByUser(req.orgId!, userId, limit);
      logs = logs.filter(l => l.documentId === documentId);
    } else {
      logs = await storage.getDocumentAccessLogs(req.orgId!, documentId, action, limit);
    }

    res.json(logs);
  } catch (error) {
    console.error("Error fetching access logs:", error);
    res.status(500).json({ error: "Failed to fetch access logs" });
  }
});

// GET /api/documents/:documentId/access-log/stats
router.get("/documents/:documentId/access-log/stats", requireAuth, async (req, res) => {
  try {
    const { documentId } = req.params;

    const byAction = await storage.getAccessLogStats(req.orgId!, documentId);
    const allLogs = await storage.getDocumentAccessLogs(req.orgId!, documentId);

    const uniqueViewers = new Set(allLogs.filter(l => l.action === 'view').map(l => l.userId)).size;
    const totalViews = byAction.find(a => a.action === 'view')?.count || 0;
    const downloads = byAction.find(a => a.action === 'download')?.count || 0;
    const prints = byAction.find(a => a.action === 'print')?.count || 0;

    // Compute by-user stats
    const userMap = new Map<string, { userId: string; userName: string; count: number }>();
    for (const log of allLogs) {
      const existing = userMap.get(log.userId);
      if (existing) {
        existing.count++;
      } else {
        userMap.set(log.userId, { userId: log.userId, userName: log.userName || 'Unknown', count: 1 });
      }
    }

    res.json({
      totalViews,
      uniqueViewers,
      downloads,
      prints,
      byAction,
      byUser: Array.from(userMap.values()).sort((a, b) => b.count - a.count),
    });
  } catch (error) {
    console.error("Error fetching access log stats:", error);
    res.status(500).json({ error: "Failed to fetch access log stats" });
  }
});

// GET /api/audit-log
router.get("/audit-log", requireAuth, async (req, res) => {
  try {
    const documentId = req.query.documentId as string | undefined;
    const action = req.query.action as string | undefined;
    const userId = req.query.userId as string | undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;
    const limit = parseInt(req.query.limit as string) || 100;

    let logs;
    if (startDate && endDate) {
      logs = await storage.getDocumentAccessLogsByDateRange(req.orgId!, new Date(startDate), new Date(endDate));
    } else if (userId) {
      logs = await storage.getDocumentAccessLogsByUser(req.orgId!, userId, limit);
    } else {
      logs = await storage.getDocumentAccessLogs(req.orgId!, documentId, action, limit);
    }

    res.json(logs);
  } catch (error) {
    console.error("Error fetching audit log:", error);
    res.status(500).json({ error: "Failed to fetch audit log" });
  }
});

// GET /api/audit-log/export
router.get("/audit-log/export", requireAuth, async (req, res) => {
  try {
    const documentId = req.query.documentId as string | undefined;
    const action = req.query.action as string | undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;
    const limit = parseInt(req.query.limit as string) || 10000;

    let logs;
    if (startDate && endDate) {
      logs = await storage.getDocumentAccessLogsByDateRange(req.orgId!, new Date(startDate), new Date(endDate));
    } else {
      logs = await storage.getDocumentAccessLogs(req.orgId!, documentId, action, limit);
    }

    const csvHeader = 'ID,Timestamp,DocumentID,Action,UserID,UserName,UserRole,IPAddress,Details\n';
    const csvRows = logs.map(l =>
      `${l.id},"${l.timestamp || ''}","${l.documentId}","${l.action}","${l.userId}","${(l.userName || '').replace(/"/g, '""')}","${l.userRole || ''}","${l.ipAddress || ''}","${(l.actionDetails || '').replace(/"/g, '""')}"`
    ).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="audit-log-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(csvHeader + csvRows);
  } catch (error) {
    console.error("Error exporting audit log:", error);
    res.status(500).json({ error: "Failed to export audit log" });
  }
});

// --- PRINT LOGS ---

// POST /api/documents/:documentId/print
router.post("/documents/:documentId/print", requireAuth, async (req, res) => {
  try {
    const { documentId } = req.params;
    const user = req.auth!.user;

    const doc = await storage.getDocumentById(documentId, req.orgId!);
    if (!doc) {
      return res.status(404).json({ error: "Document not found" });
    }

    const revisions = await storage.getDocumentRevisions(documentId, req.orgId!);
    const latestRevision = revisions[0];
    if (!latestRevision) {
      return res.status(400).json({ error: "Document has no revisions" });
    }

    const { copies, purpose, printerName, locations } = req.body;
    const numCopies = copies || 1;

    // Get next copy numbers
    const startCopyNum = await storage.getNextCopyNumber(documentId);
    const copyNumbers = Array.from({ length: numCopies }, (_, i) => startCopyNum + i);

    // Build controlled copies info from locations
    const controlledCopies = locations && Array.isArray(locations)
      ? locations.map((loc: any, i: number) => ({
          copyNumber: copyNumbers[i] || copyNumbers[copyNumbers.length - 1],
          location: loc.location,
          holder: loc.holder,
        }))
      : [];

    // Find a file for the document (use first available)
    const files = await storage.getDocumentFiles(req.orgId!, documentId);
    const fileId = files.length > 0 ? files[0].id : null;

    if (!fileId) {
      return res.status(400).json({ error: "Document has no files to print" });
    }

    const printLog = await storage.createDocumentPrintLog({
      orgId: req.orgId!,
      documentId,
      revisionId: latestRevision.id,
      fileId,
      printedBy: user.id,
      printCopies: numCopies,
      printPurpose: purpose || null,
      watermarkApplied: 1,
      watermarkText: `CONTROLLED COPY - ${doc.docNumber} Rev ${doc.currentRev}`,
      copyNumbers: JSON.stringify(copyNumbers),
      printerName: printerName || null,
      ipAddress: req.ip,
      controlledCopies: JSON.stringify(controlledCopies),
    } as any);

    await storage.createDocumentAccessLog({
      orgId: req.orgId!,
      documentId,
      revisionId: latestRevision.id,
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`,
      userRole: user.role,
      action: 'print',
      actionDetails: JSON.stringify({ copies: numCopies, copyNumbers, printerName }),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.status(201).json({
      printLog,
      copyNumbers,
      watermarkedFileUrl: `/api/document-files/${fileId}/download-watermarked`,
    });
  } catch (error) {
    console.error("Error recording print:", error);
    res.status(500).json({ error: "Failed to record print" });
  }
});

// GET /api/documents/:documentId/print-logs
router.get("/documents/:documentId/print-logs", requireAuth, async (req, res) => {
  try {
    const { documentId } = req.params;
    const logs = await storage.getDocumentPrintLogs(req.orgId!, documentId);
    res.json(logs);
  } catch (error) {
    console.error("Error fetching print logs:", error);
    res.status(500).json({ error: "Failed to fetch print logs" });
  }
});

// POST /api/print-logs/:id/recall-copies
router.post("/print-logs/:id/recall-copies", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    const printLog = await storage.getDocumentPrintLog(id);
    if (!printLog || printLog.orgId !== req.orgId!) {
      return res.status(404).json({ error: "Print log not found" });
    }

    const { copyNumbers, verifiedBy } = req.body;
    const user = req.auth!.user;

    const allCopyNumbers = JSON.parse(printLog.copyNumbers || '[]');
    const recalledCopyNumbers = copyNumbers || allCopyNumbers;
    const allRecalled = recalledCopyNumbers.length >= allCopyNumbers.length ? 1 : 0;

    const updated = await storage.updateDocumentPrintLog(id, {
      copiesRecalled: recalledCopyNumbers.length,
      allRecalled,
      recallVerifiedAt: new Date(),
      recallVerifiedBy: verifiedBy || user.id,
    } as any);

    await storage.createDocumentAccessLog({
      orgId: req.orgId!,
      documentId: printLog.documentId,
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`,
      userRole: user.role,
      action: 'recall_copies',
      actionDetails: JSON.stringify({ printLogId: id, recalledCopyNumbers }),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json(updated);
  } catch (error) {
    console.error("Error recalling copies:", error);
    res.status(500).json({ error: "Failed to recall copies" });
  }
});

// --- COMMENTS ---

// GET /api/documents/:documentId/comments
router.get("/documents/:documentId/comments", requireAuth, async (req, res) => {
  try {
    const { documentId } = req.params;
    const includeDeleted = req.query.includeDeleted === 'true';
    const comments = await storage.getDocumentComments(req.orgId!, documentId, includeDeleted);
    res.json(comments);
  } catch (error) {
    console.error("Error fetching comments:", error);
    res.status(500).json({ error: "Failed to fetch comments" });
  }
});

// POST /api/documents/:documentId/comments
router.post("/documents/:documentId/comments", requireAuth, async (req, res) => {
  try {
    const { documentId } = req.params;
    const user = req.auth!.user;

    const doc = await storage.getDocumentById(documentId, req.orgId!);
    if (!doc) {
      return res.status(404).json({ error: "Document not found" });
    }

    const data = insertDocumentCommentSchema.parse({
      ...req.body,
      orgId: req.orgId!,
      documentId,
      createdBy: req.body.createdBy || user.id,
      mentions: req.body.mentions ? JSON.stringify(req.body.mentions) : '[]',
    });

    const comment = await storage.createDocumentComment(data);
    res.status(201).json(comment);
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error: " + fromError(error).message });
    }
    console.error("Error creating comment:", error);
    res.status(500).json({ error: "Failed to create comment" });
  }
});

// PATCH /api/comments/:id
router.patch("/comments/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    const existing = await storage.getDocumentComment(id);
    if (!existing || existing.orgId !== req.orgId!) {
      return res.status(404).json({ error: "Comment not found" });
    }

    // Only author can edit within 24 hours
    const user = req.auth!.user;
    if (existing.createdBy !== user.id) {
      return res.status(403).json({ error: "Only the author can edit this comment" });
    }

    const createdAt = new Date(existing.createdAt!);
    const hoursSinceCreation = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
    if (hoursSinceCreation > 24) {
      return res.status(400).json({ error: "Comments can only be edited within 24 hours of creation" });
    }

    const updated = await storage.updateDocumentComment(id, {
      ...req.body,
      updatedAt: new Date(),
    });
    res.json(updated);
  } catch (error) {
    console.error("Error updating comment:", error);
    res.status(500).json({ error: "Failed to update comment" });
  }
});

// DELETE /api/comments/:id (soft delete)
router.delete("/comments/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    const existing = await storage.getDocumentComment(id);
    if (!existing || existing.orgId !== req.orgId!) {
      return res.status(404).json({ error: "Comment not found" });
    }

    await storage.softDeleteDocumentComment(id);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting comment:", error);
    res.status(500).json({ error: "Failed to delete comment" });
  }
});

// POST /api/comments/:id/resolve
router.post("/comments/:id/resolve", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    const existing = await storage.getDocumentComment(id);
    if (!existing || existing.orgId !== req.orgId!) {
      return res.status(404).json({ error: "Comment not found" });
    }

    if (existing.threadResolved === 1) {
      return res.status(409).json({ error: "Comment thread already resolved" });
    }

    const resolved = await storage.resolveCommentThread(id, req.auth!.user.id);
    res.json(resolved);
  } catch (error) {
    console.error("Error resolving comment:", error);
    res.status(500).json({ error: "Failed to resolve comment" });
  }
});

// --- EXTERNAL DOCUMENTS ---

// GET /api/external-documents
router.get("/external-documents", requireAuth, async (req, res) => {
  try {
    const source = req.query.source as string | undefined;
    const status = req.query.status as string | undefined;
    const hasUpdates = req.query.hasUpdates as string | undefined;

    if (hasUpdates === 'true') {
      const docs = await storage.getExternalDocumentsWithUpdates(req.orgId!);
      return res.json(docs);
    }

    const docs = await storage.getExternalDocuments(req.orgId!, source, status);
    res.json(docs);
  } catch (error) {
    console.error("Error fetching external documents:", error);
    res.status(500).json({ error: "Failed to fetch external documents" });
  }
});

// GET /api/external-documents/:id
router.get("/external-documents/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    const doc = await storage.getExternalDocument(id);
    if (!doc || doc.orgId !== req.orgId!) {
      return res.status(404).json({ error: "External document not found" });
    }
    res.json(doc);
  } catch (error) {
    console.error("Error fetching external document:", error);
    res.status(500).json({ error: "Failed to fetch external document" });
  }
});

// POST /api/external-documents
router.post("/external-documents", requireAuth, async (req, res) => {
  try {
    const data = insertExternalDocumentSchema.parse({
      ...req.body,
      orgId: req.orgId!,
      createdBy: req.body.createdBy || req.auth!.user.id,
    });
    const doc = await storage.createExternalDocument(data);
    res.status(201).json(doc);
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error: " + fromError(error).message });
    }
    console.error("Error creating external document:", error);
    res.status(500).json({ error: "Failed to create external document" });
  }
});

// PATCH /api/external-documents/:id
router.patch("/external-documents/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    const existing = await storage.getExternalDocument(id);
    if (!existing || existing.orgId !== req.orgId!) {
      return res.status(404).json({ error: "External document not found" });
    }

    const updated = await storage.updateExternalDocument(id, {
      ...req.body,
      updatedAt: new Date(),
    });
    res.json(updated);
  } catch (error) {
    console.error("Error updating external document:", error);
    res.status(500).json({ error: "Failed to update external document" });
  }
});

// DELETE /api/external-documents/:id
router.delete("/external-documents/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    const existing = await storage.getExternalDocument(id);
    if (!existing || existing.orgId !== req.orgId!) {
      return res.status(404).json({ error: "External document not found" });
    }

    await storage.deleteExternalDocument(id);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting external document:", error);
    res.status(500).json({ error: "Failed to delete external document" });
  }
});

// POST /api/external-documents/:id/check-update
router.post("/external-documents/:id/check-update", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    const existing = await storage.getExternalDocument(id);
    if (!existing || existing.orgId !== req.orgId!) {
      return res.status(404).json({ error: "External document not found" });
    }

    const { updateAvailable, updateNotes } = req.body;

    const updated = await storage.updateExternalDocument(id, {
      lastCheckedAt: new Date(),
      updateAvailable: updateAvailable ? 1 : 0,
      updateNotes: updateNotes || null,
      updatedAt: new Date(),
    } as any);

    res.json(updated);
  } catch (error) {
    console.error("Error checking external document update:", error);
    res.status(500).json({ error: "Failed to check for updates" });
  }
});

// --- DOCUMENT LINKS ---

// GET /api/links/broken (must be BEFORE /api/links/:id patterns)
router.get("/links/broken", requireAuth, async (req, res) => {
  try {
    const brokenLinks = await storage.getBrokenLinks(req.orgId!);
    res.json(brokenLinks);
  } catch (error) {
    console.error("Error fetching broken links:", error);
    res.status(500).json({ error: "Failed to fetch broken links" });
  }
});

// GET /api/documents/:documentId/links
router.get("/documents/:documentId/links", requireAuth, async (req, res) => {
  try {
    const { documentId } = req.params;
    const links = await storage.getDocumentLinksFrom(req.orgId!, documentId);
    res.json(links);
  } catch (error) {
    console.error("Error fetching document links:", error);
    res.status(500).json({ error: "Failed to fetch document links" });
  }
});

// GET /api/links/to/:targetType/:targetId
router.get("/links/to/:targetType/:targetId", requireAuth, async (req, res) => {
  try {
    const { targetType } = req.params;
    const targetId = parseInt(req.params.targetId);
    if (isNaN(targetId)) return res.status(400).json({ error: "Invalid target ID" });

    const links = await storage.getDocumentLinksTo(req.orgId!, targetType, targetId);
    res.json(links);
  } catch (error) {
    console.error("Error fetching links to target:", error);
    res.status(500).json({ error: "Failed to fetch links" });
  }
});

// POST /api/documents/:documentId/links
router.post("/documents/:documentId/links", requireAuth, async (req, res) => {
  try {
    const { documentId } = req.params;
    const user = req.auth!.user;

    const doc = await storage.getDocumentById(documentId, req.orgId!);
    if (!doc) {
      return res.status(404).json({ error: "Document not found" });
    }

    const data = insertDocumentLinkEnhancedSchema.parse({
      ...req.body,
      orgId: req.orgId!,
      sourceDocumentId: documentId,
      createdBy: req.body.createdBy || user.id,
      bidirectional: req.body.bidirectional ? 1 : 0,
    });

    const link = await storage.createDocumentLinkEnhanced(data);
    res.status(201).json(link);
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error: " + fromError(error).message });
    }
    console.error("Error creating document link:", error);
    res.status(500).json({ error: "Failed to create document link" });
  }
});

// DELETE /api/links/:id
router.delete("/links/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    const link = await storage.getDocumentLinkEnhanced(id);
    if (!link || link.orgId !== req.orgId!) {
      return res.status(404).json({ error: "Link not found" });
    }

    // Delete reverse link if bidirectional
    if (link.reverseLinkId) {
      await storage.deleteDocumentLinkEnhanced(link.reverseLinkId);
    }

    await storage.deleteDocumentLinkEnhanced(id);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting link:", error);
    res.status(500).json({ error: "Failed to delete link" });
  }
});

// POST /api/links/:id/verify
router.post("/links/:id/verify", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    const link = await storage.getDocumentLinkEnhanced(id);
    if (!link || link.orgId !== req.orgId!) {
      return res.status(404).json({ error: "Link not found" });
    }

    const verified = await storage.verifyDocumentLink(id, req.auth!.user.id);
    res.json(verified);
  } catch (error) {
    console.error("Error verifying link:", error);
    res.status(500).json({ error: "Failed to verify link" });
  }
});

// POST /api/links/:id/mark-broken
router.post("/links/:id/mark-broken", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    const link = await storage.getDocumentLinkEnhanced(id);
    if (!link || link.orgId !== req.orgId!) {
      return res.status(404).json({ error: "Link not found" });
    }

    const { reason } = req.body;
    const broken = await storage.markLinkBroken(id, reason || 'Marked as broken');
    res.json(broken);
  } catch (error) {
    console.error("Error marking link as broken:", error);
    res.status(500).json({ error: "Failed to mark link as broken" });
  }
});

export { router };
