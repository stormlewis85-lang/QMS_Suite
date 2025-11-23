import { pgTable, text, integer, jsonb, timestamp, boolean, uuid, pgEnum, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const statusEnum = pgEnum('status', ['draft', 'review', 'effective', 'superseded', 'obsolete']);
export const changeStatusEnum = pgEnum('change_status', ['draft', 'impact_analysis', 'auto_review', 'pending_signatures', 'effective', 'cancelled']);
export const roleEnum = pgEnum('role', ['library_maintainer', 'part_engineer', 'qe', 'process_owner', 'quality_manager', 'auditor']);

// Process Library Tables
export const processDef = pgTable('process_def', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  rev: text('rev').notNull(),
  status: statusEnum('status').notNull().default('draft'),
  effectiveFrom: timestamp('effective_from'),
  supersedesId: uuid('supersedes_id').references((): any => processDef.id),
  changeNote: text('change_note'),
  createdBy: uuid('created_by').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  nameRevIdx: uniqueIndex('process_def_name_rev_idx').on(table.name, table.rev),
  statusIdx: index('process_def_status_idx').on(table.status),
}));

export const processStep = pgTable('process_step', {
  id: uuid('id').primaryKey().defaultRandom(),
  processDefId: uuid('process_def_id').notNull().references(() => processDef.id, { onDelete: 'cascade' }),
  seq: integer('seq').notNull(),
  name: text('name').notNull(),
  area: text('area').notNull(),
  equipment: jsonb('equipment').$type<{ name: string; model?: string; settings?: Record<string, any> }[]>(),
  branchTo: text('branch_to'),
  reworkTo: text('rework_to'),
}, (table) => ({
  processDefSeqIdx: uniqueIndex('process_step_def_seq_idx').on(table.processDefId, table.seq),
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
  ap: text('ap').notNull(), // H/M/L
  specialFlag: boolean('special_flag').notNull().default(false),
  csrSymbol: text('csr_symbol'), // Ⓢ ◆ ⓒ
  notes: text('notes'),
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
  type: text('type').notNull(), // Product/Process
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
}, (table) => ({
  processDefIdx: index('control_template_process_def_idx').on(table.processDefId),
  sourceRowIdx: index('control_template_source_row_idx').on(table.sourceTemplateRowId),
  charIdIdx: index('control_template_char_id_idx').on(table.charId),
}));

// Library Tables
export const controlsLibrary = pgTable('controls_library', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: text('type').notNull(), // prevention/detection
  name: text('name').notNull(),
  description: text('description'),
  msaStatus: text('msa_status'),
  defaultSampling: text('default_sampling'),
  defaultFrequency: text('default_frequency'),
  defaultAcceptance: text('default_acceptance'),
  gageId: uuid('gage_id'),
});

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
  kind: text('kind').notNull(), // S/O/D
  tableJson: jsonb('table_json').$type<{ rating: number; description: string; criteria: string }[]>().notNull(),
}, (table) => ({
  versionKindIdx: uniqueIndex('rating_scale_version_kind_idx').on(table.version, table.kind),
}));

// Part Tables
export const part = pgTable('part', {
  id: uuid('id').primaryKey().defaultRandom(),
  customer: text('customer').notNull(),
  program: text('program').notNull(),
  partNumber: text('part_number').notNull(),
  partName: text('part_name').notNull(),
  plant: text('plant').notNull(),
  csrNotes: text('csr_notes'),
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

export const pfd = pgTable('pfd', {
  id: uuid('id').primaryKey().defaultRandom(),
  partId: uuid('part_id').notNull().references(() => part.id, { onDelete: 'cascade' }),
  rev: text('rev').notNull(),
  status: statusEnum('status').notNull().default('draft'),
  effectiveFrom: timestamp('effective_from'),
  supersedesId: uuid('supersedes_id').references((): any => pfd.id),
  mermaid: text('mermaid').notNull(),
  json: jsonb('json').$type<any>().notNull(),
  docNo: text('doc_no'),
  signatures: jsonb('signatures').$type<{ role: string; userId: string; at: string; hash: string }[]>().default([]),
}, (table) => ({
  partRevIdx: uniqueIndex('pfd_part_rev_idx').on(table.partId, table.rev),
}));

export const pfdStep = pgTable('pfd_step', {
  id: uuid('id').primaryKey().defaultRandom(),
  pfdId: uuid('pfd_id').notNull().references(() => pfd.id, { onDelete: 'cascade' }),
  stepId: uuid('step_id').notNull(),
  name: text('name').notNull(),
  area: text('area').notNull(),
  equipment: jsonb('equipment').$type<any[]>(),
  linkedCharacteristics: jsonb('linked_characteristics').$type<string[]>().default([]),
  risksSummary: text('risks_summary'),
});

export const pfmea = pgTable('pfmea', {
  id: uuid('id').primaryKey().defaultRandom(),
  partId: uuid('part_id').notNull().references(() => part.id, { onDelete: 'cascade' }),
  rev: text('rev').notNull(),
  status: statusEnum('status').notNull().default('draft'),
  basis: text('basis'), // "AIAG-VDA 2019"
  docNo: text('doc_no'),
  approvedBy: uuid('approved_by'),
  approvedAt: timestamp('approved_at'),
  effectiveFrom: timestamp('effective_from'),
  supersedesId: uuid('supersedes_id').references((): any => pfmea.id),
}, (table) => ({
  partRevIdx: uniqueIndex('pfmea_part_rev_idx').on(table.partId, table.rev),
}));

export const pfmeaRow = pgTable('pfmea_row', {
  id: uuid('id').primaryKey().defaultRandom(),
  pfmeaId: uuid('pfmea_id').notNull().references(() => pfmea.id, { onDelete: 'cascade' }),
  parentTemplateRowId: uuid('parent_template_row_id').references(() => fmeaTemplateRow.id),
  stepRef: text('step_ref').notNull(),
  function: text('function').notNull(),
  requirement: text('requirement').notNull(),
  failureMode: text('failure_mode').notNull(),
  effect: text('effect').notNull(),
  severity: integer('severity').notNull(),
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
}, (table) => ({
  pfmeaIdx: index('pfmea_row_pfmea_idx').on(table.pfmeaId),
  parentTemplateIdx: index('pfmea_row_parent_template_idx').on(table.parentTemplateRowId),
}));

export const controlPlan = pgTable('control_plan', {
  id: uuid('id').primaryKey().defaultRandom(),
  partId: uuid('part_id').notNull().references(() => part.id, { onDelete: 'cascade' }),
  rev: text('rev').notNull(),
  type: text('type').notNull(), // Pre-Launch/Production
  status: statusEnum('status').notNull().default('draft'),
  docNo: text('doc_no'),
  approvedBy: uuid('approved_by'),
  approvedAt: timestamp('approved_at'),
  effectiveFrom: timestamp('effective_from'),
  supersedesId: uuid('supersedes_id').references((): any => controlPlan.id),
}, (table) => ({
  partRevIdx: uniqueIndex('control_plan_part_rev_idx').on(table.partId, table.rev),
}));

export const controlPlanRow = pgTable('control_plan_row', {
  id: uuid('id').primaryKey().defaultRandom(),
  controlPlanId: uuid('control_plan_id').notNull().references(() => controlPlan.id, { onDelete: 'cascade' }),
  sourcePfmeaRowId: uuid('source_pfmea_row_id').references(() => pfmeaRow.id),
  parentControlTemplateRowId: uuid('parent_control_template_row_id').references(() => controlTemplateRow.id),
  charId: text('char_id').notNull(),
  characteristicName: text('characteristic_name').notNull(),
  type: text('type').notNull(),
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
  overrideFlags: jsonb('override_flags').$type<Record<string, boolean>>().default({}),
}, (table) => ({
  controlPlanIdx: index('control_plan_row_plan_idx').on(table.controlPlanId),
  sourcePfmeaIdx: index('control_plan_row_pfmea_idx').on(table.sourcePfmeaRowId),
  charIdIdx: index('control_plan_row_char_id_idx').on(table.charId),
}));

// Change Management
export const changePackage = pgTable('change_package', {
  id: uuid('id').primaryKey().defaultRandom(),
  status: changeStatusEnum('status').notNull().default('draft'),
  effectiveFrom: timestamp('effective_from'),
  reasonCode: text('reason_code').notNull(),
  initiatedBy: uuid('initiated_by').notNull(),
  approverMatrix: jsonb('approver_matrix').$type<{ role: string; userId?: string; required: boolean }[]>().default([]),
  redlineJson: jsonb('redline_json').$type<any>().default({}),
  autoReviewReport: jsonb('auto_review_report').$type<any>().default({}),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  statusIdx: index('change_package_status_idx').on(table.status),
}));

// Governance Tables
export const ownership = pgTable('ownership', {
  id: uuid('id').primaryKey().defaultRandom(),
  entityType: text('entity_type').notNull(),
  entityId: uuid('entity_id').notNull(),
  ownerUserId: uuid('owner_user_id').notNull(),
  watchers: jsonb('watchers').$type<string[]>().default([]),
}, (table) => ({
  entityIdx: uniqueIndex('ownership_entity_idx').on(table.entityType, table.entityId),
}));

export const signature = pgTable('signature', {
  id: uuid('id').primaryKey().defaultRandom(),
  entityType: text('entity_type').notNull(),
  entityId: uuid('entity_id').notNull(),
  role: text('role').notNull(),
  signerUserId: uuid('signer_user_id').notNull(),
  signedAt: timestamp('signed_at').notNull().defaultNow(),
  contentHash: text('content_hash').notNull(),
}, (table) => ({
  entityRoleIdx: uniqueIndex('signature_entity_role_idx').on(table.entityType, table.entityId, table.role),
}));

export const auditLog = pgTable('audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  entityType: text('entity_type').notNull(),
  entityId: uuid('entity_id').notNull(),
  action: text('action').notNull(),
  actor: uuid('actor').notNull(),
  at: timestamp('at').notNull().defaultNow(),
  payloadJson: jsonb('payload_json').$type<any>(),
}, (table) => ({
  entityIdx: index('audit_log_entity_idx').on(table.entityType, table.entityId),
  actorIdx: index('audit_log_actor_idx').on(table.actor),
  atIdx: index('audit_log_at_idx').on(table.at),
}));

export const trainingAck = pgTable('training_ack', {
  id: uuid('id').primaryKey().defaultRandom(),
  changeId: uuid('change_id').notNull().references(() => changePackage.id),
  personId: uuid('person_id').notNull(),
  acknowledgedAt: timestamp('acknowledged_at'),
  evidence: text('evidence'),
});

export const msaLink = pgTable('msa_link', {
  id: uuid('id').primaryKey().defaultRandom(),
  controlRowId: uuid('control_row_id').notNull().references(() => controlPlanRow.id),
  gageId: uuid('gage_id').notNull().references(() => gageLibrary.id),
  msaStatus: text('msa_status').notNull(), // Existing/Planned/Failed
  studyId: text('study_id'),
});

export const calibrationLink = pgTable('calibration_link', {
  id: uuid('id').primaryKey().defaultRandom(),
  gageId: uuid('gage_id').notNull().references(() => gageLibrary.id),
  calibDue: timestamp('calib_due').notNull(),
  status: text('status').notNull(), // OK/Overdue
}, (table) => ({
  gageIdx: index('calibration_link_gage_idx').on(table.gageId),
}));

// Relations
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
}));

export const pfmeaRowRelations = relations(pfmeaRow, ({ one }) => ({
  pfmea: one(pfmea, {
    fields: [pfmeaRow.pfmeaId],
    references: [pfmea.id],
  }),
  parentTemplate: one(fmeaTemplateRow, {
    fields: [pfmeaRow.parentTemplateRowId],
    references: [fmeaTemplateRow.id],
  }),
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
}));

export const controlPlanRowRelations = relations(controlPlanRow, ({ one, many }) => ({
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
  msaLinks: many(msaLink),
}));

// Export all for use in queries
export * from 'drizzle-orm';
