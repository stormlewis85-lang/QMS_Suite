import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

type AnalysisType = "source" | "priority" | "category" | "discipline";

export default function CapaPareto() {
  const [analysisType, setAnalysisType] = useState<AnalysisType>("source");

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

  // Build Pareto data based on analysis type
  const getField = (c: any) => {
    switch (analysisType) {
      case "source": return (c.sourceType || "unknown").replace(/_/g, " ");
      case "priority": return c.priority || "medium";
      case "category": return c.category || "uncategorized";
      case "discipline": return c.currentDiscipline || "D0";
    }
  };

  const counts: Record<string, number> = {};
  allCapas.forEach((c) => {
    const key = getField(c);
    counts[key] = (counts[key] || 0) + 1;
  });

  const sorted = Object.entries(counts)
    .sort((a, b) => b[1] - a[1]);

  const total = sorted.reduce((sum, [, count]) => sum + count, 0);
  let cumulative = 0;

  const paretoData = sorted.map(([name, count]) => {
    cumulative += count;
    return {
      name,
      count,
      cumulative: total > 0 ? Math.round((cumulative / total) * 100) : 0,
    };
  });

  // Find 80% line
  const eightyIndex = paretoData.findIndex((d) => d.cumulative >= 80);
  const vitalFew = eightyIndex >= 0 ? paretoData.slice(0, eightyIndex + 1) : paretoData;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/capa/analytics">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Pareto Analysis</h1>
            <p className="text-muted-foreground">Identify the vital few causes</p>
          </div>
        </div>
        <Select value={analysisType} onValueChange={(v) => setAnalysisType(v as AnalysisType)}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="source">By Source Type</SelectItem>
            <SelectItem value="priority">By Priority</SelectItem>
            <SelectItem value="category">By Category</SelectItem>
            <SelectItem value="discipline">By Discipline</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pareto Chart</CardTitle>
          <CardDescription>{allCapas.length} CAPAs analyzed by {analysisType}</CardDescription>
        </CardHeader>
        <CardContent>
          {paretoData.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No data available.</p>
          ) : (
            <ResponsiveContainer width="100%" height={350}>
              <ComposedChart data={paretoData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-30} textAnchor="end" height={80} fontSize={12} />
                <YAxis yAxisId="left" label={{ value: "Count", angle: -90, position: "insideLeft" }} />
                <YAxis yAxisId="right" orientation="right" domain={[0, 100]} label={{ value: "Cumulative %", angle: 90, position: "insideRight" }} />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="count" fill="#3b82f6" name="Count" />
                <Line yAxisId="right" dataKey="cumulative" stroke="#f97316" strokeWidth={2} name="Cumulative %" dot />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Key Findings</CardTitle>
        </CardHeader>
        <CardContent>
          {vitalFew.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm">
                Top {vitalFew.length} of {paretoData.length} categories account for{" "}
                <span className="font-bold">{vitalFew[vitalFew.length - 1]?.cumulative || 0}%</span> of all CAPAs.
              </p>
              <div className="space-y-1">
                {vitalFew.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-2 text-sm">
                    <span className="font-bold w-6">{i + 1}.</span>
                    <span className="capitalize flex-1">{d.name}</span>
                    <span className="font-mono">{d.count} ({Math.round((d.count / total) * 100)}%)</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No data to analyze.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
