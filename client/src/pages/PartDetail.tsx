import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  RefreshCw,
  Package,
  FileText,
  ClipboardList,
  Wand2,
  GitBranch,
  Settings,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ChevronRight,
  GripVertical,
  Trash2,
  Plus,
  Eye,
  Download,
  Play,
} from "lucide-react";
import type { Part, ProcessDef, PFMEA, ControlPlan, PFD } from "@shared/schema";

// Types
interface ProcessSelection {
  processDefId: string;
  rev: string;
  sequence: number;
}

interface GenerationResult {
  pfd?: {
    id: string;
    rev: string;
    mermaid: string;
  };
  pfmea?: {
    id: string;
    rev: string;
    rowCount: number;
  };
  controlPlan?: {
    id: string;
    rev: string;
    rowCount: number;
  };
}

// Wizard steps
const WIZARD_STEPS = [
  { id: "processes", label: "Select Processes", icon: Settings },
  { id: "preview", label: "Preview PFD", icon: GitBranch },
  { id: "options", label: "Generation Options", icon: Wand2 },
  { id: "generate", label: "Generate", icon: Play },
];

function getStatusBadge(status: string) {
  switch (status) {
    case "draft":
      return (
        <Badge variant="outline" className="bg-gray-50">
          <Clock className="h-3 w-3 mr-1" />
          Draft
        </Badge>
      );
    case "effective":
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Effective
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

// Process Selection Step
function ProcessSelectionStep({
  processes,
  selectedProcesses,
  onSelectionChange,
}: {
  processes: ProcessDef[];
  selectedProcesses: ProcessSelection[];
  onSelectionChange: (selections: ProcessSelection[]) => void;
}) {
  const effectiveProcesses = processes.filter((p) => p.status === "effective");

  const toggleProcess = (process: ProcessDef) => {
    const existing = selectedProcesses.find((s) => s.processDefId === process.id);
    if (existing) {
      onSelectionChange(selectedProcesses.filter((s) => s.processDefId !== process.id));
    } else {
      const newSelection: ProcessSelection = {
        processDefId: process.id,
        rev: process.rev,
        sequence: selectedProcesses.length + 1,
      };
      onSelectionChange([...selectedProcesses, newSelection]);
    }
  };

  const moveProcess = (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === selectedProcesses.length - 1)
    ) {
      return;
    }

    const newSelections = [...selectedProcesses];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    [newSelections[index], newSelections[targetIndex]] = [
      newSelections[targetIndex],
      newSelections[index],
    ];

    // Update sequence numbers
    newSelections.forEach((s, i) => {
      s.sequence = i + 1;
    });

    onSelectionChange(newSelections);
  };

  const removeProcess = (processDefId: string) => {
    const newSelections = selectedProcesses
      .filter((s) => s.processDefId !== processDefId)
      .map((s, i) => ({ ...s, sequence: i + 1 }));
    onSelectionChange(newSelections);
  };

  return (
    <div className="grid grid-cols-2 gap-6">
      {/* Available Processes */}
      <div className="space-y-4">
        <h3 className="font-semibold">Available Processes</h3>
        <p className="text-sm text-muted-foreground">
          Select processes to include in the part's process flow
        </p>
        <ScrollArea className="h-[400px] border rounded-lg p-4">
          <div className="space-y-2">
            {effectiveProcesses.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No effective processes available
              </p>
            ) : (
              effectiveProcesses.map((process) => {
                const isSelected = selectedProcesses.some(
                  (s) => s.processDefId === process.id
                );
                return (
                  <div
                    key={process.id}
                    className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-primary/10 border-primary"
                        : "hover:bg-muted/50"
                    }`}
                    onClick={() => toggleProcess(process)}
                  >
                    <Checkbox checked={isSelected} />
                    <div className="flex-1">
                      <p className="font-medium">{process.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Rev {process.rev} • {process.steps?.length || 0} steps
                      </p>
                    </div>
                    {getStatusBadge(process.status)}
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Selected Process Order */}
      <div className="space-y-4">
        <h3 className="font-semibold">Process Flow Order</h3>
        <p className="text-sm text-muted-foreground">
          Drag or use arrows to reorder the process sequence
        </p>
        <ScrollArea className="h-[400px] border rounded-lg p-4">
          {selectedProcesses.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Settings className="h-8 w-8 mb-2" />
              <p>No processes selected</p>
              <p className="text-sm">Select processes from the left panel</p>
            </div>
          ) : (
            <div className="space-y-2">
              {selectedProcesses.map((selection, index) => {
                const process = processes.find(
                  (p) => p.id === selection.processDefId
                );
                if (!process) return null;

                return (
                  <div
                    key={selection.processDefId}
                    className="flex items-center gap-2 p-3 border rounded-lg bg-muted/30"
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{process.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Rev {selection.rev}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => moveProcess(index, "up")}
                        disabled={index === 0}
                      >
                        ↑
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => moveProcess(index, "down")}
                        disabled={index === selectedProcesses.length - 1}
                      >
                        ↓
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700"
                        onClick={() => removeProcess(selection.processDefId)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}

// PFD Preview Step
function PFDPreviewStep({
  mermaidCode,
  isLoading,
}: {
  mermaidCode: string | null;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!mermaidCode) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
        <GitBranch className="h-12 w-12 mb-4" />
        <p>No process flow to preview</p>
        <p className="text-sm">Select processes in the previous step</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Process Flow Diagram Preview</h3>
        <Badge variant="outline">Mermaid Flowchart</Badge>
      </div>

      <div className="border rounded-lg p-6 bg-muted/30 min-h-[300px]">
        {/* In a real implementation, this would render the Mermaid diagram */}
        <div className="flex flex-col items-center justify-center">
          <GitBranch className="h-16 w-16 text-primary mb-4" />
          <p className="text-lg font-medium mb-2">PFD Will Be Generated Here</p>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            The process flow diagram will be rendered as an interactive Mermaid
            flowchart showing the sequence of manufacturing steps.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Mermaid Source Code</Label>
        <Textarea
          value={mermaidCode}
          readOnly
          className="font-mono text-sm h-[150px]"
        />
      </div>
    </div>
  );
}

// Generation Options Step
function GenerationOptionsStep({
  options,
  onOptionsChange,
}: {
  options: {
    generatePFD: boolean;
    generatePFMEA: boolean;
    generateControlPlan: boolean;
    pfmeaBasis: string;
    controlPlanType: string;
    rev: string;
  };
  onOptionsChange: (options: any) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="font-semibold">Documents to Generate</h3>
        <div className="grid grid-cols-3 gap-4">
          <Card
            className={`cursor-pointer transition-colors ${
              options.generatePFD ? "border-primary bg-primary/5" : ""
            }`}
            onClick={() =>
              onOptionsChange({ ...options, generatePFD: !options.generatePFD })
            }
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <GitBranch className="h-8 w-8 text-primary" />
                <Checkbox checked={options.generatePFD} />
              </div>
            </CardHeader>
            <CardContent>
              <CardTitle className="text-lg">PFD</CardTitle>
              <CardDescription>Process Flow Diagram</CardDescription>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-colors ${
              options.generatePFMEA ? "border-primary bg-primary/5" : ""
            }`}
            onClick={() =>
              onOptionsChange({
                ...options,
                generatePFMEA: !options.generatePFMEA,
              })
            }
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <FileText className="h-8 w-8 text-primary" />
                <Checkbox checked={options.generatePFMEA} />
              </div>
            </CardHeader>
            <CardContent>
              <CardTitle className="text-lg">PFMEA</CardTitle>
              <CardDescription>Failure Mode Analysis</CardDescription>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-colors ${
              options.generateControlPlan ? "border-primary bg-primary/5" : ""
            }`}
            onClick={() =>
              onOptionsChange({
                ...options,
                generateControlPlan: !options.generateControlPlan,
              })
            }
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <ClipboardList className="h-8 w-8 text-primary" />
                <Checkbox checked={options.generateControlPlan} />
              </div>
            </CardHeader>
            <CardContent>
              <CardTitle className="text-lg">Control Plan</CardTitle>
              <CardDescription>Process Controls</CardDescription>
            </CardContent>
          </Card>
        </div>
      </div>

      <Separator />

      <div className="grid grid-cols-3 gap-6">
        <div className="space-y-2">
          <Label>Document Revision</Label>
          <Input
            value={options.rev}
            onChange={(e) => onOptionsChange({ ...options, rev: e.target.value })}
            placeholder="1.0.0"
          />
          <p className="text-xs text-muted-foreground">
            Applied to all generated documents
          </p>
        </div>

        <div className="space-y-2">
          <Label>PFMEA Basis</Label>
          <Select
            value={options.pfmeaBasis}
            onValueChange={(v) => onOptionsChange({ ...options, pfmeaBasis: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AIAG-VDA 2019">AIAG-VDA 2019</SelectItem>
              <SelectItem value="AIAG 4th Edition">AIAG 4th Edition</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Control Plan Type</Label>
          <Select
            value={options.controlPlanType}
            onValueChange={(v) =>
              onOptionsChange({ ...options, controlPlanType: v })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Prototype">Prototype</SelectItem>
              <SelectItem value="Pre-Launch">Pre-Launch</SelectItem>
              <SelectItem value="Production">Production</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="font-medium text-blue-900">Generation Info</p>
              <p className="text-sm text-blue-700">
                Documents will be generated from process templates. PFMEA rows
                will include AP calculations per {options.pfmeaBasis}. Control
                Plan characteristics will link to PFMEA rows with special
                characteristics flagged.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Generation Results Step
function GenerationResultsStep({
  result,
  isGenerating,
  error,
  partId,
}: {
  result: GenerationResult | null;
  isGenerating: boolean;
  error: string | null;
  partId: string;
}) {
  if (isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px]">
        <RefreshCw className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg font-medium">Generating Documents...</p>
        <p className="text-muted-foreground">
          This may take a moment depending on process complexity
        </p>
        <Progress value={66} className="w-64 mt-4" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px]">
        <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
        <p className="text-lg font-medium text-red-600">Generation Failed</p>
        <p className="text-muted-foreground text-center max-w-md">{error}</p>
        <Button variant="outline" className="mt-4">
          Try Again
        </Button>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px]">
        <Play className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-lg font-medium">Ready to Generate</p>
        <p className="text-muted-foreground">
          Click "Generate Documents" to create the selected documents
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center text-center py-8">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        </div>
        <h3 className="text-xl font-semibold text-green-700">
          Documents Generated Successfully!
        </h3>
        <p className="text-muted-foreground">
          All selected documents have been created and are ready for review
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {result.pfd && (
          <Card className="border-green-200 bg-green-50/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <GitBranch className="h-6 w-6 text-green-600" />
                <Badge className="bg-green-500">Created</Badge>
              </div>
              <CardTitle>PFD</CardTitle>
              <CardDescription>Rev {result.pfd.rev}</CardDescription>
            </CardHeader>
            <CardFooter>
              <Button variant="outline" size="sm" className="w-full" asChild>
                <Link href={`/parts/${partId}/pfd`}>
                  <Eye className="h-4 w-4 mr-2" />
                  View PFD
                </Link>
              </Button>
            </CardFooter>
          </Card>
        )}

        {result.pfmea && (
          <Card className="border-green-200 bg-green-50/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <FileText className="h-6 w-6 text-green-600" />
                <Badge className="bg-green-500">Created</Badge>
              </div>
              <CardTitle>PFMEA</CardTitle>
              <CardDescription>
                Rev {result.pfmea.rev} • {result.pfmea.rowCount} rows
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button variant="outline" size="sm" className="w-full" asChild>
                <Link href={`/pfmea/${result.pfmea.id}`}>
                  <Eye className="h-4 w-4 mr-2" />
                  View PFMEA
                </Link>
              </Button>
            </CardFooter>
          </Card>
        )}

        {result.controlPlan && (
          <Card className="border-green-200 bg-green-50/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <ClipboardList className="h-6 w-6 text-green-600" />
                <Badge className="bg-green-500">Created</Badge>
              </div>
              <CardTitle>Control Plan</CardTitle>
              <CardDescription>
                Rev {result.controlPlan.rev} • {result.controlPlan.rowCount}{" "}
                characteristics
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button variant="outline" size="sm" className="w-full" asChild>
                <Link href={`/control-plans/${result.controlPlan.id}`}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Control Plan
                </Link>
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>

      <div className="flex justify-center gap-4 pt-4">
        <Button variant="outline" asChild>
          <Link href="/parts">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Parts
          </Link>
        </Button>
        <Button asChild>
          <Link href={`/pfmea/${result.pfmea?.id}`}>
            Start PFMEA Review
            <ArrowRight className="h-4 w-4 ml-2" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

export default function PartDetail() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Wizard state
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedProcesses, setSelectedProcesses] = useState<ProcessSelection[]>([]);
  const [generationOptions, setGenerationOptions] = useState({
    generatePFD: true,
    generatePFMEA: true,
    generateControlPlan: true,
    pfmeaBasis: "AIAG-VDA 2019",
    controlPlanType: "Production",
    rev: "1.0.0",
  });
  const [generationResult, setGenerationResult] = useState<GenerationResult | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);

  // Fetch part details
  const { data: part, isLoading: partLoading } = useQuery<Part>({
    queryKey: ["/api/parts", id],
    queryFn: async () => {
      const response = await fetch(`/api/parts/${id}`);
      if (!response.ok) throw new Error("Failed to fetch part");
      return response.json();
    },
    enabled: !!id,
  });

  // Fetch processes
  const { data: processes = [] } = useQuery<ProcessDef[]>({
    queryKey: ["/api/processes"],
  });

  // Fetch existing documents
  const { data: pfmeas = [] } = useQuery<PFMEA[]>({
    queryKey: ["/api/parts", id, "pfmeas"],
    queryFn: async () => {
      const response = await fetch(`/api/parts/${id}/pfmeas`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!id,
  });

  const { data: controlPlans = [] } = useQuery<ControlPlan[]>({
    queryKey: ["/api/parts", id, "control-plans"],
    queryFn: async () => {
      const response = await fetch(`/api/parts/${id}/control-plans`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!id,
  });

  // PFD Preview mutation
  const previewMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/parts/${id}/pfd/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          processes: selectedProcesses,
        }),
      });
      if (!response.ok) throw new Error("Failed to generate preview");
      return response.json();
    },
  });

  // Generation mutation
  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/parts/${id}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          processes: selectedProcesses,
          options: generationOptions,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate documents");
      }
      return response.json();
    },
    onSuccess: (data) => {
      setGenerationResult(data);
      setGenerationError(null);
      queryClient.invalidateQueries({ queryKey: ["/api/parts", id] });
      toast({
        title: "Documents Generated",
        description: "All selected documents have been created successfully.",
      });
    },
    onError: (error: Error) => {
      setGenerationError(error.message);
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Load preview when moving to step 2
  useEffect(() => {
    if (currentStep === 1 && selectedProcesses.length > 0) {
      previewMutation.mutate();
    }
  }, [currentStep]);

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return selectedProcesses.length > 0;
      case 1:
        return true;
      case 2:
        return (
          generationOptions.generatePFD ||
          generationOptions.generatePFMEA ||
          generationOptions.generateControlPlan
        );
      case 3:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < WIZARD_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else if (currentStep === 3 && !generationResult) {
      generateMutation.mutate();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const resetWizard = () => {
    setCurrentStep(0);
    setSelectedProcesses([]);
    setGenerationResult(null);
    setGenerationError(null);
  };

  if (partLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!part) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Package className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold">Part Not Found</h2>
        <p className="text-muted-foreground mb-4">
          The requested part could not be found.
        </p>
        <Button asChild>
          <Link href="/parts">Back to Parts</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/parts">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{part.partNumber}</h1>
              <Badge variant="outline">{part.customer}</Badge>
              <Badge variant="secondary">{part.plant}</Badge>
            </div>
            <p className="text-muted-foreground">
              {part.partName} {part.program && `• ${part.program}`}
            </p>
          </div>
        </div>
        <Button onClick={() => setWizardOpen(true)} data-testid="button-generate-documents">
          <Wand2 className="h-4 w-4 mr-2" />
          Generate Documents
        </Button>
      </div>

      {/* Part Info & CSR Notes */}
      {part.csrNotes && (
        <Card className="border-purple-200 bg-purple-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-purple-700">
              Customer Specific Requirements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{part.csrNotes}</p>
          </CardContent>
        </Card>
      )}

      {/* Documents Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* PFMEAs */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                PFMEAs
              </CardTitle>
              <Badge>{pfmeas.length}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {pfmeas.length === 0 ? (
              <p className="text-muted-foreground text-sm">No PFMEAs created yet</p>
            ) : (
              <div className="space-y-2">
                {pfmeas.slice(0, 3).map((pfmea) => (
                  <Link key={pfmea.id} href={`/pfmea/${pfmea.id}`}>
                    <div className="flex items-center justify-between p-2 rounded hover:bg-muted cursor-pointer">
                      <div>
                        <span className="font-medium">Rev {pfmea.rev}</span>
                        <span className="text-sm text-muted-foreground ml-2">
                          {pfmea.basis}
                        </span>
                      </div>
                      {getStatusBadge(pfmea.status)}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button variant="ghost" size="sm" className="w-full" asChild>
              <Link href="/pfmea">
                View All
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </CardFooter>
        </Card>

        {/* Control Plans */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Control Plans
              </CardTitle>
              <Badge>{controlPlans.length}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {controlPlans.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No Control Plans created yet
              </p>
            ) : (
              <div className="space-y-2">
                {controlPlans.slice(0, 3).map((cp) => (
                  <Link key={cp.id} href={`/control-plans/${cp.id}`}>
                    <div className="flex items-center justify-between p-2 rounded hover:bg-muted cursor-pointer">
                      <div>
                        <span className="font-medium">Rev {cp.rev}</span>
                        <span className="text-sm text-muted-foreground ml-2">
                          {cp.type}
                        </span>
                      </div>
                      {getStatusBadge(cp.status)}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button variant="ghost" size="sm" className="w-full" asChild>
              <Link href="/control-plans">
                View All
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </CardFooter>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => setWizardOpen(true)}
            >
              <Wand2 className="h-4 w-4 mr-2" />
              Generate New Documents
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/pfmea">
                <FileText className="h-4 w-4 mr-2" />
                View All PFMEAs
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/control-plans">
                <ClipboardList className="h-4 w-4 mr-2" />
                View All Control Plans
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Generation Wizard Dialog */}
      <Dialog
        open={wizardOpen}
        onOpenChange={(open) => {
          setWizardOpen(open);
          if (!open) resetWizard();
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Generate Documents for {part.partNumber}</DialogTitle>
            <DialogDescription>
              Create PFD, PFMEA, and Control Plan documents from process templates
            </DialogDescription>
          </DialogHeader>

          {/* Progress Steps */}
          <div className="flex items-center justify-between px-4 py-2 bg-muted/30 rounded-lg">
            {WIZARD_STEPS.map((step, index) => {
              const StepIcon = step.icon;
              const isActive = index === currentStep;
              const isComplete = index < currentStep;

              return (
                <div
                  key={step.id}
                  className={`flex items-center gap-2 ${
                    isActive
                      ? "text-primary"
                      : isComplete
                      ? "text-green-600"
                      : "text-muted-foreground"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : isComplete
                        ? "bg-green-100 text-green-600"
                        : "bg-muted"
                    }`}
                  >
                    {isComplete ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <StepIcon className="h-4 w-4" />
                    )}
                  </div>
                  <span className="text-sm font-medium hidden md:inline">
                    {step.label}
                  </span>
                  {index < WIZARD_STEPS.length - 1 && (
                    <ChevronRight className="h-4 w-4 mx-2 text-muted-foreground" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Step Content */}
          <ScrollArea className="flex-1 px-1">
            <div className="py-4">
              {currentStep === 0 && (
                <ProcessSelectionStep
                  processes={processes}
                  selectedProcesses={selectedProcesses}
                  onSelectionChange={setSelectedProcesses}
                />
              )}
              {currentStep === 1 && (
                <PFDPreviewStep
                  mermaidCode={previewMutation.data?.mermaid || null}
                  isLoading={previewMutation.isPending}
                />
              )}
              {currentStep === 2 && (
                <GenerationOptionsStep
                  options={generationOptions}
                  onOptionsChange={setGenerationOptions}
                />
              )}
              {currentStep === 3 && (
                <GenerationResultsStep
                  result={generationResult}
                  isGenerating={generateMutation.isPending}
                  error={generationError}
                  partId={part.id}
                />
              )}
            </div>
          </ScrollArea>

          {/* Footer Navigation */}
          <DialogFooter className="border-t pt-4">
            <div className="flex items-center justify-between w-full">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 0 || generateMutation.isPending}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>

              <div className="text-sm text-muted-foreground">
                Step {currentStep + 1} of {WIZARD_STEPS.length}
              </div>

              {currentStep === 3 && generationResult ? (
                <Button onClick={() => setWizardOpen(false)}>
                  <Check className="h-4 w-4 mr-2" />
                  Done
                </Button>
              ) : (
                <Button
                  onClick={handleNext}
                  disabled={!canProceed() || generateMutation.isPending}
                >
                  {currentStep === 3 ? (
                    generateMutation.isPending ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Generate Documents
                      </>
                    )
                  ) : (
                    <>
                      Next
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}