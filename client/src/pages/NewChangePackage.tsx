import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { PageHeader } from '@/components/ui/page-header';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  ArrowRight,
  Package,
  AlertTriangle
} from 'lucide-react';

const reasonCodes = [
  { value: 'CORRECTIVE_ACTION', label: 'Corrective Action (8D/CAPA)' },
  { value: 'PREVENTIVE_ACTION', label: 'Preventive Action' },
  { value: 'CONTINUOUS_IMPROVEMENT', label: 'Continuous Improvement' },
  { value: 'CUSTOMER_REQUEST', label: 'Customer Request' },
  { value: 'ENGINEERING_CHANGE', label: 'Engineering Change' },
  { value: 'PROCESS_OPTIMIZATION', label: 'Process Optimization' },
  { value: 'REGULATORY_REQUIREMENT', label: 'Regulatory Requirement' },
  { value: 'SUPPLIER_CHANGE', label: 'Supplier Change' },
  { value: 'EQUIPMENT_CHANGE', label: 'Equipment Change' },
  { value: 'MATERIAL_CHANGE', label: 'Material Change' },
];

const entityTypes = [
  { value: 'fmea_template_row', label: 'FMEA Template Row' },
  { value: 'control_template_row', label: 'Control Plan Template Row' },
  { value: 'process_def', label: 'Process Definition' },
];

const formSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().optional(),
  reasonCode: z.string().min(1, 'Reason code is required'),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  targetEntityType: z.string().min(1, 'Entity type is required'),
  targetEntityId: z.string().min(1, 'Target entity is required'),
});

type FormData = z.infer<typeof formSchema>;

interface FieldChange {
  id: string;
  fieldPath: string;
  fieldLabel: string;
  oldValue: string;
  newValue: string;
  changeType: 'add' | 'modify' | 'delete';
  impactLevel: 'low' | 'medium' | 'high';
}

export default function NewChangePackage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [changes, setChanges] = useState<FieldChange[]>([]);
  const [newChange, setNewChange] = useState<Partial<FieldChange>>({
    changeType: 'modify',
    impactLevel: 'medium',
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      reasonCode: '',
      priority: 'medium',
      targetEntityType: '',
      targetEntityId: '',
    },
  });

  const selectedEntityType = form.watch('targetEntityType');

  const { data: entities } = useQuery({
    queryKey: ['entities', selectedEntityType],
    queryFn: async () => {
      if (!selectedEntityType) return [];
      
      let endpoint = '';
      if (selectedEntityType === 'fmea_template_row') {
        endpoint = '/api/fmea-template-rows';
      } else if (selectedEntityType === 'control_template_row') {
        endpoint = '/api/control-template-rows';
      } else if (selectedEntityType === 'process_def') {
        endpoint = '/api/processes';
      }
      
      const res = await fetch(endpoint);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!selectedEntityType,
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const res = await fetch('/api/change-packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          initiatedBy: 'current-user',
          changes: changes.map(c => ({
            fieldPath: c.fieldPath,
            fieldLabel: c.fieldLabel,
            oldValue: c.oldValue,
            newValue: c.newValue,
            changeType: c.changeType,
            impactLevel: c.impactLevel,
          })),
        }),
      });
      if (!res.ok) throw new Error('Failed to create change package');
      return res.json();
    },
    onSuccess: (pkg) => {
      toast({ title: 'Change package created', description: pkg.packageNumber });
      setLocation(`/change-packages/${pkg.id}`);
    },
    onError: (error) => {
      toast({
        title: 'Failed to create',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    },
  });

  const addChange = () => {
    if (!newChange.fieldPath || !newChange.fieldLabel) {
      toast({ title: 'Field path and label required', variant: 'destructive' });
      return;
    }

    setChanges([
      ...changes,
      {
        id: crypto.randomUUID(),
        fieldPath: newChange.fieldPath || '',
        fieldLabel: newChange.fieldLabel || '',
        oldValue: newChange.oldValue || '',
        newValue: newChange.newValue || '',
        changeType: newChange.changeType || 'modify',
        impactLevel: newChange.impactLevel || 'medium',
      },
    ]);

    setNewChange({
      changeType: 'modify',
      impactLevel: 'medium',
    });
  };

  const removeChange = (id: string) => {
    setChanges(changes.filter(c => c.id !== id));
  };

  const onSubmit = (data: FormData) => {
    if (changes.length === 0) {
      toast({ title: 'Add at least one change', variant: 'destructive' });
      return;
    }
    createMutation.mutate(data);
  };

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="New Change Package"
        description="Initiate a controlled change to process templates"
        actions={
          <Button variant="outline" onClick={() => setLocation('/change-packages')} data-testid="button-cancel-new-package">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        }
      />

      <div className="flex-1 overflow-auto p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-4xl">
            <Card>
              <CardHeader>
                <CardTitle>Change Package Details</CardTitle>
                <CardDescription>
                  Define the scope and reason for this change
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., Update pack pressure detection method" 
                          data-testid="input-package-title"
                          {...field} 
                        />
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
                          placeholder="Detailed description of the change and its rationale..."
                          rows={3}
                          data-testid="input-package-description"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="reasonCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reason Code *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-reason-code">
                              <SelectValue placeholder="Select reason..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {reasonCodes.map(rc => (
                              <SelectItem key={rc.value} value={rc.value}>
                                {rc.label}
                              </SelectItem>
                            ))}
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
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-priority">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="critical">Critical</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Target Entity</CardTitle>
                <CardDescription>
                  Select the template or process to modify
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="targetEntityType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Entity Type *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-entity-type">
                              <SelectValue placeholder="Select type..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {entityTypes.map(et => (
                              <SelectItem key={et.value} value={et.value}>
                                {et.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="targetEntityId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target Entity *</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value}
                          disabled={!selectedEntityType}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-target-entity">
                              <SelectValue placeholder={
                                selectedEntityType ? "Select entity..." : "Select type first"
                              } />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {entities?.map((entity: any) => (
                              <SelectItem key={entity.id} value={entity.id}>
                                {entity.name || entity.failureMode || entity.characteristicName || entity.id}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          The template or process being modified
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Field Changes</CardTitle>
                <CardDescription>
                  Define the specific field changes (at least one required)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
                  <div className="grid md:grid-cols-2 gap-3">
                    <div>
                      <Label>Field Path *</Label>
                      <Input
                        placeholder="e.g., detection, severity, controlMethod"
                        value={newChange.fieldPath || ''}
                        onChange={(e) => setNewChange({ ...newChange, fieldPath: e.target.value })}
                        data-testid="input-field-path"
                      />
                    </div>
                    <div>
                      <Label>Field Label *</Label>
                      <Input
                        placeholder="e.g., Detection Rating, Control Method"
                        value={newChange.fieldLabel || ''}
                        onChange={(e) => setNewChange({ ...newChange, fieldLabel: e.target.value })}
                        data-testid="input-field-label"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-3">
                    <div>
                      <Label>Old Value</Label>
                      <Input
                        placeholder="Current value"
                        value={newChange.oldValue || ''}
                        onChange={(e) => setNewChange({ ...newChange, oldValue: e.target.value })}
                        data-testid="input-old-value"
                      />
                    </div>
                    <div>
                      <Label>New Value</Label>
                      <Input
                        placeholder="New value"
                        value={newChange.newValue || ''}
                        onChange={(e) => setNewChange({ ...newChange, newValue: e.target.value })}
                        data-testid="input-new-value"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-3">
                    <div>
                      <Label>Change Type</Label>
                      <Select
                        value={newChange.changeType}
                        onValueChange={(v) => setNewChange({ ...newChange, changeType: v as any })}
                      >
                        <SelectTrigger data-testid="select-change-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="add">Add</SelectItem>
                          <SelectItem value="modify">Modify</SelectItem>
                          <SelectItem value="delete">Delete</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Impact Level</Label>
                      <Select
                        value={newChange.impactLevel}
                        onValueChange={(v) => setNewChange({ ...newChange, impactLevel: v as any })}
                      >
                        <SelectTrigger data-testid="select-impact-level">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end">
                      <Button type="button" onClick={addChange} className="w-full" data-testid="button-add-change">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Change
                      </Button>
                    </div>
                  </div>
                </div>

                {changes.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Field</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Old</TableHead>
                        <TableHead></TableHead>
                        <TableHead>New</TableHead>
                        <TableHead>Impact</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {changes.map((change) => (
                        <TableRow key={change.id} data-testid={`row-change-${change.id}`}>
                          <TableCell>
                            <div className="font-medium">{change.fieldLabel}</div>
                            <div className="text-xs text-muted-foreground font-mono">
                              {change.fieldPath}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{change.changeType}</Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm text-red-600 dark:text-red-400">
                            {change.oldValue || '—'}
                          </TableCell>
                          <TableCell>
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          </TableCell>
                          <TableCell className="font-mono text-sm text-green-600 dark:text-green-400">
                            {change.newValue || '—'}
                          </TableCell>
                          <TableCell>
                            <Badge className={
                              change.impactLevel === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                              change.impactLevel === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                              'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                            }>
                              {change.impactLevel}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeChange(change.id)}
                              data-testid={`button-remove-change-${change.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground border rounded-lg">
                    <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No changes added yet</p>
                    <p className="text-sm">Add at least one field change above</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation('/change-packages')}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || changes.length === 0}
                data-testid="button-create-package"
              >
                <Package className="h-4 w-4 mr-2" />
                {createMutation.isPending ? 'Creating...' : 'Create Change Package'}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
