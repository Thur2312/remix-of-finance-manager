import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export default function IntegrationCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const connected = searchParams.get('connected');
    const error = searchParams.get('error');
    const code = searchParams.get('code');
    const shopId = searchParams.get('shop_id');

    // Redirect final vindo da Edge Function
    if (connected) {
      toast({ title: 'Shopee conectada com sucesso!' });
      navigate('/integrations', { replace: true });
      return;
    }

    if (error) {
      toast({ title: 'Erro na conexão', description: error, variant: 'destructive' });
      navigate('/integrations', { replace: true });
      return;
    }

    // Recebeu o code da Shopee — chama a Edge Function com o token do usuário
    if (code) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        const token = session?.access_token ?? ""
        const params = new URLSearchParams({
          code,
          token,
          ...(shopId ? { shop_id: shopId } : {}),
        })
        window.location.href =
          `https://opzsrqdvotozawuqpapo.functions.supabase.co/integration-callback?${params.toString()}`
      })
    }
  }, [searchParams, navigate, toast]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-muted-foreground">Processando conexão com a Shopee...</p>
    </div>
  );
}