-- Item 6 do pedido: fila de eventos de webhook da TikTok Shop. O handler
-- (tiktok-webhook/index.ts) só ENFILEIRA aqui e devolve 200 — não processa
-- inline. Ninguém drena esta fila ainda nesta leva (ver nota no fim do
-- arquivo da function) — o polling via tiktok-sync já é a fonte de
-- verdade; o webhook é só uma otimização de latência.
create table if not exists public.tiktok_webhook_events (
  id uuid primary key default gen_random_uuid(),
  -- TODO: nome do campo de id de evento no payload real da TikTok não
  -- confirmado — pode vir null se o payload não trouxer nada reconhecível.
  external_event_id text,
  event_type text not null default 'unknown',
  payload jsonb not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  status text not null default 'pending' check (status in ('pending', 'processed', 'ignored', 'error')),
  error text
);

-- Dedup: webhook é "at-least-once" (a TikTok pode reenviar o MESMO evento
-- se não vir confirmação rápida o bastante) — índice único parcial (só
-- quando o id existe) evita duas entregas do mesmo evento virarem duas
-- linhas. Sem id (payload sem campo reconhecível), não dá pra deduplicar —
-- aceita duplicata nesse caso, melhor que perder o evento.
create unique index if not exists tiktok_webhook_events_external_id_idx
  on public.tiktok_webhook_events (external_event_id)
  where external_event_id is not null;

create index if not exists tiktok_webhook_events_status_idx
  on public.tiktok_webhook_events (status) where status = 'pending';

-- RLS sem nenhuma policy — só service_role. Nunca acessado pelo client.
alter table public.tiktok_webhook_events enable row level security;
