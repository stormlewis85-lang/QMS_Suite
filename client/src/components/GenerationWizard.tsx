import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  Loader2,
  CheckCircle,
  AlertTriangle,
  GitBranch,
  FileText,
  ClipboardList,
  GripVertical,
  ArrowDown,
  Eye,
  ExternalLink
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Process {
  id: string;
  name: string;
  rev: string;
  status: string;
  stepsCount?: number;
}

interface Part {
  id: string;
  partNumber: string;
  partName: string;
  customer: string;
  program: string;
}

interface GenerationWizardProps {
  part: Part;
  availableProcesses: Process[];
  open: boolean;
  onClose: () => void;
  onComplete: (result: any) => void;
}

interface GenerationResult {
  pfmea: {
    pfmea: { id: string; rev: string };
    summary: { totalRows: number; highAP: number; mediumAP: number; lowAP: number };
  };
  controlPlan: {
    controlPlan: { id: string; rev: string };
    summary: { totalRows: number; specialCharacteristics: number; linkedToPfmea: number };
  };
  message: string;
}

export function GenerationWizard({ part, availableProcesses, open, onClose, onComplete }: GenerationWizardProps) {
  const { toast } = useToast();
  
  const [step, setStep] = useState(1);
  const [selectedProcessIds, setSelectedProcessIds] = useState<string[]>([]);
  const [processOrder, setProcessOrder] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationResult, setGenerationResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pfdPreview, setPfdPreview] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  
  useEffect(() => {
    if (open) {
      setStep(1);
      setSelectedProcessIds([]);
      setProcessOrder([]);
      setGenerationResult(null);
      setError(null);
      setPfdPreview(null);
    }
  }, [open]);
  
  useEffect(() => {
    setProcessOrder(prev => {
      const newOrder = selectedProcessIds.filter(id => !prev.includes(id));
      const keptOrder = prev.filter(id => selectedProcessIds.includes(id));
      return [...keptOrder, ...newOrder];
    });
  }, [selectedProcessIds]);
  
  useEffect(() => {
    if (step === 2 && processOrder.length > 0) {
      loadPfdPreview();
    }
  }, [step, processOrder]);
  
  const selectedProcesses = useMemo(() => {
    return processOrder
      .map(id => availableProcesses.find(p => p.id === id))
      .filter(Boolean) as Process[];
  }, [processOrder, availableProcesses]);
  
  const loadPfdPreview = async () => {
    setIsLoadingPreview(true);
    try {
      const response = await fetch('/api/pfd/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ processIds: processOrder }),
      });
      if (response.ok) {
        const data = await response.json();
        setPfdPreview(data.mermaid);
      }
    } catch (err) {
      console.error('Failed to load PFD preview:', err);
    } finally {
      setIsLoadingPreview(false);
    }
  };
  
  const handleToggleProcess = (processId: string) => {
    setSelectedProcessIds(prev => {
      if (prev.includes(processId)) {
        return prev.filter(id => id !== processId);
      } else {
        return [...prev, processId];
      }
    });
  };
  
  const handleMoveProcess = (processId: string, direction: 'up' | 'down') => {
    setProcessOrder(prev => {
      const index = prev.indexOf(processId);
      if (index === -1) return prev;
      
      const newOrder = [...prev];
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      
      if (newIndex < 0 || newIndex >= newOrder.length) return prev;
      
      [newOrder[index], newOrder[newIndex]] = [newOrder[newIndex], newOrder[index]];
      return newOrder;
    });
  };
  
  const handleGenerate = async () => {
    setIsGenerating(true);
    setGenerationProgress(0);
    setError(null);
    
    try {
      const progressInterval = setInterval(() => {
        setGenerationProgress(prev => Math.min(prev + 10, 90));
      }, 500);
      
      const response = await fetch(`/api/parts/${part.id}/generate-documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          processIds: processOrder,
          controlPlanType: 'Production',
        }),
      });
      
      clearInterval(progressInterval);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Generation failed');
      }
      
      const result = await response.json();
      setGenerationProgress(100);
      setGenerationResult(result);
      setStep(4);
      onComplete(result);
      
      toast({
        title: "Documents Generated",
        description: `Created PFMEA with ${result.pfmea.summary.totalRows} rows and Control Plan with ${result.controlPlan.summary.totalRows} characteristics.`,
      });
      
    } catch (err: any) {
      setError(err.message);
      toast({
        title: "Generation Failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };
  
  const canProceed = () => {
    switch (step) {
      case 1: return selectedProcessIds.length > 0;
      case 2: return processOrder.length > 0;
      case 3: return true;
      default: return false;
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Generate Documents for {part.partNumber}
          </DialogTitle>
          <DialogDescription>{part.partName}</DialogDescription>
        </DialogHeader>
        
        <div className="flex items-center justify-center gap-2 py-4">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                ${step === s ? 'bg-primary text-primary-foreground' : 
                  step > s ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'}
              `}>
                {step > s ? <CheckCircle className="h-4 w-4" /> : s}
              </div>
              {s < 4 && (
                <div className={`w-12 h-0.5 ${step > s ? 'bg-green-500' : 'bg-muted'}`} />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-center gap-16 text-xs text-muted-foreground mb-4">
          <span>Select</span>
          <span>Order</span>
          <span>Confirm</span>
          <span>Complete</span>
        </div>
        
        <Separator />
        
        <ScrollArea className="flex-1 pr-4">
          {step === 1 && (
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Select Processes to Include</h3>
                <Badge variant="outline">{selectedProcessIds.length} selected</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Choose the manufacturing processes that will be included in the PFD, PFMEA, and Control Plan.
              </p>
              
              <div className="space-y-2 mt-4">
                {availableProcesses.filter(p => p.status === 'effective').map((process) => (
                  <div 
                    key={process.id}
                    data-testid={`process-item-${process.id}`}
                    className={`
                      flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors
                      ${selectedProcessIds.includes(process.id) ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}
                    `}
                    onClick={() => handleToggleProcess(process.id)}
                  >
                    <Checkbox
                      checked={selectedProcessIds.includes(process.id)}
                      onCheckedChange={() => handleToggleProcess(process.id)}
                      data-testid={`checkbox-process-${process.id}`}
                    />
                    <div className="flex-1">
                      <div className="font-medium">{process.name}</div>
                      <div className="text-sm text-muted-foreground">
                        Rev {process.rev} • {process.stepsCount || '?'} steps
                      </div>
                    </div>
                    <Badge variant="secondary">{process.status}</Badge>
                  </div>
                ))}
              </div>
              
              {availableProcesses.filter(p => p.status === 'effective').length === 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>No Processes Available</AlertTitle>
                  <AlertDescription>
                    There are no effective processes in the library. Please create and approve processes first.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
          
          {step === 2 && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold">Process Sequence</h3>
                  <p className="text-sm text-muted-foreground">
                    Use buttons to reorder processes in manufacturing sequence.
                  </p>
                  
                  <div className="space-y-2">
                    {selectedProcesses.map((process, index) => (
                      <div 
                        key={process.id}
                        data-testid={`ordered-process-${process.id}`}
                        className="flex items-center gap-2 p-3 border rounded-lg bg-background"
                      >
                        <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                        <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-sm">{process.name}</div>
                          <div className="text-xs text-muted-foreground">Rev {process.rev}</div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6"
                            disabled={index === 0}
                            onClick={() => handleMoveProcess(process.id, 'up')}
                            data-testid={`move-up-${process.id}`}
                          >
                            <ChevronLeft className="h-3 w-3 rotate-90" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6"
                            disabled={index === selectedProcesses.length - 1}
                            onClick={() => handleMoveProcess(process.id, 'down')}
                            data-testid={`move-down-${process.id}`}
                          >
                            <ChevronRight className="h-3 w-3 rotate-90" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      PFD Preview
                    </h3>
                    <Button variant="ghost" size="sm" onClick={loadPfdPreview} data-testid="button-refresh-preview">
                      Refresh
                    </Button>
                  </div>
                  
                  <Card className="bg-muted/30">
                    <CardContent className="p-4">
                      {isLoadingPreview ? (
                        <div className="flex items-center justify-center h-48">
                          <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                      ) : pfdPreview ? (
                        <div className="space-y-2">
                          <div className="flex flex-col items-center gap-2">
                            <div className="px-3 py-1 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-full text-xs">
                              Start
                            </div>
                            <ArrowDown className="h-4 w-4 text-muted-foreground" />
                            {selectedProcesses.map((process, idx) => (
                              <div key={process.id} className="flex flex-col items-center gap-2">
                                <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded text-sm text-center min-w-[150px]">
                                  <div className="font-medium">{process.name}</div>
                                  <div className="text-xs text-muted-foreground">Step {(idx + 1) * 10}</div>
                                </div>
                                <ArrowDown className="h-4 w-4 text-muted-foreground" />
                              </div>
                            ))}
                            <div className="px-3 py-1 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-full text-xs">
                              End
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-48 text-muted-foreground">
                          <GitBranch className="h-8 w-8 opacity-20" />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  
                  <p className="text-xs text-muted-foreground">
                    Full PFD diagram will be generated with the documents.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {step === 3 && (
            <div className="space-y-6 py-4">
              <h3 className="font-semibold">Review & Confirm Generation</h3>
              
              <Alert>
                <Sparkles className="h-4 w-4" />
                <AlertTitle>Ready to Generate</AlertTitle>
                <AlertDescription>
                  The following documents will be created for {part.partNumber}:
                </AlertDescription>
              </Alert>
              
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-600" />
                      PFMEA
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-1">
                    <p>Basis: AIAG-VDA 2019</p>
                    <p>Processes: {selectedProcesses.length}</p>
                    <p>Status: Draft</p>
                    <p>AP calculated automatically</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <ClipboardList className="h-4 w-4 text-green-600" />
                      Control Plan
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-1">
                    <p>Type: Production</p>
                    <p>Linked to PFMEA</p>
                    <p>Status: Draft</p>
                    <p>CSR symbols preserved</p>
                  </CardContent>
                </Card>
              </div>
              
              <Card className="bg-muted/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Process Flow Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {selectedProcesses.map((process, idx) => (
                      <Badge key={process.id} variant="outline">
                        {idx + 1}. {process.name}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              {isGenerating && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Generating documents...</span>
                    <span>{generationProgress}%</span>
                  </div>
                  <Progress value={generationProgress} />
                </div>
              )}
              
              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Generation Failed</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>
          )}
          
          {step === 4 && generationResult && (
            <div className="space-y-6 py-4">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold">Documents Generated Successfully!</h3>
                <p className="text-muted-foreground mt-1">{generationResult.message}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <Card className="border-blue-200 dark:border-blue-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-600" />
                      PFMEA Created
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>Total Rows:</div>
                      <div className="font-medium">{generationResult.pfmea.summary.totalRows}</div>
                      <div>High AP:</div>
                      <div className="font-medium text-red-600">{generationResult.pfmea.summary.highAP}</div>
                      <div>Medium AP:</div>
                      <div className="font-medium text-yellow-600">{generationResult.pfmea.summary.mediumAP}</div>
                      <div>Low AP:</div>
                      <div className="font-medium text-green-600">{generationResult.pfmea.summary.lowAP}</div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full mt-2"
                      onClick={() => window.open(`/pfmea/${generationResult.pfmea.pfmea.id}`, '_blank')}
                      data-testid="button-view-pfmea"
                    >
                      View PFMEA <ExternalLink className="h-3 w-3 ml-1" />
                    </Button>
                  </CardContent>
                </Card>
                
                <Card className="border-green-200 dark:border-green-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <ClipboardList className="h-4 w-4 text-green-600" />
                      Control Plan Created
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>Total Chars:</div>
                      <div className="font-medium">{generationResult.controlPlan.summary.totalRows}</div>
                      <div>Special Chars:</div>
                      <div className="font-medium text-purple-600">{generationResult.controlPlan.summary.specialCharacteristics}</div>
                      <div>Linked to PFMEA:</div>
                      <div className="font-medium">{generationResult.controlPlan.summary.linkedToPfmea}</div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full mt-2"
                      onClick={() => window.open(`/control-plans/${generationResult.controlPlan.controlPlan.id}`, '_blank')}
                      data-testid="button-view-control-plan"
                    >
                      View Control Plan <ExternalLink className="h-3 w-3 ml-1" />
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </ScrollArea>
        
        <Separator />
        
        <DialogFooter className="flex justify-between sm:justify-between">
          <div>
            {step > 1 && step < 4 && (
              <Button variant="outline" onClick={() => setStep(step - 1)} disabled={isGenerating} data-testid="button-back">
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {step < 4 && (
              <Button variant="outline" onClick={onClose} disabled={isGenerating} data-testid="button-cancel">
                Cancel
              </Button>
            )}
            {step < 3 && (
              <Button onClick={() => setStep(step + 1)} disabled={!canProceed()} data-testid="button-next">
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
            {step === 3 && (
              <Button onClick={handleGenerate} disabled={isGenerating} data-testid="button-generate">
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Documents
                  </>
                )}
              </Button>
            )}
            {step === 4 && (
              <Button onClick={onClose} data-testid="button-done">
                Done
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default GenerationWizard;
