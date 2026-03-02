import { Router } from "express";
import ExcelJS from "exceljs";
import { importService } from "../services/import-service";
import { upload } from "./_config";
import { getErrorMessage } from "./_helpers";

const router = Router();

// Upload and analyze file
router.post('/analyze', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const result = await importService.parseExcelFile(req.file.buffer, req.file.originalname);

    res.json({
      filename: req.file.originalname,
      size: req.file.size,
      ...result,
    });
  } catch (error: unknown) {
    console.error('File analysis failed:', error);
    res.status(400).json({ error: getErrorMessage(error) });
  }
});

// Detect columns and suggest mapping
router.post('/detect-columns', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const { sheetName, type } = req.body;

  if (!sheetName || !type) {
    return res.status(400).json({ error: 'sheetName and type are required' });
  }

  try {
    const result = await importService.detectColumns(
      req.file.buffer,
      sheetName,
      type as any
    );

    res.json(result);
  } catch (error: unknown) {
    console.error('Column detection failed:', error);
    res.status(400).json({ error: getErrorMessage(error) });
  }
});

// Generate preview
router.post('/preview', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const { sheetName, type, mapping } = req.body;

  if (!sheetName || !type || !mapping) {
    return res.status(400).json({ error: 'sheetName, type, and mapping are required' });
  }

  try {
    const parsedMapping = typeof mapping === 'string' ? JSON.parse(mapping) : mapping;

    const preview = await importService.generatePreview(
      req.file.buffer,
      sheetName,
      type as any,
      parsedMapping,
      20 // Preview 20 rows
    );

    preview.filename = req.file.originalname;

    res.json(preview);
  } catch (error: unknown) {
    console.error('Preview generation failed:', error);
    res.status(400).json({ error: getErrorMessage(error) });
  }
});

// Execute import
router.post('/execute', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const {
    sheetName,
    type,
    mapping,
    partId,
    pfmeaId,
    controlPlanId,
    skipInvalidRows,
    createNewDocument,
  } = req.body;

  if (!sheetName || !type || !mapping) {
    return res.status(400).json({ error: 'sheetName, type, and mapping are required' });
  }

  try {
    const parsedMapping = typeof mapping === 'string' ? JSON.parse(mapping) : mapping;

    const options = {
      type: type as any,
      partId,
      pfmeaId,
      controlPlanId,
      mapping: parsedMapping,
      skipInvalidRows: skipInvalidRows === 'true' || skipInvalidRows === true,
      createNewDocument: createNewDocument === 'true' || createNewDocument === true,
    };

    let result;

    if (type === 'pfmea') {
      result = await importService.importPFMEA(req.file.buffer, sheetName, options);
    } else if (type === 'control_plan') {
      result = await importService.importControlPlan(req.file.buffer, sheetName, options);
    } else {
      return res.status(400).json({ error: 'Unsupported import type' });
    }

    res.json(result);
  } catch (error: unknown) {
    console.error('Import failed:', error);
    res.status(500).json({ error: getErrorMessage(error) });
  }
});

// Download import template
router.get('/template/:type', async (req, res) => {
  const { type } = req.params;

  const templates: Record<string, { filename: string; headers: string[] }> = {
    pfmea: {
      filename: 'PFMEA_Import_Template.xlsx',
      headers: [
        'Process Step', 'Function', 'Requirement', 'Failure Mode',
        'Effect', 'Severity', 'Cause', 'Occurrence',
        'Prevention Controls', 'Detection Controls', 'Detection',
        'Classification', 'Notes'
      ],
    },
    control_plan: {
      filename: 'Control_Plan_Import_Template.xlsx',
      headers: [
        'Char #', 'Characteristic Name', 'Type', 'Target', 'Tolerance',
        'Special', 'Measurement System', 'Gage', 'Sample Size',
        'Frequency', 'Control Method', 'Acceptance Criteria', 'Reaction Plan'
      ],
    },
  };

  const template = templates[type];
  if (!template) {
    return res.status(400).json({ error: 'Invalid template type' });
  }

  // Generate simple template
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(type === 'pfmea' ? 'PFMEA' : 'Control Plan');

  // Add headers
  sheet.addRow(template.headers);

  // Style header row
  const headerRow = sheet.getRow(1);
  headerRow.eachCell((cell: any) => {
    cell.font = { bold: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE5E7EB' },
    };
  });

  // Auto-fit columns
  sheet.columns.forEach((column: any) => {
    column.width = 18;
  });

  // Add example row
  if (type === 'pfmea') {
    sheet.addRow([
      'Molding', 'Form part to spec', 'Meet CTQ dimensions', 'Short shot',
      'Part does not fit', 8, 'Low pack pressure', 4,
      'Process monitoring', 'First piece inspection', 6,
      '', 'Example row - delete before import'
    ]);
  } else {
    sheet.addRow([
      'C-001', 'Critical Dimension A', 'Product', '3.50 mm', '±0.20 mm',
      'SC', 'CMM', 'Zeiss Contura', '5',
      '1/shift', 'X̄-R Chart', 'Cpk ≥ 1.33', 'Contain, adjust, verify'
    ]);
  }

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${template.filename}"`);

  await workbook.xlsx.write(res);
});

export { router as importRouter };
