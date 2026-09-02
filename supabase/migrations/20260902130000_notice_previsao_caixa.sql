-- Publica o aviso da feature "Previsão de caixa" (Aposta B, Fase 1 —
-- commits 9f71515..ea9a767). target_type 'all' → a RLS de `notifications`
-- mostra pra todo usuário. Idempotente: não republica se já existe um aviso
-- com este título.

insert into public.notifications (title, body, type, target_type, target_user_ids, created_by)
select
  'Novo: Previsão de caixa — em que dia o saldo aperta',
  'A DRE e os relatórios olham pra trás. A Previsão de caixa olha pra frente: pega a data de liberação de cada pagamento do Mercado Livre e as contas que você já lançou no Fluxo de Caixa, e projeta o seu saldo dia a dia pelos próximos 30 dias. Se em algum dia o dinheiro já garantido não cobre as contas, ela avisa a data — antes de o boleto vencer. Também mostra uma faixa com a tendência das suas vendas por cima, pra você ver o cenário mais provável. Informe o saldo real da sua conta uma vez pra projeção ficar precisa. Está em Visão Geral → Previsão de caixa. Por enquanto só o Mercado Livre entra nos recebíveis; Shopee e TikTok vêm nas próximas versões.',
  'feature',
  'all',
  null,
  null
where not exists (
  select 1 from public.notifications
  where title = 'Novo: Previsão de caixa — em que dia o saldo aperta'
);
