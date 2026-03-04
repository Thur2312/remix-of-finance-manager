import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-4 w-4" /> Saúde da Integração
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Taxa de sucesso (últimas 10)</span>
          <span className={`font-medium ${successRate >= 80 ? 'text-green-600' : successRate >= 50 ? 'text-yellow-600' : 'text-destructive'}`}>
            {recentLogs.length > 0 ? `${successRate}%` : 'Sem dados'}
          </span>
        </div>
        {lastError && (
          <div className="flex items-start gap-2 p-2 rounded-lg bg-destructive/10 text-sm">
            <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
            <span className="text-destructive">{lastError}</span>
          </div>
        )}
        {!lastError && recentLogs.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle className="h-4 w-4" /> Tudo funcionando normalmente
          </div>
        )}
        <Button variant="outline" size="sm" className="w-full" onClick={onViewLogs}>
          Ver logs
        </Button>
      </CardContent>
    </Card>
  );
}
