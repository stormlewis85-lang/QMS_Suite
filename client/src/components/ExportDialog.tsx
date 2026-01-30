import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Download, 
  FileText, 
  FileSpreadsheet, 
  Loader2,
  CheckCircle,
  Settings
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ExportDialogProps {
  documentType: 'pfmea' | 'control_plan';
  documentId: string;
  documentName: string;
  trigger?: React.ReactNode;
}

export function ExportDialog({ 
  documentType, 
  documentId, 
  documentName,
  trigger 
}: ExportDialogProps) {
  const { toast } = useToast();
  
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<'pdf' | 'xlsx'>('pdf');
  const [includeSignatures, setIncludeSignatures] = useState(true);
  const [paperSize, setPaperSize] = useState('letter');
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  
  const handleExport = async () => {
    setIsExporting(true);
    setExportSuccess(false);
    
    try {
      const endpoint = documentType === 'pfmea' 
        ? `/api/pfmeas/${documentId}/export`
        : `/api/control-plans/${documentId}/export`;
      
      const params = new URLSearchParams({
        format,
        includeSignatures: includeSignatures.toString(),
        paperSize,
      });
      
      const response = await fetch(`${endpoint}?${params}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Export failed');
      }
      
      const contentDisposition = response.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch ? filenameMatch[1] : `export.${format}`;
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      setExportSuccess(true);
      toast({
        title: "Export Complete",
        description: `${filename} has been downloaded.`,
      });
      
      setTimeout(() => {
        setOpen(false);
        setExportSuccess(false);
      }, 1500);
      
    } catch (error: any) {
      toast({
        title: "Export Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" data-testid="button-export">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Document
          </DialogTitle>
          <DialogDescription>
            Export {documentType === 'pfmea' ? 'PFMEA' : 'Control Plan'}: {documentName}
          </DialogDescription>
        </DialogHeader>
        
        {exportSuccess ? (
          <div className="py-8 text-center" data-testid="export-success">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <p className="text-lg font-medium">Export Complete!</p>
            <p className="text-muted-foreground">Your file is downloading...</p>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            <div className="space-y-3">
              <Label className="text-sm font-medium">Export Format</Label>
              <RadioGroup value={format} onValueChange={(v) => setFormat(v as 'pdf' | 'xlsx')}>
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="pdf" id="pdf" data-testid="radio-pdf" />
                  <Label htmlFor="pdf" className="flex items-center gap-2 cursor-pointer flex-1">
                    <FileText className="h-5 w-5 text-red-500" />
                    <div>
                      <p className="font-medium">PDF Document</p>
                      <p className="text-xs text-muted-foreground">Best for printing and sharing</p>
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="xlsx" id="xlsx" data-testid="radio-xlsx" />
                  <Label htmlFor="xlsx" className="flex items-center gap-2 cursor-pointer flex-1">
                    <FileSpreadsheet className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium">Excel Spreadsheet</p>
                      <p className="text-xs text-muted-foreground">Best for data analysis and editing</p>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>
            
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-1">
                <Settings className="h-4 w-4" />
                Options
              </Label>
              
              <div className="space-y-3 pl-1">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="signatures" 
                    checked={includeSignatures}
                    onCheckedChange={(checked) => setIncludeSignatures(checked as boolean)}
                    data-testid="checkbox-signatures"
                  />
                  <Label htmlFor="signatures" className="text-sm cursor-pointer">
                    Include approval signatures
                  </Label>
                </div>
                
                {format === 'pdf' && (
                  <div className="space-y-2">
                    <Label className="text-sm">Paper Size</Label>
                    <Select value={paperSize} onValueChange={setPaperSize}>
                      <SelectTrigger className="w-full" data-testid="select-paper-size">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="letter">Letter (8.5" x 11")</SelectItem>
                        <SelectItem value="legal">Legal (8.5" x 14")</SelectItem>
                        <SelectItem value="a4">A4 (210mm x 297mm)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>
            
            <Alert>
              <AlertDescription className="text-xs">
                The exported file will contain all {documentType === 'pfmea' ? 'failure modes' : 'characteristics'} 
                and their associated data. Large documents may take a moment to generate.
              </AlertDescription>
            </Alert>
          </div>
        )}
        
        {!exportSuccess && (
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isExporting} data-testid="button-cancel-export">
              Cancel
            </Button>
            <Button onClick={handleExport} disabled={isExporting} data-testid="button-confirm-export">
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export {format.toUpperCase()}
                </>
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default ExportDialog;
