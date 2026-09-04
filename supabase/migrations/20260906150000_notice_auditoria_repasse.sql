-- Aviso da feature "Auditoria de repasse" (/repasses). target_type 'all'.
-- Idempotente (padrão de 20260902150000_notice_reposicao.sql).

insert into public.notifications (title, body, type, target_type, target_user_ids, created_by)
select
  'Novo: Auditoria de repasse',
  'Agora dá pra conferir se a Shopee te pagou o que devia. Em Financeiro → Auditoria de repasse, cruzamos pedido a pedido o que foi cobrado de comissão e taxa de serviço contra a tabela oficial de comissão, e avisamos quando um pedido concluído passa de 20 dias sem nenhum repasse cair na sua conta. Frete e desconto ficam de fora da comparação — variam demais pra confiar numa régua fixa. Não é um aviso oficial de erro da Shopee, é um indício pra você conferir.',
  'feature',
  'all',
  null,
  null
where not exists (
  select 1 from public.notifications
  where title = 'Novo: Auditoria de repasse'
);
