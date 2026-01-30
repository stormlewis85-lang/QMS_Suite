import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, AlertTriangle, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface APPreviewProps {
  severity: number;
  occurrence: number;
  detection: number;
  originalAP?: 'H' | 'M' | 'L';
}

interface APResult {
  ap: 'H' | 'M' | 'L';
  reason: string;
}

export function APPreview({ severity, occurrence, detection, originalAP }: APPreviewProps) {
  const [result, setResult] = useState<APResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (severity && occurrence && detection) {
        setIsCalculating(true);
        try {
          const response = await fetch('/api/calculate-ap', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ severity, occurrence, detection }),
          });
          const data = await response.json();
          setResult(data);
        } catch (error) {
          console.error('AP calculation failed:', error);
        } finally {
          setIsCalculating(false);
        }
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [severity, occurrence, detection]);
  
  const getAPColor = (ap: string) => {
    switch (ap) {
      case 'H': return 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700';
      case 'M': return 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700';
      case 'L': return 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };
  
  const getAPLabel = (ap: string) => {
    switch (ap) {
      case 'H': return 'HIGH';
      case 'M': return 'MEDIUM';
      case 'L': return 'LOW';
      default: return 'UNKNOWN';
    }
  };
  
  const getTrendIcon = () => {
    if (!originalAP || !result) return null;
    
    const priority = { 'H': 3, 'M': 2, 'L': 1 };
    const diff = priority[result.ap] - priority[originalAP];
    
    if (diff > 0) return <TrendingUp className="h-4 w-4 text-red-500" />;
    if (diff < 0) return <TrendingDown className="h-4 w-4 text-green-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };
  
  const hasChanged = originalAP && result && originalAP !== result.ap;
  
  return (
    <Card className={`${hasChanged ? 'border-orange-400 dark:border-orange-600 border-2' : ''}`}>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="text-sm font-medium text-muted-foreground">
            Action Priority (AP) - AIAG-VDA 2019
          </div>
          {isCalculating && (
            <span className="text-xs text-muted-foreground">Calculating...</span>
          )}
        </div>
        
        <div className="flex items-center gap-4 mt-3 flex-wrap">
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <span className="px-2 py-1 bg-muted rounded">S={severity || '?'}</span>
            <span className="text-muted-foreground">×</span>
            <span className="px-2 py-1 bg-muted rounded">O={occurrence || '?'}</span>
            <span className="text-muted-foreground">×</span>
            <span className="px-2 py-1 bg-muted rounded">D={detection || '?'}</span>
          </div>
          
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          
          {result ? (
            <div className="flex items-center gap-2 flex-wrap">
              {originalAP && originalAP !== result.ap && (
                <>
                  <Badge variant="outline" className="opacity-50">
                    {getAPLabel(originalAP)}
                  </Badge>
                  <ArrowRight className="h-3 w-3" />
                </>
              )}
              <Badge className={`${getAPColor(result.ap)} text-lg px-3 py-1`}>
                {getAPLabel(result.ap)}
              </Badge>
              {getTrendIcon()}
            </div>
          ) : (
            <Badge variant="outline">Enter S/O/D</Badge>
          )}
        </div>
        
        {result && (
          <div className="mt-2 text-xs text-muted-foreground flex items-start gap-1">
            <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
            <span>{result.reason}</span>
          </div>
        )}
        
        {hasChanged && (
          <div className="mt-3 p-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded text-xs text-orange-800 dark:text-orange-300">
            <strong>AP Changed:</strong> This modification will change the Action Priority from {originalAP} to {result?.ap}. 
            {result?.ap === 'H' && ' High AP items require mandatory action.'}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default APPreview;
