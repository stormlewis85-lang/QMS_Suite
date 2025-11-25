import { useState, useEffect } from "react";
import { Layers, Plus, Search, Eye, Copy, Edit, Loader2, Trash2, ChevronRight, ChevronDown, FolderPlus, Link2, GripVertical, ArrowRight } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ProcessDef, ProcessStep, StepType } from "@shared/schema";
import { insertProcessDefSchema, insertProcessStepSchema } from "@shared/schema";

const createProcessFormSchema = insertProcessDefSchema.extend({
  createdBy: z.string().uuid().optional(),
});

type CreateProcessForm = z.infer<typeof createProcessFormSchema>;

const STEP_TYPE_LABELS: Record<StepType, string> = {
  operation: "Operation",
  group: "Group",
  subprocess_ref: "Subprocess Reference",
};

const STEP_TYPE_COLORS: Record<StepType, string> = {
  operation: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  group: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  subprocess_ref: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};

function ProcessFormDialog({ 
  process, 
  open, 
  onOpenChange 
}: { 
  process?: ProcessDef; 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const isEditing = !!process;

  const form = useForm<CreateProcessForm>({
    resolver: zodResolver(createProcessFormSchema),
    defaultValues: {
      name: "",
      rev: "A",
      status: "draft",
      effectiveFrom: undefined,
      supersedesId: undefined,
      changeNote: undefined,
    },
  });

  useEffect(() => {
    if (process && open) {
      form.reset({
        name: process.name,
        rev: process.rev,
        status: process.status,
        effectiveFrom: process.effectiveFrom || undefined,
        supersedesId: process.supersedesId || undefined,
        changeNote: process.changeNote || undefined,
      });
    } else if (!open) {
      form.reset({
        name: "",
        rev: "A",
        status: "draft",
        effectiveFrom: undefined,
        supersedesId: undefined,
        changeNote: undefined,
      });
    }
  }, [process, open, form]);

  const mutation = useMutation({
    mutationFn: async (data: CreateProcessForm) => {
      if (isEditing) {
        const res = await apiRequest("PATCH", `/api/processes/${process.id}`, data);
        return await res.json() as ProcessDef;
      } else {
        const res = await apiRequest("POST", "/api/processes", {
          process: data,
          steps: [],
        });
        return await res.json() as ProcessDef;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/processes"] });
      toast({
        title: isEditing ? "Process updated" : "Process created",
        description: `The process definition has been successfully ${isEditing ? "updated" : "created"}.`,
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || `Failed to ${isEditing ? "update" : "create"} process`,
      });
    },
  });

  const onSubmit = (data: CreateProcessForm) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Process" : "Create New Process"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update process definition details." : "Add a new manufacturing process definition to the library."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Process Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Injection Molding" {...field} data-testid="input-process-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="rev"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Revision</FormLabel>
                    <FormControl>
                      <Input placeholder="A" {...field} data-testid="input-revision" />
                    </FormControl>
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
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger data-testid="select-status">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="review">Review</SelectItem>
                        <SelectItem value="effective">Effective</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="changeNote"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Change Note (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Initial release..."
                      {...field}
                      value={field.value || ""}
                      data-testid="input-change-note"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={mutation.isPending}
                data-testid={isEditing ? "button-update-process" : "button-submit"}
              >
                {mutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isEditing ? "Update Process" : "Create Process"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

const stepFormSchema = z.object({
  name: z.string().min(1, "Step name is required"),
  area: z.string().min(1, "Area is required"),
  stepType: z.enum(["operation", "group", "subprocess_ref"]),
  parentStepId: z.string().uuid().nullable().optional(),
  subprocessRefId: z.string().uuid().nullable().optional(),
  subprocessRev: z.string().nullable().optional(),
  branchTo: z.string().nullable().optional(),
  reworkTo: z.string().nullable().optional(),
});

type StepFormData = z.infer<typeof stepFormSchema>;

function StepFormDialog({
  processId,
  step,
  availableProcesses,
  availableGroups,
  open,
  onOpenChange,
  nextSeq,
}: {
  processId: string;
  step?: ProcessStep;
  availableProcesses: ProcessDef[];
  availableGroups: ProcessStep[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nextSeq: number;
}) {
  const { toast } = useToast();
  const isEditing = !!step;

  const form = useForm<StepFormData>({
    resolver: zodResolver(stepFormSchema),
    defaultValues: {
      name: "",
      area: "",
      stepType: "operation",
      parentStepId: null,
      subprocessRefId: null,
      subprocessRev: null,
      branchTo: null,
      reworkTo: null,
    },
  });

  const stepType = form.watch("stepType");

  useEffect(() => {
    if (step && open) {
      form.reset({
        name: step.name,
        area: step.area,
        stepType: (step.stepType as StepType) || "operation",
        parentStepId: step.parentStepId || null,
        subprocessRefId: step.subprocessRefId || null,
        subprocessRev: step.subprocessRev || null,
        branchTo: step.branchTo || null,
        reworkTo: step.reworkTo || null,
      });
    } else if (!open) {
      form.reset({
        name: "",
        area: "",
        stepType: "operation",
        parentStepId: null,
        subprocessRefId: null,
        subprocessRev: null,
        branchTo: null,
        reworkTo: null,
      });
    }
  }, [step, open, form]);

  const mutation = useMutation({
    mutationFn: async (data: StepFormData) => {
      const payload = {
        ...data,
        seq: isEditing ? step.seq : nextSeq,
        processDefId: processId,
      };
      
      if (isEditing) {
        const res = await apiRequest("PATCH", `/api/processes/${processId}/steps/${step.id}`, payload);
        return await res.json() as ProcessStep;
      } else {
        const res = await apiRequest("POST", `/api/processes/${processId}/steps`, payload);
        return await res.json() as ProcessStep;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/processes", processId] });
      toast({
        title: isEditing ? "Step updated" : "Step created",
        description: `The process step has been successfully ${isEditing ? "updated" : "created"}.`,
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || `Failed to ${isEditing ? "update" : "create"} step`,
      });
    },
  });

  const onSubmit = (data: StepFormData) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Step" : "Add New Step"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update process step details." : "Add a new step to the process."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="stepType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Step Type</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger data-testid="select-step-type">
                        <SelectValue placeholder="Select step type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="operation">Operation - A single process step</SelectItem>
                      <SelectItem value="group">Group - Container for related steps</SelectItem>
                      <SelectItem value="subprocess_ref">Subprocess Reference - Link to another process</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {stepType === "operation" && "A standard process operation or manufacturing step."}
                    {stepType === "group" && "A logical grouping that can contain child steps."}
                    {stepType === "subprocess_ref" && "Links to an existing process definition that can be reused."}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {stepType === "group" ? "Group Name" : stepType === "subprocess_ref" ? "Reference Name" : "Step Name"}
                  </FormLabel>
                  <FormControl>
                    <Input 
                      placeholder={stepType === "group" ? "Material Preparation" : stepType === "subprocess_ref" ? "Assembly Subprocess" : "Load Material"} 
                      {...field} 
                      data-testid="input-step-name" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="area"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Area / Location</FormLabel>
                  <FormControl>
                    <Input placeholder="Molding Cell 1" {...field} data-testid="input-step-area" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {stepType === "subprocess_ref" && (
              <FormField
                control={form.control}
                name="subprocessRefId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subprocess Reference</FormLabel>
                    <Select value={field.value || ""} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger data-testid="select-subprocess-ref">
                          <SelectValue placeholder="Select a process to reference" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableProcesses.map((proc) => (
                          <SelectItem key={proc.id} value={proc.id}>
                            {proc.name} (Rev {proc.rev})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      The referenced process steps will be included in this process.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {stepType !== "group" && availableGroups.length > 0 && (
              <FormField
                control={form.control}
                name="parentStepId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parent Group (Optional)</FormLabel>
                    <Select value={field.value || "none"} onValueChange={(val) => field.onChange(val === "none" ? null : val)}>
                      <FormControl>
                        <SelectTrigger data-testid="select-parent-group">
                          <SelectValue placeholder="No parent group" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No parent group</SelectItem>
                        {availableGroups.map((group) => (
                          <SelectItem key={group.id} value={group.id}>
                            {group.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Optionally nest this step under a group.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={mutation.isPending}
                data-testid="button-submit-step"
              >
                {mutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isEditing ? "Update Step" : "Add Step"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

type ProcessWithSteps = ProcessDef & {
  steps: ProcessStep[];
};

function StepTreeItem({
  step,
  steps,
  level,
  processId,
  onEdit,
  onDelete,
  expandedGroups,
  toggleGroup,
  referencedProcesses,
}: {
  step: ProcessStep;
  steps: ProcessStep[];
  level: number;
  processId: string;
  onEdit: (step: ProcessStep) => void;
  onDelete: (step: ProcessStep) => void;
  expandedGroups: Set<string>;
  toggleGroup: (id: string) => void;
  referencedProcesses: Map<string, ProcessDef>;
}) {
  const isGroup = step.stepType === "group";
  const isSubprocessRef = step.stepType === "subprocess_ref";
  const isExpanded = expandedGroups.has(step.id);
  const childSteps = steps.filter(s => s.parentStepId === step.id);
  const referencedProcess = isSubprocessRef && step.subprocessRefId ? referencedProcesses.get(step.subprocessRefId) : null;

  return (
    <div className="space-y-1">
      <div 
        className={`flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 ${level > 0 ? "ml-" + (level * 6) : ""}`}
        style={{ marginLeft: level * 24 }}
      >
        {isGroup ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => toggleGroup(step.id)}
            data-testid={`button-toggle-group-${step.id}`}
          >
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        ) : (
          <div className="w-6 h-6 flex items-center justify-center">
            {isSubprocessRef ? (
              <Link2 className="h-4 w-4 text-muted-foreground" />
            ) : (
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        )}
        
        <Badge className={STEP_TYPE_COLORS[step.stepType as StepType]} variant="secondary">
          {step.seq}
        </Badge>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{step.name}</span>
            <Badge variant="outline" className="text-xs">
              {STEP_TYPE_LABELS[step.stepType as StepType]}
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <span>{step.area}</span>
            {isSubprocessRef && referencedProcess && (
              <>
                <ArrowRight className="h-3 w-3" />
                <span className="text-green-600 dark:text-green-400">
                  {referencedProcess.name} (Rev {referencedProcess.rev})
                </span>
              </>
            )}
            {isGroup && childSteps.length > 0 && (
              <span className="text-purple-600 dark:text-purple-400">
                {childSteps.length} nested step{childSteps.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onEdit(step)}
            data-testid={`button-edit-step-${step.id}`}
          >
            <Edit className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onDelete(step)}
            data-testid={`button-delete-step-${step.id}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {isGroup && isExpanded && childSteps.length > 0 && (
        <div className="border-l-2 border-muted ml-3">
          {childSteps.map((child) => (
            <StepTreeItem
              key={child.id}
              step={child}
              steps={steps}
              level={level + 1}
              processId={processId}
              onEdit={onEdit}
              onDelete={onDelete}
              expandedGroups={expandedGroups}
              toggleGroup={toggleGroup}
              referencedProcesses={referencedProcesses}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ProcessDetailsDialog({ 
  process,
  allProcesses,
  open,
  onOpenChange,
}: { 
  process: ProcessWithSteps | null;
  allProcesses: ProcessDef[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const [addStepOpen, setAddStepOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<ProcessStep | undefined>();
  const [editStepOpen, setEditStepOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const { data: freshProcess, refetch } = useQuery<ProcessWithSteps>({
    queryKey: ["/api/processes", process?.id],
    enabled: !!process?.id && open,
  });

  const currentProcess = freshProcess || process;

  const deleteMutation = useMutation({
    mutationFn: async (stepId: string) => {
      await apiRequest("DELETE", `/api/processes/${currentProcess?.id}/steps/${stepId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/processes", currentProcess?.id] });
      refetch();
      toast({
        title: "Step deleted",
        description: "The process step has been removed.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete step",
      });
    },
  });

  if (!currentProcess) return null;

  const toggleGroup = (id: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedGroups(newExpanded);
  };

  const handleEditStep = (step: ProcessStep) => {
    setEditingStep(step);
    setEditStepOpen(true);
  };

  const handleDeleteStep = (step: ProcessStep) => {
    const childCount = currentProcess.steps.filter(s => s.parentStepId === step.id).length;
    const message = step.stepType === "group" && childCount > 0
      ? `Delete group "${step.name}" and its ${childCount} nested step(s)? This cannot be undone.`
      : `Delete step "${step.name}"? This cannot be undone.`;
    
    if (confirm(message)) {
      deleteMutation.mutate(step.id);
    }
  };

  const rootSteps = currentProcess.steps.filter(s => !s.parentStepId).sort((a, b) => a.seq - b.seq);
  const groupSteps = currentProcess.steps.filter(s => s.stepType === "group");
  const otherProcesses = allProcesses.filter(p => p.id !== currentProcess.id);
  
  const referencedProcesses = new Map<string, ProcessDef>();
  currentProcess.steps.forEach(step => {
    if (step.stepType === "subprocess_ref" && step.subprocessRefId) {
      const proc = allProcesses.find(p => p.id === step.subprocessRefId);
      if (proc) referencedProcesses.set(step.subprocessRefId, proc);
    }
  });

  const nextSeq = currentProcess.steps.length > 0 
    ? Math.max(...currentProcess.steps.map(s => s.seq)) + 1 
    : 1;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[800px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              {currentProcess.name} (Rev {currentProcess.rev})
            </DialogTitle>
            <DialogDescription>
              Process definition details and steps
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Status:</span>
                <span className="ml-2">
                  <StatusBadge status={currentProcess.status} />
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Revision:</span>
                <span className="ml-2">{currentProcess.rev}</span>
              </div>
              {currentProcess.effectiveFrom && (
                <div>
                  <span className="text-muted-foreground">Effective From:</span>
                  <span className="ml-2">{new Date(currentProcess.effectiveFrom).toLocaleDateString()}</span>
                </div>
              )}
              {currentProcess.changeNote && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Change Note:</span>
                  <span className="ml-2">{currentProcess.changeNote}</span>
                </div>
              )}
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold">Process Steps ({currentProcess.steps.length})</h4>
                <div className="flex items-center gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setAddStepOpen(true)}
                    data-testid="button-add-step"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Step
                  </Button>
                </div>
              </div>

              {currentProcess.steps.length > 0 ? (
                <div className="space-y-1 border rounded-md p-2">
                  {rootSteps.map((step) => (
                    <StepTreeItem
                      key={step.id}
                      step={step}
                      steps={currentProcess.steps}
                      level={0}
                      processId={currentProcess.id}
                      onEdit={handleEditStep}
                      onDelete={handleDeleteStep}
                      expandedGroups={expandedGroups}
                      toggleGroup={toggleGroup}
                      referencedProcesses={referencedProcesses}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground border rounded-md">
                  <Layers className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No process steps defined yet.</p>
                  <p className="text-xs mt-1">Click "Add Step" to create your first step.</p>
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <div className="flex items-center gap-1">
                  <Badge className={STEP_TYPE_COLORS.operation} variant="secondary">Op</Badge>
                  <span className="text-muted-foreground">Operation</span>
                </div>
                <div className="flex items-center gap-1">
                  <Badge className={STEP_TYPE_COLORS.group} variant="secondary">Grp</Badge>
                  <span className="text-muted-foreground">Group</span>
                </div>
                <div className="flex items-center gap-1">
                  <Badge className={STEP_TYPE_COLORS.subprocess_ref} variant="secondary">Ref</Badge>
                  <span className="text-muted-foreground">Subprocess Reference</span>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <StepFormDialog
        processId={currentProcess.id}
        availableProcesses={otherProcesses}
        availableGroups={groupSteps}
        open={addStepOpen}
        onOpenChange={(open) => {
          setAddStepOpen(open);
          if (!open) refetch();
        }}
        nextSeq={nextSeq}
      />

      <StepFormDialog
        processId={currentProcess.id}
        step={editingStep}
        availableProcesses={otherProcesses}
        availableGroups={groupSteps.filter(g => g.id !== editingStep?.id)}
        open={editStepOpen}
        onOpenChange={(open) => {
          setEditStepOpen(open);
          if (!open) {
            setEditingStep(undefined);
            refetch();
          }
        }}
        nextSeq={nextSeq}
      />
    </>
  );
}

export default function Processes() {
  const [searchQuery, setSearchQuery] = useState("");
  const [newProcessOpen, setNewProcessOpen] = useState(false);
  const [editProcessOpen, setEditProcessOpen] = useState(false);
  const [editingProcess, setEditingProcess] = useState<ProcessDef | undefined>();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedProcess, setSelectedProcess] = useState<ProcessWithSteps | null>(null);
  const { toast } = useToast();

  const { data: processes = [], isLoading, error } = useQuery<ProcessDef[]>({
    queryKey: ["/api/processes"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/processes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/processes"] });
      toast({
        title: "Process deleted",
        description: "The process has been successfully deleted.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete process",
      });
    },
  });

  const copyMutation = useMutation({
    mutationFn: async (processId: string) => {
      const res = await fetch(`/api/processes/${processId}`);
      if (!res.ok) throw new Error("Failed to fetch process");
      const data = await res.json() as ProcessWithSteps;
      
      const copyData = {
        process: {
          name: `${data.name} (Copy)`,
          rev: "A",
          status: "draft" as const,
          changeNote: `Copied from ${data.name} Rev ${data.rev}`,
        },
        steps: data.steps.map(step => ({
          seq: step.seq,
          name: step.name,
          area: step.area,
          equipment: step.equipment,
          equipmentIds: step.equipmentIds,
          branchTo: step.branchTo,
          reworkTo: step.reworkTo,
          stepType: step.stepType,
          parentStepId: step.parentStepId,
          subprocessRefId: step.subprocessRefId,
          subprocessRev: step.subprocessRev,
        })),
      };

      const createRes = await apiRequest("POST", "/api/processes", copyData);
      return await createRes.json() as ProcessDef;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/processes"] });
      toast({
        title: "Process copied",
        description: "A new copy of the process has been created.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to copy process",
      });
    },
  });

  const handleViewProcess = async (process: ProcessDef) => {
    const res = await fetch(`/api/processes/${process.id}`);
    if (res.ok) {
      const data: ProcessWithSteps = await res.json();
      setSelectedProcess(data);
      setDetailsOpen(true);
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load process details",
      });
    }
  };

  const handleEditProcess = (process: ProcessDef) => {
    setEditingProcess(process);
    setEditProcessOpen(true);
  };

  const handleCopyProcess = (process: ProcessDef) => {
    if (confirm(`Create a copy of "${process.name}" (Rev ${process.rev})?`)) {
      copyMutation.mutate(process.id);
    }
  };

  const handleDeleteProcess = (process: ProcessDef) => {
    if (confirm(`Delete process "${process.name}" (Rev ${process.rev})? This action cannot be undone.`)) {
      deleteMutation.mutate(process.id);
    }
  };

  const filteredProcesses = processes.filter(process => 
    process.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    process.rev.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (error) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                <Layers className="h-8 w-8" />
                Process Library
              </h1>
              <p className="text-muted-foreground mt-1">
                Manufacturing process definitions with version control
              </p>
            </div>
          </div>
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Layers className="h-12 w-12 text-destructive mb-4" />
                <h3 className="text-lg font-medium mb-2">Error loading processes</h3>
                <p className="text-sm text-muted-foreground">
                  {error instanceof Error ? error.message : "Failed to load processes"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Layers className="h-8 w-8" />
              Process Library
            </h1>
            <p className="text-muted-foreground mt-1">
              Manufacturing process definitions with version control
            </p>
          </div>
          <Button onClick={() => setNewProcessOpen(true)} data-testid="button-new-process">
            <Plus className="h-4 w-4 mr-2" />
            New Process
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search processes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-processes"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredProcesses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredProcesses.map((process) => (
              <Card key={process.id} className="hover-elevate" data-testid={`card-process-${process.id}`}>
                <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
                      <Layers className="h-5 w-5 text-foreground" />
                    </div>
                    <div className="flex flex-col">
                      <h3 className="font-medium leading-none">{process.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">Rev {process.rev}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <StatusBadge status={process.status} />
                  </div>
                  
                  {process.effectiveFrom && (
                    <div className="text-xs text-muted-foreground">
                      Effective: {new Date(process.effectiveFrom).toLocaleDateString()}
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 pt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleViewProcess(process)}
                      data-testid={`button-view-${process.id}`}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => handleEditProcess(process)}
                      data-testid={`button-edit-${process.id}`}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => handleCopyProcess(process)}
                      data-testid={`button-copy-${process.id}`}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => handleDeleteProcess(process)}
                      data-testid={`button-delete-${process.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Layers className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No processes found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {searchQuery 
                  ? "Try adjusting your search or create a new process."
                  : "Get started by creating your first manufacturing process definition."
                }
              </p>
              <Button onClick={() => setNewProcessOpen(true)} data-testid="button-create-first-process">
                <Plus className="h-4 w-4 mr-2" />
                Create First Process
              </Button>
            </CardContent>
          </Card>
        )}

        <ProcessFormDialog
          process={undefined}
          open={newProcessOpen}
          onOpenChange={setNewProcessOpen}
        />

        <ProcessFormDialog
          process={editingProcess}
          open={editProcessOpen}
          onOpenChange={(open) => {
            setEditProcessOpen(open);
            if (!open) {
              setEditingProcess(undefined);
            }
          }}
        />

        <ProcessDetailsDialog
          process={selectedProcess}
          allProcesses={processes}
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
        />
      </div>
    </div>
  );
}
