-- Bloco D, Fase 2 — `integration_id` em ml_orders / tiktok_orders.
--
-- Essas duas tabelas denormalizadas só tinham `user_id`. Sem a conexão de
-- origem não dá pra atribuir uma venda ML/TikTok a uma loja (integration_connections)
-- e, por tabela, a uma empresa (company_id) — o que a DRE por empresa (stage 4)
-- precisa. Hoje o usuário tem 1 conexão por provider, então o backfill é
-- inequívoco; a coluna fica nullable pra não travar upload/sync legado.

-- ── ml_orders ──────────────────────────────────────────────────────────────
alter table public.ml_orders
  add column if not exists integration_id uuid
  references public.integration_connections(id) on delete set null;

create index if not exists ml_orders_integration_idx
  on public.ml_orders (integration_id) where integration_id is not null;

comment on column public.ml_orders.integration_id is
  'Conexão de marketplace (loja) de origem. null = venda anterior ao stage 2 sem conexão resolvível; entra só no consolidado.';

update public.ml_orders o
set integration_id = c.id
from public.integration_connections c
where c.user_id = o.user_id
  and c.provider = 'mercadolivre'
  and o.integration_id is null;

-- ── tiktok_orders ──────────────────────────────────────────────────────────
alter table public.tiktok_orders
  add column if not exists integration_id uuid
  references public.integration_connections(id) on delete set null;

create index if not exists tiktok_orders_integration_idx
  on public.tiktok_orders (integration_id) where integration_id is not null;

comment on column public.tiktok_orders.integration_id is
  'Conexão de marketplace (loja) de origem. null = venda importada por CSV sem conexão TikTok cadastrada; entra só no consolidado.';

update public.tiktok_orders o
set integration_id = c.id
from public.integration_connections c
where c.user_id = o.user_id
  and c.provider = 'tiktok'
  and o.integration_id is null;
