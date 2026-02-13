import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { DREAlerta } from '@/lib/dre-calculations';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

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
    <motion.div 
      className="space-y-3"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      {alertas.map((alerta, index) => {
        const Icon = getIcon(alerta.tipo);
        return (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: index * 0.1 }}
          >
            <Alert 
              variant={getVariant(alerta.tipo)}
              className={cn(
                'border border-blue-200 bg-white shadow-sm',
                alerta.tipo === 'warning' && 'border-yellow-500/50 bg-yellow-50/50',
                alerta.tipo === 'info' && 'border-blue-500/50 bg-blue-50/50'
              )}
            >
              <Icon className={cn(
                'h-4 w-4',
                alerta.tipo === 'error' && 'text-red-600',
                alerta.tipo === 'warning' && 'text-yellow-600',
                alerta.tipo === 'info' && 'text-blue-600'
              )} />
              <AlertTitle className={cn(
                'text-gray-900',
                alerta.tipo === 'warning' && 'text-yellow-800',
                alerta.tipo === 'info' && 'text-blue-800'
              )}>
                {getTitle(alerta.tipo)}
              </AlertTitle>
              <AlertDescription className={cn(
                'text-gray-700',
                alerta.tipo === 'warning' && 'text-yellow-700',
                alerta.tipo === 'info' && 'text-blue-700'
              )}>
                {alerta.mensagem}
              </AlertDescription>
            </Alert>
          </motion.div>
        );
      })}
    </motion.div>
  );
}