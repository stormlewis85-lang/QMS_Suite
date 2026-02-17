import { CheckCircle, Circle, Clock, AlertCircle, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface WorkflowStep {
  stepNumber: number;
  stepName: string;
  status: string;
  assignedTo?: string | null;
  assignedRole?: string | null;
  actionTaken?: string | null;
  actionBy?: string | null;
  actionAt?: string | null;
  dueDate?: string | null;
  comments?: string | null;
}

interface WorkflowTimelineProps {
  steps: WorkflowStep[];
  onApprove?: (stepNumber: number) => void;
  onReject?: (stepNumber: number) => void;
  onDelegate?: (stepNumber: number) => void;
  canAct?: boolean;
}

function getStepIcon(status: string) {
  switch (status) {
    case "approved":
    case "completed":
      return <CheckCircle className="h-6 w-6 text-green-600" />;
    case "pending":
      return <Clock className="h-6 w-6 text-yellow-500" />;
    case "rejected":
      return <AlertCircle className="h-6 w-6 text-red-600" />;
    default:
      return <Circle className="h-6 w-6 text-muted-foreground" />;
  }
}

function getStepBadge(status: string) {
  switch (status) {
    case "approved":
    case "completed":
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Completed</Badge>;
    case "pending":
      return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Pending</Badge>;
    case "rejected":
      return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Rejected</Badge>;
    default:
      return <Badge variant="secondary">Waiting</Badge>;
  }
}

function formatDate(date: string | null | undefined): string {
  if (!date) return "";
  return new Date(date).toLocaleString();
}

export default function WorkflowTimeline({
  steps,
  onApprove,
  onReject,
  onDelegate,
  canAct = false,
}: WorkflowTimelineProps) {
  if (steps.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Clock className="mx-auto h-12 w-12 mb-3 opacity-50" />
        <p className="text-sm">No workflow steps defined.</p>
      </div>
    );
  }

  return (
    <div className="relative space-y-0">
      {steps.map((step, index) => {
        const isPending = step.status === "pending";
        const isLast = index === steps.length - 1;

        return (
          <div key={step.stepNumber} className="relative flex gap-4">
            {/* Timeline line */}
            <div className="flex flex-col items-center">
              <div className="flex-shrink-0 pt-1">
                {getStepIcon(step.status)}
              </div>
              {!isLast && (
                <div className="w-0.5 flex-1 bg-border min-h-[2rem]" />
              )}
            </div>

            {/* Step content */}
            <Card className={`flex-1 mb-4 ${isPending ? "border-yellow-300 dark:border-yellow-700" : ""}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        Step {step.stepNumber}: {step.stepName}
                      </span>
                      {getStepBadge(step.status)}
                    </div>

                    {step.assignedTo && (
                      <p className="text-xs text-muted-foreground">
                        Assigned to: <span className="font-medium">{step.assignedTo}</span>
                        {step.assignedRole && ` (${step.assignedRole})`}
                      </p>
                    )}

                    {step.actionAt && (
                      <p className="text-xs text-muted-foreground">
                        {step.actionTaken === "approved" ? "Approved" : step.actionTaken === "rejected" ? "Rejected" : "Acted"}{" "}
                        by {step.actionBy} on {formatDate(step.actionAt)}
                      </p>
                    )}

                    {step.dueDate && !step.actionAt && (
                      <p className={`text-xs ${new Date(step.dueDate) < new Date() ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
                        Due: {formatDate(step.dueDate)}
                        {new Date(step.dueDate) < new Date() && " (Overdue)"}
                      </p>
                    )}

                    {step.comments && (
                      <p className="text-xs mt-2 italic text-muted-foreground border-l-2 pl-2">
                        {step.comments}
                      </p>
                    )}
                  </div>

                  {/* Action buttons */}
                  {isPending && canAct && (
                    <div className="flex gap-2 flex-shrink-0">
                      {onApprove && (
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => onApprove(step.stepNumber)}
                        >
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Approve
                        </Button>
                      )}
                      {onReject && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => onReject(step.stepNumber)}
                        >
                          <AlertCircle className="mr-1 h-3 w-3" />
                          Reject
                        </Button>
                      )}
                      {onDelegate && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onDelegate(step.stepNumber)}
                        >
                          <ArrowRight className="mr-1 h-3 w-3" />
                          Delegate
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        );
      })}
    </div>
  );
}
