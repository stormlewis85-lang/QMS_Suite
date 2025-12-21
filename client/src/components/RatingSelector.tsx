import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { 
  RatingKind, 
  getScale, 
  getRatingDescription,
  getRatingCriteria,
  getRatingColorClass,
} from '@/lib/ap-calculator';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RatingSelectorProps {
  kind: RatingKind;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  showCriteria?: boolean;
  compact?: boolean;
}

export function RatingSelector({
  kind,
  value,
  onChange,
  disabled = false,
  showCriteria = false,
  compact = false,
}: RatingSelectorProps) {
  const scale = getScale(kind);
  const colorClass = getRatingColorClass(kind, value);
  
  const kindLabel = kind === 'S' ? 'Severity' : kind === 'O' ? 'Occurrence' : 'Detection';
  
  return (
    <div className="flex items-center gap-2">
      <Select
        value={value.toString()}
        onValueChange={(v) => onChange(parseInt(v, 10))}
        disabled={disabled}
      >
        <SelectTrigger 
          className={cn(
            compact ? 'w-16' : 'w-full',
            colorClass,
            'font-medium'
          )}
          data-testid={`select-rating-${kind.toLowerCase()}`}
        >
          <SelectValue placeholder={kindLabel} />
        </SelectTrigger>
        <SelectContent>
          {scale.map((entry) => (
            <SelectItem 
              key={entry.rating} 
              value={entry.rating.toString()}
              className={cn(
                getRatingColorClass(kind, entry.rating),
                'cursor-pointer'
              )}
              data-testid={`option-rating-${kind.toLowerCase()}-${entry.rating}`}
            >
              <div className="flex items-center gap-2">
                <span className="font-semibold w-6">{entry.rating}</span>
                <span className="truncate">{entry.description}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {showCriteria && (
        <Popover>
          <PopoverTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              data-testid={`button-rating-info-${kind.toLowerCase()}`}
            >
              <Info className="h-4 w-4 text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="space-y-2">
              <h4 className="font-semibold">{kindLabel} Rating: {value}</h4>
              <p className="text-sm font-medium">{getRatingDescription(kind, value)}</p>
              <p className="text-xs text-muted-foreground">{getRatingCriteria(kind, value)}</p>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

// ============================================================================
// Full Rating Scale Reference Component
// ============================================================================

interface RatingScaleReferenceProps {
  kind: RatingKind;
  highlightRating?: number;
}

export function RatingScaleReference({ kind, highlightRating }: RatingScaleReferenceProps) {
  const scale = getScale(kind);
  const kindLabel = kind === 'S' ? 'Severity' : kind === 'O' ? 'Occurrence' : 'Detection';
  
  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-lg">{kindLabel} Scale (AIAG-VDA 2019)</h3>
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="px-3 py-2 text-left w-16">Rating</th>
              <th className="px-3 py-2 text-left">Description</th>
              <th className="px-3 py-2 text-left">Criteria</th>
            </tr>
          </thead>
          <tbody>
            {scale.map((entry) => (
              <tr 
                key={entry.rating}
                className={cn(
                  'border-t',
                  highlightRating === entry.rating && 'bg-primary/10',
                  getRatingColorClass(kind, entry.rating).replace('text-', 'border-l-4 border-l-')
                )}
                data-testid={`row-scale-${kind.toLowerCase()}-${entry.rating}`}
              >
                <td className="px-3 py-2 font-semibold">{entry.rating}</td>
                <td className="px-3 py-2 font-medium">{entry.description}</td>
                <td className="px-3 py-2 text-muted-foreground">{entry.criteria}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================================
// Inline Rating Display (for tables)
// ============================================================================

interface RatingDisplayProps {
  kind: RatingKind;
  rating: number;
  showTooltip?: boolean;
}

export function RatingDisplay({ kind, rating, showTooltip = true }: RatingDisplayProps) {
  const colorClass = getRatingColorClass(kind, rating);
  
  const display = (
    <span 
      className={cn(
        'inline-flex items-center justify-center w-8 h-8 rounded font-semibold text-sm',
        colorClass
      )}
      data-testid={`display-rating-${kind.toLowerCase()}`}
    >
      {rating}
    </span>
  );
  
  if (!showTooltip) {
    return display;
  }
  
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="cursor-help">{display}</button>
      </PopoverTrigger>
      <PopoverContent className="w-64" side="top">
        <div className="space-y-1">
          <p className="font-semibold">{getRatingDescription(kind, rating)}</p>
          <p className="text-xs text-muted-foreground">{getRatingCriteria(kind, rating)}</p>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ============================================================================
// Combined S-O-D Rating Group
// ============================================================================

interface SODRatingGroupProps {
  severity: number;
  occurrence: number;
  detection: number;
  onSeverityChange?: (value: number) => void;
  onOccurrenceChange?: (value: number) => void;
  onDetectionChange?: (value: number) => void;
  disabled?: boolean;
  layout?: 'horizontal' | 'vertical';
}

export function SODRatingGroup({
  severity,
  occurrence,
  detection,
  onSeverityChange,
  onOccurrenceChange,
  onDetectionChange,
  disabled = false,
  layout = 'horizontal',
}: SODRatingGroupProps) {
  const isReadOnly = !onSeverityChange && !onOccurrenceChange && !onDetectionChange;
  
  const containerClass = layout === 'horizontal' 
    ? 'flex items-center gap-4' 
    : 'space-y-3';
  
  if (isReadOnly) {
    return (
      <div className={containerClass} data-testid="sod-rating-group-readonly">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-6">S:</span>
          <RatingDisplay kind="S" rating={severity} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-6">O:</span>
          <RatingDisplay kind="O" rating={occurrence} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-6">D:</span>
          <RatingDisplay kind="D" rating={detection} />
        </div>
      </div>
    );
  }
  
  return (
    <div className={containerClass} data-testid="sod-rating-group-editable">
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Severity</label>
        <RatingSelector
          kind="S"
          value={severity}
          onChange={onSeverityChange || (() => {})}
          disabled={disabled || !onSeverityChange}
          compact
          showCriteria
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Occurrence</label>
        <RatingSelector
          kind="O"
          value={occurrence}
          onChange={onOccurrenceChange || (() => {})}
          disabled={disabled || !onOccurrenceChange}
          compact
          showCriteria
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Detection</label>
        <RatingSelector
          kind="D"
          value={detection}
          onChange={onDetectionChange || (() => {})}
          disabled={disabled || !onDetectionChange}
          compact
          showCriteria
        />
      </div>
    </div>
  );
}
