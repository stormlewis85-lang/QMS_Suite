import { z } from 'zod';

// Common validators
export const uuidSchema = z.string().uuid();
export const revisionSchema = z.string().regex(/^\d+\.\d+\.\d+$/, 'Invalid revision format (use x.y.z)');

// AP and CSR
export const apSchema = z.enum(['H', 'M', 'L']);
export const csrSymbolSchema = z.enum(['Ⓢ', '◆', 'ⓒ']).nullable();

// Process validators
export const processStepSchema = z.object({
  seq: z.number().int().positive(),
  name: z.string().min(1),
  area: z.string().min(1),
  equipment: z.array(z.object({
    name: z.string(),
    model: z.string().optional(),
    settings: z.record(z.any()).optional(),
  })).optional(),
});

export const createProcessSchema = z.object({
  name: z.string().min(1),
  rev: revisionSchema,
  steps: z.array(processStepSchema),
});

// FMEA validators
export const fmeaTemplateRowSchema = z.object({
  stepId: uuidSchema,
  function: z.string().min(1),
  requirement: z.string().min(1),
  failureMode: z.string().min(1),
  effect: z.string().min(1),
  severity: z.number().int().min(1).max(10),
  cause: z.string().min(1),
  occurrence: z.number().int().min(1).max(10),
  preventionControls: z.array(z.string()),
  detectionControls: z.array(z.string()),
  detection: z.number().int().min(1).max(10),
  specialFlag: z.boolean().default(false),
  csrSymbol: csrSymbolSchema.optional(),
  notes: z.string().optional(),
});

// Part validators
export const createPartSchema = z.object({
  customer: z.string().min(1),
  program: z.string().min(1),
  partNumber: z.string().min(1),
  partName: z.string().min(1),
  plant: z.string().min(1),
  csrNotes: z.string().optional(),
});

// Generation validators
export const generateDocsSchema = z.object({
  partId: uuidSchema,
  processes: z.array(z.object({
    processDefId: uuidSchema,
    rev: z.string(),
  })),
  rev: revisionSchema.default('1.0.0'),
});

// Control Plan validators
export const controlTemplateRowSchema = z.object({
  characteristicName: z.string().min(1),
  charId: z.string().min(1),
  type: z.enum(['Product', 'Process']),
  target: z.string().optional(),
  tolerance: z.string().optional(),
  specialFlag: z.boolean().default(false),
  csrSymbol: csrSymbolSchema.optional(),
  measurementSystem: z.string().optional(),
  gageDetails: z.string().optional(),
  defaultSampleSize: z.string().optional(),
  defaultFrequency: z.string().optional(),
  controlMethod: z.string().optional(),
  acceptanceCriteria: z.string().optional(),
  reactionPlan: z.string().optional(),
});

// Auto-Review validators
export const autoReviewInputSchema = z.object({
  pfmeaId: uuidSchema,
  controlPlanId: uuidSchema,
});

export type CreateProcessInput = z.infer<typeof createProcessSchema>;
export type CreatePartInput = z.infer<typeof createPartSchema>;
export type GenerateDocsInput = z.infer<typeof generateDocsSchema>;
export type AutoReviewInput = z.infer<typeof autoReviewInputSchema>;
