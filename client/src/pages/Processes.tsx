import { useState, useEffect } from "react";
import { Layers, Plus, Search, Eye, Copy, Edit, Loader2, Trash2 } from "lucide-react";
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
  DialogTrigger,
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
import { StatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ProcessDef, ProcessStep } from "@shared/schema";
import { insertProcessDefSchema } from "@shared/schema";

const createProcessFormSchema = insertProcessDefSchema.extend({
  createdBy: z.string().uuid().optional(),
});

type CreateProcessForm = z.infer<typeof createProcessFormSchema>;

// Process Form Dialog (shared by Create and Edit)
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

// Process Details Dialog
type ProcessWithSteps = ProcessDef & {
  steps: ProcessStep[];
};

function ProcessDetailsDialog({ 
  process,
  open,
  onOpenChange,
}: { 
  process: ProcessWithSteps | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!process) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{process.name} (Rev {process.rev})</DialogTitle>
          <DialogDescription>
            Process definition details and steps
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Status:</span>
              <span className="ml-2">
                <StatusBadge status={process.status} />
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Revision:</span>
              <span className="ml-2">{process.rev}</span>
            </div>
            {process.effectiveFrom && (
              <div>
                <span className="text-muted-foreground">Effective From:</span>
                <span className="ml-2">{new Date(process.effectiveFrom).toLocaleDateString()}</span>
              </div>
            )}
            {process.changeNote && (
              <div className="col-span-2">
                <span className="text-muted-foreground">Change Note:</span>
                <span className="ml-2">{process.changeNote}</span>
              </div>
            )}
          </div>

          <div className="border-t pt-4">
            <h4 className="text-sm font-semibold mb-3">Process Steps ({process.steps.length})</h4>
            {process.steps.length > 0 ? (
              <div className="space-y-2">
                {process.steps.map((step) => (
                  <Card key={step.id} className="p-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium text-sm">
                          Step {step.seq}: {step.name}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Area: {step.area}
                        </div>
                      </div>
                      {step.equipmentIds && step.equipmentIds.length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {step.equipmentIds.length} equipment
                        </Badge>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No process steps defined yet.</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
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
      
      // Create a copy with modified name and new revision
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

        {/* Dialogs */}
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
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
        />
      </div>
    </div>
  );
}
