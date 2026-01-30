import { Badge } from '@/components/ui/badge';
import { 
  Edit, 
  Clock, 
  CheckCircle, 
  History, 
  XCircle,
  AlertTriangle
} from 'lucide-react';

interface DocumentStatusBadgeProps {
  status: string;
  size?: 'sm' | 'default' | 'lg';
  showIcon?: boolean;
}

export function DocumentStatusBadge({ 
  status, 
  size = 'default',
  showIcon = true 
}: DocumentStatusBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    default: 'text-sm px-2.5 py-0.5',
    lg: 'text-base px-3 py-1',
  };
  
  const iconSize = size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4';
  
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'draft':
        return {
          icon: Edit,
          className: 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600',
          label: 'Draft',
        };
      case 'review':
        return {
          icon: Clock,
          className: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900 dark:text-yellow-200 dark:border-yellow-700',
          label: 'In Review',
        };
      case 'effective':
        return {
          icon: CheckCircle,
          className: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900 dark:text-green-200 dark:border-green-700',
          label: 'Effective',
        };
      case 'superseded':
        return {
          icon: History,
          className: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-700',
          label: 'Superseded',
        };
      case 'obsolete':
        return {
          icon: XCircle,
          className: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900 dark:text-red-200 dark:border-red-700',
          label: 'Obsolete',
        };
      default:
        return {
          icon: AlertTriangle,
          className: 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600',
          label: status,
        };
    }
  };
  
  const config = getStatusConfig(status);
  const Icon = config.icon;
  
  return (
    <Badge 
      variant="outline" 
      className={`${config.className} ${sizeClasses[size]} inline-flex items-center gap-1`}
      data-testid={`status-badge-${status}`}
    >
      {showIcon && <Icon className={iconSize} />}
      {config.label}
    </Badge>
  );
}

export default DocumentStatusBadge;
