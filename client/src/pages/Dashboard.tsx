import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  Package, 
  FileText, 
  ClipboardList,
  AlertTriangle,
  Clock,
  Activity,
  ArrowRight,
} from 'lucide-react';
import { Link } from 'wouter';

export default function Dashboard() {
  const { data: metrics, isLoading } = useQuery<{
    summary: {
      totalParts: number;
      totalPfmeas: number;
      totalControlPlans: number;
      totalFailureModes: number;
      pendingReview: number;
      highAPItems: number;
      highAPInDraft: number;
      partsWithoutPfmea: number;
    };
    pfmeaByStatus: { draft: number; review: number; effective: number; superseded: number };
    cpByStatus: { draft: number; review: number; effective: number; superseded: number };
    apDistribution: { high: number; medium: number; low: number };
    recentActivity: Array<{ id: number; action: string; entityType: string; entityId: string; actor: string; at: string }>;
  }>({
    queryKey: ['/api/dashboard/metrics'],
  });
  
  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-48"></div>
          <div className="grid grid-cols-4 gap-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  const { summary, pfmeaByStatus, cpByStatus, apDistribution, recentActivity } = metrics || {};
  
  const formatAction = (action: string) => {
    const labels: Record<string, string> = {
      'status_changed': 'Status Changed',
      'signature_added': 'Signature Added',
      'revision_created': 'Revision Created',
      'exported': 'Document Exported',
      'doc_number_assigned': 'Doc Number Assigned',
    };
    return labels[action] || action;
  };
  
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <LayoutDashboard className="h-8 w-8" />
            Dashboard
          </h1>
          <p className="text-muted-foreground">PFMEA Suite Overview</p>
        </div>
        <div className="flex gap-2">
          <Link href="/parts">
            <Button data-testid="button-view-parts">
              <Package className="h-4 w-4 mr-2" />
              View Parts
            </Button>
          </Link>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="card-total-parts">
          <CardHeader className="pb-2 flex flex-row items-center justify-between gap-1">
            <CardDescription>Total Parts</CardDescription>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <CardTitle className="text-3xl">{summary?.totalParts || 0}</CardTitle>
            <div className="text-xs text-muted-foreground">
              {summary?.partsWithoutPfmea || 0} without PFMEA
            </div>
          </CardContent>
        </Card>
        
        <Card data-testid="card-failure-modes">
          <CardHeader className="pb-2 flex flex-row items-center justify-between gap-1">
            <CardDescription>Total Failure Modes</CardDescription>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <CardTitle className="text-3xl">{summary?.totalFailureModes || 0}</CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="destructive" className="text-xs">{apDistribution?.high || 0} High</Badge>
              <Badge variant="outline" className="bg-yellow-50 dark:bg-yellow-900/20 text-xs">{apDistribution?.medium || 0} Med</Badge>
              <Badge variant="outline" className="bg-green-50 dark:bg-green-900/20 text-xs">{apDistribution?.low || 0} Low</Badge>
            </div>
          </CardContent>
        </Card>
        
        <Card className={summary?.pendingReview && summary.pendingReview > 0 ? 'border-yellow-300 dark:border-yellow-700' : ''} data-testid="card-pending-review">
          <CardHeader className="pb-2 flex flex-row items-center justify-between gap-1">
            <CardDescription className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Pending Review
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CardTitle className="text-3xl">{summary?.pendingReview || 0}</CardTitle>
            <div className="text-xs text-muted-foreground">
              Documents awaiting signatures
            </div>
          </CardContent>
        </Card>
        
        <Card className={summary?.highAPInDraft && summary.highAPInDraft > 0 ? 'border-red-300 dark:border-red-700' : ''} data-testid="card-high-ap-draft">
          <CardHeader className="pb-2 flex flex-row items-center justify-between gap-1">
            <CardDescription className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              High AP in Draft
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CardTitle className="text-3xl">{summary?.highAPInDraft || 0}</CardTitle>
            <div className="text-xs text-muted-foreground">
              Require action before release
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card data-testid="card-pfmea-documents">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5" />
              PFMEA Documents
            </CardTitle>
            <CardDescription>{summary?.totalPfmeas || 0} total</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex justify-between gap-2 text-sm">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-gray-400"></span>
                  Draft
                </span>
                <span>{pfmeaByStatus?.draft || 0}</span>
              </div>
              <div className="flex justify-between gap-2 text-sm">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-yellow-400"></span>
                  In Review
                </span>
                <span>{pfmeaByStatus?.review || 0}</span>
              </div>
              <div className="flex justify-between gap-2 text-sm">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-green-500"></span>
                  Effective
                </span>
                <span>{pfmeaByStatus?.effective || 0}</span>
              </div>
              <div className="flex justify-between gap-2 text-sm">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-400"></span>
                  Superseded
                </span>
                <span>{pfmeaByStatus?.superseded || 0}</span>
              </div>
            </div>
            <Link href="/pfmea">
              <Button variant="outline" size="sm" className="w-full mt-2" data-testid="button-view-pfmeas">
                View All PFMEAs
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>
        
        <Card data-testid="card-control-plans">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ClipboardList className="h-5 w-5" />
              Control Plans
            </CardTitle>
            <CardDescription>{summary?.totalControlPlans || 0} total</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex justify-between gap-2 text-sm">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-gray-400"></span>
                  Draft
                </span>
                <span>{cpByStatus?.draft || 0}</span>
              </div>
              <div className="flex justify-between gap-2 text-sm">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-yellow-400"></span>
                  In Review
                </span>
                <span>{cpByStatus?.review || 0}</span>
              </div>
              <div className="flex justify-between gap-2 text-sm">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-green-500"></span>
                  Effective
                </span>
                <span>{cpByStatus?.effective || 0}</span>
              </div>
              <div className="flex justify-between gap-2 text-sm">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-400"></span>
                  Superseded
                </span>
                <span>{cpByStatus?.superseded || 0}</span>
              </div>
            </div>
            <Link href="/control-plans">
              <Button variant="outline" size="sm" className="w-full mt-2" data-testid="button-view-control-plans">
                View All Control Plans
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
      
      <Card data-testid="card-recent-activity">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivity && recentActivity.length > 0 ? (
            <div className="space-y-3">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between gap-2 py-2 border-b last:border-0 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                    <div>
                      <p className="text-sm font-medium">{formatAction(activity.action)}</p>
                      <p className="text-xs text-muted-foreground">
                        {activity.entityType} - {activity.actor}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(activity.at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-8 w-8 mx-auto mb-2 opacity-20" />
              <p>No recent activity</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
