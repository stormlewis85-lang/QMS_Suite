import { useState } from "react";
import { Layers, Plus, Search, Eye, Copy, Edit, Loader2 } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
import { StatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ProcessDef } from "@shared/schema";
import { insertProcessDefSchema } from "@shared/schema";

const createProcessFormSchema = insertProcessDefSchema.extend({
  createdBy: z.string().uuid().optional(),
});

type CreateProcessForm = z.infer<typeof createProcessFormSchema>;

function NewProcessDialog() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<CreateProcessForm>({
    resolver: zodResolver(createProcessFormSchema),
    defaultValues: {
      name: "",
      rev: "A",
      status: "draft",
      effectiveFrom: undefined,
      supersedesId: undefined,
      changeNote: undefined,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateProcessForm) => {
      const res = await apiRequest("POST", "/api/processes", {
        process: data,
        steps: [],
      });
      return await res.json() as ProcessDef;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/processes"] });
      toast({
        title: "Process created",
        description: "The process definition has been successfully created.",
      });
      form.reset();
      setOpen(false);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create process",
      });
    },
  });

  const onSubmit = (data: CreateProcessForm) => {
    createMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-new-process">
          <Plus className="h-4 w-4 mr-2" />
          New Process
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Process</DialogTitle>
          <DialogDescription>
            Add a new manufacturing process definition to the library.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Process Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Injection Molding" {...field} data-testid="input-process-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="rev"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Revision</FormLabel>
                    <FormControl>
                      <Input placeholder="A" {...field} data-testid="input-revision" />
                    </FormControl>
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
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger data-testid="select-status">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="review">Review</SelectItem>
                        <SelectItem value="effective">Effective</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="changeNote"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Change Note (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Initial release..."
                      {...field}
                      value={field.value || ""}
                      data-testid="input-change-note"
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
                Create Process
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function Processes() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: processes = [], isLoading, error } = useQuery<ProcessDef[]>({
    queryKey: ["/api/processes"],
  });

  const filteredProcesses = processes.filter(process => 
    process.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    process.rev.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Process Library</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manufacturing process definitions with version control
            </p>
          </div>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Layers className="h-12 w-12 text-destructive mb-4" />
              <h3 className="text-lg font-medium mb-2">Error loading processes</h3>
              <p className="text-sm text-muted-foreground">
                {error instanceof Error ? error.message : "Failed to load processes"}
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
          <h1 className="text-2xl font-semibold">Process Library</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manufacturing process definitions with version control
          </p>
        </div>
        <NewProcessDialog />
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search processes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-processes"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredProcesses.map((process) => (
            <Card key={process.id} className="hover-elevate" data-testid={`card-process-${process.id}`}>
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
                    <Layers className="h-5 w-5 text-foreground" />
                  </div>
                  <div className="flex flex-col">
                    <h3 className="font-medium leading-none">{process.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">Rev {process.rev}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <StatusBadge status={process.status} />
                </div>
                
                {process.effectiveFrom && (
                  <div className="text-xs text-muted-foreground">
                    Effective: {new Date(process.effectiveFrom).toLocaleDateString()}
                  </div>
                )}
                
                <div className="flex items-center gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1" data-testid={`button-view-${process.id}`}>
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                  <Button variant="outline" size="icon" data-testid={`button-edit-${process.id}`}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" data-testid={`button-copy-${process.id}`}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && filteredProcesses.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Layers className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No processes found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Try adjusting your search or create a new process.
            </p>
            <Button data-testid="button-create-first-process">
              <Plus className="h-4 w-4 mr-2" />
              Create First Process
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
