import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Package,
  Settings,
  FileText,
  ClipboardList,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  RefreshCw,
  Activity,
  Shield,
  Target,
  Zap,
  BarChart3,
  PieChart,
  Calendar,
} from "lucide-react";
import type { Part, ProcessDef, PFMEA, ControlPlan } from "@shared/schema";

// Types for dashboard metrics
interface DashboardMetrics {
  parts: {
    total: number;
    byCustomer: Record<string, number>;
    byPlant: Record<string, number>;
  };
  processes: {
    total: number;
    effective: number;
    draft: number;
  };
  pfmeas: {
    total: number;
    effective: number;
    draft: number;
    totalRows: number;
    highAP: number;
    mediumAP: number;
    lowAP: number;
    specialChars: number;
  };
  controlPlans: {
    total: number;
    effective: number;
    draft: number;
    totalChars: number;
    specialChars: number;
    withReactionPlan: number;
  };
}

interface RecentActivity {
  id: string;
  type: "pfmea" | "control_plan" | "part" | "process";
  action: "created" | "updated" | "approved";
  name: string;
  timestamp: string;
  user?: string;
}

function getStatusBadge(status: string) {
  switch (status) {
    case "draft":
      return (
        <Badge variant="outline" className="bg-gray-50">
          <Clock className="h-3 w-3 mr-1" />
          Draft
        </Badge>
      );
    case "review":
      return (
        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Review
        </Badge>
      );
    case "effective":
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Effective
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function getAPBadge(ap: string, count: number) {
  switch (ap) {
    case "H":
      return (
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span className="font-medium">{count}</span>
          <span className="text-muted-foreground text-sm">High</span>
        </div>
      );
    case "M":
      return (
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <span className="font-medium">{count}</span>
          <span className="text-muted-foreground text-sm">Medium</span>
        </div>
      );
    case "L":
      return (
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="font-medium">{count}</span>
          <span className="text-muted-foreground text-sm">Low</span>
        </div>
      );
    default:
      return null;
  }
}

// Metric Card Component
function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  trendValue,
  href,
}: {
  title: string;
  value: number | string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  href?: string;
}) {
  const content = (
    <Card className={href ? "hover:shadow-md transition-shadow cursor-pointer" : ""}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="flex items-center gap-2 mt-1">
          <p className="text-xs text-muted-foreground">{description}</p>
          {trend && trendValue && (
            <div
              className={`flex items-center text-xs ${
                trend === "up"
                  ? "text-green-600"
                  : trend === "down"
                  ? "text-red-600"
                  : "text-gray-600"
              }`}
            >
              {trend === "up" ? (
                <TrendingUp className="h-3 w-3 mr-1" />
              ) : trend === "down" ? (
                <TrendingDown className="h-3 w-3 mr-1" />
              ) : null}
              {trendValue}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}

// AP Distribution Chart (simplified visual)
function APDistributionChart({
  high,
  medium,
  low,
}: {
  high: number;
  medium: number;
  low: number;
}) {
  const total = high + medium + low;
  if (total === 0) return null;

  const highPct = (high / total) * 100;
  const mediumPct = (medium / total) * 100;
  const lowPct = (low / total) * 100;

  return (
    <div className="space-y-3">
      <div className="flex h-4 rounded-full overflow-hidden">
        <div
          className="bg-red-500 transition-all"
          style={{ width: `${highPct}%` }}
        />
        <div
          className="bg-yellow-500 transition-all"
          style={{ width: `${mediumPct}%` }}
        />
        <div
          className="bg-green-500 transition-all"
          style={{ width: `${lowPct}%` }}
        />
      </div>
      <div className="flex justify-between text-sm">
        {getAPBadge("H", high)}
        {getAPBadge("M", medium)}
        {getAPBadge("L", low)}
      </div>
    </div>
  );
}

// Coverage Progress Component
function CoverageProgress({
  label,
  current,
  total,
  color = "primary",
}: {
  label: string;
  current: number;
  total: number;
  color?: "primary" | "success" | "warning" | "danger";
}) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  const colorClasses = {
    primary: "bg-primary",
    success: "bg-green-500",
    warning: "bg-yellow-500",
    danger: "bg-red-500",
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">
          {current}/{total} ({percentage}%)
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full ${colorClasses[color]} transition-all`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export default function Dashboard() {
  // Fetch all data for metrics
  const { data: parts = [], isLoading: partsLoading } = useQuery<Part[]>({
    queryKey: ["/api/parts"],
  });

  const { data: processes = [], isLoading: processesLoading } = useQuery<ProcessDef[]>({
    queryKey: ["/api/processes"],
  });

  // Fetch PFMEAs with rows
  const { data: pfmeasData = [], isLoading: pfmeasLoading } = useQuery({
    queryKey: ["/api/pfmeas-with-rows"],
    queryFn: async () => {
      // First get all parts, then get their PFMEAs
      const partsRes = await fetch("/api/parts");
      if (!partsRes.ok) return [];
      const parts: Part[] = await partsRes.json();

      const allPfmeas = [];
      for (const part of parts) {
        try {
          const res = await fetch(`/api/parts/${part.id}/pfmeas`);
          if (res.ok) {
            const pfmeas = await res.json();
            for (const pfmea of pfmeas) {
              try {
                const rowsRes = await fetch(`/api/pfmeas/${pfmea.id}`);
                if (rowsRes.ok) {
                  const pfmeaWithRows = await rowsRes.json();
                  allPfmeas.push({ ...pfmea, rows: pfmeaWithRows.rows || [], part });
                }
              } catch {
                allPfmeas.push({ ...pfmea, rows: [], part });
              }
            }
          }
        } catch {
          // Skip failed fetches
        }
      }
      return allPfmeas;
    },
  });

  // Fetch Control Plans with rows
  const { data: controlPlansData = [], isLoading: cpLoading } = useQuery({
    queryKey: ["/api/control-plans-with-rows"],
    queryFn: async () => {
      const partsRes = await fetch("/api/parts");
      if (!partsRes.ok) return [];
      const parts: Part[] = await partsRes.json();

      const allCPs = [];
      for (const part of parts) {
        try {
          const res = await fetch(`/api/parts/${part.id}/control-plans`);
          if (res.ok) {
            const cps = await res.json();
            for (const cp of cps) {
              try {
                const rowsRes = await fetch(`/api/control-plans/${cp.id}`);
                if (rowsRes.ok) {
                  const cpWithRows = await rowsRes.json();
                  allCPs.push({ ...cp, rows: cpWithRows.rows || [], part });
                }
              } catch {
                allCPs.push({ ...cp, rows: [], part });
              }
            }
          }
        } catch {
          // Skip failed fetches
        }
      }
      return allCPs;
    },
  });

  const isLoading = partsLoading || processesLoading || pfmeasLoading || cpLoading;

  // Calculate metrics
  const metrics: DashboardMetrics = {
    parts: {
      total: parts.length,
      byCustomer: parts.reduce((acc, p) => {
        acc[p.customer] = (acc[p.customer] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byPlant: parts.reduce((acc, p) => {
        acc[p.plant] = (acc[p.plant] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    },
    processes: {
      total: processes.length,
      effective: processes.filter((p) => p.status === "effective").length,
      draft: processes.filter((p) => p.status === "draft").length,
    },
    pfmeas: {
      total: pfmeasData.length,
      effective: pfmeasData.filter((p: any) => p.status === "effective").length,
      draft: pfmeasData.filter((p: any) => p.status === "draft").length,
      totalRows: pfmeasData.reduce((sum: number, p: any) => sum + (p.rows?.length || 0), 0),
      highAP: pfmeasData.reduce(
        (sum: number, p: any) => sum + (p.rows?.filter((r: any) => r.ap === "H").length || 0),
        0
      ),
      mediumAP: pfmeasData.reduce(
        (sum: number, p: any) => sum + (p.rows?.filter((r: any) => r.ap === "M").length || 0),
        0
      ),
      lowAP: pfmeasData.reduce(
        (sum: number, p: any) => sum + (p.rows?.filter((r: any) => r.ap === "L").length || 0),
        0
      ),
      specialChars: pfmeasData.reduce(
        (sum: number, p: any) => sum + (p.rows?.filter((r: any) => r.specialFlag).length || 0),
        0
      ),
    },
    controlPlans: {
      total: controlPlansData.length,
      effective: controlPlansData.filter((c: any) => c.status === "effective").length,
      draft: controlPlansData.filter((c: any) => c.status === "draft").length,
      totalChars: controlPlansData.reduce(
        (sum: number, c: any) => sum + (c.rows?.length || 0),
        0
      ),
      specialChars: controlPlansData.reduce(
        (sum: number, c: any) => sum + (c.rows?.filter((r: any) => r.specialFlag).length || 0),
        0
      ),
      withReactionPlan: controlPlansData.reduce(
        (sum: number, c: any) =>
          sum + (c.rows?.filter((r: any) => r.reactionPlan).length || 0),
        0
      ),
    },
  };

  // Recent items for activity feed
  const recentPfmeas = pfmeasData
    .slice(0, 5)
    .map((p: any) => ({
      id: p.id,
      type: "pfmea" as const,
      name: `PFMEA Rev ${p.rev} - ${p.part?.partNumber || "Unknown"}`,
      status: p.status,
      rows: p.rows?.length || 0,
    }));

  const recentCPs = controlPlansData
    .slice(0, 5)
    .map((c: any) => ({
      id: c.id,
      type: "control_plan" as const,
      name: `CP Rev ${c.rev} - ${c.part?.partNumber || "Unknown"}`,
      status: c.status,
      rows: c.rows?.length || 0,
    }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Process Library PFMEA Suite Overview
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            <Calendar className="h-3 w-3 mr-1" />
            AIAG-VDA 2019
          </Badge>
          <Badge variant="outline" className="text-xs">
            IATF 16949 Compliant
          </Badge>
        </div>
      </div>

      {/* Primary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Parts"
          value={metrics.parts.total}
          description={`${Object.keys(metrics.parts.byCustomer).length} customers`}
          icon={Package}
          href="/parts"
        />
        <MetricCard
          title="Process Definitions"
          value={metrics.processes.total}
          description={`${metrics.processes.effective} effective`}
          icon={Settings}
          href="/processes"
        />
        <MetricCard
          title="PFMEAs"
          value={metrics.pfmeas.total}
          description={`${metrics.pfmeas.totalRows} total rows`}
          icon={FileText}
          href="/pfmea"
        />
        <MetricCard
          title="Control Plans"
          value={metrics.controlPlans.total}
          description={`${metrics.controlPlans.totalChars} characteristics`}
          icon={ClipboardList}
          href="/control-plans"
        />
      </div>

      {/* Secondary Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* AP Distribution */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Action Priority Distribution
            </CardTitle>
            <CardDescription>
              PFMEA rows by Action Priority level (AIAG-VDA 2019)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {metrics.pfmeas.totalRows > 0 ? (
              <APDistributionChart
                high={metrics.pfmeas.highAP}
                medium={metrics.pfmeas.mediumAP}
                low={metrics.pfmeas.lowAP}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <PieChart className="h-12 w-12 mb-2" />
                <p>No PFMEA data available</p>
                <Button variant="link" asChild>
                  <Link href="/parts">Create your first PFMEA</Link>
                </Button>
              </div>
            )}
          </CardContent>
          {metrics.pfmeas.highAP > 0 && (
            <CardFooter className="border-t pt-4">
              <div className="flex items-center gap-2 text-sm text-red-600">
                <AlertTriangle className="h-4 w-4" />
                <span>
                  {metrics.pfmeas.highAP} high priority items require immediate
                  action
                </span>
              </div>
            </CardFooter>
          )}
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Quality Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <CoverageProgress
              label="Effective PFMEAs"
              current={metrics.pfmeas.effective}
              total={metrics.pfmeas.total}
              color={metrics.pfmeas.effective === metrics.pfmeas.total ? "success" : "warning"}
            />
            <CoverageProgress
              label="Effective Control Plans"
              current={metrics.controlPlans.effective}
              total={metrics.controlPlans.total}
              color={
                metrics.controlPlans.effective === metrics.controlPlans.total
                  ? "success"
                  : "warning"
              }
            />
            <CoverageProgress
              label="Reaction Plan Coverage"
              current={metrics.controlPlans.withReactionPlan}
              total={metrics.controlPlans.totalChars}
              color={
                metrics.controlPlans.totalChars > 0 &&
                metrics.controlPlans.withReactionPlan / metrics.controlPlans.totalChars >= 0.8
                  ? "success"
                  : metrics.controlPlans.withReactionPlan / metrics.controlPlans.totalChars >= 0.5
                  ? "warning"
                  : "danger"
              }
            />
          </CardContent>
        </Card>
      </div>

      {/* Special Characteristics & Recent Documents */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Special Characteristics Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Special Characteristics
            </CardTitle>
            <CardDescription>
              CSR items requiring enhanced controls
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-purple-50 border border-purple-200">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-red-500 text-white">Ⓢ</Badge>
                  <span className="text-sm font-medium">Safety</span>
                </div>
                <p className="text-2xl font-bold text-purple-700">
                  {metrics.pfmeas.specialChars}
                </p>
                <p className="text-xs text-muted-foreground">In PFMEAs</p>
              </div>
              <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-purple-500 text-white">◆</Badge>
                  <span className="text-sm font-medium">Critical</span>
                </div>
                <p className="text-2xl font-bold text-blue-700">
                  {metrics.controlPlans.specialChars}
                </p>
                <p className="text-xs text-muted-foreground">In Control Plans</p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="border-t pt-4">
            <p className="text-sm text-muted-foreground">
              Special characteristics require Cpk ≥ 1.67 and documented reaction
              plans per IATF 16949
            </p>
          </CardFooter>
        </Card>

        {/* Recent Documents */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Documents
            </CardTitle>
            <CardDescription>Latest PFMEAs and Control Plans</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[...recentPfmeas, ...recentCPs].slice(0, 5).map((item: any) => (
                <Link
                  key={item.id}
                  href={
                    item.type === "pfmea"
                      ? `/pfmea/${item.id}`
                      : `/control-plans/${item.id}`
                  }
                >
                  <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted cursor-pointer transition-colors">
                    <div className="flex items-center gap-3">
                      {item.type === "pfmea" ? (
                        <FileText className="h-4 w-4 text-blue-500" />
                      ) : (
                        <ClipboardList className="h-4 w-4 text-green-500" />
                      )}
                      <div>
                        <p className="text-sm font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.rows} {item.type === "pfmea" ? "rows" : "characteristics"}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(item.status)}
                  </div>
                </Link>
              ))}
              {recentPfmeas.length === 0 && recentCPs.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No documents yet</p>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="border-t pt-4">
            <div className="flex gap-2 w-full">
              <Button variant="outline" size="sm" className="flex-1" asChild>
                <Link href="/pfmea">
                  View All PFMEAs
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
              <Button variant="outline" size="sm" className="flex-1" asChild>
                <Link href="/control-plans">
                  View All CPs
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
              <Link href="/parts">
                <Package className="h-6 w-6" />
                <span>Add New Part</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
              <Link href="/processes">
                <Settings className="h-6 w-6" />
                <span>Manage Processes</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
              <Link href="/pfmea">
                <FileText className="h-6 w-6" />
                <span>Review PFMEAs</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
              <Link href="/control-plans">
                <ClipboardList className="h-6 w-6" />
                <span>Review Control Plans</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}