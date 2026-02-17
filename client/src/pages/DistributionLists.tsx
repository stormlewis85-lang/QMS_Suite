import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Pencil,
  Trash2,
  Users,
  X,
  Loader2,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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

interface Recipient {
  type: "user" | "role" | "department";
  value: string;
  label: string;
}

interface DistributionList {
  id: number;
  orgId: string;
  name: string;
  code: string;
  description: string | null;
  recipients: string;
  requireAcknowledgment: number;
  acknowledgmentDueDays: number;
  sendEmailNotification: number;
  status: string | null;
  createdBy: string;
  createdAt: string | null;
  updatedAt: string | null;
}

function parseRecipients(val: string | null | undefined): Recipient[] {
  if (!val) return [];
  try {
    return JSON.parse(val);
  } catch {
    return [];
  }
}

const ROLES = ["admin", "quality_manager", "engineer", "viewer"];
const DEPARTMENTS = [
  "Quality",
  "Production",
  "Engineering",
  "Maintenance",
  "Management",
  "Purchasing",
  "Logistics",
];

export default function DistributionLists() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [addRecipientOpen, setAddRecipientOpen] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [requireAck, setRequireAck] = useState(true);
  const [ackDueDays, setAckDueDays] = useState(7);
  const [sendEmail, setSendEmail] = useState(true);

  // Add recipient form
  const [recipientType, setRecipientType] = useState<"user" | "role" | "department">("role");
  const [recipientValue, setRecipientValue] = useState("");

  const { data: lists = [], isLoading } = useQuery<DistributionList[]>({
    queryKey: ["/api/distribution-lists"],
    queryFn: async () => {
      const res = await fetch("/api/distribution-lists", {
        credentials: "include",
      });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const url = editingId
        ? `/api/distribution-lists/${editingId}`
        : "/api/distribution-lists";
      const method = editingId ? "PATCH" : "POST";
      const res = await apiRequest(method, url, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/distribution-lists"] });
      toast({
        title: editingId ? "Updated" : "Created",
        description: `Distribution list "${name}" saved.`,
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
      await apiRequest("DELETE", `/api/distribution-lists/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/distribution-lists"] });
      toast({ title: "Deleted", description: "Distribution list removed." });
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
    setRecipients([]);
    setRequireAck(true);
    setAckDueDays(7);
    setSendEmail(true);
  }

  function openCreate() {
    resetForm();
    setEditorOpen(true);
  }

  function openEdit(list: DistributionList) {
    setEditingId(list.id);
    setName(list.name);
    setCode(list.code);
    setDescription(list.description || "");
    setRecipients(parseRecipients(list.recipients));
    setRequireAck(!!list.requireAcknowledgment);
    setAckDueDays(list.acknowledgmentDueDays);
    setSendEmail(!!list.sendEmailNotification);
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

    saveMutation.mutate({
      name: name.trim(),
      code: code.trim(),
      description: description.trim() || null,
      recipients: JSON.stringify(recipients),
      requireAcknowledgment: requireAck ? 1 : 0,
      acknowledgmentDueDays: ackDueDays,
      sendEmailNotification: sendEmail ? 1 : 0,
      createdBy: user ? `${user.firstName} ${user.lastName}` : "System",
    });
  }

  function addRecipient() {
    if (!recipientValue) return;
    const label =
      recipientType === "role"
        ? `Role: ${recipientValue.replace(/_/g, " ")}`
        : recipientType === "department"
        ? `Department: ${recipientValue}`
        : `User: ${recipientValue}`;
    setRecipients((prev) => [
      ...prev,
      { type: recipientType, value: recipientValue, label },
    ]);
    setRecipientValue("");
    setAddRecipientOpen(false);
  }

  function removeRecipient(index: number) {
    setRecipients((prev) => prev.filter((_, i) => i !== index));
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
          <h1 className="text-2xl font-bold">Distribution Lists</h1>
          <p className="text-sm text-muted-foreground">
            Manage document distribution lists and recipients
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          New List
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Recipients</TableHead>
                <TableHead>Acknowledgment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lists.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-12 text-muted-foreground"
                  >
                    <Users className="mx-auto h-12 w-12 mb-3 opacity-50" />
                    <p className="text-sm">No distribution lists yet.</p>
                    <Button
                      variant="outline"
                      className="mt-3"
                      onClick={openCreate}
                    >
                      Create your first list
                    </Button>
                  </TableCell>
                </TableRow>
              ) : (
                lists.map((list) => {
                  const recs = parseRecipients(list.recipients);
                  return (
                    <TableRow key={list.id}>
                      <TableCell className="font-medium text-sm">
                        {list.name}
                      </TableCell>
                      <TableCell className="text-sm font-mono">
                        {list.code}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          <Users className="mr-1 h-3 w-3" />
                          {recs.length}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {list.requireAcknowledgment ? (
                          <Badge variant="outline" className="text-xs">
                            Required ({list.acknowledgmentDueDays}d)
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Not required
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            list.status === "active" ? "default" : "secondary"
                          }
                        >
                          {list.status || "active"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(list)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteMutation.mutate(list.id)}
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

      {/* Editor Dialog */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Distribution List" : "New Distribution List"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name *</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Production Floor Documents"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Code *</label>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="DL-PROD-001"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe this distribution list..."
                rows={2}
              />
            </div>

            {/* Recipients */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Recipients</label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setRecipientType("role");
                    setRecipientValue("");
                    setAddRecipientOpen(true);
                  }}
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Add
                </Button>
              </div>

              {recipients.length === 0 ? (
                <p className="text-sm text-muted-foreground py-3 text-center border rounded-lg border-dashed">
                  No recipients added yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {recipients.map((r, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2 border rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {r.type}
                        </Badge>
                        <span className="text-sm">{r.label}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => removeRecipient(i)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Settings */}
            <div className="space-y-3 border-t pt-4">
              <label className="text-sm font-medium">Settings</label>
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={requireAck}
                    onCheckedChange={(c) => setRequireAck(c === true)}
                  />
                  Require acknowledgment
                </label>
                {requireAck && (
                  <div className="flex items-center gap-2 pl-6">
                    <span className="text-sm text-muted-foreground">
                      Acknowledgment due in
                    </span>
                    <Input
                      type="number"
                      value={ackDueDays}
                      onChange={(e) =>
                        setAckDueDays(parseInt(e.target.value) || 7)
                      }
                      min={1}
                      className="w-20 h-8 text-sm"
                    />
                    <span className="text-sm text-muted-foreground">days</span>
                  </div>
                )}
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={sendEmail}
                    onCheckedChange={(c) => setSendEmail(c === true)}
                  />
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  Send email notification
                </label>
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

      {/* Add Recipient Dialog */}
      <Dialog open={addRecipientOpen} onOpenChange={setAddRecipientOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Recipient</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <Select
                value={recipientType}
                onValueChange={(v) =>
                  setRecipientType(v as "user" | "role" | "department")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="role">Role</SelectItem>
                  <SelectItem value="department">Department</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {recipientType === "user" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">User</label>
                <Input
                  value={recipientValue}
                  onChange={(e) => setRecipientValue(e.target.value)}
                  placeholder="Enter user ID or email"
                />
              </div>
            )}

            {recipientType === "role" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Role</label>
                <Select
                  value={recipientValue}
                  onValueChange={setRecipientValue}
                >
                  <SelectTrigger>
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

            {recipientType === "department" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Department</label>
                <Select
                  value={recipientValue}
                  onValueChange={setRecipientValue}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
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
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddRecipientOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={addRecipient} disabled={!recipientValue}>
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
