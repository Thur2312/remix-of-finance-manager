-- Publica o aviso da feature "Reposição de estoque" (Aposta C, Fase 1 —
-- commits 3330a60..08a503a). target_type 'all'. Idempotente.

insert into public.notifications (title, body, type, target_type, target_user_ids, created_by)
select
  'Novo: Reposição de estoque — o que pedir esta semana',
  'A tela junta a velocidade de venda de cada SKU (últimos 60 dias, somando Shopee, Mercado Livre e TikTok), o custo do produto e o estoque que você informa, e responde: quantos dias cada produto ainda dura, quais já passaram do ponto de reposição e quantas unidades pedir. E amarra na Previsão de caixa — se repor tudo não cabe no seu caixa projetado, ela prioriza os SKUs que geram mais lucro por dia e diz quais podem esperar o próximo ciclo. Registre os pedidos ao fornecedor pra não pedir de novo o que já está a caminho (eles também entram como saída na Previsão de caixa). Informe o estoque atual de cada SKU pra começar — o resto ela calcula. Está em Visão Geral → Reposição de estoque.',
  'feature',
  'all',
  null,
  null
where not exists (
  select 1 from public.notifications
  where title = 'Novo: Reposição de estoque — o que pedir esta semana'
);
