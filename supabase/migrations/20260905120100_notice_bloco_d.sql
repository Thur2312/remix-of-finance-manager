-- Aviso da feature "Empresas / separação por CNPJ" (Bloco D das diretrizes).
-- target_type 'all'. Idempotente (padrão de 20260902150000_notice_reposicao.sql).

insert into public.notifications (title, body, type, target_type, target_user_ids, created_by)
select
  'Novo: separação por empresa (CNPJ)',
  'Se você opera mais de um CNPJ, agora dá pra separar a operação. Em Financeiro → Empresas você cadastra cada empresa e diz qual loja (conta de marketplace conectada) pertence a qual. A partir daí: os Custos Fixos podem ser marcados como gerais (rateados entre as empresas na proporção do faturamento), exclusivos de uma empresa, de uma loja ou de uma plataforma — sem misturar o contador de uma com a outra. A Precificação ganha filtro por empresa. Loja que não for atribuída a nenhuma empresa fica no consolidado e aparece com aviso.',
  'feature',
  'all',
  null,
  null
where not exists (
  select 1 from public.notifications
  where title = 'Novo: separação por empresa (CNPJ)'
);
