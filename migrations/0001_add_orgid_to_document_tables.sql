-- Migration: Add orgId to Phase-1 document tables
-- TASK-001: Multi-tenancy enforcement for document control module
-- Tables: document, document_revision, document_distribution, document_review, document_link

-- 1. Add org_id column to document table
ALTER TABLE "document" ADD COLUMN "org_id" uuid;
UPDATE "document" SET "org_id" = (SELECT "id" FROM "organization" LIMIT 1) WHERE "org_id" IS NULL;
ALTER TABLE "document" ALTER COLUMN "org_id" SET NOT NULL;
ALTER TABLE "document" ADD CONSTRAINT "document_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "organization"("id") ON DELETE CASCADE;
CREATE INDEX "document_org_id_idx" ON "document" ("org_id");

-- 2. Add org_id column to document_revision table
ALTER TABLE "document_revision" ADD COLUMN "org_id" uuid;
UPDATE "document_revision" SET "org_id" = (SELECT "org_id" FROM "document" WHERE "document"."id" = "document_revision"."document_id") WHERE "org_id" IS NULL;
ALTER TABLE "document_revision" ALTER COLUMN "org_id" SET NOT NULL;
ALTER TABLE "document_revision" ADD CONSTRAINT "document_revision_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "organization"("id") ON DELETE CASCADE;
CREATE INDEX "document_revision_org_id_idx" ON "document_revision" ("org_id");

-- 3. Add org_id column to document_distribution table
ALTER TABLE "document_distribution" ADD COLUMN "org_id" uuid;
UPDATE "document_distribution" SET "org_id" = (SELECT "org_id" FROM "document" WHERE "document"."id" = "document_distribution"."document_id") WHERE "org_id" IS NULL;
ALTER TABLE "document_distribution" ALTER COLUMN "org_id" SET NOT NULL;
ALTER TABLE "document_distribution" ADD CONSTRAINT "document_distribution_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "organization"("id") ON DELETE CASCADE;
CREATE INDEX "document_distribution_org_id_idx" ON "document_distribution" ("org_id");

-- 4. Add org_id column to document_review table
ALTER TABLE "document_review" ADD COLUMN "org_id" uuid;
UPDATE "document_review" SET "org_id" = (SELECT "org_id" FROM "document" WHERE "document"."id" = "document_review"."document_id") WHERE "org_id" IS NULL;
ALTER TABLE "document_review" ALTER COLUMN "org_id" SET NOT NULL;
ALTER TABLE "document_review" ADD CONSTRAINT "document_review_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "organization"("id") ON DELETE CASCADE;
CREATE INDEX "document_review_org_id_idx" ON "document_review" ("org_id");

-- 5. Add org_id column to document_link table
ALTER TABLE "document_link" ADD COLUMN "org_id" uuid;
UPDATE "document_link" SET "org_id" = (SELECT "org_id" FROM "document" WHERE "document"."id" = "document_link"."source_document_id") WHERE "org_id" IS NULL;
ALTER TABLE "document_link" ALTER COLUMN "org_id" SET NOT NULL;
ALTER TABLE "document_link" ADD CONSTRAINT "document_link_org_id_organization_id_fk" FOREIGN KEY ("org_id") REFERENCES "organization"("id") ON DELETE CASCADE;
CREATE INDEX "document_link_org_id_idx" ON "document_link" ("org_id");
