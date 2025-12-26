import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  PenTool,
  CheckCircle,
  Clock,
  AlertCircle,
  User,
  Shield,
  FileCheck,
  Lock,
  Unlock,
} from "lucide-react";

interface Signature {
  id: string;
  entityType: string;
  entityId: string;
  role: string;
  signerUserId: string;
  signerName: string;
  signerEmail?: string;
  signedAt: string;
  contentHash: string;
  meaning: string;
  comment?: string;
}

interface ApprovalStatus {
  complete: boolean;
  pending: string[];
  signed: { role: string; signerName: string; signedAt: Date }[];
}

interface ApprovalMatrixEntry {
  id: string;
  documentType: string;
  role: string;
  sequence: number;
  required: boolean;
  canDelegate: boolean;
}

interface SignaturePanelProps {
  entityType: string;
  entityId: string;
  currentUserId: string;
  currentUserName: string;
  currentUserEmail?: string;
  currentUserRole?: string;
  onApprovalComplete?: () => void;
}

const roleLabels: Record<string, string> = {
  qe: "Quality Engineer",
  process_owner: "Process Owner",
  quality_manager: "Quality Manager",
  engineering_manager: "Engineering Manager",
  plant_manager: "Plant Manager",
};

const meaningLabels: Record<string, string> = {
  approved: "Approved",
  reviewed: "Reviewed",
  acknowledged: "Acknowledged",
};

export function SignaturePanel({
  entityType,
  entityId,
  currentUserId,
  currentUserName,
  currentUserEmail,
  currentUserRole,
  onApprovalComplete,
}: SignaturePanelProps) {
  const [isSignDialogOpen, setIsSignDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [selectedMeaning, setSelectedMeaning] = useState<string>("approved");
  const [comment, setComment] = useState("");
  const [confirmationChecked, setConfirmationChecked] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: signatures, isLoading: signaturesLoading } = useQuery<Signature[]>({
    queryKey: ["/api/signatures", entityType, entityId],
  });

  const { data: approvalStatus, isLoading: statusLoading } = useQuery<ApprovalStatus>({
    queryKey: ["/api/approval-status", entityType, entityId],
  });

  const { data: approvalMatrix } = useQuery<ApprovalMatrixEntry[]>({
    queryKey: ["/api/approval-matrix", entityType],
  });

  const signMutation = useMutation({
    mutationFn: async (data: {
      entityType: string;
      entityId: string;
      role: string;
      signerUserId: string;
      signerName: string;
      signerEmail?: string;
      meaning: string;
      comment?: string;
    }) => {
      const response = await fetch("/api/signatures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to sign document");
      return response.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/signatures", entityType, entityId] });
      queryClient.invalidateQueries({ queryKey: ["/api/approval-status", entityType, entityId] });
      queryClient.invalidateQueries({ queryKey: ["/api/audit-logs", entityType, entityId] });
      
      toast({
        title: "Document Signed",
        description: `Successfully signed as ${roleLabels[selectedRole] || selectedRole}`,
      });

      if (result.approvalStatus?.complete) {
        toast({
          title: "Approval Complete",
          description: "All required signatures have been collected. Document is now effective.",
        });
        onApprovalComplete?.();
      }

      resetForm();
    },
    onError: (error) => {
      toast({
        title: "Signature Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setIsSignDialogOpen(false);
    setSelectedRole("");
    setSelectedMeaning("approved");
    setComment("");
    setConfirmationChecked(false);
  };

  const handleSign = () => {
    if (!selectedRole || !confirmationChecked) return;

    signMutation.mutate({
      entityType,
      entityId,
      role: selectedRole,
      signerUserId: currentUserId,
      signerName: currentUserName,
      signerEmail: currentUserEmail,
      meaning: selectedMeaning,
      comment: comment || undefined,
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const canSignAs = (role: string) => {
    if (signatures?.some((s) => s.role === role)) return false;
    if (currentUserRole === role) return true;
    if (currentUserRole === "quality_manager") return true;
    const matrixEntry = approvalMatrix?.find((m) => m.role === role);
    if (matrixEntry?.canDelegate) return true;
    return false;
  };

  const isLoading = signaturesLoading || statusLoading;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PenTool className="h-5 w-5" />
            E-Signatures
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <PenTool className="h-5 w-5" />
              E-Signatures
            </CardTitle>
            <CardDescription>
              Document approval workflow
            </CardDescription>
          </div>
          {approvalStatus && (
            <Badge
              variant={approvalStatus.complete ? "default" : "secondary"}
              className={approvalStatus.complete ? "bg-green-600" : ""}
            >
              {approvalStatus.complete ? (
                <>
                  <Lock className="h-3 w-3 mr-1" />
                  Approved
                </>
              ) : (
                <>
                  <Unlock className="h-3 w-3 mr-1" />
                  Pending
                </>
              )}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {approvalMatrix && approvalMatrix.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">
              Approval Progress
            </h4>
            <div className="space-y-2">
              {approvalMatrix
                .sort((a, b) => a.sequence - b.sequence)
                .map((entry) => {
                  const signature = signatures?.find((s) => s.role === entry.role);
                  const isPending = approvalStatus?.pending.includes(entry.role);

                  return (
                    <div
                      key={entry.id}
                      className={`flex items-center justify-between gap-2 p-3 rounded-lg border ${
                        signature
                          ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                          : isPending
                          ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"
                          : "bg-muted border-border"
                      }`}
                      data-testid={`approval-step-${entry.role}`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-full ${
                            signature
                              ? "bg-green-100 dark:bg-green-800"
                              : isPending
                              ? "bg-yellow-100 dark:bg-yellow-800"
                              : "bg-muted"
                          }`}
                        >
                          {signature ? (
                            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                          ) : isPending ? (
                            <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                          ) : (
                            <User className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-sm">
                            {roleLabels[entry.role] || entry.role}
                            {entry.required && (
                              <span className="text-red-500 ml-1">*</span>
                            )}
                          </p>
                          {signature ? (
                            <p className="text-xs text-muted-foreground">
                              {signature.signerName} • {formatDate(signature.signedAt)}
                            </p>
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              {isPending ? "Awaiting signature" : "Optional"}
                            </p>
                          )}
                        </div>
                      </div>

                      {!signature && canSignAs(entry.role) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedRole(entry.role);
                            setIsSignDialogOpen(true);
                          }}
                          data-testid={`button-sign-${entry.role}`}
                        >
                          <PenTool className="h-3 w-3 mr-1" />
                          Sign
                        </Button>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {signatures && signatures.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">
              Collected Signatures
            </h4>
            <div className="space-y-2">
              {signatures.map((sig) => (
                <div
                  key={sig.id}
                  className="flex items-start justify-between gap-2 p-3 bg-muted rounded-lg"
                  data-testid={`signature-${sig.id}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-green-100 dark:bg-green-800 rounded-full">
                      <FileCheck className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        {sig.signerName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {roleLabels[sig.role] || sig.role} • {meaningLabels[sig.meaning] || sig.meaning}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(sig.signedAt)}
                      </p>
                      {sig.comment && (
                        <p className="text-xs mt-1 italic">"{sig.comment}"</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="text-xs font-mono">
                      <Shield className="h-3 w-3 mr-1" />
                      {sig.contentHash.substring(0, 8)}...
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {(!approvalMatrix || approvalMatrix.length === 0) && (
          <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              No approval matrix configured for this document type.
            </p>
          </div>
        )}

        <Dialog open={isSignDialogOpen} onOpenChange={setIsSignDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Electronic Signature</DialogTitle>
              <DialogDescription>
                You are about to apply an electronic signature to this document.
                This action is legally binding and will be recorded in the audit log.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Signing As</Label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger data-testid="select-role">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {approvalMatrix
                      ?.filter((m) => canSignAs(m.role))
                      .map((m) => (
                        <SelectItem key={m.role} value={m.role}>
                          {roleLabels[m.role] || m.role}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Signature Meaning</Label>
                <Select value={selectedMeaning} onValueChange={setSelectedMeaning}>
                  <SelectTrigger data-testid="select-meaning">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="reviewed">Reviewed</SelectItem>
                    <SelectItem value="acknowledged">Acknowledged</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Comment (Optional)</Label>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Add any comments or notes..."
                  rows={2}
                  data-testid="input-comment"
                />
              </div>

              <div className="p-3 bg-muted rounded-lg space-y-2">
                <p className="text-sm font-medium">Signer Information</p>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>Name: {currentUserName}</p>
                  {currentUserEmail && <p>Email: {currentUserEmail}</p>}
                  <p>User ID: {currentUserId}</p>
                  <p>Timestamp: {new Date().toLocaleString()}</p>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <Checkbox
                  id="confirmation"
                  checked={confirmationChecked}
                  onCheckedChange={(checked) =>
                    setConfirmationChecked(checked as boolean)
                  }
                  data-testid="checkbox-confirm"
                />
                <label
                  htmlFor="confirmation"
                  className="text-sm leading-tight cursor-pointer"
                >
                  I confirm that I have reviewed this document and understand that
                  this electronic signature is legally binding. I am authorized to
                  sign in the selected capacity.
                </label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={resetForm} data-testid="button-cancel-sign">
                Cancel
              </Button>
              <Button
                onClick={handleSign}
                disabled={
                  !selectedRole || !confirmationChecked || signMutation.isPending
                }
                data-testid="button-apply-signature"
              >
                {signMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Signing...
                  </>
                ) : (
                  <>
                    <PenTool className="h-4 w-4 mr-2" />
                    Apply Signature
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

export function SignatureStatusBadge({
  entityType,
  entityId,
}: {
  entityType: string;
  entityId: string;
}) {
  const { data: approvalStatus } = useQuery<ApprovalStatus>({
    queryKey: ["/api/approval-status", entityType, entityId],
  });

  if (!approvalStatus) return null;

  const totalRequired = approvalStatus.pending.length + approvalStatus.signed.length;
  const signedCount = approvalStatus.signed.length;

  return (
    <Badge
      variant={approvalStatus.complete ? "default" : "secondary"}
      className={approvalStatus.complete ? "bg-green-600" : ""}
      data-testid={`badge-signature-status-${entityId}`}
    >
      {approvalStatus.complete ? (
        <>
          <CheckCircle className="h-3 w-3 mr-1" />
          Approved
        </>
      ) : (
        <>
          <Clock className="h-3 w-3 mr-1" />
          {signedCount}/{totalRequired} Signed
        </>
      )}
    </Badge>
  );
}
