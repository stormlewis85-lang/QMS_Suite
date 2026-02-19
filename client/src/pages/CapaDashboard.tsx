import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Plus, AlertTriangle, Clock, CheckCircle2, TrendingUp, Activity, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const priorityColors: Record<string, string> = {
  critical: "bg-red-500 text-white",
  high: "bg-orange-500 text-white",
  medium: "bg-yellow-500 text-black",
  low: "bg-green-500 text-white",
};

const disciplineLabels: Record<string, string> = {
  D0: "Emergency Response",
  D1: "Team Formation",
  D2: "Problem Description",
  D3: "Containment",
  D4: "Root Cause",
  D5: "Corrective Actions",
  D6: "Validation",
  D7: "Prevention",
  D8: "Closure",
};

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString();
}

function daysAgo(dateStr: string | null | undefined) {
  if (!dateStr) return 0;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export default function CapaDashboard() {
  const { data: capasResponse, isLoading } = useQuery<any>({
    queryKey: ["/api/capas"],
  });

  const { data: dashboardData } = useQuery<any>({
    queryKey: ["/api/capas/dashboard"],
  });

  const { data: myAssignments } = useQuery<any[]>({
    queryKey: ["/api/capas/my-assignments"],
  });

  const { data: overdue } = useQuery<any[]>({
    queryKey: ["/api/capas/overdue"],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const allCapas = Array.isArray(capasResponse) ? capasResponse : (capasResponse?.data || []);
  const openCount = allCapas.filter((c: any) => !["closed", "cancelled"].includes(c.status)).length;
  const overdueCapas = overdue || [];
  const closedThisMonth = allCapas.filter((c: any) => {
    if (!c.closedAt) return false;
    const d = new Date(c.closedAt);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const avgCycleTime = allCapas.reduce((sum: number, c: any) => {
    if (!c.closedAt || !c.createdAt) return sum;
    return sum + daysAgo(c.createdAt) - daysAgo(c.closedAt);
  }, 0);
  const closedCapas = allCapas.filter((c: any) => c.closedAt);
  const avgDays = closedCapas.length > 0 ? Math.round(avgCycleTime / closedCapas.length) : 0;

  // Status distribution
  const statusCounts: Record<string, number> = {};
  allCapas.forEach((c: any) => {
    statusCounts[c.currentDiscipline || "D0"] = (statusCounts[c.currentDiscipline || "D0"] || 0) + 1;
  });

  // Priority distribution
  const priorityCounts: Record<string, number> = {};
  allCapas.forEach((c: any) => {
    priorityCounts[c.priority || "medium"] = (priorityCounts[c.priority || "medium"] || 0) + 1;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">CAPA Dashboard</h1>
          <p className="text-muted-foreground">Corrective & Preventive Action Management</p>
        </div>
        <Link href="/capa/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New CAPA
          </Button>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open CAPAs</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openCount}</div>
            <p className="text-xs text-muted-foreground">Active corrective actions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{overdueCapas.length}</div>
            <p className="text-xs text-muted-foreground">Past target closure date</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Closed This Month</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{closedThisMonth}</div>
            <p className="text-xs text-muted-foreground">Successfully resolved</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Cycle Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgDays} days</div>
            <p className="text-xs text-muted-foreground">From open to close</p>
          </CardContent>
        </Card>
      </div>

      {/* Distribution Charts (simple bar representation) */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">By Discipline</CardTitle>
            <CardDescription>Current discipline distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(disciplineLabels).map(([key, label]) => {
                const count = statusCounts[key] || 0;
                const pct = allCapas.length > 0 ? (count / allCapas.length) * 100 : 0;
                return (
                  <div key={key} className="flex items-center gap-2">
                    <span className="text-xs font-mono w-6">{key}</span>
                    <div className="flex-1 bg-muted rounded-full h-4 overflow-hidden">
                      <div
                        className="bg-primary h-full rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-8 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">By Priority</CardTitle>
            <CardDescription>Priority level distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {["critical", "high", "medium", "low"].map((priority) => {
                const count = priorityCounts[priority] || 0;
                const pct = allCapas.length > 0 ? (count / allCapas.length) * 100 : 0;
                return (
                  <div key={priority} className="flex items-center gap-2">
                    <Badge className={`${priorityColors[priority]} w-16 justify-center text-xs`}>
                      {priority}
                    </Badge>
                    <div className="flex-1 bg-muted rounded-full h-4 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          priority === "critical" ? "bg-red-500" :
                          priority === "high" ? "bg-orange-500" :
                          priority === "medium" ? "bg-yellow-500" : "bg-green-500"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-8 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* My Assignments */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">My Assignments</CardTitle>
          <CardDescription>CAPAs assigned to you</CardDescription>
        </CardHeader>
        <CardContent>
          {(myAssignments || []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No CAPAs currently assigned to you.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Number</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Discipline</TableHead>
                  <TableHead>Target Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(myAssignments || []).slice(0, 10).map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Link href={`/capa/${c.id}`}>
                        <span className="font-mono text-sm text-primary hover:underline cursor-pointer">
                          {c.capaNumber}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-[300px] truncate">{c.title}</TableCell>
                    <TableCell>
                      <Badge className={priorityColors[c.priority] || ""}>
                        {c.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{c.currentDiscipline}</Badge>
                    </TableCell>
                    <TableCell className={c.targetClosureDate && new Date(c.targetClosureDate) < new Date() ? "text-destructive" : ""}>
                      {formatDate(c.targetClosureDate)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Overdue Alert */}
      {overdueCapas.length > 0 && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-base text-destructive flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Overdue CAPAs ({overdueCapas.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Number</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Target Date</TableHead>
                  <TableHead>Days Overdue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overdueCapas.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Link href={`/capa/${c.id}`}>
                        <span className="font-mono text-sm text-primary hover:underline cursor-pointer">
                          {c.capaNumber}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-[300px] truncate">{c.title}</TableCell>
                    <TableCell>
                      <Badge className={priorityColors[c.priority] || ""}>
                        {c.priority}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-destructive">{formatDate(c.targetClosureDate)}</TableCell>
                    <TableCell className="text-destructive font-medium">
                      {daysAgo(c.targetClosureDate)}d
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
