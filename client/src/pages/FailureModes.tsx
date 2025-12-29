import { useState, useEffect } from "react";
import { Library, Plus, Search, Eye, Pencil, Trash2, Loader2, Filter } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { FailureModesLibrary, InsertFailureModesLibrary, FailureModeCategory } from "@shared/schema";
import { insertFailureModesLibrarySchema } from "@shared/schema";
import { z } from "zod";

const CATEGORIES: { value: FailureModeCategory; label: string }[] = [
  { value: 'dimensional', label: 'Dimensional' },
  { value: 'visual', label: 'Visual' },
  { value: 'functional', label: 'Functional' },
  { value: 'assembly', label: 'Assembly' },
  { value: 'material', label: 'Material' },
  { value: 'process', label: 'Process' },
  { value: 'contamination', label: 'Contamination' },
  { value: 'environmental', label: 'Environmental' },
];

const CATEGORY_COLORS: Record<FailureModeCategory, string> = {
  dimensional: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  visual: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  functional: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  assembly: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  material: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  process: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  contamination: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  environmental: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
};

function FailureModeFormDialog({ 
  failureMode, 
  open, 
  onOpenChange 
}: { 
  failureMode?: FailureModesLibrary; 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const isEditing = !!failureMode;
  const [causesText, setCausesText] = useState("");
  const [processesText, setProcessesText] = useState("");
  const [tagsText, setTagsText] = useState("");

  const form = useForm<InsertFailureModesLibrary>({
    resolver: zodResolver(insertFailureModesLibrarySchema),
    defaultValues: {
      category: 'dimensional',
      failureMode: "",
      genericEffect: "",
      typicalCauses: [],
      applicableProcesses: [],
      defaultSeverity: undefined,
      defaultOccurrence: undefined,
      tags: [],
      industryStandard: "",
      status: "active",
    },
  });

  useEffect(() => {
    if (failureMode && open) {
      form.reset({
        category: failureMode.category,
        failureMode: failureMode.failureMode,
        genericEffect: failureMode.genericEffect,
        typicalCauses: failureMode.typicalCauses || [],
        applicableProcesses: failureMode.applicableProcesses || [],
        defaultSeverity: failureMode.defaultSeverity || undefined,
        defaultOccurrence: failureMode.defaultOccurrence || undefined,
        tags: failureMode.tags || [],
        industryStandard: failureMode.industryStandard || "",
        status: failureMode.status || "active",
      });
      setCausesText((failureMode.typicalCauses || []).join("\n"));
      setProcessesText((failureMode.applicableProcesses || []).join(", "));
      setTagsText((failureMode.tags || []).join(", "));
    } else if (!open) {
      form.reset({
        category: 'dimensional',
        failureMode: "",
        genericEffect: "",
        typicalCauses: [],
        applicableProcesses: [],
        defaultSeverity: undefined,
        defaultOccurrence: undefined,
        tags: [],
        industryStandard: "",
        status: "active",
      });
      setCausesText("");
      setProcessesText("");
      setTagsText("");
    }
  }, [failureMode, open, form]);

  const mutation = useMutation({
    mutationFn: async (data: InsertFailureModesLibrary) => {
      const url = isEditing ? `/api/failure-modes/${failureMode.id}` : "/api/failure-modes";
      const method = isEditing ? "PATCH" : "POST";
      const res = await apiRequest(method, url, data);
      return await res.json() as FailureModesLibrary;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/failure-modes"] });
      toast({
        title: isEditing ? "Failure mode updated" : "Failure mode created",
        description: `The failure mode has been successfully ${isEditing ? "updated" : "created"}.`,
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || `Failed to ${isEditing ? "update" : "create"} failure mode`,
      });
    },
  });

  const onSubmit = (data: InsertFailureModesLibrary) => {
    const processedData = {
      ...data,
      typicalCauses: causesText.split("\n").map(s => s.trim()).filter(Boolean),
      applicableProcesses: processesText.split(",").map(s => s.trim()).filter(Boolean),
      tags: tagsText.split(",").map(s => s.trim()).filter(Boolean),
    };
    mutation.mutate(processedData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Failure Mode" : "Create New Failure Mode"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update failure mode details." : "Add a new failure mode to the catalog."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-fm-category">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CATEGORIES.map(cat => (
                          <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || "active"}>
                      <FormControl>
                        <SelectTrigger data-testid="select-fm-status">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="deprecated">Deprecated</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="failureMode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Failure Mode</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Short shot" {...field} data-testid="input-failure-mode" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="genericEffect"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Generic Effect</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe the generic effect of this failure mode" 
                      {...field} 
                      data-testid="input-generic-effect"
                      rows={2}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormItem>
              <FormLabel>Typical Causes (one per line)</FormLabel>
              <Textarea 
                placeholder="Enter typical causes, one per line"
                value={causesText}
                onChange={(e) => setCausesText(e.target.value)}
                data-testid="input-typical-causes"
                rows={4}
              />
            </FormItem>

            <FormItem>
              <FormLabel>Applicable Processes (comma-separated)</FormLabel>
              <Input 
                placeholder="e.g., Injection Molding, Insert Molding, Overmolding"
                value={processesText}
                onChange={(e) => setProcessesText(e.target.value)}
                data-testid="input-applicable-processes"
              />
            </FormItem>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="defaultSeverity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Severity (1-10)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min={1} 
                        max={10}
                        placeholder="e.g., 8"
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        data-testid="input-default-severity"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="defaultOccurrence"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Occurrence (1-10)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min={1} 
                        max={10}
                        placeholder="e.g., 4"
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        data-testid="input-default-occurrence"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="industryStandard"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Industry Standard</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., AIAG-VDA 2019"
                        {...field}
                        value={field.value || ""}
                        data-testid="input-industry-standard"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormItem>
                <FormLabel>Tags (comma-separated)</FormLabel>
                <Input 
                  placeholder="e.g., molding, critical, dimensional"
                  value={tagsText}
                  onChange={(e) => setTagsText(e.target.value)}
                  data-testid="input-tags"
                />
              </FormItem>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending} data-testid="button-save-fm">
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function FailureModeDetailsDialog({ 
  failureMode, 
  open, 
  onOpenChange 
}: { 
  failureMode: FailureModesLibrary | null; 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
}) {
  if (!failureMode) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Badge className={CATEGORY_COLORS[failureMode.category]}>
              {failureMode.category}
            </Badge>
            {failureMode.failureMode}
          </DialogTitle>
          <DialogDescription>
            Failure Mode Details
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-1">Generic Effect</h4>
            <p className="text-sm">{failureMode.genericEffect}</p>
          </div>

          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-1">Typical Causes</h4>
            <ul className="list-disc list-inside text-sm space-y-1">
              {(failureMode.typicalCauses || []).map((cause, idx) => (
                <li key={idx}>{cause}</li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-1">Applicable Processes</h4>
            <div className="flex flex-wrap gap-1">
              {(failureMode.applicableProcesses || []).map((process, idx) => (
                <Badge key={idx} variant="outline">{process}</Badge>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">Default Severity</h4>
              <p className="text-sm">{failureMode.defaultSeverity || "-"}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">Default Occurrence</h4>
              <p className="text-sm">{failureMode.defaultOccurrence || "-"}</p>
            </div>
          </div>

          {failureMode.industryStandard && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">Industry Standard</h4>
              <p className="text-sm">{failureMode.industryStandard}</p>
            </div>
          )}

          {failureMode.tags && failureMode.tags.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">Tags</h4>
              <div className="flex flex-wrap gap-1">
                {failureMode.tags.map((tag, idx) => (
                  <Badge key={idx} variant="secondary">{tag}</Badge>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
            <div>
              <span>Status: </span>
              <Badge variant={failureMode.status === 'active' ? 'default' : 'secondary'}>
                {failureMode.status}
              </Badge>
            </div>
            {failureMode.lastUsed && (
              <div>Last Used: {new Date(failureMode.lastUsed).toLocaleDateString()}</div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function FailureModes() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingFailureMode, setEditingFailureMode] = useState<FailureModesLibrary | undefined>();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewingFailureMode, setViewingFailureMode] = useState<FailureModesLibrary | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  const { data: failureModes = [], isLoading, error } = useQuery<FailureModesLibrary[]>({
    queryKey: ["/api/failure-modes", categoryFilter !== "all" ? categoryFilter : null, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (categoryFilter !== "all") params.append("category", categoryFilter);
      if (searchQuery) params.append("search", searchQuery);
      const url = `/api/failure-modes${params.toString() ? `?${params}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch failure modes");
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/failure-modes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/failure-modes"] });
      toast({
        title: "Failure mode deleted",
        description: "The failure mode has been removed from the catalog.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete failure mode",
      });
    },
  });

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this failure mode?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleEdit = (fm: FailureModesLibrary) => {
    setEditingFailureMode(fm);
    setEditDialogOpen(true);
  };

  const handleView = (fm: FailureModesLibrary) => {
    setViewingFailureMode(fm);
    setViewDialogOpen(true);
  };

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-destructive">Error loading failure modes: {(error as Error).message}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Library className="h-6 w-6" />
            Failure Modes Library
          </h1>
          <p className="text-muted-foreground">
            Standardized failure modes catalog for PFMEA analysis
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} data-testid="button-add-failure-mode">
          <Plus className="mr-2 h-4 w-4" />
          Add Failure Mode
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search failure modes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-fm"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-filter-category">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" data-testid="filter-option-all">All Categories</SelectItem>
                {CATEGORIES.map(cat => (
                  <SelectItem key={cat.value} value={cat.value} data-testid={`filter-option-${cat.value}`}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : failureModes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery || categoryFilter !== "all" 
                ? "No failure modes match your filters."
                : "No failure modes in the catalog. Add one to get started."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Failure Mode</TableHead>
                  <TableHead className="hidden md:table-cell">Generic Effect</TableHead>
                  <TableHead className="hidden lg:table-cell">S/O</TableHead>
                  <TableHead className="hidden lg:table-cell">Tags</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {failureModes.map((fm) => (
                  <TableRow key={fm.id} data-testid={`row-fm-${fm.id}`}>
                    <TableCell>
                      <Badge className={CATEGORY_COLORS[fm.category]}>
                        {fm.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{fm.failureMode}</TableCell>
                    <TableCell className="hidden md:table-cell max-w-xs truncate">
                      {fm.genericEffect}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {fm.defaultSeverity && fm.defaultOccurrence 
                        ? `${fm.defaultSeverity}/${fm.defaultOccurrence}` 
                        : "-"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {(fm.tags || []).slice(0, 2).map((tag, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">{tag}</Badge>
                        ))}
                        {(fm.tags || []).length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{fm.tags!.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleView(fm)}
                          data-testid={`button-view-fm-${fm.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(fm)}
                          data-testid={`button-edit-fm-${fm.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(fm.id)}
                          data-testid={`button-delete-fm-${fm.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <FailureModeFormDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

      <FailureModeFormDialog
        failureMode={editingFailureMode}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />

      <FailureModeDetailsDialog
        failureMode={viewingFailureMode}
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
      />
    </div>
  );
}
