-- Introspecção do schema das 5 tabelas que não estão em migration nenhuma
-- (orders, fees, payments, order_items, integration_connections).
-- Rodar no SQL Editor do Supabase, uma query por vez, e colar o resultado
-- de volta pra montar a migration de baseline (Faixa F, item 1 da auditoria).
--
-- Fallback usado porque `supabase db dump` exige Docker (indisponível aqui).

-- ─────────────────────────────────────────────────────────────────────────────
-- 1) COLUNAS: nome, tipo, precisão, nullability, default
-- ─────────────────────────────────────────────────────────────────────────────
select
  c.table_name,
  c.ordinal_position,
  c.column_name,
  c.data_type,
  c.udt_name,
  c.character_maximum_length,
  c.numeric_precision,
  c.numeric_scale,
  c.is_nullable,
  c.column_default
from information_schema.columns c
where c.table_schema = 'public'
  and c.table_name in ('orders','fees','payments','order_items','integration_connections')
order by c.table_name, c.ordinal_position;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2) CONSTRAINTS: PK / FK / UNIQUE / CHECK (definição completa via pg_get_constraintdef)
-- ─────────────────────────────────────────────────────────────────────────────
select
  rel.relname as table_name,
  con.conname as constraint_name,
  case con.contype
    when 'p' then 'PRIMARY KEY'
    when 'f' then 'FOREIGN KEY'
    when 'u' then 'UNIQUE'
    when 'c' then 'CHECK'
    when 'x' then 'EXCLUDE'
    else con.contype::text
  end as constraint_type,
  pg_get_constraintdef(con.oid) as definition
from pg_constraint con
join pg_class rel on rel.oid = con.conrelid
join pg_namespace nsp on nsp.oid = rel.relnamespace
where nsp.nspname = 'public'
  and rel.relname in ('orders','fees','payments','order_items','integration_connections')
order by rel.relname, constraint_type, con.conname;


-- ─────────────────────────────────────────────────────────────────────────────
-- 3) ÍNDICES (inclui os criados pelas constraints — indexdef é o CREATE INDEX literal)
-- ─────────────────────────────────────────────────────────────────────────────
select
  tablename as table_name,
  indexname as index_name,
  indexdef  as definition
from pg_indexes
where schemaname = 'public'
  and tablename in ('orders','fees','payments','order_items','integration_connections')
order by tablename, indexname;


-- ─────────────────────────────────────────────────────────────────────────────
-- 4a) RLS ligado por tabela?
-- ─────────────────────────────────────────────────────────────────────────────
select
  rel.relname as table_name,
  rel.relrowsecurity  as rls_enabled,
  rel.relforcerowsecurity as rls_forced
from pg_class rel
join pg_namespace nsp on nsp.oid = rel.relnamespace
where nsp.nspname = 'public'
  and rel.relname in ('orders','fees','payments','order_items','integration_connections')
order by rel.relname;

-- 4b) POLICIES de RLS (comando, roles, USING, WITH CHECK)
select
  tablename  as table_name,
  policyname as policy_name,
  cmd        as command,
  permissive,
  roles,
  qual       as using_expr,
  with_check as with_check_expr
from pg_policies
where schemaname = 'public'
  and tablename in ('orders','fees','payments','order_items','integration_connections')
order by tablename, policyname;


-- ─────────────────────────────────────────────────────────────────────────────
-- 5) TRIGGERS (as 5 tabelas têm trigger BEFORE INS/UPD que deriva as colunas
--    *_cents do float — precisa entrar na baseline)
-- ─────────────────────────────────────────────────────────────────────────────
select
  event_object_table as table_name,
  trigger_name,
  action_timing,
  event_manipulation,
  action_orientation,
  action_statement
from information_schema.triggers
where trigger_schema = 'public'
  and event_object_table in ('orders','fees','payments','order_items','integration_connections')
order by table_name, trigger_name, event_manipulation;
