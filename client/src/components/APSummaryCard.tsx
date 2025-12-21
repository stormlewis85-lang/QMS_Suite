import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  generateAPSummary, 
  FMEARowRatings,
  getAPColorClass 
} from '@/lib/ap-calculator';
import { AlertTriangle, AlertCircle, CheckCircle, TrendingUp } from 'lucide-react';

interface APSummaryCardProps {
  rows: FMEARowRatings[];
  title?: string;
  showDetails?: boolean;
}

export function APSummaryCard({ 
  rows, 
  title = 'Action Priority Summary',
  showDetails = true 
}: APSummaryCardProps) {
  const summary = generateAPSummary(rows);
  
  return (
    <Card data-testid="card-ap-summary">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span className="font-medium">High Priority</span>
              </div>
              <span className="font-semibold text-red-600" data-testid="text-ap-high-count">{summary.high}</span>
            </div>
            <Progress 
              value={summary.highPercent} 
              className="h-2 bg-red-100"
            />
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <span className="font-medium">Medium Priority</span>
              </div>
              <span className="font-semibold text-yellow-600" data-testid="text-ap-medium-count">{summary.medium}</span>
            </div>
            <Progress 
              value={summary.mediumPercent} 
              className="h-2 bg-yellow-100"
            />
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="font-medium">Low Priority</span>
              </div>
              <span className="font-semibold text-green-600" data-testid="text-ap-low-count">{summary.low}</span>
            </div>
            <Progress 
              value={summary.lowPercent} 
              className="h-2 bg-green-100"
            />
          </div>
        </div>
        
        {showDetails && (
          <>
            <div className="border-t pt-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Total Rows</p>
                  <p className="text-xl font-semibold" data-testid="text-ap-total">{summary.total}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Critical (S≥9)</p>
                  <p className="text-xl font-semibold text-red-600" data-testid="text-ap-critical">{summary.criticalCount}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Avg RPN</p>
                  <p className="text-xl font-semibold" data-testid="text-ap-avg-rpn">{summary.averageRPN}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Max RPN</p>
                  <p className="text-xl font-semibold" data-testid="text-ap-max-rpn">{summary.maxRPN}</p>
                </div>
              </div>
            </div>
            
            {summary.criticalCount > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3" data-testid="alert-critical-warning">
                <div className="flex items-center gap-2 text-red-800">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-medium text-sm">
                    {summary.criticalCount} safety/regulatory concern{summary.criticalCount > 1 ? 's' : ''} identified
                  </span>
                </div>
                <p className="text-xs text-red-600 mt-1">
                  Rows with Severity ≥ 9 require mandatory review and action.
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Compact version for inline use
// ============================================================================

interface APSummaryInlineProps {
  rows: FMEARowRatings[];
}

export function APSummaryInline({ rows }: APSummaryInlineProps) {
  const summary = generateAPSummary(rows);
  
  return (
    <div className="flex items-center gap-3 text-sm" data-testid="ap-summary-inline">
      <div className="flex items-center gap-1">
        <span className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs font-semibold ${getAPColorClass('H')}`}>
          {summary.high}
        </span>
        <span className="text-muted-foreground">H</span>
      </div>
      <div className="flex items-center gap-1">
        <span className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs font-semibold ${getAPColorClass('M')}`}>
          {summary.medium}
        </span>
        <span className="text-muted-foreground">M</span>
      </div>
      <div className="flex items-center gap-1">
        <span className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs font-semibold ${getAPColorClass('L')}`}>
          {summary.low}
        </span>
        <span className="text-muted-foreground">L</span>
      </div>
    </div>
  );
}
