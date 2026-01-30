import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Send,
  CheckCircle,
  XCircle,
  Clock,
  Edit,
  History,
  Users,
  Shield,
  AlertTriangle,
  Loader2,
  PenTool,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DocumentControlPanelProps {
  documentType: 'pfmea' | 'control_plan';
  documentId: string;
  currentStatus: string;
  currentRev: string;
  docNo?: string | null;
  onStatusChange?: () => void;
}

interface Signature {
  id: string;
  role: string;
  signerUserId: string;
  signedAt: string;
  contentHash: string;
}

interface AuditEntry {
  id: string;
  action: string;
  actor: string;
  at: string;
  payloadJson: any;
}

export function DocumentControlPanel({
  documentType,
  documentId,
  currentStatus,
  currentRev,
  docNo,
  onStatusChange,
}: DocumentControlPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [signDialogOpen, setSignDialogOpen] = useState(false);
  const [reviseDialogOpen, setReviseDialogOpen] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  
  const [signatureRole, setSignatureRole] = useState('');
  const [revisionReason, setRevisionReason] = useState('');
  const [approvalComment, setApprovalComment] = useState('');
  
  const { data: signatures, refetch: refetchSignatures } = useQuery<Signature[]>({
    queryKey: ['/api/documents', documentType, documentId, 'signatures'],
    queryFn: async () => {
      const res = await fetch(`/api/documents/${documentType}/${documentId}/signatures`);
      if (!res.ok) throw new Error('Failed to fetch signatures');
      return res.json();
    },
  });
  
  const { data: auditLog } = useQuery<AuditEntry[]>({
    queryKey: ['/api/documents', documentType, documentId, 'audit-log'],
    queryFn: async () => {
      const res = await fetch(`/api/documents/${documentType}/${documentId}/audit-log`);
      if (!res.ok) throw new Error('Failed to fetch audit log');
      return res.json();
    },
  });
  
  const { data: revisions } = useQuery<any[]>({
    queryKey: ['/api/documents', documentType, documentId, 'revisions'],
    queryFn: async () => {
      const res = await fetch(`/api/documents/${documentType}/${documentId}/revisions`);
      if (!res.ok) throw new Error('Failed to fetch revisions');
      return res.json();
    },
  });
  
  const submitForReviewMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/documents/${documentType}/${documentId}/submit-for-review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Submitted for Review", description: "Document has been submitted for approval." });
      setSubmitDialogOpen(false);
      onStatusChange?.();
      queryClient.invalidateQueries({ queryKey: ['/api/documents', documentType, documentId] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
  
  const addSignatureMutation = useMutation({
    mutationFn: async (role: string) => {
      const response = await fetch(`/api/documents/${documentType}/${documentId}/signatures`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, signerName: 'Current User' }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Signature Added", description: "Your signature has been recorded." });
      setSignDialogOpen(false);
      setSignatureRole('');
      refetchSignatures();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
  
  const approveMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/documents/${documentType}/${documentId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: approvalComment }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Document Approved", description: "Document is now effective." });
      setApproveDialogOpen(false);
      setApprovalComment('');
      onStatusChange?.();
      queryClient.invalidateQueries({ queryKey: ['/api/documents', documentType, documentId] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
  
  const reviseMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/documents/${documentType}/${documentId}/revise`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: revisionReason }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({ title: "Revision Created", description: `New revision ${data.rev} created as draft.` });
      setReviseDialogOpen(false);
      setRevisionReason('');
      window.location.href = `/${documentType === 'pfmea' ? 'pfmea' : 'control-plans'}/${data.id}`;
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="outline" className="bg-gray-50 dark:bg-gray-800"><Edit className="h-3 w-3 mr-1" />Draft</Badge>;
      case 'review':
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"><Clock className="h-3 w-3 mr-1" />In Review</Badge>;
      case 'effective':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"><CheckCircle className="h-3 w-3 mr-1" />Effective</Badge>;
      case 'superseded':
        return <Badge variant="secondary"><History className="h-3 w-3 mr-1" />Superseded</Badge>;
      case 'obsolete':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Obsolete</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };
  
  const requiredRoles = ['process_owner', 'quality_engineer'];
  const signedRoles = (signatures || []).map((s: Signature) => s.role);
  const missingRoles = requiredRoles.filter(r => !signedRoles.includes(r));
  const canApprove = missingRoles.length === 0 && currentStatus === 'review';
  
  const formatAction = (action: string) => {
    const actionLabels: Record<string, string> = {
      'doc_number_assigned': 'Document Number Assigned',
      'status_changed': 'Status Changed',
      'signature_added': 'Signature Added',
      'revision_created': 'Revision Created',
      'owner_changed': 'Owner Changed',
    };
    return actionLabels[action] || action;
  };
  
  return (
    <Card data-testid="document-control-panel">
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Document Control
            </CardTitle>
            <CardDescription>
              {documentType === 'pfmea' ? 'PFMEA' : 'Control Plan'} • Rev {currentRev}
            </CardDescription>
          </div>
          {getStatusBadge(currentStatus)}
        </div>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="status" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="status" data-testid="tab-status">Status</TabsTrigger>
            <TabsTrigger value="signatures" data-testid="tab-signatures">Signatures</TabsTrigger>
            <TabsTrigger value="history" data-testid="tab-history">History</TabsTrigger>
          </TabsList>
          
          <TabsContent value="status" className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Document No:</span>
                <p className="font-medium">{docNo || 'Not assigned'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Revision:</span>
                <p className="font-medium">{currentRev}</p>
              </div>
            </div>
            
            <Separator />
            
            {currentStatus === 'draft' && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Document is in draft. Submit for review when ready.
                </p>
                <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full" data-testid="button-submit-for-review">
                      <Send className="h-4 w-4 mr-2" />
                      Submit for Review
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Submit for Review</DialogTitle>
                      <DialogDescription>
                        This will assign a document number and route the document for approval signatures.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Required Signatures</AlertTitle>
                        <AlertDescription>
                          The following roles must sign before approval:
                          <ul className="list-disc list-inside mt-2">
                            <li>Process Owner</li>
                            <li>Quality Engineer</li>
                          </ul>
                        </AlertDescription>
                      </Alert>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setSubmitDialogOpen(false)}>Cancel</Button>
                      <Button 
                        onClick={() => submitForReviewMutation.mutate()}
                        disabled={submitForReviewMutation.isPending}
                        data-testid="button-confirm-submit"
                      >
                        {submitForReviewMutation.isPending ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4 mr-2" />
                        )}
                        Submit
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            )}
            
            {currentStatus === 'review' && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Document is in review. Collect required signatures to approve.
                </p>
                
                {missingRoles.length > 0 && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Missing Signatures</AlertTitle>
                    <AlertDescription>
                      Required: {missingRoles.map(r => r.replace('_', ' ')).join(', ')}
                    </AlertDescription>
                  </Alert>
                )}
                
                <div className="flex gap-2">
                  <Dialog open={signDialogOpen} onOpenChange={setSignDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="flex-1" data-testid="button-add-signature">
                        <PenTool className="h-4 w-4 mr-2" />
                        Add Signature
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Signature</DialogTitle>
                        <DialogDescription>
                          Select your role and sign the document.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="py-4 space-y-4">
                        <div className="space-y-2">
                          <Label>Role</Label>
                          <Select value={signatureRole} onValueChange={setSignatureRole}>
                            <SelectTrigger data-testid="select-signature-role">
                              <SelectValue placeholder="Select role..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="process_owner" disabled={signedRoles.includes('process_owner')}>
                                Process Owner {signedRoles.includes('process_owner') && '(Signed)'}
                              </SelectItem>
                              <SelectItem value="quality_engineer" disabled={signedRoles.includes('quality_engineer')}>
                                Quality Engineer {signedRoles.includes('quality_engineer') && '(Signed)'}
                              </SelectItem>
                              <SelectItem value="quality_manager">Quality Manager</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Alert>
                          <Shield className="h-4 w-4" />
                          <AlertDescription>
                            Your signature will be recorded with a hash of the document content for integrity verification.
                          </AlertDescription>
                        </Alert>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setSignDialogOpen(false)}>Cancel</Button>
                        <Button 
                          onClick={() => addSignatureMutation.mutate(signatureRole)}
                          disabled={!signatureRole || addSignatureMutation.isPending}
                          data-testid="button-confirm-sign"
                        >
                          {addSignatureMutation.isPending ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <PenTool className="h-4 w-4 mr-2" />
                          )}
                          Sign Document
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  
                  <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="flex-1" disabled={!canApprove} data-testid="button-approve">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Approve Document</DialogTitle>
                        <DialogDescription>
                          Make this document effective.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="py-4 space-y-4">
                        <div className="space-y-2">
                          <Label>Approval Comment (Optional)</Label>
                          <Textarea 
                            value={approvalComment}
                            onChange={(e) => setApprovalComment(e.target.value)}
                            placeholder="Add any notes..."
                            data-testid="input-approval-comment"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>Cancel</Button>
                        <Button 
                          onClick={() => approveMutation.mutate()}
                          disabled={approveMutation.isPending}
                          data-testid="button-confirm-approve"
                        >
                          {approveMutation.isPending ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <CheckCircle className="h-4 w-4 mr-2" />
                          )}
                          Approve & Make Effective
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            )}
            
            {currentStatus === 'effective' && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">Document is Effective</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  This is the current active version. Create a revision to make changes.
                </p>
                
                <Dialog open={reviseDialogOpen} onOpenChange={setReviseDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full" data-testid="button-create-revision">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Create New Revision
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Revision</DialogTitle>
                      <DialogDescription>
                        Create a new draft revision based on this document.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                      <div className="space-y-2">
                        <Label>Reason for Revision *</Label>
                        <Textarea 
                          value={revisionReason}
                          onChange={(e) => setRevisionReason(e.target.value)}
                          placeholder="Describe why a new revision is needed..."
                          rows={3}
                          data-testid="input-revision-reason"
                        />
                      </div>
                      <Alert>
                        <History className="h-4 w-4" />
                        <AlertDescription>
                          The new revision will copy all current content and start as a draft. 
                          This document will be marked as superseded when the new revision becomes effective.
                        </AlertDescription>
                      </Alert>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setReviseDialogOpen(false)}>Cancel</Button>
                      <Button 
                        onClick={() => reviseMutation.mutate()}
                        disabled={!revisionReason || reviseMutation.isPending}
                        data-testid="button-confirm-revision"
                      >
                        {reviseMutation.isPending ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4 mr-2" />
                        )}
                        Create Revision
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            )}
            
            {currentStatus === 'superseded' && (
              <Alert>
                <History className="h-4 w-4" />
                <AlertTitle>Superseded</AlertTitle>
                <AlertDescription>
                  This document has been superseded by a newer revision.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>
          
          <TabsContent value="signatures" className="space-y-4">
            {signatures && signatures.length > 0 ? (
              <div className="space-y-3">
                {signatures.map((sig: Signature) => (
                  <div key={sig.id} className="flex items-center justify-between gap-2 p-3 border rounded-lg flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                        <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="font-medium capitalize">{sig.role.replace('_', ' ')}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(sig.signedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="font-mono text-xs">
                      {sig.contentHash.slice(0, 8)}...
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <PenTool className="h-8 w-8 mx-auto mb-2 opacity-20" />
                <p>No signatures yet</p>
              </div>
            )}
            
            {currentStatus === 'review' && missingRoles.length > 0 && (
              <Alert>
                <Users className="h-4 w-4" />
                <AlertTitle>Awaiting Signatures</AlertTitle>
                <AlertDescription>
                  {missingRoles.map(r => r.replace('_', ' ')).join(', ')}
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>
          
          <TabsContent value="history">
            <ScrollArea className="h-64">
              {auditLog && auditLog.length > 0 ? (
                <div className="space-y-3">
                  {auditLog.map((entry: AuditEntry) => (
                    <div key={entry.id} className="flex items-start gap-3 p-2 hover:bg-muted/50 rounded">
                      <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{formatAction(entry.action)}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(entry.at).toLocaleString()} • {entry.actor}
                        </p>
                        {entry.payloadJson && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {entry.payloadJson.from && entry.payloadJson.to && (
                              <span>{entry.payloadJson.from} → {entry.payloadJson.to}</span>
                            )}
                            {entry.payloadJson.docNo && (
                              <span>Doc: {entry.payloadJson.docNo}</span>
                            )}
                            {entry.payloadJson.role && (
                              <span>Role: {entry.payloadJson.role}</span>
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <History className="h-8 w-8 mx-auto mb-2 opacity-20" />
                  <p>No history yet</p>
                </div>
              )}
            </ScrollArea>
            
            {revisions && revisions.length > 1 && (
              <>
                <Separator className="my-4" />
                <div className="space-y-2">
                  <p className="text-sm font-medium">Revision History</p>
                  {revisions.map((rev: any) => (
                    <div 
                      key={rev.id} 
                      className={`flex items-center justify-between gap-2 p-2 rounded cursor-pointer ${
                        rev.id === documentId ? 'bg-primary/10' : 'hover:bg-muted/50'
                      }`}
                      onClick={() => {
                        if (rev.id !== documentId) {
                          window.location.href = `/${documentType === 'pfmea' ? 'pfmea' : 'control-plans'}/${rev.id}`;
                        }
                      }}
                      data-testid={`revision-${rev.rev}`}
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant={rev.status === 'effective' ? 'default' : 'outline'}>
                          Rev {rev.rev}
                        </Badge>
                        <span className="text-sm text-muted-foreground">{rev.status}</span>
                      </div>
                      {rev.id !== documentId && (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                      {rev.id === documentId && (
                        <Badge variant="secondary" className="text-xs">Current</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default DocumentControlPanel;
