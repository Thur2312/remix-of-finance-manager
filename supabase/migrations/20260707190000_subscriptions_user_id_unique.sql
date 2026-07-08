-- Garante uma única linha por usuário em subscriptions.
-- Necessário para os upsert({ onConflict: "user_id" }) das functions da Asaas
-- funcionarem como update-or-insert em vez de criar linhas duplicadas.
alter table public.subscriptions
  add constraint subscriptions_user_id_key unique (user_id);
