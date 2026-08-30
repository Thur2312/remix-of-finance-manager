# Auditoria do sistema + checklist de redesign

> **Data:** 28/08/2026. Varredura de código (back + front) feita direto no repo.
> **Objetivo:** padronizar a base técnica e redesenhar o layout das telas
> internas + a sidebar, sem regressão em fluxo financeiro real (produto em
> produção, usuários pagantes).
>
> Complementa: `DIAGNOSTICO-FINANCEIRO.md` (bugs de cálculo — Commits 1 e 3
> feitos) e `DESIGN-DIRECTION.md` (identidade visual — Fase 1 landing feita, a
> **Fase 2 = app interno** é o que esta auditoria detalha e reprioriza).

---

## 1. Estado atual — o que a varredura achou

### 1.1 Arquitetura / organização

| Achado | Onde | Impacto |
|---|---|---|
| **`formatCurrency` reimplementado 13×** (inline, sempre igual) | `CalculadoraPrecificacao.tsx:40`, `CadastroCustos.tsx:25`, `FluxoCaixaDashboard.tsx:75`, `TikTokPagamentos.tsx:262`, `PaymentCharts.tsx:29`, `SettlementDetailModal.tsx:83`, `CashFlowCharts.tsx:143`, `ImportBankStatementDialog.tsx:82`, `FluxoCaixaLancamentos.tsx:204`, +4 | Formatação diverge, nenhuma testável |
| **Duas pastas pro mesmo conceito:** `components/assistant/` (1 arq) e `components/assistente/` (4 arq) | — | confusão de import |
| **9 componentes shadcn órfãos** (nunca importados): `aspect-ratio`, `context-menu`, `hover-card`, `menubar`, `navigation-menu`, `carousel`, `resizable`, `calendar`, `input-otp` | `components/ui/` | 5 deles quebram o typecheck (deps não instaladas) |
| **`tsc_out.txt`** commitado na raiz (47 bytes, lixo) | raiz | — |
| **`console.log` em produção:** 30 ocorrências no `src/` | espalhado | ruído no console do cliente |
| **Larguras de página inconsistentes:** `max-w-4xl` (6×), `max-w-6xl` (3×), `max-w-3xl` (2×), `max-w-5xl` (1×), e a maioria sem `max-w` nenhum (full-bleed) | `pages/*` | cada tela tem largura própria; o `<main>` do `AppLayout` só tem `p-8`, sem container |
| **`useDREData` / calculadora / sync** — `computeShopeeFinance` unificou o Shopee, mas TikTok e ML ainda têm cada um sua lib (`tiktok-calculations.ts`, `tiktok-settlement-helpers.ts` 682 linhas) | `lib/` | ok por ora, mas o padrão do Shopee deveria valer pros três |

### 1.2 Qualidade / tooling

| Achado | Detalhe |
|---|---|
| **Zero testes** | Nenhum `vitest`/`jest`, nenhum `*.test.*`. O `DIAGNOSTICO-FINANCEIRO.md` seção 10 **exige** testes unitários pro cálculo financeiro — hoje é impossível provar que uma correção não quebrou outra. |
| **TypeScript frouxo** | `strict: false`, `noImplicitAny: false`, `noUnusedLocals: false` (`tsconfig.app.json`). É a raiz dos `as any`, dos erros de `Json` type, e de bugs passarem batido. |
| **Build com 11 erros de typecheck** | 5 UI órfãos (deps radix faltando) + `DisconnectDialog.tsx:42` (handler type) + `EmptyResultsState.tsx:1` (import errado — `ReactNode` de `lucide-react`) + `useCashFlow.ts:342` + `useProdutos.ts` (3× `Json` vs tipo). `vite build` passa (esbuild não typecheca), mas o CI/IDE reclama. |
| **Sem `typecheck` no `package.json`** | scripts: só `dev`, `build`, `build:dev`, `lint`, `preview`. |

### 1.3 Design system / layout (Fase 2 do `DESIGN-DIRECTION`)

O que **já foi feito** desde o `DESIGN-DIRECTION` original (o doc está parcialmente desatualizado):
- ✅ Fontes carregando (`Fraunces` display, `Space Mono` mono, `Inter` corpo) — `index.css:1`.
- ✅ Tokens `--chart-1..5` usados pelos gráficos (`DashboardCharts`, `ResultsCharts`, `DRECharts` já puxam `hsl(var(--chart-N))`).
- ✅ `ThemeProvider` montado (`main.tsx`) + toggle no menu da conta (sidebar) — mas `defaultTheme="light" enableSystem={false}`.
- ✅ Primitivas de layout: `PageHeader`, `InPageNav`, `IconBadge`, `pageTitles.ts` (topbar automático via rota), `TopbarTitleContext` (override dinâmico).
- ✅ `.panel` / `.app-card` (sombra tingida de navy, borda em máscara) — **migração pela metade**: 16 arquivos usam `.app-card` (alias antigo), 10 usam `.panel` (novo). O comentário no `index.css:407` confirma que os aliases seriam removidos "no final".

O que **falta / está quebrado**:

| Achado | Detalhe |
|---|---|
| **App interno usa Inter pra tudo** | `.app-shell .font-display` força `font-display` → Inter dentro do app. `Space Mono` em valores monetários (KPI, DRE, fluxo, calculadora) — item da Fase 2 — **não aplicado** de forma sistemática. `font-mono` aparece em 28 arquivos mas ad-hoc. |
| **`.app-card` vs `.panel` meio-a-meio** | 26 telas, 2 classes com o mesmo visual, aliases nunca removidos. |
| **19 páginas sem `PageHeader`** | Auth, Perfil, Planos, `UnifiedDashboard`, os 3 `*Dashboard` de marketplace, `IntegrationsOverview`, `SetupPayments`, etc. — cada uma monta cabeçalho/espaçamento próprio (ou nenhum). |
| **`AppLayout` sem container** | `<main className="p-8">` — sem `max-width`, sem centralização. Telas largas encostam nas bordas em monitor grande; telas estreitas ficam soltas. |
| **Motion ad-hoc** | `framer-motion` em 20 arquivos, mas sem vocabulário: transição de rota é fade seco (`InternalLayout`), hover-lift só em alguns cards (`.panel-interactive` opt-in), sem stagger em grids, sem contador animado nos KPIs internos (existe só na landing). |
| **`animate-fade-in` / `animate-scale-in`** | Referenciadas em várias telas mas só `animate-fade-up` está no `index.css`; as outras vêm do pacote `tw-animate-css` — funciona, mas é dependência de animação fora do vocabulário Framer. |
| **Empty-states** | 3 implementações (reduziu de mais): `EmptyResultsState` (compartilhado, 7 telas), `OnboardingChecklist` (4 dashboards), card bespoke no `UnifiedDashboard`. |

### 1.4 Backend (Supabase Edge Functions + banco)

| Achado | Detalhe |
|---|---|
| **Tabelas fora do controle de versão** | `orders`, `fees`, `payments`, `order_items`, `integration_connections` **não estão em nenhuma migration**. Impossível auditar tipos de coluna / constraints / RLS pelo repo. |
| **`payments.transaction_date` retroativo** | Commit 1 corrigiu daqui pra frente (`= escrow_release_time`); os `payments` antigos ainda têm a hora do sync — precisa de re-sync amplo. |
| **~2600 `fees` órfãs históricas** | `order_id` nulo (BUG-14). Commit 1 corrige pra janela de 15d; histórico precisa sync `days:180`. |
| **BUG-15 — 1 loja física, 2 contas do app** | `orders`/`fees`/`payments` sem coluna `user_id` — posse via `integration_id`. Dado disputado por corrida de sync. Mitigação: dono desconecta a conta lixo. |
| **`integration-sync` — cron não janelado** | O `pg_cron` chama sem `time_from/to`; teto `escrowBudget=150` por invocação (Commit 1) evita timeout mas não é o ideal. |
| **`get_escrow_detail` bruto sem log** | Fixture do `DIAGNOSTICO` (Pergunta 1: o que a Shopee devolve pra pedido não liberado) ainda em aberto. |
| **Segurança** | `docs/SUPABASE-SECURITY-AUDIT-2026-08-06.md` já existe — conferir se tudo dali foi fechado. |
| **`src/integrations/supabase/types.ts`** (2227 linhas) | Não regenerado após as migrations `sale_events` e multi-loja (`supabase gen types` pendente — hoje tem edições manuais espelhando as migrations). |

### 1.5 Features implementadas mas não fechadas (de sessões anteriores)

| Feature | Estado |
|---|---|
| **Multi-loja Shopee** (`007a30c`+`60f710b`) | Migration aplicada, functions deployadas, **push de git pendente**. |
| **Notificação de venda** (`/vendas` + widget) | Migration aplicada, functions deployadas, **nada commitado**, links externos de pedido não validados. |
| **Landing redesign** (`DESIGN-DIRECTION` Fase 1) | Branch `design/landing-redesign` — não mergeada em `main`. Addendum 5 (escalada de craft P1–P6) não implementado. |
| **Aviso `/admin/notificacoes`** da multi-loja | Texto validado, não publicado. |

---

## 2. Checklist priorizado

Organizado em faixas paralelas. Ordem sugerida dentro de cada faixa. `[ ]` a fazer.

### Faixa A — Fechar o trabalho financeiro (do `DIAGNOSTICO-FINANCEIRO.md`)

- [x] **Commit 1** — captação Shopee (`3272f29`, deployado).
- [x] **Commit 3** (3a/3b/3c) — agregação unificada (`computeShopeeFinance`).
- [ ] **Push** dos commits 3b/3c/doc pendentes → verificar no app (Gerenciar, Unificado, DRE).
- [ ] **BUG-01** — decisão do usuário: base do imposto (Simples Nacional = receita ou lucro?). Trava BUG-02, `TaxSummaryRow`, e a padronização em centavos.
- [ ] **BUG-15** — dono da Maluth desconecta a conta `84cb1d3e`.
- [ ] **Backfill histórico** — sync `days:180` repetido (religa ~2600 fees órfãs).
- [ ] **Commit 2** — BUG-03b: frete real no "Detalhamento de Taxas" (`shopee/Dashboard.tsx` + captação de `actual_shipping_fee`/`buyer_paid_shipping_fee`).
- [ ] **BUG-02** — guard: `applyTaxRate` não aplica imposto sobre resultado ≤ 0 (`useCompanies.ts`). *Depende de BUG-01.*
- [x] **Calculadora (Tela B)** — FECHADA 29/08 (5 commits `34f7a92`..`0dd8eaf`):
  - [x] BUG-08 — `getShopeeRates`/`getTiktokRates`/`getMercadoLivreRates` +
    `calcComissaoTaxaReais` → `src/lib/marketplace-fees.ts` (puro, 14 testes).
    Config versionada-por-data avaliada e descartada (over-engineering).
  - [x] Refactor: `src/lib/pricing.ts` (`apurar`/`precoPorMargem`/`precoPorLucro`/
    `apurarAnuncio`, 15 testes) — mata os cálculos inline + 2 cópias da fórmula
    de apuração de anúncio (critério de aceite "zero cálculo inline em React").
  - [x] Controles mortos: `papelProduto`/`volumeEsperadoProduto`/`margemDesejada`
    não tinham UI. Decisão do usuário: **remover** os cards "Absorção Parcial" e
    "Portfólio Maduro" (+ callout educacional) que rodavam em constantes fixas.
  - [x] BUG-05 — abordagem "desacoplar": preço sugerido vira sugestão + botão
    "Aplicar" (não sobrescreve mais o Preço Promocional sozinho). *Queixa do cliente.*
  - [x] BUG-07 — slider com `max` dinâmico + aviso de margem inviável (era guard mudo).
  - [x] BUG-04 — cai junto do BUG-05 (era tautológico *porque* o preço era auto-escrito).
  - [x] BUG-09 (Tela B) — grid do "Preço Cheio" já tinha sido consertado antes; só
    restava 1 string "15 dias" fixa no tooltip da Tela A (`0dd8eaf`).
  - [ ] BUG-06 (frete na precificação) — continua fora; precisa decisão de como incorporar.
- [ ] **Padronização em centavos** (seção 6 do `DIAGNOSTICO`) — `bigint` do banco à UI, branded type `Cents`, migration **escrita não rodada**. *Depende de BUG-01.*

### Faixa B — Higiene técnica (rápido, sem impacto visual, destrava o resto)

- [x] **`src/lib/format.ts`** (`05f3b9e`) — `formatCurrency` (opt `{whole}`) / `formatCurrencyCompact` / `formatPercent`. 3 libs reexportam (imports antigos intactos), 11 cópias inline removidas + 2 one-offs. `format.test.ts`. `ExportSection` fora (CSV cru, de propósito).
- [x] **Deletar os 9 componentes UI órfãos** (`1e30129`) — + `tsc_out.txt` + gitignore. typecheck 11 → 6.
- [x] **Zerar erros de typecheck** (`e11f4ba` + `cf1f88d`) — **11 → 0**. `EmptyResultsState` (ReactNode de 'react'), `DisconnectDialog` (MouseEvent), `useCashFlow` (strip `category` do `.update()` — era bug latente), `useProdutos` (helper `toAnuncioRow()` p/ a ponte jsonb↔shape concreto).
- [x] **`package.json`** — `typecheck` + `test` + `test:watch` já adicionados (sessão anterior, Vitest).
- [x] **`tsconfig.app.json` — `strict: true`** (`da30e4a`, `8634a95` + flip). 43 erros resolvidos em 3 commits: normalizadores de settings nullable na fronteira de leitura, guards de payload dos tooltips recharts, `findColumnValue` retorno honesto, casts explícitos nos `fetchAllTikTok*`. `noUnusedLocals`/`noUnusedParameters` seguem `false` (fora do escopo). typecheck 0.
- [x] **Vitest** — instalado, 7 arquivos / 65 testes (`money`, `tax`, `calculations`, `dre-calculations`, `tiktok-calculations`, `shopee-sync-status`, `format`). Falta: fixture com JSON real da Maluth congelado.
- [x] **Limpar `console.log`** (`2c00176`) — `src/lib/logger.ts` (`logger.debug`, só em dev); 30 viraram `logger.debug`, 3 de debug puro removidos. Bônus: `import { types } from 'util'` morto removido de `tiktok-settlement-helpers`. `tsc_out.txt` → `1e30129`.
- [x] **`components/assistente` → `assistente-anuncio`** (`fccf19b`) — NÃO era dup do `assistant/` (chat financeiro); features diferentes. Renomeado pra bater com a página/rota (`AssistenteAnuncio` / `/assistente-anuncio`). +2 órfãos deletados (`GeneratedImageGrid`, `ImageGenerationSection`, 0 imports desde fev/2026).
- [ ] **`supabase gen types`** — regenerar `types.ts` (depois de confirmar migrations no ar).

**Estado da Faixa B (28/08):** essencialmente fechada. Restam só (a) `strict: true`
incremental — trabalho grande, melhor sessão dedicada; (b) `supabase gen types` —
tarefa do usuário (Git Bash). typecheck 0, 65 testes, build limpo. Pré-requisito
da Faixa C satisfeito.

### Faixa C — Design system + layout das telas internas (o redesign)

> Pré-requisito: Faixa B feita. **Decisões travadas (29/08):** dark mode **removido**
> (app light-only); chrome (sidebar+topbar) vira **navy `#0A1628`**; escopo desta
> rodada = **C.1 + C.2** (DataTable fica de fora). Sequência: C.1 inteiro (1-6),
> validar rodando, depois C.2. Indicador forte de item ativo da sidebar +
> tipografia dos rótulos de grupo + estado colapsado → **Faixa D**.

**C.1 — Fundação (6 commits atômicos, ordem por risco)**
- [ ] **1. Remover dark mode** — apaga `.dark {}` do `index.css` (~60 linhas);
  `main.tsx` sem `<ThemeProvider>`; `AppSidebar` sem o toggle (+ imports
  `useTheme`/`Moon`/`Sun`); `sonner.tsx` `theme="light"` fixo. Os ~10 arquivos
  com classe `dark:` ficam inertes (limpar quando passar em cada tela).
- [ ] **2. Chrome navy** — `--sidebar-*` do `:root` viram navy (`bg 216 55% 9%`,
  `fg 214 20% 82%`, `accent 215 45% 15%`, `border 215 35% 18%`, `--sidebar-primary`
  mantém azul de marca). Topbar segue sozinho (já usa `bg-sidebar`). Revisar
  contraste no navy: `PlanBadge`, `AvatarFallback`, badge "Vendas", divisórias,
  `SidebarTrigger`. Logo já funciona em navy (Footer/AuthShell). **Item ativo
  continua só `bg` nesta rodada** — barra lateral é Faixa D.
- [ ] **3. Fraunces no app** — `.app-shell .font-display` para de forçar Inter →
  vira **Fraunces** (Space Grotesk fica landing/auth). Aplica `font-display` só
  em heading (topbar h1, PageHeader, títulos de card selecionados). Nunca em
  corpo/tabela/número.
- [ ] **4. `.app-card` → `.panel`** — 16 arquivos, `app-card`→`panel` /
  `app-card-quiet`→`panel-quiet`; remove o alias dos seletores no `index.css`.
- [ ] **5. `<Money>` + Space Mono** — `src/components/ui/money.tsx`
  (`<Money reais={} />` / `<Money cents={} />` / `size="lg"`, envolve o
  `formatCurrency`/`formatCents` do `src/lib`). Aplica tela a tela (1 commit por
  grupo): DRE, Fluxo de Caixa, Calculadora, 3 dashboards de marketplace,
  cards do `computeShopeeFinance`.
- [ ] **6. Escala de espaçamento** — seção `space-y-8`, bloco `space-y-4`, campo
  `space-y-2`. Aplica deliberado nas telas principais, não find/replace global.
- [~] **`AppLayout` container** — FEITO (`c627a65`): `<main>` com
  `max-w-[1400px] mx-auto p-8`.
- [~] **accent dourado no app** — tokens (`--gold`, `--accent-gold`) já existem;
  aplicar no item 5/6 (margem/lucro positivo em destaque) e no que a Faixa D pedir.

**C.2 — Componentes de página**
- [ ] **`PageShell`** — um wrapper único: `<PageShell title icon action tabs>{children}</PageShell>` que resolve container + `PageHeader` + `InPageNav` + espaçamento. Migrar as 19 páginas sem header.
- [ ] **`StatCard` / `KpiRow`** — hoje cada dashboard monta os cards à mão (`shopee/Dashboard.tsx`, `IntegrationManage.tsx`, `UnifiedDashboard.tsx` — 3 layouts diferentes de "4 cards de número"). Um componente só, com slot de delta e de nota.
- [ ] **Empty-state** — consolidar em `<EmptyState variant="onboarding" | "no-data" | "no-connection" action={}>`. Absorver o card bespoke do `UnifiedDashboard`.
- [ ] ~~**`DataTable`**~~ — **fora desta rodada** (vira sub-projeto próprio):
  Resultados/Variações/Pagamentos (Shopee/TikTok/ML — ~730 linhas cada).
- [ ] **`SectionCard`** — padronizar o "card com título + descrição + conteúdo" (hoje `<Card><CardHeader><CardTitle>` repetido com espaçamentos diferentes).

**C.3 — Motion (vocabulário, só Framer — sem GSAP no app)**
- [ ] **Easing de assinatura** — `[0.16, 1, 0.3, 1]` (expo-out) como padrão único, substituindo `easeOut` / `transition-all duration-300` (mesmo P1 do `DESIGN-DIRECTION` addendum, aplicado ao app).
- [ ] **Hover-lift** padrão em cards navegáveis e botões primários (`translateY(-2px)` + sombra), tap `scale(0.97)`.
- [ ] **Stagger** na entrada de grids de KPI/card (dashboard).
- [ ] **Contador animado** nos KPIs financeiros internos (`useSpring`) — já existe na landing (`AnimatedStat`), reaproveitar.
- [ ] **Transição de rota** — trocar o fade seco do `InternalLayout` por um fade+slide leve com o easing de assinatura.

### Faixa D — Sidebar

- [ ] **Revisar a hierarquia visual** — hoje: logo centralizado, 4 grupos (`Visão Geral` / `Dia a Dia` / `Financeiro` / `Ferramentas`), divisórias `h-px`, item ativo com `bg-sidebar-accent`. Funciona, mas é "shadcn sidebar padrão".
- [ ] **Item ativo** — indicador mais forte (barra lateral colorida + peso), não só background.
- [ ] **Rótulos de grupo** — tipografia (hoje `text-[10px] uppercase tracking-wider text-muted-foreground/70` — genérico).
- [ ] **Estado colapsado** — revisar (ícone + tooltip); o logo troca de tamanho mas o resto fica apertado.
- [ ] **Footer (conta)** — o `DropdownMenu` com avatar + nome + email + chevron está ok; o `PlanBadge` acima e o toggle de tema **dentro** do dropdown (não óbvio). Considerar tema como item visível.
- [ ] **Badge de "Vendas"** (contador de vendas não vistas) — hoje `text-[9px] text-warning bg-warning/15` — alinhar ao novo sistema de cor.
- [ ] **Cor do "chrome"** — o `DESIGN-DIRECTION` propôs sidebar/topbar em navy `#0A1628`; hoje `index.css` diz que voltou pra "superfície quase-branca diferenciada só por borda". Decidir: navy (mais marca) ou branco (mais leve). É token (`--sidebar-*`), muda tudo de uma vez.
- [ ] **`NotificationBell` na topbar** — só admin usa; esconder pra não-admin ou dar uso real.

### Faixa E — Fechar features pendentes (de sessões anteriores)

- [ ] **Push** dos commits `007a30c` + `60f710b` (multi-loja Shopee).
- [ ] **Commit + push** da notificação de venda (`/vendas`) — e validar os links externos de pedido (Seller Center Shopee / "Minhas vendas" ML).
- [x] **Publicar o aviso** da multi-loja — migration `20260828180000_notice_multi_shopee.sql` (segmento `shopee_connected`, type `feature`). Aplica no próximo `db push`.
- [ ] **Landing** — decidir: mergear `design/landing-redesign` em `main`, e se implementa o Addendum 5 (P1–P6 craft) do `DESIGN-DIRECTION`.
- [ ] **Deletar branch remota** `feature/shopee-webhook` se morta.

### Faixa F — Backend / dados / segurança

- [x] **Capturar as tabelas em migration** — `20260106232520_baseline_integration_core_tables.sql` (snapshot por introspecção, sem Docker — ver `docs/schema-introspection-queries.sql`). Cobre as 5 tabelas + colunas `_cents` + triggers + índices + RLS. **Falta o usuário rodar** `supabase migration repair --status applied 20260106232520 --linked` (marca como aplicada sem executar; prod já tem tudo). Guard defensivo add em `20260826160000` p/ replay em base limpa. Achados: constraints/policies duplicadas (`uq_order_items_order_item`, `uq_payments_integration_transaction`, policy `"users can manage own connections"`) e uniques single-column arriscados p/ multi-loja (`fees_external_fee_id_key`, `payments_external_transaction_id_key`) — cleanup em migration própria depois.
- [x] **Confirmar `SUPABASE-SECURITY-AUDIT-2026-08-06.md`** — já é checklist com status (revisão 28/08): achados 1/2/4/5 fechados por migration, 6 corrigido (**precisa deploy `integration-auth-start`**), 7 é por design. Resta só o achado 3 (~15 tabelas menos sensíveis fora de migration) — precisa `db dump` (Docker) ou mais queries de introspecção; as 5 core + os dados sensíveis já estão cobertos.
- [x] **Cleanup dos constraints redundantes** (`20260829130000_cleanup_redundant_constraints.sql`) — dropa as 2 duplicatas exatas (`uq_order_items_order_item`, `uq_payments_integration_transaction`) + a policy duplicada + as 2 uniques single-column arriscadas p/ multi-loja (`payments_external_transaction_id_key`, `fees_external_fee_id_key`). O `integration-sync` passou a usar `onConflict` composto. **Ordem: deploy `integration-sync` ANTES do `db push`.**
- [x] **`trigger_auto_sync` — CAUSA RAIZ ACHADA (29/08, `64788fc`).** O auto-sync
  de TODOS os clientes estava morto há meses: a função mandava `cron_secret`
  `'sellerfinance-cron-2026'` hardcoded, mas o `integration-sync` foi refatorado
  pra validar contra a env var `INTEGRATION_SYNC_CRON_SECRET`. Não batia → 401
  silencioso (fire-and-forget `net.http_post`). Migration `20260829150000`
  versiona a função + lê o secret do vault. **Correção imediata:** `supabase
  secrets set INTEGRATION_SYNC_CRON_SECRET=sellerfinance-cron-2026`.
- [ ] **`integration-sync` cron janelado** (o `time_from/to`, não o secret) — segue
  aberto mas baixa prio: `escrowBudget=150` só morde vendedor com >150
  repasses/15min sustentado. Backfill manual usa o seletor 90/180d (`e689e4e`).
- [ ] **Fixture do `get_escrow_detail`** — INTERATIVO: patch de log → deploy (usuário) → usuário captura 1 JSON liberado + 1 não liberado → congela → reverte. Não dá pra fazer sem o usuário no loop. Backlog.
- [~] **`transaction_date` retroativo** — o backfill `days:180` (seletor novo) corrige; usuário rodando o sync em 29/08, confirmar resultado.
- [~] **Aplicar o padrão `computeShopeeFinance` a TikTok e ML** — reavaliado 28/08: os 3 marketplaces têm dados estruturalmente diferentes (Shopee OAuth = escrow + fees itemizadas; ML = taxa/frete já em R$ absoluto no pedido; TikTok = estimativa por config, settlements num upload à parte). Forçar 1 função só = adaptadores pesados + risco em 3 telas de cliente pagante. **Feito no lugar:** varredura de correção real — achado e corrigido em `31ed3d3` a **dupla tributação** nos dashboards Shopee (path manual) e TikTok (`lucro_reais` embutia `settings.imposto_nf_saida` E o `TaxSummaryRow` tributava de novo por empresa). ML e path sync do Shopee já estavam limpos. **Resta:** retirar `settings.imposto_nf_saida` de vez (TikTokResultados/Variacoes ainda usam) — modelo de imposto antigo vs `companies.tax_rate`/`applyTax`.

---

## 3. Ordem macro sugerida

1. **Faixa A** até o BUG-01 (o usuário decide) + **Faixa E** push das features prontas — destrava o `main`.
2. **Faixa B** inteira — higiene, testes, typecheck. É a fundação de tudo.
3. **Faixa F** baseline de migration + fixture — antes de mexer mais no backend.
4. **Faixa C** — design system, do fundamento (C.1) pros componentes (C.2) pro motion (C.3).
5. **Faixa D** — sidebar (pode ir junto com C.1, é o mesmo trabalho de token).
6. Resto da Faixa A (calculadora, centavos) conforme o BUG-01 sair.

> Nada de Faixa C/D antes da Faixa B: redesenhar layout com 11 erros de
> typecheck e zero testes é construir em cima de areia.
