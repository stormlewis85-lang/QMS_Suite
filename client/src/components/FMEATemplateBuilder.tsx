import { useState, useMemo, Fragment } from "react";
import {
  Plus,
  Search,
  Eye,
  Pencil,
  Trash2,
  Loader2,
  AlertTriangle,
  Shield,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Filter,
  Copy,
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type {
  ProcessStep,
  FmeaTemplateRow,
  InsertFmeaTemplateRow,
  FailureModesLibrary,
  ControlsLibrary,
} from "@shared/schema";
import FMEATemplateRowDialog from "./FMEATemplateRowDialog";

// AP Badge component with color coding
function APBadge({ ap }: { ap: string }) {
  const variant = ap === "H" ? "destructive" : ap === "M" ? "warning" : "success";
  const bgClass =
    ap === "H"
      ? "bg-red-100 text-red-800 border-red-200"
      : ap === "M"
      ? "bg-yellow-100 text-yellow-800 border-yellow-200"
      : "bg-green-100 text-green-800 border-green-200";

  return (
    <Badge className={`font-bold text-sm px-3 py-1 ${bgClass}`} variant="outline">
      {ap}
    </Badge>
  );
}

// Rating badge with color coding
function RatingBadge({ value, type }: { value: number; type: "S" | "O" | "D" }) {
  let bgClass = "bg-gray-100 text-gray-800";
  
  if (type === "S") {
    if (value >= 9) bgClass = "bg-red-100 text-red-800";
    else if (value >= 7) bgClass = "bg-orange-100 text-orange-800";
    else if (value >= 5) bgClass = "bg-yellow-100 text-yellow-800";
    else bgClass = "bg-green-100 text-green-800";
  } else if (type === "O" || type === "D") {
    if (value >= 8) bgClass = "bg-red-100 text-red-800";
    else if (value >= 6) bgClass = "bg-orange-100 text-orange-800";
    else if (value >= 4) bgClass = "bg-yellow-100 text-yellow-800";
    else bgClass = "bg-green-100 text-green-800";
  }

  return (
    <span className={`inline-flex items-center justify-center w-8 h-8 rounded font-semibold text-sm ${bgClass}`}>
      {value}
    </span>
  );
}

// CSR Symbol badge
function CSRBadge({ symbol }: { symbol?: string | null }) {
  if (!symbol) return null;
  
  const colorMap: Record<string, string> = {
    "Ⓢ": "bg-red-500 text-white", // Safety
    "◆": "bg-blue-500 text-white", // Critical
    "ⓒ": "bg-purple-500 text-white", // Compliance
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${colorMap[symbol] || "bg-gray-500 text-white"}`}>
            {symbol}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          {symbol === "Ⓢ" && "Safety Characteristic"}
          {symbol === "◆" && "Critical Characteristic"}
          {symbol === "ⓒ" && "Compliance/Regulatory"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface FMEATemplateBuilderProps {
  processId: string;
  processName: string;
  steps: ProcessStep[];
}

export default function FMEATemplateBuilder({
  processId,
  processName,
  steps,
}: FMEATemplateBuilderProps) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStepFilter, setSelectedStepFilter] = useState<string>("all");
  const [selectedApFilter, setSelectedApFilter] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<FmeaTemplateRow | null>(null);
  const [viewingRow, setViewingRow] = useState<FmeaTemplateRow | null>(null);
  const [deletingRow, setDeletingRow] = useState<FmeaTemplateRow | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Fetch FMEA template rows for this process
  const {
    data: templateRows = [],
    isLoading,
    error,
  } = useQuery<FmeaTemplateRow[]>({
    queryKey: [`/api/processes/${processId}/fmea-template-rows`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/processes/${processId}/fmea-template-rows`);
      return res.json();
    },
  });

  // Fetch failure modes for suggestions
  const { data: failureModes = [] } = useQuery<FailureModesLibrary[]>({
    queryKey: ["/api/failure-modes"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/failure-modes");
      return res.json();
    },
  });

  // Fetch controls library for suggestions
  const { data: controls = [] } = useQuery<ControlsLibrary[]>({
    queryKey: ["/api/controls-library"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/controls-library");
      return res.json();
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/fmea-template-rows/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/processes/${processId}/fmea-template-rows`] });
      toast({
        title: "Row deleted",
        description: "The FMEA template row has been deleted.",
      });
      setDeletingRow(null);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete row",
      });
    },
  });

  // Duplicate mutation
  const duplicateMutation = useMutation({
    mutationFn: async (row: FmeaTemplateRow) => {
      const newRow: InsertFmeaTemplateRow = {
        processDefId: row.processDefId,
        stepId: row.stepId,
        function: row.function,
        requirement: row.requirement,
        failureMode: `${row.failureMode} (Copy)`,
        effect: row.effect,
        severity: row.severity,
        cause: row.cause,
        occurrence: row.occurrence,
        preventionControls: row.preventionControls,
        detectionControls: row.detectionControls,
        detection: row.detection,
        ap: row.ap,
        specialFlag: row.specialFlag,
        csrSymbol: row.csrSymbol,
        notes: row.notes,
      };
      const res = await apiRequest("POST", `/api/processes/${processId}/fmea-template-rows`, newRow);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/processes/${processId}/fmea-template-rows`] });
      toast({
        title: "Row duplicated",
        description: "The FMEA template row has been duplicated.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to duplicate row",
      });
    },
  });

  // Filter and search rows
  const filteredRows = useMemo(() => {
    return templateRows.filter((row) => {
      // Step filter
      if (selectedStepFilter !== "all" && row.stepId !== selectedStepFilter) {
        return false;
      }
      // AP filter
      if (selectedApFilter !== "all" && row.ap !== selectedApFilter) {
        return false;
      }
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        return (
          row.function.toLowerCase().includes(search) ||
          row.failureMode.toLowerCase().includes(search) ||
          row.effect.toLowerCase().includes(search) ||
          row.cause.toLowerCase().includes(search) ||
          row.requirement.toLowerCase().includes(search)
        );
      }
      return true;
    });
  }, [templateRows, selectedStepFilter, selectedApFilter, searchTerm]);

  // Group rows by step
  const rowsByStep = useMemo(() => {
    const grouped: Record<string, FmeaTemplateRow[]> = {};
    for (const row of filteredRows) {
      if (!grouped[row.stepId]) {
        grouped[row.stepId] = [];
      }
      grouped[row.stepId].push(row);
    }
    return grouped;
  }, [filteredRows]);

  // Get step name by ID
  const getStepName = (stepId: string) => {
    const step = steps.find((s) => s.id === stepId);
    return step ? `${step.seq}: ${step.name}` : "Unknown Step";
  };

  // Toggle row expansion
  const toggleRowExpansion = (rowId: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        next.add(rowId);
      }
      return next;
    });
  };

  // Statistics
  const stats = useMemo(() => {
    const highAP = templateRows.filter((r) => r.ap === "H").length;
    const mediumAP = templateRows.filter((r) => r.ap === "M").length;
    const lowAP = templateRows.filter((r) => r.ap === "L").length;
    const specialChars = templateRows.filter((r) => r.specialFlag).length;
    return { total: templateRows.length, highAP, mediumAP, lowAP, specialChars };
  }, [templateRows]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-500">
        <AlertTriangle className="h-6 w-6 mr-2" />
        <span>Error loading FMEA template rows</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Rows</CardDescription>
            <CardTitle className="text-2xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-2">
            <CardDescription className="text-red-700">High AP</CardDescription>
            <CardTitle className="text-2xl text-red-700">{stats.highAP}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader className="pb-2">
            <CardDescription className="text-yellow-700">Medium AP</CardDescription>
            <CardTitle className="text-2xl text-yellow-700">{stats.mediumAP}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-green-200 bg-green-50">
          <CardHeader className="pb-2">
            <CardDescription className="text-green-700">Low AP</CardDescription>
            <CardTitle className="text-2xl text-green-700">{stats.lowAP}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-purple-200 bg-purple-50">
          <CardHeader className="pb-2">
            <CardDescription className="text-purple-700">Special Chars</CardDescription>
            <CardTitle className="text-2xl text-purple-700">{stats.specialChars}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex flex-col md:flex-row gap-3 flex-1">
          {/* Search */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search failure modes, effects, causes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          {/* Step Filter */}
          <Select value={selectedStepFilter} onValueChange={setSelectedStepFilter}>
            <SelectTrigger className="w-full md:w-48">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by step" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Steps</SelectItem>
              {steps.map((step) => (
                <SelectItem key={step.id} value={step.id}>
                  {step.seq}: {step.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* AP Filter */}
          <Select value={selectedApFilter} onValueChange={setSelectedApFilter}>
            <SelectTrigger className="w-full md:w-36">
              <SelectValue placeholder="Filter by AP" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All AP</SelectItem>
              <SelectItem value="H">High (H)</SelectItem>
              <SelectItem value="M">Medium (M)</SelectItem>
              <SelectItem value="L">Low (L)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {/* Add Button */}
        <Button onClick={() => setIsAddDialogOpen(true)} className="w-full md:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Add FMEA Row
        </Button>
      </div>

      {/* FMEA Grid */}
      {templateRows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No FMEA Template Rows</h3>
            <p className="text-muted-foreground text-center mb-4">
              Start building your Process FMEA template by adding failure mode analysis rows.
            </p>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Row
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>FMEA Template Grid</CardTitle>
            <CardDescription>
              {filteredRows.length} of {templateRows.length} rows shown
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="w-full whitespace-nowrap">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead className="min-w-[150px]">Process Step</TableHead>
                    <TableHead className="min-w-[120px]">Function</TableHead>
                    <TableHead className="min-w-[150px]">Failure Mode</TableHead>
                    <TableHead className="min-w-[120px]">Effect</TableHead>
                    <TableHead className="w-12 text-center">S</TableHead>
                    <TableHead className="min-w-[120px]">Cause</TableHead>
                    <TableHead className="w-12 text-center">O</TableHead>
                    <TableHead className="min-w-[100px]">Prevention</TableHead>
                    <TableHead className="min-w-[100px]">Detection</TableHead>
                    <TableHead className="w-12 text-center">D</TableHead>
                    <TableHead className="w-16 text-center">AP</TableHead>
                    <TableHead className="w-12 text-center">CSR</TableHead>
                    <TableHead className="w-32 text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.map((row) => (
                    <Fragment key={row.id}>
                      <TableRow className={row.specialFlag ? "bg-purple-50" : ""}>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleRowExpansion(row.id)}
                          >
                            {expandedRows.has(row.id) ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell className="font-medium">{getStepName(row.stepId)}</TableCell>
                        <TableCell className="max-w-[150px] truncate" title={row.function}>
                          {row.function}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate font-medium" title={row.failureMode}>
                          {row.failureMode}
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate" title={row.effect}>
                          {row.effect}
                        </TableCell>
                        <TableCell className="text-center">
                          <RatingBadge value={row.severity} type="S" />
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate" title={row.cause}>
                          {row.cause}
                        </TableCell>
                        <TableCell className="text-center">
                          <RatingBadge value={row.occurrence} type="O" />
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {row.preventionControls?.slice(0, 2).map((ctrl, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs bg-blue-50 truncate max-w-[80px]">
                                {ctrl}
                              </Badge>
                            ))}
                            {(row.preventionControls?.length || 0) > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{(row.preventionControls?.length || 0) - 2}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {row.detectionControls?.slice(0, 2).map((ctrl, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs bg-green-50 truncate max-w-[80px]">
                                {ctrl}
                              </Badge>
                            ))}
                            {(row.detectionControls?.length || 0) > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{(row.detectionControls?.length || 0) - 2}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <RatingBadge value={row.detection} type="D" />
                        </TableCell>
                        <TableCell className="text-center">
                          <APBadge ap={row.ap} />
                        </TableCell>
                        <TableCell className="text-center">
                          <CSRBadge symbol={row.csrSymbol} />
                          {row.specialFlag && !row.csrSymbol && (
                            <Shield className="h-4 w-4 text-purple-500" />
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setViewingRow(row)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>View Details</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setEditingRow(row)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Edit</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => duplicateMutation.mutate(row)}
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Duplicate</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-red-500 hover:text-red-700"
                                    onClick={() => setDeletingRow(row)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Delete</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TableCell>
                      </TableRow>
                      {/* Expanded row details */}
                      {expandedRows.has(row.id) && (
                        <TableRow className="bg-slate-50">
                          <TableCell colSpan={14}>
                            <div className="p-4 space-y-3">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <h4 className="text-sm font-semibold text-muted-foreground">Requirement</h4>
                                  <p className="text-sm">{row.requirement}</p>
                                </div>
                                <div>
                                  <h4 className="text-sm font-semibold text-muted-foreground">Notes</h4>
                                  <p className="text-sm">{row.notes || "No notes"}</p>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <h4 className="text-sm font-semibold text-muted-foreground">Prevention Controls</h4>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {row.preventionControls?.map((ctrl, idx) => (
                                      <Badge key={idx} variant="outline" className="bg-blue-50">
                                        {ctrl}
                                      </Badge>
                                    ))}
                                    {(!row.preventionControls || row.preventionControls.length === 0) && (
                                      <span className="text-sm text-muted-foreground">None defined</span>
                                    )}
                                  </div>
                                </div>
                                <div>
                                  <h4 className="text-sm font-semibold text-muted-foreground">Detection Controls</h4>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {row.detectionControls?.map((ctrl, idx) => (
                                      <Badge key={idx} variant="outline" className="bg-green-50">
                                        {ctrl}
                                      </Badge>
                                    ))}
                                    {(!row.detectionControls || row.detectionControls.length === 0) && (
                                      <span className="text-sm text-muted-foreground">None defined</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  ))}
                </TableBody>
              </Table>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Dialog */}
      <FMEATemplateRowDialog
        open={isAddDialogOpen || !!editingRow}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddDialogOpen(false);
            setEditingRow(null);
          }
        }}
        processId={processId}
        steps={steps}
        existingRow={editingRow}
        failureModes={failureModes}
        controls={controls}
      />

      {/* View Details Dialog */}
      <Dialog open={!!viewingRow} onOpenChange={(open) => !open && setViewingRow(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>FMEA Template Row Details</DialogTitle>
            <DialogDescription>
              Full details for this failure mode analysis
            </DialogDescription>
          </DialogHeader>
          {viewingRow && (
            <div className="space-y-6">
              {/* Header with AP and ratings */}
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{viewingRow.failureMode}</h3>
                  <p className="text-sm text-muted-foreground">Step: {getStepName(viewingRow.stepId)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">S</p>
                    <RatingBadge value={viewingRow.severity} type="S" />
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">O</p>
                    <RatingBadge value={viewingRow.occurrence} type="O" />
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">D</p>
                    <RatingBadge value={viewingRow.detection} type="D" />
                  </div>
                  <div className="text-center border-l pl-3">
                    <p className="text-xs text-muted-foreground">AP</p>
                    <APBadge ap={viewingRow.ap} />
                  </div>
                </div>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-1">Function</h4>
                  <p>{viewingRow.function}</p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-1">Requirement</h4>
                  <p>{viewingRow.requirement}</p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-1">Effect</h4>
                  <p>{viewingRow.effect}</p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-1">Cause</h4>
                  <p>{viewingRow.cause}</p>
                </div>
              </div>

              {/* Controls */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-2">Prevention Controls</h4>
                  <div className="flex flex-wrap gap-2">
                    {viewingRow.preventionControls?.map((ctrl, idx) => (
                      <Badge key={idx} variant="secondary" className="bg-blue-100">
                        {ctrl}
                      </Badge>
                    ))}
                    {(!viewingRow.preventionControls || viewingRow.preventionControls.length === 0) && (
                      <span className="text-muted-foreground text-sm">None defined</span>
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-2">Detection Controls</h4>
                  <div className="flex flex-wrap gap-2">
                    {viewingRow.detectionControls?.map((ctrl, idx) => (
                      <Badge key={idx} variant="secondary" className="bg-green-100">
                        {ctrl}
                      </Badge>
                    ))}
                    {(!viewingRow.detectionControls || viewingRow.detectionControls.length === 0) && (
                      <span className="text-muted-foreground text-sm">None defined</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Special characteristics */}
              {(viewingRow.specialFlag || viewingRow.csrSymbol) && (
                <div className="p-4 bg-purple-50 rounded-lg">
                  <h4 className="text-sm font-semibold text-purple-700 mb-2 flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Special Characteristics
                  </h4>
                  <div className="flex items-center gap-4">
                    {viewingRow.csrSymbol && (
                      <div className="flex items-center gap-2">
                        <CSRBadge symbol={viewingRow.csrSymbol} />
                        <span className="text-sm">
                          {viewingRow.csrSymbol === "Ⓢ" && "Safety Characteristic"}
                          {viewingRow.csrSymbol === "◆" && "Critical Characteristic"}
                          {viewingRow.csrSymbol === "ⓒ" && "Compliance/Regulatory"}
                        </span>
                      </div>
                    )}
                    {viewingRow.specialFlag && !viewingRow.csrSymbol && (
                      <span className="text-sm text-purple-700">Marked as special characteristic</span>
                    )}
                  </div>
                </div>
              )}

              {/* Notes */}
              {viewingRow.notes && (
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-1">Notes</h4>
                  <p className="text-sm bg-slate-50 p-3 rounded">{viewingRow.notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingRow(null)}>
              Close
            </Button>
            <Button onClick={() => {
              setEditingRow(viewingRow);
              setViewingRow(null);
            }}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingRow} onOpenChange={(open) => !open && setDeletingRow(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete FMEA Template Row?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the failure mode "{deletingRow?.failureMode}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600"
              onClick={() => deletingRow && deleteMutation.mutate(deletingRow.id)}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}