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
- [ ] **Calculadora (Tela B)** — nunca tocada. Um commit atômico por bug:
  - [ ] BUG-04 — "MARGEM REAL" tautológico no modo "Por Margem" (tirar ou renomear).
  - [ ] BUG-05 — quando um custo some, mostrar as **duas** saídas (manter preço vs manter margem). *Origem da queixa do cliente.*
  - [ ] BUG-07 — guard de divisão por zero no modo "Por Margem".
  - [ ] BUG-08 — comissão TikTok hardcoded → config por plataforma versionada por data.
  - [ ] BUG-09 (Tela B) — grid do "Preço Cheio (calculado)".
- [ ] **Padronização em centavos** (seção 6 do `DIAGNOSTICO`) — `bigint` do banco à UI, branded type `Cents`, migration **escrita não rodada**. *Depende de BUG-01.*

### Faixa B — Higiene técnica (rápido, sem impacto visual, destrava o resto)

- [x] **`src/lib/format.ts`** (`05f3b9e`) — `formatCurrency` (opt `{whole}`) / `formatCurrencyCompact` / `formatPercent`. 3 libs reexportam (imports antigos intactos), 11 cópias inline removidas + 2 one-offs. `format.test.ts`. `ExportSection` fora (CSV cru, de propósito).
- [x] **Deletar os 9 componentes UI órfãos** (`1e30129`) — + `tsc_out.txt` + gitignore. typecheck 11 → 6.
- [x] **Zerar erros de typecheck** (`e11f4ba` + `cf1f88d`) — **11 → 0**. `EmptyResultsState` (ReactNode de 'react'), `DisconnectDialog` (MouseEvent), `useCashFlow` (strip `category` do `.update()` — era bug latente), `useProdutos` (helper `toAnuncioRow()` p/ a ponte jsonb↔shape concreto).
- [x] **`package.json`** — `typecheck` + `test` + `test:watch` já adicionados (sessão anterior, Vitest).
- [ ] **`tsconfig.app.json`** — ligar `strict: true` **incrementalmente** (arquivo a arquivo com `// @ts-nocheck` temporário nos que não passam, ou por pasta). Começar por `src/lib/` e `src/hooks/`.
- [x] **Vitest** — instalado, 7 arquivos / 65 testes (`money`, `tax`, `calculations`, `dre-calculations`, `tiktok-calculations`, `shopee-sync-status`, `format`). Falta: fixture com JSON real da Maluth congelado.
- [x] **Limpar `console.log`** (`2c00176`) — `src/lib/logger.ts` (`logger.debug`, só em dev); 30 viraram `logger.debug`, 3 de debug puro removidos. Bônus: `import { types } from 'util'` morto removido de `tiktok-settlement-helpers`. `tsc_out.txt` → `1e30129`.
- [x] **`components/assistente` → `assistente-anuncio`** (`fccf19b`) — NÃO era dup do `assistant/` (chat financeiro); features diferentes. Renomeado pra bater com a página/rota (`AssistenteAnuncio` / `/assistente-anuncio`). +2 órfãos deletados (`GeneratedImageGrid`, `ImageGenerationSection`, 0 imports desde fev/2026).
- [ ] **`supabase gen types`** — regenerar `types.ts` (depois de confirmar migrations no ar).

**Estado da Faixa B (28/08):** essencialmente fechada. Restam só (a) `strict: true`
incremental — trabalho grande, melhor sessão dedicada; (b) `supabase gen types` —
tarefa do usuário (Git Bash). typecheck 0, 65 testes, build limpo. Pré-requisito
da Faixa C satisfeito.

### Faixa C — Design system + layout das telas internas (o redesign)

> Pré-requisito: Faixa B feita (senão mexer no layout com typecheck quebrado é às cegas).

**C.1 — Fundação (tokens + primitivas)**
- [ ] **Fechar a migração `.app-card` → `.panel`** — trocar os 16 arquivos, remover os aliases do `index.css`. Uma classe só.
- [ ] **`Space Mono` sistemático em valores monetários** — criar `<Money>` / `<Stat>` (ou uma classe `.tabular`) e aplicar em todo KPI/saldo/valor de tabela: DRE, Fluxo de Caixa, Calculadora, os dashboards de marketplace, `computeShopeeFinance` cards. (Item da Fase 2 do `DESIGN-DIRECTION` 2.1/3.)
- [ ] **`AppLayout` com container** — `<main>` ganha `max-w-[1400px] mx-auto` (ou o valor decidido) + responsivo. Remover os `max-w-*` soltos de cada página.
- [ ] **Escala de espaçamento** — decidir 1 ritmo vertical (ex.: seções `space-y-8`, blocos `space-y-4`, campos `space-y-2`) e aplicar. Hoje: `space-y-2` 98×, `space-y-4` 54×, `space-y-6` 46×… sem regra.
- [ ] **`accent` âmbar/dourado** já está nos tokens (`--accent-gold`, `--gold`) — aplicar onde faz sentido no app (margem/lucro positivo em destaque, CTA de maior hierarquia) — hoje só a landing usa.
- [ ] **Dark mode** — decidir: liga de verdade (`enableSystem`, testar as 48 rotas) ou remove o toggle. Meio-termo (toggle que às vezes quebra) é pior que os dois.

**C.2 — Componentes de página**
- [ ] **`PageShell`** — um wrapper único: `<PageShell title icon action tabs>{children}</PageShell>` que resolve container + `PageHeader` + `InPageNav` + espaçamento. Migrar as 19 páginas sem header.
- [ ] **`StatCard` / `KpiRow`** — hoje cada dashboard monta os cards à mão (`shopee/Dashboard.tsx`, `IntegrationManage.tsx`, `UnifiedDashboard.tsx` — 3 layouts diferentes de "4 cards de número"). Um componente só, com slot de delta e de nota.
- [ ] **Empty-state** — consolidar em `<EmptyState variant="onboarding" | "no-data" | "no-connection" action={}>`. Absorver o card bespoke do `UnifiedDashboard`.
- [ ] **`DataTable`** — as telas de Resultados/Variações/Pagamentos (Shopee/TikTok/ML — ~730 linhas cada, muita repetição) compartilham pouco. Extrair a tabela + filtros + paginação num componente. (Grande — pode virar sub-projeto próprio.)
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
- [ ] **Publicar o aviso** `/admin/notificacoes` da multi-loja (segmento "Shopee conectada").
- [ ] **Landing** — decidir: mergear `design/landing-redesign` em `main`, e se implementa o Addendum 5 (P1–P6 craft) do `DESIGN-DIRECTION`.
- [ ] **Deletar branch remota** `feature/shopee-webhook` se morta.

### Faixa F — Backend / dados / segurança

- [ ] **Capturar as tabelas em migration** — `pg_dump` do schema atual (`orders`/`fees`/`payments`/`order_items`/`integration_connections` + RLS + constraints) → migration de baseline no repo. Sem isso não dá pra auditar nem versionar mudança de schema.
- [ ] **Confirmar `SUPABASE-SECURITY-AUDIT-2026-08-06.md`** — checar se todos os itens foram fechados; virar checklist com status.
- [ ] **`integration-sync`** — janelar o caminho do cron de verdade (hoje `escrowBudget=150` por invocação é paliativo) OU migrar pra um job resumível.
- [ ] **Fixture do `get_escrow_detail`** — patch de log temporário (só campos financeiros), capturar 1 pedido liberado + 1 `COMPLETED` não liberado, congelar JSON, reverter o log. Responde a Pergunta 1 do `DIAGNOSTICO`.
- [ ] **`transaction_date` retroativo** — o backfill `days:180` (Faixa A) já corrige, confirmar depois.
- [ ] **Aplicar o padrão `computeShopeeFinance` a TikTok e ML** — hoje cada um tem lib própria; a agregação por competência + escrow/settlement casado por pedido deveria valer pros três (o `DIAGNOSTICO` seção 7 pede "as mesmas primitivas").

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
