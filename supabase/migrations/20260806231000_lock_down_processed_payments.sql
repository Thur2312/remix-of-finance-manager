-- processed_payments so era usada como ledger de idempotencia pelas RPCs
-- process_green_payment/process_green_payment_v2 (ja neutralizadas na
-- migration 20260806230000 -- EXECUTE revogado, nenhum caller real no
-- codigo atual). Nenhuma edge function le/escreve essa tabela -- o fluxo
-- real de pagamento (Asaas webhook) usa outro mecanismo de idempotencia.
--
-- Apesar disso, as policies ficaram publicas e amplas demais:
--   - SELECT com qual=true pra role public (leitura por qualquer um, ate
--     sem login, dos transaction_id processados)
--   - policy ALL com qual=(auth.role() = 'authenticated') e with_check nulo
--     (que o Postgres usa igual ao USING pra INSERT/UPDATE/DELETE quando
--     omitido numa policy FOR ALL) -- qualquer usuario autenticado podia
--     inserir/alterar/apagar linhas dessa tabela livremente, sem nenhum
--     escopo por usuario.
--
-- Como nada no codigo atual precisa acessar essa tabela via API publica,
-- o tratamento correto e o mesmo ja usado em oauth_state: RLS habilitado,
-- zero policies -- deny-by-default, so service_role acessa (que ignora RLS).
drop policy if exists "authenticated_processed_payments" on public.processed_payments;
drop policy if exists "Enable read access for all users" on public.processed_payments;
