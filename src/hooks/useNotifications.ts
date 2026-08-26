import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  type: 'feature' | 'fix' | 'alert' | 'info';
  published_at: string;
  isRead: boolean;
}

export function useNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    // RLS em `notifications` já filtra pra só as que têm target_type='all'
    // ou em que auth.uid() está em target_user_ids — não precisa repetir
    // esse filtro aqui no client.
    queryKey: ['notifications', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [{ data: notifications, error: notifError }, { data: reads, error: readsError }] = await Promise.all([
        supabase
          .from('notifications')
          .select('id, title, body, type, published_at')
          .order('published_at', { ascending: false })
          .limit(50),
        supabase
          .from('notification_reads')
          .select('notification_id')
          .eq('user_id', user!.id),
      ]);

      if (notifError) throw notifError;
      if (readsError) throw readsError;

      const readIds = new Set((reads ?? []).map(r => r.notification_id));

      return (notifications ?? []).map((n): AppNotification => ({
        id: n.id,
        title: n.title,
        body: n.body,
        type: n.type as AppNotification['type'],
        published_at: n.published_at,
        isRead: readIds.has(n.id),
      }));
    },
    staleTime: 60 * 1000,
  });

  const notifications = query.data ?? [];
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      if (!user) return;
      const { error } = await supabase
        .from('notification_reads')
        .upsert({ notification_id: notificationId, user_id: user.id }, { onConflict: 'notification_id,user_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const unread = notifications.filter(n => !n.isRead);
      if (unread.length === 0) return;
      const rows = unread.map(n => ({ notification_id: n.id, user_id: user.id }));
      const { error } = await supabase
        .from('notification_reads')
        .upsert(rows, { onConflict: 'notification_id,user_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    },
  });

  return {
    notifications,
    unreadCount,
    isLoading: query.isLoading,
    markAsRead,
    markAllAsRead,
  };
}
