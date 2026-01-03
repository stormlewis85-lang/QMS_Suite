import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  History,
  Clock,
  AlertCircle,
} from "lucide-react";

interface AuditLogViewerProps {
  entityType: string;
  entityId: string;
  title?: string;
}

export function AuditLogViewer({ title }: AuditLogViewerProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          {title || "Audit History"}
        </CardTitle>
        <CardDescription>
          Complete change history for this document
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
            Audit logging will be available in a future release.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            This feature is being redesigned for improved compliance tracking.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
