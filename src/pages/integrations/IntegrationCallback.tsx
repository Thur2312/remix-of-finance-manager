import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

export default function IntegrationCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState('Processando conexão...');

  useEffect(() => {
    const connected = searchParams.get('connected');
    const error = searchParams.get('error');
    const code = searchParams.get('code');
    const shopId = searchParams.get('shop_id');
    const provider = searchParams.get('provider'); // ✅ ML envia isso

    // Redirect final vindo da Edge Function
    if (connected) {
      const names: Record<string, string> = {
        shopee: 'Shopee',
        tiktok: 'TikTok Shop',
        mercadolivre: 'Mercado Livre',
      };
      toast({ title: `${names[connected] ?? connected} conectado com sucesso!` });
      navigate('/integrations', { replace: true });
      return;
    }

    if (error) {
      toast({ title: 'Erro na conexão', description: error, variant: 'destructive' });
      navigate('/integrations', { replace: true });
      return;
    }

    // ✅ Resgata da URL ou do sessionStorage (quando vem pós-login)
    const finalCode = code ?? sessionStorage.getItem('pending_oauth_code');
    const finalShopId = shopId ?? sessionStorage.getItem('pending_oauth_shop_id');
    const finalProvider = provider ?? sessionStorage.getItem('pending_oauth_provider');

    if (!finalCode) return;

    // Limpa imediatamente para não reusar
    sessionStorage.removeItem('pending_oauth_code');
    sessionStorage.removeItem('pending_oauth_shop_id');
    sessionStorage.removeItem('pending_oauth_provider');

    setStatus('Obtendo sessão do usuário...');

    const tryGetSession = async (retries = 3): Promise<void> => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        if (retries > 0) {
          await new Promise(r => setTimeout(r, 800));
          return tryGetSession(retries - 1);
        }
        // Sem sessão após retries — salva tudo e manda pro login
        sessionStorage.setItem('pending_oauth_code', finalCode);
        if (finalShopId) sessionStorage.setItem('pending_oauth_shop_id', finalShopId);
        if (finalProvider) sessionStorage.setItem('pending_oauth_provider', finalProvider);
        navigate('/user/auth?redirect=/callback', { replace: true });
        return;
      }

      const token = session.access_token;

      // ✅ Detecção do provider:
      // - Shopee: envia shop_id
      // - ML: envia ?provider=mercadolivre
      // - TikTok: nenhum dos dois
      if (finalShopId) {
        setStatus('Conectando com a Shopee...');
        const params = new URLSearchParams({ code: finalCode, token, shop_id: finalShopId });
        window.location.href =
          `https://opzsrqdvotozawuqpapo.functions.supabase.co/integration-callback?${params.toString()}`;
      } else if (finalProvider === 'mercadolivre') {
        setStatus('Conectando com o Mercado Livre...');
        const params = new URLSearchParams({ code: finalCode, token });
        window.location.href =
          `https://opzsrqdvotozawuqpapo.functions.supabase.co/mercadolivre-callback?${params.toString()}`;
      } else {
        setStatus('Conectando com o TikTok...');
        const params = new URLSearchParams({ code: finalCode, token });
        window.location.href =
          `https://opzsrqdvotozawuqpapo.functions.supabase.co/tiktok-callback?${params.toString()}`;
      }
    };

    tryGetSession();
  }, [searchParams, navigate, toast]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-muted-foreground">{status}</p>
    </div>
  );
}