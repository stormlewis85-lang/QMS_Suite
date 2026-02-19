import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

export default function CapaTeamPerformance() {
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

  // Build team stats from createdBy field
  const teamStats: Record<string, { total: number; closed: number; onTime: number; totalCycle: number; closedCount: number }> = {};

  allCapas.forEach((c) => {
    const owner = c.createdBy || "Unknown";
    if (!teamStats[owner]) {
      teamStats[owner] = { total: 0, closed: 0, onTime: 0, totalCycle: 0, closedCount: 0 };
    }
    teamStats[owner].total++;
    if (c.status === "closed") {
      teamStats[owner].closed++;
      if (c.targetClosureDate && c.closedAt && new Date(c.closedAt) <= new Date(c.targetClosureDate)) {
        teamStats[owner].onTime++;
      }
      if (c.createdAt && c.closedAt) {
        const days = Math.round((new Date(c.closedAt).getTime() - new Date(c.createdAt).getTime()) / (1000 * 60 * 60 * 24));
        teamStats[owner].totalCycle += days;
        teamStats[owner].closedCount++;
      }
    }
  });

  const leaderboard = Object.entries(teamStats)
    .map(([name, stats]) => ({
      name,
      total: stats.total,
      closed: stats.closed,
      onTimeRate: stats.closed > 0 ? Math.round((stats.onTime / stats.closed) * 100) : 0,
      avgCycleTime: stats.closedCount > 0 ? Math.round(stats.totalCycle / stats.closedCount) : 0,
      open: stats.total - stats.closed,
    }))
    .sort((a, b) => b.closed - a.closed);

  const chartData = leaderboard.slice(0, 10).map((l) => ({
    name: l.name.length > 12 ? l.name.slice(0, 12) + "..." : l.name,
    closed: l.closed,
    open: l.open,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/capa/analytics">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Team Performance</h1>
          <p className="text-muted-foreground">CAPA team member metrics</p>
        </div>
      </div>

      {/* Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Leaderboard</CardTitle>
          <CardDescription>Ranked by CAPAs closed</CardDescription>
        </CardHeader>
        <CardContent>
          {leaderboard.length === 0 ? (
            <p className="text-sm text-muted-foreground">No team data available.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Rank</TableHead>
                  <TableHead>Team Member</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-center">Closed</TableHead>
                  <TableHead className="text-center">On-Time %</TableHead>
                  <TableHead className="text-center">Avg Days</TableHead>
                  <TableHead className="text-center">Open</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaderboard.map((member, i) => (
                  <TableRow key={member.name}>
                    <TableCell className="font-bold">
                      {i === 0 ? "1st" : i === 1 ? "2nd" : i === 2 ? "3rd" : `${i + 1}`}
                    </TableCell>
                    <TableCell className="font-medium">{member.name}</TableCell>
                    <TableCell className="text-center">{member.total}</TableCell>
                    <TableCell className="text-center font-bold text-green-600">{member.closed}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={member.onTimeRate >= 80 ? "default" : "destructive"}>
                        {member.onTimeRate}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">{member.avgCycleTime || "—"}</TableCell>
                    <TableCell className="text-center">{member.open}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">CAPAs by Team Member</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="name" width={100} fontSize={12} />
              <Tooltip />
              <Bar dataKey="closed" stackId="a" fill="#10b981" name="Closed" />
              <Bar dataKey="open" stackId="a" fill="#3b82f6" name="Open" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
