import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowLeft, Loader2, Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function CapaReports() {
  const { toast } = useToast();
  const [reportType, setReportType] = useState("summary");
  const [format, setFormat] = useState("json");

  const { data: capas } = useQuery<any[]>({
    queryKey: ["/api/capas"],
  });

  const exportMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("GET", `/api/capas/export?format=${format}`);
      const data = await res.json();
      // Create downloadable
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `capa-export-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    },
    onSuccess: () => {
      toast({ title: "Export complete", description: "File downloaded successfully." });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Export failed", description: error.message });
    },
  });

  const allCapas = capas || [];
  const openCount = allCapas.filter((c) => !["closed", "cancelled"].includes(c.status)).length;
  const closedCount = allCapas.filter((c) => c.status === "closed").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/capa/analytics">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">CAPA Reports & Export</h1>
          <p className="text-muted-foreground">Generate reports and export data</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Export Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Export CAPA Data</CardTitle>
            <CardDescription>Download CAPA data in various formats</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Format</Label>
              <Select value={format} onValueChange={setFormat}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="json">JSON</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="p-3 bg-muted rounded-lg text-sm">
              <p><span className="font-medium">{allCapas.length}</span> CAPAs will be exported</p>
              <p className="text-muted-foreground">{openCount} open, {closedCount} closed</p>
            </div>
            <Button onClick={() => exportMutation.mutate()} disabled={exportMutation.isPending} className="w-full">
              {exportMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
              Export Data
            </Button>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Summary</CardTitle>
            <CardDescription>Current CAPA status overview</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Total CAPAs</span>
                <Badge variant="secondary">{allCapas.length}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Open</span>
                <Badge>{openCount}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Closed</span>
                <Badge className="bg-green-500 text-white">{closedCount}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">By Priority</span>
                <div className="flex gap-1">
                  {["critical", "high", "medium", "low"].map((p) => (
                    <Badge key={p} variant="outline" className="text-[10px]">
                      {p.charAt(0).toUpperCase()}: {allCapas.filter((c) => c.priority === p).length}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Report Navigation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Analysis Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            <Link href="/capa/analytics">
              <Button variant="outline" className="w-full h-auto py-4 flex-col">
                <FileText className="h-6 w-6 mb-2" />
                <span>Analytics Dashboard</span>
                <span className="text-xs text-muted-foreground">Overview charts and metrics</span>
              </Button>
            </Link>
            <Link href="/capa/analytics/pareto">
              <Button variant="outline" className="w-full h-auto py-4 flex-col">
                <FileText className="h-6 w-6 mb-2" />
                <span>Pareto Analysis</span>
                <span className="text-xs text-muted-foreground">Identify vital few causes</span>
              </Button>
            </Link>
            <Link href="/capa/analytics/trends">
              <Button variant="outline" className="w-full h-auto py-4 flex-col">
                <FileText className="h-6 w-6 mb-2" />
                <span>Trend Analysis</span>
                <span className="text-xs text-muted-foreground">Track metrics over time</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
