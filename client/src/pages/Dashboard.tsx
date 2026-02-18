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
  Target,
  TrendingUp,
  PieChart as PieChartIcon,
  FolderOpen,
} from 'lucide-react';
import { Link } from 'wouter';
import { 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend,
  ResponsiveContainer 
} from 'recharts';

const AP_COLORS = {
  high: '#ef4444',
  medium: '#f59e0b', 
  low: '#22c55e',
};

const RADIAN = Math.PI / 180;

interface CustomLabelProps {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
  name: string;
  value: number;
}

const renderCustomizedLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
  value,
}: CustomLabelProps) => {
  if (percent < 0.05) return null;
  
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      className="text-xs font-semibold"
      style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
    >
      {value}
    </text>
  );
};

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
    actionSummary?: { open: number; inProgress: number; overdue: number };
  }>({
    queryKey: ['/api/dashboard/metrics'],
    staleTime: 30000,
    refetchOnWindowFocus: true,
  });

  const { data: dcMetrics } = useQuery<{
    total: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
    overdueReviews: number;
    pendingApprovals: number;
    recentChanges: number;
  }>({
    queryKey: ['/api/documents/metrics'],
    queryFn: async () => {
      const res = await fetch('/api/documents/metrics', { credentials: 'include' });
      if (!res.ok) return { total: 0, byStatus: {}, byType: {}, overdueReviews: 0, pendingApprovals: 0, recentChanges: 0 };
      return res.json();
    },
    staleTime: 30000,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
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
  
  const { summary, pfmeaByStatus, cpByStatus, apDistribution, recentActivity, actionSummary } = metrics || {};
  
  const apChartData = apDistribution ? [
    { name: 'High', value: apDistribution.high, color: AP_COLORS.high },
    { name: 'Medium', value: apDistribution.medium, color: AP_COLORS.medium },
    { name: 'Low', value: apDistribution.low, color: AP_COLORS.low },
  ] : [];
  
  const statusChartData = [
    { name: 'Draft', pfmea: pfmeaByStatus?.draft || 0, cp: cpByStatus?.draft || 0 },
    { name: 'Review', pfmea: pfmeaByStatus?.review || 0, cp: cpByStatus?.review || 0 },
    { name: 'Effective', pfmea: pfmeaByStatus?.effective || 0, cp: cpByStatus?.effective || 0 },
    { name: 'Superseded', pfmea: pfmeaByStatus?.superseded || 0, cp: cpByStatus?.superseded || 0 },
  ];
  
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <LayoutDashboard className="h-8 w-8" />
            Dashboard
          </h1>
          <p className="text-muted-foreground">PFMEA Suite Overview</p>
        </div>
        <div className="flex gap-2">
          <Link href="/parts">
            <Button>
              <Package className="h-4 w-4 mr-2" />
              View Parts
            </Button>
          </Link>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Parts</CardDescription>
            <CardTitle className="text-3xl">{summary?.totalParts || 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              {summary?.partsWithoutPfmea || 0} without PFMEA
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Failure Modes</CardDescription>
            <CardTitle className="text-3xl">{summary?.totalFailureModes || 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge variant="destructive" className="text-xs">{apDistribution?.high || 0} High</Badge>
              <Badge variant="outline" className="bg-yellow-50 text-xs">{apDistribution?.medium || 0} Med</Badge>
            </div>
          </CardContent>
        </Card>
        
        <Card className={summary?.pendingReview && summary.pendingReview > 0 ? 'border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20' : ''}>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Pending Review
            </CardDescription>
            <CardTitle className="text-3xl">{summary?.pendingReview || 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              Awaiting signatures
            </div>
          </CardContent>
        </Card>
        
        <Card className={summary?.highAPInDraft && summary.highAPInDraft > 0 ? 'border-red-300 bg-red-50 dark:bg-red-950/20' : ''}>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              High AP in Draft
            </CardDescription>
            <CardTitle className="text-3xl">{summary?.highAPInDraft || 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              Need action before release
            </div>
          </CardContent>
        </Card>
        
        <Card className={actionSummary?.overdue && actionSummary.overdue > 0 ? 'border-orange-300 bg-orange-50 dark:bg-orange-950/20' : ''}>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Target className="h-3 w-3" />
              Open Actions
            </CardDescription>
            <CardTitle className="text-3xl">
              {(actionSummary?.open || 0) + (actionSummary?.inProgress || 0)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              {actionSummary?.overdue || 0} overdue
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Action Priority Distribution
            </CardTitle>
            <CardDescription>
              Breakdown of failure modes by AP level
            </CardDescription>
          </CardHeader>
          <CardContent>
            {apChartData.length > 0 && apChartData.some(d => d.value > 0) ? (
              <div className="space-y-4">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={apChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      labelLine={false}
                      label={renderCustomizedLabel}
                    >
                      {apChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number, name: string) => [
                        `${value} (${((value / apChartData.reduce((a, b) => a + b.value, 0)) * 100).toFixed(0)}%)`,
                        name
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                
                <div className="flex justify-center gap-6">
                  {apChartData.map((entry) => (
                    <div key={entry.name} className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="text-sm text-muted-foreground">
                        {entry.name}: <span className="font-medium text-foreground">{entry.value}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <PieChartIcon className="h-12 w-12 mx-auto mb-2 opacity-20" />
                  <p>No failure modes recorded</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Document Status
            </CardTitle>
            <CardDescription>
              PFMEAs and Control Plans by status
            </CardDescription>
          </CardHeader>
          <CardContent>
            {statusChartData.some(d => d.pfmea > 0 || d.cp > 0) ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={statusChartData}>
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="pfmea" name="PFMEA" fill="#3b82f6" />
                  <Bar dataKey="cp" name="Control Plan" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                No documents created
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5" />
              PFMEA Documents
            </CardTitle>
            <CardDescription>{summary?.totalPfmeas || 0} total</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-gray-400"></span>
                  Draft
                </span>
                <span>{pfmeaByStatus?.draft || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-yellow-400"></span>
                  In Review
                </span>
                <span>{pfmeaByStatus?.review || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-green-500"></span>
                  Effective
                </span>
                <span>{pfmeaByStatus?.effective || 0}</span>
              </div>
            </div>
            <Link href="/pfmea">
              <Button variant="outline" size="sm" className="w-full mt-2">
                View All PFMEAs
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ClipboardList className="h-5 w-5" />
              Control Plans
            </CardTitle>
            <CardDescription>{summary?.totalControlPlans || 0} total</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-gray-400"></span>
                  Draft
                </span>
                <span>{cpByStatus?.draft || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-yellow-400"></span>
                  In Review
                </span>
                <span>{cpByStatus?.review || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-green-500"></span>
                  Effective
                </span>
                <span>{cpByStatus?.effective || 0}</span>
              </div>
            </div>
            <Link href="/control-plans">
              <Button variant="outline" size="sm" className="w-full mt-2">
                View All Control Plans
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className={dcMetrics && (dcMetrics.pendingApprovals > 0 || dcMetrics.overdueReviews > 0) ? 'border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20' : ''}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FolderOpen className="h-5 w-5" />
              Document Control
            </CardTitle>
            <CardDescription>{dcMetrics?.total || 0} total</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-gray-400"></span>
                  Draft
                </span>
                <span>{dcMetrics?.byStatus?.draft || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-yellow-400"></span>
                  In Review
                </span>
                <span>{dcMetrics?.byStatus?.review || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-green-500"></span>
                  Effective
                </span>
                <span>{dcMetrics?.byStatus?.effective || 0}</span>
              </div>
            </div>
            {dcMetrics && (dcMetrics.pendingApprovals > 0 || dcMetrics.overdueReviews > 0) && (
              <div className="flex items-center gap-2 pt-1">
                {dcMetrics.pendingApprovals > 0 && (
                  <Badge variant="outline" className="bg-yellow-100 text-yellow-800 text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    {dcMetrics.pendingApprovals} pending
                  </Badge>
                )}
                {dcMetrics.overdueReviews > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {dcMetrics.overdueReviews} overdue
                  </Badge>
                )}
              </div>
            )}
            <Link href="/documents">
              <Button variant="outline" size="sm" className="w-full mt-2">
                View All Documents
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity && recentActivity.length > 0 ? (
              <div className="space-y-3">
                {recentActivity.slice(0, 5).map((activity: any) => (
                  <div key={activity.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-primary"></div>
                      <div>
                        <p className="text-sm font-medium">{formatAction(activity.action)}</p>
                        <p className="text-xs text-muted-foreground">
                          {activity.entityType}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(activity.at).toLocaleDateString()}
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
    </div>
  );
}
