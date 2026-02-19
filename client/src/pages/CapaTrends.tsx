import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
} from "recharts";

export default function CapaTrends() {
  const [period, setPeriod] = useState("monthly");

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

  // Group by month
  const monthGroups: Record<string, { opened: number; closed: number }> = {};

  // Generate last 12 months
  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthGroups[key] = { opened: 0, closed: 0 };
  }

  allCapas.forEach((c) => {
    if (c.createdAt) {
      const d = new Date(c.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (monthGroups[key]) monthGroups[key].opened++;
    }
    if (c.closedAt) {
      const d = new Date(c.closedAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (monthGroups[key]) monthGroups[key].closed++;
    }
  });

  const trendData = Object.entries(monthGroups).map(([month, data]) => ({
    month: new Date(month + "-01").toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
    ...data,
  }));

  // Calculate stats
  const totalOpened = trendData.reduce((s, d) => s + d.opened, 0);
  const totalClosed = trendData.reduce((s, d) => s + d.closed, 0);
  const avgOpened = trendData.length > 0 ? Math.round(totalOpened / trendData.length) : 0;
  const avgClosed = trendData.length > 0 ? Math.round(totalClosed / trendData.length) : 0;

  // Cycle time by month
  const cycleData = Object.entries(monthGroups).map(([month]) => {
    const monthCapas = allCapas.filter((c) => {
      if (!c.closedAt) return false;
      const d = new Date(c.closedAt);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` === month;
    });
    const times = monthCapas
      .filter((c) => c.createdAt && c.closedAt)
      .map((c) => Math.round((new Date(c.closedAt).getTime() - new Date(c.createdAt).getTime()) / (1000 * 60 * 60 * 24)));
    const avg = times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;
    return {
      month: new Date(month + "-01").toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      cycleTime: avg,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/capa/analytics">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Trend Analysis</h1>
            <p className="text-muted-foreground">Track CAPA metrics over time</p>
          </div>
        </div>
      </div>

      {/* Opened vs Closed */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Opened vs Closed</CardTitle>
          <CardDescription>Last 12 months trend</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="opened" stroke="#3b82f6" strokeWidth={2} name="Opened" />
              <Line type="monotone" dataKey="closed" stroke="#10b981" strokeWidth={2} name="Closed" />
              <ReferenceLine y={avgOpened} stroke="#3b82f6" strokeDasharray="3 3" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Cycle Time Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Average Cycle Time</CardTitle>
          <CardDescription>Days from open to close</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={cycleData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis label={{ value: "Days", angle: -90, position: "insideLeft" }} />
              <Tooltip />
              <Line type="monotone" dataKey="cycleTime" stroke="#8b5cf6" strokeWidth={2} name="Avg Cycle Time" dot />
              <ReferenceLine y={30} stroke="#ef4444" strokeDasharray="3 3" label="Target" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <Card>
        <CardHeader><CardTitle className="text-base">Summary</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold">{totalOpened}</div>
              <div className="text-xs text-muted-foreground">Total Opened (12mo)</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">{totalClosed}</div>
              <div className="text-xs text-muted-foreground">Total Closed (12mo)</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold">{avgOpened}/mo</div>
              <div className="text-xs text-muted-foreground">Avg Opened</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold">{avgClosed}/mo</div>
              <div className="text-xs text-muted-foreground">Avg Closed</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
