import { useState, useEffect } from "react";
import { FileText, Plus, Loader2, ChevronLeft, AlertTriangle } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
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
import type { Part, PFMEA, PFMEARow } from "@shared/schema";

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
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pfmeaId: string;
  row?: PFMEARow;
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
        specialFlag: row.specialFlag,
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
                  <FormLabel>Failure Mode</FormLabel>
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

export default function PFMEA() {
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const [selectedPfmeaId, setSelectedPfmeaId] = useState<string | null>(null);

  const { data: parts = [], isLoading: partsLoading } = useQuery<Part[]>({
    queryKey: ["/api/parts"],
  });

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
        <Button data-testid="button-generate-pfmea">
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
            <Button data-testid="button-generate-pfmea">
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

  const handleAddRow = () => {
    setEditingRow(undefined);
    setDialogOpen(true);
  };

  const handleEditRow = (row: PFMEARow) => {
    setEditingRow(row);
    setDialogOpen(true);
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
      />
    </div>
  );
}
