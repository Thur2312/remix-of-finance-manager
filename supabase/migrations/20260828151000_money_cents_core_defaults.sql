-- Follow-up de 20260828150000_money_cents_core.sql: as colunas *_cents ficaram
-- NOT NULL sem DEFAULT, então o gerador de tipos do Supabase as marca como
-- obrigatórias no Insert (olha column_default, não sabe que existe trigger) —
-- quebra qualquer INSERT que não passe explicitamente o campo _cents, mesmo a
-- trigger preenchendo. DEFAULT 0 resolve: Postgres aplica o default primeiro,
-- a trigger BEFORE INSERT sobrescreve com o valor real antes do NOT NULL
-- checar. Nenhuma mudança de comportamento, só destrava o TS.

alter table public.orders            alter column total_amount_cents  set default 0;
alter table public.order_items       alter column total_price_cents   set default 0;
alter table public.order_items       alter column unit_price_cents    set default 0;
alter table public.fees              alter column amount_cents        set default 0;
alter table public.payments          alter column amount_cents        set default 0;
alter table public.payments          alter column marketplace_fee_cents set default 0;
alter table public.payments          alter column net_amount_cents    set default 0;
alter table public.payouts           alter column amount_cents        set default 0;
alter table public.cash_flow_entries alter column amount_cents        set default 0;
alter table public.sale_events       alter column total_amount_cents  set default 0;
