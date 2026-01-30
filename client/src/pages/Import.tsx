import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import ImportWizard from '@/components/ImportWizard';
import { Upload, FileSpreadsheet, Download, FileText, ClipboardList } from 'lucide-react';

export default function Import() {
  const [wizardOpen, setWizardOpen] = useState(false);
  const [importType, setImportType] = useState<'pfmea' | 'control_plan'>('pfmea');
  
  const openWizard = (type: 'pfmea' | 'control_plan') => {
    setImportType(type);
    setWizardOpen(true);
  };
  
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="heading-import">
          <Upload className="h-8 w-8" />
          Import Data
        </h1>
        <p className="text-muted-foreground">Import PFMEA and Control Plan data from Excel files</p>
      </div>
      
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => openWizard('pfmea')} data-testid="card-import-pfmea">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Import PFMEA
            </CardTitle>
            <CardDescription>
              Import failure modes, effects, causes, and controls from Excel
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Supported columns: Process Step, Function, Failure Mode, Effect, Severity, 
              Cause, Occurrence, Prevention Controls, Detection Controls, Detection, etc.
            </p>
            <div className="flex gap-2">
              <Button data-testid="button-start-pfmea-import">
                <Upload className="h-4 w-4 mr-2" />
                Start Import
              </Button>
              <Button variant="outline" onClick={(e) => { e.stopPropagation(); window.open('/api/import/template/pfmea'); }} data-testid="button-download-pfmea-template">
                <Download className="h-4 w-4 mr-2" />
                Template
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => openWizard('control_plan')} data-testid="card-import-control-plan">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Import Control Plan
            </CardTitle>
            <CardDescription>
              Import characteristics, specifications, and control methods from Excel
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Supported columns: Characteristic Name, Type, Target, Tolerance, 
              Sample Size, Frequency, Control Method, Acceptance Criteria, etc.
            </p>
            <div className="flex gap-2">
              <Button data-testid="button-start-cp-import">
                <Upload className="h-4 w-4 mr-2" />
                Start Import
              </Button>
              <Button variant="outline" onClick={(e) => { e.stopPropagation(); window.open('/api/import/template/control_plan'); }} data-testid="button-download-cp-template">
                <Download className="h-4 w-4 mr-2" />
                Template
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Import Tips</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• Use the provided templates for best results</p>
          <p>• Severity, Occurrence, and Detection ratings must be numbers 1-10</p>
          <p>• Multiple controls can be separated by commas or semicolons</p>
          <p>• Special characteristics can be marked with SC, CC, S, or the symbols Ⓢ ◆ ⓒ</p>
          <p>• The first row should contain column headers</p>
          <p>• Empty rows are automatically skipped</p>
        </CardContent>
      </Card>
      
      <ImportWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        defaultType={importType}
      />
    </div>
  );
}
