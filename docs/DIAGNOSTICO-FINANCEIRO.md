# Diagnóstico Financeiro — Seller Finance

> **Status:** levantamento de código em curso, correções não iniciadas.
> **Data:** 27/08/2026 · revisado 27/08/2026 (levantamento do sync Shopee)
> **Escopo:** cálculo financeiro da Gestão Shopee (dashboard) e da Calculadora de Precificação.
>
> **Revisão 27/08 (sync Shopee):** a seção 5 foi resolvida (sem bug de sinal — o
> cliente estava em "Por Margem", queixa = BUG-04 + BUG-05). O BUG-03 foi
> refutado no mecanismo e reescrito como BUG-03a (dominante) + BUG-03b. Novos:
> BUG-10 (truncagem), BUG-11 (precedência de operador), BUG-12 (idempotência —
> expectativa: sem duplicação, ainda a verificar), BUG-13
> (`payments.transaction_date` = hora do sync, não data de negócio).
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

**Correção — regime de competência (decisão do Thur, 27/08):** Valor Líquido =
Σ `escrow_amount` dos pedidos **concluídos no período**, casando `orders` +
`payments` por `order_id`, independente de o repasse já ter caído.

Motivo: o card vizinho é a margem (`líquido ÷ faturamento`). Casar por data de
liberação faria numerador e denominador virem de safras de pedidos diferentes —
a margem subiria quando o vendedor não vende nada e repasses antigos caem.

**Regra dura:** pedido sem dado de repasse **nunca vira zero**. Ou sai do
agregado com contagem de excluídos, ou o resultado carrega flag de incerteza.

`computeShopeeSyncStats` retorna a decomposição, não só o total:
`{ liberado, aLiberar, totalCompetencia, pedidosSemDado }`.

> **Bloqueado por BUG-12.** Corrigir a agregação sobre `fees` possivelmente
> duplicadas não resolve o número. Rodar o teste de contagem (seção 12) primeiro.

### BUG-03b — Frete: rebate não subtraído e `estimated` no lugar de `actual` · MÉDIO

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

Sob a abordagem B (escrow como verdade), o frete deixa de entrar no cálculo do
líquido — vira apenas decomposição visual. Mas a decomposição precisa estar
certa, senão engana o usuário. Corrigir a **captação** para trazer os campos e
gravar o frete líquido.

### BUG-04 — Painel "MARGEM REAL" é tautológico no modo "Por Margem"

Em modo "Por Margem", a margem é **entrada** (slider), não resultado. O painel
apenas ecoa o slider — sempre exibirá 20,0%, mexa o usuário no que mexer. Chamar
de "real" (apuração) algo que é input torna o indicador vazio.

Verificar: existe **algum** caso em que "Margem real" difere de "Margem desejada"
dentro desse modo? Se não, o painel precisa sair dali.

### BUG-05 — A ferramenta escolhe uma decisão de negócio em silêncio

Origem da queixa do cliente. Quando um custo desaparece (afiliados 10% → 0%), há
duas saídas legítimas:

- **Manter o preço** em R$ 88,45 → margem sobe para 30,0% (R$ 26,54/venda)
- **Manter a margem** em 20% → preço cai para R$ 75,44 (−R$ 13,01)

A calculadora aplica a segunda caladamente. O cliente esperava a primeira e leu a
queda de R$ 17,69 → R$ 15,09 como prejuízo. **Nenhuma das duas é errada; a
ferramenta é que precisa mostrar ambas.**

### BUG-06 — A calculadora precifica sem frete

A Tela B projeta 20% de margem; a Tela A mostra a mesma loja em −7%. Não há campo
de custo de envio na precificação. Enquanto isso existir, planejado e realizado
**nunca** vão reconciliar.

Propor (não implementar) como incorporar: campo manual, média histórica da loja
sincronizada, ou tabela por faixa de peso.

### BUG-07 — Divisão por zero no modo "Por Margem"

`preço = custo / (1 − margem − Σ taxas%)`. Com margem desejada 60% + comissão 6% +
imposto 6% + afiliados 10% + campanha, o denominador vai a zero ou negativo →
preço infinito ou negativo. Não há guard.

### BUG-08 — Regra de comissão do TikTok está hardcoded

"Abaixo de R$ 50: 10% + R$ 4,00; a partir de R$ 50: 6% + R$ 6,00" está no código.
O próprio texto da UI admite que varia em campanha. Extrair para configuração por
plataforma, versionada por data de vigência.

Verificar também se o tier é decidido pelo **preço promocional** ou pelo **preço
cheio** — muda a faixa e ninguém percebe.

### BUG-09 — UI, menores

- **Tela A:** seletor diz "Período: 7 dias" mas os cards dizem "Últimos 15 dias
  (sync)". Ou o filtro não repropaga para as queries, ou o label está hardcoded.
- **Tela B:** o valor de "Preço Cheio (calculado)" aparenta renderizar na coluna
  da direita, alinhado ao campo Desconto, enquanto seu label fica órfão na coluna
  da esquerda. Verificar o grid.

### BUG-10 — Perda de dado silenciosa no sync (truncagem) · ALTO

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

Com os 16 pedidos da Maluth Store nenhum teto foi atingido — por isso não
apareceu antes.

**Correção:** paginar tudo até o fim; se um teto de segurança for atingido,
propagar (flag + contagem) em vez de cortar em silêncio.

### BUG-11 — Precedência de operador apaga valor real · ALTO

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

### BUG-12 — Idempotência do sync · PENDENTE DE VERIFICAÇÃO · expectativa: sem duplicação

`syncNow` re-varre sempre os últimos 15 dias (`useIntegrations.ts:107-139`), e o
auto-sync roda a cada N minutos sobre a mesma janela. Se a escrita de `fees` /
`payments` não for idempotente, syncs repetidos **acumulam taxas duplicadas**.

`647,99 ÷ 2 = 323,99` contra receita `603,05` → margem ~46%, plausível para a
loja. Duplicação explicaria o número melhor que o descasamento de coorte.

**O que o código faz** (`integration-sync/index.ts`):
- `payments`: `.upsert({...}, { onConflict: "external_transaction_id" })` (linha 530),
  chave = `orderSn`.
- `fees`: `.upsert({...}, { onConflict: "external_fee_id" })` (linha 559),
  chave = `${orderSn}_${fee.key}` — determinística, sem componente temporal.
- Erros de upsert são **logados e engolidos** (linha 570), não interrompem.
- Janelas se sobrepõem 100% entre execuções.

**Não verificável só pelo repositório:** as tabelas `orders` / `fees` /
`payments` **não estão em nenhuma migration** — foram criadas fora do controle
de versão. Não dá para confirmar se existe `UNIQUE (external_fee_id)` /
`UNIQUE (external_transaction_id)`.

Inferência: se a constraint **não** existisse, o PostgREST devolveria erro
`42P10` em todo upsert com `on_conflict` e **nenhuma** fee seria gravada — mas há
fees na base. Logo a constraint provavelmente existe e o sync é idempotente.
**Confirmar com o teste de contagem (seção 12) antes de mexer na agregação** —
corrigir agregação sobre dado duplicado não resolve o número.

> **Atualização (27/08, revisão do teste):** o auto-sync roda na mesma janela de
> 15 dias a cada 15 min (`pg_cron` → `trigger_auto_sync()`, ver seção 12.1). Se
> houvesse duplicação acumulativa, as taxas já estariam na casa dos milhares, não
> em R$ 647,99 — isso é evidência **contra** duplicação e a favor de a constraint
> `UNIQUE` existir. O teste de contagem continua valendo (barato e definitivo),
> mas a expectativa agora é: **sem duplicação; a causa é o descasamento de coorte
> do BUG-03a.**

### BUG-13 — `payments.transaction_date` não guarda data de negócio · MÉDIO

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

**Investigar depois:** qual campo da Shopee deveria ir em `transaction_date` —
provavelmente `escrow_release_time` (mesmo do `fee_date`) ou `create_time` do
pedido, conforme a semântica que a coluna deva ter.

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
2. **Regime de competência.** Recorte por pedido concluído no período, não por
   data de liberação do repasse. `escrow_amount` é somado ao pedido mesmo que o
   repasse ainda não tenha caído.
3. **Três estados por pedido, nunca dois:**
   - `liberado` → `escrow_amount` real
   - `estimado` → `escrow` estimado pela Shopee
   - `indisponivel` → sem dado
4. **Ausência nunca vira zero.** `indisponivel` sai do agregado com contagem
   (`pedidosSemDado`) ou marca o resultado como incerto. Nada de `?? 0` / `|| 0`
   em valor monetário de pedido.
5. **Retorno é decomposição, não só total:**
   `{ liberado, aLiberar, totalCompetencia, pedidosSemDado }`.
6. **Rótulos sem ambiguidade caixa/competência.** "Faturamento (vendas do
   período)" e "Valor Líquido (pedidos do período)". "Líquido" sozinho foi o que
   deixou o card errado passar.
7. **Fronteira de captação (`integration-sync`).** Payload bruto da Shopee é
   convertido uma vez, na entrada; percentuais e datas normalizados; sem `|| 0`
   sobre soma (BUG-11); paginação sem teto silencioso (BUG-10).

---

## 8. Ordem de execução

| # | Etapa | Status / Bloqueia |
|---|---|---|
| 0 | **BUG-12 — idempotência do sync.** Teste de contagem (seção 12) antes/depois de 2 syncs. Se duplicar, corrigir a escrita. | contamina TODA medição posterior |
| 1 | ~~Verificar o modo "Por Preço" (seção 5)~~ | ✅ feito — sem bug de sinal; cliente em "Por Margem"; queixa = BUG-04 + BUG-05 |
| 2 | Levantamento do código (seção 9) | parcial — sync Shopee levantado; schema e calculadora pendentes |
| 3 | **Decisão do Thur:** base do imposto (BUG-01) | BUG-02, migrations |
| 4 | Captação: BUG-11 (precedência) + BUG-10 (truncagem) + BUG-13 (`transaction_date`). Commit isolado. | não depende de 3 |
| 5 | Fixture: payload real da Maluth Store, congelar JSON (seção 12) | testes de 6 e 7 |
| 6 | `computeShopeeSyncStats` por `order_id` / competência / três estados (BUG-03a) | depende de 0 e 5 |
| 7 | Captação de frete: `actual_shipping_fee`, `buyer_paid_shipping_fee`, frete líquido (BUG-03b) | depende de 5 |
| 8 | Calculadora: BUG-04, BUG-05, BUG-07, BUG-08, BUG-09 | — |
| 9 | Dashboard: BUG-02 (guard imposto sobre negativo), BUG-09 | depende de 3 |
| 10 | Padronização em centavos (seção 6) | depende de 3 |
| 11 | Proposta de frete na precificação (BUG-06) | depende de 8 |

> Etapa 0 vem antes de tudo: qualquer número medido sobre `fees` duplicadas leva
> a conclusão errada.
> Não iniciar a etapa 10 antes da 3. Migration em cima de regra de imposto errada
> custa caro para desfazer.

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

### 12.1 Teste de idempotência (BUG-12) — fazer PRIMEIRO

O `get_escrow_detail` bruto **não é logado hoje** (`integration-sync/index.ts`
loga só `get_order_detail` na linha 348). Para capturar: adicionar
`console.log(JSON.stringify(escrowDetail, null, 2))` após a linha 524 (commit
throwaway, revert depois) e ler nos logs da Edge Function, ou chamar a API
direto com o `access_token` da conexão.

Order_sns necessários: ≥1 liberado, ≥1 `COMPLETED` não liberado, se possível 1
cancelado/devolvido (para o caso retroativo da seção abaixo).

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