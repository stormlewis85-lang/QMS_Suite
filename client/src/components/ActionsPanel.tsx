import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Target, 
  Plus, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  MoreVertical,
  User,
  Calendar,
  Shield,
  Play,
  Trash2,
  Eye
} from 'lucide-react';
import { format, formatDistanceToNow, isPast } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import ActionItemDialog from './ActionItemDialog';
import { apiRequest } from '@/lib/queryClient';

interface ActionsPanelProps {
  pfmeaId: string;
  pfmeaRows: any[];
  isReadOnly?: boolean;
}

interface ActionItemSummary {
  total: number;
  byStatus: {
    open?: number;
    in_progress?: number;
    completed?: number;
    verified?: number;
    cancelled?: number;
  };
  byPriority: {
    critical?: number;
    high?: number;
    medium?: number;
    low?: number;
  };
  overdue: number;
  dueThisWeek: number;
}

interface ActionItemType {
  id: number;
  pfmeaRowId: number;
  status: string;
  priority: string;
  description: string;
  responsiblePerson: string;
  targetDate: string;
  newAP?: string;
}

const STATUS_CONFIG = {
  open: { label: 'Open', icon: Clock, color: 'bg-gray-100 text-gray-800', iconColor: 'text-gray-500' },
  in_progress: { label: 'In Progress', icon: Play, color: 'bg-blue-100 text-blue-800', iconColor: 'text-blue-500' },
  completed: { label: 'Completed', icon: CheckCircle, color: 'bg-yellow-100 text-yellow-800', iconColor: 'text-yellow-500' },
  verified: { label: 'Verified', icon: Shield, color: 'bg-green-100 text-green-800', iconColor: 'text-green-500' },
  cancelled: { label: 'Cancelled', icon: XCircle, color: 'bg-red-100 text-red-800', iconColor: 'text-red-500' },
};

const PRIORITY_CONFIG = {
  critical: { label: 'Critical', color: 'bg-red-500' },
  high: { label: 'High', color: 'bg-orange-500' },
  medium: { label: 'Medium', color: 'bg-yellow-500' },
  low: { label: 'Low', color: 'bg-green-500' },
};

export function ActionsPanel({ pfmeaId, pfmeaRows, isReadOnly }: ActionsPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<any>(null);
  const [selectedAction, setSelectedAction] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('all');
  
  const { data: summary } = useQuery<ActionItemSummary>({
    queryKey: [`/api/pfmeas/${pfmeaId}/action-items/summary`],
  });
  
  const { data: actionItems, isLoading } = useQuery<ActionItemType[]>({
    queryKey: [`/api/pfmeas/${pfmeaId}/action-items`],
  });
  
  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return apiRequest('PATCH', `/api/action-items/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/pfmeas/${pfmeaId}/action-items`] });
      queryClient.invalidateQueries({ queryKey: [`/api/pfmeas/${pfmeaId}/action-items/summary`] });
      toast({ title: 'Status Updated' });
    },
  });
  
  const cancelMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('POST', `/api/action-items/${id}/cancel`, { reason: 'Cancelled by user' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/pfmeas/${pfmeaId}/action-items`] });
      queryClient.invalidateQueries({ queryKey: [`/api/pfmeas/${pfmeaId}/action-items/summary`] });
      toast({ title: 'Action Cancelled' });
    },
  });
  
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/action-items/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/pfmeas/${pfmeaId}/action-items`] });
      queryClient.invalidateQueries({ queryKey: [`/api/pfmeas/${pfmeaId}/action-items/summary`] });
      toast({ title: 'Action Deleted' });
    },
  });
  
  const openNewActionDialog = (row: any) => {
    setSelectedRow(row);
    setSelectedAction(null);
    setDialogOpen(true);
  };
  
  const openEditActionDialog = (action: any, row: any) => {
    setSelectedRow(row);
    setSelectedAction(action);
    setDialogOpen(true);
  };
  
  const getRowForAction = (action: any) => {
    return pfmeaRows.find(r => r.id === action.pfmeaRowId);
  };
  
  const filteredActions = actionItems?.filter((action: any) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'open') return ['open', 'in_progress'].includes(action.status);
    if (activeTab === 'overdue') {
      return ['open', 'in_progress'].includes(action.status) && isPast(new Date(action.targetDate));
    }
    if (activeTab === 'completed') return ['completed', 'verified'].includes(action.status);
    return true;
  }) || [];
  
  const completionRate = summary && summary.total > 0 
    ? Math.round(((summary.byStatus.completed || 0) + (summary.byStatus.verified || 0)) / summary.total * 100)
    : 0;
  
  const highAPRowsWithoutActions = pfmeaRows.filter(row => {
    if (row.ap !== 'H') return false;
    const hasAction = actionItems?.some((a: any) => a.pfmeaRowId === row.id);
    return !hasAction;
  });
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="h-5 w-5" />
              Action Items
            </CardTitle>
            <CardDescription>
              {summary?.total || 0} actions • {summary?.overdue || 0} overdue
            </CardDescription>
          </div>
        </div>
        
        {summary && summary.total > 0 && (
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Completion</span>
              <span className="font-medium">{completionRate}%</span>
            </div>
            <Progress value={completionRate} className="h-2" />
            
            <div className="flex gap-2 flex-wrap mt-2">
              <Badge variant="outline" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                {summary.byStatus.open || 0} Open
              </Badge>
              <Badge variant="outline" className="text-xs bg-blue-50">
                <Play className="h-3 w-3 mr-1" />
                {summary.byStatus.in_progress || 0} In Progress
              </Badge>
              <Badge variant="outline" className="text-xs bg-green-50">
                <CheckCircle className="h-3 w-3 mr-1" />
                {(summary.byStatus.completed || 0) + (summary.byStatus.verified || 0)} Done
              </Badge>
              {summary.overdue > 0 && (
                <Badge variant="destructive" className="text-xs">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {summary.overdue} Overdue
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="pt-0">
        {highAPRowsWithoutActions.length > 0 && !isReadOnly && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {highAPRowsWithoutActions.length} High AP failure mode(s) have no action items assigned.
              <div className="mt-2 space-y-1">
                {highAPRowsWithoutActions.slice(0, 3).map(row => (
                  <div key={row.id} className="flex items-center justify-between">
                    <span className="text-sm truncate max-w-[200px]">{row.failureMode}</span>
                    <Button size="sm" variant="outline" onClick={() => openNewActionDialog(row)}>
                      <Plus className="h-3 w-3 mr-1" />
                      Add
                    </Button>
                  </div>
                ))}
                {highAPRowsWithoutActions.length > 3 && (
                  <span className="text-xs">+{highAPRowsWithoutActions.length - 3} more</span>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 mb-3">
            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
            <TabsTrigger value="open" className="text-xs">Open</TabsTrigger>
            <TabsTrigger value="overdue" className="text-xs">
              Overdue
              {summary && summary.overdue > 0 && (
                <Badge variant="destructive" className="ml-1 h-4 w-4 p-0 text-[10px]">
                  {summary.overdue}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="completed" className="text-xs">Done</TabsTrigger>
          </TabsList>
          
          <ScrollArea className="h-[400px]">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : filteredActions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Target className="h-8 w-8 mx-auto mb-2 opacity-20" />
                <p>No action items</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredActions.map((action: any) => {
                  const row = getRowForAction(action);
                  const statusConfig = STATUS_CONFIG[action.status as keyof typeof STATUS_CONFIG];
                  const priorityConfig = PRIORITY_CONFIG[action.priority as keyof typeof PRIORITY_CONFIG];
                  const isOverdue = ['open', 'in_progress'].includes(action.status) && isPast(new Date(action.targetDate));
                  const StatusIcon = statusConfig?.icon || Clock;
                  
                  return (
                    <div 
                      key={action.id} 
                      className={`p-3 border rounded-lg space-y-2 ${isOverdue ? 'border-red-300 bg-red-50' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <div className={`w-2 h-2 rounded-full ${priorityConfig?.color || 'bg-gray-400'}`} />
                            <Badge variant="outline" className={statusConfig?.color}>
                              <StatusIcon className={`h-3 w-3 mr-1 ${statusConfig?.iconColor}`} />
                              {statusConfig?.label}
                            </Badge>
                            {isOverdue && (
                              <Badge variant="destructive" className="text-[10px]">OVERDUE</Badge>
                            )}
                          </div>
                          
                          <p className="text-sm font-medium line-clamp-2">{action.description}</p>
                          
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            FM: {row?.failureMode || 'Unknown'}
                          </p>
                        </div>
                        
                        {!isReadOnly && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditActionDialog(action, row)}>
                                <Eye className="h-4 w-4 mr-2" />
                                View / Edit
                              </DropdownMenuItem>
                              
                              {action.status === 'open' && (
                                <DropdownMenuItem onClick={() => statusMutation.mutate({ id: action.id, status: 'in_progress' })}>
                                  <Play className="h-4 w-4 mr-2" />
                                  Start Progress
                                </DropdownMenuItem>
                              )}
                              
                              {['open', 'in_progress'].includes(action.status) && (
                                <DropdownMenuItem onClick={() => cancelMutation.mutate(action.id)}>
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Cancel
                                </DropdownMenuItem>
                              )}
                              
                              {action.status === 'cancelled' && (
                                <DropdownMenuItem 
                                  onClick={() => deleteMutation.mutate(action.id)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {action.responsiblePerson}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(action.targetDate), 'MMM d, yyyy')}
                          {isOverdue && (
                            <span className="text-red-600 font-medium ml-1">
                              ({formatDistanceToNow(new Date(action.targetDate), { addSuffix: true })})
                            </span>
                          )}
                        </span>
                      </div>
                      
                      {action.status === 'verified' && action.newAP && (
                        <div className="flex items-center gap-2 text-xs bg-green-100 p-2 rounded">
                          <Shield className="h-3 w-3 text-green-600" />
                          <span>Risk reduced: AP {row?.ap || '?'} → {action.newAP}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </Tabs>
        
        {!isReadOnly && pfmeaRows.filter(r => r.ap === 'H' || r.ap === 'M').length > 0 && (
          <>
            <Separator className="my-4" />
            <div className="space-y-2">
              <Label className="text-sm font-medium">Quick Add Action</Label>
              <Select onValueChange={(rowId) => {
                const row = pfmeaRows.find(r => r.id === parseInt(rowId));
                if (row) openNewActionDialog(row);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select failure mode..." />
                </SelectTrigger>
                <SelectContent>
                  {pfmeaRows
                    .filter(r => r.ap === 'H' || r.ap === 'M')
                    .map(row => (
                      <SelectItem key={row.id} value={row.id.toString()}>
                        <div className="flex items-center gap-2">
                          <Badge className={row.ap === 'H' ? 'bg-red-500' : 'bg-yellow-500'} variant="default">
                            {row.ap}
                          </Badge>
                          <span className="truncate max-w-[200px]">{row.failureMode}</span>
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}
      </CardContent>
      
      {selectedRow && (
        <ActionItemDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          pfmeaRowId={selectedRow.id}
          failureMode={selectedRow.failureMode}
          currentAP={selectedRow.ap}
          currentS={selectedRow.severity}
          currentO={selectedRow.occurrence}
          currentD={selectedRow.detection}
          actionItem={selectedAction}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: [`/api/pfmeas/${pfmeaId}/action-items`] });
            queryClient.invalidateQueries({ queryKey: [`/api/pfmeas/${pfmeaId}/action-items/summary`] });
          }}
        />
      )}
    </Card>
  );
}

export default ActionsPanel;
