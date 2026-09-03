import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useFixedCosts, COST_CATEGORIES, FixedCost } from '@/hooks/useFixedCosts';
import { useCustomCategories } from '@/hooks/useCustomCategories';
import { useCompanyConnections } from '@/hooks/useCompanyConnections';
import { useRevenueByCompany } from '@/hooks/useRevenueByCompany';
import { SCOPE_LABELS, SCOPE_SHORT, type CostScope } from '@/lib/company-scope';
import type { AllocationResult } from '@/lib/cost-allocation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { CategorySelect } from '@/components/CategorySelect';
import { parseCurrencyInput, parseNumericInputSafe } from '@/lib/numeric-validation';
import { toast } from 'sonner';
import {
  DollarSign, Plus, Pencil, Trash2, RefreshCw,
  Building2, Laptop, Megaphone, CreditCard, Receipt,
  Truck, FolderOpen, Package, ShoppingBag, Users, Wrench, Globe,
} from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { formatCurrency } from '@/lib/format';

// ── Ícones das categorias padrão + customizadas ──────────────────────────────
const DEFAULT_ICON_MAP: Record<string, React.ReactNode> = {
  'Estrutura Administrativa': <Building2 className="h-4 w-4" />,
  'Infraestrutura & Operação': <Building2 className="h-4 w-4" />,
  'Tecnologia & Ferramentas': <Laptop className="h-4 w-4" />,
  'Marketing Fixo': <Megaphone className="h-4 w-4" />,
  'Financeiro & Bancário': <CreditCard className="h-4 w-4" />,
  'Tributação Fixa': <Receipt className="h-4 w-4" />,
  'Logística Estrutural': <Truck className="h-4 w-4" />,
  'Despesas Recorrentes Diversas': <FolderOpen className="h-4 w-4" />,
};

const CUSTOM_ICON_MAP: Record<string, React.ReactNode> = {
  FolderOpen: <FolderOpen className="h-4 w-4" />,
  Building2: <Building2 className="h-4 w-4" />,
  Laptop: <Laptop className="h-4 w-4" />,
  Megaphone: <Megaphone className="h-4 w-4" />,
  CreditCard: <CreditCard className="h-4 w-4" />,
  Receipt: <Receipt className="h-4 w-4" />,
  Truck: <Truck className="h-4 w-4" />,
  Package: <Package className="h-4 w-4" />,
  ShoppingBag: <ShoppingBag className="h-4 w-4" />,
  Users: <Users className="h-4 w-4" />,
  Wrench: <Wrench className="h-4 w-4" />,
  Globe: <Globe className="h-4 w-4" />,
};

// ── Rateio por empresa (Bloco D, item 13) ───────────────────────────────────
function AllocationView({
  result, companies, revenue, hasUnassigned,
}: {
  result: AllocationResult;
  companies: { id: string; name: string }[];
  revenue: ReturnType<typeof useRevenueByCompany>;
  hasUnassigned: boolean;
}) {
  const nome = (id: string) => companies.find(c => c.id === id)?.name ?? id;
  const brl = (cents: number) => formatCurrency(cents / 100);
  const nao = result.naoAtribuido;

  return (
    <div className="space-y-3">
      {hasUnassigned && (
        <div className="rounded-md bg-warning/10 px-3 py-2 text-xs text-warning">
          Há loja sem empresa atribuída. O que ela fatura não entra no rateio de nenhuma empresa —
          atribua em Financeiro → Empresas.
        </div>
      )}
      {companies.map(c => {
        const a = result.byCompany[c.id];
        if (!a) return null;
        const rev = revenue.byCompanyCents[c.id] ?? 0;
        return (
          <Card key={c.id}>
            <CardContent className="pt-5">
              <div className="flex items-baseline justify-between">
                <h3 className="text-sm font-semibold">{nome(c.id)}</h3>
                <span className="font-mono text-lg font-bold tabular-nums">{brl(a.totalCents)}<span className="text-xs font-normal text-muted-foreground">/mês</span></span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                faturou {brl(rev)} nos últimos 30 dias
              </p>
              <div className="mt-3 space-y-1 text-sm">
                {a.exclusivoCents > 0 && <LinhaAloc label="Exclusivo da empresa" cents={a.exclusivoCents} />}
                {a.lojaCents > 0 && <LinhaAloc label="Das lojas dela" cents={a.lojaCents} />}
                {a.plataformaCents > 0 && <LinhaAloc label="Das plataformas onde vende" cents={a.plataformaCents} />}
                {a.rateioGeralCents > 0 && (
                  <LinhaAloc label="Parte do custo geral (rateio por faturamento ou manual)" cents={a.rateioGeralCents} />
                )}
                {a.totalCents === 0 && <p className="text-xs text-muted-foreground">Sem custo atribuído.</p>}
              </div>
            </CardContent>
          </Card>
        );
      })}
      {nao.totalCents > 0 && (
        <Card className="ring-1 ring-warning/40">
          <CardContent className="pt-5">
            <h3 className="text-sm font-semibold text-warning">Não atribuído</h3>
            <div className="mt-2 space-y-1 text-sm">
              {nao.geralSemFaturamentoCents > 0 && <LinhaAloc label="Custo geral sem faturamento pra ratear" cents={nao.geralSemFaturamentoCents} />}
              {nao.lojaSemEmpresaCents > 0 && <LinhaAloc label="Custo de empresa/loja sem vínculo válido" cents={nao.lojaSemEmpresaCents} />}
              {nao.plataformaSemEmpresaCents > 0 && <LinhaAloc label="Custo de plataforma sem loja atribuída" cents={nao.plataformaSemEmpresaCents} />}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function LinhaAloc({ label, cents }: { label: string; cents: number }) {
  return (
    <div className="flex justify-between text-muted-foreground">
      <span>{label}</span>
      <span className="font-mono tabular-nums text-foreground">{formatCurrency(cents / 100)}</span>
    </div>
  );
}

// ── Conteúdo principal ───────────────────────────────────────────────────────
function CadastroCustosContent() {
  const {
    costs,
    isLoading,
    addCost,
    updateCost,
    deleteCost,
    totalRecurringCosts,
    costsByCategory,
    allocate,
  } = useFixedCosts();

  const { customCategories } = useCustomCategories();
  const { connections, companies } = useCompanyConnections();
  const revenue = useRevenueByCompany(30);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingCost, setEditingCost] = useState<FixedCost | null>(null);
  const [vista, setVista] = useState<'categoria' | 'empresa'>('categoria');

  // Form
  const [formCategory, setFormCategory] = useState('');
  const [formName, setFormName] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formIsRecurring, setFormIsRecurring] = useState(true);
  const [formNotes, setFormNotes] = useState('');
  const [formScope, setFormScope] = useState<CostScope>('geral');
  const [formCompanyId, setFormCompanyId] = useState('');
  const [formIntegrationId, setFormIntegrationId] = useState('');
  const [formMarketplace, setFormMarketplace] = useState('');
  // Rateio manual por % (só geral/plataforma). formPct: companyId → string do input.
  const [formManualSplit, setFormManualSplit] = useState(false);
  const [formPct, setFormPct] = useState<Record<string, string>>({});

  const pctSum = Object.values(formPct).reduce((s, v) => s + (parseFloat(v) || 0), 0);
  const manualSplitApplies = formScope === 'geral' || formScope === 'plataforma';
  const manualSplitValid = Math.abs(pctSum - 100) < 0.01;

  const resetForm = () => {
    setFormCategory('');
    setFormName('');
    setFormAmount('');
    setFormIsRecurring(true);
    setFormNotes('');
    setFormScope('geral');
    setFormCompanyId('');
    setFormIntegrationId('');
    setFormMarketplace('');
    setFormManualSplit(false);
    setFormPct({});
    setEditingCost(null);
  };

  const openEditDialog = (cost: FixedCost) => {
    setEditingCost(cost);
    setFormCategory(cost.category);
    setFormName(cost.name);
    setFormAmount(cost.amount.toString());
    setFormIsRecurring(cost.is_recurring);
    setFormNotes(cost.notes || '');
    setFormScope(cost.scope ?? 'geral');
    setFormCompanyId(cost.company_id ?? '');
    setFormIntegrationId(cost.integration_id ?? '');
    setFormMarketplace(cost.marketplace ?? '');
    const savedPct = cost.allocation_pct ?? null;
    setFormManualSplit(!!savedPct);
    setFormPct(
      savedPct
        ? Object.fromEntries(Object.entries(savedPct).map(([k, v]) => [k, String(v)]))
        : {},
    );
    setIsAddDialogOpen(true);
  };

  const handleSubmit = async () => {
    const parseResult = parseCurrencyInput(formAmount);
    if (!parseResult.isValid) {
      toast.error(parseResult.error || 'Valor inválido');
      return;
    }
    if (!formCategory || !formName) return;

    const costData = {
      category: formCategory,
      name: formName.trim(),
      amount: parseResult.value,
      is_recurring: formIsRecurring,
      notes: formNotes.trim() || null,
      scope: formScope,
      company_id: formScope === 'empresa' ? (formCompanyId || null) : null,
      integration_id: formScope === 'loja' ? (formIntegrationId || null) : null,
      marketplace: formScope === 'plataforma' ? (formMarketplace || null) : null,
      allocation_pct:
        manualSplitApplies && formManualSplit && manualSplitValid
          ? Object.fromEntries(
              Object.entries(formPct)
                .map(([k, v]) => [k, parseFloat(v) || 0] as const)
                .filter(([, v]) => v > 0),
            )
          : null,
    };
    if (manualSplitApplies && formManualSplit && !manualSplitValid) {
      toast.error('Os percentuais do rateio manual precisam somar 100%');
      return;
    }

    const success = editingCost
      ? await updateCost(editingCost.id, costData)
      : await addCost(costData);

    if (success) {
      setIsAddDialogOpen(false);
      resetForm();
    }
  };

  // Resolve ícone de uma categoria (padrão ou customizada)
  const getCategoryIcon = (categoryName: string) => {
    if (DEFAULT_ICON_MAP[categoryName]) return DEFAULT_ICON_MAP[categoryName];
    const custom = customCategories.find(c => c.name === categoryName);
    if (custom) return CUSTOM_ICON_MAP[custom.icon] ?? <FolderOpen className="h-4 w-4" />;
    return <FolderOpen className="h-4 w-4" />;
  };

  // Todas as categorias que têm custos (padrão + customizadas)
  const defaultCategoryNames = COST_CATEGORIES.map(c => c.name);
  const customCategoryNames = customCategories.map(c => c.name);
  const allCategoryNames = [...defaultCategoryNames, ...customCategoryNames];
  const activeCategoryNames = allCategoryNames.filter(
    name => (costsByCategory[name]?.length ?? 0) > 0
  );

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <PageShell
      icon={Receipt}
      title="Cadastro de Custos Fixos"
      subtitle="Gerencie os custos fixos mensais da sua operação"
      action={
          <Dialog
            open={isAddDialogOpen}
            onOpenChange={open => { setIsAddDialogOpen(open); if (!open) resetForm(); }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Custo
              </Button>
            </DialogTrigger>

            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingCost ? 'Editar Custo' : 'Adicionar Custo Fixo'}</DialogTitle>
                <DialogDescription>
                  {editingCost
                    ? 'Altere as informações do custo fixo'
                    : 'Preencha as informações do novo custo fixo'}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* Categoria — usa o novo CategorySelect */}
                <div className="space-y-2">
                  <Label>Categoria *</Label>
                  <CategorySelect value={formCategory} onChange={setFormCategory} />
                  {formCategory && (() => {
                    const def = COST_CATEGORIES.find(c => c.name === formCategory);
                    return def ? (
                      <p className="text-xs text-muted-foreground">
                        Exemplos: {def.examples.slice(0, 3).join(', ')}
                      </p>
                    ) : null;
                  })()}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Custo *</Label>
                  <Input
                    id="name"
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    placeholder="Ex: Pró-labore, ERP Bling..."
                    maxLength={100}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Valor Mensal (R$) *</Label>
                  <Input
                    id="amount"
                    type="text"
                    inputMode="decimal"
                    value={formAmount}
                    onChange={e => setFormAmount(e.target.value)}
                    placeholder="0,00"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="recurring">Este custo ocorre todo mês?</Label>
                    <p className="text-xs text-muted-foreground">
                      Custos recorrentes são incluídos no cálculo automático
                    </p>
                  </div>
                  <Switch
                    id="recurring"
                    checked={formIsRecurring}
                    onCheckedChange={setFormIsRecurring}
                  />
                </div>

                {/* Bloco D — a que a despesa pertence */}
                <div className="space-y-2">
                  <Label>Este custo é de</Label>
                  <Select value={formScope} onValueChange={v => setFormScope(v as CostScope)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(['geral', 'empresa', 'loja', 'plataforma'] as CostScope[]).map(s => (
                        <SelectItem key={s} value={s} disabled={s !== 'geral' && companies.length === 0}>
                          {SCOPE_LABELS[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formScope === 'geral' && (
                    <p className="text-xs text-muted-foreground">
                      Rateado entre as empresas na proporção do faturamento do período.
                    </p>
                  )}
                  {companies.length === 0 && formScope === 'geral' && (
                    <p className="text-xs text-muted-foreground">
                      Cadastre empresas em Financeiro → Empresas pra poder separar por empresa/loja/plataforma.
                    </p>
                  )}
                  {formScope === 'empresa' && (
                    <Select value={formCompanyId} onValueChange={setFormCompanyId}>
                      <SelectTrigger><SelectValue placeholder="Escolha a empresa" /></SelectTrigger>
                      <SelectContent>
                        {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                  {formScope === 'loja' && (
                    <Select value={formIntegrationId} onValueChange={setFormIntegrationId}>
                      <SelectTrigger><SelectValue placeholder="Escolha a loja" /></SelectTrigger>
                      <SelectContent>
                        {connections.map(c => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.label}{c.companyId ? '' : ' · sem empresa'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {formScope === 'plataforma' && (
                    <Select value={formMarketplace} onValueChange={setFormMarketplace}>
                      <SelectTrigger><SelectValue placeholder="Escolha a plataforma" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="shopee">Shopee</SelectItem>
                        <SelectItem value="mercadolivre">Mercado Livre</SelectItem>
                        <SelectItem value="tiktok">TikTok Shop</SelectItem>
                      </SelectContent>
                    </Select>
                  )}

                  {/* Rateio manual por % — alternativa ao rateio por faturamento */}
                  {manualSplitApplies && companies.length >= 2 && (
                    <div className="space-y-2 rounded-md border border-border/60 p-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium">
                          Rateio: {formManualSplit ? 'manual (%)' : 'automático (faturamento)'}
                        </Label>
                        <Switch checked={formManualSplit} onCheckedChange={setFormManualSplit} />
                      </div>
                      {formManualSplit && (
                        <>
                          {companies.map(c => (
                            <div key={c.id} className="flex items-center gap-2">
                              <span className="flex-1 truncate text-sm">{c.name}</span>
                              <Input
                                type="number"
                                inputMode="decimal"
                                min={0}
                                max={100}
                                value={formPct[c.id] ?? ''}
                                onChange={e => setFormPct(p => ({ ...p, [c.id]: e.target.value }))}
                                className="h-8 w-20 text-right"
                              />
                              <span className="text-xs text-muted-foreground">%</span>
                            </div>
                          ))}
                          <p className={`text-xs ${manualSplitValid ? 'text-muted-foreground' : 'text-destructive'}`}>
                            Soma: {pctSum.toFixed(0)}% {manualSplitValid ? '✓' : '(precisa somar 100%)'}
                          </p>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Observações (opcional)</Label>
                  <Textarea
                    id="notes"
                    value={formNotes}
                    onChange={e => setFormNotes(e.target.value)}
                    placeholder="Notas adicionais sobre este custo..."
                    rows={2}
                    maxLength={500}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => { setIsAddDialogOpen(false); resetForm(); }}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={
                    !formCategory || !formName || !formAmount ||
                    (formScope === 'empresa' && !formCompanyId) ||
                    (formScope === 'loja' && !formIntegrationId) ||
                    (formScope === 'plataforma' && !formMarketplace)
                  }
                >
                  {editingCost ? 'Salvar Alterações' : 'Adicionar'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
      }
    >
      <div className="space-y-6">
        {/* ── Card de totais ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Custo Fixo Mensal Total</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalRecurringCosts)}</div>
              <p className="text-xs text-muted-foreground">
                {costs.filter(c => c.is_recurring).length} custos recorrentes
              </p>
            </CardContent>
          </Card>
        </div>

        {/* ── Alternador de vista (Bloco D) ──────────────────────────────────── */}
        {companies.length > 0 && (
          <div className="flex gap-1 rounded-lg bg-muted/60 p-1 text-sm font-medium">
            {(['categoria', 'empresa'] as const).map(v => (
              <button key={v} onClick={() => setVista(v)}
                className={cn('flex-1 rounded-md px-3 py-1.5 transition-colors',
                  vista === v ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
                {v === 'categoria' ? 'Por categoria' : 'Por empresa'}
              </button>
            ))}
          </div>
        )}

        {vista === 'empresa' && companies.length > 0 && (
          <AllocationView
            result={allocate(companies.map(c => c.id), connections, revenue.byCompanyCents)}
            companies={companies}
            revenue={revenue}
            hasUnassigned={connections.some(c => !c.companyId)}
          />
        )}

        {/* ── Lista por categoria ─────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Custos Cadastrados</CardTitle>
            <CardDescription>
              {costs.length} custo{costs.length !== 1 ? 's' : ''} em{' '}
              {activeCategoryNames.length} categoria{activeCategoryNames.length !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {costs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum custo cadastrado ainda.</p>
                <p className="text-sm">Clique em "Adicionar Custo" para começar.</p>
              </div>
            ) : (
              <Accordion type="multiple" className="w-full" defaultValue={activeCategoryNames}>
                {activeCategoryNames.map(categoryName => {
                  const categoryCosts = costsByCategory[categoryName] || [];
                  const categoryTotal = categoryCosts.reduce((sum, c) => sum + Number(c.amount), 0);
                  const isCustom = !defaultCategoryNames.includes(categoryName);

                  return (
                    <AccordionItem key={categoryName} value={categoryName}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center justify-between w-full pr-4">
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">
                              {getCategoryIcon(categoryName)}
                            </span>
                            <span>{categoryName}</span>
                            {isCustom && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-normal">
                                Personalizada
                              </Badge>
                            )}
                            <Badge variant="secondary" className="ml-1">
                              {categoryCosts.length}
                            </Badge>
                          </div>
                          <span className="font-semibold text-primary">
                            {formatCurrency(categoryTotal)}
                          </span>
                        </div>
                      </AccordionTrigger>

                      <AccordionContent>
                        <div className="space-y-2 pl-6">
                          {categoryCosts.map(cost => (
                            <div
                              key={cost.id}
                              className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-md"
                            >
                              <div>
                                <p className="flex items-center gap-1.5 font-medium text-sm">
                                  {cost.name}
                                  {cost.scope && cost.scope !== 'geral' && (
                                    <Badge variant="secondary" className="text-[10px] font-normal">
                                      {SCOPE_SHORT[cost.scope]}
                                      {cost.scope === 'plataforma' && cost.marketplace ? `: ${cost.marketplace}` : ''}
                                      {cost.scope === 'empresa' && cost.company_id
                                        ? `: ${companies.find(x => x.id === cost.company_id)?.name ?? ''}` : ''}
                                    </Badge>
                                  )}
                                  {cost.allocation_pct && (
                                    <Badge variant="outline" className="text-[10px] font-normal">
                                      rateio manual
                                    </Badge>
                                  )}
                                </p>
                                {cost.notes && (
                                  <p className="text-xs text-muted-foreground">{cost.notes}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="text-right">
                                  <p className="font-semibold">{formatCurrency(cost.amount)}</p>
                                  {cost.is_recurring && (
                                    <Badge variant="outline" className="text-xs">
                                      <RefreshCw className="h-3 w-3 mr-1" />
                                      Recorrente
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => openEditDialog(cost)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-destructive hover:text-destructive"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Excluir custo?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Tem certeza que deseja excluir "{cost.name}"? Esta ação não pode ser desfeita.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => deleteCost(cost.id)}>
                                          Excluir
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}

export default CadastroCustosContent;