-- Relink de fees/payments órfãs cujo pedido JÁ existe no banco.
--
-- Contexto: o backfill de 180 dias trouxe fees da janela 30-90d, mas parte
-- delas foi gravada com order_id = null porque o pedido correspondente entrou
-- num sync posterior (a Fase 4 do integration-sync resolve order_sn -> order_id
-- só contra os pedidos vistos naquela execução; escrows antigos não são
-- re-buscados, então a fee nunca relinkava). Diagnóstico 29/08: das 14.431
-- órfãs de 30-90d, 4.103 têm o pedido presente na MESMA conexão — puro relink,
-- sem chamada de API.
--
-- Idempotente: só toca linhas com order_id null e match único
-- (integration_id + external_order_id é unique em orders). Seguro re-rodar.

-- ── fees ────────────────────────────────────────────────────────────────────
-- external_fee_id = "<order_sn>_<fee_key>"; order_sn não contém "_".
update public.fees f
set order_id = o.id
from public.orders o
where f.order_id is null
  and o.integration_id = f.integration_id
  and o.external_order_id = split_part(f.external_fee_id, '_', 1);

-- ── payments (path escrow) ──────────────────────────────────────────────────
-- external_transaction_id = order_sn direto. O path wallet usa transaction_id
-- (numérico), que não casa com nenhum external_order_id -> não é tocado.
update public.payments p
set order_id = o.id
from public.orders o
where p.order_id is null
  and o.integration_id = p.integration_id
  and o.external_order_id = p.external_transaction_id;
