import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface LogEntry {
  id: string;
  type: string;
  status: string;
  message: string | null;
  created_at: string;
}

interface IntegrationLogsTableProps {
  logs: LogEntry[];
}

const typeLabels: Record<string, string> = {
  auth: 'Autenticação',
  token_refresh: 'Refresh Token',
  manual_sync: 'Sync Manual',
  scheduled_sync: 'Sync Automática',
  webhook: 'Webhook',
  disconnect: 'Desconexão',
};

export function IntegrationLogsTable({ logs }: IntegrationLogsTableProps) {
  if (logs.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-6">Nenhum log encontrado.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Data/Hora</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>Resultado</TableHead>
          <TableHead>Mensagem</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {logs.map((log) => (
          <TableRow key={log.id}>
            <TableCell className="whitespace-nowrap text-sm">
              {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
            </TableCell>
            <TableCell>
              <span className="text-sm">{typeLabels[log.type] || log.type}</span>
            </TableCell>
            <TableCell>
              <Badge variant={log.status === 'success' ? 'default' : 'destructive'}>
                {log.status === 'success' ? 'Sucesso' : 'Erro'}
              </Badge>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate">
              {log.message || '-'}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
