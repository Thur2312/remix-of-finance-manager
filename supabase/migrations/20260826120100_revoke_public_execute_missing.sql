-- Correção da migration anterior (20260826120000): revogar EXECUTE de
-- anon/authenticated não é suficiente quando o grant original veio do
-- pseudo-role PUBLIC (padrão do Postgres pra toda função nova) — anon e
-- authenticated herdam EXECUTE via PUBLIC independente do que foi revogado
-- deles diretamente. O padrão correto já estava certo em
-- 20260806230000_revoke_dangerous_rpc_execute.sql (revoga de public, anon,
-- authenticated); esta migration completa o mesmo revoke para as funções
-- adicionadas em 20260826120000, confirmado necessário porque
-- `supabase db advisors` continuou reportando anon_security_definer_function_executable
-- pra elas mesmo depois do revoke anterior.
revoke execute on function public.create_trial_subscription() from public, anon, authenticated;
revoke execute on function public.get_permission_limit(user_id uuid, permission_name text) from public, anon, authenticated;
revoke execute on function public.get_user_permissions(user_id uuid) from public, anon, authenticated;
revoke execute on function public.get_user_plan(user_id uuid) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.has_permission(user_id uuid, required_permission text) from public, anon, authenticated;
revoke execute on function public.prevent_api_keys_immutable_field_changes() from public, anon, authenticated;
revoke execute on function public.protect_paywall_columns() from public, anon, authenticated;
revoke execute on function public.protect_paywall_columns_on_insert() from public, anon, authenticated;
