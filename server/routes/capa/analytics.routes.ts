import { Router } from "express";
import { randomUUID } from "crypto";
import { z } from "zod";
import { fromError } from "zod-validation-error";
import { storage } from "../../storage";
import { db } from "../../db";
import { requireAuth, requireRole } from "../../middleware/auth";
import { getErrorMessage, parseToolData, updateToolData } from "../_helpers";
import {
  capaAuditLog,
  capaMetricSnapshot,
  capaAnalysisTool,
  insertCapaAuditLogSchema,
  insertCapaMetricSnapshotSchema,
  insertCapaAnalysisToolSchema,
} from "@shared/schema";
import { eq, desc, and, sql, count } from "drizzle-orm";

const router = Router();

// =============================================
// CAPA Audit Logs
// =============================================

router.get("/capas/:id/audit-log", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });
    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) return res.status(404).json({ error: "CAPA not found" });

    const limit = parseInt(req.query.limit as string) || undefined;
    const action = req.query.action as string | undefined;

    let logs;
    if (action) {
      logs = await storage.getCapaAuditLogsByAction(capaId, action);
    } else {
      logs = await storage.getCapaAuditLogs(capaId, limit);
    }
    res.json(logs);
  } catch (error) {
    console.error("Error fetching audit log:", error);
    res.status(500).json({ error: "Failed to fetch audit log" });
  }
});

router.get("/capa-audit-logs", requireAuth, async (req, res) => {
  try {
    const orgId = req.orgId!;
    const limit = parseInt(req.query.limit as string) || 100;
    const logs = await storage.getRecentCapaActivity(orgId, limit);
    res.json(logs);
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    res.status(500).json({ error: "Failed to fetch audit logs" });
  }
});

router.get("/capas/:id/audit-log/verify-chain", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });
    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) return res.status(404).json({ error: "CAPA not found" });

    const logs = await storage.getCapaAuditLogs(capaId);
    const sortedLogs = logs.sort((a, b) => a.id - b.id);

    let valid = true;
    for (let i = 1; i < sortedLogs.length; i++) {
      if (sortedLogs[i].previousLogHash !== sortedLogs[i - 1].logHash) {
        valid = false;
        break;
      }
    }

    res.json({ valid, totalEntries: sortedLogs.length, checkedAt: new Date().toISOString() });
  } catch (error) {
    console.error("Error verifying audit chain:", error);
    res.status(500).json({ error: "Failed to verify audit chain" });
  }
});

// =============================================
// CAPA/8D Module: Analytics Endpoints
// =============================================

router.get("/capa-analytics/summary", requireAuth, async (req, res) => {
  try {
    const orgId = req.orgId!;
    const metrics = await storage.getCapaMetrics(orgId);
    const capas = await storage.getCapas(orgId);
    const open = capas.filter(c => c.status !== 'closed' && !c.deletedAt);
    const closed = capas.filter(c => c.status === 'closed');
    const effective = closed.filter(c => c.effectivenessVerified);
    const recurred = closed.filter(c => c.recurrenceResult === 'recurred');
    const onTime = closed.filter(c => c.targetClosureDate && c.actualClosureDate && new Date(c.actualClosureDate) <= new Date(c.targetClosureDate));

    res.json({
      totalOpen: open.length,
      totalClosed: closed.length,
      avgCycleTimeDays: metrics.avgClosureTime,
      onTimeRate: closed.length ? onTime.length / closed.length : 0,
      effectivenessRate: closed.length ? effective.length / closed.length : 0,
      recurrenceRate: closed.length ? recurred.length / closed.length : 0,
    });
  } catch (error) {
    console.error("Error fetching analytics summary:", error);
    res.status(500).json({ error: "Failed to fetch analytics summary" });
  }
});

router.get("/capa-analytics/by-status", requireAuth, async (req, res) => {
  try {
    const metrics = await storage.getCapaMetrics(req.orgId!);
    res.json(metrics.byStatus);
  } catch (error) {
    console.error("Error fetching by-status analytics:", error);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

router.get("/capa-analytics/by-priority", requireAuth, async (req, res) => {
  try {
    const metrics = await storage.getCapaMetrics(req.orgId!);
    res.json(metrics.byPriority);
  } catch (error) {
    console.error("Error fetching by-priority analytics:", error);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

router.get("/capa-analytics/by-source", requireAuth, async (req, res) => {
  try {
    const capas = await storage.getCapas(req.orgId!);
    const bySource: Record<string, number> = {};
    for (const c of capas.filter(x => !x.deletedAt)) {
      bySource[c.sourceType] = (bySource[c.sourceType] || 0) + 1;
    }
    res.json(bySource);
  } catch (error) {
    console.error("Error fetching by-source analytics:", error);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

router.get("/capa-analytics/by-category", requireAuth, async (req, res) => {
  try {
    const capas = await storage.getCapas(req.orgId!);
    const byCategory: Record<string, number> = {};
    for (const c of capas.filter(x => !x.deletedAt)) {
      const cat = c.category || 'uncategorized';
      byCategory[cat] = (byCategory[cat] || 0) + 1;
    }
    res.json(byCategory);
  } catch (error) {
    console.error("Error fetching by-category analytics:", error);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

router.get("/capa-analytics/trends", requireAuth, async (req, res) => {
  try {
    const orgId = req.orgId!;
    const period = (req.query.period as string) || 'monthly';
    const limit = parseInt(req.query.months as string) || 12;
    const snapshots = await storage.getCapaSnapshotsByPeriod(orgId, period, limit);
    res.json(snapshots);
  } catch (error) {
    console.error("Error fetching trends:", error);
    res.status(500).json({ error: "Failed to fetch trends" });
  }
});

router.get("/capa-analytics/pareto", requireAuth, async (req, res) => {
  try {
    const capas = await storage.getCapas(req.orgId!);
    const rootCauses: Record<string, number> = {};
    for (const c of capas.filter(x => !x.deletedAt)) {
      const d4 = await storage.getCapaD4(c.id);
      if (d4?.rootCauseOccurrence) {
        rootCauses[d4.rootCauseOccurrence] = (rootCauses[d4.rootCauseOccurrence] || 0) + 1;
      }
    }
    const sorted = Object.entries(rootCauses).sort((a, b) => b[1] - a[1]);
    const total = sorted.reduce((sum, [, count]) => sum + count, 0);
    let cumulative = 0;
    const pareto = sorted.map(([cause, count]) => {
      cumulative += count;
      return { cause, count, percentage: total ? count / total : 0, cumulative: total ? cumulative / total : 0 };
    });
    res.json(pareto);
  } catch (error) {
    console.error("Error fetching pareto:", error);
    res.status(500).json({ error: "Failed to fetch pareto analysis" });
  }
});

router.get("/capa-analytics/aging", requireAuth, async (req, res) => {
  try {
    const capas = await storage.getCapas(req.orgId!);
    const now = new Date();
    const open = capas.filter(c => c.status !== 'closed' && !c.deletedAt);
    const buckets = { '0-30': 0, '31-60': 0, '61-90': 0, '91-180': 0, '180+': 0 };
    for (const c of open) {
      const age = Math.floor((now.getTime() - new Date(c.createdAt!).getTime()) / (1000 * 60 * 60 * 24));
      if (age <= 30) buckets['0-30']++;
      else if (age <= 60) buckets['31-60']++;
      else if (age <= 90) buckets['61-90']++;
      else if (age <= 180) buckets['91-180']++;
      else buckets['180+']++;
    }
    res.json(buckets);
  } catch (error) {
    console.error("Error fetching aging:", error);
    res.status(500).json({ error: "Failed to fetch aging analysis" });
  }
});

router.get("/capa-analytics/team-performance", requireAuth, async (req, res) => {
  try {
    const orgId = req.orgId!;
    const capas = await storage.getCapas(orgId);
    const closed = capas.filter(c => c.status === 'closed');
    const teamPerf: Record<string, { closed: number; avgCycleTimeDays: number; totalDays: number }> = {};

    for (const c of closed) {
      const team = await storage.getCapaTeamMembers(c.id);
      const cycleDays = c.createdAt && c.closedAt
        ? Math.floor((new Date(c.closedAt).getTime() - new Date(c.createdAt).getTime()) / (1000 * 60 * 60 * 24))
        : 0;
      for (const m of team) {
        if (!teamPerf[m.userId]) teamPerf[m.userId] = { closed: 0, avgCycleTimeDays: 0, totalDays: 0 };
        teamPerf[m.userId].closed++;
        teamPerf[m.userId].totalDays += cycleDays;
      }
    }

    const results = Object.entries(teamPerf).map(([userId, data]) => ({
      userId,
      closedCapas: data.closed,
      avgCycleTimeDays: data.closed ? Math.round(data.totalDays / data.closed) : 0,
    }));

    res.json(results);
  } catch (error) {
    console.error("Error fetching team performance:", error);
    res.status(500).json({ error: "Failed to fetch team performance" });
  }
});

// =============================================
// CAPA/8D Module: Reporting Endpoints
// =============================================

router.get("/capas/:id/report", requireAuth, async (req, res) => {
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
      report: {
        capa: capaRecord, d0, d1, d2, d3, d4: d4 ? { ...d4, candidates } : null,
        d5, d6, d7, d8, team, sources,
        attachments: attachments.filter(a => !a.deletedAt),
        auditTrail: auditLogs,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error generating report:", error);
    res.status(500).json({ error: "Failed to generate report" });
  }
});

// Batch report
router.post("/capa-reports/batch", requireAuth, async (req, res) => {
  try {
    const { capaIds } = req.body;
    if (!Array.isArray(capaIds) || capaIds.length === 0) {
      return res.status(400).json({ error: "capaIds array is required" });
    }

    const reports = [];
    for (const id of capaIds) {
      const capaRecord = await storage.getCapa(id);
      if (capaRecord && capaRecord.orgId === req.orgId!) {
        reports.push(capaRecord);
      }
    }

    res.json({ reports, generatedAt: new Date().toISOString() });
  } catch (error) {
    console.error("Error generating batch report:", error);
    res.status(500).json({ error: "Failed to generate batch report" });
  }
});

// Summary report
router.get("/capa-reports/summary", requireAuth, async (req, res) => {
  try {
    const orgId = req.orgId!;
    const capas = await storage.getCapas(orgId);
    const metrics = await storage.getCapaMetrics(orgId);

    res.json({
      metrics,
      totalCapas: capas.length,
      active: capas.filter(c => !c.deletedAt && c.status !== 'closed').length,
      closed: capas.filter(c => c.status === 'closed').length,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error generating summary report:", error);
    res.status(500).json({ error: "Failed to generate summary report" });
  }
});

// =============================================
// CAPA/8D Module: Metric Snapshot Endpoints
// =============================================

router.get("/capa-metrics/snapshots", requireAuth, async (req, res) => {
  try {
    const orgId = req.orgId!;
    const period = (req.query.period as string) || 'monthly';
    const limit = parseInt(req.query.limit as string) || 12;
    const snapshots = await storage.getCapaSnapshotsByPeriod(orgId, period, limit);
    res.json(snapshots);
  } catch (error) {
    console.error("Error fetching snapshots:", error);
    res.status(500).json({ error: "Failed to fetch snapshots" });
  }
});

router.post("/capa-metrics/snapshot", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const orgId = req.orgId!;
    const metrics = await storage.getCapaMetrics(orgId);
    const capas = await storage.getCapas(orgId);

    const bySource: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    for (const c of capas.filter(x => !x.deletedAt)) {
      bySource[c.sourceType] = (bySource[c.sourceType] || 0) + 1;
      const cat = c.category || 'uncategorized';
      byCategory[cat] = (byCategory[cat] || 0) + 1;
    }

    const now = new Date();
    const open = capas.filter(c => c.status !== 'closed' && !c.deletedAt);
    const closed = capas.filter(c => c.status === 'closed');
    const overdue = open.filter(c => c.targetClosureDate && new Date(c.targetClosureDate) < now);
    const onTime = closed.filter(c => c.targetClosureDate && c.actualClosureDate && new Date(c.actualClosureDate) <= new Date(c.targetClosureDate));

    const parsed = insertCapaMetricSnapshotSchema.parse({
      orgId,
      snapshotDate: now,
      snapshotPeriod: req.body.period || 'daily',
      totalCapas: capas.filter(x => !x.deletedAt).length,
      byStatus: JSON.stringify(metrics.byStatus),
      byPriority: JSON.stringify(metrics.byPriority),
      bySourceType: JSON.stringify(bySource),
      byCategory: JSON.stringify(byCategory),
      openedThisPeriod: 0,
      closedThisPeriod: 0,
      overdueCount: overdue.length,
      avgAgeDays: 0,
      avgCycleTimeDays: metrics.avgClosureTime,
      onTimeClosureRate: closed.length ? onTime.length / closed.length : 0,
      effectivenessRate: 0,
      recurrenceRate: 0,
    });

    const snapshot = await storage.createCapaMetricSnapshot(parsed);
    res.status(201).json(snapshot);
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: fromError(error).toString() });
    console.error("Error creating snapshot:", error);
    res.status(500).json({ error: "Failed to create snapshot" });
  }
});

router.get("/capa-metrics/compare", requireAuth, async (req, res) => {
  try {
    const orgId = req.orgId!;
    const snapshots = await storage.getCapaSnapshotsByPeriod(orgId, 'monthly', 100);
    const id1 = parseInt(req.query.snapshot1 as string);
    const id2 = parseInt(req.query.snapshot2 as string);

    const s1 = snapshots.find(s => s.id === id1);
    const s2 = snapshots.find(s => s.id === id2);

    if (!s1 || !s2) return res.status(404).json({ error: "Snapshot not found" });

    res.json({ snapshot1: s1, snapshot2: s2 });
  } catch (error) {
    console.error("Error comparing snapshots:", error);
    res.status(500).json({ error: "Failed to compare snapshots" });
  }
});

// Single CAPA export (with :id param - safe to be here)
router.get("/capas/:id/export", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });
    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) return res.status(404).json({ error: "CAPA not found" });

    const [d0, d1, d2, d3, d4, d5, d6, d7, d8, team, sources, attachments] = await Promise.all([
      storage.getCapaD0(capaId), storage.getCapaD1(capaId), storage.getCapaD2(capaId),
      storage.getCapaD3(capaId), storage.getCapaD4(capaId), storage.getCapaD5(capaId),
      storage.getCapaD6(capaId), storage.getCapaD7(capaId), storage.getCapaD8(capaId),
      storage.getCapaTeamMembers(capaId), storage.getCapaSources(capaId),
      storage.getCapaAttachments(capaId),
    ]);

    res.json({ capa: capaRecord, d0, d1, d2, d3, d4, d5, d6, d7, d8, team, sources, attachments: attachments.filter(a => !a.deletedAt) });
  } catch (error) {
    console.error("Error exporting CAPA:", error);
    res.status(500).json({ error: "Failed to export CAPA" });
  }
});

// =============================================
// CAPA/8D Module: Analysis Tools CRUD
// =============================================

// List analysis tools
router.get("/capas/:id/analysis-tools", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });
    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) return res.status(404).json({ error: "CAPA not found" });

    const toolType = req.query.toolType as string | undefined;
    let tools;
    if (toolType) {
      tools = await storage.getCapaAnalysisToolsByType(capaId, toolType);
    } else {
      tools = await storage.getCapaAnalysisTools(capaId);
    }

    const discipline = req.query.discipline as string | undefined;
    if (discipline) tools = tools.filter(t => t.discipline === discipline);

    const status = req.query.status as string | undefined;
    if (status) tools = tools.filter(t => t.status === status);

    res.json({ tools: tools.map(t => ({ ...t, data: parseToolData(t) })) });
  } catch (error) {
    console.error("Error listing analysis tools:", error);
    res.status(500).json({ error: "Failed to list analysis tools" });
  }
});

// Create analysis tool
router.post("/capas/:id/analysis-tools", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    if (isNaN(capaId)) return res.status(400).json({ error: "Invalid CAPA ID" });
    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) return res.status(404).json({ error: "CAPA not found" });

    const validTypes = ['is_is_not', 'five_why', 'three_leg_five_why', 'fishbone', 'fault_tree', 'comparative', 'change_point', 'pareto'];
    if (!validTypes.includes(req.body.toolType)) {
      return res.status(400).json({ error: `Invalid tool type. Must be one of: ${validTypes.join(', ')}` });
    }

    const parsed = insertCapaAnalysisToolSchema.parse({
      orgId: req.orgId!,
      capaId,
      toolType: req.body.toolType,
      name: req.body.name || `${req.body.toolType} Analysis`,
      discipline: req.body.discipline || 'D4',
      data: JSON.stringify(req.body.data || {}),
      createdBy: req.auth!.user.id,
    });

    const tool = await storage.createCapaAnalysisTool(parsed);
    res.status(201).json({ ...tool, data: parseToolData(tool) });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: fromError(error).toString() });
    console.error("Error creating analysis tool:", error);
    res.status(500).json({ error: "Failed to create analysis tool" });
  }
});

// Get analysis tool
router.get("/capas/:id/analysis-tools/:toolId", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    const toolId = parseInt(req.params.toolId);
    if (isNaN(capaId) || isNaN(toolId)) return res.status(400).json({ error: "Invalid ID" });
    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) return res.status(404).json({ error: "CAPA not found" });

    const tool = await storage.getCapaAnalysisTool(toolId);
    if (!tool || tool.capaId !== capaId) return res.status(404).json({ error: "Analysis tool not found" });

    res.json({ ...tool, data: parseToolData(tool) });
  } catch (error) {
    console.error("Error fetching analysis tool:", error);
    res.status(500).json({ error: "Failed to fetch analysis tool" });
  }
});

// Update analysis tool
router.put("/capas/:id/analysis-tools/:toolId", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    const toolId = parseInt(req.params.toolId);
    if (isNaN(capaId) || isNaN(toolId)) return res.status(400).json({ error: "Invalid ID" });
    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) return res.status(404).json({ error: "CAPA not found" });

    const tool = await storage.getCapaAnalysisTool(toolId);
    if (!tool || tool.capaId !== capaId) return res.status(404).json({ error: "Analysis tool not found" });

    const updates: any = {};
    if (req.body.name) updates.name = req.body.name;
    if (req.body.discipline) updates.discipline = req.body.discipline;
    if (req.body.data) updates.data = updateToolData(tool.data, req.body.data);
    if (req.body.conclusion !== undefined) updates.conclusion = req.body.conclusion;

    const updated = await storage.updateCapaAnalysisTool(toolId, updates);
    res.json({ ...updated, data: parseToolData(updated) });
  } catch (error) {
    console.error("Error updating analysis tool:", error);
    res.status(500).json({ error: "Failed to update analysis tool" });
  }
});

// Delete analysis tool
router.delete("/capas/:id/analysis-tools/:toolId", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    const toolId = parseInt(req.params.toolId);
    if (isNaN(capaId) || isNaN(toolId)) return res.status(400).json({ error: "Invalid ID" });
    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) return res.status(404).json({ error: "CAPA not found" });

    const tool = await storage.getCapaAnalysisTool(toolId);
    if (!tool || tool.capaId !== capaId) return res.status(404).json({ error: "Analysis tool not found" });

    await storage.deleteCapaAnalysisTool(toolId);
    res.json({ deleted: true });
  } catch (error) {
    console.error("Error deleting analysis tool:", error);
    res.status(500).json({ error: "Failed to delete analysis tool" });
  }
});

// Complete analysis tool
router.post("/capas/:id/analysis-tools/:toolId/complete", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    const toolId = parseInt(req.params.toolId);
    if (isNaN(capaId) || isNaN(toolId)) return res.status(400).json({ error: "Invalid ID" });
    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) return res.status(404).json({ error: "CAPA not found" });

    const tool = await storage.getCapaAnalysisTool(toolId);
    if (!tool || tool.capaId !== capaId) return res.status(404).json({ error: "Analysis tool not found" });

    const conclusion = req.body.conclusion || '';
    const updated = await storage.completeCapaAnalysisTool(toolId, req.auth!.user.id, conclusion);
    res.json({ ...updated, data: parseToolData(updated) });
  } catch (error) {
    console.error("Error completing analysis tool:", error);
    res.status(500).json({ error: "Failed to complete analysis tool" });
  }
});

// Verify analysis tool
router.post("/capas/:id/analysis-tools/:toolId/verify", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    const toolId = parseInt(req.params.toolId);
    if (isNaN(capaId) || isNaN(toolId)) return res.status(400).json({ error: "Invalid ID" });
    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) return res.status(404).json({ error: "CAPA not found" });

    const tool = await storage.getCapaAnalysisTool(toolId);
    if (!tool || tool.capaId !== capaId) return res.status(404).json({ error: "Analysis tool not found" });
    if (tool.status !== 'complete') return res.status(400).json({ error: "Tool must be completed before verification" });

    const updated = await storage.verifyCapaAnalysisTool(toolId, req.auth!.user.id);
    res.json({ ...updated, data: parseToolData(updated) });
  } catch (error) {
    console.error("Error verifying analysis tool:", error);
    res.status(500).json({ error: "Failed to verify analysis tool" });
  }
});

// Link to root cause
router.post("/capas/:id/analysis-tools/:toolId/link-to-root-cause", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    const toolId = parseInt(req.params.toolId);
    if (isNaN(capaId) || isNaN(toolId)) return res.status(400).json({ error: "Invalid ID" });
    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) return res.status(404).json({ error: "CAPA not found" });

    const tool = await storage.getCapaAnalysisTool(toolId);
    if (!tool || tool.capaId !== capaId) return res.status(404).json({ error: "Analysis tool not found" });

    const updated = await storage.linkAnalysisToolToRootCause(toolId);
    res.json({ ...updated, data: parseToolData(updated) });
  } catch (error) {
    console.error("Error linking to root cause:", error);
    res.status(500).json({ error: "Failed to link to root cause" });
  }
});

// =============================================
// Tool-Specific Operations: Is/Is Not
// =============================================

router.put("/capas/:id/analysis-tools/:toolId/is-is-not/:dimension", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    const toolId = parseInt(req.params.toolId);
    if (isNaN(capaId) || isNaN(toolId)) return res.status(400).json({ error: "Invalid ID" });
    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) return res.status(404).json({ error: "CAPA not found" });

    const tool = await storage.getCapaAnalysisTool(toolId);
    if (!tool || tool.capaId !== capaId || tool.toolType !== 'is_is_not') return res.status(404).json({ error: "Is/Is Not tool not found" });

    const validDimensions = ['what', 'where', 'when', 'howMany'];
    if (!validDimensions.includes(req.params.dimension)) {
      return res.status(400).json({ error: `Invalid dimension. Must be one of: ${validDimensions.join(', ')}` });
    }

    const data = parseToolData(tool);
    if (!data.dimensions) data.dimensions = {};
    data.dimensions[req.params.dimension] = req.body;

    const updated = await storage.updateCapaAnalysisTool(toolId, { data: JSON.stringify(data) });
    res.json({ ...updated, data: parseToolData(updated) });
  } catch (error) {
    console.error("Error updating Is/Is Not dimension:", error);
    res.status(500).json({ error: "Failed to update dimension" });
  }
});

router.post("/capas/:id/analysis-tools/:toolId/is-is-not/verify-therefore", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    const toolId = parseInt(req.params.toolId);
    if (isNaN(capaId) || isNaN(toolId)) return res.status(400).json({ error: "Invalid ID" });
    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) return res.status(404).json({ error: "CAPA not found" });

    const tool = await storage.getCapaAnalysisTool(toolId);
    if (!tool || tool.capaId !== capaId || tool.toolType !== 'is_is_not') return res.status(404).json({ error: "Is/Is Not tool not found" });

    const data = parseToolData(tool);
    data.therefore = req.body.therefore;
    data.thereforeVerified = true;
    data.thereforeVerifiedBy = req.auth!.user.id;
    data.thereforeVerifiedAt = new Date().toISOString();

    const updated = await storage.updateCapaAnalysisTool(toolId, { data: JSON.stringify(data) });
    res.json({ ...updated, data: parseToolData(updated) });
  } catch (error) {
    console.error("Error verifying therefore:", error);
    res.status(500).json({ error: "Failed to verify therefore" });
  }
});

// =============================================
// Tool-Specific Operations: 5-Why
// =============================================

router.post("/capas/:id/analysis-tools/:toolId/five-why/add-why", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    const toolId = parseInt(req.params.toolId);
    if (isNaN(capaId) || isNaN(toolId)) return res.status(400).json({ error: "Invalid ID" });
    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) return res.status(404).json({ error: "CAPA not found" });

    const tool = await storage.getCapaAnalysisTool(toolId);
    if (!tool || tool.capaId !== capaId || tool.toolType !== 'five_why') return res.status(404).json({ error: "5-Why tool not found" });

    const data = parseToolData(tool);
    if (!data.whys) data.whys = [];
    data.whys.push({ ...req.body, addedAt: new Date().toISOString(), addedBy: req.auth!.user.id });

    const updated = await storage.updateCapaAnalysisTool(toolId, { data: JSON.stringify(data) });
    res.json({ ...updated, data: parseToolData(updated) });
  } catch (error) {
    console.error("Error adding why:", error);
    res.status(500).json({ error: "Failed to add why" });
  }
});

router.put("/capas/:id/analysis-tools/:toolId/five-why/whys/:level", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    const toolId = parseInt(req.params.toolId);
    const level = parseInt(req.params.level);
    if (isNaN(capaId) || isNaN(toolId) || isNaN(level)) return res.status(400).json({ error: "Invalid ID" });
    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) return res.status(404).json({ error: "CAPA not found" });

    const tool = await storage.getCapaAnalysisTool(toolId);
    if (!tool || tool.capaId !== capaId || tool.toolType !== 'five_why') return res.status(404).json({ error: "5-Why tool not found" });

    const data = parseToolData(tool);
    if (!data.whys || level < 0 || level >= data.whys.length) return res.status(404).json({ error: "Why level not found" });

    data.whys[level] = { ...data.whys[level], ...req.body, updatedAt: new Date().toISOString() };

    const updated = await storage.updateCapaAnalysisTool(toolId, { data: JSON.stringify(data) });
    res.json({ ...updated, data: parseToolData(updated) });
  } catch (error) {
    console.error("Error updating why:", error);
    res.status(500).json({ error: "Failed to update why" });
  }
});

router.post("/capas/:id/analysis-tools/:toolId/five-why/set-root-cause", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    const toolId = parseInt(req.params.toolId);
    if (isNaN(capaId) || isNaN(toolId)) return res.status(400).json({ error: "Invalid ID" });
    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) return res.status(404).json({ error: "CAPA not found" });

    const tool = await storage.getCapaAnalysisTool(toolId);
    if (!tool || tool.capaId !== capaId || tool.toolType !== 'five_why') return res.status(404).json({ error: "5-Why tool not found" });

    const data = parseToolData(tool);
    data.rootCause = req.body.rootCause;
    data.rootCauseCategory = req.body.rootCauseCategory;

    const updated = await storage.updateCapaAnalysisTool(toolId, { data: JSON.stringify(data), conclusion: req.body.rootCause });
    res.json({ ...updated, data: parseToolData(updated) });
  } catch (error) {
    console.error("Error setting root cause:", error);
    res.status(500).json({ error: "Failed to set root cause" });
  }
});

router.post("/capas/:id/analysis-tools/:toolId/five-why/verify", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    const toolId = parseInt(req.params.toolId);
    if (isNaN(capaId) || isNaN(toolId)) return res.status(400).json({ error: "Invalid ID" });
    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) return res.status(404).json({ error: "CAPA not found" });

    const tool = await storage.getCapaAnalysisTool(toolId);
    if (!tool || tool.capaId !== capaId || tool.toolType !== 'five_why') return res.status(404).json({ error: "5-Why tool not found" });

    const data = parseToolData(tool);
    data.verified = true;
    data.verificationMethod = req.body.verificationMethod;
    data.verifiedAt = new Date().toISOString();
    data.verifiedBy = req.auth!.user.id;

    const updated = await storage.updateCapaAnalysisTool(toolId, { data: JSON.stringify(data) });
    res.json({ ...updated, data: parseToolData(updated) });
  } catch (error) {
    console.error("Error verifying 5-Why:", error);
    res.status(500).json({ error: "Failed to verify 5-Why" });
  }
});

// =============================================
// Tool-Specific: 3-Legged 5-Why
// =============================================

router.put("/capas/:id/analysis-tools/:toolId/three-leg/:leg", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    const toolId = parseInt(req.params.toolId);
    if (isNaN(capaId) || isNaN(toolId)) return res.status(400).json({ error: "Invalid ID" });
    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) return res.status(404).json({ error: "CAPA not found" });

    const tool = await storage.getCapaAnalysisTool(toolId);
    if (!tool || tool.capaId !== capaId || tool.toolType !== 'three_leg_five_why') return res.status(404).json({ error: "3-Leg tool not found" });

    const leg = req.params.leg;
    const validLegs = ['occurrence', 'detection', 'systemic'];
    if (!validLegs.includes(leg)) return res.status(400).json({ error: `Invalid leg. Must be one of: ${validLegs.join(', ')}` });

    const data = parseToolData(tool);
    if (!data.legs) data.legs = {};
    data.legs[leg] = { ...data.legs[leg], ...req.body, updatedAt: new Date().toISOString() };

    const updated = await storage.updateCapaAnalysisTool(toolId, { data: JSON.stringify(data) });
    res.json({ ...updated, data: parseToolData(updated) });
  } catch (error) {
    console.error("Error updating 3-leg:", error);
    res.status(500).json({ error: "Failed to update leg" });
  }
});

router.post("/capas/:id/analysis-tools/:toolId/three-leg/:leg/verify", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    const toolId = parseInt(req.params.toolId);
    if (isNaN(capaId) || isNaN(toolId)) return res.status(400).json({ error: "Invalid ID" });
    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) return res.status(404).json({ error: "CAPA not found" });

    const tool = await storage.getCapaAnalysisTool(toolId);
    if (!tool || tool.capaId !== capaId || tool.toolType !== 'three_leg_five_why') return res.status(404).json({ error: "3-Leg tool not found" });

    const leg = req.params.leg;
    const data = parseToolData(tool);
    if (!data.legs || !data.legs[leg]) return res.status(404).json({ error: "Leg not found" });

    data.legs[leg].verified = true;
    data.legs[leg].verifiedAt = new Date().toISOString();
    data.legs[leg].verifiedBy = req.auth!.user.id;

    const updated = await storage.updateCapaAnalysisTool(toolId, { data: JSON.stringify(data) });
    res.json({ ...updated, data: parseToolData(updated) });
  } catch (error) {
    console.error("Error verifying leg:", error);
    res.status(500).json({ error: "Failed to verify leg" });
  }
});

// =============================================
// Tool-Specific: Fishbone
// =============================================

router.post("/capas/:id/analysis-tools/:toolId/fishbone/cause", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    const toolId = parseInt(req.params.toolId);
    if (isNaN(capaId) || isNaN(toolId)) return res.status(400).json({ error: "Invalid ID" });
    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) return res.status(404).json({ error: "CAPA not found" });

    const tool = await storage.getCapaAnalysisTool(toolId);
    if (!tool || tool.capaId !== capaId || tool.toolType !== 'fishbone') return res.status(404).json({ error: "Fishbone tool not found" });

    const data = parseToolData(tool);
    if (!data.causes) data.causes = {};
    const category = req.body.category || 'other';
    if (!data.causes[category]) data.causes[category] = [];

    const newCause = { id: randomUUID(), text: req.body.text, status: 'open', parentCauseId: req.body.parentCauseId || null, subCauses: [], createdAt: new Date().toISOString() };
    data.causes[category].push(newCause);

    const updated = await storage.updateCapaAnalysisTool(toolId, { data: JSON.stringify(data) });
    res.json({ cause: newCause, tool: { ...updated, data: parseToolData(updated) } });
  } catch (error) {
    console.error("Error adding fishbone cause:", error);
    res.status(500).json({ error: "Failed to add cause" });
  }
});

router.put("/capas/:id/analysis-tools/:toolId/fishbone/cause/:causeId", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    const toolId = parseInt(req.params.toolId);
    if (isNaN(capaId) || isNaN(toolId)) return res.status(400).json({ error: "Invalid ID" });
    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) return res.status(404).json({ error: "CAPA not found" });

    const tool = await storage.getCapaAnalysisTool(toolId);
    if (!tool || tool.capaId !== capaId || tool.toolType !== 'fishbone') return res.status(404).json({ error: "Fishbone tool not found" });

    const data = parseToolData(tool);
    const causeId = req.params.causeId;
    let found = false;
    for (const cat of Object.keys(data.causes || {})) {
      const idx = data.causes[cat].findIndex((c: any) => c.id === causeId);
      if (idx !== -1) {
        data.causes[cat][idx] = { ...data.causes[cat][idx], ...req.body, updatedAt: new Date().toISOString() };
        found = true;
        break;
      }
    }
    if (!found) return res.status(404).json({ error: "Cause not found" });

    const updated = await storage.updateCapaAnalysisTool(toolId, { data: JSON.stringify(data) });
    res.json({ ...updated, data: parseToolData(updated) });
  } catch (error) {
    console.error("Error updating fishbone cause:", error);
    res.status(500).json({ error: "Failed to update cause" });
  }
});

router.post("/capas/:id/analysis-tools/:toolId/fishbone/cause/:causeId/verify", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    const toolId = parseInt(req.params.toolId);
    if (isNaN(capaId) || isNaN(toolId)) return res.status(400).json({ error: "Invalid ID" });
    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) return res.status(404).json({ error: "CAPA not found" });

    const tool = await storage.getCapaAnalysisTool(toolId);
    if (!tool || tool.capaId !== capaId || tool.toolType !== 'fishbone') return res.status(404).json({ error: "Fishbone tool not found" });

    const data = parseToolData(tool);
    const causeId = req.params.causeId;
    for (const cat of Object.keys(data.causes || {})) {
      const idx = data.causes[cat].findIndex((c: any) => c.id === causeId);
      if (idx !== -1) {
        data.causes[cat][idx].status = 'verified';
        data.causes[cat][idx].evidence = req.body.evidence;
        data.causes[cat][idx].verifiedBy = req.auth!.user.id;
        data.causes[cat][idx].verifiedAt = new Date().toISOString();
        break;
      }
    }

    const updated = await storage.updateCapaAnalysisTool(toolId, { data: JSON.stringify(data) });
    res.json({ ...updated, data: parseToolData(updated) });
  } catch (error) {
    console.error("Error verifying cause:", error);
    res.status(500).json({ error: "Failed to verify cause" });
  }
});

router.post("/capas/:id/analysis-tools/:toolId/fishbone/cause/:causeId/rule-out", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    const toolId = parseInt(req.params.toolId);
    if (isNaN(capaId) || isNaN(toolId)) return res.status(400).json({ error: "Invalid ID" });
    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) return res.status(404).json({ error: "CAPA not found" });

    const tool = await storage.getCapaAnalysisTool(toolId);
    if (!tool || tool.capaId !== capaId || tool.toolType !== 'fishbone') return res.status(404).json({ error: "Fishbone tool not found" });

    const data = parseToolData(tool);
    const causeId = req.params.causeId;
    for (const cat of Object.keys(data.causes || {})) {
      const idx = data.causes[cat].findIndex((c: any) => c.id === causeId);
      if (idx !== -1) {
        data.causes[cat][idx].status = 'ruled_out';
        data.causes[cat][idx].ruledOutReason = req.body.reason;
        data.causes[cat][idx].ruledOutBy = req.auth!.user.id;
        break;
      }
    }

    const updated = await storage.updateCapaAnalysisTool(toolId, { data: JSON.stringify(data) });
    res.json({ ...updated, data: parseToolData(updated) });
  } catch (error) {
    console.error("Error ruling out cause:", error);
    res.status(500).json({ error: "Failed to rule out cause" });
  }
});

router.post("/capas/:id/analysis-tools/:toolId/fishbone/cause/:causeId/sub-cause", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    const toolId = parseInt(req.params.toolId);
    if (isNaN(capaId) || isNaN(toolId)) return res.status(400).json({ error: "Invalid ID" });
    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) return res.status(404).json({ error: "CAPA not found" });

    const tool = await storage.getCapaAnalysisTool(toolId);
    if (!tool || tool.capaId !== capaId || tool.toolType !== 'fishbone') return res.status(404).json({ error: "Fishbone tool not found" });

    const data = parseToolData(tool);
    const causeId = req.params.causeId;
    const subCause = { id: randomUUID(), text: req.body.text, status: 'open', createdAt: new Date().toISOString() };

    for (const cat of Object.keys(data.causes || {})) {
      const idx = data.causes[cat].findIndex((c: any) => c.id === causeId);
      if (idx !== -1) {
        if (!data.causes[cat][idx].subCauses) data.causes[cat][idx].subCauses = [];
        data.causes[cat][idx].subCauses.push(subCause);
        break;
      }
    }

    const updated = await storage.updateCapaAnalysisTool(toolId, { data: JSON.stringify(data) });
    res.json({ subCause, tool: { ...updated, data: parseToolData(updated) } });
  } catch (error) {
    console.error("Error adding sub-cause:", error);
    res.status(500).json({ error: "Failed to add sub-cause" });
  }
});

// =============================================
// Tool-Specific: Fault Tree
// =============================================

router.post("/capas/:id/analysis-tools/:toolId/fault-tree/node", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    const toolId = parseInt(req.params.toolId);
    if (isNaN(capaId) || isNaN(toolId)) return res.status(400).json({ error: "Invalid ID" });
    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) return res.status(404).json({ error: "CAPA not found" });

    const tool = await storage.getCapaAnalysisTool(toolId);
    if (!tool || tool.capaId !== capaId || tool.toolType !== 'fault_tree') return res.status(404).json({ error: "Fault tree tool not found" });

    const data = parseToolData(tool);
    if (!data.nodes) data.nodes = [];
    const newNode = { id: randomUUID(), ...req.body, createdAt: new Date().toISOString() };
    data.nodes.push(newNode);

    const updated = await storage.updateCapaAnalysisTool(toolId, { data: JSON.stringify(data) });
    res.json({ node: newNode, tool: { ...updated, data: parseToolData(updated) } });
  } catch (error) {
    console.error("Error adding fault tree node:", error);
    res.status(500).json({ error: "Failed to add node" });
  }
});

router.put("/capas/:id/analysis-tools/:toolId/fault-tree/node/:nodeId", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    const toolId = parseInt(req.params.toolId);
    if (isNaN(capaId) || isNaN(toolId)) return res.status(400).json({ error: "Invalid ID" });
    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) return res.status(404).json({ error: "CAPA not found" });

    const tool = await storage.getCapaAnalysisTool(toolId);
    if (!tool || tool.capaId !== capaId || tool.toolType !== 'fault_tree') return res.status(404).json({ error: "Fault tree tool not found" });

    const data = parseToolData(tool);
    const idx = (data.nodes || []).findIndex((n: any) => n.id === req.params.nodeId);
    if (idx === -1) return res.status(404).json({ error: "Node not found" });

    data.nodes[idx] = { ...data.nodes[idx], ...req.body, updatedAt: new Date().toISOString() };

    const updated = await storage.updateCapaAnalysisTool(toolId, { data: JSON.stringify(data) });
    res.json({ ...updated, data: parseToolData(updated) });
  } catch (error) {
    console.error("Error updating fault tree node:", error);
    res.status(500).json({ error: "Failed to update node" });
  }
});

router.delete("/capas/:id/analysis-tools/:toolId/fault-tree/node/:nodeId", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    const toolId = parseInt(req.params.toolId);
    if (isNaN(capaId) || isNaN(toolId)) return res.status(400).json({ error: "Invalid ID" });
    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) return res.status(404).json({ error: "CAPA not found" });

    const tool = await storage.getCapaAnalysisTool(toolId);
    if (!tool || tool.capaId !== capaId || tool.toolType !== 'fault_tree') return res.status(404).json({ error: "Fault tree tool not found" });

    const data = parseToolData(tool);
    const nodeId = req.params.nodeId;
    // Remove node and its children
    const toRemove = new Set([nodeId]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const node of (data.nodes || [])) {
        if (toRemove.has(node.parentId) && !toRemove.has(node.id)) {
          toRemove.add(node.id);
          changed = true;
        }
      }
    }
    data.nodes = (data.nodes || []).filter((n: any) => !toRemove.has(n.id));

    const updated = await storage.updateCapaAnalysisTool(toolId, { data: JSON.stringify(data) });
    res.json({ ...updated, data: parseToolData(updated) });
  } catch (error) {
    console.error("Error deleting fault tree node:", error);
    res.status(500).json({ error: "Failed to delete node" });
  }
});

router.post("/capas/:id/analysis-tools/:toolId/fault-tree/calculate", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    const toolId = parseInt(req.params.toolId);
    if (isNaN(capaId) || isNaN(toolId)) return res.status(400).json({ error: "Invalid ID" });
    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) return res.status(404).json({ error: "CAPA not found" });

    const tool = await storage.getCapaAnalysisTool(toolId);
    if (!tool || tool.capaId !== capaId || tool.toolType !== 'fault_tree') return res.status(404).json({ error: "Fault tree tool not found" });

    const data = parseToolData(tool);
    const nodes = data.nodes || [];

    // Simple probability calculation
    const basicEvents = nodes.filter((n: any) => n.type === 'basic_event' && n.probability);
    const topProb = basicEvents.reduce((sum: number, n: any) => sum + (n.probability || 0), 0);

    const minimalCutSets = basicEvents.map((n: any) => ({
      events: [n.id],
      probability: n.probability || 0,
    }));

    const criticalPath = basicEvents
      .sort((a: any, b: any) => (b.probability || 0) - (a.probability || 0))
      .map((n: any) => n.id);

    // Store calculation results
    data.calculation = { topEventProbability: Math.min(topProb, 1), minimalCutSets, criticalPath, calculatedAt: new Date().toISOString() };
    await storage.updateCapaAnalysisTool(toolId, { data: JSON.stringify(data) });

    res.json(data.calculation);
  } catch (error) {
    console.error("Error calculating fault tree:", error);
    res.status(500).json({ error: "Failed to calculate fault tree" });
  }
});

// =============================================
// Tool-Specific: Comparative Analysis
// =============================================

router.post("/capas/:id/analysis-tools/:toolId/comparative/items", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    const toolId = parseInt(req.params.toolId);
    if (isNaN(capaId) || isNaN(toolId)) return res.status(400).json({ error: "Invalid ID" });
    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) return res.status(404).json({ error: "CAPA not found" });

    const tool = await storage.getCapaAnalysisTool(toolId);
    if (!tool || tool.capaId !== capaId || tool.toolType !== 'comparative') return res.status(404).json({ error: "Comparative tool not found" });

    const data = parseToolData(tool);
    if (!data.items) data.items = [];
    data.items.push({ ...req.body, addedAt: new Date().toISOString() });

    const updated = await storage.updateCapaAnalysisTool(toolId, { data: JSON.stringify(data) });
    res.json({ ...updated, data: parseToolData(updated) });
  } catch (error) {
    console.error("Error adding comparative item:", error);
    res.status(500).json({ error: "Failed to add item" });
  }
});

router.post("/capas/:id/analysis-tools/:toolId/comparative/factors", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    const toolId = parseInt(req.params.toolId);
    if (isNaN(capaId) || isNaN(toolId)) return res.status(400).json({ error: "Invalid ID" });
    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) return res.status(404).json({ error: "CAPA not found" });

    const tool = await storage.getCapaAnalysisTool(toolId);
    if (!tool || tool.capaId !== capaId || tool.toolType !== 'comparative') return res.status(404).json({ error: "Comparative tool not found" });

    const data = parseToolData(tool);
    if (!data.factors) data.factors = [];
    const isDifferent = req.body.good !== req.body.bad;
    data.factors.push({ ...req.body, isDifferent, addedAt: new Date().toISOString() });

    const updated = await storage.updateCapaAnalysisTool(toolId, { data: JSON.stringify(data) });
    res.json({ ...updated, data: parseToolData(updated) });
  } catch (error) {
    console.error("Error adding factor:", error);
    res.status(500).json({ error: "Failed to add factor" });
  }
});

router.put("/capas/:id/analysis-tools/:toolId/comparative/factors/:index", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    const toolId = parseInt(req.params.toolId);
    const index = parseInt(req.params.index);
    if (isNaN(capaId) || isNaN(toolId) || isNaN(index)) return res.status(400).json({ error: "Invalid ID" });
    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) return res.status(404).json({ error: "CAPA not found" });

    const tool = await storage.getCapaAnalysisTool(toolId);
    if (!tool || tool.capaId !== capaId || tool.toolType !== 'comparative') return res.status(404).json({ error: "Comparative tool not found" });

    const data = parseToolData(tool);
    if (!data.factors || index >= data.factors.length) return res.status(404).json({ error: "Factor not found" });

    data.factors[index] = { ...data.factors[index], ...req.body, updatedAt: new Date().toISOString() };

    const updated = await storage.updateCapaAnalysisTool(toolId, { data: JSON.stringify(data) });
    res.json({ ...updated, data: parseToolData(updated) });
  } catch (error) {
    console.error("Error updating factor:", error);
    res.status(500).json({ error: "Failed to update factor" });
  }
});

router.post("/capas/:id/analysis-tools/:toolId/comparative/verify-hypothesis", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    const toolId = parseInt(req.params.toolId);
    if (isNaN(capaId) || isNaN(toolId)) return res.status(400).json({ error: "Invalid ID" });
    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) return res.status(404).json({ error: "CAPA not found" });

    const tool = await storage.getCapaAnalysisTool(toolId);
    if (!tool || tool.capaId !== capaId || tool.toolType !== 'comparative') return res.status(404).json({ error: "Comparative tool not found" });

    const data = parseToolData(tool);
    data.hypothesisVerified = true;
    data.verificationMethod = req.body.verificationMethod;
    data.verifiedAt = new Date().toISOString();
    data.verifiedBy = req.auth!.user.id;

    const updated = await storage.updateCapaAnalysisTool(toolId, { data: JSON.stringify(data) });
    res.json({ ...updated, data: parseToolData(updated) });
  } catch (error) {
    console.error("Error verifying hypothesis:", error);
    res.status(500).json({ error: "Failed to verify hypothesis" });
  }
});

// =============================================
// Tool-Specific: Change Point Analysis
// =============================================

router.post("/capas/:id/analysis-tools/:toolId/change-point/changes", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    const toolId = parseInt(req.params.toolId);
    if (isNaN(capaId) || isNaN(toolId)) return res.status(400).json({ error: "Invalid ID" });
    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) return res.status(404).json({ error: "CAPA not found" });

    const tool = await storage.getCapaAnalysisTool(toolId);
    if (!tool || tool.capaId !== capaId || tool.toolType !== 'change_point') return res.status(404).json({ error: "Change point tool not found" });

    const data = parseToolData(tool);
    if (!data.changes) data.changes = [];
    data.changes.push({ ...req.body, addedAt: new Date().toISOString(), addedBy: req.auth!.user.id });

    const updated = await storage.updateCapaAnalysisTool(toolId, { data: JSON.stringify(data) });
    res.json({ ...updated, data: parseToolData(updated) });
  } catch (error) {
    console.error("Error adding change:", error);
    res.status(500).json({ error: "Failed to add change" });
  }
});

router.put("/capas/:id/analysis-tools/:toolId/change-point/changes/:index", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    const toolId = parseInt(req.params.toolId);
    const index = parseInt(req.params.index);
    if (isNaN(capaId) || isNaN(toolId) || isNaN(index)) return res.status(400).json({ error: "Invalid ID" });
    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) return res.status(404).json({ error: "CAPA not found" });

    const tool = await storage.getCapaAnalysisTool(toolId);
    if (!tool || tool.capaId !== capaId || tool.toolType !== 'change_point') return res.status(404).json({ error: "Change point tool not found" });

    const data = parseToolData(tool);
    if (!data.changes || index >= data.changes.length) return res.status(404).json({ error: "Change not found" });

    data.changes[index] = { ...data.changes[index], ...req.body, updatedAt: new Date().toISOString() };

    const updated = await storage.updateCapaAnalysisTool(toolId, { data: JSON.stringify(data) });
    res.json({ ...updated, data: parseToolData(updated) });
  } catch (error) {
    console.error("Error updating change:", error);
    res.status(500).json({ error: "Failed to update change" });
  }
});

router.post("/capas/:id/analysis-tools/:toolId/change-point/changes/:index/rule-out", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    const toolId = parseInt(req.params.toolId);
    const index = parseInt(req.params.index);
    if (isNaN(capaId) || isNaN(toolId) || isNaN(index)) return res.status(400).json({ error: "Invalid ID" });
    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) return res.status(404).json({ error: "CAPA not found" });

    const tool = await storage.getCapaAnalysisTool(toolId);
    if (!tool || tool.capaId !== capaId || tool.toolType !== 'change_point') return res.status(404).json({ error: "Change point tool not found" });

    const data = parseToolData(tool);
    if (!data.changes || index >= data.changes.length) return res.status(404).json({ error: "Change not found" });

    data.changes[index].ruledOut = true;
    data.changes[index].ruledOutReason = req.body.reason;
    data.changes[index].ruledOutBy = req.auth!.user.id;

    const updated = await storage.updateCapaAnalysisTool(toolId, { data: JSON.stringify(data) });
    res.json({ ...updated, data: parseToolData(updated) });
  } catch (error) {
    console.error("Error ruling out change:", error);
    res.status(500).json({ error: "Failed to rule out change" });
  }
});

// =============================================
// Tool-Specific: Pareto
// =============================================

router.put("/capas/:id/analysis-tools/:toolId/pareto/data", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    const toolId = parseInt(req.params.toolId);
    if (isNaN(capaId) || isNaN(toolId)) return res.status(400).json({ error: "Invalid ID" });
    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) return res.status(404).json({ error: "CAPA not found" });

    const tool = await storage.getCapaAnalysisTool(toolId);
    if (!tool || tool.capaId !== capaId || tool.toolType !== 'pareto') return res.status(404).json({ error: "Pareto tool not found" });

    const categories = req.body.categories || [];
    const total = categories.reduce((sum: number, c: any) => sum + (c.count || 0), 0);
    let cumulative = 0;
    const enriched = categories.map((c: any) => {
      cumulative += c.count || 0;
      return { ...c, percentage: total ? (c.count / total) * 100 : 0, cumulative: total ? (cumulative / total) * 100 : 0 };
    });

    const data = { ...req.body, categories: enriched, total, calculatedAt: new Date().toISOString() };
    const updated = await storage.updateCapaAnalysisTool(toolId, { data: JSON.stringify(data) });
    res.json({ ...updated, data: parseToolData(updated) });
  } catch (error) {
    console.error("Error updating pareto data:", error);
    res.status(500).json({ error: "Failed to update pareto data" });
  }
});

// =============================================
// Analysis Tool Export
// =============================================

router.post("/capas/:id/analysis-tools/:toolId/export", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    const toolId = parseInt(req.params.toolId);
    if (isNaN(capaId) || isNaN(toolId)) return res.status(400).json({ error: "Invalid ID" });
    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) return res.status(404).json({ error: "CAPA not found" });

    const tool = await storage.getCapaAnalysisTool(toolId);
    if (!tool || tool.capaId !== capaId) return res.status(404).json({ error: "Analysis tool not found" });

    const format = req.body.format || 'json';
    const data = parseToolData(tool);

    if (format === 'json') {
      return res.json({ tool: { ...tool, data }, exportedAt: new Date().toISOString() });
    }

    // For other formats, return the JSON data with format metadata
    res.json({ tool: { ...tool, data }, format, exportedAt: new Date().toISOString(), note: `${format} rendering available on client` });
  } catch (error) {
    console.error("Error exporting analysis tool:", error);
    res.status(500).json({ error: "Failed to export analysis tool" });
  }
});

// =============================================
// Analysis Tool Templates
// =============================================

router.get("/analysis-tool-templates", requireAuth, async (_req, res) => {
  try {
    const templates = {
      fishbone: {
        '5M': ['man', 'machine', 'material', 'method', 'measurement'],
        '6M': ['man', 'machine', 'material', 'method', 'measurement', 'environment'],
        '8M': ['man', 'machine', 'material', 'method', 'measurement', 'environment', 'management', 'money'],
      },
      commonCauses: {
        man: ['Training gap', 'Fatigue', 'Skill level', 'Communication', 'Supervision', 'Experience'],
        machine: ['Tool wear', 'Calibration drift', 'Maintenance overdue', 'Equipment age', 'Setup error', 'Parameter drift'],
        material: ['Material variation', 'Wrong material', 'Supplier change', 'Contamination', 'Storage conditions'],
        method: ['Procedure not followed', 'Procedure unclear', 'Work instruction missing', 'Process change', 'Sequence error'],
        measurement: ['Gage R&R failure', 'Wrong gage', 'Calibration expired', 'Measurement technique', 'Sample size'],
        environment: ['Temperature', 'Humidity', 'Lighting', 'Cleanliness', 'Vibration', 'Noise'],
      },
      fiveWhy: { maxLevels: 7, guideline: 'Ask "Why?" until you reach a systemic root cause that can be addressed with a corrective action' },
      changePoint: { categories: ['man', 'machine', 'material', 'method', 'measurement', 'environment', 'management'] },
    };
    res.json(templates);
  } catch (error) {
    console.error("Error fetching templates:", error);
    res.status(500).json({ error: "Failed to fetch templates" });
  }
});

router.get("/analysis-tool-templates/fishbone/:category", requireAuth, async (req, res) => {
  try {
    const category = req.params.category;
    const commonCauses: Record<string, string[]> = {
      man: ['Training gap', 'Fatigue', 'Skill level', 'Communication', 'Supervision', 'Experience', 'Attitude', 'Physical ability'],
      machine: ['Tool wear', 'Equipment age', 'Calibration drift', 'Maintenance overdue', 'Setup error', 'Parameter drift', 'Fixture wear', 'Coolant issue'],
      material: ['Material variation', 'Wrong material', 'Supplier change', 'Contamination', 'Storage conditions', 'Batch variation', 'Incoming quality'],
      method: ['Procedure not followed', 'Procedure unclear', 'Work instruction missing', 'Process change', 'Sequence error', 'Cycle time variation'],
      measurement: ['Gage R&R failure', 'Wrong gage', 'Calibration expired', 'Measurement technique', 'Sample size', 'Resolution inadequate'],
      environment: ['Temperature', 'Humidity', 'Lighting', 'Cleanliness', 'Vibration', 'Noise', 'ESD'],
      management: ['Resource allocation', 'Planning', 'Priority conflict', 'Policy gap', 'Communication breakdown'],
      money: ['Budget constraint', 'Cost pressure', 'Investment delay', 'Resource limitation'],
    };

    const causes = commonCauses[category];
    if (!causes) return res.status(404).json({ error: "Category not found" });
    res.json({ causes });
  } catch (error) {
    console.error("Error fetching fishbone causes:", error);
    res.status(500).json({ error: "Failed to fetch causes" });
  }
});

// =============================================
// Cross-Tool Linking
// =============================================

router.post("/capas/:id/analysis-tools/:toolId/link", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    const toolId = parseInt(req.params.toolId);
    if (isNaN(capaId) || isNaN(toolId)) return res.status(400).json({ error: "Invalid ID" });
    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) return res.status(404).json({ error: "CAPA not found" });

    const tool = await storage.getCapaAnalysisTool(toolId);
    if (!tool || tool.capaId !== capaId) return res.status(404).json({ error: "Analysis tool not found" });

    const targetTool = await storage.getCapaAnalysisTool(req.body.targetToolId);
    if (!targetTool || targetTool.capaId !== capaId) return res.status(404).json({ error: "Target tool not found" });

    const data = parseToolData(tool);
    if (!data.links) data.links = [];
    data.links.push({
      targetToolId: req.body.targetToolId,
      linkType: req.body.linkType || 'supports',
      description: req.body.description || '',
      linkedAt: new Date().toISOString(),
      linkedBy: req.auth!.user.id,
    });

    await storage.updateCapaAnalysisTool(toolId, { data: JSON.stringify(data) });
    res.json({ message: "Link created" });
  } catch (error) {
    console.error("Error linking tools:", error);
    res.status(500).json({ error: "Failed to link tools" });
  }
});

router.get("/capas/:id/analysis-tools/:toolId/links", requireAuth, async (req, res) => {
  try {
    const capaId = parseInt(req.params.id);
    const toolId = parseInt(req.params.toolId);
    if (isNaN(capaId) || isNaN(toolId)) return res.status(400).json({ error: "Invalid ID" });
    const capaRecord = await storage.getCapa(capaId);
    if (!capaRecord || capaRecord.orgId !== req.orgId!) return res.status(404).json({ error: "CAPA not found" });

    const tool = await storage.getCapaAnalysisTool(toolId);
    if (!tool || tool.capaId !== capaId) return res.status(404).json({ error: "Analysis tool not found" });

    const data = parseToolData(tool);
    const links = data.links || [];

    // Enrich with target tool info
    const enriched = [];
    for (const link of links) {
      const target = await storage.getCapaAnalysisTool(link.targetToolId);
      enriched.push({ ...link, targetTool: target ? { id: target.id, toolType: target.toolType, name: target.name, status: target.status } : null });
    }

    res.json(enriched);
  } catch (error) {
    console.error("Error fetching tool links:", error);
    res.status(500).json({ error: "Failed to fetch tool links" });
  }
});

export { router };
