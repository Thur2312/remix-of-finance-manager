-- INCIDENTE 29/08 (produção): 20260826120000 + 20260826120100 revogaram EXECUTE
-- de has_permission() (e as 3 funções irmãs de permissão) de `anon` E
-- `authenticated`, partindo da premissa "nenhum código chama via .rpc()".
--
-- Verdade pro client — mas 3 políticas de RLS chamam has_permission(auth.uid(),…):
--   raw_orders    "Allow select for users with shopee access"        -> acesso_shopee
--   tiktok_orders "Allow select for users with tiktok access"        -> acesso_tiktok
--   product_costs "Allow select for users with product costs access" -> acesso_custos_produto
--
-- Política de RLS é avaliada no contexto do role que faz o SELECT
-- (`authenticated`). Sem EXECUTE, qualquer SELECT nessas tabelas devolve
-- 42501 "permission denied for function has_permission". Quebrou DRE, dashboards
-- Shopee/TikTok (path upload manual) e a Calculadora.
--
-- Restaura EXECUTE só pro `authenticated`. `anon` continua revogado — o risco
-- original (chamar .rpc('has_permission', {user_id: <vítima>}) SEM login pra
-- enumerar plano/permissão alheia) só existe pra anon; um usuário logado fazer
-- isso é vazamento mínimo e o app não faz nenhuma dessas chamadas client-side.

grant execute on function public.has_permission(user_id uuid, required_permission text) to authenticated;
grant execute on function public.get_user_permissions(user_id uuid) to authenticated;
grant execute on function public.get_permission_limit(user_id uuid, permission_name text) to authenticated;
grant execute on function public.get_user_plan(user_id uuid) to authenticated;
