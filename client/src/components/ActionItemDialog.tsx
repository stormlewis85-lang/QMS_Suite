import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  CalendarIcon, 
  Loader2, 
  CheckCircle, 
  AlertTriangle,
  Target,
  Shield
} from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface ActionItem {
  id?: number;
  pfmeaRowId: number;
  actionType: string;
  description: string;
  responsiblePerson: string;
  responsibleRole?: string;
  targetDate: string;
  completedDate?: string;
  status: string;
  priority: string;
  completionNotes?: string;
  evidenceDescription?: string;
  evidenceAttachment?: string;
  verifiedBy?: string;
  verifiedDate?: string;
  verificationNotes?: string;
  newSeverity?: number;
  newOccurrence?: number;
  newDetection?: number;
  newAP?: string;
}

interface ActionItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pfmeaRowId: number;
  failureMode: string;
  currentAP: string;
  currentS: number;
  currentO: number;
  currentD: number;
  actionItem?: ActionItem | null;
  onSuccess?: () => void;
}

const ACTION_TYPES = [
  { value: 'prevention', label: 'Prevention Control', description: 'Reduce occurrence' },
  { value: 'detection', label: 'Detection Control', description: 'Improve detection' },
  { value: 'design', label: 'Design Change', description: 'Modify design to eliminate failure' },
  { value: 'process', label: 'Process Change', description: 'Modify process parameters' },
  { value: 'other', label: 'Other', description: 'Other corrective action' },
];

const PRIORITIES = [
  { value: 'critical', label: 'Critical', color: 'bg-red-500' },
  { value: 'high', label: 'High', color: 'bg-orange-500' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-500' },
  { value: 'low', label: 'Low', color: 'bg-green-500' },
];

export function ActionItemDialog({
  open,
  onOpenChange,
  pfmeaRowId,
  failureMode,
  currentAP,
  currentS,
  currentO,
  currentD,
  actionItem,
  onSuccess,
}: ActionItemDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!actionItem?.id;
  
  const [actionType, setActionType] = useState(actionItem?.actionType || 'prevention');
  const [description, setDescription] = useState(actionItem?.description || '');
  const [responsiblePerson, setResponsiblePerson] = useState(actionItem?.responsiblePerson || '');
  const [responsibleRole, setResponsibleRole] = useState(actionItem?.responsibleRole || '');
  const [targetDate, setTargetDate] = useState<Date | undefined>(
    actionItem?.targetDate ? new Date(actionItem.targetDate) : undefined
  );
  const [priority, setPriority] = useState(actionItem?.priority || 'medium');
  
  const [completionNotes, setCompletionNotes] = useState(actionItem?.completionNotes || '');
  const [evidenceDescription, setEvidenceDescription] = useState(actionItem?.evidenceDescription || '');
  const [newSeverity, setNewSeverity] = useState<number | undefined>(actionItem?.newSeverity);
  const [newOccurrence, setNewOccurrence] = useState<number | undefined>(actionItem?.newOccurrence);
  const [newDetection, setNewDetection] = useState<number | undefined>(actionItem?.newDetection);
  
  const [verifiedBy, setVerifiedBy] = useState(actionItem?.verifiedBy || '');
  const [verificationNotes, setVerificationNotes] = useState(actionItem?.verificationNotes || '');
  
  const [activeTab, setActiveTab] = useState('details');
  
  useEffect(() => {
    if (open) {
      setActionType(actionItem?.actionType || 'prevention');
      setDescription(actionItem?.description || '');
      setResponsiblePerson(actionItem?.responsiblePerson || '');
      setResponsibleRole(actionItem?.responsibleRole || '');
      setTargetDate(actionItem?.targetDate ? new Date(actionItem.targetDate) : undefined);
      setPriority(actionItem?.priority || 'medium');
      setCompletionNotes(actionItem?.completionNotes || '');
      setEvidenceDescription(actionItem?.evidenceDescription || '');
      setNewSeverity(actionItem?.newSeverity);
      setNewOccurrence(actionItem?.newOccurrence);
      setNewDetection(actionItem?.newDetection);
      setVerifiedBy(actionItem?.verifiedBy || '');
      setVerificationNotes(actionItem?.verificationNotes || '');
      setActiveTab('details');
    }
  }, [open, actionItem]);
  
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('POST', `/api/pfmea-rows/${pfmeaRowId}/action-items`, data);
    },
    onSuccess: () => {
      toast({ title: 'Action Created', description: 'The action item has been created.' });
      queryClient.invalidateQueries({ queryKey: [`/api/pfmea-rows/${pfmeaRowId}/action-items`] });
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
  
  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('PATCH', `/api/action-items/${actionItem?.id}`, data);
    },
    onSuccess: () => {
      toast({ title: 'Action Updated', description: 'The action item has been updated.' });
      queryClient.invalidateQueries({ queryKey: [`/api/pfmea-rows/${pfmeaRowId}/action-items`] });
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
  
  const completeMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('POST', `/api/action-items/${actionItem?.id}/complete`, data);
    },
    onSuccess: () => {
      toast({ title: 'Action Completed', description: 'The action item has been marked as completed.' });
      queryClient.invalidateQueries({ queryKey: [`/api/pfmea-rows/${pfmeaRowId}/action-items`] });
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
  
  const verifyMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('POST', `/api/action-items/${actionItem?.id}/verify`, data);
    },
    onSuccess: () => {
      toast({ title: 'Action Verified', description: 'The action item has been verified and ratings updated.' });
      queryClient.invalidateQueries({ queryKey: [`/api/pfmea-rows/${pfmeaRowId}/action-items`] });
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
  
  const handleSave = () => {
    const data = {
      actionType,
      description,
      responsiblePerson,
      responsibleRole,
      targetDate: targetDate?.toISOString(),
      priority,
    };
    
    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };
  
  const handleComplete = () => {
    completeMutation.mutate({
      completionNotes,
      evidenceDescription,
      newSeverity,
      newOccurrence,
      newDetection,
    });
  };
  
  const handleVerify = () => {
    verifyMutation.mutate({
      verifiedBy,
      verificationNotes,
    });
  };
  
  const isFormValid = description && responsiblePerson && targetDate;
  const isPending = createMutation.isPending || updateMutation.isPending || completeMutation.isPending || verifyMutation.isPending;
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-gray-100 text-gray-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-yellow-100 text-yellow-800';
      case 'verified': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100';
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            {isEditing ? 'Edit Action Item' : 'New Action Item'}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <span>For failure mode:</span>
            <Badge variant="outline">{failureMode}</Badge>
            <Badge className={currentAP === 'H' ? 'bg-red-500' : currentAP === 'M' ? 'bg-yellow-500' : 'bg-green-500'}>
              AP: {currentAP}
            </Badge>
          </DialogDescription>
        </DialogHeader>
        
        {isEditing && actionItem && (
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm text-muted-foreground">Status:</span>
            <Badge className={getStatusColor(actionItem.status)}>
              {actionItem.status.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>
        )}
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="complete" disabled={!isEditing || actionItem?.status === 'verified' || actionItem?.status === 'cancelled'}>
              Complete
            </TabsTrigger>
            <TabsTrigger value="verify" disabled={!isEditing || actionItem?.status !== 'completed'}>
              Verify
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="details" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Action Type</Label>
                <Select value={actionType} onValueChange={setActionType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTION_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div>
                          <span className="font-medium">{type.label}</span>
                          <span className="text-muted-foreground ml-2 text-xs">({type.description})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${p.color}`} />
                          {p.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Description *</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the recommended action..."
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Responsible Person *</Label>
                <Input
                  value={responsiblePerson}
                  onChange={(e) => setResponsiblePerson(e.target.value)}
                  placeholder="Name"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Role/Department</Label>
                <Input
                  value={responsibleRole}
                  onChange={(e) => setResponsibleRole(e.target.value)}
                  placeholder="e.g., Process Engineer"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Target Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {targetDate ? format(targetDate, 'PPP') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={targetDate}
                    onSelect={setTargetDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Current ratings: S={currentS}, O={currentO}, D={currentD} → AP={currentAP}
              </AlertDescription>
            </Alert>
          </TabsContent>
          
          <TabsContent value="complete" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Completion Notes</Label>
              <Textarea
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                placeholder="Describe what was done..."
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Evidence Description</Label>
              <Textarea
                value={evidenceDescription}
                onChange={(e) => setEvidenceDescription(e.target.value)}
                placeholder="Describe the evidence of completion (test results, validation data, etc.)..."
                rows={2}
              />
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                New Risk Ratings (Optional)
              </Label>
              <p className="text-sm text-muted-foreground">
                If this action reduced the risk, enter the new ratings to update the PFMEA after verification.
              </p>
              
              <div className="grid grid-cols-3 gap-4 mt-2">
                <div className="space-y-1">
                  <Label className="text-xs">New Severity</Label>
                  <Select 
                    value={newSeverity?.toString() || ''} 
                    onValueChange={(v) => setNewSeverity(v ? parseInt(v) : undefined)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={`Current: ${currentS}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {[1,2,3,4,5,6,7,8,9,10].map(n => (
                        <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-1">
                  <Label className="text-xs">New Occurrence</Label>
                  <Select 
                    value={newOccurrence?.toString() || ''} 
                    onValueChange={(v) => setNewOccurrence(v ? parseInt(v) : undefined)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={`Current: ${currentO}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {[1,2,3,4,5,6,7,8,9,10].map(n => (
                        <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-1">
                  <Label className="text-xs">New Detection</Label>
                  <Select 
                    value={newDetection?.toString() || ''} 
                    onValueChange={(v) => setNewDetection(v ? parseInt(v) : undefined)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={`Current: ${currentD}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {[1,2,3,4,5,6,7,8,9,10].map(n => (
                        <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="verify" className="space-y-4 mt-4">
            {actionItem?.status === 'completed' && (
              <>
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Completed on {actionItem.completedDate ? format(new Date(actionItem.completedDate), 'PPP') : 'N/A'}
                    {actionItem.completionNotes && (
                      <div className="mt-2 text-sm">{actionItem.completionNotes}</div>
                    )}
                  </AlertDescription>
                </Alert>
                
                {actionItem.newSeverity && actionItem.newOccurrence && actionItem.newDetection && (
                  <Alert>
                    <AlertDescription>
                      Proposed new ratings: S={actionItem.newSeverity}, O={actionItem.newOccurrence}, D={actionItem.newDetection}
                      <br />
                      <span className="font-medium">Upon verification, PFMEA row will be updated with these ratings.</span>
                    </AlertDescription>
                  </Alert>
                )}
                
                <div className="space-y-2">
                  <Label>Verified By *</Label>
                  <Input
                    value={verifiedBy}
                    onChange={(e) => setVerifiedBy(e.target.value)}
                    placeholder="Verifier name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Verification Notes</Label>
                  <Textarea
                    value={verificationNotes}
                    onChange={(e) => setVerificationNotes(e.target.value)}
                    placeholder="Notes on verification..."
                    rows={3}
                  />
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          
          {activeTab === 'details' && (
            <Button onClick={handleSave} disabled={!isFormValid || isPending}>
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? 'Update' : 'Create'} Action
            </Button>
          )}
          
          {activeTab === 'complete' && (
            <Button onClick={handleComplete} disabled={!completionNotes || isPending}>
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <CheckCircle className="h-4 w-4 mr-2" />
              Mark Complete
            </Button>
          )}
          
          {activeTab === 'verify' && (
            <Button onClick={handleVerify} disabled={!verifiedBy || isPending} className="bg-green-600 hover:bg-green-700">
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Shield className="h-4 w-4 mr-2" />
              Verify & Update PFMEA
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ActionItemDialog;
