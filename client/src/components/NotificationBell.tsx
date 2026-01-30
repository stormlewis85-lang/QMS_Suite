import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Bell, 
  BellOff,
  Check, 
  CheckCheck, 
  Trash2,
  Clock,
  AlertTriangle,
  FileText,
  ClipboardList,
  Target,
  Shield,
  ExternalLink
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'wouter';
import { apiRequest } from '@/lib/queryClient';

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  entityType?: string;
  entityId?: number;
  read: boolean;
  priority: string;
  createdAt: string;
}

const TYPE_ICONS: Record<string, any> = {
  action_overdue: AlertTriangle,
  action_assigned: Target,
  action_due_soon: Clock,
  signature_required: Shield,
  document_approved: Check,
  document_effective: FileText,
  review_findings: ClipboardList,
  high_ap_added: AlertTriangle,
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'bg-red-500',
  high: 'bg-orange-500',
  normal: 'bg-blue-500',
  low: 'bg-gray-400',
};

export function NotificationBell() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  
  const { data: countData } = useQuery<{ count: number }>({
    queryKey: ['/api/notifications/unread-count'],
    refetchInterval: 30000,
  });
  
  const { data: notifications, isLoading } = useQuery<Notification[]>({
    queryKey: ['/api/notifications'],
    enabled: open,
  });
  
  const markReadMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('POST', `/api/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
    },
  });
  
  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/notifications/read-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
    },
  });
  
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/notifications/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
    },
  });
  
  const unreadCount = countData?.count || 0;
  
  const getEntityLink = (notification: Notification): string | null => {
    if (!notification.entityType || !notification.entityId) return null;
    
    switch (notification.entityType) {
      case 'pfmea':
        return `/pfmea/${notification.entityId}`;
      case 'control_plan':
        return `/control-plans/${notification.entityId}`;
      case 'action_item':
        return `/actions`;
      case 'part':
        return `/parts/${notification.entityId}`;
      default:
        return null;
    }
  };
  
  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markReadMutation.mutate(notification.id);
    }
    
    const link = getEntityLink(notification);
    if (link) {
      setOpen(false);
    }
  };
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative" data-testid="button-notifications">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h4 className="font-semibold">Notifications</h4>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
            >
              <CheckCheck className="h-4 w-4 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
        
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              Loading...
            </div>
          ) : !notifications || notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <BellOff className="h-8 w-8 mx-auto mb-2 opacity-20" />
              <p>No notifications</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification: Notification) => {
                const Icon = TYPE_ICONS[notification.type] || Bell;
                const link = getEntityLink(notification);
                
                const content = (
                  <div 
                    className={`p-4 hover:bg-muted/50 cursor-pointer transition-colors ${
                      !notification.read ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 mt-1">
                        <div className={`w-2 h-2 rounded-full ${PRIORITY_COLORS[notification.priority]}`} />
                      </div>
                      
                      <div className="flex-shrink-0">
                        <Icon className={`h-5 w-5 ${
                          notification.type.includes('overdue') || notification.type.includes('high_ap') 
                            ? 'text-red-500' 
                            : 'text-muted-foreground'
                        }`} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-sm font-medium truncate ${!notification.read ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {notification.title}
                          </p>
                          {link && (
                            <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                      
                      <div className="flex-shrink-0 flex flex-col gap-1">
                        {!notification.read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              markReadMutation.mutate(notification.id);
                            }}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteMutation.mutate(notification.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
                
                if (link) {
                  return (
                    <Link key={notification.id} href={link}>
                      {content}
                    </Link>
                  );
                }
                
                return <div key={notification.id}>{content}</div>;
              })}
            </div>
          )}
        </ScrollArea>
        
        {notifications && notifications.length > 0 && (
          <div className="p-2 border-t">
            <Link href="/notifications">
              <Button variant="ghost" size="sm" className="w-full">
                View all notifications
              </Button>
            </Link>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

export default NotificationBell;
