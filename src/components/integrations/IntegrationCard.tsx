import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Clock, RefreshCw, AlertCircle, CheckCircle2, XCircle, Sparkles, ArrowUpRight } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import logoShopee from '@/assets/logo-shopee.jpg';
import logoTiktok from '@/assets/logo-tiktok.png';

interface IntegrationCardProps {
  provider: 'shopee' | 'tiktok' | 'mercadolivre';
  status: string;
  shopName?: string | null;
  shopId?: string | null;
  lastSyncAt?: string | null;
  nextSyncAt?: string | null;
  lastErrorMessage?: string | null;
  onConnect: () => void;
  onManage: () => void;
  isConnecting?: boolean;
  /** Integração automática ainda não liberada (ex: aprovação de API pendente) —
   * mostra "Em breve" no lugar do botão de conectar. Ignorado se já houver uma
   * conexão ativa (não esconde quem já está conectado). */
  comingSoon?: boolean;
}

const providerConfig = {
  shopee: { name: 'Shopee', subtitle: 'Marketplace', logo: logoShopee },
  tiktok: { name: 'TikTok Shop', subtitle: 'Marketplace', logo: logoTiktok },
  mercadolivre: {
    name: 'Mercado Livre',
    subtitle: 'Marketplace',
    logo: 'https://http2.mlstatic.com/frontend-assets/ml-web-navigation/ui-navigation/6.6.92/mercadolibre/logo_large_25years@2x.png',
  },
};

// Mesmo vocabulário tingido do IconBadge (bg-x/10 + text-x) em vez das
// variantes genéricas do shadcn Badge (default/secondary/destructive) — cor
// com significado (verde=saudável, dourado=atenção recuperável, vermelho=
// bloqueado) em vez de só "primário vs. cinza vs. vermelho".
const statusConfig: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  connected: { label: 'Conectado', className: 'bg-success/10 text-success', icon: <CheckCircle2 className="h-3 w-3" /> },
  disconnected: { label: 'Desconectado', className: 'bg-muted text-muted-foreground', icon: <XCircle className="h-3 w-3" /> },
  expired: { label: 'Token expirado', className: 'bg-warning/10 text-warning', icon: <AlertCircle className="h-3 w-3" /> },
  error: { label: 'Erro', className: 'bg-destructive/10 text-destructive', icon: <AlertCircle className="h-3 w-3" /> },
  connecting: { label: 'Conectando...', className: 'bg-primary/10 text-primary', icon: <RefreshCw className="h-3 w-3 animate-spin" /> },
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
  comingSoon,
}: IntegrationCardProps) {
  const config = providerConfig[provider];
  const isConnected = status === 'connected';
  const statusInfo = statusConfig[status] ?? statusConfig.disconnected;
  const showComingSoon = !!comingSoon && !isConnected;

  if (showComingSoon) {
    return (
      <div className="panel panel-quiet border border-dashed border-border p-5">
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-xl bg-muted ring-1 ring-border flex items-center justify-center overflow-hidden shrink-0 grayscale opacity-70">
            <img src={config.logo} alt={config.name} className="h-full w-full object-contain p-2" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-base font-semibold text-muted-foreground">{config.name}</span>
              <Badge className="flex items-center gap-1 text-xs bg-gold/10 text-gold border-transparent">
                <Sparkles className="h-3 w-3" />
                Em breve
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              Integração automática ainda não disponível — estamos liberando o acesso com a {config.name}.
            </p>
            {provider === 'tiktok' && (
              <Link
                to="/gestao/tiktok/upload"
                className="text-sm font-semibold text-primary hover:underline mt-2 inline-flex items-center gap-1"
              >
                Por enquanto, importe pedidos por planilha
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="panel p-5">
      <div className="flex items-start gap-4">
        <div className="h-14 w-14 rounded-xl bg-card ring-1 ring-border flex items-center justify-center overflow-hidden shrink-0">
          <img src={config.logo} alt={config.name} className="h-full w-full object-contain p-2" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-base font-semibold">{config.name}</span>
            <Badge className={`flex items-center gap-1 text-xs border-transparent ${statusInfo.className}`}>
              {statusInfo.icon}
              {statusInfo.label}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{config.subtitle}</p>

          {lastErrorMessage && (
            <div className="mt-2.5 flex items-start gap-1.5 text-xs text-destructive bg-destructive/10 rounded-md p-2.5">
              <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>{lastErrorMessage}</span>
            </div>
          )}

          {isConnected ? (
            <>
              <button onClick={onManage} className="text-sm font-semibold text-primary hover:underline mt-1.5 inline-flex items-center gap-1">
                Gerenciar
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
              <div className="mt-3.5 grid gap-1.5 text-xs text-muted-foreground border-t border-border/70 pt-3">
                {shopName && (
                  <div className="flex justify-between gap-3">
                    <span>Loja</span>
                    <span className="font-medium text-foreground truncate">{shopName}</span>
                  </div>
                )}
                {shopId && (
                  <div className="flex justify-between gap-3">
                    <span>ID da loja</span>
                    <span className="font-medium text-foreground font-mono truncate">{shopId}</span>
                  </div>
                )}
                {lastSyncAt && (
                  <div className="flex justify-between items-center gap-3">
                    <span className="flex items-center gap-1 shrink-0">
                      <Clock className="h-3 w-3" /> Última sync
                    </span>
                    <span className="text-foreground">
                      {format(new Date(lastSyncAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                )}
                {nextSyncAt && (
                  <div className="flex justify-between items-center gap-3">
                    <span className="flex items-center gap-1 shrink-0">
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
    </div>
  );
}