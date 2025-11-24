import { useState } from "react";
import { BookOpen, Plus, Loader2, ChevronLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Part, ControlPlan, ControlPlanRow } from "@shared/schema";

type ControlPlanWithRows = ControlPlan & { rows: ControlPlanRow[] };

export default function ControlPlans() {
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  const { data: parts = [], isLoading: partsLoading } = useQuery<Part[]>({
    queryKey: ["/api/parts"],
  });

  const { data: plans = [], isLoading: plansLoading } = useQuery<ControlPlan[]>({
    queryKey: ["/api/control-plans", selectedPartId],
    enabled: !!selectedPartId,
    queryFn: async () => {
      const res = await fetch(`/api/control-plans?partId=${selectedPartId}`);
      if (!res.ok) throw new Error("Failed to fetch control plans");
      return res.json();
    },
  });

  const { data: planDetail, isLoading: planDetailLoading } = useQuery<ControlPlanWithRows>({
    queryKey: ["/api/control-plans", selectedPlanId, "detail"],
    enabled: !!selectedPlanId,
    queryFn: async () => {
      const res = await fetch(`/api/control-plans/${selectedPlanId}`);
      if (!res.ok) throw new Error("Failed to fetch control plan details");
      return res.json();
    },
  });

  const selectedPart = parts.find(p => p.id === selectedPartId);

  if (selectedPlanId) {
    return <ControlPlanDetailView plan={planDetail} part={selectedPart!} onBack={() => setSelectedPlanId(null)} loading={planDetailLoading} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Control Plans</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Quality control plans with inspection characteristics
          </p>
        </div>
        <Button data-testid="button-generate-control-plan">
          <Plus className="h-4 w-4 mr-2" />
          Generate Control Plan
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Select Part</CardTitle>
        </CardHeader>
        <CardContent>
          {partsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <Select value={selectedPartId || ""} onValueChange={setSelectedPartId}>
              <SelectTrigger data-testid="select-part">
                <SelectValue placeholder="Choose a part..." />
              </SelectTrigger>
              <SelectContent>
                {parts.map((part) => (
                  <SelectItem key={part.id} value={part.id}>
                    {part.partNumber} - {part.partName} ({part.customer})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      {selectedPartId && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Control Plans for {selectedPart?.partNumber}</CardTitle>
            <Button data-testid="button-create-control-plan">
              <Plus className="h-4 w-4 mr-2" />
              Create Plan
            </Button>
          </CardHeader>
          <CardContent>
            {plansLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : plans.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No control plans found for this part. Click "Create Plan" to generate one.
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Revision</TableHead>
                      <TableHead>Document No.</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Effective From</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plans.map((plan) => (
                      <TableRow key={plan.id} className="hover-elevate" data-testid={`row-control-plan-${plan.id}`}>
                        <TableCell className="font-mono font-medium">{plan.rev}</TableCell>
                        <TableCell className="font-mono">{plan.docNo || "-"}</TableCell>
                        <TableCell>
                          <StatusBadge status={plan.status} />
                        </TableCell>
                        <TableCell>
                          {plan.effectiveFrom ? new Date(plan.effectiveFrom).toLocaleDateString() : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedPlanId(plan.id)}
                            data-testid={`button-view-plan-${plan.id}`}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ControlPlanDetailView({ plan, part, onBack, loading }: {
  plan?: ControlPlanWithRows;
  part: Part;
  onBack: () => void;
  loading: boolean;
}) {
  if (loading || !plan) {
    return (
      <div className="space-y-6">
        <Button variant="outline" size="sm" onClick={onBack} data-testid="button-back">
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-12 w-12 animate-spin" />
        </div>
      </div>
    );
  }

  const specialChars = plan.rows.filter(r => r.specialChar && r.specialChar !== "none").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={onBack} data-testid="button-back">
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold">
            Control Plan: {part.partNumber} Rev {plan.rev}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {part.partName} - {part.customer}
          </p>
        </div>
        <StatusBadge status={plan.status} />
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Document No.</p>
            <p className="text-lg font-semibold mt-1">{plan.docNo || "N/A"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Effective From</p>
            <p className="text-lg font-semibold mt-1">
              {plan.effectiveFrom ? new Date(plan.effectiveFrom).toLocaleDateString() : "N/A"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Characteristics</p>
            <p className="text-lg font-semibold mt-1">{plan.rows.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Special Characteristics</p>
            <p className="text-lg font-semibold mt-1 text-chart-5">{specialChars}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Control Characteristics</CardTitle>
          <Button data-testid="button-add-characteristic">
            <Plus className="h-4 w-4 mr-2" />
            Add Characteristic
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : plan.rows.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No control characteristics yet. Click "Add Characteristic" to create one.
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-24">Step</TableHead>
                    <TableHead className="min-w-48">Characteristic</TableHead>
                    <TableHead className="min-w-32">Specification</TableHead>
                    <TableHead className="min-w-24">Method</TableHead>
                    <TableHead className="min-w-32">Measurement</TableHead>
                    <TableHead className="min-w-24">Sample Size</TableHead>
                    <TableHead className="min-w-24">Frequency</TableHead>
                    <TableHead className="min-w-20">Special</TableHead>
                    <TableHead className="min-w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plan.rows.map((row) => (
                    <TableRow key={row.id} className="hover-elevate" data-testid={`row-characteristic-${row.id}`}>
                      <TableCell className="font-mono text-sm">{row.stepRef}</TableCell>
                      <TableCell className="text-sm">{row.characteristic}</TableCell>
                      <TableCell className="font-mono text-sm">{row.specification}</TableCell>
                      <TableCell className="text-sm">{row.controlMethod}</TableCell>
                      <TableCell className="text-sm">{row.measurementTechnique || "-"}</TableCell>
                      <TableCell className="font-mono text-center">{row.sampleSize || "-"}</TableCell>
                      <TableCell className="text-sm">{row.samplingFrequency || "-"}</TableCell>
                      <TableCell className="text-center">
                        {row.specialChar && row.specialChar !== "none" ? (
                          <Badge className="bg-chart-5 text-white">{row.specialChar}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" data-testid={`button-edit-characteristic-${row.id}`}>
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
