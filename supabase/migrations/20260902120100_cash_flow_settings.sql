-- Âncora da previsão de caixa: o saldo real em conta que o vendedor confirma.
-- A projeção de saldo diário precisa de um ponto de partida — sem isso os
-- deltas (entra X, sai Y) estão certos mas a régua não. O app não tem Open
-- Finance, então o vendedor informa o saldo do banco; a UI pré-preenche com
-- o acumulado que o Fluxo de Caixa já calcula e guarda a data do ajuste pra
-- avisar quando o número está velho.
--
-- Uma linha por usuário (config single-tenant). Sem writes por service_role,
-- sem trigger de proteção de coluna — o dono é o único que lê e escreve.
create table public.cash_flow_settings (
  user_id               uuid primary key references auth.users(id) on delete cascade,
  opening_balance_cents bigint not null default 0,
  opening_balance_date  date not null default current_date,
  updated_at            timestamptz not null default now()
);

alter table public.cash_flow_settings enable row level security;

create policy "cash_flow_settings_all_own" on public.cash_flow_settings
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
