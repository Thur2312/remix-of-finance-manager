alter table public.companies
  add column tax_base text not null default 'revenue'
  check (tax_base in ('revenue', 'profit'));

comment on column public.companies.tax_base is
  'Base de cálculo do imposto: revenue (Simples Nacional, sobre faturamento) ou profit (sobre lucro). Default revenue.';
