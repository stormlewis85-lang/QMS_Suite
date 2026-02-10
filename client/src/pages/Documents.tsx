import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

import { Plus, AlertCircle } from "lucide-react";

// ---------------------------------------------------------------------------
// Validation Schema
// ---------------------------------------------------------------------------

const createDocumentSchema = z.object({
  docNumber: z
    .string()
    .min(1, "Document number is required")
    .regex(
      /^[A-Z]{2,4}-[A-Z]{2,4}-\d{3}$/,
      "Format: XX-XX-000 (e.g., WI-MOL-001)"
    ),
  title: z.string().min(1, "Title is required").max(200),
  type: z.enum([
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
  ]),
  category: z.string().optional(),
  department: z.string().optional(),
  owner: z.string().min(1, "Owner is required"),
  description: z.string().optional(),
  reviewCycleDays: z.coerce.number().min(1).max(1095).default(365),
});

type CreateDocumentData = z.infer<typeof createDocumentSchema>;

// ---------------------------------------------------------------------------
// Helper Components
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    draft: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
    review:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    effective:
      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    superseded:
      "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    obsolete: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  };

  return (
    <Badge className={variants[status] || variants.draft}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

function ReviewDueCell({ date }: { date: string }) {
  const dueDate = new Date(date);
  const isOverdue = dueDate < new Date();

  return (
    <span className={isOverdue ? "text-red-600 font-medium" : ""}>
      {dueDate.toLocaleDateString()}
      {isOverdue && <AlertCircle className="inline ml-1 h-4 w-4" />}
    </span>
  );
}

function formatDocType(type: string): string {
  return type
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// ---------------------------------------------------------------------------
// Documents Page
// ---------------------------------------------------------------------------

export default function Documents() {
  const [filters, setFilters] = useState({ type: "", status: "", search: "" });
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<CreateDocumentData>({
    resolver: zodResolver(createDocumentSchema),
    defaultValues: {
      docNumber: "",
      title: "",
      type: "work_instruction",
      category: "",
      department: "",
      owner: "",
      description: "",
      reviewCycleDays: 365,
    },
  });

  // ---- Queries ----

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["/api/documents", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.type) params.set("type", filters.type);
      if (filters.status) params.set("status", filters.status);
      if (filters.search) params.set("search", filters.search);

      const res = await fetch(`/api/documents?${params}`);
      if (!res.ok) throw new Error("Failed to fetch documents");
      return res.json();
    },
  });

  // ---- Mutations ----

  const createMutation = useMutation({
    mutationFn: async (data: CreateDocumentData) => {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create document");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({ title: "Success", description: "Document created successfully" });
      setCreateDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // ---- Render ----

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Document Control
          </h1>
          <p className="text-muted-foreground">
            Manage controlled documents, revisions, and approvals per IATF 16949
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Document
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <Select
          value={filters.type}
          onValueChange={(value) =>
            setFilters({ ...filters, type: value === "all" ? "" : value })
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="procedure">Procedure</SelectItem>
            <SelectItem value="work_instruction">Work Instruction</SelectItem>
            <SelectItem value="form">Form</SelectItem>
            <SelectItem value="specification">Specification</SelectItem>
            <SelectItem value="standard">Standard</SelectItem>
            <SelectItem value="policy">Policy</SelectItem>
            <SelectItem value="drawing">Drawing</SelectItem>
            <SelectItem value="customer_spec">Customer Spec</SelectItem>
            <SelectItem value="external">External</SelectItem>
            <SelectItem value="record">Record</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.status}
          onValueChange={(value) =>
            setFilters({ ...filters, status: value === "all" ? "" : value })
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="review">In Review</SelectItem>
            <SelectItem value="effective">Effective</SelectItem>
            <SelectItem value="superseded">Superseded</SelectItem>
            <SelectItem value="obsolete">Obsolete</SelectItem>
          </SelectContent>
        </Select>

        <Input
          placeholder="Search documents..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          className="w-[300px]"
        />
      </div>

      {/* Document Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Doc #</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Rev</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Review Due</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={7}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : documents.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center py-8 text-muted-foreground"
                >
                  No documents found. Create your first controlled document.
                </TableCell>
              </TableRow>
            ) : (
              documents.map(
                (doc: {
                  id: string;
                  docNumber: string;
                  title: string;
                  type: string;
                  currentRev: string;
                  status: string;
                  owner: string;
                  reviewDueDate: string | null;
                }) => (
                  <TableRow
                    key={doc.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/documents/${doc.id}`)}
                  >
                    <TableCell className="font-mono font-medium">
                      {doc.docNumber}
                    </TableCell>
                    <TableCell>{doc.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{formatDocType(doc.type)}</Badge>
                    </TableCell>
                    <TableCell className="font-mono">{doc.currentRev}</TableCell>
                    <TableCell>
                      <StatusBadge status={doc.status} />
                    </TableCell>
                    <TableCell>{doc.owner}</TableCell>
                    <TableCell>
                      {doc.reviewDueDate && (
                        <ReviewDueCell date={doc.reviewDueDate} />
                      )}
                    </TableCell>
                  </TableRow>
                )
              )
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Create Document Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Document</DialogTitle>
            <DialogDescription>
              Create a new controlled document. It will start as a draft at
              Revision A.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((data) =>
                createMutation.mutate(data)
              )}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="docNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Document Number</FormLabel>
                      <FormControl>
                        <Input placeholder="WI-MOL-001" {...field} />
                      </FormControl>
                      <FormDescription>
                        Format: XX-XX-000
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="procedure">Procedure</SelectItem>
                          <SelectItem value="work_instruction">
                            Work Instruction
                          </SelectItem>
                          <SelectItem value="form">Form</SelectItem>
                          <SelectItem value="specification">
                            Specification
                          </SelectItem>
                          <SelectItem value="standard">Standard</SelectItem>
                          <SelectItem value="policy">Policy</SelectItem>
                          <SelectItem value="drawing">Drawing</SelectItem>
                          <SelectItem value="customer_spec">
                            Customer Spec
                          </SelectItem>
                          <SelectItem value="external">External</SelectItem>
                          <SelectItem value="record">Record</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Document title"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="owner"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Owner</FormLabel>
                      <FormControl>
                        <Input placeholder="Document owner" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="department"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department</FormLabel>
                      <FormControl>
                        <Input placeholder="Department (optional)" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <FormControl>
                        <Input placeholder="Category (optional)" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="reviewCycleDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Review Cycle (days)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormDescription>1-1095 days</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Brief description of this document"
                        rows={3}
                        {...field}
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
                  onClick={() => setCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Creating..." : "Create Document"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
