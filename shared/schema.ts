import { pgTable, text, integer, jsonb, timestamp, boolean, uuid, pgEnum, index, uniqueIndex } from 'drizzle-orm/pg-core';
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

export const processStep = pgTable('process_step', {
  id: uuid('id').primaryKey().defaultRandom(),
  processDefId: uuid('process_def_id').notNull().references(() => processDef.id, { onDelete: 'cascade' }),
  seq: integer('seq').notNull(),
  name: text('name').notNull(),
  area: text('area').notNull(),
  equipment: jsonb('equipment').$type<{ name: string; model?: string; settings?: Record<string, any> }[]>(),
  equipmentIds: jsonb('equipment_ids').$type<string[]>().default([]), // Array of equipment library IDs
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
  ap: text('ap').notNull(),
  specialFlag: boolean('special_flag').notNull().default(false),
  csrSymbol: text('csr_symbol'),
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
  type: text('type').notNull(),
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
  type: text('type').notNull(), // 'injection_press', 'ultrasonic_welder', 'hot_plate_welder', 'robot', 'conveyor', 'test_station'
  name: text('name').notNull().unique(), // 'Engel 200T #1', 'Branson Welder #3'
  manufacturer: text('manufacturer'), // 'Engel', 'Branson', 'Fanuc'
  model: text('model'), // 'Victory 200', 'M-710iC'
  tonnage: integer('tonnage'), // For presses: 200, 500, 1000, etc.
  serialNumber: text('serial_number'),
  location: text('location'), // 'Plant 1 - Cell 3'
  status: text('status').notNull().default('active'), // 'active', 'maintenance', 'retired'
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const equipmentErrorProofing = pgTable('equipment_error_proofing', {
  id: uuid('id').primaryKey().defaultRandom(),
  equipmentId: uuid('equipment_id').notNull().references(() => equipmentLibrary.id, { onDelete: 'cascade' }),
  controlType: text('control_type').notNull(), // 'prevention' or 'detection'
  name: text('name').notNull(), // 'Cavity pressure monitoring'
  description: text('description'), // Detailed description of how control works
  failureModesAddressed: jsonb('failure_modes_addressed').$type<string[]>().default([]), // ['Short shot', 'Voids', 'Flash']
  suggestedDetectionRating: integer('suggested_detection_rating'), // 3-7 typical, null for prevention
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const equipmentControlMethods = pgTable('equipment_control_methods', {
  id: uuid('id').primaryKey().defaultRandom(),
  equipmentId: uuid('equipment_id').notNull().references(() => equipmentLibrary.id, { onDelete: 'cascade' }),
  characteristicType: text('characteristic_type').notNull(), // 'product' or 'process'
  characteristicName: text('characteristic_name').notNull(), // 'Shot weight', 'Weld energy', 'Cavity pressure'
  controlMethod: text('control_method').notNull(), // 'Automatic 100%', 'X̄-R Chart', 'Attribute check'
  measurementSystem: text('measurement_system'), // 'Integrated scale', 'Pressure transducer'
  sampleSize: text('sample_size'), // '100%', '5 pc', '1 pc'
  frequency: text('frequency'), // 'Continuous', 'Every cycle', '1/hour'
  acceptanceCriteria: text('acceptance_criteria'), // '±2g', 'Within limits'
  reactionPlan: text('reaction_plan'), // 'Auto-reject to quarantine', 'Alarm - stop process'
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Failure Modes Library Tables
export const failureModesLibrary = pgTable('failure_modes_library', {
  id: uuid('id').primaryKey().defaultRandom(),
  category: failureModeCategoryEnum('category').notNull(),
  failureMode: text('failure_mode').notNull(),
  genericEffect: text('generic_effect').notNull(),
  typicalCauses: jsonb('typical_causes').$type<string[]>().notNull().default([]),
  industryStandard: text('industry_standard'), // 'AIAG-VDA 2019', 'Customer CSR', etc.
  applicableProcesses: jsonb('applicable_processes').$type<string[]>().default([]),
  defaultSeverity: integer('default_severity'),
  defaultOccurrence: integer('default_occurrence'),
  tags: jsonb('tags').$type<string[]>().default([]),
  status: text('status').notNull().default('active'), // 'active' or 'deprecated'
  lastUsed: timestamp('last_used'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  categoryIdx: index('failure_modes_category_idx').on(table.category),
  statusIdx: index('failure_modes_status_idx').on(table.status),
}));

// Link table for tracking which catalog items are used in FMEA templates
export const fmeaTemplateCatalogLink = pgTable('fmea_template_catalog_link', {
  id: uuid('id').primaryKey().defaultRandom(),
  templateRowId: uuid('template_row_id').notNull().references(() => fmeaTemplateRow.id, { onDelete: 'cascade' }),
  catalogItemId: uuid('catalog_item_id').notNull().references(() => failureModesLibrary.id, { onDelete: 'cascade' }),
  customized: boolean('customized').notNull().default(false), // Did user modify from catalog?
  adoptedAt: timestamp('adopted_at').notNull().defaultNow(),
}, (table) => ({
  templateRowIdx: index('fmea_catalog_link_template_idx').on(table.templateRowId),
  catalogItemIdx: index('fmea_catalog_link_catalog_idx').on(table.catalogItemId),
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

export const pfmea = pgTable('pfmea', {
  id: uuid('id').primaryKey().defaultRandom(),
  partId: uuid('part_id').notNull().references(() => part.id, { onDelete: 'cascade' }),
  rev: text('rev').notNull(),
  status: statusEnum('status').notNull().default('draft'),
  basis: text('basis'),
  docNo: text('doc_no'),
  approvedBy: uuid('approved_by'),
  approvedAt: timestamp('approved_at'),
  effectiveFrom: timestamp('effective_from'),
  supersedesId: uuid('supersedes_id').references((): any => pfmea.id, { onDelete: 'set null' }),
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
  type: text('type').notNull(),
  status: statusEnum('status').notNull().default('draft'),
  docNo: text('doc_no'),
  approvedBy: uuid('approved_by'),
  approvedAt: timestamp('approved_at'),
  effectiveFrom: timestamp('effective_from'),
  supersedesId: uuid('supersedes_id').references((): any => controlPlan.id, { onDelete: 'set null' }),
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

export const calibrationLink = pgTable('calibration_link', {
  id: uuid('id').primaryKey().defaultRandom(),
  gageId: uuid('gage_id').notNull().references(() => gageLibrary.id),
  calibDue: timestamp('calib_due').notNull(),
  status: text('status').notNull(),
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

// Insert schemas
export const insertPartSchema = createInsertSchema(part).omit({ id: true });
export const insertProcessDefSchema = createInsertSchema(processDef).omit({ id: true, createdAt: true });
export const insertProcessStepSchema = createInsertSchema(processStep).omit({ id: true });
export const insertFmeaTemplateRowSchema = createInsertSchema(fmeaTemplateRow).omit({ id: true });
export const insertControlTemplateRowSchema = createInsertSchema(controlTemplateRow).omit({ id: true });
export const insertPfmeaSchema = createInsertSchema(pfmea).omit({ id: true });
export const insertPfmeaRowSchema = createInsertSchema(pfmeaRow).omit({ id: true });
export const insertControlPlanSchema = createInsertSchema(controlPlan).omit({ id: true });
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

// Types
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
export type PFMEA = typeof pfmea.$inferSelect;
export type InsertPFMEA = z.infer<typeof insertPfmeaSchema>;
export type PFMEARow = typeof pfmeaRow.$inferSelect;
export type InsertPFMEARow = z.infer<typeof insertPfmeaRowSchema>;
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

// Category type for Failure Modes Library
export type FailureModeCategory = 'dimensional' | 'visual' | 'functional' | 'assembly' | 'material' | 'process' | 'contamination' | 'environmental';
