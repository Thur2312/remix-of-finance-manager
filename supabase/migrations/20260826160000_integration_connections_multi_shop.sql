-- integration_connections nunca entrou em nenhuma migration versionada deste
-- repo (foi criada fora do controle de migration) — o upsert em
-- integration-callback/integration-manual-auth usa onConflict:
-- "user_id,provider", o que significa que conectar uma 2ª loja Shopee do
-- mesmo usuário hoje SOBRESCREVE silenciosamente a 1ª conexão (token e
-- shop_id apagados). Como o nome real da constraint única existente é
-- desconhecido, este bloco introspecta pg_constraint/pg_indexes por
-- definição (não por nome) antes de dropar, pra não falhar contra um
-- ambiente onde ela tenha sido criada com nome diferente do esperado.
do $$
declare
  rec record;
begin
  for rec in
    select conname
    from pg_constraint
    where conrelid = 'public.integration_connections'::regclass
      and contype = 'u'
      and (
        select array_agg(attname::text order by attname)
        from pg_attribute
        where attrelid = conrelid and attnum = any(conkey)
      ) = array['provider', 'user_id']
  loop
    execute format('alter table public.integration_connections drop constraint %I', rec.conname);
  end loop;

  for rec in
    select indexname
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'integration_connections'
      and indexdef ilike '%unique%'
      and indexdef ilike '%user_id%'
      and indexdef ilike '%provider%'
      and indexdef not ilike '%external_shop_id%'
  loop
    execute format('drop index if exists public.%I', rec.indexname);
  end loop;
end $$;

-- unique constraint trata múltiplos NULL como não-conflitantes entre si —
-- sem backfill, duas lojas "sem shop_id" colidiriam por baixo da nova
-- constraint sem erro nenhum, reabrindo a mesma classe de bug.
update public.integration_connections
set external_shop_id = 'legacy-' || id::text
where external_shop_id is null or external_shop_id = '';

alter table public.integration_connections
  add constraint integration_connections_user_provider_shop_key
  unique (user_id, provider, external_shop_id);
