import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Clock, RefreshCw, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import logoShopee from '@/assets/logo-shopee.jpg';
import logoTiktok from '@/assets/logo-tiktok.png';

interface IntegrationCardProps {
  provider: 'shopee' | 'tiktok';
  status: string;
  shopName?: string | null;
  shopId?: string | null;
  lastSyncAt?: string | null;
  nextSyncAt?: string | null;
  lastErrorMessage?: string | null;
  onConnect: () => void;
  onManage: () => void;
  isConnecting?: boolean;
}

const providerConfig = {
  shopee: { name: 'Shopee', subtitle: 'Marketplace', logo: logoShopee },
  tiktok: { name: 'TikTok Shop', subtitle: 'Marketplace', logo: logoTiktok },
};

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
  connected: { label: 'Conectado', variant: 'default', icon: <CheckCircle2 className="h-3 w-3" /> },
  disconnected: { label: 'Desconectado', variant: 'secondary', icon: <XCircle className="h-3 w-3" /> },
  expired: { label: 'Token expirado', variant: 'destructive', icon: <AlertCircle className="h-3 w-3" /> },
  error: { label: 'Erro', variant: 'destructive', icon: <AlertCircle className="h-3 w-3" /> },
  connecting: { label: 'Conectando...', variant: 'outline', icon: <RefreshCw className="h-3 w-3 animate-spin" /> },
};

export function IntegrationCard({
  provider,
  status,
  shopName,
  shopId,
  lastSyncAt,
  nextSyncAt,
  lastErrorMessage,
  onConnect,
  onManage,
  isConnecting,
}: IntegrationCardProps) {
  const config = providerConfig[provider];
  const isConnected = status === 'connected';
  const statusInfo = statusConfig[status] ?? statusConfig.disconnected;

  return (
    <Card className="p-5">
      <div className="flex items-start gap-4">
        <div className="h-14 w-14 rounded-lg bg-background flex items-center justify-center overflow-hidden shrink-0">
          <img src={config.logo} alt={config.name} className="h-full w-full object-contain p-1" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-base font-semibold">{config.name}</span>
            <Badge variant={statusInfo.variant} className="flex items-center gap-1 text-xs">
              {statusInfo.icon}
              {statusInfo.label}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{config.subtitle}</p>

          {/* Mensagem de erro */}
          {lastErrorMessage && (
            <div className="mt-2 flex items-start gap-1.5 text-xs text-destructive bg-destructive/10 rounded-md p-2">
              <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>{lastErrorMessage}</span>
            </div>
          )}

          {isConnected ? (
            <>
              <button onClick={onManage} className="text-sm font-semibold text-primary hover:underline mt-1.5">
                Gerenciar
              </button>
              <div className="mt-3 grid gap-1.5 text-xs text-muted-foreground">
                {shopName && (
                  <div className="flex justify-between">
                    <span>Loja</span>
                    <span className="font-medium text-foreground">{shopName}</span>
                  </div>
                )}
                {shopId && (
                  <div className="flex justify-between">
                    <span>ID da loja</span>
                    <span className="font-medium text-foreground">{shopId}</span>
                  </div>
                )}
                {lastSyncAt && (
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Última sync
                    </span>
                    <span className="text-foreground">
                      {format(new Date(lastSyncAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                )}
                {nextSyncAt && (
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Próxima sync
                    </span>
                    <span className="text-foreground">
                      {format(new Date(nextSyncAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3 mt-1.5">
              <button
                onClick={status === 'expired' ? onManage : onConnect}
                disabled={isConnecting}
                className="text-sm font-semibold text-primary hover:underline disabled:opacity-50"
              >
                {isConnecting ? (
                  <span className="flex items-center gap-1">
                    <RefreshCw className="h-3 w-3 animate-spin" /> Conectando...
                  </span>
                ) : status === 'expired' ? (
                  'Reconectar'
                ) : status === 'error' ? (
                  'Tentar novamente'
                ) : (
                  'Integrar'
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}