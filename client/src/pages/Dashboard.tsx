import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Package,
  FileText,
  AlertTriangle,
  Settings2,
  ClipboardList,
  Wrench,
  AlertCircle,
  ShieldCheck,
  Plus,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  CheckCircle2,
  BarChart3,
  Layers,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// Types for dashboard data
interface DashboardStats {
  parts: { total: number; draft: number; effective: number };
  processes: { total: number; draft: number; effective: number };
  pfmeas: { total: number; draft: number; review: number; effective: number };
  controlPlans: { total: number; draft: number; review: number; effective: number };
  equipment: { total: number; active: number; maintenance: number; inactive: number };
  failureModes: { total: number; byCategory: Record<string, number> };
  controls: { total: number; prevention: number; detection: number };
  highPriorityItems: number;
}

interface RecentActivity {
  id: string;
  type: "part" | "process" | "pfmea" | "control_plan" | "equipment";
  action: "created" | "updated" | "approved" | "reviewed";
  title: string;
  timestamp: string;
  user?: string;
}

// Metric Card Component
interface MetricCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ElementType;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  className?: string;
  href?: string;
}

function MetricCard({ title, value, subtitle, icon: Icon, trend, className, href }: MetricCardProps) {
  const content = (
    <Card className={cn("hover:shadow-md transition-shadow cursor-pointer", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        {trend && (
          <div className={cn("flex items-center text-xs mt-2", trend.isPositive ? "text-green-600" : "text-red-600")}>
            {trend.isPositive ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
            {trend.value}
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

// Status Distribution Component
function StatusDistribution({
  title,
  data,
}: {
  title: string;
  data: { label: string; value: number; color: string }[];
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (total === 0) {
    return (
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="font-medium">{title}</span>
          <span className="text-muted-foreground">0 total</span>
        </div>
        <div className="h-2 rounded-full bg-muted" />
        <p className="text-xs text-muted-foreground">No data yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="font-medium">{title}</span>
        <span className="text-muted-foreground">{total} total</span>
      </div>
      <div className="flex h-2 rounded-full overflow-hidden bg-muted">
        {data.map((item, index) => (
          <div
            key={index}
            className={cn("h-full", item.color)}
            style={{ width: `${(item.value / total) * 100}%` }}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-3 text-xs">
        {data.map((item, index) => (
          <div key={index} className="flex items-center gap-1">
            <div className={cn("w-2 h-2 rounded-full", item.color)} />
            <span className="text-muted-foreground">
              {item.label}: {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Activity Item Component
function ActivityItem({ activity }: { activity: RecentActivity }) {
  const iconMap = {
    part: Package,
    process: Settings2,
    pfmea: FileText,
    control_plan: ClipboardList,
    equipment: Wrench,
  };

  const actionColorMap = {
    created: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    updated: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    approved: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
    reviewed: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  };

  const Icon = iconMap[activity.type];

  return (
    <div className="flex items-start gap-3 py-3">
      <div className="flex-shrink-0 p-2 rounded-lg bg-muted">
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{activity.title}</p>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="secondary" className={cn("text-xs", actionColorMap[activity.action])}>
            {activity.action}
          </Badge>
          <span className="text-xs text-muted-foreground">{activity.timestamp}</span>
        </div>
      </div>
    </div>
  );
}

// Quick Action Button Component
function QuickAction({
  icon: Icon,
  label,
  href,
  description,
}: {
  icon: React.ElementType;
  label: string;
  href: string;
  description: string;
}) {
  return (
    <Link href={href}>
      <Button variant="outline" className="h-auto p-4 flex flex-col items-start gap-2 w-full hover:bg-accent">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4" />
          <span className="font-medium">{label}</span>
        </div>
        <span className="text-xs text-muted-foreground text-left">{description}</span>
      </Button>
    </Link>
  );
}

// Loading Skeleton
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-32 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-28" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function Dashboard() {
  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  // Fetch recent activity
  const { data: activity, isLoading: activityLoading } = useQuery<RecentActivity[]>({
    queryKey: ["/api/dashboard/activity"],
  });

  const isLoading = statsLoading || activityLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Process Library PFMEA Suite Overview</p>
        </div>
        <DashboardSkeleton />
      </div>
    );
  }

  // Default values if no data yet
  const safeStats: DashboardStats = stats || {
    parts: { total: 0, draft: 0, effective: 0 },
    processes: { total: 0, draft: 0, effective: 0 },
    pfmeas: { total: 0, draft: 0, review: 0, effective: 0 },
    controlPlans: { total: 0, draft: 0, review: 0, effective: 0 },
    equipment: { total: 0, active: 0, maintenance: 0, inactive: 0 },
    failureModes: { total: 0, byCategory: {} },
    controls: { total: 0, prevention: 0, detection: 0 },
    highPriorityItems: 0,
  };

  const safeActivity: RecentActivity[] = activity || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Process Library PFMEA Suite Overview</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <Activity className="h-3 w-3" />
            AIAG-VDA 2019
          </Badge>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Parts"
          value={safeStats.parts.total}
          subtitle={`${safeStats.parts.effective} effective, ${safeStats.parts.draft} draft`}
          icon={Package}
          href="/parts"
        />
        <MetricCard
          title="Process Library"
          value={safeStats.processes.total}
          subtitle={`${safeStats.processes.effective} effective templates`}
          icon={Settings2}
          href="/processes"
        />
        <MetricCard
          title="PFMEAs"
          value={safeStats.pfmeas.total}
          subtitle={`${safeStats.pfmeas.effective} approved`}
          icon={FileText}
          href="/pfmea"
        />
        <MetricCard
          title="High Priority Items"
          value={safeStats.highPriorityItems}
          subtitle="Action Priority = H"
          icon={AlertTriangle}
          className={safeStats.highPriorityItems > 0 ? "border-red-200 dark:border-red-900" : ""}
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Control Plans"
          value={safeStats.controlPlans.total}
          subtitle={`${safeStats.controlPlans.effective} effective`}
          icon={ClipboardList}
          href="/control-plans"
        />
        <MetricCard
          title="Equipment Library"
          value={safeStats.equipment.total}
          subtitle={`${safeStats.equipment.active} active`}
          icon={Wrench}
          href="/equipment"
        />
        <MetricCard
          title="Failure Modes"
          value={safeStats.failureModes.total}
          subtitle="In catalog"
          icon={AlertCircle}
          href="/failure-modes"
        />
        <MetricCard
          title="Controls Library"
          value={safeStats.controls.total}
          subtitle={`${safeStats.controls.prevention} prev. / ${safeStats.controls.detection} det.`}
          icon={ShieldCheck}
          href="/controls-library"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Status Overview */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Status Overview
            </CardTitle>
            <CardDescription>Document lifecycle distribution</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <StatusDistribution
              title="PFMEAs"
              data={[
                { label: "Draft", value: safeStats.pfmeas.draft, color: "bg-gray-400" },
                { label: "In Review", value: safeStats.pfmeas.review, color: "bg-yellow-400" },
                { label: "Effective", value: safeStats.pfmeas.effective, color: "bg-green-500" },
              ]}
            />
            <StatusDistribution
              title="Control Plans"
              data={[
                { label: "Draft", value: safeStats.controlPlans.draft, color: "bg-gray-400" },
                { label: "In Review", value: safeStats.controlPlans.review, color: "bg-yellow-400" },
                { label: "Effective", value: safeStats.controlPlans.effective, color: "bg-green-500" },
              ]}
            />
            <StatusDistribution
              title="Equipment"
              data={[
                { label: "Active", value: safeStats.equipment.active, color: "bg-green-500" },
                { label: "Maintenance", value: safeStats.equipment.maintenance, color: "bg-yellow-400" },
                { label: "Inactive", value: safeStats.equipment.inactive, color: "bg-gray-400" },
              ]}
            />
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Quick Actions
            </CardTitle>
            <CardDescription>Common tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <QuickAction
              icon={Package}
              label="New Part"
              href="/parts"
              description="Create a new part and generate documents"
            />
            <QuickAction
              icon={Settings2}
              label="New Process"
              href="/processes"
              description="Add a process template to the library"
            />
            <QuickAction
              icon={FileText}
              label="Generate PFMEA"
              href="/pfmea"
              description="Create PFMEA from process templates"
            />
            <QuickAction
              icon={ClipboardList}
              label="Generate Control Plan"
              href="/control-plans"
              description="Create Control Plan from PFMEA"
            />
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity & Library Summary */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
                <CardDescription>Latest changes across the system</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {safeActivity.length > 0 ? (
              <div className="divide-y">
                {safeActivity.slice(0, 5).map((item) => (
                  <ActivityItem key={item.id} activity={item} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No recent activity</p>
                <p className="text-sm">Start by creating a part or process</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Library Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Library Summary
            </CardTitle>
            <CardDescription>Reusable components</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Link href="/equipment">
                <div className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Wrench className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Equipment</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{safeStats.equipment.total}</Badge>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </Link>
              <Link href="/failure-modes">
                <div className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Failure Modes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{safeStats.failureModes.total}</Badge>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </Link>
              <Link href="/controls-library">
                <div className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Controls</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{safeStats.controls.total}</Badge>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Compliance Banner */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200 dark:border-blue-800">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <div>
                <p className="font-medium text-blue-900 dark:text-blue-100">
                  IATF 16949 / ISO 9001 Compliant
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  AIAG-VDA 2019 Harmonized FMEA Approach
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="border-blue-300 dark:border-blue-700">
              View Documentation
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}