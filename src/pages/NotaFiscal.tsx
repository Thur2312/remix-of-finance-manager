import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  FileText, Copy, Check, ExternalLink, AlertTriangle, Loader2, Building2, ShoppingBag, Store,
} from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState } from '@/components/ui/empty-state';
import { formatCurrency } from '@/lib/format';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useSaleEvents, type SaleEvent } from '@/hooks/useSaleEvents';
import { useCompanies, hasFiscalDataComplete, REGIME_TRIBUTARIO_LABELS, type Company } from '@/hooks/useCompanies';
import { toast } from 'sonner';

const PROVIDER_LABEL: Record<string, string> = { shopee: 'Shopee', mercadolivre: 'Mercado Livre' };
const PROVIDER_ICON: Record<string, typeof ShoppingBag> = { shopee: ShoppingBag, mercadolivre: Store };

function shopeeOrderLink(externalOrderId: string): string {
  return `https://seller.shopee.com.br/portal/sale/order/${encodeURIComponent(externalOrderId)}`;
}

interface MlBillingInfo {
  comprador: { nome: string | null; documento_tipo: string | null; documento_numero: string | null };
  endereco: {
    logradouro: string | null; numero: string | null; complemento: string | null;
    bairro: string | null; cidade: string | null; uf: string | null; cep: string | null; telefone: string | null;
  } | null;
  itens: { titulo: string | null; quantidade: number | null; preco_unitario: number | null }[];
  valor_total: number | null;
}

// ─── Linha "rótulo: valor" com botão de copiar individual ──────────────────
function CopyField({ label, value }: { label: string; value: string | null | undefined }) {
  const [copied, setCopied] = useState(false);
  if (!value) return null;
  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 border-b border-border/50 last:border-0">
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium truncate">{value}</p>
      </div>
      <button onClick={copy} className="shrink-0 text-muted-foreground hover:text-foreground" title="Copiar">
        {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

// ─── Conteúdo do modal pro Mercado Livre ────────────────────────────────────
function MercadoLivreAssistant({ event, company }: { event: SaleEvent; company: Company | null }) {
  const { data, isLoading, error } = useQuery<MlBillingInfo>({
    queryKey: ['ml-billing-info', event.id],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sessão expirada');
      const res = await fetch('https://opzsrqdvotozawuqpapo.functions.supabase.co/ml-billing-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ connection_id: event.integration_id, order_id: event.external_order_id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Erro ao buscar dados do comprador');
      return json;
    },
  });

  const copyAll = () => {
    if (!data || !company) return;
    const endereco = data.endereco;
    const linhas = [
      `=== EMITENTE ===`,
      `Razão social: ${company.name}`,
      `CNPJ: ${company.cnpj}`,
      `IE: ${company.ie}`,
      `Endereço: ${company.endereco_logradouro}, ${company.endereco_numero}${company.endereco_complemento ? ` - ${company.endereco_complemento}` : ''} - ${company.endereco_bairro}, ${company.endereco_cidade}/${company.endereco_uf} - CEP ${company.endereco_cep}`,
      ``,
      `=== DESTINATÁRIO ===`,
      `Nome: ${data.comprador.nome ?? '-'}`,
      `${data.comprador.documento_tipo ?? 'Documento'}: ${data.comprador.documento_numero ?? '-'}`,
      endereco ? `Endereço: ${endereco.logradouro}, ${endereco.numero}${endereco.complemento ? ` - ${endereco.complemento}` : ''} - ${endereco.bairro}, ${endereco.cidade}/${endereco.uf} - CEP ${endereco.cep}` : 'Endereço: não disponível',
      ``,
      `=== ITENS ===`,
      ...data.itens.map(it => `${it.quantidade}x ${it.titulo} — ${formatCurrency(it.preco_unitario ?? 0)}`),
      ``,
      `Valor total: ${formatCurrency(data.valor_total ?? 0)}`,
    ].join('\n');
    navigator.clipboard.writeText(linhas);
    toast.success('Dados copiados — cole no seu emissor de nota fiscal.');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Buscando dados do comprador no Mercado Livre...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
        {error instanceof Error ? error.message : 'Não foi possível buscar os dados do comprador.'}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Emitente</p>
        {company && hasFiscalDataComplete(company) ? (
          <div className="rounded-md border p-3">
            <CopyField label="Razão social" value={company.name} />
            <CopyField label="CNPJ" value={company.cnpj} />
            <CopyField label="Inscrição Estadual" value={company.ie} />
            <CopyField
              label="Endereço"
              value={`${company.endereco_logradouro}, ${company.endereco_numero} - ${company.endereco_bairro}, ${company.endereco_cidade}/${company.endereco_uf} - ${company.endereco_cep}`}
            />
          </div>
        ) : (
          <div className="flex items-start gap-2 rounded-md bg-warning/10 p-3 text-sm text-warning">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              Complete os dados fiscais da empresa pra ver o emitente aqui.{' '}
              <Link to="/empresas" className="font-semibold underline">Completar em Empresas</Link>
            </span>
          </div>
        )}
      </div>

      <div>
        <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Destinatário</p>
        <div className="rounded-md border p-3">
          <CopyField label="Nome" value={data.comprador.nome} />
          <CopyField
            label={data.comprador.documento_tipo === 'CNPJ' ? 'CNPJ' : 'CPF'}
            value={data.comprador.documento_numero}
          />
          {data.endereco ? (
            <CopyField
              label="Endereço"
              value={`${data.endereco.logradouro}, ${data.endereco.numero}${data.endereco.complemento ? ` - ${data.endereco.complemento}` : ''} - ${data.endereco.bairro}, ${data.endereco.cidade}/${data.endereco.uf} - ${data.endereco.cep}`}
            />
          ) : (
            <p className="py-1.5 text-xs text-muted-foreground">Endereço não disponível pra esse pedido.</p>
          )}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Itens</p>
        <div className="rounded-md border divide-y">
          {data.itens.map((it, i) => (
            <div key={i} className="flex items-center justify-between px-3 py-2 text-sm">
              <span className="truncate pr-3">{it.quantidade}x {it.titulo}</span>
              <span className="shrink-0 font-mono tabular-nums">{formatCurrency(it.preco_unitario ?? 0)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between px-3 py-2 text-sm font-semibold">
            <span>Total</span>
            <span className="font-mono tabular-nums">{formatCurrency(data.valor_total ?? 0)}</span>
          </div>
        </div>
      </div>

      <Button onClick={copyAll} className="w-full" disabled={!company || !hasFiscalDataComplete(company)}>
        <Copy className="h-4 w-4 mr-2" /> Copiar tudo
      </Button>
    </div>
  );
}

// ─── Conteúdo do modal pra Shopee ───────────────────────────────────────────
function ShopeeAssistant({ event }: { event: SaleEvent }) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">O que já temos</p>
        <div className="rounded-md border p-3">
          <CopyField label="Produto" value={event.product_name} />
          <CopyField label="Valor" value={formatCurrency(event.total_amount)} />
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-md bg-muted/40 p-3 text-sm text-muted-foreground">
        A Shopee não libera pro nosso app o nome, CPF e endereço do comprador — só ela mesma tem
        acesso a esse dado. A nota precisa ser emitida direto no painel da Shopee, que já vem com
        tudo isso preenchido.
      </div>

      <Button asChild className="w-full">
        <a href={shopeeOrderLink(event.external_order_id)} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="h-4 w-4 mr-2" /> Abrir pedido na Shopee pra emitir
        </a>
      </Button>
    </div>
  );
}

// ─── Modal principal ─────────────────────────────────────────────────────────
function AssistantDialog({ event, company, onClose }: { event: SaleEvent | null; company: Company | null; onClose: () => void }) {
  if (!event) return null;
  const Icon = PROVIDER_ICON[event.provider] ?? FileText;

  return (
    <Dialog open={!!event} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-4 w-4" /> Dados pra nota fiscal
          </DialogTitle>
          <DialogDescription>
            Pedido {event.external_order_id} · {PROVIDER_LABEL[event.provider]} ·{' '}
            {format(new Date(event.order_created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </DialogDescription>
        </DialogHeader>

        {event.provider === 'mercadolivre' ? (
          <MercadoLivreAssistant event={event} company={company} />
        ) : (
          <ShopeeAssistant event={event} />
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Página ──────────────────────────────────────────────────────────────────
export default function NotaFiscal() {
  const { companies, loading: loadingCompanies } = useCompanies();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<SaleEvent | null>(null);

  const { data, isLoading } = useSaleEvents({ statusGroup: 'sold', days: 30, pageSize: 30 });
  const events = data?.events ?? [];

  const activeCompany = companies.find(c => c.id === companyId) ?? companies[0] ?? null;

  return (
    <PageShell
      icon={FileText}
      title="Nota Fiscal"
      subtitle="Dados prontos pra copiar no seu emissor — nome, documento e endereço do comprador, produto e valor."
      className="space-y-6"
    >
      {!loadingCompanies && companies.length === 0 && (
        <div className="flex items-start gap-3 rounded-xl border bg-warning/10 px-4 py-3 text-sm text-warning">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Cadastre uma empresa com os dados fiscais antes de usar o assistente.{' '}
            <Link to="/empresas" className="font-semibold underline">Cadastrar empresa</Link>
          </span>
        </div>
      )}

      {companies.length > 0 && activeCompany && !hasFiscalDataComplete(activeCompany) && (
        <div className="flex items-start gap-3 rounded-xl border bg-warning/10 px-4 py-3 text-sm text-warning">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Faltam dados fiscais de <strong>{activeCompany.name}</strong> (IE, regime tributário ou
            endereço) — o emitente só aparece pronto depois de completar isso.{' '}
            <Link to="/empresas" className="font-semibold underline">Completar cadastro</Link>
          </span>
        </div>
      )}

      {companies.length > 1 && (
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <Select value={activeCompany?.id} onValueChange={setCompanyId}>
            <SelectTrigger className="h-9 w-[260px]"><SelectValue placeholder="Empresa emitente" /></SelectTrigger>
            <SelectContent>
              {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />)}
        </div>
      ) : events.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Nenhum pedido nos últimos 30 dias"
          description="Pedidos pagos de Shopee e Mercado Livre aparecem aqui pra gerar os dados da nota."
        />
      ) : (
        <div className="panel divide-y divide-border/60">
          {events.map(event => {
            const Icon = PROVIDER_ICON[event.provider] ?? FileText;
            return (
              <div key={event.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{event.product_name ?? event.external_order_id}</p>
                    <p className="text-xs text-muted-foreground">
                      {PROVIDER_LABEL[event.provider]} · {format(new Date(event.order_created_at), 'dd/MM/yyyy', { locale: ptBR })}
                      {' · '}{formatCurrency(event.total_amount)}
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="shrink-0" onClick={() => setSelectedEvent(event)}>
                  Gerar dados pra nota
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <AssistantDialog event={selectedEvent} company={activeCompany} onClose={() => setSelectedEvent(null)} />
    </PageShell>
  );
}
