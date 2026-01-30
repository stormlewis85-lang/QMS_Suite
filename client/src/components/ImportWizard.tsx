import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Upload, 
  FileSpreadsheet, 
  ChevronRight, 
  ChevronLeft,
  Check,
  AlertTriangle,
  Loader2,
  Download,
  ArrowRight,
  MapPin,
  Eye,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useDropzone } from 'react-dropzone';

interface ImportWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultType?: 'pfmea' | 'control_plan';
  partId?: string;
  pfmeaId?: string;
  controlPlanId?: string;
  onImportComplete?: (result: any) => void;
}

interface ColumnMapping {
  sourceColumn: string;
  targetField: string;
  transform?: 'none' | 'number' | 'array';
}

type WizardStep = 'upload' | 'configure' | 'mapping' | 'preview' | 'importing' | 'complete';

export function ImportWizard({
  open,
  onOpenChange,
  defaultType,
  partId,
  pfmeaId,
  controlPlanId,
  onImportComplete,
}: ImportWizardProps) {
  const { toast } = useToast();
  
  const [step, setStep] = useState<WizardStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [fileAnalysis, setFileAnalysis] = useState<any>(null);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [importType, setImportType] = useState<'pfmea' | 'control_plan'>(defaultType || 'pfmea');
  const [mapping, setMapping] = useState<ColumnMapping[]>([]);
  const [preview, setPreview] = useState<any>(null);
  const [skipInvalidRows, setSkipInvalidRows] = useState(true);
  const [createNewDocument, setCreateNewDocument] = useState(!pfmeaId && !controlPlanId);
  const [importResult, setImportResult] = useState<any>(null);
  
  const { data: parts } = useQuery({ queryKey: ['/api/parts'] });
  const [selectedPartId, setSelectedPartId] = useState(partId || '');
  
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      analyzeFile(acceptedFiles[0]);
    }
  }, []);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxFiles: 1,
  });
  
  const analyzeFile = async (uploadedFile: File) => {
    const formData = new FormData();
    formData.append('file', uploadedFile);
    
    try {
      const response = await fetch('/api/import/analyze', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) throw new Error('Analysis failed');
      
      const result = await response.json();
      setFileAnalysis(result);
      
      if (result.sheets.length > 0) {
        setSelectedSheet(result.sheets[0].name);
      }
      if (result.detectedType !== 'auto_detect') {
        setImportType(result.detectedType);
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to analyze file', variant: 'destructive' });
    }
  };
  
  const detectColumns = async () => {
    if (!file || !selectedSheet) return;
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('sheetName', selectedSheet);
    formData.append('type', importType);
    
    try {
      const response = await fetch('/api/import/detect-columns', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) throw new Error('Column detection failed');
      
      const result = await response.json();
      setMapping(result.suggestedMapping);
      setStep('mapping');
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to detect columns', variant: 'destructive' });
    }
  };
  
  const generatePreview = async () => {
    if (!file || !selectedSheet || mapping.length === 0) return;
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('sheetName', selectedSheet);
    formData.append('type', importType);
    formData.append('mapping', JSON.stringify(mapping));
    
    try {
      const response = await fetch('/api/import/preview', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) throw new Error('Preview failed');
      
      const result = await response.json();
      setPreview(result);
      setStep('preview');
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to generate preview', variant: 'destructive' });
    }
  };
  
  const executeImport = async () => {
    if (!file || !selectedSheet || mapping.length === 0) return;
    
    setStep('importing');
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('sheetName', selectedSheet);
    formData.append('type', importType);
    formData.append('mapping', JSON.stringify(mapping));
    formData.append('skipInvalidRows', String(skipInvalidRows));
    formData.append('createNewDocument', String(createNewDocument));
    
    if (createNewDocument) {
      formData.append('partId', selectedPartId);
    } else {
      if (importType === 'pfmea' && pfmeaId) {
        formData.append('pfmeaId', pfmeaId);
      } else if (importType === 'control_plan' && controlPlanId) {
        formData.append('controlPlanId', controlPlanId);
      }
    }
    
    try {
      const response = await fetch('/api/import/execute', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) throw new Error('Import failed');
      
      const result = await response.json();
      setImportResult(result);
      setStep('complete');
      
      if (result.success) {
        onImportComplete?.(result);
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Import failed', variant: 'destructive' });
      setStep('preview');
    }
  };
  
  const targetFields = importType === 'pfmea' 
    ? [
        { value: 'stepRef', label: 'Process Step' },
        { value: 'function', label: 'Function' },
        { value: 'requirement', label: 'Requirement' },
        { value: 'failureMode', label: 'Failure Mode *' },
        { value: 'effect', label: 'Effect' },
        { value: 'severity', label: 'Severity (S)' },
        { value: 'cause', label: 'Cause' },
        { value: 'occurrence', label: 'Occurrence (O)' },
        { value: 'preventionControls', label: 'Prevention Controls' },
        { value: 'detectionControls', label: 'Detection Controls' },
        { value: 'detection', label: 'Detection (D)' },
        { value: 'classification', label: 'Classification/SC' },
        { value: 'notes', label: 'Notes' },
      ]
    : [
        { value: 'charId', label: 'Characteristic ID' },
        { value: 'characteristicName', label: 'Characteristic Name *' },
        { value: 'type', label: 'Type (Product/Process)' },
        { value: 'target', label: 'Target' },
        { value: 'tolerance', label: 'Tolerance' },
        { value: 'specialFlag', label: 'Special Characteristic' },
        { value: 'measurementSystem', label: 'Measurement System' },
        { value: 'gageDetails', label: 'Gage Details' },
        { value: 'sampleSize', label: 'Sample Size' },
        { value: 'frequency', label: 'Frequency' },
        { value: 'controlMethod', label: 'Control Method' },
        { value: 'acceptanceCriteria', label: 'Acceptance Criteria' },
        { value: 'reactionPlan', label: 'Reaction Plan' },
      ];
  
  const updateMapping = (sourceColumn: string, targetField: string) => {
    setMapping(prev => {
      const existing = prev.find(m => m.sourceColumn === sourceColumn);
      if (existing) {
        if (!targetField) {
          return prev.filter(m => m.sourceColumn !== sourceColumn);
        }
        return prev.map(m => 
          m.sourceColumn === sourceColumn ? { ...m, targetField } : m
        );
      }
      if (targetField) {
        return [...prev, { sourceColumn, targetField, transform: 'none' as const }];
      }
      return prev;
    });
  };
  
  const resetWizard = () => {
    setStep('upload');
    setFile(null);
    setFileAnalysis(null);
    setSelectedSheet('');
    setMapping([]);
    setPreview(null);
    setImportResult(null);
  };
  
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetWizard(); onOpenChange(o); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import from Excel
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'Upload an Excel file to import data'}
            {step === 'configure' && 'Configure import settings'}
            {step === 'mapping' && 'Map columns to fields'}
            {step === 'preview' && 'Review data before importing'}
            {step === 'importing' && 'Importing data...'}
            {step === 'complete' && 'Import complete'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex items-center gap-2 px-2">
          {['upload', 'configure', 'mapping', 'preview', 'complete'].map((s, idx) => (
            <div key={s} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                step === s ? 'bg-primary text-primary-foreground' :
                ['upload', 'configure', 'mapping', 'preview', 'complete'].indexOf(step) > idx 
                  ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'
              }`}>
                {['upload', 'configure', 'mapping', 'preview', 'complete'].indexOf(step) > idx 
                  ? <Check className="h-4 w-4" /> : idx + 1}
              </div>
              {idx < 4 && <ChevronRight className="h-4 w-4 text-muted-foreground mx-1" />}
            </div>
          ))}
        </div>
        
        <ScrollArea className="flex-1 px-1">
          {step === 'upload' && (
            <div className="space-y-4 py-4">
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                  isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary'
                }`}
                data-testid="dropzone-upload"
              >
                <input {...getInputProps()} data-testid="input-file-upload" />
                <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                {isDragActive ? (
                  <p className="text-lg">Drop the file here...</p>
                ) : (
                  <>
                    <p className="text-lg mb-2">Drag & drop an Excel file here</p>
                    <p className="text-sm text-muted-foreground">or click to browse</p>
                  </>
                )}
              </div>
              
              {file && (
                <Alert>
                  <FileSpreadsheet className="h-4 w-4" />
                  <AlertTitle>File Selected</AlertTitle>
                  <AlertDescription>
                    {file.name} ({(file.size / 1024).toFixed(1)} KB)
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => window.open('/api/import/template/pfmea')} data-testid="button-download-pfmea-template">
                  <Download className="h-4 w-4 mr-2" />
                  PFMEA Template
                </Button>
                <Button variant="outline" onClick={() => window.open('/api/import/template/control_plan')} data-testid="button-download-cp-template">
                  <Download className="h-4 w-4 mr-2" />
                  Control Plan Template
                </Button>
              </div>
            </div>
          )}
          
          {step === 'configure' && fileAnalysis && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Import Type</Label>
                  <Select value={importType} onValueChange={(v) => setImportType(v as any)}>
                    <SelectTrigger data-testid="select-import-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pfmea">PFMEA</SelectItem>
                      <SelectItem value="control_plan">Control Plan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Sheet</Label>
                  <Select value={selectedSheet} onValueChange={setSelectedSheet}>
                    <SelectTrigger data-testid="select-sheet">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {fileAnalysis.sheets.map((sheet: any) => (
                        <SelectItem key={sheet.name} value={sheet.name}>
                          {sheet.name} ({sheet.rowCount} rows)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-3">
                <Label>Import Destination</Label>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="createNew" 
                    checked={createNewDocument}
                    onCheckedChange={(c) => setCreateNewDocument(c as boolean)}
                    data-testid="checkbox-create-new"
                  />
                  <Label htmlFor="createNew">Create new document</Label>
                </div>
                
                {createNewDocument && (
                  <div className="space-y-2 pl-6">
                    <Label>Select Part</Label>
                    <Select value={selectedPartId} onValueChange={setSelectedPartId}>
                      <SelectTrigger data-testid="select-part">
                        <SelectValue placeholder="Select a part..." />
                      </SelectTrigger>
                      <SelectContent>
                        {(parts as any[])?.map((p: any) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.partNumber} - {p.partName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                {!createNewDocument && (
                  <Alert>
                    <AlertDescription>
                      Rows will be added to the current {importType === 'pfmea' ? 'PFMEA' : 'Control Plan'} document.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="skipInvalid" 
                  checked={skipInvalidRows}
                  onCheckedChange={(c) => setSkipInvalidRows(c as boolean)}
                  data-testid="checkbox-skip-invalid"
                />
                <Label htmlFor="skipInvalid">Skip rows with validation errors</Label>
              </div>
            </div>
          )}
          
          {step === 'mapping' && fileAnalysis && (
            <div className="space-y-4 py-4">
              <Alert>
                <MapPin className="h-4 w-4" />
                <AlertTitle>Column Mapping</AlertTitle>
                <AlertDescription>
                  Map your Excel columns to the target fields. Fields marked with * are required.
                </AlertDescription>
              </Alert>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Excel Column</TableHead>
                    <TableHead>Maps To</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fileAnalysis.columns?.map((col: string) => {
                    const currentMapping = mapping.find(m => m.sourceColumn === col);
                    return (
                      <TableRow key={col}>
                        <TableCell className="font-medium">{col}</TableCell>
                        <TableCell>
                          <Select 
                            value={currentMapping?.targetField || ''} 
                            onValueChange={(v) => updateMapping(col, v)}
                          >
                            <SelectTrigger className="w-[200px]" data-testid={`select-mapping-${col}`}>
                              <SelectValue placeholder="Select field..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">-- Skip --</SelectItem>
                              {targetFields.map((f) => (
                                <SelectItem 
                                  key={f.value} 
                                  value={f.value}
                                  disabled={mapping.some(m => m.targetField === f.value && m.sourceColumn !== col)}
                                >
                                  {f.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          {currentMapping ? (
                            <Badge variant="outline" className="bg-green-50 dark:bg-green-900/20">
                              <Check className="h-3 w-3 mr-1" />
                              Mapped
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">
                              Skipped
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          
          {step === 'preview' && preview && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-4 gap-4">
                <div className="p-3 bg-muted rounded-lg text-center">
                  <p className="text-2xl font-bold" data-testid="text-total-rows">{preview.totalRows}</p>
                  <p className="text-xs text-muted-foreground">Total Rows</p>
                </div>
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                  <p className="text-2xl font-bold text-green-600" data-testid="text-valid-rows">{preview.validRows}</p>
                  <p className="text-xs text-muted-foreground">Valid</p>
                </div>
                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-center">
                  <p className="text-2xl font-bold text-red-600" data-testid="text-invalid-rows">{preview.invalidRows}</p>
                  <p className="text-xs text-muted-foreground">Invalid</p>
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
                  <p className="text-2xl font-bold text-blue-600">{mapping.length}</p>
                  <p className="text-xs text-muted-foreground">Mapped Columns</p>
                </div>
              </div>
              
              {!preview.canImport && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertTitle>Cannot Import</AlertTitle>
                  <AlertDescription>
                    No valid rows found. Please check your column mapping and data.
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Row</TableHead>
                      <TableHead className="w-16">Status</TableHead>
                      {mapping.slice(0, 5).map((m) => (
                        <TableHead key={m.targetField}>
                          {targetFields.find(f => f.value === m.targetField)?.label || m.targetField}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.preview.map((row: any) => (
                      <TableRow key={row.rowNumber} className={row.errors.length > 0 ? 'bg-red-50 dark:bg-red-900/10' : ''}>
                        <TableCell>{row.rowNumber}</TableCell>
                        <TableCell>
                          {row.errors.length > 0 ? (
                            <XCircle className="h-4 w-4 text-red-500" />
                          ) : row.warnings.length > 0 ? (
                            <AlertTriangle className="h-4 w-4 text-yellow-500" />
                          ) : (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          )}
                        </TableCell>
                        {mapping.slice(0, 5).map((m) => (
                          <TableCell key={m.targetField} className="max-w-[150px] truncate">
                            {Array.isArray(row.data[m.targetField]) 
                              ? row.data[m.targetField].join(', ')
                              : String(row.data[m.targetField] ?? '')}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {preview.preview.some((r: any) => r.errors.length > 0 || r.warnings.length > 0) && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Issues Found:</p>
                  {preview.preview.flatMap((r: any) => [...r.errors, ...r.warnings]).slice(0, 5).map((issue: any, idx: number) => (
                    <div key={idx} className={`text-sm p-2 rounded ${issue.severity === 'error' ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300' : 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300'}`}>
                      Row {issue.row}: {issue.error}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {step === 'importing' && (
            <div className="py-12 text-center">
              <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
              <p className="text-lg font-medium">Importing data...</p>
              <p className="text-muted-foreground">Please wait while we process your file.</p>
            </div>
          )}
          
          {step === 'complete' && importResult && (
            <div className="py-8 text-center space-y-4">
              {importResult.success ? (
                <>
                  <CheckCircle className="h-16 w-16 mx-auto text-green-500" />
                  <p className="text-xl font-medium">Import Complete!</p>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-16 w-16 mx-auto text-yellow-500" />
                  <p className="text-xl font-medium">Import Completed with Issues</p>
                </>
              )}
              
              <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-2xl font-bold text-green-600" data-testid="text-imported-count">{importResult.importedCount}</p>
                  <p className="text-xs text-muted-foreground">Imported</p>
                </div>
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <p className="text-2xl font-bold text-yellow-600" data-testid="text-skipped-count">{importResult.skippedCount}</p>
                  <p className="text-xs text-muted-foreground">Skipped</p>
                </div>
                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <p className="text-2xl font-bold text-red-600" data-testid="text-error-count">{importResult.errors.length}</p>
                  <p className="text-xs text-muted-foreground">Errors</p>
                </div>
              </div>
              
              {importResult.errors.length > 0 && (
                <div className="text-left max-w-md mx-auto">
                  <p className="text-sm font-medium mb-2">Errors:</p>
                  <ScrollArea className="h-32 border rounded p-2">
                    {importResult.errors.map((err: any, idx: number) => (
                      <div key={idx} className="text-sm text-red-600 dark:text-red-400 py-1">
                        Row {err.row}: {err.error}
                      </div>
                    ))}
                  </ScrollArea>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
        
        <DialogFooter className="border-t pt-4">
          {step === 'upload' && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel">Cancel</Button>
              <Button onClick={() => setStep('configure')} disabled={!file || !fileAnalysis} data-testid="button-next-upload">
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </>
          )}
          
          {step === 'configure' && (
            <>
              <Button variant="outline" onClick={() => setStep('upload')} data-testid="button-back-configure">
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <Button onClick={detectColumns} disabled={!selectedSheet || (createNewDocument && !selectedPartId)} data-testid="button-next-configure">
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </>
          )}
          
          {step === 'mapping' && (
            <>
              <Button variant="outline" onClick={() => setStep('configure')} data-testid="button-back-mapping">
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <Button onClick={generatePreview} disabled={mapping.length === 0} data-testid="button-preview">
                Preview
                <Eye className="h-4 w-4 ml-1" />
              </Button>
            </>
          )}
          
          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={() => setStep('mapping')} data-testid="button-back-preview">
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <Button onClick={executeImport} disabled={!preview?.canImport} data-testid="button-import">
                Import {preview?.validRows || 0} Rows
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </>
          )}
          
          {step === 'complete' && (
            <Button onClick={() => { resetWizard(); onOpenChange(false); }} data-testid="button-done">
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ImportWizard;
