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

    // ✅ Redirect final vindo da Edge Function
    if (connected) {
      const providerName = connected === 'shopee' ? 'Shopee' : 'TikTok Shop'
      toast({ title: `${providerName} conectada com sucesso!` });
      navigate('/integrations', { replace: true });
      return;
    }

    if (error) {
      toast({ title: 'Erro na conexão', description: error, variant: 'destructive' });
      navigate('/integrations', { replace: true });
      return;
    }

    if (code) {
      setStatus('Obtendo sessão do usuário...');
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session?.access_token) {
          // Usuário não está logado — salva o code e redireciona para login
          sessionStorage.setItem('pending_oauth_code', code);
          if (shopId) sessionStorage.setItem('pending_oauth_shop_id', shopId);
          navigate('/user/auth', { replace: true });
          return;
        }

        const token = session.access_token

        // ✅ Detecta o provider pelo parâmetro shop_id
        // Shopee sempre envia shop_id, TikTok não
        const isShopee = !!shopId

        if (isShopee) {
          setStatus('Conectando com a Shopee...');
          const params = new URLSearchParams({ code, token, shop_id: shopId })
          window.location.href =
            `https://opzsrqdvotozawuqpapo.functions.supabase.co/integration-callback?${params.toString()}`
        } else {
          setStatus('Conectando com o TikTok...');
          const params = new URLSearchParams({ code, token })
          window.location.href =
            `https://opzsrqdvotozawuqpapo.functions.supabase.co/tiktok-callback?${params.toString()}`
        }
      })
    }
  }, [searchParams, navigate, toast]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-muted-foreground">{status}</p>
    </div>
  );
}