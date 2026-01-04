import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Package, 
  Plus, 
  Search, 
  Filter,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  FileEdit,
  Users,
  GitBranch
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';

interface ChangePackage {
  id: string;
  packageNumber: string;
  title: string;
  description?: string;
  status: 'draft' | 'impact_analysis' | 'auto_review' | 'pending_signatures' | 'effective' | 'cancelled';
  reasonCode: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  targetEntityType: string;
  targetEntityId: string;
  initiatedBy: string;
  initiatedAt: string;
  effectiveFrom?: string;
  completedAt?: string;
  autoReviewPassed?: boolean;
  items: any[];
  approvals: any[];
}

const statusConfig = {
  draft: { label: 'Draft', icon: FileEdit, color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200' },
  impact_analysis: { label: 'Impact Analysis', icon: GitBranch, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  auto_review: { label: 'Auto Review', icon: AlertTriangle, color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
  pending_signatures: { label: 'Pending Signatures', icon: Users, color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
  effective: { label: 'Effective', icon: CheckCircle2, color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  cancelled: { label: 'Cancelled', icon: XCircle, color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
};

const priorityColors = {
  low: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  critical: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
};

export default function ChangePackages() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: packages, isLoading } = useQuery<ChangePackage[]>({
    queryKey: ['/api/change-packages', statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== 'all') {
        params.set('status', statusFilter);
      }
      const res = await fetch(`/api/change-packages?${params}`);
      if (!res.ok) throw new Error('Failed to fetch change packages');
      return res.json();
    },
  });

  const filteredPackages = packages?.filter(pkg => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      pkg.packageNumber.toLowerCase().includes(search) ||
      pkg.title.toLowerCase().includes(search) ||
      pkg.reasonCode.toLowerCase().includes(search)
    );
  });

  const stats = packages?.reduce((acc, pkg) => {
    acc[pkg.status] = (acc[pkg.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  return (
    <div className="flex flex-col h-full">
      <PageHeader 
        title="Change Packages" 
        description="Manage controlled changes to process templates and documents"
        actions={
          <Button onClick={() => setLocation('/change-packages/new')} data-testid="button-new-change-package">
            <Plus className="h-4 w-4 mr-2" />
            New Change Package
          </Button>
        }
      />

      <div className="flex-1 overflow-auto p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Object.entries(statusConfig).map(([status, config]) => {
            const Icon = config.icon;
            const count = stats[status] || 0;
            return (
              <Card 
                key={status} 
                className={`cursor-pointer transition-shadow hover-elevate ${
                  statusFilter === status ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => setStatusFilter(statusFilter === status ? 'all' : status)}
                data-testid={`card-stat-${status}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-2xl font-bold">{count}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{config.label}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="flex gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search packages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
              data-testid="input-search-packages"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48" data-testid="select-status-filter">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {Object.entries(statusConfig).map(([value, config]) => (
                <SelectItem key={value} value={value}>{config.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Clock className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredPackages?.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">No change packages found</p>
                <p className="text-sm">Create a new change package to get started</p>
              </div>
            ) : (
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead>Package #</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Changes</TableHead>
                    <TableHead>Auto-Review</TableHead>
                    <TableHead>Initiated</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPackages?.map((pkg) => {
                    const statusInfo = statusConfig[pkg.status];
                    const StatusIcon = statusInfo.icon;
                    
                    return (
                      <TableRow 
                        key={pkg.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setLocation(`/change-packages/${pkg.id}`)}
                        data-testid={`row-change-package-${pkg.id}`}
                      >
                        <TableCell className="font-mono font-medium">
                          {pkg.packageNumber}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{pkg.title}</div>
                            {pkg.description && (
                              <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {pkg.description}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusInfo.color}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={priorityColors[pkg.priority]}>
                            {pkg.priority}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {pkg.reasonCode}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {pkg.items?.length || 0} changes
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {pkg.autoReviewPassed === true && (
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Passed
                            </Badge>
                          )}
                          {pkg.autoReviewPassed === false && (
                            <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                              <XCircle className="h-3 w-3 mr-1" />
                              Failed
                            </Badge>
                          )}
                          {pkg.autoReviewPassed === undefined && pkg.status !== 'draft' && (
                            <Badge variant="secondary">Pending</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(pkg.initiatedAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon">
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
