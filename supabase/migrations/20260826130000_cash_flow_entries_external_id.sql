-- ImportBankStatementDialog só conseguia detectar duplicata por
-- data+valor+tipo (heurística), porque cash_flow_entries nunca teve onde
-- guardar o fitid do OFX (identificador único e estável do banco emissor).
-- Isso gerava dois erros simétricos: duas vendas distintas de mesmo valor no
-- mesmo dia eram sinalizadas como duplicata (falso positivo), e reimportar
-- um período com uma duplicata genuína não tinha como confirmar com certeza
-- (falso negativo). Com external_id, quando o arquivo importado é OFX (que
-- tem fitid), a checagem fica exata; CSV/XLSX continuam na heurística, mas
-- pelo menos o caso OFX — o mais comum pra extrato de banco de verdade —
-- fica resolvido de vez.
alter table public.cash_flow_entries add column if not exists external_id text;

create unique index if not exists cash_flow_entries_external_id_unique
  on public.cash_flow_entries (user_id, external_id)
  where external_id is not null;
