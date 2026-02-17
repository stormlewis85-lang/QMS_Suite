import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Download,
  Search,
  Clock,
  Eye,
  ChevronDown,
  ChevronRight,
  FileText,
  Loader2,
  ScrollText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

interface AuditLogEntry {
  id: number;
  orgId: string;
  documentId: string;
  revisionId: string | null;
  fileId: number | null;
  userId: string;
  userName: string | null;
  userRole: string | null;
  userDepartment: string | null;
  action: string;
  actionDetails: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  sessionId: string | null;
  timestamp: string;
  durationMs: number | null;
  document?: {
    docNumber: string;
    title: string;
  };
}

const ACTIONS = [
  "view",
  "download",
  "print",
  "approve",
  "reject",
  "delegate",
  "checkout",
  "checkin",
  "create",
  "update",
  "delete",
  "distribute",
  "sign",
];

const DATE_RANGES = [
  { value: "1", label: "Last 24 hours" },
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "all", label: "All time" },
];

function getActionBadgeColor(action: string) {
  switch (action) {
    case "approve":
    case "sign":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    case "reject":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    case "view":
    case "download":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    case "print":
      return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
    case "checkout":
    case "checkin":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    case "delete":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    default:
      return "";
  }
}

export default function AuditLog() {
  const { toast } = useToast();
  const [actionFilter, setActionFilter] = useState("all");
  const [dateRange, setDateRange] = useState("7");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);

  const dateParams = useMemo(() => {
    if (dateRange === "all") return {};
    const start = new Date();
    start.setDate(start.getDate() - parseInt(dateRange));
    return { startDate: start.toISOString() };
  }, [dateRange]);

  const { data: entries = [], isLoading } = useQuery<AuditLogEntry[]>({
    queryKey: ["/api/audit-log", actionFilter, dateRange],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (actionFilter !== "all") params.set("action", actionFilter);
      if (dateParams.startDate) params.set("startDate", dateParams.startDate);
      params.set("limit", "200");
      const res = await fetch(`/api/audit-log?${params}`, {
        credentials: "include",
      });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return entries;
    const q = searchQuery.toLowerCase();
    return entries.filter(
      (e) =>
        e.userName?.toLowerCase().includes(q) ||
        e.action.toLowerCase().includes(q) ||
        e.document?.docNumber?.toLowerCase().includes(q) ||
        e.document?.title?.toLowerCase().includes(q) ||
        e.actionDetails?.toLowerCase().includes(q)
    );
  }, [entries, searchQuery]);

  async function handleExport() {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (actionFilter !== "all") params.set("action", actionFilter);
      if (dateParams.startDate) params.set("startDate", dateParams.startDate);
      const res = await fetch(`/api/audit-log/export?${params}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-log-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Exported", description: "Audit log CSV downloaded." });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: error.message,
      });
    } finally {
      setExporting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Audit Log</h1>
          <p className="text-sm text-muted-foreground">
            Document access and action history
          </p>
        </div>
        <Button variant="outline" onClick={handleExport} disabled={exporting}>
          {exporting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-end">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by user, document, or action..."
              className="pl-10"
            />
          </div>
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {ACTIONS.map((a) => (
              <SelectItem key={a} value={a}>
                <span className="capitalize">{a}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Date range" />
          </SelectTrigger>
          <SelectContent>
            {DATE_RANGES.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        Showing {filtered.length} entries
      </p>

      {/* Log Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Timestamp</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Document</TableHead>
                <TableHead>IP Address</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-12 text-muted-foreground"
                  >
                    <ScrollText className="mx-auto h-12 w-12 mb-3 opacity-50" />
                    <p className="text-sm">No audit log entries found.</p>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((entry) => {
                  const isExpanded = expandedId === entry.id;
                  return (
                    <>
                      <TableRow
                        key={entry.id}
                        className="cursor-pointer hover:bg-accent/50"
                        onClick={() =>
                          setExpandedId(isExpanded ? null : entry.id)
                        }
                      >
                        <TableCell className="w-8">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </TableCell>
                        <TableCell className="text-sm whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            {new Date(entry.timestamp).toLocaleString()}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          <div>
                            <span className="font-medium">
                              {entry.userName || entry.userId}
                            </span>
                            {entry.userRole && (
                              <span className="text-xs text-muted-foreground ml-1">
                                ({entry.userRole.replace(/_/g, " ")})
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={getActionBadgeColor(entry.action)}
                            variant="outline"
                          >
                            {entry.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {entry.document ? (
                            <div className="flex items-center gap-1">
                              <FileText className="h-3 w-3 text-muted-foreground" />
                              {entry.document.docNumber}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground font-mono">
                          {entry.ipAddress || "-"}
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow key={`${entry.id}-detail`}>
                          <TableCell colSpan={6} className="bg-muted/50">
                            <div className="p-4 space-y-3">
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                                <div>
                                  <span className="text-xs font-medium text-muted-foreground">
                                    Action
                                  </span>
                                  <p className="capitalize">{entry.action}</p>
                                </div>
                                <div>
                                  <span className="text-xs font-medium text-muted-foreground">
                                    Timestamp
                                  </span>
                                  <p>
                                    {new Date(
                                      entry.timestamp
                                    ).toLocaleString()}
                                  </p>
                                </div>
                                <div>
                                  <span className="text-xs font-medium text-muted-foreground">
                                    User
                                  </span>
                                  <p>
                                    {entry.userName || entry.userId}
                                    {entry.userRole &&
                                      ` (${entry.userRole.replace(/_/g, " ")})`}
                                  </p>
                                </div>
                                <div>
                                  <span className="text-xs font-medium text-muted-foreground">
                                    Document
                                  </span>
                                  <p>
                                    {entry.document
                                      ? `${entry.document.docNumber} - ${entry.document.title}`
                                      : entry.documentId}
                                  </p>
                                </div>
                                <div>
                                  <span className="text-xs font-medium text-muted-foreground">
                                    IP Address
                                  </span>
                                  <p className="font-mono">
                                    {entry.ipAddress || "N/A"}
                                  </p>
                                </div>
                                <div>
                                  <span className="text-xs font-medium text-muted-foreground">
                                    Session
                                  </span>
                                  <p className="font-mono text-xs">
                                    {entry.sessionId || "N/A"}
                                  </p>
                                </div>
                              </div>
                              {entry.actionDetails && (
                                <div>
                                  <span className="text-xs font-medium text-muted-foreground">
                                    Details
                                  </span>
                                  <pre className="text-xs bg-background rounded p-3 mt-1 overflow-x-auto border">
                                    {(() => {
                                      try {
                                        return JSON.stringify(
                                          JSON.parse(entry.actionDetails),
                                          null,
                                          2
                                        );
                                      } catch {
                                        return entry.actionDetails;
                                      }
                                    })()}
                                  </pre>
                                </div>
                              )}
                              {entry.durationMs !== null && (
                                <p className="text-xs text-muted-foreground">
                                  Duration: {entry.durationMs}ms
                                </p>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
