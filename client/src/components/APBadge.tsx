import { Badge } from '@/components/ui/badge';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';
import { 
  APLevel, 
  getAPColorClass, 
  getAPLabel,
  calculateAP 
} from '@/lib/ap-calculator';
import { AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';

interface APBadgeProps {
  ap: APLevel;
  showLabel?: boolean;
  showTooltip?: boolean;
  severity?: number;
  occurrence?: number;
  detection?: number;
  size?: 'sm' | 'md' | 'lg';
}

export function APBadge({ 
  ap, 
  showLabel = false, 
  showTooltip = true,
  severity,
  occurrence,
  detection,
  size = 'md'
}: APBadgeProps) {
  const colorClass = getAPColorClass(ap);
  const label = getAPLabel(ap);
  
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-0.5',
    lg: 'text-base px-2.5 py-1',
  };
  
  const IconComponent = ap === 'H' ? AlertTriangle : ap === 'M' ? AlertCircle : CheckCircle;
  
  let reason = '';
  if (severity !== undefined && occurrence !== undefined && detection !== undefined) {
    const result = calculateAP(severity, occurrence, detection);
    reason = result.reason;
  }
  
  const badge = (
    <Badge 
      variant="outline" 
      className={`${colorClass} ${sizeClasses[size]} font-semibold inline-flex items-center gap-1 border`}
    >
      <IconComponent className={size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'} />
      <span>{showLabel ? label : ap}</span>
    </Badge>
  );
  
  if (!showTooltip) {
    return badge;
  }
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-1">
            <p className="font-semibold">{label}</p>
            {reason && <p className="text-xs text-muted-foreground">{reason}</p>}
            {severity !== undefined && occurrence !== undefined && detection !== undefined && (
              <p className="text-xs">
                S={severity} × O={occurrence} × D={detection} = RPN {severity * occurrence * detection}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
