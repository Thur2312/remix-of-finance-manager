import { useState, useMemo } from "react";
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
const formatCurrency = (value: number): string => {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
};
const formatPercent = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

// Constantes de absorção por tipo de produto
const ABSORCAO_PADRAO = {
  novo: 10,
  // 10% do custo fixo
  complementar: 30,
  // 30% do custo fixo
  principal: 60 // 60% do custo fixo
} as const;
type PapelProduto = 'novo' | 'complementar' | 'principal' | 'avancado';
function CalculadoraPrecificacaoContent() {
  // Dados do Produto
  const [custoProduto, setCustoProduto] = useState<number>(0);
  const [embalagemEtiqueta, setEmbalagemEtiqueta] = useState<number>(0);

  // Preço do Anúncio
  const [precoCheio, setPrecoCheio] = useState<number>(0);
  const [desconto, setDesconto] = useState<number>(0);

  // Taxas e Comissões
  const [comissaoPlataforma, setComissaoPlataforma] = useState<number>(20);
  const [taxaFixa, setTaxaFixa] = useState<number>(4);
  const [aliquotaImposto, setAliquotaImposto] = useState<number>(6);
  const [comissaoAfiliados, setComissaoAfiliados] = useState<number>(0);

  // Meta
  const [margemDesejada, setMargemDesejada] = useState<number>(30);

  // Papel do Produto na Operação (NOVO)
  const [papelProduto, setPapelProduto] = useState<PapelProduto>('novo');
  const [absorpcaoManual, setAbsorpcaoManual] = useState<number>(10);
  const [volumeEsperadoProduto, setVolumeEsperadoProduto] = useState<number>(50);

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

  // Cálculo do percentual de absorção baseado no papel do produto
  const percentualAbsorcao = useMemo(() => {
    if (papelProduto === 'avancado') {
      return absorpcaoManual;
    }
    return ABSORCAO_PADRAO[papelProduto];
  }, [papelProduto, absorpcaoManual]);
  const results = useMemo(() => {
    const volume = volumeMensal > 0 ? volumeMensal : 1;
    const volumeProduto = volumeEsperadoProduto > 0 ? volumeEsperadoProduto : 1;

    // Preço Promocional (após desconto)
    const precoPromocional = precoCheio * (1 - desconto / 100);

    // =========================================
    // CUSTOS VARIÁVEIS (por unidade) - SEM CUSTO FIXO
    // =========================================
    const custosVariaveis = {
      produto: custoProduto,
      embalagem: embalagemEtiqueta,
      comissaoPlataforma: precoPromocional * (comissaoPlataforma / 100),
      taxaFixaVenda: taxaFixa,
      impostos: precoPromocional * (aliquotaImposto / 100),
      comissaoAfiliados: precoPromocional * (comissaoAfiliados / 100)
    };
    const totalCustosVariaveis = custosVariaveis.produto + custosVariaveis.embalagem + custosVariaveis.comissaoPlataforma + custosVariaveis.taxaFixaVenda + custosVariaveis.impostos + custosVariaveis.comissaoAfiliados;

    // =========================================
    // MARGEM DE CONTRIBUIÇÃO (SEM custo fixo)
    // =========================================
    const margemContribuicao = precoPromocional - totalCustosVariaveis;
    const margemContribuicaoPercent = precoPromocional > 0 ? margemContribuicao / precoPromocional * 100 : 0;
    const produtoViavel = margemContribuicao > 0;

    // =========================================
    // ABSORÇÃO DO CUSTO FIXO (CENÁRIO PARCIAL)
    // =========================================
    const custoFixoAlocado = totalRecurringCosts * (percentualAbsorcao / 100);
    const custoFixoPorItem = volumeProduto > 0 ? custoFixoAlocado / volumeProduto : 0;

    // =========================================
    // LUCRO LÍQUIDO (com absorção parcial)
    // =========================================
    const lucroLiquido = margemContribuicao - custoFixoPorItem;
    const margemRealAbsorcao = precoPromocional > 0 ? lucroLiquido / precoPromocional * 100 : 0;

    // =========================================
    // CENÁRIO PORTFÓLIO MADURO (100% do fixo)
    // =========================================
    const custoFixo100Percent = volumeProduto > 0 ? totalRecurringCosts / volumeProduto : 0;

    // Preço necessário para sustentar a empresa sozinho
    const taxasTotais = (comissaoPlataforma + aliquotaImposto + comissaoAfiliados + margemDesejada) / 100;
    const denominador = 1 - taxasTotais;
    const custoTotal100Percent = totalCustosVariaveis + custoFixo100Percent;
    const precoNecessario100Percent = denominador > 0 ? (totalCustosVariaveis + custoFixo100Percent + taxaFixa) / denominador : 0;

    // =========================================
    // CÁLCULOS LEGADOS (mantendo compatibilidade)
    // =========================================
    const custoFixoDiluido = totalRecurringCosts > 0 ? totalRecurringCosts / volume : 0;
    const custoTotal = custoProduto + embalagemEtiqueta + custoFixoDiluido;
    const valorComissaoPlataforma = precoPromocional * (comissaoPlataforma / 100);
    const valorComissaoAfiliados = precoPromocional * (comissaoAfiliados / 100);
    const valorImpostos = precoPromocional * (aliquotaImposto / 100);
    const valorLiquidoRecebido = precoPromocional - valorComissaoPlataforma - taxaFixa - valorImpostos - valorComissaoAfiliados;
    const lucro = valorLiquidoRecebido - custoTotal;
    const margemReal = precoPromocional > 0 ? lucro / precoPromocional * 100 : 0;
    const viavel = lucro >= 0;
    const margemAtingida = margemReal >= margemDesejada;
    const precoIdeal = denominador > 0 ? (custoTotal + taxaFixa) / denominador : 0;
    const margemInviavel = denominador <= 0;
    return {
      // Novos cálculos
      custosVariaveis,
      totalCustosVariaveis,
      margemContribuicao,
      margemContribuicaoPercent,
      produtoViavel,
      custoFixoAlocado,
      custoFixoPorItem,
      lucroLiquido,
      margemRealAbsorcao,
      custoFixo100Percent,
      precoNecessario100Percent,
      // Cálculos legados
      precoPromocional,
      custoTotal,
      custoFixoDiluido,
      valorComissaoPlataforma,
      valorComissaoAfiliados,
      taxaFixa,
      valorImpostos,
      valorLiquidoRecebido,
      lucro,
      margemReal,
      viavel,
      margemAtingida,
      precoIdeal,
      margemInviavel
    };
  }, [custoProduto, precoCheio, desconto, comissaoPlataforma, taxaFixa, aliquotaImposto, comissaoAfiliados, embalagemEtiqueta, margemDesejada, totalRecurringCosts, volumeMensal, volumeEsperadoProduto, percentualAbsorcao]);

  // Alertas de proteção automáticos
  const alertas = useMemo(() => {
    const lista: {
      tipo: 'critico' | 'alerta' | 'aviso' | 'info';
      mensagem: string;
    }[] = [];

    // Margem de contribuição negativa = CRÍTICO
    if (results.margemContribuicao <= 0 && results.precoPromocional > 0) {
      lista.push({
        tipo: 'critico',
        mensagem: 'Produto INVIÁVEL: não cobre nem os custos variáveis! Revise o preço ou os custos.'
      });
    }

    // Produto novo com absorção > 20%
    if (papelProduto === 'novo' && percentualAbsorcao > 20) {
      lista.push({
        tipo: 'alerta',
        mensagem: 'Atenção: produto novo não deve absorver mais de 20% dos custos fixos. Considere reduzir.'
      });
    }

    // Custo fixo alocado > 30% do preço
    if (results.custoFixoPorItem > results.precoPromocional * 0.3 && results.precoPromocional > 0) {
      lista.push({
        tipo: 'aviso',
        mensagem: 'O custo fixo alocado representa mais de 30% do preço de venda. Avalie o volume esperado.'
      });
    }

    // Lucro líquido negativo mas margem de contribuição positiva
    if (results.lucroLiquido < 0 && results.margemContribuicao > 0 && results.precoPromocional > 0) {
      lista.push({
        tipo: 'info',
        mensagem: 'O produto contribui para os custos fixos, mas não gera lucro líquido no cenário atual.'
      });
    }
    return lista;
  }, [results, papelProduto, percentualAbsorcao]);
  const handleNumberInput = (value: string, setter: (val: number) => void) => {
    const numValue = parseNumericInputSafe(value, { min: 0, max: 9999999 });
    setter(numValue);
  };
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

          {/* Papel do Produto na Operação */}
          <Card className="border-primary/20">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Papel do Produto na Operação</CardTitle>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Defina a importância deste produto no seu portfólio. Produtos novos não devem carregar toda a estrutura de custos da empresa.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <CardDescription>
                Defina quanto dos custos fixos este produto deve absorver
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <RadioGroup value={papelProduto} onValueChange={value => setPapelProduto(value as PapelProduto)} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="novo" id="novo" />
                  <Label htmlFor="novo" className="flex-1 cursor-pointer">
                    <span className="font-medium">Produto Novo / Teste</span>
                    <p className="text-xs text-muted-foreground">Absorve 10% do custo fixo</p>
                  </Label>
                  <Badge variant="secondary" className="text-xs">10%</Badge>
                </div>
                
                <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="complementar" id="complementar" />
                  <Label htmlFor="complementar" className="flex-1 cursor-pointer">
                    <span className="font-medium">Produto Complementar</span>
                    <p className="text-xs text-muted-foreground">Absorve 30% do custo fixo</p>
                  </Label>
                  <Badge variant="secondary" className="text-xs">30%</Badge>
                </div>
                
                <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="principal" id="principal" />
                  <Label htmlFor="principal" className="flex-1 cursor-pointer">
                    <span className="font-medium">Produto Principal</span>
                    <p className="text-xs text-muted-foreground">Absorve 60% do custo fixo</p>
                  </Label>
                  <Badge variant="secondary" className="text-xs">60%</Badge>
                </div>
                
                <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="avancado" id="avancado" />
                  <Label htmlFor="avancado" className="flex-1 cursor-pointer">
                    <span className="font-medium">Modo Avançado</span>
                    <p className="text-xs text-muted-foreground">Defina manualmente a %</p>
                  </Label>
                  <Percent className="h-4 w-4 text-muted-foreground" />
                </div>
              </RadioGroup>

              {/* Slider para Modo Avançado */}
              {papelProduto === 'avancado' && <div className="p-4 bg-muted/30 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">% de Absorção do Custo Fixo</Label>
                    <div className="flex items-center gap-2">
                      <Input type="text" inputMode="decimal" value={absorpcaoManual} onChange={e => setAbsorpcaoManual(parseNumericInputSafe(e.target.value, { min: 0, max: 100 }))} className="w-20 h-9 text-center" />
                      <span className="text-sm text-muted-foreground">%</span>
                    </div>
                  </div>
                  <Slider value={[absorpcaoManual]} onValueChange={([val]) => setAbsorpcaoManual(val)} min={0} max={100} step={1} className="w-full" />
                  <p className="text-xs text-muted-foreground text-center">
                    Produtos novos: 5-15% | Complementares: 20-40% | Principais: 50-100%
                  </p>
                </div>}

              {/* Volume Esperado do Produto */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="volumeEsperado" className="text-sm font-medium">
                      Volume Esperado deste Produto
                    </Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>Quantas unidades você espera vender deste produto específico por mês.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Input id="volumeEsperado" type="text" inputMode="numeric" value={volumeEsperadoProduto || ''} onChange={e => setVolumeEsperadoProduto(parseNumericInputSafe(e.target.value, { min: 0, max: 999999 }))} placeholder="50" />
                  <p className="text-xs text-muted-foreground">unidades/mês</p>
                </div>
                
                <div className="flex items-center p-4 bg-primary/5 rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm font-medium">Custo Fixo Alocado por Item</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(totalRecurringCosts)} × {percentualAbsorcao}% ÷ {volumeEsperadoProduto} un
                    </p>
                  </div>
                  <span className="text-xl font-bold text-primary">{formatCurrency(results.custoFixoPorItem)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Volume Settings Section */}
          

          {/* Main Container - Dados do Produto */}
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                {/* Linha 1 */}
                <div className="space-y-1.5">
                  <Label htmlFor="custoProduto" className="text-sm font-medium">
                    Custo do Produto (R$)
                  </Label>
                  <Input id="custoProduto" type="text" inputMode="decimal" value={custoProduto || ""} onChange={e => handleNumberInput(e.target.value.replace(',', '.'), setCustoProduto)} placeholder="0,00" className="h-11" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="comissaoPlataforma" className="text-sm font-medium">
                    Comissão Plataforma (%)
                  </Label>
                  <Input id="comissaoPlataforma" type="text" inputMode="decimal" value={comissaoPlataforma || ""} onChange={e => handleNumberInput(e.target.value.replace(',', '.'), setComissaoPlataforma)} placeholder="20" className="h-11" />
                </div>

                {/* Linha 2 */}
                <div className="space-y-1.5">
                  <Label htmlFor="embalagemEtiqueta" className="text-sm font-medium">
                    Embalagem + Etiqueta (R$)
                  </Label>
                  <Input id="embalagemEtiqueta" type="text" inputMode="decimal" value={embalagemEtiqueta || ""} onChange={e => handleNumberInput(e.target.value.replace(',', '.'), setEmbalagemEtiqueta)} placeholder="0,00" className="h-11" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="taxaFixa" className="text-sm font-medium">
                    Taxa Fixa por Venda (R$)
                  </Label>
                  <Input id="taxaFixa" type="text" inputMode="decimal" value={taxaFixa || ""} onChange={e => handleNumberInput(e.target.value.replace(',', '.'), setTaxaFixa)} placeholder="4,00" className="h-11" />
                </div>

                {/* Linha 3 */}
                <div className="space-y-1.5">
                  <Label htmlFor="precoCheio" className="text-sm font-medium">
                    Preço Promocional (R$)
                  </Label>
                  <Input id="precoCheio" type="text" inputMode="decimal" value={precoCheio || ""} onChange={e => handleNumberInput(e.target.value.replace(',', '.'), setPrecoCheio)} placeholder="0,00" className="h-11" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="aliquotaImposto" className="text-sm font-medium">
                    Alíquota de Imposto (%)
                  </Label>
                  <Input id="aliquotaImposto" type="text" inputMode="decimal" value={aliquotaImposto || ""} onChange={e => handleNumberInput(e.target.value.replace(',', '.'), setAliquotaImposto)} placeholder="6" className="h-11" />
                </div>

                {/* Linha 4 */}
                <div className="space-y-1.5">
                  <Label htmlFor="desconto" className="text-sm font-medium">
                    Desconto (%)
                  </Label>
                  <Input id="desconto" type="text" inputMode="decimal" value={desconto || ""} onChange={e => handleNumberInput(e.target.value.replace(',', '.'), setDesconto)} placeholder="0" className="h-11" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="comissaoAfiliados" className="text-sm font-medium">
                    Comissão Afiliados (%)
                  </Label>
                  <Input id="comissaoAfiliados" type="text" inputMode="decimal" value={comissaoAfiliados || ""} onChange={e => handleNumberInput(e.target.value.replace(',', '.'), setComissaoAfiliados)} placeholder="0" className="h-11" />
                </div>

                {/* Linha 5 */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Preço do Anúncio </Label>
                  <div className="h-11 flex items-center justify-center px-3 bg-primary/10 border border-primary/30 rounded-md">
                    <span className="text-lg font-semibold text-primary">
                      {formatCurrency(results.precoPromocional)}
                    </span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Meta de Margem (%)</Label>
                  <div className="flex items-center gap-2">
                    <Slider 
                      value={[margemDesejada]} 
                      onValueChange={([val]) => setMargemDesejada(val)} 
                      min={0} 
                      max={100} 
                      step={1} 
                      className="flex-1" 
                    />
                    <Input 
                      type="text" 
                      inputMode="decimal" 
                      value={margemDesejada} 
                      onChange={e => handleNumberInput(e.target.value.replace(',', '.'), setMargemDesejada)} 
                      className="w-16 h-11 text-center" 
                    />
                  </div>
                </div>

                {/* Linha 6 - Preço Ideal alinhado abaixo do slider */}
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
            {/* A) Análise de Viabilidade (Entrada) - VERDE */}
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
                <CardDescription className="text-xs">
                  Sem considerar custos fixos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Custos Variáveis:</span>
                    <span className="font-medium">{formatCurrency(results.totalCustosVariaveis)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Preço de Venda:</span>
                    <span className="font-medium">{formatCurrency(results.precoPromocional)}</span>
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

            {/* B) Análise com Absorção Parcial - AZUL */}
            <Card className="border-2 border-blue-500/30 bg-blue-500/5">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  <CardTitle className="text-base">Absorção Parcial</CardTitle>
                  <Badge variant="outline" className="text-xs">{percentualAbsorcao}%</Badge>
                </div>
                <CardDescription className="text-xs">
                  Cenário justo para este produto
                </CardDescription>
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

            {/* C) Análise de Portfólio Maduro - CINZA */}
            <Card className="border-2 border-muted bg-muted/30">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-base">Portfólio Maduro</CardTitle>
                  <Badge variant="outline" className="text-xs">100%</Badge>
                </div>
                <CardDescription className="text-xs">
                  Se fosse o único produto
                </CardDescription>
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
                    <p className="text-xs text-muted-foreground mt-1">
                      Para {formatPercent(margemDesejada)} de margem
                    </p>
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
              {/* Custo do Produto */}
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <span className="text-sm font-medium">Custo do Produto</span>
                <span className="text-lg font-semibold">{formatCurrency(results.custosVariaveis.produto)}</span>
              </div>

              {/* Embalagem */}
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <span className="text-sm font-medium">Embalagem + Etiqueta</span>
                <span className="text-lg font-semibold">{formatCurrency(results.custosVariaveis.embalagem)}</span>
              </div>

              {/* Comissão da Plataforma */}
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <span className="text-sm font-medium">Comissão Plataforma ({comissaoPlataforma}%)</span>
                <span className="text-lg font-semibold text-destructive">- {formatCurrency(results.custosVariaveis.comissaoPlataforma)}</span>
              </div>

              {/* Taxa Fixa */}
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <span className="text-sm font-medium">Taxa Fixa por Venda</span>
                <span className="text-lg font-semibold text-destructive">- {formatCurrency(results.custosVariaveis.taxaFixaVenda)}</span>
              </div>

              {/* Impostos */}
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <span className="text-sm font-medium">Impostos ({aliquotaImposto}%)</span>
                <span className="text-lg font-semibold text-destructive">- {formatCurrency(results.custosVariaveis.impostos)}</span>
              </div>

              {/* Comissão Afiliados */}
              {comissaoAfiliados > 0 && <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                  <span className="text-sm font-medium">Comissão Afiliados ({comissaoAfiliados}%)</span>
                  <span className="text-lg font-semibold text-destructive">- {formatCurrency(results.custosVariaveis.comissaoAfiliados)}</span>
                </div>}

              {/* Total Custos Variáveis */}
              <div className="flex items-center justify-between p-4 bg-primary/10 rounded-lg md:col-span-2">
                <span className="text-sm font-bold">Total Custos Variáveis</span>
                <span className="text-xl font-bold text-primary">{formatCurrency(results.totalCustosVariaveis)}</span>
              </div>
            </div>
          </div>
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