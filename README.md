# Remix of Finance Manager

> ⚠️ **AVISO IMPORTANTE**: Este projeto é de uso **interno e restrito**. Não é open source, não está licenciado para uso externo, e a distribuição não é permitida. Qualquer uso não autorizado é expressamente proibido.

---

## Visão Geral

Sistema completo de gestão financeira para e-commerces marketplace (Shopee, TikTok Shop), com cálculo de precificação, fluxo de caixa, DRE (Demonstração de Resultado) e análise de rentabilidade.

### Funcionalidades Principais

- **Gestão Shopee**: Upload de pedidos, configurações de taxas, resultados e variações
- **Gestão TikTok Shop**: Upload de pedidos, configurações, resultados e pagamentos
- **Fluxo de Caixas**: Categorias, lançamentos, importação OFX
- **Precificação**: Calculadora de preço de venda e custos de produtos
- **DRE**: Demonstrativo de resultado por período
- **Multi-Tenant**: Suporte a múltiplas empresas por usuário

---

## Stack Tecnológica

| Categoria | Tecnologia |
|-----------|------------|
| Frontend | React 18 + TypeScript + Vite |
| UI | shadcn/ui + Tailwind CSS |
| Backend | Supabase (PostgreSQL + Auth) |
| Estado | React Query + Context API |
| Gráficos | Recharts |
| Planilhas | xlsx (Excel) |

---

## Estrutura do Projeto

```
src/
├── components/         # Componentes React reutilizáveis
│   ├── layout/        # Layout (Sidebar, AppLayout)
│   ├── ui/            # Componentes shadcn/ui
│   ├── workspace/     # Componentes multi-tenant
│   └── charts/       # Gráficos Recharts
├── contexts/          # Contextos React
│   ├── AuthContext.tsx      # Autenticação
│   └── CompanyContext.tsx   # Multi-empresa
├── hooks/             # Hooks customizados
│   ├── useCashFlow.ts       # Fluxo de caixa
│   ├── useDREData.ts        # Dados DRE
│   ├── useFixedCosts.ts     # Custos fixos
│   ├── useProdutos.ts       # Produtos/Anúncios
│   └── useCompanyData.ts   # Dados da empresa
├── integrations/      # Configurações externas
│   └── supabase/      # Cliente Supabase
├── lib/               # Bibliotecas utilities
│   ├── calculations.ts     # Cálculos Shopee
│   ├── tiktok-calculations.ts  # Cálculos TikTok
│   ├── supabase-helpers.ts # Helpers Supabase
│   ├── tiktok-helpers.ts    # Helpers TikTok
│   └── workspace/      # Módulo multi-tenant
├── pages/             # Páginas da aplicação
│   ├── shopee/        # Gestão Shopee
│   ├── tiktok/        # Gestão TikTok
│   ├── fluxo-caixa/   # Fluxo de caixa
│   ├── precificacao/  # Precificação
│   └── integrations/   # Integrações
└── types/             # Tipos TypeScript
    └── company.types.ts  # Tipos de empresa
```

---

## Setup Local

### Pré-requisitos

- Node.js 18+
- Bun (recomendado) ou npm
- Conta Supabase configurada

### Instalação

```bash
# Instalar dependências
bun install

# Criar arquivo .env
cp .env.example .env

# Configurar variáveis de ambiente
# SUPABASE_URL=sua-url-supabase
# SUPABASE_KEY=sua-chave-supabase
```

### Executar

```bash
# Development
bun run dev

# Build production
bun run build
```

---

## Variáveis de Ambiente

| Variável | Descrição |
|----------|-----------|
| `SUPABASE_URL` | URL do projeto Supabase |
| `SUPABASE_ANON_KEY` | Chave anônima do Supabase |

---

## Banco de Dados

O banco de dados utiliza **Row Level Security (RLS)** para proteção de dados. Políticas de segurança garantem que:

- Usuários veem apenas dados da própria empresa (`company_id`)
- Cada empresa tem acesso apenas aos seus dados
- Dados são isolados entre empresas diferentes

### Tabelas Principais

- `companies` - Empresas (multi-tenant)
- `raw_orders` - Pedidos Shopee
- `tiktok_orders` - Pedidos TikTok
- `cash_flow_entries` - Lançamentos fluxo de caixa
- `cash_flow_categories` - Categorias FC
- `fixed_costs` - Custos fixos
- `settings` - Configurações Shopee
- `tiktok_settings` - Configurações TikTok
- `product_costs` - Custos de produtos

---

## Segurança

### Autenticação
- Supabase Auth (email/senha)
- Sessão gerenciada via Context API
- Tokens JWT seguros

### Autorização
- Row Level Security (RLS) ativado em todas as tabelas
- Policies baseadas em `company_id` e `user_id`
- Queries sempre filtradas por empresa atual

### Boas Práticas Implementadas
- Nunca expor credenciais no código
- Queries paramétricas para evitar SQL injection
- Validação de dados com Zod
- Sanitização de inputs

---

## Fluxo de Dados

```
1. Usuário faz login → AuthProvider
2. CompanyProvider carrega empresas do usuário
3. Seleciona empresa ativa → localStorage
4. Todas as queries filtram por company_id
5. Dados isolados entre empresas
```

---

## Contributing

Este projeto é de uso **interno**. Não aceita contribuições externas.

---

## Licença

**PROPRIETÁRIO** - Todos os direitos reservados

Este software não é open source. A reprodução, distribuição, ou uso sem autorização expressa é proibido.

---

## Suporte

Para questões internas, contacte a equipe de desenvolvimento.

---

*Última atualização: Abril 2026*
