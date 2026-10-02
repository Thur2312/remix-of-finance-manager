-- Dados fiscais do emitente, pro assistente de nota fiscal. `companies` já
-- tinha name/cnpj (usados hoje só pra identificação/DRE) -- faltava tudo que
-- uma nota exige de verdade: IE, regime tributário e endereço completo.
-- Todos nullable -- a empresa pode existir no sistema antes de preencher
-- isso (não é cadastro obrigatório na criação da empresa), e o assistente de
-- NF avisa o vendedor pra completar antes de gerar a primeira nota.
alter table public.companies
  add column if not exists ie text,
  add column if not exists regime_tributario text check (regime_tributario in ('mei', 'simples_nacional', 'lucro_presumido', 'lucro_real')),
  add column if not exists endereco_logradouro text,
  add column if not exists endereco_numero text,
  add column if not exists endereco_complemento text,
  add column if not exists endereco_bairro text,
  add column if not exists endereco_cidade text,
  add column if not exists endereco_uf text,
  add column if not exists endereco_cep text;
