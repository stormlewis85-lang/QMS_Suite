import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Loader2, BarChart3, TrendingUp, Users, FileText, Download, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

const COLORS = ["#3b82f6", "#ef4444", "#f59e0b", "#10b981", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316"];

const priorityColors: Record<string, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#f59e0b",
  low: "#10b981",
};

export default function CapaAnalytics() {
  const { data: capas, isLoading } = useQuery<any[]>({
    queryKey: ["/api/capas"],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const allCapas = capas || [];
  const openCapas = allCapas.filter((c) => !["closed", "cancelled"].includes(c.status));
  const closedCapas = allCapas.filter((c) => c.status === "closed");

  // Status distribution
  const statusData = Object.entries(
    allCapas.reduce((acc: Record<string, number>, c) => {
      const key = c.currentDiscipline || "D0";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  // Priority distribution
  const priorityData = ["critical", "high", "medium", "low"].map((p) => ({
    name: p.charAt(0).toUpperCase() + p.slice(1),
    count: allCapas.filter((c) => c.priority === p).length,
    fill: priorityColors[p],
  }));

  // Source distribution
  const sourceData = Object.entries(
    allCapas.reduce((acc: Record<string, number>, c) => {
      const key = (c.sourceType || "other").replace(/_/g, " ");
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  // On-time rate
  const withTarget = closedCapas.filter((c) => c.targetClosureDate && c.actualClosureDate);
  const onTime = withTarget.filter((c) => new Date(c.actualClosureDate) <= new Date(c.targetClosureDate));
  const onTimeRate = withTarget.length > 0 ? Math.round((onTime.length / withTarget.length) * 100) : 0;

  // Avg cycle time
  const cycleTimes = closedCapas
    .filter((c) => c.createdAt && c.closedAt)
    .map((c) => Math.round((new Date(c.closedAt).getTime() - new Date(c.createdAt).getTime()) / (1000 * 60 * 60 * 24)));
  const avgCycleTime = cycleTimes.length > 0 ? Math.round(cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length) : 0;

  // Aging buckets
  const agingData = [
    { bucket: "0-7 days", count: 0 },
    { bucket: "8-14 days", count: 0 },
    { bucket: "15-30 days", count: 0 },
    { bucket: "30+ days", count: 0 },
  ];
  openCapas.forEach((c) => {
    const age = Math.floor((Date.now() - new Date(c.createdAt).getTime()) / (1000 * 60 * 60 * 24));
    if (age <= 7) agingData[0].count++;
    else if (age <= 14) agingData[1].count++;
    else if (age <= 30) agingData[2].count++;
    else agingData[3].count++;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/capa">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">CAPA Analytics</h1>
            <p className="text-muted-foreground">Performance metrics and analysis</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/capa/analytics/pareto"><Button variant="outline" size="sm"><BarChart3 className="h-4 w-4 mr-1" /> Pareto</Button></Link>
          <Link href="/capa/analytics/trends"><Button variant="outline" size="sm"><TrendingUp className="h-4 w-4 mr-1" /> Trends</Button></Link>
          <Link href="/capa/analytics/team"><Button variant="outline" size="sm"><Users className="h-4 w-4 mr-1" /> Team</Button></Link>
          <Link href="/capa/reports"><Button variant="outline" size="sm"><FileText className="h-4 w-4 mr-1" /> Reports</Button></Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total CAPAs</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{allCapas.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Open</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{openCapas.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Closed</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-green-600">{closedCapas.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">On-Time %</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{onTimeRate}%</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Avg Cycle Time</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{avgCycleTime} days</div></CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                  {statusData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">By Priority</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={priorityData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={70} />
                <Tooltip />
                <Bar dataKey="count">
                  {priorityData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">By Source Type</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={sourceData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} label>
                  {sourceData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Aging Analysis (Open CAPAs)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={agingData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="bucket" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
