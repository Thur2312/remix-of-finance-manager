-- Aviso da feature "Meta do mês por empresa". target_type 'all'.
-- Idempotente (padrão de 20260905120100_notice_bloco_d.sql).

insert into public.notifications (title, body, type, target_type, target_user_ids, created_by)
select
  'Meta do mês agora é por empresa',
  'Se você opera mais de um CNPJ, cada empresa passa a ter a sua própria meta de faturamento. Em Meta do mês, escolha a empresa no seletor pra definir e acompanhar a meta dela — o faturamento, o ritmo e a projeção já vêm recortados só daquela empresa. Com "Todas as empresas" você continua vendo a meta consolidada da operação.',
  'feature',
  'all',
  null,
  null
where not exists (
  select 1 from public.notifications
  where title = 'Meta do mês agora é por empresa'
);
