import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

export default function IntegrationCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const connected = searchParams.get('connected');
    const error = searchParams.get('error');

    if (connected) {
      toast({ title: `${connected} conectado com sucesso!` });
    } else if (error) {
      toast({ title: 'Erro na conexão', description: error, variant: 'destructive' });
    }

    navigate('/integrations', { replace: true });
  }, [searchParams, navigate, toast]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-muted-foreground">Processando callback...</p>
    </div>
  );
}
