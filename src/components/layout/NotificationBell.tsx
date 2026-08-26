import { Bell, Sparkles, Wrench, AlertTriangle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications, AppNotification } from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const TYPE_ICON: Record<AppNotification['type'], typeof Sparkles> = {
  feature: Sparkles,
  fix: Wrench,
  alert: AlertTriangle,
  info: Info,
};

const TYPE_COLOR: Record<AppNotification['type'], string> = {
  feature: 'text-emerald-500',
  fix: 'text-blue-500',
  alert: 'text-amber-500',
  info: 'text-muted-foreground',
};

export function NotificationBell() {
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } = useNotifications();

  if (isLoading) return null;

  return (
    <DropdownMenu onOpenChange={(open) => { if (open && unreadCount > 0) markAllAsRead.mutate(); }}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 min-w-5 px-1 flex items-center justify-center text-[10px] bg-destructive text-destructive-foreground border-0">
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96">
        <DropdownMenuLabel>Novidades e avisos</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <p className="text-sm text-muted-foreground px-2 py-4 text-center">
            Nenhum aviso por aqui ainda.
          </p>
        ) : (
          <ScrollArea className="max-h-96">
            <div className="space-y-1 p-1">
              {notifications.map((n) => {
                const Icon = TYPE_ICON[n.type];
                return (
                  <div
                    key={n.id}
                    onClick={() => !n.isRead && markAsRead.mutate(n.id)}
                    className={`rounded-md p-2.5 cursor-default ${!n.isRead ? 'bg-accent/50' : ''}`}
                  >
                    <div className="flex items-start gap-2">
                      <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${TYPE_COLOR[n.type]}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-tight">{n.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-wrap">{n.body}</p>
                        <p className="text-[11px] text-muted-foreground/70 mt-1">
                          {formatDistanceToNow(new Date(n.published_at), { addSuffix: true, locale: ptBR })}
                        </p>
                      </div>
                      {!n.isRead && <span className="h-2 w-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
