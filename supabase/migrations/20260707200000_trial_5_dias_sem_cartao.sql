-- O período grátis deixa de exigir cadastro de cartão no checkout da Asaas:
-- agora é um trial de verdade, liberado automaticamente no cadastro.
--
-- profiles.trial_ends_at é a fonte de verdade lida por useTrialStatus/AuthContext
-- no front-end, mas os triggers de cadastro nunca preenchiam essa coluna (só
-- subscriptions.expires_at) — por isso todo usuário novo caía em "trial expirado"
-- até completar o checkout com cartão. Também padroniza os triggers de 7 para 5 dias,
-- batendo com o texto "5 dias grátis" já usado no produto.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $function$
begin
  insert into public.profiles (id, email, trial_ends_at)
  values (new.id, new.email, now() + interval '5 days');
  return new;
end;
$function$;

create or replace function public.create_profile_on_signup()
returns trigger
language plpgsql
as $function$
BEGIN
  INSERT INTO profiles (id, email, full_name, created_at, trial_ends_at)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NOW(), NOW() + INTERVAL '5 days')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Erro no trigger create_profile_on_signup: %, user_id: %', SQLERRM, NEW.id;
    RETURN NEW;
END;
$function$;

create or replace function public.create_trial_subscription()
returns trigger
language plpgsql
security definer
as $function$
BEGIN
  INSERT INTO public.subscriptions (
    id,
    user_id,
    plan,
    created_at,
    expires_at,
    status
  )
  VALUES (
    gen_random_uuid(),
    NEW.id,
    'trial',
    NOW(),
    NOW() + INTERVAL '5 days',
    'active'
  );

  RETURN NEW;
END;
$function$;

create or replace function public.create_default_subscription()
returns trigger
language plpgsql
as $function$
BEGIN
  INSERT INTO subscriptions (user_id, plan, status, expires_at)
  VALUES (NEW.id, 'trial', 'active', NOW() + INTERVAL '5 days')  -- 5 dias de trial
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Erro no trigger create_default_subscription: %', SQLERRM;
    RETURN NEW;
END;
$function$;
