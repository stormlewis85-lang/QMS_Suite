import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { z } from "zod";
import type {
  ControlTemplateRow,
  InsertControlTemplateRow,
  FmeaTemplateRow,
  ProcessStep,
} from "@shared/schema";

const controlTemplateRowFormSchema = z.object({
  charId: z.string().min(1, "Characteristic ID is required"),
  characteristicName: z.string().min(1, "Characteristic name is required"),
  type: z.enum(["Product", "Process"]),
  specialFlag: z.boolean().default(false),
  csrSymbol: z.string().nullable().optional(),
  target: z.string().nullable().optional(),
  tolerance: z.string().nullable().optional(),
  measurementSystem: z.string().nullable().optional(),
  gageDetails: z.string().nullable().optional(),
  defaultSampleSize: z.string().nullable().optional(),
  defaultFrequency: z.string().nullable().optional(),
  controlMethod: z.string().nullable().optional(),
  acceptanceCriteria: z.string().nullable().optional(),
  reactionPlan: z.string().nullable().optional(),
  sourceTemplateRowId: z.string().nullable().optional(),
});

type FormData = z.infer<typeof controlTemplateRowFormSchema>;

interface ControlTemplateRowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit" | "view";
  row: ControlTemplateRow | null;
  processId: string;
  fmeaRows: FmeaTemplateRow[];
  steps: ProcessStep[];
  onSubmit: (data: InsertControlTemplateRow) => void;
  isSubmitting?: boolean;
}

export default function ControlTemplateRowDialog({
  open,
  onOpenChange,
  mode,
  row,
  processId,
  fmeaRows,
  steps,
  onSubmit,
  isSubmitting = false,
}: ControlTemplateRowDialogProps) {
  const isViewMode = mode === "view";
  
  const form = useForm<FormData>({
    resolver: zodResolver(controlTemplateRowFormSchema),
    defaultValues: {
      charId: "",
      characteristicName: "",
      type: "Product",
      specialFlag: false,
      csrSymbol: null,
      target: null,
      tolerance: null,
      measurementSystem: null,
      gageDetails: null,
      defaultSampleSize: null,
      defaultFrequency: null,
      controlMethod: null,
      acceptanceCriteria: null,
      reactionPlan: null,
      sourceTemplateRowId: null,
    },
  });

  useEffect(() => {
    if (row) {
      form.reset({
        charId: row.charId,
        characteristicName: row.characteristicName,
        type: row.type as "Product" | "Process",
        specialFlag: row.specialFlag,
        csrSymbol: row.csrSymbol,
        target: row.target,
        tolerance: row.tolerance,
        measurementSystem: row.measurementSystem,
        gageDetails: row.gageDetails,
        defaultSampleSize: row.defaultSampleSize,
        defaultFrequency: row.defaultFrequency,
        controlMethod: row.controlMethod,
        acceptanceCriteria: row.acceptanceCriteria,
        reactionPlan: row.reactionPlan,
        sourceTemplateRowId: row.sourceTemplateRowId,
      });
    } else {
      form.reset({
        charId: "",
        characteristicName: "",
        type: "Product",
        specialFlag: false,
        csrSymbol: null,
        target: null,
        tolerance: null,
        measurementSystem: null,
        gageDetails: null,
        defaultSampleSize: null,
        defaultFrequency: null,
        controlMethod: null,
        acceptanceCriteria: null,
        reactionPlan: null,
        sourceTemplateRowId: null,
      });
    }
  }, [row, form]);

  const handleSubmit = (data: FormData) => {
    onSubmit(data as InsertControlTemplateRow);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" && "Add Control Characteristic"}
            {mode === "edit" && "Edit Control Characteristic"}
            {mode === "view" && "View Control Characteristic"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create" && "Define a new control plan characteristic"}
            {mode === "edit" && "Update the control plan characteristic"}
            {mode === "view" && "Control plan characteristic details"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="charId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Characteristic ID</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={isViewMode} placeholder="e.g., CHAR-001" data-testid="input-char-id" />
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
                    <Select
                      disabled={isViewMode}
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Product">Product</SelectItem>
                        <SelectItem value="Process">Process</SelectItem>
                      </SelectContent>
                    </Select>
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
                    <Input {...field} disabled={isViewMode} placeholder="Description of the characteristic" data-testid="input-characteristic-name" />
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
                    <FormLabel>Target Value</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} disabled={isViewMode} placeholder="e.g., 10.0 mm" data-testid="input-target" />
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
                      <Input {...field} value={field.value || ""} disabled={isViewMode} placeholder="e.g., ±0.1 mm" data-testid="input-tolerance" />
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
                  <FormLabel>Measurement System</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ""} disabled={isViewMode} placeholder="e.g., Caliper, CMM, Visual" data-testid="input-measurement-system" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="defaultSampleSize"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sample Size</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} disabled={isViewMode} placeholder="e.g., 5 pcs" data-testid="input-sample-size" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="defaultFrequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sample Frequency</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} disabled={isViewMode} placeholder="e.g., Every 2 hours" data-testid="input-sample-frequency" />
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
                    <Textarea {...field} value={field.value || ""} disabled={isViewMode} placeholder="How the characteristic is controlled" data-testid="input-control-method" />
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
                  <FormLabel>Reaction Plan</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value || ""} disabled={isViewMode} placeholder="Actions when out of spec" data-testid="input-reaction-plan" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sourceTemplateRowId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Link to FMEA Row (Optional)</FormLabel>
                  <Select
                    disabled={isViewMode}
                    onValueChange={field.onChange}
                    value={field.value || "none"}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-fmea-link">
                        <SelectValue placeholder="Select FMEA row to link" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">None (Standalone)</SelectItem>
                      {fmeaRows.map((fmeaRow) => (
                        <SelectItem key={fmeaRow.id} value={fmeaRow.id}>
                          {fmeaRow.failureMode}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Link this control to an FMEA failure mode
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
              <FormField
                control={form.control}
                name="specialFlag"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isViewMode}
                        data-testid="switch-special-flag"
                      />
                    </FormControl>
                    <Label>Special Characteristic</Label>
                  </FormItem>
                )}
              />

              {form.watch("specialFlag") && (
                <FormField
                  control={form.control}
                  name="csrSymbol"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <Select
                        disabled={isViewMode}
                        onValueChange={field.onChange}
                        value={field.value || ""}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-csr-symbol">
                            <SelectValue placeholder="CSR Symbol" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Ⓢ">Ⓢ Safety</SelectItem>
                          <SelectItem value="◆">◆ Critical</SelectItem>
                          <SelectItem value="ⓒ">ⓒ Compliance</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel"
              >
                {isViewMode ? "Close" : "Cancel"}
              </Button>
              {!isViewMode && (
                <Button type="submit" disabled={isSubmitting} data-testid="button-submit">
                  {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {mode === "create" ? "Create" : "Save Changes"}
                </Button>
              )}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
