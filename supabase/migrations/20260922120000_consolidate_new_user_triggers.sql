-- "Database error saving new user" no signup: auth.users tinha 3 triggers
-- AFTER INSERT redundantes, sobra de eras diferentes do projeto:
--   on_auth_user_created  -> handle_new_user()          (insere em profiles, sem tratar erro)
--   on_user_created       -> create_trial_subscription() (insere em subscriptions, sem tratar erro)
--   trigger_create_profile -> create_profile_on_signup()  (insere em profiles de novo, com
--                             ON CONFLICT (id) DO NOTHING -- mas roda DEPOIS de handle_new_user,
--                             então o full_name que ela tentava gravar nunca chegava a persistir)
--
-- handle_new_user e create_trial_subscription não têm EXCEPTION WHEN OTHERS: qualquer
-- unique_violation (profiles.email, subscriptions.user_id) aborta a transação inteira de
-- criação do auth.users, e o GoTrue devolve só o erro genérico pro client.
--
-- Esta migration junta as 3 numa única trigger idempotente (ON CONFLICT DO NOTHING nos dois
-- inserts) que nunca derruba o cadastro: qualquer erro inesperado é logado (RAISE LOG) e
-- engolido, igual ao padrão já usado em create_profile_on_signup/create_default_subscription.
-- De quebra, volta a gravar full_name (regressão desde 20260707200000).
--
-- Achada uma 4ª trigger redundante ao tentar aplicar: trigger_create_subscription (AFTER
-- INSERT em public.profiles) chama create_default_subscription(), que insere em subscriptions
-- de novo (com ON CONFLICT + trata erro, então não quebrava nada -- só duplicava trabalho).
-- Como handle_new_user já cobre subscriptions diretamente, essa trigger também sai.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
begin
  insert into public.profiles (id, email, full_name, trial_started_at, trial_ends_at)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    now(),
    now() + interval '5 days'
  )
  on conflict (id) do nothing;

  insert into public.subscriptions (user_id, plan, status, created_at, expires_at)
  values (new.id, 'trial', 'active', now(), now() + interval '5 days')
  on conflict (user_id) do nothing;

  return new;
exception
  when others then
    raise log 'handle_new_user: erro ao criar profile/subscription pro user %: %', new.id, sqlerrm;
    return new;
end;
$function$;

drop trigger if exists on_user_created on auth.users;
drop trigger if exists trigger_create_profile on auth.users;
drop trigger if exists trigger_create_subscription on public.profiles;

drop function if exists public.create_trial_subscription();
drop function if exists public.create_profile_on_signup();
drop function if exists public.create_default_subscription();
