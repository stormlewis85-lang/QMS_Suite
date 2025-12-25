import { useEffect, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import {
  Plus,
  Loader2,
  Info,
  AlertTriangle,
  Search,
  X,
  BookOpen,
  Shield,
  Lightbulb,
  CheckCircle,
} from "lucide-react";
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { z } from "zod";
import type {
  ProcessStep,
  FmeaTemplateRow,
  InsertFmeaTemplateRow,
  FailureModesLibrary,
  ControlsLibrary,
} from "@shared/schema";
import { insertFmeaTemplateRowSchema } from "@shared/schema";

// Extended schema with validation
const fmeaTemplateRowFormSchema = z.object({
  stepId: z.string().uuid("Please select a process step"),
  function: z.string().min(1, "Function is required").max(500),
  requirement: z.string().min(1, "Requirement is required").max(500),
  failureMode: z.string().min(1, "Failure mode is required").max(500),
  effect: z.string().min(1, "Effect is required").max(500),
  severity: z.number().min(1).max(10),
  cause: z.string().min(1, "Cause is required").max(500),
  occurrence: z.number().min(1).max(10),
  preventionControls: z.array(z.string()).default([]),
  detectionControls: z.array(z.string()).default([]),
  detection: z.number().min(1).max(10),
  specialFlag: z.boolean().default(false),
  csrSymbol: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

type FormData = z.infer<typeof fmeaTemplateRowFormSchema>;

// AIAG-VDA 2019 Rating Scales
const SEVERITY_SCALE = [
  { rating: 10, description: "Hazardous - No Warning", criteria: "Very high severity with no warning" },
  { rating: 9, description: "Hazardous - With Warning", criteria: "Very high severity with warning" },
  { rating: 8, description: "Very High", criteria: "Vehicle/item inoperable, loss of primary function" },
  { rating: 7, description: "High", criteria: "Vehicle operable, reduced performance level" },
  { rating: 6, description: "Moderate", criteria: "Vehicle operable with significant degradation" },
  { rating: 5, description: "Low", criteria: "Moderate effect on vehicle performance" },
  { rating: 4, description: "Very Low", criteria: "Minor effect on vehicle performance" },
  { rating: 3, description: "Minor", criteria: "Noticed by most customers (>75%)" },
  { rating: 2, description: "Very Minor", criteria: "Noticed by discriminating customers (50%)" },
  { rating: 1, description: "None", criteria: "No discernible effect" },
];

const OCCURRENCE_SCALE = [
  { rating: 10, description: "Very High", criteria: "≥1 in 2 (Cpk < 0.33)" },
  { rating: 9, description: "Very High", criteria: "1 in 3 (Cpk ≥ 0.33)" },
  { rating: 8, description: "High", criteria: "1 in 8 (Cpk ≥ 0.51)" },
  { rating: 7, description: "High", criteria: "1 in 20 (Cpk ≥ 0.67)" },
  { rating: 6, description: "Moderate", criteria: "1 in 80 (Cpk ≥ 0.83)" },
  { rating: 5, description: "Moderate", criteria: "1 in 400 (Cpk ≥ 1.00)" },
  { rating: 4, description: "Moderate", criteria: "1 in 2,000 (Cpk ≥ 1.17)" },
  { rating: 3, description: "Low", criteria: "1 in 15,000 (Cpk ≥ 1.33)" },
  { rating: 2, description: "Remote", criteria: "1 in 150,000 (Cpk ≥ 1.50)" },
  { rating: 1, description: "Remote", criteria: "<1 in 1,500,000 (Cpk ≥ 1.67)" },
];

const DETECTION_SCALE = [
  { rating: 10, description: "Absolute Uncertainty", criteria: "No detection capability" },
  { rating: 9, description: "Very Remote", criteria: "Very low detection probability" },
  { rating: 8, description: "Remote", criteria: "Low detection probability" },
  { rating: 7, description: "Very Low", criteria: "Very low detection capability" },
  { rating: 6, description: "Low", criteria: "Low detection capability" },
  { rating: 5, description: "Moderate", criteria: "Moderate detection capability" },
  { rating: 4, description: "Moderately High", criteria: "Moderately high detection" },
  { rating: 3, description: "High", criteria: "High detection capability" },
  { rating: 2, description: "Very High", criteria: "Very high detection" },
  { rating: 1, description: "Almost Certain", criteria: "Detection almost certain" },
];

// Calculate Action Priority based on AIAG-VDA 2019
function calculateAP(S: number, O: number, D: number): { ap: "H" | "M" | "L"; reason: string } {
  // HIGH: S >= 9 regardless of O or D
  if (S >= 9) {
    return { ap: "H", reason: "Severity ≥ 9 (Safety critical)" };
  }
  // HIGH: S = 7-8 AND O >= 7
  if (S >= 7 && S <= 8 && O >= 7) {
    return { ap: "H", reason: "Severity 7-8 with high occurrence ≥ 7" };
  }
  // HIGH: S = 7-8 AND D >= 7
  if (S >= 7 && S <= 8 && D >= 7) {
    return { ap: "H", reason: "Severity 7-8 with poor detection ≥ 7" };
  }
  // HIGH: D >= 9 regardless of S/O
  if (D >= 9) {
    return { ap: "H", reason: "Detection ≥ 9 (no control)" };
  }
  // MEDIUM: S = 5-6 AND (O >= 7 OR D >= 7)
  if (S >= 5 && S <= 6 && (O >= 7 || D >= 7)) {
    return { ap: "M", reason: "Moderate severity with high O or D" };
  }
  // MEDIUM: S = 7-8 AND O = 4-6 AND D = 4-6
  if (S >= 7 && S <= 8 && O >= 4 && O <= 6 && D >= 4 && D <= 6) {
    return { ap: "M", reason: "High severity with moderate O and D" };
  }
  // LOW: All other combinations
  return { ap: "L", reason: "Low risk - effective controls in place" };
}

// Rating Selector Component
function RatingSelector({
  value,
  onChange,
  scale,
  label,
  type,
}: {
  value: number;
  onChange: (value: number) => void;
  scale: typeof SEVERITY_SCALE;
  label: string;
  type: "S" | "O" | "D";
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedItem = scale.find((s) => s.rating === value);

  const getBgColor = (rating: number) => {
    if (rating >= 9) return "bg-red-500 text-white";
    if (rating >= 7) return "bg-orange-500 text-white";
    if (rating >= 5) return "bg-yellow-500 text-black";
    if (rating >= 3) return "bg-green-400 text-black";
    return "bg-green-500 text-white";
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={`w-full justify-between h-auto py-2 ${getBgColor(value)}`}
        >
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold">{value}</span>
            <div className="text-left">
              <div className="text-xs opacity-80">{label}</div>
              <div className="text-sm font-medium">{selectedItem?.description}</div>
            </div>
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="start">
        <div className="p-3 border-b">
          <h4 className="font-semibold">{label} Rating Scale</h4>
          <p className="text-xs text-muted-foreground">AIAG-VDA 2019</p>
        </div>
        <ScrollArea className="h-80">
          <div className="p-2">
            {scale.map((item) => (
              <div
                key={item.rating}
                className={`flex items-start gap-3 p-2 rounded cursor-pointer hover:bg-slate-100 ${
                  item.rating === value ? "bg-slate-100 ring-2 ring-primary" : ""
                }`}
                onClick={() => {
                  onChange(item.rating);
                  setIsOpen(false);
                }}
              >
                <div
                  className={`w-10 h-10 rounded flex items-center justify-center font-bold text-lg ${getBgColor(
                    item.rating
                  )}`}
                >
                  {item.rating}
                </div>
                <div className="flex-1">
                  <div className="font-medium">{item.description}</div>
                  <div className="text-xs text-muted-foreground">{item.criteria}</div>
                </div>
                {item.rating === value && <CheckCircle className="h-5 w-5 text-primary" />}
              </div>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

// Controls Multi-Select Component
function ControlsMultiSelect({
  value,
  onChange,
  controls,
  type,
  label,
}: {
  value: string[];
  onChange: (value: string[]) => void;
  controls: ControlsLibrary[];
  type: "prevention" | "detection";
  label: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [customControl, setCustomControl] = useState("");

  const filteredControls = useMemo(() => {
    return controls.filter(
      (c) =>
        c.type === type &&
        (c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.description?.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [controls, type, searchTerm]);

  const toggleControl = (controlName: string) => {
    if (value.includes(controlName)) {
      onChange(value.filter((v) => v !== controlName));
    } else {
      onChange([...value, controlName]);
    }
  };

  const addCustomControl = () => {
    if (customControl.trim() && !value.includes(customControl.trim())) {
      onChange([...value, customControl.trim()]);
      setCustomControl("");
    }
  };

  const removeControl = (controlName: string) => {
    onChange(value.filter((v) => v !== controlName));
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {/* Selected controls badges */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {value.map((ctrl, idx) => (
            <Badge key={idx} variant="secondary" className="flex items-center gap-1">
              {ctrl}
              <X
                className="h-3 w-3 cursor-pointer hover:text-red-500"
                onClick={() => removeControl(ctrl)}
              />
            </Badge>
          ))}
        </div>
      )}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            <span className="text-muted-foreground">
              {value.length === 0
                ? `Select ${type} controls...`
                : `${value.length} control(s) selected`}
            </span>
            <BookOpen className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-96 p-0" align="start">
          <div className="p-3 border-b">
            <h4 className="font-semibold">Select from Controls Library</h4>
            <div className="relative mt-2">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search controls..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          <ScrollArea className="h-48">
            {filteredControls.length > 0 ? (
              <div className="p-2">
                {filteredControls.map((control) => (
                  <div
                    key={control.id}
                    className={`flex items-start gap-2 p-2 rounded cursor-pointer hover:bg-slate-100 ${
                      value.includes(control.name) ? "bg-slate-100" : ""
                    }`}
                    onClick={() => toggleControl(control.name)}
                  >
                    <div
                      className={`w-4 h-4 border rounded flex items-center justify-center ${
                        value.includes(control.name)
                          ? "bg-primary border-primary text-white"
                          : "border-gray-300"
                      }`}
                    >
                      {value.includes(control.name) && <CheckCircle className="h-3 w-3" />}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-sm">{control.name}</div>
                      {control.description && (
                        <div className="text-xs text-muted-foreground line-clamp-1">
                          {control.description}
                        </div>
                      )}
                    </div>
                    {control.typicalDetectionRating && (
                      <Badge variant="outline" className="text-xs">
                        D:{control.typicalDetectionRating}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-muted-foreground">
                No {type} controls found
              </div>
            )}
          </ScrollArea>
          <Separator />
          <div className="p-3">
            <Label className="text-xs text-muted-foreground">Or add custom control</Label>
            <div className="flex gap-2 mt-1">
              <Input
                placeholder="Enter custom control..."
                value={customControl}
                onChange={(e) => setCustomControl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCustomControl()}
              />
              <Button size="sm" onClick={addCustomControl} disabled={!customControl.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

interface FMEATemplateRowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  processId: string;
  steps: ProcessStep[];
  existingRow?: FmeaTemplateRow | null;
  failureModes: FailureModesLibrary[];
  controls: ControlsLibrary[];
}

export default function FMEATemplateRowDialog({
  open,
  onOpenChange,
  processId,
  steps,
  existingRow,
  failureModes,
  controls,
}: FMEATemplateRowDialogProps) {
  const { toast } = useToast();
  const isEditing = !!existingRow;
  const [activeTab, setActiveTab] = useState("basic");
  const [failureModeSearch, setFailureModeSearch] = useState("");
  const [showFailureModeSuggestions, setShowFailureModeSuggestions] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(fmeaTemplateRowFormSchema),
    defaultValues: {
      stepId: "",
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
      specialFlag: false,
      csrSymbol: null,
      notes: "",
    },
  });

  // Watch ratings for AP calculation
  const severity = form.watch("severity");
  const occurrence = form.watch("occurrence");
  const detection = form.watch("detection");
  const apResult = calculateAP(severity, occurrence, detection);

  // Reset form when dialog opens/closes or row changes
  useEffect(() => {
    if (open) {
      if (existingRow) {
        form.reset({
          stepId: existingRow.stepId,
          function: existingRow.function,
          requirement: existingRow.requirement,
          failureMode: existingRow.failureMode,
          effect: existingRow.effect,
          severity: existingRow.severity,
          cause: existingRow.cause,
          occurrence: existingRow.occurrence,
          preventionControls: existingRow.preventionControls || [],
          detectionControls: existingRow.detectionControls || [],
          detection: existingRow.detection,
          specialFlag: existingRow.specialFlag,
          csrSymbol: existingRow.csrSymbol,
          notes: existingRow.notes || "",
        });
      } else {
        form.reset({
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
          specialFlag: false,
          csrSymbol: null,
          notes: "",
        });
      }
      setActiveTab("basic");
    }
  }, [open, existingRow, form, steps]);

  // Filter failure modes for suggestions
  const filteredFailureModes = useMemo(() => {
    if (!failureModeSearch) return [];
    return failureModes
      .filter(
        (fm) =>
          fm.failureMode.toLowerCase().includes(failureModeSearch.toLowerCase()) ||
          fm.genericEffect?.toLowerCase().includes(failureModeSearch.toLowerCase())
      )
      .slice(0, 5);
  }, [failureModes, failureModeSearch]);

  // Mutation for create/update
  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload: InsertFmeaTemplateRow = {
        processDefId: processId,
        stepId: data.stepId,
        function: data.function,
        requirement: data.requirement,
        failureMode: data.failureMode,
        effect: data.effect,
        severity: data.severity,
        cause: data.cause,
        occurrence: data.occurrence,
        preventionControls: data.preventionControls,
        detectionControls: data.detectionControls,
        detection: data.detection,
        ap: apResult.ap,
        specialFlag: data.specialFlag,
        csrSymbol: data.csrSymbol || null,
        notes: data.notes || null,
      };

      const url = isEditing
        ? `/api/fmea-template-rows/${existingRow.id}`
        : `/api/processes/${processId}/fmea-template-rows`;
      const method = isEditing ? "PATCH" : "POST";
      const res = await apiRequest(method, url, payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/processes/${processId}/fmea-template-rows`] });
      toast({
        title: isEditing ? "Row updated" : "Row created",
        description: `The FMEA template row has been ${isEditing ? "updated" : "created"}.`,
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || `Failed to ${isEditing ? "update" : "create"} row`,
      });
    },
  });

  const onSubmit = (data: FormData) => {
    mutation.mutate(data);
  };

  // Apply failure mode from library
  const applyFailureMode = (fm: FailureModesLibrary) => {
    form.setValue("failureMode", fm.failureMode);
    if (fm.genericEffect) form.setValue("effect", fm.genericEffect);
    if (fm.defaultSeverity) form.setValue("severity", fm.defaultSeverity);
    setShowFailureModeSuggestions(false);
    setFailureModeSearch("");
    toast({
      title: "Failure mode applied",
      description: `Applied "${fm.failureMode}" from library`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit FMEA Template Row" : "Add FMEA Template Row"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the failure mode analysis for this process step"
              : "Define a new failure mode analysis row linked to a process step"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 overflow-hidden flex flex-col">
            {/* AP Preview */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-lg mb-4">
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="text-xs text-muted-foreground">S</div>
                  <div className={`text-xl font-bold ${severity >= 7 ? "text-red-600" : ""}`}>
                    {severity}
                  </div>
                </div>
                <div className="text-lg text-muted-foreground">×</div>
                <div className="text-center">
                  <div className="text-xs text-muted-foreground">O</div>
                  <div className={`text-xl font-bold ${occurrence >= 7 ? "text-orange-600" : ""}`}>
                    {occurrence}
                  </div>
                </div>
                <div className="text-lg text-muted-foreground">×</div>
                <div className="text-center">
                  <div className="text-xs text-muted-foreground">D</div>
                  <div className={`text-xl font-bold ${detection >= 7 ? "text-yellow-600" : ""}`}>
                    {detection}
                  </div>
                </div>
                <div className="text-lg text-muted-foreground">=</div>
                <div className="text-center">
                  <div className="text-xs text-muted-foreground">Action Priority</div>
                  <Badge
                    className={`text-lg font-bold px-4 py-1 ${
                      apResult.ap === "H"
                        ? "bg-red-500"
                        : apResult.ap === "M"
                        ? "bg-yellow-500"
                        : "bg-green-500"
                    }`}
                  >
                    {apResult.ap}
                  </Badge>
                </div>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-xs">
                    <p className="font-semibold">{apResult.reason}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Based on AIAG-VDA 2019 Action Priority methodology
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="ratings">Ratings</TabsTrigger>
                <TabsTrigger value="controls">Controls</TabsTrigger>
              </TabsList>

              <ScrollArea className="flex-1 mt-4">
                <TabsContent value="basic" className="space-y-4 px-1">
                  {/* Process Step */}
                  <FormField
                    control={form.control}
                    name="stepId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Process Step *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select process step" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {steps.map((step) => (
                              <SelectItem key={step.id} value={step.id}>
                                {step.seq}: {step.name} ({step.area})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    {/* Function */}
                    <FormField
                      control={form.control}
                      name="function"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Function *</FormLabel>
                          <FormControl>
                            <Input placeholder="What the step does..." {...field} />
                          </FormControl>
                          <FormDescription>The intended purpose of this process step</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Requirement */}
                    <FormField
                      control={form.control}
                      name="requirement"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Requirement *</FormLabel>
                          <FormControl>
                            <Input placeholder="CTQs per print, etc." {...field} />
                          </FormControl>
                          <FormDescription>The specification or requirement</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Failure Mode with Library Suggestions */}
                  <FormField
                    control={form.control}
                    name="failureMode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          Failure Mode *
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <Lightbulb className="h-4 w-4 text-yellow-500" />
                              </TooltipTrigger>
                              <TooltipContent>
                                Start typing to see suggestions from the Failure Modes Library
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </FormLabel>
                        <div className="relative">
                          <FormControl>
                            <Input
                              placeholder="How could this step fail?"
                              {...field}
                              onChange={(e) => {
                                field.onChange(e);
                                setFailureModeSearch(e.target.value);
                                setShowFailureModeSuggestions(true);
                              }}
                              onFocus={() => setShowFailureModeSuggestions(true)}
                            />
                          </FormControl>
                          {showFailureModeSuggestions && filteredFailureModes.length > 0 && (
                            <Card className="absolute z-50 w-full mt-1 shadow-lg">
                              <CardHeader className="py-2 px-3">
                                <CardDescription className="text-xs flex items-center gap-1">
                                  <BookOpen className="h-3 w-3" />
                                  Suggestions from Failure Modes Library
                                </CardDescription>
                              </CardHeader>
                              <CardContent className="p-0">
                                {filteredFailureModes.map((fm) => (
                                  <div
                                    key={fm.id}
                                    className="px-3 py-2 hover:bg-slate-100 cursor-pointer border-t"
                                    onClick={() => applyFailureMode(fm)}
                                  >
                                    <div className="font-medium text-sm">{fm.failureMode}</div>
                                    {fm.genericEffect && (
                                      <div className="text-xs text-muted-foreground">
                                        Effect: {fm.genericEffect}
                                      </div>
                                    )}
                                    <div className="flex gap-2 mt-1">
                                      <Badge variant="outline" className="text-xs">
                                        {fm.category}
                                      </Badge>
                                      {fm.defaultSeverity && (
                                        <Badge variant="outline" className="text-xs">
                                          S: {fm.defaultSeverity}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </CardContent>
                            </Card>
                          )}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    {/* Effect */}
                    <FormField
                      control={form.control}
                      name="effect"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Effect *</FormLabel>
                          <FormControl>
                            <Textarea placeholder="What happens if this fails?" {...field} rows={2} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Cause */}
                    <FormField
                      control={form.control}
                      name="cause"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cause *</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Why might this fail?" {...field} rows={2} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
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
                            placeholder="Additional notes or context..."
                            {...field}
                            value={field.value || ""}
                            rows={2}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                <TabsContent value="ratings" className="space-y-6 px-1">
                  {/* Severity */}
                  <FormField
                    control={form.control}
                    name="severity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Severity (S) - How severe is the effect?</FormLabel>
                        <FormControl>
                          <RatingSelector
                            value={field.value}
                            onChange={field.onChange}
                            scale={SEVERITY_SCALE}
                            label="Severity"
                            type="S"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Occurrence */}
                  <FormField
                    control={form.control}
                    name="occurrence"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Occurrence (O) - How often might this cause occur?</FormLabel>
                        <FormControl>
                          <RatingSelector
                            value={field.value}
                            onChange={field.onChange}
                            scale={OCCURRENCE_SCALE}
                            label="Occurrence"
                            type="O"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Detection */}
                  <FormField
                    control={form.control}
                    name="detection"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Detection (D) - How likely is detection before reaching customer?</FormLabel>
                        <FormControl>
                          <RatingSelector
                            value={field.value}
                            onChange={field.onChange}
                            scale={DETECTION_SCALE}
                            label="Detection"
                            type="D"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Special Characteristics */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Shield className="h-4 w-4 text-purple-500" />
                        Special Characteristics
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="specialFlag"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between">
                            <div>
                              <FormLabel>Mark as Special Characteristic</FormLabel>
                              <FormDescription>
                                Requires enhanced controls per IATF 16949
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="csrSymbol"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>CSR Symbol</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value || "none"}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select symbol" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                <SelectItem value="Ⓢ">
                                  <span className="flex items-center gap-2">
                                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-xs font-bold">
                                      Ⓢ
                                    </span>
                                    Safety Characteristic
                                  </span>
                                </SelectItem>
                                <SelectItem value="◆">
                                  <span className="flex items-center gap-2">
                                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-500 text-white text-xs font-bold">
                                      ◆
                                    </span>
                                    Critical Characteristic
                                  </span>
                                </SelectItem>
                                <SelectItem value="ⓒ">
                                  <span className="flex items-center gap-2">
                                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-purple-500 text-white text-xs font-bold">
                                      ⓒ
                                    </span>
                                    Compliance/Regulatory
                                  </span>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="controls" className="space-y-6 px-1">
                  {/* Prevention Controls */}
                  <FormField
                    control={form.control}
                    name="preventionControls"
                    render={({ field }) => (
                      <FormItem>
                        <ControlsMultiSelect
                          value={field.value}
                          onChange={field.onChange}
                          controls={controls}
                          type="prevention"
                          label="Prevention Controls - How do we prevent this cause?"
                        />
                        <FormDescription>
                          Controls that prevent the failure cause from occurring
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Detection Controls */}
                  <FormField
                    control={form.control}
                    name="detectionControls"
                    render={({ field }) => (
                      <FormItem>
                        <ControlsMultiSelect
                          value={field.value}
                          onChange={field.onChange}
                          controls={controls}
                          type="detection"
                          label="Detection Controls - How do we detect this failure mode?"
                        />
                        <FormDescription>
                          Controls that detect the failure mode before reaching customer
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Detection warning */}
                  {severity >= 7 &&
                    (!form.watch("preventionControls")?.length ||
                      form.watch("preventionControls").length === 0) && (
                      <Card className="border-orange-200 bg-orange-50">
                        <CardContent className="py-3">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5" />
                            <div>
                              <p className="font-medium text-orange-800">Warning: No Prevention Controls</p>
                              <p className="text-sm text-orange-700">
                                This row has Severity ≥ 7 but no prevention controls. Per AIAG-VDA 2019,
                                detection-only strategies are not recommended for high-severity failures.
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                </TabsContent>
              </ScrollArea>
            </Tabs>

            <DialogFooter className="mt-4 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    {isEditing ? "Updating..." : "Creating..."}
                  </>
                ) : (
                  <>
                    {isEditing ? "Update Row" : "Create Row"}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}