import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Bell, 
  BellOff,
  Check, 
  CheckCheck, 
  Trash2,
  ExternalLink
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { Link } from 'wouter';
import { useState } from 'react';
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

export default function Notifications() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('all');
  
  const { data: notifications, isLoading } = useQuery<Notification[]>({
    queryKey: ['/api/notifications'],
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
  
  const deleteReadMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('DELETE', '/api/notifications/read');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    },
  });
  
  const filteredNotifications = notifications?.filter((n: Notification) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'unread') return !n.read;
    if (activeTab === 'actions') return n.type.includes('action');
    if (activeTab === 'documents') return n.type.includes('document') || n.type.includes('signature');
    return true;
  }) || [];
  
  const unreadCount = notifications?.filter((n: Notification) => !n.read).length || 0;
  
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
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bell className="h-8 w-8" />
            Notifications
          </h1>
          <p className="text-muted-foreground">{unreadCount} unread</p>
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" onClick={() => markAllReadMutation.mutate()}>
              <CheckCheck className="h-4 w-4 mr-2" />
              Mark All Read
            </Button>
          )}
          <Button variant="outline" onClick={() => deleteReadMutation.mutate()}>
            <Trash2 className="h-4 w-4 mr-2" />
            Clear Read
          </Button>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unread">
            Unread
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">{unreadCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="actions">Actions</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>
        
        <TabsContent value={activeTab} className="mt-4">
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-8 text-center">Loading...</div>
              ) : filteredNotifications.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <BellOff className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>No notifications</p>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredNotifications.map((notification: Notification) => {
                    const link = getEntityLink(notification);
                    
                    return (
                      <div 
                        key={notification.id}
                        className={`p-4 flex items-start gap-4 ${!notification.read ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''}`}
                      >
                        <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                          notification.priority === 'urgent' ? 'bg-red-500' :
                          notification.priority === 'high' ? 'bg-orange-500' :
                          'bg-blue-500'
                        }`} />
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`font-medium ${!notification.read ? '' : 'text-muted-foreground'}`}>
                              {notification.title}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {notification.type.replace(/_/g, ' ')}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {format(new Date(notification.createdAt), 'MMM d, yyyy h:mm a')}
                            {' • '}
                            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {!notification.read && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => markReadMutation.mutate(notification.id)}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          {link && (
                            <Link href={link}>
                              <Button variant="outline" size="sm">
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
