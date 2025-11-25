import { useState, useEffect } from "react";
import { Shield, Plus, Search, Eye, Pencil, Trash2, Loader2, Filter, ShieldCheck, ShieldAlert } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ControlsLibrary, InsertControlsLibrary, ControlType, ControlEffectiveness } from "@shared/schema";
import { insertControlsLibrarySchema } from "@shared/schema";

const CONTROL_TYPES: { value: ControlType; label: string; icon: typeof ShieldCheck }[] = [
  { value: 'prevention', label: 'Prevention', icon: ShieldCheck },
  { value: 'detection', label: 'Detection', icon: ShieldAlert },
];

const EFFECTIVENESS_OPTIONS: { value: ControlEffectiveness; label: string }[] = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const TYPE_COLORS: Record<ControlType, string> = {
  prevention: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  detection: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
};

const EFFECTIVENESS_COLORS: Record<ControlEffectiveness, string> = {
  high: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  medium: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  low: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

function ControlFormDialog({ 
  control, 
  open, 
  onOpenChange 
}: { 
  control?: ControlsLibrary; 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const isEditing = !!control;
  const [processesText, setProcessesText] = useState("");
  const [tagsText, setTagsText] = useState("");

  const form = useForm<InsertControlsLibrary>({
    resolver: zodResolver(insertControlsLibrarySchema),
    defaultValues: {
      name: "",
      type: 'prevention',
      description: "",
      applicableProcesses: [],
      typicalOccurrenceImpact: undefined,
      typicalDetectionRating: undefined,
      requiresMSA: false,
      msaStatus: undefined,
      gageType: "",
      defaultSampleSize: "",
      defaultFrequency: "",
      effectiveness: 'medium',
      tags: [],
      industryStandard: "",
      status: "active",
    },
  });

  const controlType = form.watch("type");

  useEffect(() => {
    if (control && open) {
      form.reset({
        name: control.name,
        type: control.type as ControlType,
        description: control.description || "",
        applicableProcesses: control.applicableProcesses || [],
        typicalOccurrenceImpact: control.typicalOccurrenceImpact || undefined,
        typicalDetectionRating: control.typicalDetectionRating || undefined,
        requiresMSA: control.requiresMSA || false,
        msaStatus: control.msaStatus as any || undefined,
        gageType: control.gageType || "",
        defaultSampleSize: control.defaultSampleSize || "",
        defaultFrequency: control.defaultFrequency || "",
        effectiveness: control.effectiveness as ControlEffectiveness,
        tags: control.tags || [],
        industryStandard: control.industryStandard || "",
        status: control.status || "active",
      });
      setProcessesText((control.applicableProcesses || []).join(", "));
      setTagsText((control.tags || []).join(", "));
    } else if (!open) {
      form.reset({
        name: "",
        type: 'prevention',
        description: "",
        applicableProcesses: [],
        typicalOccurrenceImpact: undefined,
        typicalDetectionRating: undefined,
        requiresMSA: false,
        msaStatus: undefined,
        gageType: "",
        defaultSampleSize: "",
        defaultFrequency: "",
        effectiveness: 'medium',
        tags: [],
        industryStandard: "",
        status: "active",
      });
      setProcessesText("");
      setTagsText("");
    }
  }, [control, open, form]);

  const mutation = useMutation({
    mutationFn: async (data: InsertControlsLibrary) => {
      const url = isEditing ? `/api/controls-library/${control.id}` : "/api/controls-library";
      const method = isEditing ? "PATCH" : "POST";
      const res = await apiRequest(method, url, data);
      return await res.json() as ControlsLibrary;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/controls-library"] });
      toast({
        title: isEditing ? "Control updated" : "Control created",
        description: `The control has been successfully ${isEditing ? "updated" : "created"}.`,
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || `Failed to ${isEditing ? "update" : "create"} control`,
      });
    },
  });

  const onSubmit = (data: InsertControlsLibrary) => {
    const processedData = {
      ...data,
      applicableProcesses: processesText.split(",").map(s => s.trim()).filter(Boolean),
      tags: tagsText.split(",").map(s => s.trim()).filter(Boolean),
    };
    mutation.mutate(processedData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Control" : "Create New Control"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update control details." : "Add a new control to the catalog."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Control Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-control-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CONTROL_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="effectiveness"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Effectiveness</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-effectiveness">
                          <SelectValue placeholder="Select effectiveness" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {EFFECTIVENESS_OPTIONS.map(eff => (
                          <SelectItem key={eff.value} value={eff.value}>{eff.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Control Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., Pack pressure monitoring and control" data-testid="input-control-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      value={field.value || ""} 
                      placeholder="Detailed description of the control method..." 
                      className="min-h-[80px]"
                      data-testid="textarea-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              {controlType === 'prevention' ? (
                <FormField
                  control={form.control}
                  name="typicalOccurrenceImpact"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Typical Occurrence Impact</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min={1} 
                          max={10}
                          {...field} 
                          value={field.value ?? ""} 
                          onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                          placeholder="1-10"
                          data-testid="input-occurrence-impact"
                        />
                      </FormControl>
                      <FormDescription>Typical reduction in O rating (1-10)</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <FormField
                  control={form.control}
                  name="typicalDetectionRating"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Typical Detection Rating</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min={1} 
                          max={10}
                          {...field} 
                          value={field.value ?? ""} 
                          onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                          placeholder="1-10"
                          data-testid="input-detection-rating"
                        />
                      </FormControl>
                      <FormDescription>Typical D rating achieved (1-10)</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || "active"}>
                      <FormControl>
                        <SelectTrigger data-testid="select-status">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="deprecated">Deprecated</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="requiresMSA"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">MSA Required</FormLabel>
                    <FormDescription>
                      Measurement System Analysis required for this control
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value || false}
                      onCheckedChange={field.onChange}
                      data-testid="switch-msa-required"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {form.watch("requiresMSA") && (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="msaStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>MSA Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-msa-status">
                            <SelectValue placeholder="Select MSA status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="approved">Approved</SelectItem>
                          <SelectItem value="planned">Planned</SelectItem>
                          <SelectItem value="failed">Failed</SelectItem>
                          <SelectItem value="not_required">Not Required</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="gageType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gage Type</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          value={field.value || ""} 
                          placeholder="e.g., CMM, Vision System"
                          data-testid="input-gage-type"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="defaultSampleSize"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sample Size Plan</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        value={field.value || ""} 
                        placeholder="e.g., 5 per lot, 100%"
                        data-testid="input-sample-size"
                      />
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
                    <FormLabel>Frequency Plan</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        value={field.value || ""} 
                        placeholder="e.g., Per shift, Every part"
                        data-testid="input-frequency"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4">
              <FormItem>
                <FormLabel>Applicable Processes</FormLabel>
                <Input
                  value={processesText}
                  onChange={(e) => setProcessesText(e.target.value)}
                  placeholder="Injection Molding, Machining, Assembly (comma-separated)"
                  data-testid="input-processes"
                />
                <FormDescription>Comma-separated list of applicable processes</FormDescription>
              </FormItem>

              <FormField
                control={form.control}
                name="industryStandard"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Industry Standard</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        value={field.value || ""} 
                        placeholder="e.g., AIAG-VDA 2019, ISO 14644"
                        data-testid="input-standard"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormItem>
                <FormLabel>Tags</FormLabel>
                <Input
                  value={tagsText}
                  onChange={(e) => setTagsText(e.target.value)}
                  placeholder="molding, poka-yoke, process-control (comma-separated)"
                  data-testid="input-tags"
                />
                <FormDescription>Comma-separated list of tags for categorization</FormDescription>
              </FormItem>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending} data-testid="button-submit-control">
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Update Control" : "Create Control"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function ControlDetailsDialog({ 
  control, 
  open, 
  onOpenChange 
}: { 
  control: ControlsLibrary | null; 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
}) {
  if (!control) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Badge className={TYPE_COLORS[control.type as ControlType]}>
              {control.type}
            </Badge>
            {control.name}
          </DialogTitle>
          <DialogDescription>
            Control Details
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge className={EFFECTIVENESS_COLORS[control.effectiveness as ControlEffectiveness]}>
              {control.effectiveness} effectiveness
            </Badge>
            {control.requiresMSA && (
              <Badge variant={control.msaStatus === 'approved' ? 'default' : 'secondary'}>
                MSA: {control.msaStatus || 'Required'}
              </Badge>
            )}
          </div>

          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-1">Description</h4>
            <p className="text-sm">{control.description || "No description provided"}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {control.type === 'prevention' && control.typicalOccurrenceImpact && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Typical Occurrence Impact</h4>
                <p className="text-sm font-medium text-green-600">-{control.typicalOccurrenceImpact} points</p>
              </div>
            )}
            {control.type === 'detection' && control.typicalDetectionRating && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Typical Detection Rating</h4>
                <p className="text-sm font-medium text-blue-600">{control.typicalDetectionRating}</p>
              </div>
            )}
            {control.gageType && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Gage Type</h4>
                <p className="text-sm">{control.gageType}</p>
              </div>
            )}
          </div>

          {(control.defaultSampleSize || control.defaultFrequency) && (
            <div className="grid grid-cols-2 gap-4">
              {control.defaultSampleSize && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Sample Size</h4>
                  <p className="text-sm">{control.defaultSampleSize}</p>
                </div>
              )}
              {control.defaultFrequency && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Frequency</h4>
                  <p className="text-sm">{control.defaultFrequency}</p>
                </div>
              )}
            </div>
          )}

          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-1">Applicable Processes</h4>
            <div className="flex flex-wrap gap-1">
              {(control.applicableProcesses || []).map((process, idx) => (
                <Badge key={idx} variant="outline">{process}</Badge>
              ))}
            </div>
          </div>

          {control.industryStandard && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">Industry Standard</h4>
              <p className="text-sm">{control.industryStandard}</p>
            </div>
          )}

          {control.tags && control.tags.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">Tags</h4>
              <div className="flex flex-wrap gap-1">
                {control.tags.map((tag, idx) => (
                  <Badge key={idx} variant="secondary">{tag}</Badge>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
            <div>
              <span>Status: </span>
              <Badge variant={control.status === 'active' ? 'default' : 'secondary'}>
                {control.status}
              </Badge>
            </div>
            {control.lastUsed && (
              <div>Last Used: {new Date(control.lastUsed).toLocaleDateString()}</div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function ControlsLibraryPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [effectivenessFilter, setEffectivenessFilter] = useState<string>("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingControl, setEditingControl] = useState<ControlsLibrary | undefined>();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewingControl, setViewingControl] = useState<ControlsLibrary | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  const { data: controls = [], isLoading, error } = useQuery<ControlsLibrary[]>({
    queryKey: ["/api/controls-library", typeFilter !== "all" ? typeFilter : null, effectivenessFilter !== "all" ? effectivenessFilter : null, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (typeFilter !== "all") params.append("type", typeFilter);
      if (effectivenessFilter !== "all") params.append("effectiveness", effectivenessFilter);
      if (searchQuery) params.append("search", searchQuery);
      const url = `/api/controls-library${params.toString() ? `?${params}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch controls");
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/controls-library/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/controls-library"] });
      toast({
        title: "Control deleted",
        description: "The control has been removed from the catalog.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete control",
      });
    },
  });

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this control?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleEdit = (ctrl: ControlsLibrary) => {
    setEditingControl(ctrl);
    setEditDialogOpen(true);
  };

  const handleView = (ctrl: ControlsLibrary) => {
    setViewingControl(ctrl);
    setViewDialogOpen(true);
  };

  // Summary stats
  const preventionCount = controls.filter(c => c.type === 'prevention').length;
  const detectionCount = controls.filter(c => c.type === 'detection').length;

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-destructive">Error loading controls: {(error as Error).message}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Controls Library
          </h1>
          <p className="text-muted-foreground">
            Standardized prevention and detection controls for PFMEA analysis
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} data-testid="button-create-control">
          <Plus className="mr-2 h-4 w-4" />
          Add Control
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Total Controls</p>
                <p className="text-2xl font-bold">{controls.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Prevention</p>
                <p className="text-2xl font-bold">{preventionCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Detection</p>
                <p className="text-2xl font-bold">{detectionCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">High Effectiveness</p>
                <p className="text-2xl font-bold">{controls.filter(c => c.effectiveness === 'high').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search controls..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-controls"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-filter-type">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="prevention">Prevention</SelectItem>
                <SelectItem value="detection">Detection</SelectItem>
              </SelectContent>
            </Select>
            <Select value={effectivenessFilter} onValueChange={setEffectivenessFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-filter-effectiveness">
                <SelectValue placeholder="Filter by effectiveness" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Effectiveness</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : controls.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No controls found. Add your first control to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Effectiveness</TableHead>
                    <TableHead>Rating Impact</TableHead>
                    <TableHead>MSA</TableHead>
                    <TableHead>Gage Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {controls.map((ctrl) => (
                    <TableRow key={ctrl.id} data-testid={`row-control-${ctrl.id}`}>
                      <TableCell>
                        <Badge className={TYPE_COLORS[ctrl.type as ControlType]} variant="secondary">
                          {ctrl.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium max-w-[300px]">
                        <div className="truncate" title={ctrl.name}>{ctrl.name}</div>
                      </TableCell>
                      <TableCell>
                        <Badge className={EFFECTIVENESS_COLORS[ctrl.effectiveness as ControlEffectiveness]} variant="secondary">
                          {ctrl.effectiveness}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {ctrl.type === 'prevention' && ctrl.typicalOccurrenceImpact && (
                          <span className="text-green-600 font-medium">O -{ctrl.typicalOccurrenceImpact}</span>
                        )}
                        {ctrl.type === 'detection' && ctrl.typicalDetectionRating && (
                          <span className="text-blue-600 font-medium">D = {ctrl.typicalDetectionRating}</span>
                        )}
                        {!ctrl.typicalOccurrenceImpact && !ctrl.typicalDetectionRating && "-"}
                      </TableCell>
                      <TableCell>
                        {ctrl.requiresMSA ? (
                          <Badge variant={ctrl.msaStatus === 'approved' ? 'default' : 'outline'} className="text-xs">
                            {ctrl.msaStatus || 'Required'}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">Not req.</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {ctrl.gageType || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={ctrl.status === 'active' ? 'default' : 'secondary'}>
                          {ctrl.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleView(ctrl)}
                            data-testid={`button-view-${ctrl.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(ctrl)}
                            data-testid={`button-edit-${ctrl.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(ctrl.id)}
                            data-testid={`button-delete-${ctrl.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <ControlFormDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

      <ControlFormDialog
        control={editingControl}
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) setEditingControl(undefined);
        }}
      />

      <ControlDetailsDialog
        control={viewingControl}
        open={viewDialogOpen}
        onOpenChange={(open) => {
          setViewDialogOpen(open);
          if (!open) setViewingControl(null);
        }}
      />
    </div>
  );
}
