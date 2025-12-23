import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  Plus,
  FileText,
  MoreHorizontal,
  Eye,
  Trash2,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileCheck,
  Wand2,
  ClipboardList,
  Shield,
  Target,
} from "lucide-react";
import type { Part, ControlPlan, ControlPlanRow, PFMEA } from "@shared/schema";

// Types
interface ControlPlanWithDetails extends ControlPlan {
  rows: ControlPlanRow[];
  part?: Part;
}

interface CharacteristicStats {
  total: number;
  special: number;
  withReactionPlan: number;
  withAcceptanceCriteria: number;
}

// Utility functions
function calculateCharacteristicStats(rows: ControlPlanRow[]): CharacteristicStats {
  return rows.reduce(
    (acc, row) => {
      acc.total++;
      if (row.specialFlag || row.csrSymbol) acc.special++;
      if (row.reactionPlan) acc.withReactionPlan++;
      if (row.acceptanceCriteria) acc.withAcceptanceCriteria++;
      return acc;
    },
    { total: 0, special: 0, withReactionPlan: 0, withAcceptanceCriteria: 0 }
  );
}

function getStatusBadge(status: string) {
  switch (status) {
    case "draft":
      return (
        <Badge variant="outline" className="bg-gray-50">
          <Clock className="h-3 w-3 mr-1" />
          Draft
        </Badge>
      );
    case "review":
      return (
        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Review
        </Badge>
      );
    case "effective":
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Effective
        </Badge>
      );
    case "superseded":
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          <FileCheck className="h-3 w-3 mr-1" />
          Superseded
        </Badge>
      );
    case "obsolete":
      return (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
          <Trash2 className="h-3 w-3 mr-1" />
          Obsolete
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function getTypeBadge(type: string) {
  switch (type) {
    case "Prototype":
      return (
        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
          Prototype
        </Badge>
      );
    case "Pre-Launch":
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          Pre-Launch
        </Badge>
      );
    case "Production":
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          Production
        </Badge>
      );
    default:
      return <Badge variant="outline">{type}</Badge>;
  }
}

function CharacteristicBadges({ stats }: { stats: CharacteristicStats }) {
  return (
    <div className="flex gap-1.5">
      <Badge variant="secondary" className="text-xs px-1.5">
        {stats.total} chars
      </Badge>
      {stats.special > 0 && (
        <Badge variant="outline" className="text-xs px-1.5 bg-purple-50 text-purple-700 border-purple-300">
          <Shield className="h-3 w-3 mr-1" />
          {stats.special}
        </Badge>
      )}
    </div>
  );
}

export default function ControlPlansPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [partFilter, setPartFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCP, setSelectedCP] = useState<ControlPlanWithDetails | null>(null);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [selectedPFMEAForGeneration, setSelectedPFMEAForGeneration] = useState<string>("");
  const [generationType, setGenerationType] = useState<string>("Production");

  // Fetch parts for filtering
  const { data: parts = [] } = useQuery<Part[]>({
    queryKey: ["/api/parts"],
  });

  // Fetch all PFMEAs for generation dialog
  const { data: pfmeas = [] } = useQuery<PFMEA[]>({
    queryKey: ["/api/pfmeas"],
  });

  // Fetch all Control Plans with their rows
  const { data: controlPlans = [], isLoading } = useQuery<ControlPlanWithDetails[]>({
    queryKey: ["/api/control-plans/all"],
    queryFn: async () => {
      // Get all parts first
      const partsRes = await fetch("/api/parts");
      if (!partsRes.ok) throw new Error("Failed to fetch parts");
      const partsData: Part[] = await partsRes.json();

      // Get Control Plans for each part
      const allCPs: ControlPlanWithDetails[] = [];
      for (const part of partsData) {
        const cpsRes = await fetch(`/api/parts/${part.id}/control-plans`);
        if (cpsRes.ok) {
          const partCPs: ControlPlan[] = await cpsRes.json();
          for (const cp of partCPs) {
            // Get full CP with rows
            const detailRes = await fetch(`/api/control-plans/${cp.id}/details`);
            if (detailRes.ok) {
              const cpDetail = await detailRes.json();
              allCPs.push({ ...cpDetail, part });
            }
          }
        }
      }
      return allCPs;
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/control-plans/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete Control Plan");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/control-plans/all"] });
      toast({
        title: "Control Plan Deleted",
        description: "The Control Plan has been deleted successfully.",
      });
      setDeleteDialogOpen(false);
      setSelectedCP(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete Control Plan. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Generate mutation
  const generateMutation = useMutation({
    mutationFn: async ({ pfmeaId, type }: { pfmeaId: string; type: string }) => {
      const response = await fetch(`/api/pfmeas/${pfmeaId}/control-plan/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate Control Plan");
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/control-plans/all"] });
      toast({
        title: "Control Plan Generated",
        description: `Created ${data.controlPlan.type} Control Plan Rev ${data.controlPlan.rev} with ${data.rows.length} characteristics.`,
      });
      setGenerateDialogOpen(false);
      setSelectedPFMEAForGeneration("");
    },
    onError: (error: Error) => {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Validate mutation
  const validateMutation = useMutation({
    mutationFn: async (cpId: string) => {
      const response = await fetch(`/api/control-plans/${cpId}/validate`);
      if (!response.ok) throw new Error("Failed to validate Control Plan");
      return response.json();
    },
    onSuccess: (data) => {
      const { validation } = data;
      if (validation.isValid) {
        toast({
          title: "Validation Passed",
          description: "Control Plan is ready for approval.",
        });
      } else {
        toast({
          title: "Validation Issues Found",
          description: `${validation.errors.length} errors, ${validation.warnings.length} warnings.`,
          variant: "destructive",
        });
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to validate Control Plan.",
        variant: "destructive",
      });
    },
  });

  // Filter Control Plans
  const filteredCPs = controlPlans.filter((cp) => {
    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const matchesPart =
        cp.part?.partNumber?.toLowerCase().includes(search) ||
        cp.part?.partName?.toLowerCase().includes(search);
      const matchesDoc = cp.docNo?.toLowerCase().includes(search);
      const matchesRev = cp.rev.toLowerCase().includes(search);
      if (!matchesPart && !matchesDoc && !matchesRev) return false;
    }

    // Status filter
    if (statusFilter !== "all" && cp.status !== statusFilter) return false;

    // Part filter
    if (partFilter !== "all" && cp.partId !== partFilter) return false;

    // Type filter
    if (typeFilter !== "all" && cp.type !== typeFilter) return false;

    return true;
  });

  // Summary stats
  const summaryStats = {
    total: controlPlans.length,
    draft: controlPlans.filter((p) => p.status === "draft").length,
    effective: controlPlans.filter((p) => p.status === "effective").length,
    totalChars: controlPlans.reduce((sum, p) => sum + p.rows.length, 0),
    specialChars: controlPlans.reduce(
      (sum, p) => sum + p.rows.filter((r) => r.specialFlag || r.csrSymbol).length,
      0
    ),
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Control Plans</h1>
          <p className="text-muted-foreground">
            Manage Control Plans for manufacturing process control
          </p>
        </div>
        <Button onClick={() => setGenerateDialogOpen(true)}>
          <Wand2 className="h-4 w-4 mr-2" />
          Generate Control Plan
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Control Plans</CardDescription>
            <CardTitle className="text-2xl">{summaryStats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Draft</CardDescription>
            <CardTitle className="text-2xl text-gray-600">
              {summaryStats.draft}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Effective</CardDescription>
            <CardTitle className="text-2xl text-green-600">
              {summaryStats.effective}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Characteristics</CardDescription>
            <CardTitle className="text-2xl">{summaryStats.totalChars}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Special Characteristics</CardDescription>
            <CardTitle className="text-2xl text-purple-600">
              {summaryStats.specialChars}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by part number, name, or doc number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={partFilter} onValueChange={setPartFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by part" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Parts</SelectItem>
                {parts.map((part) => (
                  <SelectItem key={part.id} value={part.id}>
                    {part.partNumber} - {part.partName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Prototype">Prototype</SelectItem>
                <SelectItem value="Pre-Launch">Pre-Launch</SelectItem>
                <SelectItem value="Production">Production</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="review">Review</SelectItem>
                <SelectItem value="effective">Effective</SelectItem>
                <SelectItem value="superseded">Superseded</SelectItem>
                <SelectItem value="obsolete">Obsolete</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Control Plans Table */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredCPs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No Control Plans Found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || statusFilter !== "all" || partFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Generate your first Control Plan from a PFMEA"}
              </p>
              {!searchTerm && statusFilter === "all" && partFilter === "all" && (
                <Button onClick={() => setGenerateDialogOpen(true)}>
                  <Wand2 className="h-4 w-4 mr-2" />
                  Generate Control Plan
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Part</TableHead>
                  <TableHead>Rev</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Doc No</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Characteristics</TableHead>
                  <TableHead>Coverage</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCPs.map((cp) => {
                  const charStats = calculateCharacteristicStats(cp.rows);
                  const coveragePercent = charStats.total > 0
                    ? Math.round((charStats.withReactionPlan / charStats.total) * 100)
                    : 0;

                  return (
                    <TableRow key={cp.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {cp.part?.partNumber || "Unknown"}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {cp.part?.partName}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{cp.rev}</Badge>
                      </TableCell>
                      <TableCell>{getTypeBadge(cp.type)}</TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {cp.docNo || <span className="text-muted-foreground">—</span>}
                        </span>
                      </TableCell>
                      <TableCell>{getStatusBadge(cp.status)}</TableCell>
                      <TableCell>
                        <CharacteristicBadges stats={charStats} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${
                                coveragePercent >= 80
                                  ? "bg-green-500"
                                  : coveragePercent >= 50
                                  ? "bg-yellow-500"
                                  : "bg-red-500"
                              }`}
                              style={{ width: `${coveragePercent}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {coveragePercent}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/control-plans/${cp.id}`}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => validateMutation.mutate(cp.id)}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Validate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => {
                                setSelectedCP(cp);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Generate Control Plan Dialog */}
      <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Control Plan</DialogTitle>
            <DialogDescription>
              Select a PFMEA to generate a Control Plan from its failure modes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select PFMEA</Label>
              <Select
                value={selectedPFMEAForGeneration}
                onValueChange={setSelectedPFMEAForGeneration}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a PFMEA..." />
                </SelectTrigger>
                <SelectContent>
                  {pfmeas.map((pfmea) => {
                    const part = parts.find((p) => p.id === pfmea.partId);
                    return (
                      <SelectItem key={pfmea.id} value={pfmea.id}>
                        <div className="flex flex-col">
                          <span>{part?.partNumber || "Unknown"} - Rev {pfmea.rev}</span>
                          <span className="text-sm text-muted-foreground">
                            {part?.partName} • {pfmea.status}
                          </span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Control Plan Type</Label>
              <Select value={generationType} onValueChange={setGenerationType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Prototype">Prototype</SelectItem>
                  <SelectItem value="Pre-Launch">Pre-Launch</SelectItem>
                  <SelectItem value="Production">Production</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedPFMEAForGeneration && (
              <div className="p-3 bg-muted rounded-md text-sm">
                <p className="font-medium mb-1">Generation will:</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>Create characteristics from PFMEA detection controls</li>
                  <li>Link to Control Plan templates where available</li>
                  <li>Include special characteristics and CSR symbols</li>
                  <li>Set sampling and control methods from templates</li>
                </ul>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setGenerateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() =>
                generateMutation.mutate({
                  pfmeaId: selectedPFMEAForGeneration,
                  type: generationType,
                })
              }
              disabled={!selectedPFMEAForGeneration || generateMutation.isPending}
            >
              {generateMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4 mr-2" />
                  Generate
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Control Plan?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the Control Plan for{" "}
              <strong>{selectedCP?.part?.partNumber}</strong> Rev{" "}
              <strong>{selectedCP?.rev}</strong> and all its characteristics. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => selectedCP && deleteMutation.mutate(selectedCP.id)}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}