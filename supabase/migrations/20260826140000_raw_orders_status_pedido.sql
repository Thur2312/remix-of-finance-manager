-- raw_orders (upload manual de pedidos Shopee, usado por Resultados/DRE/
-- Calculadora) nunca teve coluna de status. Toda linha da planilha entrava
-- na soma de receita, cancelada ou não — provável causa raiz de clientes
-- reportarem receita diferente da Central do Vendedor Shopee, que já
-- desconta pedidos cancelados/não pagos/devolvidos das vendas. A exclusão
-- em si acontece no client (Upload.tsx, mesmo padrão do TikTok) antes de
-- inserir; a coluna existe pra registrar o status de quem já passou pelo
-- filtro (o valor real do relatório, não um enum fixo).
alter table public.raw_orders add column if not exists status_pedido text;
