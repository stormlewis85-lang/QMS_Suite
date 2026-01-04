/**
 * FMEA Template Row Editor Page
 * 
 * Demonstrates the hybrid change control approach:
 * - Minor changes (notes) → audit log only
 * - Standard changes (failure mode, effect) → quick confirmation dialog  
 * - Critical changes (S/O/D, controls, CSR) → full wizard with impact analysis
 */

import { useQuery } from '@tanstack/react-query';
import { useParams, useLocation, Link } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Clock, User, GitBranch } from 'lucide-react';
import TemplateEditor from '@/components/TemplateEditor';
import { PageHeader } from '@/components/ui/page-header';

export default function FMEATemplateRowEdit() {
  const { processId, rowId } = useParams<{ processId: string; rowId: string }>();
  const [, setLocation] = useLocation();

  const { data: row, isLoading, error } = useQuery({
    queryKey: ['fmea-template-row', rowId],
    queryFn: async () => {
      const res = await fetch(`/api/fmea-template-rows/${rowId}`);
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
        <span className="text-foreground">Edit FMEA Row</span>
      </div>

      <PageHeader
        title="Edit FMEA Template Row"
        description={`${row.failureMode} • Step: ${row.step?.name || 'N/A'}`}
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
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Owner:</span>
                <span>{row.createdBy || 'System'}</span>
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
              <Badge className={`${
                row.ap === 'H' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                row.ap === 'M' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              }`}>
                AP: {row.ap}
              </Badge>
              {row.csrSymbol && (
                <Badge variant="outline" className="text-lg">
                  {row.csrSymbol}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <TemplateEditor
        entityType="fmea_template_row"
        entityId={rowId!}
        initialData={{
          function: row.function,
          requirement: row.requirement,
          failureMode: row.failureMode,
          effect: row.effect,
          severity: row.severity,
          cause: row.cause,
          occurrence: row.occurrence,
          preventionControls: row.preventionControls || [],
          detectionControls: row.detectionControls || [],
          detection: row.detection,
          ap: row.ap,
          specialFlag: row.specialFlag,
          csrSymbol: row.csrSymbol || '',
          notes: row.notes || '',
        }}
        entityName={row.failureMode}
        onSaveComplete={() => {
          setLocation(`/processes/${processId}`);
        }}
      />
    </div>
  );
}
