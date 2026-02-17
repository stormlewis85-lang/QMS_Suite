import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import {
  Calendar,
  List,
  ChevronLeft,
  ChevronRight,
  Clock,
  AlertCircle,
  CheckCircle,
  Eye,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

interface ReviewableDocument {
  id: string;
  docNumber: string;
  title: string;
  type: string;
  status: string;
  department: string | null;
  reviewDueDate: string | null;
  reviewCycleDays: number | null;
  currentRev: string;
  updatedAt: string;
}

function getMonthDays(year: number, month: number) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startDay = first.getDay();
  const totalDays = last.getDate();
  return { startDay, totalDays };
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function DocumentReviews() {
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [activeDoc, setActiveDoc] = useState<ReviewableDocument | null>(null);
  const [reviewStatus, setReviewStatus] = useState<"valid" | "revision" | "obsolete">("valid");
  const [reviewComments, setReviewComments] = useState("");
  const [nextReviewDate, setNextReviewDate] = useState("");

  const { data: documents = [], isLoading } = useQuery<ReviewableDocument[]>({
    queryKey: ["/api/documents"],
    queryFn: async () => {
      const res = await fetch("/api/documents", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch documents");
      return res.json();
    },
  });

  const reviewableDocs = useMemo(() => {
    return documents.filter(
      (d) => d.status === "effective" && d.reviewDueDate
    );
  }, [documents]);

  const today = new Date();
  const overdueDocs = useMemo(
    () => reviewableDocs.filter((d) => new Date(d.reviewDueDate!) < today),
    [reviewableDocs]
  );
  const dueThisWeek = useMemo(() => {
    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() + 7);
    return reviewableDocs.filter((d) => {
      const due = new Date(d.reviewDueDate!);
      return due >= today && due <= weekEnd;
    });
  }, [reviewableDocs]);
  const upcoming = useMemo(
    () =>
      reviewableDocs.filter((d) => {
        const due = new Date(d.reviewDueDate!);
        const weekEnd = new Date();
        weekEnd.setDate(weekEnd.getDate() + 7);
        return due > weekEnd;
      }),
    [reviewableDocs]
  );

  const reviewMutation = useMutation({
    mutationFn: async ({
      docId,
      status,
      comments,
      nextReview,
    }: {
      docId: string;
      status: string;
      comments: string;
      nextReview: string;
    }) => {
      const body: Record<string, unknown> = {
        reviewDueDate: nextReview || undefined,
      };
      if (status === "obsolete") {
        await apiRequest("POST", `/api/documents/${docId}/obsolete`, {
          comments,
        });
      } else {
        body.description = comments
          ? `Review note: ${comments}`
          : undefined;
        await apiRequest("PATCH", `/api/documents/${docId}`, body);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({
        title: "Review Complete",
        description: "Document review has been recorded.",
      });
      setReviewOpen(false);
      setActiveDoc(null);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const openReview = (doc: ReviewableDocument) => {
    setActiveDoc(doc);
    setReviewStatus("valid");
    setReviewComments("");
    const cycleDays = doc.reviewCycleDays || 365;
    const next = new Date();
    next.setDate(next.getDate() + cycleDays);
    setNextReviewDate(next.toISOString().split("T")[0]);
    setReviewOpen(true);
  };

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const { startDay, totalDays } = getMonthDays(year, month);
  const monthName = currentMonth.toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  const docsForDay = (day: number) => {
    const date = new Date(year, month, day);
    return reviewableDocs.filter((d) =>
      isSameDay(new Date(d.reviewDueDate!), date)
    );
  };

  const docsForSelectedDate = selectedDate
    ? reviewableDocs.filter((d) =>
        isSameDay(new Date(d.reviewDueDate!), selectedDate)
      )
    : [];

  const prevMonth = () =>
    setCurrentMonth(new Date(year, month - 1, 1));
  const nextMonth = () =>
    setCurrentMonth(new Date(year, month + 1, 1));

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Document Reviews</h1>
          <p className="text-sm text-muted-foreground">
            Track and manage periodic document reviews
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === "calendar" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("calendar")}
          >
            <Calendar className="mr-1 h-4 w-4" />
            Calendar
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("list")}
          >
            <List className="mr-1 h-4 w-4" />
            List
          </Button>
        </div>
      </div>

      {/* Summary badges */}
      <div className="flex gap-4 flex-wrap">
        <Badge variant="destructive" className="px-3 py-1 text-sm gap-1">
          <AlertCircle className="h-3.5 w-3.5" />
          Overdue ({overdueDocs.length})
        </Badge>
        <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 px-3 py-1 text-sm gap-1">
          <Clock className="h-3.5 w-3.5" />
          Due this week ({dueThisWeek.length})
        </Badge>
        <Badge variant="secondary" className="px-3 py-1 text-sm gap-1">
          <Calendar className="h-3.5 w-3.5" />
          Upcoming ({upcoming.length})
        </Badge>
      </div>

      {viewMode === "calendar" ? (
        <div className="space-y-4">
          {/* Calendar header */}
          <div className="flex items-center justify-between">
            <Button variant="outline" size="icon" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-lg font-semibold">{monthName}</h2>
            <Button variant="outline" size="icon" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div
                key={d}
                className="bg-muted px-2 py-2 text-center text-xs font-medium text-muted-foreground"
              >
                {d}
              </div>
            ))}
            {Array.from({ length: startDay }).map((_, i) => (
              <div key={`empty-${i}`} className="bg-background p-2 min-h-[80px]" />
            ))}
            {Array.from({ length: totalDays }).map((_, i) => {
              const day = i + 1;
              const docs = docsForDay(day);
              const dateObj = new Date(year, month, day);
              const isToday = isSameDay(dateObj, today);
              const isSelected = selectedDate && isSameDay(dateObj, selectedDate);
              const hasOverdue = docs.some(
                (d) => new Date(d.reviewDueDate!) < today
              );
              const hasDueSoon = docs.some((d) => {
                const due = new Date(d.reviewDueDate!);
                return due >= today && due <= new Date(Date.now() + 7 * 86400000);
              });

              return (
                <div
                  key={day}
                  className={`bg-background p-2 min-h-[80px] cursor-pointer hover:bg-accent/50 transition-colors ${
                    isSelected ? "ring-2 ring-primary" : ""
                  } ${isToday ? "bg-primary/5" : ""}`}
                  onClick={() => setSelectedDate(dateObj)}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-sm ${
                        isToday
                          ? "font-bold text-primary"
                          : "text-muted-foreground"
                      }`}
                    >
                      {day}
                    </span>
                    {docs.length > 0 && (
                      <span
                        className={`text-xs font-medium rounded-full w-5 h-5 flex items-center justify-center ${
                          hasOverdue
                            ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                            : hasDueSoon
                            ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
                            : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                        }`}
                      >
                        {docs.length}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected date details */}
          {selectedDate && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  {selectedDate.toLocaleDateString("default", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {docsForSelectedDate.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No reviews due on this date.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {docsForSelectedDate.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div>
                          <p className="text-sm font-medium">
                            {doc.docNumber} - {doc.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Rev {doc.currentRev} | {doc.type.replace(/_/g, " ")}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Link href={`/documents/${doc.id}`}>
                            <Button variant="outline" size="sm">
                              <Eye className="mr-1 h-3 w-3" />
                              View
                            </Button>
                          </Link>
                          <Button size="sm" onClick={() => openReview(doc)}>
                            Review
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        /* List view */
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Rev</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Review Due</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviewableDocs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No documents with scheduled reviews.
                    </TableCell>
                  </TableRow>
                ) : (
                  reviewableDocs
                    .sort(
                      (a, b) =>
                        new Date(a.reviewDueDate!).getTime() -
                        new Date(b.reviewDueDate!).getTime()
                    )
                    .map((doc) => {
                      const due = new Date(doc.reviewDueDate!);
                      const isOverdue = due < today;
                      const isDueSoon =
                        !isOverdue &&
                        due <= new Date(Date.now() + 7 * 86400000);
                      return (
                        <TableRow key={doc.id}>
                          <TableCell>
                            <Link
                              href={`/documents/${doc.id}`}
                              className="text-sm font-medium hover:underline"
                            >
                              {doc.docNumber}
                            </Link>
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {doc.title}
                            </p>
                          </TableCell>
                          <TableCell className="text-sm capitalize">
                            {doc.type.replace(/_/g, " ")}
                          </TableCell>
                          <TableCell className="text-sm">{doc.currentRev}</TableCell>
                          <TableCell className="text-sm">
                            {doc.department || "-"}
                          </TableCell>
                          <TableCell>
                            <span
                              className={`text-sm ${
                                isOverdue
                                  ? "text-red-600 font-medium"
                                  : isDueSoon
                                  ? "text-yellow-600 font-medium"
                                  : ""
                              }`}
                            >
                              {due.toLocaleDateString()}
                              {isOverdue && " (Overdue)"}
                            </span>
                          </TableCell>
                          <TableCell>
                            {isOverdue ? (
                              <Badge variant="destructive">Overdue</Badge>
                            ) : isDueSoon ? (
                              <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                                Due Soon
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Upcoming</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              onClick={() => openReview(doc)}
                            >
                              Review
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Review Action Modal */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Review Document: {activeDoc?.docNumber}
            </DialogTitle>
            <DialogDescription>{activeDoc?.title}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Review cycle:</span>{" "}
                {activeDoc?.reviewCycleDays || 365} days
              </div>
              <div>
                <span className="text-muted-foreground">Current rev:</span>{" "}
                {activeDoc?.currentRev}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium">
                What is the status of this document?
              </p>
              <div className="space-y-2">
                {[
                  {
                    value: "valid" as const,
                    label: "Still Valid",
                    desc: "No changes needed",
                  },
                  {
                    value: "revision" as const,
                    label: "Needs Revision",
                    desc: "Document requires updates",
                  },
                  {
                    value: "obsolete" as const,
                    label: "Obsolete",
                    desc: "Document should be retired",
                  },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                      reviewStatus === opt.value
                        ? "border-primary bg-primary/5"
                        : "hover:bg-accent/50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="reviewStatus"
                      value={opt.value}
                      checked={reviewStatus === opt.value}
                      onChange={() => setReviewStatus(opt.value)}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="text-sm font-medium">{opt.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {opt.desc}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Comments</label>
              <Textarea
                value={reviewComments}
                onChange={(e) => setReviewComments(e.target.value)}
                placeholder="Add review comments..."
              />
            </div>

            {reviewStatus !== "obsolete" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Next review date
                </label>
                <Input
                  type="date"
                  value={nextReviewDate}
                  onChange={(e) => setNextReviewDate(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Auto-calculated based on review cycle
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                activeDoc &&
                reviewMutation.mutate({
                  docId: activeDoc.id,
                  status: reviewStatus,
                  comments: reviewComments,
                  nextReview: reviewStatus !== "obsolete" ? nextReviewDate : "",
                })
              }
              disabled={reviewMutation.isPending}
            >
              {reviewMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              <CheckCircle className="mr-1 h-4 w-4" />
              Complete Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
