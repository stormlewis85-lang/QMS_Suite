import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { PageHeader } from '@/components/ui/page-header';
import { 
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  FileEdit,
  Users,
  GitBranch,
  ArrowRight,
  Diff,
  Shield,
  RefreshCw,
  Ban,
  Check,
  X
} from 'lucide-react';

interface ChangePackage {
  id: string;
  packageNumber: string;
  title: string;
  description?: string;
  status: string;
  reasonCode: string;
  priority: string;
  targetEntityType: string;
  targetEntityId: string;
  beforeSnapshot?: any;
  afterSnapshot?: any;
  impactAnalysis?: {
    affectedParts: any[];
    apDeltas: any[];
    csrImpacts: any[];
  };
  autoReviewId?: string;
  autoReviewPassed?: boolean;
  initiatedBy: string;
  initiatedAt: string;
  effectiveFrom?: string;
  completedAt?: string;
  items: ChangeItem[];
  approvals: Approval[];
  propagations: Propagation[];
}

interface ChangeItem {
  id: string;
  fieldPath: string;
  fieldLabel: string;
  oldValue?: string;
  newValue?: string;
  changeType: string;
  impactLevel?: string;
}

interface Approval {
  id: string;
  role: string;
  approverId: string;
  approverName?: string;
  status: string;
  requestedAt: string;
  respondedAt?: string;
  comments?: string;
}

interface Propagation {
  id: string;
  targetEntityType: string;
  targetEntityId: string;
  decision: string;
  decidedBy?: string;
  decidedAt?: string;
  appliedAt?: string;
}

interface WorkflowStatus {
  currentStatus: string;
  nextAction: string;
  canProceed: boolean;
  blockers: string[];
}

const statusConfig: Record<string, { label: string; icon: any; color: string }> = {
  draft: { label: 'Draft', icon: FileEdit, color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200' },
  impact_analysis: { label: 'Impact Analysis', icon: GitBranch, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  auto_review: { label: 'Auto Review', icon: AlertTriangle, color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
  pending_signatures: { label: 'Pending Signatures', icon: Users, color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
  effective: { label: 'Effective', icon: CheckCircle2, color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  cancelled: { label: 'Cancelled', icon: XCircle, color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
};

export default function ChangePackageDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(null);
  const [approvalDecision, setApprovalDecision] = useState<'approved' | 'rejected'>('approved');
  const [approvalComments, setApprovalComments] = useState('');

  const { data: pkg, isLoading } = useQuery<ChangePackage>({
    queryKey: ['/api/change-packages', id],
    queryFn: async () => {
      const res = await fetch(`/api/change-packages/${id}`);
      if (!res.ok) throw new Error('Failed to fetch change package');
      return res.json();
    },
  });

  const { data: workflow } = useQuery<WorkflowStatus>({
    queryKey: ['/api/change-packages', id, 'workflow'],
    queryFn: async () => {
      const res = await fetch(`/api/change-packages/${id}/workflow`);
      if (!res.ok) throw new Error('Failed to fetch workflow status');
      return res.json();
    },
    enabled: !!pkg,
  });

  const impactMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/change-packages/${id}/impact-analysis`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to run impact analysis');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/change-packages', id] });
      toast({ title: 'Impact analysis complete' });
    },
    onError: (error) => {
      toast({ 
        title: 'Impact analysis failed', 
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive' 
      });
    },
  });

  const autoReviewMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/change-packages/${id}/workflow/auto-review`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to run auto-review');
      return res.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['/api/change-packages', id] });
      toast({ 
        title: result.passed ? 'Auto-review passed' : 'Auto-review complete',
        description: `${result.errorCount || 0} errors, ${result.warningCount || 0} warnings`,
        variant: result.passed ? 'default' : 'destructive',
      });
    },
    onError: (error) => {
      toast({ 
        title: 'Auto-review failed', 
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive' 
      });
    },
  });

  const requestApprovalsMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/change-packages/${id}/request-approvals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approvers: [
            { role: 'Quality Engineer', approverId: 'qe-user', approverName: 'QE User', required: true },
            { role: 'Process Owner', approverId: 'po-user', approverName: 'Process Owner', required: true },
          ],
        }),
      });
      if (!res.ok) throw new Error('Failed to request approvals');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/change-packages', id] });
      toast({ title: 'Approval requests sent' });
    },
    onError: (error) => {
      toast({ 
        title: 'Failed to request approvals', 
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive' 
      });
    },
  });

  const processApprovalMutation = useMutation({
    mutationFn: async ({ approvalId, decision, comments }: { approvalId: string; decision: string; comments: string }) => {
      const res = await fetch(`/api/change-packages/approvals/${approvalId}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, comments }),
      });
      if (!res.ok) throw new Error('Failed to process approval');
      return res.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['/api/change-packages', id] });
      setApprovalDialogOpen(false);
      setSelectedApproval(null);
      
      if (result.packageStatus === 'effective') {
        toast({ title: 'Package approved and now effective!' });
      } else {
        toast({ title: 'Approval recorded' });
      }
    },
    onError: (error) => {
      toast({ 
        title: 'Failed to process approval', 
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive' 
      });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (reason: string) => {
      const res = await fetch(`/api/change-packages/${id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) throw new Error('Failed to cancel package');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/change-packages', id] });
      setCancelDialogOpen(false);
      toast({ title: 'Package cancelled' });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Clock className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!pkg) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <XCircle className="h-12 w-12 text-muted-foreground" />
        <p>Change package not found</p>
        <Button onClick={() => setLocation('/change-packages')} data-testid="button-back-to-list">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to List
        </Button>
      </div>
    );
  }

  const statusInfo = statusConfig[pkg.status] || statusConfig.draft;
  const StatusIcon = statusInfo.icon;

  return (
    <div className="flex flex-col h-full">
      <PageHeader 
        title={pkg.packageNumber}
        description={pkg.title}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setLocation('/change-packages')} data-testid="button-back">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            {pkg.status !== 'effective' && pkg.status !== 'cancelled' && (
              <Button variant="outline" onClick={() => setCancelDialogOpen(true)} data-testid="button-cancel-package">
                <Ban className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            )}
          </div>
        }
      />

      <div className="flex-1 overflow-auto p-6 space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 flex-wrap">
                <Badge className={`${statusInfo.color} text-lg px-4 py-2`}>
                  <StatusIcon className="h-5 w-5 mr-2" />
                  {statusInfo.label}
                </Badge>
                <div className="text-sm text-muted-foreground">
                  <div>Initiated: {new Date(pkg.initiatedAt).toLocaleDateString()}</div>
                  {pkg.effectiveFrom && (
                    <div>Effective: {new Date(pkg.effectiveFrom).toLocaleDateString()}</div>
                  )}
                </div>
              </div>
              
              {workflow && (
                <div className="mt-4 p-3 bg-muted rounded-lg">
                  <div className="text-sm font-medium">Next Action: {workflow.nextAction}</div>
                  {workflow.blockers.length > 0 && (
                    <div className="mt-2 text-sm text-red-600 dark:text-red-400">
                      {workflow.blockers.map((b, i) => (
                        <div key={i}>• {b}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Workflow Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {pkg.status === 'draft' && (
                <Button 
                  className="w-full" 
                  onClick={() => impactMutation.mutate()}
                  disabled={impactMutation.isPending}
                  data-testid="button-run-impact-analysis"
                >
                  <GitBranch className="h-4 w-4 mr-2" />
                  {impactMutation.isPending ? 'Analyzing...' : 'Run Impact Analysis'}
                </Button>
              )}
              
              {pkg.status === 'impact_analysis' && (
                <Button 
                  className="w-full"
                  onClick={() => autoReviewMutation.mutate()}
                  disabled={autoReviewMutation.isPending}
                  data-testid="button-run-auto-review"
                >
                  <Shield className="h-4 w-4 mr-2" />
                  {autoReviewMutation.isPending ? 'Reviewing...' : 'Run Auto-Review'}
                </Button>
              )}
              
              {pkg.status === 'auto_review' && pkg.autoReviewPassed && (
                <Button 
                  className="w-full"
                  onClick={() => requestApprovalsMutation.mutate()}
                  disabled={requestApprovalsMutation.isPending}
                  data-testid="button-request-approvals"
                >
                  <Users className="h-4 w-4 mr-2" />
                  {requestApprovalsMutation.isPending ? 'Sending...' : 'Request Approvals'}
                </Button>
              )}
              
              {pkg.status === 'auto_review' && pkg.autoReviewPassed === false && (
                <div className="p-3 bg-red-50 dark:bg-red-950 rounded-lg text-red-800 dark:text-red-200 text-sm">
                  <AlertTriangle className="h-4 w-4 inline mr-2" />
                  Auto-review failed. Resolve errors before requesting approvals.
                </div>
              )}
              
              {pkg.status === 'effective' && (
                <Button className="w-full" variant="outline" data-testid="button-propagate">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Propagate to Affected Documents
                </Button>
              )}
              
              {pkg.status === 'pending_signatures' && (
                <div className="p-3 bg-purple-50 dark:bg-purple-950 rounded-lg text-purple-800 dark:text-purple-200 text-sm">
                  <Users className="h-4 w-4 inline mr-2" />
                  Waiting for approvals ({pkg.approvals?.filter(a => a.status === 'approved').length || 0}/{pkg.approvals?.length || 0})
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="changes">
          <TabsList>
            <TabsTrigger value="changes" data-testid="tab-changes">
              <Diff className="h-4 w-4 mr-2" />
              Changes ({pkg.items?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="impact" data-testid="tab-impact">
              <GitBranch className="h-4 w-4 mr-2" />
              Impact Analysis
            </TabsTrigger>
            <TabsTrigger value="approvals" data-testid="tab-approvals">
              <Users className="h-4 w-4 mr-2" />
              Approvals ({pkg.approvals?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="changes" className="mt-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Field</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Old Value</TableHead>
                      <TableHead></TableHead>
                      <TableHead>New Value</TableHead>
                      <TableHead>Impact</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pkg.items?.map((item) => (
                      <TableRow key={item.id} data-testid={`row-change-item-${item.id}`}>
                        <TableCell className="font-medium">{item.fieldLabel}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.changeType}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm text-red-600 dark:text-red-400">
                          {item.oldValue || '—'}
                        </TableCell>
                        <TableCell>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        </TableCell>
                        <TableCell className="font-mono text-sm text-green-600 dark:text-green-400">
                          {item.newValue || '—'}
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            item.impactLevel === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                            item.impactLevel === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                            'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                          }>
                            {item.impactLevel || 'low'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!pkg.items || pkg.items.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No changes recorded
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="impact" className="mt-4">
            <div className="grid md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Affected Parts</CardTitle>
                </CardHeader>
                <CardContent>
                  {pkg.impactAnalysis?.affectedParts?.length ? (
                    <ul className="space-y-2">
                      {pkg.impactAnalysis.affectedParts.map((part: any, i: number) => (
                        <li key={i} className="text-sm">
                          <span className="font-mono">{part.partNumber}</span>
                          <div className="text-muted-foreground text-xs">
                            {part.documents?.join(', ')}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Run impact analysis to see affected parts
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">AP Changes</CardTitle>
                </CardHeader>
                <CardContent>
                  {pkg.impactAnalysis?.apDeltas?.length ? (
                    <ul className="space-y-2">
                      {pkg.impactAnalysis.apDeltas.map((delta: any, i: number) => (
                        <li key={i} className="text-sm flex items-center gap-2 flex-wrap">
                          <Badge variant="outline">{delta.oldAP}</Badge>
                          <ArrowRight className="h-3 w-3" />
                          <Badge className={
                            delta.newAP === 'H' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                            delta.newAP === 'M' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                            'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          }>
                            {delta.newAP}
                          </Badge>
                          <span className={delta.change === 'degraded' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}>
                            ({delta.change})
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No AP changes detected
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">CSR Impacts</CardTitle>
                </CardHeader>
                <CardContent>
                  {pkg.impactAnalysis?.csrImpacts?.length ? (
                    <ul className="space-y-2">
                      {pkg.impactAnalysis.csrImpacts.map((csr: any, i: number) => (
                        <li key={i} className="text-sm">
                          <div className="font-medium">{csr.characteristic}</div>
                          <div className="text-muted-foreground text-xs">{csr.impact}</div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No CSR impacts detected
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="approvals" className="mt-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Role</TableHead>
                      <TableHead>Approver</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Requested</TableHead>
                      <TableHead>Responded</TableHead>
                      <TableHead>Comments</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pkg.approvals?.map((approval) => (
                      <TableRow key={approval.id} data-testid={`row-approval-${approval.id}`}>
                        <TableCell className="font-medium">{approval.role}</TableCell>
                        <TableCell>{approval.approverName || approval.approverId}</TableCell>
                        <TableCell>
                          <Badge className={
                            approval.status === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                            approval.status === 'rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                            'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                          }>
                            {approval.status === 'approved' && <Check className="h-3 w-3 mr-1" />}
                            {approval.status === 'rejected' && <X className="h-3 w-3 mr-1" />}
                            {approval.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(approval.requestedAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {approval.respondedAt ? new Date(approval.respondedAt).toLocaleDateString() : '—'}
                        </TableCell>
                        <TableCell className="text-sm max-w-[200px] truncate">
                          {approval.comments || '—'}
                        </TableCell>
                        <TableCell>
                          {approval.status === 'pending' && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                setSelectedApproval(approval);
                                setApprovalDialogOpen(true);
                              }}
                              data-testid={`button-respond-${approval.id}`}
                            >
                              Respond
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!pkg.approvals || pkg.approvals.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No approvals requested yet
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Change Package</DialogTitle>
            <DialogDescription>
              This action cannot be undone. Please provide a reason for cancellation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="cancel-reason">Cancellation Reason</Label>
              <Textarea
                id="cancel-reason"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Explain why this change package is being cancelled..."
                rows={3}
                data-testid="input-cancel-reason"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
              Keep Package
            </Button>
            <Button 
              variant="destructive"
              onClick={() => cancelMutation.mutate(cancelReason)}
              disabled={!cancelReason || cancelMutation.isPending}
              data-testid="button-confirm-cancel"
            >
              <Ban className="h-4 w-4 mr-2" />
              Cancel Package
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review & Approve</DialogTitle>
            <DialogDescription>
              Review the changes and provide your approval decision.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedApproval && (
              <div className="p-3 bg-muted rounded-lg text-sm">
                <div className="font-medium">Role: {selectedApproval.role}</div>
              </div>
            )}
            <div className="flex gap-2">
              <Button 
                variant={approvalDecision === 'approved' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => setApprovalDecision('approved')}
                data-testid="button-decision-approve"
              >
                <Check className="h-4 w-4 mr-2" />
                Approve
              </Button>
              <Button 
                variant={approvalDecision === 'rejected' ? 'destructive' : 'outline'}
                className="flex-1"
                onClick={() => setApprovalDecision('rejected')}
                data-testid="button-decision-reject"
              >
                <X className="h-4 w-4 mr-2" />
                Reject
              </Button>
            </div>
            <div>
              <Label htmlFor="approval-comments">Comments</Label>
              <Textarea
                id="approval-comments"
                value={approvalComments}
                onChange={(e) => setApprovalComments(e.target.value)}
                placeholder="Add any comments about your decision..."
                rows={3}
                data-testid="input-approval-comments"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApprovalDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => selectedApproval && processApprovalMutation.mutate({ 
                approvalId: selectedApproval.id, 
                decision: approvalDecision,
                comments: approvalComments
              })}
              disabled={processApprovalMutation.isPending}
              data-testid="button-submit-approval"
            >
              Submit Decision
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
