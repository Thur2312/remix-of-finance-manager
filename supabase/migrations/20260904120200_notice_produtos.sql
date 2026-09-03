-- Publica o aviso da feature "Produtos" (Bloco C das diretrizes do dashboard).
-- target_type 'all'. Idempotente (padrão de 20260902150000_notice_reposicao.sql).

insert into public.notifications (title, body, type, target_type, target_user_ids, created_by)
select
  'Novo: Produtos — a base de todos os números',
  'A tela Produtos junta num lugar só cada SKU que você vende: em quais plataformas vende (Shopee, Mercado Livre, TikTok), quantas unidades saíram no período, faturamento, quanto a plataforma reteve em taxa, o custo do produto, o lucro real e a margem, o estoque e por quantos dias ele ainda dura. É a base de todos os cálculos da operação — se o custo do produto estiver cadastrado, o lucro deixa de ser estimativa. Você edita o custo e o estoque direto na tabela (reflete na Reposição de estoque na hora). O Top Produtos do Dashboard agora soma as três plataformas e ranqueia por lucro, não só por faturamento. Está em Visão Geral → Produtos, o primeiro item do menu.',
  'feature',
  'all',
  null,
  null
where not exists (
  select 1 from public.notifications
  where title = 'Novo: Produtos — a base de todos os números'
);
