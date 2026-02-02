import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import DataTableToolbar, { ActiveFilters, FilterConfig } from "@/components/DataTableToolbar";
import ImportWizard from '@/components/ImportWizard';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Search,
  Plus,
  Package,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
  Factory,
  Users,
  FileText,
  ClipboardList,
  Wand2,
  ChevronRight,
  Sparkles,
  Loader2,
  CheckCircle,
  Upload,
} from "lucide-react";
import type { ProcessDef } from "@shared/schema";
import type { Part, InsertPart } from "@shared/schema";

// Common customers for automotive
const CUSTOMERS = [
  "BMW",
  "EOS",
  "Ford",
  "GM",
  "Honda",
  "Kautex",
  "Magna",
  "Mercedes-Benz",
  "Stellantis",
  "Tesla",
  "Toyota",
  "Volkswagen",
  "Other",
];

const PLANTS = [
  "Fraser",
  "Detroit",
  "Toledo",
  "Louisville",
  "Spring Hill",
  "Fremont",
  "Other",
];

function ViewDetailsButton({ partId }: { partId: string }) {
  const [, navigate] = useLocation();
  return (
    <Button
      variant="ghost"
      size="sm"
      data-testid={`button-view-${partId}`}
      onClick={() => navigate(`/parts/${partId}`)}
    >
      <Eye className="h-4 w-4 mr-1" />
      View
    </Button>
  );
}

export default function PartsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [, navigate] = useLocation();

  // State
  const [filters, setFilters] = useState<ActiveFilters>({ search: '' });
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [importWizardOpen, setImportWizardOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<Part | null>(null);
  const [deletePartId, setDeletePartId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<InsertPart>>({});

  // Generation state
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [selectedPartForGeneration, setSelectedPartForGeneration] = useState<Part | null>(null);
  const [selectedProcessIds, setSelectedProcessIds] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState<any>(null);

  // Fetch parts
  const { data: parts = [], isLoading } = useQuery<Part[]>({
    queryKey: ["/api/parts"],
  });

  // Fetch processes for generation modal
  const { data: processes = [] } = useQuery<ProcessDef[]>({
    queryKey: ["/api/processes"],
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: InsertPart) => {
      const response = await fetch("/api/parts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create part");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parts"] });
      toast({
        title: "Part Created",
        description: "The part has been created successfully.",
      });
      setCreateDialogOpen(false);
      setFormData({});
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertPart> }) => {
      const response = await fetch(`/api/parts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update part");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parts"] });
      toast({
        title: "Part Updated",
        description: "The part has been updated successfully.",
      });
      setEditingPart(null);
      setFormData({});
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update part. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/parts/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete part");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      toast({
        title: "Part Deleted",
        description: "The part has been deleted successfully.",
      });
      setDeletePartId(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete part. It may have associated documents.",
        variant: "destructive",
      });
    },
  });

  // Filter configuration
  const filterConfig: FilterConfig[] = useMemo(() => [
    {
      key: 'customer',
      label: 'Customer',
      type: 'select',
      options: Array.from(new Set(parts?.map(p => p.customer) || [])).map(c => ({ value: c, label: c })),
    },
    {
      key: 'program',
      label: 'Program',
      type: 'select',
      options: Array.from(new Set(parts?.map(p => p.program).filter(Boolean) || [])).map(p => ({ value: p!, label: p! })),
    },
    {
      key: 'plant',
      label: 'Plant',
      type: 'select',
      options: Array.from(new Set(parts?.map(p => p.plant) || [])).map(p => ({ value: p, label: p })),
    },
  ], [parts]);

  // Filter parts
  const filteredParts = useMemo(() => {
    if (!parts) return [];
    
    return parts.filter(part => {
      // Search filter
      if (filters.search) {
        const search = filters.search.toLowerCase();
        const matches = 
          part.partNumber.toLowerCase().includes(search) ||
          part.partName.toLowerCase().includes(search) ||
          part.customer.toLowerCase().includes(search) ||
          (part.program?.toLowerCase().includes(search) || false);
        if (!matches) return false;
      }
      
      // Customer filter
      if (filters.customer && part.customer !== filters.customer) return false;
      
      // Program filter
      if (filters.program && part.program !== filters.program) return false;
      
      // Plant filter
      if (filters.plant && part.plant !== filters.plant) return false;
      
      return true;
    });
  }, [parts, filters]);

  // Get unique values for filters
  const uniqueCustomers = Array.from(new Set(parts.map((p) => p.customer)));
  const uniquePlants = Array.from(new Set(parts.map((p) => p.plant)));

  // Summary stats
  const stats = {
    total: parts.length,
    customers: uniqueCustomers.length,
    plants: uniquePlants.length,
  };

  // Open edit dialog
  const openEditDialog = (part: Part) => {
    setEditingPart(part);
    setFormData({
      customer: part.customer,
      program: part.program,
      partNumber: part.partNumber,
      partName: part.partName,
      plant: part.plant,
      csrNotes: part.csrNotes,
    });
  };

  // Handle document generation
  const handleGenerate = async () => {
    if (!selectedPartForGeneration || selectedProcessIds.length === 0) return;

    setIsGenerating(true);
    try {
      const response = await fetch(`/api/parts/${selectedPartForGeneration.id}/generate-documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ processIds: selectedProcessIds }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Generation failed');
      }

      const result = await response.json();
      setGenerationResult(result);

      queryClient.invalidateQueries({ queryKey: ['/api/pfmeas'] });
      queryClient.invalidateQueries({ queryKey: ['/api/control-plans'] });

    } catch (error: any) {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle form submit
  const handleSubmit = () => {
    if (!formData.partNumber || !formData.partName || !formData.customer || !formData.plant) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    if (editingPart) {
      updateMutation.mutate({ id: editingPart.id, data: formData });
    } else {
      createMutation.mutate(formData as InsertPart);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Parts</h1>
          <p className="text-muted-foreground">
            Manage parts and generate quality documents
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setImportWizardOpen(true)} data-testid="button-import-excel">
            <Upload className="h-4 w-4 mr-2" />
            Import Excel
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)} data-testid="button-add-part">
            <Plus className="h-4 w-4 mr-2" />
            Add Part
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Parts</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Package className="h-5 w-5 text-muted-foreground" />
              {stats.total}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Customers</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              {stats.customers}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Plants</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Factory className="h-5 w-5 text-muted-foreground" />
              {stats.plants}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <DataTableToolbar
            searchPlaceholder="Search parts..."
            filters={filterConfig}
            activeFilters={filters}
            onFiltersChange={setFilters}
            resultCount={filteredParts.length}
          />
        </CardContent>
      </Card>

      {/* Parts Table */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredParts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No Parts Found</h3>
              <p className="text-muted-foreground mb-4">
                {filters.search || filters.customer || filters.program || filters.plant
                  ? "Try adjusting your filters"
                  : "Add your first part to get started"}
              </p>
              {!filters.search && !filters.customer && !filters.program && !filters.plant && (
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Part
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Part Number</TableHead>
                  <TableHead>Part Name</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Program</TableHead>
                  <TableHead>Plant</TableHead>
                  <TableHead>Documents</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredParts.map((part) => (
                  <TableRow key={part.id} className="group">
                    <TableCell>
                      <button 
                        className="font-mono font-medium text-primary hover:underline cursor-pointer bg-transparent border-none p-0"
                        onClick={() => navigate(`/parts/${part.id}`)}
                        data-testid={`link-part-${part.id}`}
                      >
                        {part.partNumber}
                      </button>
                    </TableCell>
                    <TableCell>{part.partName}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{part.customer}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {part.program || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{part.plant}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Badge variant="outline" className="text-xs">
                          <FileText className="h-3 w-3 mr-1" />
                          PFMEA
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          <ClipboardList className="h-3 w-3 mr-1" />
                          CP
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          data-testid={`button-generate-${part.id}`}
                          onClick={() => {
                            setSelectedPartForGeneration(part);
                            setSelectedProcessIds([]);
                            setGenerationResult(null);
                            setGenerateModalOpen(true);
                          }}
                        >
                          <Sparkles className="h-4 w-4 mr-1" />
                          Generate
                        </Button>
                        <ViewDetailsButton partId={part.id} />
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/parts/${part.id}`}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEditDialog(part)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => setDeletePartId(part.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog
        open={createDialogOpen || !!editingPart}
        onOpenChange={(open) => {
          if (!open) {
            setCreateDialogOpen(false);
            setEditingPart(null);
            setFormData({});
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingPart ? "Edit Part" : "Add New Part"}</DialogTitle>
            <DialogDescription>
              {editingPart
                ? "Update the part information below."
                : "Enter the part details to add it to the system."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Part Number *</Label>
              <Input
                value={formData.partNumber || ""}
                onChange={(e) =>
                  setFormData({ ...formData, partNumber: e.target.value })
                }
                placeholder="e.g., 3004-XYZ"
              />
            </div>

            <div className="space-y-2">
              <Label>Part Name *</Label>
              <Input
                value={formData.partName || ""}
                onChange={(e) =>
                  setFormData({ ...formData, partName: e.target.value })
                }
                placeholder="e.g., Stiffener Assembly"
              />
            </div>

            <div className="space-y-2">
              <Label>Customer *</Label>
              <Select
                value={formData.customer || ""}
                onValueChange={(v) => setFormData({ ...formData, customer: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {CUSTOMERS.map((customer) => (
                    <SelectItem key={customer} value={customer}>
                      {customer}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Program</Label>
              <Input
                value={formData.program || ""}
                onChange={(e) =>
                  setFormData({ ...formData, program: e.target.value })
                }
                placeholder="e.g., EOS, F-150"
              />
            </div>

            <div className="space-y-2">
              <Label>Plant *</Label>
              <Select
                value={formData.plant || ""}
                onValueChange={(v) => setFormData({ ...formData, plant: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select plant" />
                </SelectTrigger>
                <SelectContent>
                  {PLANTS.map((plant) => (
                    <SelectItem key={plant} value={plant}>
                      {plant}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2 space-y-2">
              <Label>CSR Notes</Label>
              <Textarea
                value={formData.csrNotes || ""}
                onChange={(e) =>
                  setFormData({ ...formData, csrNotes: e.target.value })
                }
                placeholder="Special characteristic requirements, customer-specific notes..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateDialogOpen(false);
                setEditingPart(null);
                setFormData({});
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : editingPart ? (
                "Update Part"
              ) : (
                "Create Part"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deletePartId}
        onOpenChange={(open) => !open && setDeletePartId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Part?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the part and may affect associated
              documents. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deletePartId && deleteMutation.mutate(deletePartId)}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Generate Documents Modal */}
      <Dialog open={generateModalOpen} onOpenChange={setGenerateModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Generate Documents for {selectedPartForGeneration?.partName}</DialogTitle>
            <DialogDescription>
              Select processes to include in PFD, PFMEA, and Control Plan generation.
              Part: {selectedPartForGeneration?.partNumber}
            </DialogDescription>
          </DialogHeader>

          {!generationResult ? (
            <>
              <div className="space-y-4 py-4">
                <Label>Select Processes (in sequence order)</Label>
                <div className="border rounded-md max-h-64 overflow-y-auto p-2 space-y-2">
                  {processes?.filter((p) => p.status === 'effective').map((process) => (
                    <div key={process.id} className="flex items-center space-x-2 p-2 hover-elevate rounded">
                      <Checkbox
                        id={process.id}
                        checked={selectedProcessIds.includes(process.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedProcessIds([...selectedProcessIds, process.id]);
                          } else {
                            setSelectedProcessIds(selectedProcessIds.filter((id) => id !== process.id));
                          }
                        }}
                      />
                      <label htmlFor={process.id} className="flex-1 cursor-pointer">
                        <span className="font-medium">{process.name}</span>
                        <span className="text-muted-foreground ml-2">Rev {process.rev}</span>
                      </label>
                    </div>
                  ))}
                  {processes?.filter((p) => p.status === 'effective').length === 0 && (
                    <p className="text-muted-foreground text-sm p-2">
                      No effective processes available. Create and approve processes first.
                    </p>
                  )}
                </div>
                {selectedProcessIds.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {selectedProcessIds.length} process(es) selected
                  </p>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setGenerateModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleGenerate}
                  disabled={selectedProcessIds.length === 0 || isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate PFMEA & Control Plan
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <div className="space-y-4 py-4">
                <Alert className="bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <AlertTitle className="text-green-800 dark:text-green-200">Generation Complete!</AlertTitle>
                  <AlertDescription className="text-green-700 dark:text-green-300">
                    Successfully created documents for {selectedPartForGeneration?.partName}
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">PFMEA</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1 text-sm">
                        <p><strong>Total Rows:</strong> {generationResult.pfmea?.summary?.totalRows ?? 0}</p>
                        <p><strong>High AP:</strong> <span className="text-red-600">{generationResult.pfmea?.summary?.highAP ?? 0}</span></p>
                        <p><strong>Medium AP:</strong> <span className="text-yellow-600">{generationResult.pfmea?.summary?.mediumAP ?? 0}</span></p>
                        <p><strong>Low AP:</strong> <span className="text-green-600">{generationResult.pfmea?.summary?.lowAP ?? 0}</span></p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Control Plan</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1 text-sm">
                        <p><strong>Total Characteristics:</strong> {generationResult.controlPlan?.summary?.totalRows ?? 0}</p>
                        <p><strong>Special Chars:</strong> {generationResult.controlPlan?.summary?.specialCharacteristics ?? 0}</p>
                        <p><strong>Linked to PFMEA:</strong> {generationResult.controlPlan?.summary?.linkedToPfmea ?? 0}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setGenerateModalOpen(false)}>
                  Close
                </Button>
                <Button onClick={() => navigate(`/pfmea/${generationResult.pfmea?.pfmea?.id}`)}>
                  View PFMEA
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ImportWizard
        open={importWizardOpen}
        onOpenChange={setImportWizardOpen}
        onImportComplete={() => {
          queryClient.invalidateQueries({ queryKey: ['/api/parts'] });
          setImportWizardOpen(false);
        }}
      />
    </div>
  );
}