-- Migration: Add orgId to remaining non-child tables
-- TASK-009: Defense-in-depth for multi-tenancy
-- Affected: actionItem, notifications, auditLog, signature, ownership, calibrationLink

-- ============================================================
-- 1. action_item — backfill via pfmeaRow → pfmea.org_id
-- ============================================================

ALTER TABLE "action_item" ADD COLUMN "org_id" uuid;

UPDATE "action_item" ai
SET "org_id" = p."org_id"
FROM "pfmea_row" pr
JOIN "pfmea" p ON pr."pfmea_id" = p."id"
WHERE ai."pfmea_row_id" = pr."id";

-- Set NOT NULL after backfill
ALTER TABLE "action_item" ALTER COLUMN "org_id" SET NOT NULL;

ALTER TABLE "action_item" ADD CONSTRAINT "action_item_org_id_organization_id_fk"
  FOREIGN KEY ("org_id") REFERENCES "organization"("id") ON DELETE CASCADE;

CREATE INDEX "action_item_org_idx" ON "action_item" ("org_id");

-- ============================================================
-- 2. notifications — backfill via userId → user.org_id
-- ============================================================

ALTER TABLE "notifications" ADD COLUMN "org_id" uuid;

UPDATE "notifications" n
SET "org_id" = u."org_id"
FROM "user" u
WHERE n."user_id" = u."id"::text;

-- Set NOT NULL after backfill
ALTER TABLE "notifications" ALTER COLUMN "org_id" SET NOT NULL;

ALTER TABLE "notifications" ADD CONSTRAINT "notifications_org_id_organization_id_fk"
  FOREIGN KEY ("org_id") REFERENCES "organization"("id") ON DELETE CASCADE;

CREATE INDEX "notifications_org_idx" ON "notifications" ("org_id");

-- ============================================================
-- 3. audit_log — backfill via actor → user.org_id
-- ============================================================

ALTER TABLE "audit_log" ADD COLUMN "org_id" uuid;

UPDATE "audit_log" al
SET "org_id" = u."org_id"
FROM "user" u
WHERE al."actor" = u."id";

-- Set NOT NULL after backfill
ALTER TABLE "audit_log" ALTER COLUMN "org_id" SET NOT NULL;

ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_org_id_organization_id_fk"
  FOREIGN KEY ("org_id") REFERENCES "organization"("id") ON DELETE CASCADE;

CREATE INDEX "audit_log_org_idx" ON "audit_log" ("org_id");

-- ============================================================
-- 4. signature — backfill via signerUserId → user.org_id
-- ============================================================

ALTER TABLE "signature" ADD COLUMN "org_id" uuid;

UPDATE "signature" s
SET "org_id" = u."org_id"
FROM "user" u
WHERE s."signer_user_id" = u."id"::text;

-- Set NOT NULL after backfill
ALTER TABLE "signature" ALTER COLUMN "org_id" SET NOT NULL;

ALTER TABLE "signature" ADD CONSTRAINT "signature_org_id_organization_id_fk"
  FOREIGN KEY ("org_id") REFERENCES "organization"("id") ON DELETE CASCADE;

CREATE INDEX "signature_org_idx" ON "signature" ("org_id");

-- ============================================================
-- 5. ownership — backfill via ownerUserId → user.org_id
-- ============================================================

ALTER TABLE "ownership" ADD COLUMN "org_id" uuid;

UPDATE "ownership" o
SET "org_id" = u."org_id"
FROM "user" u
WHERE o."owner_user_id" = u."id"::text;

-- Set NOT NULL after backfill
ALTER TABLE "ownership" ALTER COLUMN "org_id" SET NOT NULL;

ALTER TABLE "ownership" ADD CONSTRAINT "ownership_org_id_organization_id_fk"
  FOREIGN KEY ("org_id") REFERENCES "organization"("id") ON DELETE CASCADE;

CREATE INDEX "ownership_org_idx" ON "ownership" ("org_id");

-- ============================================================
-- 6. calibration_link — backfill via gageId → gage_library.org_id
-- ============================================================

ALTER TABLE "calibration_link" ADD COLUMN "org_id" uuid;

UPDATE "calibration_link" cl
SET "org_id" = gl."org_id"
FROM "gage_library" gl
WHERE cl."gage_id" = gl."id";

-- Set NOT NULL after backfill
ALTER TABLE "calibration_link" ALTER COLUMN "org_id" SET NOT NULL;

ALTER TABLE "calibration_link" ADD CONSTRAINT "calibration_link_org_id_organization_id_fk"
  FOREIGN KEY ("org_id") REFERENCES "organization"("id") ON DELETE CASCADE;

CREATE INDEX "calibration_link_org_idx" ON "calibration_link" ("org_id");
