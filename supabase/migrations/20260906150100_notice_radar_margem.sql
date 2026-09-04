-- Aviso da feature "Radar de margem" (/radar-margem). target_type 'all'.
-- Idempotente (padrão de 20260902150000_notice_reposicao.sql).

insert into public.notifications (title, body, type, target_type, target_user_ids, created_by)
select
  'Novo: Radar de margem',
  'Em Visão Geral → Radar de margem, comparamos a margem real de cada produto entre dois períodos e avisamos quando ela está piorando — inclusive quando cruza de lucro pra prejuízo — apontando a causa mais provável: custo do produto subiu, a plataforma reteve mais, ou o preço de venda caiu. Só entram produtos com custo cadastrado e vendas nos dois períodos.',
  'feature',
  'all',
  null,
  null
where not exists (
  select 1 from public.notifications
  where title = 'Novo: Radar de margem'
);
