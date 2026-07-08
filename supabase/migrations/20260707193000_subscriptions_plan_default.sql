-- subscriptions.plan é NOT NULL sem default, o que fazia o upsert(user_id, onConflict:"user_id")
-- das edge functions da Asaas falhar silenciosamente (o Postgres valida NOT NULL na tupla de
-- INSERT mesmo quando o conflito resolve para UPDATE, e o cliente supabase-js não lança
-- exceção nesse erro). Um default neutro, igual ao já existente em "status", resolve sem
-- afetar linhas existentes nem sobrescrever "plan" em updates reais.
alter table public.subscriptions
  alter column plan set default 'inactive';
