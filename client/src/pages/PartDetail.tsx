import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import {
  Package,
  ArrowLeft,
  Plus,
  GripVertical,
  Pencil,
  Trash2,
  Loader2,
  Factory,
  Users,
  Car,
  FileText,
  ClipboardList,
  Layers,
  ChevronRight,
  Settings2,
  Unlink,
} from "lucide-react";
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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Part, ProcessDef, PartProcessMap, PFMEA, ControlPlan } from "@shared/schema";
import { insertPartProcessMapSchema } from "@shared/schema";
import { z } from "zod";

interface PartProcessMapWithProcess extends PartProcessMap {
  process?: ProcessDef;
}

const processMapFormSchema = insertPartProcessMapSchema.extend({
  processDefId: z.string().min(1, "Please select a process"),
  processRev: z.string().min(1, "Process revision is required"),
  sequence: z.number().int().positive("Sequence must be a positive number"),
  assumptions: z.string().optional(),
});

type ProcessMapFormValues = z.infer<typeof processMapFormSchema>;

function ProcessMapFormDialog({
  partId,
  mapping,
  existingSequences,
  open,
  onOpenChange,
}: {
  partId: string;
  mapping?: PartProcessMapWithProcess;
  existingSequences: number[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const isEditing = !!mapping;

  const { data: processes = [] } = useQuery<ProcessDef[]>({
    queryKey: ["/api/processes"],
    enabled: open,
  });

  const availableProcesses = processes.filter(
    (p) => p.status === "effective" || (isEditing && p.id === mapping?.processDefId)
  );

  const form = useForm<ProcessMapFormValues>({
    resolver: zodResolver(processMapFormSchema),
    defaultValues: {
      partId: partId,
      processDefId: "",
      processRev: "",
      sequence: Math.max(0, ...existingSequences) + 10,
      assumptions: "",
    },
  });

  const selectedProcessId = form.watch("processDefId");
  useEffect(() => {
    if (selectedProcessId && !isEditing) {
      const selectedProcess = processes.find((p) => p.id === selectedProcessId);
      if (selectedProcess) {
        form.setValue("processRev", selectedProcess.rev);
      }
    }
  }, [selectedProcessId, processes, form, isEditing]);

  useEffect(() => {
    if (mapping && open) {
      form.reset({
        partId: partId,
        processDefId: mapping.processDefId,
        processRev: mapping.processRev,
        sequence: mapping.sequence,
        assumptions: mapping.assumptions || "",
      });
    } else if (!open) {
      form.reset({
        partId: partId,
        processDefId: "",
        processRev: "",
        sequence: Math.max(0, ...existingSequences) + 10,
        assumptions: "",
      });
    }
  }, [mapping, open, form, partId, existingSequences]);

  const mutation = useMutation({
    mutationFn: async (data: ProcessMapFormValues) => {
      const url = isEditing
        ? `/api/part-process-maps/${mapping.id}`
        : "/api/part-process-maps";
      const method = isEditing ? "PATCH" : "POST";
      const res = await apiRequest(method, url, data);
      return (await res.json()) as PartProcessMap;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/part-process-maps", partId] });
      toast({
        title: isEditing ? "Process mapping updated" : "Process mapped",
        description: `The process has been successfully ${isEditing ? "updated" : "mapped to this part"}.`,
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || `Failed to ${isEditing ? "update" : "create"} process mapping`,
      });
    },
  });

  const onSubmit = (data: ProcessMapFormValues) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Process Mapping" : "Map Process to Part"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the process mapping details."
              : "Select a process to map to this part. The sequence determines the order of processes in the flow."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="processDefId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Process</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isEditing}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-process">
                        <SelectValue placeholder="Select a process" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableProcesses.map((process) => (
                        <SelectItem key={process.id} value={process.id}>
                          <div className="flex items-center gap-2">
                            <span>{process.name}</span>
                            <Badge variant="outline" className="text-xs">
                              Rev {process.rev}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isEditing && (
                    <FormDescription>
                      Process cannot be changed. Delete and create a new mapping instead.
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="processRev"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Process Revision</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., 2.1.0" data-testid="input-process-rev" />
                    </FormControl>
                    <FormDescription>
                      Locked revision for this part
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sequence"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sequence</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        data-testid="input-sequence"
                      />
                    </FormControl>
                    <FormDescription>
                      Order in flow (10, 20, 30...)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="assumptions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assumptions / Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any assumptions or part-specific notes for this process..."
                      rows={3}
                      {...field}
                      data-testid="textarea-assumptions"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="button-mapping-cancel"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending} data-testid="button-mapping-submit">
                {mutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isEditing ? "Save Changes" : "Map Process"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteMappingDialog({
  mapping,
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: {
  mapping: PartProcessMapWithProcess | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending: boolean;
}) {
  if (!mapping) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove Process Mapping</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to remove{" "}
            <strong>{mapping.process?.name || "this process"}</strong> from this
            part? This will not affect any generated PFMEAs or Control Plans.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel data-testid="button-mapping-delete-cancel">Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={isPending}
            data-testid="button-mapping-delete-confirm"
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Remove Mapping
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default function PartDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [addMappingOpen, setAddMappingOpen] = useState(false);
  const [editMappingOpen, setEditMappingOpen] = useState(false);
  const [editingMapping, setEditingMapping] = useState<PartProcessMapWithProcess | undefined>();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [mappingToDelete, setMappingToDelete] = useState<PartProcessMapWithProcess | null>(null);

  const {
    data: part,
    isLoading: partLoading,
    error: partError,
  } = useQuery<Part>({
    queryKey: ["/api/parts", id],
    queryFn: async () => {
      const res = await fetch(`/api/parts/${id}`);
      if (!res.ok) throw new Error("Part not found");
      return res.json();
    },
    enabled: !!id,
  });

  const { data: mappings = [], isLoading: mappingsLoading } = useQuery<
    PartProcessMapWithProcess[]
  >({
    queryKey: ["/api/part-process-maps", id],
    queryFn: async () => {
      const res = await fetch(`/api/part-process-maps?partId=${id}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!id,
  });

  const { data: pfmeas = [] } = useQuery<PFMEA[]>({
    queryKey: ["/api/pfmeas", { partId: id }],
    queryFn: async () => {
      const res = await fetch(`/api/pfmeas?partId=${id}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!id,
  });

  const { data: controlPlans = [] } = useQuery<ControlPlan[]>({
    queryKey: ["/api/control-plans", { partId: id }],
    queryFn: async () => {
      const res = await fetch(`/api/control-plans?partId=${id}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: async (mappingId: string) => {
      await apiRequest("DELETE", `/api/part-process-maps/${mappingId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/part-process-maps", id] });
      toast({
        title: "Process mapping removed",
        description: "The process has been unmapped from this part.",
      });
      setDeleteOpen(false);
      setMappingToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to remove process mapping",
      });
    },
  });

  const handleEdit = (mapping: PartProcessMapWithProcess) => {
    setEditingMapping(mapping);
    setEditMappingOpen(true);
  };

  const handleDelete = (mapping: PartProcessMapWithProcess) => {
    setMappingToDelete(mapping);
    setDeleteOpen(true);
  };

  const confirmDelete = () => {
    if (mappingToDelete) {
      deleteMutation.mutate(mappingToDelete.id);
    }
  };

  const sortedMappings = [...mappings].sort((a, b) => a.sequence - b.sequence);
  const existingSequences = mappings.map((m) => m.sequence);

  if (partLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (partError || !part) {
    return (
      <div className="flex-1 p-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Part not found</p>
              <p className="text-sm mt-1">
                The requested part could not be found.
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setLocation("/parts")}
                data-testid="button-back-to-parts"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Parts
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-8 space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/parts")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight" data-testid="text-part-name">
                {part.partName}
              </h1>
              <Badge variant="outline" className="text-sm font-mono" data-testid="text-part-number">
                {part.partNumber}
              </Badge>
            </div>
            <div className="flex items-center gap-4 mt-1 text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                {part.customer}
              </span>
              <span className="flex items-center gap-1">
                <Car className="h-4 w-4" />
                {part.program}
              </span>
              <span className="flex items-center gap-1">
                <Factory className="h-4 w-4" />
                {part.plant}
              </span>
            </div>
          </div>
        </div>

        {part.csrNotes && (
          <Card className="border-yellow-500/50 bg-yellow-500/5">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-800 dark:text-yellow-200">
                    Customer-Specific Requirements
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1" data-testid="text-csr-notes">
                    {part.csrNotes}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="processes" className="space-y-4">
          <TabsList>
            <TabsTrigger value="processes" className="gap-2" data-testid="tab-processes">
              <Layers className="h-4 w-4" />
              Process Flow ({sortedMappings.length})
            </TabsTrigger>
            <TabsTrigger value="pfmeas" className="gap-2" data-testid="tab-pfmeas">
              <FileText className="h-4 w-4" />
              PFMEAs ({pfmeas.length})
            </TabsTrigger>
            <TabsTrigger value="controlplans" className="gap-2" data-testid="tab-controlplans">
              <ClipboardList className="h-4 w-4" />
              Control Plans ({controlPlans.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="processes">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Process Flow</CardTitle>
                    <CardDescription>
                      Define the sequence of processes used to manufacture this
                      part
                    </CardDescription>
                  </div>
                  <Button onClick={() => setAddMappingOpen(true)} data-testid="button-add-process">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Process
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {mappingsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : sortedMappings.length > 0 ? (
                  <div className="space-y-2">
                    {sortedMappings.map((mapping, index) => (
                      <div
                        key={mapping.id}
                        className="flex items-center gap-3 p-4 border rounded-lg hover:bg-muted/50 group"
                        data-testid={`row-mapping-${mapping.id}`}
                      >
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <GripVertical className="h-5 w-5 opacity-50" />
                          <span className="font-mono text-sm w-8">
                            {mapping.sequence}
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Settings2 className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {mapping.process?.name || "Unknown Process"}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              Rev {mapping.processRev}
                            </Badge>
                            {mapping.process?.status === "effective" && (
                              <Badge
                                variant="default"
                                className="text-xs bg-green-600"
                              >
                                Effective
                              </Badge>
                            )}
                          </div>
                          {mapping.assumptions && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {mapping.assumptions}
                            </p>
                          )}
                        </div>
                        {index < sortedMappings.length - 1 && (
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        )}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(mapping)}
                            data-testid={`button-edit-mapping-${mapping.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(mapping)}
                            data-testid={`button-delete-mapping-${mapping.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Unlink className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">No processes mapped</p>
                    <p className="text-sm mt-1">
                      Add processes to define the manufacturing flow for this
                      part
                    </p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => setAddMappingOpen(true)}
                      data-testid="button-add-first-process"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Process
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pfmeas">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Process Failure Mode and Effects Analysis</CardTitle>
                    <CardDescription>
                      PFMEAs generated for this part
                    </CardDescription>
                  </div>
                  <Button disabled={sortedMappings.length === 0} data-testid="button-generate-pfmea">
                    <Plus className="h-4 w-4 mr-2" />
                    Generate PFMEA
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {pfmeas.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Revision</TableHead>
                        <TableHead>Document No.</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Effective Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pfmeas.map((pfmea) => (
                        <TableRow key={pfmea.id} data-testid={`row-pfmea-${pfmea.id}`}>
                          <TableCell className="font-mono">
                            Rev {pfmea.rev}
                          </TableCell>
                          <TableCell>{pfmea.docNo || "—"}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                pfmea.status === "effective"
                                  ? "default"
                                  : pfmea.status === "draft"
                                  ? "secondary"
                                  : "outline"
                              }
                            >
                              {pfmea.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {pfmea.effectiveFrom
                              ? new Date(pfmea.effectiveFrom).toLocaleDateString()
                              : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" data-testid={`button-view-pfmea-${pfmea.id}`}>
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">No PFMEAs yet</p>
                    <p className="text-sm mt-1">
                      {sortedMappings.length === 0
                        ? "Add processes to the flow first, then generate a PFMEA"
                        : "Generate a PFMEA from the mapped processes"}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="controlplans">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Control Plans</CardTitle>
                    <CardDescription>
                      Control Plans generated for this part
                    </CardDescription>
                  </div>
                  <Button disabled={pfmeas.length === 0} data-testid="button-generate-control-plan">
                    <Plus className="h-4 w-4 mr-2" />
                    Generate Control Plan
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {controlPlans.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Revision</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Document No.</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Effective Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {controlPlans.map((cp) => (
                        <TableRow key={cp.id} data-testid={`row-control-plan-${cp.id}`}>
                          <TableCell className="font-mono">
                            Rev {cp.rev}
                          </TableCell>
                          <TableCell>{cp.type}</TableCell>
                          <TableCell>{cp.docNo || "—"}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                cp.status === "effective"
                                  ? "default"
                                  : cp.status === "draft"
                                  ? "secondary"
                                  : "outline"
                              }
                            >
                              {cp.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {cp.effectiveFrom
                              ? new Date(cp.effectiveFrom).toLocaleDateString()
                              : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" data-testid={`button-view-control-plan-${cp.id}`}>
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">No Control Plans yet</p>
                    <p className="text-sm mt-1">
                      {pfmeas.length === 0
                        ? "Generate a PFMEA first, then create a Control Plan"
                        : "Generate a Control Plan from the PFMEA"}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <ProcessMapFormDialog
          partId={id!}
          mapping={undefined}
          existingSequences={existingSequences}
          open={addMappingOpen}
          onOpenChange={setAddMappingOpen}
        />

        <ProcessMapFormDialog
          partId={id!}
          mapping={editingMapping}
          existingSequences={existingSequences.filter(
            (s) => s !== editingMapping?.sequence
          )}
          open={editMappingOpen}
          onOpenChange={(open) => {
            setEditMappingOpen(open);
            if (!open) {
              setEditingMapping(undefined);
            }
          }}
        />

        <DeleteMappingDialog
          mapping={mappingToDelete}
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          onConfirm={confirmDelete}
          isPending={deleteMutation.isPending}
        />
      </div>
    </div>
  );
}
