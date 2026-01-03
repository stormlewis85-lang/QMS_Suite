import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Clock,
  AlertCircle,
} from "lucide-react";

interface OwnershipPanelProps {
  entityType: string;
  entityId: string;
  entityName?: string;
  currentUserId: string;
  currentUserName: string;
  currentUserEmail?: string;
  availableUsers?: { id: string; name: string; email?: string }[];
  compact?: boolean;
}

export function OwnershipPanel({
  compact = false,
}: OwnershipPanelProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Users className="h-4 w-4" />
        <span>Ownership management coming soon</span>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Document Ownership
        </CardTitle>
        <CardDescription>
          Manage document ownership and watchers
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
            Ownership management will be available in a future release.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            This feature is being redesigned for improved workflow integration.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
