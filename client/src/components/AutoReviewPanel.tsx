import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  XCircle, 
  Play, 
  Clock,
  ChevronDown,
  ChevronRight,
  CheckCheck,
  AlertCircle,
  FileWarning,
  RefreshCw,
  Loader2,
  Shield
} from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
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
import { apiRequest } from "@/lib/queryClient";

interface AutoReviewPanelProps {
  pfmeaId?: string;
  controlPlanId?: string;
  documentType?: "pfmea" | "control-plan" | "part";
  documentId?: string;
  onReviewComplete?: (result: any) => void;
}

interface Finding {
  id: string;
  level: 'error' | 'warning' | 'info';
  category: string;
  ruleId: string;
  message: string;
  entityType?: string;
  entityId?: string;
  details?: Record<string, any>;
  resolved: boolean;
  waived: boolean;
  resolution?: string;
  waiverReason?: string;
}

interface AutoReviewRun {
  id: string;
  pfmeaId?: string;
  controlPlanId?: string;
  totalFindings: number;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  passedValidation: boolean;
  runBy?: string;
  runAt: string;
  durationMs?: number;
  rulesetVersion: string;
  findings: Finding[];
}

const levelIcons = {
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const levelColors = {
  error: 'text-red-600 bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800',
  warning: 'text-yellow-600 bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800',
  info: 'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800',
};

const categoryLabels: Record<string, string> = {
  coverage: 'Coverage',
  effectiveness: 'Effectiveness',
  document_control: 'Document Control',
  documentation: 'Documentation',
  scoring: 'Scoring',
  csr: 'CSR Requirements',
  compliance: 'Compliance',
};

export default function AutoReviewPanel({ 
  pfmeaId, 
  controlPlanId,
  documentType,
  documentId,
  onReviewComplete 
}: AutoReviewPanelProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['error', 'warning']));
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [waiveDialogOpen, setWaiveDialogOpen] = useState(false);
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);
  const [resolution, setResolution] = useState('');
  const [waiverReason, setWaiverReason] = useState('');
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const effectivePfmeaId = pfmeaId || (documentType === 'pfmea' ? documentId : undefined);
  const effectiveControlPlanId = controlPlanId || (documentType === 'control-plan' ? documentId : undefined);

  const { data: latestReview, isLoading: loadingReview } = useQuery<AutoReviewRun | null>({
    queryKey: ['auto-review', effectivePfmeaId, effectiveControlPlanId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (effectivePfmeaId) params.set('pfmeaId', effectivePfmeaId);
      if (effectiveControlPlanId) params.set('controlPlanId', effectiveControlPlanId);
      params.set('limit', '1');
      
      const res = await fetch(`/api/auto-review/history?${params}`);
      if (!res.ok) throw new Error('Failed to fetch review history');
      const history = await res.json();
      
      if (history.length === 0) return null;
      
      const runRes = await fetch(`/api/auto-review/${history[0].id}`);
      if (!runRes.ok) throw new Error('Failed to fetch review details');
      return runRes.json();
    },
    enabled: !!(effectivePfmeaId || effectiveControlPlanId),
  });

  const runReviewMutation = useMutation({
    mutationFn: async () => {
      if (documentType === 'part' && documentId) {
        return await apiRequest(`/api/parts/${documentId}/auto-review`, { method: "POST" });
      }
      if (documentType === 'pfmea' && documentId) {
        return await apiRequest(`/api/pfmeas/${documentId}/auto-review`, { method: "POST" });
      }
      if (documentType === 'control-plan' && documentId) {
        return await apiRequest(`/api/control-plans/${documentId}/auto-review`, { method: "POST" });
      }
      const res = await fetch('/api/auto-review/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pfmeaId: effectivePfmeaId, controlPlanId: effectiveControlPlanId, runBy: 'current-user' }),
      });
      if (!res.ok) throw new Error('Failed to run auto-review');
      return res.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['auto-review', effectivePfmeaId, effectiveControlPlanId] });
      onReviewComplete?.(result);
      const errorCount = result.errorCount ?? result.summary?.errors ?? 0;
      const warningCount = result.warningCount ?? result.summary?.warnings ?? 0;
      toast({
        title: errorCount === 0 ? 'Review Passed' : 'Review Complete',
        description: `Found ${errorCount} errors, ${warningCount} warnings`,
        variant: errorCount > 0 ? 'destructive' : 'default',
      });
    },
    onError: (error) => {
      toast({
        title: 'Review Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    },
  });

  const resolveFindingMutation = useMutation({
    mutationFn: async ({ findingId, resolution }: { findingId: string; resolution: string }) => {
      const res = await fetch(`/api/auto-review/findings/${findingId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolution, resolvedBy: 'current-user' }),
      });
      if (!res.ok) throw new Error('Failed to resolve finding');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auto-review', effectivePfmeaId, effectiveControlPlanId] });
      setResolveDialogOpen(false);
      setSelectedFinding(null);
      setResolution('');
      toast({ title: 'Finding Resolved' });
    },
  });

  const waiveFindingMutation = useMutation({
    mutationFn: async ({ findingId, waiverReason }: { findingId: string; waiverReason: string }) => {
      const res = await fetch(`/api/auto-review/findings/${findingId}/waive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ waiverReason }),
      });
      if (!res.ok) throw new Error('Failed to waive finding');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auto-review', effectivePfmeaId, effectiveControlPlanId] });
      setWaiveDialogOpen(false);
      setSelectedFinding(null);
      setWaiverReason('');
      toast({ title: 'Finding Waived' });
    },
  });

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const groupedFindings = latestReview?.findings?.reduce((acc, finding) => {
    if (!acc[finding.level]) {
      acc[finding.level] = {};
    }
    if (!acc[finding.level][finding.category]) {
      acc[finding.level][finding.category] = [];
    }
    acc[finding.level][finding.category].push(finding);
    return acc;
  }, {} as Record<string, Record<string, Finding[]>>) || {};

  const activeFindings = latestReview?.findings?.filter(f => !f.resolved && !f.waived) || [];
  const activeErrorCount = activeFindings.filter(f => f.level === 'error').length;
  const activeWarningCount = activeFindings.filter(f => f.level === 'warning').length;

  return (
    <Card data-testid="auto-review-panel">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Auto-Review
            </CardTitle>
            <CardDescription>
              AIAG-VDA 2019 compliance validation
            </CardDescription>
          </div>
          <Button 
            onClick={() => runReviewMutation.mutate()}
            disabled={runReviewMutation.isPending}
            data-testid="button-run-review"
          >
            {runReviewMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Running...
              </>
            ) : latestReview ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Re-run Review
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Run Review
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loadingReview ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Clock className="h-4 w-4 mr-2 animate-spin" />
            Loading...
          </div>
        ) : !latestReview ? (
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No reviews run yet</p>
            <p className="text-sm">Click "Run Review" to validate compliance</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 flex-wrap">
              {latestReview.passedValidation && activeErrorCount === 0 ? (
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              ) : (
                <XCircle className="h-8 w-8 text-red-600" />
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium">
                  {activeErrorCount === 0 ? 'Validation Passed' : 'Validation Failed'}
                </div>
                <div className="text-sm text-muted-foreground">
                  Last run: {new Date(latestReview.runAt).toLocaleString()}
                  {latestReview.durationMs && ` (${latestReview.durationMs}ms)`}
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Badge variant={activeErrorCount > 0 ? 'destructive' : 'secondary'}>
                  {activeErrorCount} Errors
                </Badge>
                <Badge variant={activeWarningCount > 0 ? 'outline' : 'secondary'} className={activeWarningCount > 0 ? 'border-yellow-500 text-yellow-700' : ''}>
                  {activeWarningCount} Warnings
                </Badge>
                <Badge variant="secondary">
                  {latestReview.infoCount} Info
                </Badge>
              </div>
            </div>

            {(['error', 'warning', 'info'] as const).map(level => {
              const levelFindings = groupedFindings[level];
              if (!levelFindings || Object.keys(levelFindings).length === 0) return null;
              
              const LevelIcon = levelIcons[level];
              const totalInLevel = Object.values(levelFindings).flat().length;
              const activeInLevel = Object.values(levelFindings).flat().filter(f => !f.resolved && !f.waived).length;
              
              return (
                <Collapsible 
                  key={level}
                  open={expandedCategories.has(level)}
                  onOpenChange={() => toggleCategory(level)}
                >
                  <CollapsibleTrigger asChild>
                    <div className={`flex items-center gap-2 p-2 rounded cursor-pointer hover-elevate border ${levelColors[level]}`}>
                      {expandedCategories.has(level) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      <LevelIcon className="h-4 w-4" />
                      <span className="font-medium capitalize">{level}s</span>
                      <Badge variant="secondary" className="ml-auto">
                        {activeInLevel}/{totalInLevel}
                      </Badge>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="pl-4 pt-2 space-y-2">
                      {Object.entries(levelFindings).map(([category, findings]) => (
                        <div key={category} className="space-y-1">
                          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            {categoryLabels[category] || category}
                          </div>
                          {findings.map(finding => (
                            <FindingRow 
                              key={finding.id}
                              finding={finding}
                              onResolve={() => {
                                setSelectedFinding(finding);
                                setResolveDialogOpen(true);
                              }}
                              onWaive={() => {
                                setSelectedFinding(finding);
                                setWaiveDialogOpen(true);
                              }}
                            />
                          ))}
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        )}
      </CardContent>

      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Finding</DialogTitle>
            <DialogDescription>
              Describe how this finding was addressed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedFinding && (
              <div className="p-3 bg-muted rounded-lg text-sm">
                <div className="font-medium">{selectedFinding.ruleId}</div>
                <div className="text-muted-foreground">{selectedFinding.message}</div>
              </div>
            )}
            <div>
              <Label htmlFor="resolution">Resolution</Label>
              <Textarea
                id="resolution"
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                placeholder="Describe what was done to fix this issue..."
                rows={3}
                data-testid="input-resolution"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => selectedFinding && resolveFindingMutation.mutate({ 
                findingId: selectedFinding.id, 
                resolution 
              })}
              disabled={!resolution || resolveFindingMutation.isPending}
              data-testid="button-confirm-resolve"
            >
              <CheckCheck className="h-4 w-4 mr-2" />
              Mark Resolved
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={waiveDialogOpen} onOpenChange={setWaiveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Waive Finding</DialogTitle>
            <DialogDescription>
              Waiving a finding acknowledges it but accepts the risk. Provide justification.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedFinding && (
              <div className="p-3 bg-muted rounded-lg text-sm">
                <div className="font-medium">{selectedFinding.ruleId}</div>
                <div className="text-muted-foreground">{selectedFinding.message}</div>
              </div>
            )}
            <div>
              <Label htmlFor="waiver">Waiver Justification</Label>
              <Textarea
                id="waiver"
                value={waiverReason}
                onChange={(e) => setWaiverReason(e.target.value)}
                placeholder="Explain why this finding is being waived..."
                rows={3}
                data-testid="input-waiver-reason"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWaiveDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="outline"
              onClick={() => selectedFinding && waiveFindingMutation.mutate({ 
                findingId: selectedFinding.id, 
                waiverReason 
              })}
              disabled={!waiverReason || waiveFindingMutation.isPending}
              className="border-yellow-500 text-yellow-700 hover:bg-yellow-50 dark:hover:bg-yellow-950"
              data-testid="button-confirm-waive"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Waive Finding
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function FindingRow({ 
  finding, 
  onResolve, 
  onWaive 
}: { 
  finding: Finding; 
  onResolve: () => void;
  onWaive: () => void;
}) {
  const isActive = !finding.resolved && !finding.waived;
  
  return (
    <div 
      className={`flex items-start gap-2 p-2 rounded text-sm ${!isActive ? 'opacity-50' : ''}`}
      data-testid={`finding-row-${finding.id}`}
    >
      <div className="flex-1 min-w-0">
        <div className="font-medium">{finding.ruleId}</div>
        <div className="text-muted-foreground">{finding.message}</div>
        {finding.resolved && (
          <div className="text-green-600 dark:text-green-400 text-xs mt-1">
            Resolved: {finding.resolution}
          </div>
        )}
        {finding.waived && (
          <div className="text-yellow-600 dark:text-yellow-400 text-xs mt-1">
            Waived: {finding.waiverReason}
          </div>
        )}
      </div>
      {isActive && (
        <div className="flex gap-1 flex-shrink-0">
          <Button size="sm" variant="ghost" onClick={onResolve} data-testid={`button-resolve-${finding.id}`}>
            Resolve
          </Button>
          <Button size="sm" variant="ghost" onClick={onWaive} className="text-yellow-600" data-testid={`button-waive-${finding.id}`}>
            Waive
          </Button>
        </div>
      )}
    </div>
  );
}
