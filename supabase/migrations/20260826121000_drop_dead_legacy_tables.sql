-- Tabelas de uma arquitetura de integrações anterior à atual, superada por
-- integration_connections + orders + payments + fees + payouts. Confirmado
-- por grep (estático e dinâmico) em src/ e supabase/functions/ que nenhuma
-- delas é lida ou escrita por nenhum caminho vivo do app. Continuavam
-- guardando access_token/refresh_token em texto plano sem necessidade
-- (shopee_orders e shopee_financial_transactions, inclusive, tinham FK
-- apontando errado pra tiktok_integrations — mais um sinal de que ninguém
-- olhava pra esse schema há tempo). integrations_safe é a view "sem
-- token" construída em cima de `integrations`; precisa cair junto.
--
-- shopee_integrations e tiktok_integrations NÃO entram aqui de propósito:
-- ainda são referenciadas por linkIntegration()/useIntegrationTax() em
-- src/hooks/useCompanies.ts e useIntegrationTax.tsx — código sem nenhum
-- componente chamando hoje, mas presente no repo, então tratamos como uma
-- decisão separada em vez de dropar junto.
drop view if exists public.integrations_safe;
drop table if exists public.shopee_orders;
drop table if exists public.shopee_financial_transactions;
drop table if exists public.tiktok_financial_transactions;
drop table if exists public.shop_balances;
drop table if exists public.shop_metrics;
drop table if exists public.integrations;
