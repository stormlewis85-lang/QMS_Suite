import ExcelJS from 'exceljs';
import { db } from '../db';
import { 
  pfmea, 
  pfmeaRow, 
  controlPlan, 
  controlPlanRow,
} from '@shared/schema';
import { eq } from 'drizzle-orm';
import { calculateAP } from './ap-calculator';

export type ImportType = 'pfmea' | 'control_plan' | 'process_flow' | 'auto_detect';

export interface ColumnMapping {
  sourceColumn: string;
  targetField: string;
  transform?: 'none' | 'number' | 'array' | 'boolean';
}

export interface ImportValidationError {
  row: number;
  column: string;
  value: any;
  error: string;
  severity: 'error' | 'warning';
}

export interface ImportPreviewRow {
  rowNumber: number;
  data: Record<string, any>;
  errors: ImportValidationError[];
  warnings: ImportValidationError[];
}

export interface ImportPreview {
  type: ImportType;
  filename: string;
  sheetName: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  columns: string[];
  suggestedMapping: ColumnMapping[];
  preview: ImportPreviewRow[];
  canImport: boolean;
}

export interface ImportResult {
  success: boolean;
  importedCount: number;
  skippedCount: number;
  errors: ImportValidationError[];
  createdIds: string[];
}

export interface ImportOptions {
  type: ImportType;
  partId?: string;
  pfmeaId?: string;
  controlPlanId?: string;
  mapping: ColumnMapping[];
  skipInvalidRows: boolean;
  createNewDocument: boolean;
}

// Standard AIAG column mappings
const PFMEA_COLUMN_PATTERNS: Record<string, string[]> = {
  'stepRef': ['step', 'process step', 'operation', 'op #', 'op no', 'station'],
  'function': ['function', 'process function', 'item function'],
  'requirement': ['requirement', 'requirements', 'spec', 'specification'],
  'failureMode': ['failure mode', 'potential failure mode', 'failure', 'fm'],
  'effect': ['effect', 'potential effect', 'effects', 'effect of failure'],
  'severity': ['severity', 'sev', 's', 'severity rating'],
  'cause': ['cause', 'potential cause', 'causes', 'cause of failure'],
  'occurrence': ['occurrence', 'occ', 'o', 'occurrence rating'],
  'preventionControls': ['prevention', 'prevention control', 'current control prevention', 'prevention controls'],
  'detectionControls': ['detection', 'detection control', 'current control detection', 'detection controls'],
  'detection': ['detection rating', 'det', 'd', 'detection'],
  'classification': ['class', 'classification', 'char class', 'sc', 'special char'],
  'notes': ['notes', 'remarks', 'comments', 'action'],
};

const CONTROL_PLAN_COLUMN_PATTERNS: Record<string, string[]> = {
  'charId': ['char #', 'char no', 'characteristic #', 'no.', 'item'],
  'characteristicName': ['characteristic', 'characteristic name', 'product characteristic', 'process characteristic', 'description'],
  'type': ['type', 'char type', 'p/p', 'product/process'],
  'target': ['target', 'nominal', 'specification', 'spec'],
  'tolerance': ['tolerance', 'tol', 'limits', '+/-'],
  'specialFlag': ['special', 'sc', 'cc', 'critical', 'classification'],
  'measurementSystem': ['measurement', 'measurement system', 'evaluation', 'eval method'],
  'gageDetails': ['gage', 'gage #', 'gage name', 'equipment'],
  'sampleSize': ['sample size', 'sample', 'n', 'qty'],
  'frequency': ['frequency', 'freq', 'sample frequency', 'check frequency'],
  'controlMethod': ['control method', 'method', 'control'],
  'acceptanceCriteria': ['acceptance', 'acceptance criteria', 'criteria', 'pass/fail'],
  'reactionPlan': ['reaction', 'reaction plan', 'corrective action', 'response'],
};

function normalizeColumnName(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ');
}

function findBestMatch(columnName: string, patterns: Record<string, string[]>): string | null {
  const normalized = normalizeColumnName(columnName);
  
  for (const [field, fieldPatterns] of Object.entries(patterns)) {
    for (const pattern of fieldPatterns) {
      if (normalized === pattern || normalized.includes(pattern) || pattern.includes(normalized)) {
        return field;
      }
    }
  }
  return null;
}

function parseNumericRating(value: any): number | null {
  if (value === null || value === undefined || value === '') return null;
  
  const num = typeof value === 'number' ? value : parseInt(String(value).trim(), 10);
  
  if (isNaN(num) || num < 1 || num > 10) return null;
  return num;
}

function parseArrayValue(value: any): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String);
  
  const str = String(value);
  return str.split(/[,;\n]/).map(s => s.trim()).filter(Boolean);
}

function detectSpecialCharacteristic(value: any): { flag: boolean; symbol: string | null } {
  if (!value) return { flag: false, symbol: null };
  
  const str = String(value).toUpperCase().trim();
  
  if (str.includes('Ⓢ') || str === 'S' || str.includes('SAFETY')) {
    return { flag: true, symbol: 'Ⓢ' };
  }
  if (str.includes('◆') || str === 'CC' || str.includes('CRITICAL')) {
    return { flag: true, symbol: '◆' };
  }
  if (str.includes('ⓒ') || str === 'SC' || str.includes('SIGNIFICANT')) {
    return { flag: true, symbol: 'ⓒ' };
  }
  if (str === 'Y' || str === 'YES' || str === 'X' || str === '1') {
    return { flag: true, symbol: null };
  }
  
  return { flag: false, symbol: null };
}

export class ImportService {
  
  async parseExcelFile(buffer: Buffer, filename: string): Promise<{
    sheets: { name: string; rowCount: number }[];
    detectedType: ImportType;
  }> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    
    const sheets = workbook.worksheets.map(ws => ({
      name: ws.name,
      rowCount: ws.rowCount,
    }));
    
    let detectedType: ImportType = 'auto_detect';
    
    for (const ws of workbook.worksheets) {
      const sheetNameLower = ws.name.toLowerCase();
      if (sheetNameLower.includes('pfmea') || sheetNameLower.includes('fmea')) {
        detectedType = 'pfmea';
        break;
      }
      if (sheetNameLower.includes('control') || sheetNameLower.includes('cp')) {
        detectedType = 'control_plan';
        break;
      }
      if (sheetNameLower.includes('flow') || sheetNameLower.includes('pfd')) {
        detectedType = 'process_flow';
        break;
      }
    }
    
    if (detectedType === 'auto_detect') {
      const firstSheet = workbook.worksheets[0];
      if (firstSheet) {
        const headerRow = firstSheet.getRow(1);
        const headers = headerRow.values as string[];
        
        const headerStr = headers.join(' ').toLowerCase();
        if (headerStr.includes('severity') && headerStr.includes('occurrence')) {
          detectedType = 'pfmea';
        } else if (headerStr.includes('characteristic') && headerStr.includes('sample')) {
          detectedType = 'control_plan';
        }
      }
    }
    
    return { sheets, detectedType };
  }
  
  async detectColumns(
    buffer: Buffer, 
    sheetName: string,
    type: ImportType
  ): Promise<{ columns: string[]; suggestedMapping: ColumnMapping[] }> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    
    const sheet = workbook.getWorksheet(sheetName);
    if (!sheet) throw new Error(`Sheet "${sheetName}" not found`);
    
    const headerRow = sheet.getRow(1);
    const columns: string[] = [];
    
    headerRow.eachCell((cell, colNumber) => {
      const value = cell.value?.toString() || `Column ${colNumber}`;
      columns.push(value);
    });
    
    const patterns = type === 'pfmea' ? PFMEA_COLUMN_PATTERNS : CONTROL_PLAN_COLUMN_PATTERNS;
    const suggestedMapping: ColumnMapping[] = [];
    
    for (const column of columns) {
      const match = findBestMatch(column, patterns);
      if (match) {
        let transform: ColumnMapping['transform'] = 'none';
        
        if (['severity', 'occurrence', 'detection'].includes(match)) {
          transform = 'number';
        } else if (['preventionControls', 'detectionControls'].includes(match)) {
          transform = 'array';
        }
        
        suggestedMapping.push({
          sourceColumn: column,
          targetField: match,
          transform,
        });
      }
    }
    
    return { columns, suggestedMapping };
  }
  
  async generatePreview(
    buffer: Buffer,
    sheetName: string,
    type: ImportType,
    mapping: ColumnMapping[],
    previewRowCount: number = 10
  ): Promise<ImportPreview> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    
    const sheet = workbook.getWorksheet(sheetName);
    if (!sheet) throw new Error(`Sheet "${sheetName}" not found`);
    
    const headerRow = sheet.getRow(1);
    const columnIndices: Record<string, number> = {};
    
    headerRow.eachCell((cell, colNumber) => {
      const value = cell.value?.toString() || '';
      columnIndices[value] = colNumber;
    });
    
    const preview: ImportPreviewRow[] = [];
    let validRows = 0;
    let invalidRows = 0;
    
    const totalDataRows = sheet.rowCount - 1;
    const rowsToPreview = Math.min(totalDataRows, previewRowCount);
    
    for (let rowNum = 2; rowNum <= rowsToPreview + 1; rowNum++) {
      const row = sheet.getRow(rowNum);
      const rowData: Record<string, any> = {};
      const errors: ImportValidationError[] = [];
      const warnings: ImportValidationError[] = [];
      
      for (const map of mapping) {
        const colIndex = columnIndices[map.sourceColumn];
        if (!colIndex) continue;
        
        let value: any = row.getCell(colIndex).value;
        
        if (map.transform === 'number') {
          const parsed = parseNumericRating(value);
          if (parsed === null && value !== null && value !== '') {
            errors.push({
              row: rowNum,
              column: map.sourceColumn,
              value,
              error: `Invalid number. Expected 1-10, got "${value}"`,
              severity: 'error',
            });
          }
          value = parsed;
        } else if (map.transform === 'array') {
          value = parseArrayValue(value);
        }
        
        rowData[map.targetField] = value;
      }
      
      if (type === 'pfmea') {
        if (!rowData.failureMode) {
          errors.push({
            row: rowNum,
            column: 'Failure Mode',
            value: null,
            error: 'Failure mode is required',
            severity: 'error',
          });
        }
        if (!rowData.severity || !rowData.occurrence || !rowData.detection) {
          warnings.push({
            row: rowNum,
            column: 'S/O/D',
            value: null,
            error: 'Missing S, O, or D rating - AP cannot be calculated',
            severity: 'warning',
          });
        }
      } else if (type === 'control_plan') {
        if (!rowData.characteristicName) {
          errors.push({
            row: rowNum,
            column: 'Characteristic',
            value: null,
            error: 'Characteristic name is required',
            severity: 'error',
          });
        }
      }
      
      const hasData = Object.values(rowData).some(v => v !== null && v !== undefined && v !== '');
      
      if (hasData) {
        if (errors.length === 0) {
          validRows++;
        } else {
          invalidRows++;
        }
        
        preview.push({
          rowNumber: rowNum,
          data: rowData,
          errors,
          warnings,
        });
      }
    }
    
    const columns = Object.keys(columnIndices);
    
    return {
      type,
      filename: '',
      sheetName,
      totalRows: totalDataRows,
      validRows,
      invalidRows,
      columns,
      suggestedMapping: mapping,
      preview,
      canImport: validRows > 0,
    };
  }
  
  async importPFMEA(
    buffer: Buffer,
    sheetName: string,
    options: ImportOptions
  ): Promise<ImportResult> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    
    const sheet = workbook.getWorksheet(sheetName);
    if (!sheet) throw new Error(`Sheet "${sheetName}" not found`);
    
    const headerRow = sheet.getRow(1);
    const columnIndices: Record<string, number> = {};
    headerRow.eachCell((cell, colNumber) => {
      const value = cell.value?.toString() || '';
      columnIndices[value] = colNumber;
    });
    
    const errors: ImportValidationError[] = [];
    const createdIds: string[] = [];
    let importedCount = 0;
    let skippedCount = 0;
    
    let targetPfmeaId = options.pfmeaId;
    
    if (options.createNewDocument && options.partId) {
      const [newPfmea] = await db.insert(pfmea).values({
        partId: options.partId,
        rev: '1.0.0',
        status: 'draft',
        basis: 'AIAG-VDA 2019',
      }).returning();
      
      targetPfmeaId = newPfmea.id;
      createdIds.push(newPfmea.id);
    }
    
    if (!targetPfmeaId) {
      throw new Error('No target PFMEA specified');
    }
    
    for (let rowNum = 2; rowNum <= sheet.rowCount; rowNum++) {
      const row = sheet.getRow(rowNum);
      const rowData: Record<string, any> = {};
      const rowErrors: ImportValidationError[] = [];
      
      for (const map of options.mapping) {
        const colIndex = columnIndices[map.sourceColumn];
        if (!colIndex) continue;
        
        let value: any = row.getCell(colIndex).value;
        
        if (map.transform === 'number') {
          value = parseNumericRating(value);
        } else if (map.transform === 'array') {
          value = parseArrayValue(value);
        }
        
        rowData[map.targetField] = value;
      }
      
      if (!rowData.failureMode && !rowData.function && !rowData.cause) {
        continue;
      }
      
      if (!rowData.failureMode) {
        rowErrors.push({
          row: rowNum,
          column: 'Failure Mode',
          value: null,
          error: 'Failure mode is required',
          severity: 'error',
        });
      }
      
      if (rowErrors.length > 0) {
        if (options.skipInvalidRows) {
          errors.push(...rowErrors);
          skippedCount++;
          continue;
        } else {
          errors.push(...rowErrors);
        }
      }
      
      let ap = 'L';
      if (rowData.severity && rowData.occurrence && rowData.detection) {
        const result = calculateAP({
          severity: rowData.severity,
          occurrence: rowData.occurrence,
          detection: rowData.detection,
        });
        ap = result.priority;
      }
      
      const scResult = detectSpecialCharacteristic(rowData.classification);
      
      try {
        const [newRow] = await db.insert(pfmeaRow).values({
          pfmeaId: targetPfmeaId,
          stepRef: rowData.stepRef || '',
          function: rowData.function || '',
          requirement: rowData.requirement || '',
          failureMode: rowData.failureMode || '',
          effect: rowData.effect || '',
          severity: rowData.severity || 5,
          cause: rowData.cause || '',
          occurrence: rowData.occurrence || 5,
          preventionControls: rowData.preventionControls || [],
          detectionControls: rowData.detectionControls || [],
          detection: rowData.detection || 5,
          ap,
          specialFlag: scResult.flag,
          csrSymbol: scResult.symbol,
          notes: rowData.notes || null,
          overrideFlags: {},
        }).returning();
        
        createdIds.push(newRow.id);
        importedCount++;
      } catch (err: any) {
        errors.push({
          row: rowNum,
          column: 'Database',
          value: null,
          error: `Failed to insert: ${err.message}`,
          severity: 'error',
        });
        skippedCount++;
      }
    }
    
    return {
      success: errors.filter(e => e.severity === 'error').length === 0,
      importedCount,
      skippedCount,
      errors,
      createdIds,
    };
  }
  
  async importControlPlan(
    buffer: Buffer,
    sheetName: string,
    options: ImportOptions
  ): Promise<ImportResult> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    
    const sheet = workbook.getWorksheet(sheetName);
    if (!sheet) throw new Error(`Sheet "${sheetName}" not found`);
    
    const headerRow = sheet.getRow(1);
    const columnIndices: Record<string, number> = {};
    headerRow.eachCell((cell, colNumber) => {
      const value = cell.value?.toString() || '';
      columnIndices[value] = colNumber;
    });
    
    const errors: ImportValidationError[] = [];
    const createdIds: string[] = [];
    let importedCount = 0;
    let skippedCount = 0;
    
    let targetCpId = options.controlPlanId;
    
    if (options.createNewDocument && options.partId) {
      const [newCP] = await db.insert(controlPlan).values({
        partId: options.partId,
        rev: '1.0.0',
        type: 'Production',
        status: 'draft',
      }).returning();
      
      targetCpId = newCP.id;
      createdIds.push(newCP.id);
    }
    
    if (!targetCpId) {
      throw new Error('No target Control Plan specified');
    }
    
    const existingRows = await db.query.controlPlanRow.findMany({
      where: eq(controlPlanRow.controlPlanId, targetCpId),
    });
    let maxCharNum = Math.max(...existingRows.map(r => {
      const match = r.charId.match(/\d+/);
      return match ? parseInt(match[0]) : 0;
    }), 0);
    
    for (let rowNum = 2; rowNum <= sheet.rowCount; rowNum++) {
      const row = sheet.getRow(rowNum);
      const rowData: Record<string, any> = {};
      
      for (const map of options.mapping) {
        const colIndex = columnIndices[map.sourceColumn];
        if (!colIndex) continue;
        
        let value: any = row.getCell(colIndex).value;
        
        if (map.transform === 'number') {
          value = parseNumericRating(value);
        } else if (map.transform === 'array') {
          value = parseArrayValue(value);
        }
        
        rowData[map.targetField] = value;
      }
      
      if (!rowData.characteristicName && !rowData.target && !rowData.controlMethod) {
        continue;
      }
      
      if (!rowData.characteristicName) {
        if (options.skipInvalidRows) {
          errors.push({
            row: rowNum,
            column: 'Characteristic',
            value: null,
            error: 'Characteristic name is required',
            severity: 'error',
          });
          skippedCount++;
          continue;
        }
      }
      
      maxCharNum++;
      const charId = rowData.charId || `C-${maxCharNum.toString().padStart(3, '0')}`;
      
      const scResult = detectSpecialCharacteristic(rowData.specialFlag);
      
      try {
        const [newRow] = await db.insert(controlPlanRow).values({
          controlPlanId: targetCpId,
          charId,
          characteristicName: rowData.characteristicName || '',
          type: rowData.type || 'Product',
          target: rowData.target || null,
          tolerance: rowData.tolerance || null,
          specialFlag: scResult.flag,
          csrSymbol: scResult.symbol,
          measurementSystem: rowData.measurementSystem || null,
          gageDetails: rowData.gageDetails || null,
          sampleSize: rowData.sampleSize || null,
          frequency: rowData.frequency || null,
          controlMethod: rowData.controlMethod || null,
          acceptanceCriteria: rowData.acceptanceCriteria || null,
          reactionPlan: rowData.reactionPlan || null,
          overrideFlags: {},
        }).returning();
        
        createdIds.push(newRow.id);
        importedCount++;
      } catch (err: any) {
        errors.push({
          row: rowNum,
          column: 'Database',
          value: null,
          error: `Failed to insert: ${err.message}`,
          severity: 'error',
        });
        skippedCount++;
      }
    }
    
    return {
      success: errors.filter(e => e.severity === 'error').length === 0,
      importedCount,
      skippedCount,
      errors,
      createdIds,
    };
  }
}

export const importService = new ImportService();
