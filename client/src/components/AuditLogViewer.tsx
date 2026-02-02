import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  History, 
  Plus, 
  Pencil, 
  Trash2, 
  Eye,
  FileSignature,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  User,
  Clock
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface AuditLogEntry {
  id: number;
  entityType: string;
  entityId: number;
  action: string;
  actorName?: string;
  previousValue?: string;
  newValue?: string;
  changeNote?: string;
  ipAddress?: string;
  createdAt: string;
}

interface AuditLogViewerProps {
  entityType: string;
  entityId: string | number;
  limit?: number;
  title?: string;
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  create: <Plus className="h-4 w-4 text-green-600" />,
  update: <Pencil className="h-4 w-4 text-blue-600" />,
  delete: <Trash2 className="h-4 w-4 text-red-600" />,
  view: <Eye className="h-4 w-4 text-gray-600" />,
  sign: <FileSignature className="h-4 w-4 text-purple-600" />,
  status_change: <RefreshCw className="h-4 w-4 text-orange-600" />,
  approve: <CheckCircle className="h-4 w-4 text-green-600" />,
  reject: <AlertCircle className="h-4 w-4 text-red-600" />,
};

const ACTION_LABELS: Record<string, string> = {
  create: 'Created',
  update: 'Updated',
  delete: 'Deleted',
  view: 'Viewed',
  sign: 'Signed',
  status_change: 'Status Changed',
  approve: 'Approved',
  reject: 'Rejected',
  add_row: 'Added Row',
  delete_row: 'Deleted Row',
  add_signature: 'Added Signature',
  create_revision: 'Created Revision',
};

export function AuditLogViewer({ entityType, entityId, limit = 50, title }: AuditLogViewerProps) {
  const { data: entries = [], isLoading } = useQuery<AuditLogEntry[]>({
    queryKey: [`/api/audit-log`, { entityType, entityId, limit }],
    queryFn: async () => {
      const response = await fetch(`/api/audit-log?entityType=${entityType}&entityId=${entityId}&limit=${limit}`);
      if (!response.ok) return [];
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Clock className="h-8 w-8 mx-auto mb-2 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Loading history...</p>
        </CardContent>
      </Card>
    );
  }

  if (entries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            {title || 'Change History'}
          </CardTitle>
          <CardDescription>
            Complete audit trail for this document
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-2 opacity-20" />
            <p>No history recorded yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          {title || 'Change History'}
        </CardTitle>
        <CardDescription>
          Complete audit trail for this document ({entries.length} entries)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
            
            <div className="space-y-4">
              {entries.map((entry) => (
                <div key={entry.id} className="relative pl-10">
                  <div className="absolute left-2 top-1 w-5 h-5 rounded-full bg-background border-2 border-border flex items-center justify-center">
                    {ACTION_ICONS[entry.action] || <Pencil className="h-3 w-3 text-gray-400" />}
                  </div>
                  
                  <div className="bg-muted/30 rounded-lg p-3 border">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs">
                            {ACTION_LABELS[entry.action] || entry.action}
                          </Badge>
                          {entry.actorName && (
                            <span className="text-sm text-muted-foreground flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {entry.actorName}
                            </span>
                          )}
                        </div>
                        
                        {entry.changeNote && (
                          <p className="text-sm mt-1">{entry.changeNote}</p>
                        )}
                        
                        {entry.previousValue && entry.newValue && (
                          <div className="mt-2 text-xs">
                            <span className="text-red-600 line-through">{entry.previousValue}</span>
                            <span className="mx-2">→</span>
                            <span className="text-green-600">{entry.newValue}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="text-right text-xs text-muted-foreground whitespace-nowrap">
                        <div>{format(new Date(entry.createdAt), 'MMM d, yyyy')}</div>
                        <div>{format(new Date(entry.createdAt), 'h:mm a')}</div>
                        <div className="text-[10px] mt-1">
                          {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export default AuditLogViewer;
