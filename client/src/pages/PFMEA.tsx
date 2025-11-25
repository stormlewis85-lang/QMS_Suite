import { useState, useEffect } from "react";
import { FileText, Plus, Loader2, ChevronLeft, AlertTriangle, Library, Search, Filter } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm, UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge, APBadge } from "@/components/StatusBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Part, PFMEA, PFMEARow, InsertPFMEA, FailureModesLibrary, FailureModeCategory } from "@shared/schema";
import { insertPfmeaSchema } from "@shared/schema";

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

function BrowseCatalogDialog({
  open,
  onOpenChange,
  onAdopt,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdopt: (failureMode: FailureModesLibrary) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const { data: failureModes = [], isLoading } = useQuery<FailureModesLibrary[]>({
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
    enabled: open,
  });

  const handleAdopt = (fm: FailureModesLibrary) => {
    onAdopt(fm);
    onOpenChange(false);
    apiRequest("POST", `/api/failure-modes/${fm.id}/adopt`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Library className="h-5 w-5" />
            Browse Failure Modes Catalog
          </DialogTitle>
          <DialogDescription>
            Select a failure mode from the catalog to auto-fill FMEA row fields
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search failure modes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="catalog-search"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]" data-testid="catalog-category-filter">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" data-testid="catalog-filter-all">All Categories</SelectItem>
              {CATEGORIES.map(cat => (
                <SelectItem key={cat.value} value={cat.value} data-testid={`catalog-filter-${cat.value}`}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-y-auto max-h-[50vh] border rounded-md">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : failureModes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No failure modes match your search.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Failure Mode</TableHead>
                  <TableHead className="hidden md:table-cell">Effect</TableHead>
                  <TableHead className="hidden lg:table-cell">S/O</TableHead>
                  <TableHead className="w-[100px]">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {failureModes.map((fm) => (
                  <TableRow key={fm.id} data-testid={`catalog-row-${fm.id}`}>
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
                    <TableCell>
                      <Button
                        size="sm"
                        onClick={() => handleAdopt(fm)}
                        data-testid={`button-adopt-${fm.id}`}
                      >
                        Adopt
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

type PFMEAWithRows = PFMEA & { rows: PFMEARow[] };

const pfmeaRowFormSchema = z.object({
  stepRef: z.string().min(1, "Step reference is required"),
  function: z.string().min(1, "Function is required"),
  requirement: z.string().min(1, "Requirement is required"),
  failureMode: z.string().min(1, "Failure mode is required"),
  effect: z.string().min(1, "Effect is required"),
  severity: z.coerce.number().min(1).max(10, "Severity must be 1-10"),
  cause: z.string().min(1, "Cause is required"),
  occurrence: z.coerce.number().min(1).max(10, "Occurrence must be 1-10"),
  detection: z.coerce.number().min(1).max(10, "Detection must be 1-10"),
  specialFlag: z.boolean().default(false),
  csrSymbol: z.string().optional(),
  notes: z.string().optional(),
});

type PFMEARowFormValues = z.infer<typeof pfmeaRowFormSchema>;

function PFMEARowDialog({
  open,
  onOpenChange,
  pfmeaId,
  row,
  onOpenCatalog,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pfmeaId: string;
  row?: PFMEARow;
  onOpenCatalog: (formSetter: (fm: FailureModesLibrary) => void) => void;
}) {
  const { toast } = useToast();
  const isEdit = !!row;

  const form = useForm<PFMEARowFormValues>({
    resolver: zodResolver(pfmeaRowFormSchema),
    defaultValues: {
      stepRef: row?.stepRef || "",
      function: row?.function || "",
      requirement: row?.requirement || "",
      failureMode: row?.failureMode || "",
      effect: row?.effect || "",
      severity: row?.severity || 5,
      cause: row?.cause || "",
      occurrence: row?.occurrence || 5,
      detection: row?.detection || 5,
      specialFlag: row?.specialFlag || false,
      csrSymbol: row?.csrSymbol || "",
      notes: row?.notes || "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: PFMEARowFormValues) => {
      const severity = Number(values.severity);
      const occurrence = Number(values.occurrence);
      const detection = Number(values.detection);
      const ap = String(severity * (occurrence + detection));

      return apiRequest("POST", `/api/pfmea/${pfmeaId}/rows`, {
        ...values,
        pfmeaId,
        preventionControls: [],
        detectionControls: [],
        ap,
        overrideFlags: {},
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pfmea", pfmeaId, "detail"] });
      toast({ title: "FMEA row created successfully" });
      form.reset();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create FMEA row", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (values: PFMEARowFormValues) => {
      const severity = Number(values.severity);
      const occurrence = Number(values.occurrence);
      const detection = Number(values.detection);
      const ap = String(severity * (occurrence + detection));

      return apiRequest("PATCH", `/api/pfmea-rows/${row!.id}`, {
        ...values,
        ap,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pfmea", pfmeaId, "detail"] });
      toast({ title: "FMEA row updated successfully" });
      form.reset();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update FMEA row", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (values: PFMEARowFormValues) => {
    if (isEdit) {
      updateMutation.mutate(values);
    } else {
      createMutation.mutate(values);
    }
  };

  const watchedValues = form.watch(["severity", "occurrence", "detection"]);
  const calculatedAP = Number(watchedValues[0]) * (Number(watchedValues[1]) + Number(watchedValues[2]));

  const handleOpenCatalog = () => {
    const formSetter = (fm: FailureModesLibrary) => {
      form.setValue("failureMode", fm.failureMode);
      form.setValue("effect", fm.genericEffect);
      form.setValue("cause", (fm.typicalCauses || []).join("; "));
      if (fm.defaultSeverity) form.setValue("severity", fm.defaultSeverity);
      if (fm.defaultOccurrence) form.setValue("occurrence", fm.defaultOccurrence);
      toast({
        title: "Failure mode adopted",
        description: `"${fm.failureMode}" has been applied to the form.`,
      });
    };
    onOpenCatalog(formSetter);
  };

  useEffect(() => {
    if (open && row) {
      form.reset({
        stepRef: row.stepRef,
        function: row.function,
        requirement: row.requirement,
        failureMode: row.failureMode,
        effect: row.effect,
        severity: row.severity,
        cause: row.cause,
        occurrence: row.occurrence,
        detection: row.detection,
        specialFlag: row.specialFlag || false,
        csrSymbol: row.csrSymbol || "",
        notes: row.notes || "",
      });
    } else if (open && !row) {
      form.reset({
        stepRef: "",
        function: "",
        requirement: "",
        failureMode: "",
        effect: "",
        severity: 5,
        cause: "",
        occurrence: 5,
        detection: 5,
        specialFlag: false,
        csrSymbol: "",
        notes: "",
      });
    }
  }, [open, row, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit" : "Add"} FMEA Row</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="stepRef"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Step Reference</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., 10" data-testid="input-step-ref" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="requirement"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Requirement</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., Material specification" data-testid="input-requirement" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="function"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Process Function</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Describe what the process is supposed to do..." data-testid="input-function" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="failureMode"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Failure Mode</FormLabel>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleOpenCatalog}
                      data-testid="button-browse-catalog"
                    >
                      <Library className="h-4 w-4 mr-1" />
                      Browse Catalog
                    </Button>
                  </div>
                  <FormControl>
                    <Textarea {...field} placeholder="How might the process fail to perform this function?" data-testid="input-failure-mode" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="effect"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Effect of Failure</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="What is the impact if this failure occurs?" data-testid="input-effect" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="severity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Severity (1-10)</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" min="1" max="10" data-testid="input-severity" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cause"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cause of Failure</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="What causes this failure mode?" data-testid="input-cause" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="occurrence"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Occurrence (1-10)</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" min="1" max="10" data-testid="input-occurrence" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="detection"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Detection (1-10)</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" min="1" max="10" data-testid="input-detection" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="rounded-md border p-4 bg-muted/20">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Calculated Action Priority (AP):</span>
                <APBadge level={getAPLevel(String(calculatedAP))} value={calculatedAP} />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                AP = Severity × (Occurrence + Detection) = {watchedValues[0]} × ({watchedValues[1]} + {watchedValues[2]}) = {calculatedAP}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="csrSymbol"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CSR Symbol (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., Ⓢ, ◆, ⓒ" data-testid="input-csr-symbol" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Additional notes..." data-testid="input-notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel">
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-row">
                {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isEdit ? "Update" : "Create"} Row
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

const generatePfmeaFormSchema = insertPfmeaSchema
  .pick({ rev: true, basis: true, docNo: true })
  .extend({
    rev: z.string().min(1, "Revision is required"),
  });

type GeneratePFMEAFormValues = z.infer<typeof generatePfmeaFormSchema>;

function GeneratePFMEADialog({
  open,
  onOpenChange,
  partId,
  existingPfmeas,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partId: string;
  existingPfmeas: PFMEA[];
}) {
  const { toast } = useToast();
  const form = useForm<GeneratePFMEAFormValues>({
    resolver: zodResolver(generatePfmeaFormSchema),
    defaultValues: {
      rev: "A",
      basis: "",
      docNo: "",
    },
  });

  // Close dialog if part changes while dialog is open (prevents stale data)
  useEffect(() => {
    if (open) {
      onOpenChange(false);
    }
  }, [partId]);

  const createMutation = useMutation({
    mutationFn: async (values: GeneratePFMEAFormValues) => {
      const payload: InsertPFMEA = {
        partId,
        rev: values.rev,
        status: "draft",
        basis: values.basis || null,
        docNo: values.docNo || null,
        approvedBy: null,
        approvedAt: null,
        effectiveFrom: null,
        supersedesId: null,
      };
      return await apiRequest<PFMEA>("POST", "/api/pfmea", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pfmea", partId] });
      toast({ title: "PFMEA created successfully" });
      form.reset({ rev: "A", basis: "", docNo: "" });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to create PFMEA", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  const onSubmit = (values: GeneratePFMEAFormValues) => {
    // Check for duplicate revision before calling API
    const duplicate = existingPfmeas.find(p => p.rev === values.rev);
    if (duplicate) {
      toast({ 
        title: "Duplicate revision", 
        description: `PFMEA with revision ${values.rev} already exists for this part. Please use a different revision.`,
        variant: "destructive" 
      });
      return;
    }
    createMutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate New PFMEA</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="rev"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Revision</FormLabel>
                  <FormControl>
                    <Input placeholder="A" {...field} data-testid="input-pfmea-rev" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="docNo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Document Number (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="PFMEA-001" {...field} data-testid="input-pfmea-docno" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="basis"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Basis (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Describe the basis for this PFMEA..." {...field} data-testid="input-pfmea-basis" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel">
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending} data-testid="button-create-pfmea">
                {createMutation.isPending ? "Creating..." : "Create PFMEA"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function PFMEA() {
  const urlParams = new URLSearchParams(window.location.search);
  const partIdFromUrl = urlParams.get("partId");
  const [selectedPartId, setSelectedPartId] = useState<string | null>(partIdFromUrl);
  const [selectedPfmeaId, setSelectedPfmeaId] = useState<string | null>(null);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: parts = [], isLoading: partsLoading } = useQuery<Part[]>({
    queryKey: ["/api/parts"],
  });

  const handleGeneratePFMEA = () => {
    if (!selectedPartId) {
      toast({
        variant: "destructive",
        title: "No part selected",
        description: "Please select a part first to generate a PFMEA.",
      });
      return;
    }
    setGenerateDialogOpen(true);
  };

  const { data: pfmeas = [], isLoading: pfmeasLoading } = useQuery<PFMEA[]>({
    queryKey: ["/api/pfmea", selectedPartId],
    enabled: !!selectedPartId,
    queryFn: async () => {
      const res = await fetch(`/api/pfmea?partId=${selectedPartId}`);
      if (!res.ok) throw new Error("Failed to fetch PFMEAs");
      return res.json();
    },
  });

  const { data: pfmeaDetail, isLoading: pfmeaDetailLoading } = useQuery<PFMEAWithRows>({
    queryKey: ["/api/pfmea", selectedPfmeaId, "detail"],
    enabled: !!selectedPfmeaId,
    queryFn: async () => {
      const res = await fetch(`/api/pfmea/${selectedPfmeaId}`);
      if (!res.ok) throw new Error("Failed to fetch PFMEA details");
      return res.json();
    },
  });

  const selectedPart = parts.find(p => p.id === selectedPartId);

  if (selectedPfmeaId) {
    return <PFMEADetailView pfmea={pfmeaDetail} part={selectedPart!} onBack={() => setSelectedPfmeaId(null)} loading={pfmeaDetailLoading} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">PFMEA</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Process Failure Mode and Effects Analysis (AIAG-VDA 2019)
          </p>
        </div>
        <Button onClick={handleGeneratePFMEA} data-testid="button-generate-pfmea-header">
          <Plus className="h-4 w-4 mr-2" />
          Generate PFMEA
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Select Part</CardTitle>
        </CardHeader>
        <CardContent>
          {partsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <Select value={selectedPartId || ""} onValueChange={setSelectedPartId}>
              <SelectTrigger data-testid="select-part">
                <SelectValue placeholder="Choose a part..." />
              </SelectTrigger>
              <SelectContent>
                {parts.map((part) => (
                  <SelectItem key={part.id} value={part.id}>
                    {part.partNumber} - {part.partName} ({part.customer})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      {selectedPartId && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">PFMEAs for {selectedPart?.partNumber}</CardTitle>
            <Button onClick={handleGeneratePFMEA} data-testid="button-generate-pfmea-card">
              <Plus className="h-4 w-4 mr-2" />
              Generate PFMEA
            </Button>
          </CardHeader>
          <CardContent>
            {pfmeasLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : pfmeas.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No PFMEAs found for this part. Click "Generate PFMEA" to create one.
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Revision</TableHead>
                      <TableHead>Document No.</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Effective From</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pfmeas.map((pfmea) => (
                      <TableRow key={pfmea.id} className="hover-elevate" data-testid={`row-pfmea-${pfmea.id}`}>
                        <TableCell className="font-mono font-medium">{pfmea.rev}</TableCell>
                        <TableCell className="font-mono">{pfmea.docNo || "-"}</TableCell>
                        <TableCell>
                          <StatusBadge status={pfmea.status} />
                        </TableCell>
                        <TableCell>
                          {pfmea.effectiveFrom ? new Date(pfmea.effectiveFrom).toLocaleDateString() : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedPfmeaId(pfmea.id)}
                            data-testid={`button-view-pfmea-${pfmea.id}`}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {selectedPartId && (
        <GeneratePFMEADialog
          open={generateDialogOpen}
          onOpenChange={setGenerateDialogOpen}
          partId={selectedPartId}
          existingPfmeas={pfmeas}
        />
      )}
    </div>
  );
}

function getAPLevel(ap: string): "high" | "medium" | "low" {
  const apNum = parseInt(ap);
  if (apNum >= 100) return "high";
  if (apNum >= 50) return "medium";
  return "low";
}

function PFMEADetailView({ pfmea, part, onBack, loading }: {
  pfmea?: PFMEAWithRows;
  part: Part;
  onBack: () => void;
  loading: boolean;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<PFMEARow | undefined>(undefined);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [formSetterRef, setFormSetterRef] = useState<((fm: FailureModesLibrary) => void) | null>(null);

  const handleAddRow = () => {
    setEditingRow(undefined);
    setDialogOpen(true);
  };

  const handleEditRow = (row: PFMEARow) => {
    setEditingRow(row);
    setDialogOpen(true);
  };

  const handleOpenCatalog = (formSetter: (fm: FailureModesLibrary) => void) => {
    setFormSetterRef(() => formSetter);
    setCatalogOpen(true);
  };

  const handleAdoptFromCatalog = (fm: FailureModesLibrary) => {
    if (formSetterRef) {
      formSetterRef(fm);
    }
    setCatalogOpen(false);
  };

  if (loading || !pfmea) {
    return (
      <div className="space-y-6">
        <Button variant="outline" size="sm" onClick={onBack} data-testid="button-back">
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-12 w-12 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={onBack} data-testid="button-back">
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold">
            PFMEA: {part.partNumber} Rev {pfmea.rev}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {part.partName} - {part.customer}
          </p>
        </div>
        <StatusBadge status={pfmea.status} />
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Document No.</p>
            <p className="text-lg font-semibold mt-1">{pfmea.docNo || "N/A"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Effective From</p>
            <p className="text-lg font-semibold mt-1">
              {pfmea.effectiveFrom ? new Date(pfmea.effectiveFrom).toLocaleDateString() : "N/A"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Rows</p>
            <p className="text-lg font-semibold mt-1">{pfmea.rows.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">High AP Items</p>
            <p className="text-lg font-semibold mt-1 text-destructive">
              {pfmea.rows.filter(r => parseInt(r.ap) >= 100).length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">FMEA Rows</CardTitle>
          <Button onClick={handleAddRow} data-testid="button-add-row">
            <Plus className="h-4 w-4 mr-2" />
            Add Row
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : pfmea.rows.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No FMEA rows yet. Click "Add Row" to create one.
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-24">Step</TableHead>
                    <TableHead className="min-w-36">Function</TableHead>
                    <TableHead className="min-w-36">Failure Mode</TableHead>
                    <TableHead className="min-w-36">Effect</TableHead>
                    <TableHead className="min-w-12 text-center">S</TableHead>
                    <TableHead className="min-w-36">Cause</TableHead>
                    <TableHead className="min-w-12 text-center">O</TableHead>
                    <TableHead className="min-w-12 text-center">D</TableHead>
                    <TableHead className="min-w-16 text-center">AP</TableHead>
                    <TableHead className="min-w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pfmea.rows.map((row) => (
                    <TableRow key={row.id} className="hover-elevate" data-testid={`row-fmea-${row.id}`}>
                      <TableCell className="font-mono text-sm">{row.stepRef}</TableCell>
                      <TableCell className="text-sm">{row.function}</TableCell>
                      <TableCell className="text-sm">{row.failureMode}</TableCell>
                      <TableCell className="text-sm">{row.effect}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="font-mono">{row.severity}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{row.cause}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="font-mono">{row.occurrence}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="font-mono">{row.detection}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <APBadge level={getAPLevel(row.ap)} value={parseInt(row.ap)} />
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" onClick={() => handleEditRow(row)} data-testid={`button-edit-row-${row.id}`}>
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <PFMEARowDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        pfmeaId={pfmea.id}
        row={editingRow}
        onOpenCatalog={handleOpenCatalog}
      />

      <BrowseCatalogDialog
        open={catalogOpen}
        onOpenChange={setCatalogOpen}
        onAdopt={handleAdoptFromCatalog}
      />
    </div>
  );
}
