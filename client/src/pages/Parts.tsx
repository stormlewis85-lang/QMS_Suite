import { useState } from "react";
import { Package, Plus, Search, FileText, Download, Loader2 } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
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
import { StatusBadge } from "@/components/StatusBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Part, InsertPart } from "@shared/schema";
import { insertPartSchema } from "@shared/schema";

function NewPartDialog() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<InsertPart>({
    resolver: zodResolver(insertPartSchema),
    defaultValues: {
      customer: "",
      program: "",
      partNumber: "",
      partName: "",
      plant: "",
      csrNotes: null,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertPart) => {
      const res = await apiRequest("POST", "/api/parts", data);
      return await res.json() as Part;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parts"] });
      toast({
        title: "Part created",
        description: "The part has been successfully created.",
      });
      setOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create part",
      });
    },
  });

  const onSubmit = (data: InsertPart) => {
    createMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-new-part">
          <Plus className="h-4 w-4 mr-2" />
          New Part
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Part</DialogTitle>
          <DialogDescription>
            Add a new customer part to the system.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="partNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Part Number</FormLabel>
                  <FormControl>
                    <Input placeholder="WHL-2024-001" {...field} data-testid="input-part-number" />
                  </FormControl>
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
                    <Input placeholder="Wheel Assembly" {...field} data-testid="input-part-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="customer"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer</FormLabel>
                  <FormControl>
                    <Input placeholder="Ford" {...field} data-testid="input-customer" />
                  </FormControl>
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
                    <Input placeholder="F-150" {...field} data-testid="input-program" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="plant"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plant</FormLabel>
                  <FormControl>
                    <Input placeholder="Detroit" {...field} data-testid="input-plant" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="csrNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer Specific Requirements (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Special requirements..."
                      {...field}
                      value={field.value || ""}
                      data-testid="input-csr-notes"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                data-testid="button-submit"
              >
                {createMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Create Part
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function Parts() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: parts = [], isLoading, error } = useQuery<Part[]>({
    queryKey: ["/api/parts"],
  });

  const filteredParts = parts.filter(part => 
    part.partNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    part.partName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    part.customer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Parts</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage customer parts and their process documentation
            </p>
          </div>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="h-12 w-12 text-destructive mb-4" />
              <h3 className="text-lg font-medium mb-2">Error loading parts</h3>
              <p className="text-sm text-muted-foreground">
                {error instanceof Error ? error.message : "Failed to load parts"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Parts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage customer parts and their process documentation
          </p>
        </div>
        <NewPartDialog />
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by part number, name, or customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-parts"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <input type="checkbox" className="rounded" data-testid="checkbox-select-all" />
                    </TableHead>
                    <TableHead className="font-semibold">Part Number</TableHead>
                    <TableHead className="font-semibold">Part Name</TableHead>
                    <TableHead className="font-semibold">Customer</TableHead>
                    <TableHead className="font-semibold">Program</TableHead>
                    <TableHead className="font-semibold">Plant</TableHead>
                    <TableHead className="w-24 text-right font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredParts.map((part) => (
                    <TableRow key={part.id} className="hover-elevate" data-testid={`row-part-${part.id}`}>
                      <TableCell>
                        <input type="checkbox" className="rounded" />
                      </TableCell>
                      <TableCell className="font-mono font-medium">{part.partNumber}</TableCell>
                      <TableCell>{part.partName}</TableCell>
                      <TableCell>{part.customer}</TableCell>
                      <TableCell>{part.program}</TableCell>
                      <TableCell>{part.plant}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" data-testid={`button-view-${part.id}`}>
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" data-testid={`button-download-${part.id}`}>
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {!isLoading && filteredParts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No parts found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {searchQuery ? "Try adjusting your search or create a new part." : "Get started by creating your first part."}
              </p>
              <Button data-testid="button-create-first-part">
                <Plus className="h-4 w-4 mr-2" />
                Create First Part
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
