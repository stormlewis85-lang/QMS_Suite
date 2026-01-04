import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  Save, 
  RotateCcw, 
  AlertTriangle, 
  Shield,
  Sparkles
} from 'lucide-react';
import {
  FMEA_TEMPLATE_FIELDS,
  CONTROL_TEMPLATE_FIELDS,
  detectChanges,
  determineChangeFlow,
  calculateAP,
  formatDisplayValue,
  type FieldDiff,
} from '@/lib/field-classification';
import QuickChangeDialog from './QuickChangeDialog';
import ChangeWizard from './ChangeWizard';

interface TemplateEditorProps {
  entityType: 'fmea_template_row' | 'control_template_row';
  entityId: string;
  initialData: Record<string, any>;
  entityName: string;
  onSaveComplete?: () => void;
}

export default function TemplateEditor({
  entityType,
  entityId,
  initialData,
  entityName,
  onSaveComplete,
}: TemplateEditorProps) {
  const [formData, setFormData] = useState<Record<string, any>>(initialData);
  const [showQuickDialog, setShowQuickDialog] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  
  const fieldDefs = entityType === 'fmea_template_row' 
    ? FMEA_TEMPLATE_FIELDS 
    : CONTROL_TEMPLATE_FIELDS;

  const { data: controlsLibrary } = useQuery({
    queryKey: ['/api/controls-library'],
  });

  const diffs = useMemo(() => 
    detectChanges(initialData, formData, fieldDefs),
    [initialData, formData, fieldDefs]
  );

  const changeFlow = useMemo(() => 
    determineChangeFlow(diffs.map(d => d.fieldPath), fieldDefs),
    [diffs, fieldDefs]
  );

  useEffect(() => {
    if (entityType === 'fmea_template_row') {
      const s = formData.severity;
      const o = formData.occurrence;
      const d = formData.detection;
      if (s && o && d) {
        const newAP = calculateAP(s, o, d);
        if (newAP !== formData.ap) {
          setFormData(prev => ({ ...prev, ap: newAP }));
        }
      }
    }
  }, [formData.severity, formData.occurrence, formData.detection, entityType]);

  const handleFieldChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleReset = () => {
    setFormData(initialData);
  };

  const handleSave = () => {
    if (diffs.length === 0) return;

    if (changeFlow === 'wizard') {
      setShowWizard(true);
    } else if (changeFlow === 'confirm') {
      setShowQuickDialog(true);
    } else {
      console.log('Saving minor changes:', diffs);
      onSaveComplete?.();
    }
  };

  const hasCriticalChanges = diffs.some(d => d.impact === 'critical');
  const hasChanges = diffs.length > 0;

  const fmeaSections = entityType === 'fmea_template_row' ? [
    { title: 'Function & Requirements', fields: ['function', 'requirement'] },
    { title: 'Failure Analysis', fields: ['failureMode', 'effect', 'cause'] },
    { title: 'Risk Assessment', fields: ['severity', 'occurrence', 'detection', 'ap'] },
    { title: 'Controls', fields: ['preventionControls', 'detectionControls'] },
    { title: 'Special Characteristics', fields: ['specialFlag', 'csrSymbol'] },
    { title: 'Notes', fields: ['notes'] },
  ] : [
    { title: 'Characteristic', fields: ['characteristicName', 'charId', 'type'] },
    { title: 'Specification', fields: ['target', 'tolerance'] },
    { title: 'Special Characteristics', fields: ['specialFlag', 'csrSymbol'] },
    { title: 'Measurement', fields: ['measurementSystem', 'gageDetails'] },
    { title: 'Sampling', fields: ['defaultSampleSize', 'defaultFrequency'] },
    { title: 'Control', fields: ['controlMethod', 'acceptanceCriteria', 'reactionPlan'] },
  ];

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex items-center justify-between sticky top-0 bg-background z-10 py-2">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">{entityName}</h2>
            {hasChanges && (
              <Badge variant="outline" className="gap-1">
                <Sparkles className="h-3 w-3" />
                {diffs.length} change{diffs.length !== 1 ? 's' : ''}
              </Badge>
            )}
            {hasCriticalChanges && (
              <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 gap-1">
                <Shield className="h-3 w-3" />
                Critical
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleReset}
              disabled={!hasChanges}
              data-testid="button-reset-editor"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button 
              onClick={handleSave}
              disabled={!hasChanges}
              className={hasCriticalChanges ? 'bg-red-600 hover:bg-red-700' : ''}
              data-testid="button-save-editor"
            >
              <Save className="h-4 w-4 mr-2" />
              {hasCriticalChanges ? 'Save (Requires Review)' : 'Save Changes'}
            </Button>
          </div>
        </div>

        {hasChanges && (
          <Card className={hasCriticalChanges ? 'border-red-200 bg-red-50/50 dark:bg-red-950/20' : 'border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/20'}>
            <CardContent className="py-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className={`h-5 w-5 mt-0.5 ${hasCriticalChanges ? 'text-red-600' : 'text-yellow-600'}`} />
                <div className="flex-1">
                  <div className="font-medium text-sm">
                    {hasCriticalChanges 
                      ? 'Critical changes will trigger full change package review'
                      : 'Changes will require confirmation'
                    }
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Modified: {diffs.map(d => d.fieldLabel).join(', ')}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {fmeaSections.map(section => (
          <Card key={section.title}>
            <CardHeader className="py-3">
              <CardTitle className="text-base">{section.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {section.fields.map(fieldKey => {
                const def = fieldDefs[fieldKey];
                if (!def) return null;
                
                const isChanged = diffs.some(d => d.fieldPath === fieldKey);
                const originalValue = initialData[fieldKey];
                
                return (
                  <FieldInput
                    key={fieldKey}
                    fieldKey={fieldKey}
                    definition={def}
                    value={formData[fieldKey]}
                    onChange={(v) => handleFieldChange(fieldKey, v)}
                    isChanged={isChanged}
                    originalValue={originalValue}
                    controlsLibrary={controlsLibrary as any[] | undefined}
                  />
                );
              })}
            </CardContent>
          </Card>
        ))}

        <QuickChangeDialog
          open={showQuickDialog}
          onOpenChange={setShowQuickDialog}
          entityType={entityType}
          entityId={entityId}
          entityName={entityName}
          diffs={diffs}
          onSuccess={onSaveComplete}
        />

        <ChangeWizard
          open={showWizard}
          onOpenChange={setShowWizard}
          entityType={entityType}
          entityId={entityId}
          entityName={entityName}
          diffs={diffs}
          formData={formData}
          onSuccess={onSaveComplete}
        />
      </div>
    </TooltipProvider>
  );
}

interface FieldInputProps {
  fieldKey: string;
  definition: typeof FMEA_TEMPLATE_FIELDS[string];
  value: any;
  onChange: (value: any) => void;
  isChanged: boolean;
  originalValue: any;
  controlsLibrary?: any[];
}

function FieldInput({
  fieldKey,
  definition,
  value,
  onChange,
  isChanged,
  originalValue,
  controlsLibrary,
}: FieldInputProps) {
  const { label, inputType, options, computed, required, impact } = definition;

  const impactBadge = impact === 'critical' ? (
    <Badge variant="outline" className="ml-2 text-xs bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800">
      Critical
    </Badge>
  ) : null;

  const changedIndicator = isChanged ? (
    <Tooltip>
      <TooltipTrigger>
        <Badge className="ml-2 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 text-xs">
          Modified
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p>Original: {formatDisplayValue(originalValue)}</p>
      </TooltipContent>
    </Tooltip>
  ) : null;

  if (inputType === 'rating') {
    return (
      <div className={`space-y-2 p-3 rounded-lg ${isChanged ? 'bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800' : ''}`}>
        <div className="flex items-center">
          <Label>{label} {required && '*'}</Label>
          {impactBadge}
          {changedIndicator}
        </div>
        <Select
          value={value?.toString()}
          onValueChange={(v) => onChange(parseInt(v, 10))}
          disabled={computed}
        >
          <SelectTrigger className={isChanged ? 'border-yellow-400' : ''} data-testid={`select-${fieldKey}`}>
            <SelectValue placeholder="Select rating..." />
          </SelectTrigger>
          <SelectContent>
            {options?.map(opt => (
              <SelectItem key={opt.value} value={opt.value.toString()}>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold w-6">{opt.label}</span>
                  <span className="text-muted-foreground text-sm">{opt.description}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (inputType === 'ap') {
    return (
      <div className="space-y-2 p-3 rounded-lg bg-muted/50">
        <div className="flex items-center">
          <Label>{label}</Label>
          <Badge variant="outline" className="ml-2 text-xs">Auto-calculated</Badge>
          {changedIndicator}
        </div>
        <div className="flex items-center gap-2">
          <Badge className={`text-lg px-4 py-1 ${
            value === 'H' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
            value === 'M' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
            'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
          }`}>
            {value || '—'}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {value === 'H' && 'High - Action required'}
            {value === 'M' && 'Medium - Action recommended'}
            {value === 'L' && 'Low - No action required'}
          </span>
        </div>
      </div>
    );
  }

  if (inputType === 'csr') {
    return (
      <div className={`space-y-2 p-3 rounded-lg ${isChanged ? 'bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800' : ''}`}>
        <div className="flex items-center">
          <Label>{label}</Label>
          {impactBadge}
          {changedIndicator}
        </div>
        <Select value={value || ''} onValueChange={onChange}>
          <SelectTrigger className={isChanged ? 'border-yellow-400' : ''} data-testid={`select-${fieldKey}`}>
            <SelectValue placeholder="Select symbol..." />
          </SelectTrigger>
          <SelectContent>
            {options?.map(opt => (
              <SelectItem key={opt.value} value={opt.value.toString()}>
                <div className="flex items-center gap-2">
                  <span className="text-xl w-6">{opt.value || '○'}</span>
                  <span>{opt.label}</span>
                  {opt.description && (
                    <span className="text-muted-foreground text-sm">- {opt.description}</span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (inputType === 'boolean') {
    return (
      <div className={`flex items-center justify-between p-3 rounded-lg ${isChanged ? 'bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800' : ''}`}>
        <div className="flex items-center">
          <Label>{label}</Label>
          {impactBadge}
          {changedIndicator}
        </div>
        <Switch checked={!!value} onCheckedChange={onChange} data-testid={`switch-${fieldKey}`} />
      </div>
    );
  }

  if (inputType === 'multi-select') {
    const currentValues = Array.isArray(value) ? value : [];
    const availableControls = (controlsLibrary as any[])?.filter(c => 
      fieldKey === 'preventionControls' ? c.type === 'prevention' : c.type === 'detection'
    ) || [];

    return (
      <div className={`space-y-2 p-3 rounded-lg ${isChanged ? 'bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800' : ''}`}>
        <div className="flex items-center">
          <Label>{label}</Label>
          {impactBadge}
          {changedIndicator}
        </div>
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1 min-h-[32px]">
            {currentValues.length === 0 ? (
              <span className="text-sm text-muted-foreground">No controls selected</span>
            ) : (
              currentValues.map((ctrl: string, i: number) => (
                <Badge 
                  key={i} 
                  variant="secondary"
                  className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => onChange(currentValues.filter((_: any, j: number) => j !== i))}
                >
                  {ctrl} ×
                </Badge>
              ))
            )}
          </div>
          <Select onValueChange={(v) => onChange([...currentValues, v])}>
            <SelectTrigger data-testid={`select-${fieldKey}`}>
              <SelectValue placeholder="Add control..." />
            </SelectTrigger>
            <SelectContent>
              {availableControls.map((ctrl: any) => (
                <SelectItem 
                  key={ctrl.id} 
                  value={ctrl.name}
                  disabled={currentValues.includes(ctrl.name)}
                >
                  {ctrl.name}
                </SelectItem>
              ))}
              <SelectItem value="__custom__">+ Add custom...</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  }

  if (inputType === 'select') {
    return (
      <div className={`space-y-2 ${isChanged ? 'p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800' : ''}`}>
        <div className="flex items-center">
          <Label>{label} {required && '*'}</Label>
          {impactBadge}
          {changedIndicator}
        </div>
        <Select value={value || ''} onValueChange={onChange}>
          <SelectTrigger className={isChanged ? 'border-yellow-400' : ''} data-testid={`select-${fieldKey}`}>
            <SelectValue placeholder={`Select ${label.toLowerCase()}...`} />
          </SelectTrigger>
          <SelectContent>
            {options?.map(opt => (
              <SelectItem key={opt.value} value={opt.value.toString()}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (inputType === 'textarea') {
    return (
      <div className={`space-y-2 ${isChanged ? 'p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800' : ''}`}>
        <div className="flex items-center">
          <Label>{label} {required && '*'}</Label>
          {impactBadge}
          {changedIndicator}
        </div>
        <Textarea
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className={isChanged ? 'border-yellow-400' : ''}
          rows={3}
          data-testid={`textarea-${fieldKey}`}
        />
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${isChanged ? 'p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800' : ''}`}>
      <div className="flex items-center">
        <Label>{label} {required && '*'}</Label>
        {impactBadge}
        {changedIndicator}
      </div>
      <Input
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className={isChanged ? 'border-yellow-400' : ''}
        data-testid={`input-${fieldKey}`}
      />
    </div>
  );
}
