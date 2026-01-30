import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import { 
  ShieldCheck, 
  AlertTriangle, 
  Info,
  CheckCircle,
  XCircle,
  Play,
  Loader2,
  FileText,
  ClipboardList,
  ExternalLink,
  Lightbulb,
  Target,
  Shield,
  FileCheck,
  Link as LinkIcon,
  Scale
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';

interface Finding {
  id: string;
  level: 'error' | 'warning' | 'info';
  category: string;
  code: string;
  title: string;
  message: string;
  ref?: {
    type: string;
    id: string;
    name?: string;
  };
  suggestion?: string;
  aiagVdaRef?: string;
}

interface ReviewResult {
  reviewId: string;
  reviewedAt: string;
  pfmeaId: string;
  controlPlanId?: string;
  partId: string;
  partNumber: string;
  summary: {
    totalFindings: number;
    errors: number;
    warnings: number;
    info: number;
    passRate: number;
    categories: Record<string, { errors: number; warnings: number; info: number }>;
  };
  findings: Finding[];
  recommendations: string[];
}

export default function AutoReview() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const [selectedPartId, setSelectedPartId] = useState<string>('');
  const [reviewResult, setReviewResult] = useState<ReviewResult | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  
  const { data: parts } = useQuery<any[]>({
    queryKey: ['/api/parts'],
  });
  
  const { data: partDocs } = useQuery({
    queryKey: ['/api/parts', selectedPartId, 'documents'],
    enabled: !!selectedPartId,
    queryFn: async () => {
      const [pfmeasRes, cpsRes] = await Promise.all([
        fetch(`/api/pfmeas?partId=${selectedPartId}`),
        fetch(`/api/control-plans?partId=${selectedPartId}`),
      ]);
      return {
        pfmeas: await pfmeasRes.json(),
        controlPlans: await cpsRes.json(),
      };
    },
  });
  
  const runReviewMutation = useMutation({
    mutationFn: async (partId: string) => {
      const response = await fetch(`/api/parts/${partId}/auto-review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Review failed');
      }
      return response.json();
    },
    onSuccess: (data) => {
      setReviewResult(data);
      toast({
        title: "Review Complete",
        description: `Found ${data.summary.totalFindings} findings (${data.summary.errors} errors, ${data.summary.warnings} warnings)`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Review Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleRunReview = () => {
    if (!selectedPartId) return;
    runReviewMutation.mutate(selectedPartId);
  };
  
  const filteredFindings = reviewResult?.findings.filter(f => 
    activeCategory === 'all' || f.category === activeCategory
  ) || [];
  
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'coverage': return <Target className="h-4 w-4" />;
      case 'effectiveness': return <Shield className="h-4 w-4" />;
      case 'document_control': return <FileCheck className="h-4 w-4" />;
      case 'traceability': return <LinkIcon className="h-4 w-4" />;
      case 'compliance': return <Scale className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };
  
  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info': return <Info className="h-4 w-4 text-blue-500" />;
      default: return null;
    }
  };
  
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="page-title">
            <ShieldCheck className="h-6 w-6" />
            Auto-Review
          </h1>
          <p className="text-muted-foreground">
            AIAG-VDA compliance validation for PFMEA and Control Plans
          </p>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Select Part to Review</CardTitle>
          <CardDescription>
            Choose a part to run automated compliance checks on its PFMEA and Control Plan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Select value={selectedPartId} onValueChange={setSelectedPartId}>
              <SelectTrigger className="w-80" data-testid="select-part">
                <SelectValue placeholder="Select a part..." />
              </SelectTrigger>
              <SelectContent>
                {parts?.map((part: any) => (
                  <SelectItem key={part.id} value={part.id} data-testid={`part-option-${part.id}`}>
                    {part.partNumber} - {part.partName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button 
              onClick={handleRunReview}
              disabled={!selectedPartId || runReviewMutation.isPending}
              data-testid="button-run-review"
            >
              {runReviewMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Run Review
                </>
              )}
            </Button>
          </div>
          
          {selectedPartId && partDocs && (
            <div className="flex gap-4 mt-4 text-sm">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-600" />
                <span>{partDocs.pfmeas?.length || 0} PFMEA(s)</span>
              </div>
              <div className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-green-600" />
                <span>{partDocs.controlPlans?.length || 0} Control Plan(s)</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {reviewResult && (
        <>
          <div className="grid grid-cols-5 gap-4">
            <Card className={reviewResult.summary.passRate >= 80 ? 'border-green-200' : reviewResult.summary.passRate >= 50 ? 'border-yellow-200' : 'border-red-200'}>
              <CardHeader className="pb-2">
                <CardDescription>Pass Rate</CardDescription>
                <CardTitle className="text-3xl flex items-center gap-2" data-testid="pass-rate">
                  {reviewResult.summary.passRate}%
                  {reviewResult.summary.passRate >= 80 ? (
                    <CheckCircle className="h-6 w-6 text-green-500" />
                  ) : reviewResult.summary.passRate >= 50 ? (
                    <AlertTriangle className="h-6 w-6 text-yellow-500" />
                  ) : (
                    <XCircle className="h-6 w-6 text-red-500" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <Progress 
                  value={reviewResult.summary.passRate} 
                  className={`h-2 ${
                    reviewResult.summary.passRate >= 80 ? '[&>div]:bg-green-500' :
                    reviewResult.summary.passRate >= 50 ? '[&>div]:bg-yellow-500' : '[&>div]:bg-red-500'
                  }`}
                />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Findings</CardDescription>
                <CardTitle className="text-3xl" data-testid="total-findings">{reviewResult.summary.totalFindings}</CardTitle>
              </CardHeader>
            </Card>
            
            <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1">
                  <XCircle className="h-3 w-3" /> Errors
                </CardDescription>
                <CardTitle className="text-3xl text-red-600" data-testid="error-count">{reviewResult.summary.errors}</CardTitle>
              </CardHeader>
            </Card>
            
            <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Warnings
                </CardDescription>
                <CardTitle className="text-3xl text-yellow-600" data-testid="warning-count">{reviewResult.summary.warnings}</CardTitle>
              </CardHeader>
            </Card>
            
            <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1">
                  <Info className="h-3 w-3" /> Info
                </CardDescription>
                <CardTitle className="text-3xl text-blue-600" data-testid="info-count">{reviewResult.summary.info}</CardTitle>
              </CardHeader>
            </Card>
          </div>
          
          {reviewResult.recommendations.length > 0 && (
            <Alert>
              <Lightbulb className="h-4 w-4" />
              <AlertTitle>Recommendations</AlertTitle>
              <AlertDescription>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  {reviewResult.recommendations.map((rec, idx) => (
                    <li key={idx}>{rec}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
          
          <div className="grid grid-cols-4 gap-6">
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle className="text-lg">Categories</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant={activeCategory === 'all' ? 'default' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => setActiveCategory('all')}
                  data-testid="category-all"
                >
                  All Findings
                  <Badge variant="outline" className="ml-auto">{reviewResult.summary.totalFindings}</Badge>
                </Button>
                
                {Object.entries(reviewResult.summary.categories).map(([cat, counts]) => (
                  <Button
                    key={cat}
                    variant={activeCategory === cat ? 'default' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => setActiveCategory(cat)}
                    data-testid={`category-${cat}`}
                  >
                    {getCategoryIcon(cat)}
                    <span className="ml-2 capitalize">{cat.replace('_', ' ')}</span>
                    <div className="ml-auto flex gap-1">
                      {counts.errors > 0 && (
                        <Badge variant="destructive" className="text-xs px-1">{counts.errors}</Badge>
                      )}
                      {counts.warnings > 0 && (
                        <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 text-xs px-1">{counts.warnings}</Badge>
                      )}
                    </div>
                  </Button>
                ))}
              </CardContent>
            </Card>
            
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle className="text-lg">
                  Findings
                  {activeCategory !== 'all' && (
                    <span className="text-muted-foreground font-normal ml-2">
                      - {activeCategory.replace('_', ' ')}
                    </span>
                  )}
                </CardTitle>
                <CardDescription>
                  {filteredFindings.length} finding(s) in this category
                </CardDescription>
              </CardHeader>
              <CardContent>
                {filteredFindings.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                    <p>No findings in this category</p>
                  </div>
                ) : (
                  <Accordion type="multiple" className="space-y-2">
                    {filteredFindings.map((finding) => (
                      <AccordionItem 
                        key={finding.id} 
                        value={finding.id}
                        className={`border rounded-lg px-4 ${
                          finding.level === 'error' ? 'border-red-200 bg-red-50/50 dark:bg-red-950/20' :
                          finding.level === 'warning' ? 'border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/20' :
                          'border-blue-200 bg-blue-50/50 dark:bg-blue-950/20'
                        }`}
                        data-testid={`finding-${finding.id}`}
                      >
                        <AccordionTrigger className="hover:no-underline py-3">
                          <div className="flex items-center gap-3 text-left">
                            {getLevelIcon(finding.level)}
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{finding.title}</span>
                                <Badge variant="outline" className="text-xs">{finding.code}</Badge>
                              </div>
                              {finding.ref?.name && (
                                <p className="text-sm text-muted-foreground">
                                  {finding.ref.name}
                                </p>
                              )}
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-2 pb-4">
                          <div className="space-y-3">
                            <p className="text-sm">{finding.message}</p>
                            
                            {finding.suggestion && (
                              <div className="flex items-start gap-2 p-3 bg-background rounded border">
                                <Lightbulb className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
                                <div>
                                  <p className="text-sm font-medium">Suggestion</p>
                                  <p className="text-sm text-muted-foreground">{finding.suggestion}</p>
                                </div>
                              </div>
                            )}
                            
                            {finding.aiagVdaRef && (
                              <p className="text-xs text-muted-foreground">
                                Reference: {finding.aiagVdaRef}
                              </p>
                            )}
                            
                            {finding.ref && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  if (finding.ref?.type === 'pfmea_row') {
                                    navigate(`/pfmea/${reviewResult.pfmeaId}`);
                                  } else if (finding.ref?.type === 'control_plan_row') {
                                    navigate(`/control-plans/${reviewResult.controlPlanId}`);
                                  }
                                }}
                                data-testid={`view-finding-${finding.id}`}
                              >
                                View in Document
                                <ExternalLink className="h-3 w-3 ml-1" />
                              </Button>
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                )}
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center gap-4">
                  <span>Review ID: {reviewResult.reviewId}</span>
                  <Separator orientation="vertical" className="h-4" />
                  <span>Part: {reviewResult.partNumber}</span>
                  <Separator orientation="vertical" className="h-4" />
                  <span>Reviewed: {new Date(reviewResult.reviewedAt).toLocaleString()}</span>
                </div>
                <Button variant="outline" size="sm" data-testid="button-export-report">
                  Export Report
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
      
      {!reviewResult && !runReviewMutation.isPending && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <ShieldCheck className="h-16 w-16 mx-auto mb-4 opacity-20" />
              <h3 className="text-lg font-medium mb-1">No Review Results</h3>
              <p>Select a part and click "Run Review" to check compliance</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
