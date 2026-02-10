# AGENT-UI CONTEXT: Document Control Module
## Pages & Components (REFINED v2)

---

## YOUR ROLE
You are AGENT-UI. Your job is to create the Document Control frontend pages and integrate them into the existing PFMEA Suite navigation.

## CRITICAL RULES
1. **ONLY CREATE** these files:
   - `client/src/pages/Documents.tsx` — Document list page
   - `client/src/pages/DocumentDetail.tsx` — Document detail with tabs
2. **ONLY MODIFY** these files (minimal changes):
   - `client/src/components/AppSidebar.tsx` — Add "Documents" nav link
   - `client/src/App.tsx` — Add routes for /documents and /documents/:id
3. **DO NOT TOUCH**: schema.ts, storage.ts, routes.ts, seed.ts, test files
4. Output **complete file implementations**, not snippets.

## PREREQUISITES
- AGENT-DB completed schema + storage
- AGENT-API completed all API endpoints
- Endpoints available: GET/POST /api/documents, GET /api/documents/:id, etc.

---

## TECH STACK & PATTERNS (MUST FOLLOW)

### Standard Imports
```typescript
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useParams, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

// Icons (from lucide-react)
import { 
  Plus, 
  FileText, 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Send, 
  Check, 
  X, 
  Clock, 
  Users, 
  Link as LinkIcon,
  History,
  AlertCircle,
  CheckCircle,
  Archive
} from "lucide-react";
```

### API Call Pattern (USE EXACTLY)
```typescript
// Fetch list with filters
const { data: documents = [], isLoading, refetch } = useQuery({
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

// Fetch single item
const { data: document, isLoading: isLoadingDoc } = useQuery({
  queryKey: [`/api/documents/${id}`],
  queryFn: async () => {
    const res = await fetch(`/api/documents/${id}`);
    if (!res.ok) throw new Error("Failed to fetch document");
    return res.json();
  },
  enabled: !!id,
});

// Mutation pattern
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
      variant: "destructive" 
    });
  },
});

// Workflow action pattern
const submitForReviewMutation = useMutation({
  mutationFn: async () => {
    const res = await fetch(`/api/documents/${id}/submit-review`, {
      method: "POST",
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to submit for review");
    }
    return res.json();
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: [`/api/documents/${id}`] });
    toast({ title: "Submitted for Review" });
  },
  onError: (error: Error) => {
    toast({ title: "Error", description: error.message, variant: "destructive" });
  },
});
```

---

## PAGE 1: Documents.tsx (~900 lines)

### Page Structure
```typescript
export default function Documents() {
  // State
  const [filters, setFilters] = useState({ type: "", status: "", search: "" });
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  
  // Hooks
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Form for create dialog
  const form = useForm<z.infer<typeof createDocumentSchema>>({
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

  // Queries & Mutations
  const { data: documents = [], isLoading } = useQuery({ ... });
  const createMutation = useMutation({ ... });

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Document Control</h1>
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
          onValueChange={(value) => setFilters({ ...filters, type: value })}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Types</SelectItem>
            <SelectItem value="procedure">Procedure</SelectItem>
            <SelectItem value="work_instruction">Work Instruction</SelectItem>
            <SelectItem value="form">Form</SelectItem>
            <SelectItem value="specification">Specification</SelectItem>
            <SelectItem value="standard">Standard</SelectItem>
            <SelectItem value="policy">Policy</SelectItem>
            <SelectItem value="drawing">Drawing</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.status}
          onValueChange={(value) => setFilters({ ...filters, status: value })}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Statuses</SelectItem>
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
              <TableRow>
                <TableCell colSpan={7}>
                  <div className="flex justify-center py-8">
                    <Skeleton className="h-8 w-full" />
                  </div>
                </TableCell>
              </TableRow>
            ) : documents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No documents found. Create your first controlled document.
                </TableCell>
              </TableRow>
            ) : (
              documents.map((doc) => (
                <TableRow
                  key={doc.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/documents/${doc.id}`)}
                >
                  <TableCell className="font-mono font-medium">{doc.docNumber}</TableCell>
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
              ))
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
              Create a new controlled document. It will start as a draft at Revision A.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))}>
              {/* Form fields - docNumber, title, type, category, department, owner, description, reviewCycleDays */}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
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
```

### Helper Components (define within Documents.tsx)

```typescript
// Status badge with colors matching existing app
function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    draft: "bg-gray-100 text-gray-800",
    review: "bg-yellow-100 text-yellow-800",
    effective: "bg-green-100 text-green-800",
    superseded: "bg-blue-100 text-blue-800",
    obsolete: "bg-red-100 text-red-800",
  };
  
  return (
    <Badge className={variants[status] || variants.draft}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

// Review due date with overdue highlighting
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

// Format document type for display
function formatDocType(type: string): string {
  return type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}
```

---

## PAGE 2: DocumentDetail.tsx (~1100 lines)

### Page Structure

```typescript
export default function DocumentDetail() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Dialog states
  const [newRevisionOpen, setNewRevisionOpen] = useState(false);
  const [distributeOpen, setDistributeOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);

  // Fetch document
  const { data: document, isLoading } = useQuery({
    queryKey: [`/api/documents/${id}`],
    queryFn: async () => {
      const res = await fetch(`/api/documents/${id}`);
      if (!res.ok) throw new Error("Failed to fetch document");
      return res.json();
    },
    enabled: !!id,
  });

  // Fetch revisions
  const { data: revisions = [] } = useQuery({
    queryKey: [`/api/documents/${id}/revisions`],
    queryFn: async () => {
      const res = await fetch(`/api/documents/${id}/revisions`);
      return res.json();
    },
    enabled: !!id,
  });

  // Fetch distributions
  const { data: distributions = [] } = useQuery({
    queryKey: [`/api/documents/${id}/distributions`],
    queryFn: async () => {
      const res = await fetch(`/api/documents/${id}/distributions`);
      return res.json();
    },
    enabled: !!id,
  });

  // Fetch reviews
  const { data: reviews = [] } = useQuery({
    queryKey: [`/api/documents/${id}/reviews`],
    queryFn: async () => {
      const res = await fetch(`/api/documents/${id}/reviews`);
      return res.json();
    },
    enabled: !!id,
  });

  // Fetch links
  const { data: links = [] } = useQuery({
    queryKey: [`/api/documents/${id}/links`],
    queryFn: async () => {
      const res = await fetch(`/api/documents/${id}/links`);
      return res.json();
    },
    enabled: !!id,
  });

  // Workflow mutations
  const submitMutation = useMutation({ /* submit-review */ });
  const approveMutation = useMutation({ /* approve with approverName */ });
  const rejectMutation = useMutation({ /* reject with comments */ });
  const obsoleteMutation = useMutation({ /* obsolete */ });
  const newRevisionMutation = useMutation({ /* create revision */ });
  const distributeMutation = useMutation({ /* distribute */ });

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (!document) {
    return <NotFoundMessage />;
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/documents")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold font-mono">{document.docNumber}</h1>
            <Badge variant="outline">{formatDocType(document.type)}</Badge>
            <StatusBadge status={document.status} />
          </div>
          <p className="text-lg text-muted-foreground">{document.title}</p>
        </div>
        
        {/* Action Buttons (conditional on status) */}
        <ActionButtons 
          document={document}
          onSubmit={() => submitMutation.mutate()}
          onApprove={() => approveMutation.mutate({ approverName: "Current User" })}
          onReject={() => setRejectOpen(true)}
          onNewRevision={() => setNewRevisionOpen(true)}
          onDistribute={() => setDistributeOpen(true)}
          onObsolete={() => obsoleteMutation.mutate()}
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="revisions">
            <History className="mr-2 h-4 w-4" />
            Revisions ({revisions.length})
          </TabsTrigger>
          <TabsTrigger value="distribution">
            <Users className="mr-2 h-4 w-4" />
            Distribution ({distributions.length})
          </TabsTrigger>
          <TabsTrigger value="reviews">
            <Clock className="mr-2 h-4 w-4" />
            Reviews ({reviews.length})
          </TabsTrigger>
          <TabsTrigger value="links">
            <LinkIcon className="mr-2 h-4 w-4" />
            Links ({links.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab document={document} />
        </TabsContent>

        <TabsContent value="revisions">
          <RevisionsTab revisions={revisions} currentRev={document.currentRev} />
        </TabsContent>

        <TabsContent value="distribution">
          <DistributionTab distributions={distributions} />
        </TabsContent>

        <TabsContent value="reviews">
          <ReviewsTab reviews={reviews} />
        </TabsContent>

        <TabsContent value="links">
          <LinksTab links={links} onAddLink={() => setLinkOpen(true)} />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <NewRevisionDialog open={newRevisionOpen} onOpenChange={setNewRevisionOpen} />
      <DistributeDialog open={distributeOpen} onOpenChange={setDistributeOpen} />
      <RejectDialog open={rejectOpen} onOpenChange={setRejectOpen} onReject={rejectMutation.mutate} />
      <LinkDialog open={linkOpen} onOpenChange={setLinkOpen} />
    </div>
  );
}
```

### Action Buttons Component

```typescript
function ActionButtons({ document, onSubmit, onApprove, onReject, onNewRevision, onDistribute, onObsolete }) {
  const status = document.status;
  
  return (
    <div className="flex gap-2">
      {/* Draft actions */}
      {status === 'draft' && (
        <>
          <Button onClick={onSubmit}>
            <Send className="mr-2 h-4 w-4" />
            Submit for Review
          </Button>
          <Button variant="outline">
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
        </>
      )}
      
      {/* Review actions */}
      {status === 'review' && (
        <>
          <Button onClick={onApprove} className="bg-green-600 hover:bg-green-700">
            <Check className="mr-2 h-4 w-4" />
            Approve
          </Button>
          <Button variant="destructive" onClick={onReject}>
            <X className="mr-2 h-4 w-4" />
            Reject
          </Button>
        </>
      )}
      
      {/* Effective actions */}
      {status === 'effective' && (
        <>
          <Button onClick={onNewRevision}>
            <Plus className="mr-2 h-4 w-4" />
            New Revision
          </Button>
          <Button variant="outline" onClick={onDistribute}>
            <Users className="mr-2 h-4 w-4" />
            Distribute
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline">
                <Archive className="mr-2 h-4 w-4" />
                Obsolete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Mark Document as Obsolete?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will mark the document as obsolete. It will no longer be considered active.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onObsolete}>Confirm</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
      
      {/* Obsolete - no actions */}
      {status === 'obsolete' && (
        <Badge variant="secondary">Document is Obsolete</Badge>
      )}
    </div>
  );
}
```

---

## NAVIGATION CHANGES

### AppSidebar.tsx — Add nav item

Find the navigation items array and add:

```typescript
{
  title: "Documents",
  url: "/documents",
  icon: FileText,
}
```

Add to imports:
```typescript
import { FileText } from "lucide-react";
```

### App.tsx — Add routes

Add imports:
```typescript
import Documents from "./pages/Documents";
import DocumentDetail from "./pages/DocumentDetail";
```

Add routes (inside the Switch or Route structure):
```typescript
<Route path="/documents" component={Documents} />
<Route path="/documents/:id" component={DocumentDetail} />
```

---

## VALIDATION SCHEMAS

```typescript
// Create document schema
const createDocumentSchema = z.object({
  docNumber: z.string().min(1, "Document number is required").regex(
    /^[A-Z]{2,4}-[A-Z]{2,4}-\d{3}$/,
    "Format: XX-XX-000 (e.g., WI-MOL-001)"
  ),
  title: z.string().min(1, "Title is required").max(200),
  type: z.enum([
    "procedure", "work_instruction", "form", "specification",
    "standard", "drawing", "customer_spec", "external", "policy", "record"
  ]),
  category: z.string().optional(),
  department: z.string().optional(),
  owner: z.string().min(1, "Owner is required"),
  description: z.string().optional(),
  reviewCycleDays: z.number().min(1).max(1095).default(365),
});

// Create revision schema
const createRevisionSchema = z.object({
  changeDescription: z.string().min(1, "Change description is required"),
  author: z.string().min(1, "Author is required"),
});

// Distribute schema
const distributeSchema = z.object({
  recipients: z.array(z.object({
    recipientName: z.string().min(1),
    recipientRole: z.string().optional(),
    method: z.enum(["electronic", "hardcopy"]).default("electronic"),
  })).min(1, "At least one recipient required"),
});

// Reject schema
const rejectSchema = z.object({
  comments: z.string().min(1, "Comments are required when rejecting"),
});
```

---

## ACCEPTANCE CRITERIA CHECKLIST

Before marking complete, verify:

- [ ] **Documents.tsx created with:**
  - [ ] List view with table showing all documents
  - [ ] Filters for type, status, search
  - [ ] Create document dialog with form validation
  - [ ] Click row navigates to detail page
  - [ ] Overdue reviews highlighted in red
  - [ ] Empty state message
  - [ ] Loading skeleton

- [ ] **DocumentDetail.tsx created with:**
  - [ ] Header with doc number, title, type, status badges
  - [ ] Back button to /documents
  - [ ] Action buttons change based on status
  - [ ] 5 tabs: Overview, Revisions, Distribution, Reviews, Links
  - [ ] Revisions tab shows timeline
  - [ ] Distribution tab with acknowledgment status
  - [ ] All mutations with proper error handling
  - [ ] Confirmation dialog for Obsolete action

- [ ] **Navigation updated:**
  - [ ] AppSidebar shows "Documents" link
  - [ ] App.tsx has routes for /documents and /documents/:id

- [ ] **Interactions work:**
  - [ ] Create new document
  - [ ] Submit for review (draft → review)
  - [ ] Approve (review → effective)
  - [ ] Reject with comments (review → draft)
  - [ ] Create new revision (effective only)
  - [ ] Distribute to recipients
  - [ ] Mark obsolete (effective → obsolete)

- [ ] **User feedback:**
  - [ ] Toast messages on success/error
  - [ ] Loading states during mutations
  - [ ] Form validation messages
  - [ ] No console errors
