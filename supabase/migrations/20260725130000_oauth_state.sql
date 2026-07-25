-- Suporte a um "state" opaco e de curta duração para o fluxo OAuth de
-- marketplaces, em vez de embutir o JWT de sessão do usuário na URL de
-- autorização enviada a provedores externos.
--
-- Isso fecha dois problemas:
-- 1) shopee-auth mandava o JWT completo do usuário dentro do parâmetro
--    "redirect" enviado para os servidores da Shopee (fica em logs de acesso
--    deles, Referer headers e histórico do navegador).
-- 2) Nenhum dos três fluxos (Shopee/TikTok/ML) validava de fato um "state"
--    contra quem iniciou a autorização — um "code" de OAuth de terceiros
--    podia ser vinculado à conta de outro usuário (CSRF/autorização cruzada).
--
-- RLS fica habilitado sem nenhuma policy: só o service_role (edge functions)
-- consegue ler/escrever essa tabela — nunca é acessada pelo client.
create table if not exists public.oauth_state (
  state text primary key,
  user_id uuid not null,
  provider text not null,
  created_at timestamptz not null default now()
);

alter table public.oauth_state enable row level security;

create index if not exists oauth_state_created_at_idx on public.oauth_state (created_at);
