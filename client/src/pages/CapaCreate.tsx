import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link } from "wouter";

const capaFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  type: z.string().min(1, "Type is required"),
  priority: z.string().min(1, "Priority is required"),
  sourceType: z.string().min(1, "Source type is required"),
  category: z.string().optional(),
  customerName: z.string().optional(),
  plantLocation: z.string().optional(),
  dateOccurred: z.string().optional(),
  dateDiscovered: z.string().optional(),
  targetClosureDate: z.string().optional(),
});

type CapaFormData = z.infer<typeof capaFormSchema>;

const sourceTypes = [
  { value: "customer_complaint", label: "Customer Complaint" },
  { value: "internal_ncr", label: "Internal NCR" },
  { value: "audit_finding", label: "Audit Finding" },
  { value: "supplier_issue", label: "Supplier Issue" },
  { value: "process_deviation", label: "Process Deviation" },
  { value: "warranty_return", label: "Warranty Return" },
  { value: "field_failure", label: "Field Failure" },
  { value: "management_review", label: "Management Review" },
  { value: "risk_assessment", label: "Risk Assessment" },
  { value: "continuous_improvement", label: "Continuous Improvement" },
  { value: "regulatory", label: "Regulatory" },
];

const categories = [
  "Quality", "Safety", "Delivery", "Cost", "Environmental",
];

export default function CapaCreate() {
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const form = useForm<CapaFormData>({
    resolver: zodResolver(capaFormSchema),
    defaultValues: {
      title: "",
      description: "",
      type: "corrective",
      priority: "medium",
      sourceType: "customer_complaint",
      category: "",
      customerName: "",
      plantLocation: "",
      dateOccurred: "",
      dateDiscovered: new Date().toISOString().split("T")[0],
      targetClosureDate: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CapaFormData) => {
      const payload: any = {
        ...data,
        dateOccurred: data.dateOccurred ? new Date(data.dateOccurred).toISOString() : null,
        dateDiscovered: data.dateDiscovered ? new Date(data.dateDiscovered).toISOString() : null,
        targetClosureDate: data.targetClosureDate ? new Date(data.targetClosureDate).toISOString() : null,
      };
      const res = await apiRequest("POST", "/api/capas", payload);
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/capas"] });
      toast({ title: "CAPA Created", description: `${data.capaNumber} has been created.` });
      navigate(`/capa/${data.id}`);
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const onSubmit = (data: CapaFormData) => {
    createMutation.mutate(data);
  };

  const watchedSource = form.watch("sourceType");
  const watchedPriority = form.watch("priority");

  // Auto-calculate target date based on priority
  const getDefaultTarget = (priority: string) => {
    const days = priority === "critical" ? 14 : priority === "high" ? 30 : priority === "medium" ? 60 : 90;
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split("T")[0];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/capa">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">New CAPA</h1>
          <p className="text-muted-foreground">Create a new Corrective/Preventive Action</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title *</FormLabel>
                    <FormControl>
                      <Input placeholder="Brief description of the issue" {...field} />
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
                    <FormLabel>Description *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Detailed description of the problem..."
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid gap-4 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="corrective">Corrective</SelectItem>
                          <SelectItem value="preventive">Preventive</SelectItem>
                          <SelectItem value="both">Both</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority *</FormLabel>
                      <Select
                        onValueChange={(val) => {
                          field.onChange(val);
                          if (!form.getValues("targetClosureDate")) {
                            form.setValue("targetClosureDate", getDefaultTarget(val));
                          }
                        }}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="critical">Critical</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="low">Low</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        {watchedPriority === "critical" ? "14 day target" :
                         watchedPriority === "high" ? "30 day target" :
                         watchedPriority === "medium" ? "60 day target" : "90 day target"}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat} value={cat.toLowerCase()}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Source Info */}
          <Card>
            <CardHeader>
              <CardTitle>Source Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="sourceType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Source Type *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {sourceTypes.map((s) => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {watchedSource === "customer_complaint" && (
                <FormField
                  control={form.control}
                  name="customerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Customer name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </CardContent>
          </Card>

          {/* Dates & Location */}
          <Card>
            <CardHeader>
              <CardTitle>Dates & Location</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <FormField
                  control={form.control}
                  name="dateOccurred"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date Occurred</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dateDiscovered"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date Discovered</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="targetClosureDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Closure Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="plantLocation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Plant Location</FormLabel>
                      <FormControl>
                        <Input placeholder="Plant / facility" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex justify-end gap-3">
            <Link href="/capa">
              <Button type="button" variant="outline">Cancel</Button>
            </Link>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create CAPA
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
