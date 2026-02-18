import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
  FileCog,
  CheckCircle,
  Power,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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

interface FieldMapping {
  field: string;
  rule: string;
  value: string;
}

interface DocumentTemplate {
  id: number;
  orgId: string;
  name: string;
  code: string;
  description: string | null;
  docType: string;
  category: string | null;
  department: string | null;
  templateFileId: number | null;
  fieldMappings: string;
  version: string | null;
  status: string | null;
  effectiveFrom: string | null;
  defaultWorkflowId: number | null;
  defaultReviewCycleDays: number;
  createdBy: string;
  createdAt: string | null;
  updatedAt: string | null;
}

interface WorkflowDef {
  id: number;
  name: string;
  code: string;
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

const DEPARTMENTS = [
  "Quality",
  "Production",
  "Engineering",
  "Maintenance",
  "Management",
  "Purchasing",
];

const CATEGORIES = [
  "Production",
  "Quality",
  "Safety",
  "Engineering",
  "General",
  "Customer",
];

function parseFieldMappings(val: string | null | undefined): FieldMapping[] {
  if (!val) return [];
  try {
    return JSON.parse(val);
  } catch {
    return [];
  }
}

export default function DocumentTemplates() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [docType, setDocType] = useState("work_instruction");
  const [category, setCategory] = useState("");
  const [department, setDepartment] = useState("");
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
  const [defaultWorkflowId, setDefaultWorkflowId] = useState<string>("");
  const [reviewCycleDays, setReviewCycleDays] = useState(365);

  const { data: templates = [], isLoading } = useQuery<DocumentTemplate[]>({
    queryKey: ["/api/document-templates"],
    queryFn: async () => {
      const res = await fetch("/api/document-templates", {
        credentials: "include",
      });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: workflows = [] } = useQuery<WorkflowDef[]>({
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
        ? `/api/document-templates/${editingId}`
        : "/api/document-templates";
      const method = editingId ? "PATCH" : "POST";
      const res = await apiRequest(method, url, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/document-templates"] });
      toast({
        title: editingId ? "Updated" : "Created",
        description: `Template "${name}" saved.`,
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
      await apiRequest("DELETE", `/api/document-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/document-templates"] });
      toast({ title: "Deleted", description: "Template removed." });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const activateMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest(
        "POST",
        `/api/document-templates/${id}/activate`
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/document-templates"] });
      toast({ title: "Activated", description: "Template is now active." });
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
    setDocType("work_instruction");
    setCategory("");
    setDepartment("");
    setFieldMappings([]);
    setDefaultWorkflowId("");
    setReviewCycleDays(365);
  }

  function openCreate() {
    resetForm();
    setEditorOpen(true);
  }

  function openEdit(t: DocumentTemplate) {
    setEditingId(t.id);
    setName(t.name);
    setCode(t.code);
    setDescription(t.description || "");
    setDocType(t.docType);
    setCategory(t.category || "");
    setDepartment(t.department || "");
    setFieldMappings(parseFieldMappings(t.fieldMappings));
    setDefaultWorkflowId(t.defaultWorkflowId ? String(t.defaultWorkflowId) : "");
    setReviewCycleDays(t.defaultReviewCycleDays || 365);
    setEditorOpen(true);
  }

  function handleSave() {
    if (!name.trim() || !code.trim() || !docType) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Name, code, and document type are required.",
      });
      return;
    }

    saveMutation.mutate({
      name: name.trim(),
      code: code.trim(),
      description: description.trim() || null,
      docType,
      category: category || null,
      department: department || null,
      fieldMappings: JSON.stringify(fieldMappings),
      defaultWorkflowId: defaultWorkflowId
        ? parseInt(defaultWorkflowId)
        : null,
      defaultReviewCycleDays: reviewCycleDays,
      createdBy: user ? `${user.firstName} ${user.lastName}` : "System",
    });
  }

  function addMapping() {
    setFieldMappings((prev) => [
      ...prev,
      { field: "", rule: "auto_generate", value: "" },
    ]);
  }

  function updateMapping(index: number, updates: Partial<FieldMapping>) {
    setFieldMappings((prev) =>
      prev.map((m, i) => (i === index ? { ...m, ...updates } : m))
    );
  }

  function removeMapping(index: number) {
    setFieldMappings((prev) => prev.filter((_, i) => i !== index));
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
          <h1 className="text-2xl font-bold">Document Templates</h1>
          <p className="text-sm text-muted-foreground">
            Manage document creation templates
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          New Template
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Workflow</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-12 text-muted-foreground"
                  >
                    <FileCog className="mx-auto h-12 w-12 mb-3 opacity-50" />
                    <p className="text-sm">No templates defined yet.</p>
                    <Button
                      variant="outline"
                      className="mt-3"
                      onClick={openCreate}
                    >
                      Create your first template
                    </Button>
                  </TableCell>
                </TableRow>
              ) : (
                templates.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium text-sm">
                      {t.name}
                    </TableCell>
                    <TableCell className="text-sm font-mono">
                      {t.code}
                    </TableCell>
                    <TableCell className="text-sm capitalize">
                      {t.docType.replace(/_/g, " ")}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          t.status === "active"
                            ? "default"
                            : t.status === "deprecated"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {t.status || "draft"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {t.defaultWorkflowId
                        ? workflows.find((w) => w.id === t.defaultWorkflowId)
                            ?.name || `#${t.defaultWorkflowId}`
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {t.status === "draft" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => activateMutation.mutate(t.id)}
                            title="Activate"
                          >
                            <Power className="h-4 w-4 text-green-600" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(t)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMutation.mutate(t.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Editor Dialog */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="sm:max-w-[650px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Template" : "New Template"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name *</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Work Instruction Template"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Code *</label>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="TMPL-WI-001"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Template description..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Document Type *</label>
                <Select value={docType} onValueChange={setDocType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOC_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        <span className="capitalize">
                          {t.replace(/_/g, " ")}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Department</label>
                <Select value={department} onValueChange={setDepartment}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Field Mappings */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Field Mappings</label>
                <Button variant="outline" size="sm" onClick={addMapping}>
                  <Plus className="mr-1 h-3 w-3" />
                  Add
                </Button>
              </div>

              {fieldMappings.length === 0 ? (
                <p className="text-sm text-muted-foreground py-3 text-center border rounded-lg border-dashed">
                  No field mappings.
                </p>
              ) : (
                <div className="space-y-2">
                  {fieldMappings.map((m, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 p-2 border rounded-lg"
                    >
                      <Input
                        value={m.field}
                        onChange={(e) =>
                          updateMapping(i, { field: e.target.value })
                        }
                        placeholder="Field name"
                        className="h-8 text-sm flex-1"
                      />
                      <span className="text-xs text-muted-foreground">
                        &rarr;
                      </span>
                      <Select
                        value={m.rule}
                        onValueChange={(v) => updateMapping(i, { rule: v })}
                      >
                        <SelectTrigger className="h-8 text-sm w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="auto_generate">
                            Auto Generate
                          </SelectItem>
                          <SelectItem value="auto_increment">
                            Auto Increment
                          </SelectItem>
                          <SelectItem value="current_date">
                            Current Date
                          </SelectItem>
                          <SelectItem value="linked">Linked Field</SelectItem>
                          <SelectItem value="static">Static Value</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        value={m.value}
                        onChange={(e) =>
                          updateMapping(i, { value: e.target.value })
                        }
                        placeholder="Pattern/value"
                        className="h-8 text-sm flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => removeMapping(i)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Default Workflow</label>
                <Select
                  value={defaultWorkflowId || "__none__"}
                  onValueChange={(v) => setDefaultWorkflowId(v === "__none__" ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {workflows.map((w) => (
                      <SelectItem key={w.id} value={String(w.id)}>
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Review Cycle (days)
                </label>
                <Input
                  type="number"
                  value={reviewCycleDays}
                  onChange={(e) =>
                    setReviewCycleDays(parseInt(e.target.value) || 365)
                  }
                  min={1}
                />
              </div>
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
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
