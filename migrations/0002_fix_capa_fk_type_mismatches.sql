-- Migration: Fix CAPA-to-Core FK type mismatches
-- TASK-003: Change integer columns to uuid to match referenced table PK types
-- Affected: capaSource (3 cols), capaAttachment (1 col), capaD8Closure (1 col)

-- 1. capaSource.pfmea_id: integer → uuid
ALTER TABLE "capa_source" ALTER COLUMN "pfmea_id" TYPE uuid USING "pfmea_id"::text::uuid;

-- 2. capaSource.pfmea_row_id: integer → uuid
ALTER TABLE "capa_source" ALTER COLUMN "pfmea_row_id" TYPE uuid USING "pfmea_row_id"::text::uuid;

-- 3. capaSource.control_plan_id: integer → uuid
ALTER TABLE "capa_source" ALTER COLUMN "control_plan_id" TYPE uuid USING "control_plan_id"::text::uuid;

-- 4. capaAttachment.linked_document_id: integer → uuid
ALTER TABLE "capa_attachment" ALTER COLUMN "linked_document_id" TYPE uuid USING "linked_document_id"::text::uuid;

-- 5. capaD8Closure.final_report_document_id: integer → uuid
ALTER TABLE "capa_d8_closure" ALTER COLUMN "final_report_document_id" TYPE uuid USING "final_report_document_id"::text::uuid;
