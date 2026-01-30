import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Target, 
  AlertTriangle, 
  User, 
  Calendar,
  ExternalLink
} from 'lucide-react';
import { format, isPast } from 'date-fns';
import { Link } from 'wouter';
import ActionStatusBadge from '@/components/ActionStatusBadge';
import DataTableToolbar, { ActiveFilters, FilterConfig } from '@/components/DataTableToolbar';
import { useState, useMemo } from 'react';

interface OverdueActionItem {
  actionItem: {
    id: number;
    description: string;
    priority: string;
    status: string;
    responsiblePerson: string;
    targetDate: string;
  };
  pfmeaRow: {
    id: number;
    failureMode: string;
  };
  pfmea: {
    id: string;
  };
  part: {
    id: string;
    partNumber: string;
  };
}

export default function Actions() {
  const [filters, setFilters] = useState<ActiveFilters>({ search: '' });
  
  const { data: overdueActions, isLoading } = useQuery<OverdueActionItem[]>({
    queryKey: ['/api/action-items/overdue'],
  });
  
  const filterConfig: FilterConfig[] = [
    {
      key: 'priority',
      label: 'Priority',
      type: 'select',
      options: [
        { value: 'critical', label: 'Critical' },
        { value: 'high', label: 'High' },
        { value: 'medium', label: 'Medium' },
        { value: 'low', label: 'Low' },
      ],
    },
  ];
  
  const filteredActions = useMemo(() => {
    if (!overdueActions) return [];
    
    return overdueActions.filter((item) => {
      if (filters.search) {
        const search = filters.search.toLowerCase();
        if (!item.actionItem.description.toLowerCase().includes(search) &&
            !item.part.partNumber.toLowerCase().includes(search)) {
          return false;
        }
      }
      
      if (filters.priority && item.actionItem.priority !== filters.priority) {
        return false;
      }
      
      return true;
    });
  }, [overdueActions, filters]);
  
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Target className="h-8 w-8" />
            Action Items
          </h1>
          <p className="text-muted-foreground">Track and manage PFMEA action items</p>
        </div>
      </div>
      
      {overdueActions && overdueActions.length > 0 && (
        <Card className="border-red-300 bg-red-50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              {overdueActions.length} Overdue Action(s)
            </CardTitle>
            <CardDescription>
              These actions have passed their target date and require immediate attention
            </CardDescription>
          </CardHeader>
        </Card>
      )}
      
      <DataTableToolbar
        searchPlaceholder="Search actions..."
        filters={filterConfig}
        activeFilters={filters}
        onFiltersChange={setFilters}
        resultCount={filteredActions.length}
      />
      
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>Part</TableHead>
                <TableHead>Failure Mode</TableHead>
                <TableHead>Responsible</TableHead>
                <TableHead>Target Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">Loading...</TableCell>
                </TableRow>
              ) : filteredActions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No overdue actions
                  </TableCell>
                </TableRow>
              ) : (
                filteredActions.map((item) => (
                  <TableRow key={item.actionItem.id} className="bg-red-50/50">
                    <TableCell className="max-w-[200px]">
                      <p className="font-medium truncate">{item.actionItem.description}</p>
                      <Badge className={
                        item.actionItem.priority === 'critical' ? 'bg-red-500' :
                        item.actionItem.priority === 'high' ? 'bg-orange-500' :
                        item.actionItem.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                      }>
                        {item.actionItem.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Link href={`/parts/${item.part.id}`}>
                        <span className="text-blue-600 hover:underline">{item.part.partNumber}</span>
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate">
                      {item.pfmeaRow.failureMode}
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {item.actionItem.responsiblePerson}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 text-red-600">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(item.actionItem.targetDate), 'MMM d, yyyy')}
                      </span>
                    </TableCell>
                    <TableCell>
                      <ActionStatusBadge status={item.actionItem.status} size="sm" />
                    </TableCell>
                    <TableCell>
                      <Link href={`/pfmea/${item.pfmea.id}`}>
                        <Button variant="ghost" size="sm">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </Link>
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
