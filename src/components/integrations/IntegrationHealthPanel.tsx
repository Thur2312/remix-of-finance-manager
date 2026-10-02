import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, Activity } from 'lucide-react';

interface IntegrationHealthPanelProps {
  logs: Array<{ status: string; message: string | null; created_at: string }>;
  lastError?: string | null;
  onViewLogs: () => void;
}

export function IntegrationHealthPanel({ logs, lastError, onViewLogs }: IntegrationHealthPanelProps) {
  const recentLogs = logs.slice(0, 10);
  const successCount = recentLogs.filter(l => l.status === 'success').length;
  const successRate = recentLogs.length > 0 ? Math.round((successCount / recentLogs.length) * 100) : 100;

  return (
    <div className="panel p-5 space-y-3">
      <h3 className="text-base font-semibold flex items-center gap-2">
        <Activity className="h-4 w-4 text-primary" /> Saúde da Integração
      </h3>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Taxa de sucesso (últimas 10)</span>
        <span className={`font-mono font-medium ${successRate >= 80 ? 'text-success' : successRate >= 50 ? 'text-warning' : 'text-destructive'}`}>
          {recentLogs.length > 0 ? `${successRate}%` : 'Sem dados'}
        </span>
      </div>
      {lastError && (
        <div className="flex items-start gap-2 p-2.5 rounded-md bg-destructive/10 text-sm">
          <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
          <span className="text-destructive">{lastError}</span>
        </div>
      )}
      {!lastError && recentLogs.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-success">
          <CheckCircle className="h-4 w-4" /> Tudo funcionando normalmente
        </div>
      )}
      <Button variant="outline" size="sm" className="w-full" onClick={onViewLogs}>
        Ver logs
      </Button>
    </div>
  );
}
