import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  ArrowLeft, 
  Plus, 
  Pencil, 
  Trash2, 
  Loader2, 
  GripVertical, 
  Save,
  Settings2,
  ChevronDown,
  ChevronRight,
  Link2,
  Folder
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ProcessDef, ProcessStep, StepType } from "@shared/schema";
import { insertProcessStepSchema } from "@shared/schema";

interface ProcessWithSteps extends ProcessDef {
  steps?: ProcessStep[];
}

const STEP_TYPE_OPTIONS: { value: StepType; label: string; description: string }[] = [
  { value: "operation", label: "Operation", description: "A single manufacturing operation" },
  { value: "group", label: "Group", description: "A container for related steps" },
  { value: "subprocess_ref", label: "Subprocess Reference", description: "Reference to another process" },
];

function getStatusBadgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "effective": return "default";
    case "draft": return "secondary";
    case "review": return "outline";
    case "superseded":
    case "obsolete": return "destructive";
    default: return "secondary";
  }
}

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={getStatusBadgeVariant(status)} className="capitalize">
      {status}
    </Badge>
  );
}

const stepFormSchema = insertProcessStepSchema.extend({
  processDefId: z.string().uuid().optional(),
}).omit({ id: true as never });

type StepFormData = z.infer<typeof stepFormSchema>;

function StepFormDialog({
  processId,
  step,
  allProcesses,
  existingSteps,
  open,
  onOpenChange,
}: {
  processId: string;
  step?: ProcessStep;
  allProcesses: ProcessDef[];
  existingSteps: ProcessStep[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const isEditing = !!step;

  const nextSeq = existingSteps.length > 0 
    ? Math.max(...existingSteps.map(s => s.seq)) + 1 
    : 1;

  const form = useForm<StepFormData>({
    resolver: zodResolver(stepFormSchema),
    defaultValues: {
      name: "",
      seq: nextSeq,
      area: "",
      stepType: "operation",
      parentStepId: null,
      subprocessRefId: null,
      equipment: [],
    },
  });

  const stepType = form.watch("stepType");

  useEffect(() => {
    if (step && open) {
      form.reset({
        name: step.name,
        seq: step.seq,
        area: step.area || "",
        stepType: step.stepType,
        parentStepId: step.parentStepId || null,
        subprocessRefId: step.subprocessRefId || null,
        equipment: step.equipment || [],
      });
    } else if (!open) {
      form.reset({
        name: "",
        seq: nextSeq,
        area: "",
        stepType: "operation",
        parentStepId: null,
        subprocessRefId: null,
        equipment: [],
      });
    }
  }, [step, open, form, nextSeq]);

  const mutation = useMutation({
    mutationFn: async (data: StepFormData) => {
      const url = isEditing 
        ? `/api/processes/${processId}/steps/${step.id}` 
        : `/api/processes/${processId}/steps`;
      const method = isEditing ? "PATCH" : "POST";
      const res = await apiRequest(method, url, data);
      return await res.json() as ProcessStep;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/processes/${processId}`] });
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

  const groupSteps = existingSteps.filter(s => s.stepType === "group" && s.id !== step?.id);
  const otherProcesses = allProcesses.filter(p => p.id !== processId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Step" : "Add New Step"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the process step details."
              : "Add a new step to this process definition."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Step Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., Material Loading, Quality Check" 
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
                name="seq"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sequence</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min={1}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                        data-testid="input-step-seq"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="stepType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Step Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-step-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {STEP_TYPE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="area"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Work Area</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g., Assembly Line 1, Weld Cell A" 
                      {...field} 
                      value={field.value || ""}
                      data-testid="input-step-area"
                    />
                  </FormControl>
                  <FormDescription>
                    The physical location or work cell for this step
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {groupSteps.length > 0 && stepType !== "group" && (
              <FormField
                control={form.control}
                name="parentStepId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parent Group (Optional)</FormLabel>
                    <Select 
                      onValueChange={(val) => field.onChange(val === "none" ? null : val)} 
                      value={field.value || "none"}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-parent-step">
                          <SelectValue placeholder="Select parent group" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No Parent</SelectItem>
                        {groupSteps.map((g) => (
                          <SelectItem key={g.id} value={g.id}>
                            {g.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Nest this step under a group
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {stepType === "subprocess_ref" && (
              <FormField
                control={form.control}
                name="subprocessRefId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Referenced Process</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value || ""}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-subprocess-ref">
                          <SelectValue placeholder="Select a process" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {otherProcesses.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name} (Rev {p.rev})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Link to another process definition as a subprocess
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter>
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
                data-testid="button-step-submit"
              >
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Save Changes" : "Add Step"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteStepDialog({
  processId,
  step,
  open,
  onOpenChange,
}: {
  processId: string;
  step: ProcessStep | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async () => {
      if (!step) return;
      await apiRequest("DELETE", `/api/processes/${processId}/steps/${step.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/processes/${processId}`] });
      toast({
        title: "Step deleted",
        description: "The process step has been removed.",
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete step",
      });
    },
  });

  if (!step) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Step</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete <strong>"{step.name}"</strong>?
            {step.stepType === "group" && (
              <>
                <br /><br />
                <span className="text-destructive">
                  Warning: This is a group step. Child steps will be orphaned.
                </span>
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete Step
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function StepRow({
  step,
  allSteps,
  onEdit,
  onDelete,
  level = 0,
}: {
  step: ProcessStep;
  allSteps: ProcessStep[];
  onEdit: (step: ProcessStep) => void;
  onDelete: (step: ProcessStep) => void;
  level?: number;
}) {
  const [expanded, setExpanded] = useState(true);
  const childSteps = allSteps.filter(s => s.parentStepId === step.id).sort((a, b) => a.seq - b.seq);
  const hasChildren = childSteps.length > 0;

  const getStepIcon = () => {
    switch (step.stepType) {
      case "group":
        return <Folder className="h-4 w-4 text-purple-500" />;
      case "subprocess_ref":
        return <Link2 className="h-4 w-4 text-green-500" />;
      default:
        return <Settings2 className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <>
      <div 
        className="flex items-center gap-2 py-2 px-3 border-b hover:bg-muted/50 transition-colors"
        style={{ paddingLeft: `${level * 24 + 12}px` }}
      >
        {step.stepType === "group" && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        )}
        {step.stepType !== "group" && <div className="w-6" />}
        
        <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
        
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-medium">
          {step.seq}
        </div>
        
        {getStepIcon()}
        
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{step.name}</p>
          {step.area && (
            <p className="text-xs text-muted-foreground truncate">{step.area}</p>
          )}
        </div>

        <Badge variant="outline" className="text-xs shrink-0">
          {step.stepType === "group" ? "Group" : step.stepType === "subprocess_ref" ? "Subprocess" : "Operation"}
        </Badge>

        {step.equipment && step.equipment.length > 0 && (
          <Badge variant="secondary" className="text-xs shrink-0">
            {step.equipment.length} Equipment
          </Badge>
        )}

        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onEdit(step)}
            data-testid={`button-edit-step-${step.id}`}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => onDelete(step)}
            data-testid={`button-delete-step-${step.id}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {expanded && hasChildren && childSteps.map((child) => (
        <StepRow
          key={child.id}
          step={child}
          allSteps={allSteps}
          onEdit={onEdit}
          onDelete={onDelete}
          level={level + 1}
        />
      ))}
    </>
  );
}

export default function ProcessDetail() {
  const [, params] = useRoute("/processes/:id");
  const [, navigate] = useLocation();
  const processId = params?.id;

  const [stepDialogOpen, setStepDialogOpen] = useState(false);
  const [deleteStepDialogOpen, setDeleteStepDialogOpen] = useState(false);
  const [selectedStep, setSelectedStep] = useState<ProcessStep | null>(null);

  const { data: process, isLoading: processLoading, error: processError } = useQuery<ProcessWithSteps>({
    queryKey: [`/api/processes/${processId}`],
    enabled: !!processId,
  });

  const { data: allProcesses = [] } = useQuery<ProcessDef[]>({
    queryKey: ["/api/processes"],
  });

  if (!processId) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Invalid process ID</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/processes")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Processes
        </Button>
      </div>
    );
  }

  if (processLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (processError || !process) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Process not found</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/processes")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Processes
        </Button>
      </div>
    );
  }

  const steps = process.steps || [];
  const rootSteps = steps.filter(s => !s.parentStepId).sort((a, b) => a.seq - b.seq);

  const handleAddStep = () => {
    setSelectedStep(null);
    setStepDialogOpen(true);
  };

  const handleEditStep = (step: ProcessStep) => {
    setSelectedStep(step);
    setStepDialogOpen(true);
  };

  const handleDeleteStep = (step: ProcessStep) => {
    setSelectedStep(step);
    setDeleteStepDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/processes")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{process.name}</h1>
            <StatusBadge status={process.status} />
          </div>
          <p className="text-muted-foreground">
            Revision {process.rev} • Created {new Date(process.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Process Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Process Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Revision</p>
              <p className="font-mono font-medium">{process.rev}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <StatusBadge status={process.status} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Effective From</p>
              <p className="font-medium">
                {process.effectiveFrom 
                  ? new Date(process.effectiveFrom).toLocaleDateString()
                  : "Not set"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Steps</p>
              <p className="font-medium">{steps.length}</p>
            </div>
          </div>
          {process.changeNote && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-1">Change Notes</p>
              <p className="text-sm bg-muted p-3 rounded-md">{process.changeNote}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Process Steps */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-lg">Process Steps</CardTitle>
            <CardDescription>
              Define the sequence of operations for this process
            </CardDescription>
          </div>
          <Button onClick={handleAddStep} data-testid="button-add-step">
            <Plus className="mr-2 h-4 w-4" />
            Add Step
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {steps.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground border-t">
              <Settings2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No steps defined</p>
              <p className="text-sm mt-1">Add steps to define the process flow</p>
              <Button className="mt-4" onClick={handleAddStep}>
                <Plus className="mr-2 h-4 w-4" />
                Add First Step
              </Button>
            </div>
          ) : (
            <div className="border-t">
              {rootSteps.map((step) => (
                <StepRow
                  key={step.id}
                  step={step}
                  allSteps={steps}
                  onEdit={handleEditStep}
                  onDelete={handleDeleteStep}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <StepFormDialog
        processId={processId}
        step={selectedStep || undefined}
        allProcesses={allProcesses}
        existingSteps={steps}
        open={stepDialogOpen}
        onOpenChange={setStepDialogOpen}
      />

      <DeleteStepDialog
        processId={processId}
        step={selectedStep}
        open={deleteStepDialogOpen}
        onOpenChange={setDeleteStepDialogOpen}
      />
    </div>
  );
}
