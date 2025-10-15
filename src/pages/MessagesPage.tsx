import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DMsPage from './DMsPage';
import ActivityPage from './ActivityPage';
import MessageRequestsPage from './MessageRequestsPage';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';

export default function MessagesPage() {
  const { user } = useAuth();
  const [requestCount, setRequestCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    loadRequestCount();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('message_requests_count')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_requests',
          filter: `recipient_id=eq.${user.id}`,
        },
        () => {
          loadRequestCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const loadRequestCount = async () => {
    try {
      const { count, error } = await supabase
        .from('message_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      if (error) throw error;
      setRequestCount(count || 0);
    } catch (error) {
      console.error('Error loading request count:', error);
    }
  };

  return (
    <div className="container max-w-4xl mx-auto py-6 px-4">
      <h1 className="text-3xl font-bold mb-6">Messages</h1>
      
      <Tabs defaultValue="messages" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="requests" className="relative">
            Requests
            {requestCount > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 min-w-5 px-1">
                {requestCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="messages">
          <DMsPage />
        </TabsContent>

        <TabsContent value="requests">
          <MessageRequestsPage />
        </TabsContent>

        <TabsContent value="notifications">
          <ActivityPage />
        </TabsContent>
      </Tabs>
    </div>
  );
}
