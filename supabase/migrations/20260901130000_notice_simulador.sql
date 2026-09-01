-- Publica o aviso da feature "Simulador E se" (commits 7eb400d..40219bd).
-- target_type 'all' → a RLS de `notifications` mostra pra todo usuário.
-- Idempotente: não republica se já existe um aviso com este título.

insert into public.notifications (title, body, type, target_type, target_user_ids, created_by)
select
  'Novo: Simulador — teste um preço antes de mudar',
  'Baixar o preço pra ganhar a Buy Box, repassar a alta do fornecedor, cortar um produto de margem baixa — decisões que você costuma tomar no achismo. O novo Simulador responde com número: pega um produto que você já vende, mexe no preço, e mostra na hora quantas unidades você precisa vender pra a mudança compensar. Também diz se cortar um produto realmente melhora o seu resultado (nem sempre melhora). Está em Ferramentas → Simulador.',
  'feature',
  'all',
  null,
  null
where not exists (
  select 1 from public.notifications
  where title = 'Novo: Simulador — teste um preço antes de mudar'
);
