import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Status = "draft" | "review" | "effective" | "obsolete" | "superseded";
type APLevel = "high" | "medium" | "low";

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

interface APBadgeProps {
  level: APLevel;
  value: number;
  className?: string;
}

const statusConfig = {
  draft: { label: "Draft", className: "bg-secondary text-secondary-foreground" },
  review: { label: "Review", className: "bg-chart-2 text-white" },
  effective: { label: "Effective", className: "bg-chart-4 text-white" },
  obsolete: { label: "Obsolete", className: "bg-muted text-muted-foreground" },
  superseded: { label: "Superseded", className: "bg-muted text-muted-foreground" },
};

const apConfig = {
  high: { className: "bg-destructive text-destructive-foreground" },
  medium: { className: "bg-chart-5 text-white" },
  low: { className: "bg-chart-4 text-white" },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <Badge 
      className={cn("px-2.5 py-0.5 text-xs font-medium rounded-full", config.className, className)}
      data-testid={`badge-status-${status}`}
    >
      {config.label}
    </Badge>
  );
}

export function APBadge({ level, value, className }: APBadgeProps) {
  const config = apConfig[level];
  return (
    <Badge 
      className={cn("px-2.5 py-0.5 text-xs font-medium rounded-full font-mono", config.className, className)}
      data-testid={`badge-ap-${level}`}
    >
      AP: {value}
    </Badge>
  );
}
