import { pgTable, text, integer, jsonb, timestamp, boolean, uuid, pgEnum, index, uniqueIndex, serial } from 'drizzle-orm/pg-core';
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

// NEW: Auto-Review Finding Level
export const findingLevelEnum = pgEnum('finding_level', ['error', 'warning', 'info']);
export const findingCategoryEnum = pgEnum('finding_category', ['coverage', 'effectiveness', 'document_control', 'scoring', 'csr']);

// Process Library Tables
export const processDef = pgTable('process_def', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  rev: text('rev').notNull(),
  status: statusEnum('status').notNull().default('draft'),
  effectiveFrom: timestamp('effective_from'),
  supersedesId: uuid('supersedes_id').references((): any => processDef.id, { onDelete: 'set null' }),
  changeNote: text('change_note'),
  createdBy: uuid('created_by').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  nameRevIdx: uniqueIndex('process_def_name_rev_idx').on(table.name, table.rev),
  statusIdx: index('process_def_status_idx').on(table.status),
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
  name: text('name').notNull(),
  model: text('model'),
  resolution: text('resolution'),
  calibrationIntervalDays: integer('calibration_interval_days'),
  status: text('status').notNull().default('active'),
});

export const ratingScale = pgTable('rating_scale', {
  id: uuid('id').primaryKey().defaultRandom(),
  version: text('version').notNull(),
  kind: text('kind').notNull(),
  tableJson: jsonb('table_json').$type<{ rating: number; description: string; criteria: string }[]>().notNull(),
}, (table) => ({
  versionKindIdx: uniqueIndex('rating_scale_version_kind_idx').on(table.version, table.kind),
}));

// Equipment Library Tables
export const equipmentLibrary = pgTable('equipment_library', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: text('type').notNull(),
  name: text('name').notNull().unique(),
  manufacturer: text('manufacturer'),
  model: text('model'),
  tonnage: integer('tonnage'),
  serialNumber: text('serial_number'),
  location: text('location'),
  status: text('status').notNull().default('active'),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

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
  partNumberIdx: uniqueIndex('part_number_idx').on(table.partNumber),
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
}));

export const controlPlanRow = pgTable('control_plan_row', {
  id: uuid('id').primaryKey().defaultRandom(),
  controlPlanId: uuid('control_plan_id').notNull().references(() => controlPlan.id, { onDelete: 'cascade' }),
  sourcePfmeaRowId: uuid('source_pfmea_row_id').references(() => pfmeaRow.id),
  parentControlTemplateRowId: uuid('parent_control_template_row_id').references(() => controlTemplateRow.id),
  rowSeq: integer('row_seq'),
  processNo: text('process_no'),
  processName: text('process_name'),
  machineDeviceJigTools: text('machine_device_jig_tools'),
  charId: text('char_id').notNull(),
  charNo: text('char_no'),
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
  signedAt: timestamp('signed_at').notNull().defaultNow(),
  contentHash: text('content_hash').notNull(),
}, (table) => ({
  entityIdx: index('signature_entity_idx').on(table.entityType, table.entityId),
  roleIdx: index('signature_role_idx').on(table.role),
}));

export const auditLog = pgTable('audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  entityType: text('entity_type').notNull(),
  entityId: uuid('entity_id').notNull(),
  action: text('action').notNull(),
  actor: text('actor').notNull(),
  at: timestamp('at').notNull().defaultNow(),
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

// ==========================================
// Types
// ==========================================

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
