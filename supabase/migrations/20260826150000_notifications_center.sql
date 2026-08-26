-- Central de notificações: avisos de correção/feature/alerta, com
-- segmentação (todos os usuários, ou só uma lista específica de
-- target_user_ids — resolvida no momento da criação, não uma query live).
-- Motivo de existir: a correção de receita Shopee (contar só pedidos
-- COMPLETED) precisa chegar só pros 9 usuários com Shopee conectada via
-- OAuth, não pra toda a base — e precisamos disso de novo pra próxima
-- correção/feature, sem depender de e-mail manual.

alter table public.profiles add column if not exists is_admin boolean not null default false;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  type text not null default 'info' check (type in ('feature', 'fix', 'alert', 'info')),
  target_type text not null default 'all' check (target_type in ('all', 'specific')),
  -- Resolvido (lista de user_id) no momento da criação, via edge function
  -- admin-create-notification — não é uma query dinâmica re-avaliada depois.
  target_user_ids uuid[],
  created_by uuid references auth.users(id) on delete set null,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.notification_reads (
  notification_id uuid not null references public.notifications(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (notification_id, user_id)
);

alter table public.notifications enable row level security;
alter table public.notification_reads enable row level security;

-- Usuário comum só vê publicadas, e só se for "all" ou estiver na lista de
-- destinatários. Admin vê tudo (inclusive rascunho futuro, se vier a existir).
create policy "notifications_select_visible" on public.notifications
  for select to authenticated
  using (
    published_at is not null
    and (target_type = 'all' or auth.uid() = any(target_user_ids))
  );

create policy "notifications_admin_manage" on public.notifications
  for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

-- Cada usuário só lê/grava seu próprio registro de leitura.
create policy "notification_reads_own" on public.notification_reads
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create index if not exists notifications_published_at_idx on public.notifications (published_at desc);
