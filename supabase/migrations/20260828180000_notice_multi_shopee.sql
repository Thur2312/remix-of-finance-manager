-- Publica o aviso da feature "múltiplas lojas Shopee" (commits 007a30c /
-- 60f710b, migration 20260826160000). Mesmo efeito de criar pelo
-- /admin/notificacoes com segmento "shopee_connected": target_type
-- 'specific' + lista de user_ids resolvida AGORA (não é query dinâmica).
--
-- Idempotente: não republica se um aviso com este título já existe.

insert into public.notifications (title, body, type, target_type, target_user_ids, created_by)
select
  'Agora dá pra conectar mais de uma loja Shopee',
  'Se você vende em mais de uma conta Shopee, agora pode conectar todas elas aqui e alternar entre as lojas pelo seletor no topo do Dashboard e do Painel Unificado. Cada loja mantém os próprios números — não há soma consolidada. Para adicionar outra loja, vá em Integrações e conecte normalmente.',
  'feature',
  'specific',
  (
    select array_agg(distinct user_id)
    from public.integration_connections
    where provider = 'shopee' and status = 'connected'
  ),
  null
where not exists (
  select 1 from public.notifications
  where title = 'Agora dá pra conectar mais de uma loja Shopee'
)
and exists (
  select 1 from public.integration_connections
  where provider = 'shopee' and status = 'connected'
);
