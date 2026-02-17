import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useSearch, Link } from "wouter";
import {
  ArrowLeft,
  Columns,
  AlignJustify,
  Table2,
  FileText,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Skeleton } from "@/components/ui/skeleton";

interface DocumentRevision {
  id: string;
  documentId: string;
  rev: string;
  changeDescription: string;
  status: string;
  author: string;
  reviewedBy: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  effectiveDate: string | null;
  supersededDate: string | null;
  contentHash: string | null;
  attachmentUrl: string | null;
  createdAt: string;
}

interface DocumentInfo {
  id: string;
  docNumber: string;
  title: string;
  type: string;
  currentRev: string;
}

function formatDate(d: string | null): string {
  if (!d) return "-";
  return new Date(d).toLocaleDateString();
}

export default function DocumentCompare() {
  const params = useParams<{ id: string }>();
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const initialRev1 = searchParams.get("rev1") || "";
  const initialRev2 = searchParams.get("rev2") || "";

  const [rev1, setRev1] = useState(initialRev1);
  const [rev2, setRev2] = useState(initialRev2);
  const [viewTab, setViewTab] = useState("side-by-side");

  const { data: doc, isLoading: loadingDoc } = useQuery<DocumentInfo>({
    queryKey: ["/api/documents", params.id],
    queryFn: async () => {
      const res = await fetch(`/api/documents/${params.id}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch document");
      return res.json();
    },
    enabled: !!params.id,
  });

  const { data: revisions = [], isLoading: loadingRevisions } = useQuery<
    DocumentRevision[]
  >({
    queryKey: ["/api/documents", params.id, "revisions"],
    queryFn: async () => {
      const res = await fetch(`/api/documents/${params.id}/revisions`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch revisions");
      return res.json();
    },
    enabled: !!params.id,
  });

  const leftRev = useMemo(
    () => revisions.find((r) => r.rev === rev1) || revisions[1],
    [revisions, rev1]
  );
  const rightRev = useMemo(
    () => revisions.find((r) => r.rev === rev2) || revisions[0],
    [revisions, rev2]
  );

  // Auto-select revisions if not set
  if (revisions.length >= 2 && !rev1 && !rev2) {
    const sorted = [...revisions].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    if (sorted.length >= 2) {
      const autoRev1 = sorted[sorted.length - 2].rev;
      const autoRev2 = sorted[sorted.length - 1].rev;
      if (autoRev1 !== rev1) setRev1(autoRev1);
      if (autoRev2 !== rev2) setRev2(autoRev2);
    }
  }

  const metadataFields = useMemo(() => {
    if (!leftRev || !rightRev) return [];
    return [
      { label: "Revision", left: leftRev.rev, right: rightRev.rev },
      { label: "Author", left: leftRev.author, right: rightRev.author },
      { label: "Status", left: leftRev.status, right: rightRev.status },
      {
        label: "Approved By",
        left: leftRev.approvedBy || "-",
        right: rightRev.approvedBy || "-",
      },
      {
        label: "Approved At",
        left: formatDate(leftRev.approvedAt),
        right: formatDate(rightRev.approvedAt),
      },
      {
        label: "Effective Date",
        left: formatDate(leftRev.effectiveDate),
        right: formatDate(rightRev.effectiveDate),
      },
      {
        label: "Reviewed By",
        left: leftRev.reviewedBy || "-",
        right: rightRev.reviewedBy || "-",
      },
      {
        label: "Content Hash",
        left: leftRev.contentHash || "-",
        right: rightRev.contentHash || "-",
      },
      {
        label: "Created At",
        left: formatDate(leftRev.createdAt),
        right: formatDate(rightRev.createdAt),
      },
    ];
  }, [leftRev, rightRev]);

  const changedFields = metadataFields.filter((f) => f.left !== f.right);

  if (loadingDoc || loadingRevisions) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/documents/${params.id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">
            Compare Revisions: {doc?.docNumber || ""}
          </h1>
          <p className="text-sm text-muted-foreground">{doc?.title}</p>
        </div>
      </div>

      {/* Revision selectors */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Left:</span>
          <Select value={rev1} onValueChange={setRev1}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Select rev" />
            </SelectTrigger>
            <SelectContent>
              {revisions.map((r) => (
                <SelectItem key={r.id} value={r.rev}>
                  Rev {r.rev}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Right:</span>
          <Select value={rev2} onValueChange={setRev2}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Select rev" />
            </SelectTrigger>
            <SelectContent>
              {revisions.map((r) => (
                <SelectItem key={r.id} value={r.rev}>
                  Rev {r.rev}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {revisions.length < 2 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <FileText className="mx-auto h-12 w-12 mb-3 opacity-50" />
            <p>Need at least 2 revisions to compare.</p>
            <p className="text-xs mt-1">
              This document currently has {revisions.length} revision
              {revisions.length !== 1 ? "s" : ""}.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={viewTab} onValueChange={setViewTab}>
          <TabsList>
            <TabsTrigger value="side-by-side">
              <Columns className="mr-1 h-4 w-4" />
              Side-by-Side
            </TabsTrigger>
            <TabsTrigger value="unified">
              <AlignJustify className="mr-1 h-4 w-4" />
              Unified
            </TabsTrigger>
            <TabsTrigger value="metadata">
              <Table2 className="mr-1 h-4 w-4" />
              Metadata
            </TabsTrigger>
            <TabsTrigger value="summary">
              <FileText className="mr-1 h-4 w-4" />
              Summary
            </TabsTrigger>
          </TabsList>

          {/* Side-by-Side */}
          <TabsContent value="side-by-side" className="mt-4">
            <div className="grid grid-cols-2 gap-4">
              {[leftRev, rightRev].map((rev, idx) =>
                rev ? (
                  <Card key={rev.id}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        Rev {rev.rev}
                        <Badge
                          variant={
                            rev.status === "effective"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {rev.status}
                        </Badge>
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">
                        By {rev.author} on {formatDate(rev.createdAt)}
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          Change Description
                        </p>
                        <p className="text-sm whitespace-pre-wrap border rounded-lg p-3 bg-muted/50 min-h-[100px]">
                          {rev.changeDescription}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">
                            Approved:
                          </span>{" "}
                          {rev.approvedBy || "Pending"}
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            Effective:
                          </span>{" "}
                          {formatDate(rev.effectiveDate)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card key={`empty-${idx}`}>
                    <CardContent className="py-12 text-center text-muted-foreground">
                      Select a revision
                    </CardContent>
                  </Card>
                )
              )}
            </div>
          </TabsContent>

          {/* Unified */}
          <TabsContent value="unified" className="mt-4">
            <Card>
              <CardContent className="p-6 space-y-4">
                {leftRev && rightRev ? (
                  <>
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium">Change Description</h3>
                      {leftRev.changeDescription !==
                      rightRev.changeDescription ? (
                        <div className="space-y-2">
                          <div className="bg-red-50 dark:bg-red-950/20 border-l-4 border-red-400 p-3 rounded">
                            <p className="text-xs font-medium text-red-600 mb-1">
                              Rev {leftRev.rev} (removed)
                            </p>
                            <p className="text-sm line-through text-red-700 dark:text-red-300">
                              {leftRev.changeDescription}
                            </p>
                          </div>
                          <div className="bg-green-50 dark:bg-green-950/20 border-l-4 border-green-400 p-3 rounded">
                            <p className="text-xs font-medium text-green-600 mb-1">
                              Rev {rightRev.rev} (added)
                            </p>
                            <p className="text-sm text-green-700 dark:text-green-300">
                              {rightRev.changeDescription}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No change in description.
                        </p>
                      )}
                    </div>

                    {changedFields
                      .filter((f) => f.label !== "Revision")
                      .map((f) => (
                        <div key={f.label} className="space-y-1">
                          <h3 className="text-sm font-medium">{f.label}</h3>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="line-through text-red-600">
                              {f.left}
                            </span>
                            <span className="text-muted-foreground">&rarr;</span>
                            <span className="text-green-600 font-medium">
                              {f.right}
                            </span>
                          </div>
                        </div>
                      ))}

                    {changedFields.filter((f) => f.label !== "Revision")
                      .length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        No metadata differences found.
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-center text-muted-foreground">
                    Select two revisions to compare.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Metadata */}
          <TabsContent value="metadata" className="mt-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Field</TableHead>
                      <TableHead>Rev {leftRev?.rev || "-"}</TableHead>
                      <TableHead>Rev {rightRev?.rev || "-"}</TableHead>
                      <TableHead>Changed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {metadataFields.map((f) => (
                      <TableRow
                        key={f.label}
                        className={
                          f.left !== f.right
                            ? "bg-yellow-50 dark:bg-yellow-950/10"
                            : ""
                        }
                      >
                        <TableCell className="font-medium text-sm">
                          {f.label}
                        </TableCell>
                        <TableCell className="text-sm">{f.left}</TableCell>
                        <TableCell className="text-sm">{f.right}</TableCell>
                        <TableCell>
                          {f.left !== f.right ? (
                            <Badge variant="destructive" className="text-xs">
                              Changed
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              -
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Summary */}
          <TabsContent value="summary" className="mt-4">
            <Card>
              <CardContent className="p-6 space-y-4">
                {leftRev && rightRev ? (
                  <>
                    <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                      <h3 className="text-sm font-semibold">Change Summary</h3>
                      <p className="text-sm">
                        Revision <strong>{leftRev.rev}</strong> &rarr;{" "}
                        <strong>{rightRev.rev}</strong>
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {changedFields.length} metadata field
                        {changedFields.length !== 1 ? "s" : ""} changed
                      </p>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold mb-2">
                        Rev {rightRev.rev} Changes
                      </h3>
                      <p className="text-sm whitespace-pre-wrap">
                        {rightRev.changeDescription}
                      </p>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold mb-2">
                        Key Differences
                      </h3>
                      {changedFields.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No metadata differences.
                        </p>
                      ) : (
                        <ul className="list-disc list-inside space-y-1">
                          {changedFields.map((f) => (
                            <li key={f.label} className="text-sm">
                              <strong>{f.label}:</strong> {f.left} &rarr;{" "}
                              {f.right}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Badge variant="outline">
                        Author: {rightRev.author}
                      </Badge>
                      <Badge variant="outline">
                        Date: {formatDate(rightRev.createdAt)}
                      </Badge>
                      {rightRev.approvedBy && (
                        <Badge variant="outline">
                          Approved: {rightRev.approvedBy}
                        </Badge>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-center text-muted-foreground">
                    Select two revisions to see a summary.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
