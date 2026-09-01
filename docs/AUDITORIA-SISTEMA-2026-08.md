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
  - [x] BUG-04/05/07 — idas e voltas 31/08: `3313017` removeu os modos "Por
    Margem"/"Por Lucro" inteiros → cliente quis de volta (a queixa real era a
    **Margem Real travando** ao tirar taxa) → `b8cbd60` traz os modos + slider
    **sem o botão "Aplicar"** e sem auto-preenchimento. Sem nada copiando o
    preço, Margem Real = `1 − custosFixos/preço − Σtaxas%` (3 testes novos
    travam a proporção inversa). "Preço para essa margem/lucro" fica como texto.
  - [x] BUG-09 (Tela B) — grid do "Preço Cheio" já tinha sido consertado antes; só
    restava 1 string "15 dias" fixa no tooltip da Tela A (`0dd8eaf`).
  - [~] BUG-06 (frete) — implementado (`e2ec795`) e **REVERTIDO 31/08 (`3313017`)**;
    cliente não quis. Campo + coluna `anuncios.frete` removidos (migration
    `20260831120000_drop_anuncios_frete.sql`).
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

**C.1 — Fundação (commits atômicos, ordem por risco)**
- [x] **1. Remover dark mode** (`f68ebdc`) — `.dark {}` fora do `index.css`;
  `main.tsx` sem `<ThemeProvider>`; `AppSidebar` sem toggle; `sonner.tsx`
  `theme="light"`. `next-themes` vira dep não usada. ~10 arquivos com `dark:`
  ficam inertes (limpar tela a tela).
- [x] **2. Chrome navy** (`ac6a0a7`) — `--sidebar-*` do `:root` navy
  (`bg 216 58% 9%`, `fg 214 20% 76%`, `accent 214 42% 16%`, `primary 211 90% 62%`).
  Topbar + shadcn Sidebar seguem sozinhos; `SidebarInset` mantém `bg-background`.
  Rótulos de grupo: `text-muted-foreground/70` → `text-sidebar-foreground/45`.
  PlanBadge/NotificationBell já eram navy-ready. **Item ativo = só `bg` (barra
  lateral é Faixa D). Verificação visual pendente.**
- [x] **3. Fraunces no app** (`79674a6`) — `.app-shell .font-display` = Fraunces
  (Space Grotesk fica landing/auth). PageHeader título → `font-semibold
  text-[1.65rem] leading-tight`.
- [x] **4. `.app-card` → `.panel`** (`5d74552`) — 15 páginas + aliases fora do CSS.
- [x] **5. `<Money>` + Space Mono** — 5a (`14c4eb7`) + **5b FEITO (31/08,
  `e642b0b`)**: dashboards via `<StatCard>` (font-mono tabular-nums);
  `DRESummaryCards` (config guarda `valueCents`, renderiza `<Money cents>`);
  `DRETable` coluna de valor com `tabular-nums`; `FluxoCaixaDashboard` 5 cards →
  `<Money reais>`. **Calculadora deixada como está** — já é mono-consistente
  (`cellBase` tem tabular-nums) e é tela protegida.
- [x] **6. Escala de espaçamento** — satisfeito pelo `<PageShell>` (seção
  `space-y-8` / header→conteúdo, `PageHeader` `space-y-4` título→abas). Campo
  `space-y-2` já era o padrão em todo form. Não vale uma passada "deliberada"
  extra — o ritmo está consistente desde a migração do PageShell.

> **Checkpoint 29/08:** itens 1-4 + 5a feitos (6 commits `f68ebdc`..`14c4eb7`).
> Navy chrome + Fraunces são mudanças visuais grandes — **usuário precisa dar
> pull + rodar + olhar** antes de 5b/6/C.2.
- [~] **`AppLayout` container** — FEITO (`c627a65`): `<main>` com
  `max-w-[1400px] mx-auto p-8`.
- [~] **accent dourado no app** — tokens (`--gold`, `--accent-gold`) já existem;
  aplicar no item 5/6 (margem/lucro positivo em destaque) e no que a Faixa D pedir.

**C.2 — Componentes de página**
- [x] **`PageShell`** — wrapper único `<PageShell icon iconVariant title subtitle action tabs width>{children}</PageShell>`
  que resolve `PageHeader` + `InPageNav` + ritmo vertical (`space-y-8` seção /
  `space-y-4` header→tabs) + largura (`width="narrow"` = `mx-auto max-w-3xl`).
  `src/components/layout/PageShell.tsx`. `PageHeader`/`InPageNav` perderam as
  margens externas próprias (ritmo agora é do shell); `IconBadgeVariant`
  exportado. **Rodada 1 FEITA (31/08):** as **21 páginas que já usavam
  `PageHeader`** migradas (marketplace Resultados/Variações/Pagamentos/Config/
  Upload, Fluxo ×3, DRE, Calculadora, Custos, Vendas, Avisos admin) +
  `animate-fade-in`/`-up` dos wrappers removidos (o `InternalLayout` já faz o
  fade de rota). typecheck 0, 99 testes, build ok.
  **Rodada 2 FEITA (31/08):** 4 telas com cabeçalho ad-hoc → `PageShell` com
  header (`IntegrationsOverview` `Plug`/Integrações · `AssistenteAnuncio`
  `Sparkles` · `Planos` `Sparkles` · `UnifiedDashboard` title "Dashboard" +
  controles no slot `action`) + 4 telas headerless-por-design envolvidas sem
  header, só p/ padronizar o wrapper e tirar `animate-fade-in`
  (`shopee/Dashboard`, `tiktok/TikTokDashboard`, `mercadolivre/Mercadolivre­Dashboard`,
  `Gestao`).
  **Rodada 3 FEITA (31/08):** `Perfil` → `PageShell width="narrow"`; cabeçalho
  saiu do Card, Card virou `.panel bg-card`, cores hardcoded (`bg-blue-50`,
  `text-gray-900`, borda azul dos inputs, botão em gradiente) trocadas por
  tokens/default. `IntegrationManage` → `PageShell` dentro de `mx-auto max-w-4xl`
  (largura preservada, agora centralizado), botão Voltar como 1º filho, card
  "Header da loja" + status cards de emerald/yellow crus → `success`/`warning`.
  **Fora:** `SetupPayments` (paywall centralizado, não é página normal — mantém
  `animate-fade-in`). Indentação profunda pré-existente do corpo do
  `IntegrationManage` não foi mexida (evitar rewrite de 250 linhas).
- [x] **`StatCard` / `KpiRow` (31/08, `90aac70`)** — `src/components/ui/stat-card.tsx`.
  `<StatCard>` (title/value/description/icon+`variant`/loading/`delta` de
  comparação/slot `info` e `children`) + `<KpiRow>` (grid responsivo). Valor em
  `font-mono tabular-nums` (avança C.1 5b). Migrados: UnifiedDashboard (StatCard
  local deletado), shopee/tiktok/ml Dashboard (`stats.map` → arrays com
  `variant`), IntegrationManage (linha "Resumo"). `DRESummaryCards` fica fora
  (grid adaptativo por contagem + ring de destaque — bespoke).
- [x] **Empty-state (31/08, `cf90457`)** — `EmptyResultsState` (que já era o
  compartilhado, 8 telas) renomeado → `<EmptyState>` em
  `src/components/ui/empty-state.tsx`, defaults genéricos, prop `className`.
  Absorveu o card bespoke do TikTok Pagamentos ("Nenhum pagamento importado").
  `OnboardingChecklist` fica separado — é uma **lista de passos**, não uma
  mensagem; é o "variant onboarding" na prática. Não vale forçar os dois no
  mesmo componente.
- [ ] ~~**`DataTable`**~~ — **fora desta rodada** (vira sub-projeto próprio):
  Resultados/Variações/Pagamentos (Shopee/TikTok/ML — ~730 linhas cada).
- [~] **`SectionCard`** — **adiado.** São **81 `<CardHeader>`** no app, com muita
  variação por sítio (ícone no título, ação no header, `pb-3` vs default,
  `text-base` vs `text-lg`). Migração mecânica de 81 pontos em tela de cliente
  pagante = custo alto pra economizar ~4 linhas por uso. `<Card>` do shadcn já é
  composável. Revisitar se um padrão específico doer (princípio N3: "só onde
  dói, COM teste").

**C.3 — Motion (vocabulário, só Framer — sem GSAP no app)** — parte 1 FEITA (31/08, `a43283d`)
- [x] **Easing de assinatura** — `src/lib/motion.ts` (`EXPO_OUT` + presets
  `fadeSlideUp`/`staggerContainer`/`routeTransition`). Ponto único pro JS da área
  interna. `easeOut`/`duration-300` stragglers **não** varridos ainda (sweep
  mecânico, baixa prio).
- [x] **`<MotionConfig reducedMotion="user">`** no root (`main.tsx`) — toda
  animação Framer respeita o `prefers-reduced-motion` sem cada componente checar.
- [x] **Stagger** — `<KpiRow>` faz cascata dos cards na montagem (mount-only).
- [x] **Transição de rota** — fade + slide leve (`y:6`) com o easing; a chave
  passou a ser grossa em `/gestao/*` (a casca de Gestão não dá mais fade a cada
  troca de aba — só o painel, via Suspense).
- [x] **Hover-lift** — `.panel-interactive` (-2px + `:active` + guard
  reduced-motion + `transition` própria) aplicado aos **2 únicos cards de fato
  navegáveis** do app (quick-actions TikTok, cards "Por marketplace" do
  unificado). Botões já tinham `hover:-translate-y-0.5` + `active:scale` (passada
  anterior). `IntegrationCard` não é navegável (botão "Gerenciar" dentro).
- [x] ~~**Contador animado**~~ — **descartado.** Count-up a cada abertura de um
  dashboard (visto N× por dia) irrita mais do que agrega — "animação serve à
  narrativa" (CLAUDE.md); num tool interno não há narrativa aqui. A cascata do
  `<KpiRow>` já dá a entrada polida.

**C.3 essencialmente fechada.** Falta só o sweep mecânico de
`easeOut`/`duration-300` → easing de assinatura (baixa prio).

### Faixa D — Sidebar

- [ ] **Revisar a hierarquia visual** — hoje: logo centralizado, 4 grupos (`Visão Geral` / `Dia a Dia` / `Financeiro` / `Ferramentas`), divisórias `h-px`, item ativo com `bg-sidebar-accent`. Funciona, mas é "shadcn sidebar padrão".
- [ ] **Item ativo** — indicador mais forte (barra lateral colorida + peso), não só background.
- [ ] **Rótulos de grupo** — tipografia (hoje `text-[10px] uppercase tracking-wider text-muted-foreground/70` — genérico).
- [ ] **Estado colapsado** — revisar (ícone + tooltip); o logo troca de tamanho mas o resto fica apertado.
- [ ] **Footer (conta)** — o `DropdownMenu` com avatar + nome + email + chevron está ok; o `PlanBadge` acima e o toggle de tema **dentro** do dropdown (não óbvio). Considerar tema como item visível.
- [ ] **Badge de "Vendas"** (contador de vendas não vistas) — hoje `text-[9px] text-warning bg-warning/15` — alinhar ao novo sistema de cor.
- [ ] **Cor do "chrome"** — o `DESIGN-DIRECTION` propôs sidebar/topbar em navy `#0A1628`; hoje `index.css` diz que voltou pra "superfície quase-branca diferenciada só por borda". Decidir: navy (mais marca) ou branco (mais leve). É token (`--sidebar-*`), muda tudo de uma vez.
- [ ] **`NotificationBell` na topbar** — só admin usa; esconder pra não-admin ou dar uso real.

**Topbar redesenhado (31/08, `17f09ad`):** sticky + frosted (`bg-background/70`
+ `backdrop-blur`, borda fina, 56px); o `<h1>` pequeno saiu (duplicava o do
`PageShell`) e virou **breadcrumbs** ("Grupo › Item › subpágina") derivados de
`navModel.ts` (modelo de nav extraído da `AppSidebar`, agora compartilhado).
`TopbarTitleContext` removido. Container com padding responsivo. Chrome segue
branco (navy continua revertido) — badge de Vendas e `NotificationBell` ainda em
aberto.

### Faixa G — Gestão unificada (`/gestao/:marketplace/:view`)

- [x] **Casca única (31/08, `89ae1d0`).** Antes o seletor de marketplace só
  existia no dashboard; trocar pra Resultados/etc caía numa rota separada sem o
  seletor ("um layout por célula"). Agora `src/pages/gestao/GestaoShell.tsx`
  mantém seletor de marketplace + abas de view sempre montados; só o painel
  troca. Modelo em `marketplaceViews.ts` (lazy por view). Os 11 `*Content` de
  marketplace + 3 `*DashboardContent` perderam o `PageShell`/abas próprios. As
  ~14 rotas antigas viram redirect de bookmark. Trocar de marketplace preserva a
  view se existir no destino (ML não tem Upload → cai no dashboard).
- [ ] **Polir visual** — `MarketplaceControl` foi redesenhado (chips com logo +
  cor de marca no ativo); falta olhar rodando. O `AnimatedOutlet` do
  `InternalLayout` ainda faz fade da casca inteira a cada troca de aba (keyed em
  `location.pathname`) — dava pra keyar mais grosso p/ só o painel animar.
- [ ] **`StatCard`/`KpiRow`** encaixa naturalmente aqui depois (os dashboards de
  marketplace montam a linha de KPIs à mão).

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
- [~] **Aplicar o padrão `computeShopeeFinance` a TikTok e ML** — reavaliado 28/08: os 3 marketplaces têm dados estruturalmente diferentes (Shopee OAuth = escrow + fees itemizadas; ML = taxa/frete já em R$ absoluto no pedido; TikTok = estimativa por config, settlements num upload à parte). Forçar 1 função só = adaptadores pesados + risco em 3 telas de cliente pagante. **Feito no lugar:** varredura de correção real — achado e corrigido em `31ed3d3` a **dupla tributação** nos dashboards Shopee (path manual) e TikTok (`lucro_reais` embutia `settings.imposto_nf_saida` E o `TaxSummaryRow` tributava de novo por empresa). ML e path sync do Shopee já estavam limpos. **Fase 1 FEITA (01/09):** `TikTokResultados`/`TikTokVariacoes` deixaram de aplicar `imposto_nf_saida` (`calculateTikTokResults(..., { includeImpostoSaida: false })`) — telas de análise operacional por produto, imposto passa a viver só no dashboard/DRE. Coluna "Imposto" + linha do CSV removidas; card → "Lucro Operacional (antes do imposto)". **Fase 2 FEITA (01/09, opção D1):** DRE deixou de ler `imposto_nf_saida` — ganhou `CompanySelector`; `calculateDRE` recebe `company` e honra `tax_base` (`revenue`→linha Impostos sobre Vendas; `profit`→linha Impostos sobre Lucro, antes zerada, com guard de prejuízo). `CompanyModal` ganhou seletor de base de cálculo. **Resta (baixa prio):** dropar as 3 colunas `imposto_nf_saida` (`settings` ainda usada pelo path upload manual do Shopee `calculations.ts` + 3 telas de config) + limpar `select` do `financial-assistant`.

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
