/**
 * Control Plan Template Row Editor Page
 */

import { useQuery } from '@tanstack/react-query';
import { useParams, useLocation, Link } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Clock, GitBranch, Link as LinkIcon } from 'lucide-react';
import TemplateEditor from '@/components/TemplateEditor';
import { PageHeader } from '@/components/ui/page-header';

export default function ControlTemplateRowEdit() {
  const { processId, rowId } = useParams<{ processId: string; rowId: string }>();
  const [, setLocation] = useLocation();

  const { data: row, isLoading, error } = useQuery({
    queryKey: ['control-template-row', rowId],
    queryFn: async () => {
      const res = await fetch(`/api/control-template-rows/${rowId}`);
      if (!res.ok) throw new Error('Failed to fetch template row');
      return res.json();
    },
  });

  const { data: process } = useQuery({
    queryKey: ['process', processId],
    queryFn: async () => {
      const res = await fetch(`/api/processes/${processId}`);
      if (!res.ok) throw new Error('Failed to fetch process');
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[600px]" />
      </div>
    );
  }

  if (error || !row) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Failed to load template row</p>
            <Button variant="outline" className="mt-4" onClick={() => setLocation(`/processes/${processId}`)}>
              Back to Process
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/processes">
          <span className="hover:text-foreground cursor-pointer">Process Library</span>
        </Link>
        <span>/</span>
        <Link href={`/processes/${processId}`}>
          <span className="hover:text-foreground cursor-pointer">{process?.name || 'Process'}</span>
        </Link>
        <span>/</span>
        <span className="text-foreground">Edit Control Plan Row</span>
      </div>

      <PageHeader
        title="Edit Control Plan Template Row"
        description={`${row.characteristicName} • ${row.charId}`}
        actions={
          <Button variant="outline" onClick={() => setLocation(`/processes/${processId}`)} data-testid="button-back-process">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Process
          </Button>
        }
      />

      <Card>
        <CardContent className="py-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <LinkIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Linked FMEA:</span>
                <span className="font-mono text-xs">{row.sourceFmeaRowId ? 'Yes' : 'Standalone'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Modified:</span>
                <span>{row.updatedAt ? new Date(row.updatedAt).toLocaleDateString() : 'Never'}</span>
              </div>
              <div className="flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Used by:</span>
                <span>{row.usageCount || 0} parts</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{row.type}</Badge>
              {row.csrSymbol && (
                <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 text-lg">
                  {row.csrSymbol}
                </Badge>
              )}
              {row.specialFlag && !row.csrSymbol && (
                <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                  Special
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <TemplateEditor
        entityType="control_template_row"
        entityId={rowId!}
        initialData={{
          characteristicName: row.characteristicName,
          charId: row.charId,
          type: row.type,
          target: row.target || '',
          tolerance: row.tolerance || '',
          specialFlag: row.specialFlag,
          csrSymbol: row.csrSymbol || '',
          measurementSystem: row.measurementSystem || '',
          gageDetails: row.gageDetails || '',
          defaultSampleSize: row.defaultSampleSize || '',
          defaultFrequency: row.defaultFrequency || '',
          controlMethod: row.controlMethod || '',
          acceptanceCriteria: row.acceptanceCriteria || '',
          reactionPlan: row.reactionPlan || '',
        }}
        entityName={row.characteristicName}
        onSaveComplete={() => {
          setLocation(`/processes/${processId}`);
        }}
      />
    </div>
  );
}
