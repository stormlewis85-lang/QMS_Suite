import { pgTable, text, integer, real, jsonb, timestamp, boolean, uuid, pgEnum, index, uniqueIndex, serial } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

// Enums
export const statusEnum = pgEnum('status', ['draft', 'review', 'effective', 'superseded', 'obsolete']);
export const changeStatusEnum = pgEnum('change_status', ['draft', 'impact_analysis', 'auto_review', 'pending_signatures', 'effective', 'cancelled']);
export const roleEnum = pgEnum('role', ['library_maintainer', 'part_engineer', 'qe', 'process_owner', 'quality_manager', 'auditor']);
export const failureModeCategoryEnum = pgEnum('failure_mode_category', [
  'dimensional',
  'visual',
  'functional',
  'assembly',
  'material',
  'process',
  'contamination',
  'environmental'
]);

// Controls Library Enums
export const controlTypeEnum = pgEnum('control_type', ['prevention', 'detection']);
export const controlEffectivenessEnum = pgEnum('control_effectiveness', ['high', 'medium', 'low']);
export const msaStatusEnum = pgEnum('msa_status', ['approved', 'planned', 'failed', 'not_required']);

// NEW: Control Category Enum (for auto-scoring Detection)
export const controlCategoryEnum = pgEnum('control_category', [
  'error_proofing_prevent',  // D=1: Prevents defect from being made
  'error_proofing_detect',   // D=2: Detects at station, stops process
  'automated_100_percent',   // D=3: Automated inspection every part
  'spc_immediate',           // D=4-5: SPC with immediate feedback
  'manual_gage',             // D=6-7: Manual measurement with gage
  'visual_standard',         // D=8: Visual with standard/sample
  'visual_only',             // D=9: Visual check, operator discretion
  'none'                     // D=10: No detection
]);

// NEW: Effect Category Enum (for auto-scoring Severity)
export const effectCategoryEnum = pgEnum('effect_category', [
  'safety_no_warning',       // S=10: Hazardous without warning
  'safety_with_warning',     // S=9: Hazardous with warning
  'regulatory_noncompliance',// S=9: Regulatory non-compliance
  'function_loss',           // S=8: Vehicle/item inoperable
  'function_degraded',       // S=7: Vehicle/item operable, reduced performance
  'comfort_loss',            // S=6: Comfort/convenience inoperable
  'comfort_reduced',         // S=5: Comfort/convenience reduced
  'appearance_obvious',      // S=4: Fit/finish noticed by most customers
  'appearance_subtle',       // S=3: Fit/finish noticed by some customers
  'appearance_minor',        // S=2: Fit/finish noticed by discriminating customers
  'none'                     // S=1: No discernible effect
]);

// Document Control Enums
export const documentTypeEnum = pgEnum('document_type', [
  'procedure',
  'work_instruction',
  'form',
  'specification',
  'standard',
  'drawing',
  'customer_spec',
  'external',
  'policy',
  'record',
]);

// NEW: Auto-Review Finding Level
export const findingLevelEnum = pgEnum('finding_level', ['error', 'warning', 'info']);
export const findingCategoryEnum = pgEnum('finding_category', ['coverage', 'effectiveness', 'document_control', 'scoring', 'csr']);

// User role enum for RBAC
export const userRoleEnum = pgEnum('user_role', [
  'admin',           // Full organization access
  'quality_manager', // Approve documents, manage users
  'engineer',        // Create/edit documents
  'viewer'           // Read-only access
]);

// User status
export const userStatusEnum = pgEnum('user_status', ['active', 'inactive', 'pending']);

// ==========================================
// Core Platform Tables (Organization, User, Session)
// ==========================================

export const organization = pgTable('organization', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(), // URL-safe identifier: "acme-corp"
  settings: jsonb('settings').$type<{
    defaultTimezone?: string;
    dateFormat?: string;
    logoUrl?: string;
  }>().default({}),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  slugIdx: uniqueIndex('organization_slug_idx').on(table.slug),
}));

export const user = pgTable('user', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  passwordHash: text('password_hash').notNull(), // bcrypt hash
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  role: userRoleEnum('role').notNull().default('viewer'),
  status: userStatusEnum('status').notNull().default('active'),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  orgEmailIdx: uniqueIndex('user_org_email_idx').on(table.orgId, table.email),
  orgIdx: index('user_org_idx').on(table.orgId),
  emailIdx: index('user_email_idx').on(table.email),
}));

export const session = pgTable('session', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(), // Random 64-char token
  expiresAt: timestamp('expires_at').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  tokenIdx: uniqueIndex('session_token_idx').on(table.token),
  userIdx: index('session_user_idx').on(table.userId),
  expiresIdx: index('session_expires_idx').on(table.expiresAt),
}));

// Process Library Tables
export const processDef = pgTable('process_def', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  rev: text('rev').notNull(),
  status: statusEnum('status').notNull().default('draft'),
  effectiveFrom: timestamp('effective_from'),
  supersedesId: uuid('supersedes_id').references((): any => processDef.id, { onDelete: 'set null' }),
  changeNote: text('change_note'),
  createdBy: uuid('created_by').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  nameRevIdx: uniqueIndex('process_def_name_rev_idx').on(table.orgId, table.name, table.rev),
  statusIdx: index('process_def_status_idx').on(table.status),
  orgIdx: index('process_def_org_idx').on(table.orgId),
}));

// Step type enum for process steps
export const stepTypeEnum = pgEnum('step_type', ['operation', 'group', 'subprocess_ref']);

// Process Flow Symbol enum for visual classification
export const processSymbolEnum = pgEnum('process_symbol', ['operation', 'inspection', 'storage', 'transportation', 'decision', 'cqt']);

export const processStep = pgTable('process_step', {
  id: uuid('id').primaryKey().defaultRandom(),
  processDefId: uuid('process_def_id').notNull().references(() => processDef.id, { onDelete: 'cascade' }),
  seq: integer('seq').notNull(),
  name: text('name').notNull(),
  area: text('area').notNull(),
  equipment: jsonb('equipment').$type<{ name: string; model?: string; settings?: Record<string, any> }[]>(),
  equipmentIds: jsonb('equipment_ids').$type<string[]>().default([]),
  branchTo: text('branch_to'),
  reworkTo: text('rework_to'),
  symbol: text('symbol'),
  keyInputs: text('key_inputs'),
  keyOutputs: text('key_outputs'),
  controlMethod: text('control_method'),
  stepType: stepTypeEnum('step_type').notNull().default('operation'),
  parentStepId: uuid('parent_step_id').references((): any => processStep.id, { onDelete: 'cascade' }),
  subprocessRefId: uuid('subprocess_ref_id').references(() => processDef.id, { onDelete: 'set null' }),
  subprocessRev: text('subprocess_rev'),
  collapsed: boolean('collapsed').default(false),
}, (table) => ({
  processDefSeqIdx: uniqueIndex('process_step_def_seq_idx').on(table.processDefId, table.seq),
  parentStepIdx: index('process_step_parent_idx').on(table.parentStepId),
  subprocessRefIdx: index('process_step_subprocess_ref_idx').on(table.subprocessRefId),
}));

export const fmeaTemplateRow = pgTable('fmea_template_row', {
  id: uuid('id').primaryKey().defaultRandom(),
  processDefId: uuid('process_def_id').notNull().references(() => processDef.id, { onDelete: 'cascade' }),
  stepId: uuid('step_id').notNull().references(() => processStep.id, { onDelete: 'cascade' }),
  function: text('function').notNull(),
  requirement: text('requirement').notNull(),
  failureMode: text('failure_mode').notNull(),
  effect: text('effect').notNull(),
  severity: integer('severity').notNull(),
  cause: text('cause').notNull(),
  occurrence: integer('occurrence').notNull(),
  preventionControls: jsonb('prevention_controls').$type<string[]>().notNull().default([]),
  detectionControls: jsonb('detection_controls').$type<string[]>().notNull().default([]),
  detection: integer('detection').notNull(),
  ap: text('ap').notNull(),
  specialFlag: boolean('special_flag').notNull().default(false),
  csrSymbol: text('csr_symbol'),
  classColumn: text('class_column'),
  notes: text('notes'),
  defaultResponsibility: text('default_responsibility'),
  // NEW: Scoring metadata for auto-calculation
  effectCategory: text('effect_category'),
  severityJustification: text('severity_justification'),
  occurrenceMethod: text('occurrence_method'),
  cpkValue: text('cpk_value'),
  occurrenceJustification: text('occurrence_justification'),
  detectionControlId: uuid('detection_control_id'),
  detectionJustification: text('detection_justification'),
}, (table) => ({
  processDefIdx: index('fmea_template_process_def_idx').on(table.processDefId),
  stepIdx: index('fmea_template_step_idx').on(table.stepId),
}));

export const controlTemplateRow = pgTable('control_template_row', {
  id: uuid('id').primaryKey().defaultRandom(),
  processDefId: uuid('process_def_id').notNull().references(() => processDef.id, { onDelete: 'cascade' }),
  sourceTemplateRowId: uuid('source_template_row_id').references(() => fmeaTemplateRow.id, { onDelete: 'cascade' }),
  characteristicName: text('characteristic_name').notNull(),
  charId: text('char_id').notNull(),
  type: text('type').notNull(),
  classColumn: text('class_column'),
  specification: text('specification'),
  target: text('target'),
  tolerance: text('tolerance'),
  specialFlag: boolean('special_flag').notNull().default(false),
  csrSymbol: text('csr_symbol'),
  measurementSystem: text('measurement_system'),
  gageDetails: text('gage_details'),
  defaultSampleSize: text('default_sample_size'),
  defaultFrequency: text('default_frequency'),
  controlMethod: text('control_method'),
  acceptanceCriteria: text('acceptance_criteria'),
  reactionPlan: text('reaction_plan'),
  defaultResponsibility: text('default_responsibility'),
}, (table) => ({
  processDefIdx: index('control_template_process_def_idx').on(table.processDefId),
  sourceRowIdx: index('control_template_source_row_idx').on(table.sourceTemplateRowId),
  charIdIdx: index('control_template_char_id_idx').on(table.charId),
}));

// Library Tables
export const gageLibrary = pgTable('gage_library', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  model: text('model'),
  resolution: text('resolution'),
  calibrationIntervalDays: integer('calibration_interval_days'),
  status: text('status').notNull().default('active'),
}, (table) => ({
  orgNameIdx: uniqueIndex('gage_library_org_name_idx').on(table.orgId, table.name),
  orgIdx: index('gage_library_org_idx').on(table.orgId),
}));

export const ratingScale = pgTable('rating_scale', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  version: text('version').notNull(),
  kind: text('kind').notNull(),
  tableJson: jsonb('table_json').$type<{ rating: number; description: string; criteria: string }[]>().notNull(),
}, (table) => ({
  versionKindIdx: uniqueIndex('rating_scale_version_kind_idx').on(table.orgId, table.version, table.kind),
  orgIdx: index('rating_scale_org_idx').on(table.orgId),
}));

// Equipment Library Tables
export const equipmentLibrary = pgTable('equipment_library', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  name: text('name').notNull(),
  manufacturer: text('manufacturer'),
  model: text('model'),
  tonnage: integer('tonnage'),
  serialNumber: text('serial_number'),
  location: text('location'),
  status: text('status').notNull().default('active'),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  orgNameIdx: uniqueIndex('equipment_library_org_name_idx').on(table.orgId, table.name),
  orgIdx: index('equipment_library_org_idx').on(table.orgId),
}));

export const equipmentErrorProofing = pgTable('equipment_error_proofing', {
  id: uuid('id').primaryKey().defaultRandom(),
  equipmentId: uuid('equipment_id').notNull().references(() => equipmentLibrary.id, { onDelete: 'cascade' }),
  controlType: text('control_type').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  failureModesAddressed: jsonb('failure_modes_addressed').$type<string[]>().default([]),
  suggestedDetectionRating: integer('suggested_detection_rating'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const equipmentControlMethods = pgTable('equipment_control_methods', {
  id: uuid('id').primaryKey().defaultRandom(),
  equipmentId: uuid('equipment_id').notNull().references(() => equipmentLibrary.id, { onDelete: 'cascade' }),
  characteristicType: text('characteristic_type').notNull(),
  characteristicName: text('characteristic_name').notNull(),
  controlMethod: text('control_method').notNull(),
  measurementSystem: text('measurement_system'),
  sampleSize: text('sample_size'),
  frequency: text('frequency'),
  acceptanceCriteria: text('acceptance_criteria'),
  reactionPlan: text('reaction_plan'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Failure Modes Library - ENHANCED with effect category
export const failureModesLibrary = pgTable('failure_modes_library', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  category: failureModeCategoryEnum('category').notNull(),
  failureMode: text('failure_mode').notNull(),
  genericEffect: text('generic_effect').notNull(),
  typicalCauses: jsonb('typical_causes').$type<string[]>().notNull().default([]),
  industryStandard: text('industry_standard'),
  applicableProcesses: jsonb('applicable_processes').$type<string[]>().default([]),
  defaultSeverity: integer('default_severity'),
  defaultOccurrence: integer('default_occurrence'),
  tags: jsonb('tags').$type<string[]>().default([]),
  status: text('status').notNull().default('active'),
  lastUsed: timestamp('last_used'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  // NEW: Effect classification for auto-severity scoring
  effectCategory: text('effect_category'),
  severityMin: integer('severity_min'),
  severityMax: integer('severity_max'),
  severityRationale: text('severity_rationale'),
}, (table) => ({
  categoryIdx: index('failure_modes_category_idx').on(table.category),
  statusIdx: index('failure_modes_status_idx').on(table.status),
  effectCategoryIdx: index('failure_modes_effect_category_idx').on(table.effectCategory),
  orgNameIdx: uniqueIndex('failure_modes_org_name_idx').on(table.orgId, table.failureMode),
  orgIdx: index('failure_modes_org_idx').on(table.orgId),
}));

export const fmeaTemplateCatalogLink = pgTable('fmea_template_catalog_link', {
  id: uuid('id').primaryKey().defaultRandom(),
  templateRowId: uuid('template_row_id').notNull().references(() => fmeaTemplateRow.id, { onDelete: 'cascade' }),
  catalogItemId: uuid('catalog_item_id').notNull().references(() => failureModesLibrary.id, { onDelete: 'cascade' }),
  customized: boolean('customized').notNull().default(false),
  adoptedAt: timestamp('adopted_at').notNull().defaultNow(),
}, (table) => ({
  templateRowIdx: index('fmea_catalog_link_template_idx').on(table.templateRowId),
  catalogItemIdx: index('fmea_catalog_link_catalog_idx').on(table.catalogItemId),
}));

// Controls Library - ENHANCED with control category for auto-detection scoring
export const controlsLibrary = pgTable('controls_library', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  type: controlTypeEnum('type').notNull(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  effectiveness: controlEffectivenessEnum('effectiveness').notNull(),
  typicalOccurrenceImpact: integer('typical_occurrence_impact'),
  typicalDetectionRating: integer('typical_detection_rating'),
  equipmentRequired: jsonb('equipment_required').$type<string[]>().default([]),
  skillLevelRequired: text('skill_level_required'),
  implementationNotes: text('implementation_notes'),
  requiresMSA: boolean('requires_msa').default(false),
  msaStatus: msaStatusEnum('msa_status').default('not_required'),
  gageType: text('gage_type'),
  gageDetails: text('gage_details'),
  measurementResolution: text('measurement_resolution'),
  defaultSampleSize: text('default_sample_size'),
  defaultFrequency: text('default_frequency'),
  controlMethod: text('control_method'),
  defaultAcceptanceCriteria: text('default_acceptance_criteria'),
  defaultReactionPlan: text('default_reaction_plan'),
  applicableProcesses: jsonb('applicable_processes').$type<string[]>().default([]),
  applicableFailureModes: jsonb('applicable_failure_modes').$type<string[]>().default([]),
  tags: jsonb('tags').$type<string[]>().default([]),
  status: text('status').notNull().default('active'),
  industryStandard: text('industry_standard'),
  lastUsed: timestamp('last_used'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  // NEW: Control category for auto-detection scoring
  controlCategory: text('control_category'),
  detectionMin: integer('detection_min'),
  detectionMax: integer('detection_max'),
  detectionRationale: text('detection_rationale'),
}, (table) => ({
  typeIdx: index('controls_library_type_idx').on(table.type),
  effectivenessIdx: index('controls_library_effectiveness_idx').on(table.effectiveness),
  statusIdx: index('controls_library_status_idx').on(table.status),
  controlCategoryIdx: index('controls_library_control_category_idx').on(table.controlCategory),
  orgNameIdx: uniqueIndex('controls_library_org_name_idx').on(table.orgId, table.name),
  orgIdx: index('controls_library_org_idx').on(table.orgId),
}));

export const controlPairings = pgTable('control_pairings', {
  id: uuid('id').primaryKey().defaultRandom(),
  failureModeId: uuid('failure_mode_id').notNull().references(() => failureModesLibrary.id, { onDelete: 'cascade' }),
  preventionControlId: uuid('prevention_control_id').references(() => controlsLibrary.id, { onDelete: 'set null' }),
  detectionControlId: uuid('detection_control_id').references(() => controlsLibrary.id, { onDelete: 'set null' }),
  effectiveness: text('effectiveness').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  failureModeIdx: index('control_pairings_fm_idx').on(table.failureModeId),
  preventionIdx: index('control_pairings_prevention_idx').on(table.preventionControlId),
  detectionIdx: index('control_pairings_detection_idx').on(table.detectionControlId),
}));

// Part Tables
export const part = pgTable('part', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  customer: text('customer').notNull(),
  program: text('program').notNull(),
  partNumber: text('part_number').notNull(),
  partName: text('part_name').notNull(),
  partRevLevel: text('part_rev_level'),
  plant: text('plant').notNull(),
  mold: text('mold'),
  moldDescription: text('mold_description'),
  primaryEquipment: text('primary_equipment'),
  csrNotes: text('csr_notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  partNumberIdx: uniqueIndex('part_number_idx').on(table.orgId, table.partNumber),
  orgIdx: index('part_org_idx').on(table.orgId),
}));

export const partProcessMap = pgTable('part_process_map', {
  id: uuid('id').primaryKey().defaultRandom(),
  partId: uuid('part_id').notNull().references(() => part.id, { onDelete: 'cascade' }),
  processDefId: uuid('process_def_id').notNull().references(() => processDef.id),
  processRev: text('process_rev').notNull(),
  sequence: integer('sequence').notNull(),
  assumptions: text('assumptions'),
}, (table) => ({
  partSeqIdx: uniqueIndex('part_process_map_part_seq_idx').on(table.partId, table.sequence),
}));

// PFD
export const pfd = pgTable('pfd', {
  id: uuid('id').primaryKey().defaultRandom(),
  partId: uuid('part_id').notNull().references(() => part.id, { onDelete: 'cascade' }),
  rev: text('rev').notNull(),
  status: statusEnum('status').notNull().default('draft'),
  pfdNumber: text('pfd_number'),
  docNo: text('doc_no'),
  preparedBy: text('prepared_by'),
  approvedBy: text('approved_by'),
  revisionType: text('revision_type'),
  revisionDate: timestamp('revision_date'),
  primaryEquipment: text('primary_equipment'),
  moldCells: text('mold_cells'),
  cellLayoutNotes: text('cell_layout_notes'),
  mermaidDiagram: text('mermaid_diagram'),
  diagramJson: jsonb('diagram_json').$type<any>(),
  origDate: timestamp('orig_date'),
  approvedAt: timestamp('approved_at'),
  effectiveFrom: timestamp('effective_from'),
  supersedesId: uuid('supersedes_id').references((): any => pfd.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  partRevIdx: uniqueIndex('pfd_part_rev_idx').on(table.partId, table.rev),
  pfdNumberIdx: index('pfd_number_idx').on(table.pfdNumber),
}));

export const pfdStep = pgTable('pfd_step', {
  id: uuid('id').primaryKey().defaultRandom(),
  pfdId: uuid('pfd_id').notNull().references(() => pfd.id, { onDelete: 'cascade' }),
  sourceStepId: uuid('source_step_id').references(() => processStep.id),
  seq: integer('seq').notNull(),
  processNo: text('process_no'),
  name: text('name').notNull(),
  area: text('area'),
  symbol: text('symbol'),
  keyInputs: text('key_inputs'),
  keyOutputs: text('key_outputs'),
  controlMethod: text('control_method'),
  equipment: jsonb('equipment').$type<{ name: string; model?: string }[]>(),
  overrideFlags: jsonb('override_flags').$type<Record<string, boolean>>().default({}),
}, (table) => ({
  pfdSeqIdx: uniqueIndex('pfd_step_pfd_seq_idx').on(table.pfdId, table.seq),
  sourceStepIdx: index('pfd_step_source_idx').on(table.sourceStepId),
}));

// PFMEA
export const pfmea = pgTable('pfmea', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  partId: uuid('part_id').notNull().references(() => part.id, { onDelete: 'cascade' }),
  rev: text('rev').notNull(),
  status: statusEnum('status').notNull().default('draft'),
  basis: text('basis'),
  pfmeaNumber: text('pfmea_number'),
  docNo: text('doc_no'),
  keyContact: text('key_contact'),
  preparedBy: text('prepared_by'),
  pfmeaTeam: jsonb('pfmea_team').$type<string[]>().default([]),
  origDate: timestamp('orig_date'),
  revisionDate: timestamp('revision_date'),
  approvedBy: uuid('approved_by'),
  approvedAt: timestamp('approved_at'),
  effectiveFrom: timestamp('effective_from'),
  supersedesId: uuid('supersedes_id').references((): any => pfmea.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  // NEW: Last auto-review reference
  lastAutoReviewId: uuid('last_auto_review_id'),
  lastAutoReviewAt: timestamp('last_auto_review_at'),
}, (table) => ({
  partRevIdx: uniqueIndex('pfmea_part_rev_idx').on(table.partId, table.rev),
  pfmeaNumberIdx: index('pfmea_number_idx').on(table.pfmeaNumber),
  orgIdx: index('pfmea_org_idx').on(table.orgId),
}));

// PFMEA Action Status enum
export const actionStatusEnum = pgEnum('action_status', ['none', 'open', 'in_progress', 'complete', 'cancelled']);

export const pfmeaRow = pgTable('pfmea_row', {
  id: uuid('id').primaryKey().defaultRandom(),
  pfmeaId: uuid('pfmea_id').notNull().references(() => pfmea.id, { onDelete: 'cascade' }),
  parentTemplateRowId: uuid('parent_template_row_id').references(() => fmeaTemplateRow.id),
  rowSeq: integer('row_seq'),
  processNo: text('process_no'),
  processStep: text('process_step'),
  stepRef: text('step_ref').notNull(),
  function: text('function').notNull(),
  requirement: text('requirement').notNull(),
  failureMode: text('failure_mode').notNull(),
  effect: text('effect').notNull(),
  severity: integer('severity').notNull(),
  classColumn: text('class_column'),
  cause: text('cause').notNull(),
  occurrence: integer('occurrence').notNull(),
  preventionControls: jsonb('prevention_controls').$type<string[]>().default([]),
  detectionControls: jsonb('detection_controls').$type<string[]>().default([]),
  detection: integer('detection').notNull(),
  ap: text('ap').notNull(),
  specialFlag: boolean('special_flag').default(false),
  csrSymbol: text('csr_symbol'),
  overrideFlags: jsonb('override_flags').$type<Record<string, boolean>>().default({}),
  notes: text('notes'),
  // Action tracking
  recommendedAction: text('recommended_action'),
  responsibility: text('responsibility'),
  targetDate: timestamp('target_date'),
  actionsTaken: text('actions_taken'),
  completionDate: timestamp('completion_date'),
  newSeverity: integer('new_severity'),
  newOccurrence: integer('new_occurrence'),
  newDetection: integer('new_detection'),
  newAP: text('new_ap'),
  actionStatus: text('action_status').default('none'),
  // NEW: Scoring metadata
  effectCategory: text('effect_category'),
  severityJustification: text('severity_justification'),
  occurrenceMethod: text('occurrence_method'),
  cpkValue: text('cpk_value'),
  occurrenceJustification: text('occurrence_justification'),
  detectionControlId: uuid('detection_control_id'),
  detectionJustification: text('detection_justification'),
}, (table) => ({
  pfmeaIdx: index('pfmea_row_pfmea_idx').on(table.pfmeaId),
  parentTemplateIdx: index('pfmea_row_parent_template_idx').on(table.parentTemplateRowId),
  processNoIdx: index('pfmea_row_process_no_idx').on(table.processNo),
}));

// Control Plan
export const controlPlan = pgTable('control_plan', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  partId: uuid('part_id').notNull().references(() => part.id, { onDelete: 'cascade' }),
  rev: text('rev').notNull(),
  type: text('type').notNull(),
  status: statusEnum('status').notNull().default('draft'),
  controlPlanNumber: text('control_plan_number'),
  docNo: text('doc_no'),
  keyContact: text('key_contact'),
  phone: text('phone'),
  coreTeam: jsonb('core_team').$type<string[]>().default([]),
  origDate: timestamp('orig_date'),
  revisionDate: timestamp('revision_date'),
  preparedBy: text('prepared_by'),
  customerApprovalDate: timestamp('customer_approval_date'),
  otherApprovalDate: timestamp('other_approval_date'),
  primaryEquipment: text('primary_equipment'),
  moldCells: text('mold_cells'),
  approvedBy: uuid('approved_by'),
  approvedAt: timestamp('approved_at'),
  effectiveFrom: timestamp('effective_from'),
  supersedesId: uuid('supersedes_id').references((): any => controlPlan.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  // NEW: Last auto-review reference
  lastAutoReviewId: uuid('last_auto_review_id'),
  lastAutoReviewAt: timestamp('last_auto_review_at'),
}, (table) => ({
  partRevIdx: uniqueIndex('control_plan_part_rev_idx').on(table.partId, table.rev),
  controlPlanNumberIdx: index('control_plan_number_idx').on(table.controlPlanNumber),
  orgIdx: index('control_plan_org_idx').on(table.orgId),
}));

export const controlPlanRow = pgTable('control_plan_row', {
  id: uuid('id').primaryKey().defaultRandom(),
  controlPlanId: uuid('control_plan_id').notNull().references(() => controlPlan.id, { onDelete: 'cascade' }),
  sourcePfmeaRowId: uuid('source_pfmea_row_id').references(() => pfmeaRow.id),
  parentControlTemplateRowId: uuid('parent_control_template_row_id').references(() => controlTemplateRow.id),
  rowSeq: integer('row_seq'),
  processNo: text('process_no'),
  processName: text('process_name'),
  machineDevice: text('machine_device'),
  charId: text('char_id').notNull(),
  characteristicName: text('characteristic_name').notNull(),
  type: text('type').notNull(),
  classColumn: text('class_column'),
  specification: text('specification'),
  target: text('target'),
  tolerance: text('tolerance'),
  specialFlag: boolean('special_flag').default(false),
  csrSymbol: text('csr_symbol'),
  measurementSystem: text('measurement_system'),
  gageDetails: text('gage_details'),
  sampleSize: text('sample_size'),
  frequency: text('frequency'),
  controlMethod: text('control_method'),
  acceptanceCriteria: text('acceptance_criteria'),
  reactionPlan: text('reaction_plan'),
  responsibility: text('responsibility'),
  overrideFlags: jsonb('override_flags').$type<Record<string, boolean>>().default({}),
}, (table) => ({
  controlPlanIdx: index('control_plan_row_plan_idx').on(table.controlPlanId),
  sourcePfmeaIdx: index('control_plan_row_pfmea_idx').on(table.sourcePfmeaRowId),
  charIdIdx: index('control_plan_row_char_id_idx').on(table.charId),
  processNoIdx: index('control_plan_row_process_no_idx').on(table.processNo),
}));

export const calibrationLink = pgTable('calibration_link', {
  id: uuid('id').primaryKey().defaultRandom(),
  gageId: uuid('gage_id').notNull().references(() => gageLibrary.id),
  calibDue: timestamp('calib_due').notNull(),
  status: text('status').notNull(),
}, (table) => ({
  gageIdx: index('calibration_link_gage_idx').on(table.gageId),
}));

// ==========================================
// NEW: Auto-Review Tables
// ==========================================

export const autoReviewRun = pgTable('auto_review_run', {
  id: uuid('id').primaryKey().defaultRandom(),
  pfmeaId: uuid('pfmea_id').references(() => pfmea.id, { onDelete: 'cascade' }),
  controlPlanId: uuid('control_plan_id').references(() => controlPlan.id, { onDelete: 'cascade' }),
  totalFindings: integer('total_findings').notNull().default(0),
  errorCount: integer('error_count').notNull().default(0),
  warningCount: integer('warning_count').notNull().default(0),
  infoCount: integer('info_count').notNull().default(0),
  passedValidation: boolean('passed_validation').notNull().default(false),
  runBy: text('run_by'),
  runAt: timestamp('run_at').notNull().defaultNow(),
  durationMs: integer('duration_ms'),
  rulesetVersion: text('ruleset_version').notNull().default('1.0.0'),
}, (table) => ({
  pfmeaIdx: index('auto_review_run_pfmea_idx').on(table.pfmeaId),
  controlPlanIdx: index('auto_review_run_cp_idx').on(table.controlPlanId),
  runAtIdx: index('auto_review_run_at_idx').on(table.runAt),
}));

export const autoReviewFinding = pgTable('auto_review_finding', {
  id: uuid('id').primaryKey().defaultRandom(),
  reviewRunId: uuid('review_run_id').notNull().references(() => autoReviewRun.id, { onDelete: 'cascade' }),
  level: text('level').notNull(),
  category: text('category').notNull(),
  ruleId: text('rule_id').notNull(),
  message: text('message').notNull(),
  entityType: text('entity_type'),
  entityId: uuid('entity_id'),
  details: jsonb('details').$type<Record<string, any>>().default({}),
  resolved: boolean('resolved').notNull().default(false),
  resolvedBy: text('resolved_by'),
  resolvedAt: timestamp('resolved_at'),
  resolution: text('resolution'),
  waived: boolean('waived').notNull().default(false),
  waiverReason: text('waiver_reason'),
}, (table) => ({
  reviewRunIdx: index('auto_review_finding_run_idx').on(table.reviewRunId),
  levelIdx: index('auto_review_finding_level_idx').on(table.level),
  categoryIdx: index('auto_review_finding_category_idx').on(table.category),
  entityIdx: index('auto_review_finding_entity_idx').on(table.entityType, table.entityId),
}));

// ==========================================
// NEW: Change Package Tables
// ==========================================

export const changePackage = pgTable('change_package', {
  id: uuid('id').primaryKey().defaultRandom(),
  packageNumber: text('package_number').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  status: changeStatusEnum('status').notNull().default('draft'),
  reasonCode: text('reason_code').notNull(),
  priority: text('priority').notNull().default('medium'),
  targetEntityType: text('target_entity_type').notNull(),
  targetEntityId: uuid('target_entity_id').notNull(),
  beforeSnapshot: jsonb('before_snapshot').$type<any>(),
  afterSnapshot: jsonb('after_snapshot').$type<any>(),
  redlineJson: jsonb('redline_json').$type<any>().default({}),
  impactAnalysis: jsonb('impact_analysis').$type<{
    affectedParts: { partId: string; partNumber: string; documents: string[] }[];
    apDeltas: { rowId: string; oldAP: string; newAP: string; change: string }[];
    csrImpacts: { charId: string; characteristic: string; impact: string }[];
  }>(),
  autoReviewId: uuid('auto_review_id').references(() => autoReviewRun.id),
  autoReviewPassed: boolean('auto_review_passed'),
  approverMatrix: jsonb('approver_matrix').$type<{
    role: string;
    userId?: string;
    required: boolean;
    approved?: boolean;
    approvedAt?: string;
  }[]>().default([]),
  initiatedBy: text('initiated_by').notNull(),
  initiatedAt: timestamp('initiated_at').notNull().defaultNow(),
  effectiveFrom: timestamp('effective_from'),
  completedAt: timestamp('completed_at'),
  propagationMode: text('propagation_mode').default('prompt'),
}, (table) => ({
  packageNumberIdx: uniqueIndex('change_package_number_idx').on(table.packageNumber),
  statusIdx: index('change_package_status_idx').on(table.status),
  targetEntityIdx: index('change_package_target_idx').on(table.targetEntityType, table.targetEntityId),
  initiatedAtIdx: index('change_package_initiated_at_idx').on(table.initiatedAt),
}));

export const changePackageItem = pgTable('change_package_item', {
  id: uuid('id').primaryKey().defaultRandom(),
  changePackageId: uuid('change_package_id').notNull().references(() => changePackage.id, { onDelete: 'cascade' }),
  fieldPath: text('field_path').notNull(),
  fieldLabel: text('field_label').notNull(),
  oldValue: text('old_value'),
  newValue: text('new_value'),
  changeType: text('change_type').notNull(),
  impactLevel: text('impact_level'),
  requiresPropagation: boolean('requires_propagation').notNull().default(true),
}, (table) => ({
  packageIdx: index('change_package_item_package_idx').on(table.changePackageId),
}));

export const changePackageApproval = pgTable('change_package_approval', {
  id: uuid('id').primaryKey().defaultRandom(),
  changePackageId: uuid('change_package_id').notNull().references(() => changePackage.id, { onDelete: 'cascade' }),
  role: text('role').notNull(),
  approverId: text('approver_id').notNull(),
  approverName: text('approver_name'),
  status: text('status').notNull().default('pending'),
  requestedAt: timestamp('requested_at').notNull().defaultNow(),
  respondedAt: timestamp('responded_at'),
  comments: text('comments'),
  signatureHash: text('signature_hash'),
}, (table) => ({
  packageIdx: index('change_package_approval_package_idx').on(table.changePackageId),
  statusIdx: index('change_package_approval_status_idx').on(table.status),
}));

export const changePackagePropagation = pgTable('change_package_propagation', {
  id: uuid('id').primaryKey().defaultRandom(),
  changePackageId: uuid('change_package_id').notNull().references(() => changePackage.id, { onDelete: 'cascade' }),
  targetEntityType: text('target_entity_type').notNull(),
  targetEntityId: uuid('target_entity_id').notNull(),
  targetRowId: uuid('target_row_id'),
  decision: text('decision').notNull(),
  decidedBy: text('decided_by'),
  decidedAt: timestamp('decided_at'),
  reason: text('reason'),
  appliedAt: timestamp('applied_at'),
  appliedBy: text('applied_by'),
}, (table) => ({
  packageIdx: index('change_propagation_package_idx').on(table.changePackageId),
  targetIdx: index('change_propagation_target_idx').on(table.targetEntityType, table.targetEntityId),
}));

// ==========================================
// Document Control Tables
// ==========================================

export const signature = pgTable('signature', {
  id: uuid('id').primaryKey().defaultRandom(),
  entityType: text('entity_type').notNull(),
  entityId: uuid('entity_id').notNull(),
  role: text('role').notNull(),
  signerUserId: text('signer_user_id').notNull(),
  signerName: text('signer_name').notNull(),
  signerEmail: text('signer_email'),
  signedAt: timestamp('signed_at').notNull().defaultNow(),
  contentHash: text('content_hash').notNull(),
  signatureData: text('signature_data'),
  meaning: text('meaning'),
  comment: text('comment'),
  ipAddress: text('ip_address'),
}, (table) => ({
  entityIdx: index('signature_entity_idx').on(table.entityType, table.entityId),
  roleIdx: index('signature_role_idx').on(table.role),
}));

export const auditLog = pgTable('audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  entityType: text('entity_type').notNull(),
  entityId: uuid('entity_id').notNull(),
  action: text('action').notNull(),
  actor: uuid('actor').notNull(),
  actorName: text('actor_name'),
  at: timestamp('at').notNull().defaultNow(),
  previousValue: jsonb('previous_value'),
  newValue: jsonb('new_value'),
  changeNote: text('change_note'),
  ipAddress: text('ip_address'),
  sessionId: text('session_id'),
  payloadJson: jsonb('payload_json'),
}, (table) => ({
  entityIdx: index('audit_log_entity_idx').on(table.entityType, table.entityId),
  atIdx: index('audit_log_at_idx').on(table.at),
}));

export const ownership = pgTable('ownership', {
  id: uuid('id').primaryKey().defaultRandom(),
  entityType: text('entity_type').notNull(),
  entityId: uuid('entity_id').notNull(),
  ownerUserId: text('owner_user_id').notNull(),
  watchers: jsonb('watchers').$type<string[]>().default([]),
}, (table) => ({
  entityIdx: uniqueIndex('ownership_entity_idx').on(table.entityType, table.entityId),
}));

// ==========================================
// Relations
// ==========================================

// Core Platform Relations
export const organizationRelations = relations(organization, ({ many }) => ({
  users: many(user),
}));

export const userRelations = relations(user, ({ one, many }) => ({
  organization: one(organization, {
    fields: [user.orgId],
    references: [organization.id],
  }),
  sessions: many(session),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const processDefRelations = relations(processDef, ({ many, one }) => ({
  steps: many(processStep),
  fmeaRows: many(fmeaTemplateRow),
  controlRows: many(controlTemplateRow),
  supersedes: one(processDef, {
    fields: [processDef.supersedesId],
    references: [processDef.id],
  }),
}));

export const processStepRelations = relations(processStep, ({ one, many }) => ({
  processDef: one(processDef, {
    fields: [processStep.processDefId],
    references: [processDef.id],
  }),
  fmeaRows: many(fmeaTemplateRow),
}));

export const fmeaTemplateRowRelations = relations(fmeaTemplateRow, ({ one, many }) => ({
  processDef: one(processDef, {
    fields: [fmeaTemplateRow.processDefId],
    references: [processDef.id],
  }),
  step: one(processStep, {
    fields: [fmeaTemplateRow.stepId],
    references: [processStep.id],
  }),
  controlRows: many(controlTemplateRow),
}));

export const controlTemplateRowRelations = relations(controlTemplateRow, ({ one }) => ({
  processDef: one(processDef, {
    fields: [controlTemplateRow.processDefId],
    references: [processDef.id],
  }),
  sourceTemplateRow: one(fmeaTemplateRow, {
    fields: [controlTemplateRow.sourceTemplateRowId],
    references: [fmeaTemplateRow.id],
  }),
}));

export const partRelations = relations(part, ({ many }) => ({
  processMaps: many(partProcessMap),
  pfds: many(pfd),
  pfmeas: many(pfmea),
  controlPlans: many(controlPlan),
}));

export const pfdRelations = relations(pfd, ({ one, many }) => ({
  part: one(part, {
    fields: [pfd.partId],
    references: [part.id],
  }),
  steps: many(pfdStep),
  supersedes: one(pfd, {
    fields: [pfd.supersedesId],
    references: [pfd.id],
  }),
}));

export const pfdStepRelations = relations(pfdStep, ({ one }) => ({
  pfd: one(pfd, {
    fields: [pfdStep.pfdId],
    references: [pfd.id],
  }),
  sourceStep: one(processStep, {
    fields: [pfdStep.sourceStepId],
    references: [processStep.id],
  }),
}));

export const pfmeaRelations = relations(pfmea, ({ one, many }) => ({
  part: one(part, {
    fields: [pfmea.partId],
    references: [part.id],
  }),
  rows: many(pfmeaRow),
  supersedes: one(pfmea, {
    fields: [pfmea.supersedesId],
    references: [pfmea.id],
  }),
  autoReviews: many(autoReviewRun),
}));

// Action Items for PFMEA Rows (AIAG-VDA Recommended Actions)
export const actionItem = pgTable('action_item', {
  id: serial('id').primaryKey(),
  pfmeaRowId: uuid('pfmea_row_id').notNull().references(() => pfmeaRow.id, { onDelete: 'cascade' }),
  actionType: text('action_type').notNull(), // 'prevention' | 'detection' | 'design' | 'process' | 'other'
  description: text('description').notNull(),
  responsiblePerson: text('responsible_person').notNull(),
  responsibleRole: text('responsible_role'),
  targetDate: timestamp('target_date').notNull(),
  completedDate: timestamp('completed_date'),
  status: text('status').notNull().default('open'), // 'open' | 'in_progress' | 'completed' | 'verified' | 'cancelled'
  priority: text('priority').notNull().default('medium'), // 'low' | 'medium' | 'high' | 'critical'
  completionNotes: text('completion_notes'),
  evidenceDescription: text('evidence_description'),
  evidenceAttachment: text('evidence_attachment'),
  verifiedBy: text('verified_by'),
  verifiedDate: timestamp('verified_date'),
  verificationNotes: text('verification_notes'),
  newSeverity: integer('new_severity'),
  newOccurrence: integer('new_occurrence'),
  newDetection: integer('new_detection'),
  newAP: text('new_ap'),
  createdBy: text('created_by').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  pfmeaRowIdx: index('action_item_pfmea_row_idx').on(table.pfmeaRowId),
  statusIdx: index('action_item_status_idx').on(table.status),
  targetDateIdx: index('action_item_target_date_idx').on(table.targetDate),
}));

export const actionItemRelations = relations(actionItem, ({ one }) => ({
  pfmeaRow: one(pfmeaRow, {
    fields: [actionItem.pfmeaRowId],
    references: [pfmeaRow.id],
  }),
}));

// Notifications
export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  
  // Recipient
  userId: text('user_id').notNull(), // Would link to users table in production
  
  // Notification content
  type: text('type').notNull(), // 'action_overdue' | 'action_assigned' | 'signature_required' | 'document_approved' | 'review_complete' | 'high_ap_added'
  title: text('title').notNull(),
  message: text('message').notNull(),
  
  // Link to related entity
  entityType: text('entity_type'), // 'pfmea' | 'control_plan' | 'action_item' | 'part'
  entityId: integer('entity_id'),
  
  // Status
  read: boolean('read').notNull().default(false),
  readAt: timestamp('read_at'),
  
  // Priority
  priority: text('priority').notNull().default('normal'), // 'low' | 'normal' | 'high' | 'urgent'
  
  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  expiresAt: timestamp('expires_at'), // Optional expiration
});

export const pfmeaRowRelations = relations(pfmeaRow, ({ one, many }) => ({
  pfmea: one(pfmea, {
    fields: [pfmeaRow.pfmeaId],
    references: [pfmea.id],
  }),
  parentTemplate: one(fmeaTemplateRow, {
    fields: [pfmeaRow.parentTemplateRowId],
    references: [fmeaTemplateRow.id],
  }),
  actionItems: many(actionItem),
}));

export const controlPlanRelations = relations(controlPlan, ({ one, many }) => ({
  part: one(part, {
    fields: [controlPlan.partId],
    references: [part.id],
  }),
  rows: many(controlPlanRow),
  supersedes: one(controlPlan, {
    fields: [controlPlan.supersedesId],
    references: [controlPlan.id],
  }),
  autoReviews: many(autoReviewRun),
}));

export const controlPlanRowRelations = relations(controlPlanRow, ({ one }) => ({
  controlPlan: one(controlPlan, {
    fields: [controlPlanRow.controlPlanId],
    references: [controlPlan.id],
  }),
  sourcePfmeaRow: one(pfmeaRow, {
    fields: [controlPlanRow.sourcePfmeaRowId],
    references: [pfmeaRow.id],
  }),
  parentTemplate: one(controlTemplateRow, {
    fields: [controlPlanRow.parentControlTemplateRowId],
    references: [controlTemplateRow.id],
  }),
}));

export const equipmentLibraryRelations = relations(equipmentLibrary, ({ many }) => ({
  errorProofingControls: many(equipmentErrorProofing),
  controlMethods: many(equipmentControlMethods),
}));

export const equipmentErrorProofingRelations = relations(equipmentErrorProofing, ({ one }) => ({
  equipment: one(equipmentLibrary, {
    fields: [equipmentErrorProofing.equipmentId],
    references: [equipmentLibrary.id],
  }),
}));

export const equipmentControlMethodsRelations = relations(equipmentControlMethods, ({ one }) => ({
  equipment: one(equipmentLibrary, {
    fields: [equipmentControlMethods.equipmentId],
    references: [equipmentLibrary.id],
  }),
}));

export const failureModesLibraryRelations = relations(failureModesLibrary, ({ many }) => ({
  catalogLinks: many(fmeaTemplateCatalogLink),
  controlPairings: many(controlPairings),
}));

export const fmeaTemplateCatalogLinkRelations = relations(fmeaTemplateCatalogLink, ({ one }) => ({
  templateRow: one(fmeaTemplateRow, {
    fields: [fmeaTemplateCatalogLink.templateRowId],
    references: [fmeaTemplateRow.id],
  }),
  catalogItem: one(failureModesLibrary, {
    fields: [fmeaTemplateCatalogLink.catalogItemId],
    references: [failureModesLibrary.id],
  }),
}));

export const controlsLibraryRelations = relations(controlsLibrary, ({ many }) => ({
  preventionPairings: many(controlPairings, { relationName: 'preventionControl' }),
  detectionPairings: many(controlPairings, { relationName: 'detectionControl' }),
}));

export const controlPairingsRelations = relations(controlPairings, ({ one }) => ({
  failureMode: one(failureModesLibrary, {
    fields: [controlPairings.failureModeId],
    references: [failureModesLibrary.id],
  }),
  preventionControl: one(controlsLibrary, {
    fields: [controlPairings.preventionControlId],
    references: [controlsLibrary.id],
    relationName: 'preventionControl',
  }),
  detectionControl: one(controlsLibrary, {
    fields: [controlPairings.detectionControlId],
    references: [controlsLibrary.id],
    relationName: 'detectionControl',
  }),
}));

// NEW: Auto-Review Relations
export const autoReviewRunRelations = relations(autoReviewRun, ({ one, many }) => ({
  pfmea: one(pfmea, {
    fields: [autoReviewRun.pfmeaId],
    references: [pfmea.id],
  }),
  controlPlan: one(controlPlan, {
    fields: [autoReviewRun.controlPlanId],
    references: [controlPlan.id],
  }),
  findings: many(autoReviewFinding),
}));

export const autoReviewFindingRelations = relations(autoReviewFinding, ({ one }) => ({
  reviewRun: one(autoReviewRun, {
    fields: [autoReviewFinding.reviewRunId],
    references: [autoReviewRun.id],
  }),
}));

// NEW: Change Package Relations
export const changePackageRelations = relations(changePackage, ({ one, many }) => ({
  autoReview: one(autoReviewRun, {
    fields: [changePackage.autoReviewId],
    references: [autoReviewRun.id],
  }),
  items: many(changePackageItem),
  approvals: many(changePackageApproval),
  propagations: many(changePackagePropagation),
}));

export const changePackageItemRelations = relations(changePackageItem, ({ one }) => ({
  changePackage: one(changePackage, {
    fields: [changePackageItem.changePackageId],
    references: [changePackage.id],
  }),
}));

export const changePackageApprovalRelations = relations(changePackageApproval, ({ one }) => ({
  changePackage: one(changePackage, {
    fields: [changePackageApproval.changePackageId],
    references: [changePackage.id],
  }),
}));

export const changePackagePropagationRelations = relations(changePackagePropagation, ({ one }) => ({
  changePackage: one(changePackage, {
    fields: [changePackagePropagation.changePackageId],
    references: [changePackage.id],
  }),
}));

// ==========================================
// Document Control Tables
// ==========================================

export const document = pgTable('document', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  docNumber: text('doc_number').unique().notNull(),
  title: text('title').notNull(),
  type: documentTypeEnum('type').notNull(),
  category: text('category'),
  department: text('department'),
  currentRev: text('current_rev').notNull().default('A'),
  status: statusEnum('status').notNull().default('draft'),
  owner: text('owner').notNull(),
  effectiveDate: timestamp('effective_date'),
  reviewDueDate: timestamp('review_due_date'),
  reviewCycleDays: integer('review_cycle_days').default(365),
  retentionYears: integer('retention_years').default(7),
  description: text('description'),
  externalRef: text('external_ref'),
  isExternal: boolean('is_external').default(false),
  tags: jsonb('tags').default([]),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  statusIdx: index('document_status_idx').on(table.status),
  typeIdx: index('document_type_idx').on(table.type),
  docNumberIdx: index('document_doc_number_idx').on(table.docNumber),
  orgIdIdx: index('document_org_id_idx').on(table.orgId),
}));

export const documentRevision = pgTable('document_revision', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  documentId: uuid('document_id').notNull().references(() => document.id, { onDelete: 'cascade' }),
  rev: text('rev').notNull(),
  changeDescription: text('change_description').notNull(),
  status: statusEnum('status').notNull().default('draft'),
  author: text('author').notNull(),
  reviewedBy: text('reviewed_by'),
  approvedBy: text('approved_by'),
  approvedAt: timestamp('approved_at'),
  effectiveDate: timestamp('effective_date'),
  supersededDate: timestamp('superseded_date'),
  contentHash: text('content_hash'),
  attachmentUrl: text('attachment_url'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  documentIdIdx: index('doc_revision_document_id_idx').on(table.documentId),
  orgIdIdx: index('doc_revision_org_id_idx').on(table.orgId),
}));

export const documentDistribution = pgTable('document_distribution', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  documentId: uuid('document_id').notNull().references(() => document.id, { onDelete: 'cascade' }),
  revisionId: uuid('revision_id').notNull().references(() => documentRevision.id, { onDelete: 'cascade' }),
  recipientName: text('recipient_name').notNull(),
  recipientRole: text('recipient_role'),
  distributedAt: timestamp('distributed_at').notNull().defaultNow(),
  acknowledgedAt: timestamp('acknowledged_at'),
  method: text('method').default('electronic'),
  copyNumber: integer('copy_number'),
}, (table) => ({
  documentIdIdx: index('doc_distribution_document_id_idx').on(table.documentId),
  orgIdIdx: index('doc_distribution_org_id_idx').on(table.orgId),
}));

export const documentReview = pgTable('document_review', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  documentId: uuid('document_id').notNull().references(() => document.id, { onDelete: 'cascade' }),
  revisionId: uuid('revision_id').references(() => documentRevision.id, { onDelete: 'set null' }),
  reviewerName: text('reviewer_name').notNull(),
  reviewerRole: text('reviewer_role'),
  status: text('status').notNull().default('pending'),
  comments: text('comments'),
  reviewedAt: timestamp('reviewed_at'),
  dueDate: timestamp('due_date'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  documentIdIdx: index('doc_review_document_id_idx').on(table.documentId),
  statusIdx: index('doc_review_status_idx').on(table.status),
  orgIdIdx: index('doc_review_org_id_idx').on(table.orgId),
}));

export const documentLink = pgTable('document_link', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  sourceDocId: uuid('source_doc_id').notNull().references(() => document.id, { onDelete: 'cascade' }),
  targetType: text('target_type').notNull(),
  targetId: uuid('target_id').notNull(),
  linkType: text('link_type').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  sourceDocIdIdx: index('doc_link_source_doc_id_idx').on(table.sourceDocId),
  orgIdIdx: index('doc_link_org_id_idx').on(table.orgId),
}));

// ==========================================
// Document Control Phase 2: File, Template, Workflow, Checkout
// ==========================================

export const documentFile = pgTable('document_file', {
  id: serial('id').primaryKey(),
  orgId: uuid('org_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  documentId: uuid('document_id').references(() => document.id, { onDelete: 'cascade' }),
  revisionId: uuid('revision_id').references(() => documentRevision.id, { onDelete: 'cascade' }),
  fileName: text('file_name').notNull(),
  originalName: text('original_name').notNull(),
  fileType: text('file_type').notNull(),
  mimeType: text('mime_type').notNull(),
  fileSize: integer('file_size').notNull(),
  storageProvider: text('storage_provider').default('local'),
  storagePath: text('storage_path').notNull(),
  storageBucket: text('storage_bucket'),
  checksumSha256: text('checksum_sha256').notNull(),
  checksumVerifiedAt: timestamp('checksum_verified_at'),
  virusScanStatus: text('virus_scan_status').default('pending'),
  virusScanAt: timestamp('virus_scan_at'),
  thumbnailPath: text('thumbnail_path'),
  previewGenerated: integer('preview_generated').default(0),
  textExtracted: integer('text_extracted').default(0),
  extractedText: text('extracted_text'),
  pageCount: integer('page_count'),
  uploadedBy: text('uploaded_by').notNull(),
  uploadedAt: timestamp('uploaded_at').defaultNow(),
}, (table) => ({
  orgIdx: index('document_file_org_idx').on(table.orgId),
  documentIdx: index('document_file_document_idx').on(table.documentId),
  revisionIdx: index('document_file_revision_idx').on(table.revisionId),
}));

export const approvalWorkflowDefinition = pgTable('approval_workflow_definition', {
  id: serial('id').primaryKey(),
  orgId: uuid('org_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  code: text('code').notNull(),
  description: text('description'),
  appliesToDocTypes: text('applies_to_doc_types').default('[]'),
  appliesToCategories: text('applies_to_categories').default('[]'),
  steps: text('steps').notNull(),
  allowParallelSteps: integer('allow_parallel_steps').default(0),
  requireAllSignatures: integer('require_all_signatures').default(1),
  autoObsoletePrevious: integer('auto_obsolete_previous').default(1),
  status: text('status').default('active'),
  createdBy: text('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  orgIdx: index('approval_workflow_def_org_idx').on(table.orgId),
  orgCodeIdx: uniqueIndex('approval_workflow_def_org_code_idx').on(table.orgId, table.code),
}));

export const documentTemplate = pgTable('document_template', {
  id: serial('id').primaryKey(),
  orgId: uuid('org_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  code: text('code').notNull(),
  description: text('description'),
  docType: text('doc_type').notNull(),
  category: text('category'),
  department: text('department'),
  templateFileId: integer('template_file_id').references(() => documentFile.id),
  fieldMappings: text('field_mappings').default('[]'),
  lockedZones: text('locked_zones').default('[]'),
  version: text('version').default('1'),
  status: text('status').default('draft'),
  effectiveFrom: timestamp('effective_from'),
  defaultWorkflowId: integer('default_workflow_id').references(() => approvalWorkflowDefinition.id),
  defaultReviewCycleDays: integer('default_review_cycle_days').default(365),
  createdBy: text('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  orgIdx: index('document_template_org_idx').on(table.orgId),
  orgCodeIdx: uniqueIndex('document_template_org_code_idx').on(table.orgId, table.code),
}));

export const approvalWorkflowInstance = pgTable('approval_workflow_instance', {
  id: serial('id').primaryKey(),
  orgId: uuid('org_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  workflowDefinitionId: integer('workflow_definition_id').notNull().references(() => approvalWorkflowDefinition.id),
  documentId: uuid('document_id').notNull().references(() => document.id, { onDelete: 'cascade' }),
  revisionId: uuid('revision_id').notNull().references(() => documentRevision.id, { onDelete: 'cascade' }),
  status: text('status').default('active'),
  currentStep: integer('current_step').default(1),
  startedAt: timestamp('started_at').defaultNow(),
  completedAt: timestamp('completed_at'),
  dueDate: timestamp('due_date'),
  initiatedBy: text('initiated_by').notNull(),
  cancelledBy: text('cancelled_by'),
  cancelledAt: timestamp('cancelled_at'),
  cancellationReason: text('cancellation_reason'),
}, (table) => ({
  orgIdx: index('approval_workflow_inst_org_idx').on(table.orgId),
  documentIdx: index('approval_workflow_inst_doc_idx').on(table.documentId),
  statusIdx: index('approval_workflow_inst_status_idx').on(table.status),
}));

export const approvalWorkflowStep = pgTable('approval_workflow_step', {
  id: serial('id').primaryKey(),
  workflowInstanceId: integer('workflow_instance_id').notNull().references(() => approvalWorkflowInstance.id, { onDelete: 'cascade' }),
  stepNumber: integer('step_number').notNull(),
  stepName: text('step_name').notNull(),
  assignedTo: text('assigned_to'),
  assignedRole: text('assigned_role'),
  assignedAt: timestamp('assigned_at'),
  dueDate: timestamp('due_date'),
  delegatedFrom: text('delegated_from'),
  delegatedAt: timestamp('delegated_at'),
  delegationReason: text('delegation_reason'),
  status: text('status').default('pending'),
  actionTaken: text('action_taken'),
  actionBy: text('action_by'),
  actionAt: timestamp('action_at'),
  comments: text('comments'),
  signatureRequired: integer('signature_required').default(0),
  signatureCaptured: integer('signature_captured').default(0),
  signatureData: text('signature_data'),
  reminderSentAt: timestamp('reminder_sent_at'),
  escalationSentAt: timestamp('escalation_sent_at'),
}, (table) => ({
  instanceIdx: index('approval_workflow_step_instance_idx').on(table.workflowInstanceId),
  assignedIdx: index('approval_workflow_step_assigned_idx').on(table.assignedTo),
  statusIdx: index('approval_workflow_step_status_idx').on(table.status),
}));

export const documentCheckout = pgTable('document_checkout', {
  id: serial('id').primaryKey(),
  orgId: uuid('org_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  documentId: uuid('document_id').notNull().references(() => document.id, { onDelete: 'cascade' }),
  checkedOutBy: text('checked_out_by').notNull(),
  checkedOutAt: timestamp('checked_out_at').defaultNow(),
  expectedCheckin: timestamp('expected_checkin'),
  purpose: text('purpose'),
  status: text('status').default('active'),
  checkedInAt: timestamp('checked_in_at'),
  checkedInBy: text('checked_in_by'),
  forceReleasedBy: text('force_released_by'),
  forceReleasedAt: timestamp('force_released_at'),
  forceReleaseReason: text('force_release_reason'),
}, (table) => ({
  orgIdx: index('document_checkout_org_idx').on(table.orgId),
  documentIdx: index('document_checkout_document_idx').on(table.documentId),
  statusIdx: index('document_checkout_status_idx').on(table.status),
}));

// ==========================================
// Document Control Phase 3: Distribution, Audit, Comments, External, Links
// ==========================================

export const distributionList = pgTable('distribution_list', {
  id: serial('id').primaryKey(),
  orgId: uuid('org_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  code: text('code').notNull(),
  description: text('description'),
  recipients: text('recipients').notNull().default('[]'),
  requireAcknowledgment: integer('require_acknowledgment').default(1),
  acknowledgmentDueDays: integer('acknowledgment_due_days').default(7),
  sendEmailNotification: integer('send_email_notification').default(1),
  status: text('status').default('active'),
  createdBy: text('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  orgIdx: index('distribution_list_org_idx').on(table.orgId),
  orgCodeIdx: uniqueIndex('distribution_list_org_code_idx').on(table.orgId, table.code),
}));

export const documentDistributionRecord = pgTable('document_distribution_record', {
  id: serial('id').primaryKey(),
  orgId: uuid('org_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  documentId: uuid('document_id').notNull().references(() => document.id, { onDelete: 'cascade' }),
  revisionId: uuid('revision_id').notNull().references(() => documentRevision.id, { onDelete: 'cascade' }),
  distributionListId: integer('distribution_list_id').references(() => distributionList.id),
  recipientUserId: text('recipient_user_id'),
  recipientName: text('recipient_name').notNull(),
  recipientEmail: text('recipient_email'),
  recipientRole: text('recipient_role'),
  recipientDepartment: text('recipient_department'),
  distributedAt: timestamp('distributed_at').defaultNow(),
  distributedBy: text('distributed_by').notNull(),
  distributionMethod: text('distribution_method').default('electronic'),
  copyNumber: integer('copy_number'),
  watermarkApplied: integer('watermark_applied').default(1),
  watermarkText: text('watermark_text'),
  watermarkedFileId: integer('watermarked_file_id').references(() => documentFile.id),
  requiresAcknowledgment: integer('requires_acknowledgment').default(1),
  acknowledgmentDueDate: timestamp('acknowledgment_due_date'),
  acknowledgedAt: timestamp('acknowledged_at'),
  acknowledgmentMethod: text('acknowledgment_method'),
  acknowledgmentIp: text('acknowledgment_ip'),
  acknowledgmentComment: text('acknowledgment_comment'),
  recalledAt: timestamp('recalled_at'),
  recalledBy: text('recalled_by'),
  recallReason: text('recall_reason'),
  recallAcknowledgedAt: timestamp('recall_acknowledged_at'),
  status: text('status').default('distributed'),
}, (table) => ({
  orgIdx: index('document_distribution_record_org_idx').on(table.orgId),
}));

export const documentAccessLog = pgTable('document_access_log', {
  id: serial('id').primaryKey(),
  orgId: uuid('org_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  documentId: uuid('document_id').notNull().references(() => document.id, { onDelete: 'cascade' }),
  revisionId: uuid('revision_id').references(() => documentRevision.id, { onDelete: 'cascade' }),
  fileId: integer('file_id').references(() => documentFile.id),
  userId: text('user_id').notNull(),
  userName: text('user_name'),
  userRole: text('user_role'),
  userDepartment: text('user_department'),
  action: text('action').notNull(),
  actionDetails: text('action_details'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  sessionId: text('session_id'),
  timestamp: timestamp('timestamp').defaultNow(),
  durationMs: integer('duration_ms'),
  logHash: text('log_hash'),
}, (table) => ({
  orgIdx: index('document_access_log_org_idx').on(table.orgId),
}));

export const documentPrintLog = pgTable('document_print_log', {
  id: serial('id').primaryKey(),
  orgId: uuid('org_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  documentId: uuid('document_id').notNull().references(() => document.id, { onDelete: 'cascade' }),
  revisionId: uuid('revision_id').notNull().references(() => documentRevision.id, { onDelete: 'cascade' }),
  fileId: integer('file_id').notNull().references(() => documentFile.id),
  printedBy: text('printed_by').notNull(),
  printedAt: timestamp('printed_at').defaultNow(),
  printCopies: integer('print_copies').default(1),
  printPurpose: text('print_purpose'),
  watermarkApplied: integer('watermark_applied').default(1),
  watermarkText: text('watermark_text'),
  copyNumbers: text('copy_numbers'),
  printerName: text('printer_name'),
  ipAddress: text('ip_address'),
  controlledCopies: text('controlled_copies').default('[]'),
  copiesRecalled: integer('copies_recalled').default(0),
  allRecalled: integer('all_recalled').default(0),
  recallVerifiedAt: timestamp('recall_verified_at'),
  recallVerifiedBy: text('recall_verified_by'),
}, (table) => ({
  orgIdx: index('document_print_log_org_idx').on(table.orgId),
}));

export const documentComment = pgTable('document_comment', {
  id: serial('id').primaryKey(),
  orgId: uuid('org_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  documentId: uuid('document_id').notNull().references(() => document.id, { onDelete: 'cascade' }),
  revisionId: uuid('revision_id').references(() => documentRevision.id, { onDelete: 'cascade' }),
  pageNumber: integer('page_number'),
  positionX: real('position_x'),
  positionY: real('position_y'),
  highlightedText: text('highlighted_text'),
  commentType: text('comment_type').default('general'),
  content: text('content').notNull(),
  parentCommentId: integer('parent_comment_id').references((): any => documentComment.id),
  threadResolved: integer('thread_resolved').default(0),
  resolvedBy: text('resolved_by'),
  resolvedAt: timestamp('resolved_at'),
  mentions: text('mentions').default('[]'),
  workflowStepId: integer('workflow_step_id').references(() => approvalWorkflowStep.id),
  createdBy: text('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at'),
  deletedAt: timestamp('deleted_at'),
}, (table) => ({
  orgIdx: index('document_comment_org_idx').on(table.orgId),
}));

export const externalDocument = pgTable('external_document', {
  id: serial('id').primaryKey(),
  orgId: uuid('org_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  docNumber: text('doc_number').notNull(),
  title: text('title').notNull(),
  source: text('source').notNull(),
  externalUrl: text('external_url'),
  issuingBody: text('issuing_body'),
  currentVersion: text('current_version'),
  versionDate: timestamp('version_date'),
  previousVersion: text('previous_version'),
  localFileId: integer('local_file_id').references(() => documentFile.id),
  subscriptionActive: integer('subscription_active').default(0),
  subscriptionContact: text('subscription_contact'),
  lastCheckedAt: timestamp('last_checked_at'),
  updateAvailable: integer('update_available').default(0),
  updateNotes: text('update_notes'),
  affectedInternalDocs: text('affected_internal_docs').default('[]'),
  category: text('category'),
  applicability: text('applicability'),
  status: text('status').default('active'),
  notes: text('notes'),
  createdBy: text('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at'),
}, (table) => ({
  orgIdx: index('external_document_org_idx').on(table.orgId),
  orgDocNumberIdx: uniqueIndex('external_document_org_doc_number_idx').on(table.orgId, table.docNumber),
}));

export const documentLinkEnhanced = pgTable('document_link_enhanced', {
  id: serial('id').primaryKey(),
  orgId: uuid('org_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  sourceDocumentId: uuid('source_document_id').notNull().references(() => document.id, { onDelete: 'cascade' }),
  sourceRevisionId: uuid('source_revision_id').references(() => documentRevision.id),
  targetType: text('target_type').notNull(),
  targetId: integer('target_id').notNull(),
  targetRevision: text('target_revision'),
  targetTitle: text('target_title'),
  linkType: text('link_type').notNull(),
  linkDescription: text('link_description'),
  bidirectional: integer('bidirectional').default(0),
  reverseLinkId: integer('reverse_link_id').references((): any => documentLinkEnhanced.id),
  linkVerifiedAt: timestamp('link_verified_at'),
  linkVerifiedBy: text('link_verified_by'),
  linkBroken: integer('link_broken').default(0),
  linkBrokenReason: text('link_broken_reason'),
  createdBy: text('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  orgIdx: index('document_link_enhanced_org_idx').on(table.orgId),
}));

// Document Control Relations
export const documentRelations = relations(document, ({ many }) => ({
  revisions: many(documentRevision),
  distributions: many(documentDistribution),
  reviews: many(documentReview),
  links: many(documentLink),
  files: many(documentFile),
  checkouts: many(documentCheckout),
  workflowInstances: many(approvalWorkflowInstance),
  distributionRecords: many(documentDistributionRecord),
  accessLogs: many(documentAccessLog),
  printLogs: many(documentPrintLog),
  comments: many(documentComment),
  linksFrom: many(documentLinkEnhanced),
}));

export const documentRevisionRelations = relations(documentRevision, ({ one, many }) => ({
  document: one(document, {
    fields: [documentRevision.documentId],
    references: [document.id],
  }),
  files: many(documentFile),
  workflowInstances: many(approvalWorkflowInstance),
  distributionRecords: many(documentDistributionRecord),
  accessLogs: many(documentAccessLog),
  printLogs: many(documentPrintLog),
  comments: many(documentComment),
}));

export const documentDistributionRelations = relations(documentDistribution, ({ one }) => ({
  document: one(document, {
    fields: [documentDistribution.documentId],
    references: [document.id],
  }),
  revision: one(documentRevision, {
    fields: [documentDistribution.revisionId],
    references: [documentRevision.id],
  }),
}));

export const documentReviewRelations = relations(documentReview, ({ one }) => ({
  document: one(document, {
    fields: [documentReview.documentId],
    references: [document.id],
  }),
}));

export const documentLinkRelations = relations(documentLink, ({ one }) => ({
  sourceDoc: one(document, {
    fields: [documentLink.sourceDocId],
    references: [document.id],
  }),
}));

// Document Control Phase 2 Relations
export const documentFileRelations = relations(documentFile, ({ one }) => ({
  document: one(document, {
    fields: [documentFile.documentId],
    references: [document.id],
  }),
  revision: one(documentRevision, {
    fields: [documentFile.revisionId],
    references: [documentRevision.id],
  }),
}));

export const documentTemplateRelations = relations(documentTemplate, ({ one }) => ({
  templateFile: one(documentFile, {
    fields: [documentTemplate.templateFileId],
    references: [documentFile.id],
  }),
  defaultWorkflow: one(approvalWorkflowDefinition, {
    fields: [documentTemplate.defaultWorkflowId],
    references: [approvalWorkflowDefinition.id],
  }),
}));

export const approvalWorkflowDefinitionRelations = relations(approvalWorkflowDefinition, ({ many }) => ({
  instances: many(approvalWorkflowInstance),
  templates: many(documentTemplate),
}));

export const approvalWorkflowInstanceRelations = relations(approvalWorkflowInstance, ({ one, many }) => ({
  definition: one(approvalWorkflowDefinition, {
    fields: [approvalWorkflowInstance.workflowDefinitionId],
    references: [approvalWorkflowDefinition.id],
  }),
  document: one(document, {
    fields: [approvalWorkflowInstance.documentId],
    references: [document.id],
  }),
  revision: one(documentRevision, {
    fields: [approvalWorkflowInstance.revisionId],
    references: [documentRevision.id],
  }),
  steps: many(approvalWorkflowStep),
}));

export const approvalWorkflowStepRelations = relations(approvalWorkflowStep, ({ one }) => ({
  workflowInstance: one(approvalWorkflowInstance, {
    fields: [approvalWorkflowStep.workflowInstanceId],
    references: [approvalWorkflowInstance.id],
  }),
}));

export const documentCheckoutRelations = relations(documentCheckout, ({ one }) => ({
  document: one(document, {
    fields: [documentCheckout.documentId],
    references: [document.id],
  }),
}));

// Document Control Phase 3 Relations
export const distributionListRelations = relations(distributionList, ({ many }) => ({
  distributionRecords: many(documentDistributionRecord),
}));

export const documentDistributionRecordRelations = relations(documentDistributionRecord, ({ one }) => ({
  document: one(document, {
    fields: [documentDistributionRecord.documentId],
    references: [document.id],
  }),
  revision: one(documentRevision, {
    fields: [documentDistributionRecord.revisionId],
    references: [documentRevision.id],
  }),
  distributionList: one(distributionList, {
    fields: [documentDistributionRecord.distributionListId],
    references: [distributionList.id],
  }),
  watermarkedFile: one(documentFile, {
    fields: [documentDistributionRecord.watermarkedFileId],
    references: [documentFile.id],
  }),
}));

export const documentAccessLogRelations = relations(documentAccessLog, ({ one }) => ({
  document: one(document, {
    fields: [documentAccessLog.documentId],
    references: [document.id],
  }),
  revision: one(documentRevision, {
    fields: [documentAccessLog.revisionId],
    references: [documentRevision.id],
  }),
  file: one(documentFile, {
    fields: [documentAccessLog.fileId],
    references: [documentFile.id],
  }),
}));

export const documentPrintLogRelations = relations(documentPrintLog, ({ one }) => ({
  document: one(document, {
    fields: [documentPrintLog.documentId],
    references: [document.id],
  }),
  revision: one(documentRevision, {
    fields: [documentPrintLog.revisionId],
    references: [documentRevision.id],
  }),
  file: one(documentFile, {
    fields: [documentPrintLog.fileId],
    references: [documentFile.id],
  }),
}));

export const documentCommentRelations = relations(documentComment, ({ one, many }) => ({
  document: one(document, {
    fields: [documentComment.documentId],
    references: [document.id],
  }),
  revision: one(documentRevision, {
    fields: [documentComment.revisionId],
    references: [documentRevision.id],
  }),
  parentComment: one(documentComment, {
    fields: [documentComment.parentCommentId],
    references: [documentComment.id],
    relationName: 'commentThread',
  }),
  replies: many(documentComment, { relationName: 'commentThread' }),
  workflowStep: one(approvalWorkflowStep, {
    fields: [documentComment.workflowStepId],
    references: [approvalWorkflowStep.id],
  }),
}));

export const externalDocumentRelations = relations(externalDocument, ({ one }) => ({
  localFile: one(documentFile, {
    fields: [externalDocument.localFileId],
    references: [documentFile.id],
  }),
}));

export const documentLinkEnhancedRelations = relations(documentLinkEnhanced, ({ one }) => ({
  sourceDocument: one(document, {
    fields: [documentLinkEnhanced.sourceDocumentId],
    references: [document.id],
  }),
  sourceRevision: one(documentRevision, {
    fields: [documentLinkEnhanced.sourceRevisionId],
    references: [documentRevision.id],
  }),
  reverseLink: one(documentLinkEnhanced, {
    fields: [documentLinkEnhanced.reverseLinkId],
    references: [documentLinkEnhanced.id],
    relationName: 'reverseLinkPair',
  }),
}));

// ==========================================
// CAPA/8D Module: Core Tables
// ==========================================

export const capa = pgTable('capa', {
  id: serial('id').primaryKey(),
  orgId: uuid('org_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  capaNumber: text('capa_number').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  type: text('type').notNull(), // corrective / preventive / both
  priority: text('priority').notNull().default('medium'), // critical / high / medium / low
  status: text('status').notNull().default('d0_awareness'),
  currentDiscipline: text('current_discipline').notNull().default('D0'),
  sourceType: text('source_type').notNull(), // customer_complaint / internal_ncr / audit_finding / supplier_issue / pfmea_risk / process_deviation / other
  sourceId: integer('source_id'),
  category: text('category'), // quality / safety / delivery / cost / environmental
  subcategory: text('subcategory'),
  productLine: text('product_line'),
  partNumbers: text('part_numbers').default('[]'),
  processIds: text('process_ids').default('[]'),
  plantLocation: text('plant_location'),
  customerName: text('customer_name'),
  customerPartNumber: text('customer_part_number'),
  dateOccurred: timestamp('date_occurred'),
  dateDiscovered: timestamp('date_discovered').defaultNow(),
  dateReported: timestamp('date_reported'),
  targetClosureDate: timestamp('target_closure_date'),
  actualClosureDate: timestamp('actual_closure_date'),
  recurrenceCheck: integer('recurrence_check').default(0),
  recurrenceCheckDate: timestamp('recurrence_check_date'),
  recurrenceResult: text('recurrence_result'), // no_recurrence / recurred / pending
  effectivenessVerified: integer('effectiveness_verified').default(0),
  effectivenessDate: timestamp('effectiveness_date'),
  effectivenessResult: text('effectiveness_result'), // effective / not_effective / partially_effective
  costOfQuality: real('cost_of_quality'),
  costBreakdown: text('cost_breakdown').default('{}'),
  riskLevel: text('risk_level'), // high / medium / low
  approvalStatus: text('approval_status').default('draft'), // draft / pending_review / approved / rejected
  approvedBy: text('approved_by'),
  approvedAt: timestamp('approved_at'),
  closedBy: text('closed_by'),
  closedAt: timestamp('closed_at'),
  createdBy: text('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  deletedAt: timestamp('deleted_at'),
}, (table) => ({
  orgIdx: index('capa_org_idx').on(table.orgId),
  capaNumberIdx: uniqueIndex('capa_org_number_idx').on(table.orgId, table.capaNumber),
  statusIdx: index('capa_status_idx').on(table.status),
  priorityIdx: index('capa_priority_idx').on(table.priority),
  sourceTypeIdx: index('capa_main_source_type_idx').on(table.sourceType),
  createdAtIdx: index('capa_created_at_idx').on(table.createdAt),
}));

export const capaTeamMember = pgTable('capa_team_member', {
  id: serial('id').primaryKey(),
  orgId: uuid('org_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  capaId: integer('capa_id').notNull().references(() => capa.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull(),
  userName: text('user_name').notNull(),
  userEmail: text('user_email'),
  role: text('role').notNull(), // champion / leader / quality_engineer / process_engineer / manufacturing_engineer / supplier_quality / design_engineer / production_supervisor / operator / maintenance / logistics / customer_contact / subject_matter_expert / observer
  department: text('department'),
  expertise: text('expertise'),
  responsibilities: text('responsibilities'),
  timeCommitment: text('time_commitment'),
  isChampion: integer('is_champion').default(0),
  isLeader: integer('is_leader').default(0),
  joinedAt: timestamp('joined_at').defaultNow(),
  leftAt: timestamp('left_at'),
  leftReason: text('left_reason'),
  notificationsEnabled: integer('notifications_enabled').default(1),
  lastActivityAt: timestamp('last_activity_at'),
  createdBy: text('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  capaIdx: index('capa_team_member_capa_idx').on(table.capaId),
  userIdx: index('capa_team_member_user_idx').on(table.userId),
  roleIdx: index('capa_team_member_role_idx').on(table.role),
  uniqueMember: uniqueIndex('capa_team_member_unique_idx').on(table.capaId, table.userId),
}));

export const capaSource = pgTable('capa_source', {
  id: serial('id').primaryKey(),
  orgId: uuid('org_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  capaId: integer('capa_id').notNull().references(() => capa.id, { onDelete: 'cascade' }),
  sourceType: text('source_type').notNull(),
  sourceSystem: text('source_system'), // internal / customer_portal / supplier_portal / qms / erp / manual
  externalId: text('external_id'),
  externalUrl: text('external_url'),
  customerComplaintNumber: text('customer_complaint_number'),
  ncrNumber: text('ncr_number'),
  auditId: text('audit_id'),
  auditType: text('audit_type'), // internal / external / customer / certification
  auditFindingCategory: text('audit_finding_category'), // major / minor / observation / opportunity
  supplierName: text('supplier_name'),
  supplierCode: text('supplier_code'),
  pfmeaId: integer('pfmea_id'),
  pfmeaRowId: integer('pfmea_row_id'),
  controlPlanId: integer('control_plan_id'),
  processDeviationId: text('process_deviation_id'),
  originalReportDate: timestamp('original_report_date'),
  originalReporter: text('original_reporter'),
  originalReporterContact: text('original_reporter_contact'),
  quantityAffected: integer('quantity_affected'),
  lotNumbers: text('lot_numbers').default('[]'),
  serialNumbers: text('serial_numbers').default('[]'),
  dateCodeRange: text('date_code_range'),
  shipmentInfo: text('shipment_info').default('{}'),
  receivedCondition: text('received_condition'),
  initialAssessment: text('initial_assessment'),
  evidenceCollected: text('evidence_collected').default('[]'),
  createdBy: text('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  capaIdx: index('capa_source_capa_idx').on(table.capaId),
  sourceTypeIdx: index('capa_source_type_idx').on(table.sourceType),
  externalIdIdx: index('capa_source_external_id_idx').on(table.externalId),
}));

export const capaAttachment = pgTable('capa_attachment', {
  id: serial('id').primaryKey(),
  orgId: uuid('org_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  capaId: integer('capa_id').notNull().references(() => capa.id, { onDelete: 'cascade' }),
  discipline: text('discipline'), // D0-D8 or general
  attachmentType: text('attachment_type').notNull(), // photo / video / document / report / drawing / data / email / presentation / form / certificate / other
  title: text('title').notNull(),
  description: text('description'),
  fileName: text('file_name').notNull(),
  originalName: text('original_name').notNull(),
  fileType: text('file_type').notNull(),
  mimeType: text('mime_type').notNull(),
  fileSize: integer('file_size').notNull(),
  storagePath: text('storage_path').notNull(),
  storageProvider: text('storage_provider').default('local'),
  checksumSha256: text('checksum_sha256').notNull(),
  thumbnailPath: text('thumbnail_path'),
  isEvidence: integer('is_evidence').default(0),
  evidenceDescription: text('evidence_description'),
  evidenceCollectedAt: timestamp('evidence_collected_at'),
  evidenceCollectedBy: text('evidence_collected_by'),
  evidenceChainOfCustody: text('evidence_chain_of_custody').default('[]'),
  linkedDocumentId: integer('linked_document_id'),
  uploadedBy: text('uploaded_by').notNull(),
  uploadedAt: timestamp('uploaded_at').defaultNow(),
  deletedAt: timestamp('deleted_at'),
  deletedBy: text('deleted_by'),
  deletionReason: text('deletion_reason'),
}, (table) => ({
  capaIdx: index('capa_attachment_capa_idx').on(table.capaId),
  disciplineIdx: index('capa_attachment_discipline_idx').on(table.discipline),
  typeIdx: index('capa_attachment_type_idx').on(table.attachmentType),
  evidenceIdx: index('capa_attachment_evidence_idx').on(table.isEvidence),
}));

export const capaRelatedRecord = pgTable('capa_related_record', {
  id: serial('id').primaryKey(),
  orgId: uuid('org_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  capaId: integer('capa_id').notNull().references(() => capa.id, { onDelete: 'cascade' }),
  relatedType: text('related_type').notNull(), // capa / document / pfmea / pfmea_row / control_plan / control_plan_row / part / process / equipment / gage / supplier / training_record / audit
  relatedId: integer('related_id').notNull(),
  relationshipType: text('relationship_type').notNull(), // caused_by / affected / updated_as_result / evidence_for / similar_issue / duplicate_of / parent / child / reference
  relationshipDescription: text('relationship_description'),
  linkedAt: timestamp('linked_at').defaultNow(),
  linkedBy: text('linked_by').notNull(),
  verifiedAt: timestamp('verified_at'),
  verifiedBy: text('verified_by'),
  notes: text('notes'),
}, (table) => ({
  capaIdx: index('capa_related_record_capa_idx').on(table.capaId),
  relatedIdx: index('capa_related_record_related_idx').on(table.relatedType, table.relatedId),
  uniqueLink: uniqueIndex('capa_related_record_unique_idx').on(table.capaId, table.relatedType, table.relatedId, table.relationshipType),
}));

export const capaNumberSequence = pgTable('capa_number_sequence', {
  id: serial('id').primaryKey(),
  orgId: uuid('org_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  year: integer('year').notNull(),
  lastNumber: integer('last_number').notNull().default(0),
  prefix: text('prefix').default('CAPA'),
  format: text('format').default('{prefix}-{year}-{seq:4}'),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  uniqueOrgYear: uniqueIndex('capa_number_sequence_org_year_idx').on(table.orgId, table.year),
}));

// ==========================================
// CAPA/8D Module: D0-D3 Discipline Tables
// ==========================================

export const capaD0Emergency = pgTable('capa_d0_emergency', {
  id: serial('id').primaryKey(),
  orgId: uuid('org_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  capaId: integer('capa_id').notNull().references(() => capa.id, { onDelete: 'cascade' }),
  emergencyResponseRequired: integer('emergency_response_required').notNull().default(0),
  responseType: text('response_type'), // containment / stop_shipment / customer_notification / recall / none
  immediateThreat: text('immediate_threat'),
  threatLevel: text('threat_level').default('none'), // critical / high / medium / low / none
  safetyImpact: integer('safety_impact').default(0),
  safetyDescription: text('safety_description'),
  regulatoryImpact: integer('regulatory_impact').default(0),
  regulatoryBody: text('regulatory_body'),
  regulatoryDeadline: timestamp('regulatory_deadline'),
  regulatorySubmittedAt: timestamp('regulatory_submitted_at'),
  customerNotificationRequired: integer('customer_notification_required').default(0),
  customerNotifiedAt: timestamp('customer_notified_at'),
  customerNotifiedBy: text('customer_notified_by'),
  customerResponse: text('customer_response'),
  stopShipmentIssued: integer('stop_shipment_issued').default(0),
  stopShipmentScope: text('stop_shipment_scope'),
  stopShipmentIssuedAt: timestamp('stop_shipment_issued_at'),
  stopShipmentIssuedBy: text('stop_shipment_issued_by'),
  stopShipmentLiftedAt: timestamp('stop_shipment_lifted_at'),
  stopShipmentLiftedBy: text('stop_shipment_lifted_by'),
  emergencyActions: text('emergency_actions').default('[]'),
  quantityAtRisk: integer('quantity_at_risk'),
  quantityContained: integer('quantity_contained'),
  containmentLocations: text('containment_locations').default('[]'),
  initialSortRequired: integer('initial_sort_required').default(0),
  sortMethod: text('sort_method'),
  sortResults: text('sort_results').default('{}'),
  symptomsCaptured: integer('symptoms_captured').default(0),
  symptomsDescription: text('symptoms_description'),
  d0CompletedAt: timestamp('d0_completed_at'),
  d0CompletedBy: text('d0_completed_by'),
  d0VerifiedAt: timestamp('d0_verified_at'),
  d0VerifiedBy: text('d0_verified_by'),
  d0Notes: text('d0_notes'),
  createdBy: text('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  capaIdx: uniqueIndex('capa_d0_emergency_capa_idx').on(table.capaId),
  threatLevelIdx: index('capa_d0_emergency_threat_idx').on(table.threatLevel),
  safetyIdx: index('capa_d0_emergency_safety_idx').on(table.safetyImpact),
}));

export const capaD1TeamDetail = pgTable('capa_d1_team_detail', {
  id: serial('id').primaryKey(),
  orgId: uuid('org_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  capaId: integer('capa_id').notNull().references(() => capa.id, { onDelete: 'cascade' }),
  teamFormationDate: timestamp('team_formation_date'),
  teamFormationMethod: text('team_formation_method'), // ad_hoc / standard_roster / cross_functional
  teamCharterDefined: integer('team_charter_defined').default(0),
  teamCharterDocument: text('team_charter_document'),
  teamObjective: text('team_objective'),
  teamScope: text('team_scope'),
  teamBoundaries: text('team_boundaries'),
  communicationPlan: text('communication_plan').default('{}'),
  meetingSchedule: text('meeting_schedule').default('[]'),
  escalationPath: text('escalation_path').default('[]'),
  resourcesRequired: text('resources_required').default('[]'),
  resourcesApproved: integer('resources_approved').default(0),
  resourcesApprovedBy: text('resources_approved_by'),
  resourcesApprovedAt: timestamp('resources_approved_at'),
  skillsGapIdentified: text('skills_gap_identified').default('[]'),
  skillsGapAddressed: integer('skills_gap_addressed').default(0),
  teamEffectivenessScore: integer('team_effectiveness_score'),
  teamEffectivenessNotes: text('team_effectiveness_notes'),
  d1CompletedAt: timestamp('d1_completed_at'),
  d1CompletedBy: text('d1_completed_by'),
  d1VerifiedAt: timestamp('d1_verified_at'),
  d1VerifiedBy: text('d1_verified_by'),
  d1Notes: text('d1_notes'),
  createdBy: text('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  capaIdx: uniqueIndex('capa_d1_team_detail_capa_idx').on(table.capaId),
}));

export const capaD2Problem = pgTable('capa_d2_problem', {
  id: serial('id').primaryKey(),
  orgId: uuid('org_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  capaId: integer('capa_id').notNull().references(() => capa.id, { onDelete: 'cascade' }),
  problemStatement: text('problem_statement').notNull(),
  problemStatementVerified: integer('problem_statement_verified').default(0),
  problemStatementVerifiedBy: text('problem_statement_verified_by'),
  objectDescription: text('object_description'),
  defectDescription: text('defect_description'),
  isNotWhat: text('is_not_what').default('{}'),
  whereGeographic: text('where_geographic'),
  whereOnObject: text('where_on_object'),
  isNotWhere: text('is_not_where').default('{}'),
  whenFirstObserved: timestamp('when_first_observed'),
  whenPattern: text('when_pattern'),
  whenLifecycle: text('when_lifecycle'),
  isNotWhen: text('is_not_when').default('{}'),
  howManyUnits: integer('how_many_units'),
  howManyDefects: integer('how_many_defects'),
  howManyTrend: text('how_many_trend'),
  isNotHowMany: text('is_not_how_many').default('{}'),
  distinctionsSummary: text('distinctions_summary'),
  changesSummary: text('changes_summary'),
  problemExtent: text('problem_extent'),
  problemImpact: text('problem_impact'),
  fiveWsComplete: integer('five_ws_complete').default(0),
  dataCollectionPlan: text('data_collection_plan').default('{}'),
  dataCollected: text('data_collected').default('[]'),
  measurementSystemValid: integer('measurement_system_valid').default(0),
  measurementSystemNotes: text('measurement_system_notes'),
  d2CompletedAt: timestamp('d2_completed_at'),
  d2CompletedBy: text('d2_completed_by'),
  d2VerifiedAt: timestamp('d2_verified_at'),
  d2VerifiedBy: text('d2_verified_by'),
  d2Notes: text('d2_notes'),
  createdBy: text('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  capaIdx: uniqueIndex('capa_d2_problem_capa_idx').on(table.capaId),
}));

export const capaD3Containment = pgTable('capa_d3_containment', {
  id: serial('id').primaryKey(),
  orgId: uuid('org_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  capaId: integer('capa_id').notNull().references(() => capa.id, { onDelete: 'cascade' }),
  containmentRequired: integer('containment_required').notNull().default(1),
  containmentNotRequiredReason: text('containment_not_required_reason'),
  containmentStrategy: text('containment_strategy'),
  containmentScope: text('containment_scope').default('{}'),
  containmentLocations: text('containment_locations').default('[]'),
  actions: text('actions').default('[]'),
  verificationMethod: text('verification_method'),
  verificationFrequency: text('verification_frequency'),
  verificationResults: text('verification_results').default('[]'),
  containmentEffective: integer('containment_effective').default(0),
  containmentEffectiveDate: timestamp('containment_effective_date'),
  containmentEffectiveEvidence: text('containment_effective_evidence'),
  quantityInspected: integer('quantity_inspected').default(0),
  quantityPassed: integer('quantity_passed').default(0),
  quantityFailed: integer('quantity_failed').default(0),
  quantityReworked: integer('quantity_reworked').default(0),
  quantityScrapped: integer('quantity_scrapped').default(0),
  quantityOnHold: integer('quantity_on_hold').default(0),
  wip: text('wip').default('{}'),
  finishedGoods: text('finished_goods').default('{}'),
  inTransit: text('in_transit').default('{}'),
  atCustomer: text('at_customer').default('{}'),
  supplierContainment: text('supplier_containment').default('{}'),
  sortingInstructions: text('sorting_instructions'),
  sortingTraining: integer('sorting_training').default(0),
  sortingStartDate: timestamp('sorting_start_date'),
  sortingEndDate: timestamp('sorting_end_date'),
  costOfContainment: real('cost_of_containment').default(0),
  costBreakdown: text('cost_breakdown').default('{}'),
  customerApprovalRequired: integer('customer_approval_required').default(0),
  customerApprovalReceived: integer('customer_approval_received').default(0),
  customerApprovalDate: timestamp('customer_approval_date'),
  customerApprovalReference: text('customer_approval_reference'),
  exitCriteria: text('exit_criteria'),
  exitCriteriaMet: integer('exit_criteria_met').default(0),
  exitCriteriaMetDate: timestamp('exit_criteria_met_date'),
  transitionToPermanent: text('transition_to_permanent'),
  d3CompletedAt: timestamp('d3_completed_at'),
  d3CompletedBy: text('d3_completed_by'),
  d3VerifiedAt: timestamp('d3_verified_at'),
  d3VerifiedBy: text('d3_verified_by'),
  d3Notes: text('d3_notes'),
  createdBy: text('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  capaIdx: uniqueIndex('capa_d3_containment_capa_idx').on(table.capaId),
  effectiveIdx: index('capa_d3_containment_effective_idx').on(table.containmentEffective),
}));

// ==========================================
// CAPA/8D Module: D4-D6 Discipline Tables
// ==========================================

export const capaD4RootCause = pgTable('capa_d4_root_cause', {
  id: serial('id').primaryKey(),
  orgId: uuid('org_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  capaId: integer('capa_id').notNull().references(() => capa.id, { onDelete: 'cascade' }),
  analysisApproach: text('analysis_approach').default('[]'),
  possibleCauses: text('possible_causes').default('[]'),
  fiveWhyAnalysis: text('five_why_analysis').default('[]'),
  fishboneDiagram: text('fishbone_diagram').default('{}'),
  faultTreeAnalysis: text('fault_tree_analysis').default('{}'),
  isIsNotConclusions: text('is_is_not_conclusions'),
  dataAnalysis: text('data_analysis').default('[]'),
  experimentsConducted: text('experiments_conducted').default('[]'),
  verificationTests: text('verification_tests').default('[]'),
  rootCauseOccurrence: text('root_cause_occurrence'),
  rootCauseOccurrenceEvidence: text('root_cause_occurrence_evidence'),
  rootCauseOccurrenceVerified: integer('root_cause_occurrence_verified').default(0),
  rootCauseOccurrenceVerifiedBy: text('root_cause_occurrence_verified_by'),
  rootCauseOccurrenceVerifiedAt: timestamp('root_cause_occurrence_verified_at'),
  rootCauseEscape: text('root_cause_escape'),
  rootCauseEscapeEvidence: text('root_cause_escape_evidence'),
  rootCauseEscapeVerified: integer('root_cause_escape_verified').default(0),
  rootCauseEscapeVerifiedBy: text('root_cause_escape_verified_by'),
  rootCauseEscapeVerifiedAt: timestamp('root_cause_escape_verified_at'),
  escapePoint: text('escape_point'),
  escapePointAnalysis: text('escape_point_analysis'),
  systemicCauses: text('systemic_causes').default('[]'),
  contributingFactors: text('contributing_factors').default('[]'),
  humanFactorsAnalysis: text('human_factors_analysis').default('{}'),
  equipmentFactorsAnalysis: text('equipment_factors_analysis').default('{}'),
  materialFactorsAnalysis: text('material_factors_analysis').default('{}'),
  methodFactorsAnalysis: text('method_factors_analysis').default('{}'),
  environmentFactorsAnalysis: text('environment_factors_analysis').default('{}'),
  rootCauseSummary: text('root_cause_summary'),
  confidenceLevel: text('confidence_level'), // high / medium / low
  additionalInvestigationNeeded: integer('additional_investigation_needed').default(0),
  additionalInvestigationPlan: text('additional_investigation_plan'),
  d4CompletedAt: timestamp('d4_completed_at'),
  d4CompletedBy: text('d4_completed_by'),
  d4VerifiedAt: timestamp('d4_verified_at'),
  d4VerifiedBy: text('d4_verified_by'),
  d4Notes: text('d4_notes'),
  createdBy: text('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  capaIdx: uniqueIndex('capa_d4_root_cause_capa_idx').on(table.capaId),
  confidenceIdx: index('capa_d4_root_cause_confidence_idx').on(table.confidenceLevel),
}));

export const capaD4RootCauseCandidate = pgTable('capa_d4_root_cause_candidate', {
  id: serial('id').primaryKey(),
  orgId: uuid('org_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  capaId: integer('capa_id').notNull().references(() => capa.id, { onDelete: 'cascade' }),
  d4Id: integer('d4_id').notNull().references(() => capaD4RootCause.id, { onDelete: 'cascade' }),
  causeType: text('cause_type').notNull(), // occurrence / escape / systemic / contributing
  category: text('category'), // man / machine / material / method / measurement / environment
  description: text('description').notNull(),
  source: text('source'), // brainstorm / 5why / fishbone / data_analysis / expert
  evidenceFor: text('evidence_for').default('[]'),
  evidenceAgainst: text('evidence_against').default('[]'),
  likelihood: text('likelihood').default('medium'), // high / medium / low
  verificationMethod: text('verification_method'),
  verificationResult: text('verification_result'), // confirmed / refuted / inconclusive
  verifiedAt: timestamp('verified_at'),
  verifiedBy: text('verified_by'),
  isRootCause: integer('is_root_cause').default(0),
  linkedTo5Why: text('linked_to_5why'),
  linkedToFishbone: text('linked_to_fishbone'),
  notes: text('notes'),
  createdBy: text('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  capaIdx: index('capa_d4_candidate_capa_idx').on(table.capaId),
  d4Idx: index('capa_d4_candidate_d4_idx').on(table.d4Id),
  rootCauseIdx: index('capa_d4_candidate_root_cause_idx').on(table.isRootCause),
  verificationIdx: index('capa_d4_candidate_verification_idx').on(table.verificationResult),
}));

export const capaD5CorrectiveAction = pgTable('capa_d5_corrective_action', {
  id: serial('id').primaryKey(),
  orgId: uuid('org_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  capaId: integer('capa_id').notNull().references(() => capa.id, { onDelete: 'cascade' }),
  correctiveActionsSelected: text('corrective_actions_selected').default('[]'),
  alternativesConsidered: text('alternatives_considered').default('[]'),
  selectionCriteria: text('selection_criteria').default('{}'),
  occurrenceActionSummary: text('occurrence_action_summary'),
  escapeActionSummary: text('escape_action_summary'),
  riskAssessment: text('risk_assessment').default('{}'),
  implementationPlan: text('implementation_plan').default('{}'),
  resourceRequirements: text('resource_requirements').default('{}'),
  resourcesApproved: integer('resources_approved').default(0),
  resourcesApprovedBy: text('resources_approved_by'),
  resourcesApprovedAt: timestamp('resources_approved_at'),
  timeline: text('timeline').default('[]'),
  dependencies: text('dependencies').default('[]'),
  potentialObstacles: text('potential_obstacles').default('[]'),
  contingencyPlan: text('contingency_plan'),
  pfmeaUpdatesRequired: integer('pfmea_updates_required').default(0),
  pfmeaUpdatePlan: text('pfmea_update_plan'),
  controlPlanUpdatesRequired: integer('control_plan_updates_required').default(0),
  controlPlanUpdatePlan: text('control_plan_update_plan'),
  documentUpdatesRequired: integer('document_updates_required').default(0),
  documentUpdateList: text('document_update_list').default('[]'),
  trainingRequired: integer('training_required').default(0),
  trainingPlan: text('training_plan').default('{}'),
  customerApprovalRequired: integer('customer_approval_required').default(0),
  customerApprovalStatus: text('customer_approval_status'),
  customerApprovalDate: timestamp('customer_approval_date'),
  customerApprovalNotes: text('customer_approval_notes'),
  managementApprovalRequired: integer('management_approval_required').default(1),
  managementApprovalStatus: text('management_approval_status'),
  managementApprovedBy: text('management_approved_by'),
  managementApprovedAt: timestamp('management_approved_at'),
  estimatedCost: real('estimated_cost'),
  estimatedSavings: real('estimated_savings'),
  estimatedPaybackMonths: integer('estimated_payback_months'),
  d5CompletedAt: timestamp('d5_completed_at'),
  d5CompletedBy: text('d5_completed_by'),
  d5VerifiedAt: timestamp('d5_verified_at'),
  d5VerifiedBy: text('d5_verified_by'),
  d5Notes: text('d5_notes'),
  createdBy: text('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  capaIdx: uniqueIndex('capa_d5_corrective_action_capa_idx').on(table.capaId),
  approvalIdx: index('capa_d5_corrective_action_approval_idx').on(table.managementApprovalStatus),
}));

export const capaD6Validation = pgTable('capa_d6_validation', {
  id: serial('id').primaryKey(),
  orgId: uuid('org_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  capaId: integer('capa_id').notNull().references(() => capa.id, { onDelete: 'cascade' }),
  implementationStatus: text('implementation_status').default('not_started'), // not_started / in_progress / complete
  implementationProgress: integer('implementation_progress').default(0),
  implementationLog: text('implementation_log').default('[]'),
  actionsImplemented: text('actions_implemented').default('[]'),
  actionsPending: text('actions_pending').default('[]'),
  delaysEncountered: text('delays_encountered').default('[]'),
  deviationsFromPlan: text('deviations_from_plan').default('[]'),
  containmentRemoved: integer('containment_removed').default(0),
  containmentRemovedAt: timestamp('containment_removed_at'),
  containmentRemovalVerifiedBy: text('containment_removal_verified_by'),
  preImplementationBaseline: text('pre_implementation_baseline').default('{}'),
  postImplementationData: text('post_implementation_data').default('{}'),
  validationPlan: text('validation_plan').default('{}'),
  validationTests: text('validation_tests').default('[]'),
  validationResults: text('validation_results').default('[]'),
  statisticalValidation: text('statistical_validation').default('{}'),
  effectivenessCheckDate: timestamp('effectiveness_check_date'),
  effectivenessCheckPeriod: text('effectiveness_check_period'),
  effectivenessMetric: text('effectiveness_metric'),
  effectivenessTarget: text('effectiveness_target'),
  effectivenessActual: text('effectiveness_actual'),
  effectivenessVerified: integer('effectiveness_verified').default(0),
  effectivenessVerifiedBy: text('effectiveness_verified_by'),
  effectivenessVerifiedAt: timestamp('effectiveness_verified_at'),
  effectivenessResult: text('effectiveness_result'), // effective / partially_effective / not_effective
  effectivenessEvidence: text('effectiveness_evidence'),
  reoccurrenceCheck: integer('reoccurrence_check').default(0),
  reoccurrenceCheckDate: timestamp('reoccurrence_check_date'),
  reoccurrenceCheckMethod: text('reoccurrence_check_method'),
  pfmeaUpdated: integer('pfmea_updated').default(0),
  pfmeaUpdateDetails: text('pfmea_update_details'),
  controlPlanUpdated: integer('control_plan_updated').default(0),
  controlPlanUpdateDetails: text('control_plan_update_details'),
  documentsUpdated: text('documents_updated').default('[]'),
  trainingCompleted: integer('training_completed').default(0),
  trainingRecords: text('training_records').default('[]'),
  customerNotified: integer('customer_notified').default(0),
  customerNotificationDate: timestamp('customer_notification_date'),
  customerAcceptance: text('customer_acceptance'), // accepted / pending / rejected
  lessonsLearned: text('lessons_learned').default('[]'),
  d6CompletedAt: timestamp('d6_completed_at'),
  d6CompletedBy: text('d6_completed_by'),
  d6VerifiedAt: timestamp('d6_verified_at'),
  d6VerifiedBy: text('d6_verified_by'),
  d6Notes: text('d6_notes'),
  createdBy: text('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  capaIdx: uniqueIndex('capa_d6_validation_capa_idx').on(table.capaId),
  statusIdx: index('capa_d6_validation_status_idx').on(table.implementationStatus),
  effectivenessIdx: index('capa_d6_validation_effectiveness_idx').on(table.effectivenessResult),
}));

// ==========================================
// CAPA/8D Module: D7-D8 + Audit + Metrics Tables
// ==========================================

export const capaD7Preventive = pgTable('capa_d7_preventive', {
  id: serial('id').primaryKey(),
  orgId: uuid('org_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  capaId: integer('capa_id').notNull().references(() => capa.id, { onDelete: 'cascade' }),
  systemicAnalysisComplete: integer('systemic_analysis_complete').default(0),
  systemicAnalysisSummary: text('systemic_analysis_summary'),
  managementSystemsReviewed: text('management_systems_reviewed').default('[]'),
  similarProcessesIdentified: text('similar_processes_identified').default('[]'),
  similarProductsIdentified: text('similar_products_identified').default('[]'),
  otherPlantsIdentified: text('other_plants_identified').default('[]'),
  horizontalDeploymentPlan: text('horizontal_deployment_plan').default('{}'),
  preventiveActions: text('preventive_actions').default('[]'),
  policyChangesRequired: integer('policy_changes_required').default(0),
  policyChanges: text('policy_changes').default('[]'),
  procedureChangesRequired: integer('procedure_changes_required').default(0),
  procedureChanges: text('procedure_changes').default('[]'),
  systemChangesRequired: integer('system_changes_required').default(0),
  systemChanges: text('system_changes').default('[]'),
  designChangesRequired: integer('design_changes_required').default(0),
  designChanges: text('design_changes').default('[]'),
  supplierActionsRequired: integer('supplier_actions_required').default(0),
  supplierActions: text('supplier_actions').default('[]'),
  fmeaSystemReviewComplete: integer('fmea_system_review_complete').default(0),
  fmeaSystemReviewNotes: text('fmea_system_review_notes'),
  lessonLearnedCreated: integer('lesson_learned_created').default(0),
  lessonLearnedReference: text('lesson_learned_reference'),
  knowledgeBaseUpdated: integer('knowledge_base_updated').default(0),
  knowledgeBaseEntries: text('knowledge_base_entries').default('[]'),
  trainingMaterialsUpdated: integer('training_materials_updated').default(0),
  trainingMaterialsList: text('training_materials_list').default('[]'),
  auditChecklistUpdated: integer('audit_checklist_updated').default(0),
  auditChecklistChanges: text('audit_checklist_changes'),
  standardizationComplete: integer('standardization_complete').default(0),
  standardizationSummary: text('standardization_summary'),
  preventiveActionVerification: text('preventive_action_verification').default('[]'),
  d7CompletedAt: timestamp('d7_completed_at'),
  d7CompletedBy: text('d7_completed_by'),
  d7VerifiedAt: timestamp('d7_verified_at'),
  d7VerifiedBy: text('d7_verified_by'),
  d7Notes: text('d7_notes'),
  createdBy: text('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  capaIdx: uniqueIndex('capa_d7_preventive_capa_idx').on(table.capaId),
}));

export const capaD8Closure = pgTable('capa_d8_closure', {
  id: serial('id').primaryKey(),
  orgId: uuid('org_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  capaId: integer('capa_id').notNull().references(() => capa.id, { onDelete: 'cascade' }),
  closureCriteriaMet: integer('closure_criteria_met').default(0),
  closureCriteriaChecklist: text('closure_criteria_checklist').default('{}'),
  allActionsComplete: integer('all_actions_complete').default(0),
  actionsCompletionSummary: text('actions_completion_summary'),
  effectivenessConfirmed: integer('effectiveness_confirmed').default(0),
  effectivenessSummary: text('effectiveness_summary'),
  noRecurrence: integer('no_recurrence').default(0),
  recurrenceMonitoringPeriod: text('recurrence_monitoring_period'),
  containmentRemoved: integer('containment_removed').default(0),
  containmentRemovalDate: timestamp('containment_removal_date'),
  documentationComplete: integer('documentation_complete').default(0),
  documentationChecklist: text('documentation_checklist').default('{}'),
  customerClosed: integer('customer_closed').default(0),
  customerClosureDate: timestamp('customer_closure_date'),
  customerClosureReference: text('customer_closure_reference'),
  customerFeedback: text('customer_feedback'),
  teamRecognition: text('team_recognition').default('{}'),
  teamRecognitionDate: timestamp('team_recognition_date'),
  teamRecognitionMethod: text('team_recognition_method'),
  teamFeedback: text('team_feedback').default('[]'),
  lessonsLearnedSummary: text('lessons_learned_summary'),
  lessonsLearnedShared: integer('lessons_learned_shared').default(0),
  lessonsLearnedAudience: text('lessons_learned_audience').default('[]'),
  successMetrics: text('success_metrics').default('{}'),
  costSavingsRealized: real('cost_savings_realized'),
  costOfQualityReduction: real('cost_of_quality_reduction'),
  cycleTimeDays: integer('cycle_time_days'),
  onTimeCompletion: integer('on_time_completion').default(0),
  finalReport: text('final_report').default('{}'),
  finalReportDocumentId: integer('final_report_document_id'),
  archiveComplete: integer('archive_complete').default(0),
  archiveLocation: text('archive_location'),
  closedBy: text('closed_by'),
  closedAt: timestamp('closed_at'),
  approvedBy: text('approved_by'),
  approvedAt: timestamp('approved_at'),
  d8CompletedAt: timestamp('d8_completed_at'),
  d8CompletedBy: text('d8_completed_by'),
  d8VerifiedAt: timestamp('d8_verified_at'),
  d8VerifiedBy: text('d8_verified_by'),
  d8Notes: text('d8_notes'),
  createdBy: text('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  capaIdx: uniqueIndex('capa_d8_closure_capa_idx').on(table.capaId),
}));

export const capaAuditLog = pgTable('capa_audit_log', {
  id: serial('id').primaryKey(),
  orgId: uuid('org_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  capaId: integer('capa_id').notNull(), // NO cascade - keep orphan logs
  discipline: text('discipline'),
  action: text('action').notNull(),
  entityType: text('entity_type'),
  entityId: integer('entity_id'),
  userId: text('user_id').notNull(),
  userName: text('user_name'),
  userRole: text('user_role'),
  timestamp: timestamp('timestamp').defaultNow(),
  previousValue: text('previous_value'),
  newValue: text('new_value'),
  changeDescription: text('change_description'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  sessionId: text('session_id'),
  logHash: text('log_hash'),
  previousLogHash: text('previous_log_hash'),
}, (table) => ({
  capaIdx: index('capa_audit_log_capa_idx').on(table.capaId),
  actionIdx: index('capa_audit_log_action_idx').on(table.action),
  userIdx: index('capa_audit_log_user_idx').on(table.userId),
  timestampIdx: index('capa_audit_log_timestamp_idx').on(table.timestamp),
  disciplineIdx: index('capa_audit_log_discipline_idx').on(table.discipline),
}));

export const capaMetricSnapshot = pgTable('capa_metric_snapshot', {
  id: serial('id').primaryKey(),
  orgId: uuid('org_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  snapshotDate: timestamp('snapshot_date').notNull(),
  snapshotPeriod: text('snapshot_period').notNull(), // daily / weekly / monthly
  totalCapas: integer('total_capas').default(0),
  byStatus: text('by_status').default('{}'),
  byPriority: text('by_priority').default('{}'),
  bySourceType: text('by_source_type').default('{}'),
  byCategory: text('by_category').default('{}'),
  byDiscipline: text('by_discipline').default('{}'),
  openedThisPeriod: integer('opened_this_period').default(0),
  closedThisPeriod: integer('closed_this_period').default(0),
  overdueCount: integer('overdue_count').default(0),
  avgAgeDays: real('avg_age_days').default(0),
  avgCycleTimeDays: real('avg_cycle_time_days').default(0),
  onTimeClosureRate: real('on_time_closure_rate').default(0),
  effectivenessRate: real('effectiveness_rate').default(0),
  recurrenceRate: real('recurrence_rate').default(0),
  containmentEffectivenessRate: real('containment_effectiveness_rate').default(0),
  customerCapaCount: integer('customer_capa_count').default(0),
  safetyCapaCount: integer('safety_capa_count').default(0),
  topFailureModes: text('top_failure_modes').default('[]'),
  topRootCauses: text('top_root_causes').default('[]'),
  costOfQuality: real('cost_of_quality').default(0),
  costSavings: real('cost_savings').default(0),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  orgDateIdx: index('capa_metric_snapshot_org_date_idx').on(table.orgId, table.snapshotDate),
  periodIdx: index('capa_metric_snapshot_period_idx').on(table.snapshotPeriod),
}));

// ==========================================
// CAPA/8D Module: Analysis Tools
// ==========================================

export const capaAnalysisTool = pgTable('capa_analysis_tool', {
  id: serial('id').primaryKey(),
  orgId: uuid('org_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  capaId: integer('capa_id').notNull().references(() => capa.id, { onDelete: 'cascade' }),
  toolType: text('tool_type').notNull(), // is_is_not / five_why / three_leg_five_why / fishbone / fault_tree / comparative / change_point / pareto
  name: text('name'),
  discipline: text('discipline'), // D2, D4, etc.
  data: text('data').notNull().default('{}'),
  status: text('status').default('in_progress'), // in_progress / complete / verified
  conclusion: text('conclusion'),
  linkedToRootCause: integer('linked_to_root_cause').default(0),
  createdBy: text('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  completedAt: timestamp('completed_at'),
  completedBy: text('completed_by'),
  verifiedAt: timestamp('verified_at'),
  verifiedBy: text('verified_by'),
}, (table) => ({
  capaIdx: index('capa_analysis_tool_capa_idx').on(table.capaId),
  typeIdx: index('capa_analysis_tool_type_idx').on(table.capaId, table.toolType),
  orgIdx: index('capa_analysis_tool_org_idx').on(table.orgId),
}));

// CAPA/8D Core Relations
export const capaRelations = relations(capa, ({ one, many }) => ({
  organization: one(organization, {
    fields: [capa.orgId],
    references: [organization.id],
  }),
  teamMembers: many(capaTeamMember),
  sources: many(capaSource),
  attachments: many(capaAttachment),
  relatedRecords: many(capaRelatedRecord),
  d0Emergency: one(capaD0Emergency, {
    fields: [capa.id],
    references: [capaD0Emergency.capaId],
  }),
  d1TeamDetail: one(capaD1TeamDetail, {
    fields: [capa.id],
    references: [capaD1TeamDetail.capaId],
  }),
  d2Problem: one(capaD2Problem, {
    fields: [capa.id],
    references: [capaD2Problem.capaId],
  }),
  d3Containment: one(capaD3Containment, {
    fields: [capa.id],
    references: [capaD3Containment.capaId],
  }),
  d4RootCause: one(capaD4RootCause, {
    fields: [capa.id],
    references: [capaD4RootCause.capaId],
  }),
  d4Candidates: many(capaD4RootCauseCandidate),
  d5CorrectiveAction: one(capaD5CorrectiveAction, {
    fields: [capa.id],
    references: [capaD5CorrectiveAction.capaId],
  }),
  d6Validation: one(capaD6Validation, {
    fields: [capa.id],
    references: [capaD6Validation.capaId],
  }),
  d7Preventive: one(capaD7Preventive, {
    fields: [capa.id],
    references: [capaD7Preventive.capaId],
  }),
  d8Closure: one(capaD8Closure, {
    fields: [capa.id],
    references: [capaD8Closure.capaId],
  }),
  auditLogs: many(capaAuditLog),
  analysisTools: many(capaAnalysisTool),
}));

export const capaTeamMemberRelations = relations(capaTeamMember, ({ one }) => ({
  capa: one(capa, {
    fields: [capaTeamMember.capaId],
    references: [capa.id],
  }),
  organization: one(organization, {
    fields: [capaTeamMember.orgId],
    references: [organization.id],
  }),
}));

export const capaSourceRelations = relations(capaSource, ({ one }) => ({
  capa: one(capa, {
    fields: [capaSource.capaId],
    references: [capa.id],
  }),
  organization: one(organization, {
    fields: [capaSource.orgId],
    references: [organization.id],
  }),
}));

export const capaAttachmentRelations = relations(capaAttachment, ({ one }) => ({
  capa: one(capa, {
    fields: [capaAttachment.capaId],
    references: [capa.id],
  }),
  organization: one(organization, {
    fields: [capaAttachment.orgId],
    references: [organization.id],
  }),
}));

export const capaRelatedRecordRelations = relations(capaRelatedRecord, ({ one }) => ({
  capa: one(capa, {
    fields: [capaRelatedRecord.capaId],
    references: [capa.id],
  }),
  organization: one(organization, {
    fields: [capaRelatedRecord.orgId],
    references: [organization.id],
  }),
}));

export const capaNumberSequenceRelations = relations(capaNumberSequence, ({ one }) => ({
  organization: one(organization, {
    fields: [capaNumberSequence.orgId],
    references: [organization.id],
  }),
}));

// D0-D3 Relations
export const capaD0EmergencyRelations = relations(capaD0Emergency, ({ one }) => ({
  capa: one(capa, {
    fields: [capaD0Emergency.capaId],
    references: [capa.id],
  }),
  organization: one(organization, {
    fields: [capaD0Emergency.orgId],
    references: [organization.id],
  }),
}));

export const capaD1TeamDetailRelations = relations(capaD1TeamDetail, ({ one }) => ({
  capa: one(capa, {
    fields: [capaD1TeamDetail.capaId],
    references: [capa.id],
  }),
  organization: one(organization, {
    fields: [capaD1TeamDetail.orgId],
    references: [organization.id],
  }),
}));

export const capaD2ProblemRelations = relations(capaD2Problem, ({ one }) => ({
  capa: one(capa, {
    fields: [capaD2Problem.capaId],
    references: [capa.id],
  }),
  organization: one(organization, {
    fields: [capaD2Problem.orgId],
    references: [organization.id],
  }),
}));

export const capaD3ContainmentRelations = relations(capaD3Containment, ({ one }) => ({
  capa: one(capa, {
    fields: [capaD3Containment.capaId],
    references: [capa.id],
  }),
  organization: one(organization, {
    fields: [capaD3Containment.orgId],
    references: [organization.id],
  }),
}));

// D4-D6 Relations
export const capaD4RootCauseRelations = relations(capaD4RootCause, ({ one, many }) => ({
  capa: one(capa, {
    fields: [capaD4RootCause.capaId],
    references: [capa.id],
  }),
  organization: one(organization, {
    fields: [capaD4RootCause.orgId],
    references: [organization.id],
  }),
  candidates: many(capaD4RootCauseCandidate),
}));

export const capaD4RootCauseCandidateRelations = relations(capaD4RootCauseCandidate, ({ one }) => ({
  capa: one(capa, {
    fields: [capaD4RootCauseCandidate.capaId],
    references: [capa.id],
  }),
  d4RootCause: one(capaD4RootCause, {
    fields: [capaD4RootCauseCandidate.d4Id],
    references: [capaD4RootCause.id],
  }),
  organization: one(organization, {
    fields: [capaD4RootCauseCandidate.orgId],
    references: [organization.id],
  }),
}));

export const capaD5CorrectiveActionRelations = relations(capaD5CorrectiveAction, ({ one }) => ({
  capa: one(capa, {
    fields: [capaD5CorrectiveAction.capaId],
    references: [capa.id],
  }),
  organization: one(organization, {
    fields: [capaD5CorrectiveAction.orgId],
    references: [organization.id],
  }),
}));

export const capaD6ValidationRelations = relations(capaD6Validation, ({ one }) => ({
  capa: one(capa, {
    fields: [capaD6Validation.capaId],
    references: [capa.id],
  }),
  organization: one(organization, {
    fields: [capaD6Validation.orgId],
    references: [organization.id],
  }),
}));

// D7-D8 + Audit + Metrics Relations
export const capaD7PreventiveRelations = relations(capaD7Preventive, ({ one }) => ({
  capa: one(capa, {
    fields: [capaD7Preventive.capaId],
    references: [capa.id],
  }),
  organization: one(organization, {
    fields: [capaD7Preventive.orgId],
    references: [organization.id],
  }),
}));

export const capaD8ClosureRelations = relations(capaD8Closure, ({ one }) => ({
  capa: one(capa, {
    fields: [capaD8Closure.capaId],
    references: [capa.id],
  }),
  organization: one(organization, {
    fields: [capaD8Closure.orgId],
    references: [organization.id],
  }),
}));

export const capaAuditLogRelations = relations(capaAuditLog, ({ one }) => ({
  organization: one(organization, {
    fields: [capaAuditLog.orgId],
    references: [organization.id],
  }),
}));

export const capaMetricSnapshotRelations = relations(capaMetricSnapshot, ({ one }) => ({
  organization: one(organization, {
    fields: [capaMetricSnapshot.orgId],
    references: [organization.id],
  }),
}));

export const capaAnalysisToolRelations = relations(capaAnalysisTool, ({ one }) => ({
  organization: one(organization, {
    fields: [capaAnalysisTool.orgId],
    references: [organization.id],
  }),
  capa: one(capa, {
    fields: [capaAnalysisTool.capaId],
    references: [capa.id],
  }),
}));

// ==========================================
// Insert schemas
// ==========================================

export const insertPartSchema = createInsertSchema(part).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProcessDefSchema = createInsertSchema(processDef).omit({ id: true, createdAt: true });
export const insertProcessStepSchema = createInsertSchema(processStep).omit({ id: true });
export const insertFmeaTemplateRowSchema = createInsertSchema(fmeaTemplateRow).omit({ id: true });
export const insertControlTemplateRowSchema = createInsertSchema(controlTemplateRow).omit({ id: true });
export const insertPfdSchema = createInsertSchema(pfd).omit({ id: true, createdAt: true });
export const insertPfdStepSchema = createInsertSchema(pfdStep).omit({ id: true });
export const insertPfmeaSchema = createInsertSchema(pfmea).omit({ id: true, createdAt: true });
export const insertPfmeaRowSchema = createInsertSchema(pfmeaRow).omit({ id: true });
export const insertActionItemSchema = createInsertSchema(actionItem).omit({ id: true, createdAt: true, updatedAt: true });
export const insertControlPlanSchema = createInsertSchema(controlPlan).omit({ id: true, createdAt: true });
export const insertControlPlanRowSchema = createInsertSchema(controlPlanRow).omit({ id: true });
export const insertPartProcessMapSchema = createInsertSchema(partProcessMap).omit({ id: true });
export const insertGageLibrarySchema = createInsertSchema(gageLibrary).omit({ id: true });
export const insertRatingScaleSchema = createInsertSchema(ratingScale).omit({ id: true });
export const insertCalibrationLinkSchema = createInsertSchema(calibrationLink).omit({ id: true });
export const insertEquipmentLibrarySchema = createInsertSchema(equipmentLibrary).omit({ id: true, createdAt: true, updatedAt: true });
export const insertEquipmentErrorProofingSchema = createInsertSchema(equipmentErrorProofing).omit({ id: true, createdAt: true });
export const insertEquipmentControlMethodsSchema = createInsertSchema(equipmentControlMethods).omit({ id: true, createdAt: true });
export const insertFailureModesLibrarySchema = createInsertSchema(failureModesLibrary).omit({ id: true, createdAt: true, updatedAt: true, lastUsed: true });
export const insertFmeaTemplateCatalogLinkSchema = createInsertSchema(fmeaTemplateCatalogLink).omit({ id: true, adoptedAt: true });
export const insertControlsLibrarySchema = createInsertSchema(controlsLibrary).omit({ id: true, createdAt: true, updatedAt: true, lastUsed: true });
export const insertControlPairingsSchema = createInsertSchema(controlPairings).omit({ id: true, createdAt: true });
// NEW
export const insertAutoReviewRunSchema = createInsertSchema(autoReviewRun).omit({ id: true, runAt: true });
export const insertAutoReviewFindingSchema = createInsertSchema(autoReviewFinding).omit({ id: true });
export const insertChangePackageSchema = createInsertSchema(changePackage).omit({ id: true, initiatedAt: true });
export const insertChangePackageItemSchema = createInsertSchema(changePackageItem).omit({ id: true });
export const insertChangePackageApprovalSchema = createInsertSchema(changePackageApproval).omit({ id: true, requestedAt: true });
export const insertChangePackagePropagationSchema = createInsertSchema(changePackagePropagation).omit({ id: true });
// Core Platform
export const insertOrganizationSchema = createInsertSchema(organization).omit({ id: true, createdAt: true, updatedAt: true });
export const insertUserSchema = createInsertSchema(user).omit({ id: true, createdAt: true, updatedAt: true, lastLoginAt: true });
export const insertSessionSchema = createInsertSchema(session).omit({ id: true, createdAt: true });
// Document Control
export const insertDocumentSchema = createInsertSchema(document).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDocumentRevisionSchema = createInsertSchema(documentRevision).omit({ id: true, createdAt: true });
export const insertDocumentDistributionSchema = createInsertSchema(documentDistribution).omit({ id: true, distributedAt: true });
export const insertDocumentReviewSchema = createInsertSchema(documentReview).omit({ id: true, createdAt: true });
export const insertDocumentLinkSchema = createInsertSchema(documentLink).omit({ id: true, createdAt: true });
// Document Control Phase 2
export const insertDocumentFileSchema = createInsertSchema(documentFile).omit({ id: true, uploadedAt: true });
export const insertDocumentTemplateSchema = createInsertSchema(documentTemplate).omit({ id: true, createdAt: true, updatedAt: true });
export const insertApprovalWorkflowDefinitionSchema = createInsertSchema(approvalWorkflowDefinition).omit({ id: true, createdAt: true });
export const insertApprovalWorkflowInstanceSchema = createInsertSchema(approvalWorkflowInstance).omit({ id: true, startedAt: true });
export const insertApprovalWorkflowStepSchema = createInsertSchema(approvalWorkflowStep).omit({ id: true });
export const insertDocumentCheckoutSchema = createInsertSchema(documentCheckout).omit({ id: true, checkedOutAt: true });
// Document Control Phase 3
export const insertDistributionListSchema = createInsertSchema(distributionList).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDocumentDistributionRecordSchema = createInsertSchema(documentDistributionRecord).omit({ id: true, distributedAt: true });
export const insertDocumentAccessLogSchema = createInsertSchema(documentAccessLog).omit({ id: true, timestamp: true });
export const insertDocumentPrintLogSchema = createInsertSchema(documentPrintLog).omit({ id: true, printedAt: true });
export const insertDocumentCommentSchema = createInsertSchema(documentComment).omit({ id: true, createdAt: true });
export const insertExternalDocumentSchema = createInsertSchema(externalDocument).omit({ id: true, createdAt: true });
export const insertDocumentLinkEnhancedSchema = createInsertSchema(documentLinkEnhanced).omit({ id: true, createdAt: true });

// CAPA/8D
export const insertCapaSchema = createInsertSchema(capa).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCapaTeamMemberSchema = createInsertSchema(capaTeamMember).omit({ id: true, createdAt: true });
export const insertCapaSourceSchema = createInsertSchema(capaSource).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCapaAttachmentSchema = createInsertSchema(capaAttachment).omit({ id: true, uploadedAt: true });
export const insertCapaRelatedRecordSchema = createInsertSchema(capaRelatedRecord).omit({ id: true, linkedAt: true });
export const insertCapaNumberSequenceSchema = createInsertSchema(capaNumberSequence).omit({ id: true, updatedAt: true });
export const insertCapaD0EmergencySchema = createInsertSchema(capaD0Emergency).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCapaD1TeamDetailSchema = createInsertSchema(capaD1TeamDetail).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCapaD2ProblemSchema = createInsertSchema(capaD2Problem).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCapaD3ContainmentSchema = createInsertSchema(capaD3Containment).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCapaD4RootCauseSchema = createInsertSchema(capaD4RootCause).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCapaD4RootCauseCandidateSchema = createInsertSchema(capaD4RootCauseCandidate).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCapaD5CorrectiveActionSchema = createInsertSchema(capaD5CorrectiveAction).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCapaD6ValidationSchema = createInsertSchema(capaD6Validation).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCapaD7PreventiveSchema = createInsertSchema(capaD7Preventive).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCapaD8ClosureSchema = createInsertSchema(capaD8Closure).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCapaAuditLogSchema = createInsertSchema(capaAuditLog).omit({ id: true, timestamp: true });
export const insertCapaMetricSnapshotSchema = createInsertSchema(capaMetricSnapshot).omit({ id: true, createdAt: true });
export const insertCapaAnalysisToolSchema = createInsertSchema(capaAnalysisTool).omit({ id: true, createdAt: true, updatedAt: true });

// ==========================================
// Types
// ==========================================

// Core Platform
export type Organization = typeof organization.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type User = typeof user.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Session = typeof session.$inferSelect;
export type InsertSession = z.infer<typeof insertSessionSchema>;

export type Part = typeof part.$inferSelect;
export type InsertPart = z.infer<typeof insertPartSchema>;
export type ProcessDef = typeof processDef.$inferSelect;
export type InsertProcessDef = z.infer<typeof insertProcessDefSchema>;
export type ProcessStep = typeof processStep.$inferSelect;
export type InsertProcessStep = z.infer<typeof insertProcessStepSchema>;
export type FmeaTemplateRow = typeof fmeaTemplateRow.$inferSelect;
export type InsertFmeaTemplateRow = z.infer<typeof insertFmeaTemplateRowSchema>;
export type ControlTemplateRow = typeof controlTemplateRow.$inferSelect;
export type InsertControlTemplateRow = z.infer<typeof insertControlTemplateRowSchema>;
export type PFD = typeof pfd.$inferSelect;
export type InsertPFD = z.infer<typeof insertPfdSchema>;
export type PFDStep = typeof pfdStep.$inferSelect;
export type InsertPFDStep = z.infer<typeof insertPfdStepSchema>;
export type PFMEA = typeof pfmea.$inferSelect;
export type InsertPFMEA = z.infer<typeof insertPfmeaSchema>;
export type PFMEARow = typeof pfmeaRow.$inferSelect;
export type InsertPFMEARow = z.infer<typeof insertPfmeaRowSchema>;
export type ActionItem = typeof actionItem.$inferSelect;
export type InsertActionItem = z.infer<typeof insertActionItemSchema>;
export type ControlPlan = typeof controlPlan.$inferSelect;
export type InsertControlPlan = z.infer<typeof insertControlPlanSchema>;
export type ControlPlanRow = typeof controlPlanRow.$inferSelect;
export type InsertControlPlanRow = z.infer<typeof insertControlPlanRowSchema>;
export type GageLibrary = typeof gageLibrary.$inferSelect;
export type InsertGageLibrary = z.infer<typeof insertGageLibrarySchema>;
export type RatingScale = typeof ratingScale.$inferSelect;
export type InsertRatingScale = z.infer<typeof insertRatingScaleSchema>;
export type PartProcessMap = typeof partProcessMap.$inferSelect;
export type InsertPartProcessMap = z.infer<typeof insertPartProcessMapSchema>;
export type CalibrationLink = typeof calibrationLink.$inferSelect;
export type InsertCalibrationLink = z.infer<typeof insertCalibrationLinkSchema>;
export type EquipmentLibrary = typeof equipmentLibrary.$inferSelect;
export type InsertEquipmentLibrary = z.infer<typeof insertEquipmentLibrarySchema>;
export type EquipmentErrorProofing = typeof equipmentErrorProofing.$inferSelect;
export type InsertEquipmentErrorProofing = z.infer<typeof insertEquipmentErrorProofingSchema>;
export type EquipmentControlMethods = typeof equipmentControlMethods.$inferSelect;
export type InsertEquipmentControlMethods = z.infer<typeof insertEquipmentControlMethodsSchema>;
export type FailureModesLibrary = typeof failureModesLibrary.$inferSelect;
export type InsertFailureModesLibrary = z.infer<typeof insertFailureModesLibrarySchema>;
export type FmeaTemplateCatalogLink = typeof fmeaTemplateCatalogLink.$inferSelect;
export type InsertFmeaTemplateCatalogLink = z.infer<typeof insertFmeaTemplateCatalogLinkSchema>;
export type ControlsLibrary = typeof controlsLibrary.$inferSelect;
export type InsertControlsLibrary = z.infer<typeof insertControlsLibrarySchema>;
export type ControlPairings = typeof controlPairings.$inferSelect;
export type InsertControlPairings = z.infer<typeof insertControlPairingsSchema>;
// NEW
export type AutoReviewRun = typeof autoReviewRun.$inferSelect;
export type InsertAutoReviewRun = z.infer<typeof insertAutoReviewRunSchema>;
export type AutoReviewFinding = typeof autoReviewFinding.$inferSelect;
export type InsertAutoReviewFinding = z.infer<typeof insertAutoReviewFindingSchema>;
export type ChangePackage = typeof changePackage.$inferSelect;
export type InsertChangePackage = z.infer<typeof insertChangePackageSchema>;
export type ChangePackageItem = typeof changePackageItem.$inferSelect;
export type InsertChangePackageItem = z.infer<typeof insertChangePackageItemSchema>;
export type ChangePackageApproval = typeof changePackageApproval.$inferSelect;
export type InsertChangePackageApproval = z.infer<typeof insertChangePackageApprovalSchema>;
export type ChangePackagePropagation = typeof changePackagePropagation.$inferSelect;
export type InsertChangePackagePropagation = z.infer<typeof insertChangePackagePropagationSchema>;
// Document Control
export type Document = typeof document.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type DocumentRevision = typeof documentRevision.$inferSelect;
export type InsertDocumentRevision = z.infer<typeof insertDocumentRevisionSchema>;
export type DocumentDistribution = typeof documentDistribution.$inferSelect;
export type InsertDocumentDistribution = z.infer<typeof insertDocumentDistributionSchema>;
export type DocumentReview = typeof documentReview.$inferSelect;
export type InsertDocumentReview = z.infer<typeof insertDocumentReviewSchema>;
export type DocumentLink = typeof documentLink.$inferSelect;
export type InsertDocumentLink = z.infer<typeof insertDocumentLinkSchema>;
// Document Control Phase 2
export type DocumentFile = typeof documentFile.$inferSelect;
export type InsertDocumentFile = z.infer<typeof insertDocumentFileSchema>;
export type DocumentTemplate = typeof documentTemplate.$inferSelect;
export type InsertDocumentTemplate = z.infer<typeof insertDocumentTemplateSchema>;
export type ApprovalWorkflowDefinition = typeof approvalWorkflowDefinition.$inferSelect;
export type InsertApprovalWorkflowDefinition = z.infer<typeof insertApprovalWorkflowDefinitionSchema>;
export type ApprovalWorkflowInstance = typeof approvalWorkflowInstance.$inferSelect;
export type InsertApprovalWorkflowInstance = z.infer<typeof insertApprovalWorkflowInstanceSchema>;
export type ApprovalWorkflowStep = typeof approvalWorkflowStep.$inferSelect;
export type InsertApprovalWorkflowStep = z.infer<typeof insertApprovalWorkflowStepSchema>;
export type DocumentCheckout = typeof documentCheckout.$inferSelect;
export type InsertDocumentCheckout = z.infer<typeof insertDocumentCheckoutSchema>;
// Document Control Phase 3
export type DistributionList = typeof distributionList.$inferSelect;
export type InsertDistributionList = z.infer<typeof insertDistributionListSchema>;
export type DocumentDistributionRecord = typeof documentDistributionRecord.$inferSelect;
export type InsertDocumentDistributionRecord = z.infer<typeof insertDocumentDistributionRecordSchema>;
export type DocumentAccessLog = typeof documentAccessLog.$inferSelect;
export type InsertDocumentAccessLog = z.infer<typeof insertDocumentAccessLogSchema>;
export type DocumentPrintLog = typeof documentPrintLog.$inferSelect;
export type InsertDocumentPrintLog = z.infer<typeof insertDocumentPrintLogSchema>;
export type DocumentComment = typeof documentComment.$inferSelect;
export type InsertDocumentComment = z.infer<typeof insertDocumentCommentSchema>;
export type ExternalDocument = typeof externalDocument.$inferSelect;
export type InsertExternalDocument = z.infer<typeof insertExternalDocumentSchema>;
export type DocumentLinkEnhanced = typeof documentLinkEnhanced.$inferSelect;
export type InsertDocumentLinkEnhanced = z.infer<typeof insertDocumentLinkEnhancedSchema>;

// CAPA/8D Module
export type Capa = typeof capa.$inferSelect;
export type InsertCapa = z.infer<typeof insertCapaSchema>;
export type CapaTeamMember = typeof capaTeamMember.$inferSelect;
export type InsertCapaTeamMember = z.infer<typeof insertCapaTeamMemberSchema>;
export type CapaSource = typeof capaSource.$inferSelect;
export type InsertCapaSource = z.infer<typeof insertCapaSourceSchema>;
export type CapaAttachment = typeof capaAttachment.$inferSelect;
export type InsertCapaAttachment = z.infer<typeof insertCapaAttachmentSchema>;
export type CapaRelatedRecord = typeof capaRelatedRecord.$inferSelect;
export type InsertCapaRelatedRecord = z.infer<typeof insertCapaRelatedRecordSchema>;
export type CapaNumberSequence = typeof capaNumberSequence.$inferSelect;
export type InsertCapaNumberSequence = z.infer<typeof insertCapaNumberSequenceSchema>;
export type CapaD0Emergency = typeof capaD0Emergency.$inferSelect;
export type InsertCapaD0Emergency = z.infer<typeof insertCapaD0EmergencySchema>;
export type CapaD1TeamDetail = typeof capaD1TeamDetail.$inferSelect;
export type InsertCapaD1TeamDetail = z.infer<typeof insertCapaD1TeamDetailSchema>;
export type CapaD2Problem = typeof capaD2Problem.$inferSelect;
export type InsertCapaD2Problem = z.infer<typeof insertCapaD2ProblemSchema>;
export type CapaD3Containment = typeof capaD3Containment.$inferSelect;
export type InsertCapaD3Containment = z.infer<typeof insertCapaD3ContainmentSchema>;
export type CapaD4RootCause = typeof capaD4RootCause.$inferSelect;
export type InsertCapaD4RootCause = z.infer<typeof insertCapaD4RootCauseSchema>;
export type CapaD4RootCauseCandidate = typeof capaD4RootCauseCandidate.$inferSelect;
export type InsertCapaD4RootCauseCandidate = z.infer<typeof insertCapaD4RootCauseCandidateSchema>;
export type CapaD5CorrectiveAction = typeof capaD5CorrectiveAction.$inferSelect;
export type InsertCapaD5CorrectiveAction = z.infer<typeof insertCapaD5CorrectiveActionSchema>;
export type CapaD6Validation = typeof capaD6Validation.$inferSelect;
export type InsertCapaD6Validation = z.infer<typeof insertCapaD6ValidationSchema>;
export type CapaD7Preventive = typeof capaD7Preventive.$inferSelect;
export type InsertCapaD7Preventive = z.infer<typeof insertCapaD7PreventiveSchema>;
export type CapaD8Closure = typeof capaD8Closure.$inferSelect;
export type InsertCapaD8Closure = z.infer<typeof insertCapaD8ClosureSchema>;
export type CapaAuditLog = typeof capaAuditLog.$inferSelect;
export type InsertCapaAuditLog = z.infer<typeof insertCapaAuditLogSchema>;
export type CapaMetricSnapshot = typeof capaMetricSnapshot.$inferSelect;
export type InsertCapaMetricSnapshot = z.infer<typeof insertCapaMetricSnapshotSchema>;
export type CapaAnalysisTool = typeof capaAnalysisTool.$inferSelect;
export type InsertCapaAnalysisTool = z.infer<typeof insertCapaAnalysisToolSchema>;

// ==========================================
// Enum Types
// ==========================================

export type FailureModeCategory = 'dimensional' | 'visual' | 'functional' | 'assembly' | 'material' | 'process' | 'contamination' | 'environmental';
export type ControlType = 'prevention' | 'detection';
export type ControlEffectiveness = 'high' | 'medium' | 'low';
export type MSAStatus = 'approved' | 'planned' | 'failed' | 'not_required';
export type StepType = 'operation' | 'group' | 'subprocess_ref';
export type ActionStatus = 'none' | 'open' | 'in_progress' | 'complete' | 'cancelled';
export type ProcessSymbol = 'operation' | 'inspection' | 'storage' | 'transportation' | 'decision' | 'cqt';
// NEW
export type ControlCategory = 'error_proofing_prevent' | 'error_proofing_detect' | 'automated_100_percent' | 'spc_immediate' | 'manual_gage' | 'visual_standard' | 'visual_only' | 'none';
export type EffectCategory = 'safety_no_warning' | 'safety_with_warning' | 'regulatory_noncompliance' | 'function_loss' | 'function_degraded' | 'comfort_loss' | 'comfort_reduced' | 'appearance_obvious' | 'appearance_subtle' | 'appearance_minor' | 'none';
export type FindingLevel = 'error' | 'warning' | 'info';
export type FindingCategory = 'coverage' | 'effectiveness' | 'document_control' | 'scoring' | 'csr';
export type ChangeStatus = 'draft' | 'impact_analysis' | 'auto_review' | 'pending_signatures' | 'effective' | 'cancelled';
export type DocumentTypeEnum = 'procedure' | 'work_instruction' | 'form' | 'specification' | 'standard' | 'drawing' | 'customer_spec' | 'external' | 'policy' | 'record';
export type UserRole = 'admin' | 'quality_manager' | 'engineer' | 'viewer';
export type UserStatus = 'active' | 'inactive' | 'pending';
