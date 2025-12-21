import { useState, useEffect } from "react";
import { Package, Plus, Search, Eye, Pencil, Trash2, Loader2, Factory, Users, Layers, FileText, ClipboardList, Building2, Car } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Part, InsertPart, PFMEA, ControlPlan } from "@shared/schema";
import { insertPartSchema } from "@shared/schema";
import { z } from "zod";

// Common customers for automotive industry
const CUSTOMERS = [
  "Ford",
  "GM",
  "Tesla",
  "Stellantis",
  "Toyota",
  "Honda",
  "BMW",
  "Mercedes-Benz",
  "Volkswagen",
  "Kautex",
  "ABC Technologies",
  "Plastic Omnium",
  "Other",
];

// Common plants/locations
const PLANTS = [
  "Detroit",
  "Arlington",
  "Austin",
  "Flat Rock",
  "Fraser",
  "Windsor",
  "Louisville",
  "Bowling Green",
  "Spring Hill",
  "San Antonio",
  "Other",
];

// Extended part type with related documents count
interface PartWithDetails extends Part {
  pfmeasCount?: number;
  controlPlansCount?: number;
}

// Form schema with validation
const partFormSchema = insertPartSchema.extend({
  customer: z.string().min(1, "Customer is required"),
  program: z.string().min(1, "Program is required"),
  partNumber: z.string().min(1, "Part number is required"),
  partName: z.string().min(1, "Part name is required"),
  plant: z.string().min(1, "Plant is required"),
  csrNotes: z.string().optional(),
});

type PartFormValues = z.infer<typeof partFormSchema>;

// Part form dialog (shared by Create and Edit)
function PartFormDialog({
  part,
  open,
  onOpenChange,
}: {
  part?: Part;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const isEditing = !!part;
  const [customCustomer, setCustomCustomer] = useState(false);
  const [customPlant, setCustomPlant] = useState(false);

  const form = useForm<PartFormValues>({
    resolver: zodResolver(partFormSchema),
    defaultValues: {
      customer: "",
      program: "",
      partNumber: "",
      partName: "",
      plant: "",
      csrNotes: "",
    },
  });

  useEffect(() => {
    if (part && open) {
      const isCustomCustomer = !CUSTOMERS.includes(part.customer);
      const isCustomPlant = !PLANTS.includes(part.plant);
      setCustomCustomer(isCustomCustomer);
      setCustomPlant(isCustomPlant);
      
      form.reset({
        customer: part.customer,
        program: part.program,
        partNumber: part.partNumber,
        partName: part.partName,
        plant: part.plant,
        csrNotes: part.csrNotes || "",
      });
    } else if (!open) {
      setCustomCustomer(false);
      setCustomPlant(false);
      form.reset({
        customer: "",
        program: "",
        partNumber: "",
        partName: "",
        plant: "",
        csrNotes: "",
      });
    }
  }, [part, open, form]);

  const mutation = useMutation({
    mutationFn: async (data: PartFormValues) => {
      const url = isEditing ? `/api/parts/${part.id}` : "/api/parts";
      const method = isEditing ? "PATCH" : "POST";
      const res = await apiRequest(method, url, data);
      return (await res.json()) as Part;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parts"] });
      toast({
        title: isEditing ? "Part updated" : "Part created",
        description: `The part has been successfully ${isEditing ? "updated" : "created"}.`,
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || `Failed to ${isEditing ? "update" : "create"} part`,
      });
    },
  });

  const onSubmit = (data: PartFormValues) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Part" : "Create New Part"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update part details. Changes will be tracked for quality audit."
              : "Add a new part to the system. This will create a part record that can have PFMEAs and Control Plans generated."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="customer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer</FormLabel>
                    {customCustomer ? (
                      <div className="flex gap-2">
                        <FormControl>
                          <Input
                            placeholder="Enter customer name"
                            {...field}
                            data-testid="input-part-customer"
                          />
                        </FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setCustomCustomer(false);
                            field.onChange("");
                          }}
                          data-testid="button-customer-list"
                        >
                          List
                        </Button>
                      </div>
                    ) : (
                      <Select
                        onValueChange={(value) => {
                          if (value === "Other") {
                            setCustomCustomer(true);
                            field.onChange("");
                          } else {
                            field.onChange(value);
                          }
                        }}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-part-customer">
                            <SelectValue placeholder="Select customer" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CUSTOMERS.map((customer) => (
                            <SelectItem key={customer} value={customer}>
                              {customer}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="program"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Program</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., F-150, Model Y"
                        {...field}
                        data-testid="input-part-program"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="partNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Part Number</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., WHL-2024-001"
                        {...field}
                        disabled={isEditing}
                        data-testid="input-part-number"
                      />
                    </FormControl>
                    <FormDescription>
                      {isEditing ? "Part number cannot be changed" : "Unique identifier for this part"}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="partName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Part Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Wheel Assembly"
                        {...field}
                        data-testid="input-part-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="plant"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Manufacturing Plant</FormLabel>
                  {customPlant ? (
                    <div className="flex gap-2">
                      <FormControl>
                        <Input
                          placeholder="Enter plant location"
                          {...field}
                          data-testid="input-part-plant"
                        />
                      </FormControl>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setCustomPlant(false);
                          field.onChange("");
                        }}
                        data-testid="button-plant-list"
                      >
                        List
                      </Button>
                    </div>
                  ) : (
                    <Select
                      onValueChange={(value) => {
                        if (value === "Other") {
                          setCustomPlant(true);
                          field.onChange("");
                        } else {
                          field.onChange(value);
                        }
                      }}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-part-plant">
                          <SelectValue placeholder="Select plant" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PLANTS.map((plant) => (
                          <SelectItem key={plant} value={plant}>
                            {plant}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="csrNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CSR Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Customer-specific requirements, special characteristics, or critical notes..."
                      rows={3}
                      {...field}
                      data-testid="textarea-csr-notes"
                    />
                  </FormControl>
                  <FormDescription>
                    Document any customer-specific requirements (CSR) or special characteristics
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="button-part-cancel"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending} data-testid="button-part-submit">
                {mutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isEditing ? "Save Changes" : "Create Part"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// Part details dialog with related documents
function PartDetailsDialog({
  part,
  open,
  onOpenChange,
  onEdit,
}: {
  part: Part | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
}) {
  // Fetch PFMEAs for this part
  const { data: pfmeas = [] } = useQuery<PFMEA[]>({
    queryKey: ["/api/pfmeas", { partId: part?.id }],
    queryFn: async () => {
      if (!part) return [];
      const res = await fetch(`/api/pfmeas?partId=${part.id}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!part && open,
  });

  // Fetch Control Plans for this part
  const { data: controlPlans = [] } = useQuery<ControlPlan[]>({
    queryKey: ["/api/control-plans", { partId: part?.id }],
    queryFn: async () => {
      if (!part) return [];
      const res = await fetch(`/api/control-plans?partId=${part.id}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!part && open,
  });

  if (!part) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {part.partName}
          </DialogTitle>
          <DialogDescription>Part Number: {part.partNumber}</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="details" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details" data-testid="tab-part-details">Details</TabsTrigger>
            <TabsTrigger value="pfmeas" data-testid="tab-part-pfmeas">
              PFMEAs ({pfmeas.length})
            </TabsTrigger>
            <TabsTrigger value="controlplans" data-testid="tab-part-controlplans">
              Control Plans ({controlPlans.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  Customer
                </div>
                <p className="font-medium">{part.customer}</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Car className="h-4 w-4" />
                  Program
                </div>
                <p className="font-medium">{part.program}</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Package className="h-4 w-4" />
                  Part Number
                </div>
                <p className="font-medium font-mono">{part.partNumber}</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Factory className="h-4 w-4" />
                  Plant
                </div>
                <p className="font-medium">{part.plant}</p>
              </div>
            </div>

            {part.csrNotes && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  CSR Notes
                </div>
                <p className="text-sm bg-muted p-3 rounded-md">{part.csrNotes}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="pfmeas" className="mt-4">
            {pfmeas.length > 0 ? (
              <div className="space-y-2">
                {pfmeas.map((pfmea) => (
                  <div
                    key={pfmea.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                    data-testid={`pfmea-row-${pfmea.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">
                          PFMEA Rev {pfmea.rev}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {pfmea.docNo || "No document number"}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={
                        pfmea.status === "effective"
                          ? "default"
                          : pfmea.status === "draft"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {pfmea.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No PFMEAs created for this part</p>
                <p className="text-sm mt-1">
                  Generate a PFMEA from the Part Detail page
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="controlplans" className="mt-4">
            {controlPlans.length > 0 ? (
              <div className="space-y-2">
                {controlPlans.map((cp) => (
                  <div
                    key={cp.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                    data-testid={`controlplan-row-${cp.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <ClipboardList className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">
                          Control Plan Rev {cp.rev}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {cp.type} - {cp.docNo || "No document number"}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={
                        cp.status === "effective"
                          ? "default"
                          : cp.status === "draft"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {cp.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No Control Plans created for this part</p>
                <p className="text-sm mt-1">
                  Generate a Control Plan from the Part Detail page
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-part-details-close">
            Close
          </Button>
          <Button onClick={onEdit} data-testid="button-part-details-edit">
            <Pencil className="h-4 w-4 mr-2" />
            Edit Part
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Delete confirmation dialog
function DeletePartDialog({
  part,
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: {
  part: Part | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending: boolean;
}) {
  if (!part) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Part</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete <strong>{part.partName}</strong> (
            {part.partNumber})? This action cannot be undone and will also delete
            all associated PFMEAs and Control Plans.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel data-testid="button-delete-part-cancel">Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            data-testid="button-delete-part-confirm"
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete Part
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Main Parts page component
export default function Parts() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [customerFilter, setCustomerFilter] = useState<string>("all");
  const [plantFilter, setPlantFilter] = useState<string>("all");

  // Dialog states
  const [newPartOpen, setNewPartOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Selected items
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [editingPart, setEditingPart] = useState<Part | undefined>(undefined);
  const [partToDelete, setPartToDelete] = useState<Part | null>(null);

  // Fetch parts
  const { data: parts = [], isLoading, error } = useQuery<Part[]>({
    queryKey: ["/api/parts"],
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (partId: string) => {
      await apiRequest("DELETE", `/api/parts/${partId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parts"] });
      toast({
        title: "Part deleted",
        description: "The part and all associated documents have been deleted.",
      });
      setDeleteOpen(false);
      setPartToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete part",
      });
    },
  });

  // Get unique customers and plants for filters
  const uniqueCustomers = Array.from(new Set(parts.map((p) => p.customer))).sort();
  const uniquePlants = Array.from(new Set(parts.map((p) => p.plant))).sort();

  // Filter parts
  const filteredParts = parts.filter((part) => {
    const matchesSearch =
      part.partNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      part.partName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      part.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      part.program.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCustomer =
      customerFilter === "all" || part.customer === customerFilter;
    const matchesPlant = plantFilter === "all" || part.plant === plantFilter;

    return matchesSearch && matchesCustomer && matchesPlant;
  });

  // Group parts by customer for summary
  const partsByCustomer = parts.reduce((acc, part) => {
    acc[part.customer] = (acc[part.customer] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Handlers
  const handleView = (part: Part) => {
    setSelectedPart(part);
    setDetailsOpen(true);
  };

  const handleEdit = (part: Part) => {
    setEditingPart(part);
    setEditOpen(true);
  };

  const handleDelete = (part: Part) => {
    setPartToDelete(part);
    setDeleteOpen(true);
  };

  const confirmDelete = () => {
    if (partToDelete) {
      deleteMutation.mutate(partToDelete.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Parts</h1>
          <p className="text-muted-foreground">
            Manage automotive parts across customers and programs
          </p>
        </div>
        <Button onClick={() => setNewPartOpen(true)} data-testid="button-create-part">
          <Plus className="mr-2 h-4 w-4" />
          New Part
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Package className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{parts.length}</p>
                <p className="text-sm text-muted-foreground">Total Parts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Users className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{uniqueCustomers.length}</p>
                <p className="text-sm text-muted-foreground">Customers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Factory className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{uniquePlants.length}</p>
                <p className="text-sm text-muted-foreground">Plants</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <Layers className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {Object.keys(partsByCustomer).length > 0
                    ? Math.max(...Object.values(partsByCustomer))
                    : 0}
                </p>
                <p className="text-sm text-muted-foreground">Max per Customer</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search parts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-parts"
              />
            </div>
            <div className="flex gap-2">
              <Select value={customerFilter} onValueChange={setCustomerFilter}>
                <SelectTrigger className="w-[180px]" data-testid="select-customer-filter">
                  <SelectValue placeholder="All Customers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Customers</SelectItem>
                  {uniqueCustomers.map((customer) => (
                    <SelectItem key={customer} value={customer}>
                      {customer}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={plantFilter} onValueChange={setPlantFilter}>
                <SelectTrigger className="w-[180px]" data-testid="select-plant-filter">
                  <SelectValue placeholder="All Plants" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Plants</SelectItem>
                  {uniquePlants.map((plant) => (
                    <SelectItem key={plant} value={plant}>
                      {plant}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="text-center py-12 text-destructive">
              <p>Failed to load parts</p>
              <p className="text-sm text-muted-foreground mt-1">
                {error instanceof Error ? error.message : "Unknown error"}
              </p>
            </div>
          ) : filteredParts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              {searchQuery || customerFilter !== "all" || plantFilter !== "all" ? (
                <>
                  <p className="font-medium">No parts match your filters</p>
                  <p className="text-sm mt-1">Try adjusting your search or filter criteria</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => {
                      setSearchQuery("");
                      setCustomerFilter("all");
                      setPlantFilter("all");
                    }}
                    data-testid="button-clear-filters"
                  >
                    Clear Filters
                  </Button>
                </>
              ) : (
                <>
                  <p className="font-medium">No parts yet</p>
                  <p className="text-sm mt-1">Create your first part to get started</p>
                  <Button className="mt-4" onClick={() => setNewPartOpen(true)} data-testid="button-create-part-empty">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Part
                  </Button>
                </>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Part Number</TableHead>
                  <TableHead>Part Name</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Program</TableHead>
                  <TableHead>Plant</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredParts.map((part) => (
                  <TableRow key={part.id} data-testid={`part-row-${part.id}`}>
                    <TableCell className="font-mono font-medium">
                      {part.partNumber}
                    </TableCell>
                    <TableCell>{part.partName}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{part.customer}</Badge>
                    </TableCell>
                    <TableCell>{part.program}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Factory className="h-3 w-3 text-muted-foreground" />
                        {part.plant}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" data-testid={`button-actions-${part.id}`}>
                            ...
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleView(part)} data-testid={`button-view-${part.id}`}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(part)} data-testid={`button-edit-${part.id}`}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(part)}
                            className="text-destructive focus:text-destructive"
                            data-testid={`button-delete-${part.id}`}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <PartDetailsDialog
        part={selectedPart}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        onEdit={() => {
          setDetailsOpen(false);
          if (selectedPart) {
            handleEdit(selectedPart);
          }
        }}
      />

      <PartFormDialog
        part={undefined}
        open={newPartOpen}
        onOpenChange={setNewPartOpen}
      />

      <PartFormDialog
        part={editingPart}
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) {
            setEditingPart(undefined);
          }
        }}
      />

      <DeletePartDialog
        part={partToDelete}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={confirmDelete}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}
