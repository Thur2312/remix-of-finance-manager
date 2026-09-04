-- Aviso da feature "Antecipação inteligente" (card em /previsao). target_type 'all'.
-- Idempotente (padrão de 20260902150000_notice_reposicao.sql).

insert into public.notifications (title, body, type, target_type, target_user_ids, created_by)
select
  'Novo: Antecipação inteligente',
  'Quando a Previsão de caixa mostra que o saldo vai ficar negativo, a tela agora calcula o valor MÍNIMO que você precisa antecipar pra não ficar no vermelho — não "antecipe tudo". Mostra quais recebíveis do Mercado Livre antecipar (os mais próximos primeiro, que custam menos), quanto custa e se cobre o buraco todo. Informe a sua taxa de antecipação real (Central do Vendedor) pra ver o cálculo.',
  'feature',
  'all',
  null,
  null
where not exists (
  select 1 from public.notifications
  where title = 'Novo: Antecipação inteligente'
);
