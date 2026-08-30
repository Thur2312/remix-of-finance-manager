-- Cleanup dos constraints/policies redundantes e das uniques single-column
-- arriscadas p/ multi-loja, achados na introspecção que montou o baseline
-- (20260106232520_baseline_integration_core_tables.sql — ver comentários
-- "candidato a drop" / "duplicata exata" lá).
--
-- ⚠️ ORDEM DE APLICAÇÃO: fazer `supabase functions deploy integration-sync`
-- ANTES deste `db push`. A função passou a usar onConflict composto
-- (integration_id, external_*) nos upserts de payments/fees; se este push rodar
-- antes do deploy, a função antiga ainda referencia a unique single-column que
-- este script derruba e o step de payments/fees do sync falha até o deploy.

-- ── 1. Duplicatas exatas (mesma definição que um irmão) ──────────────────────
alter table public.order_items drop constraint if exists uq_order_items_order_item;         -- == order_items_order_id_external_item_id_key
alter table public.payments    drop constraint if exists uq_payments_integration_transaction; -- == payments_integration_external_id_unique

drop policy if exists "users can manage own connections" on public.integration_connections; -- == user_own_integration_connections

-- ── 2. Uniques single-column que quebram multi-loja ─────────────────────────
-- Duas conexões (integration_id distintos) da mesma loja física — ou de contas
-- diferentes — não podem colidir só porque o marketplace reusa um id no seu
-- próprio namespace. O par composto já existe e cobre o caso real de
-- idempotência do sync:
--   payments: payments_integration_external_id_unique (integration_id, external_transaction_id)
--   fees:     índice único fees_external_unique       (integration_id, external_fee_id)
alter table public.payments drop constraint if exists payments_external_transaction_id_key;
alter table public.fees     drop constraint if exists fees_external_fee_id_key;
