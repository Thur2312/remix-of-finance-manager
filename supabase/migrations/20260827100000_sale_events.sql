-- Notificação de venda nova (widget no Dashboard + página /vendas). O evento
-- dispara quando um pedido aparece PELA PRIMEIRA VEZ em `orders` (não quando
-- muda pra status pago/completo) — se exigisse status final, a notificação
-- quase nunca dispararia: Shopee nasce UNPAID/READY_TO_SHIP e só vira
-- COMPLETED dias depois, ML nasce payment_required e só vira paid depois;
-- quando o status finalmente muda, a linha já existe há dias, não é mais
-- "nova". O status vai como metadado só pra exibir badge (Pago/Pendente/
-- Cancelado) na UI — não redefine o que conta como receita reconhecida
-- (isso continua sendo isShopeeRevenueStatus, usado por Dashboard/DRE).
create table public.sale_events (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  integration_id     uuid not null references public.integration_connections(id) on delete cascade,
  order_id           uuid references public.orders(id) on delete set null,
  provider           text not null check (provider in ('shopee', 'mercadolivre')),
  external_order_id  text not null,
  status             text not null,
  total_amount       numeric not null default 0,
  currency           text not null default 'BRL',
  buyer_username     text,
  product_name       text,
  order_created_at   timestamptz not null,
  detected_at        timestamptz not null default now(),
  seen_at            timestamptz,
  created_at         timestamptz not null default now(),
  -- torna o insert idempotente: o sync Shopee (cron a cada 15 min) rescaneia
  -- a mesma janela de create_time repetidamente, o mesmo pedido aparece em
  -- orderDetails.order_list várias vezes nos dias seguintes.
  unique (integration_id, external_order_id)
);

create index sale_events_user_recent_idx
  on public.sale_events (user_id, order_created_at desc);

create index sale_events_user_unseen_idx
  on public.sale_events (user_id)
  where seen_at is null;

alter table public.sale_events enable row level security;

-- Só leitura e "marcar como visto" pelo client — inserts são exclusivamente
-- via service_role nas edge functions (integration-sync, mercadolivre-webhook).
create policy "sale_events_select_own" on public.sale_events
  for select to authenticated
  using (user_id = auth.uid());

create policy "sale_events_update_own" on public.sale_events
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- A policy de update acima, sozinha, deixaria o client alterar QUALQUER
-- coluna da própria linha (não só seen_at) — mesmo problema que
-- 20260725120000_protect_paywall_columns.sql corrigiu pra profiles.plan.
-- Reaproveita o mesmo padrão: reverte tudo exceto seen_at fora de contexto
-- service_role.
create or replace function public.protect_sale_events_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  if auth.role() is distinct from 'service_role' then
    new.user_id := old.user_id;
    new.integration_id := old.integration_id;
    new.order_id := old.order_id;
    new.provider := old.provider;
    new.external_order_id := old.external_order_id;
    new.status := old.status;
    new.total_amount := old.total_amount;
    new.currency := old.currency;
    new.buyer_username := old.buyer_username;
    new.product_name := old.product_name;
    new.order_created_at := old.order_created_at;
    new.detected_at := old.detected_at;
    new.created_at := old.created_at;
  end if;
  return new;
end;
$function$;

create trigger protect_sale_events_columns_trigger
  before update on public.sale_events
  for each row
  execute function public.protect_sale_events_columns();
