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
import type { ProcessStep, ControlTemplateRow, InsertControlTemplateRow } from "@shared/schema";
import { z } from "zod";

interface ControlTemplateBuilderProps {
  processId: string;
  steps: ProcessStep[];
}

export default function ControlTemplateBuilder({ processId, steps }: ControlTemplateBuilderProps) {
  const { toast } = useToast();
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [addRowDialogOpen, setAddRowDialogOpen] = useState(false);
  const [editRowDialogOpen, setEditRowDialogOpen] = useState(false);
  const [selectedStep, setSelectedStep] = useState<ProcessStep | null>(null);
  const [selectedRow, setSelectedRow] = useState<ControlTemplateRow | null>(null);
  const [deleteRowId, setDeleteRowId] = useState<string | null>(null);

  const { data: templateRows = [], isLoading } = useQuery<ControlTemplateRow[]>({
    queryKey: ["/api/processes", processId, "control-template-rows"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertControlTemplateRow) => {
      return await apiRequest("POST", `/api/processes/${processId}/control-template-rows`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/processes", processId, "control-template-rows"] });
      toast({ title: "Success", description: "Control template row created" });
      setAddRowDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertControlTemplateRow> }) => {
      return await apiRequest("PATCH", `/api/control-template-rows/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/processes", processId, "control-template-rows"] });
      toast({ title: "Success", description: "Control template row updated" });
      setEditRowDialogOpen(false);
      setSelectedRow(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/control-template-rows/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/processes", processId, "control-template-rows"] });
      toast({ title: "Success", description: "Control template row deleted" });
      setDeleteRowId(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("POST", `/api/control-template-rows/${id}/duplicate`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/processes", processId, "control-template-rows"] });
      toast({ title: "Success", description: "Control template row duplicated" });
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
    // Control template rows are linked via sourceTemplateRowId to FMEA rows
    // For now, we show all rows and filter by step if we have that info
    return templateRows;
  };

  const handleAddRow = (step: ProcessStep) => {
    setSelectedStep(step);
    setAddRowDialogOpen(true);
  };

  const handleEditRow = (row: ControlTemplateRow) => {
    setSelectedRow(row);
    setEditRowDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading control template...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Control Template Rows</h3>
          <p className="text-sm text-muted-foreground">
            Define control plan entries for each characteristic
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{templateRows.length} rows</Badge>
          <Button
            size="sm"
            onClick={() => {
              setSelectedStep(null);
              setAddRowDialogOpen(true);
            }}
            data-testid="button-add-control-template-row"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Row
          </Button>
        </div>
      </div>

      {templateRows.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <AlertTriangle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">No control template rows defined yet.</p>
            <p className="text-sm text-muted-foreground">Click "Add Row" to create one.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Char ID</TableHead>
                  <TableHead>Characteristic</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Tolerance</TableHead>
                  <TableHead>Control Method</TableHead>
                  <TableHead>Sample Size</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead className="text-center">Special</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templateRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.charId}</TableCell>
                    <TableCell className="max-w-[120px] truncate">
                      {row.characteristicName}
                    </TableCell>
                    <TableCell>{row.type}</TableCell>
                    <TableCell>{row.target || "-"}</TableCell>
                    <TableCell>{row.tolerance || "-"}</TableCell>
                    <TableCell className="max-w-[100px] truncate">
                      {row.controlMethod || "-"}
                    </TableCell>
                    <TableCell>{row.defaultSampleSize || "-"}</TableCell>
                    <TableCell>{row.defaultFrequency || "-"}</TableCell>
                    <TableCell className="text-center">
                      {row.specialFlag ? (
                        <Badge variant="destructive" className="text-xs">SC</Badge>
                      ) : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleEditRow(row)}
                          data-testid={`button-edit-control-row-${row.id}`}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => duplicateMutation.mutate(row.id)}
                          data-testid={`button-duplicate-control-row-${row.id}`}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setDeleteRowId(row.id)}
                          data-testid={`button-delete-control-row-${row.id}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <ControlRowFormDialog
        open={addRowDialogOpen}
        onOpenChange={setAddRowDialogOpen}
        processId={processId}
        onSubmit={(data) => createMutation.mutate(data)}
        isPending={createMutation.isPending}
      />

      <ControlRowFormDialog
        open={editRowDialogOpen}
        onOpenChange={setEditRowDialogOpen}
        processId={processId}
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
            <AlertDialogTitle>Delete Control Template Row</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this control template row? This action cannot be undone.
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

interface ControlRowFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  processId: string;
  row?: ControlTemplateRow | null;
  onSubmit: (data: InsertControlTemplateRow) => void;
  isPending: boolean;
}

const formSchema = z.object({
  processDefId: z.string().uuid(),
  sourceTemplateRowId: z.string().uuid().optional().nullable(),
  characteristicName: z.string().min(1, "Characteristic name is required"),
  charId: z.string().min(1, "Characteristic ID is required"),
  type: z.string().min(1, "Type is required"),
  target: z.string().optional().nullable(),
  tolerance: z.string().optional().nullable(),
  specialFlag: z.boolean().default(false),
  csrSymbol: z.string().optional().nullable(),
  measurementSystem: z.string().optional().nullable(),
  gageDetails: z.string().optional().nullable(),
  defaultSampleSize: z.string().optional().nullable(),
  defaultFrequency: z.string().optional().nullable(),
  controlMethod: z.string().optional().nullable(),
  acceptanceCriteria: z.string().optional().nullable(),
  reactionPlan: z.string().optional().nullable(),
});

type FormValues = z.infer<typeof formSchema>;

function ControlRowFormDialog({
  open,
  onOpenChange,
  processId,
  row,
  onSubmit,
  isPending,
}: ControlRowFormDialogProps) {
  const isEditing = !!row;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      processDefId: processId,
      sourceTemplateRowId: row?.sourceTemplateRowId || null,
      characteristicName: row?.characteristicName || "",
      charId: row?.charId || "",
      type: row?.type || "dimensional",
      target: row?.target || "",
      tolerance: row?.tolerance || "",
      specialFlag: row?.specialFlag || false,
      csrSymbol: row?.csrSymbol || "",
      measurementSystem: row?.measurementSystem || "",
      gageDetails: row?.gageDetails || "",
      defaultSampleSize: row?.defaultSampleSize || "",
      defaultFrequency: row?.defaultFrequency || "",
      controlMethod: row?.controlMethod || "",
      acceptanceCriteria: row?.acceptanceCriteria || "",
      reactionPlan: row?.reactionPlan || "",
    },
  });

  const handleSubmit = (data: FormValues) => {
    onSubmit({
      ...data,
      processDefId: processId,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Control Row" : "Add Control Row"}</DialogTitle>
          <DialogDescription>
            Define a control plan characteristic
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="charId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Characteristic ID*</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., DIM-001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type*</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., dimensional, visual" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="characteristicName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Characteristic Name*</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Outer Diameter" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="target"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 10.0 mm" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tolerance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tolerance</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., ± 0.1 mm" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="controlMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Control Method</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Visual, CMM" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="gageDetails"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gage/Equipment</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Micrometer #123" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="defaultSampleSize"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sample Size</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 5, 100%" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="defaultFrequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Frequency</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Per piece, Hourly" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="acceptanceCriteria"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Acceptance Criteria</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Within tolerance" {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reactionPlan"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reaction Plan</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Action to take if out of specification..."
                      rows={2}
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="csrSymbol"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CSR Symbol</FormLabel>
                    <FormControl>
                      <Input placeholder="Customer specific symbol" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="specialFlag"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 pt-6">
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
            </div>

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
