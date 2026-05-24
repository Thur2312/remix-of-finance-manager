import React, { useState, useMemo, useEffect } from "react";
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
  ShoppingBag, Lightbulb, TrendingUp, CheckCircle2, XCircle,
  HelpCircle, AlertCircle, BarChart3, DollarSign, Tag,
  Percent, Package, Trash2, Pencil,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useFixedCosts } from "@/hooks/useFixedCosts";
import { Progress } from "../components/ui/progress";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogTrigger, DialogFooter,
  DialogTitle, DialogHeader, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAnuncios, AnuncioInput } from "@/hooks/useProdutos";
import { toast } from "sonner";

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

// ─── Tabela de taxas Shopee ───────────────────────────────────────────────────
function getShopeeRates(preco: number): { comissao: number; taxaFixa: number } {
  if (preco <= 79.99)  return { comissao: 20, taxaFixa: 4  };
  if (preco <= 99.99)  return { comissao: 14, taxaFixa: 16 };
  if (preco <= 199.99) return { comissao: 14, taxaFixa: 20 };
  if (preco <= 499.99) return { comissao: 14, taxaFixa: 26 };
  return                      { comissao: 14, taxaFixa: 26 };
}

// ─── Calcula comissão em R$ para Shopee ──────────────────────────────────────
// Recebe o valor de venda e retorna (valorVenda × comissao%) + taxaFixa
function calcShopeeComissaoReais(valorVenda: number): number {
  if (valorVenda <= 0) return 0;
  const { comissao, taxaFixa } = getShopeeRates(valorVenda);
  return valorVenda * (comissao / 100) + taxaFixa;
}

// ─── Plataforma selector ─────────────────────────────────────────────────────
type Plataforma = "Shopee" | "TiktokShop" | "MercadoLivre";

const PLATAFORMA_OPTIONS: { value: Plataforma; label: string; color: string; bg: string }[] = [
  { value: "Shopee",       label: "Shopee",        color: "text-orange-600", bg: "bg-orange-500/10 border-orange-500/30 hover:bg-orange-500/20" },
  { value: "TiktokShop",   label: "TikTok Shop",   color: "text-pink-600",   bg: "bg-pink-500/10 border-pink-500/30 hover:bg-pink-500/20" },
  { value: "MercadoLivre", label: "Mercado Livre", color: "text-blue-600",   bg: "bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20" },
];

// ─── Absorção ────────────────────────────────────────────────────────────────
const ABSORCAO_PADRAO = { novo: 10, complementar: 30, principal: 60 } as const;
type PapelProduto = "novo" | "complementar" | "principal" | "avancado";

// ─── Form anúncio ────────────────────────────────────────────────────────────
const EMPTY_FORM = {
  nome_anuncio: "", custo: "", valor_venda: "", comissao_taxa: "",
  antecipado: "", afiliados: "", imposto_pct: "", custo_var: "",
  marketplace: "" as Plataforma | "",
};
type AnuncioForm = typeof EMPTY_FORM;

// ════════════════════════════════════════════════════════════════════════════
function CalculadoraPrecificacaoContent() {
  const [custoProduto,          setCustoProduto]          = useState("");
  const [embalagemEtiqueta,     setEmbalagemEtiqueta]     = useState("");
  const [precoPromocional,      setPrecoPromocional]      = useState("");
  const [desconto,              setDesconto]              = useState("");
  const [comissaoPlataforma,    setComissaoPlataforma]    = useState("20");
  const [taxaFixa,              setTaxaFixa]              = useState("4");
  const [aliquotaImposto,       setAliquotaImposto]       = useState("6");
  const [comissaoAfiliados,     setComissaoAfiliados]     = useState("0");
  const [margemDesejada]                                  = useState<number>(30);
  const [papelProduto,          setPapelProduto]          = useState<PapelProduto>("novo");
  const [absorpcaoManual]                                 = useState<number>(10);
  const [volumeEsperadoProduto, setVolumeEsperadoProduto] = useState<number>(50);
  const [faturamentoTotal,      setFaturamentoTotal]      = useState("");
  const [plataformaSelecionada, setPlataformaSelecionada] = useState<Plataforma | "">("");

  // ── Dialog state ──────────────────────────────────────────────────────────
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId,    setEditingId]    = useState<string | null>(null);
  const [anuncioForm,  setAnuncioForm]  = useState<AnuncioForm>(EMPTY_FORM);

  // ── Hooks ─────────────────────────────────────────────────────────────────
  const { totalRecurringCosts, isLoading: isLoadingCosts, settings: fixedCostsSettings, costs } = useFixedCosts();
  const { anuncios, isLoading: isLoadingAnuncios, addAnuncio, updateAnuncio, deleteAnuncio } = useAnuncios();
  const volumeMensal = fixedCostsSettings?.monthly_products_sold || 100;

  const mediaMargemPortfolio = useMemo(() => {
    if (!anuncios || anuncios.length === 0) return null;

    const margens = anuncios.map(a => {
      const comissaoTaxa = parseFloat(String(a.comissao_taxa) || "0");
      const taxaFixaAnuncio = a.taxafixa ?? 0;
      const impostoVal   = a.valor_venda * (a.imposto_pct / 100);
      const afiliadosVal = a.valor_venda * (a.afiliados / 100);
      const totalCustos  = a.custo + a.custo_var + comissaoTaxa + taxaFixaAnuncio + a.antecipado + afiliadosVal + impostoVal;
      const margem       = a.valor_venda > 0 ? ((a.valor_venda - totalCustos) / a.valor_venda) * 100 : 0;
      return margem;
    });

    const soma = margens.reduce((acc, m) => acc + m, 0);
    return soma / margens.length;
  }, [anuncios]);

  // ── Auto-fill Shopee (calculadora principal) ──────────────────────────────
  useEffect(() => {
    if (plataformaSelecionada !== "Shopee") return;
    const preco = parseInput(precoPromocional);
    const { comissao, taxaFixa: taxa } = getShopeeRates(preco);
    setComissaoPlataforma(String(comissao));
    setTaxaFixa(String(taxa));
  }, [plataformaSelecionada, precoPromocional]);

  // ── Auto-fill comissão no dialog quando Shopee + valor_venda muda ─────────
  useEffect(() => {
    if (anuncioForm.marketplace !== "Shopee") return;
    const venda = parseInput(anuncioForm.valor_venda);
    const comissaoReais = calcShopeeComissaoReais(venda);
    setAnuncioForm(prev => ({
      ...prev,
      comissao_taxa: comissaoReais > 0 ? comissaoReais.toFixed(2) : "",
    }));
  }, [anuncioForm.valor_venda, anuncioForm.marketplace]);

  const handleDecimalInput = (value: string, setter: (v: string) => void) => {
    if (value === "" || /^[0-9]*[,.]?[0-9]*$/.test(value)) setter(value);
  };

  const setFormField = (field: keyof AnuncioForm) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setAnuncioForm(prev => ({ ...prev, [field]: e.target.value }));

  const resetForm = () => { setAnuncioForm(EMPTY_FORM); setEditingId(null); };

  const percentualAbsorcao = useMemo(() =>
    papelProduto === "avancado" ? absorpcaoManual : ABSORCAO_PADRAO[papelProduto],
  [papelProduto, absorpcaoManual]);

  // ── Cálculos do produto atual ─────────────────────────────────────────────
  const results = useMemo(() => {
    const _custo     = parseInput(custoProduto);
    const _custoVar  = parseInput(embalagemEtiqueta);
    const _preco     = parseInput(precoPromocional);
    const _desc      = parseInput(desconto);
    const _comissao  = parseInput(comissaoPlataforma);
    const _taxaFixa  = parseInput(taxaFixa);
    const _imposto   = parseInput(aliquotaImposto);
    const _afiliados = parseInput(comissaoAfiliados);

    const volume     = volumeMensal > 0 ? volumeMensal : 1;
    const volumeProd = volumeEsperadoProduto > 0 ? volumeEsperadoProduto : 1;

    const precoCheio   = _desc > 0 ? _preco / (1 - _desc / 100) : _preco;
    const comissaoVal  = _preco * (_comissao / 100);
    const impostoVal   = _preco * (_imposto / 100);
    const afiliadosVal = _preco * (_afiliados / 100);

    const totalCustosVar = _custo + _custoVar + comissaoVal + _taxaFixa + impostoVal + afiliadosVal;
    const lucro          = _preco - totalCustosVar;
    const margemReal     = _preco > 0 ? (lucro / _preco) * 100 : 0;

    const custoFixoAlocado  = totalRecurringCosts * (percentualAbsorcao / 100);
    const custoFixoPorItem  = custoFixoAlocado / volumeProd;
    const lucroLiquido      = lucro - custoFixoPorItem;
    const margemAbsorcao    = _preco > 0 ? (lucroLiquido / _preco) * 100 : 0;
    const custoFixo100      = totalRecurringCosts / volumeProd;

    const taxasPct           = (_comissao + _imposto + _afiliados + margemDesejada) / 100;
    const denom              = 1 - taxasPct;
    const precoIdeal         = denom > 0 ? (_custo + _custoVar + _taxaFixa) / denom : 0;
    const precoNecessario100 = denom > 0 ? (_custo + _custoVar + _taxaFixa + custoFixo100) / denom : 0;

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

  // ── Panorama / Break-even ─────────────────────────────────────────────────
  const panorama = useMemo(() => {
    const fat = parseInput(faturamentoTotal);

    const margemPct = mediaMargemPortfolio !== null
      ? mediaMargemPortfolio
      : results.margemContribuicaoPercent;

    const breakEven          = margemPct > 0 ? (totalRecurringCosts / margemPct) * 100 : 0;
    const margemGerada       = fat * (margemPct / 100);
    const resultadoLiquido   = margemGerada - totalRecurringCosts;
    const margemLiquidaPct   = fat > 0 ? (resultadoLiquido / fat) * 100 : 0;
    const progressoBreakEven = breakEven > 0 ? Math.min((fat / breakEven) * 100, 100) : 0;

    return {
      fat, breakEven, margemGerada, resultadoLiquido,
      margemLiquidaPct, progressoBreakEven,
      lucrativo: resultadoLiquido > 0,
      margemPct,
      usandoPortfolio: mediaMargemPortfolio !== null,
      qtdAnuncios: anuncios.length,
    };
  }, [faturamentoTotal, mediaMargemPortfolio, results.margemContribuicaoPercent, totalRecurringCosts, anuncios.length]);

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

  // ── Abrir dialog para novo anúncio pré-preenchido ─────────────────────────
  const openNovoAnuncio = () => {
    const valorVenda = parseInput(precoPromocional);
    const marketplace = plataformaSelecionada;

    // Calcula comissão em R$ se for Shopee, senão usa o valor já calculado
    // na calculadora principal (comissão % + taxa fixa)
    let comissaoTaxaInicial = "";
    if (marketplace === "Shopee" && valorVenda > 0) {
      comissaoTaxaInicial = calcShopeeComissaoReais(valorVenda).toFixed(2);
    } else {
      const comissaoReais = valorVenda * (parseInput(comissaoPlataforma) / 100);
      const taxaFixaReais = parseInput(taxaFixa);
      const total = comissaoReais + taxaFixaReais;
      comissaoTaxaInicial = total > 0 ? total.toFixed(2) : String(parseInput(comissaoPlataforma) + parseInput(taxaFixa));
    }

    setAnuncioForm({
      nome_anuncio:  "",
      custo:         custoProduto,
      valor_venda:   precoPromocional,
      comissao_taxa: comissaoTaxaInicial,
      antecipado:    "0",
      afiliados:     comissaoAfiliados,
      imposto_pct:   aliquotaImposto,
      custo_var:     embalagemEtiqueta,
      marketplace:   marketplace,
    });
    setEditingId(null);
    setIsDialogOpen(true);
  };

  const openEditAnuncio = (a: typeof anuncios[0]) => {
    setEditingId(a.id);
    setAnuncioForm({
      nome_anuncio:  a.nome_anuncio,
      custo:         String(a.custo),
      valor_venda:   String(a.valor_venda),
      comissao_taxa: String(a.comissao_taxa),
      antecipado:    String(a.antecipado),
      afiliados:     String(a.afiliados),
      imposto_pct:   String(a.imposto_pct),
      custo_var:     String(a.custo_var),
      marketplace:   (a.marketplace ?? "") as Plataforma,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!anuncioForm.nome_anuncio.trim()) { toast.error("Nome do anúncio é obrigatório"); return; }
    const payload: AnuncioInput = {
      nome_anuncio:  anuncioForm.nome_anuncio.trim(),
      custo:         parseInput(anuncioForm.custo),
      valor_venda:   parseInput(anuncioForm.valor_venda),
      comissao_taxa: anuncioForm.comissao_taxa,
      antecipado:    parseInput(anuncioForm.antecipado),
      afiliados:     parseInput(anuncioForm.afiliados),
      imposto_pct:   parseInput(anuncioForm.imposto_pct),
      custo_var:     parseInput(anuncioForm.custo_var),
      marketplace:   anuncioForm.marketplace,
    };
    const ok = editingId
      ? await updateAnuncio(editingId, payload)
      : await addAnuncio(payload);
    if (ok) { setIsDialogOpen(false); resetForm(); }
  };

  // ── Helper: label do campo comissão no dialog ─────────────────────────────
  const comissaoTaxaLabel = useMemo(() => {
    if (anuncioForm.marketplace !== "Shopee") return "Comissão + Taxa (R$)";
    const venda = parseInput(anuncioForm.valor_venda);
    if (venda <= 0) return "Comissão + Taxa (R$) — Shopee";
    const { comissao, taxaFixa: taxa } = getShopeeRates(venda);
    return `Comissão + Taxa (R$) — Shopee ${comissao}% + R$${taxa}`;
  }, [anuncioForm.marketplace, anuncioForm.valor_venda]);

  // ══════════════════════════════════════════════════════════════════════════
  return (
    <AppLayout>
      <TooltipProvider>
        <div className="max-w-5xl mx-auto space-y-6">

          {/* ── Header ───────────────────────────────────────────────────── */}
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight flex items-center justify-center gap-2">
              <Calculator className="h-6 w-6 text-primary" />
              Calculadora de Precificação
            </h1>
            <p className="text-muted-foreground mt-1">
              Análise completa com Margem de Contribuição e Absorção de Custos Fixos
            </p>
          </div>

          {/* ── Banner custos fixos ───────────────────────────────────────── */}
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

          {/* ── Break-even + Panorama ─────────────────────────────────────── */}
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
                  <span className="text-sm text-muted-foreground mt-1 text-center px-2">
                    {panorama.usandoPortfolio ? (
                      <>
                        Média do portfólio ({panorama.qtdAnuncios} anúncio{panorama.qtdAnuncios !== 1 ? "s" : ""}):{" "}
                        <span className="text-primary font-semibold">{formatPercent(panorama.margemPct)}</span>
                      </>
                    ) : (
                      <>
                        Margem do produto atual:{" "}
                        <span className="text-primary font-semibold">{formatPercent(panorama.margemPct)}</span>
                      </>
                    )}
                  </span>
                  {!panorama.usandoPortfolio && (
                    <span className="text-xs text-muted-foreground mt-1 text-center px-4">
                      Cadastre seus anúncios para usar a média real do portfólio
                    </span>
                  )}
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

          {/* ── Card Principal ────────────────────────────────────────────── */}
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
                <div className="flex gap-3 flex-wrap">
                  {PLATAFORMA_OPTIONS.map(opt => (
                    <button key={opt.value} type="button"
                      onClick={() => setPlataformaSelecionada(plataformaSelecionada === opt.value ? "" : opt.value)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                        plataformaSelecionada === opt.value
                          ? `${opt.bg} ${opt.color} ring-1 ring-current`
                          : "border-border bg-background text-muted-foreground hover:bg-muted"
                      }`}>
                      {opt.label}
                      {plataformaSelecionada === opt.value && <CheckCircle2 className="h-3.5 w-3.5" />}
                    </button>
                  ))}
                </div>
                {plataformaSelecionada === "Shopee" && (
                  <p className="text-xs text-orange-600 dark:text-orange-400 flex items-center gap-1.5 mt-1">
                    <Info className="h-3.5 w-3.5 flex-shrink-0" />
                    Comissão e taxa fixa preenchidas automaticamente conforme a tabela da Shopee
                  </p>
                )}
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
                    <Label htmlFor="comissaoPlataforma" className="text-sm flex items-center gap-1">
                      Comissão Plataforma (%)
                      {plataformaSelecionada === "Shopee" && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0 text-orange-600 border-orange-400">Auto</Badge>
                      )}
                    </Label>
                    <Input id="comissaoPlataforma" type="text" inputMode="decimal" value={comissaoPlataforma}
                      onChange={e => handleDecimalInput(e.target.value, setComissaoPlataforma)} placeholder="20" className="h-10"
                      readOnly={plataformaSelecionada === "Shopee"} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="taxaFixa" className="text-sm flex items-center gap-1">
                      Taxa Fixa por Venda (R$)
                      {plataformaSelecionada === "Shopee" && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0 text-orange-600 border-orange-400">Auto</Badge>
                      )}
                    </Label>
                    <Input id="taxaFixa" type="text" inputMode="decimal" value={taxaFixa}
                      onChange={e => handleDecimalInput(e.target.value, setTaxaFixa)} placeholder="4,00" className="h-10"
                      readOnly={plataformaSelecionada === "Shopee"} />
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

              {/* Resultado + Botão Cadastrar */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex flex-wrap gap-3 flex-1">
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

                {/* ── Botão + Dialog ──────────────────────────────────────── */}
                <Dialog open={isDialogOpen} onOpenChange={open => { setIsDialogOpen(open); if (!open) resetForm(); }}>
                  <DialogTrigger asChild>
                    <Button onClick={openNovoAnuncio} className="gap-2 shrink-0">
                      <ShoppingBag className="h-4 w-4" />
                      Cadastrar Anúncio
                      {plataformaSelecionada && (
                        <Badge variant="secondary" className="ml-1 text-xs font-normal">
                          {plataformaSelecionada}
                        </Badge>
                      )}
                    </Button>
                  </DialogTrigger>

                  <DialogContent className="max-w-3xl w-[95vw]">
                    <DialogHeader>
                      <DialogTitle>{editingId ? "Editar Anúncio" : "Cadastrar Anúncio"}</DialogTitle>
                      <DialogDescription>
                        {editingId
                          ? "Altere as informações do anúncio."
                          : "Os campos foram pré-preenchidos com os dados da calculadora. Só falta o nome!"}
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="nome_anuncio" className="font-medium">
                            Nome do Anúncio <span className="text-destructive">*</span>
                          </Label>
                          <Input id="nome_anuncio" autoFocus value={anuncioForm.nome_anuncio}
                            onChange={setFormField("nome_anuncio")} placeholder="Ex: Macaquinho Floral" maxLength={255} />
                        </div>
                        <div className="space-y-2">
                          <Label>Marketplace</Label>
                          <Select
                            value={anuncioForm.marketplace}
                            onValueChange={v =>
                              setAnuncioForm(prev => ({ ...prev, marketplace: v as Plataforma }))
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Selecione o marketplace" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Shopee">Shopee</SelectItem>
                              <SelectItem value="TiktokShop">TikTok Shop</SelectItem>
                              <SelectItem value="MercadoLivre">Mercado Livre</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <Separator />
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Valores (R$) — pré-preenchidos
                      </p>

                      <div className="grid grid-cols-4 gap-4">
                        {/* Custo */}
                        <div className="space-y-2">
                          <Label className="text-sm">Custo</Label>
                          <Input type="text" inputMode="decimal" value={anuncioForm.custo}
                            onChange={setFormField("custo")} placeholder="0,00" />
                        </div>

                        {/* Valor de Venda */}
                        <div className="space-y-2">
                          <Label className="text-sm">Valor de Venda</Label>
                          <Input type="text" inputMode="decimal" value={anuncioForm.valor_venda}
                            onChange={setFormField("valor_venda")} placeholder="0,00" />
                        </div>

                        {/* Comissão + Taxa — auto para Shopee */}
                        <div className="space-y-2">
                          <Label className="text-sm flex items-center gap-1.5">
                            {comissaoTaxaLabel}
                            {anuncioForm.marketplace === "Shopee" && (
                              <Badge variant="outline" className="text-[10px] px-1 py-0 text-orange-600 border-orange-400">
                                Auto
                              </Badge>
                            )}
                          </Label>
                          <Input
                            type="text"
                            inputMode="decimal"
                            value={anuncioForm.comissao_taxa}
                            onChange={setFormField("comissao_taxa")}
                            placeholder="0,00"
                            className={anuncioForm.marketplace === "Shopee" ? "border-orange-400/60 focus-visible:ring-orange-400/40" : ""}
                          />
                          {anuncioForm.marketplace === "Shopee" && parseInput(anuncioForm.valor_venda) > 0 && (
                            <p className="text-[10px] text-orange-600 dark:text-orange-400">
                              Calculado automaticamente — você pode editar se necessário
                            </p>
                          )}
                        </div>

                        {/* Antecipado */}
                        <div className="space-y-2">
                          <Label className="text-sm">Antecipado (R$)</Label>
                          <Input type="text" inputMode="decimal" value={anuncioForm.antecipado}
                            onChange={setFormField("antecipado")} placeholder="0,00" />
                        </div>

                        {/* Afiliados */}
                        <div className="space-y-2">
                          <Label className="text-sm">Afiliados (%)</Label>
                          <Input type="text" inputMode="decimal" value={anuncioForm.afiliados}
                            onChange={setFormField("afiliados")} placeholder="0" />
                        </div>

                        {/* Custo Variável */}
                        <div className="space-y-2">
                          <Label className="text-sm">Custo Variável (R$)</Label>
                          <Input type="text" inputMode="decimal" value={anuncioForm.custo_var}
                            onChange={setFormField("custo_var")} placeholder="0,00" />
                        </div>

                        {/* Imposto */}
                        <div className="space-y-2">
                          <Label className="text-sm">Imposto (%)</Label>
                          <div className="relative">
                            <Input type="text" inputMode="decimal" value={anuncioForm.imposto_pct}
                              onChange={setFormField("imposto_pct")} placeholder="6" className="pr-8" />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <DialogFooter>
                      <Button variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>Cancelar</Button>
                      <Button onClick={handleSubmit} disabled={!anuncioForm.nome_anuncio.trim()}>
                        {editingId ? "Salvar Alterações" : "Cadastrar"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>

          {/* ── Alertas ──────────────────────────────────────────────────── */}
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

          {/* ── Três análises ─────────────────────────────────────────────── */}
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

          {/* ── Dica educacional ──────────────────────────────────────────── */}
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

          {/* ── Detalhamento custos variáveis ─────────────────────────────── */}
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
                  <span className="text-sm font-bold">Total Custos</span>
                  <span className="text-xl font-bold text-primary">{formatCurrency(results.totalCustosVar)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Tabela de Anúncios ────────────────────────────────────────── */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Anúncios Cadastrados</CardTitle>
                  <CardDescription>
                    {anuncios.length} anúncio{anuncios.length !== 1 ? "s" : ""} cadastrado{anuncios.length !== 1 ? "s" : ""}
                    {panorama.usandoPortfolio && (
                      <span className="ml-2 text-primary font-medium">
                        · Margem média: {formatPercent(panorama.margemPct)}
                      </span>
                    )}
                  </CardDescription>
                </div>
                <ShoppingBag className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingAnuncios ? (
                <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : anuncios.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ShoppingBag className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum anúncio cadastrado ainda.</p>
                  <p className="text-sm">Preencha os dados acima e clique em "Cadastrar Anúncio".</p>
                </div>
              ) : (
                // ── SUBSTITUA o bloco <table>...</table> dentro do Card "Anúncios Cadastrados" por este:

<div className="overflow-x-auto">
  <table className="w-full text-sm border-separate border-spacing-0">
    <thead>
      <tr className="text-muted-foreground text-xs font-medium">
        <th className="pb-2 pl-4 pr-2 text-left w-[160px]">Nome</th>
        <th className="pb-2 px-2 text-left w-[110px]">Marketplace</th>
        <th className="pb-2 px-2 text-right w-[88px]">Custo</th>
        <th className="pb-2 px-2 text-right w-[88px]">Venda</th>
        <th className="pb-2 px-2 text-right w-[116px]">Comissão/Taxa</th>
        <th className="pb-2 px-2 text-right w-[100px]">Antecipado</th>
        <th className="pb-2 px-2 text-right w-[84px]">Afiliados</th>
        <th className="pb-2 px-2 text-right w-[76px]">Imposto</th>
        <th className="pb-2 px-2 text-right w-[96px]">Custo Var.</th>
        <th className="pb-2 px-2 text-right w-[78px]">Margem</th>
        <th className="pb-2 px-2 text-right w-[88px]">Lucro</th>
        <th className="pb-2 pl-1 pr-2 w-[64px]" />
      </tr>
    </thead>
    <tbody>
      {anuncios.map(a => {
        const comissaoTaxa    = parseFloat(String(a.comissao_taxa) || "0");
        const taxaFixaAnuncio = a.taxafixa ?? 0;
        const impostoVal      = a.valor_venda * (a.imposto_pct / 100);
        const afiliadosVal    = a.valor_venda * (a.afiliados / 100);
        const totalCustos     = a.custo + a.custo_var + comissaoTaxa + taxaFixaAnuncio + a.antecipado + afiliadosVal + impostoVal;
        const lucro           = a.valor_venda - totalCustos;
        const margem          = a.valor_venda > 0 ? (lucro / a.valor_venda) * 100 : 0;

        const cellBase = "bg-muted/50 py-3 flex items-center h-full";

        return (
          <tr key={a.id}>
            {/* Nome — truncado com tooltip */}
            <td className="pt-2 w-[160px] max-w-[160px]">
              <div className={`${cellBase} rounded-l-md pl-4 pr-2`}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="font-medium truncate block w-full cursor-default">
                      {a.nome_anuncio}
                    </span>
                  </TooltipTrigger>
                  {a.nome_anuncio.length > 20 && (
                    <TooltipContent side="top">
                      <p>{a.nome_anuncio}</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </div>
            </td>

            {/* Marketplace */}
            <td className="pt-2 w-[110px]">
              <div className={`${cellBase} px-2`}>
                {a.marketplace ? (
                  <Badge variant="outline" className="font-normal shrink-0">{a.marketplace}</Badge>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </div>
            </td>

            {/* Custo */}
            <td className="pt-2 w-[88px]">
              <div className={`${cellBase} px-2 justify-end tabular-nums whitespace-nowrap`}>
                {formatCurrency(a.custo)}
              </div>
            </td>

            {/* Venda */}
            <td className="pt-2 w-[88px]">
              <div className={`${cellBase} px-2 justify-end tabular-nums whitespace-nowrap`}>
                {formatCurrency(a.valor_venda)}
              </div>
            </td>

            {/* Comissão/Taxa */}
            <td className="pt-2 w-[116px]">
              <div className={`${cellBase} px-2 justify-end tabular-nums whitespace-nowrap`}>
                {formatCurrency(comissaoTaxa)}
              </div>
            </td>

            {/* Antecipado */}
            <td className="pt-2 w-[100px]">
              <div className={`${cellBase} px-2 justify-end tabular-nums whitespace-nowrap`}>
                {formatCurrency(a.antecipado)}
              </div>
            </td>

            {/* Afiliados */}
            <td className="pt-2 w-[84px]">
              <div className={`${cellBase} px-2 justify-end`}>
                <Badge variant="secondary" className="font-normal tabular-nums">{a.afiliados}%</Badge>
              </div>
            </td>

            {/* Imposto */}
            <td className="pt-2 w-[76px]">
              <div className={`${cellBase} px-2 justify-end`}>
                <Badge variant="secondary" className="font-normal tabular-nums">{a.imposto_pct}%</Badge>
              </div>
            </td>

            {/* Custo Variável */}
            <td className="pt-2 w-[96px]">
              <div className={`${cellBase} px-2 justify-end tabular-nums whitespace-nowrap`}>
                {formatCurrency(a.custo_var)}
              </div>
            </td>

            {/* Margem */}
            <td className="pt-2 w-[78px]">
              <div className={`${cellBase} px-2 justify-end font-semibold tabular-nums whitespace-nowrap ${margem >= 0 ? "text-primary" : "text-destructive"}`}>
                {formatPercent(margem)}
              </div>
            </td>

            {/* Lucro */}
            <td className="pt-2 w-[88px]">
              <div className={`${cellBase} px-2 justify-end font-semibold tabular-nums whitespace-nowrap ${lucro >= 0 ? "text-green-600" : "text-destructive"}`}>
                {formatCurrency(lucro)}
              </div>
            </td>

            {/* Ações */}
            <td className="pt-2 w-[64px]">
              <div className={`${cellBase} rounded-r-md pl-1 pr-2 justify-end gap-0.5`}>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditAnuncio(a)}>
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