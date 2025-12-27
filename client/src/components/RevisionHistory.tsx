import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  GitBranch,
  GitCommit,
  Clock,
  CheckCircle,
  FileText,
  ArrowRight,
  Plus,
  Eye,
  History,
  ChevronDown,
  ChevronRight,
  Archive,
  AlertCircle,
} from "lucide-react";

interface Revision {
  id: string;
  rev: string;
  status: string;
  effectiveFrom?: string;
  supersedesId?: string;
}

interface RevisionHistoryProps {
  entityType: "pfmea" | "control_plan" | "process_def";
  entityId: string;
  currentRev: string;
  currentStatus: string;
  onRevisionCreated?: (newId: string) => void;
  onViewRevision?: (revisionId: string) => void;
  currentUserId: string;
  currentUserName: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  draft: { label: "Draft", color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200", icon: FileText },
  review: { label: "In Review", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200", icon: Clock },
  effective: { label: "Effective", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200", icon: CheckCircle },
  superseded: { label: "Superseded", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200", icon: Archive },
  obsolete: { label: "Obsolete", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200", icon: AlertCircle },
};

const entityTypeLabels: Record<string, string> = {
  pfmea: "PFMEA",
  control_plan: "Control Plan",
  process_def: "Process Definition",
};

export function RevisionHistory({
  entityType,
  entityId,
  currentRev,
  currentStatus,
  onRevisionCreated,
  onViewRevision,
  currentUserId,
  currentUserName,
}: RevisionHistoryProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newRev, setNewRev] = useState("");
  const [changeNote, setChangeNote] = useState("");
  const [expandedRevisions, setExpandedRevisions] = useState<Set<string>>(new Set([entityId]));

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: revisions, isLoading } = useQuery<Revision[]>({
    queryKey: ["/api/revisions", entityType, entityId],
  });

  const createRevisionMutation = useMutation({
    mutationFn: async (data: { newRev: string; changeNote: string }) => {
      const response = await fetch(`/api/revisions/${entityType}/${entityId}/supersede`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newRev: data.newRev,
          changeNote: data.changeNote,
          actor: currentUserId,
          actorName: currentUserName,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create revision");
      }
      return response.json();
    },
    onSuccess: (newDoc) => {
      queryClient.invalidateQueries({ queryKey: ["/api/revisions", entityType, entityId] });
      toast({
        title: "Revision Created",
        description: `New revision ${newDoc.rev} has been created`,
      });
      setIsCreateDialogOpen(false);
      setNewRev("");
      setChangeNote("");
      onRevisionCreated?.(newDoc.id);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleRevision = (id: string) => {
    const newExpanded = new Set(expandedRevisions);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRevisions(newExpanded);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString();
  };

  const suggestNextRev = (currentRev: string): string => {
    const match = currentRev.match(/^(\d+)\.(\d+)\.?(\d+)?$/);
    if (match) {
      const major = parseInt(match[1]);
      const minor = parseInt(match[2]);
      const patch = match[3] ? parseInt(match[3]) : null;

      if (patch !== null) {
        return `${major}.${minor}.${patch + 1}`;
      }
      return `${major}.${minor + 1}`;
    }

    const letterMatch = currentRev.match(/^([A-Z])$/);
    if (letterMatch) {
      const nextChar = String.fromCharCode(letterMatch[1].charCodeAt(0) + 1);
      return nextChar;
    }

    return `${currentRev}.1`;
  };

  const canCreateRevision = currentStatus === "effective" || currentStatus === "review";

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Revision History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5" />
              Revision History
            </CardTitle>
            <CardDescription>
              Version control for {entityTypeLabels[entityType]}
            </CardDescription>
          </div>
          {canCreateRevision && (
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  onClick={() => setNewRev(suggestNextRev(currentRev))}
                  data-testid="button-new-revision"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Revision
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Revision</DialogTitle>
                  <DialogDescription>
                    This will supersede the current revision and create a new draft
                    with all existing data copied over.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-yellow-800 dark:text-yellow-200">
                          Current revision will be superseded
                        </p>
                        <p className="text-yellow-700 dark:text-yellow-300 mt-1">
                          Rev {currentRev} will be marked as superseded and a new
                          draft (Rev {newRev || suggestNextRev(currentRev)}) will be created.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>New Revision Number</Label>
                    <Input
                      value={newRev}
                      onChange={(e) => setNewRev(e.target.value)}
                      placeholder={suggestNextRev(currentRev)}
                      data-testid="input-new-rev"
                    />
                    <p className="text-xs text-muted-foreground">
                      Suggested: {suggestNextRev(currentRev)}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Change Note</Label>
                    <Textarea
                      value={changeNote}
                      onChange={(e) => setChangeNote(e.target.value)}
                      placeholder="Describe the reason for this revision..."
                      rows={3}
                      data-testid="input-change-note"
                    />
                  </div>

                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium mb-2">What will happen:</p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li className="flex items-center gap-2">
                        <ArrowRight className="h-3 w-3" />
                        Current revision marked as "Superseded"
                      </li>
                      <li className="flex items-center gap-2">
                        <ArrowRight className="h-3 w-3" />
                        New revision created with status "Draft"
                      </li>
                      <li className="flex items-center gap-2">
                        <ArrowRight className="h-3 w-3" />
                        All rows/data copied to new revision
                      </li>
                      <li className="flex items-center gap-2">
                        <ArrowRight className="h-3 w-3" />
                        Audit log entry created
                      </li>
                    </ul>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                    data-testid="button-cancel-revision"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() =>
                      createRevisionMutation.mutate({
                        newRev: newRev || suggestNextRev(currentRev),
                        changeNote,
                      })
                    }
                    disabled={createRevisionMutation.isPending}
                    data-testid="button-create-revision"
                  >
                    {createRevisionMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Creating...
                      </>
                    ) : (
                      <>
                        <GitCommit className="h-4 w-4 mr-2" />
                        Create Revision
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!revisions || revisions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-2 opacity-20" />
            <p>No revision history available</p>
          </div>
        ) : (
          <ScrollArea className="h-[300px]">
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border"></div>

              <div className="space-y-4">
                {revisions.map((revision, index) => {
                  const config = statusConfig[revision.status] || statusConfig.draft;
                  const StatusIcon = config.icon;
                  const isCurrent = revision.id === entityId;
                  const isExpanded = expandedRevisions.has(revision.id);

                  return (
                    <div key={revision.id} className="relative pl-10" data-testid={`revision-${revision.id}`}>
                      <div
                        className={`absolute left-0 w-8 h-8 rounded-full flex items-center justify-center ${
                          isCurrent
                            ? "bg-primary text-primary-foreground"
                            : revision.status === "effective"
                            ? "bg-green-500 text-white"
                            : revision.status === "superseded"
                            ? "bg-yellow-500 text-white"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <StatusIcon className="h-4 w-4" />
                      </div>

                      <div
                        className={`border rounded-lg p-3 ${
                          isCurrent ? "border-primary bg-primary/5" : ""
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div
                            className="flex-1 cursor-pointer"
                            onClick={() => toggleRevision(revision.id)}
                          >
                            <div className="flex items-center gap-2 flex-wrap">
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              )}
                              <span className="font-mono font-medium">
                                Rev {revision.rev}
                              </span>
                              <Badge className={config.color}>
                                {config.label}
                              </Badge>
                              {isCurrent && (
                                <Badge variant="outline" className="text-primary">
                                  Current
                                </Badge>
                              )}
                            </div>
                          </div>

                          {!isCurrent && onViewRevision && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onViewRevision(revision.id)}
                              data-testid={`button-view-revision-${revision.id}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                        </div>

                        {isExpanded && (
                          <div className="mt-3 pt-3 border-t space-y-2">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">Status:</span>
                                <span className="ml-2 font-medium">{config.label}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Effective:</span>
                                <span className="ml-2 font-medium">
                                  {formatDate(revision.effectiveFrom)}
                                </span>
                              </div>
                            </div>

                            {revision.supersedesId && (
                              <div className="text-sm">
                                <span className="text-muted-foreground">Supersedes:</span>
                                <span className="ml-2 font-mono text-xs">
                                  {revisions.find((r) => r.id === revision.supersedesId)?.rev ||
                                    revision.supersedesId.substring(0, 8)}
                                </span>
                              </div>
                            )}

                            {index === 0 && revision.status === "effective" && (
                              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                                <CheckCircle className="h-4 w-4" />
                                <span>This is the current effective revision</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

export function RevisionBadge({
  rev,
  status,
}: {
  rev: string;
  status: string;
}) {
  const config = statusConfig[status] || statusConfig.draft;

  return (
    <div className="flex items-center gap-2">
      <Badge variant="outline" className="font-mono">
        Rev {rev}
      </Badge>
      <Badge className={config.color}>{config.label}</Badge>
    </div>
  );
}

export function RevisionCompare({
  entityType,
  leftId,
  rightId,
}: {
  entityType: string;
  leftId: string;
  rightId: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Revision Comparison</CardTitle>
        <CardDescription>
          Compare changes between revisions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-muted-foreground">
          <GitBranch className="h-12 w-12 mx-auto mb-2 opacity-20" />
          <p>Revision comparison coming soon</p>
          <p className="text-xs mt-2">
            Comparing {leftId.substring(0, 8)} → {rightId.substring(0, 8)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
