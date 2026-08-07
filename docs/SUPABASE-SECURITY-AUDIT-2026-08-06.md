# Seller Finance — Supabase Security Audit (Static, Read-Only)

Data: 2026-08-06
Escopo: todas as 14 migrations em `supabase/migrations/`, todas as edge functions em `supabase/functions/*/index.ts` + `_shared/{cors,plan-guard,plans,validation}.ts`, e o inventário completo de tabelas/RPCs em `database.types.ts`. Sem chamadas de rede, sem escrita no banco real.

## Achados críticos/altos

### 1. [HIGH — precisa verificação ao vivo] RPCs `process_green_payment` / `process_green_payment_v2` sem migration rastreada
- Fonte: `database.types.ts` (seção Functions: `process_green_payment`, `process_green_payment_v2`, `trigger_auto_sync`)
- Gap: essas funções Postgres existem no schema ao vivo (visíveis só via types gerados) mas o corpo SQL, status `SECURITY DEFINER` e GRANTs/REVOKEs não aparecem em nenhuma migration do repo. Postgres/PostgREST concede `EXECUTE` a `PUBLIC` por padrão em novas funções, a menos que revogado explicitamente.
- Cenário de exploração: se não foi revogado de `authenticated`, qualquer usuário logado pode chamar `supabase.rpc('process_green_payment_v2', {...})` direto do console do navegador com IDs forjados. Dependendo do que a função faz (não verificável por este repo), pode ativar plano pago ou corromper estado de assinatura fora do fluxo de webhook Asaas (que foi bem protegido). O nome ("green", diferente de Asaas) sugere integração de pagamento legada que pode ainda estar ativa.
- Ação: puxar a definição real das 4 rotinas do banco (`pg_get_functiondef`) e checar `information_schema.role_routine_grants` antes de qualquer outra coisa.

### 2. [HIGH] Trigger `protect_paywall_columns` só protege UPDATE em `profiles`, não INSERT
- Arquivos: `supabase/migrations/20260725120000_protect_paywall_columns.sql` (trigger é `before update on public.profiles`); `supabase/migrations/20260106232519_remix_migration_from_pg_dump.sql:699` (policy de INSERT `"Users can insert own profile"` só checa `auth.uid() = id`, sem restringir colunas); `supabase/migrations/20260707200000_trial_5_dias_sem_cartao.sql:22-36,65-79` (dois dos quatro triggers de signup engolem falhas silenciosamente com `EXCEPTION WHEN OTHERS THEN ... RETURN NEW`).
- Cenário: se a linha `profiles` de um usuário nunca for criada no signup (um dos triggers falhou silenciosamente) ou for deletada, o cliente pode fazer `supabase.from('profiles').insert({ id: user.id, email, plan: 'anual', trial_ends_at: '2099-01-01' })`. A policy de INSERT não olha `plan`/`trial_ends_at`, e o trigger de proteção só dispara em UPDATE — acesso pago permanente de graça.
- Fix: trigger espelhado `BEFORE INSERT` em `profiles` forçando `plan`/`trial_ends_at`/`trial_started_at` aos defaults, exceto quando `auth.role() = 'service_role'`.

### 3. [HIGH — ponto cego da auditoria] ~25 tabelas/views existem no schema ao vivo sem `CREATE TABLE`/RLS/`CREATE POLICY` em nenhuma migration
- Confirmadas ausentes das migrations mas presentes em `database.types.ts`: `subscriptions`, `anuncios`, `integrations`, `integration_connections`, `integration_sync_logs`, `orders`, `payments`, `fees`, `order_items`, `ml_orders`, `ml_settings`, `shopee_orders`, `shopee_integrations`, `shopee_financial_transactions`, `tiktok_integrations`, `tiktok_financial_transactions`, `payouts`, `plan_permissions`, `processed_payments`, `shop_balances`, `shop_metrics`, `companies`, `custom_cost_categories`, `assistant_conversations`.
- Foram criadas direto no banco ao vivo (dashboard/SQL editor), fora do histórico de migrations deste repo. **Não dá pra confirmar por análise estática se RLS está habilitado em `payments`, `fees`, `orders`, `integrations`** — as tabelas com os dados financeiros e tokens OAuth mais sensíveis do app. `integrations.access_token`/`refresh_token` são colunas `text` em texto plano confirmadas nos tipos (`database.types.ts:500-541`).
- Fator atenuante: nenhuma edge function vaza esses tokens pro cliente (ver "O que está sólido"), e a lógica de paywall real só lê `profiles.plan`/`trial_ends_at` (confirmado em `src/hooks/useTrialStatus.ts:29,80` e `src/pages/Planos.tsx:31,169,219`), que **está** coberta por migration e **está** protegida. Então o raio de impacto prático de RLS não verificado em `subscriptions` é provavelmente baixo, mas `payments`/`fees`/`orders`/`integrations` precisam ser confirmadas direto no banco ao vivo — se alguma tiver RLS desabilitado ou policy `USING (true)`, qualquer usuário autenticado pode ler (ou pior, alterar) histórico de pedidos/pagamentos e tokens OAuth de todos os vendedores.
- Ação: rodar `supabase db dump --schema public` (ou puxar o schema do dashboard), comparar com o que está neste repo e commitar o resultado.

## Achados médios

### 4. [MEDIUM] `send-password-reset` vaza existência de conta pelo texto da resposta, apesar de corrigir timing attack
- Arquivo: `supabase/functions/send-password-reset/index.ts:53-60` vs `:175-178`
- A função normaliza o *tempo* de resposta (`withMinDelay`, `MIN_RESPONSE_TIME_MS = 1200`) especificamente pra evitar enumeração de e-mails — o comentário no topo do arquivo diz isso explicitamente. Mas o **corpo** da resposta ainda difere: e-mail não cadastrado → `"Se o email existir, você receberá um link de recuperação."`; e-mail cadastrado → `"Email de recuperação enviado com sucesso!"`. Um atacante enumera todas as contas da plataforma só postando e-mails candidatos e lendo `message`, sem precisar de análise de timing.
- Fix: retornar exatamente o mesmo texto nos dois casos.

### 5. [MEDIUM] `profiles.email` é editável pelo usuário e sem constraint, permitindo DoS de reset de senha contra outro usuário
- Arquivos: `supabase/migrations/20260106232519_remix_migration_from_pg_dump.sql:776` (policy de UPDATE `"Users can update own profile"` sem restrição de coluna, então `email` é tão editável quanto qualquer outra); nenhuma constraint `UNIQUE` em `profiles.email` em nenhuma migration; `supabase/functions/send-password-reset/index.ts:47-51` busca a conta via `.from("profiles").select(...).eq("email", email).single()`.
- Cenário: atacante muda o próprio `profiles.email` pro e-mail real de uma vítima via `supabase.from('profiles').update({ email: 'vitima@x.com' })`. Agora duas linhas compartilham o e-mail. Quando a vítima pede reset de senha, o `.single()` falha (mais de 1 resultado), `profileError` é setado, e a função retorna silenciosamente a mensagem genérica de sucesso sem nunca chamar `generateLink` — a vítima nunca recebe o e-mail de reset, e isso persiste enquanto o atacante mantiver o e-mail "sequestrado".
- Fix: constraint `UNIQUE` em `profiles.email` (ou melhor, parar de confiar em `profiles.email` pro reset e buscar via `auth.users`/`admin.listUsers`, que é a fonte real de verdade pro login).

## Achados baixos/informativos

### 6. [LOW] Caminho de código morto/inconsistente no branch Shopee de `integration-auth-start`
- Arquivo: `supabase/functions/integration-auth-start/index.ts:37-66`
- Diferente do próprio branch `tiktok` (mesmo arquivo, linhas 70-119) e da função dedicada `shopee-auth`, o branch `provider === "shopee"` **não checa Authorization/JWT** e nunca escreve em `oauth_state` — só assina e retorna uma URL de autorização Shopee pra qualquer um, sem autenticação, sem `state`. Falha de forma segura na prática (o `integration-callback` compartilhado exige `state` e redireciona com erro caso contrário), mas é exatamente a classe de bug que os comentários no código em outros lugares descrevem ter corrigido. Recomenda-se deletar esse branch já que `shopee-auth/index.ts` é o entry point real e corretamente implementado.

### 7. [LOW/INFO] `mercadolivre-webhook` sem checagem de assinatura criptográfica (por design, não é bug)
- Arquivo: `supabase/functions/mercadolivre-webhook/index.ts:34-46`
- A API de notificação do Mercado Livre (diferente do Mercado Pago) não suporta assinatura HMAC. A única checagem de origem é que `application_id` bate com `ML_CLIENT_ID`, que não é secreto (visível em qualquer URL OAuth do ML). Um atacante que soubesse o `external_shop_id` de uma vítima poderia forjar um evento pra forçar um resync — mas o handler sempre rebusca os dados reais da API do ML usando o token de acesso genuíno da conexão, então não dá pra injetar dados financeiros falsos; no máximo é um vetor menor de abuso de recursos/DoS.

## O que está sólido

- **`asaas-webhook`**: comparação de token timing-safe (`timingSafeEqual`) contra `ASAAS_WEBHOOK_TOKEN`; `PAYMENT_CONFIRMED`/`PAYMENT_RECEIVED` protege corretamente contra reativar um plano a partir de um pagamento obsoleto que estava em trânsito antes do cancelamento; identidade do usuário sempre resolvida no servidor a partir de IDs de assinatura/cliente Asaas, nunca confiando direto no payload.
- **`asaas-checkout` / `asaas-cancel`**: ambas derivam o usuário agindo de um JWT verificado (`supabaseAuth.auth.getUser()`), nunca do corpo da requisição — comentários mostram que foi correção deliberada de IDOR.
- **Padrão CSRF-state do OAuth** (`shopee-auth`, branch tiktok de `integration-auth-start`, `mercadolivre-auth`, e os três callbacks correspondentes): implementado de forma consistente — `state` aleatório de uso único vinculado ao `user_id` no servidor, deletado imediatamente na leitura (bloqueia replay), expiração de 30 min, guardado em `oauth_state` (RLS habilitado, zero policies — deny-by-default correto, só `service_role` acessa).
- **Edge functions de IA/recursos pagos** (`financial-assistant`, `generate-ad`, `generate-product-images`, `parse-bank-statement`): todas validam o JWT no servidor e chamam `hasActivePlanAccess()` (`_shared/plan-guard.ts`) antes de qualquer trabalho pago.
- **Trigger `protect_paywall_columns`**: bom design pro caminho que cobre — reverte `plan`/`trial_ends_at`/`trial_started_at` em `profiles` em qualquer UPDATE que não seja `service_role`.
- **Higiene de tokens**: `integration-list` só seleciona um subconjunto seguro de colunas (nunca `access_token`/`refresh_token`); há views dedicadas (`integration_connections_safe`, `integrations_safe`, `shopee_integrations_safe`) que removem colunas de token inteiramente.
- **`integration-sync` / `mercadolivre-sync`**: escopam corretamente chamadas não-cron a `connection.user_id === callingUser.id`, com bypass de cron protegido por comparação timing-safe de secret.
- **Tabelas padrão por usuário** (`cash_flow_categories`, `cash_flow_entries`, `fixed_costs`, `fixed_costs_settings`, `raw_orders`, `settings`, `tiktok_orders/settings/settlements/statements`, `product_costs`): todas com RLS habilitado e policies corretamente escopadas em `auth.uid() = user_id`.
- **`enterprise_leads`**: RLS habilitado, policy só de INSERT pra `anon`/`authenticated`, sem policy de SELECT — corretamente legível só por `service_role`.

## Prioridade de ação recomendada

1. Confirmar/revogar EXECUTE nas RPCs `process_green_payment*` (achado 1) — mais urgente por ser desconhecido.
2. Rodar `supabase db dump` e commitar o schema real, pra fechar o ponto cego do achado 3 (`payments`, `fees`, `orders`, `integrations`).
3. Trigger `BEFORE INSERT` espelhando a proteção de paywall em `profiles` (achado 2).
4. Unificar mensagem de resposta do `send-password-reset` (achado 4) e adicionar `UNIQUE` em `profiles.email` (achado 5).
5. Remover branch Shopee morto em `integration-auth-start` (achado 6).
