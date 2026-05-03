# Seller Finance

Plataforma de gestão financeira para vendedores de marketplace (Shopee, TikTok Shop, Mercado Livre).

## Funcionalidades

- **Dashboard unificado** — visão consolidada de todos os marketplaces
- **Gestão por plataforma** — Shopee, TikTok Shop e Mercado Livre
- **Fluxo de caixa** — lançamentos, categorias e importação OFX
- **DRE automático** — demonstração de resultado do exercício
- **Calculadora de precificação** — encontre o preço ideal com margem desejada
- **Assistente de anúncio** — apoio na criação de listings

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18 + TypeScript |
| Roteamento | React Router DOM v6 |
| Estado servidor | TanStack Query v5 |
| UI | shadcn/ui + Radix UI + Tailwind CSS |
| Backend/Auth/DB | Supabase |
| Build | Vite 7 + SWC |
| Testes | Vitest |
| Deploy | Vercel |

## Pré-requisitos

- Node.js 18+ ou Bun
- Conta no [Supabase](https://supabase.com)

## Instalação

```bash
# Clone o repositório
git clone https://github.com/Thur2312/remix-of-finance-manager
cd remix-of-finance-manager

# Instale as dependências
bun install
# ou: npm install

# Configure as variáveis de ambiente
cp .env.example .env
# Edite o .env com suas credenciais do Supabase
```

## Variáveis de ambiente

Crie um arquivo `.env` na raiz com:

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_anonima_aqui
```

> ⚠️ Nunca commite o `.env` com valores reais. O `.gitignore` já deve incluí-lo.

## Rodando localmente

```bash
bun run dev
# Acesse http://localhost:5173
```

## Build de produção

```bash
bun run build
bun run preview  # para testar o build localmente
```

## Testes

```bash
# Roda todos os testes
bun run test

# Interface visual dos testes
bun run test:ui

# Cobertura de código
bun run test:coverage
```

Os testes ficam em `src/__tests__/`. Foque a cobertura nas funções de cálculo em `src/lib/`.

## Estrutura de pastas

```
src/
├── __tests__/          # Testes unitários
├── components/
│   ├── layout/         # ProtectedRoute, Header, Sidebar
│   └── ui/             # Componentes shadcn/ui
├── contexts/           # AuthContext e outros contexts
├── hooks/              # Custom hooks
├── lib/                # Funções utilitárias e cálculos
├── pages/
│   ├── fluxo-caixa/
│   ├── mercadolivre/
│   ├── precificacao/
│   ├── shopee/
│   ├── tiktok/
│   └── user/
└── main.tsx
```

## Deploy

O projeto está configurado para deploy automático no Vercel. Cada push para `main` dispara um novo deploy.

O domínio de preview `sellerfinance-seven.vercel.app` redireciona automaticamente para `www.sellerfinance.com.br`.

## Segurança

- Nunca exponha variáveis de ambiente sem o prefixo `VITE_` — apenas variáveis com esse prefixo são embarcadas no bundle do cliente
- Credenciais do Supabase anon key são públicas por design, mas configure as políticas RLS corretamente no painel do Supabase
- Rotacione chaves comprometidas imediatamente em: Supabase Dashboard → Settings → API

## Licença

Proprietário — todos os direitos reservados.
