-- RLS restringe LINHAS, não colunas: a policy "Users can update own profile"
-- (auth.uid() = id) deixa qualquer usuário autenticado alterar QUALQUER coluna
-- da própria linha em profiles — inclusive plan/trial_ends_at/trial_started_at,
-- que são a fonte de verdade lida por useTrialStatus/AuthContext para liberar
-- acesso pago. Confirmado explorável via:
--   supabase.from('profiles').update({ plan: 'anual' }).eq('id', user.id)
--
-- Este trigger reverte essas 3 colunas para o valor anterior sempre que o
-- UPDATE não vier de um contexto service_role (edge functions/webhooks
-- continuam podendo escrever normalmente).
create or replace function public.protect_paywall_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  if auth.role() is distinct from 'service_role' then
    new.plan := old.plan;
    new.trial_ends_at := old.trial_ends_at;
    new.trial_started_at := old.trial_started_at;
  end if;
  return new;
end;
$function$;

drop trigger if exists protect_paywall_columns_trigger on public.profiles;

create trigger protect_paywall_columns_trigger
  before update on public.profiles
  for each row
  execute function public.protect_paywall_columns();
