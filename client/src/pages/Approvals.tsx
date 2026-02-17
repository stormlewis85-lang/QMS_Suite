import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import {
  CheckCircle,
  Clock,
  AlertCircle,
  ArrowRight,
  Eye,
  Calendar,
  Loader2,
  Inbox,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import SignatureCaptureModal from "@/components/SignatureCaptureModal";

interface ApprovalStep {
  id: number;
  workflowInstanceId: number;
  stepNumber: number;
  stepName: string;
  assignedTo: string | null;
  assignedRole: string | null;
  dueDate: string | null;
  status: string;
  signatureRequired: number;
  delegatedFrom: string | null;
  comments: string | null;
  actionTaken: string | null;
  actionBy: string | null;
  actionAt: string | null;
  document?: {
    id: string;
    docNumber: string;
    title: string;
    type: string;
    currentRev: string;
  };
  workflowInstance?: {
    id: number;
    status: string;
    initiatedBy: string;
    startedAt: string;
  };
}

function getDaysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function DueBadge({ dueDate }: { dueDate: string | null }) {
  const days = getDaysUntil(dueDate);
  if (days === null) return null;

  if (days < 0) {
    return (
      <Badge variant="destructive" className="gap-1">
        <AlertTriangle className="h-3 w-3" />
        {Math.abs(days)} day{Math.abs(days) !== 1 ? "s" : ""} overdue
      </Badge>
    );
  }
  if (days <= 3) {
    return (
      <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 gap-1">
        <Clock className="h-3 w-3" />
        Due in {days} day{days !== 1 ? "s" : ""}
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="gap-1">
      <Calendar className="h-3 w-3" />
      Due {new Date(dueDate!).toLocaleDateString()}
    </Badge>
  );
}

export default function Approvals() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState("pending");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [signatureOpen, setSignatureOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [delegateOpen, setDelegateOpen] = useState(false);
  const [activeStep, setActiveStep] = useState<ApprovalStep | null>(null);
  const [rejectComments, setRejectComments] = useState("");
  const [delegateTo, setDelegateTo] = useState("");
  const [approveComments, setApproveComments] = useState("");
  const [confirmApproveOpen, setConfirmApproveOpen] = useState(false);

  const { data: pendingSteps = [], isLoading: loadingPending } = useQuery<ApprovalStep[]>({
    queryKey: ["/api/my/approvals", "pending"],
    queryFn: async () => {
      const res = await fetch("/api/my/approvals?status=pending", {
        credentials: "include",
      });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: completedSteps = [], isLoading: loadingCompleted } = useQuery<ApprovalStep[]>({
    queryKey: ["/api/my/approvals", "completed"],
    queryFn: async () => {
      const res = await fetch("/api/my/approvals?status=completed", {
        credentials: "include",
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: tab === "completed",
  });

  const { data: delegatedSteps = [], isLoading: loadingDelegated } = useQuery<ApprovalStep[]>({
    queryKey: ["/api/my/approvals", "delegated"],
    queryFn: async () => {
      const res = await fetch("/api/my/approvals?status=delegated", {
        credentials: "include",
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: tab === "delegated",
  });

  const approveMutation = useMutation({
    mutationFn: async ({ stepId, password, comments }: { stepId: number; password?: string; comments?: string }) => {
      const res = await apiRequest("POST", `/api/workflow-steps/${stepId}/approve`, {
        comments,
        password,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my/approvals"] });
      toast({ title: "Approved", description: "Step has been approved successfully." });
      setSignatureOpen(false);
      setConfirmApproveOpen(false);
      setActiveStep(null);
      setApproveComments("");
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ stepId, comments }: { stepId: number; comments: string }) => {
      const res = await apiRequest("POST", `/api/workflow-steps/${stepId}/reject`, { comments });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my/approvals"] });
      toast({ title: "Rejected", description: "Step has been rejected." });
      setRejectOpen(false);
      setActiveStep(null);
      setRejectComments("");
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const delegateMutation = useMutation({
    mutationFn: async ({ stepId, delegateTo }: { stepId: number; delegateTo: string }) => {
      const res = await apiRequest("POST", `/api/workflow-steps/${stepId}/delegate`, {
        delegateTo,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my/approvals"] });
      toast({ title: "Delegated", description: "Step has been delegated." });
      setDelegateOpen(false);
      setActiveStep(null);
      setDelegateTo("");
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const bulkApproveMutation = useMutation({
    mutationFn: async (stepIds: number[]) => {
      const results = await Promise.all(
        stepIds.map((id) =>
          apiRequest("POST", `/api/workflow-steps/${id}/approve`, {
            comments: "Bulk approved",
          })
        )
      );
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my/approvals"] });
      toast({ title: "Bulk Approved", description: `${selected.size} steps approved.` });
      setSelected(new Set());
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const handleApprove = (step: ApprovalStep) => {
    setActiveStep(step);
    if (step.signatureRequired) {
      setSignatureOpen(true);
    } else {
      setApproveComments("");
      setConfirmApproveOpen(true);
    }
  };

  const handleReject = (step: ApprovalStep) => {
    setActiveStep(step);
    setRejectComments("");
    setRejectOpen(true);
  };

  const handleDelegate = (step: ApprovalStep) => {
    setActiveStep(step);
    setDelegateTo("");
    setDelegateOpen(true);
  };

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const bulkApprovable = pendingSteps.filter(
    (s) => selected.has(s.id) && !s.signatureRequired
  );

  const overdueSteps = pendingSteps.filter(
    (s) => s.dueDate && getDaysUntil(s.dueDate)! < 0
  );

  function renderStepCard(step: ApprovalStep, showActions = true) {
    const isOverdue = step.dueDate && getDaysUntil(step.dueDate)! < 0;
    return (
      <Card
        key={step.id}
        className={isOverdue ? "border-red-300 dark:border-red-700" : ""}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              {showActions && (
                <Checkbox
                  checked={selected.has(step.id)}
                  onCheckedChange={() => toggleSelect(step.id)}
                  disabled={!!step.signatureRequired}
                  className="mt-1"
                />
              )}
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {isOverdue && (
                    <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
                  )}
                  <span className="font-medium text-sm">
                    {step.document?.docNumber || `WF-${step.workflowInstanceId}`}
                  </span>
                  <span className="text-sm text-muted-foreground truncate">
                    {step.document?.title || "Document"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Step {step.stepNumber}: {step.stepName}
                  {step.signatureRequired ? (
                    <Badge variant="outline" className="ml-2 text-xs">
                      Signature Required
                    </Badge>
                  ) : null}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <DueBadge dueDate={step.dueDate} />
                  {step.delegatedFrom && (
                    <Badge variant="outline" className="text-xs">
                      Delegated from {step.delegatedFrom}
                    </Badge>
                  )}
                </div>
                {step.actionAt && (
                  <p className="text-xs text-muted-foreground">
                    {step.actionTaken === "approved" ? "Approved" : "Rejected"} by{" "}
                    {step.actionBy} on{" "}
                    {new Date(step.actionAt).toLocaleString()}
                  </p>
                )}
                {step.comments && (
                  <p className="text-xs italic text-muted-foreground border-l-2 pl-2 mt-1">
                    {step.comments}
                  </p>
                )}
              </div>
            </div>
            {showActions && step.status === "pending" && (
              <div className="flex gap-2 flex-shrink-0">
                {step.document?.id && (
                  <Link href={`/documents/${step.document.id}`}>
                    <Button variant="outline" size="sm">
                      <Eye className="mr-1 h-3 w-3" />
                      View
                    </Button>
                  </Link>
                )}
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => handleApprove(step)}
                >
                  <CheckCircle className="mr-1 h-3 w-3" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleReject(step)}
                >
                  <AlertCircle className="mr-1 h-3 w-3" />
                  Reject
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDelegate(step)}
                >
                  <ArrowRight className="mr-1 h-3 w-3" />
                  Delegate
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  function renderEmpty(message: string) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Inbox className="mx-auto h-12 w-12 mb-3 opacity-50" />
        <p className="text-sm">{message}</p>
      </div>
    );
  }

  function renderLoading() {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Approvals</h1>
          <p className="text-sm text-muted-foreground">
            Review and approve pending workflow steps
          </p>
        </div>
        {selected.size > 0 && bulkApprovable.length > 0 && (
          <Button
            className="bg-green-600 hover:bg-green-700"
            onClick={() => bulkApproveMutation.mutate(bulkApprovable.map((s) => s.id))}
            disabled={bulkApproveMutation.isPending}
          >
            {bulkApproveMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="mr-2 h-4 w-4" />
            )}
            Bulk Approve ({bulkApprovable.length})
          </Button>
        )}
      </div>

      {overdueSteps.length > 0 && (
        <Card className="border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-medium text-sm">
                {overdueSteps.length} overdue approval{overdueSteps.length !== 1 ? "s" : ""} require{overdueSteps.length === 1 ? "s" : ""} attention
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="pending">
            Pending{pendingSteps.length > 0 ? ` (${pendingSteps.length})` : ""}
          </TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="delegated">Delegated to Me</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-3 mt-4">
          {loadingPending ? renderLoading() : pendingSteps.length === 0 ? (
            renderEmpty("No pending approvals. You're all caught up!")
          ) : (
            pendingSteps.map((step) => renderStepCard(step, true))
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-3 mt-4">
          {loadingCompleted ? renderLoading() : completedSteps.length === 0 ? (
            renderEmpty("No completed approvals yet.")
          ) : (
            completedSteps.map((step) => renderStepCard(step, false))
          )}
        </TabsContent>

        <TabsContent value="delegated" className="space-y-3 mt-4">
          {loadingDelegated ? renderLoading() : delegatedSteps.length === 0 ? (
            renderEmpty("No delegated approvals.")
          ) : (
            delegatedSteps.map((step) => renderStepCard(step, true))
          )}
        </TabsContent>
      </Tabs>

      {/* Confirm Approve (no signature) */}
      <Dialog open={confirmApproveOpen} onOpenChange={setConfirmApproveOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Approve Step</DialogTitle>
            <DialogDescription>
              Approve step "{activeStep?.stepName}" for{" "}
              {activeStep?.document?.docNumber || "this document"}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <label className="text-sm font-medium">Comments (optional)</label>
            <Textarea
              value={approveComments}
              onChange={(e) => setApproveComments(e.target.value)}
              placeholder="Add any comments..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmApproveOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() =>
                activeStep &&
                approveMutation.mutate({
                  stepId: activeStep.id,
                  comments: approveComments || undefined,
                })
              }
              disabled={approveMutation.isPending}
            >
              {approveMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Signature Capture */}
      <SignatureCaptureModal
        open={signatureOpen}
        meaning={`I approve step "${activeStep?.stepName}" for ${activeStep?.document?.docNumber || "this document"}`}
        onSign={(data) =>
          activeStep &&
          approveMutation.mutate({
            stepId: activeStep.id,
            password: data.password,
          })
        }
        onCancel={() => {
          setSignatureOpen(false);
          setActiveStep(null);
        }}
        isPending={approveMutation.isPending}
      />

      {/* Reject Dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Step</DialogTitle>
            <DialogDescription>
              Reject step "{activeStep?.stepName}" for{" "}
              {activeStep?.document?.docNumber || "this document"}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <label className="text-sm font-medium">
              Reason for rejection <span className="text-red-500">*</span>
            </label>
            <Textarea
              value={rejectComments}
              onChange={(e) => setRejectComments(e.target.value)}
              placeholder="Provide a reason for rejection..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                activeStep &&
                rejectMutation.mutate({
                  stepId: activeStep.id,
                  comments: rejectComments,
                })
              }
              disabled={!rejectComments.trim() || rejectMutation.isPending}
            >
              {rejectMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delegate Dialog */}
      <Dialog open={delegateOpen} onOpenChange={setDelegateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delegate Step</DialogTitle>
            <DialogDescription>
              Delegate step "{activeStep?.stepName}" to another user.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <label className="text-sm font-medium">
              Delegate to (user ID or email) <span className="text-red-500">*</span>
            </label>
            <Input
              value={delegateTo}
              onChange={(e) => setDelegateTo(e.target.value)}
              placeholder="Enter user ID or email..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDelegateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                activeStep &&
                delegateMutation.mutate({
                  stepId: activeStep.id,
                  delegateTo,
                })
              }
              disabled={!delegateTo.trim() || delegateMutation.isPending}
            >
              {delegateMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delegate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
