import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertTriangle, Calculator, ExternalLink, Info, Target,
  Lightbulb, TrendingUp, CheckCircle2, XCircle,
  HelpCircle, AlertCircle, BarChart3, DollarSign, Tag,
  Percent, Package,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useFixedCosts } from "@/hooks/useFixedCosts";
import { Progress } from "../components/ui/progress";

// ─── Helpers ────────────────────────────────────────────────────────────────
const formatCurrency = (value: number): string =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatPercent = (value: number): string => `${value.toFixed(1)}%`;

const parseInput = (val: string): number => {
  if (!val || val === "" || val === "," || val === ".") return 0;
  const normalized = val.replace(",", ".");
  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? 0 : parsed;
};

// ─── Plataforma selector ─────────────────────────────────────────────────────
type Plataforma = "Shopee" | "TiktokShop" | "";

const PLATAFORMA_OPTIONS: { value: Plataforma; label: string; color: string; bg: string }[] = [
  { value: "Shopee",     label: "Shopee",      color: "text-orange-600", bg: "bg-orange-500/10 border-orange-500/30 hover:bg-orange-500/20" },
  { value: "TiktokShop", label: "TikTok Shop", color: "text-pink-600",   bg: "bg-pink-500/10 border-pink-500/30 hover:bg-pink-500/20" },
];

// ─── Absorção ────────────────────────────────────────────────────────────────
const ABSORCAO_PADRAO = { novo: 10, complementar: 30, principal: 60 } as const;
type PapelProduto = "novo" | "complementar" | "principal" | "avancado";

// ════════════════════════════════════════════════════════════════════════════
function CalculadoraPrecificacaoContent() {
  const [custoProduto,      setCustoProduto]      = useState("");
  const [embalagemEtiqueta, setEmbalagemEtiqueta] = useState("");
  const [precoPromocional,  setPrecoPromocional]  = useState("");
  const [desconto,          setDesconto]          = useState("");
  const [comissaoPlataforma,setComissaoPlataforma]= useState("20");
  const [taxaFixa,          setTaxaFixa]          = useState("4");
  const [aliquotaImposto,   setAliquotaImposto]   = useState("6");
  const [comissaoAfiliados, setComissaoAfiliados] = useState("0");
  const [margemDesejada,    setMargemDesejada]    = useState<number>(30);
  const [papelProduto,      setPapelProduto]      = useState<PapelProduto>("novo");
  const [absorpcaoManual,   setAbsorpcaoManual]   = useState<number>(10);
  const [volumeEsperadoProduto, setVolumeEsperadoProduto] = useState<number>(50);
  const [faturamentoTotal,  setFaturamentoTotal]  = useState("");
  const [plataformaSelecionada, setPlataformaSelecionada] = useState<Plataforma | "">("");

  const { totalRecurringCosts, isLoading: isLoadingCosts, settings: fixedCostsSettings, costs } = useFixedCosts();
  const volumeMensal = fixedCostsSettings?.monthly_products_sold || 100;

  const handleDecimalInput = (value: string, setter: (v: string) => void) => {
    if (value === "" || /^[0-9]*[,.]?[0-9]*$/.test(value)) setter(value);
  };

  const percentualAbsorcao = useMemo(() =>
    papelProduto === "avancado" ? absorpcaoManual : ABSORCAO_PADRAO[papelProduto],
  [papelProduto, absorpcaoManual]);

  const results = useMemo(() => {
    const _custo       = parseInput(custoProduto);
    const _custoVar    = parseInput(embalagemEtiqueta);
    const _preco       = parseInput(precoPromocional);
    const _desc        = parseInput(desconto);
    const _comissao    = parseInput(comissaoPlataforma);
    const _taxaFixa    = parseInput(taxaFixa);
    const _imposto     = parseInput(aliquotaImposto);
    const _afiliados   = parseInput(comissaoAfiliados);

    const volume = volumeMensal > 0 ? volumeMensal : 1;
    const volumeProd = volumeEsperadoProduto > 0 ? volumeEsperadoProduto : 1;

    const precoCheio = _desc > 0 ? _preco / (1 - _desc / 100) : _preco;

    const comissaoVal = _preco * (_comissao / 100);
    const impostoVal  = _preco * (_imposto / 100);
    const afiliadosVal= _preco * (_afiliados / 100);

    const totalCustosVar = _custo + _custoVar + comissaoVal + _taxaFixa + impostoVal + afiliadosVal;
    const lucro = _preco - totalCustosVar;
    const margemReal = _preco > 0 ? (lucro / _preco) * 100 : 0;

    const custoFixoAlocado = totalRecurringCosts * (percentualAbsorcao / 100);
    const custoFixoPorItem = custoFixoAlocado / volumeProd;
    const lucroLiquido     = lucro - custoFixoPorItem;
    const margemAbsorcao   = _preco > 0 ? (lucroLiquido / _preco) * 100 : 0;
    const custoFixo100     = totalRecurringCosts / volumeProd;

    const taxasPct = (_comissao + _imposto + _afiliados + margemDesejada) / 100;
    const denom    = 1 - taxasPct;
    const precoIdeal            = denom > 0 ? (_custo + _custoVar + _taxaFixa) / denom : 0;
    const precoNecessario100    = denom > 0 ? (_custo + _custoVar + _taxaFixa + custoFixo100) / denom : 0;

    return {
      precoCheio, totalCustosVar, lucro, margemReal, produtoViavel: lucro > 0,
      margemContribuicao: lucro, margemContribuicaoPercent: margemReal,
      custoFixoDiluido: totalRecurringCosts > 0 ? totalRecurringCosts / volume : 0,
      custoFixoAlocado, custoFixoPorItem, lucroLiquido, margemRealAbsorcao: margemAbsorcao,
      custoFixo100Percent: custoFixo100, precoNecessario100Percent: precoNecessario100,
      precoIdeal, margemInviavel: denom <= 0,
      custosVariaveis: { produto: _custo, variavel: _custoVar, comissao: comissaoVal, imposto: impostoVal, afiliados: afiliadosVal, taxaFixa: _taxaFixa },
    };
  }, [custoProduto, embalagemEtiqueta, precoPromocional, desconto, comissaoPlataforma, taxaFixa, aliquotaImposto, comissaoAfiliados, margemDesejada, totalRecurringCosts, volumeMensal, volumeEsperadoProduto, percentualAbsorcao]);

  const panorama = useMemo(() => {
    const fat = parseInput(faturamentoTotal);
    const margemPct = results.margemContribuicaoPercent;
    const breakEven = margemPct > 0 ? (totalRecurringCosts / margemPct) * 100 : 0;
    const margemGerada = fat * (margemPct / 100);
    const resultadoLiquido = margemGerada - totalRecurringCosts;
    const margemLiquidaPct = fat > 0 ? (resultadoLiquido / fat) * 100 : 0;
    const progressoBreakEven = breakEven > 0 ? Math.min((fat / breakEven) * 100, 100) : 0;
    return { fat, breakEven, margemGerada, resultadoLiquido, margemLiquidaPct, progressoBreakEven, lucrativo: resultadoLiquido > 0, margemPct };
  }, [faturamentoTotal, results.margemContribuicaoPercent, totalRecurringCosts]);

  const alertas = useMemo(() => {
    const lista: { tipo: "critico" | "alerta" | "aviso" | "info"; mensagem: string }[] = [];
    if (results.margemContribuicao <= 0 && results.precoCheio > 0)
      lista.push({ tipo: "critico", mensagem: "Produto INVIÁVEL: não cobre nem os custos variáveis! Revise o preço ou os custos." });
    if (papelProduto === "novo" && percentualAbsorcao > 20)
      lista.push({ tipo: "alerta", mensagem: "Atenção: produto novo não deve absorver mais de 20% dos custos fixos." });
    if (results.custoFixoPorItem > results.precoCheio * 0.3 && results.precoCheio > 0)
      lista.push({ tipo: "aviso", mensagem: "O custo fixo alocado representa mais de 30% do preço de venda. Avalie o volume esperado." });
    if (results.lucroLiquido < 0 && results.margemContribuicao > 0 && results.precoCheio > 0)
      lista.push({ tipo: "info", mensagem: "O produto contribui para os custos fixos, mas não gera lucro líquido no cenário atual." });
    return lista;
  }, [results, papelProduto, percentualAbsorcao]);

  return (
    <AppLayout>
      <TooltipProvider>
        <div className="max-w-5xl mx-auto space-y-6">

          {/* ── Header ─────────────────────────────────────────────────── */}
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight flex items-center justify-center gap-2">
              <Calculator className="h-6 w-6 text-primary" />
              Calculadora de Precificação
            </h1>
            <p className="text-muted-foreground mt-1">
              Análise completa com Margem de Contribuição e Absorção de Custos Fixos
            </p>
          </div>

          {/* ── Banner custos fixos ─────────────────────────────────────── */}
          {isLoadingCosts ? (
            <Skeleton className="h-16 w-full" />
          ) : costs.length > 0 ? (
            <Card className="border-primary/20 bg-primary/5">
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
            </Card>
          ) : (
            <Card className="border-muted">
              <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 py-4">
                <div className="flex items-center gap-3">
                  <Info className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Nenhum custo fixo cadastrado</p>
                    <p className="text-xs text-muted-foreground">Cadastre seus custos fixos para análises mais completas</p>
                  </div>
                </div>
                <Link to="/precificacao/custos" className="text-sm text-primary hover:underline flex items-center gap-1">
                  Cadastrar custos <ExternalLink className="h-3 w-3" />
                </Link>
              </CardContent>
            </Card>
          )}

          {/* ── Break-even + Panorama ───────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="border-primary/20">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Break-even</CardTitle>
                </div>
                <CardDescription>Faturamento mínimo para cobrir os custos fixos</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col items-center justify-center py-4 bg-muted/30 rounded-lg">
                  <span className="text-3xl font-bold tracking-tight">{formatCurrency(panorama.breakEven)}</span>
                  <span className="text-sm text-muted-foreground mt-1">
                    Margem de contribuição real:{" "}
                    <span className="text-primary font-semibold">{formatPercent(panorama.margemPct)}</span>
                  </span>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="faturamentoTotal" className="text-sm font-medium">Faturamento mensal atual (R$)</Label>
                  <Input id="faturamentoTotal" type="text" inputMode="decimal" value={faturamentoTotal}
                    onChange={e => handleDecimalInput(e.target.value, setFaturamentoTotal)} placeholder="0,00" className="h-11" />
                </div>
                <div className={`flex items-start gap-2 p-3 rounded-lg text-sm ${panorama.fat >= panorama.breakEven && panorama.fat > 0
                  ? "bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-300"
                  : "bg-muted/50 border border-border text-muted-foreground"}`}>
                  {panorama.fat >= panorama.breakEven && panorama.fat > 0
                    ? <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0 text-green-600" />
                    : <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />}
                  <span>
                    {panorama.fat > 0
                      ? panorama.fat >= panorama.breakEven
                        ? "✅ Faturamento cobre o break-even."
                        : `Precisa faturar ${formatCurrency(panorama.breakEven)} para cobrir os custos fixos`
                      : "Informe o faturamento para comparar com o break-even"}
                  </span>
                </div>
                {panorama.fat > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Progresso até break-even</span>
                      <span>{panorama.progressoBreakEven.toFixed(0)}%</span>
                    </div>
                    <Progress value={panorama.progressoBreakEven} className="h-2" />
                  </div>
                )}
              </CardContent>
            </Card>

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
                  <span className="text-sm text-muted-foreground">Margem gerada ({formatPercent(panorama.margemPct)}):</span>
                  <span className="text-lg font-semibold text-green-600">{formatCurrency(panorama.margemGerada)}</span>
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
                    <span className="text-sm text-muted-foreground pb-0.5">({panorama.margemLiquidaPct.toFixed(2)}%)</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Status:{" "}
                      <span className={panorama.lucrativo ? "text-green-600 font-medium" : "text-destructive font-medium"}>
                        {panorama.fat === 0 ? "—" : panorama.lucrativo ? "Operação lucrativa" : "Operação deficitária"}
                      </span>
                    </span>
                    <span>{panorama.progressoBreakEven.toFixed(0)}%</span>
                  </div>
                  <Progress value={panorama.progressoBreakEven} className="h-2" />
                </div>
                {panorama.fat > 0 && (
                  <div className={`p-3 rounded-lg text-xs ${panorama.lucrativo
                    ? "bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-300"
                    : "bg-destructive/10 border border-destructive/20 text-destructive"}`}>
                    {panorama.lucrativo
                      ? "Sua operação cobre os custos fixos e está gerando lucro."
                      : "A operação ainda não cobre os custos fixos. Aumente o faturamento ou reduza os custos."}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── Card Principal ──────────────────────────────────────────── */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Calculator className="h-4 w-4 text-primary" />
                Dados do Produto
              </CardTitle>
              <CardDescription>Preencha os valores para calcular a viabilidade e precificação</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">

              {/* Plataforma */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                  Plataforma de Venda
                </Label>
                <div className="flex gap-3">
                  {PLATAFORMA_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setPlataformaSelecionada(plataformaSelecionada === opt.value ? "" : opt.value)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                        plataformaSelecionada === opt.value
                          ? `${opt.bg} ${opt.color} ring-1 ring-current`
                          : "border-border bg-background text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {opt.label}
                      {plataformaSelecionada === opt.value && <CheckCircle2 className="h-3.5 w-3.5" />}
                    </button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Custos */}
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5" /> Custos do Produto
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="custoProduto" className="text-sm">Custo do Produto (R$)</Label>
                    <Input id="custoProduto" type="text" inputMode="decimal" value={custoProduto}
                      onChange={e => handleDecimalInput(e.target.value, setCustoProduto)} placeholder="0,00" className="h-10" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="embalagemEtiqueta" className="text-sm">Custo Variável — Embalagem/Etiqueta (R$)</Label>
                    <Input id="embalagemEtiqueta" type="text" inputMode="decimal" value={embalagemEtiqueta}
                      onChange={e => handleDecimalInput(e.target.value, setEmbalagemEtiqueta)} placeholder="0,00" className="h-10" />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Preço */}
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5" /> Preço de Venda
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="precoPromocional" className="text-sm">Preço Promocional (R$)</Label>
                    <Input id="precoPromocional" type="text" inputMode="decimal" value={precoPromocional}
                      onChange={e => handleDecimalInput(e.target.value, setPrecoPromocional)} placeholder="0,00" className="h-10" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="desconto" className="text-sm">Desconto (%)</Label>
                    <Input id="desconto" type="text" inputMode="decimal" value={desconto}
                      onChange={e => handleDecimalInput(e.target.value, setDesconto)} placeholder="0" className="h-10" />
                  </div>
                </div>
                <div className="flex items-center justify-between px-4 py-3 bg-primary/5 border border-primary/20 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Tag className="h-3.5 w-3.5" />
                    Preço Cheio (calculado)
                  </div>
                  <span className="text-lg font-bold text-primary">{formatCurrency(results.precoCheio)}</span>
                </div>
              </div>

              <Separator />

              {/* Taxas */}
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Percent className="h-3.5 w-3.5" /> Taxas e Comissões
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="comissaoPlataforma" className="text-sm">Comissão Plataforma (%)</Label>
                    <Input id="comissaoPlataforma" type="text" inputMode="decimal" value={comissaoPlataforma}
                      onChange={e => handleDecimalInput(e.target.value, setComissaoPlataforma)} placeholder="20" className="h-10" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="taxaFixa" className="text-sm">Taxa Fixa por Venda (R$)</Label>
                    <Input id="taxaFixa" type="text" inputMode="decimal" value={taxaFixa}
                      onChange={e => handleDecimalInput(e.target.value, setTaxaFixa)} placeholder="4,00" className="h-10" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="aliquotaImposto" className="text-sm">Imposto (%)</Label>
                    <Input id="aliquotaImposto" type="text" inputMode="decimal" value={aliquotaImposto}
                      onChange={e => handleDecimalInput(e.target.value, setAliquotaImposto)} placeholder="6" className="h-10" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="comissaoAfiliados" className="text-sm">Afiliados (%)</Label>
                    <Input id="comissaoAfiliados" type="text" inputMode="decimal" value={comissaoAfiliados}
                      onChange={e => handleDecimalInput(e.target.value, setComissaoAfiliados)} placeholder="0" className="h-10" />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Resultado */}
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/50 rounded-lg border">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Margem Real</p>
                    <p className={`text-base font-bold leading-tight ${results.margemReal >= 0 ? "text-primary" : "text-destructive"}`}>
                      {formatPercent(results.margemReal)}
                    </p>
                  </div>
                </div>
                {!results.margemInviavel ? (
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-primary/5 border border-primary/20 rounded-lg">
                    <Lightbulb className="h-4 w-4 text-primary flex-shrink-0" />
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                        Preço ideal para {margemDesejada}% margem
                      </p>
                      <p className="text-base font-bold text-primary leading-tight">{formatCurrency(results.precoIdeal)}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-destructive/10 border border-destructive/30 rounded-lg">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <span className="text-sm font-medium text-destructive">Margem inviável</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ── Alertas ────────────────────────────────────────────────── */}
          {alertas.length > 0 && (
            <div className="space-y-3">
              {alertas.map((alerta, index) => (
                <Alert key={index}
                  variant={alerta.tipo === "critico" ? "destructive" : "default"}
                  className={
                    alerta.tipo === "alerta" ? "border-yellow-500/50 bg-yellow-500/10" :
                    alerta.tipo === "aviso"  ? "border-orange-500/50 bg-orange-500/10" :
                    alerta.tipo === "info"   ? "border-blue-500/50 bg-blue-500/10" : ""
                  }>
                  {alerta.tipo === "critico"  ? <XCircle className="h-4 w-4" /> :
                   alerta.tipo === "alerta"   ? <AlertTriangle className="h-4 w-4 text-yellow-600" /> :
                   alerta.tipo === "aviso"    ? <AlertCircle className="h-4 w-4 text-orange-600" /> :
                   <Lightbulb className="h-4 w-4 text-blue-600" />}
                  <AlertDescription className={
                    alerta.tipo === "alerta" ? "text-yellow-800 dark:text-yellow-200" :
                    alerta.tipo === "aviso"  ? "text-orange-800 dark:text-orange-200" :
                    alerta.tipo === "info"   ? "text-blue-800 dark:text-blue-200" : ""
                  }>
                    {alerta.mensagem}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          )}

          {/* ── Três análises ──────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className={`border-2 ${results.produtoViavel ? "border-green-500/30 bg-green-500/5" : "border-destructive/30 bg-destructive/5"}`}>
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
                    <span className="font-medium">{formatCurrency(results.totalCustosVar)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Preço de Venda:</span>
                    <span className="font-medium">{formatCurrency(results.precoCheio)}</span>
                  </div>
                </div>
                <div className="border-t pt-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Margem de Contribuição</p>
                  <p className={`text-2xl font-bold ${results.produtoViavel ? "text-green-600" : "text-destructive"}`}>
                    {formatCurrency(results.margemContribuicao)}
                  </p>
                  <Badge variant={results.produtoViavel ? "default" : "destructive"} className={results.produtoViavel ? "bg-green-600 hover:bg-green-700 mt-1" : "mt-1"}>
                    {formatPercent(results.margemContribuicaoPercent)}
                  </Badge>
                </div>
                <div className={`p-3 rounded-lg ${results.produtoViavel ? "bg-green-500/10" : "bg-destructive/10"}`}>
                  <p className={`text-xs text-center ${results.produtoViavel ? "text-green-700 dark:text-green-300" : "text-destructive"}`}>
                    {results.produtoViavel ? "✅ Este produto ajuda a pagar os custos fixos da empresa." : "❌ Produto não cobre os custos variáveis. Inviável!"}
                  </p>
                </div>
              </CardContent>
            </Card>

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
                <div className="border-t pt-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Lucro Líquido</p>
                  <p className={`text-2xl font-bold ${results.lucroLiquido >= 0 ? "text-blue-600" : "text-destructive"}`}>
                    {formatCurrency(results.lucroLiquido)}
                  </p>
                  <Badge variant={results.lucroLiquido >= 0 ? "default" : "destructive"} className={results.lucroLiquido >= 0 ? "bg-blue-600 hover:bg-blue-700 mt-1" : "mt-1"}>
                    Margem: {formatPercent(results.margemRealAbsorcao)}
                  </Badge>
                </div>
                <div className="p-3 bg-blue-500/10 rounded-lg">
                  <p className="text-xs text-center text-blue-700 dark:text-blue-300">
                    💡 Cenário realista para produto {papelProduto === "novo" ? "novo/teste" : papelProduto === "complementar" ? "complementar" : "principal"}.
                  </p>
                </div>
              </CardContent>
            </Card>

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
                <div className="border-t pt-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Preço Necessário</p>
                  <p className="text-2xl font-bold text-muted-foreground">
                    {results.margemInviavel ? "Inviável" : formatCurrency(results.precoNecessario100Percent)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Para {formatPercent(margemDesejada)} de margem</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-center text-muted-foreground">⚠️ Válido apenas se o produto representar toda a operação.</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Dica educacional ───────────────────────────────────────── */}
          <div className="flex items-start gap-3 p-4 bg-primary/5 border border-primary/20 rounded-lg">
            <Lightbulb className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium mb-1">Entendendo os custos fixos:</p>
              <p className="text-muted-foreground">
                Custos fixos pertencem à empresa, não a um produto isolado. A <strong>Margem de Contribuição</strong> mostra
                quanto cada venda ajuda a pagar os custos fixos do portfólio.
              </p>
            </div>
          </div>

          {/* ── Detalhamento custos variáveis ──────────────────────────── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Detalhamento dos Custos Variáveis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { label: "Custo do Produto",                                        value: results.custosVariaveis.produto,  negative: false },
                  { label: "Custos Variáveis (embalagem etc.)",                        value: results.custosVariaveis.variavel, negative: false },
                  { label: `Comissão Plataforma (${parseInput(comissaoPlataforma)}%)`, value: results.custosVariaveis.comissao, negative: true  },
                  { label: "Taxa Fixa por Venda",                                      value: results.custosVariaveis.taxaFixa, negative: true  },
                  { label: `Impostos (${parseInput(aliquotaImposto)}%)`,               value: results.custosVariaveis.imposto,  negative: true  },
                  ...(parseInput(comissaoAfiliados) > 0 ? [{ label: `Comissão Afiliados (${parseInput(comissaoAfiliados)}%)`, value: results.custosVariaveis.afiliados, negative: true }] : []),
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <span className="text-sm font-medium">{item.label}</span>
                    <span className={`text-base font-semibold ${item.negative ? "text-destructive" : ""}`}>
                      {item.negative ? "− " : ""}{formatCurrency(item.value)}
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg md:col-span-2">
                  <span className="text-sm font-bold">Total Custos Variáveis</span>
                  <span className="text-xl font-bold text-primary">{formatCurrency(results.totalCustosVar)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
        <br />
      </TooltipProvider>
    </AppLayout>
  );
}

export default function CalculadoraPrecificacao() {
  return (
    <ProtectedRoute>
      <CalculadoraPrecificacaoContent />
    </ProtectedRoute>
  );
}