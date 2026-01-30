import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { 
  PenTool, 
  Check, 
  Clock, 
  AlertCircle,
  Shield,
  Plus,
  CheckCircle2,
} from 'lucide-react';
import { format } from 'date-fns';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface Signature {
  id: number;
  entityType: string;
  entityId: number;
  role: string;
  signedBy: string;
  signerName?: string;
  signerEmail?: string;
  meaning?: string;
  comment?: string;
  signedAt: string;
  createdAt: string;
}

interface SignaturesPanelProps {
  entityType: 'pfmea' | 'control_plan';
  entityId: number;
  status: string;
  requiredRoles?: string[];
}

const DEFAULT_REQUIRED_ROLES = [
  { role: 'Process Engineer', description: 'Responsible for process design' },
  { role: 'Quality Engineer', description: 'Responsible for quality assurance' },
  { role: 'Production Manager', description: 'Responsible for production' },
  { role: 'Customer Quality', description: 'Customer representative (if required)' },
];

const SIGNATURE_MEANINGS = [
  'Approved',
  'Reviewed',
  'Acknowledged',
  'Concur',
];

export function SignaturesPanel({ 
  entityType, 
  entityId, 
  status,
  requiredRoles = DEFAULT_REQUIRED_ROLES.map(r => r.role)
}: SignaturesPanelProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState('');
  const [signerName, setSignerName] = useState('');
  const [signerEmail, setSignerEmail] = useState('');
  const [meaning, setMeaning] = useState('Approved');
  const [comment, setComment] = useState('');

  const apiPath = entityType === 'pfmea' ? 'pfmeas' : 'control-plans';

  const { data: signatures = [], isLoading } = useQuery<Signature[]>({
    queryKey: [`/api/${apiPath}/${entityId}/signatures`],
  });

  const addSignatureMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('POST', `/api/${apiPath}/${entityId}/signatures`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/${apiPath}/${entityId}/signatures`] });
      queryClient.invalidateQueries({ queryKey: [`/api/${apiPath}/${entityId}`] });
      toast({
        title: 'Signature Added',
        description: 'Electronic signature has been recorded.',
      });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add signature',
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setSelectedRole('');
    setSignerName('');
    setSignerEmail('');
    setMeaning('Approved');
    setComment('');
  };

  const handleAddSignature = () => {
    if (!selectedRole || !signerName) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    addSignatureMutation.mutate({
      role: selectedRole,
      signedBy: signerName,
      signerName: signerName,
      signerEmail: signerEmail || undefined,
      meaning,
      comment: comment || undefined,
    });
  };

  const signedRoles = new Set(signatures.map(s => s.role));
  const pendingRoles = requiredRoles.filter(role => !signedRoles.has(role));
  const allSigned = pendingRoles.length === 0 && requiredRoles.length > 0;

  const canSign = status === 'review';

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Clock className="h-8 w-8 mx-auto mb-2 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Loading signatures...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <PenTool className="h-5 w-5" />
                Electronic Signatures
              </CardTitle>
              <CardDescription>
                IATF 16949 compliant electronic signature workflow
              </CardDescription>
            </div>
            {allSigned ? (
              <Badge className="bg-green-100 text-green-800 border-green-300">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Fully Signed
              </Badge>
            ) : signatures.length > 0 ? (
              <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
                <Clock className="h-3 w-3 mr-1" />
                {signatures.length} of {requiredRoles.length} Signed
              </Badge>
            ) : (
              <Badge variant="outline">
                <AlertCircle className="h-3 w-3 mr-1" />
                Pending Signatures
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {status === 'draft' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 text-yellow-800">
                <AlertCircle className="h-4 w-4" />
                <span className="font-medium">Document is in Draft</span>
              </div>
              <p className="text-sm text-yellow-700 mt-1">
                Change status to "Review" to enable signature collection.
              </p>
            </div>
          )}

          {status === 'effective' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 text-green-800">
                <CheckCircle2 className="h-4 w-4" />
                <span className="font-medium">Document is Effective</span>
              </div>
              <p className="text-sm text-green-700 mt-1">
                All required signatures have been collected. Document is now in effect.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {DEFAULT_REQUIRED_ROLES.map(({ role, description }) => {
              const signature = signatures.find(s => s.role === role);
              const isSigned = !!signature;

              return (
                <div
                  key={role}
                  className={`p-4 rounded-lg border-2 transition-colors ${
                    isSigned 
                      ? 'border-green-300 bg-green-50' 
                      : 'border-dashed border-gray-300 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{role}</span>
                    {isSigned ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Clock className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                  {isSigned ? (
                    <div className="text-xs text-green-700">
                      <p className="font-medium">{signature.signerName || signature.signedBy}</p>
                      <p>{format(new Date(signature.signedAt), 'MMM d, yyyy h:mm a')}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500">{description}</p>
                  )}
                </div>
              );
            })}
          </div>

          {canSign && pendingRoles.length > 0 && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full" data-testid="button-add-signature">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Signature
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <PenTool className="h-5 w-5" />
                    Add Electronic Signature
                  </DialogTitle>
                  <DialogDescription>
                    By signing, you confirm that you have reviewed this document and approve its contents.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="role">Signing As *</Label>
                    <Select value={selectedRole} onValueChange={setSelectedRole}>
                      <SelectTrigger data-testid="select-signature-role">
                        <SelectValue placeholder="Select your role" />
                      </SelectTrigger>
                      <SelectContent>
                        {pendingRoles.map(role => (
                          <SelectItem key={role} value={role}>
                            {role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signerName">Full Name *</Label>
                    <Input
                      id="signerName"
                      data-testid="input-signer-name"
                      value={signerName}
                      onChange={(e) => setSignerName(e.target.value)}
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signerEmail">Email</Label>
                    <Input
                      id="signerEmail"
                      data-testid="input-signer-email"
                      type="email"
                      value={signerEmail}
                      onChange={(e) => setSignerEmail(e.target.value)}
                      placeholder="Enter your email"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="meaning">Signature Meaning</Label>
                    <Select value={meaning} onValueChange={setMeaning}>
                      <SelectTrigger data-testid="select-signature-meaning">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SIGNATURE_MEANINGS.map(m => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="comment">Comment (Optional)</Label>
                    <Textarea
                      id="comment"
                      data-testid="input-signature-comment"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Add any comments..."
                      rows={2}
                    />
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs text-blue-800">
                    <Shield className="h-4 w-4 inline mr-1" />
                    By clicking "Sign Document", you agree that your electronic signature is legally binding 
                    and equivalent to a handwritten signature per 21 CFR Part 11 and IATF 16949 requirements.
                  </div>
                </div>

                <DialogFooter className="gap-2">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleAddSignature}
                    disabled={addSignatureMutation.isPending || !selectedRole || !signerName}
                    data-testid="button-sign-document"
                  >
                    {addSignatureMutation.isPending ? (
                      <>
                        <Clock className="h-4 w-4 mr-2 animate-spin" />
                        Signing...
                      </>
                    ) : (
                      <>
                        <PenTool className="h-4 w-4 mr-2" />
                        Sign Document
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </CardContent>
      </Card>

      {signatures.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Signature History</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role</TableHead>
                  <TableHead>Signed By</TableHead>
                  <TableHead>Meaning</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Comment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {signatures.map((sig) => (
                  <TableRow key={sig.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span className="font-medium">{sig.role}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{sig.signerName || sig.signedBy}</p>
                        {sig.signerEmail && (
                          <p className="text-xs text-muted-foreground">{sig.signerEmail}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{sig.meaning || 'Approved'}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{format(new Date(sig.signedAt), 'MMM d, yyyy')}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(sig.signedAt), 'h:mm:ss a')}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <p className="text-sm truncate">{sig.comment || '—'}</p>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default SignaturesPanel;
