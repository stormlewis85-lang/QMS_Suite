import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Plus, Search, Filter, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const priorityColors: Record<string, string> = {
  critical: "bg-red-500 text-white",
  high: "bg-orange-500 text-white",
  medium: "bg-yellow-500 text-black",
  low: "bg-green-500 text-white",
};

const statusLabels: Record<string, string> = {
  d0_awareness: "D0 - Emergency",
  d1_team: "D1 - Team",
  d2_problem: "D2 - Problem",
  d3_containment: "D3 - Containment",
  d4_root_cause: "D4 - Root Cause",
  d5_corrective: "D5 - Corrective",
  d6_validation: "D6 - Validation",
  d7_prevention: "D7 - Prevention",
  d8_closure: "D8 - Closure",
  closed: "Closed",
  cancelled: "Cancelled",
  on_hold: "On Hold",
};

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString();
}

function isOverdue(targetDate: string | null | undefined, status: string) {
  if (!targetDate || ["closed", "cancelled"].includes(status)) return false;
  return new Date(targetDate) < new Date();
}

function daysAge(createdAt: string) {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
}

export default function CapaList() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");

  const { data: capasResponse, isLoading } = useQuery<any>({
    queryKey: ["/api/capas"],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const allCapas = Array.isArray(capasResponse) ? capasResponse : (capasResponse?.data || []);

  // Apply filters
  const filtered = allCapas.filter((c: any) => {
    if (search) {
      const s = search.toLowerCase();
      const matchesSearch =
        (c.capaNumber || "").toLowerCase().includes(s) ||
        (c.title || "").toLowerCase().includes(s) ||
        (c.description || "").toLowerCase().includes(s);
      if (!matchesSearch) return false;
    }
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (priorityFilter !== "all" && c.priority !== priorityFilter) return false;
    if (sourceFilter !== "all" && c.sourceType !== sourceFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">CAPA List</h1>
          <p className="text-muted-foreground">{allCapas.length} total corrective actions</p>
        </div>
        <div className="flex gap-2">
          <Link href="/capa/dashboard">
            <Button variant="outline">Dashboard</Button>
          </Link>
          <Link href="/capa/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New CAPA
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by number, title..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {Object.entries(statusLabels).map(([val, label]) => (
                  <SelectItem key={val} value={val}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="customer_complaint">Customer Complaint</SelectItem>
                <SelectItem value="internal_ncr">Internal NCR</SelectItem>
                <SelectItem value="audit_finding">Audit Finding</SelectItem>
                <SelectItem value="supplier_issue">Supplier Issue</SelectItem>
                <SelectItem value="process_deviation">Process Deviation</SelectItem>
                <SelectItem value="warranty_return">Warranty Return</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[130px]">Number</TableHead>
                <TableHead>Title</TableHead>
                <TableHead className="w-[90px]">Priority</TableHead>
                <TableHead className="w-[140px]">Status</TableHead>
                <TableHead className="w-[120px]">Source</TableHead>
                <TableHead className="w-[100px]">Target Date</TableHead>
                <TableHead className="w-[70px]">Age</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {search || statusFilter !== "all" || priorityFilter !== "all" || sourceFilter !== "all"
                      ? "No CAPAs match your filters."
                      : "No CAPAs found. Create one to get started."}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((c: any) => (
                  <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell>
                      <Link href={`/capa/${c.id}`}>
                        <span className="font-mono text-sm text-primary hover:underline">
                          {c.capaNumber}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/capa/${c.id}`}>
                        <span className="hover:underline">{c.title}</span>
                      </Link>
                      {isOverdue(c.targetClosureDate, c.status) && (
                        <Badge variant="destructive" className="ml-2 text-xs">Overdue</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={priorityColors[c.priority] || ""}>
                        {c.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {c.currentDiscipline || "D0"}
                      </Badge>
                      <span className="text-xs text-muted-foreground ml-1">
                        {statusLabels[c.status] ? statusLabels[c.status].split(" - ")[1] || "" : ""}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs">
                      {(c.sourceType || "").replace(/_/g, " ")}
                    </TableCell>
                    <TableCell className={isOverdue(c.targetClosureDate, c.status) ? "text-destructive" : ""}>
                      {formatDate(c.targetClosureDate)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {c.createdAt ? `${daysAge(c.createdAt)}d` : "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
