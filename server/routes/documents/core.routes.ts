import { Router } from "express";
import { z } from "zod";
import { fromError } from "zod-validation-error";
import { createHash } from "crypto";
import { storage } from "../../storage";
import { documentControlService } from "../../services/document-control";
import { db } from "../../db";
import { eq, desc, and } from "drizzle-orm";
import {
  pfmea,
  pfmeaRow,
  controlPlan,
  controlPlanRow,
  auditLog,
  signature,
  document as documentTable,
  documentRevision,
  insertDocumentSchema,
  insertDocumentRevisionSchema,
  insertDocumentReviewSchema,
  insertDocumentLinkSchema,
} from "@shared/schema";
import { requireAuth, requireRole } from "../../middleware/auth";
import { getErrorMessage } from "../_helpers";

const router = Router();

// ==========================================
// Document Control Endpoints (DC Phase 1)
// ==========================================

// Transition document status
router.post('/documents/:type/:id/status', async (req, res) => {
  const { type, id } = req.params;
  const { newStatus, comment } = req.body;
  const userId = req.headers['x-user-id'] as string || 'system';

  if (!['pfmea', 'control_plan'].includes(type)) {
    return res.status(400).json({ error: 'Invalid document type' });
  }

  if (!newStatus) {
    return res.status(400).json({ error: 'newStatus is required' });
  }

  try {
    const result = await documentControlService.transitionStatus({
      documentType: type as 'pfmea' | 'control_plan',
      documentId: id,
      newStatus,
      userId,
      comment,
    });
    res.json(result);
  } catch (error: unknown) {
    res.status(400).json({ error: getErrorMessage(error) });
  }
});

// Submit for review (convenience endpoint)
router.post('/documents/:type/:id/submit-for-review', async (req, res) => {
  const { type, id } = req.params;
  const userId = req.headers['x-user-id'] as string || 'system';

  try {
    await documentControlService.assignDocNumber(type as any, id);

    const result = await documentControlService.transitionStatus({
      documentType: type as 'pfmea' | 'control_plan',
      documentId: id,
      newStatus: 'review',
      userId,
      comment: 'Submitted for review',
    });
    res.json(result);
  } catch (error: unknown) {
    res.status(400).json({ error: getErrorMessage(error) });
  }
});

// Approve and make effective (convenience endpoint)
router.post('/documents/:type/:id/approve', async (req, res) => {
  const { type, id } = req.params;
  const userId = req.headers['x-user-id'] as string || 'system';
  const { comment } = req.body;

  try {
    const result = await documentControlService.transitionStatus({
      documentType: type as 'pfmea' | 'control_plan',
      documentId: id,
      newStatus: 'effective',
      userId,
      comment: comment || 'Approved',
    });
    res.json(result);
  } catch (error: unknown) {
    res.status(400).json({ error: getErrorMessage(error) });
  }
});

// Create new revision
router.post('/documents/:type/:id/revise', async (req, res) => {
  const { type, id } = req.params;
  const { reason } = req.body;
  const userId = req.headers['x-user-id'] as string || 'system';

  if (!reason) {
    return res.status(400).json({ error: 'reason is required' });
  }

  try {
    const result = await documentControlService.createRevision({
      documentType: type as 'pfmea' | 'control_plan',
      documentId: id,
      reason,
      userId,
    });
    res.json(result);
  } catch (error: unknown) {
    res.status(400).json({ error: getErrorMessage(error) });
  }
});

// Get revision history
router.get('/documents/:type/:id/revisions', async (req, res) => {
  const { type, id } = req.params;

  try {
    const history = await documentControlService.getRevisionHistory(
      type as 'pfmea' | 'control_plan',
      id
    );
    res.json(history);
  } catch (error: unknown) {
    res.status(500).json({ error: getErrorMessage(error) });
  }
});

// Add signature
router.post('/documents/:type/:id/signatures', async (req, res) => {
  const { type, id } = req.params;
  const { role, signerName, signerEmail } = req.body;
  const signerUserId = req.headers['x-user-id'] as string || '00000000-0000-0000-0000-000000000000';

  if (!role) {
    return res.status(400).json({ error: 'role is required' });
  }

  try {
    const result = await documentControlService.addSignature({
      documentType: type as 'pfmea' | 'control_plan',
      documentId: id,
      orgId: req.orgId!,
      role,
      signerUserId,
      signerName: signerName || 'Unknown',
      signerEmail: signerEmail || '',
    });
    res.json(result);
  } catch (error: unknown) {
    res.status(400).json({ error: getErrorMessage(error) });
  }
});

// Get signatures
router.get('/documents/:type/:id/signatures', async (req, res) => {
  const { type, id } = req.params;

  try {
    const signatures = await documentControlService.getSignatures(
      type as 'pfmea' | 'control_plan',
      id
    );
    res.json(signatures);
  } catch (error: unknown) {
    res.status(500).json({ error: getErrorMessage(error) });
  }
});

// Verify signature
router.get('/signatures/:id/verify', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await documentControlService.verifySignature(id);
    res.json(result);
  } catch (error: unknown) {
    res.status(500).json({ error: getErrorMessage(error) });
  }
});

// Get audit log
router.get('/documents/:type/:id/audit-log', async (req, res) => {
  const { type, id } = req.params;
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;

  try {
    const log = await documentControlService.getAuditLog(
      type as 'pfmea' | 'control_plan',
      id,
      { limit, offset }
    );
    res.json(log);
  } catch (error: unknown) {
    res.status(500).json({ error: getErrorMessage(error) });
  }
});

// Assign document number
router.post('/documents/:type/:id/assign-doc-number', async (req, res) => {
  const { type, id } = req.params;

  try {
    const docNo = await documentControlService.assignDocNumber(
      type as 'pfmea' | 'control_plan',
      id
    );
    res.json({ docNo });
  } catch (error: unknown) {
    res.status(400).json({ error: getErrorMessage(error) });
  }
});

// Set owner
router.post('/documents/:type/:id/owner', async (req, res) => {
  const { type, id } = req.params;
  const { ownerUserId } = req.body;

  if (!ownerUserId) {
    return res.status(400).json({ error: 'ownerUserId is required' });
  }

  try {
    await documentControlService.setOwner(
      type as 'pfmea' | 'control_plan',
      id,
      ownerUserId,
      req.orgId!
    );
    res.json({ success: true });
  } catch (error: unknown) {
    res.status(400).json({ error: getErrorMessage(error) });
  }
});

// Add watcher
router.post('/documents/:type/:id/watchers', async (req, res) => {
  const { type, id } = req.params;
  const { watcherUserId } = req.body;

  if (!watcherUserId) {
    return res.status(400).json({ error: 'watcherUserId is required' });
  }

  try {
    await documentControlService.addWatcher(
      type as 'pfmea' | 'control_plan',
      id,
      watcherUserId
    );
    res.json({ success: true });
  } catch (error: unknown) {
    res.status(400).json({ error: getErrorMessage(error) });
  }
});

// Export document to PDF or Excel
router.get('/documents/:type/:id/export', async (req, res) => {
  const { type, id } = req.params;
  const format = (req.query.format as string) || 'pdf';
  const paperSize = (req.query.paperSize as string) || 'letter';
  const orientation = (req.query.orientation as string) || 'landscape';
  const includeSignatures = req.query.includeSignatures !== 'false';

  if (!['pdf', 'xlsx'].includes(format)) {
    return res.status(400).json({ error: 'Format must be pdf or xlsx' });
  }

  if (!['pfmea', 'control_plan'].includes(type)) {
    return res.status(400).json({ error: 'Type must be pfmea or control_plan' });
  }

  try {
    const { exportService } = await import('../../services/export-service');

    const result = await exportService.export({
      format: format as 'pdf' | 'xlsx',
      documentType: type as 'pfmea' | 'control_plan',
      documentId: id,
      orgId: req.orgId!,
      includeSignatures,
      paperSize: paperSize as 'letter' | 'legal' | 'a4',
      orientation: orientation as 'portrait' | 'landscape',
    });

    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.buffer);
  } catch (error: unknown) {
    console.error('Export error:', error);
    res.status(500).json({ error: getErrorMessage(error) });
  }
});

// ==========================================
// DOCUMENT CONTROL ENDPOINTS (DC Phase 2 CRUD)
// ==========================================

// --- Helper Functions ---

function getNextRevisionLetter(currentRev: string): string {
  if (!currentRev || currentRev === '-') return 'A';
  if (currentRev.length === 1) {
    if (currentRev === 'Z') return 'AA';
    return String.fromCharCode(currentRev.charCodeAt(0) + 1);
  }
  if (currentRev.length === 2) {
    const first = currentRev.charAt(0);
    const second = currentRev.charAt(1);
    if (second === 'Z') {
      if (first === 'Z') return 'AAA';
      return String.fromCharCode(first.charCodeAt(0) + 1) + 'A';
    }
    return first + String.fromCharCode(second.charCodeAt(0) + 1);
  }
  return currentRev + '-1';
}

function validateTransition(currentStatus: string, targetStatus: string): { valid: boolean; error?: string } {
  const validTransitions: Record<string, string[]> = {
    'draft': ['review'],
    'review': ['effective', 'draft'],
    'effective': ['obsolete'],
    'superseded': [],
    'obsolete': [],
  };
  const allowed = validTransitions[currentStatus] || [];
  if (!allowed.includes(targetStatus)) {
    return {
      valid: false,
      error: `Invalid transition from ${currentStatus} to ${targetStatus}. Allowed: ${allowed.join(', ') || 'none'}`,
    };
  }
  return { valid: true };
}

// --- 1. GET /api/documents/metrics (must be before :id route) ---

router.get("/documents/metrics", requireAuth, async (req, res) => {
  try {
    const metrics = await storage.getDocumentMetrics(req.orgId!);
    res.json(metrics);
  } catch (error) {
    console.error("Error fetching document metrics:", error);
    res.status(500).json({ error: "Failed to fetch document metrics" });
  }
});

// --- 2. GET /api/documents ---

router.get("/documents", async (req, res) => {
  try {
    const { type, status, category, search, limit: lim, offset: off } = req.query;
    const limit = parseInt(lim as string) || 100;
    const offset = parseInt(off as string) || 0;
    const result = await storage.getDocuments(req.orgId!, {
      type: type as string | undefined,
      status: status as string | undefined,
      category: category as string | undefined,
      search: search as string | undefined,
    }, { limit, offset });
    res.json(lim || off ? result : result.data);
  } catch (error) {
    console.error("Error fetching documents:", error);
    res.status(500).json({ error: "Failed to fetch documents" });
  }
});

// --- Full-text search (placed BEFORE :id route) ---
router.get("/documents/search", requireAuth, async (req, res) => {
  try {
    const q = req.query.q as string;
    if (!q || q.length < 2) {
      return res.status(400).json({ error: "Search query must be at least 2 characters" });
    }

    const { data: docs } = await storage.getDocuments(req.orgId!);
    const results: { documentId: string; docNumber: string; title: string; matchingFiles: { fileId: number; snippet: string }[] }[] = [];

    for (const doc of docs) {
      const files = await storage.getDocumentFiles(req.orgId!, doc.id);
      const matchingFiles = files
        .filter(f => f.extractedText && f.extractedText.toLowerCase().includes(q.toLowerCase()))
        .map(f => {
          const idx = f.extractedText!.toLowerCase().indexOf(q.toLowerCase());
          const start = Math.max(0, idx - 50);
          const end = Math.min(f.extractedText!.length, idx + q.length + 50);
          return { fileId: f.id, snippet: '...' + f.extractedText!.substring(start, end) + '...' };
        });

      if (matchingFiles.length > 0) {
        results.push({ documentId: doc.id, docNumber: doc.docNumber, title: doc.title, matchingFiles });
      }
    }

    res.json(results);
  } catch (error) {
    console.error("Error searching documents:", error);
    res.status(500).json({ error: "Failed to search documents" });
  }
});

// --- 3. GET /api/documents/:id ---

router.get("/documents/:id", async (req, res) => {
  try {
    const doc = await storage.getDocumentById(req.params.id, req.orgId!);
    if (!doc) {
      return res.status(404).json({ error: "Document not found" });
    }
    res.json(doc);
  } catch (error) {
    console.error("Error fetching document:", error);
    res.status(500).json({ error: "Failed to fetch document" });
  }
});

// --- 4. POST /api/documents ---

router.post("/documents", async (req, res) => {
  try {
    const validatedData = insertDocumentSchema.parse({ ...req.body, orgId: req.orgId! });
    const newDocument = await storage.createDocument(validatedData);

    // Create initial revision
    await storage.createRevision({
      documentId: newDocument.id,
      orgId: req.orgId!,
      rev: newDocument.currentRev,
      changeDescription: "Initial release",
      status: "draft",
      author: newDocument.owner,
    });

    res.status(201).json(newDocument);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = fromError(error);
      return res.status(400).json({ error: validationError.toString() });
    }
    console.error("Error creating document:", error);
    res.status(500).json({ error: "Failed to create document" });
  }
});

// --- 5. PATCH /api/documents/:id ---

router.patch("/documents/:id", async (req, res) => {
  try {
    const updated = await storage.updateDocument(req.params.id, req.orgId!, req.body);
    if (!updated) {
      return res.status(404).json({ error: "Document not found" });
    }
    res.json(updated);
  } catch (error) {
    console.error("Error updating document:", error);
    res.status(500).json({ error: "Failed to update document" });
  }
});

// --- 6. DELETE /api/documents/:id ---

router.delete("/documents/:id", async (req, res) => {
  try {
    const success = await storage.deleteDocument(req.params.id, req.orgId!);
    if (!success) {
      return res.status(404).json({ error: "Document not found" });
    }
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting document:", error);
    res.status(500).json({ error: "Failed to delete document" });
  }
});

// --- 7. GET /api/documents/:id/revisions ---

router.get("/documents/:id/revisions", async (req, res) => {
  try {
    const doc = await storage.getDocumentById(req.params.id, req.orgId!);
    if (!doc) {
      return res.status(404).json({ error: "Document not found" });
    }
    const revisions = await storage.getDocumentRevisions(req.params.id, req.orgId!);
    res.json(revisions);
  } catch (error) {
    console.error("Error fetching revisions:", error);
    res.status(500).json({ error: "Failed to fetch revisions" });
  }
});

// --- 8. POST /api/documents/:id/revisions ---

router.post("/documents/:id/revisions", async (req, res) => {
  try {
    const doc = await storage.getDocumentById(req.params.id, req.orgId!);
    if (!doc) {
      return res.status(404).json({ error: "Document not found" });
    }

    if (doc.status !== 'effective') {
      return res.status(400).json({
        error: `Cannot create new revision when document status is ${doc.status}. Must be 'effective'.`,
      });
    }

    const nextRev = getNextRevisionLetter(doc.currentRev);

    const validatedData = insertDocumentRevisionSchema.parse({
      documentId: req.params.id,
      orgId: req.orgId!,
      rev: nextRev,
      changeDescription: req.body.changeDescription || 'New revision',
      status: 'draft',
      author: req.body.author || 'Unknown',
    });

    const newRevision = await storage.createRevision(validatedData);

    await storage.updateDocument(req.params.id, req.orgId!, {
      currentRev: nextRev,
      status: 'draft' as any,
    });

    res.status(201).json(newRevision);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = fromError(error);
      return res.status(400).json({ error: validationError.toString() });
    }
    console.error("Error creating revision:", error);
    res.status(500).json({ error: "Failed to create revision" });
  }
});

// --- 9. GET /api/document-revisions/:id ---

router.get("/document-revisions/:id", async (req, res) => {
  try {
    const revision = await storage.getRevisionById(req.params.id, req.orgId!);
    if (!revision) {
      return res.status(404).json({ error: "Revision not found" });
    }
    res.json(revision);
  } catch (error) {
    console.error("Error fetching revision:", error);
    res.status(500).json({ error: "Failed to fetch revision" });
  }
});

// --- 10. PATCH /api/document-revisions/:id ---

router.patch("/document-revisions/:id", async (req, res) => {
  try {
    const revision = await storage.getRevisionById(req.params.id, req.orgId!);
    if (!revision) {
      return res.status(404).json({ error: "Revision not found" });
    }

    if (revision.status !== 'draft') {
      return res.status(400).json({ error: "Can only edit revisions in draft status" });
    }

    const updated = await storage.updateRevision(req.params.id, req.orgId!, req.body);
    res.json(updated);
  } catch (error) {
    console.error("Error updating revision:", error);
    res.status(500).json({ error: "Failed to update revision" });
  }
});

// --- 11. POST /api/documents/:id/submit-review ---

router.post("/documents/:id/submit-review", async (req, res) => {
  try {
    const doc = await storage.getDocumentById(req.params.id, req.orgId!);
    if (!doc) {
      return res.status(404).json({ error: "Document not found" });
    }

    const transition = validateTransition(doc.status, 'review');
    if (!transition.valid) {
      return res.status(400).json({ error: transition.error });
    }

    if (!doc.owner) {
      return res.status(400).json({ error: "Document must have an owner before submitting for review" });
    }

    // Update current revision to review status
    const revisions = await storage.getDocumentRevisions(req.params.id, req.orgId!);
    const currentRevision = revisions.find(r => r.rev === doc.currentRev && r.status === 'draft');
    if (currentRevision) {
      await storage.updateRevision(currentRevision.id, req.orgId!, { status: 'review' as any });
    }

    const updated = await storage.updateDocument(req.params.id, req.orgId!, { status: 'review' as any });
    res.json(updated);
  } catch (error) {
    console.error("Error submitting for review:", error);
    res.status(500).json({ error: "Failed to submit for review" });
  }
});

// --- 12. POST /api/documents/:id/approve ---

router.post("/documents/:id/approve", async (req, res) => {
  try {
    const { approverName } = req.body;
    if (!approverName) {
      return res.status(400).json({ error: "approverName is required" });
    }

    const doc = await storage.getDocumentById(req.params.id, req.orgId!);
    if (!doc) {
      return res.status(404).json({ error: "Document not found" });
    }

    const transition = validateTransition(doc.status, 'effective');
    if (!transition.valid) {
      return res.status(400).json({ error: transition.error });
    }

    const now = new Date();
    const reviewDueDate = new Date(now);
    reviewDueDate.setDate(reviewDueDate.getDate() + (doc.reviewCycleDays || 365));

    const revisions = await storage.getDocumentRevisions(req.params.id, req.orgId!);
    const currentRevision = revisions.find(r => r.rev === doc.currentRev && r.status === 'review');
    const previousEffective = revisions.find(r => r.status === 'effective');

    if (previousEffective) {
      await storage.updateRevision(previousEffective.id, req.orgId!, {
        status: 'superseded' as any,
        supersededDate: now,
      });
    }

    if (currentRevision) {
      await storage.updateRevision(currentRevision.id, req.orgId!, {
        status: 'effective' as any,
        approvedBy: approverName,
        approvedAt: now,
        effectiveDate: now,
      });
    }

    const updated = await storage.updateDocument(req.params.id, req.orgId!, {
      status: 'effective' as any,
      effectiveDate: now,
      reviewDueDate,
    });

    res.json(updated);
  } catch (error) {
    console.error("Error approving document:", error);
    res.status(500).json({ error: "Failed to approve document" });
  }
});

// --- 13. POST /api/documents/:id/reject ---

router.post("/documents/:id/reject", async (req, res) => {
  try {
    const { comments } = req.body;
    if (!comments) {
      return res.status(400).json({ error: "comments are required when rejecting" });
    }

    const doc = await storage.getDocumentById(req.params.id, req.orgId!);
    if (!doc) {
      return res.status(404).json({ error: "Document not found" });
    }

    const transition = validateTransition(doc.status, 'draft');
    if (!transition.valid) {
      return res.status(400).json({ error: transition.error });
    }

    const revisions = await storage.getDocumentRevisions(req.params.id, req.orgId!);
    const currentRevision = revisions.find(r => r.rev === doc.currentRev && r.status === 'review');

    if (currentRevision) {
      await storage.updateRevision(currentRevision.id, req.orgId!, {
        status: 'draft' as any,
        changeDescription: currentRevision.changeDescription + ` [REJECTED: ${comments}]`,
      });
    }

    const updated = await storage.updateDocument(req.params.id, req.orgId!, { status: 'draft' as any });
    res.json({ ...updated, rejectionComments: comments });
  } catch (error) {
    console.error("Error rejecting document:", error);
    res.status(500).json({ error: "Failed to reject document" });
  }
});

// --- 14. POST /api/documents/:id/obsolete ---

router.post("/documents/:id/obsolete", async (req, res) => {
  try {
    const doc = await storage.getDocumentById(req.params.id, req.orgId!);
    if (!doc) {
      return res.status(404).json({ error: "Document not found" });
    }

    const transition = validateTransition(doc.status, 'obsolete');
    if (!transition.valid) {
      return res.status(400).json({ error: transition.error });
    }

    const revisions = await storage.getDocumentRevisions(req.params.id, req.orgId!);
    const currentRevision = revisions.find(r => r.rev === doc.currentRev && r.status === 'effective');
    if (currentRevision) {
      await storage.updateRevision(currentRevision.id, req.orgId!, { status: 'obsolete' as any });
    }

    const updated = await storage.updateDocument(req.params.id, req.orgId!, { status: 'obsolete' as any });
    res.json(updated);
  } catch (error) {
    console.error("Error marking document obsolete:", error);
    res.status(500).json({ error: "Failed to mark document obsolete" });
  }
});

// --- 15. GET /api/documents/:id/distributions ---

router.get("/documents/:id/distributions", async (req, res) => {
  try {
    const doc = await storage.getDocumentById(req.params.id, req.orgId!);
    if (!doc) {
      return res.status(404).json({ error: "Document not found" });
    }
    const distributions = await storage.getDistributions(req.params.id, req.orgId!);
    res.json(distributions);
  } catch (error) {
    console.error("Error fetching distributions:", error);
    res.status(500).json({ error: "Failed to fetch distributions" });
  }
});

// --- 17. POST /api/document-distributions/:id/acknowledge ---

router.post("/document-distributions/:id/acknowledge", async (req, res) => {
  try {
    const updated = await storage.acknowledgeDistribution(req.params.id, req.orgId!);
    if (!updated) {
      return res.status(404).json({ error: "Distribution record not found" });
    }
    res.json(updated);
  } catch (error) {
    console.error("Error acknowledging distribution:", error);
    res.status(500).json({ error: "Failed to acknowledge distribution" });
  }
});

// --- 18. GET /api/document-reviews (all pending) ---

router.get("/document-reviews", async (req, res) => {
  try {
    const reviews = await storage.getPendingReviews(req.orgId!);
    res.json(reviews);
  } catch (error) {
    console.error("Error fetching pending reviews:", error);
    res.status(500).json({ error: "Failed to fetch pending reviews" });
  }
});

// --- 19. GET /api/document-reviews/overdue ---

router.get("/document-reviews/overdue", async (req, res) => {
  try {
    const reviews = await storage.getOverdueReviews(req.orgId!);
    res.json(reviews);
  } catch (error) {
    console.error("Error fetching overdue reviews:", error);
    res.status(500).json({ error: "Failed to fetch overdue reviews" });
  }
});

// --- 20. GET /api/documents/:id/reviews ---

router.get("/documents/:id/reviews", async (req, res) => {
  try {
    const doc = await storage.getDocumentById(req.params.id, req.orgId!);
    if (!doc) {
      return res.status(404).json({ error: "Document not found" });
    }
    const reviews = await storage.getReviews(req.params.id, req.orgId!);
    res.json(reviews);
  } catch (error) {
    console.error("Error fetching reviews:", error);
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
});

// --- 21. POST /api/documents/:id/reviews ---

router.post("/documents/:id/reviews", async (req, res) => {
  try {
    const doc = await storage.getDocumentById(req.params.id, req.orgId!);
    if (!doc) {
      return res.status(404).json({ error: "Document not found" });
    }

    const validatedData = insertDocumentReviewSchema.parse({
      ...req.body,
      documentId: req.params.id,
      orgId: req.orgId!,
      status: 'pending',
    });

    const newReview = await storage.createReview(validatedData);
    res.status(201).json(newReview);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = fromError(error);
      return res.status(400).json({ error: validationError.toString() });
    }
    console.error("Error creating review:", error);
    res.status(500).json({ error: "Failed to create review" });
  }
});

// --- 22. PATCH /api/document-reviews/:id ---

router.patch("/document-reviews/:id", async (req, res) => {
  try {
    const updated = await storage.updateReview(req.params.id, req.orgId!, {
      ...req.body,
      reviewedAt: req.body.status && req.body.status !== 'pending' ? new Date() : undefined,
    });
    if (!updated) {
      return res.status(404).json({ error: "Review not found" });
    }
    res.json(updated);
  } catch (error) {
    console.error("Error updating review:", error);
    res.status(500).json({ error: "Failed to update review" });
  }
});

// --- 24. POST /api/document-links ---

router.post("/document-links", requireAuth, async (req, res) => {
  try {
    const validatedData = insertDocumentLinkSchema.parse({ ...req.body, orgId: req.orgId! });
    const newLink = await storage.createDocumentLink(validatedData);
    res.status(201).json(newLink);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationError = fromError(error);
      return res.status(400).json({ error: validationError.toString() });
    }
    console.error("Error creating document link:", error);
    res.status(500).json({ error: "Failed to create document link" });
  }
});

// --- 25. DELETE /api/document-links/:id ---

router.delete("/document-links/:id", requireAuth, async (req, res) => {
  try {
    const success = await storage.deleteDocumentLink(req.params.id, req.orgId!);
    if (!success) {
      return res.status(404).json({ error: "Document link not found" });
    }
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting document link:", error);
    res.status(500).json({ error: "Failed to delete document link" });
  }
});

export { router };
