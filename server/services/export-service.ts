import { db } from '../db';
import { pfmea, pfmeaRow, controlPlan, controlPlanRow, part, auditLog } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { PassThrough } from 'stream';
import { randomUUID } from 'crypto';

export type ExportFormat = 'pdf' | 'xlsx';
export type DocumentType = 'pfmea' | 'control_plan' | 'pfd';

export interface ExportOptions {
  format: ExportFormat;
  documentType: DocumentType;
  documentId: string;
  includeHeader?: boolean;
  includeSignatures?: boolean;
  includeRevisionHistory?: boolean;
  paperSize?: 'letter' | 'legal' | 'a4';
  orientation?: 'portrait' | 'landscape';
}

export interface ExportResult {
  buffer: Buffer;
  filename: string;
  mimeType: string;
}

interface PFMEAExportData {
  document: any;
  part: any;
  rows: any[];
  signatures: any[];
}

interface ControlPlanExportData {
  document: any;
  part: any;
  rows: any[];
  signatures: any[];
}

function formatDate(date: Date | string | null): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function getAPColor(ap: string): string {
  switch (ap) {
    case 'H': return '#FEE2E2';
    case 'M': return '#FEF3C7';
    case 'L': return '#D1FAE5';
    default: return '#F3F4F6';
  }
}

function getAPColorARGB(ap: string): string {
  switch (ap) {
    case 'H': return 'FFFEE2E2';
    case 'M': return 'FFFEF3C7';
    case 'L': return 'FFD1FAE5';
    default: return 'FFF3F4F6';
  }
}

export class ExportService {
  
  private async logExport(
    entityType: 'pfmea' | 'control_plan',
    entityId: string,
    format: ExportFormat,
    filename: string,
    rowCount: number
  ): Promise<void> {
    try {
      await db.insert(auditLog).values({
        id: randomUUID(),
        entityType,
        entityId,
        action: 'exported',
        actor: 'system',
        payloadJson: {
          format,
          filename,
          rowCount,
          exportedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Failed to log export:', error);
    }
  }
  
  async export(options: ExportOptions): Promise<ExportResult> {
    const { format, documentType, documentId } = options;
    
    let result: ExportResult;
    
    switch (documentType) {
      case 'pfmea':
        result = await (format === 'pdf' 
          ? this.exportPFMEAToPDF(documentId, options)
          : this.exportPFMEAToExcel(documentId, options));
        break;
      case 'control_plan':
        result = await (format === 'pdf'
          ? this.exportControlPlanToPDF(documentId, options)
          : this.exportControlPlanToExcel(documentId, options));
        break;
      default:
        throw new Error(`Unsupported document type: ${documentType}`);
    }
    
    const data = documentType === 'pfmea' 
      ? await this.getPFMEAData(documentId)
      : await this.getControlPlanData(documentId);
    
    await this.logExport(
      documentType as 'pfmea' | 'control_plan',
      documentId,
      format,
      result.filename,
      data.rows.length
    );
    
    return result;
  }
  
  private async getPFMEAData(documentId: string): Promise<PFMEAExportData> {
    const document = await db.query.pfmea.findFirst({
      where: eq(pfmea.id, documentId),
    });
    
    if (!document) throw new Error('PFMEA not found');
    
    const partData = await db.query.part.findFirst({
      where: eq(part.id, document.partId),
    });
    
    const rows = await db.query.pfmeaRow.findMany({
      where: eq(pfmeaRow.pfmeaId, documentId),
      orderBy: (row, { asc }) => [asc(row.stepRef)],
    });
    
    const signatures = await db.select().from(auditLog).where(
      and(
        eq(auditLog.entityType, 'pfmea'),
        eq(auditLog.entityId, documentId),
        eq(auditLog.action, 'signature_added')
      )
    );
    
    return {
      document,
      part: partData,
      rows: rows || [],
      signatures: signatures || [],
    };
  }
  
  private async getControlPlanData(documentId: string): Promise<ControlPlanExportData> {
    const document = await db.query.controlPlan.findFirst({
      where: eq(controlPlan.id, documentId),
    });
    
    if (!document) throw new Error('Control Plan not found');
    
    const partData = await db.query.part.findFirst({
      where: eq(part.id, document.partId),
    });
    
    const rows = await db.query.controlPlanRow.findMany({
      where: eq(controlPlanRow.controlPlanId, documentId),
      orderBy: (row, { asc }) => [asc(row.charId)],
    });
    
    const signatures = await db.select().from(auditLog).where(
      and(
        eq(auditLog.entityType, 'control_plan'),
        eq(auditLog.entityId, documentId),
        eq(auditLog.action, 'signature_added')
      )
    );
    
    return {
      document,
      part: partData,
      rows: rows || [],
      signatures: signatures || [],
    };
  }
  
  private async exportPFMEAToPDF(documentId: string, options: ExportOptions): Promise<ExportResult> {
    const data = await this.getPFMEAData(documentId);
    const { document, part: partData, rows, signatures } = data;
    
    const doc = new PDFDocument({
      size: options.paperSize?.toUpperCase() || 'LETTER',
      layout: options.orientation || 'landscape',
      margins: { top: 50, bottom: 50, left: 40, right: 40 },
      info: {
        Title: `PFMEA - ${partData?.partNumber || 'Unknown'}`,
        Author: 'PFMEA Suite',
        Subject: 'Process Failure Mode and Effects Analysis',
      },
    });
    
    const chunks: Buffer[] = [];
    const stream = new PassThrough();
    
    doc.pipe(stream);
    
    stream.on('data', (chunk) => chunks.push(chunk));
    
    doc.fontSize(18).font('Helvetica-Bold').text('PROCESS FAILURE MODE AND EFFECTS ANALYSIS', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica').text('(PROCESS PFMEA)', { align: 'center' });
    doc.moveDown();
    
    const infoY = doc.y;
    doc.fontSize(9);
    
    doc.text(`Part Number: ${partData?.partNumber || '-'}`, 40, infoY);
    doc.text(`Part Name: ${partData?.partName || '-'}`, 40, infoY + 12);
    doc.text(`Customer: ${partData?.customer || '-'}`, 40, infoY + 24);
    doc.text(`Program: ${partData?.program || '-'}`, 40, infoY + 36);
    
    doc.text(`PFMEA No: ${document.docNo || 'Not Assigned'}`, 400, infoY);
    doc.text(`Rev: ${document.rev}`, 400, infoY + 12);
    doc.text(`Status: ${document.status}`, 400, infoY + 24);
    doc.text(`Effective: ${formatDate(document.effectiveFrom)}`, 400, infoY + 36);
    doc.text(`Basis: ${document.basis || 'AIAG-VDA 2019'}`, 400, infoY + 48);
    
    doc.moveDown(4);
    
    const tableTop = doc.y;
    const colWidths = [60, 70, 70, 70, 70, 25, 70, 25, 70, 70, 25, 25];
    const headers = ['Step', 'Function', 'Failure Mode', 'Effect', 'Cause', 'S', 'Prevention', 'O', 'Detection', 'Control', 'D', 'AP'];
    
    doc.fontSize(7).font('Helvetica-Bold');
    doc.fillColor('#1F2937');
    
    doc.rect(40, tableTop - 3, 720, 18).fill('#E5E7EB');
    doc.fillColor('#1F2937');
    
    let xPos = 40;
    headers.forEach((header, i) => {
      doc.text(header, xPos + 2, tableTop, { width: colWidths[i] - 4, align: 'left' });
      xPos += colWidths[i];
    });
    
    doc.moveDown();
    
    doc.font('Helvetica').fontSize(6);
    let rowY = tableTop + 18;
    
    for (const row of rows) {
      if (rowY > doc.page.height - 80) {
        doc.addPage();
        rowY = 50;
        
        doc.fontSize(7).font('Helvetica-Bold');
        doc.rect(40, rowY - 3, 720, 18).fill('#E5E7EB');
        doc.fillColor('#1F2937');
        xPos = 40;
        headers.forEach((header, i) => {
          doc.text(header, xPos + 2, rowY, { width: colWidths[i] - 4, align: 'left' });
          xPos += colWidths[i];
        });
        rowY += 18;
        doc.font('Helvetica').fontSize(6);
      }
      
      const apColor = getAPColor(row.ap);
      doc.rect(40, rowY - 2, 720, 36).fill(apColor);
      doc.fillColor('#1F2937');
      
      xPos = 40;
      const rowData = [
        row.stepRef || '-',
        row.function || '-',
        row.failureMode || '-',
        row.effect || '-',
        row.cause || '-',
        row.severity?.toString() || '-',
        (row.preventionControls || []).join(', ') || '-',
        row.occurrence?.toString() || '-',
        (row.detectionControls || []).join(', ') || '-',
        '-',
        row.detection?.toString() || '-',
        row.ap || '-',
      ];
      
      rowData.forEach((cell, i) => {
        const textOptions = { width: colWidths[i] - 4, height: 32, ellipsis: true };
        doc.text(String(cell).substring(0, 100), xPos + 2, rowY, textOptions);
        xPos += colWidths[i];
      });
      
      rowY += 38;
    }
    
    doc.addPage();
    doc.fontSize(14).font('Helvetica-Bold').text('SUMMARY', { align: 'center' });
    doc.moveDown();
    
    const highCount = rows.filter(r => r.ap === 'H').length;
    const mediumCount = rows.filter(r => r.ap === 'M').length;
    const lowCount = rows.filter(r => r.ap === 'L').length;
    
    doc.fontSize(10).font('Helvetica');
    doc.text(`Total Failure Modes: ${rows.length}`);
    doc.text(`High Action Priority (H): ${highCount}`);
    doc.text(`Medium Action Priority (M): ${mediumCount}`);
    doc.text(`Low Action Priority (L): ${lowCount}`);
    doc.moveDown();
    
    if (options.includeSignatures !== false && signatures.length > 0) {
      doc.fontSize(12).font('Helvetica-Bold').text('APPROVALS');
      doc.moveDown(0.5);
      
      doc.fontSize(9).font('Helvetica');
      for (const sig of signatures) {
        const payload = sig.payloadJson as any;
        const role = payload?.role || 'unknown';
        doc.text(`${role.replace('_', ' ').toUpperCase()}: Signed ${formatDate(sig.createdAt)}`);
      }
    }
    
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      doc.fontSize(7).fillColor('#6B7280');
      doc.text(
        `Page ${i + 1} of ${pages.count} | Generated: ${new Date().toLocaleString()} | PFMEA Suite`,
        40,
        doc.page.height - 30,
        { align: 'center', width: doc.page.width - 80 }
      );
    }
    
    doc.end();
    
    return new Promise((resolve, reject) => {
      stream.on('end', () => {
        resolve({
          buffer: Buffer.concat(chunks),
          filename: `PFMEA_${partData?.partNumber || 'Unknown'}_Rev${document.rev}.pdf`,
          mimeType: 'application/pdf',
        });
      });
      stream.on('error', reject);
    });
  }
  
  private async exportPFMEAToExcel(documentId: string, options: ExportOptions): Promise<ExportResult> {
    const data = await this.getPFMEAData(documentId);
    const { document, part: partData, rows, signatures } = data;
    
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'PFMEA Suite';
    workbook.created = new Date();
    
    const sheet = workbook.addWorksheet('PFMEA', {
      pageSetup: { paperSize: 9, orientation: 'landscape' },
    });
    
    sheet.mergeCells('A1:N1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'PROCESS FAILURE MODE AND EFFECTS ANALYSIS (PFMEA)';
    titleCell.font = { bold: true, size: 16 };
    titleCell.alignment = { horizontal: 'center' };
    
    sheet.getCell('A3').value = 'Part Number:';
    sheet.getCell('B3').value = partData?.partNumber || '-';
    sheet.getCell('A4').value = 'Part Name:';
    sheet.getCell('B4').value = partData?.partName || '-';
    sheet.getCell('A5').value = 'Customer:';
    sheet.getCell('B5').value = partData?.customer || '-';
    sheet.getCell('A6').value = 'Program:';
    sheet.getCell('B6').value = partData?.program || '-';
    
    sheet.getCell('E3').value = 'PFMEA No:';
    sheet.getCell('F3').value = document.docNo || 'Not Assigned';
    sheet.getCell('E4').value = 'Revision:';
    sheet.getCell('F4').value = document.rev;
    sheet.getCell('E5').value = 'Status:';
    sheet.getCell('F5').value = document.status;
    sheet.getCell('E6').value = 'Effective Date:';
    sheet.getCell('F6').value = formatDate(document.effectiveFrom);
    sheet.getCell('E7').value = 'Basis:';
    sheet.getCell('F7').value = document.basis || 'AIAG-VDA 2019';
    
    const headerRow = 9;
    const headers = [
      'Item', 'Process Step', 'Function', 'Requirement', 'Failure Mode', 
      'Effect', 'S', 'Cause', 'O', 'Prevention Controls', 
      'Detection Controls', 'D', 'AP', 'Special Char', 'Notes'
    ];
    
    headers.forEach((header, idx) => {
      const cell = sheet.getCell(headerRow, idx + 1);
      cell.value = header;
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    });
    
    sheet.columns = [
      { width: 6 },
      { width: 15 },
      { width: 20 },
      { width: 20 },
      { width: 20 },
      { width: 25 },
      { width: 5 },
      { width: 20 },
      { width: 5 },
      { width: 25 },
      { width: 25 },
      { width: 5 },
      { width: 5 },
      { width: 8 },
      { width: 20 },
    ];
    
    rows.forEach((row, idx) => {
      const rowNum = headerRow + 1 + idx;
      const dataRow = sheet.getRow(rowNum);
      
      dataRow.values = [
        idx + 1,
        row.stepRef || '',
        row.function || '',
        row.requirement || '',
        row.failureMode || '',
        row.effect || '',
        row.severity,
        row.cause || '',
        row.occurrence,
        (row.preventionControls || []).join('\n'),
        (row.detectionControls || []).join('\n'),
        row.detection,
        row.ap,
        row.csrSymbol || (row.specialFlag ? 'SC' : ''),
        row.notes || '',
      ];
      
      const apColor = getAPColorARGB(row.ap);
      
      dataRow.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
        cell.alignment = { vertical: 'top', wrapText: true };
        if (row.ap) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: apColor } };
        }
      });
      
      dataRow.height = 40;
    });
    
    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.getCell('A1').value = 'PFMEA Summary';
    summarySheet.getCell('A1').font = { bold: true, size: 14 };
    
    summarySheet.getCell('A3').value = 'Total Failure Modes:';
    summarySheet.getCell('B3').value = rows.length;
    summarySheet.getCell('A4').value = 'High AP (H):';
    summarySheet.getCell('B4').value = rows.filter(r => r.ap === 'H').length;
    summarySheet.getCell('A5').value = 'Medium AP (M):';
    summarySheet.getCell('B5').value = rows.filter(r => r.ap === 'M').length;
    summarySheet.getCell('A6').value = 'Low AP (L):';
    summarySheet.getCell('B6').value = rows.filter(r => r.ap === 'L').length;
    summarySheet.getCell('A7').value = 'Special Characteristics:';
    summarySheet.getCell('B7').value = rows.filter(r => r.specialFlag || r.csrSymbol).length;
    
    if (options.includeSignatures !== false && signatures.length > 0) {
      const sigSheet = workbook.addWorksheet('Approvals');
      sigSheet.getCell('A1').value = 'Document Approvals';
      sigSheet.getCell('A1').font = { bold: true, size: 14 };
      
      sigSheet.getCell('A3').value = 'Role';
      sigSheet.getCell('B3').value = 'Signed Date';
      sigSheet.getCell('C3').value = 'Content Hash';
      
      signatures.forEach((sig, idx) => {
        const payload = sig.payloadJson as any;
        sigSheet.getCell(`A${4 + idx}`).value = (payload?.role || 'unknown').replace('_', ' ').toUpperCase();
        sigSheet.getCell(`B${4 + idx}`).value = formatDate(sig.createdAt);
        sigSheet.getCell(`C${4 + idx}`).value = (payload?.contentHash || '').substring(0, 16) + '...';
      });
    }
    
    const buffer = await workbook.xlsx.writeBuffer();
    
    return {
      buffer: Buffer.from(buffer),
      filename: `PFMEA_${partData?.partNumber || 'Unknown'}_Rev${document.rev}.xlsx`,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }
  
  private async exportControlPlanToPDF(documentId: string, options: ExportOptions): Promise<ExportResult> {
    const data = await this.getControlPlanData(documentId);
    const { document, part: partData, rows, signatures } = data;
    
    const doc = new PDFDocument({
      size: options.paperSize?.toUpperCase() || 'LETTER',
      layout: options.orientation || 'landscape',
      margins: { top: 50, bottom: 50, left: 30, right: 30 },
      info: {
        Title: `Control Plan - ${partData?.partNumber || 'Unknown'}`,
        Author: 'PFMEA Suite',
        Subject: 'Process Control Plan',
      },
    });
    
    const chunks: Buffer[] = [];
    const stream = new PassThrough();
    
    doc.pipe(stream);
    
    stream.on('data', (chunk) => chunks.push(chunk));
    
    doc.fontSize(16).font('Helvetica-Bold').text('CONTROL PLAN', { align: 'center' });
    doc.moveDown(0.5);
    
    const infoY = doc.y;
    doc.fontSize(9).font('Helvetica');
    
    doc.text(`Part Number: ${partData?.partNumber || '-'}`, 30, infoY);
    doc.text(`Part Name: ${partData?.partName || '-'}`, 30, infoY + 12);
    doc.text(`Customer: ${partData?.customer || '-'}`, 30, infoY + 24);
    
    doc.text(`Control Plan No: ${document.docNo || 'Not Assigned'}`, 300, infoY);
    doc.text(`Rev: ${document.rev}`, 300, infoY + 12);
    doc.text(`Type: ${document.type}`, 300, infoY + 24);
    
    doc.text(`Status: ${document.status}`, 550, infoY);
    doc.text(`Effective: ${formatDate(document.effectiveFrom)}`, 550, infoY + 12);
    
    doc.moveDown(3);
    
    const tableTop = doc.y;
    const colWidths = [35, 80, 40, 45, 45, 25, 50, 45, 45, 55, 55, 80];
    const headers = ['Char ID', 'Characteristic', 'Type', 'Target', 'Tolerance', 'SC', 'Gage', 'Sample', 'Freq', 'Method', 'Accept', 'Reaction'];
    
    doc.fontSize(6).font('Helvetica-Bold');
    doc.rect(30, tableTop - 3, 740, 15).fill('#E5E7EB');
    doc.fillColor('#1F2937');
    
    let xPos = 30;
    headers.forEach((header, i) => {
      doc.text(header, xPos + 1, tableTop, { width: colWidths[i] - 2 });
      xPos += colWidths[i];
    });
    
    doc.font('Helvetica').fontSize(5);
    let rowY = tableTop + 15;
    
    for (const row of rows) {
      if (rowY > doc.page.height - 60) {
        doc.addPage();
        rowY = 50;
        
        doc.fontSize(6).font('Helvetica-Bold');
        doc.rect(30, rowY - 3, 740, 15).fill('#E5E7EB');
        doc.fillColor('#1F2937');
        xPos = 30;
        headers.forEach((header, i) => {
          doc.text(header, xPos + 1, rowY, { width: colWidths[i] - 2 });
          xPos += colWidths[i];
        });
        rowY += 15;
        doc.font('Helvetica').fontSize(5);
      }
      
      if (row.specialFlag || row.csrSymbol) {
        doc.rect(30, rowY - 1, 740, 24).fill('#F3E8FF');
        doc.fillColor('#1F2937');
      }
      
      xPos = 30;
      const rowData = [
        row.charId || '-',
        row.characteristicName || '-',
        row.type || '-',
        row.target || '-',
        row.tolerance || '-',
        row.csrSymbol || (row.specialFlag ? 'SC' : '-'),
        row.gageDetails || '-',
        row.sampleSize || '-',
        row.frequency || '-',
        row.controlMethod || '-',
        row.acceptanceCriteria || '-',
        row.reactionPlan || '-',
      ];
      
      rowData.forEach((cell, i) => {
        doc.text(String(cell).substring(0, 60), xPos + 1, rowY, { width: colWidths[i] - 2, height: 22 });
        xPos += colWidths[i];
      });
      
      rowY += 26;
    }
    
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      doc.fontSize(7).fillColor('#6B7280');
      doc.text(
        `Page ${i + 1} of ${pages.count} | Generated: ${new Date().toLocaleString()}`,
        30,
        doc.page.height - 30,
        { align: 'center', width: doc.page.width - 60 }
      );
    }
    
    doc.end();
    
    return new Promise((resolve, reject) => {
      stream.on('end', () => {
        resolve({
          buffer: Buffer.concat(chunks),
          filename: `ControlPlan_${partData?.partNumber || 'Unknown'}_Rev${document.rev}.pdf`,
          mimeType: 'application/pdf',
        });
      });
      stream.on('error', reject);
    });
  }
  
  private async exportControlPlanToExcel(documentId: string, options: ExportOptions): Promise<ExportResult> {
    const data = await this.getControlPlanData(documentId);
    const { document, part: partData, rows, signatures } = data;
    
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'PFMEA Suite';
    workbook.created = new Date();
    
    const sheet = workbook.addWorksheet('Control Plan', {
      pageSetup: { paperSize: 9, orientation: 'landscape' },
    });
    
    sheet.mergeCells('A1:N1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'CONTROL PLAN';
    titleCell.font = { bold: true, size: 16 };
    titleCell.alignment = { horizontal: 'center' };
    
    sheet.getCell('A3').value = 'Part Number:';
    sheet.getCell('B3').value = partData?.partNumber || '-';
    sheet.getCell('A4').value = 'Part Name:';
    sheet.getCell('B4').value = partData?.partName || '-';
    sheet.getCell('A5').value = 'Customer:';
    sheet.getCell('B5').value = partData?.customer || '-';
    
    sheet.getCell('E3').value = 'Control Plan No:';
    sheet.getCell('F3').value = document.docNo || 'Not Assigned';
    sheet.getCell('E4').value = 'Revision:';
    sheet.getCell('F4').value = document.rev;
    sheet.getCell('E5').value = 'Type:';
    sheet.getCell('F5').value = document.type;
    sheet.getCell('E6').value = 'Status:';
    sheet.getCell('F6').value = document.status;
    sheet.getCell('E7').value = 'Effective Date:';
    sheet.getCell('F7').value = formatDate(document.effectiveFrom);
    
    const headerRow = 9;
    const headers = [
      'Char ID', 'Step Ref', 'Characteristic', 'Type', 'Target', 
      'Tolerance', 'Special Char', 'Gage', 'Sample Size', 'Frequency',
      'Control Method', 'Acceptance Criteria', 'Reaction Plan', 'Notes'
    ];
    
    headers.forEach((header, idx) => {
      const cell = sheet.getCell(headerRow, idx + 1);
      cell.value = header;
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    });
    
    sheet.columns = [
      { width: 10 },
      { width: 12 },
      { width: 25 },
      { width: 10 },
      { width: 12 },
      { width: 12 },
      { width: 8 },
      { width: 15 },
      { width: 10 },
      { width: 12 },
      { width: 20 },
      { width: 20 },
      { width: 25 },
      { width: 20 },
    ];
    
    rows.forEach((row, idx) => {
      const rowNum = headerRow + 1 + idx;
      const dataRow = sheet.getRow(rowNum);
      
      dataRow.values = [
        row.charId || '',
        row.stepRef || '',
        row.characteristicName || '',
        row.type || '',
        row.target || '',
        row.tolerance || '',
        row.csrSymbol || (row.specialFlag ? 'SC' : ''),
        row.gageDetails || '',
        row.sampleSize || '',
        row.frequency || '',
        row.controlMethod || '',
        row.acceptanceCriteria || '',
        row.reactionPlan || '',
        row.notes || '',
      ];
      
      dataRow.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
        cell.alignment = { vertical: 'top', wrapText: true };
        
        if (row.specialFlag || row.csrSymbol) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3E8FF' } };
        }
      });
      
      dataRow.height = 35;
    });
    
    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.getCell('A1').value = 'Control Plan Summary';
    summarySheet.getCell('A1').font = { bold: true, size: 14 };
    
    summarySheet.getCell('A3').value = 'Total Characteristics:';
    summarySheet.getCell('B3').value = rows.length;
    summarySheet.getCell('A4').value = 'Special Characteristics:';
    summarySheet.getCell('B4').value = rows.filter(r => r.specialFlag || r.csrSymbol).length;
    summarySheet.getCell('A5').value = 'Product Characteristics:';
    summarySheet.getCell('B5').value = rows.filter(r => r.type === 'product').length;
    summarySheet.getCell('A6').value = 'Process Characteristics:';
    summarySheet.getCell('B6').value = rows.filter(r => r.type === 'process').length;
    
    if (options.includeSignatures !== false && signatures.length > 0) {
      const sigSheet = workbook.addWorksheet('Approvals');
      sigSheet.getCell('A1').value = 'Document Approvals';
      sigSheet.getCell('A1').font = { bold: true, size: 14 };
      
      sigSheet.getCell('A3').value = 'Role';
      sigSheet.getCell('B3').value = 'Signed Date';
      sigSheet.getCell('C3').value = 'Content Hash';
      
      signatures.forEach((sig, idx) => {
        const payload = sig.payloadJson as any;
        sigSheet.getCell(`A${4 + idx}`).value = (payload?.role || 'unknown').replace('_', ' ').toUpperCase();
        sigSheet.getCell(`B${4 + idx}`).value = formatDate(sig.createdAt);
        sigSheet.getCell(`C${4 + idx}`).value = (payload?.contentHash || '').substring(0, 16) + '...';
      });
    }
    
    const buffer = await workbook.xlsx.writeBuffer();
    
    return {
      buffer: Buffer.from(buffer),
      filename: `ControlPlan_${partData?.partNumber || 'Unknown'}_Rev${document.rev}.xlsx`,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }
}

export const exportService = new ExportService();
