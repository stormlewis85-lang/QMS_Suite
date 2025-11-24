import { Package, FileText, AlertTriangle, Layers, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { MetricCard } from "@/components/MetricCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import type { Part, ProcessDef } from "@shared/schema";

export default function Dashboard() {
  const { data: parts = [], isLoading: partsLoading } = useQuery<Part[]>({
    queryKey: ["/api/parts"],
  });

  const { data: processes = [], isLoading: processesLoading } = useQuery<ProcessDef[]>({
    queryKey: ["/api/processes"],
  });

  const isLoading = partsLoading || processesLoading;

  const effectiveProcesses = processes.filter(p => p.status === "effective").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Overview of your PFMEA activities
          </p>
        </div>
        <Button data-testid="button-new-part">
          <Package className="h-4 w-4 mr-2" />
          New Part
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <MetricCard
              title="Total Parts"
              value={parts.length}
              icon={Package}
            />
            <MetricCard
              title="Total Processes"
              value={processes.length}
              icon={Layers}
            />
            <MetricCard
              title="Effective Processes"
              value={effectiveProcesses}
              icon={FileText}
            />
            <MetricCard
              title="Draft Processes"
              value={processes.filter(p => p.status === "draft").length}
              icon={AlertTriangle}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-medium">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Parts</span>
                  <span className="text-sm font-semibold">{parts.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Process Definitions</span>
                  <span className="text-sm font-semibold">{processes.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Effective Processes</span>
                  <span className="text-sm font-semibold">{effectiveProcesses}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">In Review</span>
                  <span className="text-sm font-semibold">{processes.filter(p => p.status === "review").length}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
