-- protect_paywall_columns_trigger (20260725120000) só cobre UPDATE. A policy
-- "Users can insert own profile" (auth.uid() = id) não restringe colunas --
-- se a linha profiles de um usuário nunca chegar a existir (create_profile_on_signup
-- e create_default_subscription engolem erro silenciosamente em EXCEPTION WHEN
-- OTHERS), o client pode inserir a própria linha já com plan/trial_ends_at
-- pagos:
--   supabase.from('profiles').insert({ id: user.id, email, plan: 'anual', trial_ends_at: '2099-01-01' })
--
-- Este trigger espelha a mesma proteção pro INSERT: fora de contexto
-- service_role, força os 3 campos pro trial padrão -- exatamente os valores
-- que handle_new_user/create_profile_on_signup já inserem no signup legítimo
-- (que roda via trigger em auth.users, fora do PostgREST, então auth.role()
-- não é 'service_role' nesse caminho tampouco -- forçar o default aqui não
-- quebra o signup normal, só neutraliza um INSERT client-side com valores
-- forjados).
create or replace function public.protect_paywall_columns_on_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  if auth.role() is distinct from 'service_role' then
    new.plan := 'trial';
    new.trial_started_at := now();
    new.trial_ends_at := now() + interval '5 days';
  end if;
  return new;
end;
$function$;

drop trigger if exists protect_paywall_columns_insert_trigger on public.profiles;

create trigger protect_paywall_columns_insert_trigger
  before insert on public.profiles
  for each row
  execute function public.protect_paywall_columns_on_insert();
