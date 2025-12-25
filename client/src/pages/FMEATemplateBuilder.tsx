import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Plus,
  Trash2,
  Copy,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Pencil,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertFmeaTemplateRowSchema } from "@shared/schema";
import type { ProcessStep, FmeaTemplateRow, InsertFmeaTemplateRow } from "@shared/schema";
import { z } from "zod";

interface FMEATemplateBuilderProps {
  processId: string;
  steps: ProcessStep[];
}

function APBadge({ ap }: { ap: string }) {
  const colors: Record<string, string> = {
    H: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    M: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    L: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  };
  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${colors[ap] || colors.L}`}>
      {ap}
    </span>
  );
}

function calculateAP(severity: number, occurrence: number, detection: number): string {
  const score = severity * (occurrence + detection);
  if (score >= 100) return "H";
  if (score >= 50) return "M";
  return "L";
}

export default function FMEATemplateBuilder({ processId, steps }: FMEATemplateBuilderProps) {
  const { toast } = useToast();
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [addRowDialogOpen, setAddRowDialogOpen] = useState(false);
  const [editRowDialogOpen, setEditRowDialogOpen] = useState(false);
  const [selectedStep, setSelectedStep] = useState<ProcessStep | null>(null);
  const [selectedRow, setSelectedRow] = useState<FmeaTemplateRow | null>(null);
  const [deleteRowId, setDeleteRowId] = useState<string | null>(null);

  const { data: templateRows = [], isLoading } = useQuery<FmeaTemplateRow[]>({
    queryKey: ["/api/processes", processId, "fmea-template-rows"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertFmeaTemplateRow) => {
      return await apiRequest("POST", `/api/processes/${processId}/fmea-template-rows`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/processes", processId, "fmea-template-rows"] });
      toast({ title: "Success", description: "FMEA template row created" });
      setAddRowDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertFmeaTemplateRow> }) => {
      return await apiRequest("PATCH", `/api/fmea-template-rows/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/processes", processId, "fmea-template-rows"] });
      toast({ title: "Success", description: "FMEA template row updated" });
      setEditRowDialogOpen(false);
      setSelectedRow(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/fmea-template-rows/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/processes", processId, "fmea-template-rows"] });
      toast({ title: "Success", description: "FMEA template row deleted" });
      setDeleteRowId(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("POST", `/api/fmea-template-rows/${id}/duplicate`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/processes", processId, "fmea-template-rows"] });
      toast({ title: "Success", description: "FMEA template row duplicated" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const toggleStep = (stepId: string) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(stepId)) {
      newExpanded.delete(stepId);
    } else {
      newExpanded.add(stepId);
    }
    setExpandedSteps(newExpanded);
  };

  const getRowsForStep = (stepId: string) => {
    return templateRows.filter((row) => row.stepId === stepId);
  };

  const handleAddRow = (step: ProcessStep) => {
    setSelectedStep(step);
    setAddRowDialogOpen(true);
  };

  const handleEditRow = (row: FmeaTemplateRow) => {
    setSelectedRow(row);
    setEditRowDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading FMEA template...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">FMEA Template Rows</h3>
          <p className="text-sm text-muted-foreground">
            Define failure modes, effects, causes, and controls for each process step
          </p>
        </div>
        <Badge variant="outline">{templateRows.length} rows</Badge>
      </div>

      {steps.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <AlertTriangle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">No process steps defined yet.</p>
            <p className="text-sm text-muted-foreground">Add steps to the process first.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {steps.map((step) => {
            const stepRows = getRowsForStep(step.id);
            const isExpanded = expandedSteps.has(step.id);

            return (
              <Collapsible
                key={step.id}
                open={isExpanded}
                onOpenChange={() => toggleStep(step.id)}
              >
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover-elevate py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          <Badge variant="outline">{step.seq}</Badge>
                          <span className="font-medium">{step.name}</span>
                          <span className="text-sm text-muted-foreground">({step.area})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{stepRows.length} rows</Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddRow(step);
                            }}
                            data-testid={`button-add-fmea-row-${step.id}`}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      {stepRows.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">
                          No FMEA rows for this step. Click + to add one.
                        </p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Function/Requirement</TableHead>
                              <TableHead>Failure Mode</TableHead>
                              <TableHead>Effect</TableHead>
                              <TableHead className="text-center">S</TableHead>
                              <TableHead>Cause</TableHead>
                              <TableHead className="text-center">O</TableHead>
                              <TableHead>Prevention</TableHead>
                              <TableHead>Detection</TableHead>
                              <TableHead className="text-center">D</TableHead>
                              <TableHead className="text-center">AP</TableHead>
                              <TableHead className="w-[80px]">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {stepRows.map((row) => (
                              <TableRow key={row.id}>
                                <TableCell className="max-w-[120px] truncate">
                                  {row.function}
                                </TableCell>
                                <TableCell className="max-w-[100px] truncate">
                                  {row.failureMode}
                                </TableCell>
                                <TableCell className="max-w-[100px] truncate">
                                  {row.effect}
                                </TableCell>
                                <TableCell className="text-center">{row.severity}</TableCell>
                                <TableCell className="max-w-[100px] truncate">
                                  {row.cause}
                                </TableCell>
                                <TableCell className="text-center">{row.occurrence}</TableCell>
                                <TableCell className="max-w-[100px] truncate">
                                  {row.preventionControls?.join(", ") || "-"}
                                </TableCell>
                                <TableCell className="max-w-[100px] truncate">
                                  {row.detectionControls?.join(", ") || "-"}
                                </TableCell>
                                <TableCell className="text-center">{row.detection}</TableCell>
                                <TableCell className="text-center">
                                  <APBadge ap={row.ap} />
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => handleEditRow(row)}
                                      data-testid={`button-edit-fmea-row-${row.id}`}
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => duplicateMutation.mutate(row.id)}
                                      data-testid={`button-duplicate-fmea-row-${row.id}`}
                                    >
                                      <Copy className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => setDeleteRowId(row.id)}
                                      data-testid={`button-delete-fmea-row-${row.id}`}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      )}

      <FMEARowFormDialog
        open={addRowDialogOpen}
        onOpenChange={setAddRowDialogOpen}
        processId={processId}
        step={selectedStep}
        onSubmit={(data) => createMutation.mutate(data)}
        isPending={createMutation.isPending}
      />

      <FMEARowFormDialog
        open={editRowDialogOpen}
        onOpenChange={setEditRowDialogOpen}
        processId={processId}
        step={steps.find((s) => s.id === selectedRow?.stepId) || null}
        row={selectedRow}
        onSubmit={(data) => {
          if (selectedRow) {
            updateMutation.mutate({ id: selectedRow.id, data });
          }
        }}
        isPending={updateMutation.isPending}
      />

      <AlertDialog open={!!deleteRowId} onOpenChange={() => setDeleteRowId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete FMEA Template Row</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this FMEA template row? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteRowId && deleteMutation.mutate(deleteRowId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface FMEARowFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  processId: string;
  step: ProcessStep | null;
  row?: FmeaTemplateRow | null;
  onSubmit: (data: InsertFmeaTemplateRow) => void;
  isPending: boolean;
}

const formSchema = z.object({
  processDefId: z.string().uuid(),
  stepId: z.string().uuid(),
  function: z.string().min(1, "Function is required"),
  requirement: z.string().min(1, "Requirement is required"),
  failureMode: z.string().min(1, "Failure mode is required"),
  effect: z.string().min(1, "Effect is required"),
  severity: z.number().min(1).max(10),
  cause: z.string().min(1, "Cause is required"),
  occurrence: z.number().min(1).max(10),
  preventionControls: z.array(z.string()).default([]),
  detectionControls: z.array(z.string()).default([]),
  detection: z.number().min(1).max(10),
  ap: z.string(),
  specialFlag: z.boolean().default(false),
  notes: z.string().optional().nullable(),
});

type FormValues = z.infer<typeof formSchema>;

function FMEARowFormDialog({
  open,
  onOpenChange,
  processId,
  step,
  row,
  onSubmit,
  isPending,
}: FMEARowFormDialogProps) {
  const isEditing = !!row;
  const [preventionText, setPreventionText] = useState(row?.preventionControls?.join(", ") || "");
  const [detectionText, setDetectionText] = useState(row?.detectionControls?.join(", ") || "");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      processDefId: processId,
      stepId: step?.id || "",
      function: row?.function || "",
      requirement: row?.requirement || "",
      failureMode: row?.failureMode || "",
      effect: row?.effect || "",
      severity: row?.severity || 5,
      cause: row?.cause || "",
      occurrence: row?.occurrence || 5,
      preventionControls: row?.preventionControls || [],
      detectionControls: row?.detectionControls || [],
      detection: row?.detection || 5,
      ap: row?.ap || "M",
      specialFlag: row?.specialFlag || false,
      notes: row?.notes || "",
    },
  });

  const severity = form.watch("severity");
  const occurrence = form.watch("occurrence");
  const detection = form.watch("detection");

  const calculatedAP = calculateAP(severity, occurrence, detection);

  const handleSubmit = (data: FormValues) => {
    const preventionControls = preventionText.split(",").map(s => s.trim()).filter(Boolean);
    const detectionControls = detectionText.split(",").map(s => s.trim()).filter(Boolean);
    
    onSubmit({
      ...data,
      processDefId: processId,
      stepId: step?.id || "",
      preventionControls,
      detectionControls,
      ap: calculatedAP,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit FMEA Row" : "Add FMEA Row"}</DialogTitle>
          <DialogDescription>
            {step ? `Step: ${step.seq} - ${step.name}` : "Select a step first"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="function"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Function*</FormLabel>
                    <FormControl>
                      <Input placeholder="Process function" {...field} />
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
                    <FormLabel>Requirement*</FormLabel>
                    <FormControl>
                      <Input placeholder="Process requirement" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="failureMode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Failure Mode*</FormLabel>
                    <FormControl>
                      <Input placeholder="Potential failure mode" {...field} />
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
                    <FormLabel>Effect*</FormLabel>
                    <FormControl>
                      <Input placeholder="Effect of failure" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="severity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Severity (1-10)*</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cause"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Cause*</FormLabel>
                    <FormControl>
                      <Input placeholder="Potential cause of failure" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="occurrence"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Occurrence (1-10)*</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="col-span-2">
                <FormItem>
                  <FormLabel>Prevention Controls (comma-separated)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Control 1, Control 2, ..."
                      value={preventionText}
                      onChange={(e) => setPreventionText(e.target.value)}
                    />
                  </FormControl>
                </FormItem>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="detection"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Detection (1-10)*</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="col-span-2">
                <FormItem>
                  <FormLabel>Detection Controls (comma-separated)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Control 1, Control 2, ..."
                      value={detectionText}
                      onChange={(e) => setDetectionText(e.target.value)}
                    />
                  </FormControl>
                </FormItem>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="specialFlag"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 pt-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Special Characteristic</FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              <div className="col-span-2 flex items-end gap-4">
                <div className="flex items-center gap-2 p-3 rounded-md bg-muted">
                  <span className="text-sm font-medium">Calculated AP:</span>
                  <APBadge ap={calculatedAP} />
                  <span className="text-xs text-muted-foreground">
                    ({severity} × ({occurrence} + {detection}) ={" "}
                    {severity * (occurrence + detection)})
                  </span>
                </div>
              </div>
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional notes..."
                      rows={2}
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
