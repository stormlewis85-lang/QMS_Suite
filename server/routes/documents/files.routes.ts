import { Router } from "express";
import { z } from "zod";
import { fromError } from "zod-validation-error";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import { storage } from "../../storage";
import { db } from "../../db";
import {
  insertDocumentTemplateSchema,
  insertDocumentCheckoutSchema,
} from "@shared/schema";
import { requireAuth, requireRole } from "../../middleware/auth";
import { documentUpload } from "../_config";
import {
  computeFileChecksum,
  sanitizeFileName,
  generateDocNumber,
  resolveWorkflowAssignee,
} from "../_helpers";

const router = Router();

// ============================================
// DOCUMENT CONTROL PHASE 2: File Management, Templates, Checkout, Workflows
// ============================================

// --- FILE MANAGEMENT ---

// GET /api/documents/:documentId/files - List files for a document
router.get("/documents/:documentId/files", requireAuth, async (req, res) => {
  try {
    const files = await storage.getDocumentFiles(req.orgId!, req.params.documentId);
    res.json(files);
  } catch (error) {
    console.error("Error listing document files:", error);
    res.status(500).json({ error: "Failed to list document files" });
  }
});

// POST /api/documents/:documentId/files - Upload file to document
router.post("/documents/:documentId/files", requireAuth, documentUpload.single('file'), async (req, res) => {
  try {
    const { documentId } = req.params;
    const user = req.auth!.user;

    // Verify document exists and belongs to org
    const doc = await storage.getDocumentById(documentId, req.orgId!);
    if (!doc) {
      return res.status(404).json({ error: "Document not found" });
    }

    // Check document is editable (draft or checked out to current user)
    if (doc.status !== 'draft') {
      const activeCheckout = await storage.getActiveCheckout(documentId);
      if (!activeCheckout || activeCheckout.checkedOutBy !== user.id) {
        return res.status(400).json({ error: "Document is not in an editable state. Must be draft or checked out to you." });
      }
    }

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const buffer = req.file.buffer;
    const checksum = computeFileChecksum(buffer);

    // Check for duplicate checksum
    const existingFiles = await storage.getDocumentFiles(req.orgId!, documentId);
    const duplicate = existingFiles.find(f => f.checksumSha256 === checksum);
    if (duplicate) {
      return res.status(409).json({ error: "Duplicate file. A file with the same content already exists.", existingFileId: duplicate.id });
    }

    // Store file on disk
    const fileUuid = randomUUID();
    const sanitized = sanitizeFileName(req.file.originalname);
    const uploadDir = path.join(process.cwd(), 'uploads', 'documents', documentId, fileUuid);
    fs.mkdirSync(uploadDir, { recursive: true });
    const filePath = path.join(uploadDir, sanitized);
    fs.writeFileSync(filePath, buffer);

    // Determine file type
    const ext = path.extname(req.file.originalname).toLowerCase().replace('.', '');

    // Create database record
    const fileRecord = await storage.createDocumentFile({
      orgId: req.orgId!,
      documentId,
      fileName: sanitized,
      originalName: req.file.originalname,
      fileType: ext,
      mimeType: req.file.mimetype,
      fileSize: buffer.length,
      storageProvider: 'local',
      storagePath: filePath,
      checksumSha256: checksum,
      virusScanStatus: 'pending',
      uploadedBy: user.id,
    });

    // Log access
    await storage.createDocumentAccessLog({
      orgId: req.orgId!,
      documentId,
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`,
      userRole: user.role,
      action: 'upload',
      actionDetails: JSON.stringify({ fileName: req.file.originalname, fileSize: buffer.length, checksum }),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.status(201).json(fileRecord);
  } catch (error) {
    console.error("Error uploading file:", error);
    res.status(500).json({ error: "Failed to upload file" });
  }
});

// GET /api/document-files/:id - Get file metadata
router.get("/document-files/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid file ID" });

    const file = await storage.getDocumentFile(id);
    if (!file || file.orgId !== req.orgId!) {
      return res.status(404).json({ error: "File not found" });
    }
    res.json(file);
  } catch (error) {
    console.error("Error getting file:", error);
    res.status(500).json({ error: "Failed to get file" });
  }
});

// GET /api/document-files/:id/download - Download original file
router.get("/document-files/:id/download", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid file ID" });

    const file = await storage.getDocumentFile(id);
    if (!file || file.orgId !== req.orgId!) {
      return res.status(404).json({ error: "File not found" });
    }

    if (!fs.existsSync(file.storagePath)) {
      return res.status(404).json({ error: "File not found on disk" });
    }

    const user = req.auth!.user;

    // Log access
    await storage.createDocumentAccessLog({
      orgId: req.orgId!,
      documentId: file.documentId!,
      fileId: file.id,
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`,
      userRole: user.role,
      action: 'download',
      actionDetails: JSON.stringify({ watermarked: false, fileSize: file.fileSize }),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);
    const fileStream = fs.createReadStream(file.storagePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error("Error downloading file:", error);
    res.status(500).json({ error: "Failed to download file" });
  }
});

// GET /api/document-files/:id/download-watermarked - Download with watermark
router.get("/document-files/:id/download-watermarked", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid file ID" });

    const file = await storage.getDocumentFile(id);
    if (!file || file.orgId !== req.orgId!) {
      return res.status(404).json({ error: "File not found" });
    }

    if (!fs.existsSync(file.storagePath)) {
      return res.status(404).json({ error: "File not found on disk" });
    }

    const user = req.auth!.user;
    const doc = file.documentId ? await storage.getDocumentById(file.documentId, req.orgId!) : null;
    const now = new Date();
    const watermarkText = `CONTROLLED COPY\nDownloaded by: ${user.firstName} ${user.lastName}\nDate: ${now.toISOString().substring(0, 16).replace('T', ' ')}\nDoc: ${doc?.docNumber || 'N/A'} Rev ${doc?.currentRev || 'N/A'}`;

    // Log access
    await storage.createDocumentAccessLog({
      orgId: req.orgId!,
      documentId: file.documentId!,
      fileId: file.id,
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`,
      userRole: user.role,
      action: 'download',
      actionDetails: JSON.stringify({ watermarked: true, fileSize: file.fileSize }),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    // For non-PDF files, return original with warning header
    if (file.fileType !== 'pdf') {
      res.setHeader('X-Watermark-Warning', 'Watermarking only supported for PDF files. Original file returned.');
      res.setHeader('Content-Type', file.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);
      const fileStream = fs.createReadStream(file.storagePath);
      return fileStream.pipe(res);
    }

    // For PDF files, attempt watermarking with pdf-lib
    try {
      const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');
      const existingPdfBytes = fs.readFileSync(file.storagePath);
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const pages = pdfDoc.getPages();

      for (const page of pages) {
        const { width, height } = page.getSize();
        const lines = watermarkText.split('\n');
        lines.forEach((line, i) => {
          page.drawText(line, {
            x: 50,
            y: height - 30 - (i * 14),
            size: 9,
            font: helvetica,
            color: rgb(0.7, 0.7, 0.7),
            opacity: 0.5,
          });
        });
      }

      const pdfBytes = await pdfDoc.save();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="watermarked_${file.originalName}"`);
      res.send(Buffer.from(pdfBytes));
    } catch {
      // If pdf-lib fails, return original with warning
      res.setHeader('X-Watermark-Warning', 'PDF watermarking failed. Original file returned.');
      res.setHeader('Content-Type', file.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);
      const fileStream = fs.createReadStream(file.storagePath);
      fileStream.pipe(res);
    }
  } catch (error) {
    console.error("Error downloading watermarked file:", error);
    res.status(500).json({ error: "Failed to download watermarked file" });
  }
});

// GET /api/document-files/:id/preview - Get preview
router.get("/document-files/:id/preview", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid file ID" });

    const file = await storage.getDocumentFile(id);
    if (!file || file.orgId !== req.orgId!) {
      return res.status(404).json({ error: "File not found" });
    }

    if (file.thumbnailPath && fs.existsSync(file.thumbnailPath)) {
      res.setHeader('Content-Type', 'image/png');
      const fileStream = fs.createReadStream(file.thumbnailPath);
      return fileStream.pipe(res);
    }

    // No preview available - return file info as JSON fallback
    res.status(404).json({ error: "Preview not generated for this file" });
  } catch (error) {
    console.error("Error getting file preview:", error);
    res.status(500).json({ error: "Failed to get file preview" });
  }
});

// DELETE /api/document-files/:id - Delete file
router.delete("/document-files/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid file ID" });

    const file = await storage.getDocumentFile(id);
    if (!file || file.orgId !== req.orgId!) {
      return res.status(404).json({ error: "File not found" });
    }

    // Check document is editable
    if (file.documentId) {
      const doc = await storage.getDocumentById(file.documentId, req.orgId!);
      if (doc && doc.status !== 'draft') {
        const activeCheckout = await storage.getActiveCheckout(file.documentId);
        if (!activeCheckout || activeCheckout.checkedOutBy !== req.auth!.user.id) {
          return res.status(400).json({ error: "Document is not in an editable state" });
        }
      }
    }

    // Delete from disk
    try {
      if (fs.existsSync(file.storagePath)) {
        fs.unlinkSync(file.storagePath);
        try { fs.rmdirSync(path.dirname(file.storagePath)); } catch { /* ignore non-empty dir */ }
      }
    } catch { /* ignore disk errors - still delete DB record */ }

    // Log access before deleting record (omit fileId to avoid FK constraint blocking deletion)
    const user = req.auth!.user;
    if (file.documentId) {
      await storage.createDocumentAccessLog({
        orgId: req.orgId!,
        documentId: file.documentId,
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        userRole: user.role,
        action: 'delete',
        actionDetails: JSON.stringify({ fileId: file.id, fileName: file.originalName }),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
    }

    // Delete record
    await storage.deleteDocumentFile(id);

    res.status(204).send();
  } catch (error) {
    console.error("Error deleting file:", error);
    res.status(500).json({ error: "Failed to delete file" });
  }
});

// --- DOCUMENT TEMPLATES ---

// GET /api/document-templates - List templates
router.get("/document-templates", requireAuth, async (req, res) => {
  try {
    const { status, docType } = req.query;
    let templates;
    if (docType) {
      templates = await storage.getDocumentTemplatesByType(req.orgId!, docType as string);
      if (status) templates = templates.filter(t => t.status === status);
    } else {
      templates = await storage.getDocumentTemplates(req.orgId!, status as string | undefined);
    }
    res.json(templates);
  } catch (error) {
    console.error("Error listing templates:", error);
    res.status(500).json({ error: "Failed to list document templates" });
  }
});

// GET /api/document-templates/:id - Get template by ID
router.get("/document-templates/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid template ID" });

    const template = await storage.getDocumentTemplate(id);
    if (!template || template.orgId !== req.orgId!) {
      return res.status(404).json({ error: "Template not found" });
    }

    // Include default workflow if set
    let defaultWorkflow = null;
    if (template.defaultWorkflowId) {
      defaultWorkflow = await storage.getApprovalWorkflowDefinition(template.defaultWorkflowId);
    }

    res.json({ ...template, defaultWorkflow });
  } catch (error) {
    console.error("Error getting template:", error);
    res.status(500).json({ error: "Failed to get document template" });
  }
});

// POST /api/document-templates - Create template
router.post("/document-templates", requireAuth, async (req, res) => {
  try {
    const data = insertDocumentTemplateSchema.parse({
      ...req.body,
      orgId: req.orgId!,
      createdBy: req.auth!.user.id,
    });

    // Check for duplicate code
    const existing = await storage.getDocumentTemplateByCode(data.code);
    if (existing && existing.orgId === req.orgId!) {
      return res.status(409).json({ error: "Template code already exists" });
    }

    const template = await storage.createDocumentTemplate(data);
    res.status(201).json(template);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: fromError(error).toString() });
    }
    console.error("Error creating template:", error);
    res.status(500).json({ error: "Failed to create document template" });
  }
});

// PATCH /api/document-templates/:id - Update template
router.patch("/document-templates/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid template ID" });

    const existing = await storage.getDocumentTemplate(id);
    if (!existing || existing.orgId !== req.orgId!) {
      return res.status(404).json({ error: "Template not found" });
    }

    const updated = await storage.updateDocumentTemplate(id, req.body);
    res.json(updated);
  } catch (error) {
    console.error("Error updating template:", error);
    res.status(500).json({ error: "Failed to update document template" });
  }
});

// DELETE /api/document-templates/:id - Delete template
router.delete("/document-templates/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid template ID" });

    const existing = await storage.getDocumentTemplate(id);
    if (!existing || existing.orgId !== req.orgId!) {
      return res.status(404).json({ error: "Template not found" });
    }

    // Only delete if draft; for active, deprecate instead
    if (existing.status === 'draft') {
      await storage.deleteDocumentTemplate(id);
      return res.status(204).send();
    }

    if (existing.status === 'active') {
      const updated = await storage.updateDocumentTemplate(id, { status: 'deprecated' });
      return res.json({ message: "Active template has been deprecated", template: updated });
    }

    return res.status(400).json({ error: "Cannot delete template with status: " + existing.status });
  } catch (error) {
    console.error("Error deleting template:", error);
    res.status(500).json({ error: "Failed to delete document template" });
  }
});

// POST /api/document-templates/:id/activate - Activate a draft template
router.post("/document-templates/:id/activate", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid template ID" });

    const existing = await storage.getDocumentTemplate(id);
    if (!existing || existing.orgId !== req.orgId!) {
      return res.status(404).json({ error: "Template not found" });
    }

    if (existing.status !== 'draft') {
      return res.status(400).json({ error: `Cannot activate template with status '${existing.status}'. Only draft templates can be activated.` });
    }

    const updated = await storage.updateDocumentTemplate(id, { status: 'active', effectiveFrom: new Date() });
    res.json(updated);
  } catch (error) {
    console.error("Error activating template:", error);
    res.status(500).json({ error: "Failed to activate document template" });
  }
});

// POST /api/documents/from-template - Create document from template
router.post("/documents/from-template", requireAuth, async (req, res) => {
  try {
    const { templateId, title, linkedEntityType, linkedEntityId } = req.body;

    if (!templateId || !title) {
      return res.status(400).json({ error: "templateId and title are required" });
    }

    const template = await storage.getDocumentTemplate(parseInt(templateId));
    if (!template || template.orgId !== req.orgId!) {
      return res.status(404).json({ error: "Template not found" });
    }

    if (template.status !== 'active') {
      return res.status(400).json({ error: "Template is not active" });
    }

    const user = req.auth!.user;
    const now = new Date();

    // Process field mappings to auto-populate
    const fieldMappings = template.fieldMappings ? JSON.parse(template.fieldMappings) : [];
    const appliedFieldValues: Record<string, string> = {};

    // Generate doc number
    const existingDocsResult = await storage.getDocuments(req.orgId!);
    const seq = existingDocsResult.total + 1;
    const docNumber = generateDocNumber(
      `${template.docType === 'work_instruction' ? 'WI' : template.docType === 'procedure' ? 'SOP' : 'DOC'}-{department}-{seq:4}`,
      { department: template.department || 'GEN', seq, year: now.getFullYear() }
    );
    appliedFieldValues.doc_number = docNumber;
    appliedFieldValues.revision = 'A';

    // Create document
    const doc = await storage.createDocument({
      orgId: req.orgId!,
      docNumber,
      title,
      type: template.docType as any,
      category: template.category,
      department: template.department,
      currentRev: 'A',
      status: 'draft',
      owner: `${user.firstName} ${user.lastName}`,
      reviewCycleDays: template.defaultReviewCycleDays,
      description: `Created from template: ${template.name}`,
    });

    // Create first revision
    const revision = await storage.createRevision({
      orgId: req.orgId!,
      documentId: doc.id,
      rev: 'A',
      changeDescription: 'Initial draft created from template',
      status: 'draft',
      author: `${user.firstName} ${user.lastName}`,
    });

    res.status(201).json({ document: doc, revision, appliedFieldValues });
  } catch (error) {
    console.error("Error creating document from template:", error);
    res.status(500).json({ error: "Failed to create document from template" });
  }
});

// --- DOCUMENT CHECKOUT ---

// GET /api/documents/:documentId/checkout-status - Get checkout status
router.get("/documents/:documentId/checkout-status", requireAuth, async (req, res) => {
  try {
    const { documentId } = req.params;
    const activeCheckout = await storage.getActiveCheckout(documentId);

    if (activeCheckout) {
      res.json({
        isCheckedOut: true,
        checkout: {
          id: activeCheckout.id,
          checkedOutBy: activeCheckout.checkedOutBy,
          checkedOutAt: activeCheckout.checkedOutAt,
          expectedCheckin: activeCheckout.expectedCheckin,
          purpose: activeCheckout.purpose,
          status: activeCheckout.status,
        },
      });
    } else {
      res.json({ isCheckedOut: false, checkout: null });
    }
  } catch (error) {
    console.error("Error getting checkout status:", error);
    res.status(500).json({ error: "Failed to get checkout status" });
  }
});

// POST /api/documents/:documentId/checkout - Check out document
router.post("/documents/:documentId/checkout", requireAuth, async (req, res) => {
  try {
    const { documentId } = req.params;
    const user = req.auth!.user;

    const doc = await storage.getDocumentById(documentId, req.orgId!);
    if (!doc) {
      return res.status(404).json({ error: "Document not found" });
    }

    if (doc.status === 'obsolete') {
      return res.status(400).json({ error: "Cannot checkout an obsolete document" });
    }

    // Check if already checked out
    const existingCheckout = await storage.getActiveCheckout(documentId);
    if (existingCheckout) {
      if (existingCheckout.checkedOutBy === user.id) {
        return res.json(existingCheckout); // Already checked out by same user
      }
      return res.status(400).json({
        error: "Document is already checked out by another user",
        checkedOutBy: existingCheckout.checkedOutBy,
        checkedOutAt: existingCheckout.checkedOutAt,
      });
    }

    // Default expectedCheckin to 7 days from now
    const expectedCheckin = req.body.expectedCheckin
      ? new Date(req.body.expectedCheckin)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const checkout = await storage.createDocumentCheckout({
      orgId: req.orgId!,
      documentId,
      checkedOutBy: user.id,
      expectedCheckin,
      purpose: req.body.purpose || null,
      status: 'active',
    });

    // Log access
    await storage.createDocumentAccessLog({
      orgId: req.orgId!,
      documentId,
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`,
      userRole: user.role,
      action: 'checkout',
      actionDetails: JSON.stringify({ purpose: req.body.purpose }),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.status(201).json(checkout);
  } catch (error) {
    console.error("Error checking out document:", error);
    res.status(500).json({ error: "Failed to checkout document" });
  }
});

// POST /api/documents/:documentId/checkin - Check in document
router.post("/documents/:documentId/checkin", requireAuth, async (req, res) => {
  try {
    const { documentId } = req.params;
    const user = req.auth!.user;

    const activeCheckout = await storage.getActiveCheckout(documentId);
    if (!activeCheckout) {
      return res.status(400).json({ error: "Document is not checked out" });
    }

    if (activeCheckout.checkedOutBy !== user.id && user.role !== 'admin') {
      return res.status(403).json({ error: "Document is checked out to a different user" });
    }

    const updated = await storage.updateDocumentCheckout(activeCheckout.id, {
      status: 'checked_in',
      checkedInAt: new Date(),
      checkedInBy: user.id,
    } as any);

    // Log access
    await storage.createDocumentAccessLog({
      orgId: req.orgId!,
      documentId,
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`,
      userRole: user.role,
      action: 'checkin',
      actionDetails: JSON.stringify({ comments: req.body.comments }),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json(updated);
  } catch (error) {
    console.error("Error checking in document:", error);
    res.status(500).json({ error: "Failed to checkin document" });
  }
});

// POST /api/documents/:documentId/force-release - Admin: force release checkout
router.post("/documents/:documentId/force-release", requireAuth, requireRole('admin', 'quality_manager'), async (req, res) => {
  try {
    const { documentId } = req.params;
    const user = req.auth!.user;

    const activeCheckout = await storage.getActiveCheckout(documentId);
    if (!activeCheckout) {
      return res.status(400).json({ error: "Document is not checked out" });
    }

    if (!req.body.reason) {
      return res.status(400).json({ error: "Reason is required for force release" });
    }

    const updated = await storage.updateDocumentCheckout(activeCheckout.id, {
      status: 'force_released',
      forceReleasedBy: user.id,
      forceReleasedAt: new Date(),
      forceReleaseReason: req.body.reason,
    } as any);

    // Log access
    await storage.createDocumentAccessLog({
      orgId: req.orgId!,
      documentId,
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`,
      userRole: user.role,
      action: 'checkin',
      actionDetails: JSON.stringify({ forceRelease: true, reason: req.body.reason, originalCheckoutBy: activeCheckout.checkedOutBy }),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json(updated);
  } catch (error) {
    console.error("Error force releasing checkout:", error);
    res.status(500).json({ error: "Failed to force release checkout" });
  }
});

// GET /api/checkouts/my - Current user's active checkouts
router.get("/checkouts/my", requireAuth, async (req, res) => {
  try {
    const checkouts = await storage.getCheckoutsByUser(req.orgId!, req.auth!.user.id);
    res.json(checkouts);
  } catch (error) {
    console.error("Error getting my checkouts:", error);
    res.status(500).json({ error: "Failed to get checkouts" });
  }
});

// GET /api/checkouts/all - Admin: all active checkouts
router.get("/checkouts/all", requireAuth, async (req, res) => {
  try {
    const checkouts = await storage.getAllActiveCheckouts(req.orgId!);
    res.json(checkouts);
  } catch (error) {
    console.error("Error getting all checkouts:", error);
    res.status(500).json({ error: "Failed to get checkouts" });
  }
});

// --- APPROVAL WORKFLOW DEFINITIONS CRUD ---

// GET /api/approval-workflow-definitions
router.get("/approval-workflow-definitions", requireAuth, async (req, res) => {
  try {
    const status = req.query.status as string | undefined;
    const defs = await storage.getApprovalWorkflowDefinitions(req.orgId!, status);
    res.json(defs);
  } catch (error) {
    console.error("Error getting workflow definitions:", error);
    res.status(500).json({ error: "Failed to get workflow definitions" });
  }
});

// GET /api/approval-workflow-definitions/:id
router.get("/approval-workflow-definitions/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
    const def = await storage.getApprovalWorkflowDefinition(id);
    if (!def || def.orgId !== req.orgId) return res.status(404).json({ error: "Workflow definition not found" });
    res.json(def);
  } catch (error) {
    console.error("Error getting workflow definition:", error);
    res.status(500).json({ error: "Failed to get workflow definition" });
  }
});

// POST /api/approval-workflow-definitions
router.post("/approval-workflow-definitions", requireAuth, async (req, res) => {
  try {
    const data = { ...req.body, orgId: req.orgId };
    const def = await storage.createApprovalWorkflowDefinition(data);
    res.status(201).json(def);
  } catch (error) {
    console.error("Error creating workflow definition:", error);
    res.status(500).json({ error: "Failed to create workflow definition" });
  }
});

// PATCH /api/approval-workflow-definitions/:id
router.patch("/approval-workflow-definitions/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
    const existing = await storage.getApprovalWorkflowDefinition(id);
    if (!existing || existing.orgId !== req.orgId) return res.status(404).json({ error: "Workflow definition not found" });
    const updated = await storage.updateApprovalWorkflowDefinition(id, req.body);
    res.json(updated);
  } catch (error) {
    console.error("Error updating workflow definition:", error);
    res.status(500).json({ error: "Failed to update workflow definition" });
  }
});

// DELETE /api/approval-workflow-definitions/:id
router.delete("/approval-workflow-definitions/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });
    const existing = await storage.getApprovalWorkflowDefinition(id);
    if (!existing || existing.orgId !== req.orgId) return res.status(404).json({ error: "Workflow definition not found" });
    await storage.deleteApprovalWorkflowDefinition(id);
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting workflow definition:", error);
    res.status(500).json({ error: "Failed to delete workflow definition" });
  }
});

// --- APPROVAL WORKFLOWS ---

// POST /api/documents/:documentId/start-workflow - Start approval workflow
router.post("/documents/:documentId/start-workflow", requireAuth, async (req, res) => {
  try {
    const { documentId } = req.params;
    const user = req.auth!.user;

    const doc = await storage.getDocumentById(documentId, req.orgId!);
    if (!doc) {
      return res.status(404).json({ error: "Document not found" });
    }

    if (doc.status !== 'draft') {
      return res.status(400).json({ error: "Document must be in draft status to start a workflow" });
    }

    // Check for existing active workflow
    const existingInstances = await storage.getApprovalWorkflowInstances(req.orgId!, documentId);
    const activeInstance = existingInstances.find(i => i.status === 'active');
    if (activeInstance) {
      return res.status(400).json({ error: "An approval workflow is already active for this document" });
    }

    // Find workflow definition
    let workflowDef;
    if (req.body.workflowDefinitionId) {
      workflowDef = await storage.getApprovalWorkflowDefinition(parseInt(req.body.workflowDefinitionId));
    }
    if (!workflowDef) {
      // Try to find by document type
      workflowDef = await storage.getWorkflowDefinitionForDocType(req.orgId!, doc.type);
    }
    if (!workflowDef) {
      return res.status(404).json({ error: "No matching workflow definition found" });
    }

    // Get the latest revision
    const revisions = await storage.getDocumentRevisions(documentId, req.orgId!);
    const latestRevision = revisions[0];
    if (!latestRevision) {
      return res.status(400).json({ error: "Document has no revisions" });
    }

    // Create workflow instance
    const instance = await storage.createApprovalWorkflowInstance({
      orgId: req.orgId!,
      workflowDefinitionId: workflowDef.id,
      documentId,
      revisionId: latestRevision.id,
      status: 'active',
      currentStep: 1,
      initiatedBy: user.id,
    });

    // Parse workflow steps from definition
    const stepDefs = JSON.parse(workflowDef.steps);
    const firstStepDef = stepDefs[0];

    // Create first step
    const assignee = resolveWorkflowAssignee(firstStepDef, { initiatedBy: user.id });
    const firstStep = await storage.createApprovalWorkflowStep({
      workflowInstanceId: instance.id,
      stepNumber: 1,
      stepName: firstStepDef.name || 'Step 1',
      assignedTo: assignee,
      assignedRole: firstStepDef.requiredRole || null,
      assignedAt: new Date(),
      dueDate: firstStepDef.dueDays ? new Date(Date.now() + firstStepDef.dueDays * 24 * 60 * 60 * 1000) : null,
      status: 'pending',
      signatureRequired: firstStepDef.signatureRequired ? 1 : 0,
    });

    // Update document status to review
    await storage.updateDocument(documentId, req.orgId!, { status: 'review' } as any);

    // Log access
    await storage.createDocumentAccessLog({
      orgId: req.orgId!,
      documentId,
      revisionId: latestRevision.id,
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`,
      userRole: user.role,
      action: 'submit',
      actionDetails: JSON.stringify({ workflowInstanceId: instance.id, workflowName: workflowDef.name }),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    // Create all remaining steps (not just first) so they're returned
    const allSteps = [firstStep];
    for (let i = 1; i < stepDefs.length; i++) {
      const sDef = stepDefs[i];
      const step = await storage.createApprovalWorkflowStep({
        workflowInstanceId: instance.id,
        stepNumber: i + 1,
        stepName: sDef.name || `Step ${i + 1}`,
        assignedTo: null,
        assignedRole: sDef.requiredRole || null,
        assignedAt: null,
        dueDate: null,
        status: 'pending',
        signatureRequired: sDef.signatureRequired ? 1 : 0,
      });
      allSteps.push(step);
    }

    res.status(201).json({
      workflowInstance: instance,
      steps: allSteps,
      currentStep: firstStep,
      message: `Workflow started. Assigned to ${assignee || 'pending assignment'} for ${firstStepDef.name || 'review'}.`,
    });
  } catch (error) {
    console.error("Error starting workflow:", error);
    res.status(500).json({ error: "Failed to start approval workflow" });
  }
});

// GET /api/documents/:documentId/workflow - Get workflow status
router.get("/documents/:documentId/workflow", requireAuth, async (req, res) => {
  try {
    const { documentId } = req.params;

    const instances = await storage.getApprovalWorkflowInstances(req.orgId!, documentId);
    const activeInstance = instances.find(i => i.status === 'active');

    if (!activeInstance) {
      // Return history of completed workflows
      const history = instances.filter(i => i.status !== 'active');
      return res.json({
        hasActiveWorkflow: false,
        instance: null,
        steps: [],
        definition: null,
        history,
      });
    }

    // Get steps for active instance
    const steps = await storage.getApprovalWorkflowSteps(activeInstance.id);
    const definition = await storage.getApprovalWorkflowDefinition(activeInstance.workflowDefinitionId);

    res.json({
      hasActiveWorkflow: true,
      instance: activeInstance,
      steps: steps.map(s => ({
        stepNumber: s.stepNumber,
        stepName: s.stepName,
        status: s.status,
        assignedTo: s.assignedTo,
        assignedRole: s.assignedRole,
        actionTaken: s.actionTaken,
        actionBy: s.actionBy,
        actionAt: s.actionAt,
        dueDate: s.dueDate,
        comments: s.comments,
      })),
      definition: definition ? {
        name: definition.name,
        totalSteps: JSON.parse(definition.steps).length,
      } : null,
    });
  } catch (error) {
    console.error("Error getting workflow status:", error);
    res.status(500).json({ error: "Failed to get workflow status" });
  }
});

// POST /api/workflow-steps/:stepId/approve - Approve a workflow step
router.post("/workflow-steps/:stepId/approve", requireAuth, async (req, res) => {
  try {
    const stepId = parseInt(req.params.stepId);
    if (isNaN(stepId)) return res.status(400).json({ error: "Invalid step ID" });

    const step = await storage.getApprovalWorkflowStep(stepId);
    if (!step) {
      return res.status(404).json({ error: "Workflow step not found" });
    }

    if (step.status !== 'pending') {
      return res.status(400).json({ error: "Step is not in pending status" });
    }

    const user = req.auth!.user;

    // Update step
    const updatedStep = await storage.updateApprovalWorkflowStep(stepId, {
      status: 'approved',
      actionTaken: 'approved',
      actionBy: user.id,
      actionAt: new Date(),
      comments: req.body.comments || null,
    } as any);

    // Check if this was the last step - advance workflow
    const instance = await storage.getApprovalWorkflowInstance(step.workflowInstanceId);
    if (instance) {
      const definition = await storage.getApprovalWorkflowDefinition(instance.workflowDefinitionId);
      const stepDefs = definition ? JSON.parse(definition.steps) : [];
      const allSteps = await storage.getApprovalWorkflowSteps(instance.id);

      if (step.stepNumber < stepDefs.length) {
        // Create next step
        const nextStepDef = stepDefs[step.stepNumber]; // 0-indexed, stepNumber is 1-indexed
        const nextAssignee = resolveWorkflowAssignee(nextStepDef, { initiatedBy: instance.initiatedBy });

        await storage.createApprovalWorkflowStep({
          workflowInstanceId: instance.id,
          stepNumber: step.stepNumber + 1,
          stepName: nextStepDef.name || `Step ${step.stepNumber + 1}`,
          assignedTo: nextAssignee,
          assignedRole: nextStepDef.requiredRole || null,
          assignedAt: new Date(),
          dueDate: nextStepDef.dueDays ? new Date(Date.now() + nextStepDef.dueDays * 24 * 60 * 60 * 1000) : null,
          status: 'pending',
          signatureRequired: nextStepDef.signatureRequired ? 1 : 0,
        });

        await storage.updateApprovalWorkflowInstance(instance.id, { currentStep: step.stepNumber + 1 } as any);
      } else {
        // All steps complete - mark workflow as completed
        await storage.updateApprovalWorkflowInstance(instance.id, {
          status: 'completed',
          completedAt: new Date(),
        } as any);

        // Update document status to effective
        await storage.updateDocument(instance.documentId, req.orgId!, { status: 'effective', effectiveDate: new Date() } as any);
      }

      // Log access
      await storage.createDocumentAccessLog({
        orgId: req.orgId!,
        documentId: instance.documentId,
        revisionId: instance.revisionId,
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        userRole: user.role,
        action: 'approve',
        actionDetails: JSON.stringify({ stepId, stepNumber: step.stepNumber, stepName: step.stepName, comments: req.body.comments }),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
    }

    res.json(updatedStep);
  } catch (error) {
    console.error("Error approving workflow step:", error);
    res.status(500).json({ error: "Failed to approve workflow step" });
  }
});

// POST /api/workflow-steps/:stepId/reject - Reject a workflow step
router.post("/workflow-steps/:stepId/reject", requireAuth, async (req, res) => {
  try {
    const stepId = parseInt(req.params.stepId);
    if (isNaN(stepId)) return res.status(400).json({ error: "Invalid step ID" });

    const step = await storage.getApprovalWorkflowStep(stepId);
    if (!step) {
      return res.status(404).json({ error: "Workflow step not found" });
    }

    if (step.status !== 'pending') {
      return res.status(400).json({ error: "Step is not in pending status" });
    }

    if (!req.body.comments) {
      return res.status(400).json({ error: "Comments are required when rejecting" });
    }

    const user = req.auth!.user;

    const updatedStep = await storage.updateApprovalWorkflowStep(stepId, {
      status: 'rejected',
      actionTaken: 'rejected',
      actionBy: user.id,
      actionAt: new Date(),
      comments: req.body.comments,
    } as any);

    // Cancel the workflow instance and revert document to draft
    const instance = await storage.getApprovalWorkflowInstance(step.workflowInstanceId);
    if (instance) {
      await storage.updateApprovalWorkflowInstance(instance.id, {
        status: 'rejected',
        completedAt: new Date(),
      } as any);

      await storage.updateDocument(instance.documentId, req.orgId!, { status: 'draft' } as any);

      // Log access
      await storage.createDocumentAccessLog({
        orgId: req.orgId!,
        documentId: instance.documentId,
        revisionId: instance.revisionId,
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        userRole: user.role,
        action: 'reject',
        actionDetails: JSON.stringify({ stepId, stepNumber: step.stepNumber, comments: req.body.comments }),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
    }

    res.json(updatedStep);
  } catch (error) {
    console.error("Error rejecting workflow step:", error);
    res.status(500).json({ error: "Failed to reject workflow step" });
  }
});

// POST /api/workflow-steps/:stepId/delegate - Delegate a workflow step
router.post("/workflow-steps/:stepId/delegate", requireAuth, async (req, res) => {
  try {
    const stepId = parseInt(req.params.stepId);
    if (isNaN(stepId)) return res.status(400).json({ error: "Invalid step ID" });

    const step = await storage.getApprovalWorkflowStep(stepId);
    if (!step) {
      return res.status(404).json({ error: "Workflow step not found" });
    }

    if (step.status !== 'pending') {
      return res.status(400).json({ error: "Step is not in pending status" });
    }

    if (!req.body.delegateTo) {
      return res.status(400).json({ error: "delegateTo is required" });
    }

    const user = req.auth!.user;

    const updatedStep = await storage.updateApprovalWorkflowStep(stepId, {
      assignedTo: req.body.delegateTo,
      delegatedFrom: user.id,
      delegatedAt: new Date(),
      delegationReason: req.body.reason || null,
    } as any);

    // Log access
    const instance = await storage.getApprovalWorkflowInstance(step.workflowInstanceId);
    if (instance) {
      await storage.createDocumentAccessLog({
        orgId: req.orgId!,
        documentId: instance.documentId,
        revisionId: instance.revisionId,
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        userRole: user.role,
        action: 'delegate',
        actionDetails: JSON.stringify({ stepId, delegatedTo: req.body.delegateTo, reason: req.body.reason }),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
    }

    res.json(updatedStep);
  } catch (error) {
    console.error("Error delegating workflow step:", error);
    res.status(500).json({ error: "Failed to delegate workflow step" });
  }
});

export { router };
