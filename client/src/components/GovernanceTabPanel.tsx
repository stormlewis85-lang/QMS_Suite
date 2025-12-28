import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AuditLogViewer } from "./AuditLogViewer";
import { SignaturePanel } from "./SignaturePanel";
import { RevisionHistory } from "./RevisionHistory";
import { OwnershipPanel } from "./OwnershipPanel";
import {
  History,
  PenTool,
  GitBranch,
  Users,
} from "lucide-react";

interface GovernanceTabPanelProps {
  entityType: "pfmea" | "control_plan" | "process_def";
  entityId: string;
  entityName?: string;
  currentRev: string;
  currentStatus: string;
  currentUserId: string;
  currentUserName: string;
  currentUserEmail?: string;
  currentUserRole?: string;
  availableUsers?: { id: string; name: string; email?: string }[];
  onRevisionCreated?: (newId: string) => void;
  onViewRevision?: (revisionId: string) => void;
  onApprovalComplete?: () => void;
}

export function GovernanceTabPanel({
  entityType,
  entityId,
  entityName,
  currentRev,
  currentStatus,
  currentUserId,
  currentUserName,
  currentUserEmail,
  currentUserRole,
  availableUsers = [],
  onRevisionCreated,
  onViewRevision,
  onApprovalComplete,
}: GovernanceTabPanelProps) {
  return (
    <Tabs defaultValue="signatures" className="w-full" data-testid="governance-tabs">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="signatures" className="flex items-center gap-2" data-testid="tab-signatures">
          <PenTool className="h-4 w-4" />
          <span className="hidden sm:inline">Signatures</span>
        </TabsTrigger>
        <TabsTrigger value="revisions" className="flex items-center gap-2" data-testid="tab-revisions">
          <GitBranch className="h-4 w-4" />
          <span className="hidden sm:inline">Revisions</span>
        </TabsTrigger>
        <TabsTrigger value="ownership" className="flex items-center gap-2" data-testid="tab-ownership">
          <Users className="h-4 w-4" />
          <span className="hidden sm:inline">Ownership</span>
        </TabsTrigger>
        <TabsTrigger value="history" className="flex items-center gap-2" data-testid="tab-history">
          <History className="h-4 w-4" />
          <span className="hidden sm:inline">History</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="signatures" className="mt-4">
        <SignaturePanel
          entityType={entityType}
          entityId={entityId}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          currentUserEmail={currentUserEmail}
          currentUserRole={currentUserRole}
          onApprovalComplete={onApprovalComplete}
        />
      </TabsContent>

      <TabsContent value="revisions" className="mt-4">
        <RevisionHistory
          entityType={entityType}
          entityId={entityId}
          currentRev={currentRev}
          currentStatus={currentStatus}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          onRevisionCreated={onRevisionCreated}
          onViewRevision={onViewRevision}
        />
      </TabsContent>

      <TabsContent value="ownership" className="mt-4">
        <OwnershipPanel
          entityType={entityType}
          entityId={entityId}
          entityName={entityName}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          currentUserEmail={currentUserEmail}
          availableUsers={availableUsers}
        />
      </TabsContent>

      <TabsContent value="history" className="mt-4">
        <AuditLogViewer
          entityType={entityType}
          entityId={entityId}
        />
      </TabsContent>
    </Tabs>
  );
}
