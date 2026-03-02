import { createHash } from "crypto";

export function computeFileChecksum(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

export function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').toLowerCase();
}

export function generateDocNumber(format: string, context: { department?: string; category?: string; seq?: number; year?: number }): string {
  let result = format;
  if (context.department) result = result.replace('{department}', context.department.substring(0, 3).toUpperCase());
  if (context.category) result = result.replace('{category}', context.category.substring(0, 3).toUpperCase());
  if (context.year) result = result.replace('{year}', String(context.year));
  // Handle {seq:N} pattern
  const seqMatch = result.match(/\{seq:(\d+)\}/);
  if (seqMatch && context.seq !== undefined) {
    const padLen = parseInt(seqMatch[1]);
    result = result.replace(seqMatch[0], String(context.seq).padStart(padLen, '0'));
  }
  return result;
}

export function resolveWorkflowAssignee(stepDef: any, context: { initiatedBy: string }): string | null {
  if (!stepDef.assigneeType) return null;
  switch (stepDef.assigneeType) {
    case 'initiator': return context.initiatedBy;
    case 'specific_user': return stepDef.assigneeId || null;
    case 'role_based': return null; // Assigned at runtime
    case 'department_head': return null; // Assigned at runtime
    default: return null;
  }
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function parseToolData(tool: any): any {
  try { return typeof tool.data === 'string' ? JSON.parse(tool.data) : tool.data; } catch { return {}; }
}

export function updateToolData(existingData: any, updates: any): string {
  const current = typeof existingData === 'string' ? JSON.parse(existingData || '{}') : existingData || {};
  return JSON.stringify({ ...current, ...updates });
}
