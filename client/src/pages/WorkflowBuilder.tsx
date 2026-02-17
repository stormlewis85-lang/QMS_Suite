import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Pencil,
  Copy,
  Trash2,
  ArrowUp,
  ArrowDown,
  X,
  Loader2,
  Workflow,
  GripVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

interface WorkflowStep {
  name: string;
  assigneeType: string;
  assigneeValue: string;
  dueDays: number;
  signatureRequired: boolean;
  signatureMeaning: string;
  canDelegate: boolean;
}

interface WorkflowDefinition {
  id: number;
  orgId: string;
  name: string;
  code: string;
  description: string | null;
  appliesToDocTypes: string;
  appliesToCategories: string;
  steps: string;
  allowParallelSteps: number;
  requireAllSignatures: number;
  autoObsoletePrevious: number;
  status: string | null;
  createdBy: string;
  createdAt: string | null;
}

const DOC_TYPES = [
  "procedure",
  "work_instruction",
  "form",
  "specification",
  "standard",
  "drawing",
  "customer_spec",
  "external",
  "policy",
  "record",
];

const ASSIGNEE_TYPES = [
  { value: "initiator", label: "Initiator" },
  { value: "user", label: "Specific User" },
  { value: "role", label: "Role-based" },
  { value: "department_head", label: "Department Head" },
];

const ROLES = ["admin", "quality_manager", "engineer", "viewer"];

function emptyStep(): WorkflowStep {
  return {
    name: "",
    assigneeType: "initiator",
    assigneeValue: "",
    dueDays: 5,
    signatureRequired: false,
    signatureMeaning: "",
    canDelegate: false,
  };
}

function parseJsonField(val: string | null | undefined): string[] {
  if (!val) return [];
  try {
    return JSON.parse(val);
  } catch {
    return [];
  }
}

function parseSteps(val: string | null | undefined): WorkflowStep[] {
  if (!val) return [];
  try {
    return JSON.parse(val);
  } catch {
    return [];
  }
}

export default function WorkflowBuilder() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [docTypes, setDocTypes] = useState<string[]>([]);
  const [steps, setSteps] = useState<WorkflowStep[]>([emptyStep()]);

  const { data: workflows = [], isLoading } = useQuery<WorkflowDefinition[]>({
    queryKey: ["/api/approval-workflow-definitions"],
    queryFn: async () => {
      const res = await fetch("/api/approval-workflow-definitions", {
        credentials: "include",
      });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const url = editingId
        ? `/api/approval-workflow-definitions/${editingId}`
        : "/api/approval-workflow-definitions";
      const method = editingId ? "PATCH" : "POST";
      const res = await apiRequest(method, url, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/approval-workflow-definitions"],
      });
      toast({
        title: editingId ? "Workflow Updated" : "Workflow Created",
        description: `Workflow "${name}" has been saved.`,
      });
      setEditorOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/approval-workflow-definitions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/approval-workflow-definitions"],
      });
      toast({ title: "Deleted", description: "Workflow has been deleted." });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  function resetForm() {
    setEditingId(null);
    setName("");
    setCode("");
    setDescription("");
    setDocTypes([]);
    setSteps([emptyStep()]);
  }

  function openCreate() {
    resetForm();
    setEditorOpen(true);
  }

  function openEdit(wf: WorkflowDefinition) {
    setEditingId(wf.id);
    setName(wf.name);
    setCode(wf.code);
    setDescription(wf.description || "");
    setDocTypes(parseJsonField(wf.appliesToDocTypes));
    setSteps(
      parseSteps(wf.steps).length > 0 ? parseSteps(wf.steps) : [emptyStep()]
    );
    setEditorOpen(true);
  }

  function cloneWorkflow(wf: WorkflowDefinition) {
    setEditingId(null);
    setName(`${wf.name} (Copy)`);
    setCode(`${wf.code}-COPY`);
    setDescription(wf.description || "");
    setDocTypes(parseJsonField(wf.appliesToDocTypes));
    setSteps(
      parseSteps(wf.steps).length > 0 ? parseSteps(wf.steps) : [emptyStep()]
    );
    setEditorOpen(true);
  }

  function handleSave() {
    if (!name.trim() || !code.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Name and code are required.",
      });
      return;
    }
    const validSteps = steps.filter((s) => s.name.trim());
    if (validSteps.length === 0) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "At least one step is required.",
      });
      return;
    }

    saveMutation.mutate({
      name: name.trim(),
      code: code.trim(),
      description: description.trim() || null,
      appliesToDocTypes: JSON.stringify(docTypes),
      appliesToCategories: "[]",
      steps: JSON.stringify(validSteps),
      createdBy: user ? `${user.firstName} ${user.lastName}` : "System",
    });
  }

  function updateStep(index: number, updates: Partial<WorkflowStep>) {
    setSteps((prev) =>
      prev.map((s, i) => (i === index ? { ...s, ...updates } : s))
    );
  }

  function addStep() {
    setSteps((prev) => [...prev, emptyStep()]);
  }

  function removeStep(index: number) {
    if (steps.length <= 1) return;
    setSteps((prev) => prev.filter((_, i) => i !== index));
  }

  function moveStep(index: number, direction: -1 | 1) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= steps.length) return;
    setSteps((prev) => {
      const arr = [...prev];
      [arr[index], arr[newIndex]] = [arr[newIndex], arr[index]];
      return arr;
    });
  }

  function toggleDocType(type: string) {
    setDocTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Approval Workflows</h1>
          <p className="text-sm text-muted-foreground">
            Define and manage document approval workflows
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          New Workflow
        </Button>
      </div>

      {/* Workflow List */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Applies To</TableHead>
                <TableHead>Steps</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workflows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-12 text-muted-foreground"
                  >
                    <Workflow className="mx-auto h-12 w-12 mb-3 opacity-50" />
                    <p className="text-sm">No workflows defined yet.</p>
                    <Button
                      variant="outline"
                      className="mt-3"
                      onClick={openCreate}
                    >
                      Create your first workflow
                    </Button>
                  </TableCell>
                </TableRow>
              ) : (
                workflows.map((wf) => {
                  const stepsArr = parseSteps(wf.steps);
                  const typesArr = parseJsonField(wf.appliesToDocTypes);
                  return (
                    <TableRow key={wf.id}>
                      <TableCell className="font-medium text-sm">
                        {wf.name}
                      </TableCell>
                      <TableCell className="text-sm font-mono">
                        {wf.code}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {typesArr.length === 0 ? (
                            <span className="text-xs text-muted-foreground">
                              All types
                            </span>
                          ) : (
                            typesArr.slice(0, 3).map((t) => (
                              <Badge key={t} variant="outline" className="text-xs capitalize">
                                {t.replace(/_/g, " ")}
                              </Badge>
                            ))
                          )}
                          {typesArr.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{typesArr.length - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {stepsArr.length} step{stepsArr.length !== 1 ? "s" : ""}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            wf.status === "active" ? "default" : "secondary"
                          }
                        >
                          {wf.status || "active"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(wf)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => cloneWorkflow(wf)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteMutation.mutate(wf.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Workflow Editor Dialog */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Workflow" : "Create New Workflow"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Basic info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name *</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Standard Document Approval"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Code *</label>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="WF-STD-001"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe this workflow..."
                rows={2}
              />
            </div>

            {/* Document types */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Applies to document types
              </label>
              <div className="flex gap-3 flex-wrap">
                {DOC_TYPES.map((type) => (
                  <label
                    key={type}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <Checkbox
                      checked={docTypes.includes(type)}
                      onCheckedChange={() => toggleDocType(type)}
                    />
                    <span className="capitalize">
                      {type.replace(/_/g, " ")}
                    </span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Leave empty to apply to all document types.
              </p>
            </div>

            {/* Steps */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Workflow Steps</label>
                <Button variant="outline" size="sm" onClick={addStep}>
                  <Plus className="mr-1 h-3 w-3" />
                  Add Step
                </Button>
              </div>

              {steps.map((step, index) => (
                <Card key={index} className="border-dashed">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          Step {index + 1}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          disabled={index === 0}
                          onClick={() => moveStep(index, -1)}
                        >
                          <ArrowUp className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          disabled={index === steps.length - 1}
                          onClick={() => moveStep(index, 1)}
                        >
                          <ArrowDown className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          disabled={steps.length <= 1}
                          onClick={() => removeStep(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-medium">
                          Step Name *
                        </label>
                        <Input
                          value={step.name}
                          onChange={(e) =>
                            updateStep(index, { name: e.target.value })
                          }
                          placeholder="Technical Review"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium">Assignee</label>
                        <Select
                          value={step.assigneeType}
                          onValueChange={(v) =>
                            updateStep(index, {
                              assigneeType: v,
                              assigneeValue: "",
                            })
                          }
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ASSIGNEE_TYPES.map((t) => (
                              <SelectItem key={t.value} value={t.value}>
                                {t.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {step.assigneeType === "role" && (
                      <div className="space-y-1">
                        <label className="text-xs font-medium">Role</label>
                        <Select
                          value={step.assigneeValue}
                          onValueChange={(v) =>
                            updateStep(index, { assigneeValue: v })
                          }
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLES.map((r) => (
                              <SelectItem key={r} value={r}>
                                {r.replace(/_/g, " ")}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {step.assigneeType === "user" && (
                      <div className="space-y-1">
                        <label className="text-xs font-medium">User ID</label>
                        <Input
                          value={step.assigneeValue}
                          onChange={(e) =>
                            updateStep(index, {
                              assigneeValue: e.target.value,
                            })
                          }
                          placeholder="Enter user ID or email"
                          className="h-8 text-sm"
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-medium">
                          Due in (days)
                        </label>
                        <Input
                          type="number"
                          value={step.dueDays}
                          onChange={(e) =>
                            updateStep(index, {
                              dueDays: parseInt(e.target.value) || 0,
                            })
                          }
                          min={1}
                          className="h-8 text-sm"
                        />
                      </div>
                      <label className="flex items-center gap-2 text-sm cursor-pointer pt-5">
                        <Checkbox
                          checked={step.signatureRequired}
                          onCheckedChange={(c) =>
                            updateStep(index, {
                              signatureRequired: c === true,
                            })
                          }
                        />
                        Signature Required
                      </label>
                      <label className="flex items-center gap-2 text-sm cursor-pointer pt-5">
                        <Checkbox
                          checked={step.canDelegate}
                          onCheckedChange={(c) =>
                            updateStep(index, { canDelegate: c === true })
                          }
                        />
                        Can Delegate
                      </label>
                    </div>

                    {step.signatureRequired && (
                      <div className="space-y-1">
                        <label className="text-xs font-medium">
                          Signature Meaning
                        </label>
                        <Input
                          value={step.signatureMeaning}
                          onChange={(e) =>
                            updateStep(index, {
                              signatureMeaning: e.target.value,
                            })
                          }
                          placeholder="I approve this document for production use"
                          className="h-8 text-sm"
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditorOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {editingId ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
