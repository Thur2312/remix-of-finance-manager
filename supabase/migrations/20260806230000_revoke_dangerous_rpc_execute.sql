-- process_green_payment / process_green_payment_v2 fazem UPDATE direto em
-- subscriptions/profiles liberando plano pago por 30 dias a partir só de
-- user_id/subscription_id (nenhuma validação de pagamento real dentro da
-- função) e estavam com EXECUTE liberado até pra `anon` (confirmado via
-- has_function_privilege). Não existe nenhuma chamada real a elas em
-- src/ ou supabase/functions/ (só aparecem em database.types.ts, resíduo
-- de gateway de pagamento legado anterior ao Asaas) -- confirmado
-- explorável sem autenticação via:
--   POST /rest/v1/rpc/process_green_payment
--   { "p_subscription_id": "...", "p_transaction_id": "qualquer-string", "p_user_id": "..." }
--
-- trigger_auto_sync() é SECURITY DEFINER e também estava com EXECUTE
-- liberado pra `anon`/`authenticated`, apesar de só precisar ser chamada
-- pelo pg_cron (job "select trigger_auto_sync()" a cada 15 min, que roda
-- como owner do banco e não passa pela API/PostgREST -- não depende de
-- grant nenhum pra `anon`/`authenticated`/`public`). Exposta publicamente,
-- qualquer um podia forçar sync antecipado de TODAS as integrações
-- conectadas de TODOS os usuários (vetor de abuso de rate-limit/DoS contra
-- Shopee/TikTok/ML).
revoke execute on function public.process_green_payment(uuid, text, uuid) from public, anon, authenticated;
revoke execute on function public.process_green_payment_v2(uuid, text, text) from public, anon, authenticated;
revoke execute on function public.trigger_auto_sync() from public, anon, authenticated;
