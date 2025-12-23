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
  Filter,
  FileText,
  MoreHorizontal,
  Eye,
  Trash2,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileCheck,
  ChevronRight,
  ArrowUpDown,
  Wand2,
} from "lucide-react";
import type { Part, PFMEA, PFMEARow } from "@shared/schema";

// Types
interface PFMEAWithPart extends PFMEA {
  rows: PFMEARow[];
  part?: Part;
}

interface APStats {
  high: number;
  medium: number;
  low: number;
}

// Utility functions
function calculateAPStats(rows: PFMEARow[]): APStats {
  return rows.reduce(
    (acc, row) => {
      if (row.ap === "H") acc.high++;
      else if (row.ap === "M") acc.medium++;
      else if (row.ap === "L") acc.low++;
      return acc;
    },
    { high: 0, medium: 0, low: 0 }
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

function APBadges({ stats }: { stats: APStats }) {
  return (
    <div className="flex gap-1.5">
      {stats.high > 0 && (
        <Badge variant="destructive" className="text-xs px-1.5">
          H:{stats.high}
        </Badge>
      )}
      {stats.medium > 0 && (
        <Badge variant="outline" className="text-xs px-1.5 bg-yellow-50 text-yellow-700 border-yellow-300">
          M:{stats.medium}
        </Badge>
      )}
      {stats.low > 0 && (
        <Badge variant="outline" className="text-xs px-1.5 bg-green-50 text-green-700 border-green-300">
          L:{stats.low}
        </Badge>
      )}
      {stats.high === 0 && stats.medium === 0 && stats.low === 0 && (
        <span className="text-muted-foreground text-sm">No rows</span>
      )}
    </div>
  );
}

export default function PFMEAPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [partFilter, setPartFilter] = useState<string>("all");
  const [apFilter, setAPFilter] = useState<string>("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPFMEA, setSelectedPFMEA] = useState<PFMEAWithPart | null>(null);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [selectedPartForGeneration, setSelectedPartForGeneration] = useState<string>("");

  // Fetch parts for filtering and generation
  const { data: parts = [] } = useQuery<Part[]>({
    queryKey: ["/api/parts"],
  });

  // Fetch all PFMEAs with their rows
  const { data: pfmeas = [], isLoading } = useQuery<PFMEAWithPart[]>({
    queryKey: ["/api/pfmeas/all"],
    queryFn: async () => {
      // Get all parts first
      const partsRes = await fetch("/api/parts");
      if (!partsRes.ok) throw new Error("Failed to fetch parts");
      const partsData: Part[] = await partsRes.json();

      // Get PFMEAs for each part
      const allPfmeas: PFMEAWithPart[] = [];
      for (const part of partsData) {
        const pfmeasRes = await fetch(`/api/parts/${part.id}/pfmeas`);
        if (pfmeasRes.ok) {
          const partPfmeas: PFMEA[] = await pfmeasRes.json();
          for (const pfmea of partPfmeas) {
            // Get full PFMEA with rows
            const detailRes = await fetch(`/api/pfmeas/${pfmea.id}`);
            if (detailRes.ok) {
              const pfmeaDetail = await detailRes.json();
              allPfmeas.push({ ...pfmeaDetail, part });
            }
          }
        }
      }
      return allPfmeas;
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/pfmeas/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete PFMEA");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pfmeas/all"] });
      toast({
        title: "PFMEA Deleted",
        description: "The PFMEA has been deleted successfully.",
      });
      setDeleteDialogOpen(false);
      setSelectedPFMEA(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete PFMEA. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Generate mutation
  const generateMutation = useMutation({
    mutationFn: async (partId: string) => {
      const response = await fetch(`/api/parts/${partId}/pfmea/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          basis: "AIAG-VDA 2019",
          type: "Production",
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate PFMEA");
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/pfmeas/all"] });
      toast({
        title: "PFMEA Generated",
        description: `Created PFMEA Rev ${data.pfmea.rev} with ${data.rows.length} rows.`,
      });
      setGenerateDialogOpen(false);
      setSelectedPartForGeneration("");
    },
    onError: (error: Error) => {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Recalculate AP mutation
  const recalculateMutation = useMutation({
    mutationFn: async (pfmeaId: string) => {
      const response = await fetch(`/api/pfmeas/${pfmeaId}/recalculate-ap`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to recalculate AP");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/pfmeas/all"] });
      toast({
        title: "AP Recalculated",
        description: `${data.changedRows} row(s) updated out of ${data.totalRows}.`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to recalculate AP ratings.",
        variant: "destructive",
      });
    },
  });

  // Filter PFMEAs
  const filteredPFMEAs = pfmeas.filter((pfmea) => {
    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const matchesPart =
        pfmea.part?.partNumber?.toLowerCase().includes(search) ||
        pfmea.part?.partName?.toLowerCase().includes(search);
      const matchesDoc = pfmea.docNo?.toLowerCase().includes(search);
      const matchesRev = pfmea.rev.toLowerCase().includes(search);
      if (!matchesPart && !matchesDoc && !matchesRev) return false;
    }

    // Status filter
    if (statusFilter !== "all" && pfmea.status !== statusFilter) return false;

    // Part filter
    if (partFilter !== "all" && pfmea.partId !== partFilter) return false;

    // AP filter
    if (apFilter !== "all") {
      const stats = calculateAPStats(pfmea.rows);
      if (apFilter === "hasHigh" && stats.high === 0) return false;
      if (apFilter === "noHigh" && stats.high > 0) return false;
    }

    return true;
  });

  // Summary stats
  const summaryStats = {
    total: pfmeas.length,
    draft: pfmeas.filter((p) => p.status === "draft").length,
    effective: pfmeas.filter((p) => p.status === "effective").length,
    totalRows: pfmeas.reduce((sum, p) => sum + p.rows.length, 0),
    highAPCount: pfmeas.reduce(
      (sum, p) => sum + p.rows.filter((r) => r.ap === "H").length,
      0
    ),
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Process FMEA</h1>
          <p className="text-muted-foreground">
            Manage Process Failure Mode and Effects Analysis documents
          </p>
        </div>
        <Button onClick={() => setGenerateDialogOpen(true)}>
          <Wand2 className="h-4 w-4 mr-2" />
          Generate PFMEA
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total PFMEAs</CardDescription>
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
            <CardDescription>Total Rows</CardDescription>
            <CardTitle className="text-2xl">{summaryStats.totalRows}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>High AP Items</CardDescription>
            <CardTitle className="text-2xl text-red-600">
              {summaryStats.highAPCount}
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

            <Select value={apFilter} onValueChange={setAPFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="AP Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All AP Levels</SelectItem>
                <SelectItem value="hasHigh">Has High AP</SelectItem>
                <SelectItem value="noHigh">No High AP</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* PFMEA Table */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredPFMEAs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No PFMEAs Found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || statusFilter !== "all" || partFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Generate your first PFMEA to get started"}
              </p>
              {!searchTerm && statusFilter === "all" && partFilter === "all" && (
                <Button onClick={() => setGenerateDialogOpen(true)}>
                  <Wand2 className="h-4 w-4 mr-2" />
                  Generate PFMEA
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Part</TableHead>
                  <TableHead>Rev</TableHead>
                  <TableHead>Doc No</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Basis</TableHead>
                  <TableHead>Rows</TableHead>
                  <TableHead>AP Distribution</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPFMEAs.map((pfmea) => {
                  const apStats = calculateAPStats(pfmea.rows);
                  return (
                    <TableRow key={pfmea.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {pfmea.part?.partNumber || "Unknown"}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {pfmea.part?.partName}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{pfmea.rev}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {pfmea.docNo || <span className="text-muted-foreground">—</span>}
                        </span>
                      </TableCell>
                      <TableCell>{getStatusBadge(pfmea.status)}</TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {pfmea.basis || "AIAG-VDA 2019"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{pfmea.rows.length}</Badge>
                      </TableCell>
                      <TableCell>
                        <APBadges stats={apStats} />
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
                              <Link href={`/pfmea/${pfmea.id}`}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => recalculateMutation.mutate(pfmea.id)}
                            >
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Recalculate AP
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => {
                                setSelectedPFMEA(pfmea);
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

      {/* Generate PFMEA Dialog */}
      <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate PFMEA</DialogTitle>
            <DialogDescription>
              Select a part to generate a new PFMEA from process templates.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Part</Label>
              <Select
                value={selectedPartForGeneration}
                onValueChange={setSelectedPartForGeneration}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a part..." />
                </SelectTrigger>
                <SelectContent>
                  {parts.map((part) => (
                    <SelectItem key={part.id} value={part.id}>
                      <div className="flex flex-col">
                        <span>{part.partNumber}</span>
                        <span className="text-sm text-muted-foreground">
                          {part.partName} • {part.customer}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedPartForGeneration && (
              <div className="p-3 bg-muted rounded-md text-sm">
                <p className="font-medium mb-1">Generation will:</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>Pull FMEA template rows from mapped processes</li>
                  <li>Calculate Action Priority (AP) per AIAG-VDA 2019</li>
                  <li>Create part-specific PFMEA document</li>
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
              onClick={() => generateMutation.mutate(selectedPartForGeneration)}
              disabled={!selectedPartForGeneration || generateMutation.isPending}
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
            <AlertDialogTitle>Delete PFMEA?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the PFMEA for{" "}
              <strong>{selectedPFMEA?.part?.partNumber}</strong> Rev{" "}
              <strong>{selectedPFMEA?.rev}</strong> and all its rows. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => selectedPFMEA && deleteMutation.mutate(selectedPFMEA.id)}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}