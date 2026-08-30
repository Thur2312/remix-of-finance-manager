import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Shield, Send } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type TargetType = 'all' | 'segment' | 'emails';

const SEGMENT_OPTIONS = [
  { value: 'shopee_connected', label: 'Usuários com Shopee conectada' },
  { value: 'tiktok_connected', label: 'Usuários com TikTok Shop conectada' },
  { value: 'mercadolivre_connected', label: 'Usuários com Mercado Livre conectada' },
];

const TYPE_OPTIONS = [
  { value: 'info', label: 'Informação' },
  { value: 'feature', label: 'Novidade / Feature' },
  { value: 'fix', label: 'Correção' },
  { value: 'alert', label: 'Alerta' },
];

interface PastNotification {
  id: string;
  title: string;
  body: string;
  type: string;
  target_type: string;
  target_user_ids: string[] | null;
  published_at: string;
}

function NotificacoesAdminContent() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState('info');
  const [targetType, setTargetType] = useState<TargetType>('all');
  const [segment, setSegment] = useState(SEGMENT_OPTIONS[0].value);
  const [emailsRaw, setEmailsRaw] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pastQuery = useQuery({
    queryKey: ['admin-notifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('id, title, body, type, target_type, target_user_ids, published_at')
        .order('published_at', { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as PastNotification[];
    },
  });

  const resetForm = () => {
    setTitle('');
    setBody('');
    setType('info');
    setTargetType('all');
    setEmailsRaw('');
  };

  const handleSubmit = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error('Título e mensagem são obrigatórios');
      return;
    }
    if (targetType === 'emails' && !emailsRaw.trim()) {
      toast.error('Informe ao menos um e-mail');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-create-notification', {
        body: {
          title,
          body,
          type,
          targetType,
          segment: targetType === 'segment' ? segment : undefined,
          emails: targetType === 'emails'
            ? emailsRaw.split(/[,\n]/).map(e => e.trim()).filter(Boolean)
            : undefined,
        },
      });

      if (error) throw error;

      const recipientInfo = data?.recipientCount != null
        ? ` (${data.recipientCount} destinatário${data.recipientCount === 1 ? '' : 's'})`
        : '';
      toast.success(`Aviso publicado${recipientInfo}!`);

      if (data?.notFoundEmails?.length > 0) {
        toast.warning(`E-mail(s) não encontrado(s): ${data.notFoundEmails.join(', ')}`);
      }

      resetForm();
      queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
    } catch (err) {
      console.error(err);
      toast.error('Erro ao publicar aviso');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader icon={Shield} title="Avisos e novidades" subtitle="Crie comunicados pra todos os usuários ou só pra um grupo específico" />

      <Card className="panel bg-card border-transparent">
        <CardHeader>
          <CardTitle>Novo aviso</CardTitle>
          <CardDescription>Publicado imediatamente — aparece no sininho de quem for destinatário.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="notif-title">Título</Label>
            <Input id="notif-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Correção na receita da Shopee" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notif-body">Mensagem</Label>
            <Textarea id="notif-body" value={body} onChange={(e) => setBody(e.target.value)} rows={4} placeholder="Explique o que mudou e por quê." />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Destinatários</Label>
              <Select value={targetType} onValueChange={(v) => setTargetType(v as TargetType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os usuários</SelectItem>
                  <SelectItem value="segment">Segmento (por integração)</SelectItem>
                  <SelectItem value="emails">E-mails específicos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {targetType === 'segment' && (
            <div className="space-y-2">
              <Label>Qual segmento?</Label>
              <Select value={segment} onValueChange={setSegment}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SEGMENT_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {targetType === 'emails' && (
            <div className="space-y-2">
              <Label>E-mails (separados por vírgula ou linha)</Label>
              <Textarea value={emailsRaw} onChange={(e) => setEmailsRaw(e.target.value)} rows={3} placeholder="fulano@email.com, ciclano@email.com" />
            </div>
          )}

          <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full">
            {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            Publicar aviso
          </Button>
        </CardContent>
      </Card>

      <Card className="panel bg-card border-transparent">
        <CardHeader>
          <CardTitle>Avisos publicados</CardTitle>
        </CardHeader>
        <CardContent>
          {pastQuery.isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : pastQuery.data?.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum aviso publicado ainda.</p>
          ) : (
            <div className="space-y-3">
              {pastQuery.data?.map(n => (
                <div key={n.id} className="border-b border-border pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{n.title}</p>
                    <Badge variant="outline" className="text-[10px]">{n.type}</Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {n.target_type === 'all' ? 'Todos' : `${n.target_user_ids?.length ?? 0} destinatário(s)`}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{n.body}</p>
                  <p className="text-[11px] text-muted-foreground/70 mt-1">
                    {formatDistanceToNow(new Date(n.published_at), { addSuffix: true, locale: ptBR })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function NotificacoesAdmin() {
  const { profile, profileLoading } = useAuth();

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile?.is_admin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <NotificacoesAdminContent />;
}
