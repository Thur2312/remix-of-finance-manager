import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { DREAlerta } from '@/lib/dre-calculations';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DREAlertsProps {
  alertas: DREAlerta[];
}

export function DREAlerts({ alertas }: DREAlertsProps) {
  if (alertas.length === 0) return null;

  const getIcon = (tipo: DREAlerta['tipo']) => {
    switch (tipo) {
      case 'error':
        return AlertCircle;
      case 'warning':
        return AlertTriangle;
      case 'info':
        return Info;
    }
  };

  const getVariant = (tipo: DREAlerta['tipo']): 'default' | 'destructive' => {
    return tipo === 'error' ? 'destructive' : 'default';
  };

  const getTitle = (tipo: DREAlerta['tipo']) => {
    switch (tipo) {
      case 'error':
        return 'Erro';
      case 'warning':
        return 'Atenção';
      case 'info':
        return 'Informação';
    }
  };

  return (
    <div className="space-y-3">
      {alertas.map((alerta, index) => {
        const Icon = getIcon(alerta.tipo);
        return (
          <Alert 
            key={index} 
            variant={getVariant(alerta.tipo)}
            className={cn(
              alerta.tipo === 'warning' && 'border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20',
              alerta.tipo === 'info' && 'border-blue-500/50 bg-blue-50/50 dark:bg-blue-950/20'
            )}
          >
            <Icon className={cn(
              'h-4 w-4',
              alerta.tipo === 'warning' && 'text-yellow-600',
              alerta.tipo === 'info' && 'text-blue-600'
            )} />
            <AlertTitle className={cn(
              alerta.tipo === 'warning' && 'text-yellow-800 dark:text-yellow-200',
              alerta.tipo === 'info' && 'text-blue-800 dark:text-blue-200'
            )}>
              {getTitle(alerta.tipo)}
            </AlertTitle>
            <AlertDescription className={cn(
              alerta.tipo === 'warning' && 'text-yellow-700 dark:text-yellow-300',
              alerta.tipo === 'info' && 'text-blue-700 dark:text-blue-300'
            )}>
              {alerta.mensagem}
            </AlertDescription>
          </Alert>
        );
      })}
    </div>
  );
}
