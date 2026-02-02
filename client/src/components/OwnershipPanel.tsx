import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  UserPlus, 
  Crown, 
  Mail,
  Building,
  Calendar,
  Edit,
  X
} from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface OwnershipPanelProps {
  entityType: 'pfmea' | 'control_plan';
  entityId: string;
  entityName?: string;
  currentOwner?: string;
  currentTeam?: string;
  createdBy?: string;
  createdAt?: string;
  currentUserId?: string;
  currentUserName?: string;
  currentUserEmail?: string;
  availableUsers?: { id: string; name: string; email?: string }[];
  compact?: boolean;
}

export function OwnershipPanel({ 
  entityType, 
  entityId,
  currentOwner = 'Not Assigned',
  currentTeam = 'Quality Engineering',
  createdBy = 'System',
  createdAt,
  compact = false,
}: OwnershipPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditingOwner, setIsEditingOwner] = useState(false);
  const [newOwner, setNewOwner] = useState(currentOwner);

  const updateOwnerMutation = useMutation({
    mutationFn: async (owner: string) => {
      const endpoint = entityType === 'pfmea' ? 'pfmeas' : 'control-plans';
      return apiRequest('PATCH', `/api/${endpoint}/${entityId}`, { owner });
    },
    onSuccess: () => {
      const endpoint = entityType === 'pfmea' ? 'pfmeas' : 'control-plans';
      queryClient.invalidateQueries({ queryKey: [`/api/${endpoint}`, entityId] });
      toast({ title: 'Owner Updated', description: 'Document ownership has been transferred.' });
      setIsEditingOwner(false);
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update owner', variant: 'destructive' });
    },
  });

  const handleSaveOwner = () => {
    if (newOwner && newOwner !== currentOwner) {
      updateOwnerMutation.mutate(newOwner);
    } else {
      setIsEditingOwner(false);
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
          <Crown className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="font-medium text-sm">{currentOwner}</p>
          <p className="text-xs text-muted-foreground">Document Owner</p>
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Document Ownership
        </CardTitle>
        <CardDescription>
          Manage document ownership and responsibility
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <Label className="text-sm font-medium">Document Owner</Label>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setIsEditingOwner(!isEditingOwner)}
              data-testid="button-edit-owner"
            >
              {isEditingOwner ? <X className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
            </Button>
          </div>
          
          {isEditingOwner ? (
            <div className="flex gap-2">
              <Input
                value={newOwner}
                onChange={(e) => setNewOwner(e.target.value)}
                placeholder="Enter owner name or email"
                data-testid="input-owner"
              />
              <Button 
                onClick={handleSaveOwner} 
                disabled={updateOwnerMutation.isPending}
                data-testid="button-save-owner"
              >
                Save
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Crown className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">{currentOwner}</p>
                <p className="text-sm text-muted-foreground">Primary responsible party</p>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-medium">Responsible Team</Label>
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Building className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="font-medium">{currentTeam}</p>
              <p className="text-sm text-muted-foreground">Department responsibility</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-medium">Document Origin</Label>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <UserPlus className="h-4 w-4" />
                <span className="text-xs">Created By</span>
              </div>
              <p className="font-medium">{createdBy}</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Calendar className="h-4 w-4" />
                <span className="text-xs">Created On</span>
              </div>
              <p className="font-medium">
                {createdAt ? format(new Date(createdAt), 'MMM d, yyyy') : 'Unknown'}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-medium">Notification Subscribers</Label>
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="flex items-center gap-1">
                <Mail className="h-3 w-3" />
                owner@company.com
              </Badge>
              <Badge variant="secondary" className="flex items-center gap-1">
                <Mail className="h-3 w-3" />
                quality@company.com
              </Badge>
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" data-testid="button-add-subscriber">
                <UserPlus className="h-3 w-3 mr-1" />
                Add
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              These users will be notified of changes to this document
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default OwnershipPanel;
