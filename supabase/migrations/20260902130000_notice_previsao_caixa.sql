-- Publica o aviso da feature "Previsão de caixa" (Aposta B, Fases 1+2 —
-- commits 9f71515..9dd4560). target_type 'all' → a RLS de `notifications`
-- mostra pra todo usuário. Idempotente: não republica se já existe um aviso
-- com este título.

insert into public.notifications (title, body, type, target_type, target_user_ids, created_by)
select
  'Novo: Previsão de caixa — em que dia o saldo aperta',
  'A DRE e os relatórios olham pra trás. A Previsão de caixa olha pra frente: projeta o seu saldo em conta dia a dia pelos próximos 30 dias. No Mercado Livre ela usa a data real de liberação de cada pagamento; na Shopee, como a plataforma não informa a data de liberação futura, ela estima (pedido em trânsito → liberação em ~18 dias após o pagamento, menos a taxa). Junta com as contas que você lançou no Fluxo de Caixa e, se em algum dia o dinheiro já garantido não cobre as contas, avisa a data — antes de o boleto vencer. A linha cheia é só o que está garantido; a tracejada soma a estimativa da Shopee; a faixa por cima é o cenário com a tendência das suas vendas. Informe o saldo real da sua conta uma vez pra projeção ficar precisa. Está em Visão Geral → Previsão de caixa. TikTok ainda não entra.',
  'feature',
  'all',
  null,
  null
where not exists (
  select 1 from public.notifications
  where title = 'Novo: Previsão de caixa — em que dia o saldo aperta'
);
