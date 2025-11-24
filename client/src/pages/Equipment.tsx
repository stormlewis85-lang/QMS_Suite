import { useState } from "react";
import { Settings2, Plus, Search, Eye, Pencil, Trash2, Loader2 } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { EquipmentLibrary, InsertEquipmentLibrary, EquipmentErrorProofing, EquipmentControlMethods } from "@shared/schema";
import { insertEquipmentLibrarySchema } from "@shared/schema";
import { z } from "zod";

function NewEquipmentDialog() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

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

  const createMutation = useMutation({
    mutationFn: async (data: InsertEquipmentLibrary) => {
      const res = await apiRequest("POST", "/api/equipment", data);
      return await res.json() as EquipmentLibrary;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/equipment"] });
      toast({
        title: "Equipment created",
        description: "The equipment has been successfully created.",
      });
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
      setOpen(false);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create equipment",
      });
    },
  });

  const onSubmit = (data: InsertEquipmentLibrary) => {
    createMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-new-equipment">
          <Plus className="h-4 w-4 mr-2" />
          New Equipment
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create New Equipment</DialogTitle>
          <DialogDescription>
            Add new equipment to the library.
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
              <Button type="button" variant="outline" onClick={() => setOpen(false)} data-testid="button-cancel">
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending} data-testid="button-create-equipment">
                {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Equipment
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

function EquipmentDetailsDialog({ equipment }: { equipment: EquipmentWithDetails | null }) {
  if (!equipment) return null;

  return (
    <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{equipment.name}</DialogTitle>
        <DialogDescription>
          {equipment.manufacturer} {equipment.model} • {equipment.location}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-6">
        <div>
          <h4 className="text-sm font-semibold mb-2">Equipment Details</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Type:</span>
              <span className="ml-2 capitalize">{equipment.type.replace('_', ' ')}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Status:</span>
              <span className="ml-2">
                <Badge variant={equipment.status === 'active' ? 'default' : 'secondary'} data-testid={`badge-status-${equipment.status}`}>
                  {equipment.status}
                </Badge>
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Serial Number:</span>
              <span className="ml-2">{equipment.serialNumber}</span>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold mb-2">Error-Proofing Controls ({equipment.errorProofingControls.length})</h4>
          {equipment.errorProofingControls.length > 0 ? (
            <div className="space-y-3">
              {equipment.errorProofingControls.map((control) => (
                <Card key={control.id} data-testid={`card-error-proofing-${control.id}`}>
                  <CardHeader className="py-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">{control.name}</CardTitle>
                      <Badge variant={control.controlType === 'prevention' ? 'default' : 'secondary'}>
                        {control.controlType}
                      </Badge>
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
            <p className="text-sm text-muted-foreground">No error-proofing controls defined.</p>
          )}
        </div>

        <div>
          <h4 className="text-sm font-semibold mb-2">Control Methods ({equipment.controlMethods.length})</h4>
          {equipment.controlMethods.length > 0 ? (
            <div className="space-y-2">
              {equipment.controlMethods.map((method) => (
                <Card key={method.id} data-testid={`card-control-method-${method.id}`}>
                  <CardContent className="py-3 text-sm space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{method.characteristicName}</span>
                      <Badge variant="outline">{method.characteristicType}</Badge>
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
            <p className="text-sm text-muted-foreground">No control methods defined.</p>
          )}
        </div>
      </div>
    </DialogContent>
  );
}

export default function EquipmentPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentWithDetails | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
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
          <NewEquipmentDialog />
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
                            onClick={() => toast({ title: "Edit functionality coming soon" })}
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
          <EquipmentDetailsDialog equipment={selectedEquipment} />
        </Dialog>
      </div>
    </div>
  );
}
