import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import type { Part, ControlPlan, ControlPlanRow } from "@shared/schema";

interface ControlPlanWithDetails extends ControlPlan {
  rows: ControlPlanRow[];
  part: Part;
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

export default function ControlPlanDetail() {
  const params = useParams<{ id: string }>();

  const { data: controlPlan, isLoading } = useQuery<ControlPlanWithDetails>({
    queryKey: ["/api/control-plans", params.id],
    queryFn: async () => {
      const res = await fetch(`/api/control-plans/${params.id}`);
      if (!res.ok) throw new Error("Failed to fetch control plan");
      return res.json();
    },
    enabled: !!params.id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!controlPlan) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-muted-foreground">Control Plan not found</p>
        <Link href="/control-plans">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Control Plans
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/control-plans">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Control Plan Detail</h1>
            <p className="text-muted-foreground">
              Rev {controlPlan.rev} - {controlPlan.type}
            </p>
          </div>
        </div>
        {getStatusBadge(controlPlan.status)}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Part Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Part Number</p>
              <p className="font-medium">{controlPlan.part?.partNumber || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Part Name</p>
              <p className="font-medium">{controlPlan.part?.partName || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Customer</p>
              <p className="font-medium">{controlPlan.part?.customer || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Document No</p>
              <p className="font-medium">{controlPlan.docNo || "N/A"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Control Plan Rows ({controlPlan.rows.length})</CardTitle>
          <CardDescription>
            Quality control characteristics and methods
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Char ID</TableHead>
                <TableHead>Characteristic</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Tolerance</TableHead>
                <TableHead>Control Method</TableHead>
                <TableHead>Frequency</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {controlPlan.rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No control plan rows
                  </TableCell>
                </TableRow>
              ) : (
                controlPlan.rows.map((row) => (
                  <TableRow key={row.id} data-testid={`row-control-plan-${row.id}`}>
                    <TableCell className="font-mono">{row.charId}</TableCell>
                    <TableCell>{row.characteristicName}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{row.type}</Badge>
                    </TableCell>
                    <TableCell>{row.target || "-"}</TableCell>
                    <TableCell>{row.tolerance || "-"}</TableCell>
                    <TableCell>{row.controlMethod || "-"}</TableCell>
                    <TableCell>{row.frequency || "-"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
