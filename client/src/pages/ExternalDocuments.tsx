import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  ExternalLink,
  AlertTriangle,
  RefreshCw,
  Loader2,
  Globe,
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

interface ExternalDoc {
  id: number;
  orgId: string;
  docNumber: string;
  title: string;
  source: string;
  externalUrl: string | null;
  issuingBody: string | null;
  currentVersion: string | null;
  versionDate: string | null;
  previousVersion: string | null;
  subscriptionActive: number;
  lastCheckedAt: string | null;
  updateAvailable: number;
  updateNotes: string | null;
  category: string | null;
  applicability: string | null;
  status: string | null;
  notes: string | null;
  createdBy: string;
  createdAt: string | null;
  updatedAt: string | null;
}

const SOURCES = [
  "ISO",
  "ASTM",
  "AIAG",
  "SAE",
  "IATF",
  "Customer",
  "Government",
  "Other",
];

const CATEGORIES = [
  "Quality Management",
  "Testing Standards",
  "Material Specifications",
  "Process Standards",
  "Safety",
  "Environmental",
  "Customer Requirements",
  "Regulatory",
];

export default function ExternalDocuments() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form state
  const [docNumber, setDocNumber] = useState("");
  const [title, setTitle] = useState("");
  const [source, setSource] = useState("ISO");
  const [externalUrl, setExternalUrl] = useState("");
  const [issuingBody, setIssuingBody] = useState("");
  const [currentVersion, setCurrentVersion] = useState("");
  const [versionDate, setVersionDate] = useState("");
  const [category, setCategory] = useState("");
  const [applicability, setApplicability] = useState("");
  const [subscriptionActive, setSubscriptionActive] = useState(false);
  const [notes, setNotes] = useState("");

  const { data: docs = [], isLoading } = useQuery<ExternalDoc[]>({
    queryKey: ["/api/external-documents", sourceFilter, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (sourceFilter !== "all") params.set("source", sourceFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/external-documents?${params}`, {
        credentials: "include",
      });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return docs;
    const q = searchQuery.toLowerCase();
    return docs.filter(
      (d) =>
        d.docNumber.toLowerCase().includes(q) ||
        d.title.toLowerCase().includes(q) ||
        d.source.toLowerCase().includes(q) ||
        d.issuingBody?.toLowerCase().includes(q)
    );
  }, [docs, searchQuery]);

  const updatesAvailable = useMemo(
    () => docs.filter((d) => d.updateAvailable),
    [docs]
  );

  const saveMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const url = editingId
        ? `/api/external-documents/${editingId}`
        : "/api/external-documents";
      const method = editingId ? "PATCH" : "POST";
      const res = await apiRequest(method, url, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/external-documents"],
      });
      toast({
        title: editingId ? "Updated" : "Added",
        description: `External document "${title}" saved.`,
      });
      setEditorOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/external-documents/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/external-documents"],
      });
      toast({ title: "Deleted", description: "External document removed." });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const checkUpdateMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest(
        "POST",
        `/api/external-documents/${id}/check-update`,
        {
          updateAvailable: false,
          updateNotes: null,
        }
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/external-documents"],
      });
      toast({ title: "Reviewed", description: "Update status cleared." });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  function resetForm() {
    setEditingId(null);
    setDocNumber("");
    setTitle("");
    setSource("ISO");
    setExternalUrl("");
    setIssuingBody("");
    setCurrentVersion("");
    setVersionDate("");
    setCategory("");
    setApplicability("");
    setSubscriptionActive(false);
    setNotes("");
  }

  function openCreate() {
    resetForm();
    setEditorOpen(true);
  }

  function openEdit(doc: ExternalDoc) {
    setEditingId(doc.id);
    setDocNumber(doc.docNumber);
    setTitle(doc.title);
    setSource(doc.source);
    setExternalUrl(doc.externalUrl || "");
    setIssuingBody(doc.issuingBody || "");
    setCurrentVersion(doc.currentVersion || "");
    setVersionDate(
      doc.versionDate ? doc.versionDate.split("T")[0] : ""
    );
    setCategory(doc.category || "");
    setApplicability(doc.applicability || "");
    setSubscriptionActive(!!doc.subscriptionActive);
    setNotes(doc.notes || "");
    setEditorOpen(true);
  }

  function handleSave() {
    if (!docNumber.trim() || !title.trim() || !source) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Document number, title, and source are required.",
      });
      return;
    }

    saveMutation.mutate({
      docNumber: docNumber.trim(),
      title: title.trim(),
      source,
      externalUrl: externalUrl.trim() || null,
      issuingBody: issuingBody.trim() || null,
      currentVersion: currentVersion.trim() || null,
      versionDate: versionDate || null,
      category: category || null,
      applicability: applicability.trim() || null,
      subscriptionActive: subscriptionActive ? 1 : 0,
      notes: notes.trim() || null,
      createdBy: user ? `${user.firstName} ${user.lastName}` : "System",
    });
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
          <h1 className="text-2xl font-bold">External Documents</h1>
          <p className="text-sm text-muted-foreground">
            Track external standards, specifications, and customer requirements
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Document
        </Button>
      </div>

      {/* Updates Alert */}
      {updatesAvailable.length > 0 && (
        <Card className="border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <span className="font-medium text-sm text-yellow-800 dark:text-yellow-200">
                Updates Available ({updatesAvailable.length})
              </span>
            </div>
            <div className="space-y-2">
              {updatesAvailable.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between pl-7"
                >
                  <div>
                    <span className="text-sm font-medium">
                      {doc.docNumber}
                    </span>
                    <span className="text-sm text-muted-foreground ml-2">
                      {doc.updateNotes || "New version available"}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => checkUpdateMutation.mutate(doc.id)}
                    disabled={checkUpdateMutation.isPending}
                  >
                    <RefreshCw className="mr-1 h-3 w-3" />
                    Review Update
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search external documents..."
              className="pl-10"
            />
          </div>
        </div>
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            {SOURCES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="superseded">Superseded</SelectItem>
            <SelectItem value="withdrawn">Withdrawn</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Checked</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-12 text-muted-foreground"
                  >
                    <Globe className="mx-auto h-12 w-12 mb-3 opacity-50" />
                    <p className="text-sm">No external documents found.</p>
                    <Button
                      variant="outline"
                      className="mt-3"
                      onClick={openCreate}
                    >
                      Add your first document
                    </Button>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {doc.updateAvailable ? (
                          <AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                        ) : null}
                        <div>
                          <p className="text-sm font-medium">
                            {doc.docNumber}
                          </p>
                          <p className="text-xs text-muted-foreground truncate max-w-[250px]">
                            {doc.title}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{doc.source}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {doc.currentVersion || "-"}
                      {doc.versionDate && (
                        <span className="text-xs text-muted-foreground ml-1">
                          ({new Date(doc.versionDate).getFullYear()})
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {doc.category || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          doc.status === "active"
                            ? "default"
                            : doc.status === "superseded"
                            ? "secondary"
                            : "destructive"
                        }
                      >
                        {doc.status || "active"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {doc.lastCheckedAt
                        ? new Date(doc.lastCheckedAt).toLocaleDateString()
                        : "Never"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {doc.externalUrl && (
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                          >
                            <a
                              href={doc.externalUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(doc)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMutation.mutate(doc.id)}
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
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit External Document" : "Add External Document"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Document Number *
                </label>
                <Input
                  value={docNumber}
                  onChange={(e) => setDocNumber(e.target.value)}
                  placeholder="ISO 9001:2015"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Source *</label>
                <Select value={source} onValueChange={setSource}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SOURCES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Title *</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Quality Management Systems - Requirements"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">External URL</label>
              <Input
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                placeholder="https://www.iso.org/standard/..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Issuing Body</label>
                <Input
                  value={issuingBody}
                  onChange={(e) => setIssuingBody(e.target.value)}
                  placeholder="International Organization for Standardization"
                />
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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Current Version</label>
                <Input
                  value={currentVersion}
                  onChange={(e) => setCurrentVersion(e.target.value)}
                  placeholder="2015"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Version Date</label>
                <Input
                  type="date"
                  value={versionDate}
                  onChange={(e) => setVersionDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Applicability</label>
              <Input
                value={applicability}
                onChange={(e) => setApplicability(e.target.value)}
                placeholder="All manufacturing processes"
              />
            </div>

            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={subscriptionActive}
                onCheckedChange={(c) => setSubscriptionActive(c === true)}
              />
              Subscription active (receive update notifications)
            </label>

            <div className="space-y-2">
              <label className="text-sm font-medium">Notes</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes..."
                rows={2}
              />
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
