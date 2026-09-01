-- Publica o aviso da feature "Meta do mês". target_type 'all'. Idempotente.

insert into public.notifications (title, body, type, target_type, target_user_ids, created_by)
select
  'Novo: Meta do mês — dá pra bater a meta no ritmo atual?',
  'Quanto você precisa faturar este mês pra cobrir os custos fixos e ainda ter a margem que você quer? E no ritmo de vendas de agora, onde o mês vai fechar? A nova tela "Meta do mês" (em Visão Geral) responde as duas: mostra o ponto de equilíbrio da operação, a projeção do mês pelo ritmo atual, e quanto você precisa vender por dia nos dias que faltam pra chegar na meta.',
  'feature',
  'all',
  null,
  null
where not exists (
  select 1 from public.notifications
  where title = 'Novo: Meta do mês — dá pra bater a meta no ritmo atual?'
);
