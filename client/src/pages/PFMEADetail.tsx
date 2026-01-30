import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Save,
  RefreshCw,
  MoreHorizontal,
  Trash2,
  Edit,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileCheck,
  ShieldAlert,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Star,
  Copy,
  FileText,
  Download,
  Lock,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { Part, PFMEA, PFMEARow, InsertPFMEARow } from "@shared/schema";
import AutoReviewPanel from "@/components/AutoReviewPanel";
import { GovernanceTabPanel } from "@/components/GovernanceTabPanel";
import { SignatureStatusBadge } from "@/components/SignaturePanel";
import { OwnershipPanel } from "@/components/OwnershipPanel";
import { DocumentControlPanel } from "@/components/DocumentControlPanel";
import ExportDialog from "@/components/ExportDialog";
import { FileSpreadsheet } from "lucide-react";

const CURRENT_USER = {
  id: "user-001",
  name: "John Engineer",
  email: "john@example.com",
  role: "quality_manager",
};

const AVAILABLE_USERS = [
  { id: "user-001", name: "John Engineer", email: "john@example.com" },
  { id: "user-002", name: "Jane Quality", email: "jane@example.com" },
  { id: "user-003", name: "Bob Process", email: "bob@example.com" },
];

// Types
interface PFMEAWithDetails extends PFMEA {
  rows: PFMEARow[];
  part: Part;
}

interface RowEditState {
  [rowId: string]: Partial<PFMEARow>;
}

// AP calculation based on AIAG-VDA 2019
function calculateAP(severity: number, occurrence: number, detection: number): string {
  // High priority conditions
  if (severity >= 9) return "H";
  if (severity >= 7 && severity <= 8 && occurrence >= 7) return "H";
  if (severity >= 7 && severity <= 8 && detection >= 7) return "H";
  if (detection >= 9) return "H";
  
  // Medium priority conditions
  if (severity >= 5 && severity <= 6 && (occurrence >= 7 || detection >= 7)) return "M";
  if (severity >= 7 && severity <= 8 && occurrence >= 4 && occurrence <= 6 && detection >= 4 && detection <= 6) return "M";
  
  // Low priority
  return "L";
}

function getAPBadge(ap: string) {
  switch (ap) {
    case "H":
      return <Badge variant="destructive" className="font-bold">H</Badge>;
    case "M":
      return <Badge className="bg-yellow-500 hover:bg-yellow-600 font-bold">M</Badge>;
    case "L":
      return <Badge className="bg-green-500 hover:bg-green-600 font-bold">L</Badge>;
    default:
      return <Badge variant="outline">{ap}</Badge>;
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case "draft":
      return (
        <Badge variant="outline" className="bg-gray-50">
          <Clock className="h-3 w-3 mr-1" />
          Draft
        </Badge>
      );
    case "review":
      return (
        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Review
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

function CSRSymbolBadge({ symbol }: { symbol: string | null }) {
  if (!symbol) return null;
  
  const colors: Record<string, string> = {
    "Ⓢ": "bg-red-100 text-red-800 border-red-300",
    "◆": "bg-purple-100 text-purple-800 border-purple-300",
    "ⓒ": "bg-blue-100 text-blue-800 border-blue-300",
  };
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Badge variant="outline" className={`${colors[symbol] || ""} text-lg px-2`}>
            {symbol}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          {symbol === "Ⓢ" && "Safety Critical"}
          {symbol === "◆" && "Significant Characteristic"}
          {symbol === "ⓒ" && "Critical Characteristic"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Rating selector component
function RatingSelect({
  value,
  onChange,
  type,
  disabled,
}: {
  value: number;
  onChange: (value: number) => void;
  type: "S" | "O" | "D";
  disabled?: boolean;
}) {
  const colors: Record<number, string> = {
    1: "bg-green-50",
    2: "bg-green-50",
    3: "bg-green-100",
    4: "bg-yellow-50",
    5: "bg-yellow-100",
    6: "bg-yellow-200",
    7: "bg-orange-100",
    8: "bg-orange-200",
    9: "bg-red-100",
    10: "bg-red-200",
  };

  return (
    <Select
      value={String(value)}
      onValueChange={(v) => onChange(parseInt(v))}
      disabled={disabled}
    >
      <SelectTrigger className={`w-16 ${colors[value] || ""}`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => (
          <SelectItem key={rating} value={String(rating)} className={colors[rating]}>
            {rating}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// Row Editor Dialog
function RowEditorDialog({
  open,
  onOpenChange,
  row,
  onSave,
  isSaving,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: PFMEARow | null;
  onSave: (data: Partial<InsertPFMEARow>) => void;
  isSaving: boolean;
}) {
  const [formData, setFormData] = useState<Partial<InsertPFMEARow>>({});

  useEffect(() => {
    if (row) {
      setFormData({
        stepRef: row.stepRef,
        function: row.function,
        requirement: row.requirement,
        failureMode: row.failureMode,
        effect: row.effect,
        severity: row.severity,
        cause: row.cause,
        occurrence: row.occurrence,
        preventionControls: row.preventionControls,
        detectionControls: row.detectionControls,
        detection: row.detection,
        specialFlag: row.specialFlag,
        csrSymbol: row.csrSymbol,
        notes: row.notes,
      });
    }
  }, [row]);

  const calculatedAP = calculateAP(
    formData.severity || 1,
    formData.occurrence || 1,
    formData.detection || 1
  );

  const handleArrayChange = (field: "preventionControls" | "detectionControls", value: string) => {
    const items = value.split("\n").filter((item) => item.trim());
    setFormData({ ...formData, [field]: items });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit PFMEA Row</DialogTitle>
          <DialogDescription>
            Modify failure mode analysis details. AP will be auto-calculated.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          {/* Left Column */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Process Step</Label>
              <Input
                value={formData.stepRef || ""}
                onChange={(e) => setFormData({ ...formData, stepRef: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Function</Label>
              <Textarea
                value={formData.function || ""}
                onChange={(e) => setFormData({ ...formData, function: e.target.value })}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Requirement</Label>
              <Textarea
                value={formData.requirement || ""}
                onChange={(e) => setFormData({ ...formData, requirement: e.target.value })}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Potential Failure Mode</Label>
              <Textarea
                value={formData.failureMode || ""}
                onChange={(e) => setFormData({ ...formData, failureMode: e.target.value })}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Potential Effect(s) of Failure</Label>
              <Textarea
                value={formData.effect || ""}
                onChange={(e) => setFormData({ ...formData, effect: e.target.value })}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Potential Cause(s)</Label>
              <Textarea
                value={formData.cause || ""}
                onChange={(e) => setFormData({ ...formData, cause: e.target.value })}
                rows={2}
              />
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Severity (S)</Label>
                <RatingSelect
                  value={formData.severity || 1}
                  onChange={(v) => setFormData({ ...formData, severity: v })}
                  type="S"
                />
              </div>
              <div className="space-y-2">
                <Label>Occurrence (O)</Label>
                <RatingSelect
                  value={formData.occurrence || 1}
                  onChange={(v) => setFormData({ ...formData, occurrence: v })}
                  type="O"
                />
              </div>
              <div className="space-y-2">
                <Label>Detection (D)</Label>
                <RatingSelect
                  value={formData.detection || 1}
                  onChange={(v) => setFormData({ ...formData, detection: v })}
                  type="D"
                />
              </div>
              <div className="space-y-2">
                <Label>AP</Label>
                <div className="h-10 flex items-center">
                  {getAPBadge(calculatedAP)}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Prevention Controls (one per line)</Label>
              <Textarea
                value={(formData.preventionControls || []).join("\n")}
                onChange={(e) => handleArrayChange("preventionControls", e.target.value)}
                rows={3}
                placeholder="Enter each control on a new line"
              />
            </div>

            <div className="space-y-2">
              <Label>Detection Controls (one per line)</Label>
              <Textarea
                value={(formData.detectionControls || []).join("\n")}
                onChange={(e) => handleArrayChange("detectionControls", e.target.value)}
                rows={3}
                placeholder="Enter each control on a new line"
              />
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Special Characteristic</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.specialFlag || false}
                    onChange={(e) =>
                      setFormData({ ...formData, specialFlag: e.target.checked })
                    }
                    className="h-4 w-4"
                  />
                  <span className="text-sm">Mark as special</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label>CSR Symbol</Label>
                <Select
                  value={formData.csrSymbol || "none"}
                  onValueChange={(v) =>
                    setFormData({ ...formData, csrSymbol: v === "none" ? null : v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="Ⓢ">Ⓢ Safety</SelectItem>
                    <SelectItem value="◆">◆ Significant</SelectItem>
                    <SelectItem value="ⓒ">ⓒ Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes || ""}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => onSave({ ...formData, ap: calculatedAP })} disabled={isSaving}>
            {isSaving ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function PFMEADetail() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State
  const [editingRow, setEditingRow] = useState<PFMEARow | null>(null);
  const [deleteRowId, setDeleteRowId] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [inlineEdits, setInlineEdits] = useState<RowEditState>({});

  // Fetch PFMEA details
  const { data: pfmea, isLoading } = useQuery<PFMEAWithDetails>({
    queryKey: ["/api/pfmeas", id, "details"],
    queryFn: async () => {
      const response = await fetch(`/api/pfmeas/${id}/details`);
      if (!response.ok) throw new Error("Failed to fetch PFMEA");
      return response.json();
    },
    enabled: !!id,
  });

  // Update row mutation
  const updateRowMutation = useMutation({
    mutationFn: async ({ rowId, data }: { rowId: string; data: Partial<InsertPFMEARow> }) => {
      const response = await fetch(`/api/pfmea-rows/${rowId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update row");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pfmeas", id, "details"] });
      toast({
        title: "Row Updated",
        description: "PFMEA row has been updated successfully.",
      });
      setEditingRow(null);
      setInlineEdits({});
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update row. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete row mutation
  const deleteRowMutation = useMutation({
    mutationFn: async (rowId: string) => {
      const response = await fetch(`/api/pfmea-rows/${rowId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete row");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pfmeas", id, "details"] });
      toast({
        title: "Row Deleted",
        description: "PFMEA row has been deleted.",
      });
      setDeleteRowId(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete row.",
        variant: "destructive",
      });
    },
  });

  // Recalculate AP mutation
  const recalculateMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/pfmeas/${id}/recalculate-ap`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to recalculate");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/pfmeas", id, "details"] });
      toast({
        title: "AP Recalculated",
        description: `${data.changedRows} of ${data.totalRows} rows updated.`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to recalculate AP ratings.",
        variant: "destructive",
      });
    },
  });

  // Update PFMEA status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      const response = await fetch(`/api/pfmeas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error("Failed to update status");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pfmeas", id, "details"] });
      toast({
        title: "Status Updated",
        description: "PFMEA status has been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update status.",
        variant: "destructive",
      });
    },
  });

  // Handle inline rating change
  const handleInlineRatingChange = (
    rowId: string,
    field: "severity" | "occurrence" | "detection",
    value: number
  ) => {
    const row = pfmea?.rows.find((r) => r.id === rowId);
    if (!row) return;

    const currentEdits = inlineEdits[rowId] || {};
    const newEdits = { ...currentEdits, [field]: value };

    // Calculate new AP
    const s = field === "severity" ? value : (newEdits.severity as number) || row.severity;
    const o = field === "occurrence" ? value : (newEdits.occurrence as number) || row.occurrence;
    const d = field === "detection" ? value : (newEdits.detection as number) || row.detection;
    const newAP = calculateAP(s, o, d);

    setInlineEdits({
      ...inlineEdits,
      [rowId]: { ...newEdits, ap: newAP },
    });
  };

  // Save inline edits
  const saveInlineEdits = (rowId: string) => {
    const edits = inlineEdits[rowId];
    if (!edits) return;

    updateRowMutation.mutate({ rowId, data: edits });
  };

  // Toggle row expansion
  const toggleRowExpansion = (rowId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(rowId)) {
      newExpanded.delete(rowId);
    } else {
      newExpanded.add(rowId);
    }
    setExpandedRows(newExpanded);
  };

  // Calculate summary stats
  const stats = pfmea?.rows.reduce(
    (acc, row) => {
      if (row.ap === "H") acc.high++;
      else if (row.ap === "M") acc.medium++;
      else if (row.ap === "L") acc.low++;
      if (row.specialFlag || row.csrSymbol) acc.special++;
      return acc;
    },
    { high: 0, medium: 0, low: 0, special: 0 }
  ) || { high: 0, medium: 0, low: 0, special: 0 };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!pfmea) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold">PFMEA Not Found</h2>
        <p className="text-muted-foreground mb-4">The requested PFMEA could not be found.</p>
        <Button asChild>
          <Link href="/pfmea">Back to PFMEA List</Link>
        </Button>
      </div>
    );
  }

  const isReadOnly = pfmea.status === 'effective' || pfmea.status === 'superseded';

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content - 3 columns */}
        <div className="lg:col-span-3 space-y-6">
          {/* Locked Document Banner */}
          {isReadOnly && (
            <Alert className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
              <Lock className="h-4 w-4" />
              <AlertTitle>Document Locked</AlertTitle>
              <AlertDescription>
                This {pfmea.status} document cannot be edited.
                {pfmea.status === 'effective' && ' Create a new revision to make changes.'}
              </AlertDescription>
            </Alert>
          )}

          {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/pfmea">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">
                {pfmea.part.partNumber} - PFMEA
              </h1>
              <Badge variant="outline" className="text-lg">
                Rev {pfmea.rev}
              </Badge>
              {getStatusBadge(pfmea.status)}
            </div>
            <p className="text-muted-foreground">
              {pfmea.part.partName} • {pfmea.part.customer} • {pfmea.basis || "AIAG-VDA 2019"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ExportDialog
            documentType="pfmea"
            documentId={id!}
            documentName={`${pfmea.part.partNumber} Rev ${pfmea.rev}`}
            trigger={
              <Button variant="outline" data-testid="button-export-pfmea">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            }
          />
          
          <Button 
            variant="ghost" 
            size="icon"
            title="Export as PDF"
            onClick={() => window.open(`/api/pfmeas/${id}/export?format=pdf`, '_blank')}
            data-testid="button-quick-export-pdf"
          >
            <FileText className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            title="Export as Excel"
            onClick={() => window.open(`/api/pfmeas/${id}/export?format=xlsx`, '_blank')}
            data-testid="button-quick-export-xlsx"
          >
            <FileSpreadsheet className="h-4 w-4" />
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                Status: {pfmea.status}
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => updateStatusMutation.mutate("draft")}>
                Draft
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => updateStatusMutation.mutate("review")}>
                Review
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => updateStatusMutation.mutate("effective")}>
                Effective
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => updateStatusMutation.mutate("superseded")}>
                Superseded
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => updateStatusMutation.mutate("obsolete")}>
                Obsolete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="outline"
            onClick={() => recalculateMutation.mutate()}
            disabled={recalculateMutation.isPending}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${recalculateMutation.isPending ? "animate-spin" : ""}`} />
            Recalculate AP
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Rows</CardDescription>
            <CardTitle className="text-2xl">{pfmea.rows.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-red-200">
          <CardHeader className="pb-2">
            <CardDescription className="text-red-600">High AP</CardDescription>
            <CardTitle className="text-2xl text-red-600">{stats.high}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-yellow-200">
          <CardHeader className="pb-2">
            <CardDescription className="text-yellow-600">Medium AP</CardDescription>
            <CardTitle className="text-2xl text-yellow-600">{stats.medium}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-green-200">
          <CardHeader className="pb-2">
            <CardDescription className="text-green-600">Low AP</CardDescription>
            <CardTitle className="text-2xl text-green-600">{stats.low}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-purple-200">
          <CardHeader className="pb-2">
            <CardDescription className="text-purple-600">Special Chars</CardDescription>
            <CardTitle className="text-2xl text-purple-600">{stats.special}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* PFMEA Grid */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Failure Mode Analysis</CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Click S/O/D to edit inline</span>
              <span>•</span>
              <span>Click row to expand</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="w-full">
            <div className="min-w-[1400px]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-8"></TableHead>
                    <TableHead className="w-[120px]">Step</TableHead>
                    <TableHead className="w-[150px]">Function</TableHead>
                    <TableHead className="w-[150px]">Failure Mode</TableHead>
                    <TableHead className="w-[150px]">Effect</TableHead>
                    <TableHead className="w-16 text-center">S</TableHead>
                    <TableHead className="w-[150px]">Cause</TableHead>
                    <TableHead className="w-16 text-center">O</TableHead>
                    <TableHead className="w-[120px]">Prevention</TableHead>
                    <TableHead className="w-[120px]">Detection</TableHead>
                    <TableHead className="w-16 text-center">D</TableHead>
                    <TableHead className="w-16 text-center">AP</TableHead>
                    <TableHead className="w-12">CSR</TableHead>
                    <TableHead className="w-20 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pfmea.rows.map((row) => {
                    const isExpanded = expandedRows.has(row.id);
                    const hasEdits = !!inlineEdits[row.id];
                    const currentEdits = inlineEdits[row.id] || {};
                    const displayAP = currentEdits.ap || row.ap;
                    const isSpecial = row.specialFlag || row.csrSymbol;

                    return (
                      <>
                        <TableRow
                          key={row.id}
                          className={`
                            ${isSpecial ? "bg-purple-50/50" : ""}
                            ${row.ap === "H" ? "border-l-4 border-l-red-500" : ""}
                            ${row.ap === "M" ? "border-l-4 border-l-yellow-500" : ""}
                            hover:bg-muted/50 cursor-pointer
                          `}
                          onClick={() => toggleRowExpansion(row.id)}
                        >
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{row.stepRef}</TableCell>
                          <TableCell className="text-sm">{row.function}</TableCell>
                          <TableCell className="text-sm font-medium">{row.failureMode}</TableCell>
                          <TableCell className="text-sm">{row.effect}</TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <RatingSelect
                              value={(currentEdits.severity as number) || row.severity}
                              onChange={(v) => handleInlineRatingChange(row.id, "severity", v)}
                              type="S"
                            />
                          </TableCell>
                          <TableCell className="text-sm">{row.cause}</TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <RatingSelect
                              value={(currentEdits.occurrence as number) || row.occurrence}
                              onChange={(v) => handleInlineRatingChange(row.id, "occurrence", v)}
                              type="O"
                            />
                          </TableCell>
                          <TableCell className="text-sm">
                            {row.preventionControls?.length || 0} controls
                          </TableCell>
                          <TableCell className="text-sm">
                            {row.detectionControls?.length || 0} controls
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <RatingSelect
                              value={(currentEdits.detection as number) || row.detection}
                              onChange={(v) => handleInlineRatingChange(row.id, "detection", v)}
                              type="D"
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            {getAPBadge(displayAP)}
                          </TableCell>
                          <TableCell>
                            <CSRSymbolBadge symbol={row.csrSymbol} />
                          </TableCell>
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              {hasEdits && (
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => saveInlineEdits(row.id)}
                                  disabled={updateRowMutation.isPending}
                                >
                                  <Save className="h-3 w-3" />
                                </Button>
                              )}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => setEditingRow(row)}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit Full Row
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Copy className="h-4 w-4 mr-2" />
                                    Duplicate
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-red-600"
                                    onClick={() => setDeleteRowId(row.id)}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>

                        {/* Expanded Row Details */}
                        {isExpanded && (
                          <TableRow className="bg-muted/30">
                            <TableCell colSpan={14}>
                              <div className="grid grid-cols-2 gap-6 p-4">
                                <div className="space-y-3">
                                  <div>
                                    <Label className="text-xs text-muted-foreground">Requirement</Label>
                                    <p className="text-sm">{row.requirement || "—"}</p>
                                  </div>
                                  <div>
                                    <Label className="text-xs text-muted-foreground">Prevention Controls</Label>
                                    <ul className="list-disc list-inside text-sm">
                                      {row.preventionControls?.map((ctrl, i) => (
                                        <li key={i}>{ctrl}</li>
                                      ))}
                                      {(!row.preventionControls || row.preventionControls.length === 0) && (
                                        <li className="text-muted-foreground">None defined</li>
                                      )}
                                    </ul>
                                  </div>
                                </div>
                                <div className="space-y-3">
                                  <div>
                                    <Label className="text-xs text-muted-foreground">Detection Controls</Label>
                                    <ul className="list-disc list-inside text-sm">
                                      {row.detectionControls?.map((ctrl, i) => (
                                        <li key={i}>{ctrl}</li>
                                      ))}
                                      {(!row.detectionControls || row.detectionControls.length === 0) && (
                                        <li className="text-muted-foreground">None defined</li>
                                      )}
                                    </ul>
                                  </div>
                                  {row.notes && (
                                    <div>
                                      <Label className="text-xs text-muted-foreground">Notes</Label>
                                      <p className="text-sm">{row.notes}</p>
                                    </div>
                                  )}
                                  {row.parentTemplateRowId && (
                                    <div>
                                      <Label className="text-xs text-muted-foreground">Template Link</Label>
                                      <Badge variant="outline" className="text-xs">
                                        From Process Template
                                      </Badge>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>

          {pfmea.rows.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No Rows Yet</h3>
              <p className="text-muted-foreground">
                This PFMEA has no failure mode rows defined.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Auto-Review Section */}
      <div className="mt-6">
        <AutoReviewPanel
          documentType="pfmea"
          documentId={id}
          documentTitle={pfmea?.docNo || `PFMEA Rev ${pfmea?.rev}`}
          onFindingClick={(finding: any) => {
            if (finding.rowId) {
              const element = document.getElementById(`row-${finding.rowId}`);
              element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }}
        />
      </div>

      <GovernanceTabPanel
        entityType="pfmea"
        entityId={pfmea.id}
        entityName={`PFMEA - ${pfmea.docNo || pfmea.id}`}
        currentRev={pfmea.rev}
        currentStatus={pfmea.status}
        currentUserId={CURRENT_USER.id}
        currentUserName={CURRENT_USER.name}
        currentUserEmail={CURRENT_USER.email}
        currentUserRole={CURRENT_USER.role}
        availableUsers={AVAILABLE_USERS}
        onRevisionCreated={(newId) => {
          console.log("New revision created:", newId);
        }}
        onApprovalComplete={() => {
          queryClient.invalidateQueries({ queryKey: ["/api/pfmeas"] });
        }}
      />
        </div>

        {/* Sidebar - 1 column */}
        <div className="lg:col-span-1 space-y-4">
          <DocumentControlPanel
            documentType="pfmea"
            documentId={pfmea.id}
            currentStatus={pfmea.status}
            currentRev={pfmea.rev}
            docNo={pfmea.docNo}
            onStatusChange={() => {
              queryClient.invalidateQueries({ queryKey: ["/api/pfmeas", id, "details"] });
            }}
          />
          
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" size="sm" className="w-full justify-start" data-testid="button-export-pdf">
                <FileText className="h-4 w-4 mr-2" />
                Export to PDF
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start"
                onClick={() => recalculateMutation.mutate()}
                disabled={recalculateMutation.isPending || isReadOnly}
                data-testid="button-recalculate-ap"
              >
                <ShieldCheck className="h-4 w-4 mr-2" />
                Recalculate AP
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Row Editor Dialog */}
      <RowEditorDialog
        open={!!editingRow}
        onOpenChange={(open) => !open && setEditingRow(null)}
        row={editingRow}
        onSave={(data) => {
          if (editingRow) {
            updateRowMutation.mutate({ rowId: editingRow.id, data });
          }
        }}
        isSaving={updateRowMutation.isPending}
      />

      {/* Delete Row Dialog */}
      <AlertDialog open={!!deleteRowId} onOpenChange={(open) => !open && setDeleteRowId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete PFMEA Row?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this failure mode row. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteRowId && deleteRowMutation.mutate(deleteRowId)}
            >
              {deleteRowMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}