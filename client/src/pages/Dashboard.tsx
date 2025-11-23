import { Package, FileText, AlertTriangle, Layers, TrendingUp } from "lucide-react";
import { MetricCard } from "@/components/MetricCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";

//todo: remove mock functionality
const recentActivity = [
  { id: 1, part: "WHL-2024-001", action: "PFMEA Generated", status: "effective" as const, time: "2 hours ago" },
  { id: 2, part: "BRK-2024-007", action: "Control Plan Updated", status: "review" as const, time: "4 hours ago" },
  { id: 3, part: "ENG-2024-012", action: "Process Revised", status: "draft" as const, time: "Yesterday" },
];

export default function Dashboard() {
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

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          title="Active Parts"
          value={24}
          icon={Package}
          trend={{ value: "+3 this month", isPositive: true }}
        />
        <MetricCard
          title="PFMEAs Generated"
          value={47}
          icon={FileText}
          trend={{ value: "+12 this week", isPositive: true }}
        />
        <MetricCard
          title="High Priority Items"
          value={8}
          icon={AlertTriangle}
          trend={{ value: "-2 resolved", isPositive: true }}
        />
        <MetricCard
          title="Active Processes"
          value={15}
          icon={Layers}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivity.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-md border hover-elevate"
                  data-testid={`activity-${item.id}`}
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-medium">{item.part}</span>
                      <StatusBadge status={item.status} />
                    </div>
                    <span className="text-sm text-muted-foreground">{item.action}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{item.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">Quick Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">AIAG-VDA Compliance</span>
                <span className="text-sm font-semibold">100%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Avg. AP Score</span>
                <span className="text-sm font-semibold font-mono">45.2</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Control Plans Active</span>
                <span className="text-sm font-semibold">31</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Processes in Library</span>
                <span className="text-sm font-semibold">15</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
