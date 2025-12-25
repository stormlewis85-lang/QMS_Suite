import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type {
  ProcessStep,
  FmeaTemplateRow,
  InsertFmeaTemplateRow,
  FailureModesLibrary,
  ControlsLibrary,
} from "@shared/schema";
import { z } from "zod";

interface FMEATemplateRowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  processId: string;
  steps: ProcessStep[];
  row?: FmeaTemplateRow | null;
  failureModes?: FailureModesLibrary[];
  controls?: ControlsLibrary[];
}

function APBadge({ ap }: { ap: string }) {
  const bgClass =
    ap === "H"
      ? "bg-red-100 text-red-800 border-red-200"
      : ap === "M"
      ? "bg-yellow-100 text-yellow-800 border-yellow-200"
      : "bg-green-100 text-green-800 border-green-200";

  return (
    <Badge className={`font-bold text-sm px-3 py-1 ${bgClass}`} variant="outline">
      {ap}
    </Badge>
  );
}

function calculateAP(severity: number, occurrence: number, detection: number): string {
  const score = severity * (occurrence + detection);
  if (score >= 100) return "H";
  if (score >= 50) return "M";
  return "L";
}

const formSchema = z.object({
  processDefId: z.string().uuid(),
  stepId: z.string().uuid(),
  function: z.string().min(1, "Function is required"),
  requirement: z.string().min(1, "Requirement is required"),
  failureMode: z.string().min(1, "Failure mode is required"),
  effect: z.string().min(1, "Effect is required"),
  severity: z.number().min(1).max(10),
  cause: z.string().min(1, "Cause is required"),
  occurrence: z.number().min(1).max(10),
  preventionControls: z.array(z.string()).default([]),
  detectionControls: z.array(z.string()).default([]),
  detection: z.number().min(1).max(10),
  ap: z.string(),
  specialFlag: z.boolean().default(false),
  csrSymbol: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

type FormValues = z.infer<typeof formSchema>;

export default function FMEATemplateRowDialog({
  open,
  onOpenChange,
  processId,
  steps,
  row,
  failureModes = [],
  controls = [],
}: FMEATemplateRowDialogProps) {
  const { toast } = useToast();
  const isEditing = !!row;
  const [preventionText, setPreventionText] = useState(row?.preventionControls?.join(", ") || "");
  const [detectionText, setDetectionText] = useState(row?.detectionControls?.join(", ") || "");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      processDefId: processId,
      stepId: row?.stepId || (steps[0]?.id || ""),
      function: row?.function || "",
      requirement: row?.requirement || "",
      failureMode: row?.failureMode || "",
      effect: row?.effect || "",
      severity: row?.severity || 5,
      cause: row?.cause || "",
      occurrence: row?.occurrence || 5,
      preventionControls: row?.preventionControls || [],
      detectionControls: row?.detectionControls || [],
      detection: row?.detection || 5,
      ap: row?.ap || "M",
      specialFlag: row?.specialFlag || false,
      csrSymbol: row?.csrSymbol || "",
      notes: row?.notes || "",
    },
  });

  useEffect(() => {
    if (row) {
      form.reset({
        processDefId: processId,
        stepId: row.stepId,
        function: row.function,
        requirement: row.requirement,
        failureMode: row.failureMode,
        effect: row.effect,
        severity: row.severity,
        cause: row.cause,
        occurrence: row.occurrence,
        preventionControls: row.preventionControls || [],
        detectionControls: row.detectionControls || [],
        detection: row.detection,
        ap: row.ap,
        specialFlag: row.specialFlag || false,
        csrSymbol: row.csrSymbol || "",
        notes: row.notes || "",
      });
      setPreventionText(row.preventionControls?.join(", ") || "");
      setDetectionText(row.detectionControls?.join(", ") || "");
    } else {
      form.reset({
        processDefId: processId,
        stepId: steps[0]?.id || "",
        function: "",
        requirement: "",
        failureMode: "",
        effect: "",
        severity: 5,
        cause: "",
        occurrence: 5,
        preventionControls: [],
        detectionControls: [],
        detection: 5,
        ap: "M",
        specialFlag: false,
        csrSymbol: "",
        notes: "",
      });
      setPreventionText("");
      setDetectionText("");
    }
  }, [row, open, processId, steps, form]);

  const createMutation = useMutation({
    mutationFn: async (data: InsertFmeaTemplateRow) => {
      const res = await apiRequest("POST", `/api/processes/${processId}/fmea-template-rows`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/processes/${processId}/fmea-template-rows`] });
      toast({ title: "Success", description: "FMEA template row created" });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<InsertFmeaTemplateRow>) => {
      const res = await apiRequest("PATCH", `/api/fmea-template-rows/${row?.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/processes/${processId}/fmea-template-rows`] });
      toast({ title: "Success", description: "FMEA template row updated" });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const severity = form.watch("severity");
  const occurrence = form.watch("occurrence");
  const detection = form.watch("detection");
  const calculatedAP = calculateAP(severity, occurrence, detection);

  const handleSubmit = (data: FormValues) => {
    const preventionControls = preventionText.split(",").map(s => s.trim()).filter(Boolean);
    const detectionControls = detectionText.split(",").map(s => s.trim()).filter(Boolean);
    
    const submitData: InsertFmeaTemplateRow = {
      ...data,
      processDefId: processId,
      preventionControls,
      detectionControls,
      ap: calculatedAP,
    };

    if (isEditing) {
      updateMutation.mutate(submitData);
    } else {
      createMutation.mutate(submitData);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit FMEA Template Row" : "Add FMEA Template Row"}</DialogTitle>
          <DialogDescription>
            Define failure mode, effects, causes, and controls
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Step Selection */}
            <FormField
              control={form.control}
              name="stepId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Process Step*</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select step" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {steps.map((step) => (
                        <SelectItem key={step.id} value={step.id}>
                          {step.seq}: {step.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Function and Requirement */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="function"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Function*</FormLabel>
                    <FormControl>
                      <Input placeholder="Process function" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="requirement"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Requirement*</FormLabel>
                    <FormControl>
                      <Input placeholder="Process requirement" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Failure Mode and Effect */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="failureMode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Failure Mode*</FormLabel>
                    <FormControl>
                      <Input placeholder="Potential failure mode" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="effect"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Effect*</FormLabel>
                    <FormControl>
                      <Input placeholder="Effect of failure" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Severity and Cause */}
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="severity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Severity (1-10)*</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cause"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Cause*</FormLabel>
                    <FormControl>
                      <Input placeholder="Potential cause of failure" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Occurrence and Prevention Controls */}
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="occurrence"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Occurrence (1-10)*</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="col-span-2">
                <FormItem>
                  <FormLabel>Prevention Controls (comma-separated)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Control 1, Control 2, ..."
                      value={preventionText}
                      onChange={(e) => setPreventionText(e.target.value)}
                    />
                  </FormControl>
                </FormItem>
              </div>
            </div>

            {/* Detection and Detection Controls */}
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="detection"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Detection (1-10)*</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="col-span-2">
                <FormItem>
                  <FormLabel>Detection Controls (comma-separated)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Control 1, Control 2, ..."
                      value={detectionText}
                      onChange={(e) => setDetectionText(e.target.value)}
                    />
                  </FormControl>
                </FormItem>
              </div>
            </div>

            {/* Special Characteristics */}
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="specialFlag"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 pt-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Special Characteristic</FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="csrSymbol"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CSR Symbol</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select symbol" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Ⓢ">Ⓢ - Safety</SelectItem>
                        <SelectItem value="◆">◆ - Critical</SelectItem>
                        <SelectItem value="ⓒ">ⓒ - Compliance</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex items-end gap-4">
                <div className="flex items-center gap-2 p-3 rounded-md bg-muted">
                  <span className="text-sm font-medium">Calculated AP:</span>
                  <APBadge ap={calculatedAP} />
                  <span className="text-xs text-muted-foreground">
                    ({severity} × ({occurrence} + {detection}) ={" "}
                    {severity * (occurrence + detection)})
                  </span>
                </div>
              </div>
            </div>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional notes..."
                      rows={2}
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
