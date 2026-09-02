-- Previsão de caixa (Aposta B, Fase 1). Até aqui `payments.transaction_date`
-- guardava a data de APROVAÇÃO/competência do repasse (ML: date_approved;
-- Shopee: escrow_release_time do que já liberou). Nada dizia QUANDO o dinheiro
-- cai/vai cair na mão do vendedor — e é isso que a previsão de caixa precisa.
--
-- O Mercado Livre já entrega `money_release_date` no payload de cada
-- collection e a Seller descartava. Esta coluna passa a guardar essa data
-- (e, na Shopee, o mesmo `escrow_release_time` que já era calculado). Fica
-- nula pros registros antigos e pros pagamentos sem previsão de liberação.
alter table public.payments add column if not exists release_date timestamptz;

comment on column public.payments.release_date is
  'Data prevista/efetiva de liberação do dinheiro pro vendedor (ML: money_release_date; Shopee: escrow_release_time). Distinta de transaction_date (aprovação/competência). Base da previsão de caixa.';

create index if not exists payments_release_date_idx
  on public.payments (integration_id, release_date)
  where release_date is not null;
