-- Achado pelo Security Advisor do Supabase (supabase db advisors --linked):
--
-- 1) anon_security_definer_function_executable / authenticated_security_definer_function_executable
--    Várias funções SECURITY DEFINER continuavam expostas via PostgREST RPC
--    (/rest/v1/rpc/<fn>) para os roles anon e authenticated. get_user_plan,
--    get_permission_limit, get_user_permissions e has_permission recebem
--    `user_id` como PARÂMETRO (não derivam de auth.uid()) — qualquer pessoa
--    sem login, sabendo o UUID de um usuário, conseguia consultar o plano e
--    as permissões dele direto pela API pública. Confirmado por grep que
--    nenhum client-side code (src/ nem supabase/functions/) chama essas
--    funções via `.rpc(...)` — nada depende do acesso via anon/authenticated,
--    então revogar aqui é seguro. A migration 20260806230000 já tinha revogado
--    process_green_payment/v2 e trigger_auto_sync pelo mesmo motivo; esta
--    completa a varredura para as funções que ficaram de fora.
--
-- 2) function_search_path_mutable
--    Funções SECURITY DEFINER (e algumas triggers comuns) sem search_path
--    fixo ficam vulneráveis a search_path hijacking: um objeto criado num
--    schema à frente no search_path do caller pode sombrear uma tabela/função
--    que o SECURITY DEFINER assume ser a "de verdade", rodando código
--    arbitrário com o privilégio elevado da função. Fixamos search_path em
--    todas as funções apontadas pelo advisor.

-- ── 1. Revoga EXECUTE de anon/authenticated nas funções que nunca deveriam
--       ser chamadas via RPC público ──────────────────────────────────────
revoke execute on function public.create_trial_subscription() from anon, authenticated;
revoke execute on function public.get_permission_limit(user_id uuid, permission_name text) from anon, authenticated;
revoke execute on function public.get_user_permissions(user_id uuid) from anon, authenticated;
revoke execute on function public.get_user_plan(user_id uuid) from anon, authenticated;
revoke execute on function public.handle_new_user() from anon, authenticated;
revoke execute on function public.has_permission(user_id uuid, required_permission text) from anon, authenticated;
revoke execute on function public.prevent_api_keys_immutable_field_changes() from anon, authenticated;
revoke execute on function public.protect_paywall_columns() from anon, authenticated;
revoke execute on function public.protect_paywall_columns_on_insert() from anon, authenticated;

-- ── 2. Fixa search_path em todas as funções apontadas pelo advisor ────────
alter function public.set_updated_at() set search_path = public, pg_temp;
alter function public.handle_updated_at() set search_path = public, pg_temp;
alter function public.get_user_permissions(user_id uuid) set search_path = public, pg_temp;
alter function public.get_user_plan(user_id uuid) set search_path = public, pg_temp;
alter function public.has_permission(user_id uuid, required_permission text) set search_path = public, pg_temp;
alter function public.get_permission_limit(user_id uuid, permission_name text) set search_path = public, pg_temp;
alter function public.process_green_payment_v2(p_subscription_id uuid, p_transaction_id text, p_plan_name text) set search_path = public, pg_temp;
alter function public.set_atualizado_em() set search_path = public, pg_temp;
alter function public.create_default_subscription() set search_path = public, pg_temp;
alter function public.update_updated_at_column() set search_path = public, pg_temp;
alter function public.handle_new_user() set search_path = public, pg_temp;
alter function public.create_profile_on_signup() set search_path = public, pg_temp;
alter function public.create_trial_subscription() set search_path = public, pg_temp;
alter function public.process_green_payment(p_subscription_id uuid, p_transaction_id text, p_user_id uuid) set search_path = public, pg_temp;
alter function public.trigger_auto_sync() set search_path = public, pg_temp;
