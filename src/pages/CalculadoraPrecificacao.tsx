import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertTriangle, Calculator, ExternalLink, Info, Target, ShoppingBag, Lightbulb, Settings, TrendingUp, TrendingDown, Layers, CheckCircle2, XCircle, HelpCircle, Percent, AlertCircle, BarChart3, Package, Tag, DollarSign } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useFixedCosts } from "@/hooks/useFixedCosts";
import { parseNumericInputSafe, parsePercentageInput } from "@/lib/numeric-validation";
import { Progress } from "../components/ui/progress";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogOverlay, AlertDialogPortal, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useAnuncios, AnuncioInput } from "@/hooks/useProdutos";
import { parseCurrencyInput } from "@/lib/numeric-validation";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTrigger, DialogFooter, DialogTitle, DialogHeader, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2, Pencil, } from "lucide-react";
import { parse } from "path";
import { Select } from "@radix-ui/react-select";
import { SelectContent, SelectValue, SelectItem, SelectTrigger } from "@/components/ui/select";
import { ResultsCharts } from "@/components/charts/ResultsCharts";

const formatCurrency = (value: number): string => {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
};
const formatPercent = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

// Converte string com vírgula ou ponto para número
const parseInput = (val: string): number => {
  if (!val || val === '' || val === ',' || val === '.') return 0;
  const normalized = val.replace(',', '.');
  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? 0 : parsed;
};

// Constantes de absorção por tipo de produto
const ABSORCAO_PADRAO = {
  novo: 10,        // 10% do custo fixo
  complementar: 30, // 30% do custo fixo
  principal: 60    // 60% do custo fixo
} as const;

const EMPTY_PRODUTO = {
  nome_anuncio: '',
  custo: '',
  valor_venda: '',
  comissao_taxa: '',
  antecipado: '',
  afiliados: '',
  imposto_pct: '',
  custo_var: '',
  marketplace: '',
};
 
type ProdutoForm = typeof EMPTY_PRODUTO;
 
function parseField(val: string): number {
  const r = parseCurrencyInput(val);
  return r.isValid ? r.value : 0;
}

type PapelProduto = 'novo' | 'complementar' | 'principal' | 'avancado';

function CalculadoraPrecificacaoContent() {
  // Dados do Produto — estados como string para permitir vírgula durante digitação
  const [custoProduto, setCustoProduto] = useState<string>("");
  const [embalagemEtiqueta, setEmbalagemEtiqueta] = useState<string>("");

  // Preço do Anúncio
  const [precoPromocional, setPrecoPromocional] = useState<string>("");
  const [desconto, setDesconto] = useState<string>("");

  // Taxas e Comissões
  const [comissaoPlataforma, setComissaoPlataforma] = useState<string>("20");
  const [taxaFixa, setTaxaFixa] = useState<string>("4");
  const [aliquotaImposto, setAliquotaImposto] = useState<string>("6");
  const [comissaoAfiliados, setComissaoAfiliados] = useState<string>("0");

  // Meta
  const [margemDesejada, setMargemDesejada] = useState<number>(30);
  const [margemDeseja, setMargemDeseja] = useState<number>(30);

  // Papel do Produto na Operação
  const [papelProduto, setPapelProduto] = useState<PapelProduto>('novo');
  const [absorpcaoManual, setAbsorpcaoManual] = useState<number>(10);
  const [volumeEsperadoProduto, setVolumeEsperadoProduto] = useState<number>(50);
   
  const [faturamentoTotal, setFaturamentoTotal] = useState<string>("");

  // Use fixed costs from hook
  const {
    totalRecurringCosts,
    isLoading: isLoadingCosts,
    settings: fixedCostsSettings,
    costs,
    costPerOrder,
    updateSettings
  } = useFixedCosts();

  // Volume from fixed costs settings
  const volumeMensal = fixedCostsSettings?.monthly_products_sold || 100;

  const handleSettingsChange = (field: 'monthly_orders' | 'monthly_revenue', value: string) => {
    const numValue = parseNumericInputSafe(value, { min: 0, max: 9999999 });
    updateSettings({
      [field]: numValue
    });
  };

  // Handler para inputs decimais: aceita dígitos, vírgula e ponto
  const handleDecimalInput = (value: string, setter: (val: string) => void) => {
    // Permite string vazia, dígitos, uma vírgula ou um ponto decimal
    if (value === '' || /^[0-9]*[,.]?[0-9]*$/.test(value)) {
      setter(value);
    }
  };

  // Cálculo do percentual de absorção baseado no papel do produto
  const percentualAbsorcao = useMemo(() => {
    if (papelProduto === 'avancado') {
      return absorpcaoManual;
    }
    return ABSORCAO_PADRAO[papelProduto];
  }, [papelProduto, absorpcaoManual]);

  const results = useMemo(() => {
  // =========================
  // INPUTS
  // =========================
  const _custoProduto = parseInput(custoProduto);
  const _custoVariavel = parseInput(embalagemEtiqueta);
  const _precoPromocional = parseInput(precoPromocional);
  const _desconto = parseInput(desconto);
  const _comissaoPlataforma = parseInput(comissaoPlataforma);
  const _taxaFixa = parseInput(taxaFixa);
  const _aliquotaImposto = parseInput(aliquotaImposto);
  const _comissaoAfiliados = parseInput(comissaoAfiliados);

  const volume = volumeMensal > 0 ? volumeMensal : 1;
  const volumeProduto = volumeEsperadoProduto > 0 ? volumeEsperadoProduto : 1;

  // =========================
  // PREÇO
  // =========================
  const precoCheio = _desconto > 0
    ? _precoPromocional / (1 - _desconto / 100)
    : _precoPromocional;

  // =========================
  // CUSTOS VARIÁVEIS (BASE = PREÇO PROMOCIONAL)
  // =========================
  const comissao = _precoPromocional * (_comissaoPlataforma / 100);
  const imposto = _precoPromocional * (_aliquotaImposto / 100);
  const afiliados = _precoPromocional * (_comissaoAfiliados / 100);

  const totalCustosVariaveis =
    _custoProduto +
    _custoVariavel +
    comissao +
    _taxaFixa +
    imposto +
    afiliados;

  // =========================
  // LUCRO (IGUAL PLANILHA)
  // =========================
  const lucro = _precoPromocional - totalCustosVariaveis;

  const margemReal = _precoPromocional > 0
    ? (lucro / _precoPromocional) * 100
    : 0;

  const produtoViavel = lucro > 0;

  // =========================
  // MARGEM DE CONTRIBUIÇÃO
  // =========================
  const margemContribuicao = lucro;
  const margemContribuicaoPercent = margemReal;

  // =========================
  // CUSTO FIXO
  // =========================
  const custoFixoDiluido = totalRecurringCosts > 0
    ? totalRecurringCosts / volume
    : 0;

  const custoFixoAlocado = totalRecurringCosts * (percentualAbsorcao / 100);
  const custoFixoPorItem = custoFixoAlocado / volumeProduto;

  // =========================
  // LUCRO COM CUSTO FIXO
  // =========================
  const lucroLiquido = lucro - custoFixoPorItem;

  const margemRealAbsorcao = _precoPromocional > 0
    ? (lucroLiquido / _precoPromocional) * 100
    : 0;

  // =========================
  // CENÁRIO 100%
  // =========================
  const custoFixo100Percent = totalRecurringCosts / volumeProduto;

  const taxasPercentuais =
    (_comissaoPlataforma +
      _aliquotaImposto +
      _comissaoAfiliados +
      margemDesejada) / 100;

  const denominador = 1 - taxasPercentuais;

  const precoNecessario100Percent = denominador > 0
    ? (_custoProduto + _custoVariavel + _taxaFixa + custoFixo100Percent) / denominador
    : 0;

  // =========================
  // PREÇO IDEAL
  // =========================
  const precoIdeal = denominador > 0
    ? (_custoProduto + _custoVariavel + _taxaFixa) / denominador
    : 0;

  const margemInviavel = denominador <= 0;

  return {
    precoCheio,

    custosVariaveis: {
      produto: _custoProduto,
      variavel: _custoVariavel,
      comissao,
      imposto,
      afiliados,
      taxaFixa: _taxaFixa
    },

    totalCustosVariaveis,

    lucro,
    margemReal,
    produtoViavel,

    margemContribuicao,
    margemContribuicaoPercent,

    custoFixoDiluido,
    custoFixoAlocado,
    custoFixoPorItem,

    lucroLiquido,
    margemRealAbsorcao,

    custoFixo100Percent,
    precoNecessario100Percent,

    precoIdeal,
    margemInviavel
  };
}, [
  custoProduto,
  embalagemEtiqueta,
  precoPromocional,
  desconto,
  comissaoPlataforma,
  taxaFixa,
  aliquotaImposto,
  comissaoAfiliados,
  margemDesejada,
  totalRecurringCosts,
  volumeMensal,
  volumeEsperadoProduto,
  percentualAbsorcao
]);

  // Calculo do Break-even e Panaroma 
  const panorama = useMemo(() => {
    const fat = parseInput (faturamentoTotal);
    const margemPct = results.margemContribuicaoPercent;

    const breakEven = margemPct > 0 ? (totalRecurringCosts / margemPct) * 100 : 0;
    const margemGerada = fat * (margemPct / 100);
    const resultadoLiquido = margemGerada - totalRecurringCosts;
    const margemLiquidaPct = fat > 0 ? (resultadoLiquido / fat) * 100 : 0;
    const progressoBreakEven = breakEven > 0 ? Math.min((fat / breakEven) * 100, 100) : 0;
    const lucrativo = resultadoLiquido > 0;

    return { fat, breakEven, margemGerada, resultadoLiquido, margemLiquidaPct, progressoBreakEven, lucrativo, margemPct };
  }, [faturamentoTotal, results.margemContribuicaoPercent, totalRecurringCosts]);
 
const { anuncios, isLoading: isLoadingAnuncios, addAnuncio, updateAnuncio, deleteAnuncio } = useAnuncios();
 
  const [isProdutoOpen, setIsProdutoOpen] = useState(false);
  const [editingProdutoId, setEditingProdutoId] = useState<string | null>(null);
  const [produtoForm, setProdutoForm] = useState<ProdutoForm>(EMPTY_PRODUTO);
  
  // helper para atualizar um campo de form de produto
  const setProdutoField = (field: keyof ProdutoForm) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setProdutoForm(prev => ({ ...prev, [field]: e.target.value }));
 
  const resetProdutoForm = () => { setProdutoForm(EMPTY_PRODUTO); setEditingProdutoId(null); };
  

   // abre dialogo preenchido com os dados do produto
  const openEditProduto = (a: typeof anuncios[0]) => {
    setEditingProdutoId(a.id);
    setProdutoForm({
      nome_anuncio: a.nome_anuncio,
      custo: String(a.custo),
      valor_venda: String(a.valor_venda),
      comissao_taxa: String(a.comissao_taxa),
      antecipado: String(a.antecipado),
      afiliados: String(a.afiliados),
      imposto_pct: String(a.imposto_pct),
      custo_var: String(a.custo_var),
      marketplace: a.marketplace,
    });
    setIsProdutoOpen(true);
  };
 
  const handleProdutoSubmit = async () => {
    if (!produtoForm.nome_anuncio.trim()) { toast.error('Nome do anúncio é obrigatório'); return; }
    const payload: AnuncioInput = {
      nome_anuncio: produtoForm.nome_anuncio.trim(),
      custo: parseField(produtoForm.custo),
      valor_venda: parseField(produtoForm.valor_venda),
      comissao_taxa: parseField(produtoForm.comissao_taxa),
      antecipado: parseField(produtoForm.antecipado),
      afiliados: parseField(produtoForm.afiliados),
      imposto_pct: parseField(produtoForm.imposto_pct),
      custo_var: parseField(produtoForm.custo_var),
      marketplace: produtoForm.marketplace.trim(),
    };
    const success = editingProdutoId
      ? await updateAnuncio(editingProdutoId, payload)
      : await addAnuncio(payload);
    if (success) { setIsProdutoOpen(false); resetProdutoForm(); }
  };

  // Alertas de proteção automáticos
  const alertas = useMemo(() => {
    const lista: { tipo: 'critico' | 'alerta' | 'aviso' | 'info'; mensagem: string }[] = [];

    if (results.margemContribuicao <= 0 && results.precoCheio > 0) {
      lista.push({
        tipo: 'critico',
        mensagem: 'Produto INVIÁVEL: não cobre nem os custos variáveis! Revise o preço ou os custos.'
      });
    }
    if (papelProduto === 'novo' && percentualAbsorcao > 20) {
      lista.push({
        tipo: 'alerta',
        mensagem: 'Atenção: produto novo não deve absorver mais de 20% dos custos fixos. Considere reduzir.'
      });
    }
    if (results.custoFixoPorItem > results.precoCheio * 0.3 && results.precoCheio > 0) {
      lista.push({
        tipo: 'aviso',
        mensagem: 'O custo fixo alocado representa mais de 30% do preço de venda. Avalie o volume esperado.'
      });
    }
    if (results.lucroLiquido < 0 && results.margemContribuicao > 0 && results.precoCheio > 0) {
      lista.push({
        tipo: 'info',
        mensagem: 'O produto contribui para os custos fixos, mas não gera lucro líquido no cenário atual.'
      });
    }
    return lista;
  }, [results, papelProduto, percentualAbsorcao]);

  return <AppLayout>
    <TooltipProvider>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight flex items-center justify-center gap-2">
            <Calculator className="h-6 w-6 text-primary" />
            Calculadora de Precificação
          </h1>
          <p className="text-muted-foreground mt-1">
            Análise completa com Margem de Contribuição e Absorção de Custos Fixos
          </p>
        </div>

        {/* Fixed Costs Integration Banner */}
        {isLoadingCosts ? <Skeleton className="h-16 w-full" /> : costs.length > 0 ? <Card className="border-primary/20 bg-primary/5">
            <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 py-4">
              <div className="flex items-center gap-3">
                <Info className="h-5 w-5 text-primary flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">Custos fixos carregados automaticamente</p>
                  <p className="text-xs text-muted-foreground">
                    {costs.filter(c => c.is_recurring).length} custos recorrentes = {formatCurrency(totalRecurringCosts)}/mês
                  </p>
                </div>
              </div>
              <Link to="/precificacao/custos" className="text-sm text-primary hover:underline flex items-center gap-1">
                Gerenciar custos <ExternalLink className="h-3 w-3" />
              </Link>
            </CardContent>
          </Card> : <Card className="border-muted">
            <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 py-4">
              <div className="flex items-center gap-3">
                <Info className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Nenhum custo fixo cadastrado</p>
                  <p className="text-xs text-muted-foreground">
                    Cadastre seus custos fixos para análises mais completas
                  </p>
                </div>
              </div>
              <Link to="/precificacao/custos" className="text-sm text-primary hover:underline flex items-center gap-1">
                Cadastrar custos <ExternalLink className="h-3 w-3" />
              </Link>
            </CardContent>
          </Card>}

                  {/* ── SUBSTITUIÇÃO: Break-even + Panorama Atual ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
 
            {/* Break-even */}
            <Card className="border-primary/20">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Break-even (Ponto de Equilíbrio)</CardTitle>
                </div>
                <CardDescription>
                  Faturamento mínimo para cobrir os custos fixos com a margem de contribuição atual
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Valor destaque */}
                <div className="flex flex-col items-center justify-center py-4 bg-muted/30 rounded-lg">
                  <span className="text-3xl font-bold tracking-tight">
                    {formatCurrency(panorama.breakEven)}
                  </span>
                  <span className="text-sm text-muted-foreground mt-1">
                    Margem de contribuição real:{" "}
                    <span className="text-primary font-semibold">{formatPercent(panorama.margemPct)}</span>
                  </span>
                </div>
 
                {/* Faturamento atual (input) */}
                <div className="space-y-1.5">
                  <Label htmlFor="faturamentoTotal" className="text-sm font-medium">
                    Faturamento mensal atual (R$)
                  </Label>
                  <Input
                    id="faturamentoTotal"
                    type="text"
                    inputMode="decimal"
                    value={faturamentoTotal}
                    onChange={e => handleDecimalInput(e.target.value, setFaturamentoTotal)}
                    placeholder="0,00"
                    className="h-11"
                  />
                </div>
 
                {/* Aviso / confirmação */}
                <div className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
                  panorama.fat >= panorama.breakEven && panorama.fat > 0
                    ? "bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-300"
                    : "bg-muted/50 border border-border text-muted-foreground"
                }`}>
                  {panorama.fat >= panorama.breakEven && panorama.fat > 0 ? (
                    <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0 text-green-600" />
                  ) : (
                    <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  )}
                  <span>
                    {panorama.fat > 0
                      ? panorama.fat >= panorama.breakEven
                        ? `✅ Faturamento cobre o break-even.`
                        : `O cliente precisa faturar ${formatCurrency(panorama.breakEven)} por mês para cobrir os custos fixos`
                      : `Informe o faturamento para comparar com o break-even`
                    }
                  </span>
                </div>
 
                {/* Barra de progresso */}
                {panorama.fat > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Progresso até break-even</span>
                      <span>{panorama.progressoBreakEven.toFixed(0)}%</span>
                    </div>
                    <Progress
                      value={panorama.progressoBreakEven}
                      className="h-2"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
 
            {/* Panorama Atual */}
            <Card className="border-primary/20">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Panorama Atual</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
 
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Faturamento total:</span>
                  <span className="text-xl font-bold">{formatCurrency(panorama.fat)}</span>
                </div>
 
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Margem gerada ({formatPercent(panorama.margemPct)}):
                  </span>
                  <span className="text-lg font-semibold text-green-600">
                    {formatCurrency(panorama.margemGerada)}
                  </span>
                </div>
 
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Custos fixos:</span>
                  <span className="text-lg font-semibold">{formatCurrency(totalRecurringCosts)}</span>
                </div>
 
                <Separator />
 
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">Resultado líquido:</span>
                  <div className="flex items-end gap-2">
                    <span className={`text-2xl font-bold tracking-tight ${panorama.lucrativo ? "text-green-600" : "text-destructive"}`}>
                      {formatCurrency(panorama.resultadoLiquido)}
                    </span>
                    <span className="text-sm text-muted-foreground pb-0.5">
                      ({panorama.margemLiquidaPct.toFixed(2)}%)
                    </span>
                  </div>
                </div>
 
                {/* Barra de progresso do panorama */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>
                      Status:{" "}
                      <span className={panorama.lucrativo ? "text-green-600 font-medium" : "text-destructive font-medium"}>
                        {panorama.fat === 0 ? "—" : panorama.lucrativo ? "Operação lucrativa" : "Operação deficitária"}
                      </span>
                    </span>
                    <span>{panorama.progressoBreakEven.toFixed(0)}%</span>
                  </div>
                  <Progress value={panorama.progressoBreakEven} className="h-2" />
                </div>
 
                {/* Mensagem de status */}
                {panorama.fat > 0 && (
                  <div className={`p-3 rounded-lg text-xs ${
                    panorama.lucrativo
                      ? "bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-300"
                      : "bg-destructive/10 border border-destructive/20 text-destructive"
                  }`}>
                    {panorama.lucrativo
                      ? "Sua operação já cobre os custos fixos e está gerando lucro. Ganhos adicionais tendem a ampliar sua margem líquida."
                      : "A operação ainda não cobre os custos fixos. Aumente o faturamento ou reduza os custos."}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          {/* ── FIM DA SUBSTITUIÇÃO ── */}

        {/* Main Container - Dados do Produto */}
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
              {/* Linha 1 */}
              <div className="space-y-1.5">
                <Label htmlFor="custoProduto" className="text-sm font-medium">
                  Custo do Produto (R$)
                </Label>
                <Input
                  id="custoProduto"
                  type="text"
                  inputMode="decimal"
                  value={custoProduto}
                  onChange={e => handleDecimalInput(e.target.value, setCustoProduto)}
                  placeholder="0,00"
                  className="h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="comissaoPlataforma" className="text-sm font-medium">
                  Comissão Plataforma (%)
                </Label>
                <Input
                  id="comissaoPlataforma"
                  type="text"
                  inputMode="decimal"
                  value={comissaoPlataforma}
                  onChange={e => handleDecimalInput(e.target.value, setComissaoPlataforma)}
                  placeholder="20"
                  className="h-11"
                />
              </div>

              {/* Linha 2 */}
              <div className="space-y-1.5">
                <Label htmlFor="embalagemEtiqueta" className="text-sm font-medium">
                  Custo Variável (R$)
                </Label>
                <Input
                  id="embalagemEtiqueta"
                  type="text"
                  inputMode="decimal"
                  value={embalagemEtiqueta}
                  onChange={e => handleDecimalInput(e.target.value, setEmbalagemEtiqueta)}
                  placeholder="0,00"
                  className="h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="taxaFixa" className="text-sm font-medium">
                  Taxa Fixa por Venda (R$)
                </Label>
                <Input
                  id="taxaFixa"
                  type="text"
                  inputMode="decimal"
                  value={taxaFixa}
                  onChange={e => handleDecimalInput(e.target.value, setTaxaFixa)}
                  placeholder="4,00"
                  className="h-11"
                />
              </div>

              {/* Linha 3 */}
              <div className="space-y-1.5">
                <Label htmlFor="precoCheio" className="text-sm font-medium">
                  Preço Promocional  (R$)
                </Label>
                <Input
                  id="precoCheio"
                  type="text"
                  inputMode="decimal"
                  value={precoPromocional}
                  onChange={e => handleDecimalInput(e.target.value, setPrecoPromocional)}
                  placeholder="0,00"
                  className="h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="aliquotaImposto" className="text-sm font-medium">
                  Alíquota de Imposto (%)
                </Label>
                <Input
                  id="aliquotaImposto"
                  type="text"
                  inputMode="decimal"
                  value={aliquotaImposto}
                  onChange={e => handleDecimalInput(e.target.value, setAliquotaImposto)}
                  placeholder="6"
                  className="h-11"
                />
              </div>

              {/* Linha 4 */}
              <div className="space-y-1.5">
                <Label htmlFor="desconto" className="text-sm font-medium">
                  Desconto (%)
                </Label>
                <Input
                  id="desconto"
                  type="text"
                  inputMode="decimal"
                  value={desconto}
                  onChange={e => handleDecimalInput(e.target.value, setDesconto)}
                  placeholder="0"
                  className="h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="comissaoAfiliados" className="text-sm font-medium">
                  Comissão Afiliados (%)
                </Label>
                <Input
                  id="comissaoAfiliados"
                  type="text"
                  inputMode="decimal"
                  value={comissaoAfiliados}
                  onChange={e => handleDecimalInput(e.target.value, setComissaoAfiliados)}
                  placeholder="0"
                  className="h-11"
                />
              </div>

              {/* Linha 5 */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Preço Cheio</Label>
                <div className="h-11 flex items-center justify-center px-3 bg-primary/10 border border-primary/30 rounded-md">
                  <span className="text-lg font-semibold text-primary">
                    {formatCurrency(results.precoCheio)}
                  </span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Meta de Margem (%)</Label>
                <div className="flex items-center gap-2">
                  <span className='text-lg font-semibold text-primary'>
                  {formatPercent(results.margemReal)}
                  </span>
                </div>
              </div>

              {/* Linha 6 */}
              <div></div>
              <div className="space-y-1.5">
                {results.margemInviavel ? (
                  <div className="h-11 flex items-center justify-center px-3 bg-destructive/10 border border-destructive/30 rounded-md gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <span className="text-sm font-medium text-destructive">Margem inviável</span>
                  </div>
                ) : (
                  <div className="h-auto py-2.5 flex items-center justify-between px-3 bg-primary/10 border border-primary/30 rounded-md">
                    <div className="flex items-center gap-1.5">
                      <Lightbulb className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                      <span className="text-xs text-primary">
                        Para atingir <span className="font-semibold">{margemDesejada}%</span> de margem, o preço ideal é:
                      </span>
                    </div>
                    <span className="text-lg font-bold text-primary flex-shrink-0">
                      {formatCurrency(results.precoIdeal)}
                    </span>
                  </div>
                )}
              </div>
                            <Dialog open={isProdutoOpen} onOpenChange={open => { setIsProdutoOpen(open); if (!open) resetProdutoForm(); }}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <ShoppingBag className="h-4 w-4 mr-2" />
                  Cadastrar Anúncio
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>{editingProdutoId ? 'Editar Produto' : 'Cadastrar Produto'}</DialogTitle>
                  <DialogDescription>
                    {editingProdutoId ? 'Altere as informações do produto' : 'Preencha os dados do novo produto'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label htmlFor="nome_anuncio">Nome do Anúncio *</Label>
                    <Input
                      id="nome_anuncio"
                      value={produtoForm.nome_anuncio}
                      onChange={setProdutoField('nome_anuncio')}
                      placeholder="Ex: Macaquinho Floral"
                      maxLength={255}
                    />
                  </div>
                  <Separator />
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Valores (R$)</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Custo</Label>
                      <Input type="text" inputMode="decimal" value={produtoForm.custo} onChange={setProdutoField('custo')} placeholder="0,00" />
                    </div>
                    <div className="space-y-2">
                      <Label>Valor de Venda</Label>
                      <Input type="text" inputMode="decimal" value={produtoForm.valor_venda} onChange={setProdutoField('valor_venda')} placeholder="0,00" />
                    </div>
                    <div className="space-y-2">
                      <Label>Comissão e Taxa</Label>
                      <Input type="text" inputMode="decimal" value={produtoForm.comissao_taxa} onChange={setProdutoField('comissao_taxa')} placeholder="0,00" />
                    </div>
                    <div className="space-y-2">
                      <Label>Antecipado</Label>
                      <Input type="text" inputMode="decimal" value={produtoForm.antecipado} onChange={setProdutoField('antecipado')} placeholder="0,00" />
                    </div>
                    <div className="space-y-2">
                      <Label>Afiliados</Label>
                      <Input type="text" inputMode="decimal" value={produtoForm.afiliados} onChange={setProdutoField('afiliados')} placeholder="0,00" />
                    </div>
                    <div className="space-y-2">
                      <Label>Custo Variável</Label>
                      <Input type="text" inputMode="decimal" value={produtoForm.custo_var} onChange={setProdutoField('custo_var')} placeholder="0,00" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Marketplace</Label>
                    <Select onValueChange={value => setProdutoForm(prev => ({ ...prev, marketplace: value }))} defaultValue={produtoForm.marketplace}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione o marketplace" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Shopee">Shopee</SelectItem>
                        <SelectItem value="TiktokShop">TiktokShop</SelectItem>
                        
                      </SelectContent>
                    </Select>
                  </div>
                  <Separator />
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Percentual</p>
                  <div className="space-y-2">
                    <Label>Imposto (%)</Label>
                    <div className="relative">
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={produtoForm.imposto_pct}
                        onChange={setProdutoField('imposto_pct')}
                        placeholder="4,5"
                        className="pr-8"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => { setIsProdutoOpen(false); resetProdutoForm(); }}>Cancelar</Button>
                  <Button onClick={handleProdutoSubmit} disabled={!produtoForm.nome_anuncio.trim()}>
                    {editingProdutoId ? 'Salvar Alterações' : 'Cadastrar'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            </div>
          </CardContent>
        </Card>

        {/* Alertas de Proteção */}
        {alertas.length > 0 && <div className="space-y-3">
            {alertas.map((alerta, index) => <Alert key={index} variant={alerta.tipo === 'critico' ? 'destructive' : 'default'} className={alerta.tipo === 'alerta' ? 'border-yellow-500/50 bg-yellow-500/10' : alerta.tipo === 'aviso' ? 'border-orange-500/50 bg-orange-500/10' : alerta.tipo === 'info' ? 'border-blue-500/50 bg-blue-500/10' : ''}>
                {alerta.tipo === 'critico' ? <XCircle className="h-4 w-4" /> : alerta.tipo === 'alerta' ? <AlertTriangle className="h-4 w-4 text-yellow-600" /> : alerta.tipo === 'aviso' ? <AlertCircle className="h-4 w-4 text-orange-600" /> : <Lightbulb className="h-4 w-4 text-blue-600" />}
                <AlertDescription className={alerta.tipo === 'alerta' ? 'text-yellow-800 dark:text-yellow-200' : alerta.tipo === 'aviso' ? 'text-orange-800 dark:text-orange-200' : alerta.tipo === 'info' ? 'text-blue-800 dark:text-blue-200' : ''}>
                  {alerta.mensagem}
                </AlertDescription>
              </Alert>)}
          </div>}

        {/* TRÊS ANÁLISES SIMULTÂNEAS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* A) Análise de Viabilidade */}
          <Card className={`border-2 ${results.produtoViavel ? 'border-green-500/30 bg-green-500/5' : 'border-destructive/30 bg-destructive/5'}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                {results.produtoViavel ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <XCircle className="h-5 w-5 text-destructive" />}
                <CardTitle className="text-base">Análise de Viabilidade</CardTitle>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Margem de Contribuição = Preço - Custos Variáveis. É quanto sobra para cobrir os custos fixos da empresa.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <CardDescription className="text-xs">Sem considerar custos fixos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Custos Variáveis:</span>
                  <span className="font-medium">{formatCurrency(results.totalCustosVariaveis)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Preço de Venda:</span>
                  <span className="font-medium">{formatCurrency(results.precoCheio)}</span>
                </div>
              </div>
              <div className="border-t border-border pt-4">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">Margem de Contribuição</p>
                  <p className={`text-2xl font-bold ${results.produtoViavel ? 'text-green-600' : 'text-destructive'}`}>
                    {formatCurrency(results.margemContribuicao)}
                  </p>
                  <Badge variant={results.produtoViavel ? "default" : "destructive"} className={results.produtoViavel ? "bg-green-600 hover:bg-green-700 mt-1" : "mt-1"}>
                    {formatPercent(results.margemContribuicaoPercent)}
                  </Badge>
                </div>
              </div>
              <div className={`p-3 rounded-lg ${results.produtoViavel ? 'bg-green-500/10' : 'bg-destructive/10'}`}>
                <p className={`text-xs text-center ${results.produtoViavel ? 'text-green-700 dark:text-green-300' : 'text-destructive'}`}>
                  {results.produtoViavel ? "✅ Este produto ajuda a pagar os custos fixos da empresa." : "❌ Produto não cobre os custos variáveis. Inviável!"}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* B) Análise com Absorção Parcial */}
          <Card className="border-2 border-blue-500/30 bg-blue-500/5">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-base">Absorção Parcial</CardTitle>
                <Badge variant="outline" className="text-xs">{percentualAbsorcao}%</Badge>
              </div>
              <CardDescription className="text-xs">Cenário justo para este produto</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Custo Fixo Alocado:</span>
                  <span className="font-medium">{formatCurrency(results.custoFixoPorItem)}/item</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>({formatCurrency(totalRecurringCosts)} × {percentualAbsorcao}% ÷ {volumeEsperadoProduto})</span>
                </div>
              </div>
              <div className="border-t border-border pt-4">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">Lucro Líquido</p>
                  <p className={`text-2xl font-bold ${results.lucroLiquido >= 0 ? 'text-blue-600' : 'text-destructive'}`}>
                    {formatCurrency(results.lucroLiquido)}
                  </p>
                  <Badge variant={results.lucroLiquido >= 0 ? "default" : "destructive"} className={results.lucroLiquido >= 0 ? "bg-blue-600 hover:bg-blue-700 mt-1" : "mt-1"}>
                    Margem: {formatPercent(results.margemRealAbsorcao)}
                  </Badge>
                </div>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <p className="text-xs text-center text-blue-700 dark:text-blue-300">
                  💡 Cenário realista para produto {papelProduto === 'novo' ? 'novo/teste' : papelProduto === 'complementar' ? 'complementar' : 'principal'}.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* C) Análise de Portfólio Maduro */}
          <Card className="border-2 border-muted bg-muted/30">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-base">Portfólio Maduro</CardTitle>
                <Badge variant="outline" className="text-xs">100%</Badge>
              </div>
              <CardDescription className="text-xs">Se fosse o único produto</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Custo Fixo Total/Item:</span>
                  <span className="font-medium">{formatCurrency(results.custoFixo100Percent)}</span>
                </div>
              </div>
              <div className="border-t border-border pt-4">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">Preço Necessário</p>
                  <p className="text-2xl font-bold text-muted-foreground">
                    {results.margemInviavel ? 'Inviável' : formatCurrency(results.precoNecessario100Percent)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Para {formatPercent(margemDesejada)} de margem</p>
                </div>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-center text-muted-foreground">
                  ⚠️ Válido apenas se o produto representar toda a operação.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Dica Educacional */}
        <div className="flex items-start gap-3 p-4 bg-primary/5 border border-primary/20 rounded-lg">
          <Lightbulb className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium mb-1">Entendendo os custos fixos:</p>
            <p className="text-muted-foreground">
              Custos fixos pertencem à empresa, não a um produto isolado. Produtos novos não devem carregar 100% da estrutura —
              o lucro começa após cobrir os custos variáveis. A <strong>Margem de Contribuição</strong> mostra quanto cada venda
              ajuda a pagar os custos fixos do portfólio.
            </p>
          </div>
        </div>

        {/* Resultados Detalhados - Custos Variáveis */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold text-center mb-6">Detalhamento dos Custos Variáveis</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
              <span className="text-sm font-medium">Custo do Produto</span>
              <span className="text-lg font-semibold">{formatCurrency(results.custosVariaveis.produto)}</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
              <span className="text-sm font-medium">Custos Variáveis</span>
              <span className="text-lg font-semibold">{formatCurrency(results.custosVariaveis.variavel)}</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
              <span className="text-sm font-medium">Comissão Plataforma ({parseInput(comissaoPlataforma)}%)</span>
              <span className="text-lg font-semibold text-destructive">- {formatCurrency(results.custosVariaveis.comissao)}</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
              <span className="text-sm font-medium">Taxa Fixa por Venda</span>
              <span className="text-lg font-semibold text-destructive">- {formatCurrency(results.custosVariaveis.taxaFixa)}</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
              <span className="text-sm font-medium">Impostos ({parseInput(aliquotaImposto)}%)</span>
              <span className="text-lg font-semibold text-destructive">- {formatCurrency(results.custosVariaveis.imposto)}</span>
            </div>
            {parseInput(comissaoAfiliados) > 0 && <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <span className="text-sm font-medium">Comissão Afiliados ({parseInput(comissaoAfiliados)}%)</span>
                <span className="text-lg font-semibold text-destructive">- {formatCurrency(results.custosVariaveis.comissao)}</span>
              </div>}
            <div className="flex items-center justify-between p-4 bg-primary/10 rounded-lg md:col-span-2">
              <span className="text-sm font-bold">Total Custos Variáveis</span>
              <span className="text-xl font-bold text-primary">{formatCurrency(results.totalCustosVariaveis)}</span>
            </div>
          </div>
        </div>
      </div>
      <br />
      <div>
              
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">Anúncios Cadastrados</CardTitle>
                        <CardDescription>
                          {anuncios.length} anúncio{anuncios.length !== 1 ? 's' : ''} cadastrado{anuncios.length !== 1 ? 's' : ''}
                        </CardDescription>
                      </div>
                      <ShoppingBag className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    {isLoadingAnuncios ? (
                      <div className="space-y-2">
                        {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                      </div>
                    ) : anuncios.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <ShoppingBag className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Nenhum anúncio cadastrado ainda.</p>
                        <p className="text-sm">Clique em "Cadastrar Anúncio" para começar.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">

                          {/* Cabeçalho — sem fundo, só texto muted, igual ao padrão da page */}
                          <thead>
                            <tr className="border-b border-border">
                              <th className="text-left  pb-2 px-2 font-medium text-muted-foreground whitespace-nowrap">Nome</th>
                              <th className="text-left   pb-3 px-3 font-medium text-muted-foreground whitespace-nowrap">Marketplace</th>
                              <th className="text-right  pb-3 px-3 font-medium text-muted-foreground whitespace-nowrap">Custo</th>
                              <th className="text-right  pb-3 px-3 font-medium text-muted-foreground whitespace-nowrap">Venda</th>
                              <th className="text-right  pb-3 px-3 font-medium text-muted-foreground whitespace-nowrap">Comissão/Taxa</th>
                              <th className="text-right  pb-3 px-3 font-medium text-muted-foreground whitespace-nowrap">Antecipado</th>
                              <th className="text-right  pb-3 px-3 font-medium text-muted-foreground whitespace-nowrap">Afiliados</th>
                              <th className="text-right  pb-3 px-3 font-medium text-muted-foreground whitespace-nowrap">Imposto</th>
                              <th className="text-right  pb-3 px-3 font-medium text-muted-foreground whitespace-nowrap">Custo Var.</th>
                              <th className="text-right  pb-3 px-3 font-medium text-muted-foreground whitespace-nowrap">Lucro</th>
                              <th className="pb-3 px-3" />
                            </tr>
                          </thead>

                          
                          <tbody>
                            {anuncios.map(a => {
                              const lucro = a.valor_venda - a.custo - a.custo_var - a.comissao_taxa - a.antecipado - a.afiliados;
                              return (
                                <tr key={a.id}>
                                  <td className="pt-2" colSpan={11}>
                                    <div className="flex items-center bg-muted/50 rounded-md px-3 py-2.5 gap-0">
                                      {/* Nome */}
                                      <span className="flex-[2] font-medium whitespace-nowrap">{a.nome_anuncio}</span>

                                      {/* Marketplace */}
                                      <span className="flex-[1.5] whitespace-nowrap">
                                        {a.marketplace
                                           ? <Badge variant="outline" className="font-normal">{a.marketplace}</Badge>
                                           : <span className="text-muted-foreground">—</span>}
                                      </span>

                                      {/* Custo */}
                                      <span className="flex-1 text-right tabular-nums whitespace-nowrap">{formatCurrency(a.custo)}</span>

                                      {/* Venda */}
                                      <span className="flex-1 text-right tabular-nums whitespace-nowrap">{formatCurrency(a.valor_venda)}</span>

                                      {/* Comissão/Taxa */}
                                      <span className="flex-1 text-right tabular-nums whitespace-nowrap">{formatCurrency(a.comissao_taxa)}</span>

                                      {/* Antecipado */}
                                      <span className="flex-1 text-right tabular-nums whitespace-nowrap">{formatCurrency(a.antecipado)}</span>

                                      {/* Afiliados */}
                                      <span className="flex-1 text-right tabular-nums whitespace-nowrap">{formatCurrency(a.afiliados)}</span>

                                      {/* Imposto */}
                                      <span className="flex-1 text-right whitespace-nowrap">
                                        <Badge variant="secondary" className="font-normal tabular-nums">{a.imposto_pct}%</Badge>
                                      </span>

                                      {/* Custo Var. */}
                                      <span className="flex-1 text-right tabular-nums whitespace-nowrap">{formatCurrency(a.custo_var)}</span>

                                      {/* Lucro */}
                                      <span className={`flex-1 text-right font-semibold tabular-nums whitespace-nowrap ${lucro >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                                        {formatCurrency(lucro)}
                                      </span>

                                      {/* Ações */}
                                      <span className="flex items-center justify-end gap-1 pl-2">
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditProduto(a)}>
                                          <Pencil className="h-4 w-4" />
                                        </Button>
                                        <AlertDialog>
                                          <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                                              <Trash2 className="h-4 w-4" />
                                            </Button>
                                          </AlertDialogTrigger>
                                          <AlertDialogContent>
                                            <AlertDialogHeader>
                                              <AlertDialogTitle>Excluir anúncio?</AlertDialogTitle>
                                              <AlertDialogDescription>
                                                Tem certeza que deseja excluir "{a.nome_anuncio}"? Esta ação não pode ser desfeita.
                                              </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                              <AlertDialogAction onClick={() => deleteAnuncio(a.id)}>Excluir</AlertDialogAction>
                                            </AlertDialogFooter>
                                          </AlertDialogContent>
                                        </AlertDialog>
                                      </span>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
      </div>
    </TooltipProvider>
  </AppLayout>;
}

export default function CalculadoraPrecificacao() {
  return (
    <ProtectedRoute>
      <CalculadoraPrecificacaoContent />
    </ProtectedRoute>
  );
}