import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  PenTool,
  Clock,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

interface SignaturePanelProps {
  entityType: string;
  entityId: string;
  currentUserId: string;
  currentUserName: string;
  currentUserEmail?: string;
  currentUserRole?: string;
  onApprovalComplete?: () => void;
}

interface SignatureStatusBadgeProps {
  status: string;
  size?: "sm" | "default";
}

export function SignatureStatusBadge({ status, size = "default" }: SignatureStatusBadgeProps) {
  const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon?: any }> = {
    draft: { label: "Draft", variant: "secondary" },
    pending_signatures: { label: "Pending Signatures", variant: "outline" },
    effective: { label: "Approved", variant: "default", icon: CheckCircle },
    superseded: { label: "Superseded", variant: "secondary" },
    obsolete: { label: "Obsolete", variant: "destructive" },
  };

  const config = statusConfig[status] || { label: status, variant: "secondary" };
  const Icon = config.icon;
  const sizeClass = size === "sm" ? "text-xs px-2 py-0.5" : "";

  return (
    <Badge variant={config.variant} className={sizeClass} data-testid={`signature-status-${status}`}>
      {Icon && <Icon className="h-3 w-3 mr-1" />}
      {config.label}
    </Badge>
  );
}

export function SignaturePanel(_props: SignaturePanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PenTool className="h-5 w-5" />
          Electronic Signatures
        </CardTitle>
        <CardDescription>
          IATF 16949 compliant electronic signature workflow
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-muted-foreground">
          <div className="flex items-center justify-center gap-2 mb-4">
            <AlertCircle className="h-5 w-5" />
            <Badge variant="secondary">Coming Soon</Badge>
          </div>
          <Clock className="h-12 w-12 mx-auto mb-2 opacity-20" />
          <p className="text-sm">
            Electronic signature workflow will be available in a future release.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            This feature is being redesigned for improved approval matrix integration.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
