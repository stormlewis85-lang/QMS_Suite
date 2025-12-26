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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Package,
  Plus,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowRight,
  Users,
  FileCheck,
  Activity,
  Zap,
  XCircle,
  ChevronRight,
  BarChart3,
  RefreshCw,
  Send,
  Archive,
} from "lucide-react";
import { SignaturePanel } from "./SignaturePanel";
import { AuditLogViewer } from "./AuditLogViewer";

interface ChangePackage {
  id: string;
  packageNumber: string;
  title: string;
  description?: string;
  status: string;
  reasonCode: string;
  priority: string;
  initiatedBy: string;
  initiatedByName?: string;
  effectiveFrom?: string;
  targetDate?: string;
  approverMatrix?: any[];
  impactSummary?: {
    affectedParts: number;
    affectedPfmeas: number;
    affectedControlPlans: number;
    apChanges: { from: string; to: string; count: number }[];
  };
  autoReviewReport?: any;
  createdAt: string;
  updatedAt?: string;
  items?: ChangePackageItem[];
  affectedParts?: ChangePackageAffectedPart[];
  trainingAcks?: TrainingAck[];
  signatures?: any[];
}

interface ChangePackageItem {
  id: string;
  changePackageId: string;
  entityType: string;
  entityId: string;
  changeType: string;
  previousValue?: any;
  newValue?: any;
  fieldChanges?: any[];
  adoptionStatus: string;
}

interface ChangePackageAffectedPart {
  id: string;
  changePackageId: string;
  partId: string;
  partNumber: string;
  partName: string;
  currentPfmeaRev?: string;
  currentCpRev?: string;
  adoptionDecision: string;
  newPfmeaRev?: string;
  newCpRev?: string;
  notes?: string;
}

interface TrainingAck {
  id: string;
  changePackageId: string;
  userId: string;
  userName: string;
  acknowledgedAt?: string;
  trainingMethod?: string;
  dueDate?: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  draft: { label: "Draft", color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200", icon: FileText },
  impact_analysis: { label: "Impact Analysis", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200", icon: BarChart3 },
  auto_review: { label: "Auto Review", color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200", icon: Zap },
  pending_signatures: { label: "Pending Signatures", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200", icon: Clock },
  effective: { label: "Effective", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200", icon: CheckCircle },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200", icon: XCircle },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: "Low", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  medium: { label: "Medium", color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
  high: { label: "High", color: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300" },
  critical: { label: "Critical", color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" },
};

const reasonCodeLabels: Record<string, string> = {
  customer_request: "Customer Request",
  internal_improvement: "Internal Improvement",
  corrective_action: "Corrective Action",
  preventive_action: "Preventive Action",
  design_change: "Design Change",
  process_optimization: "Process Optimization",
};

interface ChangePackageManagerProps {
  currentUserId: string;
  currentUserName: string;
  currentUserEmail?: string;
  currentUserRole?: string;
}

export function ChangePackageManager({
  currentUserId,
  currentUserName,
  currentUserEmail,
  currentUserRole,
}: ChangePackageManagerProps) {
  const [selectedPackage, setSelectedPackage] = useState<ChangePackage | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [newPackage, setNewPackage] = useState({
    title: "",
    description: "",
    reasonCode: "internal_improvement",
    priority: "medium",
    targetDate: "",
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: packages, isLoading } = useQuery<ChangePackage[]>({
    queryKey: ["/api/change-packages", statusFilter !== "all" ? statusFilter : undefined],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/change-packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          initiatedBy: currentUserId,
          initiatedByName: currentUserName,
        }),
      });
      if (!response.ok) throw new Error("Failed to create change package");
      return response.json();
    },
    onSuccess: (pkg) => {
      queryClient.invalidateQueries({ queryKey: ["/api/change-packages"] });
      toast({
        title: "Change Package Created",
        description: `Package ${pkg.packageNumber} has been created`,
      });
      setIsCreateDialogOpen(false);
      setNewPackage({
        title: "",
        description: "",
        reasonCode: "internal_improvement",
        priority: "medium",
        targetDate: "",
      });
      setSelectedPackage(pkg);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const transitionMutation = useMutation({
    mutationFn: async ({ id, newStatus, note }: { id: string; newStatus: string; note?: string }) => {
      const response = await fetch(`/api/change-packages/${id}/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newStatus,
          actor: currentUserId,
          actorName: currentUserName,
          note,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to transition");
      }
      return response.json();
    },
    onSuccess: (pkg) => {
      queryClient.invalidateQueries({ queryKey: ["/api/change-packages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/change-packages", pkg.id] });
      toast({
        title: "Status Updated",
        description: `Package moved to ${statusConfig[pkg.status]?.label || pkg.status}`,
      });
      if (selectedPackage?.id === pkg.id) {
        setSelectedPackage(pkg);
      }
    },
    onError: (error) => {
      toast({
        title: "Transition Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const analyzeImpactMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/change-packages/${id}/analyze-impact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to analyze impact");
      return response.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/change-packages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/change-packages", result.package.id] });
      toast({
        title: "Impact Analysis Complete",
        description: `Found ${result.affectedParts.length} affected parts`,
      });
      setSelectedPackage(result.package);
    },
    onError: (error) => {
      toast({
        title: "Analysis Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const formatDate = (dateString?: string) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString();
  };

  const getNextStatuses = (currentStatus: string): string[] => {
    const transitions: Record<string, string[]> = {
      draft: ["impact_analysis", "cancelled"],
      impact_analysis: ["auto_review", "draft", "cancelled"],
      auto_review: ["pending_signatures", "impact_analysis", "cancelled"],
      pending_signatures: ["effective", "auto_review", "cancelled"],
      effective: [],
      cancelled: ["draft"],
    };
    return transitions[currentStatus] || [];
  };

  const filteredPackages = packages?.filter((pkg) => {
    if (statusFilter === "all") return true;
    return pkg.status === statusFilter;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Package className="h-6 w-6" />
            Change Packages
          </h2>
          <p className="text-muted-foreground">
            Manage controlled changes with full traceability
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-new-package">
              <Plus className="h-4 w-4 mr-2" />
              New Change Package
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Change Package</DialogTitle>
              <DialogDescription>
                Start a new controlled change workflow
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={newPackage.title}
                  onChange={(e) =>
                    setNewPackage({ ...newPackage, title: e.target.value })
                  }
                  placeholder="Brief description of the change"
                  data-testid="input-package-title"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={newPackage.description}
                  onChange={(e) =>
                    setNewPackage({ ...newPackage, description: e.target.value })
                  }
                  placeholder="Detailed description of changes and rationale"
                  rows={3}
                  data-testid="input-package-description"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Reason Code</Label>
                  <Select
                    value={newPackage.reasonCode}
                    onValueChange={(value) =>
                      setNewPackage({ ...newPackage, reasonCode: value })
                    }
                  >
                    <SelectTrigger data-testid="select-reason-code">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(reasonCodeLabels).map(([code, label]) => (
                        <SelectItem key={code} value={code}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select
                    value={newPackage.priority}
                    onValueChange={(value) =>
                      setNewPackage({ ...newPackage, priority: value })
                    }
                  >
                    <SelectTrigger data-testid="select-priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Target Date</Label>
                <Input
                  type="date"
                  value={newPackage.targetDate}
                  onChange={(e) =>
                    setNewPackage({ ...newPackage, targetDate: e.target.value })
                  }
                  data-testid="input-target-date"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
                data-testid="button-cancel-create"
              >
                Cancel
              </Button>
              <Button
                onClick={() => createMutation.mutate(newPackage)}
                disabled={!newPackage.title || createMutation.isPending}
                data-testid="button-create-package"
              >
                {createMutation.isPending ? "Creating..." : "Create Package"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]" data-testid="select-status-filter">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(statusConfig).map(([status, config]) => (
              <SelectItem key={status} value={status}>
                {config.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="text-sm text-muted-foreground">
          {filteredPackages?.length || 0} packages
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Packages</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[600px]">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : filteredPackages?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-2 opacity-20" />
                  <p>No change packages found</p>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredPackages?.map((pkg) => {
                    const StatusIcon = statusConfig[pkg.status]?.icon || FileText;
                    const isSelected = selectedPackage?.id === pkg.id;

                    return (
                      <button
                        key={pkg.id}
                        onClick={() => setSelectedPackage(pkg)}
                        className={`w-full p-4 text-left hover-elevate transition-colors ${
                          isSelected ? "bg-primary/10 border-l-4 border-l-primary" : ""
                        }`}
                        data-testid={`package-item-${pkg.id}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-xs text-muted-foreground">
                                {pkg.packageNumber}
                              </span>
                              <Badge className={priorityConfig[pkg.priority]?.color}>
                                {pkg.priority}
                              </Badge>
                            </div>
                            <p className="font-medium truncate mt-1">
                              {pkg.title}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge
                                variant="outline"
                                className={statusConfig[pkg.status]?.color}
                              >
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {statusConfig[pkg.status]?.label}
                              </Badge>
                            </div>
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          {selectedPackage ? (
            <ChangePackageDetail
              packageId={selectedPackage.id}
              currentUserId={currentUserId}
              currentUserName={currentUserName}
              currentUserEmail={currentUserEmail}
              currentUserRole={currentUserRole}
              onTransition={(newStatus, note) =>
                transitionMutation.mutate({
                  id: selectedPackage.id,
                  newStatus,
                  note,
                })
              }
              onAnalyzeImpact={() =>
                analyzeImpactMutation.mutate(selectedPackage.id)
              }
              getNextStatuses={getNextStatuses}
              isTransitioning={transitionMutation.isPending}
              isAnalyzing={analyzeImpactMutation.isPending}
            />
          ) : (
            <CardContent className="flex items-center justify-center h-[600px]">
              <div className="text-center text-muted-foreground">
                <Package className="h-16 w-16 mx-auto mb-4 opacity-20" />
                <p>Select a change package to view details</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}

function ChangePackageDetail({
  packageId,
  currentUserId,
  currentUserName,
  currentUserEmail,
  currentUserRole,
  onTransition,
  onAnalyzeImpact,
  getNextStatuses,
  isTransitioning,
  isAnalyzing,
}: {
  packageId: string;
  currentUserId: string;
  currentUserName: string;
  currentUserEmail?: string;
  currentUserRole?: string;
  onTransition: (newStatus: string, note?: string) => void;
  onAnalyzeImpact: () => void;
  getNextStatuses: (status: string) => string[];
  isTransitioning: boolean;
  isAnalyzing: boolean;
}) {
  const [transitionNote, setTransitionNote] = useState("");
  const [selectedNextStatus, setSelectedNextStatus] = useState("");

  const { data: pkg, isLoading } = useQuery<ChangePackage>({
    queryKey: ["/api/change-packages", packageId],
  });

  if (isLoading || !pkg) {
    return (
      <CardContent className="flex items-center justify-center h-[600px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </CardContent>
    );
  }

  const StatusIcon = statusConfig[pkg.status]?.icon || FileText;
  const nextStatuses = getNextStatuses(pkg.status);

  return (
    <>
      <CardHeader>
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm text-muted-foreground">
                {pkg.packageNumber}
              </span>
              <Badge className={priorityConfig[pkg.priority]?.color}>
                {pkg.priority}
              </Badge>
              <Badge variant="outline" className={statusConfig[pkg.status]?.color}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {statusConfig[pkg.status]?.label}
              </Badge>
            </div>
            <CardTitle className="mt-2">{pkg.title}</CardTitle>
            {pkg.description && (
              <CardDescription className="mt-1">
                {pkg.description}
              </CardDescription>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          {pkg.status === "draft" && (
            <Button
              variant="outline"
              onClick={onAnalyzeImpact}
              disabled={isAnalyzing}
              data-testid="button-analyze-impact"
            >
              {isAnalyzing ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <BarChart3 className="h-4 w-4 mr-2" />
              )}
              Analyze Impact
            </Button>
          )}

          {nextStatuses.length > 0 && (
            <Dialog>
              <DialogTrigger asChild>
                <Button data-testid="button-advance-status">
                  <Send className="h-4 w-4 mr-2" />
                  Advance Status
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Transition Status</DialogTitle>
                  <DialogDescription>
                    Move this change package to the next workflow stage
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>New Status</Label>
                    <Select
                      value={selectedNextStatus}
                      onValueChange={setSelectedNextStatus}
                    >
                      <SelectTrigger data-testid="select-new-status">
                        <SelectValue placeholder="Select new status" />
                      </SelectTrigger>
                      <SelectContent>
                        {nextStatuses.map((status) => (
                          <SelectItem key={status} value={status}>
                            {statusConfig[status]?.label || status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Note (Optional)</Label>
                    <Textarea
                      value={transitionNote}
                      onChange={(e) => setTransitionNote(e.target.value)}
                      placeholder="Add a note about this transition..."
                      rows={2}
                      data-testid="input-transition-note"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={() => {
                      if (selectedNextStatus) {
                        onTransition(selectedNextStatus, transitionNote || undefined);
                        setTransitionNote("");
                        setSelectedNextStatus("");
                      }
                    }}
                    disabled={!selectedNextStatus || isTransitioning}
                    data-testid="button-confirm-transition"
                  >
                    {isTransitioning ? "Transitioning..." : "Confirm Transition"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
            <TabsTrigger value="items" data-testid="tab-items">Items</TabsTrigger>
            <TabsTrigger value="affected" data-testid="tab-affected">Affected Parts</TabsTrigger>
            <TabsTrigger value="signatures" data-testid="tab-signatures">Signatures</TabsTrigger>
            <TabsTrigger value="history" data-testid="tab-history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Reason Code</p>
                <p className="font-medium">{reasonCodeLabels[pkg.reasonCode] || pkg.reasonCode}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Initiated By</p>
                <p className="font-medium">{pkg.initiatedByName || pkg.initiatedBy}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Created</p>
                <p className="font-medium">{new Date(pkg.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Target Date</p>
                <p className="font-medium">{pkg.targetDate ? new Date(pkg.targetDate).toLocaleDateString() : "—"}</p>
              </div>
            </div>

            {pkg.impactSummary && (
              <>
                <Separator />
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Impact Summary
                  </h4>
                  <div className="grid grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="p-4 text-center">
                        <p className="text-2xl font-bold">{pkg.impactSummary.affectedParts}</p>
                        <p className="text-sm text-muted-foreground">Affected Parts</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <p className="text-2xl font-bold">{pkg.impactSummary.affectedPfmeas}</p>
                        <p className="text-sm text-muted-foreground">PFMEAs</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <p className="text-2xl font-bold">{pkg.impactSummary.affectedControlPlans}</p>
                        <p className="text-sm text-muted-foreground">Control Plans</p>
                      </CardContent>
                    </Card>
                  </div>
                  {pkg.impactSummary.apChanges && pkg.impactSummary.apChanges.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-medium mb-2">AP Rating Changes</p>
                      <div className="flex flex-wrap gap-2">
                        {pkg.impactSummary.apChanges.map((change, idx) => (
                          <Badge key={idx} variant="outline">
                            {change.from} → {change.to} ({change.count})
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="items">
            {pkg.items && pkg.items.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Entity</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Change</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pkg.items.map((item) => (
                    <TableRow key={item.id} data-testid={`item-row-${item.id}`}>
                      <TableCell className="font-mono text-xs">{item.entityId}</TableCell>
                      <TableCell>{item.entityType}</TableCell>
                      <TableCell>{item.changeType}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.adoptionStatus}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p>No items in this change package</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="affected">
            {pkg.affectedParts && pkg.affectedParts.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Part Number</TableHead>
                    <TableHead>Part Name</TableHead>
                    <TableHead>Current Rev</TableHead>
                    <TableHead>Decision</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pkg.affectedParts.map((part) => (
                    <TableRow key={part.id} data-testid={`affected-part-${part.id}`}>
                      <TableCell className="font-mono">{part.partNumber}</TableCell>
                      <TableCell>{part.partName}</TableCell>
                      <TableCell>{part.currentPfmeaRev || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{part.adoptionDecision}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Archive className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p>No affected parts identified yet</p>
                {pkg.status === "draft" && (
                  <p className="text-sm mt-2">Run impact analysis to identify affected parts</p>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="signatures">
            <SignaturePanel
              entityType="change_package"
              entityId={pkg.id}
              currentUserId={currentUserId}
              currentUserName={currentUserName}
              currentUserEmail={currentUserEmail}
              currentUserRole={currentUserRole}
            />
          </TabsContent>

          <TabsContent value="history">
            <AuditLogViewer
              entityType="change_package"
              entityId={pkg.id}
              title="Change Package History"
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </>
  );
}
