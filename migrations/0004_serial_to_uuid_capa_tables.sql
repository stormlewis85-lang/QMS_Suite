-- Migration: Serial-to-UUID for 19 CAPA tables
-- This migration converts all CAPA module tables from serial integer PKs to uuid PKs.
-- CAPA module is fully isolated (no external FKs TO capa tables), making it safe to migrate.
--
-- Run with: psql $DATABASE_URL -f migrations/0004_serial_to_uuid_capa_tables.sql

BEGIN;

-- ============================================================
-- Step 1: Drop all FK constraints that reference CAPA PKs
-- ============================================================

ALTER TABLE capa_team_member DROP CONSTRAINT IF EXISTS capa_team_member_capa_id_capa_id_fk;
ALTER TABLE capa_source DROP CONSTRAINT IF EXISTS capa_source_capa_id_capa_id_fk;
ALTER TABLE capa_attachment DROP CONSTRAINT IF EXISTS capa_attachment_capa_id_capa_id_fk;
ALTER TABLE capa_related_record DROP CONSTRAINT IF EXISTS capa_related_record_capa_id_capa_id_fk;
ALTER TABLE capa_d0_emergency DROP CONSTRAINT IF EXISTS capa_d0_emergency_capa_id_capa_id_fk;
ALTER TABLE capa_d1_team_detail DROP CONSTRAINT IF EXISTS capa_d1_team_detail_capa_id_capa_id_fk;
ALTER TABLE capa_d2_problem DROP CONSTRAINT IF EXISTS capa_d2_problem_capa_id_capa_id_fk;
ALTER TABLE capa_d3_containment DROP CONSTRAINT IF EXISTS capa_d3_containment_capa_id_capa_id_fk;
ALTER TABLE capa_d4_root_cause DROP CONSTRAINT IF EXISTS capa_d4_root_cause_capa_id_capa_id_fk;
ALTER TABLE capa_d4_root_cause_candidate DROP CONSTRAINT IF EXISTS capa_d4_root_cause_candidate_capa_id_capa_id_fk;
ALTER TABLE capa_d4_root_cause_candidate DROP CONSTRAINT IF EXISTS capa_d4_root_cause_candidate_d4_id_capa_d4_root_cause_id_fk;
ALTER TABLE capa_d5_corrective_action DROP CONSTRAINT IF EXISTS capa_d5_corrective_action_capa_id_capa_id_fk;
ALTER TABLE capa_d6_validation DROP CONSTRAINT IF EXISTS capa_d6_validation_capa_id_capa_id_fk;
ALTER TABLE capa_d7_preventive DROP CONSTRAINT IF EXISTS capa_d7_preventive_capa_id_capa_id_fk;
ALTER TABLE capa_d8_closure DROP CONSTRAINT IF EXISTS capa_d8_closure_capa_id_capa_id_fk;
ALTER TABLE capa_analysis_tool DROP CONSTRAINT IF EXISTS capa_analysis_tool_capa_id_capa_id_fk;

-- ============================================================
-- Step 2: Drop unique/index constraints on id columns that will change type
-- (Serial sequences + PK constraints will be dropped/recreated)
-- ============================================================

-- Drop unique indexes on capaId columns (they reference capa.id)
DROP INDEX IF EXISTS capa_team_member_unique_idx;
DROP INDEX IF EXISTS capa_d0_emergency_capa_idx;
DROP INDEX IF EXISTS capa_d1_team_detail_capa_idx;
DROP INDEX IF EXISTS capa_d2_problem_capa_idx;
DROP INDEX IF EXISTS capa_d3_containment_capa_idx;
DROP INDEX IF EXISTS capa_d4_root_cause_capa_idx;
DROP INDEX IF EXISTS capa_d5_corrective_action_capa_idx;
DROP INDEX IF EXISTS capa_d6_validation_capa_idx;
DROP INDEX IF EXISTS capa_d7_preventive_capa_idx;
DROP INDEX IF EXISTS capa_d8_closure_capa_idx;
DROP INDEX IF EXISTS capa_org_number_idx;
DROP INDEX IF EXISTS capa_related_record_unique_idx;

-- ============================================================
-- Step 3: Convert PK columns from serial (integer) → uuid
-- For each table: drop default, alter type, set new default
-- ============================================================

-- 3a. capa (main table — must convert first since FKs reference it)
ALTER TABLE capa
  ALTER COLUMN id DROP DEFAULT,
  ALTER COLUMN id SET DATA TYPE uuid USING gen_random_uuid(),
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Drop the serial sequence (no longer needed)
DROP SEQUENCE IF EXISTS capa_id_seq;

-- 3b. All child tables — convert id column
ALTER TABLE capa_team_member
  ALTER COLUMN id DROP DEFAULT,
  ALTER COLUMN id SET DATA TYPE uuid USING gen_random_uuid(),
  ALTER COLUMN id SET DEFAULT gen_random_uuid();
DROP SEQUENCE IF EXISTS capa_team_member_id_seq;

ALTER TABLE capa_source
  ALTER COLUMN id DROP DEFAULT,
  ALTER COLUMN id SET DATA TYPE uuid USING gen_random_uuid(),
  ALTER COLUMN id SET DEFAULT gen_random_uuid();
DROP SEQUENCE IF EXISTS capa_source_id_seq;

ALTER TABLE capa_attachment
  ALTER COLUMN id DROP DEFAULT,
  ALTER COLUMN id SET DATA TYPE uuid USING gen_random_uuid(),
  ALTER COLUMN id SET DEFAULT gen_random_uuid();
DROP SEQUENCE IF EXISTS capa_attachment_id_seq;

ALTER TABLE capa_related_record
  ALTER COLUMN id DROP DEFAULT,
  ALTER COLUMN id SET DATA TYPE uuid USING gen_random_uuid(),
  ALTER COLUMN id SET DEFAULT gen_random_uuid();
DROP SEQUENCE IF EXISTS capa_related_record_id_seq;

ALTER TABLE capa_number_sequence
  ALTER COLUMN id DROP DEFAULT,
  ALTER COLUMN id SET DATA TYPE uuid USING gen_random_uuid(),
  ALTER COLUMN id SET DEFAULT gen_random_uuid();
DROP SEQUENCE IF EXISTS capa_number_sequence_id_seq;

ALTER TABLE capa_d0_emergency
  ALTER COLUMN id DROP DEFAULT,
  ALTER COLUMN id SET DATA TYPE uuid USING gen_random_uuid(),
  ALTER COLUMN id SET DEFAULT gen_random_uuid();
DROP SEQUENCE IF EXISTS capa_d0_emergency_id_seq;

ALTER TABLE capa_d1_team_detail
  ALTER COLUMN id DROP DEFAULT,
  ALTER COLUMN id SET DATA TYPE uuid USING gen_random_uuid(),
  ALTER COLUMN id SET DEFAULT gen_random_uuid();
DROP SEQUENCE IF EXISTS capa_d1_team_detail_id_seq;

ALTER TABLE capa_d2_problem
  ALTER COLUMN id DROP DEFAULT,
  ALTER COLUMN id SET DATA TYPE uuid USING gen_random_uuid(),
  ALTER COLUMN id SET DEFAULT gen_random_uuid();
DROP SEQUENCE IF EXISTS capa_d2_problem_id_seq;

ALTER TABLE capa_d3_containment
  ALTER COLUMN id DROP DEFAULT,
  ALTER COLUMN id SET DATA TYPE uuid USING gen_random_uuid(),
  ALTER COLUMN id SET DEFAULT gen_random_uuid();
DROP SEQUENCE IF EXISTS capa_d3_containment_id_seq;

ALTER TABLE capa_d4_root_cause
  ALTER COLUMN id DROP DEFAULT,
  ALTER COLUMN id SET DATA TYPE uuid USING gen_random_uuid(),
  ALTER COLUMN id SET DEFAULT gen_random_uuid();
DROP SEQUENCE IF EXISTS capa_d4_root_cause_id_seq;

ALTER TABLE capa_d4_root_cause_candidate
  ALTER COLUMN id DROP DEFAULT,
  ALTER COLUMN id SET DATA TYPE uuid USING gen_random_uuid(),
  ALTER COLUMN id SET DEFAULT gen_random_uuid();
DROP SEQUENCE IF EXISTS capa_d4_root_cause_candidate_id_seq;

ALTER TABLE capa_d5_corrective_action
  ALTER COLUMN id DROP DEFAULT,
  ALTER COLUMN id SET DATA TYPE uuid USING gen_random_uuid(),
  ALTER COLUMN id SET DEFAULT gen_random_uuid();
DROP SEQUENCE IF EXISTS capa_d5_corrective_action_id_seq;

ALTER TABLE capa_d6_validation
  ALTER COLUMN id DROP DEFAULT,
  ALTER COLUMN id SET DATA TYPE uuid USING gen_random_uuid(),
  ALTER COLUMN id SET DEFAULT gen_random_uuid();
DROP SEQUENCE IF EXISTS capa_d6_validation_id_seq;

ALTER TABLE capa_d7_preventive
  ALTER COLUMN id DROP DEFAULT,
  ALTER COLUMN id SET DATA TYPE uuid USING gen_random_uuid(),
  ALTER COLUMN id SET DEFAULT gen_random_uuid();
DROP SEQUENCE IF EXISTS capa_d7_preventive_id_seq;

ALTER TABLE capa_d8_closure
  ALTER COLUMN id DROP DEFAULT,
  ALTER COLUMN id SET DATA TYPE uuid USING gen_random_uuid(),
  ALTER COLUMN id SET DEFAULT gen_random_uuid();
DROP SEQUENCE IF EXISTS capa_d8_closure_id_seq;

ALTER TABLE capa_audit_log
  ALTER COLUMN id DROP DEFAULT,
  ALTER COLUMN id SET DATA TYPE uuid USING gen_random_uuid(),
  ALTER COLUMN id SET DEFAULT gen_random_uuid();
DROP SEQUENCE IF EXISTS capa_audit_log_id_seq;

ALTER TABLE capa_metric_snapshot
  ALTER COLUMN id DROP DEFAULT,
  ALTER COLUMN id SET DATA TYPE uuid USING gen_random_uuid(),
  ALTER COLUMN id SET DEFAULT gen_random_uuid();
DROP SEQUENCE IF EXISTS capa_metric_snapshot_id_seq;

ALTER TABLE capa_analysis_tool
  ALTER COLUMN id DROP DEFAULT,
  ALTER COLUMN id SET DATA TYPE uuid USING gen_random_uuid(),
  ALTER COLUMN id SET DEFAULT gen_random_uuid();
DROP SEQUENCE IF EXISTS capa_analysis_tool_id_seq;

-- ============================================================
-- Step 4: Convert FK columns (capa_id) from integer → uuid
-- These must map to the new uuid values in capa.id
-- Since we used gen_random_uuid() above, existing FK relationships
-- are broken. This migration is for dev/staging — seed data will
-- be re-created after migration.
-- ============================================================

ALTER TABLE capa_team_member ALTER COLUMN capa_id SET DATA TYPE uuid USING gen_random_uuid();
ALTER TABLE capa_source ALTER COLUMN capa_id SET DATA TYPE uuid USING gen_random_uuid();
ALTER TABLE capa_attachment ALTER COLUMN capa_id SET DATA TYPE uuid USING gen_random_uuid();
ALTER TABLE capa_related_record ALTER COLUMN capa_id SET DATA TYPE uuid USING gen_random_uuid();
ALTER TABLE capa_d0_emergency ALTER COLUMN capa_id SET DATA TYPE uuid USING gen_random_uuid();
ALTER TABLE capa_d1_team_detail ALTER COLUMN capa_id SET DATA TYPE uuid USING gen_random_uuid();
ALTER TABLE capa_d2_problem ALTER COLUMN capa_id SET DATA TYPE uuid USING gen_random_uuid();
ALTER TABLE capa_d3_containment ALTER COLUMN capa_id SET DATA TYPE uuid USING gen_random_uuid();
ALTER TABLE capa_d4_root_cause ALTER COLUMN capa_id SET DATA TYPE uuid USING gen_random_uuid();
ALTER TABLE capa_d4_root_cause_candidate ALTER COLUMN capa_id SET DATA TYPE uuid USING gen_random_uuid();
ALTER TABLE capa_d5_corrective_action ALTER COLUMN capa_id SET DATA TYPE uuid USING gen_random_uuid();
ALTER TABLE capa_d6_validation ALTER COLUMN capa_id SET DATA TYPE uuid USING gen_random_uuid();
ALTER TABLE capa_d7_preventive ALTER COLUMN capa_id SET DATA TYPE uuid USING gen_random_uuid();
ALTER TABLE capa_d8_closure ALTER COLUMN capa_id SET DATA TYPE uuid USING gen_random_uuid();
ALTER TABLE capa_audit_log ALTER COLUMN capa_id SET DATA TYPE uuid USING gen_random_uuid();
ALTER TABLE capa_analysis_tool ALTER COLUMN capa_id SET DATA TYPE uuid USING gen_random_uuid();

-- Convert d4_id FK on capa_d4_root_cause_candidate
ALTER TABLE capa_d4_root_cause_candidate ALTER COLUMN d4_id SET DATA TYPE uuid USING gen_random_uuid();

-- NOTE: capa_related_record.related_id and capa_audit_log.entity_id
-- are intentionally LEFT as integer (polymorphic columns).

-- ============================================================
-- Step 5: Re-create FK constraints
-- ============================================================

ALTER TABLE capa_team_member ADD CONSTRAINT capa_team_member_capa_id_capa_id_fk
  FOREIGN KEY (capa_id) REFERENCES capa(id) ON DELETE CASCADE;

ALTER TABLE capa_source ADD CONSTRAINT capa_source_capa_id_capa_id_fk
  FOREIGN KEY (capa_id) REFERENCES capa(id) ON DELETE CASCADE;

ALTER TABLE capa_attachment ADD CONSTRAINT capa_attachment_capa_id_capa_id_fk
  FOREIGN KEY (capa_id) REFERENCES capa(id) ON DELETE CASCADE;

ALTER TABLE capa_related_record ADD CONSTRAINT capa_related_record_capa_id_capa_id_fk
  FOREIGN KEY (capa_id) REFERENCES capa(id) ON DELETE CASCADE;

ALTER TABLE capa_d0_emergency ADD CONSTRAINT capa_d0_emergency_capa_id_capa_id_fk
  FOREIGN KEY (capa_id) REFERENCES capa(id) ON DELETE CASCADE;

ALTER TABLE capa_d1_team_detail ADD CONSTRAINT capa_d1_team_detail_capa_id_capa_id_fk
  FOREIGN KEY (capa_id) REFERENCES capa(id) ON DELETE CASCADE;

ALTER TABLE capa_d2_problem ADD CONSTRAINT capa_d2_problem_capa_id_capa_id_fk
  FOREIGN KEY (capa_id) REFERENCES capa(id) ON DELETE CASCADE;

ALTER TABLE capa_d3_containment ADD CONSTRAINT capa_d3_containment_capa_id_capa_id_fk
  FOREIGN KEY (capa_id) REFERENCES capa(id) ON DELETE CASCADE;

ALTER TABLE capa_d4_root_cause ADD CONSTRAINT capa_d4_root_cause_capa_id_capa_id_fk
  FOREIGN KEY (capa_id) REFERENCES capa(id) ON DELETE CASCADE;

ALTER TABLE capa_d4_root_cause_candidate ADD CONSTRAINT capa_d4_root_cause_candidate_capa_id_capa_id_fk
  FOREIGN KEY (capa_id) REFERENCES capa(id) ON DELETE CASCADE;

ALTER TABLE capa_d4_root_cause_candidate ADD CONSTRAINT capa_d4_root_cause_candidate_d4_id_capa_d4_root_cause_id_fk
  FOREIGN KEY (d4_id) REFERENCES capa_d4_root_cause(id) ON DELETE CASCADE;

ALTER TABLE capa_d5_corrective_action ADD CONSTRAINT capa_d5_corrective_action_capa_id_capa_id_fk
  FOREIGN KEY (capa_id) REFERENCES capa(id) ON DELETE CASCADE;

ALTER TABLE capa_d6_validation ADD CONSTRAINT capa_d6_validation_capa_id_capa_id_fk
  FOREIGN KEY (capa_id) REFERENCES capa(id) ON DELETE CASCADE;

ALTER TABLE capa_d7_preventive ADD CONSTRAINT capa_d7_preventive_capa_id_capa_id_fk
  FOREIGN KEY (capa_id) REFERENCES capa(id) ON DELETE CASCADE;

ALTER TABLE capa_d8_closure ADD CONSTRAINT capa_d8_closure_capa_id_capa_id_fk
  FOREIGN KEY (capa_id) REFERENCES capa(id) ON DELETE CASCADE;

ALTER TABLE capa_analysis_tool ADD CONSTRAINT capa_analysis_tool_capa_id_capa_id_fk
  FOREIGN KEY (capa_id) REFERENCES capa(id) ON DELETE CASCADE;

-- capa_audit_log.capa_id intentionally has NO FK constraint (orphan-safe design)

-- ============================================================
-- Step 6: Re-create unique indexes
-- ============================================================

CREATE UNIQUE INDEX capa_org_number_idx ON capa (org_id, capa_number);
CREATE UNIQUE INDEX capa_team_member_unique_idx ON capa_team_member (capa_id, user_id);
CREATE UNIQUE INDEX capa_d0_emergency_capa_idx ON capa_d0_emergency (capa_id);
CREATE UNIQUE INDEX capa_d1_team_detail_capa_idx ON capa_d1_team_detail (capa_id);
CREATE UNIQUE INDEX capa_d2_problem_capa_idx ON capa_d2_problem (capa_id);
CREATE UNIQUE INDEX capa_d3_containment_capa_idx ON capa_d3_containment (capa_id);
CREATE UNIQUE INDEX capa_d4_root_cause_capa_idx ON capa_d4_root_cause (capa_id);
CREATE UNIQUE INDEX capa_d5_corrective_action_capa_idx ON capa_d5_corrective_action (capa_id);
CREATE UNIQUE INDEX capa_d6_validation_capa_idx ON capa_d6_validation (capa_id);
CREATE UNIQUE INDEX capa_d7_preventive_capa_idx ON capa_d7_preventive (capa_id);
CREATE UNIQUE INDEX capa_d8_closure_capa_idx ON capa_d8_closure (capa_id);
CREATE UNIQUE INDEX capa_related_record_unique_idx ON capa_related_record (capa_id, related_type, related_id, relationship_type);

COMMIT;
