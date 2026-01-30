import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, FileSpreadsheet, Download, Clock } from 'lucide-react';

interface ExportHistoryCardProps {
  documentType: 'pfmea' | 'control_plan';
  documentId: string;
}

interface AuditEntry {
  id: string;
  action: string;
  actor: string;
  at: string;
  payloadJson: {
    format?: string;
    filename?: string;
    rowCount?: number;
    exportedAt?: string;
  };
}

export function ExportHistoryCard({ documentType, documentId }: ExportHistoryCardProps) {
  const { data: auditLog } = useQuery<AuditEntry[]>({
    queryKey: ['/api/documents', documentType, documentId, 'audit-log'],
    queryFn: async () => {
      const res = await fetch(`/api/documents/${documentType}/${documentId}/audit-log`);
      if (!res.ok) return [];
      return res.json();
    },
  });
  
  const exports = auditLog?.filter((entry) => entry.action === 'exported') || [];
  
  if (exports.length === 0) return null;
  
  return (
    <Card data-testid="export-history-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Download className="h-4 w-4" />
          Export History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {exports.slice(0, 5).map((entry) => (
            <div key={entry.id} className="flex items-center justify-between text-sm" data-testid={`export-entry-${entry.id}`}>
              <div className="flex items-center gap-2">
                {entry.payloadJson?.format === 'pdf' ? (
                  <FileText className="h-4 w-4 text-red-500" />
                ) : (
                  <FileSpreadsheet className="h-4 w-4 text-green-600" />
                )}
                <span className="text-muted-foreground">
                  {entry.payloadJson?.format?.toUpperCase() || 'Unknown'}
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {new Date(entry.at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default ExportHistoryCard;
