import { useState, useEffect } from "react";
import { Settings2, Plus, Search, Eye, Pencil, Trash2, Loader2, X } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { EquipmentLibrary, InsertEquipmentLibrary, EquipmentErrorProofing, EquipmentControlMethods, InsertEquipmentErrorProofing, InsertEquipmentControlMethods } from "@shared/schema";
import { insertEquipmentLibrarySchema, insertEquipmentErrorProofingSchema, insertEquipmentControlMethodsSchema } from "@shared/schema";
import { z } from "zod";

// Equipment form dialog (shared by Create and Edit)
function EquipmentFormDialog({ 
  equipment, 
  open, 
  onOpenChange 
}: { 
  equipment?: EquipmentLibrary; 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const isEditing = !!equipment;

  const form = useForm<InsertEquipmentLibrary>({
    resolver: zodResolver(insertEquipmentLibrarySchema),
    defaultValues: {
      name: "",
      type: "injection_press",
      manufacturer: "",
      model: "",
      serialNumber: "",
      location: "",
      status: "active",
      specifications: {},
    },
  });

  useEffect(() => {
    if (equipment && open) {
      form.reset({
        name: equipment.name,
        type: equipment.type,
        manufacturer: equipment.manufacturer,
        model: equipment.model,
        serialNumber: equipment.serialNumber || "",
        location: equipment.location,
        status: equipment.status,
        specifications: equipment.specifications || {},
      });
    } else if (!open) {
      form.reset({
        name: "",
        type: "injection_press",
        manufacturer: "",
        model: "",
        serialNumber: "",
        location: "",
        status: "active",
        specifications: {},
      });
    }
  }, [equipment, open, form]);

  const mutation = useMutation({
    mutationFn: async (data: InsertEquipmentLibrary) => {
      const url = isEditing ? `/api/equipment/${equipment.id}` : "/api/equipment";
      const method = isEditing ? "PATCH" : "POST";
      const res = await apiRequest(method, url, data);
      return await res.json() as EquipmentLibrary;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/equipment"] });
      toast({
        title: isEditing ? "Equipment updated" : "Equipment created",
        description: `The equipment has been successfully ${isEditing ? "updated" : "created"}.`,
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || `Failed to ${isEditing ? "update" : "create"} equipment`,
      });
    },
  });

  const onSubmit = (data: InsertEquipmentLibrary) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Equipment" : "Create New Equipment"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update equipment details." : "Add new equipment to the library."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Equipment Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Engel Injection Press 200T" {...field} data-testid="input-equipment-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Equipment Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-equipment-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="injection_press">Injection Press</SelectItem>
                        <SelectItem value="ultrasonic_welder">Ultrasonic Welder</SelectItem>
                        <SelectItem value="hot_plate_welder">Hot Plate Welder</SelectItem>
                        <SelectItem value="robot">Robot</SelectItem>
                        <SelectItem value="conveyor">Conveyor</SelectItem>
                        <SelectItem value="test_station">Test Station</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-equipment-status">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                        <SelectItem value="retired">Retired</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="manufacturer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Manufacturer</FormLabel>
                    <FormControl>
                      <Input placeholder="Engel" {...field} data-testid="input-manufacturer" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Model</FormLabel>
                    <FormControl>
                      <Input placeholder="e-victory 200/50" {...field} data-testid="input-model" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="serialNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Serial Number</FormLabel>
                    <FormControl>
                      <Input placeholder="EP-200-2024-001" {...field} data-testid="input-serial-number" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input placeholder="Molding Cell A" {...field} data-testid="input-location" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel">
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending} data-testid={isEditing ? "button-update-equipment" : "button-create-equipment"}>
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Update Equipment" : "Create Equipment"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// Error-Proofing Control dialog (shared by Create and Edit)
function ErrorProofingControlDialog({
  equipmentId,
  control,
  open,
  onOpenChange,
}: {
  equipmentId: string;
  control?: EquipmentErrorProofing;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const isEditing = !!control;
  const [failureModeInput, setFailureModeInput] = useState("");

  const form = useForm<InsertEquipmentErrorProofing>({
    resolver: zodResolver(insertEquipmentErrorProofingSchema),
    defaultValues: {
      equipmentId,
      controlType: "prevention",
      name: "",
      description: "",
      failureModesAddressed: [],
      suggestedDetectionRating: null,
      isActive: true,
    },
  });

  const controlType = form.watch("controlType");

  useEffect(() => {
    if (control && open) {
      form.reset({
        equipmentId: control.equipmentId,
        controlType: control.controlType,
        name: control.name,
        description: control.description || "",
        failureModesAddressed: control.failureModesAddressed || [],
        suggestedDetectionRating: control.suggestedDetectionRating,
        isActive: control.isActive,
      });
    } else if (!open) {
      form.reset({
        equipmentId,
        controlType: "prevention",
        name: "",
        description: "",
        failureModesAddressed: [],
        suggestedDetectionRating: null,
        isActive: true,
      });
      setFailureModeInput("");
    }
  }, [control, open, equipmentId, form]);

  const mutation = useMutation({
    mutationFn: async (data: InsertEquipmentErrorProofing) => {
      const url = isEditing ? `/api/equipment-error-proofing/${control.id}` : `/api/equipment/${equipmentId}/error-proofing`;
      const method = isEditing ? "PATCH" : "POST";
      const res = await apiRequest(method, url, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/equipment"] });
      toast({
        title: isEditing ? "Control updated" : "Control added",
        description: `Error-proofing control has been successfully ${isEditing ? "updated" : "added"}.`,
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || `Failed to ${isEditing ? "update" : "add"} control`,
      });
    },
  });

  const onSubmit = (data: InsertEquipmentErrorProofing) => {
    mutation.mutate(data);
  };

  const addFailureMode = () => {
    if (failureModeInput.trim()) {
      const current = form.getValues("failureModesAddressed") || [];
      form.setValue("failureModesAddressed", [...current, failureModeInput.trim()]);
      setFailureModeInput("");
    }
  };

  const removeFailureMode = (index: number) => {
    const current = form.getValues("failureModesAddressed") || [];
    form.setValue("failureModesAddressed", current.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Error-Proofing Control" : "Add Error-Proofing Control"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update error-proofing control details." : "Add a new error-proofing control to this equipment."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="controlType"
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
                      <SelectItem value="prevention">Prevention</SelectItem>
                      <SelectItem value="detection">Detection</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Prevention controls prevent failures; Detection controls detect them.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Control Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Cavity pressure monitoring" {...field} data-testid="input-control-name" />
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
                    <Textarea placeholder="Describe how this control works..." {...field} data-testid="input-control-description" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="failureModesAddressed"
              render={() => (
                <FormItem>
                  <FormLabel>Failure Modes Addressed</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Enter failure mode and press Add"
                          value={failureModeInput}
                          onChange={(e) => setFailureModeInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addFailureMode();
                            }
                          }}
                          data-testid="input-failure-mode"
                        />
                        <Button type="button" onClick={addFailureMode} data-testid="button-add-failure-mode">
                          Add
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(form.watch("failureModesAddressed") || []).map((mode, index) => (
                          <Badge key={index} variant="secondary" className="gap-1" data-testid={`badge-failure-mode-${index}`}>
                            {mode}
                            <button
                              type="button"
                              onClick={() => removeFailureMode(index)}
                              className="ml-1 hover:text-destructive"
                              data-testid={`button-remove-failure-mode-${index}`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </FormControl>
                  <FormDescription>
                    Common suggestions: Short shot, Flash, Dimensional variation, Weld line
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {controlType === "detection" && (
              <FormField
                control={form.control}
                name="suggestedDetectionRating"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Suggested Detection Rating (1-10)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        max="10"
                        placeholder="7"
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                        data-testid="input-detection-rating"
                      />
                    </FormControl>
                    <FormDescription>
                      Lower is better (1 = almost certain detection, 10 = unlikely detection)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <FormLabel>Active</FormLabel>
                    <FormDescription>
                      Control is currently active and in use
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="switch-control-active"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel">
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending} data-testid={isEditing ? "button-update-control" : "button-add-control"}>
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Update Control" : "Add Control"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// Control Method dialog (shared by Create and Edit)
function ControlMethodDialog({
  equipmentId,
  method,
  open,
  onOpenChange,
}: {
  equipmentId: string;
  method?: EquipmentControlMethods;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const isEditing = !!method;

  const form = useForm<InsertEquipmentControlMethods>({
    resolver: zodResolver(insertEquipmentControlMethodsSchema),
    defaultValues: {
      equipmentId,
      characteristicType: "product",
      characteristicName: "",
      controlMethod: "",
      measurementSystem: "",
      sampleSize: "",
      frequency: "",
      acceptanceCriteria: "",
      reactionPlan: "",
      isActive: true,
    },
  });

  useEffect(() => {
    if (method && open) {
      form.reset({
        equipmentId: method.equipmentId,
        characteristicType: method.characteristicType,
        characteristicName: method.characteristicName,
        controlMethod: method.controlMethod,
        measurementSystem: method.measurementSystem || "",
        sampleSize: method.sampleSize || "",
        frequency: method.frequency || "",
        acceptanceCriteria: method.acceptanceCriteria || "",
        reactionPlan: method.reactionPlan || "",
        isActive: method.isActive,
      });
    } else if (!open) {
      form.reset({
        equipmentId,
        characteristicType: "product",
        characteristicName: "",
        controlMethod: "",
        measurementSystem: "",
        sampleSize: "",
        frequency: "",
        acceptanceCriteria: "",
        reactionPlan: "",
        isActive: true,
      });
    }
  }, [method, open, equipmentId, form]);

  const mutation = useMutation({
    mutationFn: async (data: InsertEquipmentControlMethods) => {
      const url = isEditing ? `/api/equipment-control-methods/${method.id}` : `/api/equipment/${equipmentId}/control-methods`;
      const method_type = isEditing ? "PATCH" : "POST";
      const res = await apiRequest(method_type, url, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/equipment"] });
      toast({
        title: isEditing ? "Control method updated" : "Control method added",
        description: `Control method has been successfully ${isEditing ? "updated" : "added"}.`,
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || `Failed to ${isEditing ? "update" : "add"} control method`,
      });
    },
  });

  const onSubmit = (data: InsertEquipmentControlMethods) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Control Method" : "Add Control Method"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update control method details." : "Add a new control method to this equipment."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="characteristicType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Characteristic Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-characteristic-type">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="product">Product</SelectItem>
                      <SelectItem value="process">Process</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="characteristicName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Characteristic Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Part weight" {...field} data-testid="input-characteristic-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="controlMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Control Method</FormLabel>
                  <FormControl>
                    <Input placeholder="Weight scale measurement" {...field} data-testid="input-control-method" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="measurementSystem"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Measurement System</FormLabel>
                    <FormControl>
                      <Input placeholder="Mettler Toledo Scale" {...field} data-testid="input-measurement-system" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sampleSize"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sample Size</FormLabel>
                    <FormControl>
                      <Input placeholder="5 pc" {...field} data-testid="input-sample-size" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="frequency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Frequency</FormLabel>
                  <FormControl>
                    <Input placeholder="1/hour" {...field} data-testid="input-frequency" />
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
                    <Textarea placeholder="Within ±0.5g of nominal" {...field} data-testid="input-acceptance-criteria" />
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
                    <Textarea placeholder="Notify supervisor, quarantine parts, adjust process..." {...field} data-testid="input-reaction-plan" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <FormLabel>Active</FormLabel>
                    <FormDescription>
                      Control method is currently active and in use
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="switch-method-active"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel">
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending} data-testid={isEditing ? "button-update-method" : "button-add-method"}>
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Update Method" : "Add Method"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

type EquipmentWithDetails = EquipmentLibrary & {
  errorProofingControls: EquipmentErrorProofing[];
  controlMethods: EquipmentControlMethods[];
};

function EquipmentDetailsDialog({ 
  equipment,
  onRefresh,
}: { 
  equipment: EquipmentWithDetails | null;
  onRefresh: () => void;
}) {
  const [errorProofingOpen, setErrorProofingOpen] = useState(false);
  const [editingErrorProofing, setEditingErrorProofing] = useState<EquipmentErrorProofing | undefined>();
  const [controlMethodOpen, setControlMethodOpen] = useState(false);
  const [editingControlMethod, setEditingControlMethod] = useState<EquipmentControlMethods | undefined>();
  const { toast } = useToast();

  const deleteErrorProofingMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/equipment-error-proofing/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/equipment"] });
      toast({
        title: "Control deleted",
        description: "Error-proofing control has been successfully deleted.",
      });
      onRefresh();
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete control",
      });
    },
  });

  const deleteControlMethodMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/equipment-control-methods/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/equipment"] });
      toast({
        title: "Control method deleted",
        description: "Control method has been successfully deleted.",
      });
      onRefresh();
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete control method",
      });
    },
  });

  const toggleErrorProofingActive = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      await apiRequest("PATCH", `/api/equipment-error-proofing/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/equipment"] });
      onRefresh();
    },
  });

  const toggleControlMethodActive = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      await apiRequest("PATCH", `/api/equipment-control-methods/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/equipment"] });
      onRefresh();
    },
  });

  if (!equipment) return null;

  return (
    <>
      <DialogContent className="sm:max-w-[900px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{equipment.name}</DialogTitle>
          <DialogDescription>
            {equipment.manufacturer} {equipment.model} • {equipment.location}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="error-proofing">Error-Proofing Controls</TabsTrigger>
            <TabsTrigger value="control-methods">Control Methods</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Type:</span>
                <span className="ml-2 capitalize">{equipment.type.replace('_', ' ')}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Status:</span>
                <span className="ml-2">
                  <Badge variant={equipment.status === 'active' ? 'default' : 'secondary'}>
                    {equipment.status}
                  </Badge>
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Serial Number:</span>
                <span className="ml-2">{equipment.serialNumber}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Location:</span>
                <span className="ml-2">{equipment.location}</span>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="error-proofing" className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-semibold">Error-Proofing Controls ({equipment.errorProofingControls.length})</h4>
              <Button
                onClick={() => {
                  setEditingErrorProofing(undefined);
                  setErrorProofingOpen(true);
                }}
                size="sm"
                data-testid="button-add-error-proofing"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Control
              </Button>
            </div>
            {equipment.errorProofingControls.length > 0 ? (
              <div className="space-y-3">
                {equipment.errorProofingControls.map((control) => (
                  <Card key={control.id} data-testid={`card-error-proofing-${control.id}`}>
                    <CardHeader className="py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-sm">{control.name}</CardTitle>
                          <Badge variant={control.controlType === 'prevention' ? 'default' : 'secondary'}>
                            {control.controlType}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={control.isActive}
                            onCheckedChange={(checked) => toggleErrorProofingActive.mutate({ id: control.id, isActive: checked })}
                            data-testid={`switch-error-proofing-active-${control.id}`}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingErrorProofing(control);
                              setErrorProofingOpen(true);
                            }}
                            data-testid={`button-edit-error-proofing-${control.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm(`Delete control "${control.name}"?`)) {
                                deleteErrorProofingMutation.mutate(control.id);
                              }
                            }}
                            data-testid={`button-delete-error-proofing-${control.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="py-2 text-sm space-y-1">
                      <p className="text-muted-foreground">{control.description}</p>
                      {control.failureModesAddressed && control.failureModesAddressed.length > 0 && (
                        <p className="text-xs">
                          <span className="font-medium">Addresses:</span> {control.failureModesAddressed.join(', ')}
                        </p>
                      )}
                      {control.suggestedDetectionRating && (
                        <p className="text-xs">
                          <span className="font-medium">Suggested Detection Rating:</span> {control.suggestedDetectionRating}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No error-proofing controls defined. Add controls to document prevention and detection methods.</p>
            )}
          </TabsContent>

          <TabsContent value="control-methods" className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-semibold">Control Methods ({equipment.controlMethods.length})</h4>
              <Button
                onClick={() => {
                  setEditingControlMethod(undefined);
                  setControlMethodOpen(true);
                }}
                size="sm"
                data-testid="button-add-control-method"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Method
              </Button>
            </div>
            {equipment.controlMethods.length > 0 ? (
              <div className="space-y-2">
                {equipment.controlMethods.map((method) => (
                  <Card key={method.id} data-testid={`card-control-method-${method.id}`}>
                    <CardContent className="py-3 text-sm space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{method.characteristicName}</span>
                          <Badge variant="outline">{method.characteristicType}</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={method.isActive}
                            onCheckedChange={(checked) => toggleControlMethodActive.mutate({ id: method.id, isActive: checked })}
                            data-testid={`switch-control-method-active-${method.id}`}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingControlMethod(method);
                              setControlMethodOpen(true);
                            }}
                            data-testid={`button-edit-control-method-${method.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm(`Delete control method "${method.characteristicName}"?`)) {
                                deleteControlMethodMutation.mutate(method.id);
                              }
                            }}
                            data-testid={`button-delete-control-method-${method.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                        <div><span className="font-medium">Method:</span> {method.controlMethod}</div>
                        <div><span className="font-medium">System:</span> {method.measurementSystem}</div>
                        <div><span className="font-medium">Sample:</span> {method.sampleSize}</div>
                        <div><span className="font-medium">Frequency:</span> {method.frequency}</div>
                      </div>
                      {method.acceptanceCriteria && (
                        <p className="text-xs"><span className="font-medium">Criteria:</span> {method.acceptanceCriteria}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No control methods defined. Add methods to document measurement and control procedures.</p>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>

      {equipment && (
        <>
          <ErrorProofingControlDialog
            equipmentId={equipment.id}
            control={editingErrorProofing}
            open={errorProofingOpen}
            onOpenChange={(open) => {
              setErrorProofingOpen(open);
              if (!open) {
                setEditingErrorProofing(undefined);
                onRefresh();
              }
            }}
          />
          <ControlMethodDialog
            equipmentId={equipment.id}
            method={editingControlMethod}
            open={controlMethodOpen}
            onOpenChange={(open) => {
              setControlMethodOpen(open);
              if (!open) {
                setEditingControlMethod(undefined);
                onRefresh();
              }
            }}
          />
        </>
      )}
    </>
  );
}

export default function EquipmentPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentWithDetails | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<EquipmentLibrary | undefined>();
  const [newEquipmentOpen, setNewEquipmentOpen] = useState(false);
  const { toast } = useToast();

  const { data: equipment = [], isLoading } = useQuery<EquipmentLibrary[]>({
    queryKey: ["/api/equipment"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/equipment/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/equipment"] });
      toast({
        title: "Equipment deleted",
        description: "The equipment has been successfully deleted.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete equipment",
      });
    },
  });

  const handleViewDetails = async (eq: EquipmentLibrary) => {
    const res = await fetch(`/api/equipment/${eq.id}`);
    if (res.ok) {
      const data: EquipmentWithDetails = await res.json();
      setSelectedEquipment(data);
      setDetailsOpen(true);
    }
  };

  const refreshSelectedEquipment = async () => {
    if (selectedEquipment) {
      const res = await fetch(`/api/equipment/${selectedEquipment.id}`);
      if (res.ok) {
        const data: EquipmentWithDetails = await res.json();
        setSelectedEquipment(data);
      }
    }
  };

  const handleEdit = (eq: EquipmentLibrary) => {
    setEditingEquipment(eq);
    setEditOpen(true);
  };

  const filteredEquipment = equipment.filter((eq) =>
    eq.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    eq.manufacturer.toLowerCase().includes(searchQuery.toLowerCase()) ||
    eq.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Settings2 className="h-8 w-8" />
              Equipment Library
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage equipment with error-proofing controls and control methods
            </p>
          </div>
          <Button onClick={() => setNewEquipmentOpen(true)} data-testid="button-new-equipment">
            <Plus className="h-4 w-4 mr-2" />
            New Equipment
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search equipment by name, manufacturer, or location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-equipment"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredEquipment.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Equipment Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Manufacturer</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEquipment.map((eq) => (
                    <TableRow key={eq.id} data-testid={`row-equipment-${eq.id}`}>
                      <TableCell className="font-medium">{eq.name}</TableCell>
                      <TableCell className="capitalize">{eq.type.replace('_', ' ')}</TableCell>
                      <TableCell>{eq.manufacturer}</TableCell>
                      <TableCell>{eq.model}</TableCell>
                      <TableCell>{eq.location}</TableCell>
                      <TableCell>
                        <Badge variant={eq.status === 'active' ? 'default' : 'secondary'} data-testid={`badge-status-${eq.id}`}>
                          {eq.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewDetails(eq)}
                            data-testid={`button-view-${eq.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(eq)}
                            data-testid={`button-edit-${eq.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm(`Delete equipment "${eq.name}"?`)) {
                                deleteMutation.mutate(eq.id);
                              }
                            }}
                            data-testid={`button-delete-${eq.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? "No equipment found matching your search." : "No equipment found. Create your first equipment to get started."}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <EquipmentDetailsDialog equipment={selectedEquipment} onRefresh={refreshSelectedEquipment} />
        </Dialog>

        <EquipmentFormDialog
          equipment={undefined}
          open={newEquipmentOpen}
          onOpenChange={setNewEquipmentOpen}
        />

        <EquipmentFormDialog
          equipment={editingEquipment}
          open={editOpen}
          onOpenChange={(open) => {
            setEditOpen(open);
            if (!open) {
              setEditingEquipment(undefined);
            }
          }}
        />
      </div>
    </div>
  );
}
