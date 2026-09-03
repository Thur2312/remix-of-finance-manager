-- Bloco D das diretrizes do dashboard — separação Empresa → Loja → Plataforma.
--
-- O usuário opera 2+ CNPJs com contabilidade separada. Hoje `companies` só
-- guarda o modelo de imposto e nada é atribuído a uma empresa. Este é o
-- esqueleto de escopo:
--   - Loja = uma conexão de marketplace (integration_connections). Ganha
--     company_id: a empresa dona daquela conta de vendedor.
--   - Custo fixo ganha `scope` + o vínculo correspondente: geral (rateado por
--     faturamento), exclusivo de uma empresa, de uma loja, ou de uma plataforma.
--   - Anúncio (precificação manual) ganha company_id pra filtrar a Precificação.
--
-- Tudo nullable, sem backfill (padrão das migrations recentes). RLS segue por
-- user_id — company_id é coluna de escopo, não multi-tenancy.

-- ── Loja → Empresa ──────────────────────────────────────────────────────────
alter table public.integration_connections
  add column if not exists company_id uuid references public.companies(id) on delete set null;

create index if not exists integration_connections_company_idx
  on public.integration_connections (company_id) where company_id is not null;

comment on column public.integration_connections.company_id is
  'Empresa (CNPJ) dona desta conta de vendedor. null = não atribuída (cai no consolidado).';

-- ── Custo fixo: escopo + vínculo ────────────────────────────────────────────
alter table public.fixed_costs
  add column if not exists scope text not null default 'geral',
  add column if not exists company_id uuid references public.companies(id) on delete cascade,
  add column if not exists integration_id uuid references public.integration_connections(id) on delete cascade,
  add column if not exists marketplace text;

alter table public.fixed_costs drop constraint if exists fixed_costs_scope_check;
alter table public.fixed_costs add constraint fixed_costs_scope_check
  check (scope in ('geral', 'empresa', 'loja', 'plataforma'));

comment on column public.fixed_costs.scope is
  'geral = toda a operação (rateado por faturamento) | empresa | loja | plataforma. Define qual dos vínculos abaixo vale.';

-- ── Precificação por empresa ────────────────────────────────────────────────
alter table public.anuncios
  add column if not exists company_id uuid references public.companies(id) on delete set null;

comment on column public.anuncios.company_id is
  'Empresa (CNPJ) a que este anúncio de precificação pertence. Opcional.';
