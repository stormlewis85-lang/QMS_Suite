import { Router } from "express";
import { db } from "../db";
import { eq, desc, and, count, sql } from "drizzle-orm";
import { pfmea, pfmeaRow, controlPlan, part, auditLog, user as userTable } from "@shared/schema";
import { getErrorMessage } from "./_helpers";

const router = Router();

router.get('/summary', async (req, res) => {
  try {
    const orgId = req.orgId!;

    const [partCount] = await db.select({ value: count() }).from(part).where(eq(part.orgId, orgId));
    const [pfmeaCount] = await db.select({ value: count() }).from(pfmea).where(eq(pfmea.orgId, orgId));
    const [cpCount] = await db.select({ value: count() }).from(controlPlan).where(eq(controlPlan.orgId, orgId));
    const [fmCount] = await db.select({ value: count() }).from(pfmeaRow)
      .innerJoin(pfmea, eq(pfmeaRow.pfmeaId, pfmea.id))
      .where(eq(pfmea.orgId, orgId));

    res.json({
      totalParts: partCount.value,
      totalPfmeas: pfmeaCount.value,
      totalControlPlans: cpCount.value,
      totalFailureModes: fmCount.value,
    });
  } catch (error) {
    console.error("Error fetching dashboard summary:", error);
    res.status(500).json({ error: "Failed to fetch dashboard summary" });
  }
});

router.get('/metrics', async (req, res) => {
  try {
    const orgId = req.orgId!;

    // Aggregate counts with SQL instead of loading full result sets
    const [partCount] = await db.select({ value: count() }).from(part).where(eq(part.orgId, orgId));
    const [cpCount] = await db.select({ value: count() }).from(controlPlan).where(eq(controlPlan.orgId, orgId));

    // PFMEA status breakdown
    const pfmeaStatusRows = await db.select({
      status: pfmea.status,
      value: count(),
    }).from(pfmea).where(eq(pfmea.orgId, orgId)).groupBy(pfmea.status);

    const pfmeaByStatus: Record<string, number> = { draft: 0, review: 0, effective: 0, superseded: 0 };
    let totalPfmeas = 0;
    for (const row of pfmeaStatusRows) {
      pfmeaByStatus[row.status] = row.value;
      totalPfmeas += row.value;
    }

    // Control Plan status breakdown
    const cpStatusRows = await db.select({
      status: controlPlan.status,
      value: count(),
    }).from(controlPlan).where(eq(controlPlan.orgId, orgId)).groupBy(controlPlan.status);

    const cpByStatus: Record<string, number> = { draft: 0, review: 0, effective: 0, superseded: 0 };
    for (const row of cpStatusRows) {
      cpByStatus[row.status] = row.value;
    }

    // AP distribution (join through pfmea for org scoping)
    const apRows = await db.select({
      ap: pfmeaRow.ap,
      value: count(),
    }).from(pfmeaRow)
      .innerJoin(pfmea, eq(pfmeaRow.pfmeaId, pfmea.id))
      .where(eq(pfmea.orgId, orgId))
      .groupBy(pfmeaRow.ap);

    const apDistribution: Record<string, number> = { high: 0, medium: 0, low: 0 };
    let totalFailureModes = 0;
    for (const row of apRows) {
      if (row.ap === 'H') apDistribution.high = row.value;
      else if (row.ap === 'M') apDistribution.medium = row.value;
      else if (row.ap === 'L') apDistribution.low = row.value;
      totalFailureModes += row.value;
    }

    const pendingReview = (pfmeaByStatus.review || 0) + (cpByStatus.review || 0);

    // High AP in draft PFMEAs
    const [highAPInDraftResult] = await db.select({ value: count() })
      .from(pfmeaRow)
      .innerJoin(pfmea, eq(pfmeaRow.pfmeaId, pfmea.id))
      .where(and(eq(pfmea.orgId, orgId), eq(pfmea.status, 'draft'), eq(pfmeaRow.ap, 'H')));

    // Parts without PFMEA
    const partsWithPfmeaSubquery = db.selectDistinct({ partId: pfmea.partId })
      .from(pfmea)
      .where(eq(pfmea.orgId, orgId));
    const [partsWithoutPfmeaResult] = await db.select({ value: count() })
      .from(part)
      .where(and(
        eq(part.orgId, orgId),
        sql`${part.id} NOT IN (${partsWithPfmeaSubquery})`
      ));

    // Recent activity — filter by actor's org membership
    const recentActivity = await db.select({
      id: auditLog.id,
      action: auditLog.action,
      entityType: auditLog.entityType,
      entityId: auditLog.entityId,
      actor: auditLog.actor,
      at: auditLog.at,
    }).from(auditLog)
      .innerJoin(userTable, eq(auditLog.actor, userTable.id))
      .where(eq(userTable.orgId, orgId))
      .orderBy(desc(auditLog.at))
      .limit(10);

    res.json({
      summary: {
        totalParts: partCount.value,
        totalPfmeas,
        totalControlPlans: cpCount.value,
        totalFailureModes,
        pendingReview,
        highAPItems: apDistribution.high,
        highAPInDraft: highAPInDraftResult.value,
        partsWithoutPfmea: partsWithoutPfmeaResult.value,
      },
      pfmeaByStatus,
      cpByStatus,
      apDistribution,
      recentActivity,
    });
  } catch (error: unknown) {
    res.status(500).json({ error: getErrorMessage(error) });
  }
});

export { router as dashboardRouter };
