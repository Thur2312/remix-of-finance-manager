-- profiles.email era editavel pelo proprio usuario (policy de UPDATE sem
-- restricao de coluna) e sem constraint UNIQUE. Sem unicidade, duas contas
-- podiam acabar com o mesmo email; o lookup .eq('email', email).single() em
-- send-password-reset passava a encontrar 2 linhas e falhar, bloqueando o
-- reset de senha do dono legitimo daquele email. Nenhum duplicado existente
-- no momento desta migration (verificado: 30 linhas, 30 emails distintos).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_email_unique'
  ) then
    alter table public.profiles
      add constraint profiles_email_unique unique (email);
  end if;
end $$;
