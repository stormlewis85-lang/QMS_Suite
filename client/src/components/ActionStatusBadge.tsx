import { Badge } from '@/components/ui/badge';
import { Clock, Play, CheckCircle, Shield, XCircle } from 'lucide-react';

interface ActionStatusBadgeProps {
  status: string;
  size?: 'sm' | 'default';
}

const STATUS_CONFIG = {
  open: { label: 'Open', icon: Clock, color: 'bg-gray-100 text-gray-800' },
  in_progress: { label: 'In Progress', icon: Play, color: 'bg-blue-100 text-blue-800' },
  completed: { label: 'Completed', icon: CheckCircle, color: 'bg-yellow-100 text-yellow-800' },
  verified: { label: 'Verified', icon: Shield, color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Cancelled', icon: XCircle, color: 'bg-red-100 text-red-800' },
};

export function ActionStatusBadge({ status, size = 'default' }: ActionStatusBadgeProps) {
  const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.open;
  const Icon = config.icon;
  
  return (
    <Badge variant="outline" className={`${config.color} ${size === 'sm' ? 'text-xs px-1.5 py-0' : ''}`}>
      <Icon className={`${size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} mr-1`} />
      {config.label}
    </Badge>
  );
}

export default ActionStatusBadge;
