import { useState, useEffect } from "react";
import { BookOpen, Plus, Loader2, ChevronLeft } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Part, ControlPlan, ControlPlanRow } from "@shared/schema";

type ControlPlanWithRows = ControlPlan & { rows: ControlPlanRow[] };

const controlPlanRowFormSchema = z.object({
  charId: z.string().min(1, "Characteristic ID is required"),
  characteristicName: z.string().min(1, "Characteristic name is required"),
  type: z.string().min(1, "Type is required"),
  target: z.string().optional(),
  tolerance: z.string().optional(),
  measurementSystem: z.string().optional(),
  gageDetails: z.string().optional(),
  sampleSize: z.string().optional(),
  frequency: z.string().optional(),
  controlMethod: z.string().optional(),
  acceptanceCriteria: z.string().optional(),
  reactionPlan: z.string().optional(),
  specialFlag: z.boolean().default(false),
  csrSymbol: z.string().optional(),
});

type ControlPlanRowFormValues = z.infer<typeof controlPlanRowFormSchema>;

function ControlPlanRowDialog({
  open,
  onOpenChange,
  planId,
  row,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string;
  row?: ControlPlanRow;
}) {
  const { toast } = useToast();
  const isEdit = !!row;

  const form = useForm<ControlPlanRowFormValues>({
    resolver: zodResolver(controlPlanRowFormSchema),
    defaultValues: {
      charId: row?.charId || "",
      characteristicName: row?.characteristicName || "",
      type: row?.type || "Product",
      target: row?.target || "",
      tolerance: row?.tolerance || "",
      measurementSystem: row?.measurementSystem || "",
      gageDetails: row?.gageDetails || "",
      sampleSize: row?.sampleSize || "",
      frequency: row?.frequency || "",
      controlMethod: row?.controlMethod || "",
      acceptanceCriteria: row?.acceptanceCriteria || "",
      reactionPlan: row?.reactionPlan || "",
      specialFlag: row?.specialFlag || false,
      csrSymbol: row?.csrSymbol || "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: ControlPlanRowFormValues) => {
      return apiRequest("POST", `/api/control-plans/${planId}/rows`, {
        ...values,
        controlPlanId: planId,
        overrideFlags: {},
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/control-plans", planId, "detail"] });
      toast({ title: "Control characteristic created successfully" });
      form.reset();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create control characteristic", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (values: ControlPlanRowFormValues) => {
      return apiRequest("PATCH", `/api/control-plan-rows/${row!.id}`, values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/control-plans", planId, "detail"] });
      toast({ title: "Control characteristic updated successfully" });
      form.reset();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update control characteristic", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (values: ControlPlanRowFormValues) => {
    if (isEdit) {
      updateMutation.mutate(values);
    } else {
      createMutation.mutate(values);
    }
  };

  useEffect(() => {
    if (open && row) {
      form.reset({
        charId: row.charId,
        characteristicName: row.characteristicName,
        type: row.type,
        target: row.target || "",
        tolerance: row.tolerance || "",
        measurementSystem: row.measurementSystem || "",
        gageDetails: row.gageDetails || "",
        sampleSize: row.sampleSize || "",
        frequency: row.frequency || "",
        controlMethod: row.controlMethod || "",
        acceptanceCriteria: row.acceptanceCriteria || "",
        reactionPlan: row.reactionPlan || "",
        specialFlag: row.specialFlag || false,
        csrSymbol: row.csrSymbol || "",
      });
    } else if (open && !row) {
      form.reset({
        charId: "",
        characteristicName: "",
        type: "Product",
        target: "",
        tolerance: "",
        measurementSystem: "",
        gageDetails: "",
        sampleSize: "",
        frequency: "",
        controlMethod: "",
        acceptanceCriteria: "",
        reactionPlan: "",
        specialFlag: false,
        csrSymbol: "",
      });
    }
  }, [open, row, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit" : "Add"} Control Characteristic</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="charId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Characteristic ID</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., C-010" data-testid="input-char-id" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger data-testid="select-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Product">Product</SelectItem>
                          <SelectItem value="Process">Process</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="characteristicName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Characteristic Name</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Describe the characteristic..." data-testid="input-characteristic-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="target"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target / Specification</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., 50.0 mm" data-testid="input-target" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tolerance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tolerance</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., ± 0.1 mm" data-testid="input-tolerance" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="measurementSystem"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Measurement Method</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., CMM, Caliper, Visual inspection" data-testid="input-measurement-system" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="gageDetails"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gage / Equipment Details</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., Digital caliper (0.01mm resolution)" data-testid="input-gage-details" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="sampleSize"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sample Size</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., 5 pieces, 100%" data-testid="input-sample-size" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="frequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Frequency</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., First/last, Every 2 hours" data-testid="input-frequency" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="controlMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Control Method</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="How is this characteristic controlled?" data-testid="input-control-method" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="acceptanceCriteria"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Acceptance Criteria</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., Within spec limits" data-testid="input-acceptance-criteria" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reactionPlan"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reaction Plan (Out of Spec)</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="What to do if out of specification..." data-testid="input-reaction-plan" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="csrSymbol"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CSR Symbol (optional)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., Ⓢ, ◆, ⓒ" data-testid="input-csr-symbol" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel">
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-row">
                {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isEdit ? "Update" : "Create"} Characteristic
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<ControlPlanRow | undefined>(undefined);

  const handleAddRow = () => {
    setEditingRow(undefined);
    setDialogOpen(true);
  };

  const handleEditRow = (row: ControlPlanRow) => {
    setEditingRow(row);
    setDialogOpen(true);
  };

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

  const specialChars = plan.rows.filter(r => r.csrSymbol).length;

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
          <Button onClick={handleAddRow} data-testid="button-add-characteristic">
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
                    <TableHead className="min-w-24">Char ID</TableHead>
                    <TableHead className="min-w-48">Characteristic</TableHead>
                    <TableHead className="min-w-32">Target ± Tol</TableHead>
                    <TableHead className="min-w-24">Method</TableHead>
                    <TableHead className="min-w-32">Measurement</TableHead>
                    <TableHead className="min-w-24">Sample Size</TableHead>
                    <TableHead className="min-w-24">Frequency</TableHead>
                    <TableHead className="min-w-20">CSR</TableHead>
                    <TableHead className="min-w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plan.rows.map((row) => (
                    <TableRow key={row.id} className="hover-elevate" data-testid={`row-characteristic-${row.id}`}>
                      <TableCell className="font-mono text-sm">{row.charId}</TableCell>
                      <TableCell className="text-sm">{row.characteristicName}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {row.target ? `${row.target}${row.tolerance ? ` ± ${row.tolerance}` : ''}` : '-'}
                      </TableCell>
                      <TableCell className="text-sm">{row.controlMethod || "-"}</TableCell>
                      <TableCell className="text-sm">{row.measurementSystem || "-"}</TableCell>
                      <TableCell className="font-mono text-center">{row.sampleSize || "-"}</TableCell>
                      <TableCell className="text-sm">{row.frequency || "-"}</TableCell>
                      <TableCell className="text-center">
                        {row.csrSymbol ? (
                          <Badge className="bg-chart-5 text-white">{row.csrSymbol}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" onClick={() => handleEditRow(row)} data-testid={`button-edit-characteristic-${row.id}`}>
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

      <ControlPlanRowDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        planId={plan.id}
        row={editingRow}
      />
    </div>
  );
}
