import { useState, useMemo } from "react";
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
  Link,
  Unlink,
  Target,
  Ruler,
  ClipboardCheck,
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
  ControlTemplateRow,
  InsertControlTemplateRow,
} from "@shared/schema";
import ControlTemplateRowDialog from "./ControlTemplateRowDialog";

// CSR Symbol badge component
function CSRBadge({ symbol }: { symbol: string | null }) {
  if (!symbol) return null;
  
  const symbolConfig: Record<string, { label: string; color: string }> = {
    "Ⓢ": { label: "Safety", color: "bg-red-100 text-red-800 border-red-200" },
    "◆": { label: "Critical", color: "bg-orange-100 text-orange-800 border-orange-200" },
    "ⓒ": { label: "Compliance", color: "bg-blue-100 text-blue-800 border-blue-200" },
  };
  
  const config = symbolConfig[symbol] || { label: symbol, color: "bg-gray-100 text-gray-800" };
  
  return (
    <Badge className={`font-bold text-lg px-2 py-0.5 ${config.color}`} variant="outline">
      {symbol}
    </Badge>
  );
}

// Characteristic Type badge
function TypeBadge({ type }: { type: string }) {
  const isProduct = type === "Product";
  return (
    <Badge
      className={`${
        isProduct
          ? "bg-purple-100 text-purple-800 border-purple-200"
          : "bg-teal-100 text-teal-800 border-teal-200"
      }`}
      variant="outline"
    >
      {type}
    </Badge>
  );
}

// Link status indicator
function LinkIndicator({ hasLink }: { hasLink: boolean }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          {hasLink ? (
            <Link className="h-4 w-4 text-green-600" />
          ) : (
            <Unlink className="h-4 w-4 text-gray-400" />
          )}
        </TooltipTrigger>
        <TooltipContent>
          {hasLink ? "Linked to FMEA row" : "Standalone characteristic"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface ControlTemplateBuilderProps {
  processId: string;
  processName: string;
  steps: ProcessStep[];
  fmeaRows: FmeaTemplateRow[];
}

export default function ControlTemplateBuilder({
  processId,
  processName,
  steps,
  fmeaRows,
}: ControlTemplateBuilderProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [specialFilter, setSpecialFilter] = useState<string>("all");
  const [linkedFilter, setLinkedFilter] = useState<string>("all");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  
  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit" | "view">("create");
  const [selectedRow, setSelectedRow] = useState<ControlTemplateRow | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [rowToDelete, setRowToDelete] = useState<ControlTemplateRow | null>(null);
  
  // Fetch control template rows
  const {
    data: controlRows = [],
    isLoading,
    error,
  } = useQuery<ControlTemplateRow[]>({
    queryKey: [`/api/processes/${processId}/control-template-rows`],
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: InsertControlTemplateRow) => {
      const res = await apiRequest("POST", `/api/processes/${processId}/control-template-rows`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/processes/${processId}/control-template-rows`] });
      toast({ title: "Success", description: "Control characteristic created" });
      setDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertControlTemplateRow> }) => {
      const res = await apiRequest("PATCH", `/api/control-template-rows/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/processes/${processId}/control-template-rows`] });
      toast({ title: "Success", description: "Control characteristic updated" });
      setDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/control-template-rows/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/processes/${processId}/control-template-rows`] });
      toast({ title: "Success", description: "Control characteristic deleted" });
      setDeleteDialogOpen(false);
      setRowToDelete(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Duplicate mutation
  const duplicateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/control-template-rows/${id}/duplicate`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/processes/${processId}/control-template-rows`] });
      toast({ title: "Success", description: "Control characteristic duplicated" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Filtered and searched rows
  const filteredRows = useMemo(() => {
    return controlRows.filter((row) => {
      // Search filter
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        row.characteristicName.toLowerCase().includes(searchLower) ||
        row.charId.toLowerCase().includes(searchLower) ||
        (row.target?.toLowerCase().includes(searchLower)) ||
        (row.controlMethod?.toLowerCase().includes(searchLower)) ||
        (row.measurementSystem?.toLowerCase().includes(searchLower));

      // Type filter
      const matchesType = typeFilter === "all" || row.type === typeFilter;

      // Special characteristic filter
      const matchesSpecial =
        specialFilter === "all" ||
        (specialFilter === "special" && row.specialFlag) ||
        (specialFilter === "standard" && !row.specialFlag);

      // Linked filter
      const matchesLinked =
        linkedFilter === "all" ||
        (linkedFilter === "linked" && row.sourceTemplateRowId) ||
        (linkedFilter === "standalone" && !row.sourceTemplateRowId);

      return matchesSearch && matchesType && matchesSpecial && matchesLinked;
    });
  }, [controlRows, searchQuery, typeFilter, specialFilter, linkedFilter]);

  // Summary stats
  const stats = useMemo(() => {
    return {
      total: controlRows.length,
      product: controlRows.filter((r) => r.type === "Product").length,
      process: controlRows.filter((r) => r.type === "Process").length,
      special: controlRows.filter((r) => r.specialFlag).length,
      linked: controlRows.filter((r) => r.sourceTemplateRowId).length,
    };
  }, [controlRows]);

  // Get linked FMEA row for a control row
  const getLinkedFmeaRow = (sourceTemplateRowId: string | null) => {
    if (!sourceTemplateRowId) return null;
    return fmeaRows.find((r) => r.id === sourceTemplateRowId);
  };

  // Get step name for a control row (via linked FMEA row)
  const getStepName = (row: ControlTemplateRow) => {
    const fmeaRow = getLinkedFmeaRow(row.sourceTemplateRowId);
    if (fmeaRow) {
      const step = steps.find((s) => s.id === fmeaRow.stepId);
      return step?.name || "Unknown Step";
    }
    return "—";
  };

  const toggleRowExpanded = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleCreate = () => {
    setSelectedRow(null);
    setDialogMode("create");
    setDialogOpen(true);
  };

  const handleEdit = (row: ControlTemplateRow) => {
    setSelectedRow(row);
    setDialogMode("edit");
    setDialogOpen(true);
  };

  const handleView = (row: ControlTemplateRow) => {
    setSelectedRow(row);
    setDialogMode("view");
    setDialogOpen(true);
  };

  const handleDelete = (row: ControlTemplateRow) => {
    setRowToDelete(row);
    setDeleteDialogOpen(true);
  };

  const handleDuplicate = (row: ControlTemplateRow) => {
    duplicateMutation.mutate(row.id);
  };

  const handleDialogSubmit = (data: InsertControlTemplateRow) => {
    if (dialogMode === "create") {
      createMutation.mutate({
        ...data,
        processDefId: processId,
      });
    } else if (dialogMode === "edit" && selectedRow) {
      updateMutation.mutate({ id: selectedRow.id, data });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <p className="text-lg font-semibold text-destructive">Error loading control templates</p>
          <p className="text-muted-foreground">{(error as Error).message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Characteristics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Target className="h-4 w-4 text-purple-600" />
              Product
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.product}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Ruler className="h-4 w-4 text-teal-600" />
              Process
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-teal-600">{stats.process}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Shield className="h-4 w-4 text-red-600" />
              Special (CSR)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.special}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Link className="h-4 w-4 text-green-600" />
              Linked to FMEA
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.linked}</div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Control Plan Template Characteristics</CardTitle>
              <CardDescription>
                Define control characteristics for {processName}. Link to FMEA rows for traceability.
              </CardDescription>
            </div>
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Add Characteristic
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search characteristics..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Product">Product</SelectItem>
                <SelectItem value="Process">Process</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={specialFilter} onValueChange={setSpecialFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Special" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="special">Special (CSR)</SelectItem>
                <SelectItem value="standard">Standard</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={linkedFilter} onValueChange={setLinkedFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Link Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="linked">Linked to FMEA</SelectItem>
                <SelectItem value="standalone">Standalone</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <ScrollArea className="h-[600px] rounded-md border">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="w-[40px]"></TableHead>
                  <TableHead className="w-[100px]">Char ID</TableHead>
                  <TableHead className="min-w-[200px]">Characteristic Name</TableHead>
                  <TableHead className="w-[80px]">Type</TableHead>
                  <TableHead className="w-[60px]">CSR</TableHead>
                  <TableHead className="w-[60px]">Link</TableHead>
                  <TableHead className="w-[120px]">Target</TableHead>
                  <TableHead className="w-[120px]">Tolerance</TableHead>
                  <TableHead className="w-[150px]">Control Method</TableHead>
                  <TableHead className="w-[120px]">Sample/Freq</TableHead>
                  <TableHead className="w-[100px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="h-32 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <ClipboardCheck className="h-8 w-8" />
                        <p>No control characteristics found</p>
                        {controlRows.length === 0 && (
                          <Button variant="outline" size="sm" onClick={handleCreate}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add your first characteristic
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRows.map((row) => {
                    const isExpanded = expandedRows.has(row.id);
                    const linkedFmea = getLinkedFmeaRow(row.sourceTemplateRowId);
                    
                    return (
                      <>
                        <TableRow
                          key={row.id}
                          className={`group hover:bg-muted/50 ${row.specialFlag ? "bg-red-50/50" : ""}`}
                        >
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => toggleRowExpanded(row.id)}
                            >
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{row.charId}</TableCell>
                          <TableCell>
                            <div className="font-medium">{row.characteristicName}</div>
                            {linkedFmea && (
                              <div className="text-xs text-muted-foreground mt-1">
                                Step: {getStepName(row)}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <TypeBadge type={row.type} />
                          </TableCell>
                          <TableCell>
                            {row.specialFlag && <CSRBadge symbol={row.csrSymbol} />}
                          </TableCell>
                          <TableCell>
                            <LinkIndicator hasLink={!!row.sourceTemplateRowId} />
                          </TableCell>
                          <TableCell className="font-mono text-sm">{row.target || "—"}</TableCell>
                          <TableCell className="font-mono text-sm">{row.tolerance || "—"}</TableCell>
                          <TableCell>
                            <span className="text-sm">{row.controlMethod || "—"}</span>
                          </TableCell>
                          <TableCell className="text-sm">
                            {row.defaultSampleSize && row.defaultFrequency
                              ? `${row.defaultSampleSize} @ ${row.defaultFrequency}`
                              : row.defaultSampleSize || row.defaultFrequency || "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0"
                                      onClick={() => handleView(row)}
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
                                      size="sm"
                                      className="h-8 w-8 p-0"
                                      onClick={() => handleEdit(row)}
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
                                      size="sm"
                                      className="h-8 w-8 p-0"
                                      onClick={() => handleDuplicate(row)}
                                      disabled={duplicateMutation.isPending}
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
                                      size="sm"
                                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                      onClick={() => handleDelete(row)}
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
                        
                        {/* Expanded Details Row */}
                        {isExpanded && (
                          <TableRow className="bg-muted/30">
                            <TableCell colSpan={11}>
                              <div className="py-4 px-6 space-y-4">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                  <div>
                                    <div className="text-xs font-medium text-muted-foreground uppercase mb-1">
                                      Measurement System
                                    </div>
                                    <div className="text-sm">
                                      {row.measurementSystem || "Not specified"}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-xs font-medium text-muted-foreground uppercase mb-1">
                                      Gage Details
                                    </div>
                                    <div className="text-sm">
                                      {row.gageDetails || "Not specified"}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-xs font-medium text-muted-foreground uppercase mb-1">
                                      Sample Size
                                    </div>
                                    <div className="text-sm">
                                      {row.defaultSampleSize || "Not specified"}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-xs font-medium text-muted-foreground uppercase mb-1">
                                      Frequency
                                    </div>
                                    <div className="text-sm">
                                      {row.defaultFrequency || "Not specified"}
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <div className="text-xs font-medium text-muted-foreground uppercase mb-1">
                                      Acceptance Criteria
                                    </div>
                                    <div className="text-sm bg-background p-2 rounded border">
                                      {row.acceptanceCriteria || "Not specified"}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-xs font-medium text-muted-foreground uppercase mb-1">
                                      Reaction Plan
                                    </div>
                                    <div className="text-sm bg-background p-2 rounded border">
                                      {row.reactionPlan || "Not specified"}
                                    </div>
                                  </div>
                                </div>
                                
                                {linkedFmea && (
                                  <div className="border-t pt-4">
                                    <div className="text-xs font-medium text-muted-foreground uppercase mb-2">
                                      Linked FMEA Row
                                    </div>
                                    <div className="bg-background p-3 rounded border">
                                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                        <div>
                                          <span className="font-medium">Failure Mode:</span>{" "}
                                          {linkedFmea.failureMode}
                                        </div>
                                        <div>
                                          <span className="font-medium">Effect:</span>{" "}
                                          {linkedFmea.effect}
                                        </div>
                                        <div>
                                          <span className="font-medium">Cause:</span>{" "}
                                          {linkedFmea.cause}
                                        </div>
                                        <div>
                                          <span className="font-medium">AP:</span>{" "}
                                          <Badge
                                            className={`ml-1 ${
                                              linkedFmea.ap === "H"
                                                ? "bg-red-100 text-red-800"
                                                : linkedFmea.ap === "M"
                                                ? "bg-yellow-100 text-yellow-800"
                                                : "bg-green-100 text-green-800"
                                            }`}
                                            variant="outline"
                                          >
                                            {linkedFmea.ap}
                                          </Badge>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    );
                  })
                )}
              </TableBody>
            </Table>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
          
          {/* Results count */}
          <div className="text-sm text-muted-foreground mt-4">
            Showing {filteredRows.length} of {controlRows.length} characteristics
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <ControlTemplateRowDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={dialogMode}
        row={selectedRow}
        processId={processId}
        fmeaRows={fmeaRows}
        steps={steps}
        onSubmit={handleDialogSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Control Characteristic</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the characteristic "{rowToDelete?.characteristicName}"
              (ID: {rowToDelete?.charId})? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => rowToDelete && deleteMutation.mutate(rowToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}