import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  Plus,
  FileText,
  ArrowLeft,
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
  Archive,
  Lock,
  Unlock,
  Download,
  File,
  FileImage,
  Upload,
  Workflow,
  Loader2,
  Edit,
} from "lucide-react";

import FileUploadZone from "@/components/FileUploadZone";
import WorkflowTimeline from "@/components/WorkflowTimeline";
import SignatureCaptureModal from "@/components/SignatureCaptureModal";

// ---------------------------------------------------------------------------
// Validation Schemas
// ---------------------------------------------------------------------------

const createRevisionSchema = z.object({
  changeDescription: z.string().min(1, "Change description is required"),
  author: z.string().min(1, "Author is required"),
});

const rejectSchema = z.object({
  comments: z.string().min(1, "Comments are required when rejecting"),
});

const addLinkSchema = z.object({
  targetType: z.string().min(1, "Target type is required"),
  targetId: z.string().uuid("Must be a valid UUID"),
  linkType: z.string().min(1, "Link type is required"),
});

const editDocumentSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  category: z.string().optional(),
  department: z.string().optional(),
  owner: z.string().min(1, "Owner is required"),
  description: z.string().optional(),
  reviewCycleDays: z.coerce.number().min(1).max(1095).default(365),
});

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

function formatDocType(type: string): string {
  return type
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function formatDate(date: string | null | undefined): string {
  if (!date) return "\u2014";
  return new Date(date).toLocaleDateString();
}

function formatDateTime(date: string | null | undefined): string {
  if (!date) return "\u2014";
  return new Date(date).toLocaleString();
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(type: string) {
  if (type.startsWith("image")) return <FileImage className="h-4 w-4 text-blue-500" />;
  if (type === "pdf" || type === "application/pdf") return <FileText className="h-4 w-4 text-red-500" />;
  return <File className="h-4 w-4 text-gray-500" />;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface ActionButtonsProps {
  document: any;
  onSubmit: () => void;
  onApprove: () => void;
  onReject: () => void;
  onNewRevision: () => void;
  onDistribute: () => void;
  onObsolete: () => void;
  onEdit: () => void;
  isPending: boolean;
}

function ActionButtons({
  document,
  onSubmit,
  onApprove,
  onReject,
  onNewRevision,
  onDistribute,
  onObsolete,
  onEdit,
  isPending,
}: ActionButtonsProps) {
  const status = document.status;

  return (
    <div className="flex gap-2 flex-wrap">
      {status === "draft" && (
        <>
          <Button variant="outline" onClick={onEdit} disabled={isPending}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button onClick={onSubmit} disabled={isPending}>
            <Send className="mr-2 h-4 w-4" />
            Submit for Review
          </Button>
        </>
      )}

      {status === "review" && (
        <>
          <Button
            onClick={onApprove}
            disabled={isPending}
            className="bg-green-600 hover:bg-green-700"
          >
            <Check className="mr-2 h-4 w-4" />
            Approve
          </Button>
          <Button variant="destructive" onClick={onReject} disabled={isPending}>
            <X className="mr-2 h-4 w-4" />
            Reject
          </Button>
        </>
      )}

      {status === "effective" && (
        <>
          <Button onClick={onNewRevision} disabled={isPending}>
            <Plus className="mr-2 h-4 w-4" />
            New Revision
          </Button>
          <Button
            variant="outline"
            onClick={onDistribute}
            disabled={isPending}
          >
            <Users className="mr-2 h-4 w-4" />
            Distribute
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" disabled={isPending}>
                <Archive className="mr-2 h-4 w-4" />
                Obsolete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Mark Document as Obsolete?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will mark the document as obsolete. It will no longer be
                  considered active.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onObsolete}>
                  Confirm
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}

      {status === "obsolete" && (
        <Badge variant="secondary">Document is Obsolete</Badge>
      )}

      {status === "superseded" && (
        <Badge variant="secondary">Document is Superseded</Badge>
      )}
    </div>
  );
}

function OverviewTab({ document }: { document: any }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Document Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Document #</span>
            <span className="font-mono font-medium">
              {document.docNumber}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Type</span>
            <span>{formatDocType(document.type)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Category</span>
            <span>{document.category || "\u2014"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Department</span>
            <span>{document.department || "\u2014"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Owner</span>
            <span>{document.owner}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">External</span>
            <span>{document.isExternal ? "Yes" : "No"}</span>
          </div>
          {document.externalRef && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">External Ref</span>
              <span>{document.externalRef}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Revision & Review</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Current Rev</span>
            <span className="font-mono font-medium">{document.currentRev}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Status</span>
            <StatusBadge status={document.status} />
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Effective Date</span>
            <span>{formatDate(document.effectiveDate)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Review Due</span>
            <span>
              {document.reviewDueDate ? (
                <span
                  className={
                    new Date(document.reviewDueDate) < new Date()
                      ? "text-red-600 font-medium"
                      : ""
                  }
                >
                  {formatDate(document.reviewDueDate)}
                  {new Date(document.reviewDueDate) < new Date() && (
                    <AlertCircle className="inline ml-1 h-4 w-4" />
                  )}
                </span>
              ) : (
                "\u2014"
              )}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Review Cycle</span>
            <span>{document.reviewCycleDays || 365} days</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Retention</span>
            <span>{document.retentionYears || 7} years</span>
          </div>
        </CardContent>
      </Card>

      {document.description && (
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground whitespace-pre-wrap">
              {document.description}
            </p>
          </CardContent>
        </Card>
      )}

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Metadata</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Created</span>
            <span>{formatDateTime(document.createdAt)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Last Updated</span>
            <span>{formatDateTime(document.updatedAt)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function FilesTab({
  files,
  documentId,
  isEditable,
  onUpload,
  onDelete,
  isUploading,
}: {
  files: any[];
  documentId: string;
  isEditable: boolean;
  onUpload: (files: File[]) => void;
  onDelete: (fileId: number) => void;
  isUploading: boolean;
}) {
  return (
    <div className="mt-4 space-y-4">
      {isEditable && (
        <FileUploadZone
          onUpload={onUpload}
          accept=".pdf,.docx,.xlsx,.dwg,.jpg,.jpeg,.png"
          disabled={isUploading}
        />
      )}

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>File</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Scan Status</TableHead>
              <TableHead>Uploaded</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {files.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-8 text-muted-foreground"
                >
                  <Upload className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  No files attached. {isEditable && "Upload files using the zone above."}
                </TableCell>
              </TableRow>
            ) : (
              files.map((file: any) => (
                <TableRow key={file.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getFileIcon(file.fileType || file.mimeType)}
                      <span className="font-medium text-sm truncate max-w-[200px]">
                        {file.originalName || file.fileName}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {(file.fileType || "").toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatFileSize(file.fileSize)}
                  </TableCell>
                  <TableCell>
                    {file.virusScanStatus === "clean" ? (
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 gap-1">
                        <CheckCircle className="h-3 w-3" /> Clean
                      </Badge>
                    ) : file.virusScanStatus === "infected" ? (
                      <Badge variant="destructive" className="gap-1">
                        <AlertCircle className="h-3 w-3" /> Infected
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1">
                        <Clock className="h-3 w-3" /> Pending
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDateTime(file.uploadedAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() =>
                              window.open(
                                `/api/document-files/${file.id}/download`,
                                "_blank"
                              )
                            }
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Download</TooltipContent>
                      </Tooltip>
                      {isEditable && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => onDelete(file.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Delete</TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function WorkflowTab({
  workflow,
  canAct,
  onApprove,
  onReject,
  onDelegate,
}: {
  workflow: any;
  canAct: boolean;
  onApprove: (stepNumber: number) => void;
  onReject: (stepNumber: number) => void;
  onDelegate: (stepNumber: number) => void;
}) {
  if (!workflow) {
    return (
      <div className="mt-4 text-center py-12 text-muted-foreground">
        <Workflow className="mx-auto h-12 w-12 mb-3 opacity-50" />
        <p>Loading workflow data...</p>
      </div>
    );
  }

  if (!workflow.hasActiveWorkflow && (!workflow.history || workflow.history.length === 0)) {
    return (
      <div className="mt-4 text-center py-12 text-muted-foreground">
        <Workflow className="mx-auto h-12 w-12 mb-3 opacity-50" />
        <p className="text-sm font-medium">No Workflow</p>
        <p className="text-xs mt-1">
          Submit this document for review to start an approval workflow.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-4">
      {workflow.hasActiveWorkflow && workflow.definition && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Workflow className="h-4 w-4" />
              {workflow.definition.name}
              <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                Active
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <WorkflowTimeline
              steps={workflow.steps}
              canAct={canAct}
              onApprove={onApprove}
              onReject={onReject}
              onDelegate={onDelegate}
            />
          </CardContent>
        </Card>
      )}

      {workflow.history && workflow.history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Workflow History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              {workflow.history.map((inst: any) => (
                <div
                  key={inst.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div>
                    <span className="font-medium">
                      Workflow #{inst.id}
                    </span>
                    <span className="text-muted-foreground ml-2">
                      Started {formatDate(inst.startedAt)}
                    </span>
                  </div>
                  <Badge
                    className={
                      inst.status === "completed"
                        ? "bg-green-100 text-green-800"
                        : inst.status === "rejected"
                        ? "bg-red-100 text-red-800"
                        : "bg-gray-100 text-gray-800"
                    }
                  >
                    {inst.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function RevisionsTab({
  revisions,
  currentRev,
}: {
  revisions: any[];
  currentRev: string;
}) {
  return (
    <Card className="mt-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Rev</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Change Description</TableHead>
            <TableHead>Author</TableHead>
            <TableHead>Approved By</TableHead>
            <TableHead>Effective Date</TableHead>
            <TableHead>Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {revisions.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={7}
                className="text-center py-8 text-muted-foreground"
              >
                No revisions found.
              </TableCell>
            </TableRow>
          ) : (
            revisions.map((rev: any) => (
              <TableRow
                key={rev.id}
                className={rev.rev === currentRev ? "bg-muted/30" : ""}
              >
                <TableCell className="font-mono font-medium">
                  {rev.rev}
                  {rev.rev === currentRev && (
                    <Badge variant="outline" className="ml-2 text-xs">
                      Current
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <StatusBadge status={rev.status} />
                </TableCell>
                <TableCell className="max-w-xs truncate">
                  {rev.changeDescription}
                </TableCell>
                <TableCell>{rev.author}</TableCell>
                <TableCell>{rev.approvedBy || "\u2014"}</TableCell>
                <TableCell>{formatDate(rev.effectiveDate)}</TableCell>
                <TableCell>{formatDate(rev.createdAt)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </Card>
  );
}

function DistributionTab({
  distributions,
  onAcknowledge,
}: {
  distributions: any[];
  onAcknowledge: (id: string) => void;
}) {
  return (
    <Card className="mt-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Recipient</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Method</TableHead>
            <TableHead>Distributed</TableHead>
            <TableHead>Acknowledged</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {distributions.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={6}
                className="text-center py-8 text-muted-foreground"
              >
                No distribution records.
              </TableCell>
            </TableRow>
          ) : (
            distributions.map((dist: any) => (
              <TableRow key={dist.id}>
                <TableCell className="font-medium">
                  {dist.recipientName}
                </TableCell>
                <TableCell>{dist.recipientRole || "\u2014"}</TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {dist.method || "electronic"}
                  </Badge>
                </TableCell>
                <TableCell>{formatDateTime(dist.distributedAt)}</TableCell>
                <TableCell>
                  {dist.acknowledgedAt ? (
                    <span className="flex items-center gap-1 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      {formatDateTime(dist.acknowledgedAt)}
                    </span>
                  ) : (
                    <span className="text-yellow-600">Pending</span>
                  )}
                </TableCell>
                <TableCell>
                  {!dist.acknowledgedAt && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onAcknowledge(dist.id)}
                    >
                      <Check className="mr-1 h-3 w-3" />
                      Acknowledge
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </Card>
  );
}

function ReviewsTab({ reviews }: { reviews: any[] }) {
  return (
    <Card className="mt-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Reviewer</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Comments</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead>Reviewed</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reviews.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={6}
                className="text-center py-8 text-muted-foreground"
              >
                No review records.
              </TableCell>
            </TableRow>
          ) : (
            reviews.map((review: any) => (
              <TableRow key={review.id}>
                <TableCell className="font-medium">
                  {review.reviewerName}
                </TableCell>
                <TableCell>{review.reviewerRole || "\u2014"}</TableCell>
                <TableCell>
                  <Badge
                    className={
                      review.status === "approved"
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        : review.status === "rejected"
                        ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                        : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                    }
                  >
                    {review.status.charAt(0).toUpperCase() +
                      review.status.slice(1)}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-xs truncate">
                  {review.comments || "\u2014"}
                </TableCell>
                <TableCell>
                  {review.dueDate ? (
                    <span
                      className={
                        new Date(review.dueDate) < new Date() &&
                        review.status === "pending"
                          ? "text-red-600 font-medium"
                          : ""
                      }
                    >
                      {formatDate(review.dueDate)}
                    </span>
                  ) : (
                    "\u2014"
                  )}
                </TableCell>
                <TableCell>{formatDateTime(review.reviewedAt)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </Card>
  );
}

function LinksTab({
  links,
  onAddLink,
  onDeleteLink,
}: {
  links: any[];
  onAddLink: () => void;
  onDeleteLink: (id: string) => void;
}) {
  return (
    <div className="mt-4 space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" onClick={onAddLink}>
          <Plus className="mr-2 h-4 w-4" />
          Add Link
        </Button>
      </div>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Target Type</TableHead>
              <TableHead>Target ID</TableHead>
              <TableHead>Link Type</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {links.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center py-8 text-muted-foreground"
                >
                  No linked documents.
                </TableCell>
              </TableRow>
            ) : (
              links.map((link: any) => (
                <TableRow key={link.id}>
                  <TableCell>
                    <Badge variant="outline">{link.targetType}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {link.targetId}
                  </TableCell>
                  <TableCell>{link.linkType}</TableCell>
                  <TableCell>{formatDate(link.createdAt)}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteLink(link.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loading & Not Found
// ---------------------------------------------------------------------------

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-5 w-96" />
        </div>
      </div>
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

function NotFoundMessage() {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <FileText className="h-16 w-16 text-muted-foreground" />
      <h2 className="text-xl font-semibold">Document Not Found</h2>
      <p className="text-muted-foreground">
        The document you're looking for doesn't exist or has been removed.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DocumentDetail Page
// ---------------------------------------------------------------------------

export default function DocumentDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  // Dialog states
  const [newRevisionOpen, setNewRevisionOpen] = useState(false);
  const [distributeOpen, setDistributeOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [signatureOpen, setSignatureOpen] = useState(false);
  const [delegateOpen, setDelegateOpen] = useState(false);
  const [delegateStepNumber, setDelegateStepNumber] = useState<number | null>(null);
  const [delegateTo, setDelegateTo] = useState("");
  const [workflowRejectOpen, setWorkflowRejectOpen] = useState(false);
  const [workflowRejectStep, setWorkflowRejectStep] = useState<number | null>(null);
  const [workflowRejectComments, setWorkflowRejectComments] = useState("");

  // Distribution form state
  const [distRecipients, setDistRecipients] = useState<
    { recipientName: string; recipientRole: string; method: string }[]
  >([{ recipientName: "", recipientRole: "", method: "electronic" }]);

  // Forms
  const revisionForm = useForm<z.infer<typeof createRevisionSchema>>({
    resolver: zodResolver(createRevisionSchema),
    defaultValues: { changeDescription: "", author: "" },
  });

  const rejectForm = useForm<z.infer<typeof rejectSchema>>({
    resolver: zodResolver(rejectSchema),
    defaultValues: { comments: "" },
  });

  const linkForm = useForm<z.infer<typeof addLinkSchema>>({
    resolver: zodResolver(addLinkSchema),
    defaultValues: { targetType: "", targetId: "", linkType: "" },
  });

  const editForm = useForm<z.infer<typeof editDocumentSchema>>({
    resolver: zodResolver(editDocumentSchema),
    defaultValues: {
      title: "",
      category: "",
      department: "",
      owner: "",
      description: "",
      reviewCycleDays: 365,
    },
  });

  // ---- Queries ----

  const { data: document, isLoading } = useQuery({
    queryKey: [`/api/documents/${id}`],
    queryFn: async () => {
      const res = await fetch(`/api/documents/${id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch document");
      return res.json();
    },
    enabled: !!id,
  });

  const { data: revisions = [] } = useQuery({
    queryKey: [`/api/documents/${id}/revisions`],
    queryFn: async () => {
      const res = await fetch(`/api/documents/${id}/revisions`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch revisions");
      return res.json();
    },
    enabled: !!id,
  });

  const { data: distributions = [] } = useQuery({
    queryKey: [`/api/documents/${id}/distributions`],
    queryFn: async () => {
      const res = await fetch(`/api/documents/${id}/distributions`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch distributions");
      return res.json();
    },
    enabled: !!id,
  });

  const { data: reviews = [] } = useQuery({
    queryKey: [`/api/documents/${id}/reviews`],
    queryFn: async () => {
      const res = await fetch(`/api/documents/${id}/reviews`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch reviews");
      return res.json();
    },
    enabled: !!id,
  });

  const { data: links = [] } = useQuery({
    queryKey: [`/api/documents/${id}/links`],
    queryFn: async () => {
      const res = await fetch(`/api/documents/${id}/links`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch links");
      return res.json();
    },
    enabled: !!id,
  });

  const { data: files = [] } = useQuery({
    queryKey: [`/api/documents/${id}/files`],
    queryFn: async () => {
      const res = await fetch(`/api/documents/${id}/files`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch files");
      return res.json();
    },
    enabled: !!id,
  });

  const { data: workflow } = useQuery({
    queryKey: [`/api/documents/${id}/workflow`],
    queryFn: async () => {
      const res = await fetch(`/api/documents/${id}/workflow`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch workflow");
      return res.json();
    },
    enabled: !!id,
  });

  const { data: checkoutStatus } = useQuery({
    queryKey: [`/api/documents/${id}/checkout-status`],
    queryFn: async () => {
      const res = await fetch(`/api/documents/${id}/checkout-status`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch checkout status");
      return res.json();
    },
    enabled: !!id,
  });

  // ---- File Mutations ----

  const uploadFileMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/documents/${id}/files`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to upload file");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/documents/${id}/files`] });
      toast({ title: "File uploaded" });
    },
    onError: (error: Error) => {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    },
  });

  const deleteFileMutation = useMutation({
    mutationFn: async (fileId: number) => {
      const res = await fetch(`/api/document-files/${fileId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete file");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/documents/${id}/files`] });
      toast({ title: "File deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // ---- Workflow Mutations ----

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/documents/${id}/submit-review`, {
        method: "POST",
        headers: { "X-Requested-With": "XMLHttpRequest" },
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to submit for review");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/documents/${id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/documents/${id}/revisions`] });
      toast({ title: "Submitted for Review" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (data: { approverName: string }) => {
      const res = await fetch(`/api/documents/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to approve");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/documents/${id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/documents/${id}/revisions`] });
      toast({ title: "Document Approved", description: "Document is now effective" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (data: { comments: string }) => {
      const res = await fetch(`/api/documents/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to reject");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/documents/${id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/documents/${id}/revisions`] });
      toast({ title: "Document Rejected", description: "Returned to draft status" });
      setRejectOpen(false);
      rejectForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const obsoleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/documents/${id}/obsolete`, {
        method: "POST",
        headers: { "X-Requested-With": "XMLHttpRequest" },
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to mark obsolete");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/documents/${id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/documents/${id}/revisions`] });
      toast({ title: "Document Obsolete" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const newRevisionMutation = useMutation({
    mutationFn: async (data: z.infer<typeof createRevisionSchema>) => {
      const res = await fetch(`/api/documents/${id}/revisions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create revision");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/documents/${id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/documents/${id}/revisions`] });
      toast({ title: "New Revision Created" });
      setNewRevisionOpen(false);
      revisionForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const distributeMutation = useMutation({
    mutationFn: async (data: {
      recipients: {
        recipientName: string;
        recipientRole: string;
        method: string;
      }[];
    }) => {
      const res = await fetch(`/api/documents/${id}/distribute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to distribute");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/documents/${id}/distributions`] });
      toast({ title: "Document Distributed" });
      setDistributeOpen(false);
      setDistRecipients([{ recipientName: "", recipientRole: "", method: "electronic" }]);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const acknowledgeMutation = useMutation({
    mutationFn: async (distId: string) => {
      const res = await fetch(
        `/api/document-distributions/${distId}/acknowledge`,
        { method: "POST", headers: { "X-Requested-With": "XMLHttpRequest" }, credentials: "include" }
      );
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to acknowledge");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/documents/${id}/distributions`] });
      toast({ title: "Distribution Acknowledged" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const addLinkMutation = useMutation({
    mutationFn: async (data: z.infer<typeof addLinkSchema>) => {
      const res = await fetch("/api/document-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...data, sourceDocId: id }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to add link");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/documents/${id}/links`] });
      toast({ title: "Link Added" });
      setLinkOpen(false);
      linkForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteLinkMutation = useMutation({
    mutationFn: async (linkId: string) => {
      const res = await fetch(`/api/document-links/${linkId}`, {
        method: "DELETE",
        headers: { "X-Requested-With": "XMLHttpRequest" },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete link");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/documents/${id}/links`] });
      toast({ title: "Link Removed" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const editMutation = useMutation({
    mutationFn: async (data: z.infer<typeof editDocumentSchema>) => {
      const res = await fetch(`/api/documents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update document");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/documents/${id}`] });
      toast({ title: "Document Updated" });
      setEditOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Checkout mutations
  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/documents/${id}/checkout`, {
        method: "POST",
        headers: { "X-Requested-With": "XMLHttpRequest" },
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to checkout");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/documents/${id}/checkout-status`] });
      toast({ title: "Document Checked Out" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const checkinMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/documents/${id}/checkin`, {
        method: "POST",
        headers: { "X-Requested-With": "XMLHttpRequest" },
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to check in");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/documents/${id}/checkout-status`] });
      toast({ title: "Document Checked In" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Workflow step actions
  const workflowApproveMutation = useMutation({
    mutationFn: async ({ stepId, comments }: { stepId: number; comments?: string }) => {
      const res = await fetch(`/api/workflow-steps/${stepId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ comments }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to approve step");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/documents/${id}/workflow`] });
      queryClient.invalidateQueries({ queryKey: [`/api/documents/${id}`] });
      toast({ title: "Step Approved" });
      setSignatureOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const workflowRejectMutation = useMutation({
    mutationFn: async ({ stepId, comments }: { stepId: number; comments: string }) => {
      const res = await fetch(`/api/workflow-steps/${stepId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ comments }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to reject step");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/documents/${id}/workflow`] });
      queryClient.invalidateQueries({ queryKey: [`/api/documents/${id}`] });
      toast({ title: "Step Rejected" });
      setWorkflowRejectOpen(false);
      setWorkflowRejectComments("");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const workflowDelegateMutation = useMutation({
    mutationFn: async ({ stepId, delegateTo, reason }: { stepId: number; delegateTo: string; reason?: string }) => {
      const res = await fetch(`/api/workflow-steps/${stepId}/delegate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ delegateTo, reason }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delegate step");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/documents/${id}/workflow`] });
      toast({ title: "Step Delegated" });
      setDelegateOpen(false);
      setDelegateTo("");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // ---- Loading / Not Found ----

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (!document) {
    return <NotFoundMessage />;
  }

  const anyPending =
    submitMutation.isPending ||
    approveMutation.isPending ||
    rejectMutation.isPending ||
    obsoleteMutation.isPending ||
    newRevisionMutation.isPending;

  const isEditable = document.status === "draft";
  const isCheckedOut = checkoutStatus?.isCheckedOut;
  const isCheckedOutByMe = isCheckedOut && checkoutStatus?.checkout?.checkedOutBy === user?.id;

  // Find the pending workflow step for approval actions
  const pendingStep = workflow?.steps?.find((s: any) => s.status === "pending");
  const pendingStepId = pendingStep ? workflow.steps.indexOf(pendingStep) + 1 : null;

  const handleWorkflowApprove = (stepNumber: number) => {
    const step = workflow?.steps?.find((s: any) => s.stepNumber === stepNumber);
    if (step) {
      setSignatureOpen(true);
    }
  };

  const handleWorkflowReject = (stepNumber: number) => {
    setWorkflowRejectStep(stepNumber);
    setWorkflowRejectOpen(true);
  };

  const handleWorkflowDelegate = (stepNumber: number) => {
    setDelegateStepNumber(stepNumber);
    setDelegateOpen(true);
  };

  const handleFileUpload = (uploadedFiles: File[]) => {
    for (const file of uploadedFiles) {
      uploadFileMutation.mutate(file);
    }
  };

  const handleOpenEdit = () => {
    editForm.reset({
      title: document.title,
      category: document.category || "",
      department: document.department || "",
      owner: document.owner,
      description: document.description || "",
      reviewCycleDays: document.reviewCycleDays || 365,
    });
    setEditOpen(true);
  };

  // Find the actual step ID (from server) for the pending step
  const getStepIdForNumber = (stepNumber: number): number | null => {
    // The workflow steps from the API have stepNumber but the step ID is the array index + 1
    // since the API uses the step's database ID for actions
    if (!workflow?.instance) return null;
    // Use the instance's ID to construct the step lookup - steps are 1-indexed
    return stepNumber; // The API uses the step database ID, which we need to look up
  };

  // ---- Render ----

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/documents")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold font-mono">
              {document.docNumber}
            </h1>
            <Badge variant="outline">{formatDocType(document.type)}</Badge>
            <StatusBadge status={document.status} />
            <span className="font-mono text-sm text-muted-foreground">
              Rev {document.currentRev}
            </span>
            {isCheckedOut && (
              <Tooltip>
                <TooltipTrigger>
                  <Badge
                    variant="outline"
                    className="gap-1 border-orange-300 text-orange-600"
                  >
                    <Lock className="h-3 w-3" />
                    Checked Out
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  Checked out by {checkoutStatus.checkout.checkedOutBy}
                  {checkoutStatus.checkout.purpose &&
                    ` - ${checkoutStatus.checkout.purpose}`}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          <p className="text-lg text-muted-foreground">{document.title}</p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Checkout/Checkin button */}
          {document.status !== "obsolete" && document.status !== "superseded" && (
            <>
              {!isCheckedOut ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => checkoutMutation.mutate()}
                  disabled={checkoutMutation.isPending}
                >
                  <Lock className="mr-1 h-3 w-3" />
                  Checkout
                </Button>
              ) : isCheckedOutByMe ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => checkinMutation.mutate()}
                  disabled={checkinMutation.isPending}
                >
                  <Unlock className="mr-1 h-3 w-3" />
                  Check In
                </Button>
              ) : null}
            </>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <ActionButtons
        document={document}
        onSubmit={() => submitMutation.mutate()}
        onApprove={() =>
          approveMutation.mutate({ approverName: user ? `${user.firstName} ${user.lastName}` : "Current User" })
        }
        onReject={() => setRejectOpen(true)}
        onNewRevision={() => setNewRevisionOpen(true)}
        onDistribute={() => setDistributeOpen(true)}
        onObsolete={() => obsoleteMutation.mutate()}
        onEdit={handleOpenEdit}
        isPending={anyPending}
      />

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="files">
            <File className="mr-1.5 h-4 w-4" />
            Files ({files.length})
          </TabsTrigger>
          <TabsTrigger value="workflow">
            <Workflow className="mr-1.5 h-4 w-4" />
            Workflow
          </TabsTrigger>
          <TabsTrigger value="revisions">
            <History className="mr-1.5 h-4 w-4" />
            History ({revisions.length})
          </TabsTrigger>
          <TabsTrigger value="distribution">
            <Users className="mr-1.5 h-4 w-4" />
            Distribution ({distributions.length})
          </TabsTrigger>
          <TabsTrigger value="reviews">
            <Clock className="mr-1.5 h-4 w-4" />
            Reviews ({reviews.length})
          </TabsTrigger>
          <TabsTrigger value="links">
            <LinkIcon className="mr-1.5 h-4 w-4" />
            Links ({links.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab document={document} />
        </TabsContent>

        <TabsContent value="files">
          <FilesTab
            files={files}
            documentId={id!}
            isEditable={isEditable || isCheckedOutByMe}
            onUpload={handleFileUpload}
            onDelete={(fileId) => deleteFileMutation.mutate(fileId)}
            isUploading={uploadFileMutation.isPending}
          />
        </TabsContent>

        <TabsContent value="workflow">
          <WorkflowTab
            workflow={workflow}
            canAct={document.status === "review"}
            onApprove={handleWorkflowApprove}
            onReject={handleWorkflowReject}
            onDelegate={handleWorkflowDelegate}
          />
        </TabsContent>

        <TabsContent value="revisions">
          <RevisionsTab
            revisions={revisions}
            currentRev={document.currentRev}
          />
        </TabsContent>

        <TabsContent value="distribution">
          <DistributionTab
            distributions={distributions}
            onAcknowledge={(distId) => acknowledgeMutation.mutate(distId)}
          />
        </TabsContent>

        <TabsContent value="reviews">
          <ReviewsTab reviews={reviews} />
        </TabsContent>

        <TabsContent value="links">
          <LinksTab
            links={links}
            onAddLink={() => setLinkOpen(true)}
            onDeleteLink={(linkId) => deleteLinkMutation.mutate(linkId)}
          />
        </TabsContent>
      </Tabs>

      {/* ---- Dialogs ---- */}

      {/* Edit Document Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Document</DialogTitle>
            <DialogDescription>
              Update document metadata.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form
              onSubmit={editForm.handleSubmit((data) => editMutation.mutate(data))}
              className="space-y-4"
            >
              <FormField
                control={editForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="owner"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Owner</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="department"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="reviewCycleDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Review Cycle (days)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={editForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea rows={3} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={editMutation.isPending}>
                  {editMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* New Revision Dialog */}
      <Dialog open={newRevisionOpen} onOpenChange={setNewRevisionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Revision</DialogTitle>
            <DialogDescription>
              This will create a new revision and reset the document to draft
              status.
            </DialogDescription>
          </DialogHeader>
          <Form {...revisionForm}>
            <form
              onSubmit={revisionForm.handleSubmit((data) =>
                newRevisionMutation.mutate(data)
              )}
              className="space-y-4"
            >
              <FormField
                control={revisionForm.control}
                name="author"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Author</FormLabel>
                    <FormControl>
                      <Input placeholder="Revision author" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={revisionForm.control}
                name="changeDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Change Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe what changed in this revision"
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
                  onClick={() => setNewRevisionOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={newRevisionMutation.isPending}
                >
                  {newRevisionMutation.isPending
                    ? "Creating..."
                    : "Create Revision"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Distribute Dialog */}
      <Dialog open={distributeOpen} onOpenChange={setDistributeOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Distribute Document</DialogTitle>
            <DialogDescription>
              Add recipients who should receive a copy of this document.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {distRecipients.map((recipient, index) => (
              <div key={index} className="flex gap-2 items-end">
                <div className="flex-1 space-y-1">
                  <label className="text-sm font-medium">Name</label>
                  <Input
                    placeholder="Recipient name"
                    value={recipient.recipientName}
                    onChange={(e) => {
                      const updated = [...distRecipients];
                      updated[index] = {
                        ...updated[index],
                        recipientName: e.target.value,
                      };
                      setDistRecipients(updated);
                    }}
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <label className="text-sm font-medium">Role</label>
                  <Input
                    placeholder="Role (optional)"
                    value={recipient.recipientRole}
                    onChange={(e) => {
                      const updated = [...distRecipients];
                      updated[index] = {
                        ...updated[index],
                        recipientRole: e.target.value,
                      };
                      setDistRecipients(updated);
                    }}
                  />
                </div>
                <div className="w-[130px] space-y-1">
                  <label className="text-sm font-medium">Method</label>
                  <Select
                    value={recipient.method}
                    onValueChange={(value: string) => {
                      const updated = [...distRecipients];
                      updated[index] = { ...updated[index], method: value };
                      setDistRecipients(updated);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="electronic">Electronic</SelectItem>
                      <SelectItem value="hardcopy">Hardcopy</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {distRecipients.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setDistRecipients(
                        distRecipients.filter((_, i) => i !== index)
                      )
                    }
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setDistRecipients([
                  ...distRecipients,
                  {
                    recipientName: "",
                    recipientRole: "",
                    method: "electronic",
                  },
                ])
              }
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Recipient
            </Button>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDistributeOpen(false)}
            >
              Cancel
            </Button>
            <Button
              disabled={
                distributeMutation.isPending ||
                distRecipients.every((r) => !r.recipientName.trim())
              }
              onClick={() => {
                const validRecipients = distRecipients.filter(
                  (r) => r.recipientName.trim()
                );
                if (validRecipients.length === 0) {
                  toast({
                    title: "Error",
                    description: "At least one recipient is required",
                    variant: "destructive",
                  });
                  return;
                }
                distributeMutation.mutate({ recipients: validRecipients });
              }}
            >
              {distributeMutation.isPending ? "Distributing..." : "Distribute"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Document</DialogTitle>
            <DialogDescription>
              Provide comments explaining why this document is being rejected.
              It will be returned to draft status.
            </DialogDescription>
          </DialogHeader>
          <Form {...rejectForm}>
            <form
              onSubmit={rejectForm.handleSubmit((data) =>
                rejectMutation.mutate(data)
              )}
              className="space-y-4"
            >
              <FormField
                control={rejectForm.control}
                name="comments"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Comments</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Rejection comments..."
                        rows={4}
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
                  onClick={() => setRejectOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="destructive"
                  disabled={rejectMutation.isPending}
                >
                  {rejectMutation.isPending ? "Rejecting..." : "Reject"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Add Link Dialog */}
      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Document Link</DialogTitle>
            <DialogDescription>
              Link this document to another entity in the system.
            </DialogDescription>
          </DialogHeader>
          <Form {...linkForm}>
            <form
              onSubmit={linkForm.handleSubmit((data) =>
                addLinkMutation.mutate(data)
              )}
              className="space-y-4"
            >
              <FormField
                control={linkForm.control}
                name="targetType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select target type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="document">Document</SelectItem>
                        <SelectItem value="pfmea">PFMEA</SelectItem>
                        <SelectItem value="control_plan">
                          Control Plan
                        </SelectItem>
                        <SelectItem value="process">Process</SelectItem>
                        <SelectItem value="part">Part</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={linkForm.control}
                name="targetId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target ID</FormLabel>
                    <FormControl>
                      <Input placeholder="UUID of target entity" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={linkForm.control}
                name="linkType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Link Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select link type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="references">References</SelectItem>
                        <SelectItem value="supersedes">Supersedes</SelectItem>
                        <SelectItem value="related_to">Related To</SelectItem>
                        <SelectItem value="parent_of">Parent Of</SelectItem>
                        <SelectItem value="child_of">Child Of</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLinkOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={addLinkMutation.isPending}>
                  {addLinkMutation.isPending ? "Adding..." : "Add Link"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Signature Capture Modal for workflow approval */}
      <SignatureCaptureModal
        open={signatureOpen}
        meaning={`I approve this document (${document.docNumber} Rev ${document.currentRev}) for the current workflow step.`}
        isPending={workflowApproveMutation.isPending}
        onSign={() => {
          if (pendingStep) {
            // Use the step's stepNumber to find the right step ID
            // The steps array from the workflow API includes stepNumber
            const step = workflow?.steps?.find((s: any) => s.status === "pending");
            if (step) {
              // The step ID for the API is the workflow instance step ID
              // We need to get it from the workflow data
              workflowApproveMutation.mutate({
                stepId: step.stepNumber,
                comments: "Approved with electronic signature",
              });
            }
          }
        }}
        onCancel={() => setSignatureOpen(false)}
      />

      {/* Workflow Reject Dialog */}
      <Dialog open={workflowRejectOpen} onOpenChange={setWorkflowRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Workflow Step</DialogTitle>
            <DialogDescription>
              Provide comments explaining why this step is being rejected.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Comments</label>
              <Textarea
                placeholder="Rejection comments..."
                rows={4}
                value={workflowRejectComments}
                onChange={(e) => setWorkflowRejectComments(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWorkflowRejectOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!workflowRejectComments.trim() || workflowRejectMutation.isPending}
              onClick={() => {
                if (workflowRejectStep != null) {
                  const step = workflow?.steps?.find((s: any) => s.stepNumber === workflowRejectStep);
                  if (step) {
                    workflowRejectMutation.mutate({
                      stepId: step.stepNumber,
                      comments: workflowRejectComments,
                    });
                  }
                }
              }}
            >
              {workflowRejectMutation.isPending ? "Rejecting..." : "Reject Step"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delegate Dialog */}
      <Dialog open={delegateOpen} onOpenChange={setDelegateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delegate Workflow Step</DialogTitle>
            <DialogDescription>
              Delegate this step to another user.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Delegate To (User ID)</label>
              <Input
                placeholder="Enter user ID to delegate to"
                value={delegateTo}
                onChange={(e) => setDelegateTo(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDelegateOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!delegateTo.trim() || workflowDelegateMutation.isPending}
              onClick={() => {
                if (delegateStepNumber != null) {
                  const step = workflow?.steps?.find((s: any) => s.stepNumber === delegateStepNumber);
                  if (step) {
                    workflowDelegateMutation.mutate({
                      stepId: step.stepNumber,
                      delegateTo,
                    });
                  }
                }
              }}
            >
              {workflowDelegateMutation.isPending ? "Delegating..." : "Delegate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
