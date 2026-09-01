# Diagnóstico Financeiro — Seller Finance

> **Status:** Commit 1 (captação) e Commit 3 (agregação unificada) feitos.
> Falta: Commit 2 (frete no detalhamento, cosmético), BUG-01 (imposto), BUG-15
> (dono desconecta conexão lixo), backfill histórico (`days:180`).
> **Data:** 27/08/2026 · revisado 28/08/2026 (Commits 1 + 3a/3b/3c)
> **Escopo:** cálculo financeiro da Gestão Shopee (dashboard) e da Calculadora de Precificação.
>
> **Revisão 27/08 (sync Shopee):** seção 5 resolvida (sem bug de sinal — cliente
> em "Por Margem", queixa = BUG-04 + BUG-05). BUG-03 refutado no mecanismo e
> reescrito como BUG-03a (dominante) + BUG-03b. Novos: BUG-10 (truncagem),
> BUG-11 (precedência de operador), BUG-12, BUG-13 (`payments.transaction_date`).
>
> **Revisão 28/08 (teste no banco real da Maluth):** BUG-12 (idempotência)
> **testado e descartado** — zero duplicação. Confirmados com número: BUG-03a
> (16 pedidos de receita × ~30 de taxa), BUG-03b (frete R$ 320,52 ignora rebate
> de R$ 241,08), BUG-10 (teto de 30 visível no dado). Novos: BUG-14 (55% de
> `fees`/`payments` com `order_id` nulo — vínculo se auto-corrige devagar) e
> BUG-15 (mesma loja física em 2 contas do app → dado particionado por corrida
> de sync; a 2ª conexão é lixo, mitigação manual). Decisão: **corrigir a
> captação antes de mexer na agregação.**
>
> **Revisão 28/08 (Commit 1 + número validado):** Commit `3272f29` — `integration-sync`
> step payments reescrito (BUG-10/11/13/14 corrigidos). Deployado. Teste na
> Maluth: `orfas_15d` → **0**, Fase 2 recupera pedidos ausentes via
> `get_order_detail`. **A loja é saudável** — Valor Líquido correto (competência,
> Σ `escrow_amount`) = **+R$ 6.473** sobre R$ 10.461 de faturamento (margem
> 61,9%); o `−R$ 44` era 100% bug de agregação. Decisão da coorte do card:
> **(a) pedido concluído na janela** (`COMPLETED` + `order_updated_at` ≥ 15d).
> BUG-03b **rebaixado**: `escrow_amount` já reflete o frete real, então o Commit
> 3 corrige o efeito visível sozinho. Novo: BUG-16 (`IntegrationDashboard.tsx`
> tem conta própria — 3º site de finança Shopee).
>
> Este documento é a fonte de verdade do que já foi apurado. Leia antes de mexer
> em qualquer cálculo. Se alguma premissa aqui se mostrar errada ao ler o código,
> **corrija este arquivo no mesmo commit** em vez de contornar em silêncio.

---

## 1. Resumo do problema

Duas telas do produto calculam finanças de forma independente e chegam a
resultados incompatíveis para a mesma loja.

| | Tela A — Gestão Shopee | Tela B — Calculadora |
|---|---|---|
| Base do imposto | Lucro (path sync) / Receita (path upload) | Receita |
| Frete | `estimated_shipping_fee` como taxa, sem abater rebate (BUG-03b) | Ignorado |
| Agregação | `orders`/`fees`/`payments` somados em paralelo, sem join, coortes diferentes (BUG-03a) | por produto |
| Resultado (Maluth Store) | Valor Líquido −R$ 44,94 → margem negativa | margem +20% |

Não existe uma fonte única de verdade do cálculo financeiro no projeto. Os bugs
individuais listados abaixo são sintomas disso.

> **Correção 27/08:** a linha "Frete — cobrado integral" da versão anterior
> descrevia um mecanismo que o código não tem. A causa dominante do resultado
> negativo é a agregação (BUG-03a), não o frete. Ver seção 3.4.

---

## 2. Evidências coletadas

### 2.1 Tela A — `/gestao`, aba Shopee → Dashboard

Loja Maluth Store, 16 pedidos sincronizados, janela de 15 dias:

```
Faturamento                    R$ 603,05   ("Receita bruta sincronizada")
Taxas Shopee                   R$ 647,99
  ├─ Frete                     R$ 320,52
  ├─ Comissão Shopee           R$ 183,17
  └─ Taxa de serviço           R$ 144,30
Valor Líquido                 -R$  44,94
Imposto (9%)                  -R$   4,04
Lucro líquido após imposto    -R$  40,90
```

Observação adicional: o seletor exibe "Período: 7 dias" enquanto os cards dizem
"Últimos 15 dias (sync)".

### 2.2 Tela B — Calculadora de Precificação

Configuração fixa em todos os testes: custo do produto R$ 45,00, custo variável
(embalagem/etiqueta) R$ 0,30, plataforma TikTok Shop, comissão 6%, taxa fixa por
venda R$ 6,00, imposto 6%, desconto 40%. Modo **"Por Margem"**, slider em 20%.

| Afiliados | Preço promocional | Lucro | Margem exibida |
|---|---|---|---|
| 10% | R$ 88,45 | R$ 17,69 | 20,0% |
| 1%  | R$ 76,57 | R$ 15,32 | 20,0% |
| 0%  | R$ 75,44 | R$ 15,09 | 20,0% |

---

## 3. O que JÁ foi verificado — não refazer

### 3.1 A aritmética da Calculadora está CORRETA

A fórmula resolvida em modo "Por Margem" é:

```
preço = custos_fixos / (1 − margem% − Σ taxas%)
```

Com `custos_fixos = 45,00 + 0,30 + 6,00 = 51,30`:

| Afiliados | Denominador | Cálculo | Resultado |
|---|---|---|---|
| 10% | 1 − 0,20 − 0,06 − 0,06 − 0,10 = 0,58 | 51,30 / 0,58 | **88,45** ✓ |
| 1%  | 0,67 | 51,30 / 0,67 | **76,57** ✓ |
| 0%  | 0,68 | 51,30 / 0,68 | **75,44** ✓ |

Os três batem exatamente com a tela. **Não "corrigir" esta fórmula.**

### 3.2 Hipótese de sinal invertido na Calculadora — DESCARTADA

Se as taxas estivessem sendo somadas ao lucro em vez de subtraídas, o preço para
20% de margem sem afiliados daria **R$ 42,72**, não R$ 75,44. Descartada por
aritmética.

### 3.3 O preço cheio está correto

88,45 ÷ (1 − 0,40) = **147,42**, valor que a tela exibe.

### 3.4 Hipótese "frete cheio" da Tela A — REFUTADA

A versão anterior deste documento (BUG-03 original) atribuía o Valor Líquido
negativo da Maluth Store a frete cobrado integral do vendedor
(`R$ 320,52 ÷ 16 pedidos ≈ R$ 20/pedido`).

O levantamento do código refutou o **mecanismo**:

- `320,52 ÷ 16 ≈ 20` é coincidência aritmética. Não há nada no código que
  "cobre frete cheio" — o que há é `estimated_shipping_fee` sendo gravado como
  taxa (`integration-sync/index.ts:550`).
- `Faturamento` (`R$ 603,05`) e `Taxas` (`R$ 647,99`) **não são calculados sobre
  o mesmo conjunto de pedidos** (ver BUG-03a). `orders` é filtrado por
  `order_created_at`, `fees` por `fee_date` (= `escrow_release_time`). Os
  `R$ 320,52` de frete quase certamente somam `shipping_fee` de **mais de 16
  pedidos** — coortes anteriores cujo repasse caiu dentro da janela.

O achado de frete **não foi descartado** — foi reclassificado e reduzido de
escopo: virou **BUG-03b** (rebate não subtraído + `estimated` no lugar de
`actual`), severidade MÉDIA, não a causa dominante.

**Não reinvestigar "frete cheio" como causa raiz do líquido negativo.**

### 3.5 `SHOPEE_FEE_TYPES_TAXAS` — conferida (não reconferir)

A lista que define quais `fee_type` entram no total de taxas é
`["commission", "service_fee", "shipping_fee", "reverse_shipping_fee"]`
(`shopee-sync-status.ts:14`), usada por `computeShopeeSyncStats` e por
`useDREData`. É a mesma base do card "Taxas Shopee" (R$ 647,99) e do que a
Calculadora/DRE usam. `adjustment` (que inclui o `shopee_shipping_rebate`) fica
**de fora** — é o que sustenta o BUG-03b.

---

## 4. Bugs confirmados

### BUG-01 — Base de cálculo do imposto é inconsistente entre telas · CRÍTICO

- **Tela A (path sync):** `applyTaxRate(netProfit, taxRate)` recebe
  `receita − taxas` como base → imposto sobre o **lucro**.
  `useCompanies.ts:111-115` + `useIntegrationTax.tsx:85`.
- **Tela A (path upload manual):** `imposto = total_faturado * imposto_nf_saida`
  → imposto sobre a **receita**. `calculations.ts:112-118`.
  E o `TaxSummaryRow` roda por cima do `lucro_reais` que **já** teve imposto
  subtraído (`calculations.ts:121`) → **imposto duplicado** nesse path.
- **Tela B (Calculadora):** `impostoVal = _preco * (_imposto/100)` → **receita**.
  `CalculadoraPrecificacao.tsx:575`.

São **três semânticas** no projeto, e a Tela A é inconsistente consigo mesma.

Se o campo "% de imposto" da empresa representa Simples Nacional, a base correta é
a **receita bruta** — Tela B certa, Tela A errada (seriam 9% × 603,05 = **R$ 54,27**,
não R$ 4,04). Diferença superior a 10x.

**Decisão pendente do Thur.** Investigar a semântica do campo no cadastro da
empresa e perguntar antes de escolher.

Regra adicional, qualquer que seja a base: **nunca aplicar imposto sobre resultado
negativo**.

**Status (resolvido como design — ver [[redesign-e-auditoria]] / memória):**
`companies.tax_base` (`revenue` default | `profit`) + `applyTax()` em `src/lib/tax.ts`
com guard `profit<=0 → 0` (BUG-02). Dashboards (Shopee/TikTok/ML/Unificado) já
usam esse modelo via `TaxSummaryRow`, mostrando o lucro **antes** do imposto de
saída pra não tributar duas vezes (`31ed3d3`).

**Aposentar `settings.imposto_nf_saida` (faseado):**
- **Fase 1 — FEITO.** `TikTokResultados` e `TikTokVariacoes` (análise operacional
  por produto/variação) não aplicam mais `imposto_nf_saida`:
  `calculateTikTokResults(..., { includeImpostoSaida: false })`. Coluna "Imposto"
  e a linha do CSV saíram; card "Lucro Líquido" → "Lucro Operacional (antes do
  imposto)". Motivo: ratear alíquota Simples da empresa linha a linha num
  relatório de produto é artificial; imposto vive no dashboard/DRE.
- **Fase 2 — pendente.** DRE (`dre-calculations.ts` `issShopee`/`issTikTok`) ainda
  lê `imposto_nf_saida` — precisa decidir escopo de empresa da DRE (hoje é
  user-wide, sem `companies`). Só depois disso dá pra dropar as 3 colunas
  (`settings`/`tiktok_settings`/`ml_settings`), tirar o campo das telas de config
  e limpar o `financial-assistant`.

### BUG-02 — Sinal invertido na Tela A · CONFIRMADO, causa isolada

`−44,94 − 4,04 = −48,98`, mas a UI exibe **−40,90**. O imposto está sendo somado.

Raiz — `useCompanies.ts:111-115`, sem guard para base negativa:

```ts
export function applyTaxRate(netProfit: number, taxRate: number) {
  const taxAmount = netProfit * (taxRate / 100);   // −44,94 × 0,09 = −4,04
  const netAfterTax = netProfit - taxAmount;        // −44,94 − (−4,04) = −40,90
  return { taxAmount, netAfterTax };
}
```

Com `netProfit` negativo, `taxAmount` também fica negativo e `netProfit − taxAmount`
**soma**. Renderizado em `useIntegrationTax.tsx:102-108` (o `− {fmt(taxAmount)}`
ainda dupla-negativa o rótulo). Valor chega negativo de
`shopee/Dashboard.tsx:171-173` (`totalRevenue − totalFees`).

Correção: `netProfit <= 0` → `taxAmount = 0`. Padrão a adotar: valores monetários
trafegam **positivos**; o sinal é responsabilidade exclusiva da apresentação.

### BUG-03a — Descasamento de coorte + zero-coalescing na agregação Shopee · CRÍTICO · causa dominante do líquido negativo

O Valor Líquido negativo (`603,05 − 647,99 = −44,94`) vem de `totalRevenue` e
`totalFees` serem somados sobre **conjuntos de pedidos diferentes**, sem
reconciliação e com ausência de dado virando zero silencioso.

**Evidência (código):**

- `useShopeeSync.tsx` busca as três tabelas com filtros de data incompatíveis:
  - `orders`   → `.gte('order_created_at', since)` (linha ~127)
  - `fees`     → `.gte('fee_date', since)` (linha ~161)
  - `payments` → `.gte('transaction_date', since)` (linha ~192)
- `fee_date` do Shopee **é** `escrow_release_time` (`integration-sync/index.ts:567`).
  Pedido criado há mais de 15 dias mas com repasse liberado agora entra em
  `totalFees` e **não** entra em `totalRevenue`. Taxa sem receita compensatória.
- `payments.transaction_date` é gravado como `now.toISOString()` — hora do sync,
  não do repasse (`integration-sync/index.ts:541`). O filtro de 15 dias sobre
  `payments` é inócuo.
- `computeShopeeSyncStats` (`shopee-sync-status.ts:79-87`) **não faz join por
  `order_id` em ponto nenhum** — soma `fees` e `payments` em listas separadas.
  Mesmo padrão em `useDREData.ts:326-328`.
- Escrita coalesce ausência para zero: `Number(income.escrow_amount) || 0`
  (`integration-sync/index.ts:536`). Leitura não conta os excluídos.

**Evidência (banco real da Maluth, 28/08):**

| coorte | pedidos | R$ |
|---|---|---|
| Receita — `order_created_at` ≤15d, `COMPLETED` | **16** | 603,05 |
| Taxa — `fee_date` (= `escrow_release_time`) ≤15d | **~30** | 647,99 (commission 183,17 + service 144,30 + shipping 320,52) |
| Interseção real (com `order_id` casável) | **7** | — |

O card divide taxa de 30 pedidos por receita de 16. Os 30 são o teto do
`.slice(0, 30)` (BUG-10) — não há nada entre 7 e 15 dias no dado, tudo o que
aparece são os 30 repasses mais recentes.

**Correção — regime de competência (decisão do Thur, 27/08):** Valor Líquido =
Σ `escrow_amount` dos pedidos **concluídos no período**, casando `orders` +
`payments` por `order_id`, independente de o repasse já ter caído.

Motivo: o card vizinho é a margem (`líquido ÷ faturamento`). Casar por data de
liberação faria numerador e denominador virem de safras de pedidos diferentes —
a margem subiria quando o vendedor não vende nada e repasses antigos caem.

**Coorte do card — decisão (a), 28/08:** `status = COMPLETED` **E**
`order_updated_at` ≥ 15d atrás. `order_updated_at` de um pedido concluído ≈ a
data de conclusão (não há `completed_at` limpo). Faturamento e Líquido saem da
**mesma** coorte. Rejeitadas: "criado na janela" (238 pedidos ainda em trânsito
→ líquido enganosamente baixo) e "repasse na janela" (já rejeitada — margem sobe
sem vender).

**Regra dura:** pedido sem dado de repasse **nunca vira zero**. Ou sai do
agregado com contagem de excluídos (`pedidosSemDado`), ou usa `estimated`.

`computeShopeeSyncStats` retorna a decomposição:
`{ faturamento, liberado, aLiberar, totalCompetencia, pedidosSemDado, emTransito }`.

> **Validado no banco (28/08), pós-Commit 1:** coorte (a) na Maluth →
> **315 pedidos · faturamento R$ 10.460,80 · Valor Líquido R$ 6.473,17 · margem
> 61,9% · 101 em trânsito.** A margem bate com a coorte "criado na janela"
> (4006/6468 = 61,9%) — coortes diferentes, mesma economia. O `−R$ 44` era 100%
> bug de agregação. **BUG-12 descartado** (sem duplicação); **BUG-10/11/13/14
> corrigidos** no Commit 1.

### BUG-03b — Frete: rebate não subtraído e `estimated` no lugar de `actual` · BAIXO (rebaixado 28/08)

> **Rebaixado:** o Commit 3 usa `escrow_amount` como Valor Líquido, e o
> `escrow_amount` **já** reflete o frete real (a Shopee já abateu o rebate). Então
> o número do card fica certo sem tocar nas linhas de `fee`. O que resta é
> cosmético: o "Detalhamento de Taxas" ainda mostra `shipping_fee` bruto
> (R$ 3.599 na Maluth) em vez de ~R$ 600. Vira Commit 2, baixa prioridade —
> corrige só a decomposição visual.

Achado confirmado no levantamento (não é a causa dominante do líquido negativo,
mas é erro real de valor):

- `integration-sync/index.ts:550` grava `income.estimated_shipping_fee` como a
  taxa de frete. Deveria ser `actual_shipping_fee` — que o tipo do
  `get_escrow_detail` no código (linhas 509-521) **nem declara**.
- `income.shopee_shipping_rebate` é gravado como `fee_type: "adjustment"`
  (linha 554) e **nunca subtraído**: `SHOPEE_FEE_TYPES_TAXAS`
  (`shopee-sync-status.ts:14`) não inclui `adjustment`, e o "Detalhamento de
  Taxas" filtra `f.type !== 'adjustment'` (`shopee/Dashboard.tsx:356`).
- `income.buyer_paid_shipping_fee` não é lido em lugar nenhum.

```
custo real de frete do vendedor =
  actual_shipping_fee − buyer_paid_shipping_fee − shopee_shipping_rebate
  (ou final_shipping_fee direto, quando a Shopee devolve)
```

**Evidência (banco real da Maluth, 28/08), janela de 15d:**

| `adjustment` (não entra no total de taxas) | R$ |
|---|---|
| Rebate frete Shopee | **241,08** |
| Desconto do vendedor | 970,22 (promo do próprio vendedor — provavelmente correto ficar fora) |
| Voucher Shopee | 10,48 |

```
shipping_fee bruto gravado        320,52
Rebate frete Shopee (ignorado)   −241,08
─────────────────────────────────────────
frete real do vendedor          ~  79,44
```

Sozinho, abater o rebate já reverte quase todo o "líquido negativo".

Sob a abordagem B (escrow como verdade), o frete deixa de entrar no cálculo do
líquido — vira apenas decomposição visual. Mas a decomposição precisa estar
certa, senão engana o usuário. Corrigir a **captação** para trazer os campos e
gravar o frete líquido.

> **⚠️ Idas e voltas 31/08 (`3313017` revert → `b8cbd60` fix).** Sequência:
> 1. Cliente não gostou do frete (BUG-06) nem do botão "Aplicar" (BUG-05).
> 2. `3313017` removeu frete + os modos "Por Margem"/"Por Lucro" inteiros.
> 3. Cliente quis os modos + slider **de volta** — a queixa real era outra:
>    ao tirar % de taxa, a **Margem Real travava** em vez de subir.
> 4. `b8cbd60`: modos + slider de volta, **sem o botão "Aplicar"** e sem
>    auto-preenchimento. Causa da trava: o botão/useEffect copiava o "preço
>    sugerido" pro Preço Promocional → `apurar(preço sugerido)` colapsava no
>    slider. Sem nada copiando o preço, Margem Real = `1 − custosFixos/preço −
>    Σtaxas%`, inversamente proporcional às taxas ponto a ponto (3 testes novos
>    travam isso).
> **Frete (BUG-06) continua removido** (migration `20260831120000_drop_anuncios_frete.sql`).

### BUG-04 — Painel "MARGEM REAL" é tautológico no modo "Por Margem" · ✅ RESOLVIDO por BUG-05 (`9442f1b`), reforçado em `b8cbd60` (sem botão)

Era tautológico **porque** um `useEffect` sobrescrevia o Preço Promocional com o
preço sugerido — aí `margemReal = apurar(preço sugerido)` colapsava no slider
(verificado algebricamente). Com o BUG-05 corrigido (o preço só muda no botão
"Aplicar"), o chip volta a apurar o **preço realmente digitado**: enquanto o
usuário arrasta o slider sem aplicar, a margem exibida é a do preço atual, não a
do slider. Depois de "Aplicar", `margemReal ≈ slider` — mas isso é feedback
correto ("pediu 20%, ficou 20%"), não indicador vazio. Rótulo "Margem Real"
mantido — agora é apuração de verdade nos 3 modos.

### BUG-05 — A ferramenta escolhe uma decisão de negócio em silêncio · ✅ RESOLVIDO (`9442f1b` → `b8cbd60`)

Abordagem: **desacoplar**. `9442f1b` removeu o `useEffect` que espelhava
`precoSugerido → precoPromocional` e pôs um botão **"Aplicar"** no lugar. O
cliente não gostou nem do botão (re-clicava e a margem travava de novo). `b8cbd60`:
**tirou o botão**. O preço sugerido de cada modo é só um texto de referência
("Preço para essa margem: R$ X — digite no Preço Promocional se quiser usar");
nada copia o preço automaticamente. Com o preço parado, tirar uma taxa faz a
Margem Real subir ponto a ponto.

Origem da queixa do cliente. Quando um custo desaparece (afiliados 10% → 0%), há
duas saídas legítimas:

- **Manter o preço** em R$ 88,45 → margem sobe para 30,0% (R$ 26,54/venda)
- **Manter a margem** em 20% → preço cai para R$ 75,44 (−R$ 13,01)

A calculadora aplica a segunda caladamente. O cliente esperava a primeira e leu a
queda de R$ 17,69 → R$ 15,09 como prejuízo. **Nenhuma das duas é errada; a
ferramenta é que precisa mostrar ambas.**

### BUG-06 — A calculadora precifica sem frete · ⚠️ implementado (`e2ec795`) e REVERTIDO (`3313017`)

Foi implementado como campo manual ("Frete que você paga (R$ por venda)") +
coluna `anuncios.frete`. **O cliente não quis** — removido inteiro em 31/08
(migration `20260831120000_drop_anuncios_frete.sql`). A dessincronia planejado ×
realizado por causa do frete volta a existir; se um dia reativar, o histórico
está em `e2ec795`.

### BUG-07 — Divisão por zero no modo "Por Margem" · ✅ RESOLVIDO (`9442f1b`, mantido em `b8cbd60`)

O guard `denom > 0 ? x : 0` já existia (em `precoPorMargem`/`precoPorLucro` de
`src/lib/pricing.ts` depois do refactor), mas falhava **mudo** — a linha "Preço
sugerido" só sumia. Agora: slider de margem com `max` dinâmico
(`floor(margemMaxViavelPct) − 1`); quando o alvo estoura o denominador, aparece
"As taxas já consomem X% do preço — a margem máxima possível é Y%" no lugar do
preço; efeito recolhe o slider pro teto se as taxas subirem depois.

### BUG-08 — Regra de comissão do TikTok está hardcoded · ✅ RESOLVIDO (`34f7a92`)

As 3 tabelas (Shopee/TikTok/ML) saíram de `CalculadoraPrecificacao.tsx` para
`src/lib/marketplace-fees.ts` — módulo puro, `TAXAS_VERIFICADAS_EM` co-localizada,
14 testes cobrindo as fronteiras de faixa. Config **versionada por data de
vigência** foi avaliada e descartada como over-engineering: as faixas já são
conferidas na mão (constante + nota na UICtrl), e o app é efetivamente
single-tenant. Se um dia precisar, o módulo puro é o lugar.

**Tier decidido pelo preço promocional** (`getTiktokRates(precoPromocional)`) —
documentado no comentário do módulo. Se estiver errado (deveria ser preço cheio),
é 1 linha.

### BUG-09 — UI, menores · ✅ RESOLVIDO

- **Tela A:** já estava quase todo resolvido — o seletor `syncPeriod` (7/15/30/60)
  é reativo (`useShopeeSync(id, Number(syncPeriod))` re-filtra) e os 3 rótulos
  usam `${syncPeriod}`. Só o InfoPopover de "Total de Pedidos" dizia "últimos 15
  dias" fixo (`statInfo` é const de módulo) — trocado por "do período
  sincronizado (seletor acima)" (`0dd8eaf`).
- **Tela B:** o grid quebrado **não existe mais** — "Preço Cheio (calculado)" hoje
  é uma linha `flex justify-between` de largura total abaixo do grid. Nada a fazer.

### BUG-10 — Perda de dado silenciosa no sync (truncagem) · ✅ CORRIGIDO — Commit 1 (`3272f29`)

> `.slice(0, 30)` e `escrowSafetyLimit < 3` removidos; `safetyLimit < 1` do
> orders → `< 40`. Paginação até `more === false`. Teto de segurança só no
> caminho do cron (`escrowBudget = 150`, sem janela). Client (`useIntegrations.ts`)
> janela o step `payments` em 1 dia. Validado: `total` fees 4997 → 6404.

Três tetos diferentes, nenhum sinalizado na UI:

| Onde | Teto | Código |
|---|---|---|
| Orders por janela | 50 (1 página — `while (hasMore && safetyLimit < 1)`) | `integration-sync/index.ts:299` |
| Escrow detail por sync | 30 (`escrowOrders.slice(0, 30)`) | `integration-sync/index.ts:504` |
| Escrow list | 150 (3 páginas × 50 — `escrowSafetyLimit < 3`) | `integration-sync/index.ts:482` |

O `syncNow` do client chama o step `orders` uma vez por janela de 1 dia
(`useIntegrations.ts:104-126`), então o teto de orders é 50/dia — mas escrow é
30 no sync inteiro. Com volume real, `totalFees` e `totalRevenue` são truncados
em pontos diferentes e os cards ficam errados sem aviso.

**Confirmado no dado (28/08):** o teto de 30 do `.slice(0, 30)` aparece cru —
na janela de 15d há **exatamente 30** linhas de `commission`, 30 de `service_fee`
e 30 de `shipping_fee`, e `7d` == `15d` (nada além dos 30 repasses mais recentes).
Os "16 pedidos" da Maluth eram a coorte de *receita*; a de *taxa* estava capada
em 30.

**Correção:** paginar tudo até o fim (remover `.slice(0, 30)` e o
`escrowSafetyLimit < 3`); se um teto de segurança for atingido, propagar
(flag + contagem) em vez de cortar em silêncio. Se o volume estourar o timeout
do edge function, o client fatia o step `payments` por janela de release-time
(como já faz com `orders`).

### BUG-11 — Precedência de operador apaga valor real · ✅ CORRIGIDO — Commit 1 (`3272f29`)

> `marketplace_fee: (Number(income.commission_fee) || 0) + (Number(income.net_service_fee) || 0)`.

`integration-sync/index.ts:535`:

```ts
marketplace_fee: Number(income.commission_fee) + Number(income.net_service_fee) || 0,
```

`+` liga mais forte que `||`, então isto é `(Number(a) + Number(b)) || 0`. Se
`net_service_fee` vier ausente, `Number(undefined) = NaN`, a soma vira `NaN`, e
`NaN || 0 = 0`. Uma comissão real de `R$ 183,17` é **zerada** porque o outro
campo faltou.

Diferente do `escrow_amount || 0` (BUG-03a), que coalesce um campo isolado: aqui
o `||` engole a soma inteira, incluindo a parcela que existe.

Varredura do repositório: **é a única ocorrência** do padrão
`Number(a) + Number(b) || 0`. Os demais `|| 0` em expressões (`calculations.ts`,
`dre-calculations.ts`, `tiktok-*.ts`, `TikTokPagamentos.tsx`) estão todos dentro
de `Number(campo || 0)` ou `Math.abs(campo || 0)` — coalesce de campo isolado,
corretos.

**Correção:** `Number(income.commission_fee || 0) + Number(income.net_service_fee || 0)`.

### BUG-12 — Idempotência do sync · VERIFICADO E DESCARTADO (28/08)

Hipótese: `syncNow` re-varre sempre a mesma janela, o auto-sync roda a cada 15
min — se a escrita não fosse idempotente, syncs repetidos acumulariam taxas
duplicadas, e `647,99` seria na verdade um valor menor multiplicado.

**Teste no banco real da Maluth (seção 12.1):** medição antes/depois de 2 syncs.

| | fees_linhas | fees_distintas (`external_fee_id`) | duplicatas |
|---|---|---|---|
| antes | 4972 | 4972 | **0** |
| depois | 4972 | 4972 | **0** |

`external_fee_id` é único **global**, o `upsert` é idempotente, e centenas de
auto-syncs ao longo de meses não produziram uma única linha repetida.
**Duplicação está descartada como causa de qualquer coisa.**

Efeito colateral do "único global": ver BUG-15 (duas conexões brigam pela mesma
linha).

### BUG-13 — `payments.transaction_date` não guarda data de negócio · ✅ CORRIGIDO — Commit 1 (`3272f29`)

> `transaction_date` agora recebe `safeShopeeDate(escrowOrder.escrow_release_time)`.
> (Backfill retroativo dos `payments` antigos ainda pendente — vem numa sync ampla.)

`integration-sync/index.ts:541` grava `transaction_date: now.toISOString()` — a
hora em que o sync rodou, não a data real da transação/repasse. Pior: o `upsert`
(`onConflict: "external_transaction_id"`) reescreve a linha inteira, então o
valor é **sobrescrito a cada ressincronização**.

Consequência: **qualquer consulta que filtre pagamento por `transaction_date`
está errada hoje** — todo escrow já sincronizado cai dentro de qualquer janela
recente. Passou despercebido porque o dashboard reconstrói o líquido por
`receita − fees` e usa `fee_date` (que é correto — ver seção 9, Verificação A),
nunca `transaction_date`.

Isto invalidou a "Correção 1" proposta para o script de teste (filtrar
`pedidos_com_escrow` por `transaction_date` seria no-op). O recorte correto de
competência é join `payments → orders` por `order_id` e filtro por
`orders.order_created_at`.

**Correção:** `transaction_date` recebe `safeShopeeDate(escrowOrder.escrow_release_time)`
— a mesma fonte do `fee_date` das fees-irmãs. (O escrow só entra em `payments`
via `get_escrow_list`, que só devolve repasse já liberado, então `escrow_release_time`
está sempre disponível.)

### BUG-14 — Sync grava `fees`/`payments` com `order_id` nulo · ✅ CORRIGIDO — Commit 1 (`3272f29`)

> Fase 2 do loop novo: coleta os `order_sn` ausentes, busca `get_order_detail` em
> lotes de 50, upsert em `orders` + `order_items`, mapa `order_sn → order_id`,
> Fase 4 grava com id real. Validado na Maluth: `orfas_15d` → **0** (`🧩 27/27
> pedidos ausentes → 27 recuperados`). Restam ~2600 órfãs **históricas** (fora da
> janela de 15d) — resolvem numa sync ampla (`days: 180`), pendente.

Ao processar um repasse, o loop de escrow faz um `select` na tabela `orders`
local pelo `external_order_id` (`integration-sync/index.ts:528`). Se o pedido
não está lá — porque foi criado antes da janela que o step `orders` varre, ou
por causa do teto de página (BUG-10) — grava `order_id: null`
(`integration-sync/index.ts:562`) e **nunca chama a API pra buscar o pedido**.

**Evidência (banco real da Maluth, 28/08):**

| conexão | fees com `order_id` nulo |
|---|---|
| `efbd3b5b` (ativa, 5 meses de histórico) | **2637 / 4740 (56%)** |
| `929c33cc` (só sincronizou Ago 4–10) | 6 / 257 (2%) |

O problema é de **profundidade histórica**: repasse que cai hoje para um pedido
de meses atrás que nunca foi puxado. O vínculo **se auto-corrige devagar** — o
`upsert` da fee reescreve `order_id` a cada sync, então quando o pedido
eventualmente entra na tabela `orders` a fee é religada; mas só ~30 pedidos são
re-tocados por sync (`.slice(0, 30)`), então leva muitas execuções.

**Consequência:** a agregação por competência do BUG-03a (join `orders` +
`payments` por `order_id`) **não roda** sobre 55% das linhas. `escrow_amount` em
si está preenchido (1014/1016) — falta só o vínculo com a data do pedido.

**Correção:** no loop de escrow, quando o pedido não está em `orders`, coletar os
`order_sn` faltantes, buscar `get_order_detail` em lotes de 50, fazer upsert em
`orders` + `order_items`, e usar o id resultante. Nunca gravar `order_id: null`.
Backfill: re-sync completo da conexão ativa.

### BUG-15 — Mesma loja física em 2 contas do app · MÉDIO · mitigação manual por ora

`orders` / `fees` / `payments` **não têm coluna `user_id`** — a posse é via
`integration_id → integration_connections.user_id`. Com `external_fee_id` único
**global** (BUG-12), cada linha pertence a **quem sincronizou por último**.

**Evidência (banco real da Maluth, 28/08):** a loja `1427450574` está conectada
em duas `integration_connections`, de dois `user_id` diferentes:

| id | user_id | auto_sync | último sync | fatia de dados |
|---|---|---|---|---|
| `efbd3b5b` | `60afd787` | ON | 28/08 | 4740 fees, 1047 orders (28/03→hoje) |
| `929c33cc` | `84cb1d3e` | OFF | 10/08 | 257 fees, 260 orders (Ago 4–10) |

O dashboard lê **uma** `integration_id`, então o user `60afd787` **não vê** as
257 fees / 260 orders presas sob `929c33cc`. Se `84cb1d3e` re-sincronizar, ele
"rouba" ~30 linhas recentes de volta e elas somem da tela do outro.

**Não muda o diagnóstico do líquido negativo** (BUG-03a/10/03b explicam sozinhos).

**Decisão (28/08):** a conexão `929c33cc` é lixo. **Mitigação:** o dono desconecta
a conta `84cb1d3e` e re-sincroniza a `efbd3b5b` para reclamar as 257 fees. Sem
migration por ora. Se no futuro houver caso legítimo de 2 contas na mesma loja,
mudar o `unique` de `external_fee_id` para `(integration_id, external_fee_id)`.

### BUG-16 — `IntegrationDashboard.tsx` tem cálculo financeiro próprio · MÉDIO

A tela "Gerenciar Shopee" (`src/components/integrations/IntegrationDashboard.tsx:52`)
não usa `computeShopeeSyncStats` — calcula à mão:
```ts
const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total_amount), 0)  // COMPLETED, sem filtro de data
const totalFees    = payments?.reduce((sum, p) => sum + Number(p.marketplace_fee), 0)
const netRevenue   = payments?.reduce((sum, p) => sum + Number(p.net_amount), 0)
```
É o **3º** site de finança Shopee (com `shopee/Dashboard.tsx` e `useDREData.ts`),
cada um com sua conta. O Commit 3 roteia os três pela mesma função pura
(seção 7.1). Enquanto isso, essa tela mostra números "quase certos" por sorte
(coortes grandes se cancelam).

---

## 5. Questão em aberto · ~~resolver PRIMEIRO~~ RESOLVIDA (27/08)

**O modo "Por Preço" tem bug de sinal real? → NÃO. Nenhum dos três modos tem.**

Verificado em `src/pages/CalculadoraPrecificacao.tsx`:
- Modo "Por Preço" não tem cálculo próprio — as abas só mostram texto
  (`:1523-1527`); a margem exibida é sempre `results.margemReal` (`:573-580`),
  onde comissão/imposto/afiliados entram somando em `totalCustosVar` e este é
  subtraído de `_preco`. Remover afiliados 10%→0% com preço fixo R$ 88,45 faz o
  lucro subir R$ 17,69 → R$ 26,54 e a margem 20,0% → 30,0%. Sem inversão.
- Modo "Por Lucro" (`:622-624`): taxas entram como `1 − Σtaxas%` no denominador;
  o lucro recalculado volta exatamente ao alvo. Sem inversão.

**O cliente estava em "Por Margem".** Nesse modo a fórmula validada (seção 3.1)
recalcula o preço para segurar a margem — quando afiliados cai, o preço cai de
R$ 88,45 para R$ 75,44 e o lucro/venda cai de R$ 17,69 para R$ 15,09. Não é bug
de aritmética: é a ferramenta escolhendo "manter a margem" sem avisar (BUG-05),
com o painel "MARGEM REAL" apenas ecoando o slider (BUG-04).

A fórmula da seção 3.1 fica **intocada**. O que resta da queixa é BUG-04 + BUG-05,
ambos de apresentação.

> Teste de aceite (manter na seção 10): modo "Por Preço", preço fixo 88,45,
> afiliados 10%→0% → margem sobe para 30,0%, lucro para R$ 26,54.

---

## 6. Decisão tomada — valores monetários

**Inteiros em centavos como fonte de verdade, do banco à UI. Sem biblioteca de decimal.**

### Por quê

JS usa IEEE 754 binário; 0,1 em binário é dízima infinita, como 1/3 em decimal.
Por isso `0.1 + 0.2 === 0.30000000000000004`. Com 16 pedidos já há divergência de
centavos; em escala vira reconciliação manual.

### Alternativas descartadas

| Opção | Por que não |
|---|---|
| `float8` / `number` | Silenciosamente errado. É o que provavelmente está lá. |
| `numeric` no Postgres | Exato no banco, mas o driver do Supabase devolve string; um `Number(row.valor)` no frontend anula tudo. Depende de disciplina que não se sustenta. |
| decimal.js / dinero.js | Corretos, mas custam bundle, serialização e curva de aprendizado. Valores em BRL cabem folgados em `Number.MAX_SAFE_INTEGER` (~90 trilhões de reais em centavos). |

Centavos inteiros dão exatidão em soma e subtração de graça. O ponto de atenção é
**multiplicação por percentual e rateio**, que precisam de arredondamento explícito
num único lugar.

### Regras

1. **Persistência:** todo campo monetário vira `bigint` em centavos. Escrever a
   migration mas **não rodar** — apresentar antes, com plano de backfill e rollback.

2. **Tipo no TS:** branded type, para impedir que centavos e reais se misturem.
   ```ts
   export type Cents = number & { readonly __brand: unique symbol };
   export const toCents = (reais: number): Cents => Math.round(reais * 100) as Cents;
   export const toReais = (c: Cents): number => c / 100;
   ```
   Nada de `number` cru em cálculo financeiro. Se o TS reclamar, é o tipo
   trabalhando.

3. **Fronteira:** APIs externas (Shopee, TikTok, Mercado Livre) devolvem float ou
   string em reais. Converter para centavos **uma vez**, num adapter por
   plataforma, na entrada. Payload bruto não circula pelo domínio.

4. **Percentuais:** uma única função, usada em todo lugar.
   ```ts
   export const applyPercent = (base: Cents, percent: number): Cents =>
     Math.round(base * percent / 100) as Cents;
   ```
   Documentar a política de arredondamento escolhida (half-up vs half-even) e o porquê.

5. **Rateio:** ao dividir um valor entre itens (frete rateado por pedido, por
   exemplo), usar o **método do maior resto**, para que a soma das partes seja
   exatamente igual ao todo. Nunca `Math.round` item a item.

6. **Formatação:** `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`
   numa única função de apresentação. Zero formatação manual espalhada.

7. **Entrada do usuário:** parser que aceite `"88,45"`, `"88.45"`, `"R$ 88,45"` e
   `"1.234,56"`, devolvendo `Cents`. Testar todos esses formatos.

---

## 7. Arquitetura alvo

Um módulo puro de domínio — sem React, sem Supabase, sem fetch:

```
calcularResultadoLoja(pedidos, config)      → alimenta a Tela A
calcularPrecificacao(custos, precos, taxas) → alimenta a Tela B
```

Ambas compartilhando as **mesmas** primitivas: `calcularImposto`,
`calcularComissao`, `calcularCustoFrete`, `calcularMargem`.

Se as duas telas divergirem de novo no futuro, é porque alguém duplicou lógica —
e o teste de consistência pega.

### 7.1 Agregação Shopee (Tela A) — regras que saíram do levantamento

`calcularResultadoLoja` (e o `computeShopeeSyncStats` que o alimenta) fica sujeito
a:

1. **Reconciliação por `order_id`.** `orders`, `fees` e `payments` são casados por
   pedido antes de qualquer soma. Proibido somar as três listas em paralelo (é o
   BUG-03a).
2. **Coorte do período = decisão (a):** `status = COMPLETED` **E**
   `order_updated_at` na janela. A **mesma** coorte alimenta Faturamento
   (Σ `total_amount`) e Valor Líquido (Σ `escrow_amount`).
3. **Três estados por pedido, nunca dois:**
   - `liberado` → `escrow_amount` real
   - `estimado` → `escrow` estimado pela Shopee
   - `indisponivel` → sem dado
   (Na Maluth, 315/315 concluídos estão `liberado` — `estimado`/`indisponivel`
   são raros, mas a regra fica.)
4. **Ausência nunca vira zero.** `indisponivel` sai do agregado com contagem
   (`pedidosSemDado`) ou marca o resultado como incerto. Nada de `?? 0` / `|| 0`
   em valor monetário de pedido.
5. **Retorno é decomposição, não só total:**
   `{ faturamento, liberado, aLiberar, totalCompetencia, pedidosSemDado, emTransito }`.
6. **Rótulos sem ambiguidade caixa/competência.** "Faturamento (vendas
   concluídas no período)" e "Valor Líquido (repasses das vendas concluídas)" +
   linha "N pedidos em trânsito". "Líquido" sozinho foi o que deixou o card
   errado passar.
7. **Um único cálculo.** `shopee/Dashboard.tsx`, `IntegrationDashboard.tsx`
   (BUG-16) e `useDREData.ts` passam a chamar a **mesma** função.
8. **Fronteira de captação (`integration-sync`).** Payload bruto da Shopee é
   convertido uma vez, na entrada; percentuais e datas normalizados; sem `|| 0`
   sobre soma (BUG-11); paginação sem teto silencioso (BUG-10); pedido sempre
   buscado quando falta (BUG-14); `transaction_date` real (BUG-13).

---

## 8. Ordem de execução

> **Realinhada em 28/08.** A agregação (BUG-03a) **não pode** ser feita antes da
> captação — o join por `order_id` só existe em 45% das linhas hoje.

| # | Etapa | Status / Bloqueia |
|---|---|---|
| ~~0~~ | ~~BUG-12 — idempotência~~ | ✅ **testado e descartado 28/08** — zero duplicação |
| ~~1~~ | ~~Verificar o modo "Por Preço" (seção 5)~~ | ✅ feito — sem bug de sinal; cliente em "Por Margem" |
| 2 | Levantamento do código (seção 9) | sync Shopee concluído; schema (tipos de coluna) e Calculadora pendentes |
| 3 | **Decisão do Thur:** base do imposto (BUG-01) | trava BUG-02 e migrations |
| ~~4~~ | ~~**Captação — Commit 1:** BUG-11 + BUG-13 + BUG-14 + BUG-10~~ | ✅ **feito e deployado 28/08** (`3272f29`). BUG-03b saiu daqui (rebaixado → Commit 2). |
| ~~5~~ | ~~**Agregação — Commit 3:** função pura única (`computeShopeeFinance`), coorte (a), três estados, rótulos (seção 7.1)~~ | ✅ **feito 28/08** — `8f30f8a` (3a) + `93032f7` (fix) + `29d41fa` (3b) + `d14d8ab` (3c). Migrados: Dashboard, Gestão, Unificado, Comparativo, DRE. `IntegrationDashboard.tsx` (BUG-16) deletado (órfão). Card na Maluth: `−R$ 44` → `+R$ 6.473`. |
| 6 | **Backfill histórico:** sync ampla (`days: 180`) da `efbd3b5b` (2637 fees órfãs) + dono desconecta `929c33cc` (BUG-15) | melhora telas de histórico; não bloqueia o card de 15d |
| ~~7~~ | ~~Calculadora: BUG-04, BUG-05, BUG-07, BUG-08, BUG-09~~ | ✅ **feito 29/08** — `34f7a92` (extrai `marketplace-fees.ts` + `pricing.ts`, 29 testes), `8803071` (calc roteada pelas libs), `8d4dab8` (remove cards mortos de absorção), `9442f1b` (BUG-05 desacopla + BUG-07 aviso; BUG-04 cai junto), `0dd8eaf` (BUG-09 tooltip). BUG-06 continua fora (precisa decisão). |
| 8 | Dashboard: BUG-02 (guard imposto sobre negativo) — só depois do BUG-01 | depende de 3 |
| 9 | Commit 2: frete líquido no "Detalhamento de Taxas" (BUG-03b, cosmético) | — |
| 10 | Padronização em centavos (seção 6) | depende de 3 |
| 11 | Proposta de frete na precificação (BUG-06) | depende de 8 |

> Não iniciar a padronização em centavos antes da decisão do imposto (BUG-01).
> Migration em cima de regra de imposto errada custa caro para desfazer.

---

## 9. Levantamento pendente

Responder com caminho de arquivo e trecho de código:

1. Onde cada tela calcula seus números — client, backend (`finance-manager-api`),
   ou view/function no Supabase? **Confirmar lendo o código, não presumir.**
   - **Parcial (Shopee, 27/08):** tudo no **client**. Nenhuma view/function no
     Postgres. Cadeia: `integration-sync` (Edge Function) grava
     `orders`/`fees`/`payments` crus → `useShopeeSync.tsx` busca as 3 tabelas →
     `computeShopeeSyncStats` (`shopee-sync-status.ts`) agrega no browser →
     `shopee/Dashboard.tsx` monta os cards → `TaxSummaryRow` aplica o imposto.
   - **Pendente:** path de upload manual (`calculations.ts`), Calculadora,
     DRE (`useDREData.ts` — mesmo padrão de soma paralela sem join).
2. Tipo de coluna de todo campo monetário no schema do Supabase (`float8`?
   `numeric`? `text`?). Listar tabela por tabela.
   - **Bloqueio (27/08):** `orders`/`fees`/`payments`/`order_items`/
     `integration_connections` **não estão em nenhuma migration** deste repo.
     Só `database.types.ts` (gerado), que diz `number` para todos — não revela
     `float8` vs `numeric`. Precisa de `\d+ fees` no banco real.
3. Quais campos do payload da Shopee (`get_escrow_detail`) e do TikTok Shop são
   consumidos hoje, e como são convertidos na entrada.
   - **Parcial (Shopee, 27/08):** `integration-sync/index.ts:509-556`. Lidos:
     `buyer_total_amount`, `commission_fee`, `net_service_fee`,
     `estimated_shipping_fee`, `reverse_shipping_fee`, `seller_discount`,
     `shopee_discount`, `escrow_amount`, `voucher_from_shopee`,
     `shopee_shipping_rebate`. **Não lidos:** `actual_shipping_fee`,
     `buyer_paid_shipping_fee`, `final_shipping_fee`. Conversão: `Number(x) || 0`
     campo a campo (com o bug de precedência do BUG-11 no `marketplace_fee`).
4. Existe camada de normalização/adapter entre API externa e domínio, ou os
   payloads brutos circulam pelo app?
   - **Resposta parcial (27/08):** **não há adapter.** `integration-sync` grava
     o payload quase cru em `float`/`text`; a agregação lê direto dessas tabelas.
     É exatamente a "Fronteira" que a seção 7.1 item 7 exige criar.

### 9.1 Verificações do teste de idempotência (27/08)

**A · O que `fees.fee_date` recebe?** A **data da Shopee**, não a do sync.
`integration-sync/index.ts:567`:
```ts
fee_date: safeShopeeDate(escrowOrder.escrow_release_time) ?? now.toISOString(),
```
`escrow_release_time` vem do `get_escrow_list` (só lista pedidos já liberados →
sempre preenchido); o fallback para `now` só dispara com data inválida. Portanto
o descasamento de coorte do BUG-03a é real e vem de `fee_date` (liberação) vs
`order_created_at` (criação) — **sem** duplicação de linha.
Contraste: `payments.transaction_date` recebe `now` → é o BUG-13.

**B · Auto-sync.** `pg_cron` roda `select trigger_auto_sync()` a cada 15 min
(ver migração `20260806230000_revoke_dangerous_rpc_execute.sql`). A função é
`SECURITY DEFINER` e **o corpo não está em migration** — presume-se que filtre
`auto_sync_enabled = true AND next_sync_at <= now()`. Desligar por conexão:
switch "Sincronização automática" em `/integrations/shopee` (chama
`integration-update-settings` → `update integration_connections set
auto_sync_enabled = false`), ou o mesmo `update` via SQL. Não mexe em
`next_sync_at`; o botão "Sincronizar" manual continua funcionando.

### 9.2 Resultado do teste no banco real da Maluth (28/08)

Números-chave apurados (conexão ativa `efbd3b5b`, salvo indicação):

| Métrica | Valor | Bug |
|---|---|---|
| `fees_linhas` = `fees_distintas` (antes e depois de 2 syncs) | 4972 = 4972 | BUG-12 morto |
| `fees` com `order_id` nulo | 2637 / 4740 (56%) | BUG-14 |
| `payments` escrow com `net_amount` 0/nulo | 2 / 1016 | `escrow_amount` confiável |
| Coorte de receita (`COMPLETED`, criado ≤15d) | 16 pedidos · R$ 603,05 | BUG-03a |
| Coorte de taxa (`fee_date` ≤15d) | ~30 pedidos · R$ 647,99 | BUG-03a + BUG-10 |
| `commission` + `service_fee` + `shipping_fee` (15d) | 183,17 + 144,30 + 320,52 = **647,99** | bate com o card |
| `adjustment` "Rebate frete Shopee" (15d, ignorado) | R$ 241,08 | BUG-03b |
| Linhas por `fee_type` na janela | exatamente **30** cada | BUG-10 (`.slice(0,30)`) |
| Conexões para a loja `1427450574` | 2 (`user_id` distintos) | BUG-15 |

### 9.3 Pós-Commit 1 — número correto validado (28/08)

Depois do deploy do `3272f29` + sync da Maluth:

| Métrica | Antes (buggy) | Depois (Commit 1) |
|---|---|---|
| `fees` total (efbd3b5b + 929c33cc) | 4972 | 6404 |
| `fees` órfãs na janela de 15d | ~todas | **0** |
| `fees` órfãs históricas (>30d) | — | 2607 (pendente backfill `days: 180`) |

**Coorte (a)** — `COMPLETED` + `order_updated_at` ≥ 15d:

| | valor |
|---|---|
| Pedidos concluídos | 315 |
| Faturamento (Σ `total_amount`) | R$ 10.460,80 |
| **Valor Líquido (Σ `escrow_amount`)** | **R$ 6.473,17** |
| Margem | 61,9% |
| Em trânsito (receita a caminho) | 101 |

Consistência: a coorte "criado na janela" dá 4006/6468 = **61,9%** — mesma
margem, valida a economia. O card mostrava `−R$ 44` → era 100% bug de agregação.
O Commit 3 troca a agregação por essa coorte.

Queries e protocolo: seção 12.1.

---

## 10. Critérios de aceite globais

- Zero cálculo financeiro inline em componente React.
- Zero `number` cru representando dinheiro fora da camada de apresentação.
- Função pura de cálculo, isolada e testável, para cada tela.
- Testes unitários cobrindo, no mínimo:
  - Os três cenários da seção 2.2 — devem continuar dando 20,0% de margem.
  - Modo "Por Preço": preço fixo 88,45, afiliados 10% → 0%, margem sobe para 30,0%.
  - **Simetria:** dado o preço que o modo "Por Margem" sugeriu, o modo "Por Preço"
    deve devolver a margem original. São inversos exatos.
  - Tela A com dados reais da Maluth Store, resultado corrigido.
  - Lucro zero e lucro negativo (imposto não aplicado).
  - Pedido com frete subsidiado pela Shopee.
  - Margem desejada inviável (soma de percentuais ≥ 100%).
  - Rateio: soma das partes = total, sem centavo perdido.
  - Parser de entrada: `"88,45"`, `"88.45"`, `"R$ 88,45"`, `"1.234,56"`.
- Teste de consistência que roda os mesmos inputs pelas duas telas e falha se a
  definição de imposto divergir.

---

## 11. Restrições de trabalho

- **Não rodar migrations.** Escrever e apresentar.
- **Não alterar** a fórmula de precificação validada na seção 3.1.
- Não mexer em layout, estilo ou copy fora do que está listado aqui.
- Commits atômicos: um por bug. A padronização em centavos pode ser um commit
  maior, mas separado dos bugs.
- Se o levantamento revelar que alguma premissa deste documento está errada,
  **dizer na hora** em vez de adaptar o plano silenciosamente — e atualizar este
  arquivo no mesmo commit.

---

## 12. Antes de começar

Congelar os números atuais num fixture: pegar o payload real da Maluth Store,
salvar como JSON no repo, usar como base dos testes. **Sem isso não há como provar
que a correção corrigiu — só que os números mudaram.**

### 12.1 Teste de idempotência (BUG-12) — ✅ EXECUTADO 28/08

**Resultado: sem duplicação** (ver BUG-12 e seção 9.2). Antes/depois de 2 syncs:
`fees` 4972→4972, `fees_distintas` 4972→4972, zero duplicata. As queries abaixo
ficam registradas para reuso.

O `get_escrow_detail` bruto **não é logado hoje** (`integration-sync/index.ts`
loga só `get_order_detail` na linha 348). Para capturar o fixture (etapa 6 da
seção 8): adicionar log **filtrado** dos campos financeiros (não o objeto
inteiro — traz nome/endereço/telefone do comprador), deployar, sincronizar, ler
nos logs da Edge Function. Order_sns necessários: ≥1 liberado, ≥1 `COMPLETED`
não liberado (para responder o que a Shopee devolve num pedido sem repasse).

**Protocolo:**
1. Desligar o auto-sync da Maluth (switch em `/integrations/shopee` ou o `update`
   da seção 9.1-B). Anotar o horário.
2. Rodar o bloco SQL abaixo com `momento = 'antes'`. Conferir `0-conexao` = 1.
   Copiar o resultado inteiro.
3. `/gestao` → Shopee → **Sincronizar** (15d). Aguardar. Repetir uma 2ª vez.
4. Trocar `'antes'` → `'depois'`, rodar de novo, copiar.
5. Comparar. Se `*_DUPLICATAS` > 0 ou `fees_linhas` cresceu → BUG-12 (duplicação).
   Se estáveis → confirma a expectativa: causa é o descasamento de coorte
   (`fees_15d_de_pedido_FORA_da_janela` + `fees_orfas_sem_escrow_15d`).
6. Religar o auto-sync.

`fee_type` da query 3 usa a lista real conferida (seção 3.5). Datas com
`::timestamptz` porque as colunas podem estar como `text` — se der erro de tipo,
são `text` e há mais um problema a registrar.

```sql
with
p as (
  select 'antes'::text as momento          -- <<<<<< troque para 'depois' na 2ª rodada
),
conn as (
  select id from integration_connections
  where provider = 'shopee'
    and shop_name ilike '%maluth%'          -- ajuste se necessário
),
r as (
  select '0-conexao'::text as secao, 'conexoes_casadas'::text as metrica,
         (select count(*)::numeric from conn) as valor,
         (select string_agg(id::text, ', ') from conn) as detalhe

  union all
  select '1-contagem','fees_linhas',
         (select count(*)::numeric from fees where integration_id in (select id from conn)), null::text
  union all
  select '1-contagem','fees_chaves_distintas',
         (select count(distinct external_fee_id)::numeric from fees where integration_id in (select id from conn)), null::text
  union all
  select '1-contagem','fees_DUPLICATAS',
         (select (count(*)-count(distinct external_fee_id))::numeric from fees where integration_id in (select id from conn)), null::text
  union all
  select '1-contagem','payments_linhas',
         (select count(*)::numeric from payments where integration_id in (select id from conn)), null::text
  union all
  select '1-contagem','payments_distintos',
         (select count(distinct external_transaction_id)::numeric from payments where integration_id in (select id from conn)), null::text
  union all
  select '1-contagem','payments_DUPLICATAS',
         (select (count(*)-count(distinct external_transaction_id))::numeric from payments where integration_id in (select id from conn)), null::text

  union all
  select '2-fee_repetida', external_fee_id,
         count(*)::numeric, ('aparece '||count(*)||'x')::text
  from fees where integration_id in (select id from conn)
  group by external_fee_id having count(*) > 1

  union all
  select '3-por_tipo_15d', fee_type,
         count(*)::numeric, ('soma=R$ '||round(sum(amount)::numeric,2))::text
  from fees
  where integration_id in (select id from conn)
    and fee_date::timestamptz >= now() - interval '15 days'
  group by fee_type
  union all
  select '3-por_tipo_15d', 'TOTAL_TAXAS (=647,99?)',
         count(*)::numeric, ('soma=R$ '||round(sum(amount)::numeric,2))::text
  from fees
  where integration_id in (select id from conn)
    and fee_date::timestamptz >= now() - interval '15 days'
    and fee_type in ('commission','service_fee','shipping_fee','reverse_shipping_fee')

  union all
  select '4-coorte','orders_completed_15d',
         (select count(*)::numeric from orders o
          where o.integration_id in (select id from conn)
            and o.status='COMPLETED'
            and o.order_created_at::timestamptz >= now() - interval '15 days'), null::text
  union all
  select '4-coorte','pedidos_c_escrow_criados_15d',
         (select count(distinct o.id)::numeric
          from orders o
          join payments pay on pay.order_id = o.id and pay.integration_id = o.integration_id
          where o.integration_id in (select id from conn)
            and pay.payment_method='escrow' and o.status='COMPLETED'
            and o.order_created_at::timestamptz >= now() - interval '15 days'), null::text
  union all
  select '4-coorte','escrow_pagtos_sem_order_id',
         (select count(*)::numeric from payments pay
          where pay.integration_id in (select id from conn)
            and pay.payment_method='escrow' and pay.order_id is null), null::text
  union all
  select '4-coorte','fees_orfas_sem_escrow_15d',
         (select count(*)::numeric from fees f
          where f.integration_id in (select id from conn)
            and f.fee_date::timestamptz >= now() - interval '15 days'
            and f.order_id is not null
            and not exists (
              select 1 from payments p3
              where p3.order_id = f.order_id
                and p3.integration_id = f.integration_id
                and p3.payment_method='escrow')), null::text
  union all
  select '4-coorte','fees_15d_de_pedido_FORA_da_janela',
         (select count(*)::numeric from fees f
          join orders o on o.id = f.order_id and o.integration_id = f.integration_id
          where f.integration_id in (select id from conn)
            and f.fee_date::timestamptz >= now() - interval '15 days'
            and o.order_created_at::timestamptz < now() - interval '15 days'), null::text

  union all
  select '5-receita_15d','revenue_completed_15d (=603,05?)',
         (select coalesce(sum(o.total_amount),0)::numeric from orders o
          where o.integration_id in (select id from conn)
            and o.status='COMPLETED'
            and o.order_created_at::timestamptz >= now() - interval '15 days'), null::text
)
select p.momento, r.secao, r.metrica, r.valor, r.detalhe
from p cross join r
order by r.secao, r.metrica;
```

### 12.2 Retroatividade (Tarefa 4 — pendente de decisão)

Pedido `COMPLETED` pode ser devolvido depois; o escrow ajusta. Em regime de
competência, número de período fechado muda. Verificar se há cache de agregados
por janela (`useShopeeSync` usa React Query com `staleTime`/`gcTime` — cache de
client, não persistido). Estratégia de recálculo a definir — **não implementar
ainda**.